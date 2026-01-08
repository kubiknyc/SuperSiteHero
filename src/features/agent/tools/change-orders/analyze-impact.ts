/**
 * Change Order Impact Analysis Tool
 * Analyzes the cost and schedule impact of proposed change orders
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface AnalyzeImpactInput {
  project_id: string
  description: string
  estimated_cost?: number
  estimated_days?: number
  affected_areas?: string[]
  change_type?: 'addition' | 'deletion' | 'modification' | 'unforeseen'
}

interface AnalyzeImpactOutput {
  cost_analysis: {
    estimated_cost: number
    contingency_impact: string
    budget_remaining_after: number
    percent_of_original_contract: number
    recommendation: string
  }
  schedule_analysis: {
    estimated_days: number
    critical_path_impact: boolean
    affected_milestones: string[]
    recommendation: string
  }
  risk_factors: string[]
  similar_change_orders: Array<{
    number: string
    description: string
    final_cost: number
    days_added: number
  }>
  next_steps: string[]
}

export const analyzeChangeOrderImpactTool = createTool<AnalyzeImpactInput, AnalyzeImpactOutput>({
  name: 'analyze_change_order_impact',
  description: 'Analyzes the potential cost and schedule impact of a proposed change order. Compares against budget, finds similar past COs, and identifies risks.',
  category: 'change_orders',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze the change order for'
      },
      description: {
        type: 'string',
        description: 'Description of the proposed change'
      },
      estimated_cost: {
        type: 'number',
        description: 'Estimated cost of the change in dollars'
      },
      estimated_days: {
        type: 'number',
        description: 'Estimated schedule impact in days'
      },
      affected_areas: {
        type: 'array',
        items: { type: 'string' },
        description: 'Areas of the project affected by this change'
      },
      change_type: {
        type: 'string',
        enum: ['addition', 'deletion', 'modification', 'unforeseen'],
        description: 'Type of change order'
      }
    },
    required: ['project_id', 'description']
  },

  async execute(input: AnalyzeImpactInput, context: AgentContext): Promise<AnalyzeImpactOutput> {
    const { project_id, description, estimated_cost = 0, estimated_days = 0, affected_areas = [], change_type = 'modification' } = input

    // Get project budget info
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, budget, contract_value, contingency_amount, contingency_used, spent_to_date')
      .eq('id', project_id)
      .single()

    // Get existing change orders for comparison
    const { data: existingCOs } = await supabase
      .from('change_orders')
      .select('id, co_number, title, description, requested_amount, approved_amount, schedule_impact_days, status')
      .eq('project_id', project_id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Calculate cost analysis
    const originalContract = project?.contract_value || project?.budget || 0
    const contingencyTotal = project?.contingency_amount || 0
    const contingencyUsed = project?.contingency_used || 0
    const contingencyRemaining = contingencyTotal - contingencyUsed

    const percentOfContract = originalContract > 0
      ? (estimated_cost / originalContract) * 100
      : 0

    const budgetRemainingAfter = contingencyRemaining - estimated_cost

    let costRecommendation = ''
    if (estimated_cost <= contingencyRemaining * 0.25) {
      costRecommendation = 'Within normal contingency usage. Recommend approval if scope is valid.'
    } else if (estimated_cost <= contingencyRemaining) {
      costRecommendation = 'Significant contingency draw. Ensure thorough documentation and consider negotiation.'
    } else {
      costRecommendation = 'Exceeds remaining contingency. Requires budget amendment or value engineering.'
    }

    // Analyze schedule impact
    const criticalPathImpact = estimated_days > 5 ||
      affected_areas?.some(area =>
        /critical|foundation|structure|MEP|enclosure/i.test(area)
      )

    // Mock affected milestones based on areas
    const affectedMilestones = inferAffectedMilestones(affected_areas, estimated_days)

    let scheduleRecommendation = ''
    if (estimated_days === 0) {
      scheduleRecommendation = 'No schedule impact claimed. Verify with contractor.'
    } else if (estimated_days <= 5 && !criticalPathImpact) {
      scheduleRecommendation = 'Minor schedule impact. Can likely be absorbed with float.'
    } else if (criticalPathImpact) {
      scheduleRecommendation = 'Potential critical path impact. Request detailed schedule analysis from contractor.'
    } else {
      scheduleRecommendation = 'Moderate schedule impact. Review against project float and milestones.'
    }

    // Find similar past change orders
    const similarCOs = findSimilarChangeOrders(description, existingCOs || [])

    // Identify risk factors
    const riskFactors = identifyRiskFactors(
      description,
      estimated_cost,
      estimated_days,
      change_type,
      percentOfContract,
      similarCOs.length
    )

    // Generate next steps
    const nextSteps = generateNextSteps(
      estimated_cost,
      contingencyRemaining,
      criticalPathImpact,
      change_type
    )

    return {
      cost_analysis: {
        estimated_cost,
        contingency_impact: `$${estimated_cost.toLocaleString()} of $${contingencyRemaining.toLocaleString()} remaining contingency`,
        budget_remaining_after: Math.max(0, budgetRemainingAfter),
        percent_of_original_contract: Math.round(percentOfContract * 100) / 100,
        recommendation: costRecommendation
      },
      schedule_analysis: {
        estimated_days,
        critical_path_impact: criticalPathImpact,
        affected_milestones: affectedMilestones,
        recommendation: scheduleRecommendation
      },
      risk_factors: riskFactors,
      similar_change_orders: similarCOs,
      next_steps: nextSteps
    }
  }
})

function inferAffectedMilestones(areas: string[], days: number): string[] {
  const milestones: string[] = []

  if (days > 0) {
    milestones.push('Substantial Completion (potential impact)')
  }

  for (const area of areas) {
    const areaLower = area.toLowerCase()
    if (/foundation|excavation/i.test(areaLower)) {
      milestones.push('Foundation Complete')
    }
    if (/steel|structure/i.test(areaLower)) {
      milestones.push('Structural Topping Out')
    }
    if (/enclosure|envelope|roof/i.test(areaLower)) {
      milestones.push('Building Enclosed')
    }
    if (/mep|mechanical|electrical|plumbing/i.test(areaLower)) {
      milestones.push('MEP Rough-In Complete')
    }
    if (/finish|interior/i.test(areaLower)) {
      milestones.push('Interior Finishes')
    }
  }

  return [...new Set(milestones)]
}

function findSimilarChangeOrders(description: string, existingCOs: any[]): Array<{
  number: string
  description: string
  final_cost: number
  days_added: number
}> {
  const keywords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3)

  return existingCOs
    .filter(co => {
      const coText = (co.title + ' ' + co.description).toLowerCase()
      return keywords.some(kw => coText.includes(kw))
    })
    .slice(0, 3)
    .map(co => ({
      number: co.co_number || 'N/A',
      description: co.title || co.description?.substring(0, 50) || 'N/A',
      final_cost: co.approved_amount || co.requested_amount || 0,
      days_added: co.schedule_impact_days || 0
    }))
}

function identifyRiskFactors(
  description: string,
  cost: number,
  days: number,
  changeType: string,
  percentOfContract: number,
  similarCount: number
): string[] {
  const risks: string[] = []

  if (percentOfContract > 2) {
    risks.push('Large single change (>2% of contract value) - requires detailed cost breakdown')
  }

  if (changeType === 'unforeseen') {
    risks.push('Unforeseen condition - verify site conditions and consider geotechnical review')
  }

  if (days > 10) {
    risks.push('Significant time extension - may affect liquidated damages or incentives')
  }

  if (/design change|architect|engineer/i.test(description)) {
    risks.push('Design-related change - may have professional liability implications')
  }

  if (/owner.*request|add.*scope/i.test(description)) {
    risks.push('Owner-requested scope addition - ensure authorization documentation')
  }

  if (similarCount >= 3) {
    risks.push('Multiple similar changes identified - consider systemic issue investigation')
  }

  if (/unforeseen|hidden|discovered/i.test(description)) {
    risks.push('Discovery-based change - document existing conditions thoroughly')
  }

  if (/regulatory|code|inspection/i.test(description)) {
    risks.push('Code/regulatory change - verify compliance requirements and responsibility')
  }

  return risks
}

function generateNextSteps(
  cost: number,
  contingencyRemaining: number,
  criticalPath: boolean,
  changeType: string
): string[] {
  const steps: string[] = []

  steps.push('Request detailed cost breakdown from contractor')

  if (cost > 10000) {
    steps.push('Obtain independent cost estimate for comparison')
  }

  if (criticalPath) {
    steps.push('Request CPM schedule analysis showing impact')
  }

  if (changeType === 'unforeseen') {
    steps.push('Document existing/discovered conditions with photos')
  }

  if (cost > contingencyRemaining * 0.5) {
    steps.push('Present to owner for budget review/amendment')
  }

  steps.push('Circulate to design team for review and comment')
  steps.push('Log in change order tracking system')

  return steps
}
