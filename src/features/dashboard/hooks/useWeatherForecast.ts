/**
 * Weather Forecast Hook
 * Fetches weather data for project locations using Open-Meteo API (free, no API key required)
 * Includes construction-relevant weather alerts
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'

// ============================================================================
// Types
// ============================================================================

export interface CurrentWeather {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  windDirection: number
  weatherCode: number
  condition: string
  icon: WeatherIcon
  precipitation: number
  uvIndex: number
  visibility: number
}

export interface DailyForecast {
  date: Date
  dayName: string
  high: number
  low: number
  weatherCode: number
  condition: string
  icon: WeatherIcon
  precipitationProbability: number
  windSpeedMax: number
  sunrise: string
  sunset: string
}

export interface ConstructionAlert {
  id: string
  type: 'wind' | 'rain' | 'heat' | 'cold' | 'lightning' | 'snow' | 'ice'
  severity: 'advisory' | 'warning' | 'danger'
  title: string
  description: string
  validFrom: Date
  validTo: Date
}

export interface WeatherData {
  current: CurrentWeather
  forecast: DailyForecast[]
  alerts: ConstructionAlert[]
  location: {
    name: string
    latitude: number
    longitude: number
  }
  lastUpdated: Date
}

export type WeatherIcon =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'rain'
  | 'showers'
  | 'thunderstorm'
  | 'snow'
  | 'fog'
  | 'wind'
  | 'unknown'

// ============================================================================
// Weather Code Mapping (WMO Weather interpretation codes)
// ============================================================================

function getWeatherCondition(code: number): { condition: string; icon: WeatherIcon } {
  const conditions: Record<number, { condition: string; icon: WeatherIcon }> = {
    0: { condition: 'Clear sky', icon: 'clear-day' },
    1: { condition: 'Mainly clear', icon: 'clear-day' },
    2: { condition: 'Partly cloudy', icon: 'partly-cloudy-day' },
    3: { condition: 'Overcast', icon: 'cloudy' },
    45: { condition: 'Foggy', icon: 'fog' },
    48: { condition: 'Depositing rime fog', icon: 'fog' },
    51: { condition: 'Light drizzle', icon: 'showers' },
    53: { condition: 'Moderate drizzle', icon: 'showers' },
    55: { condition: 'Dense drizzle', icon: 'showers' },
    56: { condition: 'Freezing drizzle', icon: 'showers' },
    57: { condition: 'Dense freezing drizzle', icon: 'showers' },
    61: { condition: 'Slight rain', icon: 'rain' },
    63: { condition: 'Moderate rain', icon: 'rain' },
    65: { condition: 'Heavy rain', icon: 'rain' },
    66: { condition: 'Freezing rain', icon: 'rain' },
    67: { condition: 'Heavy freezing rain', icon: 'rain' },
    71: { condition: 'Slight snow', icon: 'snow' },
    73: { condition: 'Moderate snow', icon: 'snow' },
    75: { condition: 'Heavy snow', icon: 'snow' },
    77: { condition: 'Snow grains', icon: 'snow' },
    80: { condition: 'Slight rain showers', icon: 'showers' },
    81: { condition: 'Moderate rain showers', icon: 'showers' },
    82: { condition: 'Violent rain showers', icon: 'rain' },
    85: { condition: 'Slight snow showers', icon: 'snow' },
    86: { condition: 'Heavy snow showers', icon: 'snow' },
    95: { condition: 'Thunderstorm', icon: 'thunderstorm' },
    96: { condition: 'Thunderstorm with slight hail', icon: 'thunderstorm' },
    99: { condition: 'Thunderstorm with heavy hail', icon: 'thunderstorm' },
  }

  return conditions[code] || { condition: 'Unknown', icon: 'unknown' }
}

function getDayName(date: Date, index: number): string {
  if (index === 0) return 'Today'
  if (index === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

// ============================================================================
// Construction-Specific Alert Generation
// ============================================================================

function generateConstructionAlerts(
  current: CurrentWeather,
  forecast: DailyForecast[]
): ConstructionAlert[] {
  const alerts: ConstructionAlert[] = []
  const now = new Date()
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  // High wind alert (>25 mph dangerous for crane operations, scaffolding)
  if (current.windSpeed > 25) {
    alerts.push({
      id: 'wind-current',
      type: 'wind',
      severity: current.windSpeed > 40 ? 'danger' : 'warning',
      title: 'High Wind Advisory',
      description: `Current winds at ${Math.round(current.windSpeed)} mph. Suspend crane operations and secure loose materials.`,
      validFrom: now,
      validTo: endOfDay,
    })
  }

  // Extreme heat alert (>95F OSHA heat illness prevention)
  if (current.temperature > 95) {
    alerts.push({
      id: 'heat-current',
      type: 'heat',
      severity: current.temperature > 105 ? 'danger' : 'warning',
      title: 'Extreme Heat Warning',
      description: `Temperature at ${Math.round(current.temperature)}F. Implement OSHA heat illness prevention measures.`,
      validFrom: now,
      validTo: endOfDay,
    })
  }

  // Extreme cold alert (<32F affects concrete curing, worker safety)
  if (current.temperature < 32) {
    alerts.push({
      id: 'cold-current',
      type: 'cold',
      severity: current.temperature < 20 ? 'danger' : 'warning',
      title: 'Freezing Conditions',
      description: `Temperature at ${Math.round(current.temperature)}F. Protect concrete and water lines. Monitor for ice.`,
      validFrom: now,
      validTo: endOfDay,
    })
  }

  // Thunderstorm/Lightning alert
  if (current.weatherCode >= 95) {
    alerts.push({
      id: 'lightning-current',
      type: 'lightning',
      severity: 'danger',
      title: 'Lightning Risk',
      description: 'Thunderstorms present. Evacuate outdoor work areas and cranes immediately.',
      validFrom: now,
      validTo: endOfDay,
    })
  }

  // Heavy rain alert (affects earthwork, concrete placement)
  if (current.precipitation > 0.5) {
    alerts.push({
      id: 'rain-current',
      type: 'rain',
      severity: current.precipitation > 1 ? 'warning' : 'advisory',
      title: 'Heavy Rain Advisory',
      description: 'Heavy precipitation may delay concrete pours and earthwork. Monitor site drainage.',
      validFrom: now,
      validTo: endOfDay,
    })
  }

  // Check forecast for upcoming concerns
  forecast.slice(1, 4).forEach((day, index) => {
    if (day.windSpeedMax > 30) {
      alerts.push({
        id: `wind-forecast-${index}`,
        type: 'wind',
        severity: 'advisory',
        title: `High Winds Expected - ${day.dayName}`,
        description: `Winds up to ${Math.round(day.windSpeedMax)} mph expected. Plan accordingly.`,
        validFrom: day.date,
        validTo: day.date,
      })
    }

    if (day.precipitationProbability > 70 && [61, 63, 65, 80, 81, 82].includes(day.weatherCode)) {
      alerts.push({
        id: `rain-forecast-${index}`,
        type: 'rain',
        severity: 'advisory',
        title: `Rain Expected - ${day.dayName}`,
        description: `${day.precipitationProbability}% chance of rain. Consider rescheduling outdoor work.`,
        validFrom: day.date,
        validTo: day.date,
      })
    }
  })

  return alerts
}

// ============================================================================
// Main Hook
// ============================================================================

export function useWeatherForecast(
  latitude?: number,
  longitude?: number,
  locationName?: string
) {
  // Default to New York City if no coordinates provided
  const lat = latitude ?? 40.7128
  const lon = longitude ?? -74.006
  const name = locationName ?? 'New York, NY'

  return useQuery({
    queryKey: ['weather-forecast', lat, lon],
    queryFn: async (): Promise<WeatherData> => {
      // Fetch from Open-Meteo API (free, no API key required)
      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.searchParams.set('latitude', lat.toString())
      url.searchParams.set('longitude', lon.toString())
      url.searchParams.set('current', [
        'temperature_2m',
        'relative_humidity_2m',
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'uv_index',
      ].join(','))
      url.searchParams.set('daily', [
        'weather_code',
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'sunrise',
        'sunset',
      ].join(','))
      url.searchParams.set('temperature_unit', 'fahrenheit')
      url.searchParams.set('wind_speed_unit', 'mph')
      url.searchParams.set('precipitation_unit', 'inch')
      url.searchParams.set('timezone', 'auto')
      url.searchParams.set('forecast_days', '7')

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }

      const data = await response.json()

      // Parse current weather
      const weatherInfo = getWeatherCondition(data.current.weather_code)
      const current: CurrentWeather = {
        temperature: data.current.temperature_2m,
        feelsLike: data.current.apparent_temperature,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        weatherCode: data.current.weather_code,
        condition: weatherInfo.condition,
        icon: weatherInfo.icon,
        precipitation: data.current.precipitation,
        uvIndex: data.current.uv_index || 0,
        visibility: 10, // Not available from Open-Meteo, using default
      }

      // Parse daily forecast
      const forecast: DailyForecast[] = data.daily.time.slice(0, 5).map((dateStr: string, index: number) => {
        const date = new Date(dateStr)
        const dayWeather = getWeatherCondition(data.daily.weather_code[index])

        return {
          date,
          dayName: getDayName(date, index),
          high: data.daily.temperature_2m_max[index],
          low: data.daily.temperature_2m_min[index],
          weatherCode: data.daily.weather_code[index],
          condition: dayWeather.condition,
          icon: dayWeather.icon,
          precipitationProbability: data.daily.precipitation_probability_max[index] || 0,
          windSpeedMax: data.daily.wind_speed_10m_max[index],
          sunrise: data.daily.sunrise[index],
          sunset: data.daily.sunset[index],
        }
      })

      // Generate construction-specific alerts
      const alerts = generateConstructionAlerts(current, forecast)

      return {
        current,
        forecast,
        alerts,
        location: {
          name,
          latitude: lat,
          longitude: lon,
        },
        lastUpdated: new Date(),
      }
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 30, // Refetch every 30 minutes
    retry: 2,
  })
}

/**
 * Hook to get weather for a specific project location
 */
export function useProjectWeather(projectId?: string) {
  const { userProfile } = useAuth()

  // For now, return default location
  // In a real implementation, this would fetch the project's location from the database
  return useWeatherForecast()
}

export default useWeatherForecast
