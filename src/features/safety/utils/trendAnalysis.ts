/**
 * Trend Analysis Utilities for Near-Miss Incidents
 *
 * Statistical analysis and pattern detection algorithms for
 * identifying trends in near-miss incident data.
 */

import type {
  DailyTrendPoint,
  LocationHeatMapData,
  TimeMatrix,
  RootCauseParetoData,
  FrequencySpike,
  TrendDirection,
  PatternType,
  PatternData,
} from '@/types/near-miss-analytics'
import type { RootCauseCategory } from '@/types/safety-incidents'

// ============================================================================
// Statistical Analysis
// ============================================================================

/**
 * Calculate mean of an array of numbers
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) {return 0}
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values: number[]): number {
  if (values.length === 0) {return 0}
  const mean = calculateMean(values)
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Calculate z-score for a value
 */
export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) {return 0}
  return (value - mean) / stdDev
}

/**
 * Calculate moving average for a series
 */
export function calculateMovingAverage(values: number[], window: number): number[] {
  if (values.length < window) {return []}

  const result: number[] = []
  for (let i = window - 1; i < values.length; i++) {
    const windowValues = values.slice(i - window + 1, i + 1)
    result.push(calculateMean(windowValues))
  }
  return result
}

/**
 * Calculate exponential moving average
 */
export function calculateEMA(values: number[], alpha = 0.3): number[] {
  if (values.length === 0) {return []}

  const result: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1])
  }
  return result
}

/**
 * Calculate linear regression and return slope and intercept
 */
export function calculateLinearRegression(values: number[]): {
  slope: number
  intercept: number
  rSquared: number
} {
  const n = values.length
  if (n < 2) {return { slope: 0, intercept: 0, rSquared: 0 }}

  const xMean = (n - 1) / 2
  const yMean = calculateMean(values)

  let numerator = 0
  let denominator = 0
  let yVariance = 0

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += Math.pow(i - xMean, 2)
    yVariance += Math.pow(values[i] - yMean, 2)
  }

  const slope = denominator === 0 ? 0 : numerator / denominator
  const intercept = yMean - slope * xMean

  // Calculate R-squared
  let ssRes = 0
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept
    ssRes += Math.pow(values[i] - predicted, 2)
  }
  const rSquared = yVariance === 0 ? 0 : 1 - ssRes / yVariance

  return { slope, intercept, rSquared }
}

// ============================================================================
// Trend Detection
// ============================================================================

/**
 * Determine trend direction based on recent data
 */
export function determineTrendDirection(
  values: number[],
  threshold = 0.1
): TrendDirection {
  if (values.length < 3) {return 'stable'}

  const { slope, rSquared } = calculateLinearRegression(values)

  // Only consider trend significant if R-squared is decent
  if (rSquared < 0.3) {return 'stable'}

  const mean = calculateMean(values)
  const normalizedSlope = mean === 0 ? 0 : slope / mean

  if (normalizedSlope > threshold) {return 'increasing'}
  if (normalizedSlope < -threshold) {return 'decreasing'}
  return 'stable'
}

/**
 * Detect anomalies using z-score
 */
export function detectAnomalies(
  values: number[],
  threshold = 2.0
): Array<{ index: number; value: number; zScore: number }> {
  if (values.length < 3) {return []}

  const mean = calculateMean(values)
  const stdDev = calculateStdDev(values)

  if (stdDev === 0) {return []}

  const anomalies: Array<{ index: number; value: number; zScore: number }> = []

  values.forEach((value, index) => {
    const zScore = calculateZScore(value, mean, stdDev)
    if (Math.abs(zScore) >= threshold) {
      anomalies.push({ index, value, zScore })
    }
  })

  return anomalies
}

/**
 * Detect frequency spikes from daily trend data
 */
export function detectFrequencySpikesFromTrends(
  trends: DailyTrendPoint[],
  threshold = 2.0
): FrequencySpike[] {
  const counts = trends.map(t => t.total_count)
  const mean = calculateMean(counts)
  const stdDev = calculateStdDev(counts)

  if (stdDev === 0) {return []}

  return trends
    .filter(t => {
      const zScore = calculateZScore(t.total_count, mean, stdDev)
      return zScore >= threshold
    })
    .map(t => ({
      spike_date: t.date,
      count: t.total_count,
      average: Math.round(mean * 100) / 100,
      std_dev: Math.round(stdDev * 100) / 100,
      deviation_score: Math.round(calculateZScore(t.total_count, mean, stdDev) * 100) / 100,
    }))
}

