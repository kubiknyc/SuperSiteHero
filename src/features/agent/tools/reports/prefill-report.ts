/**
 * Pre-fill Report Tool
 * Create a draft daily report pre-populated with carryover data from the previous day
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import { getWeatherForProject } from '@/features/daily-reports/services/weatherApiService'

interface PrefillReportInput {
  project_id: string
  date: string
  previous_report_id?: string
  include_sections: ('manpower' | 'equipment' | 'activities' | 'visitors')[]
}

interface PrefilledWorkActivity {
  trade: string
  description: string
  location: string
  suggested_workers: number
  carryover: boolean
}

interface PrefilledManpower {
  trade: string
  company: string
  expected_headcount: number
  basis: 'yesterday' | 'schedule' | 'average'
}

interface PrefilledEquipment {
  type: string
  quantity: number
  status: 'active' | 'idle'
}

interface PrefillReportOutput {
  prefilled_report: {
    date: string
    weather?: {
      conditions: string
      temperature_high: number
      temperature_low: number
      humidity: number
      wind_speed: number
      wind_direction: string
    }
    work_activities: PrefilledWorkActivity[]
    manpower: PrefilledManpower[]
    equipment: PrefilledEquipment[]
    open_items: string[]
  }
  confidence_scores: {
    manpower: number
    activities: number
    equipment: number
  }
  requires_verification: string[]
}

export const prefillReportTool = createTool<PrefillReportInput, PrefillReportOutput>({
  name: 'prefill_report',
  displayName: 'Pre-fill Daily Report',
  description: 'Creates a draft daily report pre-populated with carryover data including manpower, equipment, and activities from the previous day. Saves time on repetitive data entry.',
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
        description: 'Date for the new report (ISO format)'
      },
      previous_report_id: {
        type: 'string',
        description: 'Specific previous report to copy from (optional, will find most recent if not provided)'
      },
      include_sections: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['manpower', 'equipment', 'activities', 'visitors']
        },
        description: 'Sections to include in pre-fill (default: all)'
      }
    },
    required: ['project_id', 'date']
  },
  requiresConfirmation: false,
  estimatedTokens: 800,

  async execute(input, context) {
    const {
      project_id,
      date,
      previous_report_id,
      include_sections = ['manpower', 'equipment', 'activities', 'visitors']
    } = input

    // Find previous report
    let previousReportQuery = supabase
      .from('daily_reports')
      .select(`
        id,
        report_date,
        work_completed,
        work_planned,
        issues,
        visitors
      `)
      .eq('project_id', project_id)
      .lt('report_date', date)
      .order('report_date', { ascending: false })
      .limit(1)

    if (previous_report_id) {
      previousReportQuery = supabase
        .from('daily_reports')
        .select(`
          id,
          report_date,
          work_completed,
          work_planned,
          issues,
          visitors
        `)
        .eq('id', previous_report_id)
    }

    const { data: previousReport } = await previousReportQuery.single()

    // Get labor data from previous report
    let manpowerData: PrefilledManpower[] = []
    if (include_sections.includes('manpower') && previousReport) {
      const { data: laborData } = await supabase
        .from('daily_report_labor')
        .select(`
          trade,
          company,
          headcount,
          hours_worked
        `)
        .eq('daily_report_id', previousReport.id)

      if (laborData) {
        manpowerData = laborData.map(l => ({
          trade: l.trade,
          company: l.company || 'Unknown',
          expected_headcount: l.headcount,
          basis: 'yesterday' as const
        }))
      }
    }

    // If no previous manpower, try to estimate from schedule
    if (manpowerData.length === 0 && include_sections.includes('manpower')) {
      const { data: scheduleData } = await supabase
        .from('schedule_activities')
        .select(`
          name,
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
        .limit(10)

      if (scheduleData) {
        const tradeMap = new Map<string, { company: string; count: number }>()
        for (const activity of scheduleData) {
          const trade = activity.subcontractors?.trade || extractTradeFromName(activity.name)
          const company = activity.subcontractors?.company_name || 'TBD'
          const existing = tradeMap.get(trade)
          if (existing) {
            existing.count++
          } else {
            tradeMap.set(trade, { company, count: 1 })
          }
        }

        manpowerData = Array.from(tradeMap.entries()).map(([trade, data]) => ({
          trade,
          company: data.company,
          expected_headcount: Math.max(2, data.count * 2), // Rough estimate
          basis: 'schedule' as const
        }))
      }
    }

    // Get equipment data
    let equipmentData: PrefilledEquipment[] = []
    if (include_sections.includes('equipment') && previousReport) {
      const { data: equipment } = await supabase
        .from('daily_report_equipment')
        .select(`
          equipment_type,
          quantity,
          status
        `)
        .eq('daily_report_id', previousReport.id)

      if (equipment) {
        equipmentData = equipment.map(e => ({
          type: e.equipment_type,
          quantity: e.quantity,
          status: e.status || 'active'
        }))
      }
    }

    // Get work activities
    let activities: PrefilledWorkActivity[] = []
    if (include_sections.includes('activities')) {
      // Carryover incomplete work from previous day
      if (previousReport?.work_planned) {
        const planned = typeof previousReport.work_planned === 'string'
          ? previousReport.work_planned.split('\n').filter(Boolean)
          : Array.isArray(previousReport.work_planned)
            ? previousReport.work_planned
            : []

        activities.push(...planned.slice(0, 5).map(item => ({
          trade: extractTradeFromName(String(item)),
          description: String(item),
          location: 'TBD',
          suggested_workers: 4,
          carryover: true
        })))
      }

      // Add scheduled activities
      const { data: scheduleActivities } = await supabase
        .from('schedule_activities')
        .select('name, planned_start')
        .eq('project_id', project_id)
        .lte('planned_start', date)
        .gte('planned_finish', date)
        .neq('status', 'completed')
        .limit(5)

      if (scheduleActivities) {
        activities.push(...scheduleActivities.map(a => ({
          trade: extractTradeFromName(a.name),
          description: a.name,
          location: 'Per schedule',
          suggested_workers: 4,
          carryover: false
        })))
      }
    }

    // Get open items/issues from previous day
    const openItems: string[] = []
    if (previousReport?.issues) {
      const issues = typeof previousReport.issues === 'string'
        ? previousReport.issues.split('\n').filter(Boolean)
        : Array.isArray(previousReport.issues)
          ? previousReport.issues
          : []

      openItems.push(...issues.slice(0, 5).map(String))
    }

    // Fetch current weather
    let weatherData
    const weather = await getWeatherForProject(project_id)
    if (weather) {
      weatherData = {
        conditions: weather.conditions,
        temperature_high: weather.temperature,
        temperature_low: Math.round(weather.temperature - 10),
        humidity: weather.humidity,
        wind_speed: weather.windSpeed,
        wind_direction: weather.windDirection
      }
    }

    // Calculate confidence scores
    const confidenceScores = {
      manpower: manpowerData.length > 0
        ? (manpowerData[0].basis === 'yesterday' ? 0.9 : 0.6)
        : 0.3,
      activities: activities.length > 0 ? 0.8 : 0.4,
      equipment: equipmentData.length > 0 ? 0.85 : 0.3
    }

    // Items requiring verification
    const requiresVerification: string[] = []
    if (confidenceScores.manpower < 0.7) {
      requiresVerification.push('Verify manpower counts with foremen')
    }
    if (activities.some(a => a.carryover)) {
      requiresVerification.push('Confirm carryover activities are still relevant')
    }
    if (!weatherData) {
      requiresVerification.push('Add weather conditions manually')
    }
    if (equipmentData.length === 0) {
      requiresVerification.push('Add equipment on site')
    }

    return {
      success: true,
      data: {
        prefilled_report: {
          date,
          weather: weatherData,
          work_activities: activities,
          manpower: manpowerData,
          equipment: equipmentData,
          open_items: openItems
        },
        confidence_scores: confidenceScores,
        requires_verification: requiresVerification
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { prefilled_report, confidence_scores, requires_verification } = output

    const avgConfidence = (confidence_scores.manpower + confidence_scores.activities + confidence_scores.equipment) / 3

    return {
      title: 'Report Pre-filled',
      summary: `${prefilled_report.work_activities.length} activities, ${prefilled_report.manpower.length} trades, ${avgConfidence * 100}% confidence`,
      icon: 'file-text',
      status: avgConfidence > 0.7 ? 'success' : 'warning',
      details: [
        { label: 'Activities', value: prefilled_report.work_activities.length, type: 'text' },
        { label: 'Trades', value: prefilled_report.manpower.length, type: 'text' },
        { label: 'Equipment', value: prefilled_report.equipment.length, type: 'text' },
        { label: 'Open Items', value: prefilled_report.open_items.length, type: 'text' },
        { label: 'Confidence', value: `${Math.round(avgConfidence * 100)}%`, type: 'badge' }
      ],
      actions: [
        {
          id: 'verify',
          label: 'Review & Verify',
          icon: 'check-circle',
          action: 'navigate',
          data: { path: '/daily-reports/new' }
        }
      ],
      expandedContent: {
        prefilled_report,
        requires_verification
      }
    }
  }
})

function extractTradeFromName(name: string): string {
  const lowerName = name.toLowerCase()

  const tradePatterns: Array<[RegExp, string]> = [
    [/electrical|electric|wire|conduit/i, 'Electrical'],
    [/plumbing|plumb|pipe|drain/i, 'Plumbing'],
    [/hvac|duct|mechanical/i, 'HVAC'],
    [/concrete|pour|slab/i, 'Concrete'],
    [/framing|stud|wood/i, 'Framing'],
    [/drywall|sheetrock/i, 'Drywall'],
    [/painting|paint/i, 'Painting'],
    [/roofing|roof/i, 'Roofing'],
    [/steel|iron/i, 'Steel'],
    [/fire.*protect|sprinkler/i, 'Fire Protection'],
    [/masonry|brick|block/i, 'Masonry'],
    [/insulation/i, 'Insulation'],
    [/flooring|floor|tile/i, 'Flooring'],
    [/glazing|glass|window/i, 'Glazing'],
  ]

  for (const [pattern, trade] of tradePatterns) {
    if (pattern.test(lowerName)) {
      return trade
    }
  }

  return 'General'
}
