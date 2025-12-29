/**
 * Bid Evaluation Utilities
 * Scoring, qualification, and recommendation logic for bids
 */

import type { BidSubmission, BidEvaluationCriteria } from '@/types/bidding'

// ============================================================================
// Types
// ============================================================================

export interface EvaluationScore {
  criteriaId: string
  criteriaName: string
  weight: number
  maxScore: number
  actualScore: number
  weightedScore: number
  notes?: string
}

export interface BidEvaluationResult {
  submissionId: string
  bidderName: string
  priceScore: number
  technicalScore: number
  qualificationScore: number
  overallScore: number
  scores: EvaluationScore[]
  recommendation: 'award' | 'shortlist' | 'review' | 'reject'
  recommendationReason: string
  strengths: string[]
  weaknesses: string[]
  rank?: number
}

export interface QualificationCheckResult {
  isPassed: boolean
  failedChecks: string[]
  passedChecks: string[]
  recommendation: 'qualified' | 'conditional' | 'disqualified'
  notes: string[]
}

export interface ScoringWeights {
  price: number
  technical: number
  qualification: number
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  price: 0.5,
  technical: 0.3,
  qualification: 0.2,
}

// ============================================================================
// Price Scoring
// ============================================================================

/**
 * Calculate price score using inverse linear method
 * Low bid gets max score, high bid gets proportionally lower score
 */
export function calculatePriceScore(
  bidAmount: number,
  lowBid: number,
  maxScore: number = 100
): number {
  if (lowBid === 0 || bidAmount === 0) {return 0}
  if (bidAmount === lowBid) {return maxScore}

  // Inverse linear: Score = MaxScore * (LowBid / BidAmount)
  const score = maxScore * (lowBid / bidAmount)
  return Math.min(Math.max(score, 0), maxScore)
}

/**
 * Calculate price score using threshold method
 * Bids within threshold get full points, beyond threshold get reduced points
 */
export function calculatePriceScoreWithThreshold(
  bidAmount: number,
  lowBid: number,
  threshold: number = 10,
  maxScore: number = 100
): number {
  if (lowBid === 0 || bidAmount === 0) {return 0}
  if (bidAmount === lowBid) {return maxScore}

  const percentAboveLow = ((bidAmount - lowBid) / lowBid) * 100

  if (percentAboveLow <= threshold) {
    return maxScore
  }

  // Reduce score proportionally beyond threshold
  const excessPercent = percentAboveLow - threshold
  const reductionFactor = Math.min(excessPercent / threshold, 1)
  const score = maxScore * (1 - (reductionFactor * 0.5))

  return Math.min(Math.max(score, 0), maxScore)
}

/**
 * Calculate price score using best value method
 * Considers distance from average, not just low bid
 */
export function calculatePriceScoreBestValue(
  bidAmount: number,
  averageBid: number,
  lowBid: number,
  maxScore: number = 100
): number {
  if (averageBid === 0) {return 0}

  // Best score at average or below
  if (bidAmount <= averageBid) {
    return maxScore
  }

  // Score decreases above average
  const percentAboveAverage = ((bidAmount - averageBid) / averageBid) * 100
  const reductionFactor = Math.min(percentAboveAverage / 20, 1) // 20% above average = 0 points
  const score = maxScore * (1 - reductionFactor)

  return Math.min(Math.max(score, 0), maxScore)
}

// ============================================================================
// Technical Scoring
// ============================================================================

/**
 * Calculate technical score based on criteria evaluation
 */
export function calculateTechnicalScore(
  scores: EvaluationScore[]
): number {
  if (scores.length === 0) {return 0}

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0)
  if (totalWeight === 0) {return 0}

  const weightedSum = scores.reduce((sum, s) => sum + s.weightedScore, 0)
  return (weightedSum / totalWeight) * 100
}

/**
 * Score individual criterion
 */
export function scoreCriterion(
  actualScore: number,
  maxScore: number,
  weight: number
): number {
  const normalizedScore = Math.min(Math.max(actualScore, 0), maxScore)
  return (normalizedScore / maxScore) * weight
}

/**
 * Create evaluation scores from criteria
 */
