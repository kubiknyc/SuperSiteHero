/**
 * Project Closeout Checklist Generator Tool
 * Generates comprehensive project closeout checklist and tracks completion status
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface GenerateCloseoutChecklistInput {
  project_id: string
  include_categories?: string[]
  custom_requirements?: string[]
}

interface ChecklistItem {
  id: string
  category: string
  item: string
  description: string
  status: 'not_started' | 'in_progress' | 'pending_review' | 'completed' | 'not_applicable'
  responsible_party: string
  due_date: string | null
  notes: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependencies: string[]
}

interface CategorySummary {
  category: string
  total_items: number
  completed: number
  in_progress: number
  not_started: number
  completion_percentage: number
}

interface MissingItem {
  item: string
  category: string
  expected_by: string | null
  responsible_party: string
  impact: string
  recommendation: string
}

interface GenerateCloseoutChecklistOutput {
  project_info: {
    id: string
    name: string
    substantial_completion_date: string | null
    final_completion_date: string | null
    contract_closeout_period_days: number
  }
  checklist: ChecklistItem[]
  by_category: CategorySummary[]
  overall_progress: {
    total_items: number
    completed: number
    in_progress: number
    not_started: number
    completion_percentage: number
    estimated_days_to_complete: number
  }
  missing_items: MissingItem[]
  critical_path_items: ChecklistItem[]
  upcoming_deadlines: Array<{
    item: string
    category: string
    due_date: string
    days_until_due: number
  }>
  recommendations: string[]
}

export const generateCloseoutChecklistTool = createTool<GenerateCloseoutChecklistInput, GenerateCloseoutChecklistOutput>({
  name: 'generate_closeout_checklist',
  description: 'Generates a comprehensive project closeout checklist including O&M manuals, warranties, as-builts, training, and other closeout requirements. Identifies missing items and tracks progress.',
  category: 'closeout',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to generate closeout checklist for'
      },
      include_categories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Categories to include (default: all). Options: documentation, warranties, training, inspections, punch_list, financial, administrative'
      },
      custom_requirements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional custom closeout requirements specific to this project'
      }
    },
    required: ['project_id']
  },

  async execute(input: GenerateCloseoutChecklistInput, context: AgentContext): Promise<GenerateCloseoutChecklistOutput> {
    const {
      project_id,
      include_categories = ['documentation', 'warranties', 'training', 'inspections', 'punch_list', 'financial', 'administrative'],
      custom_requirements = []
    } = input

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    // Get existing closeout items if any
    const { data: existingItems } = await supabase
      .from('closeout_items')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get project documents
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get warranties
    const { data: warranties } = await supabase
      .from('warranties')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get punch list items
    const { data: punchItems } = await supabase
      .from('punch_items')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    const now = new Date()

    // Generate comprehensive checklist
    const checklistTemplate = generateChecklistTemplate(include_categories)

    // Merge with existing items and custom requirements
    const checklist: ChecklistItem[] = []

    for (const templateItem of checklistTemplate) {
      const existingItem = existingItems?.find(
        e => e.item_name?.toLowerCase() === templateItem.item.toLowerCase()
      )

      if (existingItem) {
        checklist.push({
          id: existingItem.id,
          category: templateItem.category,
          item: templateItem.item,
          description: templateItem.description,
          status: existingItem.status || 'not_started',
          responsible_party: existingItem.responsible_party || templateItem.responsible_party,
          due_date: existingItem.due_date,
          notes: existingItem.notes,
          priority: templateItem.priority,
          dependencies: templateItem.dependencies
        })
      } else {
        // Check if item can be auto-detected as complete
        const autoStatus = detectItemStatus(templateItem, documents || [], warranties || [], punchItems || [])

        checklist.push({
          id: `template-${templateItem.category}-${checklist.length}`,
          category: templateItem.category,
          item: templateItem.item,
          description: templateItem.description,
          status: autoStatus,
          responsible_party: templateItem.responsible_party,
          due_date: null,
          notes: null,
          priority: templateItem.priority,
          dependencies: templateItem.dependencies
        })
      }
    }

    // Add custom requirements
    for (const customReq of custom_requirements) {
      checklist.push({
        id: `custom-${checklist.length}`,
        category: 'custom',
        item: customReq,
        description: 'Custom project-specific requirement',
        status: 'not_started',
        responsible_party: 'TBD',
        due_date: null,
        notes: null,
        priority: 'medium',
        dependencies: []
      })
    }

    // Calculate category summaries
    const categoryMap = new Map<string, CategorySummary>()

    for (const item of checklist) {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, {
          category: item.category,
          total_items: 0,
          completed: 0,
          in_progress: 0,
          not_started: 0,
          completion_percentage: 0
        })
      }

      const summary = categoryMap.get(item.category)!
      summary.total_items++

      if (item.status === 'completed' || item.status === 'not_applicable') {
        summary.completed++
      } else if (item.status === 'in_progress' || item.status === 'pending_review') {
        summary.in_progress++
      } else {
        summary.not_started++
      }
    }

    const byCategory: CategorySummary[] = []
    for (const summary of categoryMap.values()) {
      summary.completion_percentage = Math.round((summary.completed / summary.total_items) * 100)
      byCategory.push(summary)
    }

    // Calculate overall progress
    const totalItems = checklist.length
    const completed = checklist.filter(i => i.status === 'completed' || i.status === 'not_applicable').length
    const inProgress = checklist.filter(i => i.status === 'in_progress' || i.status === 'pending_review').length
    const notStarted = checklist.filter(i => i.status === 'not_started').length
    const completionPercentage = Math.round((completed / totalItems) * 100)

    // Estimate days to complete based on remaining items
    const remainingItems = totalItems - completed
    const avgDaysPerItem = 2 // Conservative estimate
    const estimatedDaysToComplete = remainingItems * avgDaysPerItem

    // Identify missing items
    const missingItems = identifyMissingItems(checklist, documents || [], warranties || [])

    // Get critical path items
    const criticalPathItems = checklist.filter(i =>
      i.priority === 'critical' && i.status !== 'completed' && i.status !== 'not_applicable'
    )

    // Get upcoming deadlines
    const upcomingDeadlines: Array<{ item: string; category: string; due_date: string; days_until_due: number }> = []

    for (const item of checklist) {
      if (item.due_date && item.status !== 'completed' && item.status !== 'not_applicable') {
        const dueDate = new Date(item.due_date)
        const daysUntil = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil <= 30 && daysUntil >= -7) { // Include slightly overdue items
          upcomingDeadlines.push({
            item: item.item,
            category: item.category,
            due_date: item.due_date,
            days_until_due: daysUntil
          })
        }
      }
    }

    upcomingDeadlines.sort((a, b) => a.days_until_due - b.days_until_due)

    // Generate recommendations
    const recommendations = generateRecommendations(
      checklist,
      missingItems,
      completionPercentage,
      byCategory,
      punchItems || []
    )

    return {
      project_info: {
        id: project_id,
        name: project?.name || 'Unknown Project',
        substantial_completion_date: project?.substantial_completion_date || null,
        final_completion_date: project?.final_completion_date || null,
        contract_closeout_period_days: project?.closeout_period_days || 30
      },
      checklist,
      by_category: byCategory,
      overall_progress: {
        total_items: totalItems,
        completed,
        in_progress: inProgress,
        not_started: notStarted,
        completion_percentage: completionPercentage,
        estimated_days_to_complete: estimatedDaysToComplete
      },
      missing_items: missingItems,
      critical_path_items: criticalPathItems.slice(0, 10),
      upcoming_deadlines: upcomingDeadlines.slice(0, 10),
      recommendations
    }
  }
})

interface TemplateItem {
  category: string
  item: string
  description: string
  responsible_party: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  dependencies: string[]
}

function generateChecklistTemplate(categories: string[]): TemplateItem[] {
  const allItems: TemplateItem[] = [
    // Documentation
    { category: 'documentation', item: 'As-Built Drawings', description: 'Complete set of as-built/record drawings reflecting all field changes', responsible_party: 'GC', priority: 'critical', dependencies: [] },
    { category: 'documentation', item: 'O&M Manuals', description: 'Operations and maintenance manuals for all equipment and systems', responsible_party: 'GC', priority: 'critical', dependencies: [] },
    { category: 'documentation', item: 'Equipment Cut Sheets', description: 'Manufacturer cut sheets for all installed equipment', responsible_party: 'GC', priority: 'high', dependencies: [] },
    { category: 'documentation', item: 'Test Reports', description: 'All inspection and test reports (concrete, steel, MEP, etc.)', responsible_party: 'GC', priority: 'high', dependencies: [] },
    { category: 'documentation', item: 'Commissioning Reports', description: 'System commissioning documentation and reports', responsible_party: 'GC', priority: 'high', dependencies: [] },
    { category: 'documentation', item: 'LEED Documentation', description: 'LEED certification documentation if applicable', responsible_party: 'GC', priority: 'medium', dependencies: [] },
    { category: 'documentation', item: 'Spare Parts List', description: 'List of recommended spare parts with sources', responsible_party: 'GC', priority: 'medium', dependencies: ['O&M Manuals'] },
    { category: 'documentation', item: 'Attic Stock', description: 'Deliver all specified attic stock materials', responsible_party: 'GC', priority: 'medium', dependencies: [] },

    // Warranties
    { category: 'warranties', item: 'Roof Warranty', description: 'Manufacturer and contractor roofing warranty', responsible_party: 'Roofing Sub', priority: 'critical', dependencies: ['Final Inspection - Roofing'] },
    { category: 'warranties', item: 'HVAC Warranty', description: 'HVAC equipment and installation warranties', responsible_party: 'HVAC Sub', priority: 'critical', dependencies: ['HVAC Commissioning'] },
    { category: 'warranties', item: 'Elevator Warranty', description: 'Elevator equipment and maintenance agreement', responsible_party: 'Elevator Sub', priority: 'critical', dependencies: ['Elevator Certification'] },
    { category: 'warranties', item: 'Fire Protection Warranty', description: 'Fire alarm and suppression system warranties', responsible_party: 'Fire Protection Sub', priority: 'critical', dependencies: [] },
    { category: 'warranties', item: 'Window/Curtainwall Warranty', description: 'Glazing and curtainwall system warranty', responsible_party: 'Glazing Sub', priority: 'high', dependencies: [] },
    { category: 'warranties', item: 'Waterproofing Warranty', description: 'Below-grade and plaza waterproofing warranty', responsible_party: 'Waterproofing Sub', priority: 'high', dependencies: [] },
    { category: 'warranties', item: 'General Contractor Warranty', description: 'One-year GC warranty letter', responsible_party: 'GC', priority: 'critical', dependencies: ['Substantial Completion'] },
    { category: 'warranties', item: 'Extended Warranties', description: 'All extended warranty documentation', responsible_party: 'GC', priority: 'medium', dependencies: [] },

    // Training
    { category: 'training', item: 'HVAC Systems Training', description: 'Owner training on HVAC operation and maintenance', responsible_party: 'HVAC Sub', priority: 'high', dependencies: ['HVAC Commissioning'] },
    { category: 'training', item: 'Fire/Life Safety Training', description: 'Training on fire alarm, suppression, and egress systems', responsible_party: 'Fire Protection Sub', priority: 'critical', dependencies: [] },
    { category: 'training', item: 'Building Automation Training', description: 'BAS/BMS operation and programming training', responsible_party: 'Controls Sub', priority: 'high', dependencies: [] },
    { category: 'training', item: 'Security Systems Training', description: 'Access control and surveillance system training', responsible_party: 'Security Sub', priority: 'high', dependencies: [] },
    { category: 'training', item: 'Elevator Training', description: 'Elevator operation and emergency procedures', responsible_party: 'Elevator Sub', priority: 'medium', dependencies: [] },
    { category: 'training', item: 'Landscape/Irrigation Training', description: 'Irrigation system operation and maintenance', responsible_party: 'Landscape Sub', priority: 'low', dependencies: [] },

    // Inspections
    { category: 'inspections', item: 'Final Building Inspection', description: 'Final inspection by building department', responsible_party: 'GC', priority: 'critical', dependencies: ['Punch List Complete'] },
    { category: 'inspections', item: 'Certificate of Occupancy', description: 'Obtain certificate of occupancy', responsible_party: 'GC', priority: 'critical', dependencies: ['Final Building Inspection'] },
    { category: 'inspections', item: 'Fire Marshal Inspection', description: 'Final fire marshal inspection and approval', responsible_party: 'GC', priority: 'critical', dependencies: [] },
    { category: 'inspections', item: 'Elevator Certification', description: 'State/local elevator certification', responsible_party: 'Elevator Sub', priority: 'critical', dependencies: [] },
    { category: 'inspections', item: 'Health Department Approval', description: 'Health department approval if applicable', responsible_party: 'GC', priority: 'high', dependencies: [] },
    { category: 'inspections', item: 'Environmental Sign-off', description: 'Environmental agency sign-off if required', responsible_party: 'GC', priority: 'medium', dependencies: [] },

    // Punch List
    { category: 'punch_list', item: 'Owner Punch List Walk', description: 'Complete punch list walk with owner', responsible_party: 'GC', priority: 'critical', dependencies: [] },
    { category: 'punch_list', item: 'Architect Punch List', description: 'Architect punch list review and sign-off', responsible_party: 'GC', priority: 'critical', dependencies: [] },
    { category: 'punch_list', item: 'Punch List Completion', description: 'Complete all punch list items', responsible_party: 'GC', priority: 'critical', dependencies: ['Owner Punch List Walk', 'Architect Punch List'] },
    { category: 'punch_list', item: 'Final Cleaning', description: 'Final construction cleaning complete', responsible_party: 'GC', priority: 'high', dependencies: ['Punch List Completion'] },
    { category: 'punch_list', item: 'Window Cleaning', description: 'Final window cleaning complete', responsible_party: 'GC', priority: 'medium', dependencies: ['Punch List Completion'] },

    // Financial
    { category: 'financial', item: 'Final Payment Application', description: 'Submit final payment application', responsible_party: 'GC', priority: 'critical', dependencies: ['Punch List Completion'] },
    { category: 'financial', item: 'Release of Liens', description: 'Obtain lien releases from all subcontractors', responsible_party: 'GC', priority: 'critical', dependencies: [] },
    { category: 'financial', item: 'Consent of Surety', description: 'Obtain surety consent for final payment', responsible_party: 'GC', priority: 'critical', dependencies: [] },
    { category: 'financial', item: 'Final Change Order Log', description: 'Complete change order log and reconciliation', responsible_party: 'GC', priority: 'high', dependencies: [] },
    { category: 'financial', item: 'Retainage Release', description: 'Process retainage release documentation', responsible_party: 'GC', priority: 'critical', dependencies: ['Final Payment Application'] },
    { category: 'financial', item: 'Close Out Subcontracts', description: 'Close out all subcontracts and purchase orders', responsible_party: 'GC', priority: 'high', dependencies: ['Release of Liens'] },

    // Administrative
    { category: 'administrative', item: 'Substantial Completion Certificate', description: 'Issue substantial completion certificate', responsible_party: 'Architect', priority: 'critical', dependencies: [] },
    { category: 'administrative', item: 'Final Completion Certificate', description: 'Issue final completion certificate', responsible_party: 'Architect', priority: 'critical', dependencies: ['Punch List Completion', 'All Documentation Complete'] },
    { category: 'administrative', item: 'Keys and Access', description: 'Turn over all keys, access cards, and codes', responsible_party: 'GC', priority: 'high', dependencies: [] },
    { category: 'administrative', item: 'Utility Transfer', description: 'Transfer utilities to owner', responsible_party: 'GC', priority: 'high', dependencies: [] },
    { category: 'administrative', item: 'Remove Temporary Facilities', description: 'Remove all temporary facilities and signage', responsible_party: 'GC', priority: 'medium', dependencies: [] },
    { category: 'administrative', item: 'Site Restoration', description: 'Complete site restoration per contract', responsible_party: 'GC', priority: 'medium', dependencies: [] },
    { category: 'administrative', item: 'Insurance Certificates', description: 'Provide ongoing insurance certificates as required', responsible_party: 'GC', priority: 'high', dependencies: [] },
    { category: 'administrative', item: 'Project Records Archive', description: 'Archive all project records per requirements', responsible_party: 'GC', priority: 'medium', dependencies: [] }
  ]

  return allItems.filter(item => categories.includes(item.category))
}

function detectItemStatus(
  item: TemplateItem,
  documents: any[],
  warranties: any[],
  punchItems: any[]
): 'not_started' | 'in_progress' | 'pending_review' | 'completed' | 'not_applicable' {
  const itemLower = item.item.toLowerCase()

  // Check documents for matching items
  if (item.category === 'documentation') {
    const matchingDocs = documents.filter(d => {
      const docName = (d.name || d.title || '').toLowerCase()
      if (itemLower.includes('as-built')) {return /as.?built|record drawing/i.test(docName)}
      if (itemLower.includes('o&m')) {return /o&m|operation|maintenance manual/i.test(docName)}
      if (itemLower.includes('test report')) {return /test report|inspection report/i.test(docName)}
      if (itemLower.includes('commissioning')) {return /commissioning/i.test(docName)}
      return false
    })

    if (matchingDocs.length > 0) {
      const allApproved = matchingDocs.every(d => d.status === 'approved' || d.status === 'final')
      return allApproved ? 'completed' : 'in_progress'
    }
  }

  // Check warranties
  if (item.category === 'warranties') {
    const matchingWarranties = warranties.filter(w => {
      const warType = (w.type || w.name || '').toLowerCase()
      if (itemLower.includes('roof')) {return /roof/i.test(warType)}
      if (itemLower.includes('hvac')) {return /hvac|mechanical/i.test(warType)}
      if (itemLower.includes('elevator')) {return /elevator/i.test(warType)}
      return false
    })

    if (matchingWarranties.length > 0) {
      return matchingWarranties[0].status === 'received' ? 'completed' : 'in_progress'
    }
  }

  // Check punch list
  if (item.category === 'punch_list' && itemLower.includes('completion')) {
    const openPunchItems = punchItems.filter(p => p.status !== 'completed' && p.status !== 'closed')
    if (punchItems.length > 0 && openPunchItems.length === 0) {
      return 'completed'
    } else if (punchItems.length > 0) {
      return 'in_progress'
    }
  }

  return 'not_started'
}

function identifyMissingItems(
  checklist: ChecklistItem[],
  documents: any[],
  warranties: any[]
): MissingItem[] {
  const missingItems: MissingItem[] = []

  // Check for missing critical documentation
  const criticalDocs = ['As-Built Drawings', 'O&M Manuals']
  for (const docName of criticalDocs) {
    const item = checklist.find(c => c.item === docName)
    if (item && item.status === 'not_started') {
      missingItems.push({
        item: docName,
        category: 'documentation',
        expected_by: null,
        responsible_party: item.responsible_party,
        impact: 'Critical for owner occupancy and operations',
        recommendation: `Request ${docName.toLowerCase()} from responsible party immediately`
      })
    }
  }

  // Check for missing warranties on equipment that should have them
  const expectedWarranties = ['Roof Warranty', 'HVAC Warranty', 'General Contractor Warranty']
  for (const warName of expectedWarranties) {
    const item = checklist.find(c => c.item === warName)
    if (item && item.status === 'not_started') {
      missingItems.push({
        item: warName,
        category: 'warranties',
        expected_by: null,
        responsible_party: item.responsible_party,
        impact: 'Owner protection and future maintenance requirements',
        recommendation: `Obtain ${warName.toLowerCase()} before final payment release`
      })
    }
  }

  return missingItems.slice(0, 10)
}

function generateRecommendations(
  checklist: ChecklistItem[],
  missingItems: MissingItem[],
  completionPercentage: number,
  byCategory: CategorySummary[],
  punchItems: any[]
): string[] {
  const recommendations: string[] = []

  // Overall progress recommendations
  if (completionPercentage < 50) {
    recommendations.push('Closeout is less than 50% complete - schedule dedicated closeout coordination meetings')
  } else if (completionPercentage >= 90) {
    recommendations.push('Closeout nearly complete - focus on remaining critical items for final completion')
  }

  // Category-specific recommendations
  for (const category of byCategory) {
    if (category.completion_percentage < 30 && category.category !== 'custom') {
      recommendations.push(`${formatCategoryName(category.category)} is behind schedule (${category.completion_percentage}%) - assign dedicated resources`)
    }
  }

  // Missing items
  if (missingItems.length > 5) {
    recommendations.push(`${missingItems.length} critical items are missing - schedule subcontractor closeout meetings`)
  }

  // Punch list
  const openPunch = punchItems.filter(p => p.status !== 'completed' && p.status !== 'closed').length
  if (openPunch > 0) {
    recommendations.push(`${openPunch} punch list items remain open - complete before final inspection`)
  }

  // Warranty reminders
  const pendingWarranties = checklist.filter(c => c.category === 'warranties' && c.status !== 'completed').length
  if (pendingWarranties > 0) {
    recommendations.push(`Collect ${pendingWarranties} outstanding warranty documents before retainage release`)
  }

  // Training recommendations
  const pendingTraining = checklist.filter(c => c.category === 'training' && c.status !== 'completed').length
  if (pendingTraining > 0) {
    recommendations.push(`Schedule ${pendingTraining} pending owner training sessions before occupancy`)
  }

  if (recommendations.length === 0) {
    recommendations.push('All closeout items are on track - continue monitoring progress')
  }

  return recommendations.slice(0, 8)
}

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
