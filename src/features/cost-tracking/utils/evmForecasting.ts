/**
 * EVM Forecasting Utilities
 *
 * Functions for S-curve projections, trend analysis, and completion date estimates.
 */

import type {
  EVMTrendDataPoint,
  EVMSCurveData,
  EVMTrend,
} from '@/types/cost-tracking';
import {
  calculateCPI,
  calculateSPI,
  calculateEAC,
  calculateEACWithSPI,
} from './evmCalculations';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';

// ============================================================================
// S-CURVE PROJECTIONS
// ============================================================================

/**
 * Input data for S-curve generation
 */
export interface SCurveInput {
  projectStartDate: string;
  projectEndDate: string;
  BAC: number;
  historicalData: {
    date: string;
    PV: number;
    EV: number;
    AC: number;
  }[];
}

/**
 * Generate S-curve data for visualization
 *
 * @param input - Project dates, budget, and historical data
 * @param forecastDays - Number of days to forecast ahead
 * @returns Array of S-curve data points
 */
export function generateSCurveData(
  input: SCurveInput,
  forecastDays: number = 90
): EVMSCurveData[] {
  const { projectStartDate, projectEndDate, BAC, historicalData } = input;

  if (historicalData.length === 0) {
    return [];
  }

  const result: EVMSCurveData[] = [];

  // Add historical data points
  for (const point of historicalData) {
    result.push({
      date: point.date,
      planned_cumulative: point.PV,
      earned_cumulative: point.EV,
      actual_cumulative: point.AC,
      forecast_cumulative: 0, // No forecast for historical data
    });
  }

  // Get latest data for forecasting
  const latest = historicalData[historicalData.length - 1];
  const currentCPI = calculateCPI(latest.EV, latest.AC);
  const currentSPI = calculateSPI(latest.EV, latest.PV);

  // Only forecast if we have valid indices
  if (currentCPI > 0 && currentSPI > 0 && isFinite(currentCPI) && isFinite(currentSPI)) {
    const latestDate = parseISO(latest.date);
    const endDate = parseISO(projectEndDate);
    const daysRemaining = differenceInDays(endDate, latestDate);

    // Calculate daily burn rate based on current performance
    const remainingWork = BAC - latest.EV;
    const dailyRate = (latest.EV / differenceInDays(latestDate, parseISO(projectStartDate))) || 0;
    const adjustedDailyRate = dailyRate * currentSPI;

    // Generate forecast points (weekly intervals)
    const maxForecastDays = Math.min(forecastDays, daysRemaining + 30);

    for (let i = 7; i <= maxForecastDays; i += 7) {
      const forecastDate = addDays(latestDate, i);
      const projectedEV = Math.min(
        latest.EV + adjustedDailyRate * i,
        BAC
      );
      const projectedAC = latest.AC + (projectedEV - latest.EV) / currentCPI;

      result.push({
        date: format(forecastDate, 'yyyy-MM-dd'),
        planned_cumulative: BAC, // Full budget as baseline for comparison
        earned_cumulative: 0, // No actual earned value in forecast
        actual_cumulative: 0, // No actual cost in forecast
        forecast_cumulative: projectedEV,
      });
    }
  }

  return result;
}

/**
 * Generate planned value S-curve (baseline curve)
 *
 * @param startDate - Project start date
 * @param endDate - Project end date
 * @param BAC - Budget at completion
 * @param curveType - Shape of the S-curve
 * @returns Array of planned value data points
 */
export type CurveType = 'linear' | 'front-loaded' | 'back-loaded' | 's-curve';

