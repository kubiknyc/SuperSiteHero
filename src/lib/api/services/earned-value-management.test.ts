/**
 * Earned Value Management (EVM) Calculation Tests
 *
 * Tests for EVM helper functions and calculation utilities.
 * These tests verify financial accuracy for construction project management.
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import type { EarnedValueMetrics, EVMAlert, EVMPerformanceStatus, EVMTrend } from '@/types/cost-tracking'

// ============================================================================
// HELPER FUNCTION IMPLEMENTATIONS (extracted for testing)
// ============================================================================

/**
 * Create empty EVM metrics with default values
 */
function createEmptyMetrics(statusDate: string): EarnedValueMetrics {
  return {
    BAC: 0,
    PV: 0,
    EV: 0,
    AC: 0,
    CV: 0,
    SV: 0,
    CV_percent: 0,
    SV_percent: 0,
    CPI: 0,
    SPI: 0,
    CSI: 0,
    EAC: 0,
    ETC: 0,
    VAC: 0,
    VAC_percent: 0,
    TCPI_BAC: 0,
    TCPI_EAC: 0,
    planned_duration: 0,
    actual_duration: 0,
    estimated_duration: 0,
    percent_complete_planned: 0,
    percent_complete_actual: 0,
    percent_spent: 0,
    cost_status: 'good',
    schedule_status: 'good',
    overall_status: 'good',
    status_date: statusDate,
    data_currency: 'current',
  }
}

/**
 * Calculate trend direction from a series of values
 */
function calculateTrend(values: number[]): EVMTrend {
  if (values.length < 2) {return 'stable'}

  const n = values.length
  const recent = values.slice(-Math.min(7, n))
  const slope = (recent[recent.length - 1] - recent[0]) / recent.length

  if (slope > 0.01) {return 'improving'}
  if (slope < -0.01) {return 'declining'}
  return 'stable'
}

/**
 * Determine overall risk level based on metrics and alerts
 */
function determineRiskLevel(
  metrics: EarnedValueMetrics,
  alerts: EVMAlert[]
): 'low' | 'medium' | 'high' | 'critical' {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length

  if (criticalAlerts >= 2 || (metrics.CSI && metrics.CSI < 0.8)) {
    return 'critical'
  }

  if (criticalAlerts >= 1 || (metrics.CSI && metrics.CSI < 0.9)) {
    return 'high'
  }

  if (warningAlerts >= 1 || (metrics.CSI && metrics.CSI < 1.0)) {
    return 'medium'
  }

  return 'low'
}

// ============================================================================
// EVM FORMULA CALCULATIONS (pure functions for testing)
// ============================================================================

/**
 * Calculate Cost Variance: EV - AC
 * Positive = under budget, Negative = over budget
 */
function calculateCV(EV: number, AC: number): number {
  return EV - AC
}

/**
 * Calculate Schedule Variance: EV - PV
 * Positive = ahead of schedule, Negative = behind schedule
 */
function calculateSV(EV: number, PV: number): number {
  return EV - PV
}

/**
 * Calculate Cost Performance Index: EV / AC
 * > 1.0 = under budget, < 1.0 = over budget
 */
function calculateCPI(EV: number, AC: number): number {
  if (AC === 0) {return EV > 0 ? Infinity : 0}
  return EV / AC
}

/**
 * Calculate Schedule Performance Index: EV / PV
 * > 1.0 = ahead of schedule, < 1.0 = behind schedule
 */
function calculateSPI(EV: number, PV: number): number {
  if (PV === 0) {return EV > 0 ? Infinity : 0}
  return EV / PV
}

/**
 * Calculate Cost-Schedule Index: CPI * SPI
 * Combined performance metric
 */
function calculateCSI(CPI: number, SPI: number): number {
  return CPI * SPI
}

/**
 * Calculate Estimate at Completion (CPI-based): BAC / CPI
 * Forecasted total cost based on current CPI
 */
