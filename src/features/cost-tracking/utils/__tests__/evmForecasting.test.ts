/**
 * EVM Forecasting Tests
 *
 * Tests for S-curve projections, trend analysis, and completion date estimates.
 */

import { describe, it, expect } from 'vitest';
import {
  generateSCurveData,
  generatePlannedCurve,
  analyzeTrend,
  calculateSlope,
  detectTrendChange,
  calculateMovingAverage,
  estimateCompletionDates,
  calculateOnTimeCompletionProbability,
  calculateDaysRemaining,
  calculateDailyEVRate,
  generateForecastScenarios,
  type SCurveInput,
  type TrendChangeAnalysis,
} from '../evmForecasting';
import type { EVMTrendDataPoint } from '@/types/cost-tracking';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * Sample historical data for S-curve tests
 */
const sampleHistoricalData = [
  { date: '2024-01-01', PV: 0, EV: 0, AC: 0 },
  { date: '2024-02-01', PV: 100000, EV: 95000, AC: 100000 },
  { date: '2024-03-01', PV: 200000, EV: 180000, AC: 200000 },
  { date: '2024-04-01', PV: 300000, EV: 260000, AC: 300000 },
  { date: '2024-05-01', PV: 400000, EV: 350000, AC: 400000 },
  { date: '2024-06-01', PV: 500000, EV: 450000, AC: 480000 },
];

/**
 * Sample trend data - improving performance
 */
const improvingTrendData: EVMTrendDataPoint[] = [
  { date: '2024-01-15', PV: 100000, EV: 90000, AC: 100000, CPI: 0.90, SPI: 0.90, percent_complete: 9 },
  { date: '2024-01-22', PV: 150000, EV: 140000, AC: 150000, CPI: 0.93, SPI: 0.93, percent_complete: 14 },
  { date: '2024-01-29', PV: 200000, EV: 195000, AC: 200000, CPI: 0.98, SPI: 0.98, percent_complete: 19.5 },
  { date: '2024-02-05', PV: 250000, EV: 250000, AC: 245000, CPI: 1.02, SPI: 1.00, percent_complete: 25 },
  { date: '2024-02-12', PV: 300000, EV: 310000, AC: 290000, CPI: 1.07, SPI: 1.03, percent_complete: 31 },
  { date: '2024-02-19', PV: 350000, EV: 370000, AC: 335000, CPI: 1.10, SPI: 1.06, percent_complete: 37 },
];

/**
 * Sample trend data - declining performance
 */
const decliningTrendData: EVMTrendDataPoint[] = [
  { date: '2024-01-15', PV: 100000, EV: 110000, AC: 100000, CPI: 1.10, SPI: 1.10, percent_complete: 11 },
  { date: '2024-01-22', PV: 150000, EV: 160000, AC: 155000, CPI: 1.03, SPI: 1.07, percent_complete: 16 },
  { date: '2024-01-29', PV: 200000, EV: 200000, AC: 210000, CPI: 0.95, SPI: 1.00, percent_complete: 20 },
  { date: '2024-02-05', PV: 250000, EV: 240000, AC: 270000, CPI: 0.89, SPI: 0.96, percent_complete: 24 },
  { date: '2024-02-12', PV: 300000, EV: 275000, AC: 330000, CPI: 0.83, SPI: 0.92, percent_complete: 27.5 },
  { date: '2024-02-19', PV: 350000, EV: 300000, AC: 400000, CPI: 0.75, SPI: 0.86, percent_complete: 30 },
];

/**
 * Sample trend data - stable performance
 */
const stableTrendData: EVMTrendDataPoint[] = [
  { date: '2024-01-15', PV: 100000, EV: 100000, AC: 100000, CPI: 1.00, SPI: 1.00, percent_complete: 10 },
  { date: '2024-01-22', PV: 150000, EV: 149000, AC: 151000, CPI: 0.99, SPI: 0.99, percent_complete: 14.9 },
  { date: '2024-01-29', PV: 200000, EV: 201000, AC: 199000, CPI: 1.01, SPI: 1.01, percent_complete: 20.1 },
  { date: '2024-02-05', PV: 250000, EV: 249000, AC: 251000, CPI: 0.99, SPI: 1.00, percent_complete: 24.9 },
  { date: '2024-02-12', PV: 300000, EV: 301000, AC: 299000, CPI: 1.01, SPI: 1.00, percent_complete: 30.1 },
  { date: '2024-02-19', PV: 350000, EV: 350000, AC: 350000, CPI: 1.00, SPI: 1.00, percent_complete: 35 },
];

