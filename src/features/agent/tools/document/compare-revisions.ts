/**
 * Document Revision Comparison Tool
 * Compares document revisions to identify changes
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface CompareRevisionsInput {
  document_id: string
  revision_a?: string
  revision_b?: string
  comparison_type?: 'summary' | 'detailed' | 'sections'
}

interface ChangeItem {
  section: string
  change_type: 'added' | 'removed' | 'modified'
  description: string
  significance: 'minor' | 'moderate' | 'major'
  page_reference?: string
}

interface CompareRevisionsOutput {
  comparison: {
    document_name: string
    revision_a: { number: string; date: string }
    revision_b: { number: string; date: string }
    total_changes: number
    change_summary: string
  }
  changes_by_category: Record<string, ChangeItem[]>
  significant_changes: ChangeItem[]
  affected_trades: string[]
  rfi_recommendations: string[]
  action_items: Array<{
    action: string
    responsible: string
    priority: 'low' | 'medium' | 'high'
  }>
  warnings: string[]
}

export const compareRevisionsTool = createTool<CompareRevisionsInput, CompareRevisionsOutput>({
  name: 'compare_document_revisions',
  description: 'Compares two revisions of a document to identify changes, affected sections, and trades impacted. Useful for understanding drawing revisions, spec changes, and contract modifications.',
  category: 'document',
  parameters: {
    type: 'object',
    properties: {
      document_id: {
        type: 'string',
        description: 'The document ID to compare revisions for'
      },
      revision_a: {
        type: 'string',
        description: 'First revision number (defaults to previous revision)'
      },
      revision_b: {
        type: 'string',
        description: 'Second revision number (defaults to current/latest)'
      },
      comparison_type: {
        type: 'string',
        enum: ['summary', 'detailed', 'sections'],
        description: 'Level of detail for comparison (default: summary)'
      }
    },
    required: ['document_id']
  },

  async execute(input: CompareRevisionsInput, context: AgentContext): Promise<CompareRevisionsOutput> {
    const { document_id, revision_a, revision_b, comparison_type = 'summary' } = input

    // Get document info
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single()

    // Get revisions
    const { data: revisions } = await supabase
      .from('document_revisions')
      .select('*')
      .eq('document_id', document_id)
      .order('created_at', { ascending: false })

    if (!revisions || revisions.length < 2) {
      return createEmptyComparison(document?.name || 'Unknown Document')
    }

    // Determine which revisions to compare
    const revB = revision_b
      ? revisions.find(r => r.revision_number === revision_b)
      : revisions[0]

    const revA = revision_a
      ? revisions.find(r => r.revision_number === revision_a)
      : revisions[1]

    if (!revA || !revB) {
      return createEmptyComparison(document?.name || 'Unknown Document')
    }

    // Get revision metadata and changes
    const changesA = revA.changes || revA.change_summary || ''
    const changesB = revB.changes || revB.change_summary || ''

    // Analyze changes
    const changes = analyzeChanges(changesA, changesB, document?.type || 'general')

    // Categorize changes
    const changesByCategory = categorizeChanges(changes)

    // Identify significant changes
    const significantChanges = changes.filter(c => c.significance === 'major')

    // Determine affected trades
    const affectedTrades = identifyAffectedTrades(changes, document?.type)

    // Generate RFI recommendations
    const rfiRecommendations = generateRFIRecommendations(changes, document?.type)

    // Generate action items
    const actionItems = generateActionItems(changes, affectedTrades)

    // Generate warnings
    const warnings = generateWarnings(changes, document?.type)

    return {
      comparison: {
        document_name: document?.name || 'Unknown Document',
        revision_a: {
          number: revA.revision_number || 'A',
          date: revA.created_at || ''
        },
        revision_b: {
          number: revB.revision_number || 'B',
          date: revB.created_at || ''
        },
        total_changes: changes.length,
        change_summary: generateChangeSummary(changes)
      },
      changes_by_category: changesByCategory,
      significant_changes: significantChanges,
      affected_trades: affectedTrades,
      rfi_recommendations: rfiRecommendations,
      action_items: actionItems,
      warnings
    }
  }
})

function createEmptyComparison(documentName: string): CompareRevisionsOutput {
  return {
    comparison: {
      document_name: documentName,
      revision_a: { number: 'N/A', date: '' },
      revision_b: { number: 'N/A', date: '' },
      total_changes: 0,
      change_summary: 'Insufficient revisions available for comparison'
    },
    changes_by_category: {},
    significant_changes: [],
    affected_trades: [],
    rfi_recommendations: [],
    action_items: [],
    warnings: ['Document does not have multiple revisions to compare']
  }
}

function analyzeChanges(changesA: string, changesB: string, docType: string): ChangeItem[] {
  const changes: ChangeItem[] = []

  // Parse change descriptions
  const parseChanges = (text: string): string[] => {
    if (!text) return []
    return text.split(/[;\n]/).map(s => s.trim()).filter(s => s.length > 5)
  }

  const changesFromA = parseChanges(changesA)
  const changesFromB = parseChanges(changesB)

  // Combine all changes mentioned
  const allChanges = [...changesFromB] // Focus on latest revision's changes

  for (const changeDesc of allChanges) {
    const change = classifyChange(changeDesc, docType)
    if (change) {
      changes.push(change)
    }
  }

  // If no explicit changes found, create generic change entry
  if (changes.length === 0 && changesB) {
    changes.push({
      section: 'General',
      change_type: 'modified',
      description: changesB.substring(0, 200),
      significance: 'moderate'
    })
  }

  return changes
}

function classifyChange(description: string, docType: string): ChangeItem | null {
  const descLower = description.toLowerCase()

  // Determine change type
  let changeType: 'added' | 'removed' | 'modified' = 'modified'
  if (/add|new|include|insert/i.test(descLower)) {
    changeType = 'added'
  } else if (/remov|delet|eliminat|omit/i.test(descLower)) {
    changeType = 'removed'
  }

  // Determine significance
  let significance: 'minor' | 'moderate' | 'major' = 'moderate'
  if (/minor|typo|clarif|editorial/i.test(descLower)) {
    significance = 'minor'
  } else if (/major|significant|critical|structural|safety|scope/i.test(descLower)) {
    significance = 'major'
  }

  // Determine section based on content
  let section = 'General'
  if (/dimension|size|length|width|height/i.test(descLower)) {
    section = 'Dimensions'
  } else if (/material|spec|specification/i.test(descLower)) {
    section = 'Materials/Specifications'
  } else if (/detail|section|elevation/i.test(descLower)) {
    section = 'Details'
  } else if (/note|annotation/i.test(descLower)) {
    section = 'Notes'
  } else if (/schedule|table/i.test(descLower)) {
    section = 'Schedules'
  } else if (/plan|layout/i.test(descLower)) {
    section = 'Plans'
  }

  // Extract page reference
  const pageMatch = description.match(/(?:page|sheet|drawing)\s*([A-Z]?\d+(?:\.\d+)?)/i)
  const pageReference = pageMatch ? pageMatch[0] : undefined

  return {
    section,
    change_type: changeType,
    description: description.substring(0, 300),
    significance,
    page_reference: pageReference
  }
}

function categorizeChanges(changes: ChangeItem[]): Record<string, ChangeItem[]> {
  const categories: Record<string, ChangeItem[]> = {}

  for (const change of changes) {
    if (!categories[change.section]) {
      categories[change.section] = []
    }
    categories[change.section].push(change)
  }

  return categories
}

function identifyAffectedTrades(changes: ChangeItem[], docType?: string): string[] {
  const trades = new Set<string>()

  const tradeKeywords: Record<string, string[]> = {
    'Structural': ['structural', 'steel', 'concrete', 'foundation', 'beam', 'column'],
    'Architectural': ['architectural', 'finish', 'door', 'window', 'ceiling', 'wall'],
    'Mechanical': ['mechanical', 'hvac', 'duct', 'piping', 'equipment'],
    'Electrical': ['electrical', 'power', 'lighting', 'panel', 'conduit'],
    'Plumbing': ['plumbing', 'sanitary', 'water', 'drain', 'fixture'],
    'Fire Protection': ['fire', 'sprinkler', 'alarm', 'suppression'],
    'Civil': ['civil', 'site', 'grading', 'paving', 'utility'],
  }

  for (const change of changes) {
    const descLower = change.description.toLowerCase()

    for (const [trade, keywords] of Object.entries(tradeKeywords)) {
      if (keywords.some(kw => descLower.includes(kw))) {
        trades.add(trade)
      }
    }
  }

  // If document type hints at a specific trade
  if (docType) {
    const typeMap: Record<string, string> = {
      'structural': 'Structural',
      'architectural': 'Architectural',
      'mechanical': 'Mechanical',
      'electrical': 'Electrical',
      'plumbing': 'Plumbing',
      'civil': 'Civil',
    }

    for (const [key, trade] of Object.entries(typeMap)) {
      if (docType.toLowerCase().includes(key)) {
        trades.add(trade)
      }
    }
  }

  return Array.from(trades)
}

function generateRFIRecommendations(changes: ChangeItem[], docType?: string): string[] {
  const recommendations: string[] = []

  const majorChanges = changes.filter(c => c.significance === 'major')
  const dimensionChanges = changes.filter(c => c.section === 'Dimensions')
  const materialChanges = changes.filter(c => c.section === 'Materials/Specifications')

  if (majorChanges.length > 0) {
    recommendations.push('Submit RFI to confirm scope of major changes and impact on schedule')
  }

  if (dimensionChanges.length > 0) {
    recommendations.push('Verify dimensional changes do not conflict with adjacent work')
  }

  if (materialChanges.length > 0) {
    recommendations.push('Confirm material substitutions meet original design intent and lead times')
  }

  if (changes.some(c => c.change_type === 'added')) {
    recommendations.push('Submit RFI regarding added scope and contract implications')
  }

  if (changes.some(c => c.change_type === 'removed')) {
    recommendations.push('Verify removed items are not already ordered or installed')
  }

  return recommendations.slice(0, 5)
}

function generateActionItems(
  changes: ChangeItem[],
  affectedTrades: string[]
): Array<{ action: string; responsible: string; priority: 'low' | 'medium' | 'high' }> {
  const items: Array<{ action: string; responsible: string; priority: 'low' | 'medium' | 'high' }> = []

  // Notify affected trades
  if (affectedTrades.length > 0) {
    items.push({
      action: `Distribute revised documents to affected trades: ${affectedTrades.join(', ')}`,
      responsible: 'Project Engineer',
      priority: 'high'
    })
  }

  // Review major changes
  const majorCount = changes.filter(c => c.significance === 'major').length
  if (majorCount > 0) {
    items.push({
      action: `Review ${majorCount} major change(s) with superintendent`,
      responsible: 'Project Manager',
      priority: 'high'
    })
  }

  // Update submittals
  if (changes.some(c => c.section === 'Materials/Specifications')) {
    items.push({
      action: 'Review submittal log for items affected by specification changes',
      responsible: 'Project Engineer',
      priority: 'medium'
    })
  }

  // Cloud/mark drawings
  items.push({
    action: 'Verify revision clouds are clearly marked on affected sheets',
    responsible: 'Document Control',
    priority: 'medium'
  })

  // Cost impact assessment
  if (changes.some(c => c.significance === 'major')) {
    items.push({
      action: 'Assess cost impact of changes for potential change order',
      responsible: 'Project Manager',
      priority: 'high'
    })
  }

  return items.slice(0, 6)
}

function generateWarnings(changes: ChangeItem[], docType?: string): string[] {
  const warnings: string[] = []

  const majorChanges = changes.filter(c => c.significance === 'major')
  if (majorChanges.length >= 3) {
    warnings.push('Multiple major changes detected - verify all impacts before proceeding')
  }

  if (changes.some(c => c.change_type === 'removed')) {
    warnings.push('Removed items may already be in progress - verify field conditions')
  }

  if (changes.some(c => /structural|safety|code/i.test(c.description))) {
    warnings.push('Changes may affect structural integrity or code compliance - verify with engineer')
  }

  if (changes.some(c => /schedule|sequence|phase/i.test(c.description))) {
    warnings.push('Changes may impact construction sequence - review master schedule')
  }

  return warnings.slice(0, 4)
}

function generateChangeSummary(changes: ChangeItem[]): string {
  if (changes.length === 0) {
    return 'No changes identified between revisions'
  }

  const majorCount = changes.filter(c => c.significance === 'major').length
  const addedCount = changes.filter(c => c.change_type === 'added').length
  const removedCount = changes.filter(c => c.change_type === 'removed').length
  const modifiedCount = changes.filter(c => c.change_type === 'modified').length

  const parts: string[] = []

  if (majorCount > 0) {
    parts.push(`${majorCount} major change${majorCount > 1 ? 's' : ''}`)
  }

  if (addedCount > 0) {
    parts.push(`${addedCount} addition${addedCount > 1 ? 's' : ''}`)
  }

  if (removedCount > 0) {
    parts.push(`${removedCount} deletion${removedCount > 1 ? 's' : ''}`)
  }

  if (modifiedCount > 0) {
    parts.push(`${modifiedCount} modification${modifiedCount > 1 ? 's' : ''}`)
  }

  return `${changes.length} total changes: ${parts.join(', ')}`
}