export function generatePlannedCurve(
  startDate: string,
  endDate: string,
  BAC: number,
  curveType: CurveType = 's-curve'
): Array<{ date: string; PV: number }> {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const totalDays = differenceInDays(end, start);

  if (totalDays <= 0) return [];

  const result: Array<{ date: string; PV: number }> = [];
  const intervals = Math.min(totalDays, 52); // Weekly intervals, max 52

  for (let i = 0; i <= intervals; i++) {
    const progress = i / intervals;
    const daysFromStart = Math.round((i / intervals) * totalDays);
    const date = addDays(start, daysFromStart);

    let pvPercent: number;

    switch (curveType) {
      case 'linear':
        pvPercent = progress;
        break;
      case 'front-loaded':
        // More work at beginning: sqrt curve
        pvPercent = Math.sqrt(progress);
        break;
      case 'back-loaded':
        // More work at end: squared curve
        pvPercent = progress * progress;
        break;
      case 's-curve':
      default:
        // Classic S-curve using sine function
        // Maps [0,1] to [0,1] with S-shape
        pvPercent = (1 - Math.cos(progress * Math.PI)) / 2;
        break;
    }

    result.push({
      date: format(date, 'yyyy-MM-dd'),
      PV: BAC * pvPercent,
    });
  }

  return result;
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Analyze performance trend from historical data
 *
 * @param trendData - Array of EVM trend data points
 * @returns Trend direction
 */
export function analyzeTrend(trendData: EVMTrendDataPoint[]): EVMTrend {
  if (trendData.length < 2) {
    return 'stable';
  }

  // Use linear regression on the last 7-10 points
  const recentData = trendData.slice(-Math.min(10, trendData.length));

  // Calculate slope using least squares for CPI
  const cpiSlope = calculateSlope(recentData.map(d => d.CPI));

  // Thresholds for trend detection
  const improvingThreshold = 0.01;  // 0.01 per day improvement
  const decliningThreshold = -0.01; // 0.01 per day decline

  if (cpiSlope > improvingThreshold) {
    return 'improving';
  } else if (cpiSlope < decliningThreshold) {
    return 'declining';
  }
  return 'stable';
}

/**
 * Calculate slope of values using simple linear regression
 *
 * @param values - Array of numeric values
 * @returns Slope of best fit line
 */
export function calculateSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  // x = index (0, 1, 2, ...)
  // y = values
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Detect if trend is changing direction
 *
 * @param trendData - Array of EVM trend data points
 * @returns Object describing trend change
 */
export interface TrendChangeAnalysis {
  isChanging: boolean;
  direction: 'improving' | 'declining' | 'none';
  changePoint?: string; // Date when trend changed
  previousTrend: EVMTrend;
  currentTrend: EVMTrend;
  confidence: 'low' | 'medium' | 'high';
}

export function detectTrendChange(trendData: EVMTrendDataPoint[]): TrendChangeAnalysis {
  if (trendData.length < 5) {
    return {
      isChanging: false,
      direction: 'none',
      previousTrend: 'stable',
      currentTrend: 'stable',
      confidence: 'low',
    };
  }

  // Split data into first half and second half
  const midPoint = Math.floor(trendData.length / 2);
  const firstHalf = trendData.slice(0, midPoint);
  const secondHalf = trendData.slice(midPoint);

  const previousTrend = analyzeTrend(firstHalf);
  const currentTrend = analyzeTrend(secondHalf);

  const isChanging = previousTrend !== currentTrend;
  let direction: TrendChangeAnalysis['direction'] = 'none';

  if (isChanging) {
    if (currentTrend === 'improving') {
      direction = 'improving';
    } else if (currentTrend === 'declining') {
      direction = 'declining';
    }
  }

  // Confidence based on data points and consistency
  let confidence: TrendChangeAnalysis['confidence'] = 'low';
  if (trendData.length >= 14) {
    confidence = 'high';
  } else if (trendData.length >= 7) {
    confidence = 'medium';
  }

  return {
    isChanging,
    direction,
    changePoint: isChanging ? secondHalf[0]?.date : undefined,
    previousTrend,
    currentTrend,
    confidence,
  };
}

/**
 * Calculate moving average of CPI/SPI
 *
 * @param trendData - Array of EVM trend data points
 * @param windowSize - Number of periods for moving average
 * @returns Array with moving average values
 */
export function calculateMovingAverage(
  trendData: EVMTrendDataPoint[],
  windowSize: number = 5
): Array<{
  date: string;
  cpiMA: number;
  spiMA: number;
}> {
  if (trendData.length < windowSize) {
    return [];
  }

  const result: Array<{ date: string; cpiMA: number; spiMA: number }> = [];

  for (let i = windowSize - 1; i < trendData.length; i++) {
    let cpiSum = 0;
    let spiSum = 0;

    for (let j = i - windowSize + 1; j <= i; j++) {
      cpiSum += trendData[j].CPI;
      spiSum += trendData[j].SPI;
    }

    result.push({
      date: trendData[i].date,
      cpiMA: cpiSum / windowSize,
      spiMA: spiSum / windowSize,
    });
  }

  return result;
}

// ============================================================================
// COMPLETION DATE ESTIMATES
// ============================================================================

/**
 * Estimate project completion date based on different methods
 *
 * @param params - Project parameters
 * @returns Completion date estimates
 */
export interface CompletionEstimateInput {
  projectStartDate: string;
  plannedEndDate: string;
  BAC: number;
  EV: number;
  AC: number;
  PV: number;
  currentDate: string;
}

export interface CompletionDateEstimates {
  planned: string;
  spiProjected: string;
  cpiAdjusted: string;
  csiProjected: string;
  daysVarianceSPI: number;
  daysVarianceCSI: number;
}

export function estimateCompletionDates(input: CompletionEstimateInput): CompletionDateEstimates {
  const {
    projectStartDate,
    plannedEndDate,
    BAC,
    EV,
    AC,
    PV,
    currentDate,
  } = input;

  const start = parseISO(projectStartDate);
  const current = parseISO(currentDate);
  const planned = parseISO(plannedEndDate);

  const plannedDuration = differenceInDays(planned, start);
  const elapsedDays = differenceInDays(current, start);

  const CPI = calculateCPI(EV, AC);
  const SPI = calculateSPI(EV, PV);
  const CSI = CPI * SPI;

  // Method 1: SPI-based projection
  // Estimated Duration = Planned Duration / SPI
  const spiDuration = SPI > 0 ? plannedDuration / SPI : plannedDuration * 2;
  const spiProjectedDate = addDays(start, Math.round(spiDuration));

  // Method 2: CPI-adjusted (accounts for cost overruns requiring more work)
  // Similar logic but factors in cost performance
  const cpiAdjustedDuration = SPI > 0 && CPI > 0
    ? plannedDuration / (SPI * Math.sqrt(CPI))
    : plannedDuration * 2;
  const cpiAdjustedDate = addDays(start, Math.round(cpiAdjustedDuration));

  // Method 3: CSI-based projection (most conservative)
  const csiDuration = CSI > 0 ? plannedDuration / CSI : plannedDuration * 3;
  const csiProjectedDate = addDays(start, Math.round(csiDuration));

  return {
    planned: plannedEndDate,
    spiProjected: format(spiProjectedDate, 'yyyy-MM-dd'),
    cpiAdjusted: format(cpiAdjustedDate, 'yyyy-MM-dd'),
    csiProjected: format(csiProjectedDate, 'yyyy-MM-dd'),
    daysVarianceSPI: Math.round(spiDuration - plannedDuration),
    daysVarianceCSI: Math.round(csiDuration - plannedDuration),
  };
}

/**
 * Calculate the probability of completing on time based on current performance
 *
 * @param params - Project parameters
 * @returns Probability estimate (0-100)
 */
export function calculateOnTimeCompletionProbability(
  SPI: number,
  percentComplete: number
): number {
  // Simple heuristic model:
  // - SPI of 1.0 at 50% complete = 50% probability
  // - SPI > 1 increases probability
  // - Higher completion % with good SPI = higher probability

  if (SPI <= 0) return 0;
  if (percentComplete >= 100) return 100;

  // Base probability from SPI
  // SPI of 0.8 = 30%, SPI of 1.0 = 50%, SPI of 1.2 = 70%
  const spiProbability = Math.min(100, Math.max(0, (SPI - 0.5) * 100));

  // Adjust based on completion
  // Early in project, SPI matters less
  // Late in project, SPI matters more
  const completionFactor = percentComplete / 100;
  const adjustedProbability = spiProbability * (0.5 + 0.5 * completionFactor);

  // If far along with good SPI, increase probability
  if (percentComplete > 80 && SPI >= 0.95) {
    return Math.min(100, adjustedProbability + 20);
  }

  return Math.round(adjustedProbability);
}

/**
 * Calculate remaining days to complete based on current burn rate
 *
 * @param BAC - Budget at completion
 * @param EV - Earned value
 * @param dailyEVRate - Average daily earned value
 * @returns Estimated days remaining
 */
export function calculateDaysRemaining(
  BAC: number,
  EV: number,
  dailyEVRate: number
): number {
  if (dailyEVRate <= 0) return Infinity;

  const remainingWork = BAC - EV;
  if (remainingWork <= 0) return 0;

  return Math.ceil(remainingWork / dailyEVRate);
}

/**
 * Calculate daily earned value rate from historical data
 *
 * @param trendData - Array of EVM trend data points
 * @returns Average daily EV rate
 */
export function calculateDailyEVRate(trendData: EVMTrendDataPoint[]): number {
  if (trendData.length < 2) return 0;

  const first = trendData[0];
  const last = trendData[trendData.length - 1];

  const days = differenceInDays(parseISO(last.date), parseISO(first.date));
  if (days <= 0) return 0;

  const evGain = last.EV - first.EV;
  return evGain / days;
}

// ============================================================================
// FORECAST SCENARIOS
// ============================================================================

/**
 * Generate forecast scenarios with different assumptions
 *
 * @param params - Base forecast parameters
 * @returns Array of scenario forecasts
 */
export interface ForecastScenarioInput {
  BAC: number;
  EV: number;
  AC: number;
  CPI: number;
  SPI: number;
}

export interface ForecastScenario {
  name: string;
  method: string;
  EAC: number;
  ETC: number;
  VAC: number;
  VACPercent: number;
  assumption: string;
}

export function generateForecastScenarios(input: ForecastScenarioInput): ForecastScenario[] {
  const { BAC, EV, AC, CPI, SPI } = input;
  const remainingWork = BAC - EV;

  const scenarios: ForecastScenario[] = [];

  // Scenario 1: Original Plan
  scenarios.push({
    name: 'Original Plan',
    method: 'BAC',
    EAC: BAC,
    ETC: remainingWork,
    VAC: 0,
    VACPercent: 0,
    assumption: 'Remaining work will be completed at original budgeted rates',
  });

  // Scenario 2: Current CPI
  const eacCPI = CPI > 0 ? BAC / CPI : BAC * 2;
  scenarios.push({
    name: 'CPI Projection',
    method: 'BAC/CPI',
    EAC: eacCPI,
    ETC: eacCPI - AC,
    VAC: BAC - eacCPI,
    VACPercent: BAC > 0 ? ((BAC - eacCPI) / BAC) * 100 : 0,
    assumption: 'Future cost performance will match current CPI',
  });

  // Scenario 3: Current CPI x SPI
  const CSI = CPI * SPI;
  const eacCSI = CSI > 0 ? AC + remainingWork / CSI : BAC * 3;
  scenarios.push({
    name: 'CPI x SPI Projection',
    method: 'AC + (BAC-EV)/(CPI x SPI)',
    EAC: eacCSI,
    ETC: eacCSI - AC,
    VAC: BAC - eacCSI,
    VACPercent: BAC > 0 ? ((BAC - eacCSI) / BAC) * 100 : 0,
    assumption: 'Future performance will match current cost AND schedule efficiency',
  });

  // Scenario 4: Worst case (80% of current CPI)
  const pessimisticCPI = CPI * 0.8;
  const eacPessimistic = pessimisticCPI > 0 ? BAC / pessimisticCPI : BAC * 2.5;
  scenarios.push({
    name: 'Pessimistic',
    method: 'BAC/(CPI x 0.8)',
    EAC: eacPessimistic,
    ETC: eacPessimistic - AC,
    VAC: BAC - eacPessimistic,
    VACPercent: BAC > 0 ? ((BAC - eacPessimistic) / BAC) * 100 : 0,
    assumption: 'Performance will decline by 20% from current levels',
  });

  // Scenario 5: Best case (110% of current CPI)
  const optimisticCPI = Math.min(CPI * 1.1, 1.5); // Cap at 1.5
  const eacOptimistic = optimisticCPI > 0 ? BAC / optimisticCPI : BAC;
  scenarios.push({
    name: 'Optimistic',
    method: 'BAC/(CPI x 1.1)',
    EAC: eacOptimistic,
    ETC: eacOptimistic - AC,
    VAC: BAC - eacOptimistic,
    VACPercent: BAC > 0 ? ((BAC - eacOptimistic) / BAC) * 100 : 0,
    assumption: 'Performance will improve by 10% through corrective actions',
  });

  return scenarios;
}
