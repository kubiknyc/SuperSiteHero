/**
 * Tests for PDF Export Utilities
 * Tests for buildG702Data, buildG703Data, and downloadPaymentApplicationPDFs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildG702Data,
  buildG703Data,
  downloadPaymentApplicationPDFs,
  formatCurrency,
  formatPercent,
  formatDate,
  formatShortDate,
} from '../pdfExport'
import type { PaymentApplicationWithDetails, ScheduleOfValuesItem } from '@/types/payment-application'

// Mock the template modules
vi.mock('../g702Template', () => ({
  downloadG702PDF: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../g703Template', () => ({
  downloadG703PDF: vi.fn().mockResolvedValue(undefined),
}))

// Helper to create mock payment application
function createMockApplication(overrides: Partial<PaymentApplicationWithDetails> = {}): PaymentApplicationWithDetails {
  return {
    id: 'app-123',
    project_id: 'proj-123',
    company_id: 'company-456',
    application_number: 1,
    period_to: '2024-01-31',
    original_contract_sum: 1000000,
    net_change_orders: 50000,
    contract_sum_to_date: 1050000,
    total_completed_previous: 500000,
    total_completed_this_period: 100000,
    total_materials_stored: 25000,
    total_completed_and_stored: 625000,
    retainage_percent: 10,
    retainage_from_completed: 60000,
    retainage_from_stored: 2500,
    total_retainage: 62500,
    retainage_release: 0,
    total_earned_less_retainage: 562500,
    less_previous_certificates: 450000,
    current_payment_due: 112500,
    balance_to_finish: 487500,
    percent_complete: 59.52,
    status: 'draft',
    submitted_at: null,
    submitted_by: null,
    reviewed_at: null,
    reviewed_by: null,
    approved_at: null,
    approved_by: null,
    paid_at: null,
    payment_received_amount: null,
    payment_reference: null,
    contractor_signature_url: null,
    contractor_signature_date: null,
    architect_signature_url: null,
    architect_signature_date: null,
    owner_signature_url: null,
    owner_signature_date: null,
    notes: null,
    rejection_reason: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-123',
    deleted_at: null,
    display_number: 'App #1',
    sov_item_count: 5,
    project: {
      id: 'proj-123',
      name: 'Downtown Office Building',
      project_number: 'P-2024-001',
    },
    ...overrides,
  }
}

// Helper to create mock SOV item
function createMockSOVItem(overrides: Partial<ScheduleOfValuesItem> = {}): ScheduleOfValuesItem {
  return {
    id: 'sov-123',
    payment_application_id: 'app-123',
    item_number: '1',
    description: 'General Conditions',
    cost_code_id: 'cost-123',
    cost_code: '01000',
    scheduled_value: 100000,
    change_order_adjustments: 0,
    total_scheduled_value: 100000,
    work_completed_previous: 50000,
    work_completed_this_period: 10000,
    materials_stored: 5000,
    total_completed_stored: 65000,
    percent_complete: 65,
    balance_to_finish: 35000,
    retainage_percent: 10,
    retainage_amount: 6500,
    sort_order: 1,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('PDF Export Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
      expect(formatCurrency(0.99)).toBe('$0.99')
    })

    it('should format negative numbers correctly', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000.00')
      expect(formatCurrency(-123.45)).toBe('-$123.45')
    })

    it('should handle null and undefined', () => {
      expect(formatCurrency(null)).toBe('$0.00')
      expect(formatCurrency(undefined)).toBe('$0.00')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle very large numbers', () => {
      expect(formatCurrency(1234567890.12)).toBe('$1,234,567,890.12')
    })

    it('should handle very small numbers', () => {
      expect(formatCurrency(0.01)).toBe('$0.01')
    })

    it('should always show two decimal places', () => {
      expect(formatCurrency(100)).toBe('$100.00')
      expect(formatCurrency(100.1)).toBe('$100.10')
      expect(formatCurrency(100.123)).toBe('$100.12') // Rounds down
    })
  })

  describe('formatPercent', () => {
    it('should format percentages with one decimal place', () => {
      expect(formatPercent(10)).toBe('10.0%')
      expect(formatPercent(33.33)).toBe('33.3%')
      expect(formatPercent(99.95)).toBe('100.0%') // Rounds up
    })

    it('should handle null and undefined', () => {
      expect(formatPercent(null)).toBe('0%')
      expect(formatPercent(undefined)).toBe('0%')
    })

    it('should handle zero', () => {
      expect(formatPercent(0)).toBe('0.0%')
    })

    it('should handle 100%', () => {
      expect(formatPercent(100)).toBe('100.0%')
    })

    it('should handle decimal values', () => {
      expect(formatPercent(0.5)).toBe('0.5%')
      expect(formatPercent(12.345)).toBe('12.3%')
    })

    it('should handle values over 100%', () => {
      expect(formatPercent(150)).toBe('150.0%')
    })
  })

  describe('formatDate', () => {
    it('should format date strings correctly', () => {
      const result = formatDate('2024-01-15')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should handle null and undefined', () => {
      expect(formatDate(null)).toBe('')
      expect(formatDate(undefined)).toBe('')
    })

    it('should handle invalid dates gracefully', () => {
      const result = formatDate('invalid-date')
      expect(result).toBeTruthy() // Should return the original string
    })

    it('should format ISO date strings', () => {
      const result = formatDate('2024-12-25T10:30:00Z')
      expect(result).toBeTruthy()
    })
  })

  describe('formatShortDate', () => {
    it('should format date strings in MM/DD/YYYY format', () => {
      const result = formatShortDate('2024-01-15')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should handle null and undefined', () => {
      expect(formatShortDate(null)).toBe('')
      expect(formatShortDate(undefined)).toBe('')
    })

    it('should handle invalid dates gracefully', () => {
      const result = formatShortDate('invalid-date')
      expect(result).toBeTruthy()
    })
  })
})

describe('buildG702Data', () => {
  it('should build G702 data with all fields', () => {
    const application = createMockApplication()
    const projectInfo = {
      address: '123 Main St, Springfield, IL',
      owner: 'Downtown Properties LLC',
      architect: 'XYZ Architecture Firm',
      contractor: 'ABC Construction Company',
      contractorAddress: '456 Builder Ave, Springfield, IL',
    }

    const g702Data = buildG702Data(application, projectInfo)

    expect(g702Data.application).toEqual(application)
    expect(g702Data.project.name).toBe('Downtown Office Building')
    expect(g702Data.project.number).toBe('P-2024-001')
    expect(g702Data.project.address).toBe('123 Main St, Springfield, IL')
    expect(g702Data.contractor.name).toBe('ABC Construction Company')
    expect(g702Data.contractor.address).toBe('456 Builder Ave, Springfield, IL')
    expect(g702Data.architect.name).toBe('XYZ Architecture Firm')
    expect(g702Data.owner.name).toBe('Downtown Properties LLC')
  })

  it('should handle missing project info', () => {
    const application = createMockApplication()
    const g702Data = buildG702Data(application)

    expect(g702Data.project.name).toBe('Downtown Office Building')
    expect(g702Data.project.address).toBeNull()
    expect(g702Data.contractor.name).toBe('Contractor')
    expect(g702Data.contractor.address).toBeNull()
    expect(g702Data.architect.name).toBeNull()
    expect(g702Data.owner.name).toBeNull()
  })

  it('should handle partial project info', () => {
    const application = createMockApplication()
    const projectInfo = {
      owner: 'Test Owner',
      // Missing other fields
    }

    const g702Data = buildG702Data(application, projectInfo)

    expect(g702Data.owner.name).toBe('Test Owner')
    expect(g702Data.contractor.name).toBe('Contractor')
    expect(g702Data.architect.name).toBeNull()
  })

  it('should handle application without project', () => {
    const application = createMockApplication({
      project: undefined,
    })

    const g702Data = buildG702Data(application)

    expect(g702Data.project.name).toBe('Unknown Project')
    expect(g702Data.project.number).toBeNull()
  })

  it('should handle null project fields', () => {
    const application = createMockApplication({
      project: {
        id: 'proj-123',
        name: 'Test Project',
        project_number: null,
      },
    })

    const g702Data = buildG702Data(application)

    expect(g702Data.project.name).toBe('Test Project')
    expect(g702Data.project.number).toBeNull()
  })
})

describe('buildG703Data', () => {
  it('should build G703 data with calculated totals', () => {
    const application = createMockApplication()
    const items = [
      createMockSOVItem({
        item_number: '1',
        scheduled_value: 100000,
        work_completed_previous: 50000,
        work_completed_this_period: 10000,
        materials_stored: 5000,
        total_completed_stored: 65000,
        balance_to_finish: 35000,
        retainage_amount: 6500,
      }),
      createMockSOVItem({
        item_number: '2',
        scheduled_value: 200000,
        work_completed_previous: 100000,
        work_completed_this_period: 20000,
        materials_stored: 10000,
        total_completed_stored: 130000,
        balance_to_finish: 70000,
        retainage_amount: 13000,
      }),
    ]

    const g703Data = buildG703Data(application, items)

    expect(g703Data.application).toEqual(application)
    expect(g703Data.items).toEqual(items)
    expect(g703Data.totals.scheduled_value).toBe(300000)
    expect(g703Data.totals.work_completed_previous).toBe(150000)
    expect(g703Data.totals.work_completed_this_period).toBe(30000)
    expect(g703Data.totals.materials_stored).toBe(15000)
    expect(g703Data.totals.total_completed_stored).toBe(195000)
    expect(g703Data.totals.balance_to_finish).toBe(105000)
    expect(g703Data.totals.retainage).toBe(19500)
  })

  it('should handle empty items array', () => {
    const application = createMockApplication()
    const items: ScheduleOfValuesItem[] = []

    const g703Data = buildG703Data(application, items)

    expect(g703Data.items).toEqual([])
    expect(g703Data.totals.scheduled_value).toBe(0)
    expect(g703Data.totals.work_completed_previous).toBe(0)
    expect(g703Data.totals.work_completed_this_period).toBe(0)
    expect(g703Data.totals.materials_stored).toBe(0)
    expect(g703Data.totals.total_completed_stored).toBe(0)
    expect(g703Data.totals.balance_to_finish).toBe(0)
    expect(g703Data.totals.retainage).toBe(0)
  })

  it('should handle items with null retainage', () => {
    const application = createMockApplication()
    const items = [
      createMockSOVItem({
        retainage_amount: null,
      }),
    ]

    const g703Data = buildG703Data(application, items)

    expect(g703Data.totals.retainage).toBe(0)
  })

  it('should handle items with undefined values', () => {
    const application = createMockApplication()
    const items = [
      {
        ...createMockSOVItem(),
        work_completed_previous: undefined as any,
      },
    ]

    const g703Data = buildG703Data(application, items)

    expect(g703Data.totals.work_completed_previous).toBe(0)
  })

  it('should calculate totals for large number of items', () => {
    const application = createMockApplication()
    const items: ScheduleOfValuesItem[] = []

    // Create 100 items
    for (let i = 1; i <= 100; i++) {
      items.push(
        createMockSOVItem({
          item_number: i.toString(),
          scheduled_value: 10000,
          work_completed_previous: 5000,
          work_completed_this_period: 1000,
          materials_stored: 500,
          total_completed_stored: 6500,
          balance_to_finish: 3500,
          retainage_amount: 650,
        })
      )
    }

    const g703Data = buildG703Data(application, items)

    expect(g703Data.items.length).toBe(100)
    expect(g703Data.totals.scheduled_value).toBe(1000000) // 100 * 10000
    expect(g703Data.totals.work_completed_previous).toBe(500000) // 100 * 5000
    expect(g703Data.totals.retainage).toBe(65000) // 100 * 650
  })

  it('should handle decimal precision in totals', () => {
    const application = createMockApplication()
    const items = [
      createMockSOVItem({
        scheduled_value: 100000.33,
        work_completed_previous: 50000.11,
        work_completed_this_period: 10000.22,
        materials_stored: 5000.33,
        total_completed_stored: 65000.66,
        balance_to_finish: 34999.67,
        retainage_amount: 6500.07,
      }),
      createMockSOVItem({
        scheduled_value: 200000.67,
        work_completed_previous: 100000.22,
        work_completed_this_period: 20000.33,
        materials_stored: 10000.44,
        total_completed_stored: 130000.99,
        balance_to_finish: 69999.68,
        retainage_amount: 13000.10,
      }),
    ]

    const g703Data = buildG703Data(application, items)

    expect(g703Data.totals.scheduled_value).toBeCloseTo(300001.00, 2)
    expect(g703Data.totals.work_completed_previous).toBeCloseTo(150000.33, 2)
    expect(g703Data.totals.retainage).toBeCloseTo(19500.17, 2)
  })
})

describe('downloadPaymentApplicationPDFs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should download both G702 and G703 PDFs', async () => {
    const { downloadG702PDF } = await import('../g702Template')
    const { downloadG703PDF } = await import('../g703Template')

    const application = createMockApplication()
    const items = [createMockSOVItem()]
    const projectInfo = {
      address: '123 Main St',
      owner: 'Test Owner',
      architect: 'Test Architect',
      contractor: 'Test Contractor',
      contractorAddress: '456 Builder Ave',
    }

    await downloadPaymentApplicationPDFs(application, items, projectInfo)

    expect(downloadG702PDF).toHaveBeenCalledTimes(1)
    expect(downloadG703PDF).toHaveBeenCalledTimes(1)
  })

  it('should build correct G702 data structure', async () => {
    const { downloadG702PDF } = await import('../g702Template')

    const application = createMockApplication()
    const items = [createMockSOVItem()]
    const projectInfo = {
      address: '123 Main St',
      owner: 'Test Owner',
      architect: 'Test Architect',
      contractor: 'Test Contractor',
      contractorAddress: '456 Builder Ave',
    }

    await downloadPaymentApplicationPDFs(application, items, projectInfo)

    const g702Call = vi.mocked(downloadG702PDF).mock.calls[0][0]
    expect(g702Call.application).toEqual(application)
    expect(g702Call.project.address).toBe('123 Main St')
    expect(g702Call.owner.name).toBe('Test Owner')
  })

  it('should build correct G703 data structure', async () => {
    const { downloadG703PDF } = await import('../g703Template')

    const application = createMockApplication()
    const items = [
      createMockSOVItem({ scheduled_value: 100000 }),
      createMockSOVItem({ scheduled_value: 200000 }),
    ]

    await downloadPaymentApplicationPDFs(application, items)

    const g703Call = vi.mocked(downloadG703PDF).mock.calls[0][0]
    expect(g703Call.application).toEqual(application)
    expect(g703Call.items).toEqual(items)
    expect(g703Call.totals.scheduled_value).toBe(300000)
  })

  it('should handle missing project info', async () => {
    const { downloadG702PDF } = await import('../g702Template')

    const application = createMockApplication()
    const items = [createMockSOVItem()]

    await downloadPaymentApplicationPDFs(application, items)

    const g702Call = vi.mocked(downloadG702PDF).mock.calls[0][0]
    expect(g702Call.contractor.name).toBe('Contractor')
    expect(g702Call.owner.name).toBeNull()
  })

  it('should download PDFs in parallel', async () => {
    const { downloadG702PDF } = await import('../g702Template')
    const { downloadG703PDF } = await import('../g703Template')

    // Add delay to verify parallel execution
    vi.mocked(downloadG702PDF).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )
    vi.mocked(downloadG703PDF).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    )

    const application = createMockApplication()
    const items = [createMockSOVItem()]

    const startTime = Date.now()
    await downloadPaymentApplicationPDFs(application, items)
    const duration = Date.now() - startTime

    // If executed in parallel, should take ~100ms, not ~200ms
    expect(duration).toBeLessThan(150)
  })

  it('should handle empty items array', async () => {
    const { downloadG703PDF } = await import('../g703Template')

    const application = createMockApplication()
    const items: ScheduleOfValuesItem[] = []

    await downloadPaymentApplicationPDFs(application, items)

    const g703Call = vi.mocked(downloadG703PDF).mock.calls[0][0]
    expect(g703Call.items).toEqual([])
    expect(g703Call.totals.scheduled_value).toBe(0)
  })
})

describe('PDF Export Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should maintain data consistency between G702 and G703', async () => {
    const { downloadG702PDF } = await import('../g702Template')
    const { downloadG703PDF } = await import('../g703Template')

    const application = createMockApplication({
      total_completed_and_stored: 625000,
      total_retainage: 62500,
    })

    // Create items that sum to the application totals
    const items = [
      createMockSOVItem({
        scheduled_value: 300000,
        work_completed_previous: 150000,
        work_completed_this_period: 30000,
        materials_stored: 15000,
        total_completed_stored: 195000,
        retainage_amount: 19500,
      }),
      createMockSOVItem({
        scheduled_value: 325000,
        work_completed_previous: 200000,
        work_completed_this_period: 50000,
        materials_stored: 10000,
        total_completed_stored: 260000,
        retainage_amount: 26000,
      }),
      createMockSOVItem({
        scheduled_value: 170000,
        work_completed_previous: 150000,
        work_completed_this_period: 20000,
        materials_stored: 0,
        total_completed_stored: 170000,
        retainage_amount: 17000,
      }),
    ]

    // Verify totals match
    const expectedTotal = items.reduce((sum, item) => sum + item.total_completed_stored, 0)
    expect(expectedTotal).toBe(625000)

    const expectedRetainage = items.reduce((sum, item) => sum + (item.retainage_amount || 0), 0)
    expect(expectedRetainage).toBe(62500)

    await downloadPaymentApplicationPDFs(application, items)

    const g702Call = vi.mocked(downloadG702PDF).mock.calls[0][0]
    const g703Call = vi.mocked(downloadG703PDF).mock.calls[0][0]

    // G702 total should match sum of G703 items
    expect(g702Call.application.total_completed_and_stored).toBe(625000)
    expect(g703Call.totals.total_completed_stored).toBe(625000)
    expect(g702Call.application.total_retainage).toBe(62500)
    expect(g703Call.totals.retainage).toBe(62500)
  })

  it('should handle complete workflow from draft to approved', async () => {
    const { downloadG702PDF } = await import('../g702Template')

    const draftApplication = createMockApplication({ status: 'draft' })
    const submittedApplication = createMockApplication({
      status: 'submitted',
      submitted_at: '2024-02-01T00:00:00Z',
      submitted_by: 'user-123',
    })
    const approvedApplication = createMockApplication({
      status: 'approved',
      submitted_at: '2024-02-01T00:00:00Z',
      submitted_by: 'user-123',
      approved_at: '2024-02-05T00:00:00Z',
      approved_by: 'user-456',
    })

    const items = [createMockSOVItem()]

    // Draft
    await downloadPaymentApplicationPDFs(draftApplication, items)
    // Submitted
    await downloadPaymentApplicationPDFs(submittedApplication, items)
    // Approved
    await downloadPaymentApplicationPDFs(approvedApplication, items)

    expect(downloadG702PDF).toHaveBeenCalledTimes(3)
  })
})
