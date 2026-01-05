/**
 * Supabase Edge Function: weather-api
 *
 * Proxy for weather API calls to keep API key server-side.
 * Supports OpenWeatherMap API for weather data and geocoding.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WeatherRequest {
  latitude: number
  longitude: number
}

interface GeocodeRequest {
  address: string
}

interface WeatherData {
  temperature: number
  conditions: string
  humidity: number
  windSpeed: number
  windDirection: string
  precipitation: number
  icon: string
  fetchedAt: string
}

// Simple in-memory cache with TTL
const cache = new Map<string, { data: WeatherData; expiresAt: number }>()
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

function kelvinToFahrenheit(kelvin: number): number {
  return Math.round((kelvin - 273.15) * 9 / 5 + 32)
}

function mpsToMph(mps: number): number {
  return Math.round(mps * 2.237)
}

function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  const index = Math.round(degrees / 22.5) % 16
  return directions[index]
}

function getWeatherIcon(condition: string): string {
  const icons: Record<string, string> = {
    clear: 'sun',
    clouds: 'cloud',
    rain: 'cloud-rain',
    drizzle: 'cloud-drizzle',
    thunderstorm: 'cloud-lightning',
    snow: 'snowflake',
    mist: 'cloud-fog',
    fog: 'cloud-fog',
    haze: 'cloud-fog',
  }
  const normalized = condition.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (normalized.includes(key)) {
      return icon
    }
  }
  return 'cloud'
}

function getCacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)},${lon.toFixed(2)}`
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const apiKey = Deno.env.get('OPENWEATHERMAP_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!apiKey) {
      throw new Error('Weather API key not configured')
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Get user from JWT
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse URL to determine action
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    if (action === 'weather') {
      const { latitude, longitude }: WeatherRequest = await req.json()

      if (latitude === undefined || longitude === undefined) {
        throw new Error('Missing latitude or longitude')
      }

      // Check cache
      const cacheKey = getCacheKey(latitude, longitude)
      const cached = cache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      // Fetch from OpenWeatherMap
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
      const response = await fetch(weatherUrl)

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`)
      }

      const data = await response.json()

      const weatherData: WeatherData = {
        temperature: kelvinToFahrenheit(data.main.temp),
        conditions: data.weather[0]?.description || 'Unknown',
        humidity: data.main.humidity,
        windSpeed: mpsToMph(data.wind.speed),
        windDirection: getWindDirection(data.wind.deg),
        precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
        icon: getWeatherIcon(data.weather[0]?.main || ''),
        fetchedAt: new Date().toISOString(),
      }

      // Cache the result
      cache.set(cacheKey, {
        data: weatherData,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })

      return new Response(JSON.stringify(weatherData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (action === 'geocode') {
      const { address }: GeocodeRequest = await req.json()

      if (!address) {
        throw new Error('Missing address')
      }

      const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(address)}&limit=1&appid=${apiKey}`
      const response = await fetch(geocodeUrl)

      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.length === 0) {
        return new Response(JSON.stringify({ latitude: null, longitude: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      return new Response(JSON.stringify({
        latitude: data[0].lat,
        longitude: data[0].lon,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('weather-api error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && error.message.includes('Missing') ? 400 : 500,
      }
    )
  }
})
