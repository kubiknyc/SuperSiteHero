/**
 * Bid Evaluation Tests
 * Comprehensive tests for bid scoring, qualification, and recommendation logic
 */

import { describe, it, expect } from 'vitest'
import type { BidSubmission, BidEvaluationCriteria } from '@/types/bidding'
import {
  calculatePriceScore,
  calculatePriceScoreWithThreshold,
  calculatePriceScoreBestValue,
  calculateTechnicalScore,
  scoreCriterion,
  evaluateCriteria,
  checkQualifications,
  calculateQualificationScore,
  calculateOverallScore,
  evaluateBid,
  evaluateAndRankBids,
  breakTie,
  resolveTies,
  generateRecommendation,
  DEFAULT_SCORING_WEIGHTS,
  type EvaluationScore,
  type QualificationCheckResult,
  type ScoringWeights,
} from '../bidEvaluation'

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
    bid_bond_amount: 5000,
    bid_bond_company: 'Surety Inc',
    bid_bond_number: 'BB-12345',
    insurance_cert_included: true,
    years_in_business: 10,
    similar_projects_completed: 5,
    current_workload_percent: 75,
    proposed_start_date: null,
    proposed_duration_days: 90,
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

function createMockCriteria(): BidEvaluationCriteria[] {
  return [
    {
      id: 'crit-1',
      bid_package_id: 'pkg-1',
      name: 'Project Approach',
      description: 'Quality of proposed approach and methodology',
      weight: 30,
      max_score: 100,
      sort_order: 1,
      criteria_type: 'qualitative',
    },
    {
      id: 'crit-2',
      bid_package_id: 'pkg-1',
      name: 'Safety Plan',
      description: 'Comprehensiveness of safety plan',
      weight: 25,
      max_score: 100,
      sort_order: 2,
      criteria_type: 'qualitative',
    },
    {
      id: 'crit-3',
      bid_package_id: 'pkg-1',
      name: 'Schedule',
      description: 'Feasibility and quality of proposed schedule',
      weight: 25,
      max_score: 100,
      sort_order: 3,
      criteria_type: 'qualitative',
    },
    {
      id: 'crit-4',
      bid_package_id: 'pkg-1',
      name: 'Quality Control',
      description: 'Quality control and quality assurance plan',
      weight: 20,
      max_score: 100,
      sort_order: 4,
      criteria_type: 'qualitative',
    },
  ]
}

// ============================================================================
// Price Scoring Tests
// ============================================================================

describe('calculatePriceScore', () => {
  it('should give max score to low bid', () => {
    // Arrange
    const bidAmount = 100000
    const lowBid = 100000
    const maxScore = 100

    // Act
    const score = calculatePriceScore(bidAmount, lowBid, maxScore)

    // Assert
    expect(score).toBe(100)
  })

  it('should calculate proportional score for higher bids', () => {
    // Arrange
    const bidAmount = 120000
    const lowBid = 100000
    const maxScore = 100

    // Act
    const score = calculatePriceScore(bidAmount, lowBid, maxScore)

    // Assert
    // Score = 100 * (100000 / 120000) = 83.33
    expect(score).toBeCloseTo(83.33, 2)
  })

  it('should handle double the low bid', () => {
    // Arrange
    const bidAmount = 200000
    const lowBid = 100000
    const maxScore = 100

    // Act
    const score = calculatePriceScore(bidAmount, lowBid, maxScore)

    // Assert
    expect(score).toBe(50)
  })

  it('should return 0 when low bid is 0', () => {
    // Arrange
    const bidAmount = 100000
    const lowBid = 0

    // Act
    const score = calculatePriceScore(bidAmount, lowBid)

    // Assert
    expect(score).toBe(0)
  })

  it('should not exceed max score', () => {
    // Arrange
    const bidAmount = 100000
    const lowBid = 150000 // Bid is lower than "low bid"
    const maxScore = 100

    // Act
    const score = calculatePriceScore(bidAmount, lowBid, maxScore)

    // Assert
    expect(score).toBeLessThanOrEqual(maxScore)
  })
})

