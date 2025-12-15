/**
 * Historical Bid Analysis Types
 * Types for vendor bid history, performance tracking, and trend analysis
 */

import type { BidSubmissionStatus, BidType } from './bidding'

// =============================================
// Enums and Constants
// =============================================

export type AccuracyRating = 'excellent' | 'good' | 'fair' | 'poor'
export type TrendDirection = 'increasing' | 'stable' | 'decreasing'
export type ReliabilityLevel = 'exceptional' | 'high' | 'moderate' | 'low' | 'poor'

export const ACCURACY_RATINGS: { value: AccuracyRating; label: string; color: string; threshold: number }[] = [
  { value: 'excellent', label: 'Excellent', color: 'emerald', threshold: 5 }, // ±5%
  { value: 'good', label: 'Good', color: 'green', threshold: 10 }, // ±10%
  { value: 'fair', label: 'Fair', color: 'yellow', threshold: 15 }, // ±15%
  { value: 'poor', label: 'Poor', color: 'red', threshold: Infinity }, // >15%
]

export const TREND_DIRECTIONS: { value: TrendDirection; label: string; color: string; icon: string }[] = [
  { value: 'increasing', label: 'Increasing', color: 'red', icon: 'TrendingUp' },
  { value: 'stable', label: 'Stable', color: 'blue', icon: 'Minus' },
  { value: 'decreasing', label: 'Decreasing', color: 'green', icon: 'TrendingDown' },
]

export const RELIABILITY_LEVELS: { value: ReliabilityLevel; label: string; color: string; threshold: number }[] = [
  { value: 'exceptional', label: 'Exceptional', color: 'emerald', threshold: 95 },
  { value: 'high', label: 'High', color: 'green', threshold: 85 },
  { value: 'moderate', label: 'Moderate', color: 'yellow', threshold: 70 },
  { value: 'low', label: 'Low', color: 'orange', threshold: 50 },
  { value: 'poor', label: 'Poor', color: 'red', threshold: 0 },
]

// =============================================
// Core Types
// =============================================

/**
 * Individual bid record for historical analysis
 */
export interface BidRecord {
  id: string
  bid_package_id: string
  package_name: string
  project_id: string
  project_name: string
  project_type: string | null
  submitted_at: string
  base_bid_amount: number
  total_bid_amount: number
  status: BidSubmissionStatus
  is_awarded: boolean
  estimated_value: number | null
  actual_cost: number | null
  bid_type: BidType
  division: string | null
  division_name: string | null
  response_time_days: number | null
  was_late: boolean
  project_completed: boolean
  quality_score: number | null // 1-100 from project ratings
}

/**
 * Vendor bid history and performance metrics
 */
export interface VendorBidHistory {
  vendor_id: string | null
  vendor_name: string
  contact_name: string | null
  contact_email: string | null

  // Overall stats
  total_bids: number
  wins: number
  win_rate: number // Percentage
  losses: number

  // Financial metrics
  total_bid_value: number
  average_bid_amount: number
  median_bid_amount: number
  min_bid_amount: number
  max_bid_amount: number
  average_markup: number // Percentage over cost

  // Specializations
  primary_trades: string[] // Top 3 CSI divisions
  trades: string[] // All divisions bid on

  // Response metrics
  average_response_time_days: number
  late_bids: number
  late_bid_rate: number // Percentage

  // Performance metrics
  completed_projects: number
  completion_rate: number // Percentage of won projects completed
  average_quality_score: number | null // 1-100
  reliability_score: number // Composite score
  reliability_level: ReliabilityLevel

  // Bid history
  bid_history: BidRecord[]

  // Trends
  recent_win_rate: number // Last 12 months
  win_rate_trend: TrendDirection
  markup_trend: TrendDirection
}

/**
 * Bid accuracy analysis comparing estimated vs actual costs
 */
export interface BidAccuracyMetrics {
  project_id: string
  project_name: string
  project_number: string | null

  // Overall totals
  estimated_total: number
  actual_total: number
  variance: number // Actual - Estimated
  variance_percentage: number
  accuracy_rating: AccuracyRating

  // By trade breakdown
  by_trade: TradeVariance[]

  // Item counts
  total_line_items: number
  over_budget_items: number
  under_budget_items: number
  on_budget_items: number // Within ±5%

  // Largest variances
  largest_overrun: TradeVariance | null
  largest_savings: TradeVariance | null

  // Analysis metadata
  analysis_date: string
  completion_date: string | null
  data_quality: 'complete' | 'partial' | 'incomplete'
}

/**
 * Variance by CSI trade/division
 */
export interface TradeVariance {
  division: string
  division_name: string
  csi_code: string | null

  // Amounts
  estimated_amount: number
  actual_amount: number
  variance: number
  variance_percentage: number

  // Item counts
  line_item_count: number

  // Status
  is_over_budget: boolean
  accuracy_rating: AccuracyRating
}

/**
 * Bid trend data point (time series)
 */
export interface BidTrendData {
  period: string // YYYY-MM format
  period_label: string // "Jan 2024"
  start_date: string
  end_date: string

