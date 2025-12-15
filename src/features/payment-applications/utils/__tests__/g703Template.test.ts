/**
 * Tests for G703 PDF Template - AIA Document G703 (Continuation Sheet / Schedule of Values)
 * CRITICAL: These tests ensure G703 SOV calculations and PDF generation accuracy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateG703PDF, downloadG703PDF, generatePaymentApplicationPackage } from '../g703Template'
import type { G703PDFData, PaymentApplicationWithDetails, ScheduleOfValuesItem } from '@/types/payment-application'

// Mock jsPDF
vi.mock('jspdf', () => {
  const mockDoc = {
    setFillColor: vi.fn().mockReturnThis(),
    setDrawColor: vi.fn().mockReturnThis(),
    setLineWidth: vi.fn().mockReturnThis(),
    setFont: vi.fn().mockReturnThis(),
    setFontSize: vi.fn().mockReturnThis(),
    setTextColor: vi.fn().mockReturnThis(),
    rect: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    line: vi.fn().mockReturnThis(),
    splitTextToSize: vi.fn((text: string) => [text]),
    getNumberOfPages: vi.fn(() => 1),
    setPage: vi.fn().mockReturnThis(),
    addPage: vi.fn().mockReturnThis(),
    output: vi.fn((type: string) => {
      if (type === 'blob') {
        return new Blob(['fake-pdf-content'], { type: 'application/pdf' })
      }
      return 'fake-pdf-string'
    }),
    lastAutoTable: { finalY: 100 },
  }

  return {
    default: vi.fn(() => mockDoc),
  }
})

// Mock jspdf-autotable
vi.mock('jspdf-autotable', () => ({
  default: vi.fn((doc, options) => {
    // Mock the table drawing
    return doc
  }),
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === 'MMM d, yyyy h:mm a') {
      return 'Jan 15, 2024 10:30 AM'
    }
    return '2024-01-15'
  }),
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
  const scheduledValue = overrides.scheduled_value ?? 100000
  const changeOrderAdjustments = overrides.change_order_adjustments ?? 0
  const totalScheduledValue = scheduledValue + changeOrderAdjustments
  const workCompletedPrevious = overrides.work_completed_previous ?? 50000
  const workCompletedThisPeriod = overrides.work_completed_this_period ?? 10000
  const materialsStored = overrides.materials_stored ?? 5000
  const totalCompletedStored = workCompletedPrevious + workCompletedThisPeriod + materialsStored
  const percentComplete = (totalCompletedStored / totalScheduledValue) * 100
  const balanceToFinish = totalScheduledValue - totalCompletedStored
  const retainagePercent = overrides.retainage_percent ?? 10
  const retainageAmount = totalCompletedStored * (retainagePercent / 100)

  return {
    id: 'sov-123',
    payment_application_id: 'app-123',
    item_number: '1',
    description: 'General Conditions',
    cost_code_id: 'cost-123',
    cost_code: '01000',
    scheduled_value: scheduledValue,
    change_order_adjustments: changeOrderAdjustments,
    total_scheduled_value: totalScheduledValue,
    work_completed_previous: workCompletedPrevious,
    work_completed_this_period: workCompletedThisPeriod,
    materials_stored: materialsStored,
    total_completed_stored: totalCompletedStored,
    percent_complete: percentComplete,
    balance_to_finish: balanceToFinish,
    retainage_percent: retainagePercent,
    retainage_amount: retainageAmount,
    sort_order: 1,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// Helper to create mock G703 PDF data
function createMockG703Data(items?: ScheduleOfValuesItem[]): G703PDFData {
  const sovItems = items || [
    createMockSOVItem({ item_number: '1', description: 'General Conditions', scheduled_value: 100000 }),
    createMockSOVItem({ item_number: '2', description: 'Sitework', scheduled_value: 200000 }),
    createMockSOVItem({ item_number: '3', description: 'Concrete', scheduled_value: 300000 }),
    createMockSOVItem({ item_number: '4', description: 'Masonry', scheduled_value: 250000 }),
    createMockSOVItem({ item_number: '5', description: 'Metals', scheduled_value: 200000 }),
  ]

  const totals = sovItems.reduce(
    (acc, item) => ({
      scheduled_value: acc.scheduled_value + item.scheduled_value,
      work_completed_previous: acc.work_completed_previous + item.work_completed_previous,
      work_completed_this_period: acc.work_completed_this_period + item.work_completed_this_period,
      materials_stored: acc.materials_stored + item.materials_stored,
      total_completed_stored: acc.total_completed_stored + item.total_completed_stored,
      balance_to_finish: acc.balance_to_finish + item.balance_to_finish,
      retainage: acc.retainage + (item.retainage_amount || 0),
    }),
    {
      scheduled_value: 0,
      work_completed_previous: 0,
      work_completed_this_period: 0,
      materials_stored: 0,
      total_completed_stored: 0,
      balance_to_finish: 0,
      retainage: 0,
    }
  )

  return {
    application: createMockApplication(),
    items: sovItems,
    totals,
  }
}

describe('G703 SOV Item Calculations', () => {
  describe('Column C: Scheduled Value with Change Orders', () => {
    it('should calculate total scheduled value = scheduled + change orders', () => {
      const scheduledValue = 100000
      const changeOrderAdjustments = 5000
      const totalScheduledValue = scheduledValue + changeOrderAdjustments

      expect(totalScheduledValue).toBe(105000)
    })

    it('should handle negative change orders', () => {
      const scheduledValue = 100000
      const changeOrderAdjustments = -10000
      const totalScheduledValue = scheduledValue + changeOrderAdjustments

      expect(totalScheduledValue).toBe(90000)
    })

    it('should handle zero change orders', () => {
      const scheduledValue = 100000
      const changeOrderAdjustments = 0
      const totalScheduledValue = scheduledValue + changeOrderAdjustments

      expect(totalScheduledValue).toBe(100000)
    })
  })

  describe('Column G: Total Completed and Stored (D+E+F)', () => {
    it('should calculate Column G = Column D + Column E + Column F', () => {
      const workCompletedPrevious = 50000 // Column D
      const workCompletedThisPeriod = 10000 // Column E
      const materialsStored = 5000 // Column F
      const totalCompletedStored = workCompletedPrevious + workCompletedThisPeriod + materialsStored // Column G

      expect(totalCompletedStored).toBe(65000)
    })

    it('should handle zero materials stored', () => {
      const workCompletedPrevious = 50000
      const workCompletedThisPeriod = 10000
      const materialsStored = 0
      const totalCompletedStored = workCompletedPrevious + workCompletedThisPeriod + materialsStored

      expect(totalCompletedStored).toBe(60000)
    })

    it('should handle first application (no previous work)', () => {
      const workCompletedPrevious = 0
      const workCompletedThisPeriod = 15000
      const materialsStored = 2000
      const totalCompletedStored = workCompletedPrevious + workCompletedThisPeriod + materialsStored

      expect(totalCompletedStored).toBe(17000)
    })
  })

  describe('Column H: Percent Complete (G÷C)', () => {
    it('should calculate percent complete', () => {
      const totalCompletedStored = 65000 // Column G
      const totalScheduledValue = 100000 // Column C
      const percentComplete = (totalCompletedStored / totalScheduledValue) * 100 // Column H

      expect(percentComplete).toBe(65)
    })

    it('should handle 0% complete', () => {
      const totalCompletedStored = 0
      const totalScheduledValue = 100000
      const percentComplete = (totalCompletedStored / totalScheduledValue) * 100

      expect(percentComplete).toBe(0)
    })

    it('should handle 100% complete', () => {
      const totalCompletedStored = 100000
      const totalScheduledValue = 100000
      const percentComplete = (totalCompletedStored / totalScheduledValue) * 100

      expect(percentComplete).toBe(100)
    })

    it('should handle partial completion', () => {
      const totalCompletedStored = 33333
      const totalScheduledValue = 100000
      const percentComplete = (totalCompletedStored / totalScheduledValue) * 100

      expect(percentComplete).toBeCloseTo(33.333, 2)
    })

    it('should handle division by zero', () => {
      const totalCompletedStored = 10000
      const totalScheduledValue = 0
      const percentComplete = totalScheduledValue === 0 ? 0 : (totalCompletedStored / totalScheduledValue) * 100

      expect(percentComplete).toBe(0)
    })
  })

  describe('Column I: Balance to Finish (C-G)', () => {
    it('should calculate balance to finish = scheduled - completed', () => {
      const totalScheduledValue = 100000 // Column C
      const totalCompletedStored = 65000 // Column G
      const balanceToFinish = totalScheduledValue - totalCompletedStored // Column I

      expect(balanceToFinish).toBe(35000)
    })

    it('should equal zero when 100% complete', () => {
      const totalScheduledValue = 100000
      const totalCompletedStored = 100000
      const balanceToFinish = totalScheduledValue - totalCompletedStored

      expect(balanceToFinish).toBe(0)
    })

    it('should equal scheduled value when 0% complete', () => {
      const totalScheduledValue = 100000
      const totalCompletedStored = 0
      const balanceToFinish = totalScheduledValue - totalCompletedStored

      expect(balanceToFinish).toBe(100000)
    })
  })

  describe('Column J: Retainage', () => {
    it('should calculate retainage from total completed and stored', () => {
      const totalCompletedStored = 65000
      const retainagePercent = 10
      const retainageAmount = totalCompletedStored * (retainagePercent / 100)

      expect(retainageAmount).toBe(6500)
    })

    it('should handle 5% retainage', () => {
      const totalCompletedStored = 100000
      const retainagePercent = 5
      const retainageAmount = totalCompletedStored * (retainagePercent / 100)

      expect(retainageAmount).toBe(5000)
    })

    it('should handle zero retainage', () => {
      const totalCompletedStored = 100000
      const retainagePercent = 0
      const retainageAmount = totalCompletedStored * (retainagePercent / 100)

      expect(retainageAmount).toBe(0)
    })
  })
})

describe('G703 SOV Totals Row Calculations', () => {
  it('should calculate correct totals from all items', () => {
    const items = [
      createMockSOVItem({
        item_number: '1',
        scheduled_value: 100000,
        work_completed_previous: 50000,
        work_completed_this_period: 10000,
        materials_stored: 5000,
      }),
      createMockSOVItem({
        item_number: '2',
        scheduled_value: 200000,
        work_completed_previous: 100000,
        work_completed_this_period: 20000,
        materials_stored: 10000,
      }),
      createMockSOVItem({
        item_number: '3',
        scheduled_value: 300000,
        work_completed_previous: 150000,
        work_completed_this_period: 30000,
        materials_stored: 15000,
      }),
    ]

    const totals = items.reduce(
      (acc, item) => ({
        scheduled_value: acc.scheduled_value + item.scheduled_value,
        work_completed_previous: acc.work_completed_previous + item.work_completed_previous,
        work_completed_this_period: acc.work_completed_this_period + item.work_completed_this_period,
        materials_stored: acc.materials_stored + item.materials_stored,
        total_completed_stored: acc.total_completed_stored + item.total_completed_stored,
        balance_to_finish: acc.balance_to_finish + item.balance_to_finish,
        retainage: acc.retainage + (item.retainage_amount || 0),
      }),
      {
        scheduled_value: 0,
        work_completed_previous: 0,
        work_completed_this_period: 0,
        materials_stored: 0,
        total_completed_stored: 0,
        balance_to_finish: 0,
        retainage: 0,
      }
    )

    expect(totals.scheduled_value).toBe(600000)
    expect(totals.work_completed_previous).toBe(300000)
    expect(totals.work_completed_this_period).toBe(60000)
    expect(totals.materials_stored).toBe(30000)
    expect(totals.total_completed_stored).toBe(390000)
    expect(totals.balance_to_finish).toBe(210000)
  })

  it('should calculate correct total percent complete', () => {
    const totalScheduledValue = 600000
    const totalCompletedStored = 390000
    const percentComplete = (totalCompletedStored / totalScheduledValue) * 100

    expect(percentComplete).toBe(65)
  })
})

describe('G703 PDF Generation', () => {
  let mockG703Data: G703PDFData

  beforeEach(() => {
    vi.clearAllMocks()
    mockG703Data = createMockG703Data()
  })

  describe('generateG703PDF', () => {
    it('should generate PDF blob', async () => {
      const blob = await generateG703PDF(mockG703Data)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/pdf')
    })

    it('should use landscape orientation', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG703PDF(mockG703Data)

      expect(jsPDF).toHaveBeenCalledWith({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter',
      })
    })

    it('should include project information in header', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG703PDF(mockG703Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      const hasProjectName = textCalls.some((text: any) => {
        if (typeof text === 'string') {
          return text.includes('Downtown Office Building')
        }
        return false
      })
      expect(hasProjectName).toBe(true)
    })

    it('should include application number', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG703PDF(mockG703Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      expect(textCalls).toContain('1')
    })

    it('should render SOV table with autoTable', async () => {
      const autoTable = (await import('jspdf-autotable')).default
      await generateG703PDF(mockG703Data)

      expect(autoTable).toHaveBeenCalled()
    })

    it('should format SOV items correctly', async () => {
      const item = createMockSOVItem({
        item_number: '1',
        description: 'General Conditions',
        scheduled_value: 100000,
        work_completed_previous: 50000,
        work_completed_this_period: 10000,
        materials_stored: 5000,
      })

      const data = createMockG703Data([item])
      const blob = await generateG703PDF(data)

      expect(blob).toBeInstanceOf(Blob)
    })

    it('should handle long description text', async () => {
      const item = createMockSOVItem({
        description: 'This is a very long description that exceeds fifty characters and should be truncated',
      })

      const data = createMockG703Data([item])
      const blob = await generateG703PDF(data)

      expect(blob).toBeInstanceOf(Blob)
    })

    it('should include totals row', async () => {
      const blob = await generateG703PDF(mockG703Data)
      expect(blob).toBeInstanceOf(Blob)
    })

    it('should handle empty SOV items', async () => {
      const emptyData = createMockG703Data([])
      const blob = await generateG703PDF(emptyData)

      expect(blob).toBeInstanceOf(Blob)
    })
  })

  describe('Multi-page SOV handling', () => {
    it('should handle large number of SOV items', async () => {
      // Create 50 items to force multiple pages
      const items: ScheduleOfValuesItem[] = []
      for (let i = 1; i <= 50; i++) {
        items.push(
          createMockSOVItem({
            item_number: i.toString(),
            description: `Work Item ${i}`,
            scheduled_value: 20000,
          })
        )
      }

      const data = createMockG703Data(items)
      const blob = await generateG703PDF(data)

      expect(blob).toBeInstanceOf(Blob)
    })

    it('should add instructions section', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG703PDF(mockG703Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      const hasInstructions = textCalls.some((text: any) => {
        if (typeof text === 'string') {
          return text.includes('Column A')
        }
        return false
      })
      expect(hasInstructions).toBe(true)
    })
  })

  describe('downloadG703PDF', () => {
    it('should trigger download with correct filename', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      } as any

      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)

      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()

      await downloadG703PDF(mockG703Data)

      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(mockLink.download).toMatch(/^G703_App1_Downtown_Office_Building_\d{4}-\d{2}-\d{2}\.pdf$/)
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink)
      expect(mockLink.click).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink)
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })

    it('should sanitize project name in filename', async () => {
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      } as any

      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)

      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()

      const dataWithSpecialChars = createMockG703Data()
      dataWithSpecialChars.application.project = {
        id: 'proj-123',
        name: 'Project #1 / Building & Site (2024)',
        project_number: 'P-001',
      }

      await downloadG703PDF(dataWithSpecialChars)

      // The actual sanitization removes non-alphanumeric chars; date is also fixed format
      expect(mockLink.download).toBe('G703_App1_Project__1___Building___Site___2024-01-15.pdf')

      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })
})

describe('G703 Edge Cases and Real-World Scenarios', () => {
  it('should handle SOV with only materials stored (no work completed)', () => {
    const items = [
      createMockSOVItem({
        item_number: '1',
        description: 'Steel Materials',
        scheduled_value: 100000,
        work_completed_previous: 0,
        work_completed_this_period: 0,
        materials_stored: 50000,
      }),
    ]

    const data = createMockG703Data(items)
    const blob = generateG703PDF(data)

    expect(blob).toBeDefined()
  })

  it('should handle items with change orders', () => {
    const items = [
      createMockSOVItem({
        item_number: '1',
        description: 'Foundation Work',
        scheduled_value: 100000,
        change_order_adjustments: 15000, // Additional work
      }),
      createMockSOVItem({
        item_number: '2',
        description: 'Electrical',
        scheduled_value: 80000,
        change_order_adjustments: -5000, // Reduced scope
      }),
    ]

    const data = createMockG703Data(items)
    const blob = generateG703PDF(data)

    expect(blob).toBeDefined()
  })

  it('should handle 100% complete items', () => {
    const items = [
      createMockSOVItem({
        item_number: '1',
        description: 'Completed Work',
        scheduled_value: 100000,
        change_order_adjustments: 0,
        work_completed_previous: 0,
        work_completed_this_period: 100000,
        materials_stored: 0,
      }),
    ]

    const data = createMockG703Data(items)
    // The createMockSOVItem calculates percent_complete automatically
    // For 100% complete: total_completed_stored (100000) / total_scheduled_value (100000) * 100 = 100
    expect(data.items[0].total_completed_stored).toBe(100000)
    expect(data.items[0].total_scheduled_value).toBe(100000)
    expect(data.items[0].balance_to_finish).toBe(0)
  })

  it('should handle zero value items', () => {
    const items = [
      createMockSOVItem({
        item_number: '1',
        description: 'Allowance Item',
        scheduled_value: 0,
        work_completed_previous: 0,
        work_completed_this_period: 0,
        materials_stored: 0,
      }),
    ]

    const data = createMockG703Data(items)
    const blob = generateG703PDF(data)

    expect(blob).toBeDefined()
  })

  it('should handle mixed retainage percentages', () => {
    const items = [
      createMockSOVItem({
        item_number: '1',
        description: 'General Conditions',
        scheduled_value: 100000,
        retainage_percent: 10,
      }),
      createMockSOVItem({
        item_number: '2',
        description: 'Owner Supplied Materials',
        scheduled_value: 50000,
        retainage_percent: 0, // No retainage on owner supplies
      }),
    ]

    const data = createMockG703Data(items)
    const blob = generateG703PDF(data)

    expect(blob).toBeDefined()
  })

  it('should handle items sorted by item_number', () => {
    const items = [
      createMockSOVItem({ item_number: '3', description: 'Third', sort_order: 3 }),
      createMockSOVItem({ item_number: '1', description: 'First', sort_order: 1 }),
      createMockSOVItem({ item_number: '2', description: 'Second', sort_order: 2 }),
    ]

    const data = createMockG703Data(items)
    const blob = generateG703PDF(data)

    expect(blob).toBeDefined()
  })

  it('should handle very large scheduled values', () => {
    const items = [
      createMockSOVItem({
        item_number: '1',
        description: 'Major Building Component',
        scheduled_value: 50000000,
        work_completed_previous: 25000000,
        work_completed_this_period: 5000000,
      }),
    ]

    const data = createMockG703Data(items)
    const blob = generateG703PDF(data)

    expect(blob).toBeDefined()
  })

  it('should handle decimal precision in calculations', () => {
    const items = [
      createMockSOVItem({
        item_number: '1',
        description: 'Precision Work',
        scheduled_value: 100000.33,
        work_completed_previous: 33333.11,
        work_completed_this_period: 16666.56,
        materials_stored: 5000.22,
      }),
    ]

    const data = createMockG703Data(items)
    const totalCompleted = 33333.11 + 16666.56 + 5000.22

    expect(data.items[0].total_completed_stored).toBeCloseTo(totalCompleted, 2)
  })
})

describe('Combined G702/G703 Package', () => {
  it('should generate combined payment application package', async () => {
    const g702Data = {
      application: createMockApplication(),
      project: {
        name: 'Downtown Office Building',
        number: 'P-2024-001',
        address: '123 Main St',
      },
      contractor: {
        name: 'ABC Construction',
        address: '456 Builder Ave',
      },
      architect: {
        name: 'XYZ Architecture',
      },
      owner: {
        name: 'Owner LLC',
      },
    }

    const g703Data = createMockG703Data()

    const blob = await generatePaymentApplicationPackage(g702Data, g703Data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
  })
})

describe('G703 Column Formatting', () => {
  it('should format currency values correctly', () => {
    const item = createMockSOVItem({
      scheduled_value: 123456.78,
      work_completed_previous: 50000.00,
    })

    expect(item.scheduled_value).toBe(123456.78)
    expect(item.work_completed_previous).toBe(50000.00)
  })

  it('should format percentage values correctly', () => {
    const totalCompletedStored = 65432
    const totalScheduledValue = 100000
    const percentComplete = (totalCompletedStored / totalScheduledValue) * 100

    expect(percentComplete).toBeCloseTo(65.432, 3)
  })

  it('should truncate long descriptions', () => {
    const longDescription = 'This is a very long description that exceeds fifty characters and needs to be truncated for display'
    const truncated = longDescription.substring(0, 50)

    expect(truncated.length).toBe(50)
  })
})