describe('calculatePriceScoreWithThreshold', () => {
  it('should give full score within threshold', () => {
    // Arrange
    const bidAmount = 105000
    const lowBid = 100000
    const threshold = 10 // 10% threshold
    const maxScore = 100

    // Act
    const score = calculatePriceScoreWithThreshold(bidAmount, lowBid, threshold, maxScore)

    // Assert
    expect(score).toBe(100) // Within 10% threshold
  })

  it('should reduce score beyond threshold', () => {
    // Arrange
    const bidAmount = 125000
    const lowBid = 100000
    const threshold = 10 // 10% threshold
    const maxScore = 100

    // Act
    const score = calculatePriceScoreWithThreshold(bidAmount, lowBid, threshold, maxScore)

    // Assert
    expect(score).toBeLessThan(100)
    expect(score).toBeGreaterThan(0)
  })

  it('should give full score to low bid', () => {
    // Arrange
    const bidAmount = 100000
    const lowBid = 100000
    const threshold = 10
    const maxScore = 100

    // Act
    const score = calculatePriceScoreWithThreshold(bidAmount, lowBid, threshold, maxScore)

    // Assert
    expect(score).toBe(100)
  })

  it('should give reduced score at threshold boundary', () => {
    // Arrange
    const bidAmount = 110000
    const lowBid = 100000
    const threshold = 10
    const maxScore = 100

    // Act
    const score = calculatePriceScoreWithThreshold(bidAmount, lowBid, threshold, maxScore)

    // Assert
    expect(score).toBe(100) // Exactly at threshold
  })
})

describe('calculatePriceScoreBestValue', () => {
  it('should give max score at or below average', () => {
    // Arrange
    const bidAmount = 100000
    const averageBid = 110000
    const lowBid = 95000
    const maxScore = 100

    // Act
    const score = calculatePriceScoreBestValue(bidAmount, averageBid, lowBid, maxScore)

    // Assert
    expect(score).toBe(100)
  })

  it('should reduce score above average', () => {
    // Arrange
    const bidAmount = 110000 // 10% above average
    const averageBid = 100000
    const lowBid = 90000
    const maxScore = 100

    // Act
    const score = calculatePriceScoreBestValue(bidAmount, averageBid, lowBid, maxScore)

    // Assert
    expect(score).toBeLessThan(100)
    expect(score).toBeGreaterThan(0)
  })

  it('should give 0 score at 20% above average', () => {
    // Arrange
    const bidAmount = 120000
    const averageBid = 100000
    const lowBid = 90000
    const maxScore = 100

    // Act
    const score = calculatePriceScoreBestValue(bidAmount, averageBid, lowBid, maxScore)

    // Assert
    expect(score).toBe(0)
  })
})

// ============================================================================
// Technical Scoring Tests
// ============================================================================

describe('scoreCriterion', () => {
  it('should calculate weighted score', () => {
    // Arrange
    const actualScore = 80
    const maxScore = 100
    const weight = 25

    // Act
    const score = scoreCriterion(actualScore, maxScore, weight)

    // Assert
    expect(score).toBe(20) // (80/100) * 25 = 20
  })

  it('should handle perfect score', () => {
    // Arrange
    const actualScore = 100
    const maxScore = 100
    const weight = 30

    // Act
    const score = scoreCriterion(actualScore, maxScore, weight)

    // Assert
    expect(score).toBe(30)
  })

  it('should handle zero score', () => {
    // Arrange
    const actualScore = 0
    const maxScore = 100
    const weight = 25

    // Act
    const score = scoreCriterion(actualScore, maxScore, weight)

    // Assert
    expect(score).toBe(0)
  })

  it('should cap score at max', () => {
    // Arrange
    const actualScore = 120 // Over max
    const maxScore = 100
    const weight = 25

    // Act
    const score = scoreCriterion(actualScore, maxScore, weight)

    // Assert
    expect(score).toBe(25) // Should be capped at weight
  })

  it('should handle negative scores', () => {
    // Arrange
    const actualScore = -10
    const maxScore = 100
    const weight = 25

    // Act
    const score = scoreCriterion(actualScore, maxScore, weight)

    // Assert
    expect(score).toBe(0) // Negative should become 0
  })
})

describe('evaluateCriteria', () => {
  it('should evaluate all criteria', () => {
    // Arrange
    const criteria = createMockCriteria()
    const scores = {
      'crit-1': { score: 85, notes: 'Good approach' },
      'crit-2': { score: 90, notes: 'Excellent safety plan' },
      'crit-3': { score: 75, notes: 'Acceptable schedule' },
      'crit-4': { score: 80, notes: 'Strong QC plan' },
    }

    // Act
    const result = evaluateCriteria(criteria, scores)

    // Assert
    expect(result).toHaveLength(4)
    result.forEach(r => {
      expect(r.actualScore).toBeGreaterThan(0)
      expect(r.weightedScore).toBeGreaterThan(0)
    })
  })

  it('should default to 0 for missing scores', () => {
    // Arrange
    const criteria = createMockCriteria()
    const scores = {
      'crit-1': { score: 85 },
      // crit-2, crit-3, crit-4 missing
    }

    // Act
    const result = evaluateCriteria(criteria, scores)

    // Assert
    expect(result).toHaveLength(4)
    expect(result[0].actualScore).toBe(85)
    expect(result[1].actualScore).toBe(0)
    expect(result[2].actualScore).toBe(0)
    expect(result[3].actualScore).toBe(0)
  })

  it('should include notes when provided', () => {
    // Arrange
    const criteria = createMockCriteria()
    const scores = {
      'crit-1': { score: 85, notes: 'Test note' },
    }

    // Act
    const result = evaluateCriteria(criteria, scores)

    // Assert
    expect(result[0].notes).toBe('Test note')
  })
})

