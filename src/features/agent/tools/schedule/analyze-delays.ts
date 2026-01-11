/**
 * Schedule Delay Analysis Tool
 * Analyzes schedule delays and their impacts on project completion
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface AnalyzeDelaysInput {
  project_id: string
  include_critical_path?: boolean
  look_ahead_days?: number
}

interface DelayedActivity {
  id: string
  name: string
  planned_start: string
  actual_start: string | null
  planned_end: string
  actual_end: string | null
  days_delayed: number
  is_critical_path: boolean
  cause: string | null
  responsible_party: string | null
}

interface AnalyzeDelaysOutput {
  summary: {
    total_activities: number
    delayed_activities: number
    on_track_activities: number
    ahead_of_schedule: number
    average_delay_days: number
    project_delay_days: number
  }
  critical_path_impact: {
    affected: boolean
    activities_at_risk: number
    estimated_project_delay: number
    mitigation_options: string[]
  }
  delayed_activities: DelayedActivity[]
  upcoming_risks: Array<{
    activity: string
    risk: string
    probability: 'low' | 'medium' | 'high'
    days_until: number
  }>
  recommendations: string[]
  recovery_options: Array<{
    option: string
    potential_recovery_days: number
    cost_impact: string
    feasibility: 'low' | 'medium' | 'high'
  }>
}

export const analyzeScheduleDelaysTool = createTool<AnalyzeDelaysInput, AnalyzeDelaysOutput>({
  name: 'analyze_schedule_delays',
  description: 'Analyzes schedule delays, identifies critical path impacts, and suggests recovery options. Use when tracking project schedule or investigating delays.',
  category: 'schedule',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze'
      },
      include_critical_path: {
        type: 'boolean',
        description: 'Include critical path analysis (default: true)'
      },
      look_ahead_days: {
        type: 'number',
        description: 'Days to look ahead for upcoming risks (default: 14)'
      }
    },
    required: ['project_id']
  },

  async execute(input: AnalyzeDelaysInput, context: AgentContext): Promise<AnalyzeDelaysOutput> {
    const { project_id, include_critical_path = true, look_ahead_days = 14 } = input

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('*, schedule_variance_days')
      .eq('id', project_id)
      .single()

    // Get schedule activities
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)
      .order('planned_start', { ascending: true })

    const now = new Date()
    const lookAheadDate = new Date(now)
    lookAheadDate.setDate(lookAheadDate.getDate() + look_ahead_days)

    // Analyze each activity
    const delayedActivities: DelayedActivity[] = []
    let totalDelayDays = 0
    let onTrack = 0
    let ahead = 0
    let criticalPathAffected = false
    let criticalPathActivitiesAtRisk = 0

    for (const activity of activities || []) {
      const plannedStart = new Date(activity.planned_start)
      const plannedEnd = new Date(activity.planned_end)
      const actualStart = activity.actual_start ? new Date(activity.actual_start) : null
      const actualEnd = activity.actual_end ? new Date(activity.actual_end) : null

      let daysDelayed = 0

      if (actualEnd) {
        // Completed activity
        daysDelayed = Math.floor((actualEnd.getTime() - plannedEnd.getTime()) / (1000 * 60 * 60 * 24))
      } else if (actualStart) {
        // In progress
        const startDelay = Math.floor((actualStart.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24))
        daysDelayed = startDelay
      } else if (plannedStart < now) {
        // Should have started but hasn't
        daysDelayed = Math.floor((now.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24))
      }

      if (daysDelayed > 0) {
        totalDelayDays += daysDelayed

        if (activity.is_critical_path) {
          criticalPathAffected = true
          criticalPathActivitiesAtRisk++
        }

        delayedActivities.push({
          id: activity.id,
          name: activity.name || activity.title || 'Unnamed Activity',
          planned_start: activity.planned_start,
          actual_start: activity.actual_start,
          planned_end: activity.planned_end,
          actual_end: activity.actual_end,
          days_delayed: daysDelayed,
          is_critical_path: activity.is_critical_path || false,
          cause: activity.delay_reason || inferDelayCause(activity),
          responsible_party: activity.responsible_party || activity.assigned_to || null
        })
      } else if (daysDelayed < 0) {
        ahead++
      } else {
        onTrack++
      }
    }

    const totalActivities = activities?.length || 0
    const avgDelay = delayedActivities.length > 0
      ? Math.round(totalDelayDays / delayedActivities.length)
      : 0

    // Generate upcoming risks
    const upcomingRisks = generateUpcomingRisks(activities || [], now, lookAheadDate)

    // Generate recommendations
    const recommendations = generateRecommendations(
      delayedActivities,
      criticalPathAffected,
      avgDelay,
      project?.schedule_variance_days || 0
    )

    // Generate recovery options
    const recoveryOptions = generateRecoveryOptions(
      delayedActivities,
      criticalPathAffected,
      avgDelay
    )

    // Mitigation options for critical path
    const mitigationOptions = criticalPathAffected
      ? [
          'Fast-track parallel activities where possible',
          'Add resources to critical path activities',
          'Consider overtime or shift work',
          'Review activity dependencies for optimization',
          'Negotiate milestone adjustments with owner'
        ]
      : ['No critical path mitigation needed']

    return {
      summary: {
        total_activities: totalActivities,
        delayed_activities: delayedActivities.length,
        on_track_activities: onTrack,
        ahead_of_schedule: ahead,
        average_delay_days: avgDelay,
        project_delay_days: project?.schedule_variance_days || 0
      },
      critical_path_impact: {
        affected: criticalPathAffected,
        activities_at_risk: criticalPathActivitiesAtRisk,
        estimated_project_delay: criticalPathAffected ? avgDelay : 0,
        mitigation_options: mitigationOptions
      },
      delayed_activities: delayedActivities.slice(0, 10), // Top 10
      upcoming_risks: upcomingRisks,
      recommendations,
      recovery_options: recoveryOptions
    }
  }
})

function inferDelayCause(activity: any): string | null {
  // Infer delay cause based on activity data
  if (activity.weather_delay) {return 'Weather delay'}
  if (activity.material_delay) {return 'Material delivery delay'}
  if (activity.labor_shortage) {return 'Labor shortage'}
  if (activity.rfi_pending) {return 'Awaiting RFI response'}
  if (activity.inspection_pending) {return 'Awaiting inspection'}
  return null
}

function generateUpcomingRisks(
  activities: any[],
  now: Date,
  lookAheadDate: Date
): Array<{
  activity: string
  risk: string
  probability: 'low' | 'medium' | 'high'
  days_until: number
}> {
  const risks: Array<{
    activity: string
    risk: string
    probability: 'low' | 'medium' | 'high'
    days_until: number
  }> = []

  for (const activity of activities) {
    const plannedStart = new Date(activity.planned_start)

    if (plannedStart > now && plannedStart <= lookAheadDate) {
      const daysUntil = Math.floor((plannedStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // Check for predecessor delays
      if (activity.predecessor_delayed) {
        risks.push({
          activity: activity.name || 'Activity',
          risk: 'Predecessor activity is delayed',
          probability: 'high',
          days_until: daysUntil
        })
      }

      // Check for resource conflicts
      if (activity.resource_conflict) {
        risks.push({
          activity: activity.name || 'Activity',
          risk: 'Resource conflict identified',
          probability: 'medium',
          days_until: daysUntil
        })
      }

      // Check for pending submittals
      if (activity.pending_submittal) {
        risks.push({
          activity: activity.name || 'Activity',
          risk: 'Pending submittal approval',
          probability: 'medium',
          days_until: daysUntil
        })
      }

      // Flag activities starting soon with incomplete predecessors
      if (daysUntil <= 3 && !activity.predecessors_complete) {
        risks.push({
          activity: activity.name || 'Activity',
          risk: 'Starting soon with incomplete prerequisites',
          probability: 'high',
          days_until: daysUntil
        })
      }
    }
  }

  return risks.slice(0, 5)
}

function generateRecommendations(
  delayedActivities: DelayedActivity[],
  criticalPathAffected: boolean,
  avgDelay: number,
  projectDelay: number
): string[] {
  const recommendations: string[] = []

  if (criticalPathAffected) {
    recommendations.push('URGENT: Critical path is affected - schedule recovery meeting with project team')
  }

  if (avgDelay > 7) {
    recommendations.push('Average delays exceed one week - implement daily progress tracking')
  }

  if (delayedActivities.length > 5) {
    recommendations.push('Multiple activities delayed - review resource allocation and sequencing')
  }

  // Group by cause
  const causeGroups = new Map<string, number>()
  for (const activity of delayedActivities) {
    if (activity.cause) {
      causeGroups.set(activity.cause, (causeGroups.get(activity.cause) || 0) + 1)
    }
  }

  for (const [cause, count] of causeGroups) {
    if (count >= 2) {
      recommendations.push(`Address recurring issue: ${cause} (${count} activities affected)`)
    }
  }

  if (projectDelay > 14) {
    recommendations.push('Consider schedule compression techniques or scope adjustment')
  }

  if (recommendations.length === 0) {
    recommendations.push('Schedule is generally on track - maintain current monitoring')
  }

  return recommendations.slice(0, 6)
}

function generateRecoveryOptions(
  delayedActivities: DelayedActivity[],
  criticalPathAffected: boolean,
  avgDelay: number
): Array<{
  option: string
  potential_recovery_days: number
  cost_impact: string
  feasibility: 'low' | 'medium' | 'high'
}> {
  const options: Array<{
    option: string
    potential_recovery_days: number
    cost_impact: string
    feasibility: 'low' | 'medium' | 'high'
  }> = []

  if (avgDelay > 0) {
    options.push({
      option: 'Authorize overtime work for critical activities',
      potential_recovery_days: Math.min(avgDelay, 5),
      cost_impact: '15-25% labor cost increase',
      feasibility: 'high'
    })

    options.push({
      option: 'Add second shift for key trades',
      potential_recovery_days: Math.min(avgDelay, 10),
      cost_impact: '30-50% labor cost increase',
      feasibility: 'medium'
    })

    options.push({
      option: 'Fast-track procurement with expedited shipping',
      potential_recovery_days: Math.min(avgDelay, 7),
      cost_impact: '$5,000-20,000 additional shipping',
      feasibility: 'high'
    })
  }

  if (criticalPathAffected) {
    options.push({
      option: 'Re-sequence activities to reduce critical path',
      potential_recovery_days: Math.min(avgDelay, 14),
      cost_impact: 'Minimal direct cost',
      feasibility: 'medium'
    })

    options.push({
      option: 'Increase crew sizes on critical path activities',
      potential_recovery_days: Math.min(avgDelay, 7),
      cost_impact: '20-40% labor cost increase',
      feasibility: 'medium'
    })
  }

  if (avgDelay > 14) {
    options.push({
      option: 'Negotiate scope reduction or milestone adjustment',
      potential_recovery_days: avgDelay,
      cost_impact: 'Potential change order savings',
      feasibility: 'low'
    })
  }

  return options.slice(0, 5)
}
