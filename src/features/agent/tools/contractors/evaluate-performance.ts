/**
 * Contractor Performance Evaluation Tool
 * Evaluates subcontractor performance across multiple metrics
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface EvaluatePerformanceInput {
  project_id: string
  subcontractor_id?: string
  evaluation_period?: 'month' | 'quarter' | 'project' | 'all'
  include_benchmarks?: boolean
}

interface PerformanceMetrics {
  schedule_adherence: number
  quality_score: number
  safety_score: number
  communication_score: number
  change_order_rate: number
  punch_list_rate: number
  overall_score: number
}

interface SubcontractorPerformance {
  id: string
  company_name: string
  trade: string
  contract_value: number
  metrics: PerformanceMetrics
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  trend: 'improving' | 'stable' | 'declining'
  strengths: string[]
  improvement_areas: string[]
  incidents: {
    safety: number
    quality: number
    schedule: number
  }
}

interface EvaluatePerformanceOutput {
  summary: {
    total_subcontractors: number
    average_score: number
    top_performers: number
    needs_improvement: number
  }
  subcontractor_rankings: SubcontractorPerformance[]
  by_trade: Record<string, { avg_score: number; count: number; top_performer: string }>
  project_benchmarks: {
    schedule_adherence: number
    quality_score: number
    safety_score: number
    industry_comparison: string
  }
  recommendations: string[]
  action_items: Array<{
    subcontractor: string
    action: string
    priority: 'low' | 'medium' | 'high'
    due_by: string
  }>
}

export const evaluateContractorPerformanceTool = createTool<EvaluatePerformanceInput, EvaluatePerformanceOutput>({
  name: 'evaluate_contractor_performance',
  description: 'Evaluates subcontractor performance across schedule, quality, safety, and communication metrics. Ranks contractors, identifies trends, and provides improvement recommendations.',
  category: 'contractors',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to evaluate contractors for'
      },
      subcontractor_id: {
        type: 'string',
        description: 'Specific subcontractor to evaluate (optional - evaluates all if not specified)'
      },
      evaluation_period: {
        type: 'string',
        enum: ['month', 'quarter', 'project', 'all'],
        description: 'Time period for evaluation (default: project)'
      },
      include_benchmarks: {
        type: 'boolean',
        description: 'Include industry benchmarks comparison (default: true)'
      }
    },
    required: ['project_id']
  },

  async execute(input: EvaluatePerformanceInput, context: AgentContext): Promise<EvaluatePerformanceOutput> {
    const {
      project_id,
      subcontractor_id,
      evaluation_period = 'project',
      include_benchmarks = true
    } = input

    // Get subcontractors
    let subcontractorQuery = supabase
      .from('subcontractors')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    if (subcontractor_id) {
      subcontractorQuery = subcontractorQuery.eq('id', subcontractor_id)
    }

    const { data: subcontractors } = await subcontractorQuery

    // Get performance data for each subcontractor
    const performances: SubcontractorPerformance[] = []

    for (const sub of subcontractors || []) {
      const performance = await evaluateSubcontractor(sub, project_id, evaluation_period)
      performances.push(performance)
    }

    // Sort by overall score
    performances.sort((a, b) => b.metrics.overall_score - a.metrics.overall_score)

    // Calculate summary
    const avgScore = performances.length > 0
      ? performances.reduce((sum, p) => sum + p.metrics.overall_score, 0) / performances.length
      : 0

    const topPerformers = performances.filter(p => p.grade === 'A' || p.grade === 'B').length
    const needsImprovement = performances.filter(p => p.grade === 'D' || p.grade === 'F').length

    // Group by trade
    const byTrade: Record<string, { avg_score: number; count: number; top_performer: string }> = {}
    for (const perf of performances) {
      const trade = perf.trade || 'General'
      if (!byTrade[trade]) {
        byTrade[trade] = { avg_score: 0, count: 0, top_performer: '' }
      }
      byTrade[trade].count++
      byTrade[trade].avg_score = (byTrade[trade].avg_score * (byTrade[trade].count - 1) + perf.metrics.overall_score) / byTrade[trade].count

      if (!byTrade[trade].top_performer || perf.metrics.overall_score > performances.find(p => p.company_name === byTrade[trade].top_performer)?.metrics.overall_score!) {
        byTrade[trade].top_performer = perf.company_name
      }
    }

    // Calculate project benchmarks
    const projectBenchmarks = calculateProjectBenchmarks(performances)

    // Generate recommendations
    const recommendations = generatePerformanceRecommendations(performances, avgScore)

    // Generate action items
    const actionItems = generateActionItems(performances)

    return {
      summary: {
        total_subcontractors: performances.length,
        average_score: Math.round(avgScore * 10) / 10,
        top_performers: topPerformers,
        needs_improvement: needsImprovement
      },
      subcontractor_rankings: performances,
      by_trade: byTrade,
      project_benchmarks: projectBenchmarks,
      recommendations,
      action_items: actionItems
    }
  }
})

async function evaluateSubcontractor(
  sub: any,
  projectId: string,
  period: string
): Promise<SubcontractorPerformance> {
  const now = new Date()
  let startDate: Date | null = null

  switch (period) {
    case 'month':
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 1)
      break
    case 'quarter':
      startDate = new Date(now)
      startDate.setMonth(startDate.getMonth() - 3)
      break
    case 'project':
    case 'all':
    default:
      startDate = null
  }

  // Get activities assigned to this subcontractor
  const { data: activities } = await supabase
    .from('schedule_activities')
    .select('*')
    .eq('project_id', projectId)
    .or(`subcontractor_id.eq.${sub.id},assigned_to.eq.${sub.id}`)

  // Get punch items
  const { data: punchItems } = await supabase
    .from('punch_items')
    .select('*')
    .eq('project_id', projectId)
    .eq('subcontractor_id', sub.id)

  // Get safety incidents
  const { data: safetyIncidents } = await supabase
    .from('safety_incidents')
    .select('*')
    .eq('project_id', projectId)
    .eq('subcontractor_id', sub.id)

  // Get RFIs related to this trade
  const { data: rfis } = await supabase
    .from('rfis')
    .select('*')
    .eq('project_id', projectId)
    .or(`subcontractor_id.eq.${sub.id},responsible_party_id.eq.${sub.id}`)

  // Get change orders
  const { data: changeOrders } = await supabase
    .from('change_orders')
    .select('*')
    .eq('project_id', projectId)
    .eq('subcontractor_id', sub.id)

  // Calculate schedule adherence
  const scheduleAdherence = calculateScheduleAdherence(activities || [])

  // Calculate quality score
  const qualityScore = calculateQualityScore(punchItems || [], rfis || [], activities || [])

  // Calculate safety score
  const safetyScore = calculateSafetyScore(safetyIncidents || [], activities || [])

  // Calculate communication score (based on RFI response time, submittal timeliness)
  const communicationScore = calculateCommunicationScore(rfis || [], sub)

  // Calculate change order rate
  const changeOrderRate = calculateChangeOrderRate(changeOrders || [], sub.contract_value || 0)

  // Calculate punch list rate
  const punchListRate = calculatePunchListRate(punchItems || [], activities || [])

  // Calculate overall score (weighted average)
  const overallScore = calculateOverallScore({
    schedule_adherence: scheduleAdherence,
    quality_score: qualityScore,
    safety_score: safetyScore,
    communication_score: communicationScore,
    change_order_rate: changeOrderRate,
    punch_list_rate: punchListRate,
    overall_score: 0
  })

  const metrics: PerformanceMetrics = {
    schedule_adherence: scheduleAdherence,
    quality_score: qualityScore,
    safety_score: safetyScore,
    communication_score: communicationScore,
    change_order_rate: changeOrderRate,
    punch_list_rate: punchListRate,
    overall_score: overallScore
  }

  // Determine grade
  const grade = determineGrade(overallScore)

  // Determine trend (would need historical data in real implementation)
  const trend = determineTrend(metrics)

  // Identify strengths and improvement areas
  const { strengths, improvementAreas } = identifyStrengthsAndWeaknesses(metrics)

  return {
    id: sub.id,
    company_name: sub.company_name || sub.name,
    trade: sub.trade || 'General',
    contract_value: sub.contract_value || 0,
    metrics,
    grade,
    trend,
    strengths,
    improvement_areas: improvementAreas,
    incidents: {
      safety: safetyIncidents?.length || 0,
      quality: punchItems?.length || 0,
      schedule: activities?.filter(a => {
        const plannedEnd = new Date(a.planned_end || a.end_date)
        const actualEnd = a.actual_end ? new Date(a.actual_end) : null
        return actualEnd && actualEnd > plannedEnd
      }).length || 0
    }
  }
}

function calculateScheduleAdherence(activities: any[]): number {
  if (activities.length === 0) return 100

  const completed = activities.filter(a => a.status === 'completed')
  if (completed.length === 0) return 100

  let onTimeCount = 0
  for (const activity of completed) {
    const plannedEnd = new Date(activity.planned_end || activity.end_date)
    const actualEnd = activity.actual_end ? new Date(activity.actual_end) : new Date()

    if (actualEnd <= plannedEnd) {
      onTimeCount++
    }
  }

  return Math.round((onTimeCount / completed.length) * 100)
}

function calculateQualityScore(punchItems: any[], rfis: any[], activities: any[]): number {
  // Base score of 100, deduct for issues
  let score = 100

  // Deduct for punch items per activity (more than expected)
  const activityCount = Math.max(activities.length, 1)
  const punchRate = punchItems.length / activityCount

  if (punchRate > 5) score -= 30
  else if (punchRate > 3) score -= 20
  else if (punchRate > 1) score -= 10

  // Deduct for RFIs that indicate errors
  const errorRFIs = rfis.filter(r =>
    r.type === 'clarification' ||
    r.subject?.toLowerCase().includes('error') ||
    r.subject?.toLowerCase().includes('mistake')
  )
  score -= errorRFIs.length * 5

  // Deduct for rework
  const reworkItems = punchItems.filter(p =>
    p.description?.toLowerCase().includes('rework') ||
    p.description?.toLowerCase().includes('redo')
  )
  score -= reworkItems.length * 3

  return Math.max(0, Math.min(100, score))
}

function calculateSafetyScore(incidents: any[], activities: any[]): number {
  // Base score of 100
  let score = 100

  // Deduct heavily for recordable incidents
  const recordable = incidents.filter(i => i.recordable || i.severity === 'serious')
  score -= recordable.length * 25

  // Deduct for other incidents
  const minorIncidents = incidents.filter(i => !i.recordable && i.severity !== 'serious')
  score -= minorIncidents.length * 10

  // Bonus for no incidents with significant work
  if (incidents.length === 0 && activities.length >= 10) {
    score = Math.min(100, score + 5)
  }

  return Math.max(0, Math.min(100, score))
}

function calculateCommunicationScore(rfis: any[], sub: any): number {
  let score = 80 // Base score

  // Check RFI response timeliness
  const respondedRFIs = rfis.filter(r => r.response_date && r.created_at)
  if (respondedRFIs.length > 0) {
    const avgResponseDays = respondedRFIs.reduce((sum, r) => {
      const created = new Date(r.created_at)
      const responded = new Date(r.response_date)
      return sum + Math.floor((responded.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    }, 0) / respondedRFIs.length

    if (avgResponseDays <= 3) score += 20
    else if (avgResponseDays <= 7) score += 10
    else if (avgResponseDays > 14) score -= 20
  }

  return Math.max(0, Math.min(100, score))
}

function calculateChangeOrderRate(changeOrders: any[], contractValue: number): number {
  if (contractValue === 0) return 100

  const coTotal = changeOrders.reduce((sum, co) => sum + Math.abs(co.amount || 0), 0)
  const coRate = (coTotal / contractValue) * 100

  // Lower CO rate = better score
  if (coRate <= 2) return 100
  if (coRate <= 5) return 90
  if (coRate <= 10) return 75
  if (coRate <= 15) return 60
  return 40
}

function calculatePunchListRate(punchItems: any[], activities: any[]): number {
  const activityCount = Math.max(activities.length, 1)
  const punchCount = punchItems.length
  const rate = punchCount / activityCount

  // Lower punch rate = better score
  if (rate <= 0.5) return 100
  if (rate <= 1) return 90
  if (rate <= 2) return 75
  if (rate <= 3) return 60
  if (rate <= 5) return 45
  return 30
}

function calculateOverallScore(metrics: PerformanceMetrics): number {
  // Weighted average
  const weights = {
    schedule_adherence: 0.25,
    quality_score: 0.25,
    safety_score: 0.25,
    communication_score: 0.10,
    change_order_rate: 0.10,
    punch_list_rate: 0.05
  }

  const weightedSum =
    metrics.schedule_adherence * weights.schedule_adherence +
    metrics.quality_score * weights.quality_score +
    metrics.safety_score * weights.safety_score +
    metrics.communication_score * weights.communication_score +
    metrics.change_order_rate * weights.change_order_rate +
    metrics.punch_list_rate * weights.punch_list_rate

  return Math.round(weightedSum)
}

function determineGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function determineTrend(metrics: PerformanceMetrics): 'improving' | 'stable' | 'declining' {
  // In real implementation, would compare to previous period
  // For now, use heuristics
  if (metrics.overall_score >= 85) return 'stable'
  if (metrics.quality_score < 70 || metrics.safety_score < 70) return 'declining'
  return 'stable'
}

function identifyStrengthsAndWeaknesses(metrics: PerformanceMetrics): {
  strengths: string[]
  improvementAreas: string[]
} {
  const strengths: string[] = []
  const improvementAreas: string[] = []

  if (metrics.schedule_adherence >= 90) {
    strengths.push('Excellent schedule adherence')
  } else if (metrics.schedule_adherence < 70) {
    improvementAreas.push('Schedule management needs improvement')
  }

  if (metrics.quality_score >= 90) {
    strengths.push('High quality workmanship')
  } else if (metrics.quality_score < 70) {
    improvementAreas.push('Quality control needs attention')
  }

  if (metrics.safety_score >= 95) {
    strengths.push('Outstanding safety record')
  } else if (metrics.safety_score < 80) {
    improvementAreas.push('Safety practices need enhancement')
  }

  if (metrics.communication_score >= 90) {
    strengths.push('Responsive communication')
  } else if (metrics.communication_score < 70) {
    improvementAreas.push('Communication responsiveness needs improvement')
  }

  if (metrics.change_order_rate >= 90) {
    strengths.push('Low change order rate')
  } else if (metrics.change_order_rate < 60) {
    improvementAreas.push('High change order rate')
  }

  return { strengths, improvementAreas }
}

function calculateProjectBenchmarks(performances: SubcontractorPerformance[]): {
  schedule_adherence: number
  quality_score: number
  safety_score: number
  industry_comparison: string
} {
  if (performances.length === 0) {
    return {
      schedule_adherence: 0,
      quality_score: 0,
      safety_score: 0,
      industry_comparison: 'No data'
    }
  }

  const avgSchedule = performances.reduce((sum, p) => sum + p.metrics.schedule_adherence, 0) / performances.length
  const avgQuality = performances.reduce((sum, p) => sum + p.metrics.quality_score, 0) / performances.length
  const avgSafety = performances.reduce((sum, p) => sum + p.metrics.safety_score, 0) / performances.length
  const overallAvg = (avgSchedule + avgQuality + avgSafety) / 3

  let comparison = 'Average'
  if (overallAvg >= 85) comparison = 'Above industry average'
  else if (overallAvg < 70) comparison = 'Below industry average'

  return {
    schedule_adherence: Math.round(avgSchedule),
    quality_score: Math.round(avgQuality),
    safety_score: Math.round(avgSafety),
    industry_comparison: comparison
  }
}

function generatePerformanceRecommendations(
  performances: SubcontractorPerformance[],
  avgScore: number
): string[] {
  const recommendations: string[] = []

  const lowPerformers = performances.filter(p => p.grade === 'D' || p.grade === 'F')
  if (lowPerformers.length > 0) {
    recommendations.push(`Schedule performance review meetings with ${lowPerformers.length} underperforming subcontractor(s)`)
  }

  const safetyIssues = performances.filter(p => p.metrics.safety_score < 80)
  if (safetyIssues.length > 0) {
    recommendations.push(`Conduct safety assessments with ${safetyIssues.length} subcontractor(s)`)
  }

  const topPerformers = performances.filter(p => p.grade === 'A')
  if (topPerformers.length > 0) {
    recommendations.push(`Recognize ${topPerformers.length} top-performing subcontractor(s)`)
  }

  if (avgScore < 75) {
    recommendations.push('Consider implementing subcontractor improvement program')
  }

  recommendations.push('Share performance metrics with all subcontractors monthly')

  return recommendations.slice(0, 5)
}

function generateActionItems(
  performances: SubcontractorPerformance[]
): Array<{
  subcontractor: string
  action: string
  priority: 'low' | 'medium' | 'high'
  due_by: string
}> {
  const actionItems: Array<{
    subcontractor: string
    action: string
    priority: 'low' | 'medium' | 'high'
    due_by: string
  }> = []

  const now = new Date()
  const oneWeek = new Date(now)
  oneWeek.setDate(oneWeek.getDate() + 7)
  const twoWeeks = new Date(now)
  twoWeeks.setDate(twoWeeks.getDate() + 14)

  for (const perf of performances) {
    if (perf.grade === 'F') {
      actionItems.push({
        subcontractor: perf.company_name,
        action: 'Urgent performance review meeting required',
        priority: 'high',
        due_by: oneWeek.toISOString().split('T')[0]
      })
    } else if (perf.grade === 'D') {
      actionItems.push({
        subcontractor: perf.company_name,
        action: 'Schedule performance improvement discussion',
        priority: 'medium',
        due_by: twoWeeks.toISOString().split('T')[0]
      })
    }

    if (perf.metrics.safety_score < 70) {
      actionItems.push({
        subcontractor: perf.company_name,
        action: 'Mandatory safety stand-down and review',
        priority: 'high',
        due_by: oneWeek.toISOString().split('T')[0]
      })
    }

    if (perf.improvement_areas.length >= 3) {
      actionItems.push({
        subcontractor: perf.company_name,
        action: `Address improvement areas: ${perf.improvement_areas.slice(0, 2).join(', ')}`,
        priority: 'medium',
        due_by: twoWeeks.toISOString().split('T')[0]
      })
    }
  }

  return actionItems.slice(0, 10)
}
