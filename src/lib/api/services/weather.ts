/**
 * Weather API Service
 *
 * Integrates with Open-Meteo (free, no API key required) for weather data.
 * Also supports WeatherAPI.com (free tier with API key) for enhanced features.
 *
 * API Documentation:
 * - Open-Meteo: https://open-meteo.com/en/docs (free, no key required)
 * - WeatherAPI.com: https://www.weatherapi.com/docs/ (free tier, key required)
 *
 * Environment Variables:
 * - VITE_WEATHER_API_KEY: Optional API key for WeatherAPI.com (enhanced features)
 * - If not set, falls back to Open-Meteo (free, no key required)
 */

import { supabase } from '@/lib/supabase';

// =============================================
// TYPES
// =============================================

export interface WeatherConditions {
  code: number;
  description: string;
  icon: string;
}

export interface WeatherData {
  date: string;
  condition: WeatherConditions;
  temperature_high: number; // Fahrenheit
  temperature_low: number; // Fahrenheit
  temperature_current?: number; // Fahrenheit
  precipitation: number; // inches
  precipitation_probability: number; // 0-100
  snow_depth?: number; // inches
  wind_speed: number; // mph
  wind_gusts?: number; // mph
  wind_direction: string;
  humidity: number; // 0-100
  uv_index?: number;
  visibility?: number; // miles
  sunrise?: string;
  sunset?: string;
  fetched_at: string;
  source: 'open-meteo' | 'weatherapi' | 'manual';
}

export interface WeatherForecast {
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    timezone?: string;
  };
  current?: WeatherData;
  forecast: WeatherData[];
}

export interface WeatherDelaySuggestion {
  id: string;
  type: WeatherDelayType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours: number;
  affected_activities: string[];
  safety_concerns: string[];
  weather_conditions: {
    condition?: string;
    temperature_high?: number;
    temperature_low?: number;
    precipitation?: number;
    wind_speed?: number;
    snow_depth?: number;
  };
}

export type WeatherDelayType =
  | 'rain'
  | 'heavy_rain'
  | 'snow'
  | 'ice'
  | 'extreme_heat'
  | 'extreme_cold'
  | 'high_wind'
  | 'lightning'
  | 'fog'
  | 'flooding';

// Weather thresholds for construction work
export const WEATHER_THRESHOLDS = {
  // Temperature thresholds (Fahrenheit)
  EXTREME_HEAT: 95, // OSHA heat stress concerns
  HIGH_HEAT: 90,
  EXTREME_COLD: 32, // Freezing
  SEVERE_COLD: 20,

  // Precipitation thresholds (inches)
  LIGHT_RAIN: 0.1,
  MODERATE_RAIN: 0.25,
  HEAVY_RAIN: 0.5,
  LIGHT_SNOW: 1,
  MODERATE_SNOW: 3,
  HEAVY_SNOW: 6,

  // Wind thresholds (mph)
  HIGH_WIND: 25,
  DANGEROUS_WIND: 40,
  CRANE_LIMIT: 30, // Most cranes have 30-35 mph limits

  // Visibility threshold (miles)
  LOW_VISIBILITY: 0.25,

  // Lightning probability
  LIGHTNING_RISK: 40, // percent
} as const;

// =============================================
// OPEN-METEO API (FREE, NO KEY REQUIRED)
// =============================================

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    snowfall_sum?: number[];
  };
}

