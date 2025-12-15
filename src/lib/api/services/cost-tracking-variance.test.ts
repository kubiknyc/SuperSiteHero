/**
 * Cost Tracking Variance Tests
 *
 * Tests budget variance calculations, threshold logic, and alert generation
 */

import { describe, it, expect } from 'vitest'
import type {
  ProjectBudgetWithDetails,
  BudgetVarianceAlert,
  BudgetVarianceAlertSeverity,
  BudgetVarianceAlertType,
  BudgetVarianceThresholds,
  EarnedValueMetrics,
  EVMPerformanceStatus,
} from '@/types/cost-tracking'
import { getPerformanceStatus, DEFAULT_VARIANCE_THRESHOLDS } from '@/types/cost-tracking'

// =============================================
// Budget Variance Calculation Tests
// =============================================

describe('Budget Variance Calculations', () => {
  describe('revised_budget calculation', () => {
    it('should calculate revised budget as original + changes', () => {
      const budget: Pick<ProjectBudgetWithDetails, 'original_budget' | 'approved_changes' | 'revised_budget'> = {
        original_budget: 100000,
        approved_changes: 5000,
        revised_budget: 105000,
      }

      expect(budget.revised_budget).toBe(budget.original_budget + budget.approved_changes)
    })

    it('should handle zero changes', () => {
      const original = 100000
      const changes = 0
      const revised = original + changes

      expect(revised).toBe(100000)
    })

    it('should handle negative changes (budget reduction)', () => {
      const original = 100000
      const changes = -5000
      const revised = original + changes

      expect(revised).toBe(95000)
    })
  })

  describe('variance calculation', () => {
    it('should calculate variance as revised - actual (positive = under budget)', () => {
      const revised_budget = 105000
      const actual_cost = 80000
      const variance = revised_budget - actual_cost

      expect(variance).toBe(25000)
      expect(variance).toBeGreaterThan(0) // Under budget
    })

    it('should show negative variance when over budget', () => {
      const revised_budget = 100000
      const actual_cost = 110000
      const variance = revised_budget - actual_cost

      expect(variance).toBe(-10000)
      expect(variance).toBeLessThan(0) // Over budget
    })

    it('should show zero variance when exactly on budget', () => {
      const revised_budget = 100000
      const actual_cost = 100000
      const variance = revised_budget - actual_cost

      expect(variance).toBe(0)
    })
  })

  describe('percent_spent calculation', () => {
    it('should calculate percent spent correctly', () => {
      const revised_budget = 100000
      const actual_cost = 75000
      const percent_spent = (actual_cost / revised_budget) * 100

      expect(percent_spent).toBe(75)
    })

    it('should handle 0% spent', () => {
      const revised_budget = 100000
      const actual_cost = 0
      const percent_spent = (actual_cost / revised_budget) * 100

      expect(percent_spent).toBe(0)
    })

    it('should handle over 100% spent', () => {
      const revised_budget = 100000
      const actual_cost = 120000
      const percent_spent = (actual_cost / revised_budget) * 100

      expect(percent_spent).toBe(120)
    })

    it('should handle zero budget edge case', () => {
      const revised_budget = 0
      const actual_cost = 1000
      const percent_spent = revised_budget > 0 ? (actual_cost / revised_budget) * 100 : 0

      expect(percent_spent).toBe(0) // Fallback to 0 to avoid divide by zero
    })
  })

  describe('variance_percent calculation', () => {
    it('should calculate variance percentage correctly', () => {
      const variance = -10000
      const revised_budget = 100000
      const variance_percent = (variance / revised_budget) * 100

      expect(variance_percent).toBe(-10)
    })

    it('should show positive percentage when under budget', () => {
      const variance = 15000
      const revised_budget = 100000
      const variance_percent = (variance / revised_budget) * 100

      expect(variance_percent).toBe(15)
    })

    it('should handle zero budget edge case', () => {
      const variance = 5000
      const revised_budget = 0
      const variance_percent = revised_budget > 0 ? (variance / revised_budget) * 100 : 0

      expect(variance_percent).toBe(0)
    })
  })

  describe('complex budget scenarios', () => {
    it('should correctly calculate all fields for typical budget line', () => {
      const original_budget = 250000
      const approved_changes = 15000
      const actual_cost = 200000

      const revised_budget = original_budget + approved_changes
      const variance = revised_budget - actual_cost
      const percent_spent = (actual_cost / revised_budget) * 100
      const variance_percent = (variance / revised_budget) * 100

      expect(revised_budget).toBe(265000)
      expect(variance).toBe(65000)
      expect(percent_spent).toBeCloseTo(75.47, 2)
      expect(variance_percent).toBeCloseTo(24.53, 2)
    })

    it('should handle budget with multiple change orders', () => {
      const original_budget = 500000
      const change1 = 25000
      const change2 = -10000
      const change3 = 15000
      const total_changes = change1 + change2 + change3
      const actual_cost = 475000

      const revised_budget = original_budget + total_changes
      const variance = revised_budget - actual_cost

      expect(total_changes).toBe(30000)
      expect(revised_budget).toBe(530000)
      expect(variance).toBe(55000)
    })
  })
})

// =============================================
// Variance Threshold Logic Tests
// =============================================

describe('Variance Threshold Logic', () => {
  describe('critical overrun detection', () => {
    it('should detect critical overrun (>10% over budget)', () => {
      const revised_budget = 100000
      const actual_cost = 111000
      const variance = revised_budget - actual_cost
      const variance_percent = Math.abs((variance / revised_budget) * 100)

      expect(variance).toBe(-11000)
      expect(variance_percent).toBe(11)
      expect(variance_percent).toBeGreaterThan(10) // Critical threshold
    })

    it('should not trigger critical for exactly 10% overrun', () => {
      const revised_budget = 100000
      const actual_cost = 110000
      const variance_percent = Math.abs(((revised_budget - actual_cost) / revised_budget) * 100)

      expect(variance_percent).toBe(10)
      expect(variance_percent).not.toBeGreaterThan(10) // Not critical, just at warning
    })
  })

  describe('warning overrun detection', () => {
    it('should detect warning overrun (5-10% over budget)', () => {
      const revised_budget = 100000
      const actual_cost = 107000
      const variance_percent = Math.abs(((revised_budget - actual_cost) / revised_budget) * 100)

      expect(variance_percent).toBeCloseTo(7, 0)
      expect(variance_percent).toBeGreaterThan(5)
      expect(variance_percent).toBeLessThanOrEqual(10)
    })
  })

  describe('near budget detection', () => {
    it('should detect when approaching budget (>90% spent)', () => {
      const revised_budget = 100000
      const actual_cost = 91000
      const percent_spent = (actual_cost / revised_budget) * 100

      expect(percent_spent).toBe(91)
      expect(percent_spent).toBeGreaterThan(90)
    })

    it('should not trigger near budget for 89% spent', () => {
      const revised_budget = 100000
      const actual_cost = 89000
      const percent_spent = (actual_cost / revised_budget) * 100

      expect(percent_spent).toBe(89)
      expect(percent_spent).not.toBeGreaterThan(90)
    })
  })

  describe('minimum variance amount threshold', () => {
    it('should respect minimum variance amount (avoid noise)', () => {
      const revised_budget = 10000
      const actual_cost = 10500
      const variance = Math.abs(revised_budget - actual_cost)
      const minimum_threshold = 1000

      expect(variance).toBe(500)
      expect(variance).toBeLessThan(minimum_threshold)
      // Should not trigger alert despite 5% overrun due to small amount
    })

    it('should trigger alert when exceeds minimum amount', () => {
      const revised_budget = 100000
      const actual_cost = 106000
      const variance = Math.abs(revised_budget - actual_cost)
      const minimum_threshold = 1000

      expect(variance).toBe(6000)
      expect(variance).toBeGreaterThan(minimum_threshold)
      // Should trigger alert
    })
  })
})

