/**
 * Index Export Tests
 *
 * Ensures all modules are properly exported from the index file.
 */

import { describe, it, expect } from 'vitest';

// Import everything from index
import * as costTrackingUtils from '../index';

describe('Cost Tracking Utils Index Exports', () => {
  describe('evmCalculations exports', () => {
    it('should export core calculation functions', () => {
      expect(typeof costTrackingUtils.calculateCPI).toBe('function');
      expect(typeof costTrackingUtils.calculateSPI).toBe('function');
      expect(typeof costTrackingUtils.calculateCSI).toBe('function');
      expect(typeof costTrackingUtils.calculateCV).toBe('function');
      expect(typeof costTrackingUtils.calculateSV).toBe('function');
    });

    it('should export forecasting functions', () => {
      expect(typeof costTrackingUtils.calculateEAC).toBe('function');
      expect(typeof costTrackingUtils.calculateETC).toBe('function');
      expect(typeof costTrackingUtils.calculateVAC).toBe('function');
      expect(typeof costTrackingUtils.calculateTCPI_BAC).toBe('function');
      expect(typeof costTrackingUtils.calculateTCPI_EAC).toBe('function');
    });

    it('should export status functions', () => {
      expect(typeof costTrackingUtils.getPerformanceStatus).toBe('function');
      expect(typeof costTrackingUtils.getOverallStatus).toBe('function');
    });

    it('should export comprehensive metric calculation', () => {
      expect(typeof costTrackingUtils.calculateAllMetrics).toBe('function');
    });

    it('should export validation and helper functions', () => {
      expect(typeof costTrackingUtils.validateEVMInputs).toBe('function');
      expect(typeof costTrackingUtils.safeDivide).toBe('function');
      expect(typeof costTrackingUtils.roundTo).toBe('function');
    });

    it('should have getPerformanceStatus and getOverallStatus for status determination', () => {
      // Status determination functions are always available
      // They use thresholds internally (DEFAULT_EVM_THRESHOLDS is in @/types/cost-tracking)
      expect(typeof costTrackingUtils.getPerformanceStatus).toBe('function');
      expect(typeof costTrackingUtils.getOverallStatus).toBe('function');
    });
  });

  describe('evmByDivision exports', () => {
    it('should export aggregation functions', () => {
      expect(typeof costTrackingUtils.aggregateByDivision).toBe('function');
      expect(typeof costTrackingUtils.calculateDivisionMetrics).toBe('function');
      expect(typeof costTrackingUtils.createEmptyDivisionMetrics).toBe('function');
    });

    it('should export weighted calculation functions', () => {
      expect(typeof costTrackingUtils.calculateWeightedCPI).toBe('function');
      expect(typeof costTrackingUtils.calculateWeightedSPI).toBe('function');
      expect(typeof costTrackingUtils.calculateEVWeightedCPI).toBe('function');
      expect(typeof costTrackingUtils.calculateACWeightedCPI).toBe('function');
    });

    it('should export division analysis functions', () => {
      expect(typeof costTrackingUtils.calculateDivisionForecasts).toBe('function');
      expect(typeof costTrackingUtils.findProblematicDivisions).toBe('function');
      expect(typeof costTrackingUtils.findTopVarianceContributors).toBe('function');
      expect(typeof costTrackingUtils.calculateProjectTotalsFromDivisions).toBe('function');
      expect(typeof costTrackingUtils.compareDivisionToProject).toBe('function');
    });
  });

  describe('evmForecasting exports', () => {
    it('should export S-curve generation functions', () => {
      expect(typeof costTrackingUtils.generateSCurveData).toBe('function');
      expect(typeof costTrackingUtils.generatePlannedCurve).toBe('function');
    });

    it('should export trend analysis functions', () => {
      expect(typeof costTrackingUtils.analyzeTrend).toBe('function');
      expect(typeof costTrackingUtils.calculateSlope).toBe('function');
      expect(typeof costTrackingUtils.detectTrendChange).toBe('function');
      expect(typeof costTrackingUtils.calculateMovingAverage).toBe('function');
    });

    it('should export completion date functions', () => {
      expect(typeof costTrackingUtils.estimateCompletionDates).toBe('function');
      expect(typeof costTrackingUtils.calculateOnTimeCompletionProbability).toBe('function');
      expect(typeof costTrackingUtils.calculateDaysRemaining).toBe('function');
      expect(typeof costTrackingUtils.calculateDailyEVRate).toBe('function');
    });

    it('should export forecast scenario function', () => {
      expect(typeof costTrackingUtils.generateForecastScenarios).toBe('function');
    });
  });

  describe('Functional integration', () => {
    it('should calculate basic EVM metrics correctly through exports', () => {
      const cpi = costTrackingUtils.calculateCPI(90000, 100000);
      const spi = costTrackingUtils.calculateSPI(90000, 100000);
      const csi = costTrackingUtils.calculateCSI(cpi, spi);

      expect(cpi).toBeCloseTo(0.9, 2);
      expect(spi).toBeCloseTo(0.9, 2);
      expect(csi).toBeCloseTo(0.81, 2);
    });

    it('should calculate variances correctly through exports', () => {
      const cv = costTrackingUtils.calculateCV(90000, 100000);
      const sv = costTrackingUtils.calculateSV(90000, 100000);

      expect(cv).toBe(-10000);
      expect(sv).toBe(-10000);
    });

    it('should calculate EAC correctly through exports', () => {
      const eac = costTrackingUtils.calculateEAC(1000000, 0.9);
      expect(eac).toBeCloseTo(1111111, 0);
    });
  });
});
