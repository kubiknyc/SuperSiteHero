/**
 * Weather Types
 * Types for weather data and API responses
 */

/**
 * Weather condition codes (WMO Weather interpretation codes)
 */
export type WeatherCode =
  | 0  // Clear sky
  | 1 | 2 | 3  // Mainly clear, partly cloudy, overcast
  | 45 | 48  // Fog
  | 51 | 53 | 55  // Drizzle
  | 56 | 57  // Freezing drizzle
  | 61 | 63 | 65  // Rain
  | 66 | 67  // Freezing rain
  | 71 | 73 | 75 | 77  // Snow
  | 80 | 81 | 82  // Rain showers
  | 85 | 86  // Snow showers
  | 95 | 96 | 99  // Thunderstorm

/**
 * Weather condition label mapping
 */
export const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}

/**
 * Weather icons based on condition code
 */
export const WEATHER_CODE_ICONS: Record<number, string> = {
  0: 'sun',
  1: 'sun',
  2: 'cloud-sun',
  3: 'cloud',
  45: 'cloud-fog',
  48: 'cloud-fog',
  51: 'cloud-drizzle',
  53: 'cloud-drizzle',
  55: 'cloud-drizzle',
  56: 'snowflake',
  57: 'snowflake',
  61: 'cloud-rain',
  63: 'cloud-rain',
  65: 'cloud-rain-heavy',
  66: 'cloud-rain',
  67: 'cloud-rain-heavy',
  71: 'cloud-snow',
  73: 'cloud-snow',
  75: 'cloud-snow',
  77: 'snowflake',
  80: 'cloud-sun-rain',
  81: 'cloud-rain',
  82: 'cloud-rain-heavy',
  85: 'cloud-snow',
  86: 'cloud-snow',
  95: 'cloud-lightning',
  96: 'cloud-lightning',
  99: 'cloud-lightning',
}

/**
 * Weather history record from database
 */
export interface WeatherHistory {
  id: string
  project_id: string
  company_id: string
  weather_date: string
  latitude: number
  longitude: number
  weather_condition: string | null
  weather_code: number | null
  temperature_high: number | null
  temperature_low: number | null
  temperature_avg: number | null
  precipitation: number | null
  precipitation_probability: number | null
  snow_depth: number | null
  wind_speed_max: number | null
  wind_speed_avg: number | null
  wind_direction: number | null
  humidity_percent: number | null
  uv_index_max: number | null
  visibility: number | null
  sunrise: string | null
  sunset: string | null
  daylight_hours: number | null
  source: string
  fetched_at: string
  raw_response: Record<string, unknown> | null
  created_at: string
}

/**
 * Weather data for display
 */
export interface WeatherData {
  date: string
  condition: string
  conditionCode: number | null
  icon: string
  temperatureHigh: number | null
  temperatureLow: number | null
  temperatureAvg: number | null
  precipitation: number | null
  precipitationProbability: number | null
  windSpeed: number | null
  humidity: number | null
  uvIndex: number | null
  sunrise: string | null
  sunset: string | null
}

/**
 * Weather API response from Open-Meteo
 */
export interface OpenMeteoResponse {
  latitude: number
  longitude: number
  generationtime_ms: number
  utc_offset_seconds: number
  timezone: string
  timezone_abbreviation: string
  elevation: number
  daily_units?: {
    time: string
    weather_code: string
    temperature_2m_max: string
    temperature_2m_min: string
    precipitation_sum: string
    wind_speed_10m_max: string
    relative_humidity_2m_mean?: string
    uv_index_max?: string
    sunrise?: string
    sunset?: string
  }
  daily?: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    wind_speed_10m_max: number[]
    relative_humidity_2m_mean?: number[]
    uv_index_max?: number[]
    sunrise?: string[]
    sunset?: string[]
  }
  hourly_units?: {
    time: string
    temperature_2m: string
    relative_humidity_2m: string
    weather_code: string
    wind_speed_10m: string
  }
  hourly?: {
    time: string[]
    temperature_2m: number[]
    relative_humidity_2m: number[]
    weather_code: number[]
    wind_speed_10m: number[]
  }
}

/**
 * Weather fetch parameters
 */
export interface WeatherFetchParams {
  latitude: number
  longitude: number
  date?: string
  startDate?: string
  endDate?: string
  timezone?: string
}

/**
 * Save weather data DTO
 */
export interface SaveWeatherDataDTO {
  project_id: string
  company_id: string
  weather_date: string
  latitude: number
  longitude: number
  weather_code: number | null
  temperature_high: number | null
  temperature_low: number | null
  precipitation: number | null
  wind_speed_max: number | null
  humidity_percent: number | null
  raw_response?: Record<string, unknown>
}

/**
 * Get weather condition label from code
 */