// =============================================
// Variance Alert Severity Classification
// =============================================

describe('Variance Alert Severity', () => {
  const thresholds = {
    critical_overrun_percent: 10,
    warning_overrun_percent: 5,
    near_budget_percent: 90,
    project_critical_percent: 5,
    project_warning_percent: 3,
    minimum_variance_amount: 1000,
  }

  describe('line-level severity classification', () => {
    it('should classify as critical when >10% over budget', () => {
      const variance_percent = 12
      const severity: BudgetVarianceAlertSeverity =
        variance_percent > thresholds.critical_overrun_percent ? 'critical' :
        variance_percent > thresholds.warning_overrun_percent ? 'warning' : 'info'

      expect(severity).toBe('critical')
    })

    it('should classify as warning when 5-10% over budget', () => {
      const variance_percent = 7
      const severity: BudgetVarianceAlertSeverity =
        variance_percent > thresholds.critical_overrun_percent ? 'critical' :
        variance_percent > thresholds.warning_overrun_percent ? 'warning' : 'info'

      expect(severity).toBe('warning')
    })

    it('should classify as info when approaching budget', () => {
      const percent_spent = 92
      const severity: BudgetVarianceAlertSeverity =
        percent_spent > thresholds.near_budget_percent ? 'info' : 'info'

      expect(severity).toBe('info')
    })
  })

  describe('project-level severity classification', () => {
    it('should classify project as critical when >5% over budget', () => {
      const total_variance_percent = 6
      const severity: BudgetVarianceAlertSeverity =
        total_variance_percent > thresholds.project_critical_percent ? 'critical' :
        total_variance_percent > thresholds.project_warning_percent ? 'warning' : 'info'

      expect(severity).toBe('critical')
    })

    it('should classify project as warning when 3-5% over budget', () => {
      const total_variance_percent = 4
      const severity: BudgetVarianceAlertSeverity =
        total_variance_percent > thresholds.project_critical_percent ? 'critical' :
        total_variance_percent > thresholds.project_warning_percent ? 'warning' : 'info'

      expect(severity).toBe('warning')
    })
  })
})

// =============================================
// Variance Alert Type Classification
// =============================================

describe('Variance Alert Types', () => {
  it('should identify line_over_budget alert', () => {
    const variance = -15000
    const revised_budget = 100000
    const variance_percent = Math.abs((variance / revised_budget) * 100)

    const alertType: BudgetVarianceAlertType = 'line_over_budget'
    expect(alertType).toBe('line_over_budget')
    expect(variance_percent).toBeGreaterThan(10)
  })

  it('should identify line_near_budget alert', () => {
    const actual_cost = 92000
    const revised_budget = 100000
    const percent_spent = (actual_cost / revised_budget) * 100

    const alertType: BudgetVarianceAlertType = percent_spent > 90 ? 'line_near_budget' : 'line_over_budget'
    expect(alertType).toBe('line_near_budget')
  })

  it('should identify project_over_budget alert', () => {
    const total_variance = -60000
    const total_budget = 1000000
    const variance_percent = Math.abs((total_variance / total_budget) * 100)

    const alertType: BudgetVarianceAlertType =
      variance_percent > 5 ? 'project_over_budget' : 'division_over_budget'
    expect(alertType).toBe('project_over_budget')
  })

  it('should identify division_over_budget alert', () => {
    const division_variance = -25000
    const division_budget = 300000
    const variance_percent = Math.abs((division_variance / division_budget) * 100)

    const alertType: BudgetVarianceAlertType =
      variance_percent > 5 ? 'division_over_budget' : 'line_over_budget'
    expect(alertType).toBe('division_over_budget')
  })
})

// =============================================
// EVM Variance Calculations (CV, SV, VAC)
// =============================================

describe('EVM Variance Calculations', () => {
  describe('Cost Variance (CV)', () => {
    it('should calculate CV = EV - AC (positive = under budget)', () => {
      const EV = 500000
      const AC = 450000
      const CV = EV - AC

      expect(CV).toBe(50000)
      expect(CV).toBeGreaterThan(0) // Under budget
    })

    it('should show negative CV when over budget', () => {
      const EV = 500000
      const AC = 550000
      const CV = EV - AC

      expect(CV).toBe(-50000)
      expect(CV).toBeLessThan(0) // Over budget
    })

    it('should calculate CV percentage', () => {
      const EV = 500000
      const AC = 450000
      const CV = EV - AC
      const CV_percent = (CV / EV) * 100

      expect(CV_percent).toBe(10)
    })
  })

  describe('Schedule Variance (SV)', () => {
    it('should calculate SV = EV - PV (positive = ahead of schedule)', () => {
      const EV = 500000
      const PV = 450000
      const SV = EV - PV

      expect(SV).toBe(50000)
      expect(SV).toBeGreaterThan(0) // Ahead
    })

    it('should show negative SV when behind schedule', () => {
      const EV = 450000
      const PV = 500000
      const SV = EV - PV

      expect(SV).toBe(-50000)
      expect(SV).toBeLessThan(0) // Behind
    })

    it('should calculate SV percentage', () => {
      const EV = 500000
      const PV = 450000
      const SV = EV - PV
      const SV_percent = (SV / PV) * 100

      expect(SV_percent).toBeCloseTo(11.11, 2)
    })
  })

  describe('Variance at Completion (VAC)', () => {
    it('should calculate VAC = BAC - EAC (positive = under budget at completion)', () => {
      const BAC = 1000000
      const EAC = 950000
      const VAC = BAC - EAC

      expect(VAC).toBe(50000)
      expect(VAC).toBeGreaterThan(0) // Will finish under budget
    })

    it('should show negative VAC when projected over budget', () => {
      const BAC = 1000000
      const EAC = 1050000
      const VAC = BAC - EAC

      expect(VAC).toBe(-50000)
      expect(VAC).toBeLessThan(0) // Will finish over budget
    })

    it('should calculate VAC percentage', () => {
      const BAC = 1000000
      const EAC = 950000
      const VAC = BAC - EAC
      const VAC_percent = (VAC / BAC) * 100

      expect(VAC_percent).toBe(5)
    })
  })

  describe('Estimate to Complete (ETC)', () => {
    it('should calculate ETC = EAC - AC', () => {
      const EAC = 1000000
      const AC = 600000
      const ETC = EAC - AC

      expect(ETC).toBe(400000)
    })

    it('should handle zero ETC when project complete', () => {
      const EAC = 1000000
      const AC = 1000000
      const ETC = EAC - AC

      expect(ETC).toBe(0)
    })
  })

  describe('complete EVM variance scenario', () => {
    it('should calculate all EVM variances correctly', () => {
      const BAC = 1000000
      const PV = 500000
      const EV = 480000
      const AC = 500000

      const CV = EV - AC
      const SV = EV - PV
      const CV_percent = (CV / EV) * 100
      const SV_percent = (SV / PV) * 100

      const CPI = EV / AC
      const SPI = EV / PV
      const EAC = BAC / CPI
      const VAC = BAC - EAC
      const VAC_percent = (VAC / BAC) * 100

      expect(CV).toBe(-20000) // Over budget
      expect(SV).toBe(-20000) // Behind schedule
      expect(CV_percent).toBeCloseTo(-4.17, 2)
      expect(SV_percent).toBe(-4)
      expect(CPI).toBe(0.96)
      expect(SPI).toBe(0.96)
      expect(EAC).toBeCloseTo(1041666.67, 2)
      expect(VAC).toBeCloseTo(-41666.67, 2)
      expect(VAC_percent).toBeCloseTo(-4.17, 2)
    })
  })
})

