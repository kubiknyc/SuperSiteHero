/**
 * Smart Activity Suggestions Tool
 * Suggest work activities based on schedule, previous reports, and weather conditions
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import { getWeatherForProject, analyzeWeatherImpact } from '@/features/daily-reports/services/weatherApiService'

interface SuggestActivitiesInput {
  project_id: string
  date: string
  include_yesterday?: boolean
  consider_weather?: boolean
}

interface ScheduledActivity {
  activity_id: string
  name: string
  planned_start: string
  expected_trades: string[]
  expected_manpower: number
  dependencies_met: boolean
}

interface CarryoverActivity {
  activity_id: string
  name: string
  percent_complete: number
  yesterday_progress: string
}

interface WeatherAdjustedActivity {
  activity_id: string
  name: string
  reason: string
  alternative_suggestion?: string
}

interface SuggestActivitiesOutput {
  scheduled_activities: ScheduledActivity[]
  carryover_activities: CarryoverActivity[]
  weather_adjusted: WeatherAdjustedActivity[]
  suggested_priorities: string[]
}

// Trade mapping for activity names
const TRADE_KEYWORDS: Record<string, string[]> = {
  'Electrical': ['electrical', 'wire', 'conduit', 'panel', 'outlet', 'switch', 'lighting'],
  'Plumbing': ['plumbing', 'pipe', 'drain', 'fixture', 'water', 'sewer', 'sanitary'],
  'HVAC': ['hvac', 'duct', 'mechanical', 'air handler', 'vav', 'diffuser', 'thermostat'],
  'Concrete': ['concrete', 'pour', 'slab', 'foundation', 'footing', 'deck'],
  'Framing': ['framing', 'stud', 'wall', 'header', 'joist', 'truss'],
  'Drywall': ['drywall', 'gypsum', 'sheetrock', 'board', 'taping', 'finishing'],
  'Painting': ['paint', 'prime', 'coat', 'finish', 'texture'],
  'Roofing': ['roof', 'shingle', 'membrane', 'flashing'],
  'Steel': ['steel', 'iron', 'metal', 'beam', 'column'],
  'Fire Protection': ['sprinkler', 'fire alarm', 'suppression'],
}

function extractTradesFromActivity(activityName: string): string[] {
  const trades: string[] = []
  const lowerName = activityName.toLowerCase()

  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (keywords.some(kw => lowerName.includes(kw))) {
      trades.push(trade)
    }
  }

  return trades.length > 0 ? trades : ['General']
}

// Weather-sensitive trades
const WEATHER_SENSITIVE_ACTIVITIES: Record<string, { reason: string; alternative: string }> = {
  'concrete': { reason: 'Concrete work affected by precipitation/temperature', alternative: 'Interior finishing or underground work' },
  'roofing': { reason: 'Roofing work cannot proceed in rain/high winds', alternative: 'Interior insulation or ceiling work' },
  'painting': { reason: 'Exterior painting affected by humidity/rain', alternative: 'Interior painting or surface prep' },
  'masonry': { reason: 'Masonry work affected by rain/freezing temps', alternative: 'Material staging or interior work' },
  'excavation': { reason: 'Excavation may be halted due to rain/mud', alternative: 'Equipment maintenance or site drainage' },
  'crane': { reason: 'Crane operations suspended in high winds', alternative: 'Ground-level assembly work' },
}

export const suggestActivitiesTool = createTool<SuggestActivitiesInput, SuggestActivitiesOutput>({
  name: 'suggest_activities',
  displayName: 'Suggest Daily Activities',
  description: 'Suggests work activities for the day based on schedule, previous day\'s progress, and weather conditions. Helps superintendents plan their day efficiently.',
  category: 'report',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      date: {
        type: 'string',
        description: 'Date to suggest activities for (ISO format)'
      },
      include_yesterday: {
        type: 'boolean',
        description: 'Include carryover activities from previous day (default: true)'
      },
      consider_weather: {
        type: 'boolean',
        description: 'Adjust suggestions based on weather conditions (default: true)'
      }
    },
    required: ['project_id', 'date']
  },
  requiresConfirmation: false,
  estimatedTokens: 800,

  async execute(input, context) {
    const { project_id, date, include_yesterday = true, consider_weather = true } = input

    // Get scheduled activities for this date
    const { data: scheduleActivities, error: scheduleError } = await supabase
      .from('schedule_activities')
      .select(`
        id,
        activity_id,
        name,
        planned_start,
        planned_finish,
        percent_complete,
        status,
        is_critical,
        subcontractor_id,
        subcontractors (
          company_name,
          trade
        )
      `)
      .eq('project_id', project_id)
      .lte('planned_start', date)
      .gte('planned_finish', date)
      .neq('status', 'completed')
      .order('is_critical', { ascending: false })
      .order('planned_start', { ascending: true })
      .limit(20)

    // Get yesterday's daily report for carryover
    let carryoverActivities: CarryoverActivity[] = []
    if (include_yesterday) {
      const yesterday = new Date(date)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const { data: yesterdayReport } = await supabase
        .from('daily_reports')
        .select(`
          id,
          work_completed,
          work_planned,
          issues
        `)
        .eq('project_id', project_id)
        .eq('report_date', yesterdayStr)
        .single()

      if (yesterdayReport?.work_planned) {
        // Parse work planned that wasn't completed
        const plannedItems = typeof yesterdayReport.work_planned === 'string'
          ? yesterdayReport.work_planned.split('\n').filter(Boolean)
          : Array.isArray(yesterdayReport.work_planned)
            ? yesterdayReport.work_planned
            : []

        carryoverActivities = plannedItems.slice(0, 5).map((item, idx) => ({
          activity_id: `carryover-${idx}`,
          name: typeof item === 'string' ? item : String(item),
          percent_complete: 0,
          yesterday_progress: 'Carried over from previous day'
        }))
      }
    }

    // Check weather if requested
    let weatherAdjusted: WeatherAdjustedActivity[] = []
    let weatherImpact: { severity: string } = { severity: 'none' }

    if (consider_weather) {
      const weather = await getWeatherForProject(project_id)
      if (weather) {
        const impact = analyzeWeatherImpact(weather)
        weatherImpact = impact

        if (impact.severity !== 'none') {
          // Check each activity for weather sensitivity
          const allActivities = [
            ...(scheduleActivities || []).map(a => ({ id: a.id, name: a.name })),
            ...carryoverActivities.map(a => ({ id: a.activity_id, name: a.name }))
          ]

          for (const activity of allActivities) {
            const lowerName = activity.name.toLowerCase()
            for (const [keyword, info] of Object.entries(WEATHER_SENSITIVE_ACTIVITIES)) {
              if (lowerName.includes(keyword)) {
                weatherAdjusted.push({
                  activity_id: activity.id,
                  name: activity.name,
                  reason: info.reason,
                  alternative_suggestion: info.alternative
                })
                break
              }
            }
          }
        }
      }
    }

    // Build scheduled activities response
    const scheduled: ScheduledActivity[] = (scheduleActivities || []).map(activity => ({
      activity_id: activity.activity_id || activity.id,
      name: activity.name,
      planned_start: activity.planned_start,
      expected_trades: activity.subcontractors?.trade
        ? [activity.subcontractors.trade]
        : extractTradesFromActivity(activity.name),
      expected_manpower: estimateManpower(activity.name),
      dependencies_met: activity.status !== 'blocked'
    }))

    // Generate priority suggestions
    const priorities: string[] = []

    // Critical path items first
    const criticalItems = (scheduleActivities || []).filter(a => a.is_critical)
    if (criticalItems.length > 0) {
      priorities.push(`Focus on critical path: ${criticalItems.map(a => a.name).slice(0, 2).join(', ')}`)
    }

    // Weather considerations
    if (weatherAdjusted.length > 0 && weatherImpact.severity !== 'none') {
      priorities.push(`Weather impact (${weatherImpact.severity}): Consider rescheduling ${weatherAdjusted.length} activities`)
    }

    // Carryover items
    if (carryoverActivities.length > 0) {
      priorities.push(`Complete ${carryoverActivities.length} carryover items from yesterday`)
    }

    // Default priority
    if (priorities.length === 0) {
      priorities.push('Proceed with scheduled activities as planned')
    }

    return {
      success: true,
      data: {
        scheduled_activities: scheduled,
        carryover_activities: carryoverActivities,
        weather_adjusted: weatherAdjusted,
        suggested_priorities: priorities
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { scheduled_activities, carryover_activities, weather_adjusted, suggested_priorities } = output

    return {
      title: 'Activity Suggestions',
      summary: `${scheduled_activities.length} scheduled, ${carryover_activities.length} carryover, ${weather_adjusted.length} weather-impacted`,
      icon: 'clipboard-list',
      status: weather_adjusted.length > 0 ? 'warning' : 'success',
      details: [
        { label: 'Scheduled Activities', value: scheduled_activities.length, type: 'text' },
        { label: 'Carryover Items', value: carryover_activities.length, type: 'text' },
        { label: 'Weather Concerns', value: weather_adjusted.length, type: 'text' }
      ],
      expandedContent: {
        scheduled_activities,
        carryover_activities,
        weather_adjusted,
        suggested_priorities
      }
    }
  }
})

function estimateManpower(activityName: string): number {
  const lowerName = activityName.toLowerCase()

  // Rough estimates based on activity type
  if (lowerName.includes('pour') || lowerName.includes('concrete')) return 8
  if (lowerName.includes('framing')) return 6
  if (lowerName.includes('electrical')) return 4
  if (lowerName.includes('plumbing')) return 4
  if (lowerName.includes('hvac')) return 4
  if (lowerName.includes('drywall')) return 6
  if (lowerName.includes('painting')) return 4
  if (lowerName.includes('roofing')) return 6
  if (lowerName.includes('steel')) return 6

  return 4 // Default estimate
}
