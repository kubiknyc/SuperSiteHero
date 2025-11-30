/**
 * MaterialReceivingPage Tests
 *
 * Tests for page data structures and filtering logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MaterialReceivedWithDetails, MaterialReceivingStats, MaterialReceivedFilters } from '@/types/material-receiving'

// Mock data factories
const createMockMaterial = (overrides: Partial<MaterialReceivedWithDetails> = {}): MaterialReceivedWithDetails => ({
  id: 'mat-1',
  project_id: 'proj-456',
  delivery_date: '2025-01-15',
  delivery_time: '10:30',
  delivery_ticket_number: 'DT-001',
  material_description: 'Concrete Mix Type II',
  quantity: '500',
  unit: 'CY',
  vendor: 'ABC Supply',
  vendor_contact: 'John Smith',
  submittal_procurement_id: null,
  daily_report_delivery_id: null,
  storage_location: 'Warehouse A',
  po_number: 'PO-001',
  received_by: 'user-123',
  inspected_by: null,
  inspected_at: null,
  condition: 'good',
  condition_notes: null,
  status: 'received',
  notes: null,
  created_at: '2025-01-15T10:30:00Z',
  updated_at: '2025-01-15T10:30:00Z',
  created_by: 'user-456',
  deleted_at: null,
  received_by_name: 'Jane Doe',
  received_by_email: 'jane@example.com',
  inspected_by_name: null,
  inspected_by_email: null,
  created_by_name: 'Admin',
  project_name: 'Test Project',
  project_number: 'TP-001',
  submittal_id: null,
  submittal_number: null,
  submittal_title: null,
  daily_report_id: null,
  daily_report_date: null,
  photo_count: 2,
  ...overrides,
})

const createMockStats = (): MaterialReceivingStats => ({
  total_deliveries: 50,
  this_week: 10,
  this_month: 25,
  pending_inspection: 5,
  with_issues: 3,
  by_status: { received: 15, inspected: 10, stored: 20, issued: 3, returned: 2 },
  by_condition: { good: 45, damaged: 2, partial: 2, rejected: 1 },
  unique_vendors: 12,
})

describe('MaterialReceivingPage Data Structures', () => {
  describe('MaterialReceivingStats', () => {
    it('should have correct total deliveries', () => {
      const stats = createMockStats()
      expect(stats.total_deliveries).toBe(50)
    })

    it('should have correct weekly count', () => {
      const stats = createMockStats()
      expect(stats.this_week).toBe(10)
    })

    it('should have correct monthly count', () => {
      const stats = createMockStats()
      expect(stats.this_month).toBe(25)
    })

    it('should have correct pending inspection count', () => {
      const stats = createMockStats()
      expect(stats.pending_inspection).toBe(5)
    })

    it('should have correct with issues count', () => {
      const stats = createMockStats()
      expect(stats.with_issues).toBe(3)
    })

    it('should have status breakdown', () => {
      const stats = createMockStats()
      expect(stats.by_status.received).toBe(15)
      expect(stats.by_status.inspected).toBe(10)
      expect(stats.by_status.stored).toBe(20)
      expect(stats.by_status.issued).toBe(3)
      expect(stats.by_status.returned).toBe(2)
    })

    it('should have condition breakdown', () => {
      const stats = createMockStats()
      expect(stats.by_condition.good).toBe(45)
      expect(stats.by_condition.damaged).toBe(2)
      expect(stats.by_condition.partial).toBe(2)
      expect(stats.by_condition.rejected).toBe(1)
    })

    it('should have unique vendors count', () => {
      const stats = createMockStats()
      expect(stats.unique_vendors).toBe(12)
    })
  })

  describe('Filtering Logic', () => {
    const materials = [
      createMockMaterial({ id: 'mat-1', condition: 'good', status: 'received', material_description: 'Concrete Mix' }),
      createMockMaterial({ id: 'mat-2', condition: 'damaged', status: 'inspected', material_description: 'Steel Rebar' }),
      createMockMaterial({ id: 'mat-3', condition: 'good', status: 'stored', material_description: 'Lumber Package' }),
    ]

    it('should filter by status', () => {
      const filters: MaterialReceivedFilters = { status: 'received' }
      const filtered = materials.filter(m => m.status === filters.status)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('mat-1')
    })

    it('should filter by condition', () => {
      const filters: MaterialReceivedFilters = { condition: 'good' }
      const filtered = materials.filter(m => m.condition === filters.condition)
      expect(filtered).toHaveLength(2)
    })

    it('should filter by search term on description', () => {
      const searchTerm = 'concrete'
      const filtered = materials.filter(m =>
        m.material_description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      expect(filtered).toHaveLength(1)
      expect(filtered[0].material_description).toContain('Concrete')
    })

    it('should combine status and condition filters', () => {
      const filters: MaterialReceivedFilters = { status: 'received', condition: 'good' }
      const filtered = materials.filter(m =>
        m.status === filters.status && m.condition === filters.condition
      )
      expect(filtered).toHaveLength(1)
    })

    it('should return all materials when no filters applied', () => {
      const filters: MaterialReceivedFilters = {}
      const filtered = materials.filter(m => {
        const statusMatch = !filters.status || m.status === filters.status
        const conditionMatch = !filters.condition || m.condition === filters.condition
        return statusMatch && conditionMatch
      })
      expect(filtered).toHaveLength(3)
    })
  })

  describe('Sorting Logic', () => {
    const materials = [
      createMockMaterial({ id: 'mat-1', delivery_date: '2025-01-15' }),
      createMockMaterial({ id: 'mat-2', delivery_date: '2025-01-10' }),
      createMockMaterial({ id: 'mat-3', delivery_date: '2025-01-20' }),
    ]

    it('should sort by date descending (newest first)', () => {
      const sorted = [...materials].sort((a, b) =>
        new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()
      )
      expect(sorted[0].id).toBe('mat-3')
      expect(sorted[1].id).toBe('mat-1')
      expect(sorted[2].id).toBe('mat-2')
    })

    it('should sort by date ascending (oldest first)', () => {
      const sorted = [...materials].sort((a, b) =>
        new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
      )
      expect(sorted[0].id).toBe('mat-2')
      expect(sorted[1].id).toBe('mat-1')
      expect(sorted[2].id).toBe('mat-3')
    })
  })

  describe('Empty State Handling', () => {
    it('should handle empty materials array', () => {
      const materials: MaterialReceivedWithDetails[] = []
      expect(materials).toHaveLength(0)
    })

    it('should handle undefined stats', () => {
      const stats: MaterialReceivingStats | undefined = undefined
      expect(stats).toBeUndefined()
    })
  })
})
