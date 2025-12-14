/**
 * Punch Item Priority Scoring Utility
 *
 * Auto-calculate priority based on criteria (age, location, trade, etc.)
 * Provides visual priority indicators (high/medium/low)
 * Configurable priority rules
 */

import type { PunchItem, Priority } from '@/types/database'
import { differenceInDays } from 'date-fns'

// ============================================================================
// Types
// ============================================================================

export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low'

export interface PriorityScore {
  level: PriorityLevel
  score: number // 0-100
  factors: PriorityFactor[]
  color: string
  bgColor: string
  borderColor: string
  label: string
}

export interface PriorityFactor {
  name: string
  weight: number
  value: number
  contribution: number
  description: string
}

export interface PriorityScoringConfig {
  // Age-based scoring
  ageWeight: number
  criticalAgeDays: number
  highAgeDays: number
  mediumAgeDays: number

  // Due date scoring
  dueDateWeight: number
  overdueCriticalDays: number
  overdueHighDays: number

  // Trade priority (some trades are more critical)
  tradeWeight: number
  criticalTrades: string[]
  highPriorityTrades: string[]

  // Location priority (high-traffic areas, safety zones)
  locationWeight: number
  criticalLocations: string[]
  highPriorityLocations: string[]

  // Status-based adjustments
  statusWeight: number

  // Manual priority override weight
  manualPriorityWeight: number
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_PRIORITY_CONFIG: PriorityScoringConfig = {
  ageWeight: 25,
  criticalAgeDays: 30,
  highAgeDays: 14,
  mediumAgeDays: 7,

  dueDateWeight: 30,
  overdueCriticalDays: 7,
  overdueHighDays: 3,

  tradeWeight: 15,
  criticalTrades: ['life-safety', 'fire-protection', 'electrical', 'structural'],
  highPriorityTrades: ['plumbing', 'hvac', 'roofing', 'waterproofing'],

  locationWeight: 15,
  criticalLocations: ['lobby', 'entrance', 'elevator', 'stairwell', 'emergency-exit'],
  highPriorityLocations: ['common-area', 'restroom', 'kitchen', 'mechanical-room'],

  statusWeight: 10,
  manualPriorityWeight: 5,
}

// ============================================================================
// Priority Level Colors
// ============================================================================

export const PRIORITY_COLORS: Record<PriorityLevel, { color: string; bgColor: string; borderColor: string; label: string }> = {
  critical: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-500',
    label: 'Critical',
  },
  high: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-500',
    label: 'High',
  },
  medium: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-500',
    label: 'Medium',
  },
  low: {
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500',
    label: 'Low',
  },
}

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculate age-based score
 */
function calculateAgeScore(
  createdAt: string | null | undefined,
  config: PriorityScoringConfig
): PriorityFactor {
  if (!createdAt) {
    return {
      name: 'Age',
      weight: config.ageWeight,
      value: 0,
      contribution: 0,
      description: 'No creation date',
    }
  }

  const daysOld = differenceInDays(new Date(), new Date(createdAt))
  let value = 0

  if (daysOld >= config.criticalAgeDays) {
    value = 100
  } else if (daysOld >= config.highAgeDays) {
    value = 75
  } else if (daysOld >= config.mediumAgeDays) {
    value = 50
  } else {
    value = Math.min(25, (daysOld / config.mediumAgeDays) * 25)
  }

  return {
    name: 'Age',
    weight: config.ageWeight,
    value,
    contribution: (value * config.ageWeight) / 100,
    description: `${daysOld} days old`,
  }
}

/**
 * Calculate due date score
 */
function calculateDueDateScore(
  dueDate: string | null | undefined,
  config: PriorityScoringConfig
): PriorityFactor {
  if (!dueDate) {
    return {
      name: 'Due Date',
      weight: config.dueDateWeight,
      value: 0,
      contribution: 0,
      description: 'No due date set',
    }
  }

  const daysUntilDue = differenceInDays(new Date(dueDate), new Date())
  let value = 0
  let description = ''

  if (daysUntilDue < -config.overdueCriticalDays) {
    value = 100
    description = `${Math.abs(daysUntilDue)} days overdue (critical)`
  } else if (daysUntilDue < -config.overdueHighDays) {
    value = 85
    description = `${Math.abs(daysUntilDue)} days overdue`
  } else if (daysUntilDue < 0) {
    value = 70
    description = `${Math.abs(daysUntilDue)} days overdue`
  } else if (daysUntilDue === 0) {
    value = 60
    description = 'Due today'
  } else if (daysUntilDue <= 3) {
    value = 45
    description = `Due in ${daysUntilDue} days`
  } else if (daysUntilDue <= 7) {
    value = 25
    description = `Due in ${daysUntilDue} days`
  } else {
    value = 10
    description = `Due in ${daysUntilDue} days`
  }

  return {
    name: 'Due Date',
    weight: config.dueDateWeight,
    value,
    contribution: (value * config.dueDateWeight) / 100,
    description,
  }
}

/**
 * Calculate trade-based score
 */
function calculateTradeScore(
  trade: string | null | undefined,
  config: PriorityScoringConfig
): PriorityFactor {
  if (!trade) {
    return {
      name: 'Trade',
      weight: config.tradeWeight,
      value: 0,
      contribution: 0,
      description: 'No trade specified',
    }
  }

  const normalizedTrade = trade.toLowerCase().replace(/\s+/g, '-')
  let value = 0
  let description = ''

  if (config.criticalTrades.some(t => normalizedTrade.includes(t))) {
    value = 100
    description = `Critical trade: ${trade}`
  } else if (config.highPriorityTrades.some(t => normalizedTrade.includes(t))) {
    value = 70
    description = `High-priority trade: ${trade}`
  } else {
    value = 25
    description = `Standard trade: ${trade}`
  }

  return {
    name: 'Trade',
    weight: config.tradeWeight,
    value,
    contribution: (value * config.tradeWeight) / 100,
    description,
  }
}

