/**
 * Weather React Query Hooks
 * Hooks for fetching and caching weather data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  fetchWeatherData,
  getCurrentLocation,
} from '../services/weatherService'
import { getWeatherIcon } from '@/types/weather'
import { logger } from '../../../lib/utils/logger';


// Weather history record type for database operations
interface WeatherHistoryRecord {
  project_id: string
  company_id?: string | null
  weather_date: string
  latitude?: number
  longitude?: number
  weather_code?: number | null
  weather_condition?: string | null
  temperature_high?: number | null
  temperature_low?: number | null
  temperature_avg?: number | null
  precipitation?: number | null
  wind_speed_max?: number | null
  humidity_percent?: number | null
  fetched_at?: string | null
}

// Query keys
export const weatherKeys = {
  all: ['weather'] as const,
  date: (projectId: string, date: string) =>
    [...weatherKeys.all, 'date', projectId, date] as const,
  range: (projectId: string, startDate: string, endDate: string) =>
    [...weatherKeys.all, 'range', projectId, startDate, endDate] as const,
  current: (lat: number, lon: number) =>
    [...weatherKeys.all, 'current', lat, lon] as const,
  project: (projectId: string) => [...weatherKeys.all, 'project', projectId] as const,
}

/**
 * Extended weather data with additional formatting
 */
export interface ExtendedWeatherData {
  date: string
  condition: string
  conditionCode: number | null
  icon: string
  temperatureHigh: number | null
  temperatureLow: number | null
  temperatureAvg: number | null
  precipitation: number | null
  windSpeed: number | null
  humidity: number | null
  isCached: boolean
  fetchedAt: string | null
}

/**
 * Get weather for a specific date (with caching)
 */