export function evaluateCriteria(
  criteria: BidEvaluationCriteria[],
  scores: Record<string, { score: number; notes?: string }>
): EvaluationScore[] {
  return criteria.map(criterion => {
    const evaluation = scores[criterion.id] || { score: 0 }
    const actualScore = Math.min(Math.max(evaluation.score, 0), criterion.max_score)
    const weightedScore = scoreCriterion(actualScore, criterion.max_score, criterion.weight)

    return {
      criteriaId: criterion.id,
      criteriaName: criterion.name,
      weight: criterion.weight,
      maxScore: criterion.max_score,
      actualScore,
      weightedScore,
      notes: evaluation.notes,
    }
  })
}

// ============================================================================
// Qualification Scoring
// ============================================================================

/**
 * Check if bid meets minimum qualification requirements
 */
export function checkQualifications(
  submission: BidSubmission,
  requirements: {
    minYearsExperience?: number
    minSimilarProjects?: number
    requiresBidBond?: boolean
    requiresInsurance?: boolean
    maxCurrentWorkload?: number
  }
): QualificationCheckResult {
  const failedChecks: string[] = []
  const passedChecks: string[] = []
  const notes: string[] = []

  // Years of experience check
  if (requirements.minYearsExperience) {
    if (!submission.years_in_business || submission.years_in_business < requirements.minYearsExperience) {
      failedChecks.push('Insufficient years in business')
      notes.push(
        `Requires ${requirements.minYearsExperience} years, has ${submission.years_in_business || 0}`
      )
    } else {
      passedChecks.push('Years of experience requirement met')
    }
  }

  // Similar projects check
  if (requirements.minSimilarProjects) {
    if (
      !submission.similar_projects_completed ||
      submission.similar_projects_completed < requirements.minSimilarProjects
    ) {
      failedChecks.push('Insufficient similar project experience')
      notes.push(
        `Requires ${requirements.minSimilarProjects} projects, has ${submission.similar_projects_completed || 0}`
      )
    } else {
      passedChecks.push('Similar project requirement met')
    }
  }

  // Bid bond check
  if (requirements.requiresBidBond) {
    if (!submission.bid_bond_included) {
      failedChecks.push('Bid bond not included')
    } else {
      passedChecks.push('Bid bond included')
    }
  }

  // Insurance certificate check
  if (requirements.requiresInsurance) {
    if (!submission.insurance_cert_included) {
      failedChecks.push('Insurance certificate not included')
    } else {
      passedChecks.push('Insurance certificate included')
    }
  }

  // Current workload check
  if (requirements.maxCurrentWorkload) {
    if (
      submission.current_workload_percent &&
      submission.current_workload_percent > requirements.maxCurrentWorkload
    ) {
      failedChecks.push('Current workload too high')
      notes.push(
        `Workload at ${submission.current_workload_percent}%, max allowed ${requirements.maxCurrentWorkload}%`
      )
    } else {
      passedChecks.push('Current workload acceptable')
    }
  }

  // Late submission check
  if (submission.is_late) {
    failedChecks.push('Late submission')
    notes.push('Bid submitted after deadline')
  } else {
    passedChecks.push('Submitted on time')
  }

  // Determine recommendation
  let recommendation: 'qualified' | 'conditional' | 'disqualified'
  if (failedChecks.length === 0) {
    recommendation = 'qualified'
  } else if (failedChecks.includes('Bid bond not included') || failedChecks.includes('Late submission')) {
    recommendation = 'disqualified'
  } else {
    recommendation = 'conditional'
  }

  return {
    isPassed: failedChecks.length === 0,
    failedChecks,
    passedChecks,
    recommendation,
    notes,
  }
}

/**
 * Calculate qualification score from qualification check
 */
export function calculateQualificationScore(
  qualificationCheck: QualificationCheckResult,
  maxScore: number = 100
): number {
  const totalChecks = qualificationCheck.passedChecks.length + qualificationCheck.failedChecks.length
  if (totalChecks === 0) {return maxScore} // No requirements means full score

  const passRate = qualificationCheck.passedChecks.length / totalChecks
  return passRate * maxScore
}

// ============================================================================
// Overall Evaluation
// ============================================================================

/**
 * Calculate overall bid score
 */
