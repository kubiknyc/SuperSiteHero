/**
 * Look-Ahead Schedule Generator Tool
 * Generate a 2-week look-ahead schedule for field use with milestones and inspections
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface GenerateLookaheadInput {
  project_id: string
  weeks?: number
  include_milestones?: boolean
  include_inspections?: boolean
  format?: 'detailed' | 'summary'
}

interface LookaheadActivity {
  id: string
  name: string
  trade: string
  start_date: string
  end_date: string
  duration_days: number
  percent_complete: number
  is_critical_path: boolean
  predecessors: string[]
  resources_needed: string[]
}

interface Milestone {
  name: string
  date: string
  status: 'on_track' | 'at_risk' | 'delayed'
}

interface LookaheadInspection {
  type: string
  date: string
  status: string
}

interface Delivery {
  material: string
  expected_date: string
  supplier: string
}

interface WeeklyBreakdown {
  week_number: number
  week_start: string
  week_end: string
  activities: LookaheadActivity[]
  milestones: Milestone[]
  inspections: LookaheadInspection[]
  deliveries: Delivery[]
}

interface SummaryMetrics {
  total_activities: number
  critical_path_activities: number
  activities_at_risk: number
  required_manpower: Record<string, number>
}

interface GenerateLookaheadOutput {
  lookahead: {
    start_date: string
    end_date: string
    weeks: number
  }
  weekly_breakdown: WeeklyBreakdown[]
  summary_metrics: SummaryMetrics
  conflicts_warnings: string[]
  printable_format?: {
    html: string
    pdf_ready: boolean
  }
}

function getWeekDates(startDate: Date, weekNumber: number): { start: Date; end: Date } {
  const start = new Date(startDate)
  start.setDate(start.getDate() + (weekNumber - 1) * 7)

  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  return { start, end }
}

function extractTrade(activityName: string, subcontractorTrade?: string): string {
  if (subcontractorTrade) return subcontractorTrade

  const lowerName = activityName.toLowerCase()
  const tradePatterns: Array<[RegExp, string]> = [
    [/electrical|electric/i, 'Electrical'],
    [/plumbing|plumb/i, 'Plumbing'],
    [/hvac|mechanical|duct/i, 'HVAC'],
    [/concrete|pour|slab/i, 'Concrete'],
    [/framing|fram|stud/i, 'Framing'],
    [/drywall|sheetrock/i, 'Drywall'],
    [/painting|paint/i, 'Painting'],
    [/roofing|roof/i, 'Roofing'],
    [/steel|iron/i, 'Steel'],
    [/fire|sprinkler/i, 'Fire Protection'],
    [/masonry|brick/i, 'Masonry'],
    [/flooring|floor|tile/i, 'Flooring'],
    [/ceiling/i, 'Ceiling'],
    [/insulation/i, 'Insulation'],
  ]

  for (const [pattern, trade] of tradePatterns) {
    if (pattern.test(lowerName)) return trade
  }

  return 'General'
}

function calculateDuration(start: string, end: string): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function generatePrintableHTML(output: GenerateLookaheadOutput, projectName: string): string {
  const { lookahead, weekly_breakdown, summary_metrics } = output

  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Look-Ahead Schedule - ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10pt; margin: 20px; }
    h1 { font-size: 16pt; margin-bottom: 5px; }
    h2 { font-size: 12pt; margin-top: 15px; border-bottom: 1px solid #ccc; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
    th { background-color: #f0f0f0; }
    .critical { background-color: #ffe0e0; }
    .milestone { background-color: #e0f0ff; font-weight: bold; }
    .week-header { background-color: #333; color: white; font-size: 11pt; }
    .summary { margin-top: 20px; padding: 10px; background-color: #f9f9f9; }
    .trade-column { width: 100px; }
    .date-column { width: 80px; }
    .status-column { width: 60px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Look-Ahead Schedule</h1>
  <p><strong>Project:</strong> ${projectName}</p>
  <p><strong>Period:</strong> ${lookahead.start_date} to ${lookahead.end_date}</p>
  <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
`

  for (const week of weekly_breakdown) {
    html += `
  <h2>Week ${week.week_number}: ${week.week_start} - ${week.week_end}</h2>
  <table>
    <tr class="week-header">
      <th class="trade-column">Trade</th>
      <th>Activity</th>
      <th class="date-column">Start</th>
      <th class="date-column">End</th>
      <th class="status-column">%</th>
    </tr>
`

    for (const activity of week.activities) {
      const rowClass = activity.is_critical_path ? 'critical' : ''
      html += `
    <tr class="${rowClass}">
      <td>${activity.trade}</td>
      <td>${activity.name}${activity.is_critical_path ? ' ⚠️' : ''}</td>
      <td>${activity.start_date}</td>
      <td>${activity.end_date}</td>
      <td>${activity.percent_complete}%</td>
    </tr>
`
    }

    for (const milestone of week.milestones) {
      html += `
    <tr class="milestone">
      <td>MILESTONE</td>
      <td>${milestone.name}</td>
      <td colspan="2">${milestone.date}</td>
      <td>${milestone.status}</td>
    </tr>
`
    }

    for (const inspection of week.inspections) {
      html += `
    <tr>
      <td>INSPECTION</td>
      <td>${inspection.type}</td>
      <td colspan="2">${inspection.date}</td>
      <td>${inspection.status}</td>
    </tr>
`
    }

    html += `  </table>\n`
  }

  html += `
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Activities:</strong> ${summary_metrics.total_activities}</p>
    <p><strong>Critical Path Activities:</strong> ${summary_metrics.critical_path_activities}</p>
    <p><strong>Activities at Risk:</strong> ${summary_metrics.activities_at_risk}</p>
    <h3>Required Manpower by Trade:</h3>
    <ul>
`

  for (const [trade, count] of Object.entries(summary_metrics.required_manpower)) {
    html += `      <li>${trade}: ${count} workers</li>\n`
  }

  html += `
    </ul>
  </div>
</body>
</html>
`

  return html
}

export const generateLookaheadTool = createTool<GenerateLookaheadInput, GenerateLookaheadOutput>({
  name: 'generate_lookahead',
  displayName: 'Generate Look-Ahead Schedule',
  description: 'Generates a 2-week (or custom period) look-ahead schedule for field use. Includes activities, milestones, inspections, and required manpower by trade. Can output in printable format.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      weeks: {
        type: 'number',
        description: 'Number of weeks for look-ahead (default: 2, max: 4)'
      },
      include_milestones: {
        type: 'boolean',
        description: 'Include milestones (default: true)'
      },
      include_inspections: {
        type: 'boolean',
        description: 'Include scheduled inspections (default: true)'
      },
      format: {
        type: 'string',
        enum: ['detailed', 'summary'],
        description: 'Output format level (default: detailed)'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 1200,

  async execute(input, context) {
    const {
      project_id,
      weeks = 2,
      include_milestones = true,
      include_inspections = true,
      format = 'detailed'
    } = input

    const limitedWeeks = Math.min(4, Math.max(1, weeks))

    const today = new Date()
    // Start from Monday of current week
    const dayOfWeek = today.getDay()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - dayOfWeek + 1) // Move to Monday

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + (limitedWeeks * 7) - 1)

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', project_id)
      .single()

    // Get activities in the look-ahead period
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select(`
        id,
        activity_id,
        name,
        planned_start,
        planned_finish,
        status,
        percent_complete,
        is_critical,
        is_milestone,
        subcontractor_id,
        subcontractors (
          company_name,
          trade
        )
      `)
      .eq('project_id', project_id)
      .lte('planned_start', endDate.toISOString().split('T')[0])
      .gte('planned_finish', startDate.toISOString().split('T')[0])
      .order('planned_start', { ascending: true })

    // Get dependencies for predecessor info
    const { data: dependencies } = await supabase
      .from('schedule_dependencies')
      .select('predecessor_id, successor_id')
      .eq('project_id', project_id)

    const predecessorMap = new Map<string, string[]>()
    for (const dep of dependencies || []) {
      const existing = predecessorMap.get(dep.successor_id) || []
      existing.push(dep.predecessor_id)
      predecessorMap.set(dep.successor_id, existing)
    }

    // Get inspections
    let inspections: any[] = []
    if (include_inspections) {
      const { data: inspectionData } = await supabase
        .from('inspections')
        .select('id, inspection_type, scheduled_date, status')
        .eq('project_id', project_id)
        .gte('scheduled_date', startDate.toISOString().split('T')[0])
        .lte('scheduled_date', endDate.toISOString().split('T')[0])

      inspections = inspectionData || []
    }

    // Build weekly breakdown
    const weeklyBreakdown: WeeklyBreakdown[] = []
    const manpowerByTrade: Record<string, number> = {}
    let totalActivities = 0
    let criticalPathCount = 0
    let atRiskCount = 0
    const warnings: string[] = []

    for (let weekNum = 1; weekNum <= limitedWeeks; weekNum++) {
      const { start: weekStart, end: weekEnd } = getWeekDates(startDate, weekNum)

      const weekActivities: LookaheadActivity[] = []
      const weekMilestones: Milestone[] = []
      const weekInspections: LookaheadInspection[] = []
      const weekDeliveries: Delivery[] = []

      for (const activity of activities || []) {
        const actStart = new Date(activity.planned_start)
        const actEnd = new Date(activity.planned_finish)

        // Check if activity overlaps this week
        if (actStart <= weekEnd && actEnd >= weekStart) {
          // Determine if it's a milestone
          if (activity.is_milestone && include_milestones) {
            let milestoneStatus: 'on_track' | 'at_risk' | 'delayed' = 'on_track'

            if (actStart < today && activity.status !== 'completed') {
              milestoneStatus = 'delayed'
            } else if (activity.percent_complete < 80 && actStart <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
              milestoneStatus = 'at_risk'
            }

            weekMilestones.push({
              name: activity.name,
              date: activity.planned_start,
              status: milestoneStatus
            })
          } else {
            // Regular activity
            const trade = extractTrade(activity.name, activity.subcontractors?.trade)

            // Get predecessor names
            const predIds = predecessorMap.get(activity.id) || []
            const predNames = predIds.map(id => {
              const pred = activities?.find(a => a.id === id)
              return pred?.name || 'Unknown'
            }).slice(0, 3)

            weekActivities.push({
              id: activity.activity_id || activity.id,
              name: activity.name,
              trade,
              start_date: activity.planned_start,
              end_date: activity.planned_finish,
              duration_days: calculateDuration(activity.planned_start, activity.planned_finish),
              percent_complete: activity.percent_complete || 0,
              is_critical_path: activity.is_critical || false,
              predecessors: predNames,
              resources_needed: [trade]
            })

            // Track manpower estimates
            manpowerByTrade[trade] = (manpowerByTrade[trade] || 0) + 4 // Estimate 4 workers per activity

            if (activity.is_critical) criticalPathCount++
            totalActivities++

            // Check if at risk
            if (activity.percent_complete < 50 && actStart < today) {
              atRiskCount++
              warnings.push(`${activity.name} is behind schedule (${activity.percent_complete || 0}% complete)`)
            }
          }
        }
      }

      // Add inspections for this week
      for (const inspection of inspections) {
        const inspDate = new Date(inspection.scheduled_date)
        if (inspDate >= weekStart && inspDate <= weekEnd) {
          weekInspections.push({
            type: inspection.inspection_type,
            date: inspection.scheduled_date,
            status: inspection.status
          })
        }
      }

      weeklyBreakdown.push({
        week_number: weekNum,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        activities: weekActivities,
        milestones: weekMilestones,
        inspections: weekInspections,
        deliveries: weekDeliveries
      })
    }

    // Check for conflicts
    for (const week of weeklyBreakdown) {
      // Check for multiple critical activities in same week
      const criticalInWeek = week.activities.filter(a => a.is_critical_path)
      if (criticalInWeek.length > 3) {
        warnings.push(`Week ${week.week_number}: ${criticalInWeek.length} critical path activities - high coordination required`)
      }

      // Check for inspection coordination
      if (week.inspections.length > 0 && week.activities.length > 5) {
        warnings.push(`Week ${week.week_number}: Heavy activity week with scheduled inspections - ensure preparation time`)
      }
    }

    const result: GenerateLookaheadOutput = {
      lookahead: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        weeks: limitedWeeks
      },
      weekly_breakdown: weeklyBreakdown,
      summary_metrics: {
        total_activities: totalActivities,
        critical_path_activities: criticalPathCount,
        activities_at_risk: atRiskCount,
        required_manpower: manpowerByTrade
      },
      conflicts_warnings: warnings.slice(0, 10)
    }

    // Generate printable format
    if (format === 'detailed') {
      result.printable_format = {
        html: generatePrintableHTML(result, project?.name || 'Project'),
        pdf_ready: true
      }
    }

    return {
      success: true,
      data: result,
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { lookahead, summary_metrics, conflicts_warnings } = output

    return {
      title: `${lookahead.weeks}-Week Look-Ahead Generated`,
      summary: `${summary_metrics.total_activities} activities, ${summary_metrics.critical_path_activities} critical path, ${conflicts_warnings.length} warnings`,
      icon: 'calendar',
      status: summary_metrics.activities_at_risk > 3 ? 'warning' : 'success',
      details: [
        { label: 'Period', value: `${lookahead.start_date} to ${lookahead.end_date}`, type: 'text' },
        { label: 'Activities', value: summary_metrics.total_activities, type: 'text' },
        { label: 'Critical Path', value: summary_metrics.critical_path_activities, type: 'text' },
        { label: 'At Risk', value: summary_metrics.activities_at_risk, type: 'badge' },
        { label: 'Warnings', value: conflicts_warnings.length, type: 'text' },
      ],
      actions: [
        {
          id: 'print',
          label: 'Print Look-Ahead',
          icon: 'printer',
          action: 'custom',
          data: { action: 'print', html: output.printable_format?.html }
        }
      ],
      expandedContent: output
    }
  }
})