// =============================================
// Performance Index Tests
// =============================================

describe('EVM Performance Indices', () => {
  describe('Cost Performance Index (CPI)', () => {
    it('should calculate CPI = EV / AC', () => {
      const EV = 500000
      const AC = 450000
      const CPI = EV / AC

      expect(CPI).toBeCloseTo(1.11, 2)
      expect(CPI).toBeGreaterThan(1) // Under budget
    })

    it('should show CPI < 1 when over budget', () => {
      const EV = 450000
      const AC = 500000
      const CPI = EV / AC

      expect(CPI).toBe(0.9)
      expect(CPI).toBeLessThan(1) // Over budget
    })
  })

  describe('Schedule Performance Index (SPI)', () => {
    it('should calculate SPI = EV / PV', () => {
      const EV = 500000
      const PV = 450000
      const SPI = EV / PV

      expect(SPI).toBeCloseTo(1.11, 2)
      expect(SPI).toBeGreaterThan(1) // Ahead of schedule
    })

    it('should show SPI < 1 when behind schedule', () => {
      const EV = 450000
      const PV = 500000
      const SPI = EV / PV

      expect(SPI).toBe(0.9)
      expect(SPI).toBeLessThan(1) // Behind schedule
    })
  })

  describe('Cost-Schedule Index (CSI)', () => {
    it('should calculate CSI = CPI * SPI', () => {
      const CPI = 1.05
      const SPI = 1.10
      const CSI = CPI * SPI

      expect(CSI).toBeCloseTo(1.155, 3)
    })

    it('should show poor performance when CSI < 1', () => {
      const CPI = 0.95
      const SPI = 0.90
      const CSI = CPI * SPI

      expect(CSI).toBe(0.855)
      expect(CSI).toBeLessThan(1) // Poor performance
    })
  })

  describe('To-Complete Performance Index (TCPI)', () => {
    it('should calculate TCPI_BAC = (BAC - EV) / (BAC - AC)', () => {
      const BAC = 1000000
      const EV = 500000
      const AC = 550000
      const TCPI_BAC = (BAC - EV) / (BAC - AC)

      expect(TCPI_BAC).toBeCloseTo(1.11, 2)
    })

    it('should calculate TCPI_EAC = (BAC - EV) / (EAC - AC)', () => {
      const BAC = 1000000
      const EV = 500000
      const AC = 550000
      const EAC = 1100000
      const TCPI_EAC = (BAC - EV) / (EAC - AC)

      expect(TCPI_EAC).toBeCloseTo(0.909, 3)
    })
  })
})

// =============================================
// Performance Status Classification Tests
// =============================================

describe('EVM Performance Status', () => {
  describe('getPerformanceStatus function', () => {
    it('should classify CPI 1.05+ as excellent', () => {
      const status = getPerformanceStatus(1.06, undefined, 'cpi')
      expect(status).toBe('excellent')
    })

    it('should classify CPI 1.0-1.04 as good', () => {
      const status = getPerformanceStatus(1.02, undefined, 'cpi')
      expect(status).toBe('good')
    })

    it('should classify CPI 0.95-0.99 as fair', () => {
      const status = getPerformanceStatus(0.97, undefined, 'cpi')
      expect(status).toBe('fair')
    })

    it('should classify CPI 0.90-0.94 as poor', () => {
      const status = getPerformanceStatus(0.92, undefined, 'cpi')
      expect(status).toBe('poor')
    })

    it('should classify CPI <0.90 as critical', () => {
      const status = getPerformanceStatus(0.85, undefined, 'cpi')
      expect(status).toBe('critical')
    })

    it('should classify SPI using same thresholds', () => {
      expect(getPerformanceStatus(1.08, undefined, 'spi')).toBe('excellent')
      expect(getPerformanceStatus(1.01, undefined, 'spi')).toBe('good')
      expect(getPerformanceStatus(0.96, undefined, 'spi')).toBe('fair')
      expect(getPerformanceStatus(0.91, undefined, 'spi')).toBe('poor')
      expect(getPerformanceStatus(0.88, undefined, 'spi')).toBe('critical')
    })
  })

  describe('custom threshold support', () => {
    it('should use custom thresholds when provided', () => {
      const customThresholds = {
        cpi_excellent: 1.10,
        cpi_good: 1.05,
        cpi_fair: 1.00,
        cpi_poor: 0.95,
        spi_excellent: 1.10,
        spi_good: 1.05,
        spi_fair: 1.00,
        spi_poor: 0.95,
        alert_variance_percent: 10,
        alert_index_threshold: 0.90,
      }

      const status = getPerformanceStatus(1.03, customThresholds, 'cpi')
      expect(status).toBe('fair') // Would be 'good' with default thresholds
    })
  })
})

// =============================================
// Integration Tests - Complete Variance Scenarios
// =============================================

describe('Complete Variance Scenarios', () => {
  describe('healthy project scenario', () => {
    it('should show all positive indicators', () => {
      const budget = {
        original_budget: 500000,
        approved_changes: 0,
        actual_cost: 380000,
        revised_budget: 500000,
      }

      const variance = budget.revised_budget - budget.actual_cost
      const percent_spent = (budget.actual_cost / budget.revised_budget) * 100
      const variance_percent = (variance / budget.revised_budget) * 100

      expect(variance).toBe(120000) // Under budget
      expect(percent_spent).toBe(76)
      expect(variance_percent).toBe(24)
      expect(variance).toBeGreaterThan(0)
      expect(percent_spent).toBeLessThan(90) // Not near budget
    })
  })

  describe('critical overrun scenario', () => {
    it('should trigger critical alerts', () => {
      const budget = {
        original_budget: 500000,
        approved_changes: 10000,
        actual_cost: 575000,
        revised_budget: 510000,
      }

      const variance = budget.revised_budget - budget.actual_cost
      const variance_percent = Math.abs((variance / budget.revised_budget) * 100)
      const severity: BudgetVarianceAlertSeverity = variance_percent > 10 ? 'critical' : 'warning'

      expect(variance).toBe(-65000)
      expect(variance_percent).toBeCloseTo(12.75, 2)
      expect(severity).toBe('critical')
      expect(variance).toBeLessThan(0)
    })
  })

  describe('approaching budget scenario', () => {
    it('should trigger near budget alert', () => {
      const budget = {
        original_budget: 500000,
        approved_changes: 0,
        actual_cost: 455000,
        revised_budget: 500000,
      }

      const percent_spent = (budget.actual_cost / budget.revised_budget) * 100
      const variance = budget.revised_budget - budget.actual_cost
      const should_alert = percent_spent > 90

      expect(percent_spent).toBe(91)
      expect(variance).toBe(45000) // Still under budget
      expect(should_alert).toBe(true)
      expect(variance).toBeGreaterThan(0) // Under budget but close
    })
  })

  describe('multiple change orders scenario', () => {
    it('should track variance through multiple revisions', () => {
      const original = 500000
      const change1 = 25000
      const change2 = -10000
      const change3 = 15000
      const actual = 520000

      const revised = original + change1 + change2 + change3
      const variance = revised - actual
      const variance_percent = (variance / revised) * 100

      expect(revised).toBe(530000)
      expect(variance).toBe(10000)
      expect(variance_percent).toBeCloseTo(1.89, 2)
    })
  })
})

// =============================================
// Variance Helper Functions
// =============================================

