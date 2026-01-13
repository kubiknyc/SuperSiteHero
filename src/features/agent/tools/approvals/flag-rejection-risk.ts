/**
 * Flag Rejection Risk Tool
 * Analyzes items pending approval to predict rejection likelihood based on historical patterns
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface FlagRejectionRiskInput {
  project_id: string
  item_type: 'change_order' | 'invoice' | 'submittal' | 'rfi' | 'payment_application' | 'purchase_order'
  item_id: string
}

interface RejectionReason {
  reason: string
  frequency: number
  severity: 'high' | 'medium' | 'low'
  description: string
}

interface MissingRequirement {
  requirement: string
  category: 'documentation' | 'information' | 'approval' | 'compliance'
  impact: 'blocking' | 'significant' | 'minor'
  recommendation: string
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  action: string
  expected_impact: string
  effort: 'low' | 'medium' | 'high'
}

interface FlagRejectionRiskOutput {
  item_type: string
  item_id: string
  item_description: string
  rejection_probability: number
  risk_level: 'high' | 'medium' | 'low'
  rejection_reasons: RejectionReason[]
  missing_requirements: MissingRequirement[]
  recommendations: Recommendation[]
  historical_context: {
    total_similar_items: number
    rejection_rate: number
    avg_rejections_before_approval: number
    common_revision_count: number
  }
}

// Common rejection reasons by item type
const REJECTION_PATTERNS: Record<string, { reason: string; weight: number; checkField?: string }[]> = {
  change_order: [
    { reason: 'Missing cost breakdown', weight: 0.25, checkField: 'cost_breakdown' },
    { reason: 'Incomplete scope description', weight: 0.2, checkField: 'scope_description' },
    { reason: 'No supporting documentation', weight: 0.2, checkField: 'attachments' },
    { reason: 'Value exceeds budget allocation', weight: 0.15 },
    { reason: 'Missing approval signatures', weight: 0.1, checkField: 'signatures' },
    { reason: 'Schedule impact not documented', weight: 0.1, checkField: 'schedule_impact' },
  ],
  invoice: [
    { reason: 'Missing backup documentation', weight: 0.25, checkField: 'backup_docs' },
    { reason: 'Incorrect billing rates', weight: 0.2 },
    { reason: 'Work not verified complete', weight: 0.2, checkField: 'work_verified' },
    { reason: 'Missing lien waiver', weight: 0.15, checkField: 'lien_waiver' },
    { reason: 'Exceeds contract value', weight: 0.1 },
    { reason: 'Duplicate charges', weight: 0.1 },
  ],
  submittal: [
    { reason: 'Does not meet specifications', weight: 0.25 },
    { reason: 'Incomplete technical data', weight: 0.2, checkField: 'technical_data' },
    { reason: 'Missing product samples', weight: 0.15, checkField: 'samples' },
    { reason: 'Incorrect spec section reference', weight: 0.15, checkField: 'spec_section' },
    { reason: 'Missing manufacturer certifications', weight: 0.15, checkField: 'certifications' },
    { reason: 'Quality standard not met', weight: 0.1 },
  ],
  rfi: [
    { reason: 'Question unclear or ambiguous', weight: 0.25, checkField: 'question' },
    { reason: 'Missing drawing references', weight: 0.2, checkField: 'drawing_refs' },
    { reason: 'Duplicate of existing RFI', weight: 0.15 },
    { reason: 'Information already in documents', weight: 0.15 },
    { reason: 'Missing location/area reference', weight: 0.15, checkField: 'location' },
    { reason: 'No impact assessment', weight: 0.1, checkField: 'impact' },
  ],
  payment_application: [
    { reason: 'Schedule of values mismatch', weight: 0.25, checkField: 'sov_match' },
    { reason: 'Missing certified payroll', weight: 0.2, checkField: 'certified_payroll' },
    { reason: 'Retainage calculation error', weight: 0.15 },
    { reason: 'Work not inspected', weight: 0.15, checkField: 'inspection_complete' },
    { reason: 'Missing stored materials documentation', weight: 0.15, checkField: 'stored_materials' },
    { reason: 'Insufficient progress photos', weight: 0.1, checkField: 'progress_photos' },
  ],
  purchase_order: [
    { reason: 'Exceeds approved budget', weight: 0.25 },
    { reason: 'Missing quotes/competitive bids', weight: 0.2, checkField: 'quotes' },
    { reason: 'Vendor not prequalified', weight: 0.15, checkField: 'vendor_approved' },
    { reason: 'Incomplete specifications', weight: 0.15, checkField: 'specifications' },
    { reason: 'Missing delivery schedule', weight: 0.15, checkField: 'delivery_schedule' },
    { reason: 'Insurance documentation missing', weight: 0.1, checkField: 'insurance_docs' },
  ],
}

// Required documentation by item type
const REQUIRED_DOCS: Record<string, { name: string; category: MissingRequirement['category'] }[]> = {
  change_order: [
    { name: 'Cost breakdown/estimate', category: 'documentation' },
    { name: 'Scope of work description', category: 'information' },
    { name: 'Schedule impact analysis', category: 'information' },
    { name: 'Supporting photos/documentation', category: 'documentation' },
    { name: 'Subcontractor quotes (if applicable)', category: 'documentation' },
  ],
  invoice: [
    { name: 'Detailed backup documentation', category: 'documentation' },
    { name: 'Lien waiver (conditional/unconditional)', category: 'compliance' },
    { name: 'Certified payroll (if required)', category: 'compliance' },
    { name: 'Work completion verification', category: 'approval' },
  ],
  submittal: [
    { name: 'Product data sheets', category: 'documentation' },
    { name: 'Manufacturer certifications', category: 'compliance' },
    { name: 'Spec section reference', category: 'information' },
    { name: 'Samples (if required)', category: 'documentation' },
  ],
  rfi: [
    { name: 'Clear question statement', category: 'information' },
    { name: 'Drawing/spec references', category: 'documentation' },
    { name: 'Location/area identification', category: 'information' },
    { name: 'Proposed solution (if any)', category: 'information' },
  ],
  payment_application: [
    { name: 'Updated schedule of values', category: 'documentation' },
    { name: 'Progress photos', category: 'documentation' },
    { name: 'Certified payroll', category: 'compliance' },
    { name: 'Stored materials documentation', category: 'documentation' },
    { name: 'Lien waivers from subs', category: 'compliance' },
  ],
  purchase_order: [
    { name: 'Vendor quotes/bids', category: 'documentation' },
    { name: 'Detailed specifications', category: 'information' },
    { name: 'Delivery schedule', category: 'information' },
    { name: 'Vendor insurance certificate', category: 'compliance' },
  ],
}

function getRiskLevel(probability: number): 'high' | 'medium' | 'low' {
  if (probability >= 0.6) {return 'high'}
  if (probability >= 0.3) {return 'medium'}
  return 'low'
}

function getSeverity(frequency: number): 'high' | 'medium' | 'low' {
  if (frequency >= 0.4) {return 'high'}
  if (frequency >= 0.2) {return 'medium'}
  return 'low'
}

function getImpact(category: MissingRequirement['category']): MissingRequirement['impact'] {
  if (category === 'compliance') {return 'blocking'}
  if (category === 'documentation' || category === 'approval') {return 'significant'}
  return 'minor'
}

export const flagRejectionRiskTool = createTool<FlagRejectionRiskInput, FlagRejectionRiskOutput>({
  name: 'flag_rejection_risk',
  displayName: 'Flag Rejection Risk',
  description: 'Analyzes items pending approval to predict rejection likelihood based on historical rejection patterns, missing documentation, incomplete information, and budget compliance.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      item_type: {
        type: 'string',
        enum: ['change_order', 'invoice', 'submittal', 'rfi', 'payment_application', 'purchase_order'],
        description: 'Type of item to analyze'
      },
      item_id: {
        type: 'string',
        description: 'ID of the item to analyze for rejection risk'
      }
    },
    required: ['project_id', 'item_type', 'item_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 700,

  async execute(input, context) {
    const { project_id, item_type, item_id } = input

    // Get item details based on type
    let itemData: Record<string, unknown> = {}
    let itemDescription = 'Unknown item'
    let itemValue: number | undefined

    if (item_type === 'change_order') {
      const { data } = await supabase
        .from('change_orders')
        .select('*')
        .eq('id', item_id)
        .single()
      if (data) {
        itemData = data as Record<string, unknown>
        itemDescription = (data.title || data.description || 'Change Order') as string
        itemValue = data.amount as number | undefined
      }
    } else if (item_type === 'invoice') {
      try {
        const { data } = await (supabase as any)
          .from('invoices')
          .select('*')
          .eq('id', item_id)
          .single()
        if (data) {
          itemData = data as Record<string, unknown>
          itemDescription = `Invoice #${data.invoice_number || 'N/A'} - ${data.vendor_name || 'Unknown'}`
          itemValue = data.amount as number | undefined
        }
      } catch (e) {
        itemDescription = `Invoice ${item_id}`
      }
    } else if (item_type === 'submittal') {
      try {
        const { data } = await (supabase as any)
          .from('submittals')
          .select('*')
          .eq('id', item_id)
          .single()
        if (data) {
          itemData = data as Record<string, unknown>
          itemDescription = `${data.number || 'N/A'}: ${data.title || 'Submittal'}`
        }
      } catch (e) {
        itemDescription = `Submittal ${item_id}`
      }
    } else if (item_type === 'rfi') {
      try {
        const { data } = await (supabase as any)
          .from('rfis')
          .select('*')
          .eq('id', item_id)
          .single()
        if (data) {
          itemData = data as Record<string, unknown>
          itemDescription = `RFI #${data.number || 'N/A'}: ${data.subject || 'Unknown'}`
        }
      } catch (e) {
        itemDescription = `RFI ${item_id}`
      }
    } else if (item_type === 'payment_application') {
      try {
        const { data } = await (supabase as any)
          .from('payment_applications')
          .select('*')
          .eq('id', item_id)
          .single()
        if (data) {
          itemData = data as Record<string, unknown>
          itemDescription = `Payment Application #${data.application_number || 'N/A'}`
          itemValue = data.amount as number | undefined
        }
      } catch (e) {
        itemDescription = `Payment Application ${item_id}`
      }
    } else if (item_type === 'purchase_order') {
      try {
        const { data } = await (supabase as any)
          .from('purchase_orders')
          .select('*')
          .eq('id', item_id)
          .single()
        if (data) {
          itemData = data as Record<string, unknown>
          itemDescription = `PO #${data.po_number || 'N/A'}`
          itemValue = data.amount as number | undefined
        }
      } catch (e) {
        itemDescription = `Purchase Order ${item_id}`
      }
    }

    // Get historical rejection data for this item type
    const { data: historicalItems } = await (supabase
      .from('workflow_items')
      .select('id, status, created_at, updated_at')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(100)) as any

    // Calculate historical statistics
    const totalItems = historicalItems?.length || 0
    const rejectedItems = historicalItems?.filter((item: any) =>
      item.status === 'rejected' || (item.revision_count && item.revision_count > 0)
    ) || []
    const rejectionRate = totalItems > 0 ? rejectedItems.length / totalItems : 0.2 // Default 20% if no history

    // Count revision statistics
    const revisionCounts = historicalItems?.map((item: any) => item.revision_count || 0) || []
    const avgRevisions = revisionCounts.length > 0
      ? revisionCounts.reduce((a, b) => a + b, 0) / revisionCounts.length
      : 0

    // Analyze rejection reasons from history
    const rejectionReasonCounts = new Map<string, number>()
    for (const item of rejectedItems) {
      const itemAny = item as any
      if (itemAny.rejection_reason) {
        const count = rejectionReasonCounts.get(itemAny.rejection_reason) || 0
        rejectionReasonCounts.set(itemAny.rejection_reason, count + 1)
      }
    }

    // Calculate rejection probability based on multiple factors
    let rejectionProbability = 0

    // Factor 1: Historical rejection rate for this item type
    rejectionProbability += rejectionRate * 0.3

    // Factor 2: Check for missing/incomplete fields based on patterns
    const patterns = REJECTION_PATTERNS[item_type] || []
    let missingFieldScore = 0
    const identifiedReasons: RejectionReason[] = []

    for (const pattern of patterns) {
      if (pattern.checkField) {
        const fieldValue = itemData[pattern.checkField]
        const isMissing = !fieldValue ||
          (Array.isArray(fieldValue) && fieldValue.length === 0) ||
          (typeof fieldValue === 'string' && fieldValue.trim() === '')

        if (isMissing) {
          missingFieldScore += pattern.weight
          identifiedReasons.push({
            reason: pattern.reason,
            frequency: pattern.weight,
            severity: getSeverity(pattern.weight),
            description: `This field appears to be missing or incomplete in the current submission`
          })
        }
      }
    }
    rejectionProbability += missingFieldScore * 0.4

    // Factor 3: Value-based risk (if applicable)
    if (itemValue) {
      // Get project budget info
      const { data: projectData } = await supabase
        .from('projects')
        .select('budget, contingency_remaining')
        .eq('id', project_id)
        .single()

      if (projectData) {
        const budget = projectData.budget as number || 0
        const contingency = projectData.contingency_remaining as number || 0

        if (item_type === 'change_order' && itemValue > contingency) {
          rejectionProbability += 0.15
          identifiedReasons.push({
            reason: 'Value exceeds remaining contingency',
            frequency: 0.4,
            severity: 'high',
            description: `Change order value ($${itemValue.toLocaleString()}) exceeds remaining contingency ($${contingency.toLocaleString()})`
          })
        }

        if (item_type === 'purchase_order' && budget > 0 && itemValue > budget * 0.1) {
          rejectionProbability += 0.1
          identifiedReasons.push({
            reason: 'Large purchase relative to budget',
            frequency: 0.3,
            severity: 'medium',
            description: `Purchase order represents significant portion of project budget`
          })
        }
      }
    }

    // Factor 4: Add historically frequent rejection reasons
    for (const [reason, count] of Array.from(rejectionReasonCounts.entries())) {
      const frequency = count / rejectedItems.length
      if (frequency >= 0.1 && !identifiedReasons.some(r => r.reason === reason)) {
        identifiedReasons.push({
          reason,
          frequency,
          severity: getSeverity(frequency),
          description: `Historically accounts for ${Math.round(frequency * 100)}% of rejections`
        })
      }
    }

    // Cap probability at 0.95
    rejectionProbability = Math.min(rejectionProbability, 0.95)

    // Identify missing requirements
    const requiredDocs = REQUIRED_DOCS[item_type] || []
    const missingRequirements: MissingRequirement[] = []

    for (const doc of requiredDocs) {
      // Check if document/field exists based on naming conventions
      const possibleFields = [
        doc.name.toLowerCase().replace(/\s+/g, '_'),
        doc.name.toLowerCase().replace(/\s+/g, ''),
        doc.name.split(' ')[0].toLowerCase()
      ]

      const hasField = possibleFields.some(field => {
        const value = itemData[field]
        return value && (
          (typeof value === 'string' && value.trim() !== '') ||
          (Array.isArray(value) && value.length > 0) ||
          (typeof value === 'boolean' && value) ||
          (typeof value === 'number')
        )
      })

      if (!hasField) {
        const impact = getImpact(doc.category)
        missingRequirements.push({
          requirement: doc.name,
          category: doc.category,
          impact,
          recommendation: impact === 'blocking'
            ? `Required: Add ${doc.name} before submission`
            : `Recommended: Include ${doc.name} to improve approval chances`
        })
      }
    }

    // Adjust probability based on missing requirements
    const blockingCount = missingRequirements.filter(r => r.impact === 'blocking').length
    const significantCount = missingRequirements.filter(r => r.impact === 'significant').length
    rejectionProbability += blockingCount * 0.15 + significantCount * 0.05
    rejectionProbability = Math.min(rejectionProbability, 0.95)

    // Generate recommendations
    const recommendations: Recommendation[] = []

    // Add recommendations for blocking items first
    for (const missing of missingRequirements.filter(r => r.impact === 'blocking')) {
      recommendations.push({
        priority: 'high',
        action: `Add ${missing.requirement}`,
        expected_impact: 'Significantly reduces rejection risk',
        effort: 'medium'
      })
    }

    // Add recommendations for high-severity rejection reasons
    for (const reason of identifiedReasons.filter(r => r.severity === 'high')) {
      if (!recommendations.some(r => r.action.includes(reason.reason))) {
        recommendations.push({
          priority: 'high',
          action: `Address: ${reason.reason}`,
          expected_impact: 'Reduces rejection probability by ~15-25%',
          effort: 'medium'
        })
      }
    }

    // Add general recommendations based on item type
    if (item_type === 'change_order' && !itemData.cost_breakdown) {
      recommendations.push({
        priority: 'high',
        action: 'Include detailed cost breakdown with labor, materials, and overhead',
        expected_impact: 'Most common reason for change order rejection',
        effort: 'medium'
      })
    }

    if (item_type === 'submittal' && !itemData.spec_section) {
      recommendations.push({
        priority: 'medium',
        action: 'Verify spec section reference matches project specifications',
        expected_impact: 'Prevents routing errors and delays',
        effort: 'low'
      })
    }

    if (rejectionProbability > 0.5) {
      recommendations.push({
        priority: 'medium',
        action: 'Consider pre-submission review with approver',
        expected_impact: 'Identifies issues before formal submission',
        effort: 'low'
      })
    }

    // Sort recommendations by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    // Sort rejection reasons by severity
    const severityOrder = { high: 0, medium: 1, low: 2 }
    identifiedReasons.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    const riskLevel = getRiskLevel(rejectionProbability)

    return {
      success: true,
      data: {
        item_type,
        item_id,
        item_description: itemDescription,
        rejection_probability: Math.round(rejectionProbability * 100) / 100,
        risk_level: riskLevel,
        rejection_reasons: identifiedReasons.slice(0, 10),
        missing_requirements: missingRequirements,
        recommendations: recommendations.slice(0, 8),
        historical_context: {
          total_similar_items: totalItems,
          rejection_rate: Math.round(rejectionRate * 100) / 100,
          avg_rejections_before_approval: Math.round(avgRevisions * 10) / 10,
          common_revision_count: Math.round(avgRevisions)
        }
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { rejection_probability, risk_level, rejection_reasons, missing_requirements, recommendations } = output

    const blockingCount = missing_requirements.filter(r => r.impact === 'blocking').length
    const highRiskReasons = rejection_reasons.filter(r => r.severity === 'high').length

    return {
      title: 'Rejection Risk Analysis',
      summary: `${Math.round(rejection_probability * 100)}% rejection risk (${risk_level})`,
      icon: risk_level === 'high' ? 'alert-triangle' : risk_level === 'medium' ? 'alert-circle' : 'check-circle',
      status: risk_level === 'high' ? 'error' : risk_level === 'medium' ? 'warning' : 'success',
      details: [
        { label: 'Risk Level', value: risk_level.toUpperCase(), type: 'badge' },
        { label: 'Rejection Probability', value: `${Math.round(rejection_probability * 100)}%`, type: 'text' },
        { label: 'High Risk Factors', value: highRiskReasons, type: 'text' },
        { label: 'Blocking Issues', value: blockingCount, type: 'text' },
        { label: 'Recommendations', value: recommendations.length, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
