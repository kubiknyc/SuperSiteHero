/**
 * Schedule-Inspection Correlation Alerts Tool
 * Alert when scheduled activities may conflict with required inspections
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface ScheduleInspectionCorrelationInput {
  project_id: string
  look_ahead_days?: number
  include_warnings?: boolean
}

interface ConflictItem {
  activity: string
  activity_date: string
  required_inspection: string
  inspection_status: 'not_scheduled' | 'scheduled' | 'overdue'
  conflict_type: 'missing_inspection' | 'timing_conflict' | 'dependency_issue'
  severity: 'critical' | 'warning' | 'info'
  resolution: string
}

interface Recommendation {
  action: string
  priority: 'immediate' | 'soon' | 'planned'
  related_items: string[]
}

interface WeekSummary {
  week: string
  scheduled_inspections: number
  pending_inspections: number
  activities_at_risk: number
}

interface ScheduleInspectionCorrelationOutput {
  conflicts: ConflictItem[]
  recommendations: Recommendation[]
  inspection_schedule_summary: WeekSummary[]
}

// Activity-to-inspection mapping
const ACTIVITY_INSPECTION_MAP: Record<string, string[]> = {
  // Foundation work
  'foundation': ['foundation'],
  'footing': ['foundation'],
  'slab': ['foundation', 'underslab_plumbing'],
  'pour': ['foundation'],

  // Framing
  'framing': ['framing'],
  'shear wall': ['framing', 'shear_wall'],
  'truss': ['framing'],

  // MEP Rough
  'rough electrical': ['rough_electrical'],
  'electrical rough': ['rough_electrical'],
  'wire pull': ['rough_electrical'],
  'rough plumbing': ['rough_plumbing'],
  'plumbing rough': ['rough_plumbing'],
  'top out': ['rough_plumbing'],
  'rough hvac': ['rough_hvac'],
  'ductwork': ['rough_hvac'],

  // Insulation
  'insulation': ['insulation'],
  'batt insulation': ['insulation'],
  'spray foam': ['insulation'],

  // Drywall
  'drywall': ['drywall_nailing'],
  'hang drywall': ['drywall_nailing'],
  'board': ['drywall_nailing'],

  // Final
  'final electrical': ['final_electrical'],
  'final plumbing': ['final_plumbing'],
  'final hvac': ['final_hvac'],
  'final inspection': ['final'],
  'certificate of occupancy': ['final', 'fire_marshal'],
  'co inspection': ['final'],

  // Fire protection
  'sprinkler': ['fire_protection'],
  'fire alarm': ['fire_alarm'],
  'fire protection': ['fire_protection', 'fire_alarm'],

  // Roofing
  'roof': ['roofing'],
  'roofing': ['roofing'],
  'shingle': ['roofing'],
}

function getRequiredInspections(activityName: string): string[] {
  const lowerName = activityName.toLowerCase()
  const inspections: Set<string> = new Set()

  for (const [keyword, requiredInspections] of Object.entries(ACTIVITY_INSPECTION_MAP)) {
    if (lowerName.includes(keyword)) {
      requiredInspections.forEach(i => inspections.add(i))
    }
  }

  return Array.from(inspections)
}

export const scheduleInspectionCorrelationTool = createTool<ScheduleInspectionCorrelationInput, ScheduleInspectionCorrelationOutput>({
  name: 'schedule_inspection_correlation',
  displayName: 'Schedule-Inspection Alerts',
  description: 'Analyzes the schedule to identify activities that require inspections and alerts when inspections are missing, overdue, or have timing conflicts.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      look_ahead_days: {
        type: 'number',
        description: 'Number of days to look ahead (default: 14)'
      },
      include_warnings: {
        type: 'boolean',
        description: 'Include warning-level items, not just critical (default: true)'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 1000,

  async execute(input, context) {
    const { project_id, look_ahead_days = 14, include_warnings = true } = input

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + look_ahead_days)

    // Get scheduled activities in the look-ahead period
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select('id, activity_id, name, planned_start, planned_finish, status')
      .eq('project_id', project_id)
      .gte('planned_start', today.toISOString().split('T')[0])
      .lte('planned_start', endDate.toISOString().split('T')[0])
      .neq('status', 'completed')
      .order('planned_start', { ascending: true })

    // Get all inspections for the project
    const { data: inspections } = await supabase
      .from('inspections')
      .select('id, inspection_type, scheduled_date, status, result')
      .eq('project_id', project_id)

    const conflicts: ConflictItem[] = []
    const processedInspections = new Set<string>()

    // Check each activity for required inspections
    for (const activity of activities || []) {
      const requiredInspections = getRequiredInspections(activity.name)

      for (const requiredType of requiredInspections) {
        // Find matching inspection
        const matchingInspection = inspections?.find(i =>
          i.inspection_type.toLowerCase().replace(/\s+/g, '_') === requiredType ||
          i.inspection_type.toLowerCase().includes(requiredType.replace(/_/g, ' '))
        )

        if (!matchingInspection) {
          // No inspection scheduled
          conflicts.push({
            activity: activity.name,
            activity_date: activity.planned_start,
            required_inspection: requiredType.replace(/_/g, ' '),
            inspection_status: 'not_scheduled',
            conflict_type: 'missing_inspection',
            severity: 'critical',
            resolution: `Schedule ${requiredType.replace(/_/g, ' ')} inspection before ${activity.planned_start}`
          })
        } else {
          processedInspections.add(matchingInspection.id)

          // Check if inspection is before activity
          if (matchingInspection.scheduled_date) {
            const inspectionDate = new Date(matchingInspection.scheduled_date)
            const activityDate = new Date(activity.planned_start)

            if (inspectionDate > activityDate) {
              // Inspection scheduled after activity starts
              conflicts.push({
                activity: activity.name,
                activity_date: activity.planned_start,
                required_inspection: requiredType.replace(/_/g, ' '),
                inspection_status: 'scheduled',
                conflict_type: 'timing_conflict',
                severity: 'critical',
                resolution: `Reschedule inspection to before ${activity.planned_start} or delay activity`
              })
            } else if (matchingInspection.status === 'failed' || matchingInspection.result === 'fail') {
              // Inspection failed
              conflicts.push({
                activity: activity.name,
                activity_date: activity.planned_start,
                required_inspection: requiredType.replace(/_/g, ' '),
                inspection_status: 'scheduled',
                conflict_type: 'dependency_issue',
                severity: 'critical',
                resolution: 'Resolve inspection failure before proceeding with activity'
              })
            }
          }

          // Check for overdue inspections
          if (matchingInspection.scheduled_date) {
            const inspectionDate = new Date(matchingInspection.scheduled_date)
            if (inspectionDate < today && matchingInspection.status !== 'completed' && matchingInspection.result !== 'pass') {
              conflicts.push({
                activity: activity.name,
                activity_date: activity.planned_start,
                required_inspection: requiredType.replace(/_/g, ' '),
                inspection_status: 'overdue',
                conflict_type: 'dependency_issue',
                severity: 'critical',
                resolution: 'Complete overdue inspection immediately'
              })
            }
          }
        }
      }
    }

    // Generate recommendations
    const recommendations: Recommendation[] = []

    const criticalConflicts = conflicts.filter(c => c.severity === 'critical')
    const missingInspections = conflicts.filter(c => c.conflict_type === 'missing_inspection')
    const timingIssues = conflicts.filter(c => c.conflict_type === 'timing_conflict')

    if (missingInspections.length > 0) {
      const uniqueInspections = Array.from(new Set(missingInspections.map(c => c.required_inspection)))
      recommendations.push({
        action: `Schedule ${uniqueInspections.length} missing inspection(s): ${uniqueInspections.slice(0, 3).join(', ')}`,
        priority: 'immediate',
        related_items: uniqueInspections
      })
    }

    if (timingIssues.length > 0) {
      recommendations.push({
        action: 'Review schedule timing - inspections must pass before related work begins',
        priority: 'immediate',
        related_items: timingIssues.map(c => c.activity)
      })
    }

    const overdueCount = conflicts.filter(c => c.inspection_status === 'overdue').length
    if (overdueCount > 0) {
      recommendations.push({
        action: `Address ${overdueCount} overdue inspection(s) - schedule re-inspections`,
        priority: 'immediate',
        related_items: conflicts.filter(c => c.inspection_status === 'overdue').map(c => c.required_inspection)
      })
    }

    if (criticalConflicts.length === 0) {
      recommendations.push({
        action: 'No critical conflicts found - schedule appears well-coordinated',
        priority: 'planned',
        related_items: []
      })
    }

    // Build weekly summary
    const weeklySummary: WeekSummary[] = []
    const weekMap = new Map<string, { scheduled: number; pending: number; atRisk: number }>()

    // Calculate week numbers
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 7)) {
      const weekStart = new Date(d)
      const weekEnd = new Date(d)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const weekKey = `${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}`

      // Count scheduled inspections in this week
      const scheduledInWeek = inspections?.filter(i => {
        if (!i.scheduled_date) return false
        const iDate = new Date(i.scheduled_date)
        return iDate >= weekStart && iDate <= weekEnd
      }).length || 0

      // Count pending inspections
      const pendingInWeek = conflicts.filter(c => {
        const aDate = new Date(c.activity_date)
        return aDate >= weekStart && aDate <= weekEnd && c.inspection_status === 'not_scheduled'
      }).length

      // Count activities at risk
      const atRiskInWeek = conflicts.filter(c => {
        const aDate = new Date(c.activity_date)
        return aDate >= weekStart && aDate <= weekEnd && c.severity === 'critical'
      }).length

      weekMap.set(weekKey, {
        scheduled: scheduledInWeek,
        pending: pendingInWeek,
        atRisk: atRiskInWeek
      })
    }

    Array.from(weekMap.entries()).forEach(([week, data]) => {
      weeklySummary.push({
        week,
        scheduled_inspections: data.scheduled,
        pending_inspections: data.pending,
        activities_at_risk: data.atRisk
      })
    })

    // Filter conflicts if not including warnings
    const finalConflicts = include_warnings
      ? conflicts
      : conflicts.filter(c => c.severity === 'critical')

    return {
      success: true,
      data: {
        conflicts: finalConflicts,
        recommendations,
        inspection_schedule_summary: weeklySummary
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { conflicts, recommendations } = output

    const criticalCount = conflicts.filter(c => c.severity === 'critical').length
    const warningCount = conflicts.filter(c => c.severity === 'warning').length

    return {
      title: 'Schedule-Inspection Analysis',
      summary: `${criticalCount} critical, ${warningCount} warnings, ${recommendations.length} recommendations`,
      icon: criticalCount > 0 ? 'alert-triangle' : 'check-circle',
      status: criticalCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success',
      details: [
        { label: 'Critical Conflicts', value: criticalCount, type: 'text' },
        { label: 'Warnings', value: warningCount, type: 'text' },
        { label: 'Recommendations', value: recommendations.length, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