function calculateEAC_CPI(BAC: number, CPI: number): number {
  if (CPI === 0) {return Infinity}
  return BAC / CPI
}

/**
 * Calculate Estimate at Completion (CPI*SPI-based): AC + (BAC - EV) / (CPI * SPI)
 * More conservative forecast considering schedule impact
 */
function calculateEAC_CPISPI(BAC: number, EV: number, AC: number, CPI: number, SPI: number): number {
  const csiProduct = CPI * SPI
  if (csiProduct === 0) {return Infinity}
  return AC + (BAC - EV) / csiProduct
}

/**
 * Calculate Estimate to Complete: EAC - AC
 * Remaining cost to finish
 */
function calculateETC(EAC: number, AC: number): number {
  return EAC - AC
}

/**
 * Calculate Variance at Completion: BAC - EAC
 * Positive = under budget at completion, Negative = over budget
 */
function calculateVAC(BAC: number, EAC: number): number {
  return BAC - EAC
}

/**
 * Calculate To-Complete Performance Index (to meet BAC): (BAC - EV) / (BAC - AC)
 * Required efficiency to complete within original budget
 */
function calculateTCPI_BAC(BAC: number, EV: number, AC: number): number {
  const denominator = BAC - AC
  if (denominator === 0) {return Infinity}
  return (BAC - EV) / denominator
}

/**
 * Calculate To-Complete Performance Index (to meet EAC): (BAC - EV) / (EAC - AC)
 * Required efficiency to complete within estimated budget
 */
function calculateTCPI_EAC(BAC: number, EV: number, EAC: number, AC: number): number {
  const denominator = EAC - AC
  if (denominator === 0) {return Infinity}
  return (BAC - EV) / denominator
}

/**
 * Calculate percentage variance: ((actual - baseline) / baseline) * 100
 */
function calculatePercentVariance(actual: number, baseline: number): number {
  if (baseline === 0) {return actual !== 0 ? 100 : 0}
  return ((actual - baseline) / baseline) * 100
}

/**
 * Calculate percent complete: (EV / BAC) * 100
 */
function calculatePercentComplete(EV: number, BAC: number): number {
  if (BAC === 0) {return 0}
  return (EV / BAC) * 100
}

/**
 * Calculate percent spent: (AC / BAC) * 100
 */
function calculatePercentSpent(AC: number, BAC: number): number {
  if (BAC === 0) {return 0}
  return (AC / BAC) * 100
}

/**
 * Get performance status based on index value
 */
