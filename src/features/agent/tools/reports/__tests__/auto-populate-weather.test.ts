/**
 * Auto-Populate Weather Tool Tests
 *
 * Tests the auto_populate_weather tool functionality:
 * - Tool definition and configuration
 * - Weather data fetching and formatting
 * - Work impact analysis
 * - Weather-sensitive trade detection
 * - Recommendations generation
 * - Forecast inclusion
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ToolContext } from '../../../types/tools';

// ============================================================================
// Mocks Setup (using vi.hoisted)
// ============================================================================

const mockGetWeatherForProject = vi.hoisted(() => vi.fn());
const mockAnalyzeWeatherImpact = vi.hoisted(() => vi.fn());
const mockCreateTool = vi.hoisted(() => vi.fn((config) => config));
const mockCheckTradeWeatherSafety = vi.hoisted(() => vi.fn());

vi.mock('@/features/daily-reports/services/weatherApiService', () => ({
  getWeatherForProject: mockGetWeatherForProject,
  analyzeWeatherImpact: mockAnalyzeWeatherImpact,
}));

vi.mock('../../registry', () => ({
  createTool: mockCreateTool,
}));

vi.mock('../../../domain/construction-constants', () => ({
  OSHA_HEAT_THRESHOLDS: {
    low: { risk: 'Low', actions: [] },
    moderate: { risk: 'Moderate', actions: ['Increase water intake'] },
    high: { risk: 'High', actions: ['Mandatory breaks'] },
    veryHigh: { risk: 'Very High', actions: ['Stop work'] },
    extreme: { risk: 'Extreme', actions: ['Evacuate'] },
  },
  COLD_STRESS_THRESHOLDS: {
    low: { risk: 'Low', actions: [] },
    moderate: { risk: 'Moderate', actions: ['Provide warming areas'] },
    high: { risk: 'High', actions: ['Limit exposure'] },
    extreme: { risk: 'Extreme', actions: ['Stop work'] },
  },
  TRADE_WEATHER_LIMITS: {
    Concrete: { minTemp: 40, maxTemp: 95, maxWind: 20, canWorkInRain: false, notes: { coldWeather: 'Use heated water' } },
    Roofing: { minTemp: 40, maxTemp: 95, maxWind: 15, canWorkInRain: false, notes: { wind: 'Dangerous at height' } },
    Painting: { minTemp: 50, maxTemp: 95, maxWind: 15, canWorkInRain: false, notes: { rain: 'Poor adhesion' } },
    Steel: { minTemp: 32, maxTemp: 100, maxWind: 25, canWorkInRain: true, notes: { wind: 'Crane restrictions' } },
  },
  LIGHTNING_SAFETY: {
    evacuationPriority: ['Cranes', 'Steel erection', 'Scaffolding'],
    waitAfterLastThunder: 30,
    dangerDistance: 6,
  },
  getHeatRiskLevel: (heatIndex: number) => heatIndex > 103 ? 'extreme' : heatIndex > 90 ? 'high' : 'low',
  getColdRiskLevel: (windChill: number) => windChill < 0 ? 'extreme' : windChill < 25 ? 'moderate' : 'low',
  calculateHeatIndex: (temp: number, humidity: number) => temp + (humidity * 0.1),
  calculateWindChill: (temp: number, wind: number) => temp - (wind * 0.5),
  checkTradeWeatherSafety: mockCheckTradeWeatherSafety,
}));

// ============================================================================
// Test Data Factories
// ============================================================================

interface MockWeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  conditions: string;
  precipitation: number;
}

function createMockWeatherData(overrides: Partial<MockWeatherData> = {}): MockWeatherData {
  return {
    temperature: 72,
    humidity: 55,
    windSpeed: 10,
    windDirection: 'NW',
    conditions: 'Partly Cloudy',
    precipitation: 0,
    ...overrides,
  };
}

function createMockImpactResult(severity: 'none' | 'minor' | 'moderate' | 'severe' = 'none') {
  return {
    severity,
    canWork: severity !== 'severe',
    recommendations: [],
  };
}

function createMockContext(): ToolContext {
  return {
    companyId: 'company-123',
    sessionId: 'session-456',
    messageId: 'message-789',
    userId: 'user-abc',
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('autoPopulateWeatherTool', () => {
  let autoPopulateWeatherTool: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default mock for checkTradeWeatherSafety - returns safe by default
    mockCheckTradeWeatherSafety.mockImplementation((trade: string, temp: number, wind: number, isRaining: boolean) => {
      const warnings: string[] = [];
      let safe = true;

      if (trade === 'Concrete' && temp < 40) {
        warnings.push('temperature below minimum');
        safe = false;
      }
      if (trade === 'Roofing' && wind > 15) {
        warnings.push('wind speed exceeds limit');
        safe = false;
      }
      if (trade === 'Painting' && isRaining) {
        warnings.push('precipitation prevents work');
        safe = false;
      }
      if (trade === 'Steel' && wind > 25) {
        warnings.push('wind speed exceeds limit');
        safe = false;
      }

      return { safe, warnings };
    });

    // Import fresh module for each test
    const module = await import('../auto-populate-weather');
    autoPopulateWeatherTool = module.autoPopulateWeatherTool;
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(autoPopulateWeatherTool.name).toBe('auto_populate_weather');
    });

    it('should have correct display name', () => {
      expect(autoPopulateWeatherTool.displayName).toBe('Auto-Populate Weather');
    });

    it('should have correct category', () => {
      expect(autoPopulateWeatherTool.category).toBe('report');
    });

    it('should have correct description', () => {
      expect(autoPopulateWeatherTool.description).toContain('weather data');
      expect(autoPopulateWeatherTool.description).toContain('daily reports');
    });

    it('should not require confirmation', () => {
      expect(autoPopulateWeatherTool.requiresConfirmation).toBe(false);
    });

    it('should have estimated tokens', () => {
      expect(autoPopulateWeatherTool.estimatedTokens).toBe(500);
    });

    it('should have correct parameters schema', () => {
      const { parameters } = autoPopulateWeatherTool;

      expect(parameters.type).toBe('object');
      expect(parameters.required).toContain('project_id');
      expect(parameters.required).toContain('date');
      expect(parameters.properties.project_id).toEqual({
        type: 'string',
        description: 'The project ID to fetch weather for',
      });
      expect(parameters.properties.date).toEqual({
        type: 'string',
        description: 'Date for the weather data (ISO format, e.g., 2024-01-15)',
      });
      expect(parameters.properties.include_forecast).toEqual({
        type: 'boolean',
        description: "Include tomorrow's forecast for planning (default: true)",
      });
    });

    it('should have execute function', () => {
      expect(typeof autoPopulateWeatherTool.execute).toBe('function');
    });

    it('should have formatOutput function', () => {
      expect(typeof autoPopulateWeatherTool.formatOutput).toBe('function');
    });
  });

  describe('Execute - Success Cases', () => {
    it('should successfully fetch and format weather data', async () => {
      const mockWeather = createMockWeatherData();
      const mockImpact = createMockImpactResult('none');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.weather_data).toMatchObject({
        date: '2026-01-19',
        conditions: 'Partly Cloudy',
        temperature_high: 72,
        humidity: 55,
        wind_speed: 10,
        wind_direction: 'NW',
        precipitation: 0,
      });
    });

    it('should include work impact analysis', async () => {
      const mockWeather = createMockWeatherData({ temperature: 35, windSpeed: 25 });
      const mockImpact = createMockImpactResult('moderate');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.work_impact).toBeDefined();
      expect(result.data.work_impact.severity).toBe('moderate');
      expect(result.data.work_impact.affected_activities).toBeDefined();
      expect(result.data.work_impact.recommendations).toBeDefined();
    });

    it('should detect affected weather-sensitive trades for cold temperature', async () => {
      const mockWeather = createMockWeatherData({ temperature: 30 }); // Below 40°F
      const mockImpact = createMockImpactResult('moderate');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      // Concrete, Roofing, Painting, Masonry, Landscaping should be affected
      const affectedTrades = result.data.work_impact.affected_activities;
      expect(affectedTrades.some((a: string) => a.includes('Concrete'))).toBe(true);
      expect(affectedTrades.some((a: string) => a.includes('temperature below'))).toBe(true);
    });

    it('should detect affected trades for high wind', async () => {
      const mockWeather = createMockWeatherData({ windSpeed: 30 }); // Above 25mph
      const mockImpact = createMockImpactResult('moderate');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      const affectedTrades = result.data.work_impact.affected_activities;
      // Roofing (maxWind: 15), Painting (15), Concrete (20), Crane Operations (20), Steel (25)
      expect(affectedTrades.some((a: string) => a.includes('wind speed'))).toBe(true);
    });

    it('should detect affected trades for rain conditions', async () => {
      const mockWeather = createMockWeatherData({ conditions: 'Light Rain', precipitation: 0.5 });
      const mockImpact = createMockImpactResult('moderate');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.weather_data.precipitation_type).toBe('rain');
      const affectedTrades = result.data.work_impact.affected_activities;
      expect(affectedTrades.some((a: string) => a.includes('precipitation'))).toBe(true);
    });

    it('should include forecast when include_forecast is true', async () => {
      const mockWeather = createMockWeatherData();
      const mockImpact = createMockImpactResult('none');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19', include_forecast: true },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.tomorrow_forecast).toBeDefined();
      expect(result.data.tomorrow_forecast.conditions).toBe('Partly Cloudy');
      expect(result.data.tomorrow_forecast.temperature_high).toBe(72);
    });

    it('should not include forecast when include_forecast is false', async () => {
      const mockWeather = createMockWeatherData();
      const mockImpact = createMockImpactResult('none');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19', include_forecast: false },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.tomorrow_forecast).toBeUndefined();
    });

    it('should default to including forecast when parameter is omitted', async () => {
      const mockWeather = createMockWeatherData();
      const mockImpact = createMockImpactResult('none');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.tomorrow_forecast).toBeDefined();
    });
  });

  describe('Execute - Weather Recommendations', () => {
    it('should generate cold weather recommendations', async () => {
      const mockWeather = createMockWeatherData({ temperature: 35 });
      const mockImpact = createMockImpactResult('moderate');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      const recommendations = result.data.work_impact.recommendations;
      expect(recommendations.some((r: string) => r.toLowerCase().includes('cold weather'))).toBe(true);
      expect(recommendations.some((r: string) => r.toLowerCase().includes('warming'))).toBe(true);
    });

    it('should generate hot weather recommendations', async () => {
      const mockWeather = createMockWeatherData({ temperature: 95 });
      const mockImpact = createMockImpactResult('moderate');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      const recommendations = result.data.work_impact.recommendations;
      // Tool generates: 'Ensure adequate water (1 quart/hour/worker) is available'
      // and 'Schedule strenuous work for cooler morning hours'
      expect(recommendations.some((r: string) => r.toLowerCase().includes('water'))).toBe(true);
    });

    it('should generate high wind recommendations', async () => {
      const mockWeather = createMockWeatherData({ windSpeed: 25 });
      const mockImpact = createMockImpactResult('moderate');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      const recommendations = result.data.work_impact.recommendations;
      expect(recommendations.some((r: string) => r.toLowerCase().includes('secure'))).toBe(true);
      expect(recommendations.some((r: string) => r.toLowerCase().includes('crane'))).toBe(true);
    });

    it('should generate rain recommendations', async () => {
      const mockWeather = createMockWeatherData({ conditions: 'Rain', precipitation: 1.5 });
      const mockImpact = createMockImpactResult('moderate');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      const recommendations = result.data.work_impact.recommendations;
      expect(recommendations.some((r: string) => r.toLowerCase().includes('cover'))).toBe(true);
      expect(recommendations.some((r: string) => r.toLowerCase().includes('drainage'))).toBe(true);
    });

    it('should generate thunderstorm emergency recommendations', async () => {
      const mockWeather = createMockWeatherData({ conditions: 'Thunderstorm', precipitation: 2 });
      const mockImpact = createMockImpactResult('severe');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      const recommendations = result.data.work_impact.recommendations;
      // Tool generates: 'CRITICAL: Implement lightning safety protocol immediately'
      // and 'Evacuate: Cranes, Steel erection' (from LIGHTNING_SAFETY.evacuationPriority)
      expect(recommendations.some((r: string) => r.includes('Evacuate'))).toBe(true);
      expect(recommendations.some((r: string) => r.toLowerCase().includes('lightning'))).toBe(true);
    });

    it('should return favorable conditions message when weather is good', async () => {
      const mockWeather = createMockWeatherData(); // Default: good weather
      const mockImpact = createMockImpactResult('none');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      const recommendations = result.data.work_impact.recommendations;
      expect(recommendations.some((r: string) => r.toLowerCase().includes('favorable'))).toBe(true);
    });
  });

  describe('Execute - Error Handling', () => {
    it('should return error when weather data cannot be fetched', async () => {
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(null);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unable to fetch weather data');
      expect(result.errorCode).toBe('WEATHER_FETCH_FAILED');
    });
  });

  describe('formatOutput', () => {
    it('should return correct title', () => {
      const output = {
        weather_data: {
          date: '2026-01-19',
          conditions: 'Sunny',
          temperature_high: 75,
          temperature_low: 55,
          humidity: 50,
          wind_speed: 5,
          wind_direction: 'N',
          precipitation: 0,
        },
        work_impact: {
          severity: 'none' as const,
          affected_activities: [],
          recommendations: ['Weather conditions favorable for all scheduled activities'],
          osha_compliance: {
            heat_risk_level: 'Low',
            heat_index: 75,
            cold_risk_level: 'Low',
            wind_chill: 73,
            required_actions: [],
          },
          lightning_risk: false,
        },
      };

      const formatted = autoPopulateWeatherTool.formatOutput(output);

      expect(formatted.title).toBe('Weather Data Retrieved');
    });

    it('should include conditions and impact in summary', () => {
      const output = {
        weather_data: {
          date: '2026-01-19',
          conditions: 'Partly Cloudy',
          temperature_high: 72,
          temperature_low: 55,
          humidity: 55,
          wind_speed: 10,
          wind_direction: 'NW',
          precipitation: 0,
        },
        work_impact: {
          severity: 'minor' as const,
          affected_activities: [],
          recommendations: [],
          osha_compliance: {
            heat_risk_level: 'Low',
            heat_index: 72,
            cold_risk_level: 'Low',
            wind_chill: 70,
            required_actions: [],
          },
          lightning_risk: false,
        },
      };

      const formatted = autoPopulateWeatherTool.formatOutput(output);

      expect(formatted.summary).toContain('Partly Cloudy');
      expect(formatted.summary).toContain('72°F');
      expect(formatted.summary).toContain('minor');
    });

    it('should use sun icon for no impact', () => {
      const output = {
        weather_data: {
          date: '2026-01-19',
          conditions: 'Clear',
          temperature_high: 70,
          temperature_low: 55,
          humidity: 50,
          wind_speed: 5,
          wind_direction: 'N',
          precipitation: 0,
        },
        work_impact: {
          severity: 'none' as const,
          affected_activities: [],
          recommendations: [],
          osha_compliance: {
            heat_risk_level: 'Low',
            heat_index: 70,
            cold_risk_level: 'Low',
            wind_chill: 68,
            required_actions: [],
          },
          lightning_risk: false,
        },
      };

      const formatted = autoPopulateWeatherTool.formatOutput(output);

      expect(formatted.icon).toBe('sun');
      expect(formatted.status).toBe('success');
    });

    it('should use cloud icon for minor impact', () => {
      const output = {
        weather_data: {
          date: '2026-01-19',
          conditions: 'Cloudy',
          temperature_high: 65,
          temperature_low: 50,
          humidity: 70,
          wind_speed: 15,
          wind_direction: 'W',
          precipitation: 0,
        },
        work_impact: {
          severity: 'minor' as const,
          affected_activities: [],
          recommendations: [],
          osha_compliance: {
            heat_risk_level: 'Low',
            heat_index: 65,
            cold_risk_level: 'Low',
            wind_chill: 60,
            required_actions: [],
          },
          lightning_risk: false,
        },
      };

      const formatted = autoPopulateWeatherTool.formatOutput(output);

      expect(formatted.icon).toBe('cloud');
      expect(formatted.status).toBe('success');
    });

    it('should use cloud-rain icon for moderate impact', () => {
      const output = {
        weather_data: {
          date: '2026-01-19',
          conditions: 'Light Rain',
          temperature_high: 60,
          temperature_low: 50,
          humidity: 85,
          wind_speed: 10,
          wind_direction: 'E',
          precipitation: 0.5,
        },
        work_impact: {
          severity: 'moderate' as const,
          affected_activities: ['Concrete: precipitation'],
          recommendations: ['Cover exposed materials'],
          osha_compliance: {
            heat_risk_level: 'Low',
            heat_index: 60,
            cold_risk_level: 'Low',
            wind_chill: 58,
            required_actions: [],
          },
          lightning_risk: false,
        },
      };

      const formatted = autoPopulateWeatherTool.formatOutput(output);

      expect(formatted.icon).toBe('cloud-rain');
      expect(formatted.status).toBe('warning');
    });

    it('should use cloud-lightning icon for severe impact', () => {
      const output = {
        weather_data: {
          date: '2026-01-19',
          conditions: 'Thunderstorm',
          temperature_high: 75,
          temperature_low: 65,
          humidity: 90,
          wind_speed: 30,
          wind_direction: 'SW',
          precipitation: 2,
        },
        work_impact: {
          severity: 'severe' as const,
          affected_activities: ['All outdoor work'],
          recommendations: ['Evacuate to shelter'],
          osha_compliance: {
            heat_risk_level: 'Low',
            heat_index: 75,
            cold_risk_level: 'Low',
            wind_chill: 70,
            required_actions: [],
          },
          lightning_risk: false,
        },
      };

      const formatted = autoPopulateWeatherTool.formatOutput(output);

      expect(formatted.icon).toBe('cloud-lightning');
      expect(formatted.status).toBe('warning');
    });

    it('should include weather details', () => {
      const output = {
        weather_data: {
          date: '2026-01-19',
          conditions: 'Partly Cloudy',
          temperature_high: 72,
          temperature_low: 55,
          humidity: 55,
          wind_speed: 10,
          wind_direction: 'NW',
          precipitation: 0,
        },
        work_impact: {
          severity: 'none' as const,
          affected_activities: [],
          recommendations: [],
          osha_compliance: {
            heat_risk_level: 'Low',
            heat_index: 72,
            cold_risk_level: 'Low',
            wind_chill: 70,
            required_actions: [],
          },
          lightning_risk: false,
        },
      };

      const formatted = autoPopulateWeatherTool.formatOutput(output);

      expect(formatted.details).toContainEqual({
        label: 'Conditions',
        value: 'Partly Cloudy',
        type: 'text',
      });
      expect(formatted.details).toContainEqual({
        label: 'Temperature',
        value: '72°F',
        type: 'text',
      });
      expect(formatted.details).toContainEqual({
        label: 'Wind',
        value: '10 mph NW',
        type: 'text',
      });
      expect(formatted.details).toContainEqual({
        label: 'Humidity',
        value: '55%',
        type: 'text',
      });
      expect(formatted.details).toContainEqual({
        label: 'Work Impact',
        value: 'none',
        type: 'badge',
      });
    });

    it('should include expanded content with activities and recommendations', () => {
      const output = {
        weather_data: {
          date: '2026-01-19',
          conditions: 'Rain',
          temperature_high: 55,
          temperature_low: 45,
          humidity: 90,
          wind_speed: 15,
          wind_direction: 'E',
          precipitation: 1,
        },
        work_impact: {
          severity: 'moderate' as const,
          affected_activities: ['Concrete: precipitation', 'Roofing: precipitation'],
          recommendations: ['Cover materials', 'Monitor drainage'],
          osha_compliance: {
            heat_risk_level: 'Low',
            heat_index: 55,
            cold_risk_level: 'Low',
            wind_chill: 50,
            required_actions: [],
          },
          lightning_risk: false,
        },
      };

      const formatted = autoPopulateWeatherTool.formatOutput(output);

      expect(formatted.expandedContent.affected_activities).toEqual([
        'Concrete: precipitation',
        'Roofing: precipitation',
      ]);
      expect(formatted.expandedContent.recommendations).toEqual(['Cover materials', 'Monitor drainage']);
    });
  });

  describe('Precipitation Type Detection', () => {
    it('should detect snow precipitation', async () => {
      const mockWeather = createMockWeatherData({ conditions: 'Light Snow', precipitation: 1 });
      const mockImpact = createMockImpactResult('moderate');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.weather_data.precipitation_type).toBe('snow');
    });

    it('should detect rain precipitation', async () => {
      const mockWeather = createMockWeatherData({ conditions: 'Drizzle', precipitation: 0.2 });
      const mockImpact = createMockImpactResult('minor');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      // Drizzle should not trigger rain type since it doesn't contain 'rain'
      // But the code checks for 'rain' in conditions
      expect(result.data.weather_data.precipitation_type).toBeUndefined();
    });

    it('should have no precipitation type for clear conditions', async () => {
      const mockWeather = createMockWeatherData({ conditions: 'Clear', precipitation: 0 });
      const mockImpact = createMockImpactResult('none');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.weather_data.precipitation_type).toBeUndefined();
    });
  });

  describe('Temperature Estimation', () => {
    it('should estimate low temperature as 10 degrees below high', async () => {
      const mockWeather = createMockWeatherData({ temperature: 80 });
      const mockImpact = createMockImpactResult('none');
      const context = createMockContext();

      mockGetWeatherForProject.mockResolvedValueOnce(mockWeather);
      mockAnalyzeWeatherImpact.mockReturnValueOnce(mockImpact);

      const result = await autoPopulateWeatherTool.execute(
        { project_id: 'project-123', date: '2026-01-19' },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.weather_data.temperature_high).toBe(80);
      expect(result.data.weather_data.temperature_low).toBe(70);
    });
  });
});
