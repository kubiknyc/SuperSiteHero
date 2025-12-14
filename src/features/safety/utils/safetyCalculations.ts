/**
 * Safety Calculations Utility
 *
 * OSHA-compliant safety rate calculations with formulas:
 * - TRIR = (Recordable Cases x 200,000) / Hours Worked
 * - DART = (DART Cases x 200,000) / Hours Worked
 * - LTIR = (Lost Time Cases x 200,000) / Hours Worked
 * - Severity Rate = (Days Away + Days Restricted) x 200,000 / Hours Worked
 */

import {
  OSHA_MULTIPLIER,
  DEFAULT_BENCHMARKS,
  RATE_CONFIG,
  STATUS_COLORS,
  type SafetyMetrics,
  type SafetyMetricsTrendPoint,
  type SafetyScorecard,
  type RateStatus,
  type IndustrySafetyBenchmark,
} from '@/types/safety-metrics'

// ============================================================================
// Core Calculations
// ============================================================================

/**
 * Calculate TRIR (Total Recordable Incident Rate)
 * Formula: (Recordable Cases x 200,000) / Hours Worked
 *
 * @param recordableCases - Number of OSHA-recordable cases
 * @param hoursWorked - Total hours worked during the period
 * @returns TRIR value or null if hours worked is 0
 */
export function calculateTRIR(recordableCases: number, hoursWorked: number): number | null {
  if (!hoursWorked || hoursWorked <= 0) {
    return null
  }
  return Number(((recordableCases * OSHA_MULTIPLIER) / hoursWorked).toFixed(2))
}

/**
 * Calculate DART Rate (Days Away, Restricted, or Transferred)
 * Formula: (DART Cases x 200,000) / Hours Worked
 *
 * @param dartCases - Number of cases with days away, restricted, or transferred
 * @param hoursWorked - Total hours worked during the period
 * @returns DART rate or null if hours worked is 0
 */
export function calculateDART(dartCases: number, hoursWorked: number): number | null {
  if (!hoursWorked || hoursWorked <= 0) {
    return null
  }
  return Number(((dartCases * OSHA_MULTIPLIER) / hoursWorked).toFixed(2))
}

/**
 * Calculate LTIR (Lost Time Injury Rate)
 * Formula: (Lost Time Cases x 200,000) / Hours Worked
 *
 * @param lostTimeCases - Number of cases with lost work time
 * @param hoursWorked - Total hours worked during the period
 * @returns LTIR value or null if hours worked is 0
 */
export function calculateLTIR(lostTimeCases: number, hoursWorked: number): number | null {
  if (!hoursWorked || hoursWorked <= 0) {
    return null
  }
  return Number(((lostTimeCases * OSHA_MULTIPLIER) / hoursWorked).toFixed(2))
}

/**
 * Calculate Severity Rate
 * Formula: (Days Away + Days Restricted) x 200,000 / Hours Worked
 *
 * @param daysAway - Total days away from work
 * @param daysRestricted - Total days on restricted duty
 * @param hoursWorked - Total hours worked during the period
 * @returns Severity rate or null if hours worked is 0
 */
export function calculateSeverityRate(
  daysAway: number,
  daysRestricted: number,
  hoursWorked: number
): number | null {
  if (!hoursWorked || hoursWorked <= 0) {
    return null
  }
  return Number((((daysAway + daysRestricted) * OSHA_MULTIPLIER) / hoursWorked).toFixed(2))
}

/**
 * Calculate all safety metrics from raw data
 */
export function calculateAllMetrics(data: {
  recordableCases: number
  daysAwayCases: number
  restrictedDutyCases: number
  jobTransferCases: number
  lostTimeCases: number
  deaths: number
  daysAway: number
  daysRestricted: number
  hoursWorked: number
  averageEmployees?: number
}): SafetyMetrics {
  const dartCases = data.daysAwayCases + data.restrictedDutyCases + data.jobTransferCases

  return {
    total_recordable_cases: data.recordableCases,
    deaths: data.deaths,
    days_away_cases: data.daysAwayCases,
    restricted_duty_cases: data.restrictedDutyCases,
    job_transfer_cases: data.jobTransferCases,
    other_recordable_cases: data.recordableCases - data.daysAwayCases - data.restrictedDutyCases - data.jobTransferCases - data.deaths,
    lost_time_cases: data.lostTimeCases,
    total_days_away: data.daysAway,
    total_days_restricted: data.daysRestricted,
    total_hours_worked: data.hoursWorked,
    average_employees: data.averageEmployees || 0,
    trir: calculateTRIR(data.recordableCases, data.hoursWorked),
    dart: calculateDART(dartCases, data.hoursWorked),
    ltir: calculateLTIR(data.lostTimeCases, data.hoursWorked),
    severity_rate: calculateSeverityRate(data.daysAway, data.daysRestricted, data.hoursWorked),
    emr: null,
  }
}

