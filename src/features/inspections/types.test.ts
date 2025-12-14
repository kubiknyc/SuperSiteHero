// File: /src/features/inspections/types.test.ts
// Tests for inspection types and configurations

import { describe, it, expect } from 'vitest'
import {
  // Types
  InspectionType,
  InspectionResult,
  InspectionStatus,
  InspectionFilters,
  RecordInspectionResultInput,
  InspectionStats,
  // Configs
  INSPECTION_TYPE_CONFIG,
  INSPECTION_RESULT_CONFIG,
  INSPECTION_STATUS_CONFIG,
} from './types'

describe('Inspection types', () => {
  describe('INSPECTION_TYPE_CONFIG', () => {
    it('should have all expected inspection types', () => {
      const types = Object.keys(INSPECTION_TYPE_CONFIG)
      expect(types).toContain('building_dept')
      expect(types).toContain('fire_marshal')
      expect(types).toContain('structural')
      expect(types).toContain('special')
      expect(types).toContain('other')
      expect(types).toHaveLength(5)
    })

    it('should have label, description, and color for each type', () => {
      Object.values(INSPECTION_TYPE_CONFIG).forEach((config) => {
        expect(config.label).toBeDefined()
        expect(config.label.length).toBeGreaterThan(0)
        expect(config.description).toBeDefined()
        expect(config.description.length).toBeGreaterThan(0)
        expect(config.color).toBeDefined()
      })
    })

    it('should have correct labels for types', () => {
      expect(INSPECTION_TYPE_CONFIG.building_dept.label).toBe('Building Department')
      expect(INSPECTION_TYPE_CONFIG.fire_marshal.label).toBe('Fire Marshal')
      expect(INSPECTION_TYPE_CONFIG.structural.label).toBe('Structural')
      expect(INSPECTION_TYPE_CONFIG.special.label).toBe('Special')
      expect(INSPECTION_TYPE_CONFIG.other.label).toBe('Other')
    })

    it('should have distinct colors for different types', () => {
      expect(INSPECTION_TYPE_CONFIG.building_dept.color).toBe('blue')
      expect(INSPECTION_TYPE_CONFIG.fire_marshal.color).toBe('red')
      expect(INSPECTION_TYPE_CONFIG.structural.color).toBe('purple')
      expect(INSPECTION_TYPE_CONFIG.special.color).toBe('orange')
      expect(INSPECTION_TYPE_CONFIG.other.color).toBe('gray')
    })
  })

  describe('INSPECTION_RESULT_CONFIG', () => {
    it('should have all expected results', () => {
      const results = Object.keys(INSPECTION_RESULT_CONFIG)
      expect(results).toContain('pass')
      expect(results).toContain('fail')
      expect(results).toContain('conditional')
      expect(results).toContain('pending')
      expect(results).toHaveLength(4)
    })

    it('should have label, description, and color for each result', () => {
      Object.values(INSPECTION_RESULT_CONFIG).forEach((config) => {
        expect(config.label).toBeDefined()
        expect(config.label.length).toBeGreaterThan(0)
        expect(config.description).toBeDefined()
        expect(config.description.length).toBeGreaterThan(0)
        expect(config.color).toBeDefined()
      })
    })

    it('should have appropriate colors for results', () => {
      expect(INSPECTION_RESULT_CONFIG.pass.color).toBe('green')
      expect(INSPECTION_RESULT_CONFIG.fail.color).toBe('red')
      expect(INSPECTION_RESULT_CONFIG.conditional.color).toBe('yellow')
      expect(INSPECTION_RESULT_CONFIG.pending.color).toBe('gray')
    })

    it('should have descriptive labels', () => {
      expect(INSPECTION_RESULT_CONFIG.pass.label).toBe('Pass')
      expect(INSPECTION_RESULT_CONFIG.fail.label).toBe('Fail')
      expect(INSPECTION_RESULT_CONFIG.conditional.label).toBe('Conditional')
      expect(INSPECTION_RESULT_CONFIG.pending.label).toBe('Pending')
    })
  })

  describe('INSPECTION_STATUS_CONFIG', () => {
    it('should have all expected statuses', () => {
      const statuses = Object.keys(INSPECTION_STATUS_CONFIG)
      expect(statuses).toContain('scheduled')
      expect(statuses).toContain('completed')
      expect(statuses).toContain('failed')
      expect(statuses).toContain('cancelled')
      expect(statuses).toHaveLength(4)
    })

    it('should have label, description, and color for each status', () => {
      Object.values(INSPECTION_STATUS_CONFIG).forEach((config) => {
        expect(config.label).toBeDefined()
        expect(config.label.length).toBeGreaterThan(0)
        expect(config.description).toBeDefined()
        expect(config.description.length).toBeGreaterThan(0)
        expect(config.color).toBeDefined()
      })
    })

    it('should have appropriate colors for statuses', () => {
      expect(INSPECTION_STATUS_CONFIG.scheduled.color).toBe('blue')
      expect(INSPECTION_STATUS_CONFIG.completed.color).toBe('green')
      expect(INSPECTION_STATUS_CONFIG.failed.color).toBe('red')
      expect(INSPECTION_STATUS_CONFIG.cancelled.color).toBe('gray')
    })
  })

  describe('Type definitions', () => {
    it('should allow valid InspectionType values', () => {
      const types: InspectionType[] = [
        'building_dept',
        'fire_marshal',
        'structural',
        'special',
        'other',
      ]
      expect(types).toHaveLength(5)
    })

    it('should allow valid InspectionResult values', () => {
      const results: InspectionResult[] = ['pass', 'fail', 'conditional', 'pending']
      expect(results).toHaveLength(4)
    })

    it('should allow valid InspectionStatus values', () => {
      const statuses: InspectionStatus[] = ['scheduled', 'completed', 'failed', 'cancelled']
      expect(statuses).toHaveLength(4)
    })
  })

  describe('InspectionFilters interface', () => {
    it('should allow complete filters', () => {
      const filters: InspectionFilters = {
        status: 'scheduled',
        result: 'pending',
        inspection_type: 'building_dept',
        search: 'foundation',
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31',
        },
      }

      expect(filters.status).toBe('scheduled')
      expect(filters.result).toBe('pending')
      expect(filters.inspection_type).toBe('building_dept')
      expect(filters.search).toBe('foundation')
      expect(filters.dateRange?.start).toBe('2024-01-01')
    })

    it('should allow partial filters', () => {
      const filters: InspectionFilters = {
        status: 'completed',
      }

      expect(filters.status).toBe('completed')
      expect(filters.result).toBeUndefined()
    })

    it('should allow empty filters', () => {
      const filters: InspectionFilters = {}
      expect(Object.keys(filters)).toHaveLength(0)
    })
  })

  describe('RecordInspectionResultInput interface', () => {
    it('should define required fields', () => {
      const input: RecordInspectionResultInput = {
        id: 'inspection-123',
        result: 'pass',
        result_date: '2024-03-15',
        inspector_notes: 'All items passed inspection',
      }

      expect(input.id).toBe('inspection-123')
      expect(input.result).toBe('pass')
      expect(input.result_date).toBe('2024-03-15')
      expect(input.inspector_notes).toBe('All items passed inspection')
    })

    it('should allow optional fields for failed inspections', () => {
      const input: RecordInspectionResultInput = {
        id: 'inspection-456',
        result: 'fail',
        result_date: '2024-03-15',
        inspector_notes: 'Failed inspection',
        failure_reasons: 'Missing fire stops in wall penetrations',
        corrective_actions_required: 'Install fire stops per code',
        reinspection_scheduled_date: '2024-03-22',
      }

      expect(input.failure_reasons).toBe('Missing fire stops in wall penetrations')
      expect(input.corrective_actions_required).toBe('Install fire stops per code')
      expect(input.reinspection_scheduled_date).toBe('2024-03-22')
    })
  })

  describe('InspectionStats interface', () => {
    it('should define all stat fields', () => {
      const stats: InspectionStats = {
        total_inspections: 50,
        scheduled_count: 10,
        completed_count: 35,
        passed_count: 30,
        failed_count: 5,
        upcoming_this_week: 3,
        overdue_count: 2,
      }

      expect(stats.total_inspections).toBe(50)
      expect(stats.scheduled_count).toBe(10)
      expect(stats.completed_count).toBe(35)
      expect(stats.passed_count).toBe(30)
      expect(stats.failed_count).toBe(5)
      expect(stats.upcoming_this_week).toBe(3)
      expect(stats.overdue_count).toBe(2)
    })

    it('should allow zero counts', () => {
      const stats: InspectionStats = {
        total_inspections: 0,
        scheduled_count: 0,
        completed_count: 0,
        passed_count: 0,
        failed_count: 0,
        upcoming_this_week: 0,
        overdue_count: 0,
      }

      expect(stats.total_inspections).toBe(0)
    })
  })

  describe('Configuration consistency', () => {
    it('should have matching keys between type enum and config', () => {
      const enumValues: InspectionType[] = [
        'building_dept',
        'fire_marshal',
        'structural',
        'special',
        'other',
      ]
      const configKeys = Object.keys(INSPECTION_TYPE_CONFIG)

      enumValues.forEach((value) => {
        expect(configKeys).toContain(value)
      })
    })

    it('should have matching keys between result enum and config', () => {
      const enumValues: InspectionResult[] = ['pass', 'fail', 'conditional', 'pending']
      const configKeys = Object.keys(INSPECTION_RESULT_CONFIG)

      enumValues.forEach((value) => {
        expect(configKeys).toContain(value)
      })
    })

    it('should have matching keys between status enum and config', () => {
      const enumValues: InspectionStatus[] = ['scheduled', 'completed', 'failed', 'cancelled']
      const configKeys = Object.keys(INSPECTION_STATUS_CONFIG)

      enumValues.forEach((value) => {
        expect(configKeys).toContain(value)
      })
    })
  })
})