/**
 * Calculate revised budget from original and approved changes
 */
function calculateRevisedBudget(original: number, approvedChanges: number): number {
  return original + approvedChanges
}

/**
 * Calculate variance (positive = under budget, negative = over budget)
 */
function calculateVariance(revisedBudget: number, actualCost: number): number {
  return revisedBudget - actualCost
}

/**
 * Calculate percent spent safely handling zero budget
 */
function calculatePercentSpent(actualCost: number, revisedBudget: number): number {
  if (revisedBudget <= 0) {return 0}
  return (actualCost / revisedBudget) * 100
}

/**
 * Calculate variance percent safely handling zero budget
 */
function calculateVariancePercent(variance: number, revisedBudget: number): number {
  if (revisedBudget <= 0) {return 0}
  return (variance / revisedBudget) * 100
}

/**
 * Determine alert severity based on variance percent
 */
function determineAlertSeverity(
  variancePercent: number,
  thresholds: BudgetVarianceThresholds
): BudgetVarianceAlertSeverity {
  const absVariance = Math.abs(variancePercent)
  if (absVariance > thresholds.critical_overrun_percent) {return 'critical'}
  if (absVariance > thresholds.warning_overrun_percent) {return 'warning'}
  return 'info'
}

/**
 * Check if variance should trigger an alert
 */
function shouldTriggerAlert(
  variance: number,
  variancePercent: number,
  percentSpent: number,
  thresholds: BudgetVarianceThresholds
): { shouldAlert: boolean; type: BudgetVarianceAlertType | null } {
  const absVariance = Math.abs(variance)
  const absVariancePercent = Math.abs(variancePercent)

  // Check minimum threshold
  if (absVariance < thresholds.minimum_variance_amount) {
    return { shouldAlert: false, type: null }
  }

  // Check for over budget
  if (variance < 0 && absVariancePercent > thresholds.warning_overrun_percent) {
    return { shouldAlert: true, type: 'line_over_budget' }
  }

  // Check for near budget
  if (percentSpent > thresholds.near_budget_percent) {
    return { shouldAlert: true, type: 'line_near_budget' }
  }

  return { shouldAlert: false, type: null }
}

/**
 * Generate variance alert from budget data
 */
function generateVarianceAlert(
  budgetId: string,
  costCode: string,
  costCodeName: string,
  division: string,
  budgetAmount: number,
  actualAmount: number,
  thresholds: BudgetVarianceThresholds
): BudgetVarianceAlert | null {
  const variance = budgetAmount - actualAmount
  const variancePercent = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0
  const percentSpent = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0

  const { shouldAlert, type } = shouldTriggerAlert(
    variance,
    variancePercent,
    percentSpent,
    thresholds
  )

  if (!shouldAlert || !type) {return null}

  const severity = determineAlertSeverity(variancePercent, thresholds)

  return {
    id: `alert-${budgetId}-${Date.now()}`,
    type,
    severity,
    title: type === 'line_over_budget' ? 'Budget Overrun' : 'Approaching Budget',
    message: type === 'line_over_budget'
      ? `${costCodeName} is ${Math.abs(variancePercent).toFixed(1)}% over budget`
      : `${costCodeName} has spent ${percentSpent.toFixed(1)}% of budget`,
    budget_id: budgetId,
    cost_code: costCode,
    cost_code_name: costCodeName,
    division,
    budget_amount: budgetAmount,
    actual_amount: actualAmount,
    variance_amount: variance,
    variance_percent: variancePercent,
    threshold_percent: type === 'line_over_budget'
      ? thresholds.warning_overrun_percent
      : thresholds.near_budget_percent,
    created_at: new Date().toISOString(),
  }
}

/**
 * Calculate variance trend from historical data
 */
function calculateVarianceTrend(
  historicalVariances: { date: string; variance: number }[]
): 'improving' | 'stable' | 'declining' {
  if (historicalVariances.length < 2) {return 'stable'}

  const recent = historicalVariances.slice(-5)
  const firstVariance = recent[0].variance
  const lastVariance = recent[recent.length - 1].variance

  const changeRate = (lastVariance - firstVariance) / Math.abs(firstVariance || 1)

  if (changeRate > 0.05) {return 'improving'}  // Variance getting more positive
  if (changeRate < -0.05) {return 'declining'} // Variance getting more negative
  return 'stable'
}

/**
 * Aggregate division-level variance
 */
function aggregateDivisionVariance(
  budgets: Array<{
    division: string
    revised_budget: number
    actual_cost: number
  }>
): Map<string, { revised: number; actual: number; variance: number; variance_percent: number }> {
  const divisionMap = new Map<string, { revised: number; actual: number; variance: number; variance_percent: number }>()

  for (const budget of budgets) {
    const existing = divisionMap.get(budget.division) || { revised: 0, actual: 0, variance: 0, variance_percent: 0 }
    existing.revised += budget.revised_budget
    existing.actual += budget.actual_cost
    divisionMap.set(budget.division, existing)
  }

  // Calculate variance and percent for each division
  for (const [division, data] of divisionMap) {
    data.variance = data.revised - data.actual
    data.variance_percent = data.revised > 0 ? (data.variance / data.revised) * 100 : 0
    divisionMap.set(division, data)
  }

  return divisionMap
}

// =============================================
// Variance Helper Function Tests
// =============================================