/**
 * Calculate location-based score
 */
function calculateLocationScore(
  punchItem: PunchItem,
  config: PriorityScoringConfig
): PriorityFactor {
  const locationParts = [
    punchItem.building,
    punchItem.floor,
    punchItem.room,
    punchItem.area,
  ].filter(Boolean).map(l => l?.toLowerCase().replace(/\s+/g, '-') || '')

  if (locationParts.length === 0) {
    return {
      name: 'Location',
      weight: config.locationWeight,
      value: 0,
      contribution: 0,
      description: 'No location specified',
    }
  }

  let value = 25
  let description = 'Standard location'

  const locationString = locationParts.join(' ')

  if (config.criticalLocations.some(l => locationString.includes(l))) {
    value = 100
    description = 'Critical/high-traffic location'
  } else if (config.highPriorityLocations.some(l => locationString.includes(l))) {
    value = 70
    description = 'High-priority location'
  }

  return {
    name: 'Location',
    weight: config.locationWeight,
    value,
    contribution: (value * config.locationWeight) / 100,
    description,
  }
}

/**
 * Calculate status-based score
 */
function calculateStatusScore(
  status: string | null | undefined,
  config: PriorityScoringConfig
): PriorityFactor {
  let value = 0
  let description = ''

  switch (status) {
    case 'open':
      value = 80
      description = 'Open - needs attention'
      break
    case 'in_progress':
      value = 40
      description = 'In progress'
      break
    case 'ready_for_review':
      value = 60
      description = 'Ready for review'
      break
    case 'rejected':
      value = 90
      description = 'Rejected - requires rework'
      break
    case 'completed':
    case 'verified':
      value = 0
      description = 'Completed/Verified'
      break
    default:
      value = 50
      description = status || 'Unknown status'
  }

  return {
    name: 'Status',
    weight: config.statusWeight,
    value,
    contribution: (value * config.statusWeight) / 100,
    description,
  }
}

/**
 * Calculate manual priority score (from existing priority field)
 */
function calculateManualPriorityScore(
  priority: Priority | null | undefined,
  config: PriorityScoringConfig
): PriorityFactor {
  let value = 0
  let description = ''

  switch (priority) {
    case 'critical':
      value = 100
      description = 'Manually set: Critical'
      break
    case 'high':
      value = 75
      description = 'Manually set: High'
      break
    case 'medium':
      value = 50
      description = 'Manually set: Medium'
      break
    case 'low':
      value = 25
      description = 'Manually set: Low'
      break
    default:
      value = 50
      description = 'Default priority'
  }

  return {
    name: 'Manual Priority',
    weight: config.manualPriorityWeight,
    value,
    contribution: (value * config.manualPriorityWeight) / 100,
    description,
  }
}

// ============================================================================
// Main Scoring Function
// ============================================================================

/**
 * Calculate priority score for a punch item
 */
export function calculatePriorityScore(
  punchItem: PunchItem,
  config: PriorityScoringConfig = DEFAULT_PRIORITY_CONFIG
): PriorityScore {
  const factors: PriorityFactor[] = [
    calculateAgeScore(punchItem.created_at, config),
    calculateDueDateScore(punchItem.due_date, config),
    calculateTradeScore(punchItem.trade, config),
    calculateLocationScore(punchItem, config),
    calculateStatusScore(punchItem.status, config),
    calculateManualPriorityScore(punchItem.priority, config),
  ]

  const totalScore = factors.reduce((sum, factor) => sum + factor.contribution, 0)

  // Determine priority level based on score
  let level: PriorityLevel
  if (totalScore >= 75) {
    level = 'critical'
  } else if (totalScore >= 55) {
    level = 'high'
  } else if (totalScore >= 35) {
    level = 'medium'
  } else {
    level = 'low'
  }

  const colors = PRIORITY_COLORS[level]

  return {
    level,
    score: Math.round(totalScore),
    factors,
    ...colors,
  }
}

/**
 * Sort punch items by priority score (highest first)
 */
export function sortByPriority(
  items: PunchItem[],
  config: PriorityScoringConfig = DEFAULT_PRIORITY_CONFIG
): PunchItem[] {
  return [...items].sort((a, b) => {
    const scoreA = calculatePriorityScore(a, config).score
    const scoreB = calculatePriorityScore(b, config).score
    return scoreB - scoreA // Descending order
  })
}

/**
 * Filter punch items by priority level
 */
export function filterByPriorityLevel(
  items: PunchItem[],
  levels: PriorityLevel[],
  config: PriorityScoringConfig = DEFAULT_PRIORITY_CONFIG
): PunchItem[] {
  return items.filter(item => {
    const score = calculatePriorityScore(item, config)
    return levels.includes(score.level)
  })
}

/**
 * Get priority distribution for a set of punch items
 */
export function getPriorityDistribution(
  items: PunchItem[],
  config: PriorityScoringConfig = DEFAULT_PRIORITY_CONFIG
): Record<PriorityLevel, number> {
  const distribution: Record<PriorityLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }

  items.forEach(item => {
    const score = calculatePriorityScore(item, config)
    distribution[score.level]++
  })

  return distribution
}

/**
 * Get average priority score for a set of items
 */
export function getAveragePriorityScore(
  items: PunchItem[],
  config: PriorityScoringConfig = DEFAULT_PRIORITY_CONFIG
): number {
  if (items.length === 0) return 0

  const totalScore = items.reduce((sum, item) => {
    return sum + calculatePriorityScore(item, config).score
  }, 0)

  return Math.round(totalScore / items.length)
}
