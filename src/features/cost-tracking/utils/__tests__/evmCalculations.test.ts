/**
 * EVM Calculations Unit Tests
 *
 * Comprehensive test suite for Earned Value Management calculations
 * following PMI/PMBOK methodology.
 *
 * Test coverage targets:
 * - All core formulas with known values
 * - Edge cases (zero values, division by zero)
 * - Negative variances
 * - Performance scenarios (over/under budget, ahead/behind schedule)
 */

import { describe, it, expect } from 'vitest';
import {
  // Core calculations
  calculateCPI,
  calculateSPI,
  calculateCSI,
  calculateCV,
  calculateSV,
  calculateCVPercent,
  calculateSVPercent,
  // Forecasting
  calculateEAC,
  calculateEACWithSPI,
  calculateETC,
  calculateVAC,
  calculateVACPercent,
  calculateTCPI_BAC,
  calculateTCPI_EAC,
  // Schedule
  calculateEstimatedDuration,
  calculatePercentCompletePlanned,
  calculatePercentCompleteActual,
  calculatePercentSpent,
  // Status
  getPerformanceStatus,
  getOverallStatus,
  // Comprehensive
  calculateAllMetrics,
  validateEVMInputs,
  safeDivide,
  roundTo,
  DEFAULT_EVM_THRESHOLDS,
} from '../evmCalculations';

// ============================================================================
// TEST DATA - Known Values for Verification
// ============================================================================

/**
 * Scenario 1: On Budget, On Schedule
 * BAC: $1,000,000
 * Project is 50% through, performing exactly as planned
 */
const onBudgetOnSchedule = {
  BAC: 1000000,
  PV: 500000,    // 50% of BAC should be spent by now
  EV: 500000,    // 50% of work is done
  AC: 500000,    // Actually spent $500k
  // Expected results:
  expectedCPI: 1.0,
  expectedSPI: 1.0,
  expectedCSI: 1.0,
  expectedCV: 0,
  expectedSV: 0,
  expectedEAC: 1000000,
  expectedVAC: 0,
};

/**
 * Scenario 2: Over Budget (CPI < 1)
 * BAC: $1,000,000
 * Project has done $450k of work but spent $500k
 */
const overBudget = {
  BAC: 1000000,
  PV: 500000,
  EV: 450000,    // Only 45% of work done
  AC: 500000,    // Spent the full 50% budget
  // Expected results:
  expectedCPI: 0.9,      // 450000 / 500000
  expectedSPI: 0.9,      // 450000 / 500000
  expectedCSI: 0.81,     // 0.9 * 0.9
  expectedCV: -50000,    // 450000 - 500000
  expectedSV: -50000,    // 450000 - 500000
  expectedEAC: 1111111.11, // 1000000 / 0.9
  expectedVAC: -111111.11,
};

/**
 * Scenario 3: Under Budget (CPI > 1)
 * BAC: $1,000,000
 * Project has done $500k of work but only spent $400k
 */
const underBudget = {
  BAC: 1000000,
  PV: 500000,
  EV: 500000,    // 50% of work done
  AC: 400000,    // Only spent 40% of budget
  // Expected results:
  expectedCPI: 1.25,     // 500000 / 400000
  expectedSPI: 1.0,      // 500000 / 500000
  expectedCSI: 1.25,     // 1.25 * 1.0
  expectedCV: 100000,    // 500000 - 400000
  expectedSV: 0,
  expectedEAC: 800000,   // 1000000 / 1.25
  expectedVAC: 200000,   // 1000000 - 800000
};

/**
 * Scenario 4: Ahead of Schedule (SPI > 1)
 * BAC: $1,000,000
 * Project has done $600k of work when only $500k was planned
 */
const aheadOfSchedule = {
  BAC: 1000000,
  PV: 500000,
  EV: 600000,    // 60% of work done (ahead!)
  AC: 550000,    // Spent a bit more than planned
  // Expected results:
  expectedCPI: 1.0909,   // 600000 / 550000
  expectedSPI: 1.2,      // 600000 / 500000
  expectedCSI: 1.309,    // ~1.0909 * 1.2
  expectedCV: 50000,
  expectedSV: 100000,
};

/**
 * Scenario 5: Behind Schedule (SPI < 1)
 * BAC: $1,000,000
 * Project has only done $400k of work when $500k was planned
 */
const behindSchedule = {
  BAC: 1000000,
  PV: 500000,
  EV: 400000,    // Only 40% done
  AC: 400000,    // On budget for work done
  // Expected results:
  expectedCPI: 1.0,      // 400000 / 400000
  expectedSPI: 0.8,      // 400000 / 500000
  expectedCSI: 0.8,      // 1.0 * 0.8
  expectedSV: -100000,
};

/**
 * Scenario 6: Critical Project (CSI < 0.8)
 * BAC: $1,000,000
 * Project in serious trouble
 */
const criticalProject = {
  BAC: 1000000,
  PV: 500000,
  EV: 350000,    // 35% done when 50% planned
  AC: 500000,    // Spent full budget
  // Expected results:
  expectedCPI: 0.7,      // 350000 / 500000
  expectedSPI: 0.7,      // 350000 / 500000
  expectedCSI: 0.49,     // 0.7 * 0.7
};