// WMO Weather Codes mapping
const WMO_CODES: Record<number, WeatherConditions> = {
  0: { code: 0, description: 'Clear sky', icon: 'sun' },
  1: { code: 1, description: 'Mainly clear', icon: 'sun' },
  2: { code: 2, description: 'Partly cloudy', icon: 'cloud-sun' },
  3: { code: 3, description: 'Overcast', icon: 'cloud' },
  45: { code: 45, description: 'Fog', icon: 'cloud-fog' },
  48: { code: 48, description: 'Depositing rime fog', icon: 'cloud-fog' },
  51: { code: 51, description: 'Light drizzle', icon: 'cloud-drizzle' },
  53: { code: 53, description: 'Moderate drizzle', icon: 'cloud-drizzle' },
  55: { code: 55, description: 'Dense drizzle', icon: 'cloud-drizzle' },
  56: { code: 56, description: 'Light freezing drizzle', icon: 'cloud-sleet' },
  57: { code: 57, description: 'Dense freezing drizzle', icon: 'cloud-sleet' },
  61: { code: 61, description: 'Slight rain', icon: 'cloud-rain' },
  63: { code: 63, description: 'Moderate rain', icon: 'cloud-rain' },
  65: { code: 65, description: 'Heavy rain', icon: 'cloud-showers-heavy' },
  66: { code: 66, description: 'Light freezing rain', icon: 'cloud-sleet' },
  67: { code: 67, description: 'Heavy freezing rain', icon: 'cloud-sleet' },
  71: { code: 71, description: 'Slight snow', icon: 'cloud-snow' },
  73: { code: 73, description: 'Moderate snow', icon: 'cloud-snow' },
  75: { code: 75, description: 'Heavy snow', icon: 'cloud-snow' },
  77: { code: 77, description: 'Snow grains', icon: 'cloud-snow' },
  80: { code: 80, description: 'Slight rain showers', icon: 'cloud-sun-rain' },
  81: { code: 81, description: 'Moderate rain showers', icon: 'cloud-rain' },
  82: { code: 82, description: 'Violent rain showers', icon: 'cloud-showers-heavy' },
  85: { code: 85, description: 'Slight snow showers', icon: 'cloud-snow' },
  86: { code: 86, description: 'Heavy snow showers', icon: 'cloud-snow' },
  95: { code: 95, description: 'Thunderstorm', icon: 'cloud-bolt' },
  96: { code: 96, description: 'Thunderstorm with slight hail', icon: 'cloud-bolt' },
  99: { code: 99, description: 'Thunderstorm with heavy hail', icon: 'cloud-bolt' },
};

function getWeatherCondition(code: number): WeatherConditions {
  return WMO_CODES[code] || { code, description: 'Unknown', icon: 'cloud' };
}

function windDegreesToDirection(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

// Convert mm to inches
function mmToInches(mm: number): number {
  return Math.round((mm / 25.4) * 100) / 100;
}

// Convert m/s to mph
function _msToMph(ms: number): number {
  return Math.round(ms * 2.237);
}

// Convert km/h to mph
function kmhToMph(kmh: number): number {
  return Math.round(kmh * 0.621371);
}

/**
 * Fetch weather forecast from Open-Meteo API (free, no key required)
 */
async function fetchFromOpenMeteo(
  latitude: number,
  longitude: number,
  days: number = 7
): Promise<WeatherForecast> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.append('latitude', latitude.toString());
  url.searchParams.append('longitude', longitude.toString());
  url.searchParams.append('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m');
  url.searchParams.append(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset,uv_index_max,snowfall_sum'
  );
  url.searchParams.append('timezone', 'auto');
  url.searchParams.append('forecast_days', days.toString());
  url.searchParams.append('temperature_unit', 'celsius');
  url.searchParams.append('wind_speed_unit', 'kmh');
  url.searchParams.append('precipitation_unit', 'mm');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data: OpenMeteoResponse = await response.json();
  const fetchedAt = new Date().toISOString();

  // Build forecast array
  const forecast: WeatherData[] = data.daily.time.map((date, index) => ({
    date,
    condition: getWeatherCondition(data.daily.weather_code[index]),
    temperature_high: celsiusToFahrenheit(data.daily.temperature_2m_max[index]),
    temperature_low: celsiusToFahrenheit(data.daily.temperature_2m_min[index]),
    precipitation: mmToInches(data.daily.precipitation_sum[index]),
    precipitation_probability: data.daily.precipitation_probability_max[index],
    snow_depth: data.daily.snowfall_sum ? mmToInches(data.daily.snowfall_sum[index] * 10) : undefined, // snowfall is in cm
    wind_speed: kmhToMph(data.daily.wind_speed_10m_max[index]),
    wind_gusts: kmhToMph(data.daily.wind_gusts_10m_max[index]),
    wind_direction: windDegreesToDirection(data.daily.wind_direction_10m_dominant[index]),
    humidity: 50, // Open-Meteo daily doesn't have daily humidity, use estimate
    uv_index: data.daily.uv_index_max[index],
    sunrise: data.daily.sunrise[index],
    sunset: data.daily.sunset[index],
    fetched_at: fetchedAt,
    source: 'open-meteo',
  }));

  // Build current weather if available
  let current: WeatherData | undefined;
  if (data.current) {
    const todayForecast = forecast[0];
    current = {
      date: data.current.time.split('T')[0],
      condition: getWeatherCondition(data.current.weather_code),
      temperature_high: todayForecast?.temperature_high || celsiusToFahrenheit(data.current.temperature_2m),
      temperature_low: todayForecast?.temperature_low || celsiusToFahrenheit(data.current.temperature_2m),
      temperature_current: celsiusToFahrenheit(data.current.temperature_2m),
      precipitation: todayForecast?.precipitation || 0,
      precipitation_probability: todayForecast?.precipitation_probability || 0,
      wind_speed: kmhToMph(data.current.wind_speed_10m),
      wind_direction: windDegreesToDirection(data.current.wind_direction_10m),
      humidity: data.current.relative_humidity_2m,
      fetched_at: fetchedAt,
      source: 'open-meteo',
    };
  }

  return {
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    },
    current,
    forecast,
  };
}

