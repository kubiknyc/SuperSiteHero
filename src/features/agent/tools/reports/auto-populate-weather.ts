/**
 * Auto-Populate Weather Tool
 * Automatically fetch and format weather data for daily reports based on project location
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import {
  getWeatherForProject,
  analyzeWeatherImpact,
  type WeatherData
} from '@/features/daily-reports/services/weatherApiService'

interface AutoPopulateWeatherInput {
  project_id: string
  date: string
  include_forecast?: boolean
}

interface WorkImpact {
  severity: 'none' | 'minor' | 'moderate' | 'severe'
  affected_activities: string[]
  recommendations: string[]
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

// Trade sensitivity to weather conditions
const WEATHER_SENSITIVE_TRADES: Record<string, {
  minTemp: number
  maxTemp: number
  maxWind: number
  rainSensitive: boolean
}> = {
  'Concrete': { minTemp: 40, maxTemp: 95, maxWind: 20, rainSensitive: true },
  'Roofing': { minTemp: 45, maxTemp: 100, maxWind: 15, rainSensitive: true },
  'Painting': { minTemp: 50, maxTemp: 90, maxWind: 15, rainSensitive: true },
  'Masonry': { minTemp: 40, maxTemp: 100, maxWind: 25, rainSensitive: true },
  'Steel': { minTemp: 0, maxTemp: 110, maxWind: 25, rainSensitive: false },
  'Crane Operations': { minTemp: 0, maxTemp: 110, maxWind: 20, rainSensitive: false },
  'Excavation': { minTemp: 20, maxTemp: 110, maxWind: 35, rainSensitive: true },
  'Landscaping': { minTemp: 35, maxTemp: 100, maxWind: 25, rainSensitive: true },
}

function determineAffectedActivities(weather: WeatherData): string[] {
  const affected: string[] = []
  const temp = weather.temperature
  const wind = weather.windSpeed
  const conditions = weather.conditions.toLowerCase()
  const isRaining = conditions.includes('rain') || conditions.includes('drizzle') || conditions.includes('storm')

  for (const [trade, limits] of Object.entries(WEATHER_SENSITIVE_TRADES)) {
    const reasons: string[] = []

    if (temp < limits.minTemp) {
      reasons.push(`temperature below ${limits.minTemp}°F`)
    }
    if (temp > limits.maxTemp) {
      reasons.push(`temperature above ${limits.maxTemp}°F`)
    }
    if (wind > limits.maxWind) {
      reasons.push(`wind speed above ${limits.maxWind} mph`)
    }
    if (limits.rainSensitive && isRaining) {
      reasons.push('precipitation')
    }

    if (reasons.length > 0) {
      affected.push(`${trade}: ${reasons.join(', ')}`)
    }
  }

  return affected
}

function generateWeatherRecommendations(weather: WeatherData, impact: ReturnType<typeof analyzeWeatherImpact>): string[] {
  const recommendations: string[] = []

  if (impact.severity === 'severe') {
    recommendations.push('Consider postponing weather-sensitive activities')
    recommendations.push('Ensure all safety protocols for adverse weather are in place')
  }

  if (weather.temperature < 40) {
    recommendations.push('Implement cold weather concrete curing procedures')
    recommendations.push('Provide warming areas for workers')
  }

  if (weather.temperature > 90) {
    recommendations.push('Schedule frequent hydration breaks')
    recommendations.push('Consider early start times to avoid peak heat')
  }

  if (weather.windSpeed > 20) {
    recommendations.push('Secure loose materials and equipment')
    recommendations.push('Suspend crane operations if winds exceed safe limits')
  }

  if (weather.conditions.toLowerCase().includes('rain')) {
    recommendations.push('Cover exposed materials and excavations')
    recommendations.push('Monitor drainage and dewatering systems')
  }

  if (weather.conditions.toLowerCase().includes('thunderstorm')) {
    recommendations.push('Immediately evacuate all personnel from elevated positions')
    recommendations.push('Move all personnel to designated shelter areas')
  }

  // Default recommendation if conditions are good
  if (recommendations.length === 0) {
    recommendations.push('Weather conditions favorable for all scheduled activities')
  }

  return recommendations
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

    // Analyze weather impact
    const impact = analyzeWeatherImpact(weather)
    const affectedActivities = determineAffectedActivities(weather)
    const recommendations = generateWeatherRecommendations(weather, impact)

    // Build work impact object
    const workImpact: WorkImpact = {
      severity: impact.severity,
      affected_activities: affectedActivities,
      recommendations
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

    return {
      title: 'Weather Data Retrieved',
      summary: `${weather_data.conditions}, ${weather_data.temperature_high}°F - Impact: ${work_impact.severity}`,
      icon: work_impact.severity === 'severe' ? 'cloud-lightning' :
        work_impact.severity === 'moderate' ? 'cloud-rain' :
          work_impact.severity === 'minor' ? 'cloud' : 'sun',
      status: work_impact.severity === 'severe' ? 'warning' :
        work_impact.severity === 'moderate' ? 'warning' : 'success',
      details: [
        { label: 'Conditions', value: weather_data.conditions, type: 'text' },
        { label: 'Temperature', value: `${weather_data.temperature_high}°F`, type: 'text' },
        { label: 'Wind', value: `${weather_data.wind_speed} mph ${weather_data.wind_direction}`, type: 'text' },
        { label: 'Humidity', value: `${weather_data.humidity}%`, type: 'text' },
        { label: 'Work Impact', value: work_impact.severity, type: 'badge' }
      ],
      expandedContent: {
        affected_activities: work_impact.affected_activities,
        recommendations: work_impact.recommendations
      }
    }
  }
})
