/**
 * Earned Value Management (EVM) Calculation Utilities
 *
 * Pure functions for EVM calculations following PMI/PMBOK methodology.
 * These functions are isolated from API calls for easier testing and reuse.
 */

import {
  DEFAULT_EVM_THRESHOLDS,
  type EarnedValueMetrics,
  type EVMPerformanceStatus,
  type EVMThresholds,
} from '@/types/cost-tracking';

// Re-export the defaults for convenience
export { DEFAULT_EVM_THRESHOLDS };

// ============================================================================
// CORE EVM CALCULATIONS
// ============================================================================

/**
 * Calculate Cost Performance Index (CPI)
 * CPI = EV / AC
 *
 * @param ev - Earned Value (Budgeted Cost of Work Performed)
 * @param ac - Actual Cost (Actual Cost of Work Performed)
 * @returns CPI value or 0 if AC is 0
 *
 * Interpretation:
 * - CPI > 1: Under budget (good)
 * - CPI = 1: On budget
 * - CPI < 1: Over budget (bad)
 */
export function calculateCPI(ev: number, ac: number): number {
  if (ac === 0) {
    // If no actual cost and no earned value, CPI is undefined but return 0
    // If earned value but no cost, project is "free" - return a high value
    return ev > 0 ? Infinity : 0;
  }
  return ev / ac;
}

/**
 * Calculate Schedule Performance Index (SPI)
 * SPI = EV / PV
 *
 * @param ev - Earned Value
 * @param pv - Planned Value (Budgeted Cost of Work Scheduled)
 * @returns SPI value or 0 if PV is 0
 *
 * Interpretation:
 * - SPI > 1: Ahead of schedule (good)
 * - SPI = 1: On schedule
 * - SPI < 1: Behind schedule (bad)
 */
export function calculateSPI(ev: number, pv: number): number {
  if (pv === 0) {
    return ev > 0 ? Infinity : 0;
  }
  return ev / pv;
}

/**
 * Calculate Cost-Schedule Index (CSI)
 * CSI = CPI x SPI
 *
 * Critical combined metric that shows overall project health
 *
 * @param cpi - Cost Performance Index
 * @param spi - Schedule Performance Index
 * @returns CSI value
 *
 * Interpretation:
 * - CSI > 1: Project performing well on both cost and schedule
 * - CSI = 1: Project on track
 * - CSI < 1: Project has issues (lower = worse)
 * - CSI < 0.8: Critical - project likely to fail
 */
export function calculateCSI(cpi: number, spi: number): number {
  return cpi * spi;
}

/**
 * Calculate Cost Variance (CV)
 * CV = EV - AC
 *
 * @param ev - Earned Value
 * @param ac - Actual Cost
 * @returns Cost variance (positive = under budget, negative = over budget)
 */
export function calculateCV(ev: number, ac: number): number {
  return ev - ac;
}

/**
 * Calculate Schedule Variance (SV)
 * SV = EV - PV
 *
 * @param ev - Earned Value
 * @param pv - Planned Value
 * @returns Schedule variance (positive = ahead, negative = behind)
 */
export function calculateSV(ev: number, pv: number): number {
  return ev - pv;
}

/**
 * Calculate Cost Variance Percentage
 * CV% = (CV / EV) x 100
 *
 * @param cv - Cost Variance
 * @param ev - Earned Value
 * @returns Percentage variance
 */
export function calculateCVPercent(cv: number, ev: number): number {
  if (ev === 0) {return 0;}
  return (cv / ev) * 100;
}

/**
 * Calculate Schedule Variance Percentage
 * SV% = (SV / PV) x 100
 *
 * @param sv - Schedule Variance
 * @param pv - Planned Value
 * @returns Percentage variance
 */
export function calculateSVPercent(sv: number, pv: number): number {
  if (pv === 0) {return 0;}
  return (sv / pv) * 100;
}

// ============================================================================
// FORECASTING CALCULATIONS
// ============================================================================

/**
 * Calculate Estimate at Completion (EAC) using CPI method
 * EAC = BAC / CPI
 *
 * Assumes future performance will match current CPI
 *
 * @param bac - Budget at Completion
 * @param cpi - Cost Performance Index
 * @returns Estimated final cost
 */
