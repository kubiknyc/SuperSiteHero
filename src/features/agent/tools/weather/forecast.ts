/**
 * Weather Forecast Tool
 * Gets weather forecast for project location to help with scheduling
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface WeatherForecastInput {
  project_id?: string
  location?: string
  days?: number
}

interface DayForecast {
  date: string
  day_name: string
  high_temp: number
  low_temp: number
  condition: string
  precipitation_chance: number
  wind_speed: number
  work_impact: 'none' | 'minor' | 'moderate' | 'severe'
  recommendations: string[]
}

interface WeatherForecastOutput {
  location: string
  forecast: DayForecast[]
  weekly_summary: {
    good_work_days: number
    weather_delay_risk_days: number
    total_precipitation_chance: number
  }
  alerts: string[]
  scheduling_recommendations: string[]
}

export const weatherForecastTool = createTool<WeatherForecastInput, WeatherForecastOutput>({
  name: 'get_weather_forecast',
  description: 'Gets weather forecast for a project location to help with construction scheduling. Identifies potential weather delays and provides work impact analysis.',
  category: 'weather',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'Project ID to get location from'
      },
      location: {
        type: 'string',
        description: 'Location string (city, state or zip code) if not using project'
      },
      days: {
        type: 'number',
        description: 'Number of days to forecast (1-7, default: 5)'
      }
    },
    required: []
  },

  async execute(input: WeatherForecastInput, context: AgentContext): Promise<WeatherForecastOutput> {
    const { project_id, location: inputLocation, days = 5 } = input
    const forecastDays = Math.min(7, Math.max(1, days))

    let location = inputLocation

    // Get project location if project_id provided
    if (project_id && !location) {
      const { data: project } = await supabase
        .from('projects')
        .select('name, address, city, state, zip_code')
        .eq('id', project_id)
        .single()

      if (project) {
        location = project.city && project.state
          ? `${project.city}, ${project.state}`
          : project.zip_code || project.address || 'New York, NY'
      }
    }

    location = location || 'New York, NY'

    // In a real implementation, this would call a weather API like OpenWeatherMap
    // For now, generate realistic mock data
    const forecast = generateMockForecast(forecastDays, location)

    // Calculate weekly summary
    const goodDays = forecast.filter(d => d.work_impact === 'none' || d.work_impact === 'minor').length
    const delayRiskDays = forecast.filter(d => d.work_impact === 'moderate' || d.work_impact === 'severe').length
    const avgPrecipChance = forecast.reduce((sum, d) => sum + d.precipitation_chance, 0) / forecast.length

    // Generate alerts
    const alerts: string[] = []
    const severeDay = forecast.find(d => d.work_impact === 'severe')
    if (severeDay) {
      alerts.push(`Severe weather expected on ${severeDay.day_name} - consider rescheduling outdoor work`)
    }

    const highWindDays = forecast.filter(d => d.wind_speed > 25)
    if (highWindDays.length > 0) {
      alerts.push(`High winds (>25 mph) expected on ${highWindDays.length} day(s) - crane operations may be affected`)
    }

    const freezingDays = forecast.filter(d => d.low_temp < 32)
    if (freezingDays.length > 0) {
      alerts.push(`Freezing temperatures expected - protect concrete and masonry work`)
    }

    const hotDays = forecast.filter(d => d.high_temp > 95)
    if (hotDays.length > 0) {
      alerts.push(`Extreme heat expected - ensure adequate hydration and rest breaks for crews`)
    }

    // Generate scheduling recommendations
    const recommendations: string[] = []

    if (goodDays >= 3) {
      recommendations.push(`${goodDays} favorable work days in forecast - good window for exterior work`)
    }

    const concreteDays = forecast.filter(d =>
      d.precipitation_chance < 30 &&
      d.high_temp > 40 &&
      d.high_temp < 90
    )
    if (concreteDays.length > 0) {
      recommendations.push(`Best concrete pour days: ${concreteDays.map(d => d.day_name).join(', ')}`)
    }

    const roofingDays = forecast.filter(d =>
      d.precipitation_chance < 20 &&
      d.wind_speed < 20 &&
      d.high_temp > 45
    )
    if (roofingDays.length > 0) {
      recommendations.push(`Good roofing conditions: ${roofingDays.map(d => d.day_name).join(', ')}`)
    }

    if (delayRiskDays > 2) {
      recommendations.push('Consider front-loading critical path activities this week')
    }

    return {
      location,
      forecast,
      weekly_summary: {
        good_work_days: goodDays,
        weather_delay_risk_days: delayRiskDays,
        total_precipitation_chance: Math.round(avgPrecipChance)
      },
      alerts,
      scheduling_recommendations: recommendations
    }
  }
})

function generateMockForecast(days: number, location: string): DayForecast[] {
  const forecast: DayForecast[] = []
  const today = new Date()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Determine base temperature based on location hints
  let baseTemp = 65
  if (/florida|miami|tampa|phoenix|arizona|texas|houston|dallas/i.test(location)) {
    baseTemp = 85
  } else if (/minnesota|michigan|wisconsin|montana|alaska/i.test(location)) {
    baseTemp = 45
  } else if (/california|los angeles|san diego/i.test(location)) {
    baseTemp = 72
  }

  // Adjust for season
  const month = today.getMonth()
  if (month >= 5 && month <= 8) {baseTemp += 15} // Summer
  else if (month >= 11 || month <= 2) {baseTemp -= 20} // Winter

  for (let i = 0; i < days; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)

    // Generate realistic weather variation
    const tempVariance = Math.random() * 15 - 7
    const highTemp = Math.round(baseTemp + tempVariance + 10)
    const lowTemp = Math.round(baseTemp + tempVariance - 10)

    // Random weather conditions
    const precipChance = Math.round(Math.random() * 60)
    const windSpeed = Math.round(Math.random() * 20 + 5)

    let condition = 'Sunny'
    if (precipChance > 50) {condition = 'Rain'}
    else if (precipChance > 30) {condition = 'Partly Cloudy'}
    else if (precipChance > 15) {condition = 'Cloudy'}

    if (highTemp < 32 && precipChance > 30) {condition = 'Snow'}

    // Determine work impact
    let workImpact: 'none' | 'minor' | 'moderate' | 'severe' = 'none'
    const recommendations: string[] = []

    if (precipChance > 60 || condition === 'Rain' || condition === 'Snow') {
      workImpact = precipChance > 80 ? 'severe' : 'moderate'
      recommendations.push('Delay exterior painting and coating')
      recommendations.push('Cover exposed materials')
    }

    if (windSpeed > 30) {
      workImpact = 'severe'
      recommendations.push('Suspend crane operations')
      recommendations.push('Secure loose materials')
    } else if (windSpeed > 20) {
      if (workImpact !== 'severe') {workImpact = 'moderate'}
      recommendations.push('Monitor crane operations')
    }

    if (highTemp > 95) {
      if (workImpact === 'none') {workImpact = 'minor'}
      recommendations.push('Schedule heavy work for early morning')
      recommendations.push('Enforce hydration breaks')
    }

    if (lowTemp < 32) {
      if (workImpact === 'none') {workImpact = 'minor'}
      recommendations.push('Protect fresh concrete from freezing')
      recommendations.push('Heat enclosures for masonry work')
    }

    if (recommendations.length === 0) {
      recommendations.push('Good conditions for all work')
    }

    forecast.push({
      date: date.toISOString().split('T')[0],
      day_name: dayNames[date.getDay()],
      high_temp: highTemp,
      low_temp: lowTemp,
      condition,
      precipitation_chance: precipChance,
      wind_speed: windSpeed,
      work_impact: workImpact,
      recommendations
    })
  }

  return forecast
}
