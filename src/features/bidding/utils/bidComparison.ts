/**
 * Bid Comparison Utilities
 * Algorithms for comparing, ranking, and analyzing multiple bids
 */

import type { BidSubmission, BidSubmissionWithDetails } from '@/types/bidding'

// ============================================================================
// Types
// ============================================================================

export interface BidStatistics {
  low: number
  high: number
  average: number
  median: number
  spread: number
  spreadPercent: number
  count: number
  standardDeviation: number
  variance: number
}

export interface BidAnalysis extends BidSubmission {
  rank: number
  varianceFromLow: number
  varianceFromLowPercent: number
  varianceFromHigh: number
  varianceFromHighPercent: number
  varianceFromAverage: number
  varianceFromAveragePercent: number
  varianceFromEstimate: number | null
  varianceFromEstimatePercent: number | null
  varianceFromMedian: number
  varianceFromMedianPercent: number
  isLowBid: boolean
  isHighBid: boolean
  isOutlier: boolean
  deviationsFromMean: number
}

export interface BidComparisonMatrix {
  bids: BidAnalysis[]
  statistics: BidStatistics
  lowBidId: string
  highBidId: string
  recommendedBidId: string | null
  outlierBidIds: string[]
  estimatedValue: number | null
}

export interface UnitPriceComparison {
  itemId: string
  itemDescription: string
  bids: {
    submissionId: string
    bidderName: string
    unitPrice: number
    quantity: number
    total: number
    rank: number
    varianceFromLow: number
  }[]
  lowPrice: number
  highPrice: number
  averagePrice: number
  spread: number
}

// ============================================================================
// Core Statistics
// ============================================================================

/**
 * Calculate comprehensive bid statistics
 */
export function calculateBidStatistics(bids: BidSubmission[]): BidStatistics | null {
  if (bids.length === 0) {return null}

  const amounts = bids.map(b => b.base_bid_amount)
  const low = Math.min(...amounts)
  const high = Math.max(...amounts)
  const sum = amounts.reduce((a, b) => a + b, 0)
  const average = sum / amounts.length
  const spread = high - low
  const spreadPercent = low > 0 ? (spread / low) * 100 : 0

  // Calculate median
  const sortedAmounts = [...amounts].sort((a, b) => a - b)
  const median = amounts.length % 2 === 0
    ? (sortedAmounts[amounts.length / 2 - 1] + sortedAmounts[amounts.length / 2]) / 2
    : sortedAmounts[Math.floor(amounts.length / 2)]

  // Calculate standard deviation and variance
  const squaredDifferences = amounts.map(amount => Math.pow(amount - average, 2))
  const variance = squaredDifferences.reduce((a, b) => a + b, 0) / amounts.length
  const standardDeviation = Math.sqrt(variance)

  return {
    low,
    high,
    average,
    median,
    spread,
    spreadPercent,
    count: amounts.length,
    standardDeviation,
    variance,
  }
}

/**
 * Identify outlier bids using statistical methods
 * Uses IQR (Interquartile Range) method
 */
export function identifyOutliers(bids: BidSubmission[]): string[] {
  if (bids.length < 4) {return []} // Need at least 4 bids for meaningful outlier detection

  const amounts = bids.map(b => b.base_bid_amount).sort((a, b) => a - b)

  // Calculate quartiles
  const q1Index = Math.floor(amounts.length * 0.25)
  const q3Index = Math.floor(amounts.length * 0.75)
  const q1 = amounts[q1Index]
  const q3 = amounts[q3Index]
  const iqr = q3 - q1

  // Calculate outlier bounds
  const lowerBound = q1 - (1.5 * iqr)
  const upperBound = q3 + (1.5 * iqr)

  // Find outliers
  return bids
    .filter(b => b.base_bid_amount < lowerBound || b.base_bid_amount > upperBound)
    .map(b => b.id)
}

/**
 * Identify outliers using standard deviation method
 */
export function identifyOutliersByStdDev(
  bids: BidSubmission[],
  threshold: number = 2
): string[] {
  if (bids.length < 3) {return []}

  const stats = calculateBidStatistics(bids)
  if (!stats) {return []}

  return bids
    .filter(b => {
      const deviations = Math.abs(b.base_bid_amount - stats.average) / stats.standardDeviation
      return deviations > threshold
    })
    .map(b => b.id)
}

// ============================================================================
// Bid Ranking
// ============================================================================

/**
 * Rank bids by amount (ascending)
 */