export function calculateEAC(bac: number, cpi: number): number {
  if (cpi === 0) {return Infinity;}
  if (cpi === Infinity) {return 0;}
  return bac / cpi;
}

/**
 * Calculate EAC using CPI x SPI method (more aggressive)
 * EAC = AC + ((BAC - EV) / (CPI x SPI))
 *
 * @param ac - Actual Cost
 * @param bac - Budget at Completion
 * @param ev - Earned Value
 * @param cpi - Cost Performance Index
 * @param spi - Schedule Performance Index
 * @returns Estimated final cost with schedule factor
 */
export function calculateEACWithSPI(
  ac: number,
  bac: number,
  ev: number,
  cpi: number,
  spi: number
): number {
  const csi = cpi * spi;
  if (csi === 0) {return Infinity;}
  if (csi === Infinity) {return ac;}
  return ac + (bac - ev) / csi;
}

/**
 * Calculate Estimate to Complete (ETC)
 * ETC = EAC - AC
 *
 * @param eac - Estimate at Completion
 * @param ac - Actual Cost
 * @returns Estimated remaining cost
 */
export function calculateETC(eac: number, ac: number): number {
  if (eac === Infinity) {return Infinity;}
  return eac - ac;
}

/**
 * Calculate Variance at Completion (VAC)
 * VAC = BAC - EAC
 *
 * @param bac - Budget at Completion
 * @param eac - Estimate at Completion
 * @returns Expected variance at project end (positive = under budget)
 */
export function calculateVAC(bac: number, eac: number): number {
  if (eac === Infinity) {return -Infinity;}
  return bac - eac;
}

/**
 * Calculate VAC Percentage
 * VAC% = (VAC / BAC) x 100
 *
 * @param vac - Variance at Completion
 * @param bac - Budget at Completion
 * @returns Percentage variance at completion
 */
export function calculateVACPercent(vac: number, bac: number): number {
  if (bac === 0) {return 0;}
  if (vac === -Infinity) {return -Infinity;}
  return (vac / bac) * 100;
}

/**
 * Calculate To-Complete Performance Index (TCPI) for BAC
 * TCPI_BAC = (BAC - EV) / (BAC - AC)
 *
 * Performance needed to meet original budget
 *
 * @param bac - Budget at Completion
 * @param ev - Earned Value
 * @param ac - Actual Cost
 * @returns Required CPI to meet BAC
 */
export function calculateTCPI_BAC(bac: number, ev: number, ac: number): number {
  const remainingWork = bac - ev;
  const remainingBudget = bac - ac;

  if (remainingBudget === 0) {
    // No budget remaining
    return remainingWork > 0 ? Infinity : 0;
  }
  if (remainingBudget < 0) {
    // Already over budget
    return Infinity;
  }

  return remainingWork / remainingBudget;
}

/**
 * Calculate To-Complete Performance Index (TCPI) for EAC
 * TCPI_EAC = (BAC - EV) / (EAC - AC)
 *
 * Performance needed to meet revised estimate
 *
 * @param bac - Budget at Completion
 * @param ev - Earned Value
 * @param eac - Estimate at Completion
 * @param ac - Actual Cost
 * @returns Required CPI to meet EAC
 */
export function calculateTCPI_EAC(
  bac: number,
  ev: number,
  eac: number,
  ac: number
): number {
  const remainingWork = bac - ev;
  const remainingBudget = eac - ac;

  if (remainingBudget === 0) {
    return remainingWork > 0 ? Infinity : 0;
  }
  if (remainingBudget < 0) {
    return Infinity;
  }
  if (eac === Infinity) {
    return 0; // If EAC is infinite, any performance will "meet" it
  }

  return remainingWork / remainingBudget;
}

// ============================================================================
// SCHEDULE FORECASTING
// ============================================================================

/**
 * Calculate estimated project duration based on SPI
 *
 * @param plannedDuration - Original planned duration in days
 * @param spi - Schedule Performance Index
 * @returns Estimated total duration
 */