// ============================================================================
// Status and Comparison
// ============================================================================

/**
 * Get status for a rate value compared to benchmark
 */
export function getRateStatus(
  rateType: 'trir' | 'dart' | 'ltir' | 'severity' | 'emr',
  value: number | null,
  benchmark: number | null = null
): RateStatus {
  return RATE_CONFIG[rateType].getStatus(value, benchmark)
}

/**
 * Get status colors for a given status
 */
export function getStatusColors(status: RateStatus) {
  return STATUS_COLORS[status]
}

/**
 * Format rate value for display
 */
export function formatRate(
  rateType: 'trir' | 'dart' | 'ltir' | 'severity' | 'emr',
  value: number | null
): string {
  return RATE_CONFIG[rateType].format(value)
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) {
    return null
  }
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

/**
 * Calculate variance from industry benchmark
 */
export function calculateBenchmarkVariance(
  value: number | null,
  benchmark: number | null
): { variance: number | null; percentVariance: number | null; isBetter: boolean } {
  if (value === null || benchmark === null || benchmark === 0) {
    return { variance: null, percentVariance: null, isBetter: false }
  }

  const variance = value - benchmark
  const percentVariance = Number(((variance / benchmark) * 100).toFixed(1))

  return {
    variance: Number(variance.toFixed(2)),
    percentVariance,
    isBetter: variance < 0, // Lower rates are better for safety metrics
  }
}

// ============================================================================
// Trend Analysis
// ============================================================================

/**
 * Calculate trend direction from data points
 */
export function calculateTrendDirection(
  data: SafetyMetricsTrendPoint[],
  metric: 'trir' | 'dart' | 'ltir' | 'severity_rate'
): 'improving' | 'stable' | 'declining' | 'unknown' {
  if (data.length < 2) {
    return 'unknown'
  }

  // Sort by date ascending
  const sorted = [...data].sort(
    (a, b) => new Date(a.period_date).getTime() - new Date(b.period_date).getTime()
  )

  // Get values (filter out nulls)
  const values = sorted
    .map((d) => d[metric])
    .filter((v): v is number => v !== null)

  if (values.length < 2) {
    return 'unknown'
  }

  // Calculate simple linear regression slope
  const n = values.length
  const sumX = (n * (n - 1)) / 2
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  // Determine trend based on slope
  const threshold = 0.05 // 5% change threshold for "stable"
  const avgValue = sumY / n

  if (Math.abs(slope) / avgValue < threshold) {
    return 'stable'
  }

  // For safety metrics, decreasing is improving
  return slope < 0 ? 'improving' : 'declining'
}

/**
 * Calculate moving average for smoothing trend data
 */
export function calculateMovingAverage(
  data: SafetyMetricsTrendPoint[],
  metric: 'trir' | 'dart' | 'ltir' | 'severity_rate',
  windowSize: number = 3
): (number | null)[] {
  const values = data.map((d) => d[metric])
  const result: (number | null)[] = []

  for (let i = 0; i < values.length; i++) {
    if (i < windowSize - 1) {
      result.push(null)
      continue
    }

    const window = values.slice(i - windowSize + 1, i + 1)
    const validValues = window.filter((v): v is number => v !== null)

    if (validValues.length === 0) {
      result.push(null)
    } else {
      result.push(Number((validValues.reduce((a, b) => a + b, 0) / validValues.length).toFixed(2)))
    }
  }

  return result
}

// ============================================================================
// Scorecard Calculations
// ============================================================================

/**
 * Calculate safety performance scorecard
 */