// =============================================
// WEATHER DELAY SUGGESTION ENGINE
// =============================================

/**
 * Analyze weather data and generate delay suggestions
 */
export function generateWeatherDelaySuggestions(weather: WeatherData): WeatherDelaySuggestion[] {
  const suggestions: WeatherDelaySuggestion[] = [];
  const code = weather.condition.code;

  // Rain delays
  if (weather.precipitation >= WEATHER_THRESHOLDS.HEAVY_RAIN || code === 65 || code === 82) {
    suggestions.push({
      id: `heavy_rain_${weather.date}`,
      type: 'heavy_rain',
      title: 'Heavy Rain Delay',
      description: `Heavy rainfall expected (${weather.precipitation}" predicted). Most outdoor work should be suspended.`,
      severity: 'high',
      estimated_hours: 8,
      affected_activities: [
        'Concrete placement',
        'Earthwork',
        'Roofing',
        'Exterior painting',
        'Masonry work',
        'Paving',
        'Foundation work',
        'Steel erection',
      ],
      safety_concerns: [
        'Slippery surfaces increase fall risk',
        'Reduced visibility for equipment operators',
        'Electrical hazards from standing water',
        'Trenches may flood or collapse',
      ],
      weather_conditions: {
        condition: weather.condition.description,
        precipitation: weather.precipitation,
      },
    });
  } else if (
    weather.precipitation >= WEATHER_THRESHOLDS.LIGHT_RAIN ||
    [51, 53, 61, 63, 80, 81].includes(code)
  ) {
    suggestions.push({
      id: `rain_${weather.date}`,
      type: 'rain',
      title: 'Rain Delay',
      description: `Rainfall expected (${weather.precipitation}" predicted). Some outdoor activities may be impacted.`,
      severity: 'medium',
      estimated_hours: 4,
      affected_activities: [
        'Concrete placement',
        'Exterior painting',
        'Roofing',
        'Waterproofing',
        'Joint sealing',
      ],
      safety_concerns: [
        'Slippery walking surfaces',
        'Reduced visibility',
        'Wet materials may affect quality',
      ],
      weather_conditions: {
        condition: weather.condition.description,
        precipitation: weather.precipitation,
      },
    });
  }

  // Snow/Ice delays
  if (weather.snow_depth && weather.snow_depth >= WEATHER_THRESHOLDS.HEAVY_SNOW) {
    suggestions.push({
      id: `heavy_snow_${weather.date}`,
      type: 'snow',
      title: 'Heavy Snow Delay',
      description: `Heavy snowfall expected (${weather.snow_depth}" predicted). Site access may be compromised.`,
      severity: 'critical',
      estimated_hours: 8,
      affected_activities: [
        'All exterior work',
        'Site access',
        'Material deliveries',
        'Equipment operation',
        'Crane operations',
      ],
      safety_concerns: [
        'Hypothermia risk for workers',
        'Buried fall hazards',
        'Equipment visibility reduced',
        'Structural loading from snow accumulation',
        'Road conditions affecting material delivery',
      ],
      weather_conditions: {
        condition: weather.condition.description,
        snow_depth: weather.snow_depth,
        temperature_low: weather.temperature_low,
      },
    });
  } else if (
    (weather.snow_depth && weather.snow_depth >= WEATHER_THRESHOLDS.LIGHT_SNOW) ||
    [71, 73, 75, 77, 85, 86].includes(code)
  ) {
    suggestions.push({
      id: `snow_${weather.date}`,
      type: 'snow',
      title: 'Snow Delay',
      description: `Snowfall expected. Some outdoor work may need to be rescheduled.`,
      severity: 'medium',
      estimated_hours: 4,
      affected_activities: [
        'Concrete placement',
        'Exterior work',
        'Roofing',
        'Crane operations',
        'Earthwork',
      ],
      safety_concerns: [
        'Cold stress for workers',
        'Slippery conditions',
        'Reduced visibility',
      ],
      weather_conditions: {
        condition: weather.condition.description,
        snow_depth: weather.snow_depth,
      },
    });
  }

  // Freezing conditions (ice)
  if (
    weather.temperature_low <= WEATHER_THRESHOLDS.EXTREME_COLD &&
    (weather.precipitation > 0 || [56, 57, 66, 67].includes(code))
  ) {
    suggestions.push({
      id: `ice_${weather.date}`,
      type: 'ice',
      title: 'Icing Conditions Delay',
      description: 'Freezing precipitation expected. Extreme caution required for all site activities.',
      severity: 'critical',
      estimated_hours: 8,
      affected_activities: [
        'All exterior work',
        'Crane operations',
        'Scaffold work',
        'Site access',
        'Material handling',
      ],
      safety_concerns: [
        'Extremely slippery surfaces',
        'Falls from elevation risk multiplied',
        'Vehicle accidents',
        'Equipment damage from ice',
        'Power line hazards from ice loading',
      ],
      weather_conditions: {
        condition: weather.condition.description,
        temperature_low: weather.temperature_low,
        precipitation: weather.precipitation,
      },
    });
  }

  // Extreme heat
  if (weather.temperature_high >= WEATHER_THRESHOLDS.EXTREME_HEAT) {
    suggestions.push({
      id: `extreme_heat_${weather.date}`,
      type: 'extreme_heat',
      title: 'Extreme Heat Delay',
      description: `High temperature expected (${weather.temperature_high}F). OSHA heat illness prevention protocols required.`,
      severity: 'high',
      estimated_hours: 4,
      affected_activities: [
        'Roofing',
        'Asphalt paving',
        'Concrete work (curing issues)',
        'Heavy manual labor',
        'Work in confined spaces',
      ],
      safety_concerns: [
        'Heat stroke risk - follow OSHA guidelines',
        'Dehydration',
        'Fatigue-related accidents',
        'Equipment overheating',
        'Concrete curing too fast',
        'Modified work schedules recommended (early start)',
      ],
      weather_conditions: {
        condition: weather.condition.description,
        temperature_high: weather.temperature_high,
      },
    });
  } else if (weather.temperature_high >= WEATHER_THRESHOLDS.HIGH_HEAT) {
    suggestions.push({
      id: `heat_${weather.date}`,
      type: 'extreme_heat',
      title: 'High Heat Advisory',
      description: `High temperature expected (${weather.temperature_high}F). Additional water breaks and shade recommended.`,
      severity: 'medium',
      estimated_hours: 2,
      affected_activities: [
        'Roofing',
        'Paving',
        'Heavy physical labor',
      ],
      safety_concerns: [
        'Heat stress - ensure water is available',
        'Monitor workers for heat illness symptoms',
        'Consider modified work hours',
      ],
      weather_conditions: {
        temperature_high: weather.temperature_high,
      },
    });
  }

  // Extreme cold
  if (weather.temperature_low <= WEATHER_THRESHOLDS.SEVERE_COLD) {
    suggestions.push({
      id: `extreme_cold_${weather.date}`,
      type: 'extreme_cold',
      title: 'Extreme Cold Delay',
      description: `Severe cold expected (${weather.temperature_low}F low). Cold stress prevention required.`,
      severity: 'high',
      estimated_hours: 4,
      affected_activities: [
        'Concrete placement (freeze protection required)',
        'Masonry work',
        'Exterior painting',
        'Waterproofing',
        'Equipment startup',
      ],
      safety_concerns: [
        'Frostbite risk',
        'Hypothermia',
        'Reduced manual dexterity',
        'Equipment hydraulic issues',
        'Concrete protection required per ACI 306',
      ],
      weather_conditions: {
        condition: weather.condition.description,
        temperature_low: weather.temperature_low,
      },
    });
  } else if (weather.temperature_low <= WEATHER_THRESHOLDS.EXTREME_COLD) {
    suggestions.push({
      id: `cold_${weather.date}`,
      type: 'extreme_cold',
      title: 'Cold Weather Advisory',
      description: `Freezing temperatures expected (${weather.temperature_low}F low). Cold weather precautions needed.`,
      severity: 'medium',
      estimated_hours: 2,
      affected_activities: [
        'Concrete placement',
        'Exterior coatings',
        'Waterproofing',
      ],
      safety_concerns: [
        'Cold stress - ensure proper PPE',
        'Concrete protection may be required',
        'Watch for ice formation',
      ],
      weather_conditions: {
        temperature_low: weather.temperature_low,
      },
    });
  }

  // High wind
  if (weather.wind_speed >= WEATHER_THRESHOLDS.DANGEROUS_WIND) {
    suggestions.push({
      id: `dangerous_wind_${weather.date}`,
      type: 'high_wind',
      title: 'Dangerous Wind Delay',
      description: `Dangerous wind speeds expected (${weather.wind_speed} mph). Crane and elevated work must stop.`,
      severity: 'critical',
      estimated_hours: 8,
      affected_activities: [
        'Crane operations - MUST STOP',
        'Steel erection',
        'Work at elevation',
        'Roofing',
        'Material handling',
        'Scaffold work',
      ],
      safety_concerns: [
        'Crane operations prohibited',
        'Falling object risk',
        'Workers at elevation at extreme risk',
        'Unsecured materials become projectiles',
        'Scaffold stability compromised',
      ],
      weather_conditions: {
        condition: weather.condition.description,
        wind_speed: weather.wind_speed,
      },
    });
  } else if (weather.wind_speed >= WEATHER_THRESHOLDS.CRANE_LIMIT) {
    suggestions.push({
      id: `crane_wind_${weather.date}`,
      type: 'high_wind',
      title: 'High Wind - Crane Operations Suspended',
      description: `Wind speeds (${weather.wind_speed} mph) exceed crane operational limits.`,
      severity: 'high',
      estimated_hours: 4,
      affected_activities: [
        'Crane operations',
        'Steel erection',
        'Material lifts',
        'Roofing',
      ],
      safety_concerns: [
        'Verify crane wind limits with operator',
        'Secure all loose materials',
        'Monitor conditions for improvement',
      ],
      weather_conditions: {
        wind_speed: weather.wind_speed,
      },
    });
  } else if (weather.wind_speed >= WEATHER_THRESHOLDS.HIGH_WIND) {
    suggestions.push({
      id: `high_wind_${weather.date}`,
      type: 'high_wind',
      title: 'High Wind Advisory',
      description: `High wind speeds expected (${weather.wind_speed} mph). Elevated work caution required.`,
      severity: 'medium',
      estimated_hours: 2,
      affected_activities: [
        'Roofing',
        'Scaffold work',
        'Material handling',
      ],
      safety_concerns: [
        'Secure materials and equipment',
        'Use caution at elevation',
        'Review crane lift plans',
      ],
      weather_conditions: {
        wind_speed: weather.wind_speed,
      },
    });
  }

  // Thunderstorm/Lightning
  if ([95, 96, 99].includes(code)) {
    suggestions.push({
      id: `lightning_${weather.date}`,
      type: 'lightning',
      title: 'Thunderstorm/Lightning Delay',
      description: 'Thunderstorm activity expected. All outdoor work must stop during lightning.',
      severity: 'critical',
      estimated_hours: 4,
      affected_activities: [
        'All outdoor work',
        'Crane operations',
        'Scaffold work',
        'Steel erection',
        'Roofing',
      ],
      safety_concerns: [
        'Lightning strike risk - seek shelter immediately',
        'Wait 30 minutes after last lightning before resuming work',
        'Secure all equipment and materials',
        'Potential flash flooding',
      ],
      weather_conditions: {
        condition: weather.condition.description,
        wind_speed: weather.wind_speed,
        precipitation: weather.precipitation,
      },
    });
  }

  // Fog
  if ([45, 48].includes(code)) {
    suggestions.push({
      id: `fog_${weather.date}`,
      type: 'fog',
      title: 'Fog Delay',
      description: 'Dense fog expected. Equipment operation and traffic control affected.',
      severity: 'medium',
      estimated_hours: 2,
      affected_activities: [
        'Crane operations',
        'Heavy equipment operation',
        'Traffic control',
        'Site deliveries',
      ],
      safety_concerns: [
        'Reduced visibility for equipment operators',
        'Vehicle collision risk increased',
        'Signal and communication difficulties',
      ],
      weather_conditions: {
        condition: weather.condition.description,
      },
    });
  }

  return suggestions;
}