export function calculateEstimatedDuration(
  plannedDuration: number,
  spi: number
): number {
  if (spi === 0) {return Infinity;}
  if (spi === Infinity) {return 0;}
  return plannedDuration / spi;
}

/**
 * Calculate percent complete (planned)
 * % Complete Planned = (PV / BAC) x 100
 *
 * @param pv - Planned Value
 * @param bac - Budget at Completion
 * @returns Percentage of work that should be complete
 */
export function calculatePercentCompletePlanned(pv: number, bac: number): number {
  if (bac === 0) {return 0;}
  return (pv / bac) * 100;
}

/**
 * Calculate percent complete (actual/earned)
 * % Complete Actual = (EV / BAC) x 100
 *
 * @param ev - Earned Value
 * @param bac - Budget at Completion
 * @returns Percentage of work actually complete
 */
export function calculatePercentCompleteActual(ev: number, bac: number): number {
  if (bac === 0) {return 0;}
  return (ev / bac) * 100;
}

/**
 * Calculate percent spent
 * % Spent = (AC / BAC) x 100
 *
 * @param ac - Actual Cost
 * @param bac - Budget at Completion
 * @returns Percentage of budget spent
 */
export function calculatePercentSpent(ac: number, bac: number): number {
  if (bac === 0) {return 0;}
  return (ac / bac) * 100;
}

// ============================================================================
// STATUS DETERMINATION
// ============================================================================

/**
 * Determine performance status based on index value
 *
 * @param index - CPI or SPI value
 * @param thresholds - Threshold configuration
 * @param type - 'cpi' or 'spi'
 * @returns Performance status
 */
export function getPerformanceStatus(
  index: number,
  thresholds: EVMThresholds = DEFAULT_EVM_THRESHOLDS,
  type: 'cpi' | 'spi' = 'cpi'
): EVMPerformanceStatus {
  // Handle edge cases
  if (index === Infinity) {return 'excellent';}
  if (index === 0 || index === -Infinity || isNaN(index)) {return 'critical';}

  const prefix = type;
  if (index >= thresholds[`${prefix}_excellent`]) {return 'excellent';}
  if (index >= thresholds[`${prefix}_good`]) {return 'good';}
  if (index >= thresholds[`${prefix}_fair`]) {return 'fair';}
  if (index >= thresholds[`${prefix}_poor`]) {return 'poor';}
  return 'critical';
}

/**
 * Determine overall project status based on CPI and SPI
 * Uses the worse of the two statuses
 *
 * @param cpi - Cost Performance Index
 * @param spi - Schedule Performance Index
 * @param thresholds - Threshold configuration
 * @returns Overall performance status
 */
export function getOverallStatus(
  cpi: number,
  spi: number,
  thresholds: EVMThresholds = DEFAULT_EVM_THRESHOLDS
): EVMPerformanceStatus {
  const costStatus = getPerformanceStatus(cpi, thresholds, 'cpi');
  const scheduleStatus = getPerformanceStatus(spi, thresholds, 'spi');

  const statusRank: Record<EVMPerformanceStatus, number> = {
    excellent: 5,
    good: 4,
    fair: 3,
    poor: 2,
    critical: 1,
  };

  // Return the worse status
  return statusRank[costStatus] <= statusRank[scheduleStatus]
    ? costStatus
    : scheduleStatus;
}

// ============================================================================
// COMPREHENSIVE METRICS CALCULATION
// ============================================================================

/**
 * Calculate all EVM metrics from base values
 *
 * @param params - Base EVM values
 * @returns Complete EarnedValueMetrics object
 */
export interface EVMBaseValues {
  BAC: number;
  PV: number;
  EV: number;
  AC: number;
  plannedDuration: number;
  actualDuration: number;
  statusDate: string;
}

