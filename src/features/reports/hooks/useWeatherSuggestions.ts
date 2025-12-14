/**
 * Weather Delay Auto-Suggestion Hook
 *
 * Provides weather-based delay suggestions for daily reports.
 * Fetches weather forecast data and generates intelligent delay suggestions
 * based on weather conditions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  fetchWeatherForecast,
  fetchWeatherWithSuggestions,
  generateWeatherDelaySuggestions,
  saveWeatherToDatabase,
  getCachedWeather,
  getWeatherHistory,
  analyzeWeatherDelays,
  WEATHER_THRESHOLDS,
  type WeatherData,
  type WeatherForecast,
  type WeatherDelaySuggestion,
  type WeatherDelayType,
  type WeatherDelayAnalytics,
} from '@/lib/api/services/weather';

// Re-export types for convenience
export type {
  WeatherData,
  WeatherForecast,
  WeatherDelaySuggestion,
  WeatherDelayType,
  WeatherDelayAnalytics,
};
export { WEATHER_THRESHOLDS };

// =============================================
// QUERY KEYS
// =============================================

export const weatherKeys = {
  all: ['weather'] as const,
  forecast: (lat: number, lng: number, days?: number) =>
    [...weatherKeys.all, 'forecast', lat, lng, days] as const,
  suggestions: (lat: number, lng: number, date: string) =>
    [...weatherKeys.all, 'suggestions', lat, lng, date] as const,
  cached: (projectId: string, date: string) =>
    [...weatherKeys.all, 'cached', projectId, date] as const,
  history: (projectId: string, startDate: string, endDate: string) =>
    [...weatherKeys.all, 'history', projectId, startDate, endDate] as const,
  analytics: (projectId: string, startDate: string, endDate: string) =>
    [...weatherKeys.all, 'analytics', projectId, startDate, endDate] as const,
};

// =============================================
// WEATHER FORECAST HOOK
// =============================================

interface UseWeatherForecastOptions {
  days?: number;
  enabled?: boolean;
}

/**
 * Fetch weather forecast for a location
 *
 * @param latitude Project latitude
 * @param longitude Project longitude
 * @param options Query options
 * @returns Weather forecast query result
 *
 * @example
 * ```tsx
 * const { data: forecast } = useWeatherForecast(40.7128, -74.006);
 * ```
 */
