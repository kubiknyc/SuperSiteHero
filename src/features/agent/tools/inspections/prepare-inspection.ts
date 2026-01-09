/**
 * Inspection Preparation Checklist Tool
 * Generate preparation checklists for upcoming inspections based on type and jurisdiction
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface PrepareInspectionInput {
  project_id: string
  inspection_type: string
  scheduled_date: string
  jurisdiction?: string
}

interface ChecklistItem {
  item: string
  category: 'documentation' | 'physical' | 'personnel' | 'access'
  priority: 'required' | 'recommended'
  status: 'not_started' | 'in_progress' | 'complete'
  deadline: string
  responsible_party: string
  notes?: string
}

interface RequiredDocument {
  document_type: string
  description: string
  available: boolean
  document_id?: string
}

interface FailurePoint {
  issue: string
  frequency: 'common' | 'occasional' | 'rare'
  prevention: string
}

interface PrepareInspectionOutput {
  preparation_checklist: ChecklistItem[]
  required_documents: RequiredDocument[]
  common_failure_points: FailurePoint[]
  inspector_expectations: string[]
  estimated_duration: string
}

// Inspection type configurations
const INSPECTION_CONFIGS: Record<string, {
  checklist: Omit<ChecklistItem, 'deadline' | 'status'>[]
  documents: string[]
  failure_points: FailurePoint[]
  expectations: string[]
  duration: string
}> = {
  'foundation': {
    checklist: [
      { item: 'Verify rebar placement matches approved drawings', category: 'physical', priority: 'required', responsible_party: 'Superintendent' },
      { item: 'Check rebar spacing and cover', category: 'physical', priority: 'required', responsible_party: 'Superintendent' },
      { item: 'Confirm anchor bolt locations', category: 'physical', priority: 'required', responsible_party: 'Superintendent' },
      { item: 'Verify formwork is secure and aligned', category: 'physical', priority: 'required', responsible_party: 'Foreman' },
      { item: 'Check for debris in forms', category: 'physical', priority: 'required', responsible_party: 'Foreman' },
      { item: 'Ensure vapor barrier is properly installed', category: 'physical', priority: 'recommended', responsible_party: 'Foreman' },
      { item: 'Confirm waterproofing at penetrations', category: 'physical', priority: 'recommended', responsible_party: 'Foreman' },
      { item: 'Have approved structural drawings on site', category: 'documentation', priority: 'required', responsible_party: 'Project Manager' },
      { item: 'Provide access to excavation', category: 'access', priority: 'required', responsible_party: 'Superintendent' },
    ],
    documents: ['Structural drawings', 'Rebar shop drawings', 'Concrete mix design', 'Geotechnical report'],
    failure_points: [
      { issue: 'Incorrect rebar spacing', frequency: 'common', prevention: 'Use rebar chairs and tie wire properly' },
      { issue: 'Insufficient concrete cover', frequency: 'common', prevention: 'Check cover with ruler before inspection' },
      { issue: 'Missing anchor bolts', frequency: 'occasional', prevention: 'Cross-reference anchor bolt schedule' },
      { issue: 'Debris in forms', frequency: 'occasional', prevention: 'Clean and inspect forms day before' },
    ],
    expectations: [
      'Inspector will check rebar size, spacing, and lap lengths',
      'Cover dimensions will be verified with measuring tape',
      'Anchor bolt locations checked against approved drawings',
      'Forms must be stable and properly braced',
    ],
    duration: '30-60 minutes'
  },
  'framing': {
    checklist: [
      { item: 'Verify stud spacing matches drawings', category: 'physical', priority: 'required', responsible_party: 'Framing Foreman' },
      { item: 'Check header sizes above openings', category: 'physical', priority: 'required', responsible_party: 'Framing Foreman' },
      { item: 'Verify shear wall nailing pattern', category: 'physical', priority: 'required', responsible_party: 'Framing Foreman' },
      { item: 'Confirm hold-down and strap locations', category: 'physical', priority: 'required', responsible_party: 'Superintendent' },
      { item: 'Check fire blocking installation', category: 'physical', priority: 'required', responsible_party: 'Framing Foreman' },
      { item: 'Verify proper connections at floor/roof', category: 'physical', priority: 'required', responsible_party: 'Framing Foreman' },
      { item: 'Have framing plans available', category: 'documentation', priority: 'required', responsible_party: 'Superintendent' },
      { item: 'Provide ladder/access to all levels', category: 'access', priority: 'required', responsible_party: 'Superintendent' },
    ],
    documents: ['Structural framing plans', 'Truss engineering', 'Shear wall schedule', 'Hold-down schedule'],
    failure_points: [
      { issue: 'Incorrect nailing pattern on shear walls', frequency: 'common', prevention: 'Mark nailing pattern on walls before inspection' },
      { issue: 'Missing or incorrect hold-downs', frequency: 'common', prevention: 'Verify against schedule before calling' },
      { issue: 'Improper header sizing', frequency: 'occasional', prevention: 'Cross-check header schedule' },
      { issue: 'Missing fire blocking', frequency: 'occasional', prevention: 'Walk all walls for blocking before inspection' },
    ],
    expectations: [
      'Inspector will check all shear wall nailing',
      'Hold-down bolts and straps will be verified',
      'Header sizes and connections checked',
      'Fire blocking at floor/ceiling transitions inspected',
    ],
    duration: '45-90 minutes'
  },
  'rough_electrical': {
    checklist: [
      { item: 'Verify box locations per plan', category: 'physical', priority: 'required', responsible_party: 'Electrical Foreman' },
      { item: 'Check wire sizing for all circuits', category: 'physical', priority: 'required', responsible_party: 'Electrical Foreman' },
      { item: 'Confirm proper grounding', category: 'physical', priority: 'required', responsible_party: 'Electrical Foreman' },
      { item: 'Verify GFCI/AFCI protection locations', category: 'physical', priority: 'required', responsible_party: 'Electrical Foreman' },
      { item: 'Check conduit fill and support', category: 'physical', priority: 'required', responsible_party: 'Electrical Foreman' },
      { item: 'Verify panel location and clearances', category: 'physical', priority: 'required', responsible_party: 'Electrical Foreman' },
      { item: 'Have electrical plans and load calcs', category: 'documentation', priority: 'required', responsible_party: 'Electrical Contractor' },
      { item: 'Ensure all areas accessible', category: 'access', priority: 'required', responsible_party: 'Superintendent' },
    ],
    documents: ['Electrical plans', 'Load calculations', 'Panel schedule', 'Permit card'],
    failure_points: [
      { issue: 'Missing box connectors', frequency: 'common', prevention: 'Check all box connections before inspection' },
      { issue: 'Improper wire support', frequency: 'common', prevention: 'Staple within 12" of boxes, 4.5\' intervals' },
      { issue: 'Incorrect GFCI locations', frequency: 'occasional', prevention: 'Review code requirements for wet locations' },
      { issue: 'Overfilled boxes', frequency: 'occasional', prevention: 'Calculate box fill before inspection' },
    ],
    expectations: [
      'All circuits will be verified against plans',
      'Box fills may be calculated randomly',
      'Grounding connections inspected',
      'Support and protection of wiring checked',
    ],
    duration: '60-120 minutes'
  },
  'rough_plumbing': {
    checklist: [
      { item: 'Verify fixture rough-in locations', category: 'physical', priority: 'required', responsible_party: 'Plumbing Foreman' },
      { item: 'Check pipe sizing per plans', category: 'physical', priority: 'required', responsible_party: 'Plumbing Foreman' },
      { item: 'Confirm proper slope on waste lines', category: 'physical', priority: 'required', responsible_party: 'Plumbing Foreman' },
      { item: 'Verify vent terminations', category: 'physical', priority: 'required', responsible_party: 'Plumbing Foreman' },
      { item: 'Check water heater rough-in', category: 'physical', priority: 'required', responsible_party: 'Plumbing Foreman' },
      { item: 'Verify cleanout locations', category: 'physical', priority: 'recommended', responsible_party: 'Plumbing Foreman' },
      { item: 'Have plumbing plans and isometrics', category: 'documentation', priority: 'required', responsible_party: 'Plumbing Contractor' },
      { item: 'Pressure test system before inspection', category: 'physical', priority: 'required', responsible_party: 'Plumbing Foreman' },
    ],
    documents: ['Plumbing plans', 'Isometric drawings', 'Permit card', 'Fixture schedule'],
    failure_points: [
      { issue: 'Incorrect drain slope', frequency: 'common', prevention: 'Use level to verify 1/4" per foot minimum' },
      { issue: 'Missing cleanouts', frequency: 'common', prevention: 'Verify cleanout locations per code' },
      { issue: 'Failed pressure test', frequency: 'occasional', prevention: 'Pressure test day before, fix any leaks' },
      { issue: 'Improper venting', frequency: 'occasional', prevention: 'Review vent requirements for each fixture' },
    ],
    expectations: [
      'Pressure test will be witnessed or verified',
      'Drain slopes may be checked with level',
      'Vent sizing and terminations inspected',
      'Fixture rough-in dimensions verified',
    ],
    duration: '45-90 minutes'
  },
  'final': {
    checklist: [
      { item: 'All trades complete punch list items', category: 'physical', priority: 'required', responsible_party: 'All Trades' },
      { item: 'Smoke detectors installed and tested', category: 'physical', priority: 'required', responsible_party: 'Electrical' },
      { item: 'All fixtures operational', category: 'physical', priority: 'required', responsible_party: 'All Trades' },
      { item: 'HVAC operational and tested', category: 'physical', priority: 'required', responsible_party: 'HVAC' },
      { item: 'Exit signs and emergency lights working', category: 'physical', priority: 'required', responsible_party: 'Electrical' },
      { item: 'Fire extinguishers in place', category: 'physical', priority: 'required', responsible_party: 'GC' },
      { item: 'All required signage posted', category: 'physical', priority: 'required', responsible_party: 'GC' },
      { item: 'Building clean and debris removed', category: 'physical', priority: 'required', responsible_party: 'GC' },
      { item: 'Compile all required documentation', category: 'documentation', priority: 'required', responsible_party: 'Project Manager' },
      { item: 'Ensure all areas accessible', category: 'access', priority: 'required', responsible_party: 'Superintendent' },
    ],
    documents: ['Certificate of Occupancy application', 'All trade sign-offs', 'MEP certifications', 'Fire alarm certificate', 'Elevator certificate'],
    failure_points: [
      { issue: 'Smoke detectors not working', frequency: 'common', prevention: 'Test all smoke detectors morning of inspection' },
      { issue: 'Missing GFCIs', frequency: 'common', prevention: 'Walk all wet areas and verify GFCIs installed' },
      { issue: 'Exit signs not illuminated', frequency: 'occasional', prevention: 'Check all exit signs and emergency lights' },
      { issue: 'Outstanding code violations', frequency: 'occasional', prevention: 'Review all prior inspection corrections' },
    ],
    expectations: [
      'All systems must be operational',
      'Building must be clean and safe for occupancy',
      'All prior corrections must be completed',
      'Documentation package must be complete',
    ],
    duration: '90-180 minutes'
  }
}

// Default configuration for unknown inspection types
const DEFAULT_CONFIG = {
  checklist: [
    { item: 'Review inspection requirements', category: 'documentation' as const, priority: 'required' as const, responsible_party: 'Superintendent' },
    { item: 'Ensure work area is accessible', category: 'access' as const, priority: 'required' as const, responsible_party: 'Superintendent' },
    { item: 'Have relevant drawings on site', category: 'documentation' as const, priority: 'required' as const, responsible_party: 'Project Manager' },
    { item: 'Notify relevant trade foreman', category: 'personnel' as const, priority: 'required' as const, responsible_party: 'Superintendent' },
  ],
  documents: ['Approved drawings', 'Permit card', 'Prior inspection corrections'],
  failure_points: [
    { issue: 'Work not ready for inspection', frequency: 'common' as const, prevention: 'Verify completion before calling for inspection' },
    { issue: 'Missing documentation', frequency: 'occasional' as const, prevention: 'Compile documents before inspection day' },
  ],
  expectations: ['Inspector will verify work meets code requirements', 'Have knowledgeable person available to answer questions'],
  duration: '30-60 minutes'
}

export const prepareInspectionTool = createTool<PrepareInspectionInput, PrepareInspectionOutput>({
  name: 'prepare_inspection',
  displayName: 'Prepare for Inspection',
  description: 'Generates a comprehensive preparation checklist for upcoming inspections based on type and jurisdiction. Includes required documents, common failure points, and inspector expectations.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      inspection_type: {
        type: 'string',
        description: 'Type of inspection (e.g., foundation, framing, rough_electrical, rough_plumbing, final)'
      },
      scheduled_date: {
        type: 'string',
        description: 'Scheduled inspection date (ISO format)'
      },
      jurisdiction: {
        type: 'string',
        description: 'Jurisdiction/municipality for jurisdiction-specific requirements (optional)'
      }
    },
    required: ['project_id', 'inspection_type', 'scheduled_date']
  },
  requiresConfirmation: false,
  estimatedTokens: 1000,

  async execute(input, context) {
    const { project_id, inspection_type, scheduled_date, jurisdiction } = input

    // Get inspection configuration
    const normalizedType = inspection_type.toLowerCase().replace(/\s+/g, '_')
    const config = INSPECTION_CONFIGS[normalizedType] || DEFAULT_CONFIG

    // Calculate deadline (day before inspection)
    const inspectionDate = new Date(scheduled_date)
    const deadlineDate = new Date(inspectionDate)
    deadlineDate.setDate(deadlineDate.getDate() - 1)
    const deadline = deadlineDate.toISOString().split('T')[0]

    // Build checklist with deadlines
    const checklist: ChecklistItem[] = config.checklist.map(item => ({
      ...item,
      deadline,
      status: 'not_started' as const
    }))

    // Check for available documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id, name, document_type')
      .eq('project_id', project_id)
      .limit(100)

    const requiredDocs: RequiredDocument[] = config.documents.map(docType => {
      const found = documents?.find(d =>
        d.name?.toLowerCase().includes(docType.toLowerCase()) ||
        d.document_type?.toLowerCase().includes(docType.toLowerCase())
      )

      return {
        document_type: docType,
        description: `Required for ${inspection_type} inspection`,
        available: !!found,
        document_id: found?.id
      }
    })

    // Check for previous inspections of same type to identify patterns
    const { data: previousInspections } = await supabase
      .from('inspections')
      .select('result, notes, failure_reason')
      .eq('project_id', project_id)
      .eq('inspection_type', inspection_type)
      .order('scheduled_date', { ascending: false })
      .limit(5)

    // Add any project-specific failure points from history
    const failurePoints = [...config.failure_points]
    if (previousInspections) {
      for (const insp of previousInspections) {
        if (insp.result === 'fail' && insp.failure_reason) {
          const exists = failurePoints.some(fp =>
            fp.issue.toLowerCase().includes(insp.failure_reason.toLowerCase())
          )
          if (!exists) {
            failurePoints.push({
              issue: insp.failure_reason,
              frequency: 'occasional',
              prevention: 'Review previous inspection notes'
            })
          }
        }
      }
    }

    return {
      success: true,
      data: {
        preparation_checklist: checklist,
        required_documents: requiredDocs,
        common_failure_points: failurePoints.slice(0, 6),
        inspector_expectations: config.expectations,
        estimated_duration: config.duration
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { preparation_checklist, required_documents, common_failure_points } = output

    const docsAvailable = required_documents.filter(d => d.available).length
    const docsTotal = required_documents.length

    return {
      title: 'Inspection Checklist Ready',
      summary: `${preparation_checklist.length} items, ${docsAvailable}/${docsTotal} docs available`,
      icon: 'clipboard-check',
      status: docsAvailable === docsTotal ? 'success' : 'warning',
      details: [
        { label: 'Checklist Items', value: preparation_checklist.length, type: 'text' },
        { label: 'Documents Ready', value: `${docsAvailable}/${docsTotal}`, type: 'text' },
        { label: 'Common Issues', value: common_failure_points.length, type: 'text' },
        { label: 'Est. Duration', value: output.estimated_duration, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