// ============================================================================
// Pattern Detection
// ============================================================================

/**
 * Detect time-based patterns from time matrix
 */
export function detectTimePatterns(
  matrix: TimeMatrix,
  minCount = 3
): Array<{
  hour: number
  dayOfWeek: number
  count: number
  percentOfTotal: number
}> {
  const patterns: Array<{
    hour: number
    dayOfWeek: number
    count: number
    percentOfTotal: number
  }> = []

  for (let hour = 0; hour < 24; hour++) {
    for (let day = 0; day < 7; day++) {
      const count = matrix.matrix[hour][day]
      if (count >= minCount) {
        patterns.push({
          hour,
          dayOfWeek: day,
          count,
          percentOfTotal:
            matrix.totalIncidents > 0
              ? Math.round((count / matrix.totalIncidents) * 100 * 10) / 10
              : 0,
        })
      }
    }
  }

  return patterns.sort((a, b) => b.count - a.count)
}

/**
 * Detect peak hours from time matrix
 */
export function detectPeakHours(
  matrix: TimeMatrix,
  topN = 5
): Array<{ hour: number; count: number }> {
  const hourCounts: number[] = Array(24).fill(0)

  for (let hour = 0; hour < 24; hour++) {
    hourCounts[hour] = matrix.matrix[hour].reduce((sum, count) => sum + count, 0)
  }

  return hourCounts
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

/**
 * Detect peak days from time matrix
 */
export function detectPeakDays(
  matrix: TimeMatrix,
  topN = 3
): Array<{ dayOfWeek: number; count: number }> {
  const dayCounts: number[] = Array(7).fill(0)

  for (let hour = 0; hour < 24; hour++) {
    for (let day = 0; day < 7; day++) {
      dayCounts[day] += matrix.matrix[hour][day]
    }
  }

  return dayCounts
    .map((count, dayOfWeek) => ({ dayOfWeek, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)
}

/**
 * Identify location clusters from heat map data
 */
export function identifyLocationClusters(
  heatMapData: LocationHeatMapData[],
  minIncidents = 3,
  minRiskScore = 5
): LocationHeatMapData[] {
  return heatMapData.filter(
    loc => loc.incident_count >= minIncidents && (loc.risk_score || 0) >= minRiskScore
  )
}

/**
 * Calculate Pareto (80/20) threshold for root causes
 */
export function calculateParetoThreshold(
  paretoData: RootCauseParetoData[],
  targetPercentage = 80
): {
  causes: RootCauseParetoData[]
  coveragePercentage: number
} {
  const causes: RootCauseParetoData[] = []
  let coverage = 0

  for (const item of paretoData) {
    causes.push(item)
    coverage = item.cumulative_percentage
    if (coverage >= targetPercentage) {break}
  }

  return { causes, coveragePercentage: coverage }
}

// ============================================================================
// Pattern Generation
// ============================================================================

/**
 * Generate pattern insights from analyzed data
 */
export function generatePatternInsights(data: {
  trends: DailyTrendPoint[]
  heatMap: LocationHeatMapData[]
  timeMatrix: TimeMatrix
  paretoData: RootCauseParetoData[]
  spikes: FrequencySpike[]
}): Array<{
  type: PatternType
  data: PatternData
  confidence: number
  priority: 'high' | 'medium' | 'low'
}> {
  const insights: Array<{
    type: PatternType
    data: PatternData
    confidence: number
    priority: 'high' | 'medium' | 'low'
  }> = []

  // Analyze location patterns
  const locationClusters = identifyLocationClusters(data.heatMap, 5)
  locationClusters.forEach(loc => {
    insights.push({
      type: 'recurring_location',
      data: {
        description: `High concentration of near-misses at "${loc.location}"`,
        location: loc.location,
        zone_id: loc.zone_id || undefined,
        incident_count: loc.incident_count,
        affected_locations: [loc.location],
      },
      confidence: Math.min(0.9, 0.5 + loc.incident_count * 0.05),
      priority: loc.high_severity_count > 2 ? 'high' : 'medium',
    })
  })

  // Analyze time patterns
  const peakHours = detectPeakHours(data.timeMatrix, 3)
  if (peakHours.length > 0 && peakHours[0].count > 5) {
    insights.push({
      type: 'time_based',
      data: {
        description: `Peak near-miss activity detected during specific hours`,
        peak_times: peakHours,
        hour_of_day: peakHours[0].hour,
      },
      confidence: 0.7,
      priority: 'medium',
    })
  }

  // Analyze root cause clusters
  const { causes, coveragePercentage } = calculateParetoThreshold(data.paretoData, 80)
  if (causes.length <= 3 && causes.length > 0) {
    insights.push({
      type: 'root_cause_cluster',
      data: {
        description: `${causes.length} root causes account for ${coveragePercentage}% of near-misses`,
        root_causes: causes.map(c => c.root_cause_category as RootCauseCategory),
        correlation_strength: coveragePercentage / 100,
      },
      confidence: 0.85,
      priority: 'high',
    })
  }

  // Analyze frequency spikes
  if (data.spikes.length > 0) {
    const recentSpikes = data.spikes.filter(s => {
      const daysAgo = (Date.now() - new Date(s.spike_date).getTime()) / (1000 * 60 * 60 * 24)
      return daysAgo <= 7
    })

    if (recentSpikes.length > 0) {
      insights.push({
        type: 'category_trend',
        data: {
          description: `Recent spike in near-miss frequency detected`,
          trend_direction: 'increasing',
          time_range: {
            start: recentSpikes[recentSpikes.length - 1].spike_date,
            end: recentSpikes[0].spike_date,
          },
        },
        confidence: 0.8,
        priority: 'high',
      })
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  return insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
}

// ============================================================================
// Forecasting
// ============================================================================

/**
 * Simple forecast for next period based on trend
 */
export function forecastNextPeriod(values: number[]): {
  forecast: number
  confidence: number
  method: string
} {
  if (values.length < 3) {
    return {
      forecast: values.length > 0 ? values[values.length - 1] : 0,
      confidence: 0.3,
      method: 'last_value',
    }
  }

  const { slope, intercept, rSquared } = calculateLinearRegression(values)
  const linearForecast = slope * values.length + intercept

  // Use EMA for comparison
  const ema = calculateEMA(values, 0.3)
  const emaForecast = ema[ema.length - 1] || 0

  // Weight the forecasts based on R-squared
  const weightedForecast = rSquared > 0.5
    ? 0.7 * linearForecast + 0.3 * emaForecast
    : 0.3 * linearForecast + 0.7 * emaForecast

  return {
    forecast: Math.max(0, Math.round(weightedForecast * 10) / 10),
    confidence: Math.min(0.9, 0.4 + rSquared * 0.5),
    method: rSquared > 0.5 ? 'linear_regression' : 'exponential_moving_average',
  }
}

/**
 * Calculate seasonality index if enough data
 */
export function calculateSeasonalityIndex(
  monthlyData: Array<{ month: number; count: number }>
): Record<number, number> {
  if (monthlyData.length < 12) {
    return {}
  }

  const monthCounts: Record<number, number[]> = {}
  monthlyData.forEach(({ month, count }) => {
    if (!monthCounts[month]) {monthCounts[month] = []}
    monthCounts[month].push(count)
  })

  const overallMean = calculateMean(monthlyData.map(m => m.count))
  if (overallMean === 0) {return {}}

  const indices: Record<number, number> = {}
  for (let month = 1; month <= 12; month++) {
    const monthAvg = monthCounts[month]
      ? calculateMean(monthCounts[month])
      : overallMean
    indices[month] = Math.round((monthAvg / overallMean) * 100) / 100
  }

  return indices
}

// ============================================================================
// Risk Scoring
// ============================================================================

/**
 * Calculate risk score for a location
 */
export function calculateLocationRiskScore(
  incidentCount: number,
  highSeverityCount: number,
  daysSinceLastIncident: number,
  hasRecentSpikes: boolean
): number {
  let score = 0

  // Base score from incident count
  score += incidentCount * 2

  // High severity multiplier
  score += highSeverityCount * 5

  // Recency factor (more recent = higher risk)
  if (daysSinceLastIncident < 7) {
    score *= 1.5
  } else if (daysSinceLastIncident < 30) {
    score *= 1.2
  }

  // Spike factor
  if (hasRecentSpikes) {
    score *= 1.3
  }

  return Math.round(score * 10) / 10
}

/**
 * Categorize risk level based on score
 */
export function categorizeRiskLevel(
  score: number
): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 50) {return 'critical'}
  if (score >= 25) {return 'high'}
  if (score >= 10) {return 'medium'}
  return 'low'
}

// ============================================================================
// Recommendation Generation
// ============================================================================

/**
 * Generate recommendations based on patterns
 */
export function generateRecommendations(data: {
  topLocations: LocationHeatMapData[]
  topRootCauses: Array<{ category: RootCauseCategory; count: number }>
  peakHours: Array<{ hour: number; count: number }>
  trendDirection: TrendDirection
}): Array<{
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  suggested_actions: string[]
}> {
  const recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    category: string
    title: string
    description: string
    suggested_actions: string[]
  }> = []

  // Location-based recommendations
  if (data.topLocations.length > 0) {
    const topLoc = data.topLocations[0]
    recommendations.push({
      priority: topLoc.high_severity_count > 2 ? 'high' : 'medium',
      category: 'Location Safety',
      title: `Focus Safety Attention on "${topLoc.location}"`,
      description: `This location has ${topLoc.incident_count} near-misses in the past 90 days, with ${topLoc.high_severity_count} having high severity potential.`,
      suggested_actions: [
        'Conduct a safety walkthrough of the area',
        'Review and update safety signage',
        'Consider additional PPE requirements',
        'Implement toolbox talks specific to this area',
      ],
    })
  }

  // Root cause recommendations
  if (data.topRootCauses.length > 0) {
    const topCause = data.topRootCauses[0]
    const causeActions: Record<string, string[]> = {
      human_error: [
        'Enhance safety training programs',
        'Implement buddy system for high-risk tasks',
        'Review task procedures for clarity',
      ],
      equipment_failure: [
        'Review preventive maintenance schedules',
        'Conduct equipment inspections',
        'Evaluate equipment replacement needs',
      ],
      training: [
        'Identify training gaps',
        'Schedule refresher courses',
        'Implement competency assessments',
      ],
      ppe: [
        'Audit PPE availability and condition',
        'Reinforce PPE requirements',
        'Consider upgraded PPE options',
      ],
      communication: [
        'Review communication protocols',
        'Implement daily safety briefings',
        'Improve signage and visual warnings',
      ],
    }

    recommendations.push({
      priority: 'high',
      category: 'Root Cause Analysis',
      title: `Address "${topCause.category.replace('_', ' ')}" as Primary Root Cause`,
      description: `This root cause category accounts for ${topCause.count} near-misses.`,
      suggested_actions: causeActions[topCause.category] || [
        'Conduct detailed root cause analysis',
        'Develop corrective action plan',
        'Monitor for recurrence',
      ],
    })
  }

  // Time-based recommendations
  if (data.peakHours.length > 0) {
    const topHour = data.peakHours[0]
    const hourLabel = topHour.hour < 12
      ? `${topHour.hour || 12}AM`
      : `${topHour.hour === 12 ? 12 : topHour.hour - 12}PM`

    recommendations.push({
      priority: 'medium',
      category: 'Time-Based Patterns',
      title: `Increase Vigilance During Peak Hours (Around ${hourLabel})`,
      description: `${topHour.count} near-misses occurred during this hour.`,
      suggested_actions: [
        'Schedule additional safety walks during this time',
        'Consider fatigue management if late in shift',
        'Review work scheduling to reduce risk',
      ],
    })
  }

  // Trend-based recommendations
  if (data.trendDirection === 'increasing') {
    recommendations.push({
      priority: 'high',
      category: 'Trend Alert',
      title: 'Near-Miss Frequency is Increasing',
      description: 'The trend shows an upward pattern in near-miss reports.',
      suggested_actions: [
        'Convene safety committee meeting',
        'Review recent changes in operations',
        'Increase safety observation frequency',
        'Consider stand-down for safety reset',
      ],
    })
  }

  return recommendations
}