export function useWeatherForecast(
  latitude: number | undefined,
  longitude: number | undefined,
  options: UseWeatherForecastOptions = {}
) {
  const { days = 7, enabled = true } = options;

  return useQuery({
    queryKey: weatherKeys.forecast(latitude || 0, longitude || 0, days),
    queryFn: async () => {
      if (latitude === undefined || longitude === undefined) {
        throw new Error('Latitude and longitude are required');
      }
      return fetchWeatherForecast(latitude, longitude, days);
    },
    enabled: enabled && latitude !== undefined && longitude !== undefined,
    staleTime: 30 * 60 * 1000, // 30 minutes - weather data doesn't change frequently
    gcTime: 60 * 60 * 1000, // 1 hour cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}

// =============================================
// WEATHER SUGGESTIONS HOOK
// =============================================

interface UseWeatherSuggestionsOptions {
  enabled?: boolean;
}

interface WeatherSuggestionsResult {
  weather: WeatherData;
  suggestions: WeatherDelaySuggestion[];
}

/**
 * Fetch weather data and generate delay suggestions for a specific date
 *
 * @param latitude Project latitude
 * @param longitude Project longitude
 * @param date Target date (YYYY-MM-DD format)
 * @param options Query options
 * @returns Weather data and delay suggestions
 *
 * @example
 * ```tsx
 * const { data } = useWeatherSuggestions(40.7128, -74.006, '2024-01-15');
 * if (data?.suggestions.length > 0) {
 *   // Show delay suggestions to user
 * }
 * ```
 */
export function useWeatherSuggestions(
  latitude: number | undefined,
  longitude: number | undefined,
  date: string | undefined,
  options: UseWeatherSuggestionsOptions = {}
) {
  const { enabled = true } = options;

  return useQuery<WeatherSuggestionsResult>({
    queryKey: weatherKeys.suggestions(latitude || 0, longitude || 0, date || ''),
    queryFn: async () => {
      if (latitude === undefined || longitude === undefined || !date) {
        throw new Error('Latitude, longitude, and date are required');
      }
      return fetchWeatherWithSuggestions(latitude, longitude, date);
    },
    enabled:
      enabled && latitude !== undefined && longitude !== undefined && !!date,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour cache
  });
}

// =============================================
// CACHED WEATHER HOOK
// =============================================

/**
 * Get cached weather data from the database
 *
 * @param projectId Project ID
 * @param date Target date (YYYY-MM-DD format)
 * @returns Cached weather data or null
 */
export function useCachedWeather(
  projectId: string | undefined,
  date: string | undefined
) {
  return useQuery({
    queryKey: weatherKeys.cached(projectId || '', date || ''),
    queryFn: async () => {
      if (!projectId || !date) {
        throw new Error('Project ID and date are required');
      }
      return getCachedWeather(projectId, date);
    },
    enabled: !!projectId && !!date,
    staleTime: 60 * 60 * 1000, // 1 hour - cached data doesn't change
  });
}

// =============================================
// WEATHER HISTORY HOOK
// =============================================

/**
 * Get weather history for a project over a date range
 *
 * @param projectId Project ID
 * @param startDate Start date (YYYY-MM-DD format)
 * @param endDate End date (YYYY-MM-DD format)
 * @returns Array of weather data
 */
export function useWeatherHistory(
  projectId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: weatherKeys.history(projectId || '', startDate || '', endDate || ''),
    queryFn: async () => {
      if (!projectId || !startDate || !endDate) {
        throw new Error('Project ID and date range are required');
      }
      return getWeatherHistory(projectId, startDate, endDate);
    },
    enabled: !!projectId && !!startDate && !!endDate,
  });
}

// =============================================
// WEATHER DELAY ANALYTICS HOOK
// =============================================

/**
 * Analyze weather-related delays for a project
 *
 * @param projectId Project ID
 * @param startDate Start date (YYYY-MM-DD format)
 * @param endDate End date (YYYY-MM-DD format)
 * @returns Weather delay analytics
 */
export function useWeatherDelayAnalytics(
  projectId: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined
) {
  return useQuery({
    queryKey: weatherKeys.analytics(projectId || '', startDate || '', endDate || ''),
    queryFn: async () => {
      if (!projectId || !startDate || !endDate) {
        throw new Error('Project ID and date range are required');
      }
      return analyzeWeatherDelays(projectId, startDate, endDate);
    },
    enabled: !!projectId && !!startDate && !!endDate,
  });
}

// =============================================
// SAVE WEATHER MUTATION
// =============================================

interface SaveWeatherParams {
  projectId: string;
  weatherData: WeatherData;
  latitude: number;
  longitude: number;
}

/**
 * Save weather data to the database for historical tracking
 *
 * @returns Mutation for saving weather data
 *
 * @example
 * ```tsx
 * const saveWeather = useSaveWeather();
 * await saveWeather.mutateAsync({
 *   projectId: 'project-123',
 *   weatherData: weatherData,
 *   latitude: 40.7128,
 *   longitude: -74.006,
 * });
 * ```
 */
export function useSaveWeather() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async ({ projectId, weatherData, latitude, longitude }: SaveWeatherParams) => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID is required');
      }
      return saveWeatherToDatabase(
        projectId,
        userProfile.company_id,
        weatherData,
        latitude,
        longitude
      );
    },
    onSuccess: (_, variables) => {
      // Invalidate cached weather queries
      queryClient.invalidateQueries({
        queryKey: weatherKeys.cached(variables.projectId, variables.weatherData.date),
      });
    },
  });
}

// =============================================
// HELPER HOOKS
// =============================================

/**
 * Get current weather for today's daily report
 *
 * @param latitude Project latitude
 * @param longitude Project longitude
 * @returns Current weather data and any delay suggestions
 */
export function useCurrentWeather(
  latitude: number | undefined,
  longitude: number | undefined
) {
  const today = new Date().toISOString().split('T')[0];
  return useWeatherSuggestions(latitude, longitude, today);
}

/**
 * Generate delay suggestions from existing weather data
 * Useful when you already have weather data and just need suggestions
 *
 * @param weatherData Weather data to analyze
 * @returns Array of delay suggestions
 */
export function useGenerateSuggestions(weatherData: WeatherData | null | undefined) {
  return useQuery({
    queryKey: ['weather', 'generate-suggestions', weatherData?.date],
    queryFn: () => {
      if (!weatherData) return [];
      return generateWeatherDelaySuggestions(weatherData);
    },
    enabled: !!weatherData,
  });
}

// =============================================
// DELAY REASON TEMPLATES
// =============================================

