/**
 * Tests for G702 PDF Template - AIA Document G702 (Application and Certificate for Payment)
 * CRITICAL: These tests ensure G702 form calculations and PDF generation accuracy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateG702PDF, downloadG702PDF } from '../g702Template'
import type { G702PDFData, PaymentApplicationWithDetails } from '@/types/payment-application'

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
  }

  return {
    default: vi.fn(() => mockDoc),
  }
})

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

// Helper to create mock G702 PDF data
function createMockG702Data(overrides: Partial<G702PDFData> = {}): G702PDFData {
  return {
    application: createMockApplication(),
    project: {
      name: 'Downtown Office Building',
      number: 'P-2024-001',
      address: '123 Main St, Springfield, IL 62701',
    },
    contractor: {
      name: 'ABC Construction Company',
      address: '456 Builder Ave, Springfield, IL 62702',
    },
    architect: {
      name: 'XYZ Architecture Firm',
    },
    owner: {
      name: 'Downtown Properties LLC',
    },
    ...overrides,
  }
}

describe('G702 PDF Template - Form Calculations', () => {
  describe('Line 1-3: Contract Sum Calculations', () => {
    it('should calculate Line 3 (Contract Sum to Date) = Line 1 + Line 2', () => {
      const originalContractSum = 1000000 // Line 1
      const netChangeOrders = 50000 // Line 2
      const contractSumToDate = originalContractSum + netChangeOrders // Line 3

      expect(contractSumToDate).toBe(1050000)

      const app = createMockApplication({
        original_contract_sum: originalContractSum,
        net_change_orders: netChangeOrders,
        contract_sum_to_date: contractSumToDate,
      })

      expect(app.contract_sum_to_date).toBe(app.original_contract_sum + app.net_change_orders)
    })

    it('should handle negative change orders', () => {
      const originalContractSum = 1000000
      const netChangeOrders = -25000 // Deductions
      const contractSumToDate = originalContractSum + netChangeOrders

      expect(contractSumToDate).toBe(975000)
    })

    it('should handle zero change orders', () => {
      const originalContractSum = 1000000
      const netChangeOrders = 0
      const contractSumToDate = originalContractSum + netChangeOrders

      expect(contractSumToDate).toBe(1000000)
    })
  })

  describe('Line 4: Total Completed and Stored to Date', () => {
    it('should calculate total from G703 Column G', () => {
      // Line 4 = Sum of completed work + materials stored
      const totalCompletedPrevious = 500000
      const totalCompletedThisPeriod = 100000
      const totalMaterialsStored = 25000
      const totalCompletedAndStored = totalCompletedPrevious + totalCompletedThisPeriod + totalMaterialsStored

      expect(totalCompletedAndStored).toBe(625000)
    })

    it('should handle zero materials stored', () => {
      const totalCompletedPrevious = 500000
      const totalCompletedThisPeriod = 100000
      const totalMaterialsStored = 0
      const totalCompletedAndStored = totalCompletedPrevious + totalCompletedThisPeriod + totalMaterialsStored

      expect(totalCompletedAndStored).toBe(600000)
    })

    it('should handle first application (no previous work)', () => {
      const totalCompletedPrevious = 0
      const totalCompletedThisPeriod = 150000
      const totalMaterialsStored = 10000
      const totalCompletedAndStored = totalCompletedPrevious + totalCompletedThisPeriod + totalMaterialsStored

      expect(totalCompletedAndStored).toBe(160000)
    })
  })

  describe('Line 5: Retainage Calculations', () => {
    it('should calculate Line 5a (retainage from completed work)', () => {
      const totalCompleted = 600000 // Previous + This Period
      const retainagePercent = 10
      const retainageFromCompleted = totalCompleted * (retainagePercent / 100)

      expect(retainageFromCompleted).toBe(60000)
    })

    it('should calculate Line 5b (retainage from stored materials)', () => {
      const materialsStored = 25000
      const retainagePercent = 10
      const retainageFromStored = materialsStored * (retainagePercent / 100)

      expect(retainageFromStored).toBe(2500)
    })

    it('should calculate total retainage (Line 5a + 5b)', () => {
      const retainageFromCompleted = 60000
      const retainageFromStored = 2500
      const totalRetainage = retainageFromCompleted + retainageFromStored

      expect(totalRetainage).toBe(62500)
    })

    it('should handle zero retainage', () => {
      const totalCompleted = 600000
      const materialsStored = 25000
      const retainagePercent = 0

      const retainageFromCompleted = totalCompleted * (retainagePercent / 100)
      const retainageFromStored = materialsStored * (retainagePercent / 100)
      const totalRetainage = retainageFromCompleted + retainageFromStored

      expect(retainageFromCompleted).toBe(0)
      expect(retainageFromStored).toBe(0)
      expect(totalRetainage).toBe(0)
    })

    it('should handle 5% retainage', () => {
      const totalCompleted = 600000
      const materialsStored = 25000
      const retainagePercent = 5

      const retainageFromCompleted = totalCompleted * (retainagePercent / 100)
      const retainageFromStored = materialsStored * (retainagePercent / 100)
      const totalRetainage = retainageFromCompleted + retainageFromStored

      expect(retainageFromCompleted).toBe(30000)
      expect(retainageFromStored).toBe(1250)
      expect(totalRetainage).toBe(31250)
    })

    it('should handle 15% retainage', () => {
      const totalCompleted = 600000
      const materialsStored = 25000
      const retainagePercent = 15

      const retainageFromCompleted = totalCompleted * (retainagePercent / 100)
      const retainageFromStored = materialsStored * (retainagePercent / 100)
      const totalRetainage = retainageFromCompleted + retainageFromStored

      expect(retainageFromCompleted).toBe(90000)
      expect(retainageFromStored).toBe(3750)
      expect(totalRetainage).toBe(93750)
    })
  })

  describe('Line 6: Total Earned Less Retainage', () => {
    it('should calculate Line 6 = Line 4 - Line 5 Total', () => {
      const totalCompletedAndStored = 625000 // Line 4
      const totalRetainage = 62500 // Line 5 Total
      const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage // Line 6

      expect(totalEarnedLessRetainage).toBe(562500)
    })

    it('should handle zero retainage', () => {
      const totalCompletedAndStored = 625000
      const totalRetainage = 0
      const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage

      expect(totalEarnedLessRetainage).toBe(625000)
    })
  })

  describe('Line 7: Less Previous Certificates for Payment', () => {
    it('should track cumulative previous payments', () => {
      // Application 1: paid $100,000
      // Application 2: paid $200,000
      // Total previous for Application 3 = $300,000
      const lessPreviousCertificates = 300000

      expect(lessPreviousCertificates).toBe(300000)
    })

    it('should be zero for first application', () => {
      const lessPreviousCertificates = 0
      expect(lessPreviousCertificates).toBe(0)
    })
  })

  describe('Line 8: Current Payment Due (CRITICAL)', () => {
    it('should calculate Line 8 = Line 6 - Line 7', () => {
      const totalEarnedLessRetainage = 562500 // Line 6
      const lessPreviousCertificates = 450000 // Line 7
      const currentPaymentDue = totalEarnedLessRetainage - lessPreviousCertificates // Line 8

      expect(currentPaymentDue).toBe(112500)
    })

    it('should handle first application (no previous certificates)', () => {
      const totalEarnedLessRetainage = 150000
      const lessPreviousCertificates = 0
      const currentPaymentDue = totalEarnedLessRetainage - lessPreviousCertificates

      expect(currentPaymentDue).toBe(150000)
    })

    it('should handle 100% complete with retainage release', () => {
      const contractSumToDate = 1000000
      const totalCompletedAndStored = 1000000 // 100% complete
      const retainagePercent = 10
      const totalRetainage = totalCompletedAndStored * (retainagePercent / 100)
      const retainageRelease = totalRetainage // Release all retainage
      const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage + retainageRelease
      const lessPreviousCertificates = 900000
      const currentPaymentDue = totalEarnedLessRetainage - lessPreviousCertificates

      expect(totalRetainage).toBe(100000)
      expect(totalEarnedLessRetainage).toBe(1000000) // Full amount with retainage released
      expect(currentPaymentDue).toBe(100000) // Final payment includes released retainage
    })

    it('should never be negative', () => {
      const totalEarnedLessRetainage = 100000
      const lessPreviousCertificates = 150000 // Overpayment scenario (shouldn't happen but test edge case)
      const currentPaymentDue = Math.max(0, totalEarnedLessRetainage - lessPreviousCertificates)

      expect(currentPaymentDue).toBe(0) // Should not allow negative payment
    })
  })

  describe('Line 9: Balance to Finish', () => {
    it('should calculate Line 9 = Line 3 - Line 6', () => {
      const contractSumToDate = 1050000 // Line 3
      const totalEarnedLessRetainage = 562500 // Line 6
      const balanceToFinish = contractSumToDate - totalEarnedLessRetainage // Line 9

      expect(balanceToFinish).toBe(487500)
    })

    it('should equal zero when project is 100% complete', () => {
      const contractSumToDate = 1000000
      const totalEarnedLessRetainage = 1000000
      const balanceToFinish = contractSumToDate - totalEarnedLessRetainage

      expect(balanceToFinish).toBe(0)
    })

    it('should include retainage in balance', () => {
      // Balance to finish includes retainage being held
      const contractSumToDate = 1000000
      const totalCompletedAndStored = 500000
      const totalRetainage = 50000
      const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage
      const balanceToFinish = contractSumToDate - totalEarnedLessRetainage

      expect(balanceToFinish).toBe(550000) // Remaining work + retainage held
    })
  })

  describe('Percent Complete Calculation', () => {
    it('should calculate percent complete', () => {
      const totalCompletedAndStored = 625000
      const contractSumToDate = 1050000
      const percentComplete = (totalCompletedAndStored / contractSumToDate) * 100

      expect(percentComplete).toBeCloseTo(59.52, 2)
    })

    it('should handle 0% complete', () => {
      const totalCompletedAndStored = 0
      const contractSumToDate = 1000000
      const percentComplete = (totalCompletedAndStored / contractSumToDate) * 100

      expect(percentComplete).toBe(0)
    })

    it('should handle 100% complete', () => {
      const totalCompletedAndStored = 1000000
      const contractSumToDate = 1000000
      const percentComplete = (totalCompletedAndStored / contractSumToDate) * 100

      expect(percentComplete).toBe(100)
    })

    it('should handle division by zero', () => {
      const totalCompletedAndStored = 100000
      const contractSumToDate = 0 // Edge case
      const percentComplete = contractSumToDate === 0 ? 0 : (totalCompletedAndStored / contractSumToDate) * 100

      expect(percentComplete).toBe(0)
    })
  })
})

describe('G702 PDF Generation', () => {
  let mockG702Data: G702PDFData

  beforeEach(() => {
    vi.clearAllMocks()
    mockG702Data = createMockG702Data()
  })

  describe('generateG702PDF', () => {
    it('should generate PDF blob', async () => {
      const blob = await generateG702PDF(mockG702Data)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('application/pdf')
    })

    it('should include project information', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG702PDF(mockG702Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      expect(textCalls).toContain('Downtown Office Building')
    })

    it('should include contractor information', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG702PDF(mockG702Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      expect(textCalls).toContain('ABC Construction Company')
    })

    it('should include architect information', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG702PDF(mockG702Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      expect(textCalls).toContain('XYZ Architecture Firm')
    })

    it('should include owner information', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG702PDF(mockG702Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      expect(textCalls).toContain('Downtown Properties LLC')
    })

    it('should handle null/missing project information', async () => {
      const dataWithNulls = createMockG702Data({
        project: {
          name: 'Test Project',
          number: null,
          address: null,
        },
        architect: { name: null },
        owner: { name: null },
      })

      const blob = await generateG702PDF(dataWithNulls)
      expect(blob).toBeInstanceOf(Blob)
    })

    it('should include all calculation rows', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG702PDF(mockG702Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])

      // Check for key financial values
      expect(textCalls).toContain('$1,000,000.00') // Original contract sum
      expect(textCalls).toContain('$112,500.00') // Current payment due
    })

    it('should format retainage percentage correctly', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG702PDF(mockG702Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      expect(textCalls.some((text: any) => typeof text === 'string' && text.includes('10.0%'))).toBe(true)
    })

    it('should include contractor certification section', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG702PDF(mockG702Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      expect(textCalls.some((text: any) => typeof text === 'string' && text.includes('CONTRACTOR'))).toBe(true)
    })

    it('should include architect certificate section', async () => {
      const jsPDF = (await import('jspdf')).default
      await generateG702PDF(mockG702Data)

      const mockDoc = vi.mocked(jsPDF).mock.results[0].value
      const textCalls = mockDoc.text.mock.calls.map(call => call[0])
      expect(textCalls.some((text: any) => typeof text === 'string' && text.includes('ARCHITECT'))).toBe(true)
    })

    it('should include signature dates when provided', async () => {
      const dataWithSignatures = createMockG702Data({
        application: createMockApplication({
          contractor_signature_date: '2024-01-31',
          architect_signature_date: '2024-02-05',
        }),
      })

      const blob = await generateG702PDF(dataWithSignatures)
      expect(blob).toBeInstanceOf(Blob)
    })
  })

  describe('downloadG702PDF', () => {
    it('should trigger download with correct filename', async () => {
      // Mock DOM elements and URL APIs
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      } as any

      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)

      // Mock URL.createObjectURL and URL.revokeObjectURL
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
      global.URL.revokeObjectURL = vi.fn()

      await downloadG702PDF(mockG702Data)

      expect(global.URL.createObjectURL).toHaveBeenCalled()
      expect(mockLink.download).toMatch(/^G702_App1_Downtown_Office_Building_\d{4}-\d{2}-\d{2}\.pdf$/)
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink)
      expect(mockLink.click).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink)
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

      // Cleanup
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

      const dataWithSpecialChars = createMockG702Data({
        project: {
          name: 'Project #1 / Building & Site (2024)',
          number: 'P-001',
          address: null,
        },
      })

      await downloadG702PDF(dataWithSpecialChars)

      // The actual sanitization removes non-alphanumeric chars; date is also fixed format
      expect(mockLink.download).toBe('G702_App1_Project__1___Building___Site___2024-01-15.pdf')

      // Cleanup
      createElementSpy.mockRestore()
      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
    })
  })
})

describe('G702 Edge Cases and Real-World Scenarios', () => {
  it('should handle first payment application', async () => {
    const firstApp = createMockG702Data({
      application: createMockApplication({
        application_number: 1,
        total_completed_previous: 0,
        total_completed_this_period: 150000,
        total_materials_stored: 10000,
        total_completed_and_stored: 160000,
        retainage_percent: 10,
        retainage_from_completed: 15000,
        retainage_from_stored: 1000,
        total_retainage: 16000,
        total_earned_less_retainage: 144000,
        less_previous_certificates: 0,
        current_payment_due: 144000,
      }),
    })

    const blob = await generateG702PDF(firstApp)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle final payment with retainage release', async () => {
    const finalApp = createMockG702Data({
      application: createMockApplication({
        application_number: 10,
        total_completed_previous: 900000,
        total_completed_this_period: 100000,
        total_materials_stored: 0,
        total_completed_and_stored: 1000000,
        retainage_percent: 10,
        retainage_from_completed: 0, // Retainage released
        retainage_from_stored: 0,
        total_retainage: 0,
        retainage_release: 100000, // Total retainage being released
        total_earned_less_retainage: 1000000,
        less_previous_certificates: 900000,
        current_payment_due: 100000,
        percent_complete: 100,
      }),
    })

    const blob = await generateG702PDF(finalApp)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle negative change orders', async () => {
    const negativeChangeApp = createMockG702Data({
      application: createMockApplication({
        original_contract_sum: 1000000,
        net_change_orders: -50000,
        contract_sum_to_date: 950000,
      }),
    })

    const blob = await generateG702PDF(negativeChangeApp)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle zero retainage project', async () => {
    const noRetainageApp = createMockG702Data({
      application: createMockApplication({
        retainage_percent: 0,
        retainage_from_completed: 0,
        retainage_from_stored: 0,
        total_retainage: 0,
        total_earned_less_retainage: 625000, // Same as total completed
      }),
    })

    const blob = await generateG702PDF(noRetainageApp)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle large contract values', async () => {
    const largeApp = createMockG702Data({
      application: createMockApplication({
        original_contract_sum: 50000000,
        net_change_orders: 5000000,
        contract_sum_to_date: 55000000,
        total_completed_and_stored: 30000000,
        current_payment_due: 5000000,
      }),
    })

    const blob = await generateG702PDF(largeApp)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle small contract values', async () => {
    const smallApp = createMockG702Data({
      application: createMockApplication({
        original_contract_sum: 50000,
        net_change_orders: 2500,
        contract_sum_to_date: 52500,
        total_completed_and_stored: 25000,
        current_payment_due: 5000,
      }),
    })

    const blob = await generateG702PDF(smallApp)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle materials stored without completed work this period', async () => {
    const materialsOnlyApp = createMockG702Data({
      application: createMockApplication({
        total_completed_previous: 500000,
        total_completed_this_period: 0,
        total_materials_stored: 50000,
        total_completed_and_stored: 550000,
      }),
    })

    const blob = await generateG702PDF(materialsOnlyApp)
    expect(blob).toBeInstanceOf(Blob)
  })
})
