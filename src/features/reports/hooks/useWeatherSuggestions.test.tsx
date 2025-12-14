/**
 * Tests for Weather Delay Auto-Suggestion Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: 'test-id', error: null }),
  },
}));

// Mock useAuth
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      company_id: 'company-456',
    },
  }),
}));

import {
  useWeatherForecast,
  useWeatherSuggestions,
  useCurrentWeather,
  useGenerateSuggestions,
  getDelayTemplate,
  formatWeatherDisplay,
  shouldSuggestDelay,
  getWeatherSeverity,
  WEATHER_THRESHOLDS,
  WEATHER_DELAY_TEMPLATES,
} from './useWeatherSuggestions';
import {
  generateWeatherDelaySuggestions,
  type WeatherData,
} from '@/lib/api/services/weather';

// =============================================
// Test Utilities
// =============================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
);

// Mock Open-Meteo API response
const mockOpenMeteoResponse = {
  latitude: 40.7128,
  longitude: -74.006,
  timezone: 'America/New_York',
  current: {
    time: '2024-01-15T10:00',
    temperature_2m: 5,
    relative_humidity_2m: 75,
    weather_code: 61, // Rain
    wind_speed_10m: 25,
    wind_direction_10m: 180,
  },
  daily: {
    time: ['2024-01-15', '2024-01-16', '2024-01-17'],
    weather_code: [61, 71, 0],
    temperature_2m_max: [10, 5, 15],
    temperature_2m_min: [2, -5, 5],
    precipitation_sum: [15, 25, 0],
    precipitation_probability_max: [80, 90, 10],
    wind_speed_10m_max: [30, 20, 15],
    wind_gusts_10m_max: [50, 35, 25],
    wind_direction_10m_dominant: [180, 270, 90],
    sunrise: ['2024-01-15T07:00', '2024-01-16T07:01', '2024-01-17T07:02'],
    sunset: ['2024-01-15T17:00', '2024-01-16T17:01', '2024-01-17T17:02'],
    uv_index_max: [2, 1, 3],
    snowfall_sum: [0, 10, 0],
  },
};

// Test weather data
const createWeatherData = (overrides: Partial<WeatherData> = {}): WeatherData => ({
  date: '2024-01-15',
  condition: { code: 0, description: 'Clear sky', icon: 'sun' },
  temperature_high: 75,
  temperature_low: 55,
  precipitation: 0,
  precipitation_probability: 10,
  wind_speed: 10,
  wind_direction: 'N',
  humidity: 50,
  fetched_at: new Date().toISOString(),
  source: 'open-meteo',
  ...overrides,
});

// =============================================
// Weather Forecast Hook Tests
// =============================================

describe('useWeatherForecast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpenMeteoResponse),
    });
  });

  it('should fetch weather forecast successfully', async () => {
    const { result } = renderHook(
      () => useWeatherForecast(40.7128, -74.006),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalled();
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.forecast).toHaveLength(3);
  });

  it('should not fetch when coordinates are undefined', async () => {
    const { result } = renderHook(
      () => useWeatherForecast(undefined, undefined),
      { wrapper }
    );

    await new Promise((r) => setTimeout(r, 100));

    expect(result.current.isLoading).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useWeatherForecast(40.7128, -74.006),
      { wrapper }
    );

    // Wait for the query to settle
    await waitFor(() => expect(result.current.isFetching).toBe(false), {
      timeout: 5000,
    });

    // The query should have failed
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeDefined();
  });
});

// =============================================
// Weather Suggestions Hook Tests
// =============================================

describe('useWeatherSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpenMeteoResponse),
    });
  });

  it('should fetch weather and generate suggestions', async () => {
    const { result } = renderHook(
      () => useWeatherSuggestions(40.7128, -74.006, '2024-01-15'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.weather).toBeDefined();
    expect(result.current.data?.suggestions).toBeDefined();
  });

  it('should not fetch when date is undefined', async () => {
    const { result } = renderHook(
      () => useWeatherSuggestions(40.7128, -74.006, undefined),
      { wrapper }
    );

    await new Promise((r) => setTimeout(r, 100));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// =============================================
// Weather Delay Suggestion Generation Tests
// =============================================

describe('generateWeatherDelaySuggestions', () => {
  it('should return empty array for good weather', () => {
    const weather = createWeatherData();
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions).toHaveLength(0);
  });

  it('should suggest rain delay for moderate rain', () => {
    const weather = createWeatherData({
      condition: { code: 63, description: 'Moderate rain', icon: 'cloud-rain' },
      precipitation: 0.3,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((s) => s.type === 'rain')).toBe(true);
  });

  it('should suggest heavy rain delay for heavy precipitation', () => {
    const weather = createWeatherData({
      condition: { code: 65, description: 'Heavy rain', icon: 'cloud-showers-heavy' },
      precipitation: 1.0,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions.some((s) => s.type === 'heavy_rain')).toBe(true);
    expect(suggestions.find((s) => s.type === 'heavy_rain')?.severity).toBe('high');
  });

  it('should suggest snow delay for snow conditions', () => {
    const weather = createWeatherData({
      condition: { code: 73, description: 'Moderate snow', icon: 'cloud-snow' },
      snow_depth: 3,
      temperature_low: 28,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions.some((s) => s.type === 'snow')).toBe(true);
  });

  it('should suggest extreme heat delay for high temperatures', () => {
    const weather = createWeatherData({
      temperature_high: 98,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions.some((s) => s.type === 'extreme_heat')).toBe(true);
    expect(suggestions.find((s) => s.type === 'extreme_heat')?.severity).toBe('high');
  });

  it('should suggest extreme cold delay for freezing temperatures', () => {
    const weather = createWeatherData({
      temperature_low: 15,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions.some((s) => s.type === 'extreme_cold')).toBe(true);
  });

  it('should suggest high wind delay for dangerous winds', () => {
    const weather = createWeatherData({
      wind_speed: 45,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions.some((s) => s.type === 'high_wind')).toBe(true);
    expect(suggestions.find((s) => s.type === 'high_wind')?.severity).toBe('critical');
  });

  it('should suggest crane wind suspension at crane limit', () => {
    const weather = createWeatherData({
      wind_speed: 32,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions.some((s) => s.type === 'high_wind')).toBe(true);
    expect(
      suggestions.some((s) => s.title.toLowerCase().includes('crane'))
    ).toBe(true);
  });

  it('should suggest lightning delay for thunderstorms', () => {
    const weather = createWeatherData({
      condition: { code: 95, description: 'Thunderstorm', icon: 'cloud-bolt' },
      precipitation: 0.5,
      wind_speed: 30,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions.some((s) => s.type === 'lightning')).toBe(true);
    expect(suggestions.find((s) => s.type === 'lightning')?.severity).toBe('critical');
  });

  it('should suggest ice delay for freezing precipitation', () => {
    const weather = createWeatherData({
      condition: { code: 66, description: 'Light freezing rain', icon: 'cloud-sleet' },
      temperature_low: 28,
      precipitation: 0.2,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    expect(suggestions.some((s) => s.type === 'ice')).toBe(true);
    expect(suggestions.find((s) => s.type === 'ice')?.severity).toBe('critical');
  });

  it('should include affected activities in suggestions', () => {
    const weather = createWeatherData({
      condition: { code: 65, description: 'Heavy rain', icon: 'cloud-showers-heavy' },
      precipitation: 1.0,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);
    const rainSuggestion = suggestions.find((s) => s.type === 'heavy_rain');

    expect(rainSuggestion?.affected_activities).toBeDefined();
    expect(rainSuggestion?.affected_activities.length).toBeGreaterThan(0);
  });

  it('should include safety concerns in suggestions', () => {
    const weather = createWeatherData({
      wind_speed: 45,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);
    const windSuggestion = suggestions.find((s) => s.type === 'high_wind');

    expect(windSuggestion?.safety_concerns).toBeDefined();
    expect(windSuggestion?.safety_concerns.length).toBeGreaterThan(0);
  });

  it('should handle multiple weather conditions', () => {
    const weather = createWeatherData({
      condition: { code: 95, description: 'Thunderstorm', icon: 'cloud-bolt' },
      temperature_high: 96,
      wind_speed: 35,
      precipitation: 0.8,
    });
    const suggestions = generateWeatherDelaySuggestions(weather);

    // Should have multiple suggestions for multiple conditions
    expect(suggestions.length).toBeGreaterThan(1);
    expect(suggestions.some((s) => s.type === 'lightning')).toBe(true);
    expect(suggestions.some((s) => s.type === 'high_wind')).toBe(true);
    expect(suggestions.some((s) => s.type === 'extreme_heat')).toBe(true);
  });
});

// =============================================
// Utility Function Tests
// =============================================

describe('getDelayTemplate', () => {
  it('should return template for rain delay', () => {
    const template = getDelayTemplate('rain');

    expect(template.description).toBeDefined();
    expect(template.affected_activities).toBeDefined();
    expect(template.safety_concerns).toBeDefined();
  });

  it('should return template for all delay types', () => {
    const delayTypes = [
      'rain',
      'heavy_rain',
      'snow',
      'ice',
      'extreme_heat',
      'extreme_cold',
      'high_wind',
      'lightning',
      'fog',
      'flooding',
    ] as const;

    delayTypes.forEach((type) => {
      const template = getDelayTemplate(type);
      expect(template.description).toBeDefined();
    });
  });
});

describe('formatWeatherDisplay', () => {
  it('should format weather data for display', () => {
    const weather = createWeatherData({
      condition: { code: 0, description: 'Clear sky', icon: 'sun' },
      temperature_high: 75,
      temperature_low: 55,
    });
    const display = formatWeatherDisplay(weather);

    expect(display).toContain('Clear sky');
    expect(display).toContain('75');
    expect(display).toContain('55');
  });

  it('should include precipitation when present', () => {
    const weather = createWeatherData({
      precipitation: 0.5,
    });
    const display = formatWeatherDisplay(weather);

    expect(display).toContain('0.5');
    expect(display).toContain('Precip');
  });

  it('should include wind when above threshold', () => {
    const weather = createWeatherData({
      wind_speed: 30,
    });
    const display = formatWeatherDisplay(weather);

    expect(display).toContain('30');
    expect(display).toContain('mph');
  });
});

describe('shouldSuggestDelay', () => {
  it('should return false for good weather', () => {
    const weather = createWeatherData();
    expect(shouldSuggestDelay(weather)).toBe(false);
  });

  it('should return true for bad weather', () => {
    const weather = createWeatherData({
      precipitation: 1.0,
    });
    expect(shouldSuggestDelay(weather)).toBe(true);
  });
});

describe('getWeatherSeverity', () => {
  it('should return none for good weather', () => {
    const weather = createWeatherData();
    expect(getWeatherSeverity(weather)).toBe('none');
  });

  it('should return critical for dangerous conditions', () => {
    const weather = createWeatherData({
      condition: { code: 95, description: 'Thunderstorm', icon: 'cloud-bolt' },
    });
    expect(getWeatherSeverity(weather)).toBe('critical');
  });

  it('should return high for extreme heat', () => {
    const weather = createWeatherData({
      temperature_high: 98,
    });
    expect(getWeatherSeverity(weather)).toBe('high');
  });

  it('should return highest severity among multiple conditions', () => {
    const weather = createWeatherData({
      condition: { code: 95, description: 'Thunderstorm', icon: 'cloud-bolt' },
      temperature_high: 90, // Would be medium
    });
    // Should return critical (from thunderstorm), not medium (from heat)
    expect(getWeatherSeverity(weather)).toBe('critical');
  });
});

// =============================================
// Weather Thresholds Tests
// =============================================

describe('WEATHER_THRESHOLDS', () => {
  it('should have all required threshold values', () => {
    expect(WEATHER_THRESHOLDS.EXTREME_HEAT).toBeDefined();
    expect(WEATHER_THRESHOLDS.EXTREME_COLD).toBeDefined();
    expect(WEATHER_THRESHOLDS.HIGH_WIND).toBeDefined();
    expect(WEATHER_THRESHOLDS.CRANE_LIMIT).toBeDefined();
    expect(WEATHER_THRESHOLDS.HEAVY_RAIN).toBeDefined();
    expect(WEATHER_THRESHOLDS.HEAVY_SNOW).toBeDefined();
  });

  it('should have reasonable values for construction industry', () => {
    // OSHA heat stress starts at 80F, extreme at 95F
    expect(WEATHER_THRESHOLDS.EXTREME_HEAT).toBeGreaterThanOrEqual(90);

    // Concrete cannot cure below 40F, extreme cold at 32F or below
    expect(WEATHER_THRESHOLDS.EXTREME_COLD).toBeLessThanOrEqual(35);

    // Most cranes have 25-35 mph limits
    expect(WEATHER_THRESHOLDS.CRANE_LIMIT).toBeGreaterThanOrEqual(25);
    expect(WEATHER_THRESHOLDS.CRANE_LIMIT).toBeLessThanOrEqual(40);
  });
});

// =============================================
// Delay Templates Tests
// =============================================

describe('WEATHER_DELAY_TEMPLATES', () => {
  it('should have templates for all weather delay types', () => {
    expect(WEATHER_DELAY_TEMPLATES.rain).toBeDefined();
    expect(WEATHER_DELAY_TEMPLATES.heavy_rain).toBeDefined();
    expect(WEATHER_DELAY_TEMPLATES.snow).toBeDefined();
    expect(WEATHER_DELAY_TEMPLATES.ice).toBeDefined();
    expect(WEATHER_DELAY_TEMPLATES.extreme_heat).toBeDefined();
    expect(WEATHER_DELAY_TEMPLATES.extreme_cold).toBeDefined();
    expect(WEATHER_DELAY_TEMPLATES.high_wind).toBeDefined();
    expect(WEATHER_DELAY_TEMPLATES.lightning).toBeDefined();
    expect(WEATHER_DELAY_TEMPLATES.fog).toBeDefined();
    expect(WEATHER_DELAY_TEMPLATES.flooding).toBeDefined();
  });

  it('should have required fields in each template', () => {
    Object.values(WEATHER_DELAY_TEMPLATES).forEach((template) => {
      expect(template.description).toBeDefined();
      expect(template.description.length).toBeGreaterThan(10);
      expect(template.affected_activities).toBeDefined();
      expect(template.safety_concerns).toBeDefined();
    });
  });
});
