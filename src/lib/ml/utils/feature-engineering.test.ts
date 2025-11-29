// File: /src/lib/ml/utils/feature-engineering.test.ts
// Tests for feature engineering utilities

import { describe, it, expect } from 'vitest'
import {
  extractBudgetFeatures,
  extractScheduleFeatures,
  normalizeValue,
  minMaxNormalize,
  normalizeFeatures,
  prepareBudgetInput,
  prepareScheduleInput,
  calculateHeuristicRiskScore,
  generateFeatureImportance,
  DEFAULT_NORMALIZATION_PARAMS,
  BUDGET_FEATURES,
  SCHEDULE_FEATURES,
} from './feature-engineering'
import type { ProjectSnapshot } from '@/types/analytics'

// Mock project snapshot for testing
const createMockSnapshot = (overrides: Partial<ProjectSnapshot> = {}): ProjectSnapshot => ({
  id: 'snapshot-1',
  project_id: 'project-1',
  snapshot_date: '2024-01-15',
  overall_percent_complete: 50,
  budget: 1000000,
  contract_value: 1000000,
  cost_to_date: 500000,
  planned_start_date: '2024-01-01',
  planned_completion_date: '2024-12-31',
  approved_change_orders_cost: 50000,
  pending_change_orders_cost: 25000,
  open_change_orders: 5,
  avg_co_approval_days: 10,
  baseline_variance_days: 7,
  weather_delay_days: 3,
  open_rfis: 10,
  overdue_rfis: 2,
  avg_rfi_response_days: 5,
  open_submittals: 8,
  tasks_on_critical_path: 6,
  avg_daily_workforce: 15,
  ...overrides,
})

