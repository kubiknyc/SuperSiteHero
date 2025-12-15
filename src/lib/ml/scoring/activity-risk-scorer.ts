/**
 * Activity Risk Scorer
 * Calculates risk scores for look-ahead activities based on multiple factors
 * including constraints, weather, trade performance, and resource allocation.
 */

import { supabase } from '@/lib/supabase'

// Use untyped supabase for tables not yet in generated types
const supabaseAny = supabase as any

import type {
  ActivityRiskPrediction,
  RiskFactor,
  RiskAlert,
  RiskAlertType,
  RiskAlertSeverity,
  RiskAnalysisRequest,
  RiskAnalysisResponse,
  WeatherImpact,
  ResourceConflict,
} from '@/types/ai'

// Risk factor weights
const RISK_WEIGHTS = {
  openConstraints: 0.25,
  tradePerformance: 0.20,
  weatherImpact: 0.15,
  resourceAllocation: 0.15,
  criticalPath: 0.15,
  predecessorCompletion: 0.10,
}

// Constraint type severity
const CONSTRAINT_SEVERITY: Record<string, number> = {
  material: 15,
  labor: 12,
  equipment: 10,
  rfi: 20,
  submittal: 18,
  permit: 25,
  inspection: 15,
  predecessor: 20,
  weather: 10,
  other: 8,
}

