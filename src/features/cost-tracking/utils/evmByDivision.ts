/**
 * EVM by Division Calculation Utilities
 *
 * Functions for aggregating and calculating EVM metrics by cost code division.
 * Supports weighted calculations and division-level forecasting.
 */

import type {
  EVMByDivision,
  EVMPerformanceStatus,
  EVMThresholds,
} from '@/types/cost-tracking';
import {
  calculateCPI,
  calculateSPI,
  calculateCV,
  calculateSV,
  calculateEAC,
  getPerformanceStatus,
  DEFAULT_EVM_THRESHOLDS,
} from './evmCalculations';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input data for a single cost code within a division
 */
export interface CostCodeEVMData {
  costCodeId: string;
  costCode: string;
  division: string;
  divisionName: string;
  BAC: number;
  PV: number;
  EV: number;
  AC: number;
}

/**
 * Aggregated EVM metrics for a division
 */
export interface DivisionEVMMetrics extends EVMByDivision {
  costCodeCount: number;
  weightedCPI: number;
  weightedSPI: number;
}

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Aggregate cost code data into division-level EVM metrics
 *
 * @param costCodes - Array of cost code EVM data
 * @param thresholds - Optional threshold configuration
 * @returns Array of division-level EVM metrics
 */
export function aggregateByDivision(
  costCodes: CostCodeEVMData[],
  thresholds: EVMThresholds = DEFAULT_EVM_THRESHOLDS
): DivisionEVMMetrics[] {
  // Group by division
  const divisionMap = new Map<string, CostCodeEVMData[]>();

  for (const cc of costCodes) {
    const existing = divisionMap.get(cc.division) || [];
    existing.push(cc);
    divisionMap.set(cc.division, existing);
  }

  // Calculate metrics for each division
  const results: DivisionEVMMetrics[] = [];

  for (const [division, codes] of divisionMap.entries()) {
    const metrics = calculateDivisionMetrics(codes, thresholds);
    results.push(metrics);
  }

  // Sort by division code
  results.sort((a, b) => a.division.localeCompare(b.division));

  return results;
}

/**
 * Calculate EVM metrics for a single division from its cost codes
 *
 * @param costCodes - Cost codes belonging to this division
 * @param thresholds - Threshold configuration
 * @returns Division-level EVM metrics
 */
export function calculateDivisionMetrics(
  costCodes: CostCodeEVMData[],
  thresholds: EVMThresholds = DEFAULT_EVM_THRESHOLDS
): DivisionEVMMetrics {
  if (costCodes.length === 0) {
    return createEmptyDivisionMetrics('', '');
  }

  // Sum all values across cost codes
  const totals = costCodes.reduce(
    (acc, cc) => ({
      BAC: acc.BAC + cc.BAC,
      PV: acc.PV + cc.PV,
      EV: acc.EV + cc.EV,
      AC: acc.AC + cc.AC,
    }),
    { BAC: 0, PV: 0, EV: 0, AC: 0 }
  );

  const { BAC, PV, EV, AC } = totals;

  // Calculate indices
  const CPI = calculateCPI(EV, AC);
  const SPI = calculateSPI(EV, PV);
  const CV = calculateCV(EV, AC);
  const SV = calculateSV(EV, PV);
  const EAC_value = calculateEAC(BAC, CPI);

  // Calculate weighted indices
  const weightedCPI = calculateWeightedCPI(costCodes);
  const weightedSPI = calculateWeightedSPI(costCodes);

  // Calculate percent complete
  const percent_complete = BAC > 0 ? (EV / BAC) * 100 : 0;

  // Determine status
  const cost_status = getPerformanceStatus(CPI, thresholds, 'cpi');
  const schedule_status = getPerformanceStatus(SPI, thresholds, 'spi');

  return {
    division: costCodes[0].division,
    division_name: costCodes[0].divisionName,
    BAC,
    PV,
    EV,
    AC,
    CV,
    SV,
    CPI: isFinite(CPI) ? CPI : 0,
    SPI: isFinite(SPI) ? SPI : 0,
    EAC: isFinite(EAC_value) ? EAC_value : BAC,
    percent_complete,
    cost_status,
    schedule_status,
    costCodeCount: costCodes.length,
    weightedCPI: isFinite(weightedCPI) ? weightedCPI : 0,
    weightedSPI: isFinite(weightedSPI) ? weightedSPI : 0,
  };
}

/**
 * Create empty division metrics structure
 */
export function createEmptyDivisionMetrics(
  division: string,
  divisionName: string
): DivisionEVMMetrics {
  return {
    division,
    division_name: divisionName,
    BAC: 0,
    PV: 0,
    EV: 0,
    AC: 0,
    CV: 0,
    SV: 0,
    CPI: 0,
    SPI: 0,
    EAC: 0,
    percent_complete: 0,
    cost_status: 'good',
    schedule_status: 'good',
    costCodeCount: 0,
    weightedCPI: 0,
    weightedSPI: 0,
  };
}

// ============================================================================
// WEIGHTED CALCULATIONS
// ============================================================================