describe('Feature Engineering Utilities', () => {
  describe('normalizeValue (z-score)', () => {
    it('should calculate z-score correctly', () => {
      // Value = 10, Mean = 5, Std = 2
      // z = (10 - 5) / 2 = 2.5
      const result = normalizeValue(10, 5, 2)
      expect(result).toBe(2.5)
    })

    it('should return 0 when std is 0', () => {
      const result = normalizeValue(10, 5, 0)
      expect(result).toBe(0)
    })

    it('should return negative z-score for values below mean', () => {
      // Value = 3, Mean = 5, Std = 2
      // z = (3 - 5) / 2 = -1
      const result = normalizeValue(3, 5, 2)
      expect(result).toBe(-1)
    })

    it('should return 0 when value equals mean', () => {
      const result = normalizeValue(5, 5, 2)
      expect(result).toBe(0)
    })
  })

  describe('minMaxNormalize', () => {
    it('should normalize to 0-1 range correctly', () => {
      // Value = 50, Min = 0, Max = 100 -> 0.5
      const result = minMaxNormalize(50, 0, 100)
      expect(result).toBe(0.5)
    })

    it('should return 0 when value equals min', () => {
      const result = minMaxNormalize(0, 0, 100)
      expect(result).toBe(0)
    })

    it('should return 1 when value equals max', () => {
      const result = minMaxNormalize(100, 0, 100)
      expect(result).toBe(1)
    })

    it('should return 0 when min equals max', () => {
      const result = minMaxNormalize(50, 50, 50)
      expect(result).toBe(0)
    })

    it('should handle values outside range', () => {
      // Value = 150, Min = 0, Max = 100 -> 1.5
      const result = minMaxNormalize(150, 0, 100)
      expect(result).toBe(1.5)
    })
  })

  describe('extractBudgetFeatures', () => {
    it('should extract all budget features from snapshot', () => {
      const snapshot = createMockSnapshot()
      const features = extractBudgetFeatures(snapshot)

      expect(features).toHaveProperty('percent_complete')
      expect(features).toHaveProperty('days_since_start_normalized')
      expect(features).toHaveProperty('approved_co_ratio')
      expect(features).toHaveProperty('pending_co_ratio')
      expect(features).toHaveProperty('open_change_orders')
      expect(features).toHaveProperty('avg_co_approval_days')
      expect(features).toHaveProperty('cost_burn_rate')
      expect(features).toHaveProperty('schedule_variance_normalized')
      expect(features).toHaveProperty('weather_delay_days')
      expect(features).toHaveProperty('open_rfis')
    })

    it('should calculate approved CO ratio correctly', () => {
      const snapshot = createMockSnapshot({
        budget: 1000000,
        approved_change_orders_cost: 50000,
      })
      const features = extractBudgetFeatures(snapshot)

      // 50000 / 1000000 * 100 = 5%
      expect(features.approved_co_ratio).toBe(5)
    })

    it('should calculate cost burn rate correctly', () => {
      const snapshot = createMockSnapshot({
        budget: 1000000,
        cost_to_date: 600000,
      })
      const features = extractBudgetFeatures(snapshot)

      // 600000 / 1000000 = 0.6
      expect(features.cost_burn_rate).toBe(0.6)
    })

    it('should handle missing budget gracefully', () => {
      const snapshot = createMockSnapshot({ budget: 0 })
      const features = extractBudgetFeatures(snapshot)

      // Should use 1 as fallback to avoid division by zero
      expect(features.approved_co_ratio).toBeDefined()
      expect(Number.isFinite(features.approved_co_ratio)).toBe(true)
    })

    it('should normalize days since start correctly', () => {
      const snapshot = createMockSnapshot({
        planned_start_date: '2024-01-01',
        snapshot_date: '2024-07-01', // ~182 days
      })
      const features = extractBudgetFeatures(snapshot, 365)

      expect(features.days_since_start_normalized).toBeGreaterThan(0.4)
      expect(features.days_since_start_normalized).toBeLessThan(0.6)
    })
  })

  describe('extractScheduleFeatures', () => {
    it('should extract all schedule features from snapshot', () => {
      const snapshot = createMockSnapshot()
      const features = extractScheduleFeatures(snapshot)

      expect(features).toHaveProperty('percent_complete')
      expect(features).toHaveProperty('baseline_variance_normalized')
      expect(features).toHaveProperty('critical_path_tasks_behind')
      expect(features).toHaveProperty('open_rfis_ratio')
      expect(features).toHaveProperty('avg_rfi_response_days')
      expect(features).toHaveProperty('weather_delay_days')
      expect(features).toHaveProperty('workforce_ratio')
      expect(features).toHaveProperty('open_submittals')
      expect(features).toHaveProperty('tasks_on_critical_path')
      expect(features).toHaveProperty('co_schedule_impact')
    })

    it('should calculate workforce ratio correctly', () => {
      const snapshot = createMockSnapshot({
        avg_daily_workforce: 20,
      })
      const features = extractScheduleFeatures(snapshot)

      // 20 / 10 = 2.0
      expect(features.workforce_ratio).toBe(2)
    })

    it('should handle missing values with defaults', () => {
      const snapshot = createMockSnapshot({
        open_rfis: undefined,
        overdue_rfis: undefined,
      })
      const features = extractScheduleFeatures(snapshot)

      expect(Number.isFinite(features.open_rfis_ratio)).toBe(true)
    })
  })

  describe('normalizeFeatures', () => {
    it('should normalize features using z-score by default', () => {
      const features = {
        percent_complete: 75,
        open_rfis: 20,
      }
      const params = {
        means: { percent_complete: 50, open_rfis: 15 },
        stds: { percent_complete: 25, open_rfis: 10 },
        mins: { percent_complete: 0, open_rfis: 0 },
        maxs: { percent_complete: 100, open_rfis: 100 },
      }

      const result = normalizeFeatures(features, params, 'zscore')

      // percent_complete: (75 - 50) / 25 = 1
      // open_rfis: (20 - 15) / 10 = 0.5
      expect(result[0]).toBe(1)
      expect(result[1]).toBe(0.5)
    })

    it('should normalize features using min-max when specified', () => {
      const features = {
        percent_complete: 50,
        open_rfis: 25,
      }
      const params = {
        means: { percent_complete: 50, open_rfis: 15 },
        stds: { percent_complete: 25, open_rfis: 10 },
        mins: { percent_complete: 0, open_rfis: 0 },
        maxs: { percent_complete: 100, open_rfis: 50 },
      }

      const result = normalizeFeatures(features, params, 'minmax')

      // percent_complete: (50 - 0) / (100 - 0) = 0.5
      // open_rfis: (25 - 0) / (50 - 0) = 0.5
      expect(result[0]).toBe(0.5)
      expect(result[1]).toBe(0.5)
    })
  })

  describe('prepareBudgetInput', () => {
    it('should return an array of normalized values', () => {
      const snapshot = createMockSnapshot()
      const result = prepareBudgetInput(snapshot)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(BUDGET_FEATURES.length)
    })

    it('should return finite numbers for all features', () => {
      const snapshot = createMockSnapshot()
      const result = prepareBudgetInput(snapshot)

      result.forEach((value, index) => {
        expect(Number.isFinite(value)).toBe(true)
      })
    })
  })

  describe('prepareScheduleInput', () => {
    it('should return an array of normalized values', () => {
      const snapshot = createMockSnapshot()
      const result = prepareScheduleInput(snapshot)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(SCHEDULE_FEATURES.length)
    })

    it('should return finite numbers for all features', () => {
      const snapshot = createMockSnapshot()
      const result = prepareScheduleInput(snapshot)

      result.forEach((value) => {
        expect(Number.isFinite(value)).toBe(true)
      })
    })
  })

  describe('calculateHeuristicRiskScore', () => {
    it('should return scores for all risk categories', () => {
      const snapshot = createMockSnapshot()
      const result = calculateHeuristicRiskScore(snapshot)

      expect(result).toHaveProperty('overall')
      expect(result).toHaveProperty('schedule')
      expect(result).toHaveProperty('cost')
      expect(result).toHaveProperty('operational')
    })

    it('should return scores in 0-100 range', () => {
      const snapshot = createMockSnapshot()
      const result = calculateHeuristicRiskScore(snapshot)

      expect(result.overall).toBeGreaterThanOrEqual(0)
      expect(result.overall).toBeLessThanOrEqual(100)
      expect(result.schedule).toBeGreaterThanOrEqual(0)
      expect(result.schedule).toBeLessThanOrEqual(100)
      expect(result.cost).toBeGreaterThanOrEqual(0)
      expect(result.cost).toBeLessThanOrEqual(100)
      expect(result.operational).toBeGreaterThanOrEqual(0)
      expect(result.operational).toBeLessThanOrEqual(100)
    })

    it('should increase schedule risk with baseline variance', () => {
      const lowVariance = createMockSnapshot({ baseline_variance_days: 0 })
      const highVariance = createMockSnapshot({ baseline_variance_days: 30 })

      const lowResult = calculateHeuristicRiskScore(lowVariance)
      const highResult = calculateHeuristicRiskScore(highVariance)

      expect(highResult.schedule).toBeGreaterThan(lowResult.schedule)
    })

    it('should increase cost risk with change orders', () => {
      const lowCO = createMockSnapshot({
        budget: 1000000,
        approved_change_orders_cost: 10000,
      })
      const highCO = createMockSnapshot({
        budget: 1000000,
        approved_change_orders_cost: 200000,
      })

      const lowResult = calculateHeuristicRiskScore(lowCO)
      const highResult = calculateHeuristicRiskScore(highCO)

      expect(highResult.cost).toBeGreaterThan(lowResult.cost)
    })

    it('should increase operational risk with safety incidents', () => {
      const noIncidents = createMockSnapshot({ safety_incidents_mtd: 0 })
      const withIncidents = createMockSnapshot({ safety_incidents_mtd: 3 })

      const lowResult = calculateHeuristicRiskScore(noIncidents)
      const highResult = calculateHeuristicRiskScore(withIncidents)

      expect(highResult.operational).toBeGreaterThan(lowResult.operational)
    })

    it('should cap scores at 100', () => {
      // Create a high-risk snapshot
      const extremeSnapshot = createMockSnapshot({
        baseline_variance_days: 100,
        overdue_rfis: 50,
        open_change_orders: 30,
        tasks_on_critical_path: 30,
        approved_change_orders_cost: 500000,
        pending_change_orders_cost: 300000,
        budget: 1000000,
        safety_incidents_mtd: 10,
        open_punch_items: 200,
      })

      const result = calculateHeuristicRiskScore(extremeSnapshot)

      expect(result.overall).toBeLessThanOrEqual(100)
      expect(result.schedule).toBeLessThanOrEqual(100)
      expect(result.cost).toBeLessThanOrEqual(100)
      expect(result.operational).toBeLessThanOrEqual(100)
    })

    it('should return rounded integer scores', () => {
      const snapshot = createMockSnapshot()
      const result = calculateHeuristicRiskScore(snapshot)

      expect(Number.isInteger(result.overall)).toBe(true)
      expect(Number.isInteger(result.schedule)).toBe(true)
      expect(Number.isInteger(result.cost)).toBe(true)
      expect(Number.isInteger(result.operational)).toBe(true)
    })
  })

  describe('generateFeatureImportance', () => {
    it('should generate importance for each feature', () => {
      const features = ['feature1', 'feature2', 'feature3'] as const
      const weights = [0.5, 0.3, 0.2]

      const result = generateFeatureImportance(features, weights)

      expect(result.length).toBe(3)
    })

    it('should normalize importance values to sum to 1', () => {
      const features = ['feature1', 'feature2'] as const
      const weights = [2, 2]

      const result = generateFeatureImportance(features, weights)

      const totalImportance = result.reduce((sum, f) => sum + f.importance, 0)
      expect(totalImportance).toBeCloseTo(1, 5)
    })

    it('should sort by importance descending', () => {
      const features = ['low', 'high', 'medium'] as const
      const weights = [0.1, 0.6, 0.3]

      const result = generateFeatureImportance(features, weights)

      expect(result[0].feature).toBe('high')
      expect(result[1].feature).toBe('medium')
      expect(result[2].feature).toBe('low')
    })

    it('should assign correct direction based on weight sign', () => {
      const features = ['positive', 'negative', 'neutral'] as const
      const weights = [0.5, -0.5, 0.05]

      const result = generateFeatureImportance(features, weights)

      const positive = result.find((f) => f.feature === 'positive')
      const negative = result.find((f) => f.feature === 'negative')
      const neutral = result.find((f) => f.feature === 'neutral')

      expect(positive?.direction).toBe('positive')
      expect(negative?.direction).toBe('negative')
      expect(neutral?.direction).toBe('neutral')
    })

    it('should return empty array when lengths mismatch', () => {
      const features = ['feature1', 'feature2'] as const
      const weights = [0.5]

      const result = generateFeatureImportance(features, weights)

      expect(result).toEqual([])
    })
  })

  describe('DEFAULT_NORMALIZATION_PARAMS', () => {
    it('should have all required parameter types', () => {
      expect(DEFAULT_NORMALIZATION_PARAMS).toHaveProperty('means')
      expect(DEFAULT_NORMALIZATION_PARAMS).toHaveProperty('stds')
      expect(DEFAULT_NORMALIZATION_PARAMS).toHaveProperty('mins')
      expect(DEFAULT_NORMALIZATION_PARAMS).toHaveProperty('maxs')
    })

    it('should have consistent keys across all parameter types', () => {
      const meanKeys = Object.keys(DEFAULT_NORMALIZATION_PARAMS.means)
      const stdKeys = Object.keys(DEFAULT_NORMALIZATION_PARAMS.stds)
      const minKeys = Object.keys(DEFAULT_NORMALIZATION_PARAMS.mins)
      const maxKeys = Object.keys(DEFAULT_NORMALIZATION_PARAMS.maxs)

      expect(stdKeys).toEqual(meanKeys)
      expect(minKeys).toEqual(meanKeys)
      expect(maxKeys).toEqual(meanKeys)
    })

    it('should have non-zero standard deviations', () => {
      Object.values(DEFAULT_NORMALIZATION_PARAMS.stds).forEach((std) => {
        expect(std).toBeGreaterThan(0)
      })
    })

    it('should have mins less than or equal to maxs', () => {
      Object.keys(DEFAULT_NORMALIZATION_PARAMS.mins).forEach((key) => {
        const min = DEFAULT_NORMALIZATION_PARAMS.mins[key]
        const max = DEFAULT_NORMALIZATION_PARAMS.maxs[key]
        expect(min).toBeLessThanOrEqual(max)
      })
    })
  })

  describe('Feature Constants', () => {
    it('should define BUDGET_FEATURES', () => {
      expect(Array.isArray(BUDGET_FEATURES)).toBe(true)
      expect(BUDGET_FEATURES.length).toBeGreaterThan(0)
    })

    it('should define SCHEDULE_FEATURES', () => {
      expect(Array.isArray(SCHEDULE_FEATURES)).toBe(true)
      expect(SCHEDULE_FEATURES.length).toBeGreaterThan(0)
    })

    it('should have unique feature names in BUDGET_FEATURES', () => {
      const uniqueFeatures = new Set(BUDGET_FEATURES)
      expect(uniqueFeatures.size).toBe(BUDGET_FEATURES.length)
    })

    it('should have unique feature names in SCHEDULE_FEATURES', () => {
      const uniqueFeatures = new Set(SCHEDULE_FEATURES)
      expect(uniqueFeatures.size).toBe(SCHEDULE_FEATURES.length)
    })
  })
})