describe('calculateTechnicalScore', () => {
  it('should calculate weighted average', () => {
    // Arrange
    const scores: EvaluationScore[] = [
      {
        criteriaId: 'crit-1',
        criteriaName: 'Approach',
        weight: 30,
        maxScore: 100,
        actualScore: 80,
        weightedScore: 24, // (80/100) * 30
      },
      {
        criteriaId: 'crit-2',
        criteriaName: 'Safety',
        weight: 20,
        maxScore: 100,
        actualScore: 90,
        weightedScore: 18, // (90/100) * 20
      },
    ]

    // Act
    const technicalScore = calculateTechnicalScore(scores)

    // Assert
    // (24 + 18) / (30 + 20) * 100 = 84
    expect(technicalScore).toBe(84)
  })

  it('should return 0 for empty scores', () => {
    // Arrange
    const scores: EvaluationScore[] = []

    // Act
    const technicalScore = calculateTechnicalScore(scores)

    // Assert
    expect(technicalScore).toBe(0)
  })

  it('should return 0 when total weight is 0', () => {
    // Arrange
    const scores: EvaluationScore[] = [
      {
        criteriaId: 'crit-1',
        criteriaName: 'Test',
        weight: 0,
        maxScore: 100,
        actualScore: 100,
        weightedScore: 0,
      },
    ]

    // Act
    const technicalScore = calculateTechnicalScore(scores)

    // Assert
    expect(technicalScore).toBe(0)
  })

  it('should handle perfect score', () => {
    // Arrange
    const scores: EvaluationScore[] = [
      {
        criteriaId: 'crit-1',
        criteriaName: 'Test',
        weight: 50,
        maxScore: 100,
        actualScore: 100,
        weightedScore: 50,
      },
      {
        criteriaId: 'crit-2',
        criteriaName: 'Test2',
        weight: 50,
        maxScore: 100,
        actualScore: 100,
        weightedScore: 50,
      },
    ]

    // Act
    const technicalScore = calculateTechnicalScore(scores)

    // Assert
    expect(technicalScore).toBe(100)
  })
})

// ============================================================================
// Qualification Tests
// ============================================================================

describe('checkQualifications', () => {
  it('should pass all checks for qualified bid', () => {
    // Arrange
    const submission = createMockBid({
      years_in_business: 15,
      similar_projects_completed: 10,
      bid_bond_included: true,
      insurance_cert_included: true,
      current_workload_percent: 70,
      is_late: false,
    })
    const requirements = {
      minYearsExperience: 10,
      minSimilarProjects: 5,
      requiresBidBond: true,
      requiresInsurance: true,
      maxCurrentWorkload: 85,
    }

    // Act
    const result = checkQualifications(submission, requirements)

    // Assert
    expect(result.isPassed).toBe(true)
    expect(result.failedChecks).toHaveLength(0)
    expect(result.recommendation).toBe('qualified')
  })

  it('should fail years of experience check', () => {
    // Arrange
    const submission = createMockBid({
      years_in_business: 5,
      similar_projects_completed: 10,
    })
    const requirements = {
      minYearsExperience: 10,
    }

    // Act
    const result = checkQualifications(submission, requirements)

    // Assert
    expect(result.isPassed).toBe(false)
    expect(result.failedChecks).toContain('Insufficient years in business')
    expect(result.recommendation).toBe('conditional')
  })

  it('should fail similar projects check', () => {
    // Arrange
    const submission = createMockBid({
      years_in_business: 15,
      similar_projects_completed: 2,
    })
    const requirements = {
      minSimilarProjects: 5,
    }

    // Act
    const result = checkQualifications(submission, requirements)

    // Assert
    expect(result.isPassed).toBe(false)
    expect(result.failedChecks).toContain('Insufficient similar project experience')
  })

  it('should disqualify for missing bid bond', () => {
    // Arrange
    const submission = createMockBid({
      bid_bond_included: false,
    })
    const requirements = {
      requiresBidBond: true,
    }

    // Act
    const result = checkQualifications(submission, requirements)

    // Assert
    expect(result.isPassed).toBe(false)
    expect(result.failedChecks).toContain('Bid bond not included')
    expect(result.recommendation).toBe('disqualified')
  })

  it('should disqualify for late submission', () => {
    // Arrange
    const submission = createMockBid({
      is_late: true,
    })
    const requirements = {}

    // Act
    const result = checkQualifications(submission, requirements)

    // Assert
    expect(result.isPassed).toBe(false)
    expect(result.failedChecks).toContain('Late submission')
    expect(result.recommendation).toBe('disqualified')
  })

  it('should fail workload check', () => {
    // Arrange
    const submission = createMockBid({
      current_workload_percent: 95,
    })
    const requirements = {
      maxCurrentWorkload: 85,
    }

    // Act
    const result = checkQualifications(submission, requirements)

    // Assert
    expect(result.isPassed).toBe(false)
    expect(result.failedChecks).toContain('Current workload too high')
  })

  it('should pass with no requirements', () => {
    // Arrange
    const submission = createMockBid()
    const requirements = {}

    // Act
    const result = checkQualifications(submission, requirements)

    // Assert
    expect(result.isPassed).toBe(true)
    expect(result.recommendation).toBe('qualified')
  })
})