export function calculateOverallScore(
  priceScore: number,
  technicalScore: number,
  qualificationScore: number,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  const totalWeight = weights.price + weights.technical + weights.qualification
  if (totalWeight === 0) {return 0}

  const weightedSum =
    (priceScore * weights.price) +
    (technicalScore * weights.technical) +
    (qualificationScore * weights.qualification)

  return (weightedSum / totalWeight)
}

/**
 * Evaluate a single bid
 */
export function evaluateBid(
  submission: BidSubmission,
  priceScore: number,
  technicalScores: EvaluationScore[],
  qualificationCheck: QualificationCheckResult,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): BidEvaluationResult {
  const technicalScore = calculateTechnicalScore(technicalScores)
  const qualificationScore = calculateQualificationScore(qualificationCheck)
  const overallScore = calculateOverallScore(priceScore, technicalScore, qualificationScore, weights)

  // Determine recommendation
  let recommendation: 'award' | 'shortlist' | 'review' | 'reject'
  let recommendationReason = ''

  if (!qualificationCheck.isPassed) {
    recommendation = 'reject'
    recommendationReason = `Failed qualification: ${qualificationCheck.failedChecks.join(', ')}`
  } else if (overallScore >= 90) {
    recommendation = 'award'
    recommendationReason = 'Excellent score across all criteria'
  } else if (overallScore >= 75) {
    recommendation = 'shortlist'
    recommendationReason = 'Strong candidate for award'
  } else if (overallScore >= 60) {
    recommendation = 'review'
    recommendationReason = 'Requires further review and clarification'
  } else {
    recommendation = 'reject'
    recommendationReason = 'Score below acceptable threshold'
  }

  // Identify strengths and weaknesses
  const strengths: string[] = []
  const weaknesses: string[] = []

  if (priceScore >= 90) {strengths.push('Highly competitive pricing')}
  else if (priceScore < 70) {weaknesses.push('Price significantly higher than competitors')}

  if (technicalScore >= 80) {strengths.push('Strong technical capability')}
  else if (technicalScore < 60) {weaknesses.push('Technical approach needs improvement')}

  if (qualificationScore >= 90) {strengths.push('Well qualified with strong experience')}
  else if (qualificationScore < 70) {weaknesses.push('Limited qualifications or experience')}

  // Add criterion-specific strengths/weaknesses
  technicalScores.forEach(score => {
    const percentScore = (score.actualScore / score.maxScore) * 100
    if (percentScore >= 90) {
      strengths.push(`Excellent ${score.criteriaName.toLowerCase()}`)
    } else if (percentScore < 60) {
      weaknesses.push(`Weak ${score.criteriaName.toLowerCase()}`)
    }
  })

  return {
    submissionId: submission.id,
    bidderName: submission.bidder_company_name,
    priceScore,
    technicalScore,
    qualificationScore,
    overallScore,
    scores: technicalScores,
    recommendation,
    recommendationReason,
    strengths,
    weaknesses,
  }
}

/**
 * Evaluate and rank multiple bids
 */
export function evaluateAndRankBids(
  submissions: BidSubmission[],
  evaluations: Map<string, {
    priceScore: number
    technicalScores: EvaluationScore[]
    qualificationCheck: QualificationCheckResult
  }>,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): BidEvaluationResult[] {
  const results = submissions.map(submission => {
    const evaluation = evaluations.get(submission.id)
    if (!evaluation) {
      throw new Error(`Missing evaluation for submission ${submission.id}`)
    }

    return evaluateBid(
      submission,
      evaluation.priceScore,
      evaluation.technicalScores,
      evaluation.qualificationCheck,
      weights
    )
  })

  // Sort by overall score descending and assign ranks
  const sorted = results.sort((a, b) => b.overallScore - a.overallScore)
  return sorted.map((result, index) => ({
    ...result,
    rank: index + 1,
  }))
}

// ============================================================================
// Tie Breaking
// ============================================================================

/**
 * Break ties between bids with equal overall scores
 */