/**
 * Pre-built delay reason templates based on weather conditions
 * These can be used to populate delay entry forms
 */
export const WEATHER_DELAY_TEMPLATES = {
  rain: {
    description: 'Work suspended due to rain. Site conditions unsafe for outdoor activities.',
    affected_activities: 'Concrete placement, earthwork, exterior painting, roofing',
    safety_concerns: 'Slippery surfaces, reduced visibility',
  },
  heavy_rain: {
    description: 'Heavy rainfall caused work stoppage. Standing water on site, unsafe conditions.',
    affected_activities: 'All exterior work, foundation work, paving, excavation',
    safety_concerns: 'Flooding risk, electrical hazards, trench collapse potential',
  },
  snow: {
    description: 'Snowfall impacted work progress. Snow removal required before operations could resume.',
    affected_activities: 'Exterior work, roofing, crane operations, material deliveries',
    safety_concerns: 'Cold exposure, slippery conditions, buried hazards',
  },
  ice: {
    description: 'Icing conditions prevented safe work. All elevated work and equipment operation suspended.',
    affected_activities: 'Scaffold work, crane operations, roofing, site access',
    safety_concerns: 'Extreme slip hazard, vehicle accidents, equipment damage',
  },
  extreme_heat: {
    description: 'Extreme heat required modified work schedule. OSHA heat illness prevention protocols implemented.',
    affected_activities: 'Roofing, paving, heavy manual labor, confined space work',
    safety_concerns: 'Heat stroke risk, dehydration, worker fatigue',
  },
  extreme_cold: {
    description: 'Freezing temperatures required work modification. Cold weather concrete protection implemented.',
    affected_activities: 'Concrete placement, masonry, exterior coatings, waterproofing',
    safety_concerns: 'Frostbite, hypothermia, material performance issues',
  },
  high_wind: {
    description: 'High winds exceeded safe working limits. Crane operations suspended.',
    affected_activities: 'Crane operations, steel erection, roofing, scaffold work',
    safety_concerns: 'Falling objects, crane stability, worker fall risk',
  },
  lightning: {
    description: 'Thunderstorm activity required site evacuation. All outdoor work suspended per lightning safety protocol.',
    affected_activities: 'All outdoor work, crane operations, elevated work',
    safety_concerns: 'Lightning strike risk, flash flooding potential',
  },
  fog: {
    description: 'Dense fog reduced visibility below safe operating limits. Equipment operations limited.',
    affected_activities: 'Crane operations, heavy equipment, material deliveries',
    safety_concerns: 'Collision risk, signal visibility',
  },
  flooding: {
    description: 'Site flooding from recent precipitation. Dewatering operations required before work could resume.',
    affected_activities: 'Excavation, foundation work, underground utilities',
    safety_concerns: 'Trench collapse, electrical hazards, equipment damage',
  },
} as const;

/**
 * Get delay template for a specific weather delay type
 */
export function getDelayTemplate(type: WeatherDelayType) {
  return WEATHER_DELAY_TEMPLATES[type] || WEATHER_DELAY_TEMPLATES.rain;
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Check if weather conditions warrant a delay
 */
export function shouldSuggestDelay(weather: WeatherData): boolean {
  const suggestions = generateWeatherDelaySuggestions(weather);
  return suggestions.length > 0;
}

/**
 * Get the severity level of weather conditions
 */
export function getWeatherSeverity(weather: WeatherData): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  const suggestions = generateWeatherDelaySuggestions(weather);
  if (suggestions.length === 0) return 'none';

  // Return the highest severity among suggestions
  const severityOrder = ['low', 'medium', 'high', 'critical'] as const;
  let maxSeverityIndex = 0;

  suggestions.forEach((s) => {
    const index = severityOrder.indexOf(s.severity);
    if (index > maxSeverityIndex) {
      maxSeverityIndex = index;
    }
  });

  return severityOrder[maxSeverityIndex];
}

/**
 * Format weather data for display
 */
export function formatWeatherDisplay(weather: WeatherData): string {
  const parts = [
    weather.condition.description,
    `High: ${weather.temperature_high}F`,
    `Low: ${weather.temperature_low}F`,
  ];

  if (weather.precipitation > 0) {
    parts.push(`Precip: ${weather.precipitation}"`);
  }

  if (weather.wind_speed >= WEATHER_THRESHOLDS.HIGH_WIND) {
    parts.push(`Wind: ${weather.wind_speed} mph`);
  }

  return parts.join(' | ');
}
