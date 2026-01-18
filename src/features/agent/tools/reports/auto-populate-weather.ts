/**
 * Auto-Populate Weather Tool
 * Automatically fetch and format weather data for daily reports based on project location
 * Enhanced with OSHA heat/cold stress thresholds and comprehensive trade impact analysis
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import {
  getWeatherForProject,
  analyzeWeatherImpact,
  type WeatherData
} from '@/features/daily-reports/services/weatherApiService'
import {
  OSHA_HEAT_THRESHOLDS,
  COLD_STRESS_THRESHOLDS,
  TRADE_WEATHER_LIMITS,
  LIGHTNING_SAFETY,
  getHeatRiskLevel,
  getColdRiskLevel,
  calculateHeatIndex,
  calculateWindChill,
  checkTradeWeatherSafety,
} from '../../domain/construction-constants'

interface AutoPopulateWeatherInput {
  project_id: string
  date: string
  include_forecast?: boolean
}

interface WorkImpact {
  severity: 'none' | 'minor' | 'moderate' | 'severe'
  affected_activities: string[]
  recommendations: string[]
  osha_compliance: {
    heat_risk_level: string
    heat_index?: number
    cold_risk_level?: string
    wind_chill?: number
    required_actions: string[]
  }
  lightning_risk: boolean
  lightning_distance_miles?: number
}

interface AutoPopulateWeatherOutput {
  weather_data: {
    date: string
    conditions: string
    temperature_high: number
    temperature_low: number
    humidity: number
    wind_speed: number
    wind_direction: string
    precipitation: number
    precipitation_type?: string
    sunrise?: string
    sunset?: string
  }
  work_impact: WorkImpact
  tomorrow_forecast?: {
    conditions: string
    temperature_high: number
    precipitation_chance: number
    work_impact_prediction: string
  }
}

// Use comprehensive trade weather limits from domain constants
// TRADE_WEATHER_LIMITS is imported from construction-constants.ts

function determineAffectedActivities(weather: WeatherData): string[] {
  const affected: string[] = []
  const temp = weather.temperature
  const wind = weather.windSpeed
  const conditions = weather.conditions.toLowerCase()
  const isRaining = conditions.includes('rain') || conditions.includes('drizzle') || conditions.includes('storm')

  for (const [trade, limits] of Object.entries(TRADE_WEATHER_LIMITS)) {
    const result = checkTradeWeatherSafety(
      trade as keyof typeof TRADE_WEATHER_LIMITS,
      temp,
      wind,
      isRaining,
      weather.humidity
    )

    if (!result.safe) {
      // Add trade-specific notes from the constants
      const notes = limits.notes as Record<string, string>
      const relevantNotes: string[] = []

      if (temp < limits.minTemp && notes.coldWeather) {
        relevantNotes.push(notes.coldWeather)
      }
      if (temp > limits.maxTemp && notes.hotWeather) {
        relevantNotes.push(notes.hotWeather)
      }
      if (isRaining && notes.rain) {
        relevantNotes.push(notes.rain)
      }
      if (wind > limits.maxWind && notes.wind) {
        relevantNotes.push(notes.wind)
      }

      const noteText = relevantNotes.length > 0 ? ` (${relevantNotes[0]})` : ''
      affected.push(`${trade}: ${result.warnings.join(', ')}${noteText}`)
    }
  }

  return affected
}

interface OSHACompliance {
  heat_risk_level: string
  heat_index?: number
  cold_risk_level?: string
  wind_chill?: number
  required_actions: string[]
}

function generateOSHACompliance(weather: WeatherData): OSHACompliance {
  const heatIndex = calculateHeatIndex(weather.temperature, weather.humidity)
  const windChill = calculateWindChill(weather.temperature, weather.windSpeed)
  const heatRiskLevel = getHeatRiskLevel(heatIndex)
  const coldRiskLevel = getColdRiskLevel(windChill)
  const requiredActions: string[] = []

  // Heat stress actions
  if (heatRiskLevel !== 'low') {
    const threshold = OSHA_HEAT_THRESHOLDS[heatRiskLevel]
    requiredActions.push(...threshold.actions)
  }

  // Cold stress actions
  if (coldRiskLevel !== 'low') {
    const threshold = COLD_STRESS_THRESHOLDS[coldRiskLevel]
    requiredActions.push(...threshold.actions)
  }

  return {
    heat_risk_level: heatRiskLevel === 'low' ? 'Low' : OSHA_HEAT_THRESHOLDS[heatRiskLevel].risk,
    heat_index: heatIndex,
    cold_risk_level: coldRiskLevel === 'low' ? 'Low' : COLD_STRESS_THRESHOLDS[coldRiskLevel].risk,
    wind_chill: windChill,
    required_actions: requiredActions,
  }
}

function generateWeatherRecommendations(
  weather: WeatherData,
  impact: ReturnType<typeof analyzeWeatherImpact>,
  oshaCompliance: OSHACompliance
): string[] {
  const recommendations: string[] = []

  // Add OSHA required actions first (highest priority)
  if (oshaCompliance.required_actions.length > 0) {
    recommendations.push(...oshaCompliance.required_actions.slice(0, 3))
  }

  if (impact.severity === 'severe') {
    recommendations.push('Consider postponing weather-sensitive activities')
    recommendations.push('Ensure all safety protocols for adverse weather are in place')
  }

  // Cold weather specific
  if (weather.temperature < 40) {
    recommendations.push('Implement cold weather concrete curing procedures')
    recommendations.push('Provide warming areas for workers')
  }
  if (weather.temperature < 32) {
    recommendations.push('Check for ice on walking/working surfaces')
    recommendations.push('Protect water lines and wet equipment from freezing')
  }

  // Hot weather specific (expanded OSHA guidance)
  if (weather.temperature > 85) {
    recommendations.push('Ensure adequate water (1 quart/hour/worker) is available')
  }
  if (weather.temperature > 90) {
    recommendations.push('Schedule strenuous work for cooler morning hours')
    recommendations.push('Provide shaded rest areas')
  }
  if (weather.temperature > 100) {
    recommendations.push('Consider early start (5-6 AM) to maximize cooler hours')
    recommendations.push('Mandatory 15-minute rest breaks in shade every hour')
  }

  // Wind specific
  if (weather.windSpeed > 15) {
    recommendations.push('Use caution with sheet materials (plywood, drywall, panels)')
  }
  if (weather.windSpeed > 20) {
    recommendations.push('Secure loose materials and equipment')
    recommendations.push('Review crane load charts for wind restrictions')
  }
  if (weather.windSpeed > 25) {
    recommendations.push('Suspend crane operations')
    recommendations.push('Suspend scaffold work and elevated activities')
  }

  // Rain/precipitation
  if (weather.conditions.toLowerCase().includes('rain')) {
    recommendations.push('Cover exposed materials and excavations')
    recommendations.push('Monitor drainage and dewatering systems')
    recommendations.push('No exterior painting, roofing, or waterproofing')
  }

  // Thunderstorm/lightning (OSHA critical)
  if (weather.conditions.toLowerCase().includes('thunderstorm') ||
      weather.conditions.toLowerCase().includes('lightning')) {
    recommendations.push('CRITICAL: Implement lightning safety protocol immediately')
    recommendations.push(`Evacuate: ${LIGHTNING_SAFETY.evacuationPriority.slice(0, 2).join(', ')}`)
    recommendations.push(`Wait ${LIGHTNING_SAFETY.waitAfterLastThunder} minutes after last thunder before resuming`)
  }

  // Humidity specific (for painting)
  if (weather.humidity > 85) {
    recommendations.push('Suspend exterior painting - humidity too high for proper cure')
  }

  // UV/sun exposure (summer)
  if (weather.temperature > 80 && !weather.conditions.toLowerCase().includes('cloud')) {
    recommendations.push('Ensure workers have access to sunscreen and shade')
  }

  // Default recommendation if conditions are good
  if (recommendations.length === 0) {
    recommendations.push('Weather conditions favorable for all scheduled activities')
  }

  return Array.from(new Set(recommendations)) // Remove duplicates
}

export const autoPopulateWeatherTool = createTool<AutoPopulateWeatherInput, AutoPopulateWeatherOutput>({
  name: 'auto_populate_weather',
  displayName: 'Auto-Populate Weather',
  description: 'Automatically fetches and formats weather data for daily reports based on project location. Includes work impact analysis and recommendations for weather-sensitive activities.',
  category: 'report',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to fetch weather for'
      },
      date: {
        type: 'string',
        description: 'Date for the weather data (ISO format, e.g., 2024-01-15)'
      },
      include_forecast: {
        type: 'boolean',
        description: 'Include tomorrow\'s forecast for planning (default: true)'
      }
    },
    required: ['project_id', 'date']
  },
  requiresConfirmation: false,
  estimatedTokens: 500,

  async execute(input, context) {
    const { project_id, date, include_forecast = true } = input

    // Fetch weather data for the project
    const weather = await getWeatherForProject(project_id)

    if (!weather) {
      return {
        success: false,
        error: 'Unable to fetch weather data for project location',
        errorCode: 'WEATHER_FETCH_FAILED'
      }
    }

    // Analyze weather impact with OSHA compliance
    const impact = analyzeWeatherImpact(weather)
    const affectedActivities = determineAffectedActivities(weather)
    const oshaCompliance = generateOSHACompliance(weather)
    const recommendations = generateWeatherRecommendations(weather, impact, oshaCompliance)

    // Check for lightning risk
    const hasLightningRisk = weather.conditions.toLowerCase().includes('thunderstorm') ||
                             weather.conditions.toLowerCase().includes('lightning')

    // Build work impact object with OSHA compliance
    const workImpact: WorkImpact = {
      severity: impact.severity,
      affected_activities: affectedActivities,
      recommendations,
      osha_compliance: oshaCompliance,
      lightning_risk: hasLightningRisk,
      lightning_distance_miles: hasLightningRisk ? 6 : undefined, // Default to warning distance
    }

    // Build weather data output
    const weatherData = {
      date,
      conditions: weather.conditions,
      temperature_high: weather.temperature, // Current temp as high (would need forecast for actual high/low)
      temperature_low: Math.round(weather.temperature - 10), // Estimate
      humidity: weather.humidity,
      wind_speed: weather.windSpeed,
      wind_direction: weather.windDirection,
      precipitation: weather.precipitation,
      precipitation_type: weather.conditions.toLowerCase().includes('snow') ? 'snow' :
        weather.conditions.toLowerCase().includes('rain') ? 'rain' : undefined
    }

    // Build response
    const result: AutoPopulateWeatherOutput = {
      weather_data: weatherData,
      work_impact: workImpact
    }

    // Add forecast if requested
    if (include_forecast) {
      // For now, use current weather as a proxy for tomorrow
      // In production, would call a forecast endpoint
      result.tomorrow_forecast = {
        conditions: weather.conditions,
        temperature_high: weather.temperature,
        precipitation_chance: weather.precipitation > 0 ? 60 : 20,
        work_impact_prediction: impact.severity === 'none'
          ? 'Conditions expected to remain favorable'
          : `${impact.severity.charAt(0).toUpperCase() + impact.severity.slice(1)} impacts may continue`
      }
    }

    return {
      success: true,
      data: result,
      metadata: {
        executionTimeMs: 0 // Would be set by orchestrator
      }
    }
  },

  formatOutput(output) {
    const { weather_data, work_impact } = output
    const oshaStatus = work_impact.osha_compliance.heat_risk_level !== 'Low' ||
                       work_impact.osha_compliance.cold_risk_level !== 'Low'
      ? 'warning' : 'success'

    return {
      title: 'Weather Data Retrieved',
      summary: `${weather_data.conditions}, ${weather_data.temperature_high}°F - Impact: ${work_impact.severity}${oshaStatus === 'warning' ? ' (OSHA Alert)' : ''}`,
      icon: work_impact.lightning_risk ? 'zap' :
        work_impact.severity === 'severe' ? 'cloud-lightning' :
        work_impact.severity === 'moderate' ? 'cloud-rain' :
          work_impact.severity === 'minor' ? 'cloud' : 'sun',
      status: work_impact.lightning_risk ? 'error' :
        work_impact.severity === 'severe' ? 'warning' :
        work_impact.severity === 'moderate' ? 'warning' : 'success',
      details: [
        { label: 'Conditions', value: weather_data.conditions, type: 'text' as const },
        { label: 'Temperature', value: `${weather_data.temperature_high}°F`, type: 'text' as const },
        { label: 'Heat Index', value: work_impact.osha_compliance.heat_index ? `${work_impact.osha_compliance.heat_index}°F` : 'N/A', type: 'text' as const },
        { label: 'Wind', value: `${weather_data.wind_speed} mph ${weather_data.wind_direction}`, type: 'text' as const },
        { label: 'Wind Chill', value: work_impact.osha_compliance.wind_chill ? `${work_impact.osha_compliance.wind_chill}°F` : 'N/A', type: 'text' as const },
        { label: 'Humidity', value: `${weather_data.humidity}%`, type: 'text' as const },
        { label: 'Work Impact', value: work_impact.severity, type: 'badge' as const },
        { label: 'Heat Risk', value: work_impact.osha_compliance.heat_risk_level, type: 'badge' as const },
        { label: 'Cold Risk', value: work_impact.osha_compliance.cold_risk_level || 'Low', type: 'badge' as const },
        ...(work_impact.lightning_risk ? [{ label: 'Lightning', value: 'ACTIVE RISK', type: 'badge' as const }] : [])
      ],
      expandedContent: {
        affected_activities: work_impact.affected_activities,
        recommendations: work_impact.recommendations,
        osha_required_actions: work_impact.osha_compliance.required_actions
      }
    }
  }
})