export function breakTie(
  bid1: BidEvaluationResult,
  bid2: BidEvaluationResult,
  tieBreakPriority: ('price' | 'technical' | 'qualification')[] = ['price', 'technical', 'qualification']
): BidEvaluationResult {
  for (const criterion of tieBreakPriority) {
    let score1 = 0
    let score2 = 0

    switch (criterion) {
      case 'price':
        score1 = bid1.priceScore
        score2 = bid2.priceScore
        break
      case 'technical':
        score1 = bid1.technicalScore
        score2 = bid2.technicalScore
        break
      case 'qualification':
        score1 = bid1.qualificationScore
        score2 = bid2.qualificationScore
        break
    }

    if (score1 > score2) {return bid1}
    if (score2 > score1) {return bid2}
  }

  // If still tied, return bid1 (arbitrary)
  return bid1
}

/**
 * Resolve all ties in evaluation results
 */
export function resolveTies(
  results: BidEvaluationResult[],
  tieBreakPriority?: ('price' | 'technical' | 'qualification')[]
): BidEvaluationResult[] {
  // Group by overall score
  const scoreGroups = new Map<number, BidEvaluationResult[]>()
  results.forEach(result => {
    const score = Math.round(result.overallScore * 100) / 100 // Round to 2 decimals
    const group = scoreGroups.get(score) || []
    group.push(result)
    scoreGroups.set(score, group)
  })

  // For each group with ties, break them
  scoreGroups.forEach((group, _score) => {
    if (group.length > 1) {
      // Sort group using tie-breaking logic
      group.sort((a, b) => {
        const winner = breakTie(a, b, tieBreakPriority)
        return winner === a ? -1 : 1
      })
    }
  })

  // Re-rank all results
  const allResolved = Array.from(scoreGroups.values()).flat()
  return allResolved.map((result, index) => ({
    ...result,
    rank: index + 1,
  }))
}

// ============================================================================
// Recommendation Logic
// ============================================================================

/**
 * Generate recommendation for bid award
 */
export function generateRecommendation(
  evaluations: BidEvaluationResult[]
): {
  recommendedBidId: string | null
  alternativeBidIds: string[]
  reasoning: string
  concerns: string[]
} {
  if (evaluations.length === 0) {
    return {
      recommendedBidId: null,
      alternativeBidIds: [],
      reasoning: 'No bids to evaluate',
      concerns: [],
    }
  }

  // Filter to qualified bids only
  const qualified = evaluations.filter(e => e.recommendation !== 'reject')

  if (qualified.length === 0) {
    return {
      recommendedBidId: null,
      alternativeBidIds: [],
      reasoning: 'No bids meet minimum qualification requirements',
      concerns: evaluations.map(e => `${e.bidderName}: ${e.recommendationReason}`),
    }
  }

  // Get top ranked bid
  const sorted = [...qualified].sort((a, b) => b.overallScore - a.overallScore)
  const recommended = sorted[0]
  const alternatives = sorted.slice(1, 3).map(e => e.submissionId)

  // Build reasoning
  let reasoning = `${recommended.bidderName} recommended with overall score of ${recommended.overallScore.toFixed(1)}. `
  reasoning += `Strengths: ${recommended.strengths.join(', ')}. `

  if (recommended.weaknesses.length > 0) {
    reasoning += `Areas to address: ${recommended.weaknesses.join(', ')}.`
  }

  // Identify concerns
  const concerns: string[] = []

  // Check if low bid is significantly different from recommended
  const lowPriceBid = [...qualified].sort((a, b) => b.priceScore - a.priceScore)[0]
  if (lowPriceBid.submissionId !== recommended.submissionId) {
    const priceDiff = Math.abs(recommended.priceScore - lowPriceBid.priceScore)
    if (priceDiff > 10) {
      concerns.push(
        `Recommended bid is not the lowest price. ${lowPriceBid.bidderName} has lower price but lower overall score.`
      )
    }
  }

  // Check for close competition
  if (sorted.length > 1) {
    const scoreDiff = recommended.overallScore - sorted[1].overallScore
    if (scoreDiff < 5) {
      concerns.push(
        `Close competition: ${sorted[1].bidderName} scored ${sorted[1].overallScore.toFixed(1)}, only ${scoreDiff.toFixed(1)} points behind.`
      )
    }
  }

  return {
    recommendedBidId: recommended.submissionId,
    alternativeBidIds: alternatives,
    reasoning,
    concerns,
  }
}