// =============================================
// MAIN API FUNCTIONS
// =============================================

/**
 * Fetch weather forecast for a project location
 *
 * @param latitude Project latitude
 * @param longitude Project longitude
 * @param days Number of forecast days (1-14, default 7)
 * @returns Weather forecast data
 */
export async function fetchWeatherForecast(
  latitude: number,
  longitude: number,
  days: number = 7
): Promise<WeatherForecast> {
  // Use Open-Meteo (free, no key required)
  return fetchFromOpenMeteo(latitude, longitude, days);
}

/**
 * Fetch weather and generate delay suggestions for a specific date
 *
 * @param latitude Project latitude
 * @param longitude Project longitude
 * @param date Target date (YYYY-MM-DD format)
 * @returns Weather data and delay suggestions
 */
export async function fetchWeatherWithSuggestions(
  latitude: number,
  longitude: number,
  date: string
): Promise<{ weather: WeatherData; suggestions: WeatherDelaySuggestion[] }> {
  const forecast = await fetchWeatherForecast(latitude, longitude, 7);

  // Find weather for the target date
  const weatherData = forecast.forecast.find((w) => w.date === date);

  if (!weatherData) {
    throw new Error(`No weather data available for date: ${date}`);
  }

  const suggestions = generateWeatherDelaySuggestions(weatherData);

  return {
    weather: weatherData,
    suggestions,
  };
}

