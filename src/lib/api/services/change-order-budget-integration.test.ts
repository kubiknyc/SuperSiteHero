/**
 * Tests for Change Order Budget Integration Service
 * CRITICAL: These tests ensure budget adjustments are applied correctly when COs are approved
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { changeOrderBudgetIntegration } from './change-order-budget-integration'

// Mock Supabase with chainable methods
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  then: vi.fn(function (this: any, onFulfilled: any) {
    return Promise.resolve({ data: [], error: null }).then(onFulfilled)
  }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}))

describe('changeOrderBudgetIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset all mock chains
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.insert.mockReturnThis()
    mockSupabaseChain.update.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.or.mockReturnThis()
    mockSupabaseChain.limit.mockReturnThis()
    mockSupabaseChain.from.mockReturnThis()
    mockSupabaseChain.then.mockImplementation(function (this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    })
  })

  describe('applyBudgetAdjustments', () => {
    it('should successfully apply budget adjustments for a change order with cost codes', async () => {
      const mockChangeOrder = {
        id: 'co-123',
        co_number: 1,
        project_id: 'proj-456',
        company_id: 'comp-789',
        title: 'Additional HVAC Work',
        approved_amount: 25000,
        items: [
          {
            id: 'item-1',
            cost_code_id: 'cc-100',
            total_amount: 15000,
            description: 'HVAC ductwork',
            cost_code: { id: 'cc-100', code: '15-20-00', name: 'HVAC' },
          },
          {
            id: 'item-2',
            cost_code_id: 'cc-200',
            total_amount: 10000,
            description: 'Electrical upgrades',
            cost_code: { id: 'cc-200', code: '16-10-00', name: 'Electrical' },
          },
        ],
      }

      const mockExistingBudget = {
        id: 'budget-1',
        original_budget: 50000,
        approved_changes: 5000,
      }

      let callCount = 0
      mockSupabaseChain.then.mockImplementation((onFulfilled) => {
        callCount++
        // First call: fetch change order
        if (callCount === 1) {
          return Promise.resolve({ data: mockChangeOrder, error: null }).then(onFulfilled)
        }
        // Second call: first budget lookup (exists)
        if (callCount === 2) {
          return Promise.resolve({ data: mockExistingBudget, error: null }).then(onFulfilled)
        }
        // Third call: update budget
        if (callCount === 3) {
          return Promise.resolve({ error: null }).then(onFulfilled)
        }
        // Fourth call: create transaction for first item
        if (callCount === 4) {
          return Promise.resolve({ data: { id: 'tx-1' }, error: null }).then(onFulfilled)
        }
        // Fifth call: second budget lookup (doesn't exist)
        if (callCount === 5) {
          return Promise.resolve({ data: null, error: null }).then(onFulfilled)
        }
        // Sixth call: create new budget
        if (callCount === 6) {
          return Promise.resolve({ data: { id: 'budget-2' }, error: null }).then(onFulfilled)
        }
        // Seventh call: create transaction for second item
        if (callCount === 7) {
          return Promise.resolve({ data: { id: 'tx-2' }, error: null }).then(onFulfilled)
        }
        // Eighth call: create history entry
        if (callCount === 8) {
          return Promise.resolve({ error: null }).then(onFulfilled)
        }
        return Promise.resolve({ data: null, error: null }).then(onFulfilled)
      })

      const result = await changeOrderBudgetIntegration.applyBudgetAdjustments('co-123', 25000)

      expect(result.change_order_id).toBe('co-123')
      expect(result.co_number).toBe(1)
      expect(result.total_adjusted).toBe(25000)
      expect(result.adjustments).toHaveLength(2)
      expect(result.updated_budgets).toBe(1)
      expect(result.created_budgets).toBe(1)
    })

    it('should throw error if change order not found', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(
        changeOrderBudgetIntegration.applyBudgetAdjustments('invalid-co', 1000)
      ).rejects.toThrow('Change order not found')
    })

    it('should group multiple items with same cost code', async () => {
      const mockChangeOrder = {
        id: 'co-123',
        co_number: 3,
        project_id: 'proj-456',
        company_id: 'comp-789',
        title: 'Multiple Items Same Code',
        approved_amount: 30000,
        items: [
          {
            id: 'item-1',
            cost_code_id: 'cc-100',
            total_amount: 10000,
            description: 'Work A',
            cost_code: { id: 'cc-100', code: '15-20-00', name: 'HVAC' },
          },
          {
            id: 'item-2',
            cost_code_id: 'cc-100',
            total_amount: 20000,
            description: 'Work B',
            cost_code: { id: 'cc-100', code: '15-20-00', name: 'HVAC' },
          },
        ],
      }

      let callCount = 0
      mockSupabaseChain.then.mockImplementation((onFulfilled) => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ data: mockChangeOrder, error: null }).then(onFulfilled)
        }
        if (callCount === 2) {
          // Budget doesn't exist
          return Promise.resolve({ data: null, error: null }).then(onFulfilled)
        }
        if (callCount === 3) {
          // Create budget
          return Promise.resolve({ data: { id: 'budget-1' }, error: null }).then(onFulfilled)
        }
        if (callCount === 4) {
          // Create transaction
          return Promise.resolve({ data: { id: 'tx-1' }, error: null }).then(onFulfilled)
        }
        if (callCount === 5) {
          // History
          return Promise.resolve({ error: null }).then(onFulfilled)
        }
        return Promise.resolve({ data: null, error: null }).then(onFulfilled)
      })

      const result = await changeOrderBudgetIntegration.applyBudgetAdjustments('co-123', 30000)

      expect(result.total_adjusted).toBe(30000)
      expect(result.adjustments).toHaveLength(1) // Should be grouped
      expect(result.adjustments[0].amount).toBe(30000)
    })
  })

  describe('reverseBudgetAdjustments', () => {
    it('should successfully reverse budget adjustments', async () => {
      const mockChangeOrder = {
        id: 'co-123',
        co_number: 1,
        project_id: 'proj-456',
        company_id: 'comp-789',
        title: 'Rejected CO',
        approved_amount: 15000,
        items: [
          {
            id: 'item-1',
            cost_code_id: 'cc-100',
            total_amount: 15000,
            description: 'Work to reverse',
            cost_code: { id: 'cc-100', code: '15-20-00', name: 'HVAC' },
          },
        ],
      }

      const mockExistingBudget = {
        id: 'budget-1',
        approved_changes: 20000,
      }

      let callCount = 0
      mockSupabaseChain.then.mockImplementation((onFulfilled) => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ data: mockChangeOrder, error: null }).then(onFulfilled)
        }
        if (callCount === 2) {
          return Promise.resolve({ data: mockExistingBudget, error: null }).then(onFulfilled)
        }
        if (callCount === 3) {
          // Update budget
          return Promise.resolve({ error: null }).then(onFulfilled)
        }
        if (callCount === 4) {
          // Create reversal transaction
          return Promise.resolve({ data: { id: 'tx-1' }, error: null }).then(onFulfilled)
        }
        if (callCount === 5) {
          // History
          return Promise.resolve({ error: null }).then(onFulfilled)
        }
        return Promise.resolve({ data: null, error: null }).then(onFulfilled)
      })

      const result = await changeOrderBudgetIntegration.reverseBudgetAdjustments('co-123')

      expect(result.total_adjusted).toBe(-15000)
      expect(result.adjustments).toHaveLength(1)
      expect(result.adjustments[0].amount).toBe(-15000)
      expect(result.updated_budgets).toBe(1)
    })

    it('should throw error if change order not found during reversal', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(
        changeOrderBudgetIntegration.reverseBudgetAdjustments('invalid-co')
      ).rejects.toThrow('Change order not found')
    })
  })

  describe('hasBeenProcessed', () => {
    it('should return true if budget adjustment has been processed', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [{ id: 'history-1' }] }).then(onFulfilled)
      )

      const result = await changeOrderBudgetIntegration.hasBeenProcessed('co-123')

      expect(result).toBe(true)
    })

    it('should return false if budget adjustment has not been processed', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [] }).then(onFulfilled)
      )

      const result = await changeOrderBudgetIntegration.hasBeenProcessed('co-123')

      expect(result).toBe(false)
    })
  })

  describe('previewBudgetImpact', () => {
    it('should preview budget impact before approval', async () => {
      const mockChangeOrder = {
        id: 'co-123',
        project_id: 'proj-456',
        items: [
          {
            cost_code_id: 'cc-100',
            total_amount: 15000,
            cost_code: { id: 'cc-100', code: '15-20-00', name: 'HVAC' },
          },
          {
            cost_code_id: 'cc-200',
            total_amount: 10000,
            cost_code: { id: 'cc-200', code: '16-10-00', name: 'Electrical' },
          },
        ],
      }

      const mockExistingBudget = {
        original_budget: 50000,
        approved_changes: 5000,
      }

      let callCount = 0
      mockSupabaseChain.then.mockImplementation((onFulfilled) => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({ data: mockChangeOrder, error: null }).then(onFulfilled)
        }
        if (callCount === 2) {
          // First cost code has existing budget
          return Promise.resolve({ data: mockExistingBudget, error: null }).then(onFulfilled)
        }
        if (callCount === 3) {
          // Second cost code has no budget
          return Promise.resolve({ data: null, error: null }).then(onFulfilled)
        }
        return Promise.resolve({ data: null, error: null }).then(onFulfilled)
      })

      const preview = await changeOrderBudgetIntegration.previewBudgetImpact('co-123')

      expect(preview.total).toBe(25000)
      expect(preview.affected_cost_codes).toBe(2)
      expect(preview.new_budget_lines).toBe(1) // One existing, one new
      expect(preview.items).toHaveLength(2)
    })

    it('should throw error if change order not found during preview', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(
        changeOrderBudgetIntegration.previewBudgetImpact('invalid-co')
      ).rejects.toThrow('Change order not found')
    })

    it('should handle items without cost codes in preview', async () => {
      const mockChangeOrder = {
        id: 'co-123',
        project_id: 'proj-456',
        items: [
          {
            cost_code_id: null,
            total_amount: 5000,
            cost_code: null,
          },
        ],
      }

      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockChangeOrder, error: null }).then(onFulfilled)
      )

      const preview = await changeOrderBudgetIntegration.previewBudgetImpact('co-123')

      expect(preview.total).toBe(0) // Items without cost codes are skipped
      expect(preview.affected_cost_codes).toBe(0)
      expect(preview.items).toHaveLength(0)
    })
  })
})