function getPerformanceStatus(index: number): EVMPerformanceStatus {
  if (index >= 1.0) {return 'good'}
  if (index >= 0.95) {return 'warning'}
  if (index >= 0.9) {return 'at_risk'}
  return 'critical'
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('EVM Helper Functions', () => {
  describe('createEmptyMetrics', () => {
    it('should create metrics with all zero values', () => {
      const metrics = createEmptyMetrics('2024-01-15')

      expect(metrics.BAC).toBe(0)
      expect(metrics.PV).toBe(0)
      expect(metrics.EV).toBe(0)
      expect(metrics.AC).toBe(0)
      expect(metrics.CV).toBe(0)
      expect(metrics.SV).toBe(0)
      expect(metrics.CPI).toBe(0)
      expect(metrics.SPI).toBe(0)
      expect(metrics.CSI).toBe(0)
    })

    it('should set status date correctly', () => {
      const metrics = createEmptyMetrics('2024-06-30')
      expect(metrics.status_date).toBe('2024-06-30')
    })

    it('should default status values to good', () => {
      const metrics = createEmptyMetrics('2024-01-01')
      expect(metrics.cost_status).toBe('good')
      expect(metrics.schedule_status).toBe('good')
      expect(metrics.overall_status).toBe('good')
    })

    it('should set data currency to current', () => {
      const metrics = createEmptyMetrics('2024-01-01')
      expect(metrics.data_currency).toBe('current')
    })
  })

  describe('calculateTrend', () => {
    it('should return stable for single value', () => {
      expect(calculateTrend([0.95])).toBe('stable')
    })

    it('should return stable for empty array', () => {
      expect(calculateTrend([])).toBe('stable')
    })

    it('should return improving for upward trend', () => {
      const values = [0.90, 0.92, 0.94, 0.96, 0.98, 1.0, 1.02]
      expect(calculateTrend(values)).toBe('improving')
    })

    it('should return declining for downward trend', () => {
      const values = [1.02, 1.0, 0.98, 0.96, 0.94, 0.92, 0.90]
      expect(calculateTrend(values)).toBe('declining')
    })

    it('should return stable for flat values', () => {
      const values = [1.0, 1.0, 1.0, 1.0, 1.0]
      expect(calculateTrend(values)).toBe('stable')
    })

    it('should return stable for small variations', () => {
      const values = [1.0, 1.005, 0.998, 1.002, 1.001]
      expect(calculateTrend(values)).toBe('stable')
    })

    it('should handle exactly 2 values', () => {
      expect(calculateTrend([0.8, 1.0])).toBe('improving')
      expect(calculateTrend([1.0, 0.8])).toBe('declining')
    })

    it('should use only last 7 values for long arrays', () => {
      // First 10 values trending up, last 7 trending down
      const values = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5]
      expect(calculateTrend(values)).toBe('declining')
    })
  })

  describe('determineRiskLevel', () => {
    const baseMetrics = createEmptyMetrics('2024-01-01')
    const mockAlert = (severity: 'critical' | 'warning' | 'info'): EVMAlert => ({
      id: 'test-alert',
      type: 'cost_overrun',
      severity,
      title: 'Test Alert',
      message: 'Test message',
      metric: 'CPI',
      threshold: 0.9,
      current_value: 0.85,
      created_at: new Date().toISOString(),
    })

    it('should return low for healthy project with no alerts', () => {
      const metrics = { ...baseMetrics, CSI: 1.05 }
      expect(determineRiskLevel(metrics, [])).toBe('low')
    })

    it('should return medium for CSI below 1.0', () => {
      const metrics = { ...baseMetrics, CSI: 0.95 }
      expect(determineRiskLevel(metrics, [])).toBe('medium')
    })

    it('should return medium for warning alerts', () => {
      const metrics = { ...baseMetrics, CSI: 1.0 }
      expect(determineRiskLevel(metrics, [mockAlert('warning')])).toBe('medium')
    })

    it('should return high for CSI below 0.9', () => {
      const metrics = { ...baseMetrics, CSI: 0.85 }
      expect(determineRiskLevel(metrics, [])).toBe('high')
    })

    it('should return high for single critical alert', () => {
      const metrics = { ...baseMetrics, CSI: 1.0 }
      expect(determineRiskLevel(metrics, [mockAlert('critical')])).toBe('high')
    })

    it('should return critical for CSI below 0.8', () => {
      const metrics = { ...baseMetrics, CSI: 0.75 }
      expect(determineRiskLevel(metrics, [])).toBe('critical')
    })

    it('should return critical for multiple critical alerts', () => {
      const metrics = { ...baseMetrics, CSI: 0.95 }
      expect(determineRiskLevel(metrics, [mockAlert('critical'), mockAlert('critical')])).toBe('critical')
    })

    it('should prioritize CSI over alert count', () => {
      // CSI below 0.8 should be critical even with no alerts
      const metrics = { ...baseMetrics, CSI: 0.78 }
      expect(determineRiskLevel(metrics, [])).toBe('critical')
    })
  })
})