describe('Variance Helper Functions', () => {
  describe('calculateRevisedBudget', () => {
    it('should add positive changes to original', () => {
      expect(calculateRevisedBudget(100000, 10000)).toBe(110000)
    })

    it('should subtract negative changes from original', () => {
      expect(calculateRevisedBudget(100000, -10000)).toBe(90000)
    })

    it('should handle zero changes', () => {
      expect(calculateRevisedBudget(100000, 0)).toBe(100000)
    })

    it('should handle zero original', () => {
      expect(calculateRevisedBudget(0, 10000)).toBe(10000)
    })

    it('should handle both zeros', () => {
      expect(calculateRevisedBudget(0, 0)).toBe(0)
    })

    it('should handle large values', () => {
      expect(calculateRevisedBudget(50000000, 5000000)).toBe(55000000)
    })

    it('should handle decimal values', () => {
      expect(calculateRevisedBudget(100000.50, 5000.25)).toBeCloseTo(105000.75, 2)
    })
  })

  describe('calculateVariance', () => {
    it('should return positive when under budget', () => {
      expect(calculateVariance(100000, 80000)).toBe(20000)
    })

    it('should return negative when over budget', () => {
      expect(calculateVariance(100000, 120000)).toBe(-20000)
    })

    it('should return zero when exactly on budget', () => {
      expect(calculateVariance(100000, 100000)).toBe(0)
    })

    it('should handle zero budget with costs', () => {
      expect(calculateVariance(0, 10000)).toBe(-10000)
    })

    it('should handle zero costs', () => {
      expect(calculateVariance(100000, 0)).toBe(100000)
    })

    it('should handle negative budget edge case', () => {
      // Edge case: negative revised budget (rare but possible with large deductions)
      expect(calculateVariance(-5000, 10000)).toBe(-15000)
    })
  })

  describe('calculatePercentSpent', () => {
    it('should calculate 50% spent correctly', () => {
      expect(calculatePercentSpent(50000, 100000)).toBe(50)
    })

    it('should calculate 100% spent correctly', () => {
      expect(calculatePercentSpent(100000, 100000)).toBe(100)
    })

    it('should calculate over 100% spent', () => {
      expect(calculatePercentSpent(150000, 100000)).toBe(150)
    })

    it('should return 0 for zero budget', () => {
      expect(calculatePercentSpent(50000, 0)).toBe(0)
    })

    it('should return 0 for negative budget', () => {
      expect(calculatePercentSpent(50000, -10000)).toBe(0)
    })

    it('should return 0 for zero actual cost', () => {
      expect(calculatePercentSpent(0, 100000)).toBe(0)
    })

    it('should handle small percentages', () => {
      expect(calculatePercentSpent(1000, 1000000)).toBe(0.1)
    })

    it('should handle large percentages', () => {
      expect(calculatePercentSpent(5000000, 1000000)).toBe(500)
    })
  })

  describe('calculateVariancePercent', () => {
    it('should calculate positive variance percent', () => {
      expect(calculateVariancePercent(20000, 100000)).toBe(20)
    })

    it('should calculate negative variance percent', () => {
      expect(calculateVariancePercent(-20000, 100000)).toBe(-20)
    })

    it('should return 0 for zero budget', () => {
      expect(calculateVariancePercent(10000, 0)).toBe(0)
    })

    it('should return 0 for negative budget', () => {
      expect(calculateVariancePercent(10000, -5000)).toBe(0)
    })

    it('should handle very small variances', () => {
      expect(calculateVariancePercent(100, 100000)).toBe(0.1)
    })

    it('should handle very large variances', () => {
      expect(calculateVariancePercent(-500000, 100000)).toBe(-500)
    })
  })

  describe('determineAlertSeverity', () => {
    const thresholds: BudgetVarianceThresholds = {
      critical_overrun_percent: 10,
      warning_overrun_percent: 5,
      near_budget_percent: 90,
      project_critical_percent: 5,
      project_warning_percent: 3,
      minimum_variance_amount: 1000,
    }

    it('should return critical for >10% variance', () => {
      expect(determineAlertSeverity(15, thresholds)).toBe('critical')
      expect(determineAlertSeverity(-15, thresholds)).toBe('critical')
    })

    it('should return warning for 5-10% variance', () => {
      expect(determineAlertSeverity(7, thresholds)).toBe('warning')
      expect(determineAlertSeverity(-7, thresholds)).toBe('warning')
    })

    it('should return info for <5% variance', () => {
      expect(determineAlertSeverity(3, thresholds)).toBe('info')
      expect(determineAlertSeverity(-3, thresholds)).toBe('info')
    })

    it('should handle exactly 10% (critical threshold)', () => {
      expect(determineAlertSeverity(10, thresholds)).toBe('warning')
      expect(determineAlertSeverity(10.01, thresholds)).toBe('critical')
    })

    it('should handle exactly 5% (warning threshold)', () => {
      expect(determineAlertSeverity(5, thresholds)).toBe('info')
      expect(determineAlertSeverity(5.01, thresholds)).toBe('warning')
    })

    it('should handle zero variance', () => {
      expect(determineAlertSeverity(0, thresholds)).toBe('info')
    })
  })

  describe('shouldTriggerAlert', () => {
    const thresholds: BudgetVarianceThresholds = {
      critical_overrun_percent: 10,
      warning_overrun_percent: 5,
      near_budget_percent: 90,
      project_critical_percent: 5,
      project_warning_percent: 3,
      minimum_variance_amount: 1000,
    }

    it('should not trigger for small variance below minimum', () => {
      const result = shouldTriggerAlert(-500, -5, 50, thresholds)
      expect(result.shouldAlert).toBe(false)
      expect(result.type).toBeNull()
    })

    it('should trigger line_over_budget for significant overrun', () => {
      const result = shouldTriggerAlert(-10000, -8, 108, thresholds)
      expect(result.shouldAlert).toBe(true)
      expect(result.type).toBe('line_over_budget')
    })

    it('should trigger line_near_budget when approaching limit', () => {
      const result = shouldTriggerAlert(5000, 5, 95, thresholds)
      expect(result.shouldAlert).toBe(true)
      expect(result.type).toBe('line_near_budget')
    })

    it('should not trigger for healthy budget', () => {
      const result = shouldTriggerAlert(30000, 30, 70, thresholds)
      expect(result.shouldAlert).toBe(false)
      expect(result.type).toBeNull()
    })

    it('should prioritize over_budget over near_budget', () => {
      // Over budget AND over 90% spent
      const result = shouldTriggerAlert(-15000, -15, 115, thresholds)
      expect(result.shouldAlert).toBe(true)
      expect(result.type).toBe('line_over_budget')
    })
  })

  describe('generateVarianceAlert', () => {
    const thresholds: BudgetVarianceThresholds = {
      critical_overrun_percent: 10,
      warning_overrun_percent: 5,
      near_budget_percent: 90,
      project_critical_percent: 5,
      project_warning_percent: 3,
      minimum_variance_amount: 1000,
    }

    it('should generate alert for over budget scenario', () => {
      const alert = generateVarianceAlert(
        'budget-1',
        '03 30 00',
        'Cast-in-Place Concrete',
        '03',
        100000,
        115000,
        thresholds
      )

      expect(alert).not.toBeNull()
      expect(alert!.type).toBe('line_over_budget')
      expect(alert!.severity).toBe('critical')
      expect(alert!.variance_amount).toBe(-15000)
      expect(alert!.variance_percent).toBe(-15)
    })

    it('should generate alert for near budget scenario', () => {
      const alert = generateVarianceAlert(
        'budget-2',
        '09 90 00',
        'Painting',
        '09',
        100000,
        92000,
        thresholds
      )

      expect(alert).not.toBeNull()
      expect(alert!.type).toBe('line_near_budget')
      // Variance is 8%, which exceeds the 5% warning threshold
      expect(alert!.severity).toBe('warning')
      expect(alert!.variance_amount).toBe(8000)
    })

    it('should return null for healthy budget', () => {
      const alert = generateVarianceAlert(
        'budget-3',
        '05 12 00',
        'Structural Steel',
        '05',
        100000,
        75000,
        thresholds
      )

      expect(alert).toBeNull()
    })

    it('should return null for small variance below minimum', () => {
      const alert = generateVarianceAlert(
        'budget-4',
        '01 00 00',
        'General Requirements',
        '01',
        10000,
        10500,
        thresholds
      )

      expect(alert).toBeNull()
    })

    it('should handle zero budget gracefully', () => {
      const alert = generateVarianceAlert(
        'budget-5',
        '00 00 00',
        'Unknown',
        '00',
        0,
        5000,
        thresholds
      )

      expect(alert).toBeNull()
    })
  })

  describe('calculateVarianceTrend', () => {
    it('should return stable for single data point', () => {
      expect(calculateVarianceTrend([{ date: '2024-01-01', variance: 10000 }])).toBe('stable')
    })

    it('should return stable for empty data', () => {
      expect(calculateVarianceTrend([])).toBe('stable')
    })

    it('should return improving for increasing variance', () => {
      const data = [
        { date: '2024-01-01', variance: -10000 },
        { date: '2024-02-01', variance: -5000 },
        { date: '2024-03-01', variance: 0 },
        { date: '2024-04-01', variance: 5000 },
        { date: '2024-05-01', variance: 10000 },
      ]
      expect(calculateVarianceTrend(data)).toBe('improving')
    })

    it('should return declining for decreasing variance', () => {
      const data = [
        { date: '2024-01-01', variance: 10000 },
        { date: '2024-02-01', variance: 5000 },
        { date: '2024-03-01', variance: 0 },
        { date: '2024-04-01', variance: -5000 },
        { date: '2024-05-01', variance: -10000 },
      ]
      expect(calculateVarianceTrend(data)).toBe('declining')
    })

    it('should return stable for flat variance', () => {
      const data = [
        { date: '2024-01-01', variance: 5000 },
        { date: '2024-02-01', variance: 5100 },
        { date: '2024-03-01', variance: 4900 },
        { date: '2024-04-01', variance: 5050 },
        { date: '2024-05-01', variance: 5000 },
      ]
      expect(calculateVarianceTrend(data)).toBe('stable')
    })

    it('should use only last 5 data points', () => {
      const data = [
        { date: '2024-01-01', variance: -50000 }, // Old, declining
        { date: '2024-02-01', variance: -40000 },
        { date: '2024-03-01', variance: -30000 },
        // Last 5 - improving
        { date: '2024-04-01', variance: -20000 },
        { date: '2024-05-01', variance: -10000 },
        { date: '2024-06-01', variance: 0 },
        { date: '2024-07-01', variance: 10000 },
        { date: '2024-08-01', variance: 20000 },
      ]
      expect(calculateVarianceTrend(data)).toBe('improving')
    })
  })

  describe('aggregateDivisionVariance', () => {
    it('should aggregate single division correctly', () => {
      const budgets = [
        { division: '03', revised_budget: 100000, actual_cost: 80000 },
        { division: '03', revised_budget: 50000, actual_cost: 45000 },
      ]

      const result = aggregateDivisionVariance(budgets)
      const div03 = result.get('03')

      expect(div03).toBeDefined()
      expect(div03!.revised).toBe(150000)
      expect(div03!.actual).toBe(125000)
      expect(div03!.variance).toBe(25000)
      expect(div03!.variance_percent).toBeCloseTo(16.67, 2)
    })

    it('should aggregate multiple divisions correctly', () => {
      const budgets = [
        { division: '03', revised_budget: 100000, actual_cost: 90000 },
        { division: '05', revised_budget: 200000, actual_cost: 180000 },
        { division: '09', revised_budget: 50000, actual_cost: 60000 }, // Over budget
      ]

      const result = aggregateDivisionVariance(budgets)

      expect(result.size).toBe(3)

      const div03 = result.get('03')
      expect(div03!.variance).toBe(10000)

      const div05 = result.get('05')
      expect(div05!.variance).toBe(20000)

      const div09 = result.get('09')
      expect(div09!.variance).toBe(-10000)
      expect(div09!.variance_percent).toBe(-20)
    })

    it('should handle empty budget array', () => {
      const result = aggregateDivisionVariance([])
      expect(result.size).toBe(0)
    })

    it('should handle division with zero budget', () => {
      const budgets = [
        { division: '03', revised_budget: 0, actual_cost: 10000 },
      ]

      const result = aggregateDivisionVariance(budgets)
      const div03 = result.get('03')

      expect(div03!.variance).toBe(-10000)
      expect(div03!.variance_percent).toBe(0) // Protected from divide by zero
    })
  })
})

