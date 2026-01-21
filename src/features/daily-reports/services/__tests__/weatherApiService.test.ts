/**
 * Weather API Service Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getWeather,
  getWeatherForProject,
  getCurrentLocation,
  formatWeatherDisplay,
  analyzeWeatherImpact,
  clearWeatherCache,
  type WeatherData,
  type GeoLocation,
} from '../weatherApiService';

// Mock fetch
global.fetch = vi.fn();

// Mock import.meta.env
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');

// Mock supabase with auth.getSession
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'test-access-token',
          },
        },
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}));

describe('weatherApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockReset();  // Reset mock implementation queue
    // Clear weather cache before each test
    clearWeatherCache();
    // Ensure Supabase URL is set
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWeather', () => {
    // Edge Function returns already-processed WeatherData
    const mockWeatherResponse: WeatherData = {
      temperature: 72,
      conditions: 'clear sky',
      humidity: 65,
      windSpeed: 12,
      windDirection: 'S',
      precipitation: 0,
      icon: 'sun',
      fetchedAt: new Date().toISOString(),
    };

    it('should fetch weather data successfully', async () => {
      const location: GeoLocation = { latitude: 40.71, longitude: -74.01 };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse,
      } as Response);

      const result = await getWeather(location);

      expect(result).toBeDefined();
      expect(result.temperature).toBe(72);
      expect(result.conditions).toBe('clear sky');
      expect(result.humidity).toBe(65);
      expect(result.windSpeed).toBe(12);
      expect(result.windDirection).toBe('S');
      expect(result.fetchedAt).toBeDefined();
    });

    it('should return freezing temperature correctly', async () => {
      const location: GeoLocation = { latitude: 41.00, longitude: -74.00 };
      const freezingWeather: WeatherData = {
        ...mockWeatherResponse,
        temperature: 32,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => freezingWeather,
      } as Response);

      const result = await getWeather(location);
      expect(result.temperature).toBe(32);
    });

    it('should return wind speed correctly', async () => {
      const location: GeoLocation = { latitude: 42.00, longitude: -74.00 };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse,
      } as Response);

      const result = await getWeather(location);
      expect(result.windSpeed).toBe(12);
    });

    it('should return wind direction correctly', async () => {
      const testDirections = ['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW'];

      // Use different locations for each direction to avoid cache
      let latOffset = 0;
      for (const direction of testDirections) {
        const location: GeoLocation = { latitude: 50.00 + latOffset, longitude: -80.00 };
        latOffset += 1;

        const response: WeatherData = {
          ...mockWeatherResponse,
          windDirection: direction,
        };

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => response,
        } as Response);

        const result = await getWeather(location);
        expect(result.windDirection).toBe(direction);
      }
    });

    it('should handle precipitation data', async () => {
      const location: GeoLocation = { latitude: 43.00, longitude: -74.00 };
      const rainyResponse: WeatherData = {
        ...mockWeatherResponse,
        precipitation: 5.5,
        conditions: 'light rain',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => rainyResponse,
      } as Response);

      const result = await getWeather(location);
      expect(result.precipitation).toBe(5.5);
    });

    it('should handle snow as precipitation', async () => {
      const location: GeoLocation = { latitude: 44.00, longitude: -74.00 };
      const snowyResponse: WeatherData = {
        ...mockWeatherResponse,
        precipitation: 3.0,
        conditions: 'snow',
        icon: 'snowflake',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => snowyResponse,
      } as Response);

      const result = await getWeather(location);
      expect(result.precipitation).toBe(3.0);
    });

    it('should cache weather data', async () => {
      const location: GeoLocation = { latitude: 60.00, longitude: -90.00 };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWeatherResponse,
      } as Response);

      // First call - should fetch
      await getWeather(location);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result = await getWeather(location);
      expect(fetch).toHaveBeenCalledTimes(1); // Still 1, not 2
      expect(result).toBeDefined();
    });

    it('should throw error when not authenticated', async () => {
      const location: GeoLocation = { latitude: 70.00, longitude: -100.00 };

      // Mock supabase to return no session
      const { supabase } = await import('@/lib/supabase');
      vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(getWeather(location)).rejects.toThrow(
        'Not authenticated'
      );
    });

    it('should handle API errors', async () => {
      const location: GeoLocation = { latitude: 45.00, longitude: -75.00 };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Service unavailable' }),
      } as Response);

      await expect(getWeather(location)).rejects.toThrow('Weather API error');
    });
  });

  describe('formatWeatherDisplay', () => {
    it('should format weather data correctly', () => {
      const weather: WeatherData = {
        temperature: 75,
        conditions: 'partly cloudy',
        humidity: 60,
        windSpeed: 12,
        windDirection: 'NE',
        precipitation: 0,
        icon: 'cloud',
        fetchedAt: new Date().toISOString(),
      };

      const result = formatWeatherDisplay(weather);
      expect(result).toBe('75°F, partly cloudy, Wind: 12 mph NE');
    });
  });

  describe('analyzeWeatherImpact', () => {
    it('should detect no impact for ideal conditions', () => {
      const weather: WeatherData = {
        temperature: 72,
        conditions: 'clear sky',
        humidity: 50,
        windSpeed: 8,
        windDirection: 'N',
        precipitation: 0,
        icon: 'sun',
        fetchedAt: new Date().toISOString(),
      };

      const result = analyzeWeatherImpact(weather);
      expect(result.hasImpact).toBe(false);
      expect(result.severity).toBe('none');
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect freezing conditions', () => {
      const weather: WeatherData = {
        temperature: 28,
        conditions: 'clear',
        humidity: 40,
        windSpeed: 10,
        windDirection: 'N',
        precipitation: 0,
        icon: 'sun',
        fetchedAt: new Date().toISOString(),
      };

      const result = analyzeWeatherImpact(weather);
      expect(result.hasImpact).toBe(true);
      expect(result.severity).toBe('moderate');
      expect(result.warnings).toContain(
        'Freezing conditions may affect concrete work and equipment'
      );
    });

    it('should detect extreme heat', () => {
      const weather: WeatherData = {
        temperature: 98,
        conditions: 'clear',
        humidity: 80,
        windSpeed: 5,
        windDirection: 'S',
        precipitation: 0,
        icon: 'sun',
        fetchedAt: new Date().toISOString(),
      };

      const result = analyzeWeatherImpact(weather);
      expect(result.hasImpact).toBe(true);
      expect(result.severity).toBe('minor');
      expect(result.warnings).toContain(
        'Extreme heat may require additional worker breaks'
      );
    });

    it('should detect high winds as severe', () => {
      const weather: WeatherData = {
        temperature: 70,
        conditions: 'clear',
        humidity: 50,
        windSpeed: 40,
        windDirection: 'W',
        precipitation: 0,
        icon: 'wind',
        fetchedAt: new Date().toISOString(),
      };

      const result = analyzeWeatherImpact(weather);
      expect(result.hasImpact).toBe(true);
      expect(result.severity).toBe('severe');
      expect(result.warnings).toContain(
        'High winds may affect crane operations and elevated work'
      );
    });

    it('should detect moderate winds', () => {
      const weather: WeatherData = {
        temperature: 70,
        conditions: 'clear',
        humidity: 50,
        windSpeed: 25,
        windDirection: 'W',
        precipitation: 0,
        icon: 'wind',
        fetchedAt: new Date().toISOString(),
      };

      const result = analyzeWeatherImpact(weather);
      expect(result.hasImpact).toBe(true);
      expect(result.severity).toBe('minor');
      expect(result.warnings).toContain('Moderate winds may affect certain operations');
    });

    it('should detect thunderstorm as severe', () => {
      const weather: WeatherData = {
        temperature: 75,
        conditions: 'thunderstorm with heavy rain',
        humidity: 90,
        windSpeed: 30,
        windDirection: 'SW',
        precipitation: 15,
        icon: 'cloud-lightning',
        fetchedAt: new Date().toISOString(),
      };

      const result = analyzeWeatherImpact(weather);
      expect(result.hasImpact).toBe(true);
      expect(result.severity).toBe('severe');
      expect(result.warnings).toContain(
        'Thunderstorm conditions - suspend all outdoor work'
      );
    });

    it('should detect heavy precipitation', () => {
      const weather: WeatherData = {
        temperature: 65,
        conditions: 'heavy rain',
        humidity: 95,
        windSpeed: 15,
        windDirection: 'E',
        precipitation: 20,
        icon: 'cloud-rain',
        fetchedAt: new Date().toISOString(),
      };

      const result = analyzeWeatherImpact(weather);
      expect(result.hasImpact).toBe(true);
      expect(result.severity).toBe('moderate');
      expect(result.warnings).toContain(
        'Heavy precipitation may suspend outdoor activities'
      );
    });

    it('should detect light precipitation', () => {
      const weather: WeatherData = {
        temperature: 68,
        conditions: 'light rain',
        humidity: 75,
        windSpeed: 10,
        windDirection: 'SE',
        precipitation: 2,
        icon: 'cloud-drizzle',
        fetchedAt: new Date().toISOString(),
      };

      const result = analyzeWeatherImpact(weather);
      expect(result.hasImpact).toBe(true);
      expect(result.severity).toBe('minor');
      expect(result.warnings).toContain('Precipitation may affect certain work activities');
    });

    it('should handle multiple weather impacts', () => {
      const weather: WeatherData = {
        temperature: 30,
        conditions: 'snow',
        humidity: 80,
        windSpeed: 40, // Higher wind speed to trigger severe
        windDirection: 'N',
        precipitation: 5,
        icon: 'snowflake',
        fetchedAt: new Date().toISOString(),
      };

      const result = analyzeWeatherImpact(weather);
      expect(result.hasImpact).toBe(true);
      expect(result.severity).toBe('severe'); // Wind > 35 should trigger severe
      expect(result.warnings.length).toBeGreaterThan(1);
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current location from browser', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 40.7128,
              longitude: -74.006,
            },
          });
        }),
      };

      vi.stubGlobal('navigator', {
        geolocation: mockGeolocation,
      });

      const result = await getCurrentLocation();
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.006);
    });

    it('should handle geolocation errors', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success, error) => {
          error({ message: 'User denied geolocation' });
        }),
      };

      vi.stubGlobal('navigator', {
        geolocation: mockGeolocation,
      });

      await expect(getCurrentLocation()).rejects.toThrow('Geolocation error');
    });

    it('should handle missing geolocation support', async () => {
      vi.stubGlobal('navigator', {});

      await expect(getCurrentLocation()).rejects.toThrow(
        'Geolocation is not supported by this browser'
      );
    });
  });
});