describe('calculateQualificationScore', () => {
  it('should return max score for all passed checks', () => {
    // Arrange
    const qualCheck: QualificationCheckResult = {
      isPassed: true,
      failedChecks: [],
      passedChecks: ['Check 1', 'Check 2', 'Check 3'],
      recommendation: 'qualified',
      notes: [],
    }

    // Act
    const score = calculateQualificationScore(qualCheck, 100)

    // Assert
    expect(score).toBe(100)
  })

  it('should calculate proportional score', () => {
    // Arrange
    const qualCheck: QualificationCheckResult = {
      isPassed: false,
      failedChecks: ['Check 3'],
      passedChecks: ['Check 1', 'Check 2'],
      recommendation: 'conditional',
      notes: [],
    }

    // Act
    const score = calculateQualificationScore(qualCheck, 100)

    // Assert
    expect(score).toBeCloseTo(66.67, 2) // 2 out of 3 passed
  })

  it('should return 0 for all failed checks', () => {
    // Arrange
    const qualCheck: QualificationCheckResult = {
      isPassed: false,
      failedChecks: ['Check 1', 'Check 2', 'Check 3'],
      passedChecks: [],
      recommendation: 'disqualified',
      notes: [],
    }

    // Act
    const score = calculateQualificationScore(qualCheck, 100)

    // Assert
    expect(score).toBe(0)
  })

  it('should return max score when no checks', () => {
    // Arrange
    const qualCheck: QualificationCheckResult = {
      isPassed: true,
      failedChecks: [],
      passedChecks: [],
      recommendation: 'qualified',
      notes: [],
    }

    // Act
    const score = calculateQualificationScore(qualCheck, 100)

    // Assert
    expect(score).toBe(100) // No requirements = full score
  })
})

// ============================================================================
// Overall Evaluation Tests
// ============================================================================

describe('calculateOverallScore', () => {
  it('should calculate weighted overall score', () => {
    // Arrange
    const priceScore = 90
    const technicalScore = 80
    const qualificationScore = 85
    const weights: ScoringWeights = {
      price: 0.5,
      technical: 0.3,
      qualification: 0.2,
    }

    // Act
    const overall = calculateOverallScore(priceScore, technicalScore, qualificationScore, weights)

    // Assert
    // (90 * 0.5) + (80 * 0.3) + (85 * 0.2) = 45 + 24 + 17 = 86
    expect(overall).toBe(86)
  })

  it('should use default weights', () => {
    // Arrange
    const priceScore = 100
    const technicalScore = 80
    const qualificationScore = 90

    // Act
    const overall = calculateOverallScore(priceScore, technicalScore, qualificationScore)

    // Assert
    expect(overall).toBeGreaterThan(0)
    expect(overall).toBeLessThanOrEqual(100)
  })

  it('should handle perfect scores', () => {
    // Arrange
    const priceScore = 100
    const technicalScore = 100
    const qualificationScore = 100

    // Act
    const overall = calculateOverallScore(priceScore, technicalScore, qualificationScore)

    // Assert
    expect(overall).toBe(100)
  })

  it('should handle zero scores', () => {
    // Arrange
    const priceScore = 0
    const technicalScore = 0
    const qualificationScore = 0

    // Act
    const overall = calculateOverallScore(priceScore, technicalScore, qualificationScore)

    // Assert
    expect(overall).toBe(0)
  })

  it('should handle custom weights', () => {
    // Arrange
    const priceScore = 100
    const technicalScore = 50
    const qualificationScore = 50
    const weights: ScoringWeights = {
      price: 0.8,
      technical: 0.1,
      qualification: 0.1,
    }

    // Act
    const overall = calculateOverallScore(priceScore, technicalScore, qualificationScore, weights)

    // Assert
    // (100 * 0.8) + (50 * 0.1) + (50 * 0.1) = 80 + 5 + 5 = 90
    expect(overall).toBe(90)
  })
})