export function rankBids(bids: BidSubmission[]): BidAnalysis[] {
  if (bids.length === 0) {return []}

  const stats = calculateBidStatistics(bids)
  if (!stats) {return []}

  const outlierIds = identifyOutliers(bids)

  // Sort by amount and assign ranks
  const sorted = [...bids].sort((a, b) => a.base_bid_amount - b.base_bid_amount)

  return sorted.map((bid, index) => {
    const varianceFromLow = bid.base_bid_amount - stats.low
    const varianceFromHigh = bid.base_bid_amount - stats.high
    const varianceFromAverage = bid.base_bid_amount - stats.average
    const varianceFromMedian = bid.base_bid_amount - stats.median
    const deviationsFromMean = Math.abs(varianceFromAverage) / stats.standardDeviation

    return {
      ...bid,
      rank: index + 1,
      varianceFromLow,
      varianceFromLowPercent: stats.low > 0 ? (varianceFromLow / stats.low) * 100 : 0,
      varianceFromHigh,
      varianceFromHighPercent: stats.high > 0 ? (varianceFromHigh / stats.high) * 100 : 0,
      varianceFromAverage,
      varianceFromAveragePercent: stats.average > 0 ? (varianceFromAverage / stats.average) * 100 : 0,
      varianceFromEstimate: null,
      varianceFromEstimatePercent: null,
      varianceFromMedian,
      varianceFromMedianPercent: stats.median > 0 ? (varianceFromMedian / stats.median) * 100 : 0,
      isLowBid: bid.base_bid_amount === stats.low,
      isHighBid: bid.base_bid_amount === stats.high,
      isOutlier: outlierIds.includes(bid.id),
      deviationsFromMean,
    }
  })
}

/**
 * Rank bids with estimated value comparison
 */
export function rankBidsWithEstimate(
  bids: BidSubmission[],
  estimatedValue: number
): BidAnalysis[] {
  const rankedBids = rankBids(bids)

  return rankedBids.map(bid => {
    const varianceFromEstimate = bid.base_bid_amount - estimatedValue
    const varianceFromEstimatePercent = estimatedValue > 0
      ? (varianceFromEstimate / estimatedValue) * 100
      : 0

    return {
      ...bid,
      varianceFromEstimate,
      varianceFromEstimatePercent,
    }
  })
}

// ============================================================================
// Bid Comparison Analysis
// ============================================================================

/**
 * Create comprehensive bid comparison matrix
 */
export function createBidComparisonMatrix(
  bids: BidSubmission[],
  estimatedValue: number | null = null
): BidComparisonMatrix | null {
  if (bids.length === 0) {return null}

  const stats = calculateBidStatistics(bids)
  if (!stats) {return null}

  const rankedBids = estimatedValue
    ? rankBidsWithEstimate(bids, estimatedValue)
    : rankBids(bids)

  const lowBid = rankedBids.find(b => b.isLowBid)
  const highBid = rankedBids.find(b => b.isHighBid)
  const outlierBidIds = rankedBids.filter(b => b.isOutlier).map(b => b.id)

  // Determine recommended bid (excluding outliers, qualified bids only)
  const qualifiedBids = rankedBids.filter(
    b => !b.isOutlier &&
    ['received', 'under_review', 'qualified', 'shortlisted'].includes(b.status)
  )
  const recommendedBid = qualifiedBids.length > 0 ? qualifiedBids[0] : null

  return {
    bids: rankedBids,
    statistics: stats,
    lowBidId: lowBid?.id || '',
    highBidId: highBid?.id || '',
    recommendedBidId: recommendedBid?.id || null,
    outlierBidIds,
    estimatedValue,
  }
}

/**
 * Calculate bid spread between two amounts
 */
export function calculateBidSpread(lowBid: number, highBid: number): number {
  if (lowBid === 0) {return 0}
  return ((highBid - lowBid) / lowBid) * 100
}

/**
 * Determine if bid spread is acceptable
 */
export function isBidSpreadAcceptable(
  lowBid: number,
  highBid: number,
  maxAcceptableSpread: number = 20
): boolean {
  const spread = calculateBidSpread(lowBid, highBid)
  return spread <= maxAcceptableSpread
}

// ============================================================================
// Unit Price Comparison
// ============================================================================

/**
 * Compare unit prices across multiple bids
 */