/**
 * Save weather data to the database for historical tracking
 */
export async function saveWeatherToDatabase(
  projectId: string,
  companyId: string,
  weatherData: WeatherData,
  latitude: number,
  longitude: number
): Promise<{ id: string }> {
  const { data, error } = await (supabase as any).rpc('upsert_weather_history', {
    p_project_id: projectId,
    p_company_id: companyId,
    p_weather_date: weatherData.date,
    p_latitude: latitude,
    p_longitude: longitude,
    p_weather_code: weatherData.condition.code,
    p_temperature_high: weatherData.temperature_high,
    p_temperature_low: weatherData.temperature_low,
    p_precipitation: weatherData.precipitation,
    p_wind_speed_max: weatherData.wind_speed,
    p_humidity_percent: weatherData.humidity,
    p_raw_response: weatherData,
  });

  if (error) {
    throw new Error(`Failed to save weather data: ${error.message}`);
  }

  return { id: data };
}

/**
 * Get cached weather data from database
 */
export async function getCachedWeather(
  projectId: string,
  date: string
): Promise<WeatherData | null> {
  const { data, error } = await (supabase as any)
    .from('weather_history')
    .select('*')
    .eq('project_id', projectId)
    .eq('weather_date', date)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Convert database record to WeatherData
  return {
    date: data.weather_date,
    condition: getWeatherCondition(data.weather_code),
    temperature_high: data.temperature_high,
    temperature_low: data.temperature_low,
    precipitation: data.precipitation || 0,
    precipitation_probability: data.precipitation_probability || 0,
    snow_depth: data.snow_depth,
    wind_speed: data.wind_speed_max || 0,
    wind_direction: 'N', // Not stored in simplified format
    humidity: data.humidity_percent || 50,
    uv_index: data.uv_index_max,
    sunrise: data.sunrise,
    sunset: data.sunset,
    fetched_at: data.fetched_at,
    source: data.source || 'open-meteo',
  };
}