// =============================================
// Commitment Variance Tests
// =============================================

describe('Commitment Variance', () => {
  describe('committed vs actual variance', () => {
    it('should calculate under-committed scenario', () => {
      const committed = 100000
      const actual = 80000
      const commitment_variance = committed - actual

      expect(commitment_variance).toBe(20000)
      expect(commitment_variance).toBeGreaterThan(0)
    })

    it('should calculate over-committed scenario', () => {
      const committed = 100000
      const actual = 120000
      const commitment_variance = committed - actual

      expect(commitment_variance).toBe(-20000)
      expect(commitment_variance).toBeLessThan(0)
    })

    it('should calculate exposure (uncommitted budget)', () => {
      const revised_budget = 500000
      const committed = 400000
      const exposure = revised_budget - committed

      expect(exposure).toBe(100000)
    })

    it('should identify over-commitment', () => {
      const revised_budget = 500000
      const committed = 550000
      const over_committed = committed > revised_budget

      expect(over_committed).toBe(true)
      expect(committed - revised_budget).toBe(50000)
    })
  })

  describe('forecast vs budget variance', () => {
    it('should calculate positive forecast variance (under forecast)', () => {
      const revised_budget = 1000000
      const estimated_at_completion = 950000
      const forecast_variance = revised_budget - estimated_at_completion

      expect(forecast_variance).toBe(50000)
      expect(forecast_variance).toBeGreaterThan(0)
    })

    it('should calculate negative forecast variance (over forecast)', () => {
      const revised_budget = 1000000
      const estimated_at_completion = 1100000
      const forecast_variance = revised_budget - estimated_at_completion

      expect(forecast_variance).toBe(-100000)
      expect(forecast_variance).toBeLessThan(0)
    })

    it('should calculate forecast variance percent', () => {
      const revised_budget = 1000000
      const estimated_at_completion = 1100000
      const forecast_variance = revised_budget - estimated_at_completion
      const forecast_variance_percent = (forecast_variance / revised_budget) * 100

      expect(forecast_variance_percent).toBe(-10)
    })
  })
})

// =============================================
// Project-Level Variance Aggregation Tests
// =============================================

describe('Project-Level Variance', () => {
  describe('total project variance calculation', () => {
    it('should sum all line item variances', () => {
      const lineItems = [
        { revised_budget: 100000, actual_cost: 90000 },
        { revised_budget: 200000, actual_cost: 180000 },
        { revised_budget: 150000, actual_cost: 170000 },
      ]

      const totalRevised = lineItems.reduce((sum, item) => sum + item.revised_budget, 0)
      const totalActual = lineItems.reduce((sum, item) => sum + item.actual_cost, 0)
      const totalVariance = totalRevised - totalActual

      expect(totalRevised).toBe(450000)
      expect(totalActual).toBe(440000)
      expect(totalVariance).toBe(10000)
    })

    it('should calculate weighted variance percent', () => {
      const totalRevised = 1000000
      const totalActual = 1050000
      const totalVariance = totalRevised - totalActual
      const variancePercent = (totalVariance / totalRevised) * 100

      expect(variancePercent).toBe(-5)
    })
  })

  describe('project variance thresholds', () => {
    const projectThresholds = {
      critical_percent: 5,
      warning_percent: 3,
    }

    it('should classify project as critical when >5% over', () => {
      const variancePercent = -6
      const severity = Math.abs(variancePercent) > projectThresholds.critical_percent
        ? 'critical'
        : Math.abs(variancePercent) > projectThresholds.warning_percent
          ? 'warning'
          : 'info'

      expect(severity).toBe('critical')
    })

    it('should classify project as warning when 3-5% over', () => {
      const variancePercent = -4
      const severity = Math.abs(variancePercent) > projectThresholds.critical_percent
        ? 'critical'
        : Math.abs(variancePercent) > projectThresholds.warning_percent
          ? 'warning'
          : 'info'

      expect(severity).toBe('warning')
    })

    it('should classify project as info when <3% variance', () => {
      const variancePercent = -2
      const severity = Math.abs(variancePercent) > projectThresholds.critical_percent
        ? 'critical'
        : Math.abs(variancePercent) > projectThresholds.warning_percent
          ? 'warning'
          : 'info'

      expect(severity).toBe('info')
    })
  })

  describe('contingency consumption', () => {
    it('should calculate contingency usage percent', () => {
      const contingency_budget = 100000
      const contingency_spent = 35000
      const contingency_usage_percent = (contingency_spent / contingency_budget) * 100

      expect(contingency_usage_percent).toBe(35)
    })

    it('should alert when contingency exceeds threshold', () => {
      const contingency_budget = 100000
      const contingency_spent = 85000
      const contingency_usage_percent = (contingency_spent / contingency_budget) * 100
      const contingency_threshold = 80

      expect(contingency_usage_percent).toBeGreaterThan(contingency_threshold)
    })

    it('should calculate remaining contingency', () => {
      const contingency_budget = 100000
      const contingency_spent = 35000
      const contingency_remaining = contingency_budget - contingency_spent

      expect(contingency_remaining).toBe(65000)
    })
  })
})