export function compareUnitPrices(
  submissions: BidSubmissionWithDetails[],
  itemId: string
): UnitPriceComparison | null {
  // Extract unit prices for the specific item from all submissions
  const itemPrices = submissions
    .map(submission => {
      const item = submission.items?.find(i => i.package_item_id === itemId)
      if (!item || !item.unit_price) {return null}

      return {
        submissionId: submission.id,
        bidderName: submission.bidder_company_name,
        unitPrice: item.unit_price,
        quantity: item.quantity || 0,
        total: item.total_price || 0,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (itemPrices.length === 0) {return null}

  const prices = itemPrices.map(p => p.unitPrice)
  const lowPrice = Math.min(...prices)
  const highPrice = Math.max(...prices)
  const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length
  const spread = calculateBidSpread(lowPrice, highPrice)

  // Rank by unit price
  const sortedPrices = [...itemPrices].sort((a, b) => a.unitPrice - b.unitPrice)
  const rankedPrices = sortedPrices.map((item, index) => ({
    ...item,
    rank: index + 1,
    varianceFromLow: lowPrice > 0 ? ((item.unitPrice - lowPrice) / lowPrice) * 100 : 0,
  }))

  // Get item description from first submission with the item
  const firstSubmission = submissions.find(s =>
    s.items?.some(i => i.package_item_id === itemId)
  )
  const firstItem = firstSubmission?.items?.find(i => i.package_item_id === itemId)

  return {
    itemId,
    itemDescription: firstItem?.notes || itemId,
    bids: rankedPrices,
    lowPrice,
    highPrice,
    averagePrice,
    spread,
  }
}

/**
 * Compare all unit prices across bids
 */
export function compareAllUnitPrices(
  submissions: BidSubmissionWithDetails[]
): UnitPriceComparison[] {
  if (submissions.length === 0) {return []}

  // Get all unique item IDs
  const itemIds = new Set<string>()
  submissions.forEach(submission => {
    submission.items?.forEach(item => {
      if (item.package_item_id) {
        itemIds.add(item.package_item_id)
      }
    })
  })

  // Compare each item
  const comparisons: UnitPriceComparison[] = []
  itemIds.forEach(itemId => {
    const comparison = compareUnitPrices(submissions, itemId)
    if (comparison) {
      comparisons.push(comparison)
    }
  })

  return comparisons
}

// ============================================================================
// Low Bid Analysis
// ============================================================================

/**
 * Identify the low bidder
 */
export function identifyLowBid(bids: BidSubmission[]): BidSubmission | null {
  if (bids.length === 0) {return null}
  return bids.reduce((lowest, current) =>
    current.base_bid_amount < lowest.base_bid_amount ? current : lowest
  )
}

/**
 * Check if low bid is suspiciously low
 */
export function isLowBidSuspicious(
  lowBid: number,
  nextLowestBid: number,
  threshold: number = 15
): boolean {
  if (nextLowestBid === 0) {return false}
  const gap = calculateBidSpread(lowBid, nextLowestBid)
  return gap > threshold
}

/**
 * Analyze low bid quality
 */
export function analyzeLowBid(bids: BidSubmission[]): {
  lowBid: BidSubmission | null
  isSuspicious: boolean
  gapToNext: number
  recommendation: string
} {
  const sorted = [...bids].sort((a, b) => a.base_bid_amount - b.base_bid_amount)

  if (sorted.length === 0) {
    return {
      lowBid: null,
      isSuspicious: false,
      gapToNext: 0,
      recommendation: 'No bids to analyze',
    }
  }

  const lowBid = sorted[0]
  const nextBid = sorted[1]

  if (!nextBid) {
    return {
      lowBid,
      isSuspicious: false,
      gapToNext: 0,
      recommendation: 'Only one bid received',
    }
  }

  const gap = calculateBidSpread(lowBid.base_bid_amount, nextBid.base_bid_amount)
  const isSuspicious = isLowBidSuspicious(lowBid.base_bid_amount, nextBid.base_bid_amount)

  let recommendation = ''
  if (isSuspicious) {
    recommendation = `Low bid is ${gap.toFixed(1)}% below next bid. Review for completeness and qualifications.`
  } else if (gap > 10) {
    recommendation = `Low bid is ${gap.toFixed(1)}% below next bid. Standard review recommended.`
  } else {
    recommendation = 'Low bid is competitive with other bids.'
  }

  return {
    lowBid,
    isSuspicious,
    gapToNext: gap,
    recommendation,
  }
}

// ============================================================================
// Variance Analysis
// ============================================================================

/**
 * Calculate variance metrics for a single bid
 */
export function calculateBidVariance(
  bid: BidSubmission,
  stats: BidStatistics,
  estimatedValue: number | null = null
): {
  fromLow: number
  fromHigh: number
  fromAverage: number
  fromMedian: number
  fromEstimate: number | null
} {
  return {
    fromLow: stats.low > 0 ? ((bid.base_bid_amount - stats.low) / stats.low) * 100 : 0,
    fromHigh: stats.high > 0 ? ((bid.base_bid_amount - stats.high) / stats.high) * 100 : 0,
    fromAverage: stats.average > 0 ? ((bid.base_bid_amount - stats.average) / stats.average) * 100 : 0,
    fromMedian: stats.median > 0 ? ((bid.base_bid_amount - stats.median) / stats.median) * 100 : 0,
    fromEstimate: estimatedValue
      ? ((bid.base_bid_amount - estimatedValue) / estimatedValue) * 100
      : null,
  }
}