describe('EVM Core Calculations', () => {
  describe('Cost Variance (CV)', () => {
    it('should calculate positive variance (under budget)', () => {
      expect(calculateCV(100000, 90000)).toBe(10000)
    })

    it('should calculate negative variance (over budget)', () => {
      expect(calculateCV(100000, 120000)).toBe(-20000)
    })

    it('should return zero when EV equals AC', () => {
      expect(calculateCV(100000, 100000)).toBe(0)
    })

    it('should handle zero values', () => {
      expect(calculateCV(0, 0)).toBe(0)
      expect(calculateCV(50000, 0)).toBe(50000)
      expect(calculateCV(0, 50000)).toBe(-50000)
    })
  })

  describe('Schedule Variance (SV)', () => {
    it('should calculate positive variance (ahead of schedule)', () => {
      expect(calculateSV(100000, 80000)).toBe(20000)
    })

    it('should calculate negative variance (behind schedule)', () => {
      expect(calculateSV(80000, 100000)).toBe(-20000)
    })

    it('should return zero when on schedule', () => {
      expect(calculateSV(100000, 100000)).toBe(0)
    })
  })

  describe('Cost Performance Index (CPI)', () => {
    it('should calculate CPI above 1.0 (under budget)', () => {
      expect(calculateCPI(100000, 80000)).toBe(1.25)
    })

    it('should calculate CPI below 1.0 (over budget)', () => {
      expect(calculateCPI(80000, 100000)).toBe(0.8)
    })

    it('should return 1.0 when EV equals AC', () => {
      expect(calculateCPI(100000, 100000)).toBe(1.0)
    })

    it('should handle zero AC (division by zero)', () => {
      expect(calculateCPI(100000, 0)).toBe(Infinity)
      expect(calculateCPI(0, 0)).toBe(0)
    })

    it('should calculate precise decimal values', () => {
      // $150,000 earned value / $175,000 actual cost = 0.857
      expect(calculateCPI(150000, 175000)).toBeCloseTo(0.857, 2)
    })
  })

  describe('Schedule Performance Index (SPI)', () => {
    it('should calculate SPI above 1.0 (ahead of schedule)', () => {
      expect(calculateSPI(100000, 80000)).toBe(1.25)
    })

    it('should calculate SPI below 1.0 (behind schedule)', () => {
      expect(calculateSPI(80000, 100000)).toBe(0.8)
    })

    it('should return 1.0 when on schedule', () => {
      expect(calculateSPI(100000, 100000)).toBe(1.0)
    })

    it('should handle zero PV (division by zero)', () => {
      expect(calculateSPI(50000, 0)).toBe(Infinity)
      expect(calculateSPI(0, 0)).toBe(0)
    })
  })

  describe('Cost-Schedule Index (CSI)', () => {
    it('should multiply CPI and SPI', () => {
      expect(calculateCSI(1.0, 1.0)).toBe(1.0)
      expect(calculateCSI(0.9, 0.8)).toBeCloseTo(0.72, 2)
      expect(calculateCSI(1.1, 1.2)).toBeCloseTo(1.32, 2)
    })

    it('should indicate combined poor performance', () => {
      // CPI 0.85 (over budget) * SPI 0.90 (behind schedule) = 0.765
      expect(calculateCSI(0.85, 0.90)).toBeCloseTo(0.765, 3)
    })

    it('should indicate combined good performance', () => {
      // CPI 1.05 * SPI 1.10 = 1.155
      expect(calculateCSI(1.05, 1.10)).toBeCloseTo(1.155, 3)
    })
  })
})