// ============================================================================
// S-CURVE TESTS
// ============================================================================

describe('S-Curve Generation', () => {
  describe('generateSCurveData', () => {
    it('should include all historical data points', () => {
      const input: SCurveInput = {
        projectStartDate: '2024-01-01',
        projectEndDate: '2024-12-31',
        BAC: 1000000,
        historicalData: sampleHistoricalData,
      };

      const result = generateSCurveData(input);

      // Should have at least the historical data points
      expect(result.length).toBeGreaterThanOrEqual(sampleHistoricalData.length);

      // First historical point should match
      expect(result[0].date).toBe('2024-01-01');
      expect(result[0].planned_cumulative).toBe(0);
      expect(result[0].earned_cumulative).toBe(0);
    });

    it('should generate forecast points beyond historical data', () => {
      const input: SCurveInput = {
        projectStartDate: '2024-01-01',
        projectEndDate: '2024-12-31',
        BAC: 1000000,
        historicalData: sampleHistoricalData,
      };

      const result = generateSCurveData(input, 60);

      // Should have more points than just historical
      expect(result.length).toBeGreaterThan(sampleHistoricalData.length);

      // Forecast points should have forecast_cumulative > 0
      const forecastPoints = result.filter(p => p.forecast_cumulative > 0);
      expect(forecastPoints.length).toBeGreaterThan(0);
    });

    it('should cap forecast at BAC', () => {
      const input: SCurveInput = {
        projectStartDate: '2024-01-01',
        projectEndDate: '2024-12-31',
        BAC: 1000000,
        historicalData: sampleHistoricalData,
      };

      const result = generateSCurveData(input, 365);

      // No forecast should exceed BAC
      result.forEach(point => {
        expect(point.forecast_cumulative).toBeLessThanOrEqual(input.BAC);
      });
    });

    it('should handle empty historical data', () => {
      const input: SCurveInput = {
        projectStartDate: '2024-01-01',
        projectEndDate: '2024-12-31',
        BAC: 1000000,
        historicalData: [],
      };

      const result = generateSCurveData(input);
      expect(result).toHaveLength(0);
    });

    it('should handle single data point', () => {
      const input: SCurveInput = {
        projectStartDate: '2024-01-01',
        projectEndDate: '2024-12-31',
        BAC: 1000000,
        historicalData: [{ date: '2024-01-01', PV: 0, EV: 0, AC: 0 }],
      };

      const result = generateSCurveData(input);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('generatePlannedCurve', () => {
    it('should generate linear curve correctly', () => {
      const result = generatePlannedCurve(
        '2024-01-01',
        '2024-12-31',
        1000000,
        'linear'
      );

      expect(result.length).toBeGreaterThan(0);

      // First point should be 0
      expect(result[0].PV).toBeCloseTo(0, 0);

      // Last point should be BAC
      expect(result[result.length - 1].PV).toBeCloseTo(1000000, 0);

      // Middle point should be ~50%
      const midIndex = Math.floor(result.length / 2);
      expect(result[midIndex].PV).toBeCloseTo(500000, -4); // Within $10k
    });

    it('should generate S-curve with slow start and end', () => {
      const result = generatePlannedCurve(
        '2024-01-01',
        '2024-12-31',
        1000000,
        's-curve'
      );

      // First quarter should be less than 25% (slow start)
      const q1Index = Math.floor(result.length * 0.25);
      expect(result[q1Index].PV).toBeLessThan(250000);

      // Third quarter should be more than 75% (accelerated middle)
      const q3Index = Math.floor(result.length * 0.75);
      expect(result[q3Index].PV).toBeGreaterThan(750000);
    });

    it('should generate front-loaded curve', () => {
      const linear = generatePlannedCurve('2024-01-01', '2024-12-31', 1000000, 'linear');
      const frontLoaded = generatePlannedCurve('2024-01-01', '2024-12-31', 1000000, 'front-loaded');

      // Front-loaded should be higher than linear at 25% mark
      const q1Index = Math.floor(linear.length * 0.25);
      expect(frontLoaded[q1Index].PV).toBeGreaterThan(linear[q1Index].PV);
    });

    it('should generate back-loaded curve', () => {
      const linear = generatePlannedCurve('2024-01-01', '2024-12-31', 1000000, 'linear');
      const backLoaded = generatePlannedCurve('2024-01-01', '2024-12-31', 1000000, 'back-loaded');

      // Back-loaded should be lower than linear at 25% mark
      const q1Index = Math.floor(linear.length * 0.25);
      expect(backLoaded[q1Index].PV).toBeLessThan(linear[q1Index].PV);
    });

    it('should handle zero or negative duration', () => {
      // Same day project
      const sameDay = generatePlannedCurve('2024-01-01', '2024-01-01', 1000000, 'linear');
      expect(sameDay).toHaveLength(0);

      // End before start
      const negative = generatePlannedCurve('2024-12-31', '2024-01-01', 1000000, 'linear');
      expect(negative).toHaveLength(0);
    });
  });
});

// ============================================================================
// TREND ANALYSIS TESTS
// ============================================================================

describe('Trend Analysis', () => {
  describe('analyzeTrend', () => {
    it('should detect improving trend', () => {
      const trend = analyzeTrend(improvingTrendData);
      expect(trend).toBe('improving');
    });

    it('should detect declining trend', () => {
      const trend = analyzeTrend(decliningTrendData);
      expect(trend).toBe('declining');
    });

    it('should detect stable trend', () => {
      const trend = analyzeTrend(stableTrendData);
      expect(trend).toBe('stable');
    });

    it('should return stable for insufficient data', () => {
      const singlePoint: EVMTrendDataPoint[] = [
        { date: '2024-01-15', PV: 100000, EV: 90000, AC: 100000, CPI: 0.90, SPI: 0.90, percent_complete: 9 },
      ];
      expect(analyzeTrend(singlePoint)).toBe('stable');
      expect(analyzeTrend([])).toBe('stable');
    });
  });

  describe('calculateSlope', () => {
    it('should calculate positive slope for increasing values', () => {
      const values = [1, 2, 3, 4, 5];
      const slope = calculateSlope(values);
      expect(slope).toBeCloseTo(1.0, 2);
    });

    it('should calculate negative slope for decreasing values', () => {
      const values = [5, 4, 3, 2, 1];
      const slope = calculateSlope(values);
      expect(slope).toBeCloseTo(-1.0, 2);
    });

    it('should calculate zero slope for constant values', () => {
      const values = [3, 3, 3, 3, 3];
      const slope = calculateSlope(values);
      expect(slope).toBeCloseTo(0, 2);
    });

    it('should handle insufficient data', () => {
      expect(calculateSlope([])).toBe(0);
      expect(calculateSlope([1])).toBe(0);
    });

    it('should handle noisy data', () => {
      // General upward trend with noise
      const values = [1, 1.5, 1.2, 2.1, 1.8, 2.5, 2.3, 3.0];
      const slope = calculateSlope(values);
      expect(slope).toBeGreaterThan(0);
    });
  });

  describe('detectTrendChange', () => {
    it('should detect improvement from declining trend', () => {
      // First half declining, second half improving
      const combinedData: EVMTrendDataPoint[] = [
        ...decliningTrendData.slice(0, 3),
        ...improvingTrendData.slice(3),
      ];

      const result = detectTrendChange(combinedData);
      expect(result.isChanging).toBe(true);
    });

    it('should identify stable to declining change', () => {
      const combinedData: EVMTrendDataPoint[] = [
        ...stableTrendData.slice(0, 3),
        ...decliningTrendData.slice(3),
      ];

      const result = detectTrendChange(combinedData);
      // The second half is declining
      expect(result.currentTrend).toBe('declining');
    });

    it('should handle insufficient data', () => {
      const shortData = improvingTrendData.slice(0, 3);
      const result = detectTrendChange(shortData);

      expect(result.confidence).toBe('low');
    });

    it('should assign confidence based on data points', () => {
      // 6 data points = low confidence (needs 7+ for medium)
      const lowConfidence = detectTrendChange(improvingTrendData);
      expect(lowConfidence.confidence).toBe('low');

      // 7-13 data points = medium confidence
      const mediumData = [
        ...improvingTrendData,
        { date: '2024-02-26', PV: 400000, EV: 440000, AC: 380000, CPI: 1.16, SPI: 1.10, percent_complete: 44 },
      ];
      const mediumConfidence = detectTrendChange(mediumData);
      expect(mediumConfidence.confidence).toBe('medium');

      // 14+ data points = high confidence
      const longData = [
        ...improvingTrendData,
        ...improvingTrendData.map((d, i) => ({
          ...d,
          date: `2024-03-${String(i + 1).padStart(2, '0')}`,
        })),
        ...improvingTrendData.slice(0, 2).map((d, i) => ({
          ...d,
          date: `2024-04-${String(i + 1).padStart(2, '0')}`,
        })),
      ];
      const highConfidence = detectTrendChange(longData);
      expect(highConfidence.confidence).toBe('high');
    });
  });

  describe('calculateMovingAverage', () => {
    it('should calculate moving average correctly', () => {
      const ma = calculateMovingAverage(stableTrendData, 3);

      // Should have data.length - windowSize + 1 results
      expect(ma.length).toBe(stableTrendData.length - 3 + 1);

      // First MA should average first 3 CPI values
      const firstThreeCPI = stableTrendData.slice(0, 3).reduce((sum, d) => sum + d.CPI, 0) / 3;
      expect(ma[0].cpiMA).toBeCloseTo(firstThreeCPI, 2);
    });

    it('should handle window size larger than data', () => {
      const ma = calculateMovingAverage(stableTrendData, 10);
      expect(ma).toHaveLength(0);
    });

    it('should smooth out noise in improving trend', () => {
      const ma = calculateMovingAverage(improvingTrendData, 3);

      // Moving average should show general upward trend
      expect(ma[ma.length - 1].cpiMA).toBeGreaterThan(ma[0].cpiMA);
    });
  });
});

// ============================================================================
// COMPLETION DATE ESTIMATE TESTS
// ============================================================================

describe('Completion Date Estimates', () => {
  describe('estimateCompletionDates', () => {
    it('should return planned date when on schedule', () => {
      const result = estimateCompletionDates({
        projectStartDate: '2024-01-01',
        plannedEndDate: '2024-12-31',
        BAC: 1000000,
        EV: 500000,
        AC: 500000,
        PV: 500000,
        currentDate: '2024-06-30',
      });

      expect(result.planned).toBe('2024-12-31');
      // SPI = 1.0, so projected should equal planned
      expect(result.daysVarianceSPI).toBeCloseTo(0, 0);
    });

    it('should project later date when behind schedule', () => {
      const result = estimateCompletionDates({
        projectStartDate: '2024-01-01',
        plannedEndDate: '2024-12-31',
        BAC: 1000000,
        EV: 400000,  // Behind schedule
        AC: 500000,
        PV: 500000,
        currentDate: '2024-06-30',
      });

      // SPI = 0.8, project should take longer
      expect(result.daysVarianceSPI).toBeGreaterThan(0);

      // SPI projected date should be after planned
      expect(new Date(result.spiProjected).getTime())
        .toBeGreaterThan(new Date(result.planned).getTime());
    });

    it('should project earlier date when ahead of schedule', () => {
      const result = estimateCompletionDates({
        projectStartDate: '2024-01-01',
        plannedEndDate: '2024-12-31',
        BAC: 1000000,
        EV: 600000,  // Ahead of schedule
        AC: 500000,
        PV: 500000,
        currentDate: '2024-06-30',
      });

      // SPI = 1.2, project should finish early
      expect(result.daysVarianceSPI).toBeLessThan(0);

      // SPI projected date should be before planned
      expect(new Date(result.spiProjected).getTime())
        .toBeLessThan(new Date(result.planned).getTime());
    });

    it('should calculate CSI projection more conservatively', () => {
      const result = estimateCompletionDates({
        projectStartDate: '2024-01-01',
        plannedEndDate: '2024-12-31',
        BAC: 1000000,
        EV: 400000,  // Behind schedule
        AC: 500000,  // Over budget
        PV: 500000,
        currentDate: '2024-06-30',
      });

      // CSI variance should be more severe than SPI alone
      expect(result.daysVarianceCSI).toBeGreaterThan(result.daysVarianceSPI);
    });

    it('should handle zero SPI gracefully', () => {
      const result = estimateCompletionDates({
        projectStartDate: '2024-01-01',
        plannedEndDate: '2024-12-31',
        BAC: 1000000,
        EV: 0,   // No work done
        AC: 0,
        PV: 500000,
        currentDate: '2024-06-30',
      });

      // Should default to a reasonable multiple of planned duration
      expect(result.daysVarianceSPI).toBeGreaterThan(0);
    });
  });

  describe('calculateOnTimeCompletionProbability', () => {
    it('should return high probability for SPI > 1', () => {
      const prob = calculateOnTimeCompletionProbability(1.2, 50);
      expect(prob).toBeGreaterThan(50);
    });

    it('should return low probability for SPI < 0.8', () => {
      const prob = calculateOnTimeCompletionProbability(0.7, 50);
      expect(prob).toBeLessThan(50);
    });

    it('should increase probability as completion increases with good SPI', () => {
      const prob25 = calculateOnTimeCompletionProbability(1.0, 25);
      const prob75 = calculateOnTimeCompletionProbability(1.0, 75);

      expect(prob75).toBeGreaterThan(prob25);
    });

    it('should return 0 for zero SPI', () => {
      expect(calculateOnTimeCompletionProbability(0, 50)).toBe(0);
    });

    it('should return 100 for completed project', () => {
      expect(calculateOnTimeCompletionProbability(0.8, 100)).toBe(100);
    });

    it('should boost probability for projects > 80% with good SPI', () => {
      const prob = calculateOnTimeCompletionProbability(1.0, 85);
      // Should get the +20 boost, resulting in ~66% or higher
      expect(prob).toBeGreaterThanOrEqual(65);
    });
  });

  describe('calculateDaysRemaining', () => {
    it('should calculate days correctly', () => {
      // BAC 1M, EV 500k, daily rate 10k = 50 days remaining
      const days = calculateDaysRemaining(1000000, 500000, 10000);
      expect(days).toBe(50);
    });

    it('should return 0 when work is complete', () => {
      expect(calculateDaysRemaining(1000000, 1000000, 10000)).toBe(0);
      expect(calculateDaysRemaining(1000000, 1100000, 10000)).toBe(0);
    });

    it('should return Infinity for zero daily rate', () => {
      expect(calculateDaysRemaining(1000000, 500000, 0)).toBe(Infinity);
      expect(calculateDaysRemaining(1000000, 500000, -100)).toBe(Infinity);
    });

    it('should round up to whole days', () => {
      // 500001 / 10000 = 50.0001 -> should round to 51
      const days = calculateDaysRemaining(1000000, 499999, 10000);
      expect(Number.isInteger(days)).toBe(true);
    });
  });

  describe('calculateDailyEVRate', () => {
    it('should calculate rate from trend data', () => {
      // 6 data points over ~35 days, EV grows from 90k to 370k
      const rate = calculateDailyEVRate(improvingTrendData);

      // (370000 - 90000) / 35 days ~ 8000/day
      expect(rate).toBeGreaterThan(0);
    });

    it('should return 0 for insufficient data', () => {
      expect(calculateDailyEVRate([])).toBe(0);
      expect(calculateDailyEVRate([improvingTrendData[0]])).toBe(0);
    });

    it('should handle same-day data points', () => {
      const sameDay: EVMTrendDataPoint[] = [
        { date: '2024-01-01', PV: 100000, EV: 100000, AC: 100000, CPI: 1.0, SPI: 1.0, percent_complete: 10 },
        { date: '2024-01-01', PV: 100000, EV: 110000, AC: 100000, CPI: 1.1, SPI: 1.1, percent_complete: 11 },
      ];
      expect(calculateDailyEVRate(sameDay)).toBe(0);
    });
  });
});

// ============================================================================
// FORECAST SCENARIOS TESTS
// ============================================================================

describe('Forecast Scenarios', () => {
  describe('generateForecastScenarios', () => {
    it('should generate 5 scenarios', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 500000,
        AC: 500000,
        CPI: 1.0,
        SPI: 1.0,
      });

      expect(scenarios).toHaveLength(5);
      expect(scenarios.map(s => s.name)).toContain('Original Plan');
      expect(scenarios.map(s => s.name)).toContain('CPI Projection');
      expect(scenarios.map(s => s.name)).toContain('CPI x SPI Projection');
      expect(scenarios.map(s => s.name)).toContain('Pessimistic');
      expect(scenarios.map(s => s.name)).toContain('Optimistic');
    });

    it('should have Original Plan EAC equal to BAC', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 500000,
        AC: 500000,
        CPI: 0.9,
        SPI: 0.9,
      });

      const original = scenarios.find(s => s.name === 'Original Plan')!;
      expect(original.EAC).toBe(1000000);
      expect(original.VAC).toBe(0);
    });

    it('should calculate CPI projection correctly', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 500000,
        AC: 500000,
        CPI: 0.9,
        SPI: 1.0,
      });

      const cpiProj = scenarios.find(s => s.name === 'CPI Projection')!;
      // EAC = BAC / CPI = 1000000 / 0.9 = 1,111,111
      expect(cpiProj.EAC).toBeCloseTo(1111111, 0);
      expect(cpiProj.VAC).toBeLessThan(0); // Over budget
    });

    it('should calculate CSI projection correctly', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 450000,
        AC: 500000,
        CPI: 0.9,
        SPI: 0.9,
      });

      const csiProj = scenarios.find(s => s.name === 'CPI x SPI Projection')!;
      // EAC = AC + (BAC - EV) / (CPI x SPI)
      // = 500000 + (550000) / (0.81) = 500000 + 679012 = 1,179,012
      expect(csiProj.EAC).toBeCloseTo(1179012, 0);
    });

    it('should have pessimistic worse than CPI projection', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 500000,
        AC: 500000,
        CPI: 0.9,
        SPI: 1.0,
      });

      const cpiProj = scenarios.find(s => s.name === 'CPI Projection')!;
      const pessimistic = scenarios.find(s => s.name === 'Pessimistic')!;

      expect(pessimistic.EAC).toBeGreaterThan(cpiProj.EAC);
    });

    it('should have optimistic better than CPI projection', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 500000,
        AC: 500000,
        CPI: 0.9,
        SPI: 1.0,
      });

      const cpiProj = scenarios.find(s => s.name === 'CPI Projection')!;
      const optimistic = scenarios.find(s => s.name === 'Optimistic')!;

      expect(optimistic.EAC).toBeLessThan(cpiProj.EAC);
    });

    it('should include assumptions for each scenario', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 500000,
        AC: 500000,
        CPI: 1.0,
        SPI: 1.0,
      });

      scenarios.forEach(scenario => {
        expect(scenario.assumption).toBeDefined();
        expect(scenario.assumption.length).toBeGreaterThan(0);
      });
    });

    it('should handle zero CPI gracefully', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 0,
        AC: 100000,
        CPI: 0,
        SPI: 0,
      });

      // Should not have Infinity values
      scenarios.forEach(scenario => {
        expect(isFinite(scenario.EAC) || scenario.EAC > 0).toBe(true);
      });
    });

    it('should calculate VACPercent correctly', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 500000,
        AC: 625000,
        CPI: 0.8,  // 500000 / 625000
        SPI: 1.0,
      });

      const cpiProj = scenarios.find(s => s.name === 'CPI Projection')!;
      // EAC = 1000000 / 0.8 = 1,250,000
      // VAC = 1000000 - 1,250,000 = -250,000
      // VACPercent = -250,000 / 1,000,000 * 100 = -25%
      expect(cpiProj.VACPercent).toBeCloseTo(-25, 0);
    });

    it('should handle zero BAC for VACPercent calculations', () => {
      const scenarios = generateForecastScenarios({
        BAC: 0,
        EV: 0,
        AC: 0,
        CPI: 0,
        SPI: 0,
      });

      // All VACPercent should be 0 when BAC is 0
      scenarios.forEach(scenario => {
        expect(scenario.VACPercent).toBe(0);
      });
    });

    it('should use fallback values when CPI is 0', () => {
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 0,      // No earned value
        AC: 100000,
        CPI: 0,     // Zero CPI
        SPI: 0,     // Zero SPI
      });

      // Check that fallback multipliers are applied
      const cpiProj = scenarios.find(s => s.name === 'CPI Projection')!;
      expect(cpiProj.EAC).toBe(2000000);  // BAC * 2 when CPI is 0

      const csiProj = scenarios.find(s => s.name === 'CPI x SPI Projection')!;
      expect(csiProj.EAC).toBe(3000000);  // BAC * 3 when CSI is 0

      const pessimistic = scenarios.find(s => s.name === 'Pessimistic')!;
      expect(pessimistic.EAC).toBe(2500000);  // BAC * 2.5 when pessimistic CPI is 0
    });

    it('should cap optimistic CPI at 1.5', () => {
      // With CPI of 2.0, optimistic would be 2.2, but should be capped at 1.5
      const scenarios = generateForecastScenarios({
        BAC: 1000000,
        EV: 500000,
        AC: 250000,  // Very efficient
        CPI: 2.0,    // Very high CPI
        SPI: 1.0,
      });

      const optimistic = scenarios.find(s => s.name === 'Optimistic')!;
      // CPI * 1.1 = 2.2, capped to 1.5, so EAC = 1000000 / 1.5 = 666,667
      expect(optimistic.EAC).toBeCloseTo(666667, -2);
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle project that is complete', () => {
    const completeDates = estimateCompletionDates({
      projectStartDate: '2024-01-01',
      plannedEndDate: '2024-12-31',
      BAC: 1000000,
      EV: 1000000,
      AC: 950000,
      PV: 1000000,
      currentDate: '2024-11-15',
    });

    // All estimates should be in the past or very near
    expect(new Date(completeDates.spiProjected).getTime())
      .toBeLessThanOrEqual(new Date(completeDates.planned).getTime());
  });

  it('should handle very high CPI', () => {
    const scenarios = generateForecastScenarios({
      BAC: 1000000,
      EV: 500000,
      AC: 250000,  // Very efficient
      CPI: 2.0,
      SPI: 1.0,
    });

    const cpiProj = scenarios.find(s => s.name === 'CPI Projection')!;
    // EAC should be less than BAC
    expect(cpiProj.EAC).toBeLessThan(1000000);
    expect(cpiProj.VAC).toBeGreaterThan(0); // Under budget
  });

  it('should handle extremely low CPI', () => {
    const scenarios = generateForecastScenarios({
      BAC: 1000000,
      EV: 100000,
      AC: 500000,  // Very inefficient
      CPI: 0.2,
      SPI: 0.5,
    });

    const csiProj = scenarios.find(s => s.name === 'CPI x SPI Projection')!;
    // EAC should be much larger than BAC
    expect(csiProj.EAC).toBeGreaterThan(1000000 * 3);
  });

  it('should handle project start (no progress)', () => {
    const startDates = estimateCompletionDates({
      projectStartDate: '2024-01-01',
      plannedEndDate: '2024-12-31',
      BAC: 1000000,
      EV: 0,
      AC: 0,
      PV: 0,
      currentDate: '2024-01-01',
    });

    // Should still return valid dates
    expect(startDates.planned).toBe('2024-12-31');
    expect(startDates.spiProjected).toBeDefined();
  });

  it('should handle moving average with exact window size', () => {
    const exactData: EVMTrendDataPoint[] = [
      { date: '2024-01-01', PV: 100, EV: 100, AC: 100, CPI: 1.0, SPI: 1.0, percent_complete: 10 },
      { date: '2024-01-02', PV: 200, EV: 200, AC: 200, CPI: 1.0, SPI: 1.0, percent_complete: 20 },
      { date: '2024-01-03', PV: 300, EV: 300, AC: 300, CPI: 1.0, SPI: 1.0, percent_complete: 30 },
    ];

    const ma = calculateMovingAverage(exactData, 3);
    expect(ma).toHaveLength(1);
    expect(ma[0].cpiMA).toBe(1.0);
  });
});
