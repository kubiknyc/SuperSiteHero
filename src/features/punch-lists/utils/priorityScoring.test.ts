/**
 * Tests for Punch Item Priority Scoring Utility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculatePriorityScore,
  sortByPriority,
  filterByPriorityLevel,
  getPriorityDistribution,
  getAveragePriorityScore,
  DEFAULT_PRIORITY_CONFIG,
  PRIORITY_COLORS,
  type PriorityLevel,
} from './priorityScoring'
import type { PunchItem } from '@/types/database'

// Mock date-fns
vi.mock('date-fns', () => ({
  differenceInDays: vi.fn((date1: Date, date2: Date) => {
    return Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24))
  }),
}))

// Helper to create mock punch items
function createMockPunchItem(overrides: Partial<PunchItem> = {}): PunchItem {
  return {
    id: 'test-id',
    project_id: 'project-1',
    number: 1,
    title: 'Test Punch Item',
    description: 'Test description',
    status: 'open',
    priority: 'medium',
    building: null,
    floor: null,
    room: null,
    area: null,
    trade: null,
    due_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    assigned_to: null,
    completed_at: null,
    verified_at: null,
    deleted_at: null,
    ...overrides,
  } as PunchItem
}

describe('calculatePriorityScore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return low priority for new items with no urgency', () => {
    const item = createMockPunchItem({
      created_at: new Date().toISOString(),
      status: 'in_progress',
    })

    const result = calculatePriorityScore(item)

    expect(result.level).toBe('low')
    expect(result.score).toBeLessThan(35)
    expect(result.factors).toHaveLength(6)
  })

  it('should return higher priority for older items', () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 30)

    const item = createMockPunchItem({
      created_at: oldDate.toISOString(),
      status: 'open',
    })

    const result = calculatePriorityScore(item)

    expect(result.score).toBeGreaterThan(40)
    const ageFactor = result.factors.find(f => f.name === 'Age')
    expect(ageFactor?.value).toBe(100)
  })

  it('should prioritize overdue items', () => {
    const pastDue = new Date()
    pastDue.setDate(pastDue.getDate() - 10)

    const item = createMockPunchItem({
      due_date: pastDue.toISOString(),
      status: 'open',
    })

    const result = calculatePriorityScore(item)

    expect(result.level).toBe('high')
    const dueFactor = result.factors.find(f => f.name === 'Due Date')
    expect(dueFactor?.value).toBeGreaterThan(80)
  })

  it('should prioritize critical trades', () => {
    const item = createMockPunchItem({
      trade: 'Fire Protection',
      status: 'open',
    })

    const result = calculatePriorityScore(item)

    const tradeFactor = result.factors.find(f => f.name === 'Trade')
    expect(tradeFactor?.value).toBe(100)
    expect(tradeFactor?.description).toContain('Critical trade')
  })

  it('should prioritize critical locations', () => {
    const item = createMockPunchItem({
      building: 'Main Building',
      floor: '1',
      room: 'Lobby',
      status: 'open',
    })

    const result = calculatePriorityScore(item)

    const locationFactor = result.factors.find(f => f.name === 'Location')
    expect(locationFactor?.value).toBe(100)
    expect(locationFactor?.description).toContain('high-traffic')
  })

  it('should return higher priority for rejected items', () => {
    const item = createMockPunchItem({
      status: 'rejected',
    })

    const result = calculatePriorityScore(item)

    const statusFactor = result.factors.find(f => f.name === 'Status')
    expect(statusFactor?.value).toBe(90)
  })

  it('should return lower priority for completed items', () => {
    const item = createMockPunchItem({
      status: 'completed',
    })

    const result = calculatePriorityScore(item)

    expect(result.level).toBe('low')
    const statusFactor = result.factors.find(f => f.name === 'Status')
    expect(statusFactor?.value).toBe(0)
  })

  it('should respect manual priority setting', () => {
    const item = createMockPunchItem({
      priority: 'critical',
      status: 'in_progress',
    })

    const result = calculatePriorityScore(item)

    const manualFactor = result.factors.find(f => f.name === 'Manual Priority')
    expect(manualFactor?.value).toBe(100)
  })

  it('should return correct colors for each level', () => {
    const criticalItem = createMockPunchItem({
      due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'rejected',
      priority: 'critical',
      trade: 'Electrical',
      room: 'Elevator',
    })

    const result = calculatePriorityScore(criticalItem)

    expect(result.color).toBe(PRIORITY_COLORS[result.level].color)
    expect(result.bgColor).toBe(PRIORITY_COLORS[result.level].bgColor)
    expect(result.label).toBe(PRIORITY_COLORS[result.level].label)
  })
})

describe('sortByPriority', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should sort items by priority score (highest first)', () => {
    const items = [
      createMockPunchItem({ id: '1', status: 'in_progress', priority: 'low' }),
      createMockPunchItem({ id: '2', status: 'rejected', priority: 'critical' }),
      createMockPunchItem({ id: '3', status: 'open', priority: 'medium' }),
    ]

    const sorted = sortByPriority(items)

    expect(sorted[0].id).toBe('2') // Rejected + critical should be first
    expect(sorted[2].id).toBe('1') // Low priority should be last
  })

  it('should not modify the original array', () => {
    const items = [
      createMockPunchItem({ id: '1', priority: 'low' }),
      createMockPunchItem({ id: '2', priority: 'high' }),
    ]
    const originalFirst = items[0].id

    sortByPriority(items)

    expect(items[0].id).toBe(originalFirst)
  })
})

describe('filterByPriorityLevel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should filter items by priority level', () => {
    const items = [
      createMockPunchItem({ id: '1', status: 'rejected', priority: 'critical' }),
      createMockPunchItem({ id: '2', status: 'in_progress', priority: 'low' }),
      createMockPunchItem({ id: '3', status: 'open', priority: 'medium' }),
    ]

    const highPriority = filterByPriorityLevel(items, ['critical', 'high'])

    expect(highPriority.length).toBeGreaterThan(0)
    highPriority.forEach(item => {
      const score = calculatePriorityScore(item)
      expect(['critical', 'high']).toContain(score.level)
    })
  })

  it('should return empty array if no items match', () => {
    const items = [
      createMockPunchItem({ status: 'completed', priority: 'low' }),
    ]

    const result = filterByPriorityLevel(items, ['critical'])

    expect(result).toHaveLength(0)
  })
})

describe('getPriorityDistribution', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return correct distribution counts', () => {
    const items = [
      createMockPunchItem({ status: 'rejected', priority: 'critical' }),
      createMockPunchItem({ status: 'rejected', priority: 'critical' }),
      createMockPunchItem({ status: 'in_progress', priority: 'medium' }),
      createMockPunchItem({ status: 'completed', priority: 'low' }),
    ]

    const distribution = getPriorityDistribution(items)

    expect(distribution.critical).toBeGreaterThanOrEqual(0)
    expect(distribution.high).toBeGreaterThanOrEqual(0)
    expect(distribution.medium).toBeGreaterThanOrEqual(0)
    expect(distribution.low).toBeGreaterThanOrEqual(0)
    expect(distribution.critical + distribution.high + distribution.medium + distribution.low).toBe(items.length)
  })

  it('should return zeros for empty array', () => {
    const distribution = getPriorityDistribution([])

    expect(distribution).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    })
  })
})

describe('getAveragePriorityScore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return average score', () => {
    const items = [
      createMockPunchItem({ status: 'open', priority: 'high' }),
      createMockPunchItem({ status: 'open', priority: 'low' }),
    ]

    const average = getAveragePriorityScore(items)

    expect(average).toBeGreaterThan(0)
    expect(average).toBeLessThanOrEqual(100)
  })

  it('should return 0 for empty array', () => {
    const average = getAveragePriorityScore([])

    expect(average).toBe(0)
  })
})

describe('DEFAULT_PRIORITY_CONFIG', () => {
  it('should have valid weight configuration', () => {
    const totalWeight =
      DEFAULT_PRIORITY_CONFIG.ageWeight +
      DEFAULT_PRIORITY_CONFIG.dueDateWeight +
      DEFAULT_PRIORITY_CONFIG.tradeWeight +
      DEFAULT_PRIORITY_CONFIG.locationWeight +
      DEFAULT_PRIORITY_CONFIG.statusWeight +
      DEFAULT_PRIORITY_CONFIG.manualPriorityWeight

    expect(totalWeight).toBe(100)
  })

  it('should have critical trades defined', () => {
    expect(DEFAULT_PRIORITY_CONFIG.criticalTrades).toContain('life-safety')
    expect(DEFAULT_PRIORITY_CONFIG.criticalTrades).toContain('electrical')
  })

  it('should have critical locations defined', () => {
    expect(DEFAULT_PRIORITY_CONFIG.criticalLocations).toContain('lobby')
    expect(DEFAULT_PRIORITY_CONFIG.criticalLocations).toContain('elevator')
  })
})

describe('PRIORITY_COLORS', () => {
  it('should have all priority levels defined', () => {
    const levels: PriorityLevel[] = ['critical', 'high', 'medium', 'low']

    levels.forEach(level => {
      expect(PRIORITY_COLORS[level]).toBeDefined()
      expect(PRIORITY_COLORS[level].color).toBeDefined()
      expect(PRIORITY_COLORS[level].bgColor).toBeDefined()
      expect(PRIORITY_COLORS[level].borderColor).toBeDefined()
      expect(PRIORITY_COLORS[level].label).toBeDefined()
    })
  })
})