describe('EVM Forecast Calculations', () => {
  describe('Estimate at Completion (EAC) - CPI-based', () => {
    it('should forecast higher cost when CPI < 1', () => {
      // BAC $1,000,000 / CPI 0.8 = $1,250,000 EAC
      expect(calculateEAC_CPI(1000000, 0.8)).toBe(1250000)
    })

    it('should forecast lower cost when CPI > 1', () => {
      // BAC $1,000,000 / CPI 1.25 = $800,000 EAC
      expect(calculateEAC_CPI(1000000, 1.25)).toBe(800000)
    })

    it('should equal BAC when CPI = 1', () => {
      expect(calculateEAC_CPI(1000000, 1.0)).toBe(1000000)
    })

    it('should handle zero CPI', () => {
      expect(calculateEAC_CPI(1000000, 0)).toBe(Infinity)
    })
  })

  describe('Estimate at Completion (EAC) - CPI*SPI-based', () => {
    it('should be more conservative than CPI-only', () => {
      // BAC $1M, EV $400K, AC $500K, CPI 0.8, SPI 0.8
      // EAC = $500K + ($1M - $400K) / (0.8 * 0.8) = $500K + $600K/0.64 = $1,437,500
      const eac = calculateEAC_CPISPI(1000000, 400000, 500000, 0.8, 0.8)
      expect(eac).toBeCloseTo(1437500, 0)
    })

    it('should account for schedule impact', () => {
      // Same cost performance but worse schedule should increase EAC
      const eacGoodSchedule = calculateEAC_CPISPI(1000000, 400000, 500000, 0.8, 1.0)
      const eacBadSchedule = calculateEAC_CPISPI(1000000, 400000, 500000, 0.8, 0.8)
      expect(eacBadSchedule).toBeGreaterThan(eacGoodSchedule)
    })

    it('should handle zero CPI*SPI', () => {
      expect(calculateEAC_CPISPI(1000000, 400000, 500000, 0, 1)).toBe(Infinity)
      expect(calculateEAC_CPISPI(1000000, 400000, 500000, 1, 0)).toBe(Infinity)
    })
  })

  describe('Estimate to Complete (ETC)', () => {
    it('should calculate remaining cost', () => {
      // EAC $1,250,000 - AC $500,000 = $750,000 remaining
      expect(calculateETC(1250000, 500000)).toBe(750000)
    })

    it('should return zero when complete', () => {
      expect(calculateETC(1000000, 1000000)).toBe(0)
    })

    it('should handle negative (money returned scenario)', () => {
      expect(calculateETC(900000, 950000)).toBe(-50000)
    })
  })

  describe('Variance at Completion (VAC)', () => {
    it('should be negative when over budget', () => {
      // BAC $1M - EAC $1.25M = -$250K
      expect(calculateVAC(1000000, 1250000)).toBe(-250000)
    })

    it('should be positive when under budget', () => {
      // BAC $1M - EAC $900K = $100K savings
      expect(calculateVAC(1000000, 900000)).toBe(100000)
    })

    it('should be zero when on budget', () => {
      expect(calculateVAC(1000000, 1000000)).toBe(0)
    })
  })

  describe('To-Complete Performance Index (TCPI)', () => {
    describe('TCPI to meet BAC', () => {
      it('should require higher efficiency when behind', () => {
        // BAC $1M, EV $400K, AC $500K
        // Need to do $600K work with $500K budget remaining
        // TCPI = $600K / $500K = 1.2
        expect(calculateTCPI_BAC(1000000, 400000, 500000)).toBe(1.2)
      })

      it('should require lower efficiency when ahead', () => {
        // BAC $1M, EV $500K, AC $400K
        // Need to do $500K work with $600K budget remaining
        // TCPI = $500K / $600K = 0.833
        expect(calculateTCPI_BAC(1000000, 500000, 400000)).toBeCloseTo(0.833, 2)
      })

      it('should handle edge case when exactly on track', () => {
        // Need to do $500K work with $500K remaining = 1.0
        expect(calculateTCPI_BAC(1000000, 500000, 500000)).toBe(1.0)
      })

      it('should handle budget exhausted', () => {
        expect(calculateTCPI_BAC(1000000, 800000, 1000000)).toBe(Infinity)
      })
    })

    describe('TCPI to meet EAC', () => {
      it('should be lower than TCPI_BAC when EAC > BAC', () => {
        // BAC $1M, EV $400K, AC $500K, EAC $1.2M
        // TCPI_EAC = ($1M - $400K) / ($1.2M - $500K) = $600K / $700K = 0.857
        const tcpiEac = calculateTCPI_EAC(1000000, 400000, 1200000, 500000)
        expect(tcpiEac).toBeCloseTo(0.857, 2)
      })

      it('should be higher than TCPI_BAC when EAC < BAC', () => {
        // BAC $1M, EV $500K, AC $400K, EAC $900K
        const tcpiEac = calculateTCPI_EAC(1000000, 500000, 900000, 400000)
        expect(tcpiEac).toBe(1.0)
      })
    })
  })
})

