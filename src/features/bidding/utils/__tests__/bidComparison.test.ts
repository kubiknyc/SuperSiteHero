/**
 * Bid Comparison Tests
 * Comprehensive tests for bid comparison, ranking, and analysis algorithms
 */

import { describe, it, expect } from 'vitest'
import type { BidSubmission } from '@/types/bidding'
import {
  calculateBidStatistics,
  identifyOutliers,
  identifyOutliersByStdDev,
  rankBids,
  rankBidsWithEstimate,
  createBidComparisonMatrix,
  calculateBidSpread,
  isBidSpreadAcceptable,
  compareUnitPrices,
  compareAllUnitPrices,
  identifyLowBid,
  isLowBidSuspicious,
  analyzeLowBid,
  calculateBidVariance,
} from '../bidComparison'

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockBid(
  overrides: Partial<BidSubmission> = {}
): BidSubmission {
  return {
    id: `bid-${Math.random()}`,
    bid_package_id: 'pkg-1',
    invitation_id: null,
    subcontractor_id: null,
    bidder_company_name: 'Test Contractor',
    bidder_contact_name: 'John Doe',
    bidder_email: 'john@test.com',
    bidder_phone: null,
    bidder_address: null,
    base_bid_amount: 100000,
    alternates_total: 0,
    total_bid_amount: 100000,
    unit_prices: null,
    submitted_at: new Date().toISOString(),
    submission_method: 'portal',
    is_late: false,
    bid_bond_included: true,
    bid_bond_amount: null,
    bid_bond_company: null,
    bid_bond_number: null,
    insurance_cert_included: true,
    years_in_business: 10,
    similar_projects_completed: 5,
    current_workload_percent: 75,
    proposed_start_date: null,
    proposed_duration_days: null,
    key_personnel: null,
    exclusions: null,
    clarifications: null,
    assumptions: null,
    value_engineering_suggestions: null,
    bid_form_url: null,
    attachment_urls: null,
    status: 'received',
    disqualification_reason: null,
    technical_score: null,
    price_score: null,
    overall_score: null,
    evaluation_notes: null,
    evaluated_by: null,
    evaluated_at: null,
    is_awarded: false,
    award_amount: null,
    award_date: null,
    contract_sent_at: null,
    contract_signed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function createCompetitiveBids(): BidSubmission[] {
  return [
    createMockBid({
      id: 'bid-1',
      bidder_company_name: 'Alpha Construction',
      base_bid_amount: 500000,
    }),
    createMockBid({
      id: 'bid-2',
      bidder_company_name: 'Beta Builders',
      base_bid_amount: 525000,
    }),
    createMockBid({
      id: 'bid-3',
      bidder_company_name: 'Gamma Contractors',
      base_bid_amount: 510000,
    }),
    createMockBid({
      id: 'bid-4',
      bidder_company_name: 'Delta Development',
      base_bid_amount: 540000,
    }),
    createMockBid({
      id: 'bid-5',
      bidder_company_name: 'Epsilon Electric',
      base_bid_amount: 515000,
    }),
  ]
}

function createBidsWithOutlier(): BidSubmission[] {
  return [
    createMockBid({
      id: 'bid-1',
      bidder_company_name: 'Normal Bid 1',
      base_bid_amount: 500000,
    }),
    createMockBid({
      id: 'bid-2',
      bidder_company_name: 'Normal Bid 2',
      base_bid_amount: 520000,
    }),
    createMockBid({
      id: 'bid-3',
      bidder_company_name: 'Normal Bid 3',
      base_bid_amount: 510000,
    }),
    createMockBid({
      id: 'bid-4',
      bidder_company_name: 'Outlier High',
      base_bid_amount: 750000, // Significantly higher
    }),
    createMockBid({
      id: 'bid-5',
      bidder_company_name: 'Outlier Low',
      base_bid_amount: 300000, // Significantly lower
    }),
  ]
}

// ============================================================================
// Statistics Tests
// ============================================================================

describe('calculateBidStatistics', () => {
  it('should return null for empty bid array', () => {
    // Arrange
    const bids: BidSubmission[] = []

    // Act
    const result = calculateBidStatistics(bids)

    // Assert
    expect(result).toBeNull()
  })

  it('should calculate statistics for single bid', () => {
    // Arrange
    const bids = [createMockBid({ base_bid_amount: 100000 })]

    // Act
    const result = calculateBidStatistics(bids)

    // Assert
    expect(result).not.toBeNull()
    expect(result!.low).toBe(100000)
    expect(result!.high).toBe(100000)
    expect(result!.average).toBe(100000)
    expect(result!.median).toBe(100000)
    expect(result!.spread).toBe(0)
    expect(result!.spreadPercent).toBe(0)
    expect(result!.count).toBe(1)
    expect(result!.standardDeviation).toBe(0)
  })

  it('should calculate statistics for multiple competitive bids', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const result = calculateBidStatistics(bids)

    // Assert
    expect(result).not.toBeNull()
    expect(result!.low).toBe(500000)
    expect(result!.high).toBe(540000)
    expect(result!.average).toBe(518000)
    expect(result!.spread).toBe(40000)
    expect(result!.spreadPercent).toBe(8)
    expect(result!.count).toBe(5)
    expect(result!.standardDeviation).toBeGreaterThan(0)
  })

  it('should calculate median correctly for odd number of bids', () => {
    // Arrange
    const bids = [
      createMockBid({ base_bid_amount: 100000 }),
      createMockBid({ base_bid_amount: 200000 }),
      createMockBid({ base_bid_amount: 300000 }),
    ]

    // Act
    const result = calculateBidStatistics(bids)

    // Assert
    expect(result!.median).toBe(200000)
  })

  it('should calculate median correctly for even number of bids', () => {
    // Arrange
    const bids = [
      createMockBid({ base_bid_amount: 100000 }),
      createMockBid({ base_bid_amount: 200000 }),
      createMockBid({ base_bid_amount: 300000 }),
      createMockBid({ base_bid_amount: 400000 }),
    ]

    // Act
    const result = calculateBidStatistics(bids)

    // Assert
    expect(result!.median).toBe(250000) // Average of 200000 and 300000
  })

  it('should calculate variance and standard deviation', () => {
    // Arrange
    const bids = [
      createMockBid({ base_bid_amount: 100000 }),
      createMockBid({ base_bid_amount: 200000 }),
      createMockBid({ base_bid_amount: 300000 }),
    ]

    // Act
    const result = calculateBidStatistics(bids)

    // Assert
    expect(result!.variance).toBeGreaterThan(0)
    expect(result!.standardDeviation).toBeGreaterThan(0)
    expect(result!.standardDeviation).toBe(Math.sqrt(result!.variance))
  })
})

// ============================================================================
// Outlier Detection Tests
// ============================================================================

describe('identifyOutliers', () => {
  it('should return empty array for less than 4 bids', () => {
    // Arrange
    const bids = [
      createMockBid({ base_bid_amount: 100000 }),
      createMockBid({ base_bid_amount: 200000 }),
      createMockBid({ base_bid_amount: 300000 }),
    ]

    // Act
    const outliers = identifyOutliers(bids)

    // Assert
    expect(outliers).toEqual([])
  })

  it('should not identify outliers in competitive bids', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const outliers = identifyOutliers(bids)

    // Assert
    expect(outliers).toEqual([])
  })

  it('should identify high outlier', () => {
    // Arrange
    const bids = createBidsWithOutlier()

    // Act
    const outliers = identifyOutliers(bids)

    // Assert
    expect(outliers).toContain('bid-4') // High outlier
  })

  it('should identify low outlier', () => {
    // Arrange
    const bids = createBidsWithOutlier()

    // Act
    const outliers = identifyOutliers(bids)

    // Assert
    expect(outliers).toContain('bid-5') // Low outlier
  })

  it('should identify multiple outliers', () => {
    // Arrange
    const bids = createBidsWithOutlier()

    // Act
    const outliers = identifyOutliers(bids)

    // Assert
    expect(outliers.length).toBe(2)
    expect(outliers).toContain('bid-4')
    expect(outliers).toContain('bid-5')
  })
})