describe('evaluateBid', () => {
  it('should recommend award for excellent bid', () => {
    // Arrange
    const submission = createMockBid({ bidder_company_name: 'Excellent Contractor' })
    const priceScore = 95
    const technicalScores: EvaluationScore[] = [
      {
        criteriaId: 'crit-1',
        criteriaName: 'Approach',
        weight: 50,
        maxScore: 100,
        actualScore: 95,
        weightedScore: 47.5,
      },
      {
        criteriaId: 'crit-2',
        criteriaName: 'Safety',
        weight: 50,
        maxScore: 100,
        actualScore: 90,
        weightedScore: 45,
      },
    ]
    const qualCheck: QualificationCheckResult = {
      isPassed: true,
      failedChecks: [],
      passedChecks: ['All checks'],
      recommendation: 'qualified',
      notes: [],
    }

    // Act
    const result = evaluateBid(submission, priceScore, technicalScores, qualCheck)

    // Assert
    expect(result.overallScore).toBeGreaterThanOrEqual(90)
    expect(result.recommendation).toBe('award')
    expect(result.strengths.length).toBeGreaterThan(0)
  })

  it('should recommend rejection for disqualified bid', () => {
    // Arrange
    const submission = createMockBid({ is_late: true })
    const priceScore = 100
    const technicalScores: EvaluationScore[] = []
    const qualCheck: QualificationCheckResult = {
      isPassed: false,
      failedChecks: ['Late submission'],
      passedChecks: [],
      recommendation: 'disqualified',
      notes: [],
    }

    // Act
    const result = evaluateBid(submission, priceScore, technicalScores, qualCheck)

    // Assert
    expect(result.recommendation).toBe('reject')
    expect(result.recommendationReason).toContain('Failed qualification')
  })

  it('should recommend shortlist for good bid', () => {
    // Arrange
    const submission = createMockBid()
    const priceScore = 85
    const technicalScores: EvaluationScore[] = [
      {
        criteriaId: 'crit-1',
        criteriaName: 'Test',
        weight: 100,
        maxScore: 100,
        actualScore: 75,
        weightedScore: 75,
      },
    ]
    const qualCheck: QualificationCheckResult = {
      isPassed: true,
      failedChecks: [],
      passedChecks: ['All'],
      recommendation: 'qualified',
      notes: [],
    }

    // Act
    const result = evaluateBid(submission, priceScore, technicalScores, qualCheck)

    // Assert
    expect(result.overallScore).toBeGreaterThanOrEqual(75)
    expect(result.overallScore).toBeLessThan(90)
    expect(result.recommendation).toBe('shortlist')
  })

  it('should identify strengths and weaknesses', () => {
    // Arrange
    const submission = createMockBid()
    const priceScore = 95 // Excellent price
    const technicalScores: EvaluationScore[] = [
      {
        criteriaId: 'crit-1',
        criteriaName: 'Strong Area',
        weight: 50,
        maxScore: 100,
        actualScore: 95,
        weightedScore: 47.5,
      },
      {
        criteriaId: 'crit-2',
        criteriaName: 'Weak Area',
        weight: 50,
        maxScore: 100,
        actualScore: 50,
        weightedScore: 25,
      },
    ]
    const qualCheck: QualificationCheckResult = {
      isPassed: true,
      failedChecks: [],
      passedChecks: ['All'],
      recommendation: 'qualified',
      notes: [],
    }

    // Act
    const result = evaluateBid(submission, priceScore, technicalScores, qualCheck)

    // Assert
    expect(result.strengths).toContain('Highly competitive pricing')
    expect(result.strengths).toContain('Excellent strong area')
    expect(result.weaknesses).toContain('Weak weak area')
  })
})

