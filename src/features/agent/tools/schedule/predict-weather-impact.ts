/**
 * Weather Impact Prediction Tool
 * Predict weather-related schedule impacts and suggest contingencies
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import { getWeatherForProject, type WeatherData } from '@/features/daily-reports/services/weatherApiService'

interface PredictWeatherImpactInput {
  project_id: string
  forecast_days?: number
  activities_filter?: string[]
}

interface AffectedActivity {
  activity_id: string
  activity_name: string
  trade: string
  impact_reason: string
  delay_risk_hours: number
}

interface DailyImpact {
  date: string
  weather: {
    conditions: string
    temperature_high: number
    temperature_low: number
    precipitation_chance: number
    wind_speed: number
  }
  work_impact: 'none' | 'minor' | 'moderate' | 'severe'
  affected_activities: AffectedActivity[]
  contingency_options: string[]
}

interface WeatherDelayForecast {
  probable_delay_days: number
  confidence: number
  most_affected_trades: string[]
}

interface Recommendation {
  action: string
  timing: 'immediate' | 'before_impact' | 'contingency'
  activities_affected: string[]
}

interface BestWorkWindow {
  date: string
  activity_types: string[]
  reason: string
}

interface PredictWeatherImpactOutput {
  forecast_period: {
    start_date: string
    end_date: string
  }
  daily_impact: DailyImpact[]
  weather_delay_forecast: WeatherDelayForecast
  recommendations: Recommendation[]
  best_work_windows: BestWorkWindow[]
}

// Weather sensitivity by trade
const TRADE_WEATHER_SENSITIVITY: Record<string, {
  rain_sensitive: boolean
  wind_limit_mph: number
  min_temp_f: number
  max_temp_f: number
  impact_activities: string[]
}> = {
  'Concrete': {
    rain_sensitive: true,
    wind_limit_mph: 25,
    min_temp_f: 40,
    max_temp_f: 95,
    impact_activities: ['Pour', 'Finish', 'Cure']
  },
  'Roofing': {
    rain_sensitive: true,
    wind_limit_mph: 15,
    min_temp_f: 45,
    max_temp_f: 100,
    impact_activities: ['Membrane', 'Shingle', 'Flash']
  },
  'Painting': {
    rain_sensitive: true,
    wind_limit_mph: 20,
    min_temp_f: 50,
    max_temp_f: 90,
    impact_activities: ['Exterior paint', 'Prime', 'Stain']
  },
  'Masonry': {
    rain_sensitive: true,
    wind_limit_mph: 25,
    min_temp_f: 40,
    max_temp_f: 100,
    impact_activities: ['Brick', 'Block', 'Stone']
  },
  'Steel': {
    rain_sensitive: false,
    wind_limit_mph: 20,
    min_temp_f: 0,
    max_temp_f: 110,
    impact_activities: ['Erection', 'Welding']
  },
  'Crane Operations': {
    rain_sensitive: false,
    wind_limit_mph: 20,
    min_temp_f: 0,
    max_temp_f: 110,
    impact_activities: ['Lift', 'Pick', 'Crane']
  },
  'Excavation': {
    rain_sensitive: true,
    wind_limit_mph: 35,
    min_temp_f: 20,
    max_temp_f: 110,
    impact_activities: ['Dig', 'Excavate', 'Grade']
  },
  'Paving': {
    rain_sensitive: true,
    wind_limit_mph: 25,
    min_temp_f: 50,
    max_temp_f: 100,
    impact_activities: ['Asphalt', 'Pave', 'Striping']
  },
  'Waterproofing': {
    rain_sensitive: true,
    wind_limit_mph: 20,
    min_temp_f: 45,
    max_temp_f: 95,
    impact_activities: ['Waterproof', 'Membrane', 'Sealant']
  },
  'Landscaping': {
    rain_sensitive: true,
    wind_limit_mph: 30,
    min_temp_f: 35,
    max_temp_f: 100,
    impact_activities: ['Plant', 'Sod', 'Irrigation']
  }
}

function extractTrade(activityName: string): string {
  const lowerName = activityName.toLowerCase()

  for (const trade of Object.keys(TRADE_WEATHER_SENSITIVITY)) {
    if (lowerName.includes(trade.toLowerCase())) {
      return trade
    }
  }

  const tradePatterns: Array<[RegExp, string]> = [
    [/pour|concrete|slab/i, 'Concrete'],
    [/roof|shingle|membrane/i, 'Roofing'],
    [/paint|prime|coat/i, 'Painting'],
    [/brick|block|masonry|stone/i, 'Masonry'],
    [/steel|iron|erect/i, 'Steel'],
    [/crane|lift|pick/i, 'Crane Operations'],
    [/excavat|dig|grade/i, 'Excavation'],
    [/pave|asphalt/i, 'Paving'],
    [/waterproof|seal/i, 'Waterproofing'],
    [/landscape|plant|sod/i, 'Landscaping'],
  ]

  for (const [pattern, trade] of tradePatterns) {
    if (pattern.test(lowerName)) return trade
  }

  return 'General'
}

function assessWeatherImpact(
  weather: WeatherData,
  trade: string
): { impact: 'none' | 'minor' | 'moderate' | 'severe'; reason: string; delayHours: number } {
  const sensitivity = TRADE_WEATHER_SENSITIVITY[trade]

  if (!sensitivity) {
    return { impact: 'none', reason: 'Not weather-sensitive', delayHours: 0 }
  }

  const conditions = weather.conditions.toLowerCase()
  const issues: string[] = []
  let delayHours = 0

  // Check rain/precipitation
  if (sensitivity.rain_sensitive && (conditions.includes('rain') || conditions.includes('drizzle'))) {
    if (conditions.includes('heavy') || conditions.includes('thunderstorm')) {
      issues.push('Heavy precipitation')
      delayHours += 8
    } else {
      issues.push('Rain')
      delayHours += 4
    }
  }

  // Check temperature
  if (weather.temperature < sensitivity.min_temp_f) {
    issues.push(`Cold (${weather.temperature}°F < ${sensitivity.min_temp_f}°F)`)
    delayHours += weather.temperature < sensitivity.min_temp_f - 10 ? 8 : 4
  }
  if (weather.temperature > sensitivity.max_temp_f) {
    issues.push(`Heat (${weather.temperature}°F > ${sensitivity.max_temp_f}°F)`)
    delayHours += 4
  }

  // Check wind
  if (weather.windSpeed > sensitivity.wind_limit_mph) {
    issues.push(`Wind (${weather.windSpeed} mph > ${sensitivity.wind_limit_mph} mph)`)
    delayHours += weather.windSpeed > sensitivity.wind_limit_mph + 10 ? 8 : 4
  }

  // Determine impact level
  let impact: 'none' | 'minor' | 'moderate' | 'severe' = 'none'
  if (delayHours >= 8) impact = 'severe'
  else if (delayHours >= 4) impact = 'moderate'
  else if (delayHours > 0) impact = 'minor'

  return {
    impact,
    reason: issues.length > 0 ? issues.join(', ') : 'None',
    delayHours
  }
}

function generateContingencies(impact: string, trade: string): string[] {
  const contingencies: string[] = []

  if (impact.toLowerCase().includes('rain')) {
    contingencies.push('Cover work area with tarps/temporary enclosure')
    contingencies.push('Shift to interior work activities')
    contingencies.push('Prepare materials for quick start when weather clears')
  }

  if (impact.toLowerCase().includes('cold')) {
    contingencies.push('Use heating blankets for concrete curing')
    contingencies.push('Provide heated break areas for workers')
    contingencies.push('Adjust material mix for cold weather')
  }

  if (impact.toLowerCase().includes('heat')) {
    contingencies.push('Schedule early morning starts (5-6 AM)')
    contingencies.push('Implement mandatory hydration breaks')
    contingencies.push('Provide shade structures in work area')
  }

  if (impact.toLowerCase().includes('wind')) {
    contingencies.push('Suspend elevated work and crane operations')
    contingencies.push('Secure loose materials and equipment')
    contingencies.push('Focus on low-level or protected work')
  }

  if (contingencies.length === 0) {
    contingencies.push('Monitor conditions and proceed with caution')
  }

  return contingencies
}

export const predictWeatherImpactTool = createTool<PredictWeatherImpactInput, PredictWeatherImpactOutput>({
  name: 'predict_weather_impact',
  displayName: 'Predict Weather Impact',
  description: 'Predicts weather-related schedule impacts for upcoming activities. Analyzes trade-specific weather sensitivity and provides contingency options and best work windows.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      forecast_days: {
        type: 'number',
        description: 'Number of days to forecast (default: 7)'
      },
      activities_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of specific activities to analyze'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 1000,

  async execute(input, context) {
    const { project_id, forecast_days = 7, activities_filter } = input

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + forecast_days)

    // Get weather data
    const weather = await getWeatherForProject(project_id)

    if (!weather) {
      return {
        success: false,
        error: 'Unable to fetch weather data for project location',
        errorCode: 'WEATHER_FETCH_FAILED'
      }
    }

    // Get scheduled activities
    let activityQuery = supabase
      .from('schedule_activities')
      .select(`
        id,
        activity_id,
        name,
        planned_start,
        planned_finish,
        status,
        subcontractors (
          trade
        )
      `)
      .eq('project_id', project_id)
      .lte('planned_start', endDate.toISOString().split('T')[0])
      .gte('planned_finish', today.toISOString().split('T')[0])
      .neq('status', 'completed')

    const { data: activities } = await activityQuery

    // For now, we'll use the current weather as a proxy for the forecast period
    // In production, you would call a forecast API for each day
    const dailyImpact: DailyImpact[] = []
    const affectedTradesCount: Record<string, number> = {}
    let totalDelayHours = 0

    for (let d = 0; d < forecast_days; d++) {
      const forecastDate = new Date(today)
      forecastDate.setDate(forecastDate.getDate() + d)
      const dateStr = forecastDate.toISOString().split('T')[0]

      // Get activities for this day
      const dayActivities = (activities || []).filter(a => {
        const start = new Date(a.planned_start)
        const end = new Date(a.planned_finish)
        return forecastDate >= start && forecastDate <= end
      })

      // Filter if specific activities requested
      const filteredActivities = activities_filter
        ? dayActivities.filter(a => activities_filter.some(f => a.name.toLowerCase().includes(f.toLowerCase())))
        : dayActivities

      const affectedActivities: AffectedActivity[] = []
      let dayMaxImpact: 'none' | 'minor' | 'moderate' | 'severe' = 'none'
      const dayContingencies = new Set<string>()

      for (const activity of filteredActivities) {
        const trade = activity.subcontractors?.trade || extractTrade(activity.name)
        const impact = assessWeatherImpact(weather, trade)

        if (impact.impact !== 'none') {
          affectedActivities.push({
            activity_id: activity.activity_id || activity.id,
            activity_name: activity.name,
            trade,
            impact_reason: impact.reason,
            delay_risk_hours: impact.delayHours
          })

          totalDelayHours += impact.delayHours
          affectedTradesCount[trade] = (affectedTradesCount[trade] || 0) + 1

          // Update max impact
          const impactOrder = { none: 0, minor: 1, moderate: 2, severe: 3 }
          if (impactOrder[impact.impact] > impactOrder[dayMaxImpact]) {
            dayMaxImpact = impact.impact
          }

          // Add contingencies
          generateContingencies(impact.reason, trade).forEach(c => dayContingencies.add(c))
        }
      }

      dailyImpact.push({
        date: dateStr,
        weather: {
          conditions: weather.conditions,
          temperature_high: weather.temperature,
          temperature_low: Math.round(weather.temperature - 10), // Estimate
          precipitation_chance: weather.conditions.toLowerCase().includes('rain') ? 70 : 20,
          wind_speed: weather.windSpeed
        },
        work_impact: dayMaxImpact,
        affected_activities: affectedActivities,
        contingency_options: Array.from(dayContingencies)
      })
    }

    // Calculate weather delay forecast
    const probableDelayDays = Math.round(totalDelayHours / 8 * 10) / 10
    const mostAffectedTrades = Object.entries(affectedTradesCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([trade]) => trade)

    const weatherDelayForecast: WeatherDelayForecast = {
      probable_delay_days: probableDelayDays,
      confidence: 0.7, // Weather forecasts beyond 3 days less reliable
      most_affected_trades: mostAffectedTrades
    }

    // Generate recommendations
    const recommendations: Recommendation[] = []

    const severeImpactDays = dailyImpact.filter(d => d.work_impact === 'severe')
    if (severeImpactDays.length > 0) {
      recommendations.push({
        action: `Prepare contingency plans for ${severeImpactDays.length} day(s) with severe weather impact`,
        timing: 'immediate',
        activities_affected: severeImpactDays.flatMap(d => d.affected_activities.map(a => a.activity_name))
      })
    }

    if (mostAffectedTrades.length > 0) {
      recommendations.push({
        action: `Coordinate with ${mostAffectedTrades.join(', ')} trades on weather backup plans`,
        timing: 'before_impact',
        activities_affected: []
      })
    }

    if (probableDelayDays > 1) {
      recommendations.push({
        action: 'Review schedule float and identify activities that can be resequenced',
        timing: 'before_impact',
        activities_affected: []
      })
    }

    // Identify best work windows (days with no impact)
    const bestWorkWindows: BestWorkWindow[] = dailyImpact
      .filter(d => d.work_impact === 'none' || d.work_impact === 'minor')
      .map(d => ({
        date: d.date,
        activity_types: Object.keys(TRADE_WEATHER_SENSITIVITY),
        reason: d.work_impact === 'none' ? 'Optimal weather conditions' : 'Minimal weather impact'
      }))
      .slice(0, 3)

    return {
      success: true,
      data: {
        forecast_period: {
          start_date: today.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        },
        daily_impact: dailyImpact,
        weather_delay_forecast: weatherDelayForecast,
        recommendations,
        best_work_windows: bestWorkWindows
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { daily_impact, weather_delay_forecast, recommendations, best_work_windows } = output

    const severeCount = daily_impact.filter(d => d.work_impact === 'severe').length
    const moderateCount = daily_impact.filter(d => d.work_impact === 'moderate').length

    return {
      title: 'Weather Impact Forecast',
      summary: `${weather_delay_forecast.probable_delay_days} probable delay days, ${severeCount} severe impact days`,
      icon: severeCount > 0 ? 'cloud-lightning' : moderateCount > 0 ? 'cloud-rain' : 'sun',
      status: severeCount > 0 ? 'error' : moderateCount > 0 ? 'warning' : 'success',
      details: [
        { label: 'Probable Delays', value: `${weather_delay_forecast.probable_delay_days} days`, type: 'badge' },
        { label: 'Severe Impact Days', value: severeCount, type: 'text' },
        { label: 'Moderate Impact Days', value: moderateCount, type: 'text' },
        { label: 'Best Work Windows', value: best_work_windows.length, type: 'text' },
        { label: 'Affected Trades', value: weather_delay_forecast.most_affected_trades.join(', ') || 'None', type: 'text' },
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