export function calculateAllMetrics(
  params: EVMBaseValues,
  thresholds: EVMThresholds = DEFAULT_EVM_THRESHOLDS
): EarnedValueMetrics {
  const { BAC, PV, EV, AC, plannedDuration, actualDuration, statusDate } = params;

  // Core indices
  const CPI = calculateCPI(EV, AC);
  const SPI = calculateSPI(EV, PV);
  const CSI = calculateCSI(CPI, SPI);

  // Variances
  const CV = calculateCV(EV, AC);
  const SV = calculateSV(EV, PV);
  const CV_percent = calculateCVPercent(CV, EV);
  const SV_percent = calculateSVPercent(SV, PV);

  // Forecasts
  const EAC = calculateEAC(BAC, CPI);
  const ETC = calculateETC(EAC, AC);
  const VAC = calculateVAC(BAC, EAC);
  const VAC_percent = calculateVACPercent(VAC, BAC);

  // TCPI
  const TCPI_BAC = calculateTCPI_BAC(BAC, EV, AC);
  const TCPI_EAC = calculateTCPI_EAC(BAC, EV, EAC, AC);

  // Schedule forecasts
  const estimated_duration = calculateEstimatedDuration(plannedDuration, SPI);

  // Percent complete
  const percent_complete_planned = calculatePercentCompletePlanned(PV, BAC);
  const percent_complete_actual = calculatePercentCompleteActual(EV, BAC);
  const percent_spent = calculatePercentSpent(AC, BAC);

  // Status determination
  const cost_status = getPerformanceStatus(CPI, thresholds, 'cpi');
  const schedule_status = getPerformanceStatus(SPI, thresholds, 'spi');
  const overall_status = getOverallStatus(CPI, SPI, thresholds);

  return {
    BAC,
    PV,
    EV,
    AC,
    CV,
    SV,
    CV_percent,
    SV_percent,
    CPI: CPI === Infinity ? 999 : CPI, // Cap for display purposes
    SPI: SPI === Infinity ? 999 : SPI,
    CSI: CSI === Infinity ? 999 : CSI,
    EAC: EAC === Infinity ? BAC * 10 : EAC, // Cap at 10x budget for display
    ETC: ETC === Infinity ? (BAC * 10) - AC : ETC,
    VAC: VAC === -Infinity ? -(BAC * 9) : VAC,
    VAC_percent: VAC_percent === -Infinity ? -900 : VAC_percent,
    TCPI_BAC: TCPI_BAC === Infinity ? 999 : TCPI_BAC,
    TCPI_EAC: TCPI_EAC === Infinity ? 999 : TCPI_EAC,
    planned_duration: plannedDuration,
    actual_duration: actualDuration,
    estimated_duration: estimated_duration === Infinity ? plannedDuration * 10 : estimated_duration,
    percent_complete_planned,
    percent_complete_actual,
    percent_spent,
    cost_status,
    schedule_status,
    overall_status,
    status_date: statusDate,
    data_currency: 'current',
  };
}

// ============================================================================
// VALIDATION AND HELPER FUNCTIONS
// ============================================================================

/**
 * Validate EVM input values
 * Returns an array of validation errors, empty if valid
 */
export function validateEVMInputs(params: Partial<EVMBaseValues>): string[] {
  const errors: string[] = [];

  if (params.BAC !== undefined && params.BAC < 0) {
    errors.push('BAC cannot be negative');
  }
  if (params.PV !== undefined && params.PV < 0) {
    errors.push('PV cannot be negative');
  }
  if (params.EV !== undefined && params.EV < 0) {
    errors.push('EV cannot be negative');
  }
  if (params.AC !== undefined && params.AC < 0) {
    errors.push('AC cannot be negative');
  }
  if (params.EV !== undefined && params.BAC !== undefined && params.EV > params.BAC) {
    errors.push('EV cannot exceed BAC');
  }
  if (params.plannedDuration !== undefined && params.plannedDuration <= 0) {
    errors.push('Planned duration must be positive');
  }
  if (params.actualDuration !== undefined && params.actualDuration < 0) {
    errors.push('Actual duration cannot be negative');
  }

  return errors;
}

/**
 * Safe division helper that handles edge cases
 */
export function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  if (denominator === 0) {return defaultValue;}
  if (!isFinite(numerator) || !isFinite(denominator)) {return defaultValue;}
  return numerator / denominator;
}

/**
 * Round a number to specified decimal places
 */
export function roundTo(value: number, decimals: number = 2): number {
  if (!isFinite(value)) {return value;}
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