// ============================================================================
// CORE CALCULATION TESTS
// ============================================================================

describe('CPI (Cost Performance Index) Calculations', () => {
  describe('calculateCPI', () => {
    it('should return 1.0 when project is on budget', () => {
      expect(calculateCPI(onBudgetOnSchedule.EV, onBudgetOnSchedule.AC))
        .toBeCloseTo(onBudgetOnSchedule.expectedCPI, 4);
    });

    it('should return < 1 when project is over budget', () => {
      const cpi = calculateCPI(overBudget.EV, overBudget.AC);
      expect(cpi).toBeCloseTo(overBudget.expectedCPI, 4);
      expect(cpi).toBeLessThan(1);
    });

    it('should return > 1 when project is under budget', () => {
      const cpi = calculateCPI(underBudget.EV, underBudget.AC);
      expect(cpi).toBeCloseTo(underBudget.expectedCPI, 4);
      expect(cpi).toBeGreaterThan(1);
    });

    it('should handle zero actual cost with positive earned value', () => {
      // Project got free work - infinite efficiency
      expect(calculateCPI(100000, 0)).toBe(Infinity);
    });

    it('should handle zero actual cost with zero earned value', () => {
      // No cost, no work - undefined, return 0
      expect(calculateCPI(0, 0)).toBe(0);
    });

    it('should handle very small actual cost', () => {
      const cpi = calculateCPI(100000, 0.01);
      expect(cpi).toBe(10000000); // Very high CPI
    });

    it('should calculate correctly for small values', () => {
      expect(calculateCPI(100, 100)).toBeCloseTo(1.0, 4);
      expect(calculateCPI(90, 100)).toBeCloseTo(0.9, 4);
      expect(calculateCPI(110, 100)).toBeCloseTo(1.1, 4);
    });

    it('should calculate correctly for large values', () => {
      expect(calculateCPI(50000000, 45000000)).toBeCloseTo(1.111, 2);
      expect(calculateCPI(50000000, 55000000)).toBeCloseTo(0.909, 2);
    });
  });
});

describe('SPI (Schedule Performance Index) Calculations', () => {
  describe('calculateSPI', () => {
    it('should return 1.0 when project is on schedule', () => {
      expect(calculateSPI(onBudgetOnSchedule.EV, onBudgetOnSchedule.PV))
        .toBeCloseTo(onBudgetOnSchedule.expectedSPI, 4);
    });

    it('should return < 1 when project is behind schedule', () => {
      const spi = calculateSPI(behindSchedule.EV, behindSchedule.PV);
      expect(spi).toBeCloseTo(behindSchedule.expectedSPI, 4);
      expect(spi).toBeLessThan(1);
    });

    it('should return > 1 when project is ahead of schedule', () => {
      const spi = calculateSPI(aheadOfSchedule.EV, aheadOfSchedule.PV);
      expect(spi).toBeCloseTo(aheadOfSchedule.expectedSPI, 4);
      expect(spi).toBeGreaterThan(1);
    });

    it('should handle zero planned value with positive earned value', () => {
      expect(calculateSPI(100000, 0)).toBe(Infinity);
    });

    it('should handle zero planned value with zero earned value', () => {
      expect(calculateSPI(0, 0)).toBe(0);
    });

    it('should handle project start (low values)', () => {
      expect(calculateSPI(1000, 1000)).toBeCloseTo(1.0, 4);
      expect(calculateSPI(500, 1000)).toBeCloseTo(0.5, 4);
    });
  });
});

describe('CSI (Cost-Schedule Index) Calculations', () => {
  describe('calculateCSI', () => {
    it('should return 1.0 when both CPI and SPI are 1.0', () => {
      expect(calculateCSI(1.0, 1.0)).toBeCloseTo(1.0, 4);
    });

    it('should correctly multiply CPI and SPI', () => {
      expect(calculateCSI(0.9, 0.9)).toBeCloseTo(0.81, 4);
      expect(calculateCSI(1.25, 1.0)).toBeCloseTo(1.25, 4);
      expect(calculateCSI(0.7, 0.7)).toBeCloseTo(0.49, 4);
    });

    it('should identify critical projects (CSI < 0.8)', () => {
      const csi = calculateCSI(criticalProject.expectedCPI, criticalProject.expectedSPI);
      expect(csi).toBeCloseTo(criticalProject.expectedCSI, 2);
      expect(csi).toBeLessThan(0.8);
    });

    it('should identify healthy projects (CSI >= 1.0)', () => {
      const csi = calculateCSI(aheadOfSchedule.expectedCPI, aheadOfSchedule.expectedSPI);
      expect(csi).toBeGreaterThan(1.0);
    });

    it('should handle edge cases', () => {
      expect(calculateCSI(0, 1.0)).toBe(0);
      expect(calculateCSI(1.0, 0)).toBe(0);
      expect(calculateCSI(Infinity, 1.0)).toBe(Infinity);
    });
  });
});

// ============================================================================
// VARIANCE CALCULATION TESTS
// ============================================================================