  // Volume metrics
  bid_count: number
  win_count: number
  win_rate: number

  // Financial metrics
  total_bid_value: number
  average_bid: number
  median_bid: number

  // Pricing metrics
  average_markup: number
  markup_stddev: number | null

  // Trend
  trend_direction: TrendDirection
  month_over_month_change: number | null // Percentage
}

/**
 * Price trend analysis by trade
 */
export interface PriceTrendByTrade {
  division: string
  division_name: string

  // Price points (time series)
  data_points: {
    period: string
    average_unit_price: number
    bid_count: number
    total_quantity: number | null
  }[]

  // Trend metrics
  trend_direction: TrendDirection
  price_change_6mo: number | null // Percentage
  price_change_12mo: number | null // Percentage
  volatility: number // Standard deviation

  // Current market
  current_average_price: number
  market_low: number
  market_high: number
}

/**
 * Vendor recommendation based on historical performance
 */
export interface VendorRecommendation {
  rank: number
  vendor_id: string | null
  vendor_name: string

  // Overall score (0-100)
  score: number
  score_breakdown: {
    win_rate_score: number // 0-25
    pricing_score: number // 0-25
    reliability_score: number // 0-25
    experience_score: number // 0-25
  }

  // Key metrics
  win_rate: number
  average_markup: number
  completion_rate: number
  quality_score: number | null

  // Relevance to current scope
  similar_projects: number
  same_trade_bids: number
  recent_activity: boolean // Bid in last 6 months

  // Performance indicators
  reliability_level: ReliabilityLevel
  on_time_delivery: number // Percentage

  // Recommendation strength
  confidence: 'high' | 'medium' | 'low'
  reasons: string[] // Why recommended
  concerns: string[] // Potential issues
}

/**
 * Markup distribution analysis
 */
export interface MarkupDistribution {
  ranges: {
    range: string // "0-5%", "5-10%", etc.
    min: number
    max: number
    count: number
    percentage: number
    total_value: number
  }[]

  // Statistics
  mean: number
  median: number
  mode: number | null
  std_dev: number
  min: number
  max: number

  // Quartiles
  q1: number // 25th percentile
  q2: number // 50th percentile (median)
  q3: number // 75th percentile
  iqr: number // Interquartile range

  // By trade
  by_trade: {
    division: string
    division_name: string
    average_markup: number
    median_markup: number
    sample_size: number
  }[]
}

/**
 * Bid performance report
 */
export interface BidPerformanceReport {
  // Report metadata
  report_id: string
  generated_at: string
  generated_by: string | null

  // Filters applied
  filters: BidAnalysisFilters

  // Date range
  date_range: {
    from: string
    to: string
    total_days: number
  }

  // Executive summary
  summary: {
    total_bids: number
    total_bid_value: number
    total_packages: number
    unique_vendors: number
    average_bids_per_package: number
    overall_win_rate: number
    average_markup: number
    total_variance: number
    overall_accuracy: AccuracyRating
  }

  // Vendor analysis
  vendor_performance: VendorBidHistory[]
  top_vendors: VendorRecommendation[]

  // Accuracy analysis
  bid_accuracy: BidAccuracyMetrics[]
  average_accuracy_rating: AccuracyRating

  // Trends
  bid_trends: BidTrendData[]
  price_trends: PriceTrendByTrade[]
  markup_distribution: MarkupDistribution

  // Insights
  insights: BidAnalysisInsight[]
}

/**
 * AI-generated insight from bid analysis
 */
export interface BidAnalysisInsight {
  id: string
  type: 'opportunity' | 'risk' | 'trend' | 'recommendation'
  category: 'pricing' | 'vendor' | 'accuracy' | 'market' | 'process'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  metric_value: number | null
  metric_label: string | null
  action_items: string[]
  created_at: string
}

/**
 * Seasonal bidding pattern analysis
 */
export interface SeasonalBidPattern {
  month: number // 1-12
  month_name: string

  // Volume
  average_bids: number
  average_packages: number

  // Success rate
  average_win_rate: number

  // Pricing
  average_bid_amount: number
  average_markup: number

  // Historical data points
  years_of_data: number
  sample_size: number
}

/**
 * Project size category analysis
 */
export interface BidAnalysisByProjectSize {
  size_category: string // "Small", "Medium", "Large", "Enterprise"
  min_value: number
  max_value: number

  // Volume
  project_count: number
  bid_count: number
  average_bids_per_project: number

  // Success metrics
  win_rate: number
  average_markup: number
  accuracy_rating: AccuracyRating

  // Variance
  average_variance_percentage: number
}

// =============================================
// Filter and Request Types
// =============================================

/**
 * Filters for bid analysis queries
 */
export interface BidAnalysisFilters {
  // Date range (required)
  date_from: string
  date_to: string

  // Scope filters
  project_ids?: string[]
  vendor_ids?: string[]
  subcontractor_ids?: string[]

  // Classification filters
  divisions?: string[] // CSI divisions
  bid_types?: BidType[]
  project_types?: string[]

  // Size filters
  min_bid_amount?: number
  max_bid_amount?: number

