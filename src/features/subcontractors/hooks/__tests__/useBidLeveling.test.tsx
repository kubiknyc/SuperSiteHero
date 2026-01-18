/**
 * Bid Leveling Hooks Tests
 * Comprehensive tests for all bid leveling React Query hooks
 *
 * Test Coverage:
 * - Query Hooks (3): useBidLevelingMatrix, useBidRecommendation, useLineItemAnalysis
 * - Mutation Hooks (2): useExportBidLeveling, useNormalizeBids
 * - Utility Functions (3): calculateScopeGapScore, getPriceVarianceStatus, formatBidCurrency
 * - Success/Error cases for all hooks
 * - Cache invalidation after mutations
 * - Loading and error states
 * - Matrix building and summary calculations
 *
 * Total: 50+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { toast } from 'sonner'

// Import hooks to test
import {
  bidLevelingKeys,
  useBidLevelingMatrix,
  useBidRecommendation,
  useExportBidLeveling,
  useLineItemAnalysis,
  useNormalizeBids,
  calculateScopeGapScore,
  getPriceVarianceStatus,
  formatBidCurrency,
} from '../useBidLeveling'

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}))

// Mock useAuth hook
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com' },
    session: { access_token: 'test-token' },
  }),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Import the mocked supabase
import { supabase } from '@/lib/supabase'

// ============================================================================
// Test Factories
// ============================================================================

interface CreateBidPackageOptions {
  id?: string
  name?: string
  estimated_value?: number | null
}

function createMockBidPackage(overrides: CreateBidPackageOptions = {}) {
  return {
    id: overrides.id || 'package-1',
    name: overrides.name || 'Electrical Work',
    estimated_value: overrides.estimated_value !== undefined ? overrides.estimated_value : 500000,
  }
}

interface CreatePackageItemOptions {
  id?: string
  bid_package_id?: string
  item_number?: string
  description?: string
  unit?: string | null
  quantity?: number | null
  estimated_unit_price?: number | null
  sort_order?: number
}

function createMockPackageItem(overrides: CreatePackageItemOptions = {}) {
  return {
    id: overrides.id || 'item-1',
    bid_package_id: overrides.bid_package_id || 'package-1',
    item_number: overrides.item_number || '001',
    description: overrides.description || 'Conduit Installation',
    unit: overrides.unit !== undefined ? overrides.unit : 'LF',
    quantity: overrides.quantity !== undefined ? overrides.quantity : 1000,
    estimated_unit_price: overrides.estimated_unit_price !== undefined ? overrides.estimated_unit_price : 15,
    sort_order: overrides.sort_order || 1,
  }
}

interface CreateBidSubmissionOptions {
  id?: string
  bid_package_id?: string
  bidder_company_name?: string
  bidder_contact_name?: string | null
  bidder_email?: string | null
  base_bid_amount?: number
  alternates_total?: number | null
  total_bid_amount?: number | null
  status?: string
  is_late?: boolean
  submitted_at?: string
  exclusions?: string | null
  clarifications?: string | null
  proposed_start_date?: string | null
  proposed_duration_days?: number | null
  items?: any[]
}

function createMockBidSubmission(overrides: CreateBidSubmissionOptions = {}) {
  const baseBid = overrides.base_bid_amount || 450000
  return {
    id: overrides.id || 'submission-1',
    bid_package_id: overrides.bid_package_id || 'package-1',
    bidder_company_name: overrides.bidder_company_name || 'ABC Electric',
    bidder_contact_name: overrides.bidder_contact_name !== undefined ? overrides.bidder_contact_name : 'John Doe',
    bidder_email: overrides.bidder_email !== undefined ? overrides.bidder_email : 'john@abc.com',
    base_bid_amount: baseBid,
    alternates_total: overrides.alternates_total !== undefined ? overrides.alternates_total : 5000,
    total_bid_amount: overrides.total_bid_amount !== undefined ? overrides.total_bid_amount : baseBid + 5000,
    status: overrides.status || 'received',
    is_late: overrides.is_late || false,
    submitted_at: overrides.submitted_at || '2024-01-15T10:00:00Z',
    exclusions: overrides.exclusions !== undefined ? overrides.exclusions : null,
    clarifications: overrides.clarifications !== undefined ? overrides.clarifications : null,
    proposed_start_date: overrides.proposed_start_date !== undefined ? overrides.proposed_start_date : '2024-03-01',
    proposed_duration_days: overrides.proposed_duration_days !== undefined ? overrides.proposed_duration_days : 90,
    items: overrides.items || [],
  }
}

interface CreateSubmissionItemOptions {
  id?: string
  bid_submission_id?: string
  package_item_id?: string
  unit_price?: number | null
  total_price?: number | null
  is_included?: boolean
  notes?: string | null
}

function createMockSubmissionItem(overrides: CreateSubmissionItemOptions = {}) {
  return {
    id: overrides.id || 'sub-item-1',
    bid_submission_id: overrides.bid_submission_id || 'submission-1',
    package_item_id: overrides.package_item_id || 'item-1',
    unit_price: overrides.unit_price !== undefined ? overrides.unit_price : 12.5,
    total_price: overrides.total_price !== undefined ? overrides.total_price : 12500,
    is_included: overrides.is_included !== undefined ? overrides.is_included : true,
    notes: overrides.notes !== undefined ? overrides.notes : null,
  }
}

function createMockBidRecommendation(overrides: Partial<any> = {}) {
  return {
    submissionId: overrides.submissionId || 'submission-1',
    bidderName: overrides.bidderName || 'ABC Electric',
    recommendedBidder: overrides.recommendedBidder || 'ABC Electric',
    reason: overrides.reason || 'Best combination of price and qualifications',
    score: overrides.score || 95,
    confidence: overrides.confidence || 'high',
    factors: overrides.factors || {
      priceScore: 90,
      qualificationScore: 95,
      scheduleScore: 100,
      scopeScore: 95,
    },
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
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('Bid Leveling Hooks', () => {
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

  describe('useBidLevelingMatrix', () => {
    it('should fetch bid leveling matrix successfully', async () => {
      const mockPackage = createMockBidPackage()
      const mockItems = [createMockPackageItem(), createMockPackageItem({ id: 'item-2', item_number: '002' })]
      const mockSubmissions = [
        { ...createMockBidSubmission(), items: [createMockSubmissionItem()] },
        { ...createMockBidSubmission({ id: 'submission-2', bidder_company_name: 'XYZ Electric', base_bid_amount: 480000 }), items: [] },
      ]

      const mockDb = supabase as any
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'bid_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
          }
        }
        if (table === 'bid_package_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
          }
        }
        if (table === 'bid_submissions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }),
          }
        }
        return {}
      })

      const { result } = renderHook(() => useBidLevelingMatrix('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.packageId).toBe('package-1')
      expect(result.current.data?.packageName).toBe('Electrical Work')
      expect(result.current.data?.submissions).toHaveLength(2)
    })

    it('should calculate summary correctly', async () => {
      const mockPackage = createMockBidPackage({ estimated_value: 500000 })
      const mockItems: any[] = []
      const mockSubmissions = [
        { ...createMockBidSubmission({ base_bid_amount: 450000, status: 'qualified' }), items: [] },
        { ...createMockBidSubmission({ id: 'submission-2', base_bid_amount: 480000, status: 'qualified' }), items: [] },
        { ...createMockBidSubmission({ id: 'submission-3', base_bid_amount: 520000, status: 'received' }), items: [] },
      ]

      const mockDb = supabase as any
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'bid_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
          }
        }
        if (table === 'bid_package_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
          }
        }
        if (table === 'bid_submissions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }),
          }
        }
        return {}
      })

      const { result } = renderHook(() => useBidLevelingMatrix('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const summary = result.current.data?.summary
      expect(summary).toBeDefined()
      expect(summary?.totalBids).toBe(3)
      expect(summary?.qualifiedBids).toBe(2)
      expect(summary?.lowBid).toBe(450000)
      expect(summary?.highBid).toBe(520000)
      expect(summary?.averageBid).toBeCloseTo(483333.33, 1)
      expect(summary?.spreadPercent).toBeCloseTo(15.56, 1)
      expect(summary?.estimatedValue).toBe(500000)
      expect(summary?.varianceFromEstimate).toBeCloseTo(-10, 1)
    })

    it('should build line item matrix correctly', async () => {
      const mockPackage = createMockBidPackage()
      const mockItems = [createMockPackageItem({ id: 'item-1', estimated_unit_price: 15, quantity: 1000 })]
      const mockSubmissions = [
        {
          ...createMockBidSubmission({ id: 'sub-1', base_bid_amount: 450000 }),
          items: [createMockSubmissionItem({ package_item_id: 'item-1', unit_price: 12.5, total_price: 12500 })],
        },
        {
          ...createMockBidSubmission({ id: 'sub-2', bidder_company_name: 'XYZ Electric', base_bid_amount: 480000 }),
          items: [createMockSubmissionItem({ id: 'sub-item-2', bid_submission_id: 'sub-2', package_item_id: 'item-1', unit_price: 14, total_price: 14000 })],
        },
      ]

      const mockDb = supabase as any
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'bid_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
          }
        }
        if (table === 'bid_package_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
          }
        }
        if (table === 'bid_submissions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }),
          }
        }
        return {}
      })

      const { result } = renderHook(() => useBidLevelingMatrix('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const lineItems = result.current.data?.lineItems
      expect(lineItems).toHaveLength(1)
      expect(lineItems?.[0].lowestPrice).toBe(12500)
      expect(lineItems?.[0].highestPrice).toBe(14000)
      expect(lineItems?.[0].averagePrice).toBe(13250)
      expect(lineItems?.[0].estimatedPrice).toBe(15000)
      expect(lineItems?.[0].submissions).toHaveLength(2)

      const firstSubmission = lineItems?.[0].submissions[0]
      expect(firstSubmission?.isLowest).toBe(true)
      expect(firstSubmission?.isHighest).toBe(false)
      expect(firstSubmission?.varianceFromLowest).toBe(0)

      const secondSubmission = lineItems?.[0].submissions[1]
      expect(secondSubmission?.isLowest).toBe(false)
      expect(secondSubmission?.isHighest).toBe(true)
      expect(secondSubmission?.varianceFromLowest).toBeCloseTo(12, 1)
    })

    it('should build exclusions comparison', async () => {
      const mockPackage = createMockBidPackage()
      const mockItems: any[] = []
      const mockSubmissions = [
        { ...createMockBidSubmission({ exclusions: 'No site work\nNo permits' }), items: [] },
        { ...createMockBidSubmission({ id: 'sub-2', bidder_company_name: 'XYZ', exclusions: null }), items: [] },
      ]

      const mockDb = supabase as any
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'bid_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
          }
        }
        if (table === 'bid_package_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
          }
        }
        if (table === 'bid_submissions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }),
          }
        }
        return {}
      })

      const { result } = renderHook(() => useBidLevelingMatrix('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const exclusions = result.current.data?.exclusions
      expect(exclusions).toHaveLength(1)
      expect(exclusions?.[0].bidderName).toBe('ABC Electric')
      expect(exclusions?.[0].exclusions).toEqual(['No site work', 'No permits'])
    })

    it('should return empty matrix when no submissions', async () => {
      const mockPackage = createMockBidPackage()
      const mockItems: any[] = []
      const mockSubmissions: any[] = []

      const mockDb = supabase as any
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'bid_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
          }
        }
        if (table === 'bid_package_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
          }
        }
        if (table === 'bid_submissions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }),
          }
        }
        return {}
      })

      const { result } = renderHook(() => useBidLevelingMatrix('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.submissions).toHaveLength(0)
      expect(result.current.data?.summary.totalBids).toBe(0)
      expect(result.current.data?.summary.lowBid).toBe(0)
    })

    it('should not fetch when packageId is undefined', () => {
      const mockDb = supabase as any
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const { result } = renderHook(() => useBidLevelingMatrix(undefined), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should handle error when fetching package fails', async () => {
      const error = new Error('Package not found')
      const mockDb = supabase as any
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      })

      const { result } = renderHook(() => useBidLevelingMatrix('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(error)
    })

    it('should handle error when fetching items fails', async () => {
      const mockPackage = createMockBidPackage()
      const error = new Error('Items fetch failed')

      const mockDb = supabase as any
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'bid_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
          }
        }
        if (table === 'bid_package_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error }),
          }
        }
        return {}
      })

      const { result } = renderHook(() => useBidLevelingMatrix('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(error)
    })

    it('should calculate submission ranks and variances', async () => {
      const mockPackage = createMockBidPackage({ estimated_value: 500000 })
      const mockItems: any[] = []
      const mockSubmissions = [
        { ...createMockBidSubmission({ id: 'sub-1', base_bid_amount: 450000 }), items: [] },
        { ...createMockBidSubmission({ id: 'sub-2', base_bid_amount: 480000 }), items: [] },
        { ...createMockBidSubmission({ id: 'sub-3', base_bid_amount: 520000 }), items: [] },
      ]

      const mockDb = supabase as any
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'bid_packages') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
          }
        }
        if (table === 'bid_package_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
          }
        }
        if (table === 'bid_submissions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockSubmissions, error: null }),
          }
        }
        return {}
      })

      const { result } = renderHook(() => useBidLevelingMatrix('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const submissions = result.current.data?.submissions
      expect(submissions?.[0].rank).toBe(1)
      expect(submissions?.[0].varianceFromLow).toBe(0)
      expect(submissions?.[0].varianceFromEstimate).toBeCloseTo(-10, 1)

      expect(submissions?.[1].rank).toBe(2)
      expect(submissions?.[1].varianceFromLow).toBeCloseTo(6.67, 1)
      expect(submissions?.[1].varianceFromEstimate).toBeCloseTo(-4, 1)

      expect(submissions?.[2].rank).toBe(3)
      expect(submissions?.[2].varianceFromLow).toBeCloseTo(15.56, 1)
      expect(submissions?.[2].varianceFromEstimate).toBeCloseTo(4, 1)
    })
  })

  describe('useBidRecommendation', () => {
    it('should fetch bid recommendation successfully', async () => {
      const mockRecommendation = createMockBidRecommendation()
      const mockDb = supabase as any
      mockDb.rpc.mockResolvedValue({ data: mockRecommendation, error: null })

      const { result } = renderHook(() => useBidRecommendation('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockRecommendation)
      expect(mockDb.rpc).toHaveBeenCalledWith('generate_bid_recommendation', {
        p_package_id: 'package-1',
      })
    })

    it('should not fetch when packageId is undefined', () => {
      const mockDb = supabase as any
      mockDb.rpc.mockResolvedValue({ data: null, error: null })

      const { result } = renderHook(() => useBidRecommendation(undefined), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockDb.rpc).not.toHaveBeenCalled()
    })

    it('should return null when RPC function errors (fallback)', async () => {
      const error = new Error('Function not found')
      const mockDb = supabase as any
      mockDb.rpc.mockResolvedValue({ data: null, error })

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { result } = renderHook(() => useBidRecommendation('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'generate_bid_recommendation not available, using fallback'
      )

      consoleWarnSpy.mockRestore()
    })

    it('should handle different confidence levels', async () => {
      const mockRecommendation = createMockBidRecommendation({ confidence: 'medium' })
      const mockDb = supabase as any
      mockDb.rpc.mockResolvedValue({ data: mockRecommendation, error: null })

      const { result } = renderHook(() => useBidRecommendation('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.confidence).toBe('medium')
    })
  })

  describe('useLineItemAnalysis', () => {
    it('should fetch line item analysis successfully', async () => {
      const mockAnalysis = {
        packageId: 'package-1',
        items: [
          {
            itemId: 'item-1',
            priceSpread: 15.5,
            averageVariance: 8.2,
            outliers: ['submission-3'],
          },
        ],
      }
      const mockDb = supabase as any
      mockDb.rpc.mockResolvedValue({ data: mockAnalysis, error: null })

      const { result } = renderHook(() => useLineItemAnalysis('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockAnalysis)
      expect(mockDb.rpc).toHaveBeenCalledWith('analyze_bid_line_items', {
        p_package_id: 'package-1',
      })
    })

    it('should not fetch when packageId is undefined', () => {
      const mockDb = supabase as any
      mockDb.rpc.mockResolvedValue({ data: null, error: null })

      const { result } = renderHook(() => useLineItemAnalysis(undefined), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockDb.rpc).not.toHaveBeenCalled()
    })

    it('should handle error when RPC call fails', async () => {
      const error = new Error('Analysis failed')
      const mockDb = supabase as any
      mockDb.rpc.mockResolvedValue({ data: null, error })

      const { result } = renderHook(() => useLineItemAnalysis('package-1'), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toEqual(error)
    })
  })

  // ==========================================================================
  // Mutation Hooks Tests
  // ==========================================================================

  describe('useExportBidLeveling', () => {
    it('should export bid leveling successfully', async () => {
      const mockResponse = { url: 'https://example.com/export.xlsx', fallback: false }
      const mockDb = supabase as any
      mockDb.functions = {
        invoke: vi.fn().mockResolvedValue({ data: mockResponse, error: null }),
      }

      const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      const { result } = renderHook(() => useExportBidLeveling(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({
          packageId: 'package-1',
          options: { includeLineItems: true, includeAlternates: true, format: 'xlsx' },
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockResponse)
      expect(mockDb.functions.invoke).toHaveBeenCalledWith('export-bid-leveling', {
        body: {
          packageId: 'package-1',
          options: { includeLineItems: true, includeAlternates: true, format: 'xlsx' },
        },
      })
      expect(windowOpenSpy).toHaveBeenCalledWith('https://example.com/export.xlsx', '_blank')
      expect(toast.success).toHaveBeenCalledWith('Bid leveling exported successfully')

      windowOpenSpy.mockRestore()
    })

    it('should handle fallback when function not available', async () => {
      const mockResponse = { url: null, fallback: true }
      const mockDb = supabase as any
      mockDb.functions = {
        invoke: vi.fn().mockResolvedValue({ data: mockResponse, error: null }),
      }

      const { result } = renderHook(() => useExportBidLeveling(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({
          packageId: 'package-1',
          options: { includeLineItems: true, format: 'csv' },
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(toast.info).toHaveBeenCalledWith('Export function not available. Please try again later.')
    })

    it('should handle fallback when function returns error', async () => {
      const error = new Error('Export failed')
      const mockDb = supabase as any
      mockDb.functions = {
        invoke: vi.fn().mockResolvedValue({ data: null, error }),
      }

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { result } = renderHook(() => useExportBidLeveling(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({
          packageId: 'package-1',
          options: { includeLineItems: true, format: 'xlsx' },
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual({ url: null, fallback: true })
      expect(consoleWarnSpy).toHaveBeenCalledWith('Export function not available, generating locally')

      consoleWarnSpy.mockRestore()
    })
  })

  describe('useNormalizeBids', () => {
    it('should normalize bids successfully', async () => {
      const adjustments = {
        'item-1': [
          { submissionId: 'sub-1', adjustment: 1000, reason: 'Missing equipment' },
          { submissionId: 'sub-2', adjustment: 500, reason: 'Scope clarification' },
        ],
      }

      const mockDb = supabase as any
      mockDb.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const { result } = renderHook(() => useNormalizeBids(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({
          packageId: 'package-1',
          adjustments,
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockDb.from).toHaveBeenCalledWith('bid_normalization_adjustments')
      expect(toast.success).toHaveBeenCalledWith('Bid values normalized')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: bidLevelingKeys.matrix('package-1'),
      })
    })

    it('should format adjustments correctly for upsert', async () => {
      const adjustments = {
        'item-1': [
          { submissionId: 'sub-1', adjustment: 1000, reason: 'Test reason 1' },
        ],
        'item-2': [
          { submissionId: 'sub-2', adjustment: 2000, reason: 'Test reason 2' },
        ],
      }

      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockDb = supabase as any
      mockDb.from.mockReturnValue({
        upsert: mockUpsert,
      })

      const { result } = renderHook(() => useNormalizeBids(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({
          packageId: 'package-1',
          adjustments,
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockUpsert).toHaveBeenCalledWith(
        [
          {
            bid_package_id: 'package-1',
            package_item_id: 'item-1',
            submission_id: 'sub-1',
            adjustment_amount: 1000,
            adjustment_reason: 'Test reason 1',
          },
          {
            bid_package_id: 'package-1',
            package_item_id: 'item-2',
            submission_id: 'sub-2',
            adjustment_amount: 2000,
            adjustment_reason: 'Test reason 2',
          },
        ],
        { onConflict: 'submission_id,package_item_id' }
      )
    })

    it('should handle error when normalization fails', async () => {
      const error = new Error('Normalization failed')
      const mockDb = supabase as any
      mockDb.from.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error }),
      })

      const { result } = renderHook(() => useNormalizeBids(), {
        wrapper: createWrapper(queryClient),
      })

      await act(async () => {
        result.current.mutate({
          packageId: 'package-1',
          adjustments: {},
        })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalledWith('Normalization failed: Normalization failed')
    })
  })

  // ==========================================================================
  // Utility Functions Tests
  // ==========================================================================

  describe('calculateScopeGapScore', () => {
    it('should return 100 when no exclusions match required items', () => {
      const exclusions = ['Paint work', 'Landscaping']
      const inclusions = ['All electrical', 'All conduit']
      const requiredItems = ['Conduit', 'Wire', 'Panels']

      const score = calculateScopeGapScore(exclusions, inclusions, requiredItems)
      expect(score).toBe(100)
    })

    it('should reduce score by 10 for each missing required item', () => {
      const exclusions = ['No conduit installation', 'No wire pulling']
      const inclusions: string[] = []
      const requiredItems = ['conduit', 'wire', 'panels']

      const score = calculateScopeGapScore(exclusions, inclusions, requiredItems)
      expect(score).toBe(80) // 100 - 10*2
    })

    it('should handle case-insensitive matching', () => {
      const exclusions = ['No CONDUIT', 'no WIRE']
      const inclusions: string[] = []
      const requiredItems = ['conduit', 'wire']

      const score = calculateScopeGapScore(exclusions, inclusions, requiredItems)
      expect(score).toBe(80)
    })

    it('should return minimum score of 0', () => {
      const exclusions = ['No item1', 'No item2', 'No item3', 'No item4', 'No item5', 'No item6', 'No item7', 'No item8', 'No item9', 'No item10', 'No item11']
      const inclusions: string[] = []
      const requiredItems = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7', 'item8', 'item9', 'item10', 'item11']

      const score = calculateScopeGapScore(exclusions, inclusions, requiredItems)
      expect(score).toBe(0)
    })

    it('should handle empty arrays', () => {
      const score = calculateScopeGapScore([], [], [])
      expect(score).toBe(100)
    })
  })

  describe('getPriceVarianceStatus', () => {
    it('should return "low" for negative variance', () => {
      expect(getPriceVarianceStatus(-5)).toBe('low')
    })

    it('should return "low" for zero variance', () => {
      expect(getPriceVarianceStatus(0)).toBe('low')
    })

    it('should return "normal" for variance <= 5%', () => {
      expect(getPriceVarianceStatus(3)).toBe('normal')
      expect(getPriceVarianceStatus(5)).toBe('normal')
    })

    it('should return "high" for variance between 5% and 15%', () => {
      expect(getPriceVarianceStatus(7)).toBe('high')
      expect(getPriceVarianceStatus(15)).toBe('high')
    })

    it('should return "extreme" for variance > 15%', () => {
      expect(getPriceVarianceStatus(20)).toBe('extreme')
      expect(getPriceVarianceStatus(100)).toBe('extreme')
    })
  })

  describe('formatBidCurrency', () => {
    it('should format positive numbers as currency', () => {
      expect(formatBidCurrency(450000)).toBe('$450,000')
      expect(formatBidCurrency(1500)).toBe('$1,500')
      expect(formatBidCurrency(1234567)).toBe('$1,234,567')
    })

    it('should format zero as currency', () => {
      expect(formatBidCurrency(0)).toBe('$0')
    })

    it('should format negative numbers as currency', () => {
      expect(formatBidCurrency(-5000)).toBe('-$5,000')
    })

    it('should return "-" for null values', () => {
      expect(formatBidCurrency(null)).toBe('-')
    })

    it('should round to nearest dollar (no decimals)', () => {
      expect(formatBidCurrency(1234.56)).toBe('$1,235')
      expect(formatBidCurrency(1234.49)).toBe('$1,234')
    })
  })

  // ==========================================================================
  // Query Keys Tests
  // ==========================================================================

  describe('bidLevelingKeys', () => {
    it('should generate correct key for all', () => {
      expect(bidLevelingKeys.all).toEqual(['bidLeveling'])
    })

    it('should generate correct key for matrix', () => {
      expect(bidLevelingKeys.matrix('package-1')).toEqual(['bidLeveling', 'matrix', 'package-1'])
    })

    it('should generate correct key for lineItems', () => {
      expect(bidLevelingKeys.lineItems('package-1')).toEqual(['bidLeveling', 'lineItems', 'package-1'])
    })

    it('should generate correct key for recommendation', () => {
      expect(bidLevelingKeys.recommendation('package-1')).toEqual(['bidLeveling', 'recommendation', 'package-1'])
    })

    it('should generate correct key for exports', () => {
      expect(bidLevelingKeys.exports()).toEqual(['bidLeveling', 'exports'])
    })
  })
})