describe('Cost Variance (CV) Calculations', () => {
  describe('calculateCV', () => {
    it('should return 0 when on budget', () => {
      expect(calculateCV(onBudgetOnSchedule.EV, onBudgetOnSchedule.AC))
        .toBe(onBudgetOnSchedule.expectedCV);
    });

    it('should return negative when over budget', () => {
      const cv = calculateCV(overBudget.EV, overBudget.AC);
      expect(cv).toBe(overBudget.expectedCV);
      expect(cv).toBeLessThan(0);
    });

    it('should return positive when under budget', () => {
      const cv = calculateCV(underBudget.EV, underBudget.AC);
      expect(cv).toBe(underBudget.expectedCV);
      expect(cv).toBeGreaterThan(0);
    });

    it('should handle zero values', () => {
      expect(calculateCV(0, 0)).toBe(0);
      expect(calculateCV(0, 100)).toBe(-100);
      expect(calculateCV(100, 0)).toBe(100);
    });
  });

  describe('calculateCVPercent', () => {
    it('should return 0% when CV is 0', () => {
      expect(calculateCVPercent(0, 500000)).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      // -50000 / 450000 * 100 = -11.11%
      expect(calculateCVPercent(-50000, 450000)).toBeCloseTo(-11.11, 1);
      // 100000 / 500000 * 100 = 20%
      expect(calculateCVPercent(100000, 500000)).toBeCloseTo(20, 1);
    });

    it('should handle zero EV', () => {
      expect(calculateCVPercent(-100, 0)).toBe(0);
    });
  });
});

describe('Schedule Variance (SV) Calculations', () => {
  describe('calculateSV', () => {
    it('should return 0 when on schedule', () => {
      expect(calculateSV(onBudgetOnSchedule.EV, onBudgetOnSchedule.PV))
        .toBe(onBudgetOnSchedule.expectedSV);
    });

    it('should return negative when behind schedule', () => {
      const sv = calculateSV(behindSchedule.EV, behindSchedule.PV);
      expect(sv).toBe(behindSchedule.expectedSV);
      expect(sv).toBeLessThan(0);
    });

    it('should return positive when ahead of schedule', () => {
      const sv = calculateSV(aheadOfSchedule.EV, aheadOfSchedule.PV);
      expect(sv).toBe(aheadOfSchedule.expectedSV);
      expect(sv).toBeGreaterThan(0);
    });
  });

  describe('calculateSVPercent', () => {
    it('should calculate percentage correctly', () => {
      // 100000 / 500000 * 100 = 20%
      expect(calculateSVPercent(100000, 500000)).toBeCloseTo(20, 1);
      // -100000 / 500000 * 100 = -20%
      expect(calculateSVPercent(-100000, 500000)).toBeCloseTo(-20, 1);
    });

    it('should handle zero PV', () => {
      expect(calculateSVPercent(100, 0)).toBe(0);
    });
  });
});

// ============================================================================
// FORECASTING CALCULATION TESTS
// ============================================================================

describe('EAC (Estimate at Completion) Calculations', () => {
  describe('calculateEAC', () => {
    it('should equal BAC when CPI is 1.0', () => {
      expect(calculateEAC(onBudgetOnSchedule.BAC, onBudgetOnSchedule.expectedCPI))
        .toBeCloseTo(onBudgetOnSchedule.expectedEAC, 2);
    });

    it('should exceed BAC when CPI < 1', () => {
      const eac = calculateEAC(overBudget.BAC, overBudget.expectedCPI);
      expect(eac).toBeCloseTo(overBudget.expectedEAC, 0);
      expect(eac).toBeGreaterThan(overBudget.BAC);
    });

    it('should be less than BAC when CPI > 1', () => {
      const eac = calculateEAC(underBudget.BAC, underBudget.expectedCPI);
      expect(eac).toBeCloseTo(underBudget.expectedEAC, 2);
      expect(eac).toBeLessThan(underBudget.BAC);
    });

    it('should return Infinity when CPI is 0', () => {
      expect(calculateEAC(1000000, 0)).toBe(Infinity);
    });

    it('should return 0 when CPI is Infinity', () => {
      expect(calculateEAC(1000000, Infinity)).toBe(0);
    });

    it('should calculate for various CPI values', () => {
      expect(calculateEAC(1000000, 0.5)).toBeCloseTo(2000000, 0); // Double budget
      expect(calculateEAC(1000000, 2.0)).toBeCloseTo(500000, 0);  // Half budget
      expect(calculateEAC(1000000, 0.8)).toBeCloseTo(1250000, 0); // 25% over
    });
  });

  describe('calculateEACWithSPI', () => {
    it('should factor in both CPI and SPI', () => {
      // AC + (BAC - EV) / (CPI * SPI)
      // 500000 + (1000000 - 450000) / (0.9 * 0.9)
      // 500000 + 550000 / 0.81 = 500000 + 679012 = 1179012
      const eac = calculateEACWithSPI(
        overBudget.AC,
        overBudget.BAC,
        overBudget.EV,
        overBudget.expectedCPI,
        overBudget.expectedSPI
      );
      expect(eac).toBeCloseTo(1179012, 0);
    });

    it('should return Infinity when CSI is 0', () => {
      expect(calculateEACWithSPI(100000, 1000000, 500000, 0, 1.0)).toBe(Infinity);
      expect(calculateEACWithSPI(100000, 1000000, 500000, 1.0, 0)).toBe(Infinity);
    });

    it('should handle Infinity CSI', () => {
      expect(calculateEACWithSPI(100000, 1000000, 500000, Infinity, 1.0)).toBe(100000);
    });
  });
});