describe('evaluateAndRankBids', () => {
  it('should evaluate and rank multiple bids', () => {
    // Arrange
    const submissions = [
      createMockBid({ id: 'bid-1', bidder_company_name: 'Contractor A' }),
      createMockBid({ id: 'bid-2', bidder_company_name: 'Contractor B' }),
      createMockBid({ id: 'bid-3', bidder_company_name: 'Contractor C' }),
    ]

    const evaluations = new Map([
      [
        'bid-1',
        {
          priceScore: 100,
          technicalScores: [
            {
              criteriaId: 'crit-1',
              criteriaName: 'Test',
              weight: 100,
              maxScore: 100,
              actualScore: 90,
              weightedScore: 90,
            },
          ],
          qualificationCheck: {
            isPassed: true,
            failedChecks: [],
            passedChecks: ['All'],
            recommendation: 'qualified' as const,
            notes: [],
          },
        },
      ],
      [
        'bid-2',
        {
          priceScore: 90,
          technicalScores: [
            {
              criteriaId: 'crit-1',
              criteriaName: 'Test',
              weight: 100,
              maxScore: 100,
              actualScore: 85,
              weightedScore: 85,
            },
          ],
          qualificationCheck: {
            isPassed: true,
            failedChecks: [],
            passedChecks: ['All'],
            recommendation: 'qualified' as const,
            notes: [],
          },
        },
      ],
      [
        'bid-3',
        {
          priceScore: 80,
          technicalScores: [
            {
              criteriaId: 'crit-1',
              criteriaName: 'Test',
              weight: 100,
              maxScore: 100,
              actualScore: 95,
              weightedScore: 95,
            },
          ],
          qualificationCheck: {
            isPassed: true,
            failedChecks: [],
            passedChecks: ['All'],
            recommendation: 'qualified' as const,
            notes: [],
          },
        },
      ],
    ])

    // Act
    const results = evaluateAndRankBids(submissions, evaluations)

    // Assert
    expect(results).toHaveLength(3)
    expect(results[0].rank).toBe(1)
    expect(results[1].rank).toBe(2)
    expect(results[2].rank).toBe(3)
    expect(results[0].overallScore).toBeGreaterThanOrEqual(results[1].overallScore)
    expect(results[1].overallScore).toBeGreaterThanOrEqual(results[2].overallScore)
  })
})

// ============================================================================
// Tie Breaking Tests
// ============================================================================

describe('breakTie', () => {
  it('should break tie by price', () => {
    // Arrange
    const bid1 = {
      submissionId: 'bid-1',
      bidderName: 'A',
      priceScore: 95,
      technicalScore: 80,
      qualificationScore: 85,
      overallScore: 87,
      scores: [],
      recommendation: 'award' as const,
      recommendationReason: '',
      strengths: [],
      weaknesses: [],
    }
    const bid2 = {
      submissionId: 'bid-2',
      bidderName: 'B',
      priceScore: 90,
      technicalScore: 80,
      qualificationScore: 85,
      overallScore: 87,
      scores: [],
      recommendation: 'award' as const,
      recommendationReason: '',
      strengths: [],
      weaknesses: [],
    }

    // Act
    const winner = breakTie(bid1, bid2)

    // Assert
    expect(winner.submissionId).toBe('bid-1') // Higher price score
  })

  it('should break tie by technical when price tied', () => {
    // Arrange
    const bid1 = {
      submissionId: 'bid-1',
      bidderName: 'A',
      priceScore: 90,
      technicalScore: 85,
      qualificationScore: 85,
      overallScore: 87,
      scores: [],
      recommendation: 'award' as const,
      recommendationReason: '',
      strengths: [],
      weaknesses: [],
    }
    const bid2 = {
      submissionId: 'bid-2',
      bidderName: 'B',
      priceScore: 90,
      technicalScore: 80,
      qualificationScore: 85,
      overallScore: 87,
      scores: [],
      recommendation: 'award' as const,
      recommendationReason: '',
      strengths: [],
      weaknesses: [],
    }

    // Act
    const winner = breakTie(bid1, bid2)

    // Assert
    expect(winner.submissionId).toBe('bid-1') // Higher technical score
  })

  it('should use custom priority order', () => {
    // Arrange
    const bid1 = {
      submissionId: 'bid-1',
      bidderName: 'A',
      priceScore: 90,
      technicalScore: 80,
      qualificationScore: 95,
      overallScore: 87,
      scores: [],
      recommendation: 'award' as const,
      recommendationReason: '',
      strengths: [],
      weaknesses: [],
    }
    const bid2 = {
      submissionId: 'bid-2',
      bidderName: 'B',
      priceScore: 95,
      technicalScore: 85,
      qualificationScore: 90,
      overallScore: 87,
      scores: [],
      recommendation: 'award' as const,
      recommendationReason: '',
      strengths: [],
      weaknesses: [],
    }

    // Act - Qualification first
    const winner = breakTie(bid1, bid2, ['qualification', 'price', 'technical'])

    // Assert
    expect(winner.submissionId).toBe('bid-1') // Higher qualification score
  })
})

