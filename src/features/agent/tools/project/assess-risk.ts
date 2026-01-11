/**
 * Project Risk Assessment Tool
 * Identifies and analyzes project risks across multiple dimensions
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface AssessRiskInput {
  project_id: string
  focus_areas?: ('schedule' | 'budget' | 'safety' | 'quality' | 'scope')[]
  include_historical?: boolean
}

interface RiskItem {
  id: string
  category: string
  title: string
  description: string
  probability: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  risk_score: number
  status: 'identified' | 'mitigating' | 'monitoring' | 'closed'
  mitigation_strategy: string
  trigger_indicators: string[]
  owner: string
}

interface AssessRiskOutput {
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_score: number
  summary: {
    total_risks: number
    high_priority: number
    medium_priority: number
    low_priority: number
    mitigated: number
  }
  risks_by_category: Record<string, RiskItem[]>
  top_risks: RiskItem[]
  risk_trends: {
    direction: 'improving' | 'stable' | 'worsening'
    factors: string[]
  }
  early_warnings: Array<{
    indicator: string
    current_status: string
    threshold: string
    action_required: string
  }>
  mitigation_priorities: Array<{
    risk: string
    priority: number
    recommended_action: string
    estimated_effort: string
  }>
  recommendations: string[]
}

export const assessRiskTool = createTool<AssessRiskInput, AssessRiskOutput>({
  name: 'assess_project_risk',
  description: 'Performs comprehensive risk assessment across schedule, budget, safety, quality, and scope dimensions. Identifies early warning indicators and prioritizes mitigation strategies.',
  category: 'project',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to assess'
      },
      focus_areas: {
        type: 'array',
        items: { type: 'string', enum: ['schedule', 'budget', 'safety', 'quality', 'scope'] },
        description: 'Specific areas to focus assessment on'
      },
      include_historical: {
        type: 'boolean',
        description: 'Include historical risk patterns from similar projects'
      }
    },
    required: ['project_id']
  },

  async execute(input: AssessRiskInput, context: AgentContext): Promise<AssessRiskOutput> {
    const { project_id, focus_areas, include_historical = true } = input

    // Get project data
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    // Get existing risks
    const { data: existingRisks } = await supabase
      .from('project_risks')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get project metrics for risk indicators
    const [
      { data: scheduleData },
      { data: budgetData },
      { data: safetyData },
      { data: rfisData },
      { data: changeOrdersData }
    ] = await Promise.all([
      supabase.from('schedule_activities').select('*').eq('project_id', project_id).is('deleted_at', null),
      supabase.from('budget_items').select('*').eq('project_id', project_id),
      supabase.from('safety_incidents').select('*').eq('project_id', project_id),
      supabase.from('rfis').select('*').eq('project_id', project_id).is('deleted_at', null),
      supabase.from('change_orders').select('*').eq('project_id', project_id).is('deleted_at', null)
    ])

    // Analyze risks across dimensions
    const scheduleRisks = analyzeScheduleRisks(scheduleData || [], project)
    const budgetRisks = analyzeBudgetRisks(budgetData || [], changeOrdersData || [], project)
    const safetyRisks = analyzeSafetyRisks(safetyData || [], project)
    const qualityRisks = analyzeQualityRisks(rfisData || [], project)
    const scopeRisks = analyzeScopeRisks(changeOrdersData || [], rfisData || [], project)

    // Combine all risks
    let allRisks: RiskItem[] = []

    if (!focus_areas || focus_areas.includes('schedule')) {
      allRisks = [...allRisks, ...scheduleRisks]
    }
    if (!focus_areas || focus_areas.includes('budget')) {
      allRisks = [...allRisks, ...budgetRisks]
    }
    if (!focus_areas || focus_areas.includes('safety')) {
      allRisks = [...allRisks, ...safetyRisks]
    }
    if (!focus_areas || focus_areas.includes('quality')) {
      allRisks = [...allRisks, ...qualityRisks]
    }
    if (!focus_areas || focus_areas.includes('scope')) {
      allRisks = [...allRisks, ...scopeRisks]
    }

    // Add existing tracked risks
    for (const risk of existingRisks || []) {
      allRisks.push({
        id: risk.id,
        category: risk.category || 'General',
        title: risk.title || risk.name,
        description: risk.description,
        probability: risk.probability || 'medium',
        impact: risk.impact || 'medium',
        risk_score: calculateRiskScore(risk.probability, risk.impact),
        status: risk.status || 'identified',
        mitigation_strategy: risk.mitigation_strategy || '',
        trigger_indicators: risk.trigger_indicators || [],
        owner: risk.owner || risk.assigned_to || 'TBD'
      })
    }

    // Sort by risk score
    allRisks.sort((a, b) => b.risk_score - a.risk_score)

    // Categorize
    const risksByCategory: Record<string, RiskItem[]> = {}
    for (const risk of allRisks) {
      if (!risksByCategory[risk.category]) {
        risksByCategory[risk.category] = []
      }
      risksByCategory[risk.category].push(risk)
    }

    // Calculate summary
    const highPriority = allRisks.filter(r => r.risk_score >= 6).length
    const mediumPriority = allRisks.filter(r => r.risk_score >= 3 && r.risk_score < 6).length
    const lowPriority = allRisks.filter(r => r.risk_score < 3).length
    const mitigated = allRisks.filter(r => r.status === 'mitigating' || r.status === 'closed').length

    // Calculate overall risk level
    const avgScore = allRisks.length > 0
      ? allRisks.reduce((sum, r) => sum + r.risk_score, 0) / allRisks.length
      : 0
    const overallRiskLevel = determineOverallRiskLevel(avgScore, highPriority, allRisks.length)

    // Generate early warnings
    const earlyWarnings = generateEarlyWarnings(
      scheduleData || [],
      budgetData || [],
      changeOrdersData || [],
      rfisData || [],
      project
    )

    // Generate mitigation priorities
    const mitigationPriorities = generateMitigationPriorities(allRisks.slice(0, 5))

    // Determine risk trends
    const riskTrends = analyzeRiskTrends(allRisks, project)

    // Generate recommendations
    const recommendations = generateRiskRecommendations(
      overallRiskLevel,
      highPriority,
      earlyWarnings,
      risksByCategory
    )

    return {
      overall_risk_level: overallRiskLevel,
      risk_score: Math.round(avgScore * 10) / 10,
      summary: {
        total_risks: allRisks.length,
        high_priority: highPriority,
        medium_priority: mediumPriority,
        low_priority: lowPriority,
        mitigated
      },
      risks_by_category: risksByCategory,
      top_risks: allRisks.slice(0, 5),
      risk_trends: riskTrends,
      early_warnings: earlyWarnings,
      mitigation_priorities: mitigationPriorities,
      recommendations
    }
  }
})

function calculateRiskScore(probability: string, impact: string): number {
  const probScore = { low: 1, medium: 2, high: 3 }[probability] || 2
  const impactScore = { low: 1, medium: 2, high: 3 }[impact] || 2
  return probScore * impactScore
}

function determineOverallRiskLevel(
  avgScore: number,
  highPriority: number,
  totalRisks: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (highPriority >= 5 || avgScore >= 7) {return 'critical'}
  if (highPriority >= 3 || avgScore >= 5) {return 'high'}
  if (highPriority >= 1 || avgScore >= 3) {return 'medium'}
  return 'low'
}

function analyzeScheduleRisks(activities: any[], project: any): RiskItem[] {
  const risks: RiskItem[] = []
  const now = new Date()

  // Check for delayed activities
  const delayedActivities = activities.filter(a => {
    if (a.status === 'completed') {return false}
    const plannedEnd = new Date(a.planned_end || a.end_date)
    return plannedEnd < now
  })

  if (delayedActivities.length > 5) {
    risks.push({
      id: 'sched-001',
      category: 'Schedule',
      title: 'Multiple Activity Delays',
      description: `${delayedActivities.length} activities are currently behind schedule`,
      probability: 'high',
      impact: 'high',
      risk_score: 9,
      status: 'identified',
      mitigation_strategy: 'Implement schedule recovery plan with acceleration measures',
      trigger_indicators: ['Daily progress reports', 'Look-ahead schedule variances'],
      owner: 'Project Manager'
    })
  }

  // Check for critical path compression
  const criticalPathActivities = activities.filter(a => a.is_critical_path)
  const delayedCritical = criticalPathActivities.filter(a => {
    const plannedEnd = new Date(a.planned_end || a.end_date)
    return plannedEnd < now && a.status !== 'completed'
  })

  if (delayedCritical.length > 0) {
    risks.push({
      id: 'sched-002',
      category: 'Schedule',
      title: 'Critical Path Impact',
      description: `${delayedCritical.length} critical path activities are delayed`,
      probability: 'high',
      impact: 'high',
      risk_score: 9,
      status: 'identified',
      mitigation_strategy: 'Fast-track parallel work, add resources to critical activities',
      trigger_indicators: ['Critical path float reduction', 'Milestone slip'],
      owner: 'Project Manager'
    })
  }

  return risks
}

function analyzeBudgetRisks(budgetItems: any[], changeOrders: any[], project: any): RiskItem[] {
  const risks: RiskItem[] = []

  // Calculate budget status
  const totalBudget = budgetItems.reduce((sum, b) => sum + (b.budgeted_amount || 0), 0)
  const totalActual = budgetItems.reduce((sum, b) => sum + (b.actual_amount || 0), 0)
  const coTotal = changeOrders
    .filter(co => co.status === 'approved')
    .reduce((sum, co) => sum + (co.amount || 0), 0)

  const budgetVariance = totalBudget > 0 ? ((totalActual + coTotal - totalBudget) / totalBudget) * 100 : 0

  if (budgetVariance > 10) {
    risks.push({
      id: 'budget-001',
      category: 'Budget',
      title: 'Budget Overrun',
      description: `Project is ${budgetVariance.toFixed(1)}% over budget`,
      probability: 'high',
      impact: 'high',
      risk_score: 9,
      status: 'identified',
      mitigation_strategy: 'Implement cost controls, value engineering review',
      trigger_indicators: ['Monthly cost reports', 'Change order volume'],
      owner: 'Project Manager'
    })
  } else if (budgetVariance > 5) {
    risks.push({
      id: 'budget-002',
      category: 'Budget',
      title: 'Budget Pressure',
      description: `Project trending ${budgetVariance.toFixed(1)}% over budget`,
      probability: 'medium',
      impact: 'medium',
      risk_score: 4,
      status: 'monitoring',
      mitigation_strategy: 'Monitor spending closely, review contingency allocation',
      trigger_indicators: ['Weekly cost tracking', 'Commitment reports'],
      owner: 'Project Manager'
    })
  }

  // Check pending change orders
  const pendingCOs = changeOrders.filter(co => co.status === 'pending' || co.status === 'submitted')
  const pendingValue = pendingCOs.reduce((sum, co) => sum + (co.amount || 0), 0)

  if (pendingValue > totalBudget * 0.05) {
    risks.push({
      id: 'budget-003',
      category: 'Budget',
      title: 'Pending Change Orders',
      description: `$${pendingValue.toLocaleString()} in pending change orders`,
      probability: 'medium',
      impact: 'medium',
      risk_score: 4,
      status: 'monitoring',
      mitigation_strategy: 'Expedite CO review and negotiation',
      trigger_indicators: ['CO aging report', 'Dispute log'],
      owner: 'Project Manager'
    })
  }

  return risks
}

function analyzeSafetyRisks(incidents: any[], project: any): RiskItem[] {
  const risks: RiskItem[] = []
  const recentIncidents = incidents.filter(i => {
    const incidentDate = new Date(i.incident_date || i.created_at)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return incidentDate >= thirtyDaysAgo
  })

  if (recentIncidents.length >= 3) {
    risks.push({
      id: 'safety-001',
      category: 'Safety',
      title: 'Elevated Incident Rate',
      description: `${recentIncidents.length} safety incidents in the last 30 days`,
      probability: 'high',
      impact: 'high',
      risk_score: 9,
      status: 'identified',
      mitigation_strategy: 'Safety stand-down, root cause analysis, enhanced training',
      trigger_indicators: ['Daily safety observations', 'Near-miss reports'],
      owner: 'Safety Manager'
    })
  }

  const recordableIncidents = incidents.filter(i => i.recordable || i.severity === 'serious')
  if (recordableIncidents.length > 0) {
    risks.push({
      id: 'safety-002',
      category: 'Safety',
      title: 'Recordable Incidents',
      description: `${recordableIncidents.length} recordable safety incident(s)`,
      probability: 'medium',
      impact: 'high',
      risk_score: 6,
      status: 'mitigating',
      mitigation_strategy: 'Implement corrective actions from incident investigations',
      trigger_indicators: ['OSHA log', 'EMR tracking'],
      owner: 'Safety Manager'
    })
  }

  return risks
}

function analyzeQualityRisks(rfis: any[], project: any): RiskItem[] {
  const risks: RiskItem[] = []

  // Check for open RFI volume
  const openRFIs = rfis.filter(r => r.status !== 'closed' && r.status !== 'answered')

  if (openRFIs.length > 20) {
    risks.push({
      id: 'quality-001',
      category: 'Quality',
      title: 'High Open RFI Count',
      description: `${openRFIs.length} unresolved RFIs may indicate design issues`,
      probability: 'medium',
      impact: 'medium',
      risk_score: 4,
      status: 'monitoring',
      mitigation_strategy: 'Schedule RFI review meeting with design team',
      trigger_indicators: ['RFI aging report', 'Design coordination log'],
      owner: 'Project Engineer'
    })
  }

  // Check for RFI age
  const now = new Date()
  const oldRFIs = openRFIs.filter(r => {
    const created = new Date(r.created_at)
    const daysSinceCreated = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceCreated > 14
  })

  if (oldRFIs.length > 5) {
    risks.push({
      id: 'quality-002',
      category: 'Quality',
      title: 'Aged RFIs',
      description: `${oldRFIs.length} RFIs open more than 14 days`,
      probability: 'high',
      impact: 'medium',
      risk_score: 6,
      status: 'identified',
      mitigation_strategy: 'Escalate overdue RFIs, implement expedited review process',
      trigger_indicators: ['RFI response time metrics', 'Impact assessments'],
      owner: 'Project Engineer'
    })
  }

  return risks
}

function analyzeScopeRisks(changeOrders: any[], rfis: any[], project: any): RiskItem[] {
  const risks: RiskItem[] = []

  // Check change order trends
  const recentCOs = changeOrders.filter(co => {
    const created = new Date(co.created_at)
    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    return created >= sixtyDaysAgo
  })

  if (recentCOs.length > 10) {
    risks.push({
      id: 'scope-001',
      category: 'Scope',
      title: 'High Change Order Volume',
      description: `${recentCOs.length} change orders in last 60 days indicates scope instability`,
      probability: 'medium',
      impact: 'high',
      risk_score: 6,
      status: 'monitoring',
      mitigation_strategy: 'Review change order causes, enhance document coordination',
      trigger_indicators: ['CO trend analysis', 'Root cause categories'],
      owner: 'Project Manager'
    })
  }

  return risks
}

function generateEarlyWarnings(
  scheduleData: any[],
  budgetData: any[],
  changeOrders: any[],
  rfis: any[],
  project: any
): Array<{
  indicator: string
  current_status: string
  threshold: string
  action_required: string
}> {
  const warnings: Array<{
    indicator: string
    current_status: string
    threshold: string
    action_required: string
  }> = []

  // Schedule SPI
  const completedActivities = scheduleData.filter(a => a.status === 'completed').length
  const plannedComplete = scheduleData.filter(a => {
    const plannedEnd = new Date(a.planned_end || a.end_date)
    return plannedEnd <= new Date()
  }).length
  const spi = plannedComplete > 0 ? completedActivities / plannedComplete : 1

  if (spi < 0.9) {
    warnings.push({
      indicator: 'Schedule Performance Index (SPI)',
      current_status: spi.toFixed(2),
      threshold: '< 0.90',
      action_required: 'Schedule recovery review required'
    })
  }

  // Open RFI count
  const openRFIs = rfis.filter(r => r.status !== 'closed' && r.status !== 'answered').length
  if (openRFIs > 15) {
    warnings.push({
      indicator: 'Open RFI Count',
      current_status: `${openRFIs} open`,
      threshold: '> 15 open RFIs',
      action_required: 'Schedule RFI blitz meeting'
    })
  }

  // Pending CO value
  const totalBudget = budgetData.reduce((sum, b) => sum + (b.budgeted_amount || 0), 0)
  const pendingCOValue = changeOrders
    .filter(co => co.status === 'pending' || co.status === 'submitted')
    .reduce((sum, co) => sum + (co.amount || 0), 0)

  if (totalBudget > 0 && pendingCOValue / totalBudget > 0.05) {
    warnings.push({
      indicator: 'Pending Change Order Exposure',
      current_status: `$${pendingCOValue.toLocaleString()} (${((pendingCOValue / totalBudget) * 100).toFixed(1)}%)`,
      threshold: '> 5% of budget',
      action_required: 'Expedite CO negotiations'
    })
  }

  return warnings.slice(0, 5)
}

function generateMitigationPriorities(topRisks: RiskItem[]): Array<{
  risk: string
  priority: number
  recommended_action: string
  estimated_effort: string
}> {
  return topRisks.map((risk, index) => ({
    risk: risk.title,
    priority: index + 1,
    recommended_action: risk.mitigation_strategy,
    estimated_effort: risk.risk_score >= 6 ? 'High - immediate action' : 'Medium - within 1 week'
  }))
}

function analyzeRiskTrends(
  risks: RiskItem[],
  project: any
): { direction: 'improving' | 'stable' | 'worsening'; factors: string[] } {
  const highRisks = risks.filter(r => r.risk_score >= 6).length
  const mitigatedRisks = risks.filter(r => r.status === 'mitigating' || r.status === 'closed').length

  const factors: string[] = []

  if (highRisks > 3) {
    factors.push(`${highRisks} high-priority risks identified`)
  }

  if (mitigatedRisks > risks.length * 0.3) {
    factors.push(`${mitigatedRisks} risks being actively mitigated`)
  }

  if (highRisks > mitigatedRisks) {
    factors.push('New risks outpacing mitigation efforts')
    return { direction: 'worsening', factors }
  } else if (mitigatedRisks > highRisks) {
    factors.push('Mitigation efforts exceeding new risk identification')
    return { direction: 'improving', factors }
  }

  factors.push('Risk profile is stable')
  return { direction: 'stable', factors }
}

function generateRiskRecommendations(
  overallLevel: string,
  highPriority: number,
  earlyWarnings: any[],
  risksByCategory: Record<string, RiskItem[]>
): string[] {
  const recommendations: string[] = []

  if (overallLevel === 'critical') {
    recommendations.push('URGENT: Convene risk review meeting with executive team')
  }

  if (highPriority > 3) {
    recommendations.push(`Address ${highPriority} high-priority risks immediately`)
  }

  if (earlyWarnings.length > 0) {
    recommendations.push(`Monitor ${earlyWarnings.length} early warning indicators closely`)
  }

  // Category-specific recommendations
  if (risksByCategory['Schedule']?.length > 2) {
    recommendations.push('Schedule risks elevated - implement enhanced tracking')
  }

  if (risksByCategory['Budget']?.length > 2) {
    recommendations.push('Budget risks elevated - review cost controls')
  }

  if (risksByCategory['Safety']?.length > 0) {
    recommendations.push('Address all safety risks as priority one')
  }

  recommendations.push('Update risk register weekly and review in project team meetings')

  return recommendations.slice(0, 6)
}