describe('ETC (Estimate to Complete) Calculations', () => {
  describe('calculateETC', () => {
    it('should calculate remaining cost correctly', () => {
      // EAC - AC
      expect(calculateETC(1000000, 500000)).toBe(500000);
      expect(calculateETC(1200000, 500000)).toBe(700000);
      expect(calculateETC(800000, 400000)).toBe(400000);
    });

    it('should return Infinity when EAC is Infinity', () => {
      expect(calculateETC(Infinity, 500000)).toBe(Infinity);
    });

    it('should handle zero AC', () => {
      expect(calculateETC(1000000, 0)).toBe(1000000);
    });

    it('should return negative when over-spent', () => {
      expect(calculateETC(1000000, 1200000)).toBe(-200000);
    });
  });
});

describe('VAC (Variance at Completion) Calculations', () => {
  describe('calculateVAC', () => {
    it('should return 0 when EAC equals BAC', () => {
      expect(calculateVAC(onBudgetOnSchedule.BAC, onBudgetOnSchedule.expectedEAC))
        .toBeCloseTo(onBudgetOnSchedule.expectedVAC, 2);
    });

    it('should return negative when EAC exceeds BAC', () => {
      const vac = calculateVAC(overBudget.BAC, overBudget.expectedEAC);
      expect(vac).toBeCloseTo(overBudget.expectedVAC, 0);
      expect(vac).toBeLessThan(0);
    });

    it('should return positive when EAC is less than BAC', () => {
      const vac = calculateVAC(underBudget.BAC, underBudget.expectedEAC);
      expect(vac).toBeCloseTo(underBudget.expectedVAC, 2);
      expect(vac).toBeGreaterThan(0);
    });

    it('should return -Infinity when EAC is Infinity', () => {
      expect(calculateVAC(1000000, Infinity)).toBe(-Infinity);
    });
  });

  describe('calculateVACPercent', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateVACPercent(200000, 1000000)).toBeCloseTo(20, 1);
      expect(calculateVACPercent(-111111, 1000000)).toBeCloseTo(-11.11, 1);
    });

    it('should handle zero BAC', () => {
      expect(calculateVACPercent(100, 0)).toBe(0);
    });

    it('should handle -Infinity VAC', () => {
      expect(calculateVACPercent(-Infinity, 1000000)).toBe(-Infinity);
    });
  });
});

// ============================================================================
// TCPI CALCULATION TESTS
// ============================================================================

describe('TCPI (To-Complete Performance Index) Calculations', () => {
  describe('calculateTCPI_BAC', () => {
    it('should return 1.0 when on budget and on schedule', () => {
      // (BAC - EV) / (BAC - AC) = (1000000 - 500000) / (1000000 - 500000) = 1.0
      expect(calculateTCPI_BAC(onBudgetOnSchedule.BAC, onBudgetOnSchedule.EV, onBudgetOnSchedule.AC))
        .toBeCloseTo(1.0, 4);
    });

    it('should return > 1 when over budget (harder to achieve)', () => {
      // Need better performance to meet BAC
      // (1000000 - 450000) / (1000000 - 500000) = 550000 / 500000 = 1.1
      const tcpi = calculateTCPI_BAC(overBudget.BAC, overBudget.EV, overBudget.AC);
      expect(tcpi).toBeCloseTo(1.1, 4);
      expect(tcpi).toBeGreaterThan(1.0);
    });

    it('should return < 1 when under budget (easier to achieve)', () => {
      // (1000000 - 500000) / (1000000 - 400000) = 500000 / 600000 = 0.833
      const tcpi = calculateTCPI_BAC(underBudget.BAC, underBudget.EV, underBudget.AC);
      expect(tcpi).toBeCloseTo(0.833, 2);
      expect(tcpi).toBeLessThan(1.0);
    });

    it('should return Infinity when no budget remaining', () => {
      // BAC - AC = 0, but work remains
      expect(calculateTCPI_BAC(1000000, 500000, 1000000)).toBe(Infinity);
    });

    it('should return Infinity when already over budget', () => {
      // BAC - AC < 0
      expect(calculateTCPI_BAC(1000000, 500000, 1200000)).toBe(Infinity);
    });

    it('should return 0 when work is complete', () => {
      // BAC - EV = 0
      expect(calculateTCPI_BAC(1000000, 1000000, 800000)).toBe(0);
    });
  });

  describe('calculateTCPI_EAC', () => {
    it('should calculate performance needed to meet revised estimate', () => {
      const eac = 1200000;
      // (BAC - EV) / (EAC - AC) = (1000000 - 450000) / (1200000 - 500000) = 550000 / 700000 = 0.786
      const tcpi = calculateTCPI_EAC(overBudget.BAC, overBudget.EV, eac, overBudget.AC);
      expect(tcpi).toBeCloseTo(0.786, 2);
    });

    it('should return Infinity when EAC - AC = 0', () => {
      expect(calculateTCPI_EAC(1000000, 500000, 500000, 500000)).toBe(Infinity);
    });

    it('should return Infinity when EAC - AC < 0 (remaining budget negative)', () => {
      // EAC = 400000, AC = 500000, remainingBudget = 400000 - 500000 = -100000
      expect(calculateTCPI_EAC(1000000, 500000, 400000, 500000)).toBe(Infinity);
    });

    it('should handle EAC = Infinity', () => {
      expect(calculateTCPI_EAC(1000000, 500000, Infinity, 500000)).toBe(0);
    });

    it('should be easier to achieve than TCPI_BAC when over budget', () => {
      const eac = calculateEAC(overBudget.BAC, overBudget.expectedCPI);
      const tcpiBac = calculateTCPI_BAC(overBudget.BAC, overBudget.EV, overBudget.AC);
      const tcpiEac = calculateTCPI_EAC(overBudget.BAC, overBudget.EV, eac, overBudget.AC);
      expect(tcpiEac).toBeLessThan(tcpiBac);
    });
  });
});