describe('resolveTies', () => {
  it('should resolve ties in results', () => {
    // Arrange
    const results = [
      {
        submissionId: 'bid-1',
        bidderName: 'A',
        priceScore: 95,
        technicalScore: 80,
        qualificationScore: 85,
        overallScore: 87.5,
        scores: [],
        recommendation: 'award' as const,
        recommendationReason: '',
        strengths: [],
        weaknesses: [],
        rank: 1,
      },
      {
        submissionId: 'bid-2',
        bidderName: 'B',
        priceScore: 90,
        technicalScore: 85,
        qualificationScore: 85,
        overallScore: 87.5,
        scores: [],
        recommendation: 'award' as const,
        recommendationReason: '',
        strengths: [],
        weaknesses: [],
        rank: 2,
      },
      {
        submissionId: 'bid-3',
        bidderName: 'C',
        priceScore: 80,
        technicalScore: 90,
        qualificationScore: 80,
        overallScore: 85,
        scores: [],
        recommendation: 'shortlist' as const,
        recommendationReason: '',
        strengths: [],
        weaknesses: [],
        rank: 3,
      },
    ]

    // Act
    const resolved = resolveTies(results)

    // Assert
    expect(resolved).toHaveLength(3)
    expect(resolved[0].rank).toBe(1)
    expect(resolved[1].rank).toBe(2)
    expect(resolved[2].rank).toBe(3)
  })
})

// ============================================================================
// Recommendation Logic Tests
// ============================================================================

describe('generateRecommendation', () => {
  it('should recommend top ranked qualified bid', () => {
    // Arrange
    const evaluations = [
      {
        submissionId: 'bid-1',
        bidderName: 'Top Contractor',
        priceScore: 95,
        technicalScore: 90,
        qualificationScore: 95,
        overallScore: 93,
        scores: [],
        recommendation: 'award' as const,
        recommendationReason: 'Excellent',
        strengths: ['Great price', 'Strong technical'],
        weaknesses: [],
      },
      {
        submissionId: 'bid-2',
        bidderName: 'Second Contractor',
        priceScore: 90,
        technicalScore: 85,
        qualificationScore: 90,
        overallScore: 88,
        scores: [],
        recommendation: 'shortlist' as const,
        recommendationReason: 'Good',
        strengths: ['Good price'],
        weaknesses: [],
      },
    ]

    // Act
    const recommendation = generateRecommendation(evaluations)

    // Assert
    expect(recommendation.recommendedBidId).toBe('bid-1')
    expect(recommendation.alternativeBidIds).toContain('bid-2')
    expect(recommendation.reasoning).toContain('Top Contractor')
  })

  it('should handle no qualified bids', () => {
    // Arrange
    const evaluations = [
      {
        submissionId: 'bid-1',
        bidderName: 'Disqualified',
        priceScore: 100,
        technicalScore: 100,
        qualificationScore: 0,
        overallScore: 60,
        scores: [],
        recommendation: 'reject' as const,
        recommendationReason: 'Not qualified',
        strengths: [],
        weaknesses: [],
      },
    ]

    // Act
    const recommendation = generateRecommendation(evaluations)

    // Assert
    expect(recommendation.recommendedBidId).toBeNull()
    expect(recommendation.concerns.length).toBeGreaterThan(0)
  })

  it('should note when low price differs from recommendation', () => {
    // Arrange
    const evaluations = [
      {
        submissionId: 'bid-1',
        bidderName: 'Best Overall',
        priceScore: 80,
        technicalScore: 95,
        qualificationScore: 95,
        overallScore: 88,
        scores: [],
        recommendation: 'award' as const,
        recommendationReason: 'Best overall',
        strengths: ['Strong technical'],
        weaknesses: [],
      },
      {
        submissionId: 'bid-2',
        bidderName: 'Low Price',
        priceScore: 100,
        technicalScore: 60,
        qualificationScore: 70,
        overallScore: 80,
        scores: [],
        recommendation: 'review' as const,
        recommendationReason: 'Needs review',
        strengths: ['Low price'],
        weaknesses: ['Weak technical'],
      },
    ]

    // Act
    const recommendation = generateRecommendation(evaluations)

    // Assert
    expect(recommendation.recommendedBidId).toBe('bid-1')
    expect(recommendation.concerns.some(c => c.includes('lowest price'))).toBe(true)
  })

  it('should note close competition', () => {
    // Arrange
    const evaluations = [
      {
        submissionId: 'bid-1',
        bidderName: 'A',
        priceScore: 90,
        technicalScore: 90,
        qualificationScore: 90,
        overallScore: 90,
        scores: [],
        recommendation: 'award' as const,
        recommendationReason: '',
        strengths: [],
        weaknesses: [],
      },
      {
        submissionId: 'bid-2',
        bidderName: 'B',
        priceScore: 88,
        technicalScore: 89,
        qualificationScore: 89,
        overallScore: 88.5,
        scores: [],
        recommendation: 'shortlist' as const,
        recommendationReason: '',
        strengths: [],
        weaknesses: [],
      },
    ]

    // Act
    const recommendation = generateRecommendation(evaluations)

    // Assert
    expect(recommendation.concerns.some(c => c.includes('Close competition'))).toBe(true)
  })
})

