// Weather service using Open-Meteo API (free, no API key required)

export interface WeatherData {
  weather_condition: string
  temperature_high: number
  temperature_low: number
  precipitation: number
  wind_speed: number
}

interface OpenMeteoResponse {
  daily: {
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    wind_speed_10m_max: number[]
  }
}

// Weather code to condition mapping (WMO codes)
const weatherCodeToCondition: Record<number, string> = {
  0: 'Clear Sky',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing Rime Fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  56: 'Light Freezing Drizzle',
  57: 'Dense Freezing Drizzle',
  61: 'Slight Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  66: 'Light Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Slight Snow',
  73: 'Moderate Snow',
  75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Slight Rain Showers',
  81: 'Moderate Rain Showers',
  82: 'Violent Rain Showers',
  85: 'Slight Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Slight Hail',
  99: 'Thunderstorm with Heavy Hail',
}

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5 + 32) * 10) / 10
}

// Convert mm to inches
function mmToInches(mm: number): number {
  return Math.round(mm * 0.0393701 * 100) / 100
}

// Convert km/h to mph
function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371 * 10) / 10
}

// Get user's current location
export async function getCurrentLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please enable location access.'))
            break
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information unavailable.'))
            break
          case error.TIMEOUT:
            reject(new Error('Location request timed out.'))
            break
          default:
            reject(new Error('Unable to get location.'))
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  })
}

// Fetch weather data from Open-Meteo API
export async function fetchWeatherData(
  lat: number,
  lon: number,
  date: string // YYYY-MM-DD format
): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat.toString())
  url.searchParams.set('longitude', lon.toString())
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max')
  url.searchParams.set('start_date', date)
  url.searchParams.set('end_date', date)
  url.searchParams.set('timezone', 'auto')

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`)
  }

  const data: OpenMeteoResponse = await response.json()

  if (!data.daily || data.daily.weather_code.length === 0) {
    throw new Error('No weather data available for the selected date')
  }

  const weatherCode = data.daily.weather_code[0]

  return {
    weather_condition: weatherCodeToCondition[weatherCode] || 'Unknown',
    temperature_high: celsiusToFahrenheit(data.daily.temperature_2m_max[0]),
    temperature_low: celsiusToFahrenheit(data.daily.temperature_2m_min[0]),
    precipitation: mmToInches(data.daily.precipitation_sum[0]),
    wind_speed: kmhToMph(data.daily.wind_speed_10m_max[0]),
  }
}

// Main function to get weather for current location and date
export async function getWeatherForDate(date: string): Promise<WeatherData> {
  const location = await getCurrentLocation()
  return fetchWeatherData(location.lat, location.lon, date)
}

// Get weather with manual coordinates (for project locations)
export async function getWeatherForLocation(
  lat: number,
  lon: number,
  date: string
): Promise<WeatherData> {
  return fetchWeatherData(lat, lon, date)
}