// ============================================================================
// SCHEDULE AND PERCENT COMPLETE TESTS
// ============================================================================

describe('Schedule Forecasting Calculations', () => {
  describe('calculateEstimatedDuration', () => {
    it('should equal planned when SPI is 1.0', () => {
      expect(calculateEstimatedDuration(365, 1.0)).toBe(365);
    });

    it('should exceed planned when SPI < 1', () => {
      // 365 / 0.8 = 456.25 days
      const duration = calculateEstimatedDuration(365, 0.8);
      expect(duration).toBeCloseTo(456.25, 1);
      expect(duration).toBeGreaterThan(365);
    });

    it('should be less than planned when SPI > 1', () => {
      // 365 / 1.2 = 304.17 days
      const duration = calculateEstimatedDuration(365, 1.2);
      expect(duration).toBeCloseTo(304.17, 1);
      expect(duration).toBeLessThan(365);
    });

    it('should return Infinity when SPI is 0', () => {
      expect(calculateEstimatedDuration(365, 0)).toBe(Infinity);
    });

    it('should return 0 when SPI is Infinity', () => {
      expect(calculateEstimatedDuration(365, Infinity)).toBe(0);
    });
  });

  describe('calculatePercentCompletePlanned', () => {
    it('should calculate correctly', () => {
      expect(calculatePercentCompletePlanned(500000, 1000000)).toBe(50);
      expect(calculatePercentCompletePlanned(250000, 1000000)).toBe(25);
      expect(calculatePercentCompletePlanned(1000000, 1000000)).toBe(100);
    });

    it('should handle zero BAC', () => {
      expect(calculatePercentCompletePlanned(100, 0)).toBe(0);
    });
  });

  describe('calculatePercentCompleteActual', () => {
    it('should calculate correctly', () => {
      expect(calculatePercentCompleteActual(450000, 1000000)).toBe(45);
      expect(calculatePercentCompleteActual(600000, 1000000)).toBe(60);
    });

    it('should handle zero BAC', () => {
      expect(calculatePercentCompleteActual(100, 0)).toBe(0);
    });
  });

  describe('calculatePercentSpent', () => {
    it('should calculate correctly', () => {
      expect(calculatePercentSpent(500000, 1000000)).toBe(50);
      expect(calculatePercentSpent(800000, 1000000)).toBe(80);
    });

    it('should handle zero BAC', () => {
      expect(calculatePercentSpent(100, 0)).toBe(0);
    });

    it('should allow over 100% (overspending)', () => {
      expect(calculatePercentSpent(1200000, 1000000)).toBe(120);
    });
  });
});

// ============================================================================
// STATUS DETERMINATION TESTS
// ============================================================================