export const activityRiskScorer = {
  /**
   * Analyze risk for all activities in a project's look-ahead
   */
  async analyzeProjectRisk(request: RiskAnalysisRequest): Promise<RiskAnalysisResponse> {
    const analysisDate = request.analysis_date || new Date().toISOString().split('T')[0]
    const lookAheadWeeks = request.look_ahead_weeks || 3

    // Fetch look-ahead activities
    const endDate = new Date(analysisDate)
    endDate.setDate(endDate.getDate() + lookAheadWeeks * 7)

    const { data: activities } = await supabaseAny
      .from('look_ahead_activities')
      .select(`
        *,
        constraints:look_ahead_constraints(*),
        assignments:look_ahead_assignments(*)
      `)
      .eq('project_id', request.project_id)
      .gte('planned_start', analysisDate)
      .lte('planned_start', endDate.toISOString().split('T')[0])

    if (!activities?.length) {
      return {
        analysisDate,
        projectId: request.project_id,
        overallRiskScore: 0,
        atRiskActivities: [],
        alerts: [],
        weatherForecast: [],
        resourceConflicts: [],
      }
    }

    // Get historical trade performance
    const tradePerformance = await this.getTradePerformance(request.project_id)

    // Get weather forecast if requested
    let weatherForecast: WeatherImpact[] = []
    if (request.include_weather) {
      weatherForecast = await this.getWeatherForecast(request.project_id, analysisDate, lookAheadWeeks)
    }

    // Get critical path activities
    const criticalPathIds = await this.getCriticalPathActivities(request.project_id)

    // Score each activity
    const predictions: ActivityRiskPrediction[] = []
    const alerts: RiskAlert[] = []
    const resourceUsage: Map<string, { date: string; demand: number; activities: string[] }[]> = new Map()

    for (const activity of activities) {
      const prediction = await this.scoreActivity(
        activity,
        tradePerformance,
        weatherForecast,
        criticalPathIds,
        analysisDate
      )

      predictions.push(prediction)

      // Generate alerts for high-risk activities
      const activityAlerts = this.generateAlerts(activity, prediction, request.project_id)
      alerts.push(...activityAlerts)

      // Track resource usage
      this.trackResourceUsage(activity, resourceUsage)
    }

    // Calculate resource conflicts
    const resourceConflicts = this.calculateResourceConflicts(resourceUsage)

    // Generate resource conflict alerts
    for (const conflict of resourceConflicts) {
      if (conflict.demandPercent > 100) {
        alerts.push({
          id: crypto.randomUUID(),
          project_id: request.project_id,
          alert_type: 'resource_conflict',
          severity: conflict.demandPercent > 150 ? 'high' : 'medium',
          title: `Resource Over-allocation: ${conflict.resourceName || conflict.resourceType}`,
          description: `${conflict.resourceType} is over-allocated at ${conflict.demandPercent}% on ${conflict.conflictDate}`,
          risk_score: Math.min(100, conflict.demandPercent - 50),
          recommended_actions: [
            'Review resource assignments',
            'Consider rescheduling activities',
            'Request additional resources',
          ],
          is_acknowledged: false,
          is_resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }

    // Calculate overall project risk
    const atRiskActivities = predictions.filter(p => p.slip_risk_score > 60)
    const overallRiskScore = this.calculateOverallRisk(predictions, criticalPathIds)

    // Save predictions to database
    await this.savePredictions(predictions)

    // Save alerts
    await this.saveAlerts(alerts)

    return {
      analysisDate,
      projectId: request.project_id,
      overallRiskScore,
      atRiskActivities,
      alerts,
      weatherForecast,
      resourceConflicts,
    }
  },

  /**
   * Score an individual activity
   */
  async scoreActivity(
    activity: any,
    tradePerformance: Map<string, number>,
    weatherForecast: WeatherImpact[],
    criticalPathIds: Set<string>,
    analysisDate: string
  ): Promise<ActivityRiskPrediction> {
    const riskFactors: RiskFactor[] = []
    let totalScore = 0

    // 1. Open constraints impact
    const openConstraints = activity.constraints?.filter((c: any) => c.status === 'open') || []
    const constraintScore = this.calculateConstraintScore(openConstraints)
    if (constraintScore > 0) {
      riskFactors.push({
        factor: 'Open Constraints',
        impact: constraintScore * RISK_WEIGHTS.openConstraints,
        description: `${openConstraints.length} open constraint(s)`,
        mitigationSuggestion: 'Review and resolve open constraints before activity start',
      })
    }
    totalScore += constraintScore * RISK_WEIGHTS.openConstraints

    // 2. Trade historical performance
    const tradePPC = tradePerformance.get(activity.trade) || 80
    const tradeScore = this.calculateTradeScore(tradePPC)
    if (tradeScore > 20) {
      riskFactors.push({
        factor: 'Trade Performance',
        impact: tradeScore * RISK_WEIGHTS.tradePerformance,
        description: `Trade PPC: ${tradePPC}% (historical)`,
        mitigationSuggestion: tradePPC < 70 ? 'Consider additional oversight or alternative crews' : undefined,
      })
    }
    totalScore += tradeScore * RISK_WEIGHTS.tradePerformance

    // 3. Weather impact
    const activityDates = this.getActivityDateRange(activity)
    const weatherScore = this.calculateWeatherScore(activityDates, weatherForecast, activity.trade)
    if (weatherScore > 0) {
      riskFactors.push({
        factor: 'Weather',
        impact: weatherScore * RISK_WEIGHTS.weatherImpact,
        description: 'Adverse weather forecasted',
        mitigationSuggestion: 'Plan for weather delays or identify indoor alternatives',
      })
    }
    totalScore += weatherScore * RISK_WEIGHTS.weatherImpact

    // 4. Resource allocation
    const resourceScore = this.calculateResourceScore(activity)
    if (resourceScore > 20) {
      riskFactors.push({
        factor: 'Resource Allocation',
        impact: resourceScore * RISK_WEIGHTS.resourceAllocation,
        description: activity.assignments?.length ? 'Partial resource assignment' : 'No resources assigned',
        mitigationSuggestion: 'Confirm resource availability and assignments',
      })
    }
    totalScore += resourceScore * RISK_WEIGHTS.resourceAllocation

    // 5. Critical path multiplier
    const isOnCriticalPath = criticalPathIds.has(activity.id)
    if (isOnCriticalPath) {
      totalScore *= 1.2 // 20% increase for critical path
      riskFactors.push({
        factor: 'Critical Path',
        impact: totalScore * 0.2,
        description: 'Activity is on the critical path',
        mitigationSuggestion: 'Prioritize constraint resolution and resource allocation',
      })
    }

    // 6. Predecessor completion
    const predecessorScore = await this.calculatePredecessorScore(activity)
    if (predecessorScore > 20) {
      riskFactors.push({
        factor: 'Predecessor Status',
        impact: predecessorScore * RISK_WEIGHTS.predecessorCompletion,
        description: 'Predecessor activities at risk',
        mitigationSuggestion: 'Monitor predecessor progress closely',
      })
    }
    totalScore += predecessorScore * RISK_WEIGHTS.predecessorCompletion

    // Normalize score
    const finalScore = Math.min(100, Math.max(0, Math.round(totalScore)))

    // Calculate slip probability and delay projections
    const slipProbability = this.scoreToSlipProbability(finalScore)
    const delays = this.projectDelays(finalScore, activity)

    return {
      id: crypto.randomUUID(),
      activity_id: activity.id,
      project_id: activity.project_id,
      analysis_date: analysisDate,
      slip_probability: slipProbability,
      slip_risk_score: finalScore,
      projected_delay_days_low: delays.low,
      projected_delay_days_mid: delays.mid,
      projected_delay_days_high: delays.high,
      risk_factors: riskFactors,
      is_on_critical_path: isOnCriticalPath,
      model_version: '1.0-heuristic',
      created_at: new Date().toISOString(),
    }
  },

  /**
   * Calculate constraint score
   */
  calculateConstraintScore(constraints: any[]): number {
    if (!constraints.length) {return 0}

    let score = 0
    for (const constraint of constraints) {
      const severity = CONSTRAINT_SEVERITY[constraint.constraint_type] || 10
      const daysOverdue = constraint.expected_resolution_date
        ? Math.max(0, Math.floor((Date.now() - new Date(constraint.expected_resolution_date).getTime()) / (1000 * 60 * 60 * 24)))
        : 0

      score += severity + (daysOverdue * 2)
    }

    return Math.min(100, score)
  },

  /**
   * Calculate trade performance score
   */
  calculateTradeScore(ppc: number): number {
    if (ppc >= 90) {return 0}
    if (ppc >= 80) {return 15}
    if (ppc >= 70) {return 30}
    if (ppc >= 60) {return 50}
    return 70
  },

  /**
   * Calculate weather impact score
   */
  calculateWeatherScore(
    dates: { start: string; end: string },
    forecast: WeatherImpact[],
    trade: string
  ): number {
    const weatherSensitiveTrades = ['concrete', 'roofing', 'painting', 'excavation', 'masonry']
    const isWeatherSensitive = weatherSensitiveTrades.some(t =>
      trade?.toLowerCase().includes(t)
    )

    const relevantDays = forecast.filter(w => {
      const forecastDate = new Date(w.date)
      return forecastDate >= new Date(dates.start) && forecastDate <= new Date(dates.end)
    })

    let score = 0
    for (const day of relevantDays) {
      if (!day.isWorkable) {
        score += isWeatherSensitive ? 25 : 15
      } else if (day.precipitationProbability > 50) {
        score += isWeatherSensitive ? 10 : 5
      }
    }

    return Math.min(100, score)
  },

  /**
   * Calculate resource score
   */
  calculateResourceScore(activity: any): number {
    const requiredLabor = activity.labor_count || 0
    const assignedLabor = activity.assignments?.length || 0

    if (requiredLabor === 0) {return 0}
    if (assignedLabor === 0) {return 50}

    const coveragePercent = (assignedLabor / requiredLabor) * 100
    if (coveragePercent >= 100) {return 0}
    if (coveragePercent >= 80) {return 15}
    if (coveragePercent >= 50) {return 35}
    return 60
  },

  /**
   * Calculate predecessor completion score
   */
  async calculatePredecessorScore(activity: any): Promise<number> {
    // Would query predecessor activities and check their status
    // For now, return 0 (no predecessor risk)
    return 0
  },

  /**
   * Convert risk score to slip probability
   */
  scoreToSlipProbability(score: number): number {
    // Sigmoid-like transformation
    return Math.round(100 / (1 + Math.exp(-0.08 * (score - 50))))
  },

  /**
   * Project potential delays based on risk score
   */
  projectDelays(score: number, activity: any): { low: number; mid: number; high: number } {
    const duration = activity.duration_days || 1
    const baseDelay = (score / 100) * duration

    return {
      low: Math.round(baseDelay * 0.5),
      mid: Math.round(baseDelay),
      high: Math.round(baseDelay * 1.5),
    }
  },

  /**
   * Generate alerts for an activity
   */
  generateAlerts(
    activity: any,
    prediction: ActivityRiskPrediction,
    projectId: string
  ): RiskAlert[] {
    const alerts: RiskAlert[] = []

    // High risk activity alert
    if (prediction.slip_risk_score >= 70) {
      alerts.push({
        id: crypto.randomUUID(),
        project_id: projectId,
        alert_type: prediction.is_on_critical_path ? 'critical_path_threat' : 'activity_high_risk',
        severity: this.scoreToseverity(prediction.slip_risk_score),
        title: `High Risk: ${activity.activity_name}`,
        description: `Activity has ${prediction.slip_risk_score}% risk score with ${prediction.slip_probability}% slip probability`,
        affected_activity_id: activity.id,
        risk_score: prediction.slip_risk_score,
        recommended_actions: prediction.risk_factors
          .filter(f => f.mitigationSuggestion)
          .map(f => f.mitigationSuggestion!),
        is_acknowledged: false,
        is_resolved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // Constraint overdue alerts
    const overdueConstraints = activity.constraints?.filter((c: any) => {
      if (c.status !== 'open' || !c.expected_resolution_date) {return false}
      return new Date(c.expected_resolution_date) < new Date()
    }) || []

    for (const constraint of overdueConstraints) {
      alerts.push({
        id: crypto.randomUUID(),
        project_id: projectId,
        alert_type: 'constraint_overdue',
        severity: 'medium',
        title: `Overdue Constraint: ${constraint.description?.substring(0, 50)}`,
        description: `${constraint.constraint_type} constraint was expected to be resolved by ${constraint.expected_resolution_date}`,
        affected_activity_id: activity.id,
        affected_constraint_id: constraint.id,
        risk_score: 60,
        recommended_actions: [
          `Follow up on ${constraint.constraint_type} resolution`,
          'Update expected resolution date',
          'Escalate if needed',
        ],
        is_acknowledged: false,
        is_resolved: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    return alerts
  },

  /**
   * Get trade historical performance (PPC)
   */
  async getTradePerformance(projectId: string): Promise<Map<string, number>> {
    // Query historical PPC by trade from look_ahead_snapshots
    const { data } = await supabaseAny
      .from('look_ahead_snapshots')
      .select('metrics')
      .eq('project_id', projectId)
      .order('week_of', { ascending: false })
      .limit(12) // Last 12 weeks

    const tradeMap = new Map<string, { completed: number; planned: number }>()

    for (const snapshot of data || []) {
      const metrics = snapshot.metrics as any
      if (metrics?.tradePerformance) {
        for (const [trade, perf] of Object.entries(metrics.tradePerformance) as [string, any][]) {
          const existing = tradeMap.get(trade) || { completed: 0, planned: 0 }
          existing.completed += perf.completed || 0
          existing.planned += perf.planned || 0
          tradeMap.set(trade, existing)
        }
      }
    }

    const performanceMap = new Map<string, number>()
    for (const [trade, perf] of tradeMap.entries()) {
      const ppc = perf.planned > 0 ? (perf.completed / perf.planned) * 100 : 80
      performanceMap.set(trade, Math.round(ppc))
    }

    return performanceMap
  },

  /**
   * Get weather forecast (mock implementation)
   */
  async getWeatherForecast(
    projectId: string,
    startDate: string,
    weeks: number
  ): Promise<WeatherImpact[]> {
    // In production, would integrate with weather API
    const forecast: WeatherImpact[] = []
    const start = new Date(startDate)

    for (let i = 0; i < weeks * 7; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)

      // Mock forecast
      const precipProb = Math.random() * 100
      forecast.push({
        date: date.toISOString().split('T')[0],
        isWorkable: precipProb < 70,
        precipitationProbability: Math.round(precipProb),
        conditions: precipProb > 70 ? 'Rain' : precipProb > 40 ? 'Partly Cloudy' : 'Clear',
        impactedTrades: precipProb > 70 ? ['concrete', 'roofing', 'painting'] : [],
      })
    }

    return forecast
  },

  /**
   * Get critical path activities
   */
  async getCriticalPathActivities(projectId: string): Promise<Set<string>> {
    const { data } = await supabaseAny
      .from('critical_path_analysis')
      .select('critical_path_activities')
      .eq('project_id', projectId)
      .order('analysis_date', { ascending: false })
      .limit(1)
      .single()

    return new Set((data as any)?.critical_path_activities || [])
  },

  /**
   * Track resource usage for conflict detection
   */
  trackResourceUsage(
    activity: any,
    resourceUsage: Map<string, { date: string; demand: number; activities: string[] }[]>
  ): void {
    const dates = this.getActivityDateRange(activity)
    const resources = activity.trade ? [activity.trade] : []

    for (const resource of resources) {
      if (!resourceUsage.has(resource)) {
        resourceUsage.set(resource, [])
      }

      const usage = resourceUsage.get(resource)!
      // Simplified - would properly iterate through date range
      usage.push({
        date: dates.start,
        demand: activity.labor_count || 1,
        activities: [activity.id],
      })
    }
  },

  /**
   * Calculate resource conflicts
   */
  calculateResourceConflicts(
    resourceUsage: Map<string, { date: string; demand: number; activities: string[] }[]>
  ): ResourceConflict[] {
    const conflicts: ResourceConflict[] = []

    for (const [resource, usage] of resourceUsage.entries()) {
      // Group by date
      const byDate = new Map<string, { demand: number; activities: string[] }>()
      for (const u of usage) {
        const existing = byDate.get(u.date) || { demand: 0, activities: [] }
        existing.demand += u.demand
        existing.activities.push(...u.activities)
        byDate.set(u.date, existing)
      }

      // Check for over-allocation (assume 100% = 10 workers available)
      for (const [date, data] of byDate.entries()) {
        const demandPercent = (data.demand / 10) * 100
        if (demandPercent > 80) {
          conflicts.push({
            resourceType: 'labor',
            resourceName: resource,
            conflictDate: date,
            demandPercent: Math.round(demandPercent),
            affectedActivities: data.activities,
          })
        }
      }
    }

    return conflicts
  },

  /**
   * Calculate overall project risk
   */
  calculateOverallRisk(
    predictions: ActivityRiskPrediction[],
    criticalPathIds: Set<string>
  ): number {
    if (!predictions.length) {return 0}

    // Weight critical path activities higher
    let totalWeight = 0
    let weightedScore = 0

    for (const pred of predictions) {
      const weight = criticalPathIds.has(pred.activity_id) ? 2 : 1
      weightedScore += pred.slip_risk_score * weight
      totalWeight += weight
    }

    return Math.round(weightedScore / totalWeight)
  },

  /**
   * Helper functions
   */
  getActivityDateRange(activity: any): { start: string; end: string } {
    const start = activity.planned_start || new Date().toISOString().split('T')[0]
    const duration = activity.duration_days || 1
    const end = new Date(start)
    end.setDate(end.getDate() + duration)

    return { start, end: end.toISOString().split('T')[0] }
  },

  scoreToseverity(score: number): RiskAlertSeverity {
    if (score >= 90) {return 'critical'}
    if (score >= 70) {return 'high'}
    if (score >= 50) {return 'medium'}
    return 'low'
  },

  /**
   * Save predictions to database
   */
  async savePredictions(predictions: ActivityRiskPrediction[]): Promise<void> {
    if (!predictions.length) {return}

    const { error } = await supabaseAny
      .from('activity_risk_predictions')
      .upsert(
        predictions.map(p => ({
          ...p,
          risk_factors: p.risk_factors,
        })),
        { onConflict: 'activity_id,analysis_date' }
      )

    if (error) {
      console.error('Failed to save predictions:', error)
    }
  },

  /**
   * Save alerts to database
   */
  async saveAlerts(alerts: RiskAlert[]): Promise<void> {
    if (!alerts.length) {return}

    // Only insert new alerts (check for duplicates)
    const { error } = await supabaseAny
      .from('risk_alerts')
      .insert(alerts)

    if (error && !error.message.includes('duplicate')) {
      console.error('Failed to save alerts:', error)
    }
  },
}