describe('Percentage Calculations', () => {
  describe('Percent Variance', () => {
    it('should calculate positive variance percentage', () => {
      // 10% over: (110-100)/100 * 100 = 10%
      expect(calculatePercentVariance(110, 100)).toBe(10)
    })

    it('should calculate negative variance percentage', () => {
      // 10% under: (90-100)/100 * 100 = -10%
      expect(calculatePercentVariance(90, 100)).toBe(-10)
    })

    it('should handle zero baseline', () => {
      expect(calculatePercentVariance(100, 0)).toBe(100)
      expect(calculatePercentVariance(0, 0)).toBe(0)
    })
  })

  describe('Percent Complete', () => {
    it('should calculate earned percentage of budget', () => {
      expect(calculatePercentComplete(500000, 1000000)).toBe(50)
      expect(calculatePercentComplete(250000, 1000000)).toBe(25)
      expect(calculatePercentComplete(1000000, 1000000)).toBe(100)
    })

    it('should handle zero BAC', () => {
      expect(calculatePercentComplete(0, 0)).toBe(0)
    })

    it('should handle over 100% (extra work)', () => {
      expect(calculatePercentComplete(1100000, 1000000)).toBeCloseTo(110, 0)
    })
  })

  describe('Percent Spent', () => {
    it('should calculate actual cost percentage of budget', () => {
      expect(calculatePercentSpent(500000, 1000000)).toBe(50)
      expect(calculatePercentSpent(900000, 1000000)).toBe(90)
    })

    it('should indicate budget overrun', () => {
      // Spent 120% of budget
      expect(calculatePercentSpent(1200000, 1000000)).toBe(120)
    })

    it('should handle zero BAC', () => {
      expect(calculatePercentSpent(0, 0)).toBe(0)
    })
  })
})

describe('Performance Status Determination', () => {
  it('should return good for index >= 1.0', () => {
    expect(getPerformanceStatus(1.0)).toBe('good')
    expect(getPerformanceStatus(1.05)).toBe('good')
    expect(getPerformanceStatus(1.5)).toBe('good')
  })

  it('should return warning for index >= 0.95 and < 1.0', () => {
    expect(getPerformanceStatus(0.95)).toBe('warning')
    expect(getPerformanceStatus(0.97)).toBe('warning')
    expect(getPerformanceStatus(0.99)).toBe('warning')
  })

  it('should return at_risk for index >= 0.9 and < 0.95', () => {
    expect(getPerformanceStatus(0.9)).toBe('at_risk')
    expect(getPerformanceStatus(0.92)).toBe('at_risk')
    expect(getPerformanceStatus(0.94)).toBe('at_risk')
  })

  it('should return critical for index < 0.9', () => {
    expect(getPerformanceStatus(0.89)).toBe('critical')
    expect(getPerformanceStatus(0.8)).toBe('critical')
    expect(getPerformanceStatus(0.5)).toBe('critical')
    expect(getPerformanceStatus(0)).toBe('critical')
  })
})

