/**
 * Labor Productivity Analysis Tool
 * Analyzes labor productivity metrics, compares to industry benchmarks, and identifies improvement areas
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface AnalyzeLaborProductivityInput {
  project_id: string
  date_range_start?: string
  date_range_end?: string
  trade_filter?: string[]
  include_benchmarks?: boolean
  breakdown_by?: 'trade' | 'activity' | 'week' | 'subcontractor'
}

interface TradeProductivity {
  trade: string
  total_hours: number
  total_workers: number
  units_completed: number
  unit_of_measure: string
  productivity_rate: number
  productivity_unit: string
  benchmark_rate: number | null
  variance_from_benchmark: number | null
  trend: 'improving' | 'stable' | 'declining'
  factors_affecting: string[]
}

interface ActivityProductivity {
  activity: string
  trade: string
  hours_worked: number
  units_completed: number
  unit_of_measure: string
  productivity_rate: number
  planned_rate: number | null
  efficiency: number
  start_date: string
  status: 'in_progress' | 'completed'
}

interface WeeklyTrend {
  week_start: string
  week_end: string
  total_hours: number
  average_workers: number
  productivity_index: number
  key_activities: string[]
  weather_impact_hours: number
  notes: string[]
}

interface ProductivityIssue {
  issue: string
  trade: string
  impact: 'low' | 'medium' | 'high'
  hours_affected: number
  root_cause: string
  recommended_action: string
}

interface AnalyzeLaborProductivityOutput {
  summary: {
    total_labor_hours: number
    total_workers: number
    average_daily_workers: number
    overall_productivity_index: number
    variance_from_plan: number
    labor_cost_per_unit: number | null
  }
  by_trade: TradeProductivity[]
  by_activity: ActivityProductivity[]
  weekly_trends: WeeklyTrend[]
  productivity_issues: ProductivityIssue[]
  improvement_opportunities: Array<{
    opportunity: string
    trade: string
    potential_savings_hours: number
    implementation: string
    priority: 'low' | 'medium' | 'high'
  }>
  benchmark_comparison: {
    trades_above_benchmark: string[]
    trades_below_benchmark: string[]
    overall_vs_industry: 'above' | 'at' | 'below'
  } | null
  forecast: {
    projected_completion_hours: number
    projected_completion_date: string | null
    confidence_level: 'low' | 'medium' | 'high'
    risk_factors: string[]
  }
  recommendations: string[]
}

export const analyzeLaborProductivityTool = createTool<AnalyzeLaborProductivityInput, AnalyzeLaborProductivityOutput>({
  name: 'analyze_labor_productivity',
  description: 'Analyzes labor productivity metrics across trades and activities. Compares to industry benchmarks, identifies improvement opportunities, and forecasts labor needs.',
  category: 'labor',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze labor productivity for'
      },
      date_range_start: {
        type: 'string',
        description: 'Start date for analysis (ISO format)'
      },
      date_range_end: {
        type: 'string',
        description: 'End date for analysis (ISO format)'
      },
      trade_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by specific trades'
      },
      include_benchmarks: {
        type: 'boolean',
        description: 'Include industry benchmark comparisons (default: true)'
      },
      breakdown_by: {
        type: 'string',
        enum: ['trade', 'activity', 'week', 'subcontractor'],
        description: 'Primary breakdown method (default: trade)'
      }
    },
    required: ['project_id']
  },

  async execute(input: AnalyzeLaborProductivityInput, context: AgentContext): Promise<AnalyzeLaborProductivityOutput> {
    const {
      project_id,
      date_range_start,
      date_range_end,
      trade_filter,
      include_benchmarks = true,
      breakdown_by = 'trade'
    } = input

    const now = new Date()
    const defaultStart = new Date(now)
    defaultStart.setDate(defaultStart.getDate() - 30)

    const startDate = date_range_start || defaultStart.toISOString().split('T')[0]
    const endDate = date_range_end || now.toISOString().split('T')[0]

    // Get labor/timekeeping data
    const laborQuery = supabase
      .from('daily_reports')
      .select(`
        *,
        labor_entries:daily_report_labor(*),
        weather:daily_report_weather(*)
      `)
      .eq('project_id', project_id)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .is('deleted_at', null)

    const { data: dailyReports } = await laborQuery.order('report_date', { ascending: true })

    // Get schedule activities for productivity targets
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    // Process labor data
    const tradeMap = new Map<string, {
      hours: number
      workers: Set<string>
      dates: Set<string>
      units: number
      uom: string
      dailyHours: number[]
    }>()

    const activityMap = new Map<string, ActivityProductivity>()
    const weeklyData = new Map<string, WeeklyTrend>()

    let totalHours = 0
    const totalWorkers = new Set<string>()
    const totalDays = new Set<string>()
    let weatherImpactHours = 0

    for (const report of dailyReports || []) {
      const reportDate = report.report_date
      totalDays.add(reportDate)

      // Process labor entries
      for (const entry of report.labor_entries || []) {
        const trade = entry.trade || entry.craft || 'General'
        const hours = entry.hours || entry.regular_hours || 0
        const workers = entry.headcount || entry.workers || 1
        const workerId = entry.worker_id || `${trade}-${reportDate}`

        // Skip if trade filter is specified and doesn't match
        if (trade_filter && trade_filter.length > 0 && !trade_filter.includes(trade)) {
          continue
        }

        totalHours += hours
        totalWorkers.add(workerId)

        // Track by trade
        if (!tradeMap.has(trade)) {
          tradeMap.set(trade, {
            hours: 0,
            workers: new Set(),
            dates: new Set(),
            units: 0,
            uom: 'LF',
            dailyHours: []
          })
        }

        const tradeData = tradeMap.get(trade)!
        tradeData.hours += hours
        tradeData.workers.add(workerId)
        tradeData.dates.add(reportDate)
        tradeData.dailyHours.push(hours)

        // Track activity if specified
        const activityName = entry.activity || entry.work_description || 'General Work'
        if (!activityMap.has(activityName)) {
          activityMap.set(activityName, {
            activity: activityName,
            trade,
            hours_worked: 0,
            units_completed: entry.quantity || 0,
            unit_of_measure: entry.unit || 'LF',
            productivity_rate: 0,
            planned_rate: null,
            efficiency: 100,
            start_date: reportDate,
            status: 'in_progress'
          })
        }

        const activityData = activityMap.get(activityName)!
        activityData.hours_worked += hours
        activityData.units_completed += entry.quantity || 0

        // Track weekly
        const weekStart = getWeekStart(reportDate)
        if (!weeklyData.has(weekStart)) {
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)
          weeklyData.set(weekStart, {
            week_start: weekStart,
            week_end: weekEnd.toISOString().split('T')[0],
            total_hours: 0,
            average_workers: 0,
            productivity_index: 100,
            key_activities: [],
            weather_impact_hours: 0,
            notes: []
          })
        }

        const weekData = weeklyData.get(weekStart)!
        weekData.total_hours += hours
      }

      // Track weather impact
      if (report.weather) {
        const weatherDelay = report.weather.delay_hours || 0
        weatherImpactHours += weatherDelay

        const weekStart = getWeekStart(reportDate)
        const weekData = weeklyData.get(weekStart)
        if (weekData) {
          weekData.weather_impact_hours += weatherDelay
        }
      }
    }

    // Calculate trade productivity
    const byTrade: TradeProductivity[] = []
    for (const [trade, data] of tradeMap) {
      const benchmark = include_benchmarks ? getIndustryBenchmark(trade) : null
      const productivity = data.units > 0 && data.hours > 0
        ? data.units / data.hours
        : 0

      const avgDailyHours = data.dailyHours.length > 0
        ? data.dailyHours.reduce((a, b) => a + b, 0) / data.dailyHours.length
        : 0

      const variance = benchmark
        ? Math.round(((productivity - benchmark.rate) / benchmark.rate) * 100)
        : null

      byTrade.push({
        trade,
        total_hours: data.hours,
        total_workers: data.workers.size,
        units_completed: data.units,
        unit_of_measure: data.uom,
        productivity_rate: Math.round(productivity * 100) / 100,
        productivity_unit: `${data.uom}/hour`,
        benchmark_rate: benchmark?.rate || null,
        variance_from_benchmark: variance,
        trend: calculateProductivityTrend(data.dailyHours),
        factors_affecting: identifyFactors(trade, data, weatherImpactHours)
      })
    }

    byTrade.sort((a, b) => b.total_hours - a.total_hours)

    // Calculate activity productivity
    const byActivity: ActivityProductivity[] = []
    for (const [, data] of activityMap) {
      data.productivity_rate = data.hours_worked > 0
        ? Math.round((data.units_completed / data.hours_worked) * 100) / 100
        : 0

      // Find matching scheduled activity for planned rate
      const matchedActivity = activities?.find(a =>
        (a.name || a.title || '').toLowerCase().includes(data.activity.toLowerCase())
      )

      if (matchedActivity && matchedActivity.planned_productivity) {
        data.planned_rate = matchedActivity.planned_productivity
        data.efficiency = data.planned_rate > 0
          ? Math.round((data.productivity_rate / data.planned_rate) * 100)
          : 100
      }

      byActivity.push(data)
    }

    byActivity.sort((a, b) => b.hours_worked - a.hours_worked)

    // Process weekly trends
    const weeklyTrends: WeeklyTrend[] = []
    for (const [, data] of weeklyData) {
      // Calculate productivity index (simplified)
      const weekHoursPerWorker = totalWorkers.size > 0 ? data.total_hours / totalWorkers.size : 0
      data.productivity_index = weekHoursPerWorker > 0 ? Math.round((40 / weekHoursPerWorker) * 100) : 100

      weeklyTrends.push(data)
    }

    weeklyTrends.sort((a, b) => a.week_start.localeCompare(b.week_start))

    // Identify productivity issues
    const productivityIssues = identifyProductivityIssues(byTrade, byActivity, weeklyTrends)

    // Identify improvement opportunities
    const improvementOpportunities = identifyImprovements(byTrade, byActivity, productivityIssues)

    // Benchmark comparison
    let benchmarkComparison = null
    if (include_benchmarks) {
      const aboveBenchmark = byTrade.filter(t => (t.variance_from_benchmark || 0) > 0).map(t => t.trade)
      const belowBenchmark = byTrade.filter(t => (t.variance_from_benchmark || 0) < -10).map(t => t.trade)

      const avgVariance = byTrade.reduce((sum, t) => sum + (t.variance_from_benchmark || 0), 0) / byTrade.length

      benchmarkComparison = {
        trades_above_benchmark: aboveBenchmark,
        trades_below_benchmark: belowBenchmark,
        overall_vs_industry: avgVariance > 5 ? 'above' as const : avgVariance < -5 ? 'below' as const : 'at' as const
      }
    }

    // Calculate forecast
    const forecast = calculateForecast(totalHours, byTrade, activities || [], project)

    // Overall metrics
    const daysWorked = totalDays.size
    const avgDailyWorkers = daysWorked > 0 ? totalWorkers.size / daysWorked : 0
    const plannedHours = activities?.reduce((sum, a) => sum + (a.planned_hours || 0), 0) || totalHours
    const varianceFromPlan = plannedHours > 0
      ? Math.round(((totalHours - plannedHours) / plannedHours) * 100)
      : 0

    // Generate recommendations
    const recommendations = generateProductivityRecommendations(
      byTrade,
      productivityIssues,
      improvementOpportunities,
      benchmarkComparison,
      varianceFromPlan
    )

    return {
      summary: {
        total_labor_hours: totalHours,
        total_workers: totalWorkers.size,
        average_daily_workers: Math.round(avgDailyWorkers * 10) / 10,
        overall_productivity_index: calculateOverallIndex(byTrade),
        variance_from_plan: varianceFromPlan,
        labor_cost_per_unit: null // Would need cost data
      },
      by_trade: byTrade,
      by_activity: byActivity.slice(0, 20),
      weekly_trends: weeklyTrends,
      productivity_issues: productivityIssues,
      improvement_opportunities: improvementOpportunities,
      benchmark_comparison: benchmarkComparison,
      forecast,
      recommendations
    }
  }
})

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Monday
  date.setDate(diff)
  return date.toISOString().split('T')[0]
}

interface BenchmarkData {
  rate: number
  unit: string
}

function getIndustryBenchmark(trade: string): BenchmarkData | null {
  // Industry standard productivity rates (units per hour)
  const benchmarks: Record<string, BenchmarkData> = {
    'Carpenter': { rate: 15, unit: 'SF/hour' },
    'Carpentry': { rate: 15, unit: 'SF/hour' },
    'Electrician': { rate: 3, unit: 'devices/hour' },
    'Electrical': { rate: 3, unit: 'devices/hour' },
    'Plumber': { rate: 2, unit: 'fixtures/hour' },
    'Plumbing': { rate: 2, unit: 'fixtures/hour' },
    'HVAC': { rate: 25, unit: 'LF/hour' },
    'Drywall': { rate: 50, unit: 'SF/hour' },
    'Painter': { rate: 100, unit: 'SF/hour' },
    'Painting': { rate: 100, unit: 'SF/hour' },
    'Mason': { rate: 35, unit: 'block/hour' },
    'Masonry': { rate: 35, unit: 'block/hour' },
    'Concrete': { rate: 5, unit: 'CY/hour' },
    'Ironworker': { rate: 50, unit: 'LB/hour' },
    'Iron Work': { rate: 50, unit: 'LB/hour' },
    'Roofing': { rate: 100, unit: 'SF/hour' },
    'Roofer': { rate: 100, unit: 'SF/hour' },
    'Flooring': { rate: 40, unit: 'SF/hour' },
    'Tile': { rate: 25, unit: 'SF/hour' },
    'Insulation': { rate: 150, unit: 'SF/hour' }
  }

  const tradeLower = trade.toLowerCase()
  for (const [key, value] of Object.entries(benchmarks)) {
    if (key.toLowerCase() === tradeLower || tradeLower.includes(key.toLowerCase())) {
      return value
    }
  }

  return null
}

function calculateProductivityTrend(dailyHours: number[]): 'improving' | 'stable' | 'declining' {
  if (dailyHours.length < 5) {return 'stable'}

  const midpoint = Math.floor(dailyHours.length / 2)
  const firstHalf = dailyHours.slice(0, midpoint)
  const secondHalf = dailyHours.slice(midpoint)

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const change = ((secondAvg - firstAvg) / firstAvg) * 100

  if (change > 10) {return 'improving'}
  if (change < -10) {return 'declining'}
  return 'stable'
}

function identifyFactors(
  trade: string,
  data: { hours: number; workers: Set<string>; dates: Set<string>; dailyHours: number[] },
  weatherImpactHours: number
): string[] {
  const factors: string[] = []

  // High variance in daily hours
  const avgHours = data.dailyHours.reduce((a, b) => a + b, 0) / data.dailyHours.length
  const variance = data.dailyHours.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) / data.dailyHours.length
  if (Math.sqrt(variance) > avgHours * 0.3) {
    factors.push('High variability in daily work hours')
  }

  // Weather impact
  if (weatherImpactHours > data.hours * 0.05) {
    factors.push('Weather delays impacting productivity')
  }

  // Crew size consistency
  if (data.workers.size < data.dates.size * 0.5) {
    factors.push('Inconsistent crew sizing')
  }

  // Trade-specific factors
  if (/concrete|masonry/i.test(trade)) {
    factors.push('Weather-sensitive work')
  }

  if (/electrical|plumb/i.test(trade)) {
    factors.push('Coordination with other trades required')
  }

  return factors.slice(0, 3)
}

function identifyProductivityIssues(
  byTrade: TradeProductivity[],
  byActivity: ActivityProductivity[],
  weeklyTrends: WeeklyTrend[]
): ProductivityIssue[] {
  const issues: ProductivityIssue[] = []

  // Trades significantly below benchmark
  for (const trade of byTrade) {
    if (trade.variance_from_benchmark !== null && trade.variance_from_benchmark < -20) {
      issues.push({
        issue: `${trade.trade} productivity ${Math.abs(trade.variance_from_benchmark)}% below industry benchmark`,
        trade: trade.trade,
        impact: trade.variance_from_benchmark < -30 ? 'high' : 'medium',
        hours_affected: trade.total_hours,
        root_cause: trade.factors_affecting[0] || 'Requires investigation',
        recommended_action: `Review ${trade.trade} work methods and crew composition`
      })
    }
  }

  // Declining trends
  for (const trade of byTrade) {
    if (trade.trend === 'declining') {
      issues.push({
        issue: `${trade.trade} productivity trend is declining`,
        trade: trade.trade,
        impact: 'medium',
        hours_affected: trade.total_hours,
        root_cause: 'Productivity declining over analysis period',
        recommended_action: 'Meet with trade foreman to identify and address causes'
      })
    }
  }

  // Activities with low efficiency
  for (const activity of byActivity) {
    if (activity.efficiency < 70 && activity.hours_worked > 40) {
      issues.push({
        issue: `${activity.activity} at ${activity.efficiency}% efficiency`,
        trade: activity.trade,
        impact: activity.efficiency < 50 ? 'high' : 'medium',
        hours_affected: activity.hours_worked,
        root_cause: 'Activity taking longer than planned',
        recommended_action: 'Review activity scope and resource allocation'
      })
    }
  }

  return issues.slice(0, 10)
}

function identifyImprovements(
  byTrade: TradeProductivity[],
  byActivity: ActivityProductivity[],
  issues: ProductivityIssue[]
): Array<{
  opportunity: string
  trade: string
  potential_savings_hours: number
  implementation: string
  priority: 'low' | 'medium' | 'high'
}> {
  const improvements: Array<{
    opportunity: string
    trade: string
    potential_savings_hours: number
    implementation: string
    priority: 'low' | 'medium' | 'high'
  }> = []

  // Based on trades below benchmark
  for (const trade of byTrade) {
    if (trade.variance_from_benchmark !== null && trade.variance_from_benchmark < -10) {
      const potentialSavings = Math.abs(trade.variance_from_benchmark / 100) * trade.total_hours

      improvements.push({
        opportunity: `Improve ${trade.trade} productivity to benchmark`,
        trade: trade.trade,
        potential_savings_hours: Math.round(potentialSavings),
        implementation: 'Review work methods, prefabrication options, and crew optimization',
        priority: trade.variance_from_benchmark < -20 ? 'high' : 'medium'
      })
    }
  }

  // Based on high-hour activities
  const highHourActivities = byActivity
    .filter(a => a.hours_worked > 100 && a.efficiency < 90)
    .slice(0, 3)

  for (const activity of highHourActivities) {
    const savings = activity.hours_worked * (1 - activity.efficiency / 100)

    improvements.push({
      opportunity: `Optimize ${activity.activity}`,
      trade: activity.trade,
      potential_savings_hours: Math.round(savings),
      implementation: 'Analyze workflow, reduce wait times, improve coordination',
      priority: savings > 50 ? 'high' : 'medium'
    })
  }

  // General improvements
  improvements.push({
    opportunity: 'Implement daily production tracking',
    trade: 'All trades',
    potential_savings_hours: Math.round(byTrade.reduce((sum, t) => sum + t.total_hours, 0) * 0.05),
    implementation: 'Track daily quantities installed by trade for early issue detection',
    priority: 'medium'
  })

  return improvements.slice(0, 5)
}

function calculateOverallIndex(byTrade: TradeProductivity[]): number {
  if (byTrade.length === 0) {return 100}

  // Weighted average of variances from benchmark
  const totalHours = byTrade.reduce((sum, t) => sum + t.total_hours, 0)
  const weightedVariance = byTrade.reduce((sum, t) => {
    const weight = t.total_hours / totalHours
    return sum + (t.variance_from_benchmark || 0) * weight
  }, 0)

  return Math.round(100 + weightedVariance)
}

function calculateForecast(
  totalHours: number,
  byTrade: TradeProductivity[],
  activities: any[],
  project: any
): {
  projected_completion_hours: number
  projected_completion_date: string | null
  confidence_level: 'low' | 'medium' | 'high'
  risk_factors: string[]
} {
  // Estimate remaining work
  const completedActivities = activities.filter(a => a.status === 'completed')
  const inProgressActivities = activities.filter(a => a.status === 'in_progress')
  const pendingActivities = activities.filter(a => a.status === 'pending' || a.status === 'not_started')

  const completionRate = activities.length > 0
    ? completedActivities.length / activities.length
    : 0.5

  // Project remaining hours based on current rate
  const projectedTotal = completionRate > 0
    ? Math.round(totalHours / completionRate)
    : totalHours * 2

  const remainingHours = projectedTotal - totalHours

  // Estimate completion date
  const avgDailyHours = totalHours / 20 // Assume ~20 working days in period
  const daysRemaining = avgDailyHours > 0 ? remainingHours / avgDailyHours : 60
  const completionDate = new Date()
  completionDate.setDate(completionDate.getDate() + Math.round(daysRemaining))

  // Confidence and risks
  const riskFactors: string[] = []
  let confidence: 'low' | 'medium' | 'high' = 'medium'

  const decliningTrades = byTrade.filter(t => t.trend === 'declining')
  if (decliningTrades.length > byTrade.length / 2) {
    confidence = 'low'
    riskFactors.push('Multiple trades showing declining productivity')
  }

  const belowBenchmark = byTrade.filter(t => (t.variance_from_benchmark || 0) < -15)
  if (belowBenchmark.length > 0) {
    riskFactors.push('Some trades significantly below benchmark')
  }

  if (pendingActivities.length > completedActivities.length) {
    riskFactors.push('More activities pending than completed')
  }

  if (riskFactors.length === 0) {
    confidence = 'high'
  }

  return {
    projected_completion_hours: projectedTotal,
    projected_completion_date: project?.end_date || completionDate.toISOString().split('T')[0],
    confidence_level: confidence,
    risk_factors: riskFactors
  }
}

function generateProductivityRecommendations(
  byTrade: TradeProductivity[],
  issues: ProductivityIssue[],
  improvements: Array<{ opportunity: string; trade: string; potential_savings_hours: number; implementation: string; priority: 'low' | 'medium' | 'high' }>,
  benchmarkComparison: { trades_above_benchmark: string[]; trades_below_benchmark: string[]; overall_vs_industry: 'above' | 'at' | 'below' } | null,
  varianceFromPlan: number
): string[] {
  const recommendations: string[] = []

  // Critical issues first
  const highImpactIssues = issues.filter(i => i.impact === 'high')
  if (highImpactIssues.length > 0) {
    recommendations.push(`PRIORITY: Address ${highImpactIssues.length} high-impact productivity issues immediately`)
  }

  // Trades below benchmark
  if (benchmarkComparison && benchmarkComparison.trades_below_benchmark.length > 0) {
    recommendations.push(`Focus improvement on: ${benchmarkComparison.trades_below_benchmark.slice(0, 3).join(', ')}`)
  }

  // Overall performance
  if (varianceFromPlan > 15) {
    recommendations.push('Labor hours exceeding plan by >15% - review scope and methods')
  }

  // Top improvements
  const topImprovement = improvements.find(i => i.priority === 'high')
  if (topImprovement) {
    recommendations.push(`High-value opportunity: ${topImprovement.opportunity} (${topImprovement.potential_savings_hours} hrs potential savings)`)
  }

  // Declining trades
  const decliningTrades = byTrade.filter(t => t.trend === 'declining')
  if (decliningTrades.length > 0) {
    recommendations.push(`Monitor declining productivity in: ${decliningTrades.map(t => t.trade).join(', ')}`)
  }

  // Best practices
  if (benchmarkComparison?.overall_vs_industry === 'above') {
    recommendations.push('Overall productivity above industry average - maintain current practices')
  }

  recommendations.push('Review productivity metrics weekly with trade supervisors')

  return recommendations.slice(0, 6)
}