// ============================================================================
// Real-World Construction Scenarios
// ============================================================================

describe('Real-World Evaluation Scenarios', () => {
  it('should evaluate electrical subcontractor bids', () => {
    // Arrange
    const submissions = [
      createMockBid({
        id: 'elec-1',
        bidder_company_name: 'Premium Electric',
        base_bid_amount: 550000,
        years_in_business: 25,
        similar_projects_completed: 15,
      }),
      createMockBid({
        id: 'elec-2',
        bidder_company_name: 'Budget Electric',
        base_bid_amount: 485000,
        years_in_business: 8,
        similar_projects_completed: 4,
      }),
      createMockBid({
        id: 'elec-3',
        bidder_company_name: 'Quality Electric',
        base_bid_amount: 520000,
        years_in_business: 18,
        similar_projects_completed: 12,
      }),
    ]

    const lowBid = 485000
    const evaluations = new Map([
      [
        'elec-1',
        {
          priceScore: calculatePriceScore(550000, lowBid),
          technicalScores: [
            {
              criteriaId: 'crit-1',
              criteriaName: 'Experience',
              weight: 100,
              maxScore: 100,
              actualScore: 95,
              weightedScore: 95,
            },
          ],
          qualificationCheck: checkQualifications(submissions[0], {
            minYearsExperience: 10,
            minSimilarProjects: 5,
            requiresBidBond: true,
          }),
        },
      ],
      [
        'elec-2',
        {
          priceScore: calculatePriceScore(485000, lowBid),
          technicalScores: [
            {
              criteriaId: 'crit-1',
              criteriaName: 'Experience',
              weight: 100,
              maxScore: 100,
              actualScore: 65,
              weightedScore: 65,
            },
          ],
          qualificationCheck: checkQualifications(submissions[1], {
            minYearsExperience: 10,
            minSimilarProjects: 5,
            requiresBidBond: true,
          }),
        },
      ],
      [
        'elec-3',
        {
          priceScore: calculatePriceScore(520000, lowBid),
          technicalScores: [
            {
              criteriaId: 'crit-1',
              criteriaName: 'Experience',
              weight: 100,
              maxScore: 100,
              actualScore: 88,
              weightedScore: 88,
            },
          ],
          qualificationCheck: checkQualifications(submissions[2], {
            minYearsExperience: 10,
            minSimilarProjects: 5,
            requiresBidBond: true,
          }),
        },
      ],
    ])

    // Act
    const results = evaluateAndRankBids(submissions, evaluations)
    const recommendation = generateRecommendation(results)

    // Assert
    expect(results).toHaveLength(3)
    expect(recommendation.recommendedBidId).toBeDefined()
    // Budget Electric (elec-2) fails qualification but has best price
    // Should recommend qualified bidder with best overall score
  })

  it('should handle cost-plus bid evaluation', () => {
    // Arrange - Cost-plus bids focus more on qualifications and methodology
    const submission = createMockBid({
      bidder_company_name: 'Cost-Plus Contractor',
      base_bid_amount: 0, // Cost-plus doesn't have base bid
      years_in_business: 20,
      similar_projects_completed: 10,
    })

    const weights: ScoringWeights = {
      price: 0.2, // Less emphasis on price for cost-plus
      technical: 0.5,
      qualification: 0.3,
    }

    const technicalScores: EvaluationScore[] = [
      {
        criteriaId: 'crit-1',
        criteriaName: 'Cost Control Approach',
        weight: 40,
        maxScore: 100,
        actualScore: 90,
        weightedScore: 36,
      },
      {
        criteriaId: 'crit-2',
        criteriaName: 'Transparency and Reporting',
        weight: 60,
        maxScore: 100,
        actualScore: 85,
        weightedScore: 51,
      },
    ]

    const qualCheck = checkQualifications(submission, {
      minYearsExperience: 15,
      minSimilarProjects: 8,
    })

    // Act
    const result = evaluateBid(submission, 80, technicalScores, qualCheck, weights)

    // Assert
    expect(result.overallScore).toBeGreaterThan(0)
    expect(result.recommendation).not.toBe('reject')
  })
})