/**
 * Calculate BAC-weighted CPI for a set of cost codes
 *
 * Weighted CPI = SUM(BAC_i * CPI_i) / SUM(BAC_i)
 *
 * This gives more importance to larger budget items
 *
 * @param costCodes - Cost codes to calculate weighted CPI for
 * @returns Weighted CPI value
 */
export function calculateWeightedCPI(costCodes: CostCodeEVMData[]): number {
  if (costCodes.length === 0) return 0;

  let totalBAC = 0;
  let weightedSum = 0;

  for (const cc of costCodes) {
    const cpi = calculateCPI(cc.EV, cc.AC);
    if (isFinite(cpi) && cc.BAC > 0) {
      weightedSum += cc.BAC * cpi;
      totalBAC += cc.BAC;
    }
  }

  if (totalBAC === 0) return 0;
  return weightedSum / totalBAC;
}

/**
 * Calculate BAC-weighted SPI for a set of cost codes
 *
 * Weighted SPI = SUM(BAC_i * SPI_i) / SUM(BAC_i)
 *
 * @param costCodes - Cost codes to calculate weighted SPI for
 * @returns Weighted SPI value
 */
export function calculateWeightedSPI(costCodes: CostCodeEVMData[]): number {
  if (costCodes.length === 0) return 0;

  let totalBAC = 0;
  let weightedSum = 0;

  for (const cc of costCodes) {
    const spi = calculateSPI(cc.EV, cc.PV);
    if (isFinite(spi) && cc.BAC > 0) {
      weightedSum += cc.BAC * spi;
      totalBAC += cc.BAC;
    }
  }

  if (totalBAC === 0) return 0;
  return weightedSum / totalBAC;
}

/**
 * Calculate EV-weighted CPI (alternative weighting)
 *
 * Uses earned value as weight, which emphasizes currently active work
 *
 * @param costCodes - Cost codes to calculate weighted CPI for
 * @returns EV-weighted CPI value
 */
export function calculateEVWeightedCPI(costCodes: CostCodeEVMData[]): number {
  if (costCodes.length === 0) return 0;

  let totalEV = 0;
  let weightedSum = 0;

  for (const cc of costCodes) {
    if (cc.EV > 0) {
      const cpi = calculateCPI(cc.EV, cc.AC);
      if (isFinite(cpi)) {
        weightedSum += cc.EV * cpi;
        totalEV += cc.EV;
      }
    }
  }

  if (totalEV === 0) return 0;
  return weightedSum / totalEV;
}

/**
 * Calculate AC-weighted CPI (alternative weighting)
 *
 * Uses actual cost as weight, which emphasizes where money has been spent
 *
 * @param costCodes - Cost codes to calculate weighted CPI for
 * @returns AC-weighted CPI value
 */
export function calculateACWeightedCPI(costCodes: CostCodeEVMData[]): number {
  if (costCodes.length === 0) return 0;

  let totalAC = 0;
  let weightedSum = 0;

  for (const cc of costCodes) {
    if (cc.AC > 0) {
      const cpi = calculateCPI(cc.EV, cc.AC);
      if (isFinite(cpi)) {
        weightedSum += cc.AC * cpi;
        totalAC += cc.AC;
      }
    }
  }

  if (totalAC === 0) return 0;
  return weightedSum / totalAC;
}

// ============================================================================
// DIVISION-LEVEL FORECASTING
// ============================================================================

/**
 * Calculate EAC for each division using different methods
 *
 * @param divisions - Array of division EVM metrics
 * @returns Object with EAC values by division and method
 */
export interface DivisionForecast {
  division: string;
  divisionName: string;
  BAC: number;
  EAC_CPI: number;        // BAC / CPI
  EAC_SPI: number;        // AC + (BAC - EV) / SPI
  EAC_CSI: number;        // AC + (BAC - EV) / (CPI * SPI)
  VAC_CPI: number;        // BAC - EAC_CPI
  percentVariance: number; // (EAC_CPI - BAC) / BAC * 100
}

