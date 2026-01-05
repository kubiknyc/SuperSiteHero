/**
 * Weather API Service - Auto-fetch weather data for daily reports
 * Uses OpenWeatherMap API (or similar) for weather data
 */

import { logger } from '../../../lib/utils/logger';

interface WeatherData {
  temperature: number; // Fahrenheit
  conditions: string;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  precipitation: number;
  icon: string;
  fetchedAt: string;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
}

// Weather condition mapping
const CONDITION_ICONS: Record<string, string> = {
  clear: 'sun',
  clouds: 'cloud',
  rain: 'cloud-rain',
  drizzle: 'cloud-drizzle',
  thunderstorm: 'cloud-lightning',
  snow: 'snowflake',
  mist: 'cloud-fog',
  fog: 'cloud-fog',
  haze: 'cloud-fog',
};

/**
 * Get weather icon based on condition
 */
function getWeatherIcon(condition: string): string {
  const normalized = condition.toLowerCase();
  for (const [key, icon] of Object.entries(CONDITION_ICONS)) {
    if (normalized.includes(key)) {
      return icon;
    }
  }
  return 'cloud';
}

/**
 * Convert Kelvin to Fahrenheit
 */
function kelvinToFahrenheit(kelvin: number): number {
  return Math.round((kelvin - 273.15) * 9/5 + 32);
}

/**
 * Convert meters/second to mph
 */
function mpsToMph(mps: number): number {
  return Math.round(mps * 2.237);
}

/**
 * Get wind direction from degrees
 */
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Fetch weather via Edge Function (keeps API key secure)
 */
async function fetchWeatherViaEdgeFunction(
  lat: number,
  lon: number
): Promise<WeatherData> {
  // Import supabase dynamically to avoid circular dependencies
  const { supabase } = await import('@/lib/supabase');

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather-api/weather`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lon,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Weather API error: ${errorData.error || response.status}`);
  }

  return response.json();
}

/**
 * Cache for weather data (to avoid excessive API calls)
 */
const weatherCache = new Map<string, { data: WeatherData; expiresAt: number }>();
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Clear the weather cache (for testing purposes)
 */
export function clearWeatherCache(): void {
  weatherCache.clear();
}

/**
 * Get cache key for location
 */
function getCacheKey(lat: number, lon: number): string {
  // Round to 2 decimal places for cache key
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

/**
 * Get weather data for a location
 */
export async function getWeather(location: GeoLocation): Promise<WeatherData> {
  const cacheKey = getCacheKey(location.latitude, location.longitude);

  // Check cache
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Fetch via Edge Function (API key is kept server-side)
  const data = await fetchWeatherViaEdgeFunction(location.latitude, location.longitude);

  // Cache the result
  weatherCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_DURATION_MS,
  });

  return data;
}

/**
 * Get weather for a project (using project's location)
 */
export async function getWeatherForProject(projectId: string): Promise<WeatherData | null> {
  try {
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('@/lib/supabase');

    // Get project location
    const { data: project, error } = await supabase
      .from('projects')
      .select('latitude, longitude, address, city, state')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      logger.error('Failed to fetch project location:', error);
      return null;
    }

    // If we have coordinates, use them
    if (project.latitude && project.longitude) {
      return getWeather({
        latitude: project.latitude,
        longitude: project.longitude,
      });
    }

    // Otherwise, geocode the address
    if (project.address || project.city) {
      const location = await geocodeAddress(
        [project.address, project.city, project.state].filter(Boolean).join(', ')
      );

      if (location) {
        return getWeather(location);
      }
    }

    return null;
  } catch (_error) {
    logger.error('Error fetching weather for project:', _error);
    return null;
  }
}

/**
 * Geocode an address to coordinates via Edge Function
 */
async function geocodeAddress(address: string): Promise<GeoLocation | null> {
  try {
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('@/lib/supabase');

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      logger.warn('Not authenticated for geocoding');
      return null;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather-api/geocode`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ address }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.latitude && data.longitude) {
      return {
        latitude: data.latitude,
        longitude: data.longitude,
      };
    }

    return null;
  } catch (_error) {
    logger.error('Geocoding error:', _error);
    return null;
  }
}

/**
 * Get current location from browser
 */
export function getCurrentLocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
}

/**
 * Format weather data for display
 */
export function formatWeatherDisplay(weather: WeatherData): string {
  return `${weather.temperature}°F, ${weather.conditions}, Wind: ${weather.windSpeed} mph ${weather.windDirection}`;
}

/**
 * Check if weather conditions might cause work delays
 */
export function analyzeWeatherImpact(weather: WeatherData): {
  hasImpact: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  warnings: string[];
} {
  const warnings: string[] = [];
  let severity: 'none' | 'minor' | 'moderate' | 'severe' = 'none';

  // Temperature extremes
  if (weather.temperature < 32) {
    warnings.push('Freezing conditions may affect concrete work and equipment');
    severity = 'moderate';
  } else if (weather.temperature > 95) {
    warnings.push('Extreme heat may require additional worker breaks');
    severity = 'minor';
  }

  // Wind
  if (weather.windSpeed > 35) {
    warnings.push('High winds may affect crane operations and elevated work');
    severity = 'severe';
  } else if (weather.windSpeed > 20) {
    warnings.push('Moderate winds may affect certain operations');
    severity = severity === 'none' ? 'minor' : severity;
  }

  // Precipitation
  const conditions = weather.conditions.toLowerCase();
  if (conditions.includes('thunderstorm')) {
    warnings.push('Thunderstorm conditions - suspend all outdoor work');
    severity = 'severe';
  } else if (conditions.includes('heavy rain') || conditions.includes('heavy snow')) {
    warnings.push('Heavy precipitation may suspend outdoor activities');
    severity = 'moderate';
  } else if (conditions.includes('rain') || conditions.includes('snow')) {
    warnings.push('Precipitation may affect certain work activities');
    severity = severity === 'none' ? 'minor' : severity;
  }

  return {
    hasImpact: warnings.length > 0,
    severity,
    warnings,
  };
}

export type { WeatherData, GeoLocation };