describe('Real-World Construction Scenarios', () => {
  describe('Scenario: Commercial Building Project - Month 6', () => {
    // $10M budget, 12-month project, at month 6
    const BAC = 10000000
    const plannedPercentComplete = 50 // Should be 50% done
    const PV = BAC * 0.50 // $5M planned value
    const EV = BAC * 0.45 // Actually 45% complete = $4.5M
    const AC = 5200000 // Actually spent $5.2M

    it('should calculate correct variances', () => {
      expect(calculateCV(EV, AC)).toBe(-700000) // $700K over budget
      expect(calculateSV(EV, PV)).toBe(-500000) // $500K behind schedule
    })

    it('should calculate correct performance indices', () => {
      expect(calculateCPI(EV, AC)).toBeCloseTo(0.865, 2) // 13.5% over budget rate
      expect(calculateSPI(EV, PV)).toBe(0.9) // 10% behind schedule
    })

    it('should calculate correct forecasts', () => {
      const CPI = calculateCPI(EV, AC)
      const SPI = calculateSPI(EV, PV)

      const eacCPI = calculateEAC_CPI(BAC, CPI)
      expect(eacCPI).toBeCloseTo(11560000, -4) // ~$11.56M forecast

      const csiBasedEAC = calculateEAC_CPISPI(BAC, EV, AC, CPI, SPI)
      expect(csiBasedEAC).toBeGreaterThan(eacCPI) // More conservative
    })

    it('should identify project as at-risk', () => {
      const CPI = calculateCPI(EV, AC)
      expect(getPerformanceStatus(CPI)).toBe('critical') // CPI 0.865 < 0.9
    })
  })

  describe('Scenario: Highway Project - Ahead of Schedule', () => {
    // $50M budget, 24-month project, at month 12
    const BAC = 50000000
    const PV = BAC * 0.50 // Should be 50% done = $25M
    const EV = BAC * 0.55 // Actually 55% complete = $27.5M
    const AC = 26000000 // Spent $26M

    it('should show positive variances', () => {
      expect(calculateCV(EV, AC)).toBeCloseTo(1500000, 0) // $1.5M under budget
      expect(calculateSV(EV, PV)).toBeCloseTo(2500000, 0) // $2.5M ahead of schedule
    })

    it('should show healthy performance indices', () => {
      const CPI = calculateCPI(EV, AC)
      const SPI = calculateSPI(EV, PV)

      expect(CPI).toBeCloseTo(1.058, 2)
      expect(SPI).toBe(1.1)
      expect(calculateCSI(CPI, SPI)).toBeCloseTo(1.163, 2)
    })

    it('should forecast under-budget completion', () => {
      const CPI = calculateCPI(EV, AC)
      const eac = calculateEAC_CPI(BAC, CPI)
      const vac = calculateVAC(BAC, eac)

      expect(vac).toBeGreaterThan(0) // Under budget at completion
    })

    it('should identify project as healthy', () => {
      const CPI = calculateCPI(EV, AC)
      expect(getPerformanceStatus(CPI)).toBe('good')
    })
  })

  describe('Scenario: Renovation Project - Severe Overrun', () => {
    // $2M budget, 6-month project, at month 4
    const BAC = 2000000
    const PV = BAC * 0.67 // Should be 67% done = $1.34M
    const EV = BAC * 0.40 // Only 40% complete = $800K
    const AC = 1500000 // Already spent $1.5M

    it('should show severe negative variances', () => {
      expect(calculateCV(EV, AC)).toBe(-700000) // $700K over
      expect(calculateSV(EV, PV)).toBe(-540000) // $540K behind
    })

    it('should show poor performance indices', () => {
      const CPI = calculateCPI(EV, AC)
      const SPI = calculateSPI(EV, PV)

      expect(CPI).toBeCloseTo(0.533, 2) // Very poor
      expect(SPI).toBeCloseTo(0.597, 2) // Very behind
      expect(calculateCSI(CPI, SPI)).toBeCloseTo(0.318, 2)
    })

    it('should forecast significant overrun', () => {
      const CPI = calculateCPI(EV, AC)
      const eac = calculateEAC_CPI(BAC, CPI)

      expect(eac).toBeGreaterThan(3500000) // More than $3.5M expected
    })

    it('should indicate unrealistic TCPI to meet original budget', () => {
      const tcpi = calculateTCPI_BAC(BAC, EV, AC)
      expect(tcpi).toBeGreaterThan(2.0) // Would need >200% efficiency
    })
  })
})