export function useWeatherForDate(
  projectId: string | undefined,
  date: string | undefined,
  coordinates?: { latitude: number; longitude: number }
) {
  const { user, userProfile } = useAuth()
  const _queryClient = useQueryClient()

  return useQuery({
    queryKey: weatherKeys.date(projectId!, date!),
    queryFn: async (): Promise<ExtendedWeatherData> => {
      // First check cache (using type assertion since weather_history may not be in generated types)
      const { data: cached, error: cacheError } = await (supabase as any)
        .from('weather_history')
        .select('*')
        .eq('project_id', projectId)
        .eq('weather_date', date)
        .single() as { data: WeatherHistoryRecord | null; error: any }

      if (cached && !cacheError) {
        // Return cached data
        return {
          date: cached.weather_date,
          condition: cached.weather_condition || 'Unknown',
          conditionCode: cached.weather_code ?? null,
          icon: getWeatherIcon(cached.weather_code ?? null),
          temperatureHigh: cached.temperature_high ?? null,
          temperatureLow: cached.temperature_low ?? null,
          temperatureAvg: cached.temperature_avg ?? null,
          precipitation: cached.precipitation ?? null,
          windSpeed: cached.wind_speed_max ?? null,
          humidity: cached.humidity_percent ?? null,
          isCached: true,
          fetchedAt: cached.fetched_at ?? null,
        }
      }

      // If not cached and we have coordinates, fetch from API
      let finalCoordinates = coordinates
      if (!finalCoordinates) {
        // Try to get project coordinates
        const { data: project } = await supabase
          .from('projects')
          .select('latitude, longitude')
          .eq('id', projectId!)
          .single()

        if (project?.latitude && project?.longitude) {
          finalCoordinates = {
            latitude: project.latitude,
            longitude: project.longitude,
          }
        } else {
          // Try to get user's current location
          try {
            const location = await getCurrentLocation()
            finalCoordinates = {
              latitude: location.lat,
              longitude: location.lon,
            }
          } catch {
            throw new Error('No location available. Please set project coordinates.')
          }
        }
      }

      // Fetch from API
      const apiData = await fetchWeatherData(
        finalCoordinates.latitude,
        finalCoordinates.longitude,
        date!
      )

      // Save to cache
      await (supabase as any).from('weather_history').upsert({
        project_id: projectId,
        company_id: userProfile?.company_id,
        weather_date: date,
        latitude: finalCoordinates.latitude,
        longitude: finalCoordinates.longitude,
        weather_code: null, // API doesn't return code in current format
        weather_condition: apiData.weather_condition,
        temperature_high: apiData.temperature_high,
        temperature_low: apiData.temperature_low,
        temperature_avg: Math.round((apiData.temperature_high + apiData.temperature_low) / 2),
        precipitation: apiData.precipitation,
        wind_speed_max: apiData.wind_speed,
        fetched_at: new Date().toISOString(),
      }, {
        onConflict: 'project_id,weather_date',
      })

      return {
        date: date!,
        condition: apiData.weather_condition,
        conditionCode: null,
        icon: 'cloud', // Default icon
        temperatureHigh: apiData.temperature_high,
        temperatureLow: apiData.temperature_low,
        temperatureAvg: Math.round((apiData.temperature_high + apiData.temperature_low) / 2),
        precipitation: apiData.precipitation,
        windSpeed: apiData.wind_speed,
        humidity: null,
        isCached: false,
        fetchedAt: new Date().toISOString(),
      }
    },
    enabled: !!projectId && !!date && !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes (weather doesn't change that often)
    retry: 1, // Only retry once for weather
  })
}

/**
 * Get weather for a date range
 */
export function useWeatherForDateRange(
  projectId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  const { user } = useAuth()

  return useQuery({
    queryKey: weatherKeys.range(projectId!, startDate!, endDate!),
    queryFn: async (): Promise<ExtendedWeatherData[]> => {
      const { data, error } = await (supabase as any)
        .from('weather_history')
        .select('*')
        .eq('project_id', projectId)
        .gte('weather_date', startDate)
        .lte('weather_date', endDate)
        .order('weather_date', { ascending: true }) as { data: WeatherHistoryRecord[] | null; error: any }

      if (error) {throw error}

      return (data || []).map((record: WeatherHistoryRecord) => ({
        date: record.weather_date,
        condition: record.weather_condition || 'Unknown',
        conditionCode: record.weather_code ?? null,
        icon: getWeatherIcon(record.weather_code ?? null),
        temperatureHigh: record.temperature_high ?? null,
        temperatureLow: record.temperature_low ?? null,
        temperatureAvg: record.temperature_avg ?? null,
        precipitation: record.precipitation ?? null,
        windSpeed: record.wind_speed_max ?? null,
        humidity: record.humidity_percent ?? null,
        isCached: true,
        fetchedAt: record.fetched_at ?? null,
      }))
    },
    enabled: !!projectId && !!startDate && !!endDate && !!user,
    staleTime: 1000 * 60 * 30,
  })
}

/**
 * Prefetch weather for a project's upcoming dates
 */
export function usePrefetchWeather() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      projectId,
      dates,
      coordinates,
    }: {
      projectId: string
      dates: string[]
      coordinates: { latitude: number; longitude: number }
    }) => {
      const results: ExtendedWeatherData[] = []

      for (const date of dates) {
        // Check if already cached
        const { data: cached } = await (supabase as any)
          .from('weather_history')
          .select('*')
          .eq('project_id', projectId)
          .eq('weather_date', date)
          .single() as { data: WeatherHistoryRecord | null; error: any }

        if (cached) {
          results.push({
            date: cached.weather_date,
            condition: cached.weather_condition || 'Unknown',
            conditionCode: cached.weather_code ?? null,
            icon: getWeatherIcon(cached.weather_code ?? null),
            temperatureHigh: cached.temperature_high ?? null,
            temperatureLow: cached.temperature_low ?? null,
            temperatureAvg: cached.temperature_avg ?? null,
            precipitation: cached.precipitation ?? null,
            windSpeed: cached.wind_speed_max ?? null,
            humidity: cached.humidity_percent ?? null,
            isCached: true,
            fetchedAt: cached.fetched_at ?? null,
          })
          continue
        }

        // Fetch from API
        try {
          const apiData = await fetchWeatherData(
            coordinates.latitude,
            coordinates.longitude,
            date
          )

          // Save to cache
          await (supabase as any).from('weather_history').upsert({
            project_id: projectId,
            company_id: userProfile?.company_id,
            weather_date: date,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            weather_condition: apiData.weather_condition,
            temperature_high: apiData.temperature_high,
            temperature_low: apiData.temperature_low,
            temperature_avg: Math.round((apiData.temperature_high + apiData.temperature_low) / 2),
            precipitation: apiData.precipitation,
            wind_speed_max: apiData.wind_speed,
            fetched_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id,weather_date',
          })

          results.push({
            date,
            condition: apiData.weather_condition,
            conditionCode: null,
            icon: 'cloud',
            temperatureHigh: apiData.temperature_high,
            temperatureLow: apiData.temperature_low,
            temperatureAvg: Math.round((apiData.temperature_high + apiData.temperature_low) / 2),
            precipitation: apiData.precipitation,
            windSpeed: apiData.wind_speed,
            humidity: null,
            isCached: false,
            fetchedAt: new Date().toISOString(),
          })

          // Rate limiting - wait 100ms between API calls
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (_error) {
          logger.error(`Failed to fetch weather for ${date}:`, _error)
        }
      }

      return results
    },
    onSuccess: (data, variables) => {
      // Update individual date queries
      data.forEach((weather) => {
        queryClient.setQueryData(
          weatherKeys.date(variables.projectId, weather.date),
          weather
        )
      })
    },
  })
}

/**
 * Get project location
 */
export function useProjectLocation(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-location', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, latitude, longitude, timezone')
        .eq('id', projectId!)
        .single()

      if (error) {throw error}
      return data
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 60, // 1 hour (location rarely changes)
  })
}

/**
 * Update project location
 */
export function useUpdateProjectLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      latitude,
      longitude,
      timezone,
    }: {
      projectId: string
      latitude: number
      longitude: number
      timezone?: string
    }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          latitude,
          longitude,
          timezone: timezone || 'America/New_York',
        })
        .eq('id', projectId)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['project-location', variables.projectId],
      })
      queryClient.invalidateQueries({
        queryKey: weatherKeys.project(variables.projectId),
      })
    },
  })
}