describe('identifyOutliersByStdDev', () => {
  it('should return empty array for less than 3 bids', () => {
    // Arrange
    const bids = [
      createMockBid({ base_bid_amount: 100000 }),
      createMockBid({ base_bid_amount: 200000 }),
    ]

    // Act
    const outliers = identifyOutliersByStdDev(bids)

    // Assert
    expect(outliers).toEqual([])
  })

  it('should identify outliers beyond 2 standard deviations', () => {
    // Arrange
    const bids = createBidsWithOutlier()

    // Act
    const outliers = identifyOutliersByStdDev(bids, 1.5) // Use stricter threshold

    // Assert
    expect(outliers.length).toBeGreaterThan(0)
  })

  it('should use custom threshold', () => {
    // Arrange
    const bids = createBidsWithOutlier()

    // Act
    const strict = identifyOutliersByStdDev(bids, 1.5)
    const lenient = identifyOutliersByStdDev(bids, 3)

    // Assert
    expect(strict.length).toBeGreaterThanOrEqual(lenient.length)
  })
})

// ============================================================================
// Bid Ranking Tests
// ============================================================================

describe('rankBids', () => {
  it('should return empty array for no bids', () => {
    // Arrange
    const bids: BidSubmission[] = []

    // Act
    const result = rankBids(bids)

    // Assert
    expect(result).toEqual([])
  })

  it('should rank bids by amount ascending', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const result = rankBids(bids)

    // Assert
    expect(result[0].rank).toBe(1)
    expect(result[0].base_bid_amount).toBe(500000) // Lowest
    expect(result[4].rank).toBe(5)
    expect(result[4].base_bid_amount).toBe(540000) // Highest
  })

  it('should identify low and high bids', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const result = rankBids(bids)

    // Assert
    const lowBid = result.find(b => b.isLowBid)
    const highBid = result.find(b => b.isHighBid)

    expect(lowBid).toBeDefined()
    expect(lowBid!.base_bid_amount).toBe(500000)
    expect(highBid).toBeDefined()
    expect(highBid!.base_bid_amount).toBe(540000)
  })

  it('should calculate variance from low bid', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const result = rankBids(bids)

    // Assert
    const lowBid = result.find(b => b.isLowBid)!
    const secondBid = result[1]

    expect(lowBid.varianceFromLow).toBe(0)
    expect(lowBid.varianceFromLowPercent).toBe(0)
    expect(secondBid.varianceFromLow).toBe(10000)
    expect(secondBid.varianceFromLowPercent).toBe(2)
  })

  it('should calculate variance from average', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const result = rankBids(bids)

    // Assert
    result.forEach(bid => {
      expect(bid.varianceFromAverage).toBeDefined()
      expect(bid.varianceFromAveragePercent).toBeDefined()
    })
  })

  it('should calculate variance from median', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const result = rankBids(bids)

    // Assert
    result.forEach(bid => {
      expect(bid.varianceFromMedian).toBeDefined()
      expect(bid.varianceFromMedianPercent).toBeDefined()
    })
  })

  it('should mark outliers', () => {
    // Arrange
    const bids = createBidsWithOutlier()

    // Act
    const result = rankBids(bids)

    // Assert
    const outliers = result.filter(b => b.isOutlier)
    expect(outliers.length).toBeGreaterThan(0)
  })

  it('should calculate deviations from mean', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const result = rankBids(bids)

    // Assert
    result.forEach(bid => {
      expect(bid.deviationsFromMean).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('rankBidsWithEstimate', () => {
  it('should calculate variance from estimate', () => {
    // Arrange
    const bids = createCompetitiveBids()
    const estimate = 550000

    // Act
    const result = rankBidsWithEstimate(bids, estimate)

    // Assert
    result.forEach(bid => {
      expect(bid.varianceFromEstimate).toBeDefined()
      expect(bid.varianceFromEstimatePercent).toBeDefined()
    })
  })

  it('should show negative variance for bids below estimate', () => {
    // Arrange
    const bids = createCompetitiveBids()
    const estimate = 600000 // Higher than all bids

    // Act
    const result = rankBidsWithEstimate(bids, estimate)

    // Assert
    result.forEach(bid => {
      expect(bid.varianceFromEstimate).toBeLessThan(0)
      expect(bid.varianceFromEstimatePercent).toBeLessThan(0)
    })
  })

  it('should show positive variance for bids above estimate', () => {
    // Arrange
    const bids = createCompetitiveBids()
    const estimate = 400000 // Lower than all bids

    // Act
    const result = rankBidsWithEstimate(bids, estimate)

    // Assert
    result.forEach(bid => {
      expect(bid.varianceFromEstimate).toBeGreaterThan(0)
      expect(bid.varianceFromEstimatePercent).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// Bid Comparison Matrix Tests
// ============================================================================

describe('createBidComparisonMatrix', () => {
  it('should return null for empty bids', () => {
    // Arrange
    const bids: BidSubmission[] = []

    // Act
    const result = createBidComparisonMatrix(bids)

    // Assert
    expect(result).toBeNull()
  })

  it('should create comprehensive comparison matrix', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const result = createBidComparisonMatrix(bids)

    // Assert
    expect(result).not.toBeNull()
    expect(result!.bids.length).toBe(5)
    expect(result!.statistics).toBeDefined()
    expect(result!.lowBidId).toBe('bid-1')
    expect(result!.highBidId).toBe('bid-4')
  })

  it('should identify recommended bid', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const result = createBidComparisonMatrix(bids)

    // Assert
    expect(result!.recommendedBidId).toBe('bid-1') // Should be low bid if qualified
  })

  it('should exclude outliers from recommendation', () => {
    // Arrange
    const bids = createBidsWithOutlier()

    // Act
    const result = createBidComparisonMatrix(bids)

    // Assert
    expect(result!.outlierBidIds.length).toBeGreaterThan(0)
    // Recommended should not be an outlier
    expect(result!.outlierBidIds).not.toContain(result!.recommendedBidId)
  })

  it('should include estimate in matrix when provided', () => {
    // Arrange
    const bids = createCompetitiveBids()
    const estimate = 550000

    // Act
    const result = createBidComparisonMatrix(bids, estimate)

    // Assert
    expect(result!.estimatedValue).toBe(estimate)
    result!.bids.forEach(bid => {
      expect(bid.varianceFromEstimate).not.toBeNull()
    })
  })

  it('should exclude disqualified bids from recommendation', () => {
    // Arrange
    const bids = [
      ...createCompetitiveBids(),
      createMockBid({
        id: 'bid-disqualified',
        base_bid_amount: 450000, // Lower than all others
        status: 'disqualified',
      }),
    ]

    // Act
    const result = createBidComparisonMatrix(bids)

    // Assert
    expect(result!.recommendedBidId).not.toBe('bid-disqualified')
  })
})

// ============================================================================
// Bid Spread Tests
// ============================================================================

describe('calculateBidSpread', () => {
  it('should calculate spread percentage', () => {
    // Arrange
    const low = 100000
    const high = 150000

    // Act
    const spread = calculateBidSpread(low, high)

    // Assert
    expect(spread).toBe(50) // 50% spread
  })

  it('should return 0 for equal bids', () => {
    // Arrange
    const low = 100000
    const high = 100000

    // Act
    const spread = calculateBidSpread(low, high)

    // Assert
    expect(spread).toBe(0)
  })

  it('should return 0 when low bid is 0', () => {
    // Arrange
    const low = 0
    const high = 100000

    // Act
    const spread = calculateBidSpread(low, high)

    // Assert
    expect(spread).toBe(0)
  })

  it('should calculate small spreads accurately', () => {
    // Arrange
    const low = 100000
    const high = 105000

    // Act
    const spread = calculateBidSpread(low, high)

    // Assert
    expect(spread).toBe(5)
  })
})

describe('isBidSpreadAcceptable', () => {
  it('should return true for spread within threshold', () => {
    // Arrange
    const low = 100000
    const high = 115000 // 15% spread

    // Act
    const isAcceptable = isBidSpreadAcceptable(low, high, 20)

    // Assert
    expect(isAcceptable).toBe(true)
  })

  it('should return false for spread exceeding threshold', () => {
    // Arrange
    const low = 100000
    const high = 150000 // 50% spread

    // Act
    const isAcceptable = isBidSpreadAcceptable(low, high, 20)

    // Assert
    expect(isAcceptable).toBe(false)
  })

  it('should use default threshold of 20%', () => {
    // Arrange
    const low = 100000
    const high = 120000 // 20% spread

    // Act
    const isAcceptable = isBidSpreadAcceptable(low, high)

    // Assert
    expect(isAcceptable).toBe(true)
  })
})

// ============================================================================
// Low Bid Analysis Tests
// ============================================================================

describe('identifyLowBid', () => {
  it('should return null for empty array', () => {
    // Arrange
    const bids: BidSubmission[] = []

    // Act
    const lowBid = identifyLowBid(bids)

    // Assert
    expect(lowBid).toBeNull()
  })

  it('should identify lowest bid', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const lowBid = identifyLowBid(bids)

    // Assert
    expect(lowBid).not.toBeNull()
    expect(lowBid!.base_bid_amount).toBe(500000)
    expect(lowBid!.id).toBe('bid-1')
  })

  it('should handle single bid', () => {
    // Arrange
    const bids = [createMockBid({ base_bid_amount: 100000 })]

    // Act
    const lowBid = identifyLowBid(bids)

    // Assert
    expect(lowBid).not.toBeNull()
    expect(lowBid!.base_bid_amount).toBe(100000)
  })
})

describe('isLowBidSuspicious', () => {
  it('should return true for large gap', () => {
    // Arrange
    const low = 100000
    const nextLowest = 130000 // 30% higher

    // Act
    const isSuspicious = isLowBidSuspicious(low, nextLowest, 15)

    // Assert
    expect(isSuspicious).toBe(true)
  })

  it('should return false for normal gap', () => {
    // Arrange
    const low = 100000
    const nextLowest = 105000 // 5% higher

    // Act
    const isSuspicious = isLowBidSuspicious(low, nextLowest, 15)

    // Assert
    expect(isSuspicious).toBe(false)
  })

  it('should use default threshold of 15%', () => {
    // Arrange
    const low = 100000
    const nextLowest = 120000 // 20% higher

    // Act
    const isSuspicious = isLowBidSuspicious(low, nextLowest)

    // Assert
    expect(isSuspicious).toBe(true)
  })

  it('should return false when next bid is 0', () => {
    // Arrange
    const low = 100000
    const nextLowest = 0

    // Act
    const isSuspicious = isLowBidSuspicious(low, nextLowest)

    // Assert
    expect(isSuspicious).toBe(false)
  })
})

describe('analyzeLowBid', () => {
  it('should handle no bids', () => {
    // Arrange
    const bids: BidSubmission[] = []

    // Act
    const analysis = analyzeLowBid(bids)

    // Assert
    expect(analysis.lowBid).toBeNull()
    expect(analysis.isSuspicious).toBe(false)
    expect(analysis.recommendation).toContain('No bids')
  })

  it('should handle single bid', () => {
    // Arrange
    const bids = [createMockBid({ base_bid_amount: 100000 })]

    // Act
    const analysis = analyzeLowBid(bids)

    // Assert
    expect(analysis.lowBid).not.toBeNull()
    expect(analysis.isSuspicious).toBe(false)
    expect(analysis.recommendation).toContain('Only one bid')
  })

  it('should identify suspicious low bid', () => {
    // Arrange
    const bids = [
      createMockBid({ id: 'bid-1', base_bid_amount: 100000 }),
      createMockBid({ id: 'bid-2', base_bid_amount: 150000 }), // 50% higher
    ]

    // Act
    const analysis = analyzeLowBid(bids)

    // Assert
    expect(analysis.isSuspicious).toBe(true)
    expect(analysis.gapToNext).toBeGreaterThan(15)
    expect(analysis.recommendation).toContain('Review for completeness')
  })

  it('should identify competitive low bid', () => {
    // Arrange
    const bids = createCompetitiveBids()

    // Act
    const analysis = analyzeLowBid(bids)

    // Assert
    expect(analysis.isSuspicious).toBe(false)
    expect(analysis.gapToNext).toBeLessThan(15)
    expect(analysis.recommendation).toContain('competitive')
  })

  it('should calculate gap to next bid', () => {
    // Arrange
    const bids = [
      createMockBid({ base_bid_amount: 100000 }),
      createMockBid({ base_bid_amount: 110000 }),
      createMockBid({ base_bid_amount: 120000 }),
    ]

    // Act
    const analysis = analyzeLowBid(bids)

    // Assert
    expect(analysis.gapToNext).toBe(10) // 10% gap
  })
})

// ============================================================================
// Variance Calculation Tests
// ============================================================================

describe('calculateBidVariance', () => {
  it('should calculate all variance metrics', () => {
    // Arrange
    const bid = createMockBid({ base_bid_amount: 520000 })
    const bids = createCompetitiveBids()
    const stats = calculateBidStatistics(bids)!
    const estimate = 550000

    // Act
    const variance = calculateBidVariance(bid, stats, estimate)

    // Assert
    expect(variance.fromLow).toBeGreaterThan(0)
    expect(variance.fromHigh).toBeLessThan(0)
    expect(variance.fromAverage).toBeDefined()
    expect(variance.fromMedian).toBeDefined()
    expect(variance.fromEstimate).toBeLessThan(0)
  })

  it('should return null for estimate variance when no estimate', () => {
    // Arrange
    const bid = createMockBid({ base_bid_amount: 520000 })
    const bids = createCompetitiveBids()
    const stats = calculateBidStatistics(bids)!

    // Act
    const variance = calculateBidVariance(bid, stats, null)

    // Assert
    expect(variance.fromEstimate).toBeNull()
  })

  it('should calculate 0 variance for low bid', () => {
    // Arrange
    const bids = createCompetitiveBids()
    const lowBid = bids[0]
    const stats = calculateBidStatistics(bids)!

    // Act
    const variance = calculateBidVariance(lowBid, stats)

    // Assert
    expect(variance.fromLow).toBe(0)
  })
})

// ============================================================================
// Unit Price Comparison Tests (requires extended types)
// ============================================================================

describe('compareUnitPrices', () => {
  it('should return null when no submissions have the item', () => {
    // Arrange
    const submissions = createCompetitiveBids().map(bid => ({
      ...bid,
      items: [],
    }))

    // Act
    const result = compareUnitPrices(submissions, 'item-1')

    // Assert
    expect(result).toBeNull()
  })

  it('should compare unit prices across submissions', () => {
    // Arrange
    const submissions = [
      {
        ...createMockBid({ id: 'bid-1', bidder_company_name: 'Alpha' }),
        items: [
          {
            id: 'item-1',
            submission_id: 'bid-1',
            package_item_id: 'pkg-item-1',
            unit_price: 50,
            quantity: 100,
            total_price: 5000,
            is_included: true,
            notes: 'Concrete (CY)',
          },
        ],
      },
      {
        ...createMockBid({ id: 'bid-2', bidder_company_name: 'Beta' }),
        items: [
          {
            id: 'item-2',
            submission_id: 'bid-2',
            package_item_id: 'pkg-item-1',
            unit_price: 55,
            quantity: 100,
            total_price: 5500,
            is_included: true,
            notes: 'Concrete (CY)',
          },
        ],
      },
    ]

    // Act
    const result = compareUnitPrices(submissions, 'pkg-item-1')

    // Assert
    expect(result).not.toBeNull()
    expect(result!.bids.length).toBe(2)
    expect(result!.lowPrice).toBe(50)
    expect(result!.highPrice).toBe(55)
    expect(result!.averagePrice).toBe(52.5)
  })

  it('should rank unit prices', () => {
    // Arrange
    const submissions = [
      {
        ...createMockBid({ id: 'bid-1', bidder_company_name: 'High Price' }),
        items: [
          {
            id: 'item-1',
            submission_id: 'bid-1',
            package_item_id: 'pkg-item-1',
            unit_price: 100,
            quantity: 50,
            total_price: 5000,
            is_included: true,
            notes: null,
          },
        ],
      },
      {
        ...createMockBid({ id: 'bid-2', bidder_company_name: 'Low Price' }),
        items: [
          {
            id: 'item-2',
            submission_id: 'bid-2',
            package_item_id: 'pkg-item-1',
            unit_price: 80,
            quantity: 50,
            total_price: 4000,
            is_included: true,
            notes: null,
          },
        ],
      },
    ]

    // Act
    const result = compareUnitPrices(submissions, 'pkg-item-1')

    // Assert
    expect(result!.bids[0].rank).toBe(1)
    expect(result!.bids[0].bidderName).toBe('Low Price')
    expect(result!.bids[1].rank).toBe(2)
    expect(result!.bids[1].bidderName).toBe('High Price')
  })
})

// ============================================================================
// Edge Cases and Real-World Scenarios
// ============================================================================

describe('Edge Cases', () => {
  it('should handle tied bids', () => {
    // Arrange
    const bids = [
      createMockBid({ id: 'bid-1', base_bid_amount: 100000 }),
      createMockBid({ id: 'bid-2', base_bid_amount: 100000 }),
      createMockBid({ id: 'bid-3', base_bid_amount: 100000 }),
    ]

    // Act
    const ranked = rankBids(bids)

    // Assert
    expect(ranked.every(b => b.base_bid_amount === 100000)).toBe(true)
    expect(ranked.map(b => b.rank)).toEqual([1, 2, 3])
  })

  it('should handle very large bid amounts', () => {
    // Arrange
    const bids = [
      createMockBid({ base_bid_amount: 50000000 }),
      createMockBid({ base_bid_amount: 75000000 }),
    ]

    // Act
    const stats = calculateBidStatistics(bids)

    // Assert
    expect(stats).not.toBeNull()
    expect(stats!.low).toBe(50000000)
    expect(stats!.high).toBe(75000000)
  })

  it('should handle very small spreads', () => {
    // Arrange
    const bids = [
      createMockBid({ base_bid_amount: 100000 }),
      createMockBid({ base_bid_amount: 100100 }),
      createMockBid({ base_bid_amount: 100200 }),
    ]

    // Act
    const stats = calculateBidStatistics(bids)

    // Assert
    expect(stats!.spreadPercent).toBeLessThan(1)
  })
})

describe('Real-World Construction Scenarios', () => {
  it('should analyze electrical bid package with 5 bidders', () => {
    // Arrange - Realistic electrical bid scenario
    const bids = [
      createMockBid({
        id: 'elec-1',
        bidder_company_name: 'ABC Electric',
        base_bid_amount: 485000,
        years_in_business: 25,
        similar_projects_completed: 15,
      }),
      createMockBid({
        id: 'elec-2',
        bidder_company_name: 'Beta Electrical',
        base_bid_amount: 512000,
        years_in_business: 18,
        similar_projects_completed: 12,
      }),
      createMockBid({
        id: 'elec-3',
        bidder_company_name: 'Current Solutions',
        base_bid_amount: 495000,
        years_in_business: 30,
        similar_projects_completed: 20,
      }),
      createMockBid({
        id: 'elec-4',
        bidder_company_name: 'Delta Power',
        base_bid_amount: 528000,
        years_in_business: 12,
        similar_projects_completed: 8,
      }),
      createMockBid({
        id: 'elec-5',
        bidder_company_name: 'Epsilon Electric',
        base_bid_amount: 505000,
        years_in_business: 22,
        similar_projects_completed: 14,
      }),
    ]
    const estimate = 520000

    // Act
    const matrix = createBidComparisonMatrix(bids, estimate)

    // Assert
    expect(matrix).not.toBeNull()
    expect(matrix!.bids.length).toBe(5)
    expect(matrix!.lowBidId).toBe('elec-1')
    expect(matrix!.statistics.spreadPercent).toBeLessThan(10) // Competitive spread
    expect(matrix!.recommendedBidId).toBe('elec-1') // Low bid should be recommended
  })

  it('should identify suspiciously low bid in lump sum package', () => {
    // Arrange - Need at least 4 bids for outlier detection to work
    const bids = [
      createMockBid({
        id: 'ls-1',
        bidder_company_name: 'Suspiciously Low Bidder',
        base_bid_amount: 350000, // 30% below others
      }),
      createMockBid({
        id: 'ls-2',
        bidder_company_name: 'Normal Bidder 1',
        base_bid_amount: 500000,
      }),
      createMockBid({
        id: 'ls-3',
        bidder_company_name: 'Normal Bidder 2',
        base_bid_amount: 520000,
      }),
      createMockBid({
        id: 'ls-4',
        bidder_company_name: 'Normal Bidder 3',
        base_bid_amount: 510000,
      }),
    ]

    // Act
    const analysis = analyzeLowBid(bids)
    const matrix = createBidComparisonMatrix(bids)

    // Assert
    expect(analysis.isSuspicious).toBe(true)
    expect(analysis.gapToNext).toBeGreaterThan(30)
    expect(matrix!.outlierBidIds).toContain('ls-1')
  })
})