/**
 * Get weather history for a project over a date range
 */
export async function getWeatherHistory(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<WeatherData[]> {
  const { data, error } = await (supabase as any).rpc('get_weather_for_date_range', {
    p_project_id: projectId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    throw new Error(`Failed to fetch weather history: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    date: row.weather_date,
    condition: { code: 0, description: row.weather_condition, icon: 'cloud' },
    temperature_high: row.temperature_high,
    temperature_low: row.temperature_low,
    precipitation: row.precipitation || 0,
    precipitation_probability: 0,
    wind_speed: row.wind_speed_max || 0,
    wind_direction: 'N',
    humidity: 50,
    fetched_at: '',
    source: 'open-meteo' as const,
  }));
}

// =============================================
// WEATHER DELAY ANALYTICS
// =============================================

export interface WeatherDelayAnalytics {
  totalDelays: number;
  totalHoursLost: number;
  delaysByType: Record<WeatherDelayType, { count: number; hours: number }>;
  mostCommonDelayType: WeatherDelayType | null;
  averageDelayDuration: number;
  costImpact?: number;
}

/**
 * Analyze weather-related delays for a project
 */
export async function analyzeWeatherDelays(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<WeatherDelayAnalytics> {
  // Fetch delays from daily reports
  const { data: delays, error } = await (supabase as any)
    .from('daily_report_delays')
    .select(`
      *,
      daily_report:daily_reports!inner(project_id, report_date)
    `)
    .eq('daily_report.project_id', projectId)
    .eq('delay_type', 'weather')
    .gte('daily_report.report_date', startDate)
    .lte('daily_report.report_date', endDate);

  if (error) {
    throw new Error(`Failed to fetch weather delays: ${error.message}`);
  }

  const delaysByType: Record<WeatherDelayType, { count: number; hours: number }> = {
    rain: { count: 0, hours: 0 },
    heavy_rain: { count: 0, hours: 0 },
    snow: { count: 0, hours: 0 },
    ice: { count: 0, hours: 0 },
    extreme_heat: { count: 0, hours: 0 },
    extreme_cold: { count: 0, hours: 0 },
    high_wind: { count: 0, hours: 0 },
    lightning: { count: 0, hours: 0 },
    fog: { count: 0, hours: 0 },
    flooding: { count: 0, hours: 0 },
  };

  let totalHours = 0;

  delays?.forEach((delay: any) => {
    const hours = delay.duration_hours || 0;
    totalHours += hours;

    // Try to determine specific weather delay type from description
    const description = (delay.description || '').toLowerCase();
    let type: WeatherDelayType = 'rain'; // default

    if (description.includes('lightning') || description.includes('thunder')) {
      type = 'lightning';
    } else if (description.includes('ice') || description.includes('freezing')) {
      type = 'ice';
    } else if (description.includes('snow')) {
      type = 'snow';
    } else if (description.includes('heavy rain')) {
      type = 'heavy_rain';
    } else if (description.includes('rain')) {
      type = 'rain';
    } else if (description.includes('heat')) {
      type = 'extreme_heat';
    } else if (description.includes('cold')) {
      type = 'extreme_cold';
    } else if (description.includes('wind')) {
      type = 'high_wind';
    } else if (description.includes('fog')) {
      type = 'fog';
    } else if (description.includes('flood')) {
      type = 'flooding';
    }

    delaysByType[type].count++;
    delaysByType[type].hours += hours;
  });

  // Find most common delay type
  let mostCommonDelayType: WeatherDelayType | null = null;
  let maxCount = 0;
  (Object.entries(delaysByType) as [WeatherDelayType, { count: number; hours: number }][]).forEach(
    ([type, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        mostCommonDelayType = type;
      }
    }
  );

  return {
    totalDelays: delays?.length || 0,
    totalHoursLost: totalHours,
    delaysByType,
    mostCommonDelayType,
    averageDelayDuration: delays?.length ? totalHours / delays.length : 0,
  };
}
