/**
 * ConditionBadge Component Tests
 *
 * Tests for the ConditionBadge component and related constants
 */

import { describe, it, expect } from 'vitest'
import { MATERIAL_CONDITIONS, type MaterialCondition } from '@/types/material-receiving'

describe('ConditionBadge', () => {
  describe('MATERIAL_CONDITIONS constant', () => {
    it('should have four conditions', () => {
      expect(MATERIAL_CONDITIONS).toHaveLength(4)
    })

    it('should have good condition', () => {
      const good = MATERIAL_CONDITIONS.find(c => c.value === 'good')
      expect(good).toBeDefined()
      expect(good?.label).toBe('Good')
      expect(good?.color).toBe('green')
    })

    it('should have damaged condition', () => {
      const damaged = MATERIAL_CONDITIONS.find(c => c.value === 'damaged')
      expect(damaged).toBeDefined()
      expect(damaged?.label).toBe('Damaged')
      expect(damaged?.color).toBe('red')
    })

    it('should have partial condition', () => {
      const partial = MATERIAL_CONDITIONS.find(c => c.value === 'partial')
      expect(partial).toBeDefined()
      expect(partial?.label).toBe('Partial Delivery')
      expect(partial?.color).toBe('yellow')
    })

    it('should have rejected condition', () => {
      const rejected = MATERIAL_CONDITIONS.find(c => c.value === 'rejected')
      expect(rejected).toBeDefined()
      expect(rejected?.label).toBe('Rejected')
      expect(rejected?.color).toBe('red')
    })
  })

  describe('Condition type validation', () => {
    it('should validate condition types', () => {
      const validConditions: MaterialCondition[] = ['good', 'damaged', 'partial', 'rejected']
      validConditions.forEach(condition => {
        expect(MATERIAL_CONDITIONS.map(c => c.value)).toContain(condition)
      })
    })

    it('should have all valid condition values', () => {
      const conditionValues = MATERIAL_CONDITIONS.map(c => c.value)
      expect(conditionValues).toContain('good')
      expect(conditionValues).toContain('damaged')
      expect(conditionValues).toContain('partial')
      expect(conditionValues).toContain('rejected')
    })
  })

  describe('Color mapping', () => {
    it('should map good to green', () => {
      const good = MATERIAL_CONDITIONS.find(c => c.value === 'good')
      expect(good?.color).toBe('green')
    })

    it('should map damaged to red', () => {
      const damaged = MATERIAL_CONDITIONS.find(c => c.value === 'damaged')
      expect(damaged?.color).toBe('red')
    })

    it('should map partial to yellow', () => {
      const partial = MATERIAL_CONDITIONS.find(c => c.value === 'partial')
      expect(partial?.color).toBe('yellow')
    })

    it('should map rejected to red', () => {
      const rejected = MATERIAL_CONDITIONS.find(c => c.value === 'rejected')
      expect(rejected?.color).toBe('red')
    })
  })
})