export function getWeatherLabel(code: number | null | undefined): string {
  if (code == null) {return 'Unknown'}
  return WEATHER_CODE_LABELS[code] || 'Unknown'
}

/**
 * Get weather icon name from code
 */
export function getWeatherIcon(code: number | null | undefined): string {
  if (code == null) {return 'cloud'}
  return WEATHER_CODE_ICONS[code] || 'cloud'
}

/**
 * Format temperature with unit
 */
export function formatTemperature(temp: number | null | undefined, unit: 'F' | 'C' = 'F'): string {
  if (temp == null) {return '--'}
  return `${Math.round(temp)}°${unit}`
}

/**
 * Format precipitation with unit
 */
export function formatPrecipitation(inches: number | null | undefined): string {
  if (inches == null) {return '--'}
  if (inches === 0) {return '0"'}
  if (inches < 0.1) {return '<0.1"'}
  return `${inches.toFixed(1)}"`
}

/**
 * Format wind speed with unit
 */
export function formatWindSpeed(mph: number | null | undefined): string {
  if (mph == null) {return '--'}
  return `${Math.round(mph)} mph`
}

/**
 * Format humidity percentage
 */
export function formatHumidity(percent: number | null | undefined): string {
  if (percent == null) {return '--'}
  return `${Math.round(percent)}%`
}

/**
 * Check if weather conditions are suitable for work
 */
export function isWorkableWeather(weather: WeatherData): {
  workable: boolean
  reason: string | null
} {
  // Check for severe conditions
  if (weather.conditionCode != null) {
    // Thunderstorm
    if (weather.conditionCode >= 95) {
      return { workable: false, reason: 'Thunderstorm conditions' }
    }
    // Heavy rain
    if (weather.conditionCode === 65 || weather.conditionCode === 82) {
      return { workable: false, reason: 'Heavy rain' }
    }
    // Heavy snow
    if (weather.conditionCode === 75 || weather.conditionCode === 86) {
      return { workable: false, reason: 'Heavy snow' }
    }
    // Freezing conditions
    if (weather.conditionCode >= 56 && weather.conditionCode <= 57) {
      return { workable: false, reason: 'Freezing conditions' }
    }
    if (weather.conditionCode >= 66 && weather.conditionCode <= 67) {
      return { workable: false, reason: 'Freezing rain' }
    }
  }

  // Check temperature (below freezing or extreme heat)
  if (weather.temperatureLow != null && weather.temperatureLow < 32) {
    return { workable: false, reason: 'Below freezing temperatures' }
  }
  if (weather.temperatureHigh != null && weather.temperatureHigh > 105) {
    return { workable: false, reason: 'Extreme heat' }
  }

  // Check wind speed (dangerous for crane operations > 25 mph typically)
  if (weather.windSpeed != null && weather.windSpeed > 35) {
    return { workable: false, reason: 'High wind speeds' }
  }

  return { workable: true, reason: null }
}

/**
 * Transform Open-Meteo response to WeatherData
 */
export function transformOpenMeteoResponse(
  response: OpenMeteoResponse,
  dateIndex: number = 0
): WeatherData | null {
  if (!response.daily || !response.daily.time[dateIndex]) {
    return null
  }

  const code = response.daily.weather_code[dateIndex]

  return {
    date: response.daily.time[dateIndex],
    condition: getWeatherLabel(code),
    conditionCode: code,
    icon: getWeatherIcon(code),
    temperatureHigh: celsiusToFahrenheit(response.daily.temperature_2m_max[dateIndex]),
    temperatureLow: celsiusToFahrenheit(response.daily.temperature_2m_min[dateIndex]),
    temperatureAvg: celsiusToFahrenheit(
      (response.daily.temperature_2m_max[dateIndex] + response.daily.temperature_2m_min[dateIndex]) / 2
    ),
    precipitation: mmToInches(response.daily.precipitation_sum[dateIndex]),
    precipitationProbability: null, // Not in basic API
    windSpeed: kmhToMph(response.daily.wind_speed_10m_max[dateIndex]),
    humidity: response.daily.relative_humidity_2m_mean?.[dateIndex] || null,
    uvIndex: response.daily.uv_index_max?.[dateIndex] || null,
    sunrise: response.daily.sunrise?.[dateIndex] || null,
    sunset: response.daily.sunset?.[dateIndex] || null,
  }
}

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number | null | undefined): number | null {
  if (celsius == null) {return null}
  return Math.round((celsius * 9) / 5 + 32)
}

/**
 * Convert millimeters to inches
 */
export function mmToInches(mm: number | null | undefined): number | null {
  if (mm == null) {return null}
  return Math.round((mm / 25.4) * 100) / 100
}

/**
 * Convert km/h to mph
 */
export function kmhToMph(kmh: number | null | undefined): number | null {
  if (kmh == null) {return null}
  return Math.round(kmh * 0.621371)
}
