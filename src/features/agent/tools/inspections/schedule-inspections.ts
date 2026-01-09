/**
 * Inspection Scheduler Tool
 * Recommends and schedules required inspections based on project activities
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface ScheduleInspectionsInput {
  project_id: string
  look_ahead_days?: number
  include_completed?: boolean
  jurisdiction?: string
}

interface RequiredInspection {
  type: string
  category: string
  description: string
  prerequisite_work: string
  required_by: string
  jurisdiction_code: string
  typical_notice_days: number
  estimated_duration: string
  inspector_type: string
}

interface ScheduledInspection {
  id: string
  type: string
  scheduled_date: string
  status: string
  location: string
  assigned_inspector: string
  notes: string
}

interface ScheduleInspectionsOutput {
  summary: {
    upcoming_inspections: number
    overdue_inspections: number
    pending_scheduling: number
    passed_this_month: number
    failed_this_month: number
  }
  inspections_needed: Array<{
    inspection: RequiredInspection
    related_activity: string
    recommended_date: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    schedule_by: string
  }>
  scheduled_inspections: ScheduledInspection[]
  upcoming_deadlines: Array<{
    inspection_type: string
    deadline: string
    days_remaining: number
    action_required: string
  }>
  inspection_calendar: Record<string, Array<{
    type: string
    status: string
    location: string
  }>>
  recommendations: string[]
  warnings: string[]
}

export const scheduleInspectionsTool = createTool<ScheduleInspectionsInput, ScheduleInspectionsOutput>({
  name: 'schedule_inspections',
  description: 'Identifies required inspections based on scheduled activities, recommends inspection dates, and tracks inspection status. Helps ensure code compliance and avoid work stoppages.',
  category: 'inspections',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      look_ahead_days: {
        type: 'number',
        description: 'Days to look ahead for scheduling (default: 14)'
      },
      include_completed: {
        type: 'boolean',
        description: 'Include completed inspections in results (default: false)'
      },
      jurisdiction: {
        type: 'string',
        description: 'Jurisdiction for inspection requirements'
      }
    },
    required: ['project_id']
  },

  async execute(input: ScheduleInspectionsInput, context: AgentContext): Promise<ScheduleInspectionsOutput> {
    const {
      project_id,
      look_ahead_days = 14,
      include_completed = false,
      jurisdiction
    } = input

    const now = new Date()
    const lookAheadDate = new Date(now)
    lookAheadDate.setDate(lookAheadDate.getDate() + look_ahead_days)

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    // Get scheduled activities
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)
      .gte('planned_end', now.toISOString())
      .lte('planned_start', lookAheadDate.toISOString())

    // Get existing inspections
    let inspectionQuery = supabase
      .from('inspections')
      .select('*')
      .eq('project_id', project_id)

    if (!include_completed) {
      inspectionQuery = inspectionQuery.neq('status', 'passed')
    }

    const { data: existingInspections } = await inspectionQuery

    // Determine required inspections based on activities
    const inspectionsNeeded = determineRequiredInspections(
      activities || [],
      existingInspections || [],
      jurisdiction || project?.jurisdiction
    )

    // Get scheduled inspections
    const scheduledInspections: ScheduledInspection[] = (existingInspections || [])
      .filter(insp => insp.scheduled_date)
      .map(insp => ({
        id: insp.id,
        type: insp.type || insp.inspection_type || 'General',
        scheduled_date: insp.scheduled_date,
        status: insp.status || 'scheduled',
        location: insp.location || 'TBD',
        assigned_inspector: insp.inspector_name || insp.assigned_to || 'TBD',
        notes: insp.notes || ''
      }))

    // Calculate summary
    const upcoming = scheduledInspections.filter(i =>
      new Date(i.scheduled_date) >= now && i.status === 'scheduled'
    ).length

    const overdue = scheduledInspections.filter(i =>
      new Date(i.scheduled_date) < now && i.status === 'scheduled'
    ).length

    const pendingScheduling = inspectionsNeeded.length

    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const passedThisMonth = (existingInspections || []).filter(i =>
      i.status === 'passed' && new Date(i.inspection_date || i.scheduled_date) >= thisMonth
    ).length

    const failedThisMonth = (existingInspections || []).filter(i =>
      i.status === 'failed' && new Date(i.inspection_date || i.scheduled_date) >= thisMonth
    ).length

    // Generate upcoming deadlines
    const upcomingDeadlines = generateUpcomingDeadlines(inspectionsNeeded, scheduledInspections, now)

    // Build inspection calendar
    const inspectionCalendar = buildInspectionCalendar(scheduledInspections, look_ahead_days, now)

    // Generate recommendations
    const recommendations = generateInspectionRecommendations(
      inspectionsNeeded,
      overdue,
      failedThisMonth,
      pendingScheduling
    )

    // Generate warnings
    const warnings = generateInspectionWarnings(
      overdue,
      inspectionsNeeded,
      activities || []
    )

    return {
      summary: {
        upcoming_inspections: upcoming,
        overdue_inspections: overdue,
        pending_scheduling: pendingScheduling,
        passed_this_month: passedThisMonth,
        failed_this_month: failedThisMonth
      },
      inspections_needed: inspectionsNeeded,
      scheduled_inspections: scheduledInspections.slice(0, 10),
      upcoming_deadlines: upcomingDeadlines,
      inspection_calendar: inspectionCalendar,
      recommendations,
      warnings
    }
  }
})

function determineRequiredInspections(
  activities: any[],
  existingInspections: any[],
  jurisdiction?: string
): Array<{
  inspection: RequiredInspection
  related_activity: string
  recommended_date: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  schedule_by: string
}> {
  const inspectionsNeeded: Array<{
    inspection: RequiredInspection
    related_activity: string
    recommended_date: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    schedule_by: string
  }> = []

  // Define inspection triggers
  const inspectionTriggers: Array<{
    pattern: RegExp
    inspection: RequiredInspection
  }> = [
    {
      pattern: /foundation|footing|slab.*grade/i,
      inspection: {
        type: 'Foundation',
        category: 'Structural',
        description: 'Foundation and footing inspection before concrete pour',
        prerequisite_work: 'Forms set, rebar installed, embedments placed',
        required_by: 'Building Code',
        jurisdiction_code: 'IBC 1704',
        typical_notice_days: 2,
        estimated_duration: '1-2 hours',
        inspector_type: 'Building Inspector'
      }
    },
    {
      pattern: /framing|rough.*frame|wall.*frame/i,
      inspection: {
        type: 'Rough Framing',
        category: 'Structural',
        description: 'Structural framing inspection before covering',
        prerequisite_work: 'Framing complete, hold-downs installed, blocking in place',
        required_by: 'Building Code',
        jurisdiction_code: 'IBC 110.3',
        typical_notice_days: 2,
        estimated_duration: '2-3 hours',
        inspector_type: 'Building Inspector'
      }
    },
    {
      pattern: /rough.*electric|electrical.*rough/i,
      inspection: {
        type: 'Rough Electrical',
        category: 'Electrical',
        description: 'Electrical rough-in inspection before covering',
        prerequisite_work: 'Wiring, boxes, panels rough installed',
        required_by: 'NEC',
        jurisdiction_code: 'NEC 590',
        typical_notice_days: 2,
        estimated_duration: '1-2 hours',
        inspector_type: 'Electrical Inspector'
      }
    },
    {
      pattern: /rough.*plumb|plumbing.*rough|underground.*plumb/i,
      inspection: {
        type: 'Rough Plumbing',
        category: 'Plumbing',
        description: 'Plumbing rough-in and pressure test inspection',
        prerequisite_work: 'Piping installed, test caps in place, pressure test ready',
        required_by: 'IPC/UPC',
        jurisdiction_code: 'IPC 312',
        typical_notice_days: 2,
        estimated_duration: '1-2 hours',
        inspector_type: 'Plumbing Inspector'
      }
    },
    {
      pattern: /rough.*mechanical|hvac.*rough|duct.*rough/i,
      inspection: {
        type: 'Rough Mechanical',
        category: 'Mechanical',
        description: 'HVAC rough-in inspection before covering',
        prerequisite_work: 'Ductwork installed, equipment set, controls roughed',
        required_by: 'IMC',
        jurisdiction_code: 'IMC 106',
        typical_notice_days: 2,
        estimated_duration: '1-2 hours',
        inspector_type: 'Mechanical Inspector'
      }
    },
    {
      pattern: /insulation/i,
      inspection: {
        type: 'Insulation',
        category: 'Energy',
        description: 'Insulation inspection before drywall',
        prerequisite_work: 'All insulation installed, vapor barriers in place',
        required_by: 'Energy Code',
        jurisdiction_code: 'IECC R402',
        typical_notice_days: 2,
        estimated_duration: '1 hour',
        inspector_type: 'Building Inspector'
      }
    },
    {
      pattern: /drywall|sheetrock|gypsum/i,
      inspection: {
        type: 'Pre-Drywall',
        category: 'Building',
        description: 'Final inspection before drywall installation',
        prerequisite_work: 'All rough inspections passed, fire blocking complete',
        required_by: 'Building Code',
        jurisdiction_code: 'IBC 110.3',
        typical_notice_days: 2,
        estimated_duration: '2-3 hours',
        inspector_type: 'Building Inspector'
      }
    },
    {
      pattern: /fire.*sprinkler|sprinkler.*rough|fire.*suppression/i,
      inspection: {
        type: 'Fire Sprinkler',
        category: 'Fire',
        description: 'Fire sprinkler system rough-in and pressure test',
        prerequisite_work: 'Piping complete, heads installed, hydrostatic test ready',
        required_by: 'NFPA 13',
        jurisdiction_code: 'NFPA 13',
        typical_notice_days: 3,
        estimated_duration: '2-3 hours',
        inspector_type: 'Fire Marshal'
      }
    },
    {
      pattern: /roofing|roof.*install/i,
      inspection: {
        type: 'Roofing',
        category: 'Building',
        description: 'Roofing inspection - nailing pattern and underlayment',
        prerequisite_work: 'Sheathing inspected, underlayment installed',
        required_by: 'Building Code',
        jurisdiction_code: 'IBC 1507',
        typical_notice_days: 1,
        estimated_duration: '1 hour',
        inspector_type: 'Building Inspector'
      }
    },
    {
      pattern: /final.*electric|electric.*final/i,
      inspection: {
        type: 'Final Electrical',
        category: 'Electrical',
        description: 'Final electrical inspection and energization approval',
        prerequisite_work: 'All devices installed, labels in place, panel schedule complete',
        required_by: 'NEC',
        jurisdiction_code: 'NEC 110.12',
        typical_notice_days: 2,
        estimated_duration: '2-3 hours',
        inspector_type: 'Electrical Inspector'
      }
    },
    {
      pattern: /final.*plumb|plumb.*final/i,
      inspection: {
        type: 'Final Plumbing',
        category: 'Plumbing',
        description: 'Final plumbing inspection and functional test',
        prerequisite_work: 'All fixtures installed, water heater in place, final test ready',
        required_by: 'IPC/UPC',
        jurisdiction_code: 'IPC 107',
        typical_notice_days: 2,
        estimated_duration: '1-2 hours',
        inspector_type: 'Plumbing Inspector'
      }
    },
    {
      pattern: /final.*mechanical|mechanical.*final|hvac.*final/i,
      inspection: {
        type: 'Final Mechanical',
        category: 'Mechanical',
        description: 'Final HVAC inspection and system startup',
        prerequisite_work: 'Equipment operational, balancing complete, controls tested',
        required_by: 'IMC',
        jurisdiction_code: 'IMC 107',
        typical_notice_days: 2,
        estimated_duration: '2-3 hours',
        inspector_type: 'Mechanical Inspector'
      }
    },
    {
      pattern: /certificate.*occupancy|final.*building|co.*inspection/i,
      inspection: {
        type: 'Certificate of Occupancy',
        category: 'Final',
        description: 'Final building inspection for occupancy permit',
        prerequisite_work: 'All trade finals passed, life safety systems operational',
        required_by: 'Building Code',
        jurisdiction_code: 'IBC 111',
        typical_notice_days: 5,
        estimated_duration: '3-4 hours',
        inspector_type: 'Building Official'
      }
    }
  ]

  const existingTypes = new Set(
    existingInspections
      .filter(i => i.status === 'passed' || i.status === 'scheduled')
      .map(i => (i.type || i.inspection_type || '').toLowerCase())
  )

  for (const activity of activities) {
    const activityName = activity.name || activity.title || ''
    const activityLower = activityName.toLowerCase()

    for (const trigger of inspectionTriggers) {
      if (trigger.pattern.test(activityLower)) {
        // Check if this inspection type already exists
        if (!existingTypes.has(trigger.inspection.type.toLowerCase())) {
          const plannedStart = new Date(activity.planned_start || activity.start_date)
          const scheduleDays = trigger.inspection.typical_notice_days + 1

          const scheduleBy = new Date(plannedStart)
          scheduleBy.setDate(scheduleBy.getDate() - scheduleDays)

          const recommendedDate = new Date(plannedStart)
          recommendedDate.setDate(recommendedDate.getDate() - 1) // Day before work starts

          // Determine priority
          const daysUntilNeeded = Math.floor((plannedStart.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
          if (daysUntilNeeded <= 2) priority = 'critical'
          else if (daysUntilNeeded <= 5) priority = 'high'
          else if (daysUntilNeeded <= 10) priority = 'medium'
          else priority = 'low'

          inspectionsNeeded.push({
            inspection: trigger.inspection,
            related_activity: activityName,
            recommended_date: recommendedDate.toISOString().split('T')[0],
            priority,
            schedule_by: scheduleBy.toISOString().split('T')[0]
          })

          existingTypes.add(trigger.inspection.type.toLowerCase())
        }
      }
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  inspectionsNeeded.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return inspectionsNeeded.slice(0, 10)
}

function generateUpcomingDeadlines(
  needed: Array<any>,
  scheduled: ScheduledInspection[],
  now: Date
): Array<{
  inspection_type: string
  deadline: string
  days_remaining: number
  action_required: string
}> {
  const deadlines: Array<{
    inspection_type: string
    deadline: string
    days_remaining: number
    action_required: string
  }> = []

  // Deadlines from needed inspections
  for (const item of needed) {
    const scheduleBy = new Date(item.schedule_by)
    const daysRemaining = Math.floor((scheduleBy.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 7) {
      deadlines.push({
        inspection_type: item.inspection.type,
        deadline: item.schedule_by,
        days_remaining: Math.max(0, daysRemaining),
        action_required: daysRemaining <= 0
          ? 'OVERDUE - Schedule immediately'
          : `Call for inspection by ${item.schedule_by}`
      })
    }
  }

  // Sort by days remaining
  deadlines.sort((a, b) => a.days_remaining - b.days_remaining)

  return deadlines.slice(0, 5)
}

function buildInspectionCalendar(
  scheduled: ScheduledInspection[],
  lookAheadDays: number,
  now: Date
): Record<string, Array<{ type: string; status: string; location: string }>> {
  const calendar: Record<string, Array<{ type: string; status: string; location: string }>> = {}

  for (let i = 0; i < lookAheadDays; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    const dayInspections = scheduled.filter(s =>
      s.scheduled_date.startsWith(dateStr)
    )

    if (dayInspections.length > 0) {
      calendar[dateStr] = dayInspections.map(s => ({
        type: s.type,
        status: s.status,
        location: s.location
      }))
    }
  }

  return calendar
}

function generateInspectionRecommendations(
  needed: Array<any>,
  overdue: number,
  failed: number,
  pending: number
): string[] {
  const recommendations: string[] = []

  if (overdue > 0) {
    recommendations.push(`URGENT: ${overdue} overdue inspection(s) - reschedule immediately`)
  }

  if (failed > 0) {
    recommendations.push(`${failed} failed inspection(s) this month - address corrections and reschedule`)
  }

  if (pending > 5) {
    recommendations.push('High number of inspections needed - consider batch scheduling with jurisdiction')
  }

  const criticalNeeded = needed.filter(n => n.priority === 'critical')
  if (criticalNeeded.length > 0) {
    recommendations.push(`${criticalNeeded.length} critical inspection(s) need immediate scheduling`)
  }

  recommendations.push('Maintain 48-hour minimum notice for all inspection requests')
  recommendations.push('Document all inspection results with photos for records')

  return recommendations.slice(0, 5)
}

function generateInspectionWarnings(
  overdue: number,
  needed: Array<any>,
  activities: any[]
): string[] {
  const warnings: string[] = []

  if (overdue >= 2) {
    warnings.push('Multiple overdue inspections may delay subsequent work')
  }

  const criticalInspections = needed.filter(n => n.priority === 'critical')
  if (criticalInspections.length > 0) {
    warnings.push('Work may be stopped if required inspections are not completed')
  }

  // Check for activities that might proceed without inspection
  const activitiesStartingSoon = activities.filter(a => {
    const start = new Date(a.planned_start || a.start_date)
    const daysUntil = Math.floor((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 3
  })

  if (activitiesStartingSoon.length > 0 && needed.some(n => n.priority === 'critical')) {
    warnings.push('Activities starting soon may require inspections before proceeding')
  }

  return warnings.slice(0, 4)
}
