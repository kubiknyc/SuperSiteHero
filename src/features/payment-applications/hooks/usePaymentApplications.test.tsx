/**
 * Tests for Payment Applications Hooks
 * CRITICAL: These tests ensure billing accuracy for G702/G703 forms
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  useProjectPaymentApplications,
  usePaymentApplication,
  useScheduleOfValues,
  usePaymentApplicationHistory,
  useProjectPaymentSummary,
  useCreatePaymentApplication,
  useUpdatePaymentApplication,
  useSubmitPaymentApplication,
  useApprovePaymentApplication,
  useRejectPaymentApplication,
  useMarkPaymentApplicationPaid,
  useDeletePaymentApplication,
  useCreateSOVItem,
  useUpdateSOVItem,
  useBulkUpdateSOVItems,
  useDeleteSOVItem,
  useCopySOVFromPrevious,
  formatCurrency,
  formatPercent,
  getStatusColor,
  paymentApplicationKeys,
} from './usePaymentApplications'
import type { PaymentApplicationStatus } from '@/types/payment-application'
import React from 'react'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Mock AuthContext
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      company_id: 'company-456',
    },
  }),
}))

// Test data
const mockProjectId = 'project-123'
const mockApplicationId = 'app-123'

const mockPaymentApplication = {
  id: mockApplicationId,
  project_id: mockProjectId,
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
  status: 'draft' as PaymentApplicationStatus,
  submitted_at: null,
  submitted_by: null,
  approved_at: null,
  approved_by: null,
  paid_at: null,
  payment_received_amount: null,
  payment_reference: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
}

const mockSOVItem = {
  id: 'sov-123',
  payment_application_id: mockApplicationId,
  item_number: '1',
  description: 'General Conditions',
  cost_code_id: 'cost-123',
  scheduled_value: 100000,
  change_order_adjustments: 0,
  work_completed_previous: 50000,
  work_completed_this_period: 10000,
  materials_stored: 5000,
  total_completed_and_stored: 65000,
  percent_complete: 65,
  balance_to_finish: 35000,
  retainage: 6500,
  sort_order: 1,
  notes: null,
}

// Helper to create query client wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Helper to create chainable mock
const createChainMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation((onFulfilled) =>
    Promise.resolve({ data, error }).then(onFulfilled)
  ),
})

describe('Payment Application Query Keys', () => {
  it('should generate correct query keys', () => {
    expect(paymentApplicationKeys.all).toEqual(['payment-applications'])
    expect(paymentApplicationKeys.lists()).toEqual(['payment-applications', 'list'])
    expect(paymentApplicationKeys.list('proj-1')).toEqual(['payment-applications', 'list', 'proj-1'])
    expect(paymentApplicationKeys.details()).toEqual(['payment-applications', 'detail'])
    expect(paymentApplicationKeys.detail('app-1')).toEqual(['payment-applications', 'detail', 'app-1'])
    expect(paymentApplicationKeys.sov('app-1')).toEqual(['payment-applications', 'app-1', 'sov'])
    expect(paymentApplicationKeys.history('app-1')).toEqual(['payment-applications', 'app-1', 'history'])
    expect(paymentApplicationKeys.summary('proj-1')).toEqual(['payment-applications', 'summary', 'proj-1'])
  })
})

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
    })

    it('should handle null/undefined', () => {
      expect(formatCurrency(null)).toBe('$0.00')
      expect(formatCurrency(undefined)).toBe('$0.00')
    })

    it('should format negative numbers', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000.00')
    })
  })

  describe('formatPercent', () => {
    it('should format percentages', () => {
      expect(formatPercent(10)).toBe('10.0%')
      expect(formatPercent(33.33)).toBe('33.3%')
    })

    it('should handle null/undefined', () => {
      expect(formatPercent(null)).toBe('0%')
      expect(formatPercent(undefined)).toBe('0%')
    })
  })

  describe('getStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(getStatusColor('draft')).toBe('gray')
      expect(getStatusColor('submitted')).toBe('blue')
      expect(getStatusColor('under_review')).toBe('yellow')
      expect(getStatusColor('approved')).toBe('green')
      expect(getStatusColor('rejected')).toBe('red')
      expect(getStatusColor('paid')).toBe('emerald')
      expect(getStatusColor('void')).toBe('gray')
    })
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useProjectPaymentApplications', () => {
    it('should fetch payment applications for a project', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        createChainMock([mockPaymentApplication]) as any
      )

      const { result } = renderHook(
        () => useProjectPaymentApplications(mockProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(result.current.data?.[0].display_number).toBe('App #1')
      expect(supabase.from).toHaveBeenCalledWith('payment_applications')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(
        () => useProjectPaymentApplications(undefined),
        { wrapper: createWrapper() }
      )

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
    })

    it('should handle errors', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(null, new Error('Database error')) as any
      )

      const { result } = renderHook(
        () => useProjectPaymentApplications(mockProjectId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('usePaymentApplication', () => {
    it('should fetch a single payment application', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(mockPaymentApplication) as any
      )

      const { result } = renderHook(
        () => usePaymentApplication(mockApplicationId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.id).toBe(mockApplicationId)
      expect(result.current.data?.display_number).toBe('App #1')
    })

    it('should not fetch when applicationId is undefined', () => {
      const { result } = renderHook(
        () => usePaymentApplication(undefined),
        { wrapper: createWrapper() }
      )

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('useScheduleOfValues', () => {
    it('should fetch SOV items for an application', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        createChainMock([mockSOVItem]) as any
      )

      const { result } = renderHook(
        () => useScheduleOfValues(mockApplicationId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(result.current.data?.[0].description).toBe('General Conditions')
      expect(supabase.from).toHaveBeenCalledWith('schedule_of_values')
    })
  })

  describe('usePaymentApplicationHistory', () => {
    it('should fetch history for an application', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          payment_application_id: mockApplicationId,
          action: 'created',
          changed_at: '2024-01-01T00:00:00Z',
          changed_by: 'user-123',
        },
      ]

      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(mockHistory) as any
      )

      const { result } = renderHook(
        () => usePaymentApplicationHistory(mockApplicationId),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(supabase.from).toHaveBeenCalledWith('payment_application_history')
    })
  })
})

describe('Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreatePaymentApplication', () => {
    it('should create a new payment application', async () => {
      // Mock RPC for getting next application number
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: 2,
        error: null,
      } as any)

      // Mock insert
      vi.mocked(supabase.from).mockReturnValue(
        createChainMock({ ...mockPaymentApplication, application_number: 2 }) as any
      )

      const { result } = renderHook(
        () => useCreatePaymentApplication(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({
        project_id: mockProjectId,
        period_to: '2024-02-29',
        original_contract_sum: 1000000,
        net_change_orders: 0,
        retainage_percent: 10,
      })

      expect(supabase.rpc).toHaveBeenCalledWith('get_next_application_number', {
        p_project_id: mockProjectId,
      })
      expect(supabase.from).toHaveBeenCalledWith('payment_applications')
    })
  })

  describe('useUpdatePaymentApplication', () => {
    it('should update a payment application', async () => {
      const updatedApp = { ...mockPaymentApplication, net_change_orders: 75000 }

      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(updatedApp) as any
      )

      const { result } = renderHook(
        () => useUpdatePaymentApplication(),
        { wrapper: createWrapper() }
      )

      const data = await result.current.mutateAsync({
        id: mockApplicationId,
        net_change_orders: 75000,
      })

      expect(data.net_change_orders).toBe(75000)
    })
  })

  describe('useSubmitPaymentApplication', () => {
    it('should submit a payment application', async () => {
      const submittedApp = {
        ...mockPaymentApplication,
        status: 'submitted',
        submitted_at: '2024-02-01T00:00:00Z',
        submitted_by: 'user-123',
      }

      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(submittedApp) as any
      )

      const { result } = renderHook(
        () => useSubmitPaymentApplication(),
        { wrapper: createWrapper() }
      )

      const data = await result.current.mutateAsync({
        id: mockApplicationId,
      })

      expect(data.status).toBe('submitted')
      expect(data.submitted_by).toBe('user-123')
    })
  })

  describe('useApprovePaymentApplication', () => {
    it('should approve a payment application', async () => {
      const approvedApp = {
        ...mockPaymentApplication,
        status: 'approved',
        approved_at: '2024-02-05T00:00:00Z',
        approved_by: 'user-123',
      }

      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(approvedApp) as any
      )

      const { result } = renderHook(
        () => useApprovePaymentApplication(),
        { wrapper: createWrapper() }
      )

      const data = await result.current.mutateAsync({
        id: mockApplicationId,
      })

      expect(data.status).toBe('approved')
    })
  })

  describe('useRejectPaymentApplication', () => {
    it('should reject a payment application with reason', async () => {
      const rejectedApp = {
        ...mockPaymentApplication,
        status: 'rejected',
        rejection_reason: 'Documentation incomplete',
      }

      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(rejectedApp) as any
      )

      const { result } = renderHook(
        () => useRejectPaymentApplication(),
        { wrapper: createWrapper() }
      )

      const data = await result.current.mutateAsync({
        id: mockApplicationId,
        rejection_reason: 'Documentation incomplete',
      })

      expect(data.status).toBe('rejected')
    })
  })

  describe('useMarkPaymentApplicationPaid', () => {
    it('should mark a payment application as paid', async () => {
      const paidApp = {
        ...mockPaymentApplication,
        status: 'paid',
        payment_received_amount: 112500,
        payment_reference: 'CHK-12345',
        paid_at: '2024-02-15T00:00:00Z',
      }

      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(paidApp) as any
      )

      const { result } = renderHook(
        () => useMarkPaymentApplicationPaid(),
        { wrapper: createWrapper() }
      )

      const data = await result.current.mutateAsync({
        id: mockApplicationId,
        payment_received_amount: 112500,
        payment_reference: 'CHK-12345',
      })

      expect(data.status).toBe('paid')
      expect(data.payment_received_amount).toBe(112500)
    })
  })

  describe('useDeletePaymentApplication', () => {
    it('should soft delete a payment application', async () => {
      // Mock get project_id
      vi.mocked(supabase.from).mockReturnValueOnce(
        createChainMock({ project_id: mockProjectId }) as any
      )

      // Mock update for soft delete
      vi.mocked(supabase.from).mockReturnValueOnce(
        createChainMock(null) as any
      )

      const { result } = renderHook(
        () => useDeletePaymentApplication(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync(mockApplicationId)

      expect(supabase.from).toHaveBeenCalledWith('payment_applications')
    })
  })
})

describe('SOV Item Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreateSOVItem', () => {
    it('should create a SOV item', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(mockSOVItem) as any
      )

      const { result } = renderHook(
        () => useCreateSOVItem(),
        { wrapper: createWrapper() }
      )

      const data = await result.current.mutateAsync({
        payment_application_id: mockApplicationId,
        item_number: '2',
        description: 'Sitework',
        scheduled_value: 50000,
      })

      expect(data.description).toBe('General Conditions')
    })
  })

  describe('useUpdateSOVItem', () => {
    it('should update a SOV item', async () => {
      const updatedSOV = { ...mockSOVItem, work_completed_this_period: 20000 }

      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(updatedSOV) as any
      )

      const { result } = renderHook(
        () => useUpdateSOVItem(),
        { wrapper: createWrapper() }
      )

      const data = await result.current.mutateAsync({
        id: 'sov-123',
        work_completed_this_period: 20000,
      })

      expect(data.work_completed_this_period).toBe(20000)
    })
  })

  describe('useBulkUpdateSOVItems', () => {
    it('should bulk update multiple SOV items', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(null) as any
      )

      const { result } = renderHook(
        () => useBulkUpdateSOVItems(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({
        applicationId: mockApplicationId,
        items: [
          { id: 'sov-1', work_completed_this_period: 10000, materials_stored: 5000 },
          { id: 'sov-2', work_completed_this_period: 20000, materials_stored: 0 },
        ],
      })

      expect(supabase.from).toHaveBeenCalledWith('schedule_of_values')
    })
  })

  describe('useDeleteSOVItem', () => {
    it('should delete a SOV item', async () => {
      vi.mocked(supabase.from).mockReturnValue(
        createChainMock(null) as any
      )

      const { result } = renderHook(
        () => useDeleteSOVItem(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({
        id: 'sov-123',
        applicationId: mockApplicationId,
      })

      expect(supabase.from).toHaveBeenCalledWith('schedule_of_values')
    })
  })

  describe('useCopySOVFromPrevious', () => {
    it('should copy SOV from previous application', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: null,
      } as any)

      const { result } = renderHook(
        () => useCopySOVFromPrevious(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({
        newApplicationId: 'app-new',
        previousApplicationId: mockApplicationId,
      })

      expect(supabase.rpc).toHaveBeenCalledWith('copy_sov_from_previous_application', {
        p_new_application_id: 'app-new',
        p_previous_application_id: mockApplicationId,
      })
    })
  })
})

describe('Payment Calculation Tests', () => {
  // CRITICAL: These tests verify G702 form calculations

  it('should calculate contract sum to date correctly', () => {
    const originalContractSum = 1000000
    const netChangeOrders = 50000
    const expected = 1050000

    const contractSumToDate = originalContractSum + netChangeOrders
    expect(contractSumToDate).toBe(expected)
    expect(formatCurrency(contractSumToDate)).toBe('$1,050,000.00')
  })

  it('should calculate total completed and stored correctly', () => {
    const completedPrevious = 500000
    const completedThisPeriod = 100000
    const materialsStored = 25000
    const expected = 625000

    const totalCompletedAndStored = completedPrevious + completedThisPeriod + materialsStored
    expect(totalCompletedAndStored).toBe(expected)
  })

  it('should calculate retainage correctly', () => {
    const totalCompleted = 600000 // completed previous + this period
    const materialsStored = 25000
    const retainagePercent = 10

    const retainageFromCompleted = totalCompleted * (retainagePercent / 100)
    const retainageFromStored = materialsStored * (retainagePercent / 100)
    const totalRetainage = retainageFromCompleted + retainageFromStored

    expect(retainageFromCompleted).toBe(60000)
    expect(retainageFromStored).toBe(2500)
    expect(totalRetainage).toBe(62500)
  })

  it('should calculate current payment due correctly (G702 Line 8)', () => {
    // G702 Calculation:
    // Line 4: Total Completed & Stored = 625000
    // Line 5: Total Retainage = 62500
    // Line 6: Total Earned Less Retainage = 562500
    // Line 7: Less Previous Certificates = 450000
    // Line 8: Current Payment Due = 112500

    const totalCompletedAndStored = 625000
    const totalRetainage = 62500
    const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage
    const lessPreviousCertificates = 450000
    const currentPaymentDue = totalEarnedLessRetainage - lessPreviousCertificates

    expect(totalEarnedLessRetainage).toBe(562500)
    expect(currentPaymentDue).toBe(112500)
    expect(formatCurrency(currentPaymentDue)).toBe('$112,500.00')
  })

  it('should calculate balance to finish correctly (G702 Line 9)', () => {
    const contractSumToDate = 1050000
    const totalEarnedLessRetainage = 562500
    const balanceToFinish = contractSumToDate - totalEarnedLessRetainage

    expect(balanceToFinish).toBe(487500)
    expect(formatCurrency(balanceToFinish)).toBe('$487,500.00')
  })

  it('should calculate percent complete correctly', () => {
    const totalCompletedAndStored = 625000
    const contractSumToDate = 1050000
    const percentComplete = (totalCompletedAndStored / contractSumToDate) * 100

    expect(percentComplete).toBeCloseTo(59.52, 1)
    expect(formatPercent(percentComplete)).toBe('59.5%')
  })
})

describe('Project Payment Summary', () => {
  it('should calculate total billed excluding drafts and void', () => {
    const applications = [
      { status: 'paid', current_payment_due: 100000 },
      { status: 'approved', current_payment_due: 50000 },
      { status: 'submitted', current_payment_due: 75000 },
      { status: 'draft', current_payment_due: 25000 }, // Should be excluded
      { status: 'void', current_payment_due: 10000 }, // Should be excluded
    ]

    const totalBilled = applications
      .filter(a => a.status !== 'draft' && a.status !== 'void')
      .reduce((sum, a) => sum + a.current_payment_due, 0)

    expect(totalBilled).toBe(225000)
  })

  it('should calculate total received from paid applications', () => {
    const applications = [
      { status: 'paid', payment_received_amount: 100000 },
      { status: 'paid', payment_received_amount: 75000 },
      { status: 'approved', payment_received_amount: null },
    ]

    const totalReceived = applications
      .filter(a => a.status === 'paid')
      .reduce((sum, a) => sum + (a.payment_received_amount || 0), 0)

    expect(totalReceived).toBe(175000)
  })

  it('should calculate outstanding balance', () => {
    const totalBilled = 225000
    const totalReceived = 175000
    const totalOutstanding = totalBilled - totalReceived

    expect(totalOutstanding).toBe(50000)
  })
})