describe('Performance Status Determination', () => {
  describe('getPerformanceStatus', () => {
    it('should return excellent for CPI >= 1.05', () => {
      expect(getPerformanceStatus(1.05, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('excellent');
      expect(getPerformanceStatus(1.10, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('excellent');
      expect(getPerformanceStatus(1.50, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('excellent');
    });

    it('should return good for CPI >= 1.0 and < 1.05', () => {
      expect(getPerformanceStatus(1.0, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('good');
      expect(getPerformanceStatus(1.04, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('good');
    });

    it('should return fair for CPI >= 0.95 and < 1.0', () => {
      expect(getPerformanceStatus(0.95, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('fair');
      expect(getPerformanceStatus(0.99, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('fair');
    });

    it('should return poor for CPI >= 0.90 and < 0.95', () => {
      expect(getPerformanceStatus(0.90, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('poor');
      expect(getPerformanceStatus(0.94, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('poor');
    });

    it('should return critical for CPI < 0.90', () => {
      expect(getPerformanceStatus(0.89, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('critical');
      expect(getPerformanceStatus(0.70, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('critical');
      expect(getPerformanceStatus(0.50, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('critical');
    });

    it('should handle edge cases', () => {
      expect(getPerformanceStatus(Infinity, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('excellent');
      expect(getPerformanceStatus(0, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('critical');
      expect(getPerformanceStatus(-Infinity, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('critical');
      expect(getPerformanceStatus(NaN, DEFAULT_EVM_THRESHOLDS, 'cpi')).toBe('critical');
    });

    it('should work for SPI with same thresholds', () => {
      expect(getPerformanceStatus(1.05, DEFAULT_EVM_THRESHOLDS, 'spi')).toBe('excellent');
      expect(getPerformanceStatus(0.85, DEFAULT_EVM_THRESHOLDS, 'spi')).toBe('critical');
    });
  });

  describe('getOverallStatus', () => {
    it('should return the worse of CPI and SPI status', () => {
      // Both good -> good
      expect(getOverallStatus(1.0, 1.0)).toBe('good');

      // One excellent, one good -> good (worse)
      expect(getOverallStatus(1.10, 1.0)).toBe('good');
      expect(getOverallStatus(1.0, 1.10)).toBe('good');

      // One good, one poor -> poor
      expect(getOverallStatus(1.0, 0.92)).toBe('poor');
      expect(getOverallStatus(0.92, 1.0)).toBe('poor');

      // One fair, one critical -> critical
      expect(getOverallStatus(0.95, 0.80)).toBe('critical');
    });

    it('should identify critical projects', () => {
      expect(getOverallStatus(0.70, 0.70)).toBe('critical');
      expect(getOverallStatus(0.50, 0.90)).toBe('critical');
      expect(getOverallStatus(0.90, 0.50)).toBe('critical');
    });
  });
});

// ============================================================================
// COMPREHENSIVE METRICS CALCULATION TESTS
// ============================================================================

describe('calculateAllMetrics', () => {
  it('should calculate all metrics correctly for on-budget project', () => {
    const metrics = calculateAllMetrics({
      BAC: onBudgetOnSchedule.BAC,
      PV: onBudgetOnSchedule.PV,
      EV: onBudgetOnSchedule.EV,
      AC: onBudgetOnSchedule.AC,
      plannedDuration: 365,
      actualDuration: 182,
      statusDate: '2024-06-30',
    });

    expect(metrics.CPI).toBeCloseTo(1.0, 2);
    expect(metrics.SPI).toBeCloseTo(1.0, 2);
    expect(metrics.CSI).toBeCloseTo(1.0, 2);
    expect(metrics.CV).toBe(0);
    expect(metrics.SV).toBe(0);
    expect(metrics.EAC).toBeCloseTo(1000000, 0);
    expect(metrics.VAC).toBeCloseTo(0, 0);
    expect(metrics.cost_status).toBe('good');
    expect(metrics.schedule_status).toBe('good');
    expect(metrics.overall_status).toBe('good');
  });

  it('should calculate all metrics correctly for over-budget project', () => {
    const metrics = calculateAllMetrics({
      BAC: overBudget.BAC,
      PV: overBudget.PV,
      EV: overBudget.EV,
      AC: overBudget.AC,
      plannedDuration: 365,
      actualDuration: 182,
      statusDate: '2024-06-30',
    });

    expect(metrics.CPI).toBeCloseTo(0.9, 2);
    expect(metrics.SPI).toBeCloseTo(0.9, 2);
    expect(metrics.CV).toBeLessThan(0);
    expect(metrics.SV).toBeLessThan(0);
    expect(metrics.EAC).toBeGreaterThan(metrics.BAC);
    expect(metrics.VAC).toBeLessThan(0);
    expect(metrics.cost_status).toBe('poor');
    expect(metrics.schedule_status).toBe('poor');
  });

  it('should calculate all metrics correctly for under-budget project', () => {
    const metrics = calculateAllMetrics({
      BAC: underBudget.BAC,
      PV: underBudget.PV,
      EV: underBudget.EV,
      AC: underBudget.AC,
      plannedDuration: 365,
      actualDuration: 182,
      statusDate: '2024-06-30',
    });

    expect(metrics.CPI).toBeGreaterThan(1.0);
    expect(metrics.CV).toBeGreaterThan(0);
    expect(metrics.EAC).toBeLessThan(metrics.BAC);
    expect(metrics.VAC).toBeGreaterThan(0);
    expect(metrics.cost_status).toBe('excellent');
  });

  it('should handle critical project scenario', () => {
    const metrics = calculateAllMetrics({
      BAC: criticalProject.BAC,
      PV: criticalProject.PV,
      EV: criticalProject.EV,
      AC: criticalProject.AC,
      plannedDuration: 365,
      actualDuration: 182,
      statusDate: '2024-06-30',
    });

    expect(metrics.CSI).toBeLessThan(0.8);
    expect(metrics.overall_status).toBe('critical');
  });

  it('should cap Infinity values for display', () => {
    const metrics = calculateAllMetrics({
      BAC: 1000000,
      PV: 0,
      EV: 100000,
      AC: 0,
      plannedDuration: 365,
      actualDuration: 0,
      statusDate: '2024-01-01',
    });

    // Should be capped, not Infinity
    expect(metrics.CPI).toBe(999);
    expect(metrics.SPI).toBe(999);
    expect(metrics.EAC).toBeLessThan(Infinity);
  });

  it('should cap EAC/ETC at 10x budget when CPI is 0', () => {
    const metrics = calculateAllMetrics({
      BAC: 1000000,
      PV: 500000,
      EV: 0,       // No earned value
      AC: 100000,  // Some cost spent
      plannedDuration: 365,
      actualDuration: 182,
      statusDate: '2024-06-30',
    });

    // CPI = 0, so EAC would be Infinity, should be capped at 10x BAC
    expect(metrics.EAC).toBe(10000000);  // 10x BAC
    expect(metrics.ETC).toBe(10000000 - 100000);  // 10x BAC - AC
  });

  it('should cap VAC at -9x budget when EAC is Infinity', () => {
    const metrics = calculateAllMetrics({
      BAC: 1000000,
      PV: 500000,
      EV: 0,       // No earned value
      AC: 100000,
      plannedDuration: 365,
      actualDuration: 182,
      statusDate: '2024-06-30',
    });

    // VAC should be capped at -(BAC * 9)
    expect(metrics.VAC).toBe(-9000000);  // -(9 * BAC)
    expect(metrics.VAC_percent).toBe(-900);  // -900%
  });

  it('should cap TCPI values at 999 when budget is exhausted', () => {
    const metrics = calculateAllMetrics({
      BAC: 1000000,
      PV: 1000000,
      EV: 500000,    // 50% done
      AC: 1000000,   // Already spent full budget
      plannedDuration: 365,
      actualDuration: 365,
      statusDate: '2024-12-31',
    });

    // TCPI_BAC should be capped at 999 (Infinity case)
    expect(metrics.TCPI_BAC).toBe(999);
  });

  it('should cap estimated duration at 10x planned when SPI is 0', () => {
    const metrics = calculateAllMetrics({
      BAC: 1000000,
      PV: 500000,
      EV: 0,         // No progress
      AC: 0,
      plannedDuration: 365,
      actualDuration: 182,
      statusDate: '2024-06-30',
    });

    // SPI = 0, so estimated_duration would be Infinity
    expect(metrics.estimated_duration).toBe(3650);  // 10x planned
  });

  it('should cap CSI at 999 when CPI or SPI is Infinity', () => {
    const metrics = calculateAllMetrics({
      BAC: 1000000,
      PV: 0,
      EV: 100000,
      AC: 0,
      plannedDuration: 365,
      actualDuration: 1,
      statusDate: '2024-01-02',
    });

    // Both CPI and SPI are Infinity
    expect(metrics.CSI).toBe(999);
  });

  it('should include all required fields', () => {
    const metrics = calculateAllMetrics({
      BAC: 1000000,
      PV: 500000,
      EV: 450000,
      AC: 480000,
      plannedDuration: 365,
      actualDuration: 182,
      statusDate: '2024-06-30',
    });

    // Check all required fields exist
    expect(metrics).toHaveProperty('BAC');
    expect(metrics).toHaveProperty('PV');
    expect(metrics).toHaveProperty('EV');
    expect(metrics).toHaveProperty('AC');
    expect(metrics).toHaveProperty('CV');
    expect(metrics).toHaveProperty('SV');
    expect(metrics).toHaveProperty('CV_percent');
    expect(metrics).toHaveProperty('SV_percent');
    expect(metrics).toHaveProperty('CPI');
    expect(metrics).toHaveProperty('SPI');
    expect(metrics).toHaveProperty('CSI');
    expect(metrics).toHaveProperty('EAC');
    expect(metrics).toHaveProperty('ETC');
    expect(metrics).toHaveProperty('VAC');
    expect(metrics).toHaveProperty('VAC_percent');
    expect(metrics).toHaveProperty('TCPI_BAC');
    expect(metrics).toHaveProperty('TCPI_EAC');
    expect(metrics).toHaveProperty('planned_duration');
    expect(metrics).toHaveProperty('actual_duration');
    expect(metrics).toHaveProperty('estimated_duration');
    expect(metrics).toHaveProperty('percent_complete_planned');
    expect(metrics).toHaveProperty('percent_complete_actual');
    expect(metrics).toHaveProperty('percent_spent');
    expect(metrics).toHaveProperty('cost_status');
    expect(metrics).toHaveProperty('schedule_status');
    expect(metrics).toHaveProperty('overall_status');
    expect(metrics).toHaveProperty('status_date');
    expect(metrics).toHaveProperty('data_currency');
  });
});

// ============================================================================
// VALIDATION AND HELPER FUNCTION TESTS
// ============================================================================

describe('Validation Functions', () => {
  describe('validateEVMInputs', () => {
    it('should return empty array for valid inputs', () => {
      const errors = validateEVMInputs({
        BAC: 1000000,
        PV: 500000,
        EV: 450000,
        AC: 480000,
        plannedDuration: 365,
        actualDuration: 182,
      });
      expect(errors).toHaveLength(0);
    });

    it('should catch negative BAC', () => {
      const errors = validateEVMInputs({ BAC: -100 });
      expect(errors).toContain('BAC cannot be negative');
    });

    it('should catch negative PV', () => {
      const errors = validateEVMInputs({ PV: -100 });
      expect(errors).toContain('PV cannot be negative');
    });

    it('should catch negative EV', () => {
      const errors = validateEVMInputs({ EV: -100 });
      expect(errors).toContain('EV cannot be negative');
    });

    it('should catch negative AC', () => {
      const errors = validateEVMInputs({ AC: -100 });
      expect(errors).toContain('AC cannot be negative');
    });

    it('should catch EV exceeding BAC', () => {
      const errors = validateEVMInputs({ BAC: 100, EV: 200 });
      expect(errors).toContain('EV cannot exceed BAC');
    });

    it('should catch non-positive planned duration', () => {
      const errors = validateEVMInputs({ plannedDuration: 0 });
      expect(errors).toContain('Planned duration must be positive');
    });

    it('should catch negative actual duration', () => {
      const errors = validateEVMInputs({ actualDuration: -5 });
      expect(errors).toContain('Actual duration cannot be negative');
    });

    it('should return multiple errors', () => {
      const errors = validateEVMInputs({
        BAC: -100,
        PV: -200,
        AC: -300,
      });
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('safeDivide', () => {
    it('should divide normally for valid inputs', () => {
      expect(safeDivide(100, 50)).toBe(2);
      expect(safeDivide(50, 100)).toBe(0.5);
    });

    it('should return default for zero denominator', () => {
      expect(safeDivide(100, 0)).toBe(0);
      expect(safeDivide(100, 0, 999)).toBe(999);
    });

    it('should return default for non-finite inputs', () => {
      expect(safeDivide(Infinity, 100)).toBe(0);
      expect(safeDivide(100, Infinity)).toBe(0);
      expect(safeDivide(NaN, 100)).toBe(0);
    });
  });

  describe('roundTo', () => {
    it('should round to specified decimal places', () => {
      expect(roundTo(1.2345, 2)).toBe(1.23);
      expect(roundTo(1.2345, 3)).toBe(1.235);
      expect(roundTo(1.2345, 0)).toBe(1);
      expect(roundTo(1.5, 0)).toBe(2);
    });

    it('should handle non-finite values', () => {
      expect(roundTo(Infinity, 2)).toBe(Infinity);
      expect(roundTo(-Infinity, 2)).toBe(-Infinity);
      expect(roundTo(NaN, 2)).toBe(NaN);
    });
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  describe('Project at start (no work done)', () => {
    it('should handle zero EV, AC, PV', () => {
      const cpi = calculateCPI(0, 0);
      const spi = calculateSPI(0, 0);
      expect(cpi).toBe(0);
      expect(spi).toBe(0);
    });
  });

  describe('Project completion', () => {
    it('should handle 100% complete', () => {
      const metrics = calculateAllMetrics({
        BAC: 1000000,
        PV: 1000000,
        EV: 1000000,
        AC: 1000000,
        plannedDuration: 365,
        actualDuration: 365,
        statusDate: '2024-12-31',
      });

      expect(metrics.percent_complete_actual).toBe(100);
      expect(metrics.percent_complete_planned).toBe(100);
      expect(metrics.CPI).toBe(1);
      expect(metrics.SPI).toBe(1);
    });

    it('should handle completion under budget', () => {
      const metrics = calculateAllMetrics({
        BAC: 1000000,
        PV: 1000000,
        EV: 1000000,
        AC: 900000,
        plannedDuration: 365,
        actualDuration: 365,
        statusDate: '2024-12-31',
      });

      expect(metrics.CPI).toBeGreaterThan(1);
      expect(metrics.VAC).toBeGreaterThan(0);
    });
  });

  describe('Very large numbers', () => {
    it('should handle billion-dollar projects', () => {
      const metrics = calculateAllMetrics({
        BAC: 5000000000, // $5 billion
        PV: 2500000000,
        EV: 2300000000,
        AC: 2600000000,
        plannedDuration: 1825, // 5 years
        actualDuration: 912,
        statusDate: '2024-06-30',
      });

      expect(metrics.CPI).toBeCloseTo(0.885, 2);
      expect(metrics.SPI).toBeCloseTo(0.92, 2);
      expect(isFinite(metrics.EAC)).toBe(true);
      expect(isFinite(metrics.VAC)).toBe(true);
    });
  });

  describe('Very small numbers', () => {
    it('should handle small budget projects', () => {
      const metrics = calculateAllMetrics({
        BAC: 1000,
        PV: 500,
        EV: 450,
        AC: 500,
        plannedDuration: 30,
        actualDuration: 15,
        statusDate: '2024-01-15',
      });

      expect(metrics.CPI).toBeCloseTo(0.9, 2);
      expect(isFinite(metrics.EAC)).toBe(true);
    });
  });

  describe('Fractional values', () => {
    it('should handle decimal currency amounts', () => {
      const cv = calculateCV(500000.50, 500000.50);
      expect(cv).toBeCloseTo(0, 2);

      const cpi = calculateCPI(500000.75, 500000.25);
      expect(cpi).toBeCloseTo(1.0, 4);
    });
  });
});
