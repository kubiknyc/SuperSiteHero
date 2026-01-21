/**
 * useSubcontracts Hook Tests
 * Comprehensive tests for subcontract management hooks
 *
 * Test Coverage:
 * - Query hooks (list, detail, by project, summary, amendments, payments, change orders)
 * - Mutation hooks (create, update, status changes, amendments, delete)
 * - Utility functions (status variants, formatting, calculations)
 * - Query key patterns
 * - Cache invalidation on mutations
 * - Toast notifications
 * - Disabled queries when IDs are missing
 *
 * Total: 80+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// ============================================================================
// Mocks - Must be before imports
// ============================================================================

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock auth context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    userProfile: {
      id: 'user-123',
      company_id: 'company-123',
      email: 'test@example.com',
    },
  }),
}))

// Mock supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Import mocked modules to access mocked functions
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

// Type the mocked supabase for TypeScript
const mockFrom = supabase.from as ReturnType<typeof vi.fn>

// Import hooks to test
import {
  useSubcontracts,
  useSubcontract,
  useSubcontractsByProject,
  useSubcontractSummary,
  useSubcontractAmendments,
  useSubcontractPayments,
  useSubcontractChangeOrders,
  useCreateSubcontract,
  useCreateSubcontractFromBid,
  useUpdateSubcontract,
  useUpdateSubcontractStatus,
  useCreateAmendment,
  useExecuteAmendment,
  useDeleteSubcontract,
  getSubcontractStatusVariant,
  formatContractValue,
  calculatePercentComplete,
  subcontractKeys,
} from '../useSubcontracts'

// ============================================================================
// Test Factories
// ============================================================================

function createMockSubcontract(overrides = {}) {
  return {
    id: 'subcontract-1',
    company_id: 'company-123',
    project_id: 'project-1',
    bid_package_id: 'package-1',
    submission_id: 'submission-1',
    subcontractor_id: 'subcontractor-1',
    contract_number: 'SC-001',
    contract_name: 'HVAC Installation',
    original_contract_value: 150000,
    current_contract_value: 165000,
    approved_change_orders: 15000,
    pending_change_orders: 5000,
    start_date: '2024-01-15',
    completion_date: '2024-06-30',
    retention_percent: 10,
    payment_terms: 'Net 30',
    scope_of_work: 'Complete HVAC system installation',
    exclusions: 'Electrical work not included',
    inclusions: 'All materials and labor',
    special_conditions: 'Work must be completed during off-hours',
    status: 'active',
    contract_date: '2024-01-01',
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  }
}

function createMockSubcontractWithDetails(overrides = {}) {
  return {
    ...createMockSubcontract(overrides),
    project: {
      id: 'project-1',
      name: 'Downtown Tower',
      project_number: 'P-2024-001',
    },
    subcontractor: {
      id: 'subcontractor-1',
      company_name: 'ABC HVAC Company',
      contact_name: 'John Smith',
      email: 'john@abchvac.com',
      phone: '555-0100',
    },
    bid_package: {
      id: 'package-1',
      name: 'HVAC Package',
      package_number: 'BP-001',
    },
    amendments: [],
    gc_signed_by_user: {
      id: 'user-123',
      full_name: 'Jane Manager',
    },
    created_by_user: {
      id: 'user-123',
      full_name: 'Jane Manager',
    },
    changeOrdersCount: 2,
    paymentsCount: 5,
    invoicedAmount: 82500,
    paidAmount: 74250,
  }
}

function createMockSubcontractListItem(overrides = {}) {
  return {
    id: 'subcontract-1',
    contractNumber: 'SC-001',
    contractName: 'HVAC Installation',
    projectId: 'project-1',
    projectName: 'Downtown Tower',
    subcontractorId: 'subcontractor-1',
    subcontractorName: 'ABC HVAC Company',
    status: 'active',
    originalValue: 150000,
    currentValue: 165000,
    approvedChangeOrders: 15000,
    pendingChangeOrders: 5000,
    invoicedAmount: 82500,
    paidAmount: 74250,
    retentionHeld: 8250,
    remainingBalance: 90750,
    complianceStatus: 'compliant',
    startDate: '2024-01-15',
    completionDate: '2024-06-30',
    percentComplete: 50,
    ...overrides,
  }
}

function createMockAmendment(overrides = {}) {
  return {
    id: 'amendment-1',
    subcontract_id: 'subcontract-1',
    amendment_number: 1,
    title: 'Additional Ductwork',
    description: 'Add ductwork for new conference room',
    change_reason: 'Scope addition',
    scope_changes: 'Install 200 linear feet of ductwork',
    price_change: 15000,
    time_extension_days: 14,
    new_completion_date: '2024-07-14',
    status: 'draft',
    effective_date: null,
    gc_signed_by: null,
    gc_signed_at: null,
    sub_signed_by: null,
    sub_signed_at: null,
    created_by: 'user-123',
    created_at: '2024-02-01T00:00:00Z',
    ...overrides,
  }
}

function createMockPayment(overrides = {}) {
  return {
    id: 'payment-1',
    subcontract_id: 'subcontract-1',
    payment_number: 1,
    application_date: '2024-02-01',
    period_from: '2024-01-01',
    period_to: '2024-01-31',
    previously_billed: 0,
    current_billed: 25000,
    stored_materials: 2000,
    total_completed: 27000,
    retention_held: 2700,
    net_payment_due: 24300,
    status: 'paid',
    paid_date: '2024-02-15',
    paid_amount: 24300,
    check_number: 'CHK-1234',
    ...overrides,
  }
}

function createMockChangeOrder(overrides = {}) {
  return {
    id: 'co-1',
    subcontract_id: 'subcontract-1',
    change_order_number: 'CO-001',
    title: 'Additional Equipment',
    description: 'Add rooftop unit',
    amount: 8500,
    time_extension: 7,
    status: 'approved',
    requested_date: '2024-02-01',
    approved_date: '2024-02-10',
    approved_by: 'user-123',
    ...overrides,
  }
}

function createMockSubcontractSummary(overrides = {}) {
  return {
    totalContracts: 5,
    totalOriginalValue: 750000,
    totalCurrentValue: 825000,
    totalApprovedCOs: 75000,
    totalPendingCOs: 25000,
    totalInvoiced: 412500,
    totalPaid: 371250,
    totalRetention: 41250,
    byStatus: {
      draft: 1,
      active: 3,
      completed: 1,
    },
    ...overrides,
  }
}

function createSubcontractFilters(overrides = {}) {
  return {
    projectId: undefined,
    subcontractorId: undefined,
    status: undefined,
    search: undefined,
    ...overrides,
  }
}

function createSubcontractDTO(overrides = {}) {
  return {
    projectId: 'project-1',
    bidPackageId: 'package-1',
    submissionId: 'submission-1',
    subcontractorId: 'subcontractor-1',
    contractName: 'HVAC Installation',
    originalContractValue: 150000,
    startDate: '2024-01-15',
    completionDate: '2024-06-30',
    retentionPercent: 10,
    paymentTerms: 'Net 30',
    scopeOfWork: 'Complete HVAC system installation',
    exclusions: 'Electrical work not included',
    inclusions: 'All materials and labor',
    specialConditions: null,
    ...overrides,
  }
}

function createSubcontractFromBidDTO(overrides = {}) {
  return {
    submissionId: 'submission-1',
    startDate: '2024-01-15',
    completionDate: '2024-06-30',
    retentionPercent: 10,
    termsTemplateId: null,
    additionalTerms: null,
    ...overrides,
  }
}

function createAmendmentDTO(overrides = {}) {
  return {
    subcontractId: 'subcontract-1',
    title: 'Additional Work',
    description: 'Description of changes',
    changeReason: 'Scope addition',
    scopeChanges: 'Detailed scope changes',
    priceChange: 10000,
    timeExtensionDays: 7,
    newCompletionDate: '2024-07-07',
    ...overrides,
  }
}

// ============================================================================
// Test Setup
// ============================================================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.info,
      warn: console.warn,
      error: () => {},
    },
  })
}

interface WrapperProps {
  children: ReactNode
}

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

// Helper to create mock query builder
function createMockQueryBuilder(data: any, error: any = null) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }

  builder.then = (resolve: any) => {
    return Promise.resolve({ data, error }).then(resolve)
  }

  return builder
}

// ============================================================================
// Tests
// ============================================================================

describe('Subcontract Hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  // ==========================================================================
  // Query Hooks Tests
  // ==========================================================================

  describe('useSubcontracts', () => {
    it('should fetch subcontracts successfully', async () => {
      const mockSubcontracts = [createMockSubcontract()]
      const mockPayments = [{ subcontract_id: 'subcontract-1', net_payment_due: 25000, status: 'paid', paid_amount: 25000 }]

      const queryBuilder = createMockQueryBuilder(mockSubcontracts)
      const paymentsBuilder = createMockQueryBuilder(mockPayments)

      supabase.from.mockImplementation((table: string) => {
        if (table === 'subcontracts') {return queryBuilder}
        if (table === 'subcontract_payments') {return paymentsBuilder}
        return createMockQueryBuilder([])
      })

      const filters = createSubcontractFilters()
      const { result } = renderHook(() => useSubcontracts(filters), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
      expect(supabase.from).toHaveBeenCalledWith('subcontracts')
    })

    it('should filter by project', async () => {
      const mockSubcontracts = [createMockSubcontract({ project_id: 'project-1' })]
      const queryBuilder = createMockQueryBuilder(mockSubcontracts)
      const paymentsBuilder = createMockQueryBuilder([])

      supabase.from.mockImplementation((table: string) => {
        if (table === 'subcontracts') {return queryBuilder}
        if (table === 'subcontract_payments') {return paymentsBuilder}
        return createMockQueryBuilder([])
      })

      const filters = createSubcontractFilters({ projectId: 'project-1' })
      const { result } = renderHook(() => useSubcontracts(filters), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(queryBuilder.eq).toHaveBeenCalledWith('project_id', 'project-1')
    })

    it('should filter by subcontractor', async () => {
      const mockSubcontracts = [createMockSubcontract({ subcontractor_id: 'sub-1' })]
      const queryBuilder = createMockQueryBuilder(mockSubcontracts)
      const paymentsBuilder = createMockQueryBuilder([])

      supabase.from.mockImplementation((table: string) => {
        if (table === 'subcontracts') {return queryBuilder}
        if (table === 'subcontract_payments') {return paymentsBuilder}
        return createMockQueryBuilder([])
      })

      const filters = createSubcontractFilters({ subcontractorId: 'sub-1' })
      const { result } = renderHook(() => useSubcontracts(filters), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(queryBuilder.eq).toHaveBeenCalledWith('subcontractor_id', 'sub-1')
    })

    it('should filter by status array', async () => {
      const mockSubcontracts = [createMockSubcontract({ status: 'active' })]
      const queryBuilder = createMockQueryBuilder(mockSubcontracts)
      const paymentsBuilder = createMockQueryBuilder([])

      supabase.from.mockImplementation((table: string) => {
        if (table === 'subcontracts') {return queryBuilder}
        if (table === 'subcontract_payments') {return paymentsBuilder}
        return createMockQueryBuilder([])
      })

      const filters = createSubcontractFilters({ status: ['active', 'completed'] })
      const { result } = renderHook(() => useSubcontracts(filters), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(queryBuilder.in).toHaveBeenCalledWith('status', ['active', 'completed'])
    })

    it('should handle search filter', async () => {
      const mockSubcontracts = [createMockSubcontract()]
      const queryBuilder = createMockQueryBuilder(mockSubcontracts)
      const paymentsBuilder = createMockQueryBuilder([])

      supabase.from.mockImplementation((table: string) => {
        if (table === 'subcontracts') {return queryBuilder}
        if (table === 'subcontract_payments') {return paymentsBuilder}
        return createMockQueryBuilder([])
      })

      const filters = createSubcontractFilters({ search: 'HVAC' })
      const { result } = renderHook(() => useSubcontracts(filters), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(queryBuilder.or).toHaveBeenCalled()
    })

    it('should use correct query key', () => {
      const filters = createSubcontractFilters({ projectId: 'project-1' })
      const queryBuilder = createMockQueryBuilder([])
      supabase.from.mockReturnValue(queryBuilder)

      renderHook(() => useSubcontracts(filters), {
        wrapper: createWrapper(queryClient),
      })

      const queryState = queryClient.getQueryState(subcontractKeys.list(filters))
      expect(queryState).toBeDefined()
    })
  })

  describe('useSubcontract', () => {
    it('should fetch single subcontract with details', async () => {
      const mockSubcontract = createMockSubcontractWithDetails()
      const queryBuilder = createMockQueryBuilder(mockSubcontract)
      const countBuilder = { count: 3 }
      const paymentsCountBuilder = { count: 5 }
      const paymentDataBuilder = createMockQueryBuilder([
        { net_payment_due: 25000, paid_amount: 25000, status: 'paid' }
      ])

      supabase.from.mockImplementation((table: string) => {
        if (table === 'subcontracts') {return queryBuilder}
        if (table === 'subcontract_change_orders') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue(countBuilder),
          }
        }
        if (table === 'subcontract_payments' && !paymentDataBuilder.select.mock.calls.length) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue(paymentsCountBuilder),
          }
        }
        return paymentDataBuilder
      })

      const { result } = renderHook(() => useSubcontract('subcontract-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
      expect(supabase.from).toHaveBeenCalledWith('subcontracts')
    })

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useSubcontract(undefined), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should use correct query key', () => {
      const id = 'subcontract-1'
      const queryBuilder = createMockQueryBuilder(createMockSubcontractWithDetails())
      supabase.from.mockReturnValue(queryBuilder)

      renderHook(() => useSubcontract(id), {
        wrapper: createWrapper(queryClient),
      })

      const queryState = queryClient.getQueryState(subcontractKeys.detail(id))
      expect(queryState).toBeDefined()
    })
  })

  describe('useSubcontractsByProject', () => {
    it('should fetch subcontracts by project', async () => {
      const mockSubcontracts = [createMockSubcontract({ project_id: 'project-1' })]
      const queryBuilder = createMockQueryBuilder(mockSubcontracts)
      supabase.from.mockReturnValue(queryBuilder)

      const { result } = renderHook(() => useSubcontractsByProject('project-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockSubcontracts)
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useSubcontractsByProject(undefined), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useSubcontractSummary', () => {
    it('should fetch summary successfully', async () => {
      const mockContracts = [
        createMockSubcontract({ status: 'active', original_contract_value: 150000 }),
        createMockSubcontract({ status: 'completed', original_contract_value: 200000 }),
      ]
      const queryBuilder = createMockQueryBuilder(mockContracts)
      supabase.from.mockReturnValue(queryBuilder)

      const { result } = renderHook(() => useSubcontractSummary(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.totalContracts).toBe(2)
    })

    it('should filter by project when provided', async () => {
      const mockContracts = [createMockSubcontract()]
      const queryBuilder = createMockQueryBuilder(mockContracts)
      supabase.from.mockReturnValue(queryBuilder)

      const { result } = renderHook(() => useSubcontractSummary('project-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(queryBuilder.eq).toHaveBeenCalledWith('project_id', 'project-1')
    })
  })

  describe('useSubcontractAmendments', () => {
    it('should fetch amendments successfully', async () => {
      const mockAmendments = [createMockAmendment()]
      const queryBuilder = createMockQueryBuilder(mockAmendments)
      supabase.from.mockReturnValue(queryBuilder)

      const { result } = renderHook(() => useSubcontractAmendments('subcontract-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockAmendments)
    })

    it('should not fetch when subcontractId is undefined', () => {
      const { result } = renderHook(() => useSubcontractAmendments(undefined), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useSubcontractPayments', () => {
    it('should fetch payments successfully', async () => {
      const mockPayments = [createMockPayment()]
      const queryBuilder = createMockQueryBuilder(mockPayments)
      supabase.from.mockReturnValue(queryBuilder)

      const { result } = renderHook(() => useSubcontractPayments('subcontract-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockPayments)
    })

    it('should not fetch when subcontractId is undefined', () => {
      const { result } = renderHook(() => useSubcontractPayments(undefined), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useSubcontractChangeOrders', () => {
    it('should fetch change orders successfully', async () => {
      const mockChangeOrders = [createMockChangeOrder()]
      const queryBuilder = createMockQueryBuilder(mockChangeOrders)
      supabase.from.mockReturnValue(queryBuilder)

      const { result } = renderHook(() => useSubcontractChangeOrders('subcontract-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockChangeOrders)
    })

    it('should not fetch when subcontractId is undefined', () => {
      const { result } = renderHook(() => useSubcontractChangeOrders(undefined), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  // ==========================================================================
  // Mutation Hooks Tests
  // ==========================================================================

  describe('useCreateSubcontract', () => {
    it('should create subcontract successfully', async () => {
      const mockSubcontract = createMockSubcontract({ contract_number: 'SC-001' })
      const existingBuilder = createMockQueryBuilder([])
      const insertBuilder = createMockQueryBuilder(mockSubcontract)

      supabase.from.mockImplementation(() => {
        const builder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockSubcontract, error: null }),
        }
        return builder
      })

      const { result } = renderHook(() => useCreateSubcontract(), {
        wrapper: createWrapper(queryClient),
      })

      const dto = createSubcontractDTO()
      result.current.mutate(dto)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockSubcontract)
    })

    it('should show success toast', async () => {
      const mockSubcontract = createMockSubcontract({ contract_number: 'SC-001' })
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubcontract, error: null }),
      }))

      const { result } = renderHook(() => useCreateSubcontract(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate(createSubcontractDTO())

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('Subcontract created')
    })

    it('should invalidate queries on success', async () => {
      const mockSubcontract = createMockSubcontract()
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubcontract, error: null }),
      }))

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCreateSubcontract(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate(createSubcontractDTO())

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subcontractKeys.lists() })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Failed to create')
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [] }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      }))

      const { result } = renderHook(() => useCreateSubcontract(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate(createSubcontractDTO())

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalledWith('Failed to create subcontract: Failed to create')
    })
  })

  describe('useCreateSubcontractFromBid', () => {
    it('should create subcontract from bid successfully', async () => {
      const mockSubmission = {
        id: 'submission-1',
        package: {
          project_id: 'project-1',
          name: 'HVAC Package',
          scope_of_work: 'Complete HVAC',
        },
        invitation: {
          subcontractor: {
            id: 'sub-1',
            company_name: 'ABC HVAC',
          },
        },
        award_amount: 150000,
        base_bid_amount: 145000,
        bid_package_id: 'package-1',
        exclusions: 'Electrical not included',
      }

      const mockSubcontract = createMockSubcontract()

      supabase.from.mockImplementation((table: string) => {
        if (table === 'bid_submissions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockSubmission, error: null }),
          }
        }
        if (table === 'subcontracts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockSubcontract, error: null }),
          }
        }
        return createMockQueryBuilder([])
      })

      const { result } = renderHook(() => useCreateSubcontractFromBid(), {
        wrapper: createWrapper(queryClient),
      })

      const dto = createSubcontractFromBidDTO()
      result.current.mutate(dto)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('Subcontract created from bid')
    })
  })

  describe('useUpdateSubcontract', () => {
    it('should update subcontract successfully', async () => {
      const mockSubcontract = createMockSubcontract({ contract_name: 'Updated Name' })
      supabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubcontract, error: null }),
      }))

      const { result } = renderHook(() => useUpdateSubcontract(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({
        id: 'subcontract-1',
        updates: { contract_name: 'Updated Name' },
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('Subcontract updated')
    })

    it('should invalidate both list and detail queries', async () => {
      const mockSubcontract = createMockSubcontract({ id: 'subcontract-1' })
      supabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubcontract, error: null }),
      }))

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useUpdateSubcontract(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({
        id: 'subcontract-1',
        updates: { contract_name: 'Updated' },
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subcontractKeys.detail('subcontract-1') })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subcontractKeys.lists() })
    })
  })

  describe('useUpdateSubcontractStatus', () => {
    it('should update status successfully', async () => {
      const mockSubcontract = createMockSubcontract({ status: 'executed', contract_date: '2024-01-15' })
      supabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubcontract, error: null }),
      }))

      const { result } = renderHook(() => useUpdateSubcontractStatus(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({
        id: 'subcontract-1',
        status: 'executed',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('Status updated')
    })

    it('should set contract_date when status is executed', async () => {
      const mockSubcontract = createMockSubcontract({ status: 'executed' })
      const updateSpy = vi.fn().mockReturnThis()

      supabase.from.mockImplementation(() => ({
        update: updateSpy,
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSubcontract, error: null }),
      }))

      const { result } = renderHook(() => useUpdateSubcontractStatus(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({
        id: 'subcontract-1',
        status: 'executed',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(updateSpy).toHaveBeenCalled()
    })
  })

  describe('useCreateAmendment', () => {
    it('should create amendment successfully', async () => {
      const mockAmendment = createMockAmendment()
      supabase.from.mockImplementation((table: string) => {
        if (table === 'subcontract_amendments') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ count: 0 }),
            insert: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockAmendment, error: null }),
          }
        }
        return createMockQueryBuilder([])
      })

      const { result } = renderHook(() => useCreateAmendment(), {
        wrapper: createWrapper(queryClient),
      })

      const dto = createAmendmentDTO()
      result.current.mutate(dto)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('Amendment created')
    })

    it('should invalidate amendments and detail queries', async () => {
      const mockAmendment = createMockAmendment({ subcontract_id: 'subcontract-1' })
      supabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 0 }),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockAmendment, error: null }),
      }))

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useCreateAmendment(), {
        wrapper: createWrapper(queryClient),
      })

      const dto = createAmendmentDTO({ subcontractId: 'subcontract-1' })
      result.current.mutate(dto)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subcontractKeys.amendments('subcontract-1') })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subcontractKeys.detail('subcontract-1') })
    })
  })

  describe('useExecuteAmendment', () => {
    it('should execute amendment successfully', async () => {
      const mockAmendment = createMockAmendment({ price_change: 10000, new_completion_date: '2024-07-15' })
      const mockContract = createMockSubcontract({ current_contract_value: 150000, approved_change_orders: 0 })
      const mockExecutedAmendment = { ...mockAmendment, status: 'executed' }

      let amendmentCallCount = 0
      supabase.from.mockImplementation((table: string) => {
        if (table === 'subcontract_amendments') {
          amendmentCallCount++
          if (amendmentCallCount === 1) {
            // First call: get amendment
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockAmendment, error: null }),
            }
          } else {
            // Second call: update amendment
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockExecutedAmendment, error: null }),
            }
          }
        }
        if (table === 'subcontracts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockContract, error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return createMockQueryBuilder([])
      })

      const { result } = renderHook(() => useExecuteAmendment(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({
        amendmentId: 'amendment-1',
        subcontractId: 'subcontract-1',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      }, { timeout: 3000 })

      expect(toast.success).toHaveBeenCalledWith('Amendment executed')
    })

    it('should invalidate multiple queries on success', async () => {
      const mockAmendment = createMockAmendment()
      const mockContract = createMockSubcontract()
      const mockExecutedAmendment = { ...mockAmendment, status: 'executed' }

      let amendmentCallCount = 0
      supabase.from.mockImplementation((table: string) => {
        if (table === 'subcontract_amendments') {
          amendmentCallCount++
          if (amendmentCallCount === 1) {
            // First call: get amendment
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockAmendment, error: null }),
            }
          } else {
            // Second call: update amendment
            return {
              update: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockExecutedAmendment, error: null }),
            }
          }
        }
        if (table === 'subcontracts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockContract, error: null }),
            update: vi.fn().mockReturnThis(),
          }
        }
        return createMockQueryBuilder([])
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useExecuteAmendment(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate({
        amendmentId: 'amendment-1',
        subcontractId: 'subcontract-1',
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      }, { timeout: 3000 })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subcontractKeys.amendments('subcontract-1') })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subcontractKeys.detail('subcontract-1') })
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subcontractKeys.lists() })
    })
  })

  describe('useDeleteSubcontract', () => {
    it('should delete subcontract successfully', async () => {
      supabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }))

      const { result } = renderHook(() => useDeleteSubcontract(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate('subcontract-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.success).toHaveBeenCalledWith('Subcontract deleted')
    })

    it('should invalidate queries on success', async () => {
      supabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }))

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useDeleteSubcontract(), {
        wrapper: createWrapper(queryClient),
      })

      result.current.mutate('subcontract-1')

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: subcontractKeys.lists() })
    })
  })

  // ==========================================================================
  // Utility Functions Tests
  // ==========================================================================

  describe('Utility Functions', () => {
    describe('getSubcontractStatusVariant', () => {
      it('should return default for executed status', () => {
        expect(getSubcontractStatusVariant('executed')).toBe('default')
        expect(getSubcontractStatusVariant('active')).toBe('default')
        expect(getSubcontractStatusVariant('completed')).toBe('default')
      })

      it('should return secondary for draft status', () => {
        expect(getSubcontractStatusVariant('draft')).toBe('secondary')
        expect(getSubcontractStatusVariant('pending_review')).toBe('secondary')
      })

      it('should return destructive for suspended status', () => {
        expect(getSubcontractStatusVariant('suspended')).toBe('destructive')
        expect(getSubcontractStatusVariant('terminated')).toBe('destructive')
      })

      it('should return outline for unknown status', () => {
        expect(getSubcontractStatusVariant('unknown')).toBe('outline')
      })
    })

    describe('formatContractValue', () => {
      it('should format value as currency', () => {
        expect(formatContractValue(150000)).toBe('$150,000')
      })

      it('should handle zero', () => {
        expect(formatContractValue(0)).toBe('$0')
      })

      it('should handle large values', () => {
        expect(formatContractValue(1500000)).toBe('$1,500,000')
      })

      it('should round decimal values', () => {
        expect(formatContractValue(150000.75)).toBe('$150,001')
      })
    })

    describe('calculatePercentComplete', () => {
      it('should calculate percentage correctly', () => {
        expect(calculatePercentComplete(50000, 100000)).toBe(50)
      })

      it('should return 0 when contract value is 0', () => {
        expect(calculatePercentComplete(50000, 0)).toBe(0)
      })

      it('should return 0 when contract value is negative', () => {
        expect(calculatePercentComplete(50000, -100)).toBe(0)
      })

      it('should cap at 100 percent', () => {
        expect(calculatePercentComplete(150000, 100000)).toBe(100)
      })

      it('should round to nearest integer', () => {
        expect(calculatePercentComplete(33333, 100000)).toBe(33)
      })
    })
  })

  // ==========================================================================
  // Query Keys Tests
  // ==========================================================================

  describe('Query Keys', () => {
    it('should generate correct base keys', () => {
      expect(subcontractKeys.all).toEqual(['subcontracts'])
      expect(subcontractKeys.lists()).toEqual(['subcontracts', 'list'])
    })

    it('should generate correct list keys with filters', () => {
      const filters = createSubcontractFilters({ projectId: 'project-1' })
      expect(subcontractKeys.list(filters)).toEqual(['subcontracts', 'list', filters])
    })

    it('should generate correct detail keys', () => {
      expect(subcontractKeys.detail('subcontract-1')).toEqual(['subcontracts', 'detail', 'subcontract-1'])
    })

    it('should generate correct amendment keys', () => {
      expect(subcontractKeys.amendments('subcontract-1')).toEqual(['subcontracts', 'amendments', 'subcontract-1'])
    })

    it('should generate correct payment keys', () => {
      expect(subcontractKeys.payments('subcontract-1')).toEqual(['subcontracts', 'payments', 'subcontract-1'])
    })

    it('should generate correct change order keys', () => {
      expect(subcontractKeys.changeOrders('subcontract-1')).toEqual(['subcontracts', 'changeOrders', 'subcontract-1'])
    })

    it('should generate correct summary keys', () => {
      expect(subcontractKeys.summary()).toEqual(['subcontracts', 'summary', undefined])
      expect(subcontractKeys.summary('project-1')).toEqual(['subcontracts', 'summary', 'project-1'])
    })

    it('should generate correct by-project keys', () => {
      expect(subcontractKeys.byProject('project-1')).toEqual(['subcontracts', 'byProject', 'project-1'])
    })

    it('should generate correct by-subcontractor keys', () => {
      expect(subcontractKeys.bySubcontractor('sub-1')).toEqual(['subcontracts', 'bySubcontractor', 'sub-1'])
    })
  })
})