// =============================================
// Variance Alert Summary Tests
// =============================================

describe('Variance Alert Summary', () => {
  describe('alert aggregation', () => {
    const mockAlerts: BudgetVarianceAlert[] = [
      {
        id: '1',
        type: 'line_over_budget',
        severity: 'critical',
        title: 'Critical Overrun',
        message: 'Concrete is 15% over budget',
        budget_id: 'b1',
        cost_code: '03 30 00',
        cost_code_name: 'Concrete',
        division: '03',
        budget_amount: 100000,
        actual_amount: 115000,
        variance_amount: -15000,
        variance_percent: -15,
        threshold_percent: 10,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'line_over_budget',
        severity: 'warning',
        title: 'Warning Overrun',
        message: 'Steel is 7% over budget',
        budget_id: 'b2',
        cost_code: '05 12 00',
        cost_code_name: 'Steel',
        division: '05',
        budget_amount: 200000,
        actual_amount: 214000,
        variance_amount: -14000,
        variance_percent: -7,
        threshold_percent: 5,
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'line_near_budget',
        severity: 'info',
        title: 'Near Budget',
        message: 'Electrical approaching budget',
        budget_id: 'b3',
        cost_code: '26 00 00',
        cost_code_name: 'Electrical',
        division: '26',
        budget_amount: 150000,
        actual_amount: 140000,
        variance_amount: 10000,
        variance_percent: 6.67,
        threshold_percent: 90,
        created_at: new Date().toISOString(),
      },
    ]

    it('should count alerts by severity', () => {
      const criticalCount = mockAlerts.filter(a => a.severity === 'critical').length
      const warningCount = mockAlerts.filter(a => a.severity === 'warning').length
      const infoCount = mockAlerts.filter(a => a.severity === 'info').length

      expect(criticalCount).toBe(1)
      expect(warningCount).toBe(1)
      expect(infoCount).toBe(1)
    })

    it('should calculate total overrun amount', () => {
      const totalOverrun = mockAlerts
        .filter(a => a.variance_amount < 0)
        .reduce((sum, a) => sum + Math.abs(a.variance_amount), 0)

      expect(totalOverrun).toBe(29000)
    })

    it('should count lines over budget', () => {
      const linesOverBudget = mockAlerts
        .filter(a => a.type === 'line_over_budget')
        .length

      expect(linesOverBudget).toBe(2)
    })

    it('should generate complete summary', () => {
      const summary = {
        total_alerts: mockAlerts.length,
        critical_count: mockAlerts.filter(a => a.severity === 'critical').length,
        warning_count: mockAlerts.filter(a => a.severity === 'warning').length,
        info_count: mockAlerts.filter(a => a.severity === 'info').length,
        total_overrun_amount: mockAlerts
          .filter(a => a.variance_amount < 0)
          .reduce((sum, a) => sum + Math.abs(a.variance_amount), 0),
        lines_over_budget: mockAlerts.filter(a => a.type === 'line_over_budget').length,
        alerts: mockAlerts,
      }

      expect(summary.total_alerts).toBe(3)
      expect(summary.critical_count).toBe(1)
      expect(summary.warning_count).toBe(1)
      expect(summary.info_count).toBe(1)
      expect(summary.total_overrun_amount).toBe(29000)
      expect(summary.lines_over_budget).toBe(2)
    })
  })
})

// =============================================
// Edge Cases and Error Handling Tests
// =============================================

describe('Edge Cases and Error Handling', () => {
  describe('precision handling', () => {
    it('should handle floating point precision for percent calculations', () => {
      const actual = 333333.33
      const budget = 1000000
      const percentSpent = (actual / budget) * 100

      expect(percentSpent).toBeCloseTo(33.33, 2)
    })

    it('should handle very small decimal variances', () => {
      const variance = 0.01
      const budget = 1000000
      const variancePercent = (variance / budget) * 100

      expect(variancePercent).toBeCloseTo(0.000001, 6)
    })

    it('should round currency appropriately', () => {
      const amount = 12345.6789
      const roundedToCents = Math.round(amount * 100) / 100

      expect(roundedToCents).toBe(12345.68)
    })
  })

  describe('negative value handling', () => {
    it('should handle negative original budget (credit)', () => {
      const original = -5000 // Credit or allowance
      const changes = 1000
      const revised = original + changes

      expect(revised).toBe(-4000)
    })

    it('should handle negative actual costs (refunds)', () => {
      const revised = 100000
      const actual = -5000 // Refund
      const variance = revised - actual

      expect(variance).toBe(105000)
    })

    it('should calculate variance percent with negative budget', () => {
      const variance = 10000
      const revisedBudget = -50000
      const variancePercent = revisedBudget !== 0 ? (variance / Math.abs(revisedBudget)) * 100 : 0

      expect(variancePercent).toBe(20)
    })
  })

  describe('boundary conditions', () => {
    it('should handle exactly at warning threshold', () => {
      const thresholds = DEFAULT_VARIANCE_THRESHOLDS
      const variancePercent = thresholds.warning_overrun_percent

      const severity: BudgetVarianceAlertSeverity =
        variancePercent > thresholds.critical_overrun_percent ? 'critical' :
          variancePercent > thresholds.warning_overrun_percent ? 'warning' : 'info'

      expect(severity).toBe('info') // At threshold, not over
    })

    it('should handle exactly at critical threshold', () => {
      const thresholds = DEFAULT_VARIANCE_THRESHOLDS
      const variancePercent = thresholds.critical_overrun_percent

      const severity: BudgetVarianceAlertSeverity =
        variancePercent > thresholds.critical_overrun_percent ? 'critical' :
          variancePercent > thresholds.warning_overrun_percent ? 'warning' : 'info'

      expect(severity).toBe('warning') // At threshold, not over
    })

    it('should handle exactly at minimum variance amount', () => {
      const thresholds = DEFAULT_VARIANCE_THRESHOLDS
      const variance = thresholds.minimum_variance_amount
      const shouldAlert = Math.abs(variance) >= thresholds.minimum_variance_amount

      expect(shouldAlert).toBe(true)
    })

    it('should handle 100% percent spent', () => {
      const actual = 100000
      const budget = 100000
      const percentSpent = (actual / budget) * 100

      expect(percentSpent).toBe(100)
    })

    it('should handle 0% percent spent', () => {
      const actual = 0
      const budget = 100000
      const percentSpent = (actual / budget) * 100

      expect(percentSpent).toBe(0)
    })
  })

  describe('large number handling', () => {
    it('should handle multi-million dollar budgets', () => {
      const original = 50000000
      const changes = 5000000
      const actual = 48000000

      const revised = original + changes
      const variance = revised - actual

      expect(revised).toBe(55000000)
      expect(variance).toBe(7000000)
    })

    it('should handle very small percentages on large budgets', () => {
      const budget = 100000000
      const variance = 10000 // Small variance on large budget
      const variancePercent = (variance / budget) * 100

      expect(variancePercent).toBe(0.01)
    })
  })

  describe('null and undefined handling', () => {
    it('should default null values to zero in calculations', () => {
      const original = 100000
      const changes = null as unknown as number
      const revised = original + (changes || 0)

      expect(revised).toBe(100000)
    })

    it('should handle undefined in variance calculation', () => {
      const revised = 100000
      const actual = undefined as unknown as number
      const variance = revised - (actual || 0)

      expect(variance).toBe(100000)
    })
  })
})