export function calculateDivisionForecasts(
  divisions: DivisionEVMMetrics[]
): DivisionForecast[] {
  return divisions.map((div) => {
    const { BAC, EV, AC, CPI, SPI } = div;

    // EAC using CPI only
    const EAC_CPI = CPI > 0 ? BAC / CPI : BAC;

    // EAC using SPI (assuming future cost = future schedule)
    const EAC_SPI = SPI > 0 ? AC + (BAC - EV) / SPI : BAC;

    // EAC using CSI (combined)
    const CSI = CPI * SPI;
    const EAC_CSI = CSI > 0 ? AC + (BAC - EV) / CSI : BAC;

    // Variance at completion
    const VAC_CPI = BAC - EAC_CPI;

    // Percent variance
    const percentVariance = BAC > 0 ? ((EAC_CPI - BAC) / BAC) * 100 : 0;

    return {
      division: div.division,
      divisionName: div.division_name,
      BAC,
      EAC_CPI: isFinite(EAC_CPI) ? EAC_CPI : BAC,
      EAC_SPI: isFinite(EAC_SPI) ? EAC_SPI : BAC,
      EAC_CSI: isFinite(EAC_CSI) ? EAC_CSI : BAC,
      VAC_CPI: isFinite(VAC_CPI) ? VAC_CPI : 0,
      percentVariance: isFinite(percentVariance) ? percentVariance : 0,
    };
  });
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Identify divisions with performance issues
 *
 * @param divisions - Array of division EVM metrics
 * @param cpiThreshold - CPI below this is flagged (default 0.95)
 * @param spiThreshold - SPI below this is flagged (default 0.95)
 * @returns Divisions with issues, sorted by severity
 */
export function findProblematicDivisions(
  divisions: DivisionEVMMetrics[],
  cpiThreshold: number = 0.95,
  spiThreshold: number = 0.95
): DivisionEVMMetrics[] {
  return divisions
    .filter((div) => div.CPI < cpiThreshold || div.SPI < spiThreshold)
    .sort((a, b) => {
      // Sort by CSI (worst first)
      const csiA = a.CPI * a.SPI;
      const csiB = b.CPI * b.SPI;
      return csiA - csiB;
    });
}

/**
 * Identify divisions contributing most to project variance
 *
 * @param divisions - Array of division EVM metrics
 * @returns Divisions sorted by absolute CV contribution
 */
export function findTopVarianceContributors(
  divisions: DivisionEVMMetrics[]
): DivisionEVMMetrics[] {
  return [...divisions].sort((a, b) => Math.abs(b.CV) - Math.abs(a.CV));
}

/**
 * Calculate project-level totals from divisions
 *
 * @param divisions - Array of division EVM metrics
 * @returns Aggregated project totals
 */
export function calculateProjectTotalsFromDivisions(
  divisions: DivisionEVMMetrics[]
): {
  totalBAC: number;
  totalPV: number;
  totalEV: number;
  totalAC: number;
  totalCV: number;
  totalSV: number;
  projectCPI: number;
  projectSPI: number;
  projectCSI: number;
  totalCostCodes: number;
} {
  const totals = divisions.reduce(
    (acc, div) => ({
      totalBAC: acc.totalBAC + div.BAC,
      totalPV: acc.totalPV + div.PV,
      totalEV: acc.totalEV + div.EV,
      totalAC: acc.totalAC + div.AC,
      totalCV: acc.totalCV + div.CV,
      totalSV: acc.totalSV + div.SV,
      totalCostCodes: acc.totalCostCodes + div.costCodeCount,
    }),
    {
      totalBAC: 0,
      totalPV: 0,
      totalEV: 0,
      totalAC: 0,
      totalCV: 0,
      totalSV: 0,
      totalCostCodes: 0,
    }
  );

  const projectCPI = calculateCPI(totals.totalEV, totals.totalAC);
  const projectSPI = calculateSPI(totals.totalEV, totals.totalPV);
  const projectCSI = projectCPI * projectSPI;

  return {
    ...totals,
    projectCPI: isFinite(projectCPI) ? projectCPI : 0,
    projectSPI: isFinite(projectSPI) ? projectSPI : 0,
    projectCSI: isFinite(projectCSI) ? projectCSI : 0,
  };
}

/**
 * Compare division performance to project average
 *
 * @param division - Division metrics to compare
 * @param projectCPI - Project-level CPI
 * @param projectSPI - Project-level SPI
 * @returns Performance comparison
 */
export interface DivisionComparison {
  division: string;
  divisionName: string;
  cpiVarianceFromProject: number;   // Division CPI - Project CPI
  spiVarianceFromProject: number;   // Division SPI - Project SPI
  isAboveAverageCost: boolean;      // Division CPI > Project CPI
  isAboveAverageSchedule: boolean;  // Division SPI > Project SPI
  performanceRating: 'excellent' | 'good' | 'average' | 'below-average' | 'critical';
}

export function compareDivisionToProject(
  division: DivisionEVMMetrics,
  projectCPI: number,
  projectSPI: number
): DivisionComparison {
  const cpiVariance = division.CPI - projectCPI;
  const spiVariance = division.SPI - projectSPI;

  // Determine performance rating
  let rating: DivisionComparison['performanceRating'];
  if (cpiVariance >= 0.1 && spiVariance >= 0.1) {
    rating = 'excellent';
  } else if (cpiVariance >= 0 && spiVariance >= 0) {
    rating = 'good';
  } else if (cpiVariance >= -0.05 && spiVariance >= -0.05) {
    rating = 'average';
  } else if (cpiVariance >= -0.1 && spiVariance >= -0.1) {
    rating = 'below-average';
  } else {
    rating = 'critical';
  }

  return {
    division: division.division,
    divisionName: division.division_name,
    cpiVarianceFromProject: cpiVariance,
    spiVarianceFromProject: spiVariance,
    isAboveAverageCost: cpiVariance > 0,
    isAboveAverageSchedule: spiVariance > 0,
    performanceRating: rating,
  };
}