export function calculateScorecard(
  metrics: SafetyMetrics,
  previousMetrics: SafetyMetrics | null,
  benchmark: IndustrySafetyBenchmark | null,
  daysWithoutIncident: number,
  targetTrir: number | null = null,
  targetDart: number | null = null
): SafetyScorecard {
  // Calculate performance against industry
  const trirVsIndustry = benchmark?.avg_trir
    ? calculateBenchmarkVariance(metrics.trir, benchmark.avg_trir)
    : null

  const dartVsIndustry = benchmark?.avg_dart
    ? calculateBenchmarkVariance(metrics.dart, benchmark.avg_dart)
    : null

  // Determine performance level
  const getPerformance = (
    value: number | null,
    benchmark: number | null
  ): 'above' | 'at' | 'below' | 'unknown' => {
    if (value === null || benchmark === null) return 'unknown'
    if (value < benchmark * 0.9) return 'below' // Better than industry
    if (value > benchmark * 1.1) return 'above' // Worse than industry
    return 'at'
  }

  // Calculate trends
  const trirTrend = previousMetrics
    ? metrics.trir !== null && previousMetrics.trir !== null
      ? metrics.trir < previousMetrics.trir
        ? 'improving'
        : metrics.trir > previousMetrics.trir
        ? 'declining'
        : 'stable'
      : 'unknown'
    : 'unknown'

  const dartTrend = previousMetrics
    ? metrics.dart !== null && previousMetrics.dart !== null
      ? metrics.dart < previousMetrics.dart
        ? 'improving'
        : metrics.dart > previousMetrics.dart
        ? 'declining'
        : 'stable'
      : 'unknown'
    : 'unknown'

  return {
    company_id: '', // Set by caller
    year: new Date().getFullYear(),
    current_trir: metrics.trir,
    current_dart: metrics.dart,
    current_ltir: metrics.ltir,
    current_emr: metrics.emr,
    target_trir: targetTrir,
    target_dart: targetDart,
    industry_trir: benchmark?.avg_trir || null,
    industry_dart: benchmark?.avg_dart || null,
    trir_performance: getPerformance(metrics.trir, benchmark?.avg_trir || null),
    dart_performance: getPerformance(metrics.dart, benchmark?.avg_dart || null),
    total_incidents: metrics.total_recordable_cases + (metrics.deaths || 0),
    recordable_incidents: metrics.total_recordable_cases,
    days_without_incident: daysWithoutIncident,
    total_hours_worked: metrics.total_hours_worked,
    trir_trend: trirTrend,
    dart_trend: dartTrend,
  }
}

// ============================================================================
// Hours Calculations
// ============================================================================

/**
 * Estimate hours worked from employee count
 * Uses standard 2,000 hours per FTE per year (40 hrs/week x 50 weeks)
 */
export function estimateHoursFromEmployees(
  averageEmployees: number,
  periodType: 'monthly' | 'quarterly' | 'yearly'
): number {
  const annualHoursPerEmployee = 2000

  switch (periodType) {
    case 'monthly':
      return Math.round(averageEmployees * (annualHoursPerEmployee / 12))
    case 'quarterly':
      return Math.round(averageEmployees * (annualHoursPerEmployee / 4))
    case 'yearly':
      return Math.round(averageEmployees * annualHoursPerEmployee)
    default:
      return 0
  }
}

/**
 * Calculate FTE (Full-Time Equivalent) from hours
 */
export function calculateFTE(hoursWorked: number, periodMonths: number = 12): number {
  const annualHoursPerFTE = 2000
  const adjustedAnnual = (hoursWorked / periodMonths) * 12
  return Number((adjustedAnnual / annualHoursPerFTE).toFixed(2))
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate hours worked value
 */
export function validateHoursWorked(hours: number): { valid: boolean; message?: string } {
  if (hours < 0) {
    return { valid: false, message: 'Hours worked cannot be negative' }
  }

  if (hours > 10000000) {
    return { valid: false, message: 'Hours worked value seems too high. Please verify.' }
  }

  return { valid: true }
}

/**
 * Validate EMR value
 */
export function validateEMR(emr: number): { valid: boolean; message?: string } {
  if (emr < 0) {
    return { valid: false, message: 'EMR cannot be negative' }
  }

  if (emr > 3) {
    return { valid: false, message: 'EMR values typically do not exceed 3.0. Please verify.' }
  }

  return { valid: true }
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(hours)
}

/**
 * Format large numbers with abbreviations
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

/**
 * Get period label for display
 */
export function getPeriodLabel(
  periodType: 'monthly' | 'quarterly' | 'yearly' | 'ytd',
  year: number,
  month?: number,
  quarter?: number
): string {
  switch (periodType) {
    case 'monthly':
      if (month) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        return `${monthNames[month - 1]} ${year}`
      }
      return year.toString()
    case 'quarterly':
      return quarter ? `Q${quarter} ${year}` : year.toString()
    case 'yearly':
      return year.toString()
    case 'ytd':
      return `${year} YTD`
    default:
      return year.toString()
  }
}

// ============================================================================
// Export default benchmark getter
// ============================================================================

/**
 * Get default benchmark for a NAICS code
 */
export function getDefaultBenchmark(naicsCode: string): { trir: number; dart: number; ltir: number } | null {
  // Try exact match first
  if (DEFAULT_BENCHMARKS[naicsCode]) {
    return DEFAULT_BENCHMARKS[naicsCode]
  }

  // Try parent code (first 2 digits)
  const parentCode = naicsCode.substring(0, 2)
  if (DEFAULT_BENCHMARKS[parentCode]) {
    return DEFAULT_BENCHMARKS[parentCode]
  }

  // Default to general construction
  return DEFAULT_BENCHMARKS['23'] || null
}
