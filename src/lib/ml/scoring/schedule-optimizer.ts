/**
 * Schedule Optimizer
 * Critical path analysis, float calculation, constraint prioritization,
 * and schedule optimization recommendations.
 */

import { supabase } from '@/lib/supabase'
import type {
  ScheduleAnalysisRequest,
  ScheduleAnalysisResponse,
  CriticalPathResult,
  CriticalPathActivity,
  FloatOpportunity,
  ConstraintPriority,
  ScheduleOptimizationRecommendation,
  ResourceConflict,
} from '@/types/ai'

// Type assertion helper for tables not yet in Supabase types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any

interface ScheduleActivity {
  id: string
  name: string
  project_id: string
  planned_start: string
  planned_finish: string
  duration_days: number
  predecessors: string[]
  successors: string[]
  trade?: string
  labor_count?: number
  is_milestone?: boolean
  percent_complete?: number
}

interface ScheduleConstraint {
  id: string
  activity_id: string
  constraint_type: string
  description: string
  status: string
  expected_resolution_date?: string
}

export const scheduleOptimizer = {
  /**
   * Analyze project schedule and generate recommendations
   */
  async analyzeSchedule(request: ScheduleAnalysisRequest): Promise<ScheduleAnalysisResponse> {
    const analysisDate = request.analysis_date || new Date().toISOString().split('T')[0]

    // Fetch schedule data
    const { data: activities } = await supabase
      .from('look_ahead_activities')
      .select(`
        id,
        activity_name,
        project_id,
        planned_start,
        planned_finish,
        duration_days,
        trade,
        labor_count,
        is_milestone,
        percent_complete
      `)
      .eq('project_id', request.project_id)
      .order('planned_start')

    if (!activities?.length) {
      return {
        analysisDate,
        projectId: request.project_id,
        criticalPath: {
          activities: [],
          totalDurationDays: 0,
          projectEndDate: analysisDate,
          bottlenecks: [],
        },
        floatOpportunities: [],
        resourceConflicts: [],
        constraintPriorities: [],
        recommendations: [],
      }
    }

    // Fetch dependencies (table may not exist yet)
    const { data: dependencies } = await supabaseAny
      .from('look_ahead_dependencies')
      .select('*')
      .eq('project_id', request.project_id)

    // Fetch constraints
    const { data: constraints } = await supabase
      .from('look_ahead_constraints')
      .select('*')
      .eq('project_id', request.project_id)
      .eq('status', 'open')

    // Build activity map with predecessors/successors
    const activityMap = this.buildActivityMap(activities, dependencies || [])

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(activityMap)

    // Calculate float opportunities
    const floatOpportunities = this.findFloatOpportunities(activityMap, criticalPath)

    // Prioritize constraints
    const constraintPriorities = await this.prioritizeConstraints(
      constraints || [],
      activityMap,
      criticalPath
    )

    // Calculate resource conflicts if requested
    let resourceConflicts: ResourceConflict[] = []
    if (request.include_resource_leveling) {
      resourceConflicts = this.findResourceConflicts(activityMap)
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      criticalPath,
      floatOpportunities,
      constraintPriorities,
      resourceConflicts
    )

    // Save analysis
    await this.saveAnalysis(request.project_id, analysisDate, criticalPath, constraintPriorities)

    return {
      analysisDate,
      projectId: request.project_id,
      criticalPath,
      floatOpportunities,
      resourceConflicts,
      constraintPriorities,
      recommendations,
    }
  },

  /**
   * Build activity map with predecessors and successors
   */
  buildActivityMap(
    activities: any[],
    dependencies: any[]
  ): Map<string, ScheduleActivity> {
    const activityMap = new Map<string, ScheduleActivity>()

    // Initialize activities
    for (const act of activities) {
      activityMap.set(act.id, {
        id: act.id,
        name: act.activity_name,
        project_id: act.project_id,
        planned_start: act.planned_start,
        planned_finish: act.planned_finish,
        duration_days: act.duration_days || 1,
        predecessors: [],
        successors: [],
        trade: act.trade,
        labor_count: act.labor_count,
        is_milestone: act.is_milestone,
        percent_complete: act.percent_complete,
      })
    }

    // Add dependencies
    for (const dep of dependencies) {
      const predecessor = activityMap.get(dep.predecessor_id)
      const successor = activityMap.get(dep.successor_id)

      if (predecessor && successor) {
        predecessor.successors.push(dep.successor_id)
        successor.predecessors.push(dep.predecessor_id)
      }
    }

    return activityMap
  },

  /**
   * Calculate critical path using forward/backward pass
   */
  calculateCriticalPath(activityMap: Map<string, ScheduleActivity>): CriticalPathResult {
    const activities = Array.from(activityMap.values())
    if (!activities.length) {
      return {
        activities: [],
        totalDurationDays: 0,
        projectEndDate: new Date().toISOString().split('T')[0],
        bottlenecks: [],
      }
    }

    // Calculate early start/finish (forward pass)
    const earlyTimes = new Map<string, { es: number; ef: number }>()
    const processed = new Set<string>()

    // Find start activities (no predecessors)
    const startActivities = activities.filter(a => a.predecessors.length === 0)

    // Forward pass
    const queue = [...startActivities]
    for (const act of startActivities) {
      earlyTimes.set(act.id, { es: 0, ef: act.duration_days })
      processed.add(act.id)
    }

    while (queue.length > 0) {
      const current = queue.shift()!

      for (const succId of current.successors) {
        const succ = activityMap.get(succId)
        if (!succ) continue

        // Check if all predecessors processed
        const allPredsProcessed = succ.predecessors.every(p => processed.has(p))
        if (!allPredsProcessed) continue

        // Calculate early start as max of all predecessor early finishes
        const es = Math.max(
          ...succ.predecessors.map(p => earlyTimes.get(p)?.ef || 0)
        )
        const ef = es + succ.duration_days

        earlyTimes.set(succId, { es, ef })
        processed.add(succId)
        queue.push(succ)
      }
    }

    // Find project duration
    const projectDuration = Math.max(...Array.from(earlyTimes.values()).map(t => t.ef))

    // Backward pass - calculate late times and float
    const lateTimes = new Map<string, { ls: number; lf: number; totalFloat: number; freeFloat: number }>()

    // Find end activities (no successors)
    const endActivities = activities.filter(a => a.successors.length === 0)

    for (const act of endActivities) {
      const early = earlyTimes.get(act.id)
      if (!early) continue
      lateTimes.set(act.id, {
        ls: projectDuration - act.duration_days,
        lf: projectDuration,
        totalFloat: projectDuration - early.ef,
        freeFloat: 0,
      })
    }

    // Process in reverse topological order
    const reverseQueue = [...endActivities]
    const reverseProcessed = new Set(endActivities.map(a => a.id))

    while (reverseQueue.length > 0) {
      const current = reverseQueue.shift()!

      for (const predId of current.predecessors) {
        const pred = activityMap.get(predId)
        if (!pred) continue

        // Check if all successors processed
        const allSuccsProcessed = pred.successors.every(s => reverseProcessed.has(s))
        if (!allSuccsProcessed) continue

        // Calculate late finish as min of all successor late starts
        const lf = Math.min(
          ...pred.successors.map(s => lateTimes.get(s)?.ls ?? projectDuration)
        )
        const ls = lf - pred.duration_days

        const early = earlyTimes.get(predId)
        const totalFloat = early ? ls - early.es : 0

        // Free float calculation
        const minSuccessorES = Math.min(
          ...pred.successors.map(s => earlyTimes.get(s)?.es ?? projectDuration)
        )
        const freeFloat = early ? minSuccessorES - early.ef : 0

        lateTimes.set(predId, { ls, lf, totalFloat, freeFloat: Math.max(0, freeFloat) })
        reverseProcessed.add(predId)
        reverseQueue.push(pred)
      }
    }

    // Identify critical path (activities with zero float)
    const criticalActivities: CriticalPathActivity[] = []
    const bottlenecks: string[] = []

    for (const act of activities) {
      const late = lateTimes.get(act.id)
      const early = earlyTimes.get(act.id)

      if (!late || !early) continue

      if (late.totalFloat <= 0) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() + early.es)

        const endDate = new Date()
        endDate.setDate(endDate.getDate() + early.ef)

        criticalActivities.push({
          id: act.id,
          name: act.name,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          durationDays: act.duration_days,
          totalFloat: late.totalFloat,
          freeFloat: late.freeFloat,
          predecessors: act.predecessors,
          successors: act.successors,
          trade: act.trade,
        })

        // Identify bottlenecks (critical activities with many successors)
        if (act.successors.length >= 3) {
          bottlenecks.push(`${act.name} (${act.successors.length} successors)`)
        }
      }
    }

    // Sort critical activities by start date
    criticalActivities.sort((a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )

    // Calculate project end date
    const projectEndDate = new Date()
    projectEndDate.setDate(projectEndDate.getDate() + projectDuration)

    return {
      activities: criticalActivities,
      totalDurationDays: projectDuration,
      projectEndDate: projectEndDate.toISOString().split('T')[0],
      bottlenecks,
    }
  },

  /**
   * Find float opportunities
   */
  findFloatOpportunities(
    activityMap: Map<string, ScheduleActivity>,
    criticalPath: CriticalPathResult
  ): FloatOpportunity[] {
    const opportunities: FloatOpportunity[] = []
    const criticalIds = new Set(criticalPath.activities.map(a => a.id))

    for (const [id, activity] of activityMap) {
      if (criticalIds.has(id)) continue

      // Activities not on critical path have float
      // Estimate potential float from activity position
      const potentialFloat = activity.predecessors.length === 0 ? 5 : 2

      if (potentialFloat > 0) {
        opportunities.push({
          activityId: id,
          activityName: activity.name,
          currentFloat: 0, // Would be calculated from backward pass
          potentialFloat,
          recommendation: activity.predecessors.length === 0
            ? 'Start activity can be delayed without impacting project end'
            : 'Activity has schedule flexibility',
        })
      }
    }

    return opportunities.slice(0, 10) // Return top 10
  },

  /**
   * Prioritize open constraints based on schedule impact
   */
  async prioritizeConstraints(
    constraints: ScheduleConstraint[],
    activityMap: Map<string, ScheduleActivity>,
    criticalPath: CriticalPathResult
  ): Promise<ConstraintPriority[]> {
    const criticalIds = new Set(criticalPath.activities.map(a => a.id))
    const priorities: ConstraintPriority[] = []

    for (const constraint of constraints) {
      const activity = activityMap.get(constraint.activity_id)
      if (!activity) continue

      const isOnCriticalPath = criticalIds.has(constraint.activity_id)

      // Count downstream activities
      const downstreamCount = this.countDownstreamActivities(
        constraint.activity_id,
        activityMap,
        new Set()
      )

      // Calculate days until critical
      const activityStart = new Date(activity.planned_start)
      const today = new Date()
      const daysUntilStart = Math.max(0, Math.ceil(
        (activityStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      ))

      // Priority score formula
      let priorityScore = 0
      priorityScore += isOnCriticalPath ? 40 : 0
      priorityScore += Math.max(0, 30 - daysUntilStart) // More urgent if soon
      priorityScore += Math.min(30, downstreamCount * 3) // More impact = higher priority

      // Calculate recommended resolution date
      const recommendedDate = new Date(activity.planned_start)
      recommendedDate.setDate(recommendedDate.getDate() - 3) // 3 days buffer

      priorities.push({
        constraintId: constraint.id,
        constraintDescription: constraint.description,
        activityId: constraint.activity_id,
        activityName: activity.name,
        priorityScore,
        daysUntilCritical: daysUntilStart,
        downstreamImpact: downstreamCount,
        recommendedResolutionDate: recommendedDate.toISOString().split('T')[0],
      })
    }

    // Sort by priority score descending
    return priorities.sort((a, b) => b.priorityScore - a.priorityScore)
  },

  /**
   * Count downstream activities recursively
   */
  countDownstreamActivities(
    activityId: string,
    activityMap: Map<string, ScheduleActivity>,
    visited: Set<string>
  ): number {
    if (visited.has(activityId)) return 0
    visited.add(activityId)

    const activity = activityMap.get(activityId)
    if (!activity) return 0

    let count = activity.successors.length
    for (const succId of activity.successors) {
      count += this.countDownstreamActivities(succId, activityMap, visited)
    }

    return count
  },

  /**
   * Find resource conflicts
   */
  findResourceConflicts(activityMap: Map<string, ScheduleActivity>): ResourceConflict[] {
    const conflicts: ResourceConflict[] = []
    const resourceByDate = new Map<string, Map<string, { demand: number; activities: string[] }>>()

    for (const activity of activityMap.values()) {
      if (!activity.trade) continue

      const start = new Date(activity.planned_start)
      const end = new Date(activity.planned_finish)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0]

        if (!resourceByDate.has(dateKey)) {
          resourceByDate.set(dateKey, new Map())
        }

        const dateResources = resourceByDate.get(dateKey)!
        const existing = dateResources.get(activity.trade) || { demand: 0, activities: [] }
        existing.demand += activity.labor_count || 1
        existing.activities.push(activity.id)
        dateResources.set(activity.trade, existing)
      }
    }

    // Check for over-allocation (assume 100% = 10 per trade)
    const maxCapacity = 10

    for (const [date, resources] of resourceByDate) {
      for (const [trade, data] of resources) {
        const demandPercent = (data.demand / maxCapacity) * 100
        if (demandPercent > 80) {
          conflicts.push({
            resourceType: 'labor',
            resourceName: trade,
            conflictDate: date,
            demandPercent: Math.round(demandPercent),
            affectedActivities: data.activities,
          })
        }
      }
    }

    return conflicts.slice(0, 20) // Limit to 20
  },

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(
    criticalPath: CriticalPathResult,
    floatOpportunities: FloatOpportunity[],
    constraintPriorities: ConstraintPriority[],
    resourceConflicts: ResourceConflict[]
  ): ScheduleOptimizationRecommendation[] {
    const recommendations: ScheduleOptimizationRecommendation[] = []

    // Constraint resolution recommendations
    const urgentConstraints = constraintPriorities.filter(c => c.daysUntilCritical < 7)
    for (const constraint of urgentConstraints.slice(0, 3)) {
      recommendations.push({
        id: crypto.randomUUID(),
        project_id: '',
        recommendation_type: 'constraint_priority',
        priority: constraint.priorityScore,
        title: `Resolve constraint for ${constraint.activityName}`,
        description: `${constraint.constraintDescription} - ${constraint.daysUntilCritical} days until activity start`,
        affected_activity_ids: [constraint.activityId],
        potential_days_saved: constraint.downstreamImpact > 5 ? 3 : 1,
        implementation_effort: 'medium',
        is_implemented: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // Resource leveling recommendations
    const severeConflicts = resourceConflicts.filter(c => c.demandPercent > 120)
    for (const conflict of severeConflicts.slice(0, 2)) {
      recommendations.push({
        id: crypto.randomUUID(),
        project_id: '',
        recommendation_type: 'resource_level',
        priority: 70,
        title: `Level ${conflict.resourceName} resources on ${conflict.conflictDate}`,
        description: `${conflict.demandPercent}% allocation - consider shifting activities or adding crew`,
        affected_activity_ids: conflict.affectedActivities,
        potential_days_saved: 0,
        potential_cost_savings: conflict.demandPercent > 150 ? 5000 : 2000,
        implementation_effort: 'medium',
        is_implemented: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // Float utilization recommendations
    for (const opp of floatOpportunities.slice(0, 2)) {
      if (opp.potentialFloat >= 3) {
        recommendations.push({
          id: crypto.randomUUID(),
          project_id: '',
          recommendation_type: 'add_float',
          priority: 40,
          title: `Utilize float on ${opp.activityName}`,
          description: opp.recommendation,
          affected_activity_ids: [opp.activityId],
          potential_days_saved: opp.potentialFloat,
          implementation_effort: 'low',
          is_implemented: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    }

    // Critical path optimization
    if (criticalPath.bottlenecks.length > 0) {
      recommendations.push({
        id: crypto.randomUUID(),
        project_id: '',
        recommendation_type: 'resequence_task',
        priority: 60,
        title: 'Address critical path bottlenecks',
        description: `Activities ${criticalPath.bottlenecks.join(', ')} have many successors - consider parallel sequencing`,
        affected_activity_ids: criticalPath.activities.slice(0, 5).map(a => a.id),
        potential_days_saved: 5,
        implementation_effort: 'high',
        is_implemented: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }

    // Sort by priority
    return recommendations.sort((a, b) => b.priority - a.priority)
  },

  /**
   * Save analysis to database
   */
  async saveAnalysis(
    projectId: string,
    analysisDate: string,
    criticalPath: CriticalPathResult,
    constraintPriorities: ConstraintPriority[]
  ): Promise<void> {
    // Save critical path analysis (table may not exist yet)
    await supabaseAny
      .from('critical_path_analysis')
      .upsert({
        project_id: projectId,
        analysis_date: analysisDate,
        critical_path_activities: criticalPath.activities.map(a => a.id),
        total_duration_days: criticalPath.totalDurationDays,
        total_float_days: 0, // Would calculate
        near_critical_activities: [],
        bottleneck_resources: criticalPath.bottlenecks,
      }, {
        onConflict: 'project_id,analysis_date',
      })

    // Save constraint impacts (table may not exist yet)
    for (const priority of constraintPriorities) {
      await supabaseAny
        .from('constraint_schedule_impacts')
        .upsert({
          constraint_id: priority.constraintId,
          project_id: projectId,
          analysis_date: analysisDate,
          days_until_critical: priority.daysUntilCritical,
          downstream_activities_count: priority.downstreamImpact,
          potential_delay_days: priority.downstreamImpact > 5 ? 3 : 1,
          priority_score: priority.priorityScore,
        }, {
          onConflict: 'constraint_id,analysis_date',
        })
    }
  },
}