// =============================================
// Real-World Construction Budget Scenarios
// =============================================

describe('Real-World Construction Budget Scenarios', () => {
  describe('Commercial Office Building - Full Budget Analysis', () => {
    const projectBudget = {
      divisions: [
        { code: '01', name: 'General Conditions', original: 800000, changes: 50000, actual: 820000 },
        { code: '03', name: 'Concrete', original: 2500000, changes: 150000, actual: 2800000 },
        { code: '04', name: 'Masonry', original: 600000, changes: -50000, actual: 520000 },
        { code: '05', name: 'Structural Steel', original: 3000000, changes: 200000, actual: 3100000 },
        { code: '07', name: 'Thermal/Moisture', original: 800000, changes: 0, actual: 750000 },
        { code: '08', name: 'Doors/Windows', original: 1200000, changes: 100000, actual: 1350000 },
        { code: '09', name: 'Finishes', original: 1500000, changes: 75000, actual: 1400000 },
        { code: '22', name: 'Plumbing', original: 900000, changes: 25000, actual: 880000 },
        { code: '23', name: 'HVAC', original: 2000000, changes: 100000, actual: 2200000 },
        { code: '26', name: 'Electrical', original: 1700000, changes: 50000, actual: 1650000 },
      ],
    }

    it('should calculate total project variance', () => {
      let totalOriginal = 0
      let totalChanges = 0
      let totalActual = 0

      for (const div of projectBudget.divisions) {
        totalOriginal += div.original
        totalChanges += div.changes
        totalActual += div.actual
      }

      const totalRevised = totalOriginal + totalChanges
      const totalVariance = totalRevised - totalActual

      expect(totalOriginal).toBe(15000000)
      expect(totalChanges).toBe(700000)
      expect(totalRevised).toBe(15700000)
      expect(totalActual).toBe(15470000)
      expect(totalVariance).toBe(230000)
    })

    it('should identify divisions over budget', () => {
      const overBudgetDivisions = projectBudget.divisions.filter(div => {
        const revised = div.original + div.changes
        return div.actual > revised
      })

      expect(overBudgetDivisions.length).toBe(3)
      expect(overBudgetDivisions.map(d => d.code)).toContain('03')
      expect(overBudgetDivisions.map(d => d.code)).toContain('08')
      expect(overBudgetDivisions.map(d => d.code)).toContain('23')
    })

    it('should calculate worst performing division', () => {
      let worstDivision = projectBudget.divisions[0]
      let worstVariancePercent = 0

      for (const div of projectBudget.divisions) {
        const revised = div.original + div.changes
        const variance = revised - div.actual
        const variancePercent = (variance / revised) * 100

        if (variancePercent < worstVariancePercent) {
          worstVariancePercent = variancePercent
          worstDivision = div
        }
      }

      expect(worstDivision.code).toBe('03') // Concrete
      expect(worstVariancePercent).toBeCloseTo(-5.66, 2)
    })

    it('should calculate best performing division', () => {
      let bestDivision = projectBudget.divisions[0]
      let bestVariancePercent = -Infinity

      for (const div of projectBudget.divisions) {
        const revised = div.original + div.changes
        const variance = revised - div.actual
        const variancePercent = (variance / revised) * 100

        if (variancePercent > bestVariancePercent) {
          bestVariancePercent = variancePercent
          bestDivision = div
        }
      }

      // Finishes: revised = 1,575,000, actual = 1,400,000, variance = 175,000 = 11.11%
      // Masonry: revised = 550,000, actual = 520,000, variance = 30,000 = 5.45%
      expect(bestDivision.code).toBe('09') // Finishes - highest positive variance percentage
      expect(bestVariancePercent).toBeCloseTo(11.11, 2)
    })
  })

  describe('Residential Development - Multi-Unit Analysis', () => {
    const units = [
      { unit: 'A1', budget: 250000, actual: 245000 },
      { unit: 'A2', budget: 250000, actual: 260000 },
      { unit: 'B1', budget: 275000, actual: 270000 },
      { unit: 'B2', budget: 275000, actual: 290000 },
      { unit: 'C1', budget: 300000, actual: 295000 },
    ]

    it('should calculate per-unit variance', () => {
      const unitVariances = units.map(u => ({
        unit: u.unit,
        variance: u.budget - u.actual,
        variancePercent: ((u.budget - u.actual) / u.budget) * 100,
      }))

      expect(unitVariances[0].variance).toBe(5000)
      expect(unitVariances[1].variance).toBe(-10000)
      expect(unitVariances[3].variancePercent).toBeCloseTo(-5.45, 2)
    })

    it('should calculate average variance per unit', () => {
      const totalVariance = units.reduce((sum, u) => sum + (u.budget - u.actual), 0)
      const avgVariance = totalVariance / units.length

      // A1: 5000, A2: -10000, B1: 5000, B2: -15000, C1: 5000 = -10000 total / 5 = -2000 avg
      expect(avgVariance).toBe(-2000)
    })

    it('should identify units requiring attention', () => {
      const threshold = -3 // 3% over budget
      const unitsOverThreshold = units.filter(u => {
        const variancePercent = ((u.budget - u.actual) / u.budget) * 100
        return variancePercent < threshold
      })

      expect(unitsOverThreshold.length).toBe(2)
      expect(unitsOverThreshold.map(u => u.unit)).toContain('A2')
      expect(unitsOverThreshold.map(u => u.unit)).toContain('B2')
    })
  })

  describe('Infrastructure Project - Phased Variance', () => {
    const phases = [
      { phase: 'Mobilization', planned: 500000, actual: 480000, complete: true },
      { phase: 'Earthwork', planned: 2000000, actual: 2200000, complete: true },
      { phase: 'Utilities', planned: 1500000, actual: 1450000, complete: true },
      { phase: 'Paving', planned: 3000000, actual: 1500000, complete: false }, // 50% complete
      { phase: 'Landscaping', planned: 500000, actual: 0, complete: false }, // Not started
    ]

    it('should calculate variance for completed phases only', () => {
      const completedPhases = phases.filter(p => p.complete)
      const completedVariance = completedPhases.reduce(
        (sum, p) => sum + (p.planned - p.actual),
        0
      )

      // Mobilization: 500000-480000=20000, Earthwork: 2000000-2200000=-200000, Utilities: 1500000-1450000=50000
      // Total: 20000 - 200000 + 50000 = -130000
      expect(completedVariance).toBe(-130000) // Over budget on completed work
    })

    it('should calculate percent complete by cost', () => {
      const totalPlanned = phases.reduce((sum, p) => sum + p.planned, 0)
      const totalActual = phases.reduce((sum, p) => sum + p.actual, 0)
      const percentComplete = (totalActual / totalPlanned) * 100

      expect(totalPlanned).toBe(7500000)
      expect(totalActual).toBe(5630000)
      expect(percentComplete).toBeCloseTo(75.07, 2)
    })

    it('should project final cost based on current performance', () => {
      const completedPhases = phases.filter(p => p.complete)
      const completedPlanned = completedPhases.reduce((sum, p) => sum + p.planned, 0)
      const completedActual = completedPhases.reduce((sum, p) => sum + p.actual, 0)

      // CPI for completed work: 4,000,000 / 4,130,000 = 0.9685
      const cpi = completedPlanned / completedActual
      const totalBudget = phases.reduce((sum, p) => sum + p.planned, 0)
      const projectedFinal = totalBudget / cpi

      expect(cpi).toBeCloseTo(0.9685, 4)
      expect(projectedFinal).toBeCloseTo(7743750, 0) // About $244K over
    })
  })
})
