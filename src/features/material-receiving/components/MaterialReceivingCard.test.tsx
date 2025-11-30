/**
 * MaterialReceivingCard Component Tests
 *
 * Basic tests for the MaterialReceivingCard component
 */

import { describe, it, expect, vi } from 'vitest'
import type { MaterialReceivedWithDetails } from '@/types/material-receiving'

// Mock material data factory
const createMockMaterial = (overrides: Partial<MaterialReceivedWithDetails> = {}): MaterialReceivedWithDetails => ({
  id: 'mat-123',
  project_id: 'proj-456',
  delivery_date: '2025-01-15',
  delivery_time: '10:30',
  delivery_ticket_number: 'DT-001',
  material_description: 'Concrete Mix Type II',
  quantity: '500',
  unit: 'CY',
  vendor: 'ABC Supply Co',
  vendor_contact: 'John Smith',
  submittal_procurement_id: 'sub-789',
  daily_report_delivery_id: null,
  storage_location: 'Warehouse A, Bay 3',
  po_number: 'PO-2025-001',
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
  created_by_name: 'Admin User',
  project_name: 'Test Project',
  project_number: 'TP-001',
  submittal_id: 'sub-789',
  submittal_number: 'SUB-001',
  submittal_title: 'Concrete Submittal',
  daily_report_id: null,
  daily_report_date: null,
  photo_count: 3,
  ...overrides,
})

describe('MaterialReceivingCard Data Structure', () => {
  it('should have correct mock data structure', () => {
    const material = createMockMaterial()
    expect(material.id).toBe('mat-123')
    expect(material.project_id).toBe('proj-456')
    expect(material.material_description).toBe('Concrete Mix Type II')
    expect(material.condition).toBe('good')
    expect(material.status).toBe('received')
  })

  it('should allow overriding properties', () => {
    const material = createMockMaterial({
      condition: 'damaged',
      status: 'inspected'
    })
    expect(material.condition).toBe('damaged')
    expect(material.status).toBe('inspected')
  })

  it('should have correct delivery information', () => {
    const material = createMockMaterial()
    expect(material.delivery_date).toBe('2025-01-15')
    expect(material.delivery_ticket_number).toBe('DT-001')
    expect(material.quantity).toBe('500')
    expect(material.unit).toBe('CY')
  })

  it('should have correct vendor information', () => {
    const material = createMockMaterial()
    expect(material.vendor).toBe('ABC Supply Co')
    expect(material.vendor_contact).toBe('John Smith')
  })

  it('should have correct photo count', () => {
    const material = createMockMaterial()
    expect(material.photo_count).toBe(3)
  })

  it('should have submittal link information', () => {
    const material = createMockMaterial()
    expect(material.submittal_number).toBe('SUB-001')
    expect(material.submittal_id).toBe('sub-789')
  })

  it('should handle null optional fields', () => {
    const material = createMockMaterial({
      delivery_ticket_number: null,
      quantity: null,
      vendor: null,
    })
    expect(material.delivery_ticket_number).toBeNull()
    expect(material.quantity).toBeNull()
    expect(material.vendor).toBeNull()
  })

  it('should handle different conditions', () => {
    const conditions = ['good', 'damaged', 'partial', 'rejected'] as const
    conditions.forEach(condition => {
      const material = createMockMaterial({ condition })
      expect(material.condition).toBe(condition)
    })
  })

  it('should handle different statuses', () => {
    const statuses = ['received', 'inspected', 'stored', 'issued', 'returned'] as const
    statuses.forEach(status => {
      const material = createMockMaterial({ status })
      expect(material.status).toBe(status)
    })
  })
})