  // Status filters
  include_awarded?: boolean
  include_not_awarded?: boolean
  include_withdrawn?: boolean
  only_completed_projects?: boolean

  // Quality filters
  min_quality_score?: number
  exclude_late_bids?: boolean
}

/**
 * Options for vendor recommendation
 */
export interface VendorRecommendationOptions {
  project_type?: string
  trade_type?: string // CSI division
  estimated_value?: number
  location?: string
  required_licenses?: string[]
  required_certifications?: string[]
  min_years_experience?: number
  limit?: number // Max recommendations to return
}

/**
 * Export format options
 */
export type ExportFormat = 'pdf' | 'excel' | 'csv'

/**
 * Export request
 */
export interface ExportBidAnalysisRequest {
  filters: BidAnalysisFilters
  format: ExportFormat
  include_charts?: boolean
  include_vendor_details?: boolean
  include_raw_data?: boolean
}

// =============================================
// API Response Types
// =============================================

export interface VendorBidHistoryResponse {
  success: boolean
  data: VendorBidHistory
  metadata: {
    queried_at: string
    date_range: {
      from: string
      to: string
    }
  }
}

export interface BidAccuracyResponse {
  success: boolean
  data: BidAccuracyMetrics[]
  summary: {
    total_projects: number
    average_accuracy: number
    total_variance: number
  }
}

export interface BidTrendResponse {
  success: boolean
  data: BidTrendData[]
  metadata: {
    periods: number
    earliest_date: string
    latest_date: string
  }
}

export interface VendorRecommendationsResponse {
  success: boolean
  data: VendorRecommendation[]
  metadata: {
    total_evaluated: number
    criteria: VendorRecommendationOptions
    generated_at: string
  }
}

export interface BidPerformanceReportResponse {
  success: boolean
  data: BidPerformanceReport
}

// =============================================
// Utility Functions
// =============================================

/**
 * Calculate accuracy rating from variance percentage
 */
export function getAccuracyRating(variancePercent: number): AccuracyRating {
  const absVariance = Math.abs(variancePercent)

  if (absVariance <= 5) return 'excellent'
  if (absVariance <= 10) return 'good'
  if (absVariance <= 15) return 'fair'
  return 'poor'
}

/**
 * Get accuracy rating configuration
 */
export function getAccuracyConfig(rating: AccuracyRating) {
  return ACCURACY_RATINGS.find(r => r.value === rating)
}

/**
 * Calculate reliability level from composite score
 */
export function getReliabilityLevel(score: number): ReliabilityLevel {
  if (score >= 95) return 'exceptional'
  if (score >= 85) return 'high'
  if (score >= 70) return 'moderate'
  if (score >= 50) return 'low'
  return 'poor'
}

/**
 * Get reliability level configuration
 */
export function getReliabilityConfig(level: ReliabilityLevel) {
  return RELIABILITY_LEVELS.find(r => r.value === level)
}

/**
 * Determine trend direction from time series data
 */
export function calculateTrendDirection(values: number[]): TrendDirection {
  if (values.length < 2) return 'stable'

  // Simple linear regression slope
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((sum, val) => sum + val, 0) / n

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean)
    denominator += Math.pow(i - xMean, 2)
  }

  const slope = numerator / denominator
  const threshold = yMean * 0.05 // 5% of mean

  if (Math.abs(slope) < threshold) return 'stable'
  return slope > 0 ? 'increasing' : 'decreasing'
}

/**
 * Calculate composite reliability score
 */
export function calculateReliabilityScore(metrics: {
  completion_rate: number
  win_rate: number
  on_time_rate: number
  quality_score: number | null
}): number {
  let score = 0

  // Completion rate: 30%
  score += metrics.completion_rate * 0.3

  // Win rate (capped at 50% for scoring): 20%
  score += Math.min(metrics.win_rate, 50) * 2 * 0.2

  // On-time delivery: 30%
  score += metrics.on_time_rate * 0.3

  // Quality score: 20%
  if (metrics.quality_score !== null) {
    score += metrics.quality_score * 0.2
  } else {
    // Default to average if no quality data
    score += 70 * 0.2
  }

  return Math.round(score * 10) / 10 // Round to 1 decimal
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined) return '-'
  return `${value.toFixed(decimals)}%`
}

/**
 * Get trend icon component name
 */
export function getTrendIcon(direction: TrendDirection): string {
  const config = TREND_DIRECTIONS.find(t => t.value === direction)
  return config?.icon || 'Minus'
}

/**
 * Get trend color class
 */
export function getTrendColor(direction: TrendDirection): string {
  const config = TREND_DIRECTIONS.find(t => t.value === direction)
  return config?.color || 'gray'
}

/**
 * Calculate win rate
 */
export function calculateWinRate(wins: number, totalBids: number): number {
  if (totalBids === 0) return 0
  return Math.round((wins / totalBids) * 1000) / 10 // Round to 1 decimal
}

/**
 * Calculate variance percentage
 */
export function calculateVariancePercentage(actual: number, estimated: number): number {
  if (estimated === 0) return 0
  return Math.round(((actual - estimated) / estimated) * 1000) / 10
}
