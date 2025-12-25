/**
 * Tests for Historical Bid Analysis Hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { format, subMonths } from 'date-fns'
import {
  useVendorBidHistory,
  useVendorWinRate,
  useBidAccuracyAnalysis,
  usePriceVarianceByTrade,
  useBidTrendAnalysis,
  useRecommendedVendors,
  useBidPerformanceReport,
  useGeneratePerformanceReport,
  useBidAnalysisDashboard,
} from './useHistoricalBidAnalysis'
import { historicalBidAnalysisApi } from '@/lib/api/services/historical-bid-analysis'
import type { VendorBidHistory, BidAccuracyMetrics } from '@/types/historical-bid-analysis'

// Mock the API service
vi.mock('@/lib/api/services/historical-bid-analysis', () => ({
  historicalBidAnalysisApi: {
    getVendorBidHistory: vi.fn(),
    getVendorWinRate: vi.fn(),
    getBidAccuracyAnalysis: vi.fn(),
    getPriceVarianceByTrade: vi.fn(),
    getBidTrendAnalysis: vi.fn(),
    getRecommendedVendors: vi.fn(),
    generateBidPerformanceReport: vi.fn(),
  },
}))

// Mock auth context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-1',
      company_id: 'company-1',
      email: 'test@example.com',
    },
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

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Historical Bid Analysis Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useVendorBidHistory', () => {
    it('should fetch vendor bid history successfully', async () => {
      const mockHistory: VendorBidHistory = {
        vendor_id: 'vendor-1',
        vendor_name: 'Test Vendor',
        contact_name: 'John Doe',
        contact_email: 'john@test.com',
        total_bids: 10,
        wins: 6,
        win_rate: 60,
        losses: 4,
        total_bid_value: 1000000,
        average_bid_amount: 100000,
        median_bid_amount: 95000,
        min_bid_amount: 50000,
        max_bid_amount: 150000,
        average_markup: 10.5,
        primary_trades: ['23', '26'],
        trades: ['23', '26', '03'],
        average_response_time_days: 5.2,
        late_bids: 1,
        late_bid_rate: 10,
        completed_projects: 5,
        completion_rate: 83.3,
        average_quality_score: 87.5,
        reliability_score: 88.5,
        reliability_level: 'high',
        bid_history: [],
        recent_win_rate: 65,
        win_rate_trend: 'increasing',
        markup_trend: 'stable',
      }

      vi.mocked(historicalBidAnalysisApi.getVendorBidHistory).mockResolvedValue({
        success: true,
        data: mockHistory,
        metadata: {
          queried_at: new Date().toISOString(),
          date_range: {
            from: '2024-01-01',
            to: '2024-12-31',
          },
        },
      })

      const { result } = renderHook(
        () => useVendorBidHistory('vendor-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockHistory)
      expect(result.current.data?.vendor_name).toBe('Test Vendor')
      expect(result.current.data?.win_rate).toBe(60)
      expect(historicalBidAnalysisApi.getVendorBidHistory).toHaveBeenCalledWith(
        'vendor-1',
        expect.objectContaining({
          companyId: 'company-1',
        })
      )
    })

    it('should handle filters', async () => {
      vi.mocked(historicalBidAnalysisApi.getVendorBidHistory).mockResolvedValue({
        success: true,
        data: {} as VendorBidHistory,
        metadata: {
          queried_at: new Date().toISOString(),
          date_range: { from: '2024-01-01', to: '2024-12-31' },
        },
      })

      const { result } = renderHook(
        () => useVendorBidHistory('vendor-1', {
          dateFrom: '2024-01-01',
          dateTo: '2024-06-30',
          divisions: ['23', '26'],
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(historicalBidAnalysisApi.getVendorBidHistory).toHaveBeenCalledWith(
        'vendor-1',
        expect.objectContaining({
          dateFrom: '2024-01-01',
          dateTo: '2024-06-30',
          divisions: ['23', '26'],
        })
      )
    })

    it('should not fetch when vendor ID is undefined', () => {
      const { result } = renderHook(
        () => useVendorBidHistory(undefined),
        { wrapper: createWrapper() }
      )

      expect(result.current.isPending).toBe(true)
      expect(historicalBidAnalysisApi.getVendorBidHistory).not.toHaveBeenCalled()
    })

    it('should not fetch when enabled is false', () => {
      const { result } = renderHook(
        () => useVendorBidHistory('vendor-1', { enabled: false }),
        { wrapper: createWrapper() }
      )

      expect(result.current.isPending).toBe(true)
      expect(historicalBidAnalysisApi.getVendorBidHistory).not.toHaveBeenCalled()
    })
  })

  describe('useVendorWinRate', () => {
    it('should fetch vendor win rate statistics', async () => {
      const mockWinRate = {
        vendor_name: 'Test Vendor',
        win_rate: 60,
        wins: 6,
        total_bids: 10,
        average_markup: 10.5,
        by_division: [
          {
            division: '23',
            division_name: 'HVAC',
            win_rate: 66.7,
            wins: 4,
            total_bids: 6,
          },
          {
            division: '26',
            division_name: 'Electrical',
            win_rate: 50,
            wins: 2,
            total_bids: 4,
          },
        ],
      }

      vi.mocked(historicalBidAnalysisApi.getVendorWinRate).mockResolvedValue(mockWinRate)

      const { result } = renderHook(
        () => useVendorWinRate('vendor-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockWinRate)
      expect(result.current.data?.by_division).toHaveLength(2)
    })
  })

  describe('useBidAccuracyAnalysis', () => {
    it('should fetch bid accuracy analysis', async () => {
      const mockAccuracy: BidAccuracyMetrics = {
        project_id: 'proj-1',
        project_name: 'Test Project',
        project_number: 'P-001',
        estimated_total: 1000000,
        actual_total: 1050000,
        variance: 50000,
        variance_percentage: 5,
        accuracy_rating: 'excellent',
        by_trade: [
          {
            division: '23',
            division_name: 'HVAC',
            csi_code: '23',
            estimated_amount: 500000,
            actual_amount: 525000,
            variance: 25000,
            variance_percentage: 5,
            line_item_count: 5,
            is_over_budget: true,
            accuracy_rating: 'excellent',
          },
        ],
        total_line_items: 10,
        over_budget_items: 5,
        under_budget_items: 3,
        on_budget_items: 2,
        largest_overrun: null,
        largest_savings: null,
        analysis_date: new Date().toISOString(),
        completion_date: '2024-06-01',
        data_quality: 'complete',
      }

      vi.mocked(historicalBidAnalysisApi.getBidAccuracyAnalysis).mockResolvedValue({
        success: true,
        data: [mockAccuracy],
        summary: {
          total_projects: 1,
          average_accuracy: 5,
          total_variance: 50000,
        },
      })

      const { result } = renderHook(
        () => useBidAccuracyAnalysis('proj-1'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockAccuracy)
      expect(result.current.data?.accuracy_rating).toBe('excellent')
    })
  })

  describe('usePriceVarianceByTrade', () => {
    it('should fetch price variance by trade', async () => {
      const mockVariance = {
        division: '23',
        division_name: 'HVAC',
        average_variance_percentage: 7.5,
        variance_count: 15,
        over_budget_count: 8,
        under_budget_count: 7,
        total_estimated: 1500000,
        total_actual: 1612500,
        projects_analyzed: 10,
      }

      vi.mocked(historicalBidAnalysisApi.getPriceVarianceByTrade).mockResolvedValue(mockVariance)

      const { result } = renderHook(
        () => usePriceVarianceByTrade('23'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockVariance)
      expect(result.current.data?.division).toBe('23')
    })
  })

  describe('useBidTrendAnalysis', () => {
    it('should fetch bid trends with default date range', async () => {
      const mockTrends = [
        {
          period: '2024-01',
          period_label: 'Jan 2024',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          bid_count: 15,
          win_count: 6,
          win_rate: 40,
          total_bid_value: 1500000,
          average_bid: 100000,
          median_bid: 95000,
          average_markup: 10.5,
          markup_stddev: 2.3,
          trend_direction: 'stable' as const,
          month_over_month_change: null,
        },
      ]

      vi.mocked(historicalBidAnalysisApi.getBidTrendAnalysis).mockResolvedValue({
        success: true,
        data: mockTrends,
        metadata: {
          periods: 1,
          earliest_date: '2024-01-01',
          latest_date: '2024-01-31',
        },
      })

      const { result } = renderHook(
        () => useBidTrendAnalysis(),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockTrends)
      expect(historicalBidAnalysisApi.getBidTrendAnalysis).toHaveBeenCalledWith(
        'company-1',
        expect.objectContaining({
          from: expect.any(String),
          to: expect.any(String),
        })
      )
    })

    it('should use custom date range', async () => {
      vi.mocked(historicalBidAnalysisApi.getBidTrendAnalysis).mockResolvedValue({
        success: true,
        data: [],
        metadata: {
          periods: 0,
          earliest_date: '2024-01-01',
          latest_date: '2024-06-30',
        },
      })

      const { result } = renderHook(
        () => useBidTrendAnalysis({
          from: '2024-01-01',
          to: '2024-06-30',
        }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(historicalBidAnalysisApi.getBidTrendAnalysis).toHaveBeenCalledWith(
        'company-1',
        {
          from: '2024-01-01',
          to: '2024-06-30',
        }
      )
    })
  })

  describe('useRecommendedVendors', () => {
    it('should fetch vendor recommendations', async () => {
      const mockRecommendations = [
        {
          rank: 1,
          vendor_id: 'vendor-1',
          vendor_name: 'Top Vendor',
          score: 85.5,
          score_breakdown: {
            win_rate_score: 22.5,
            pricing_score: 20,
            reliability_score: 23,
            experience_score: 20,
          },
          win_rate: 65,
          average_markup: 8.5,
          completion_rate: 95,
          quality_score: 90,
          similar_projects: 8,
          same_trade_bids: 15,
          recent_activity: true,
          reliability_level: 'high' as const,
          on_time_delivery: 92,
          confidence: 'high' as const,
          reasons: ['Strong win rate', 'Excellent completion rate'],
          concerns: [],
        },
      ]

      vi.mocked(historicalBidAnalysisApi.getRecommendedVendors).mockResolvedValue({
        success: true,
        data: mockRecommendations,
        metadata: {
          total_evaluated: 25,
          criteria: { limit: 5 },
          generated_at: new Date().toISOString(),
        },
      })

      const { result } = renderHook(
        () => useRecommendedVendors({ trade_type: '23', limit: 5 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockRecommendations)
      expect(result.current.data?.[0].rank).toBe(1)
    })
  })

  describe('useBidPerformanceReport', () => {
    it('should fetch performance report', async () => {
      const mockReport = {
        report_id: 'report-1',
        generated_at: new Date().toISOString(),
        generated_by: 'user-1',
        filters: {
          date_from: '2024-01-01',
          date_to: '2024-12-31',
        },
        date_range: {
          from: '2024-01-01',
          to: '2024-12-31',
          total_days: 365,
        },
        summary: {
          total_bids: 150,
          total_bid_value: 15000000,
          total_packages: 45,
          unique_vendors: 30,
          average_bids_per_package: 3.3,
          overall_win_rate: 42,
          average_markup: 10.5,
          total_variance: 250000,
          overall_accuracy: 'good' as const,
        },
        vendor_performance: [],
        top_vendors: [],
        bid_accuracy: [],
        average_accuracy_rating: 'good' as const,
        bid_trends: [],
        price_trends: [],
        markup_distribution: {
          ranges: [],
          mean: 10.5,
          median: 10,
          mode: null,
          std_dev: 2.5,
          min: 5,
          max: 20,
          q1: 8,
          q2: 10,
          q3: 13,
          iqr: 5,
          by_trade: [],
        },
        insights: [],
      }

      vi.mocked(historicalBidAnalysisApi.generateBidPerformanceReport).mockResolvedValue({
        success: true,
        data: mockReport,
      })

      const filters = {
        date_from: '2024-01-01',
        date_to: '2024-12-31',
      }

      const { result } = renderHook(
        () => useBidPerformanceReport(filters),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockReport)
      expect(result.current.data?.summary.total_bids).toBe(150)
    })
  })

  describe('useGeneratePerformanceReport', () => {
    it('should generate report and show success toast', async () => {
      const mockReport = {
        report_id: 'report-1',
        generated_at: new Date().toISOString(),
        generated_by: null,
        filters: { date_from: '2024-01-01', date_to: '2024-12-31' },
        date_range: { from: '2024-01-01', to: '2024-12-31', total_days: 365 },
        summary: {
          total_bids: 0,
          total_bid_value: 0,
          total_packages: 0,
          unique_vendors: 0,
          average_bids_per_package: 0,
          overall_win_rate: 0,
          average_markup: 0,
          total_variance: 0,
          overall_accuracy: 'good' as const,
        },
        vendor_performance: [],
        top_vendors: [],
        bid_accuracy: [],
        average_accuracy_rating: 'good' as const,
        bid_trends: [],
        price_trends: [],
        markup_distribution: {
          ranges: [],
          mean: 0,
          median: 0,
          mode: null,
          std_dev: 0,
          min: 0,
          max: 0,
          q1: 0,
          q2: 0,
          q3: 0,
          iqr: 0,
          by_trade: [],
        },
        insights: [],
      }

      vi.mocked(historicalBidAnalysisApi.generateBidPerformanceReport).mockResolvedValue({
        success: true,
        data: mockReport,
      })

      const { result } = renderHook(
        () => useGeneratePerformanceReport(),
        { wrapper: createWrapper() }
      )

      const filters = {
        date_from: '2024-01-01',
        date_to: '2024-12-31',
      }

      result.current.mutate(filters)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockReport)
    })
  })

  describe('useBidAnalysisDashboard', () => {
    it('should fetch combined dashboard data', async () => {
      vi.mocked(historicalBidAnalysisApi.getBidTrendAnalysis).mockResolvedValue({
        success: true,
        data: [],
        metadata: {
          periods: 0,
          earliest_date: '2024-01-01',
          latest_date: '2024-12-31',
        },
      })

      vi.mocked(historicalBidAnalysisApi.getRecommendedVendors).mockResolvedValue({
        success: true,
        data: [],
        metadata: {
          total_evaluated: 0,
          criteria: { limit: 5 },
          generated_at: new Date().toISOString(),
        },
      })

      const { result } = renderHook(
        () => useBidAnalysisDashboard(),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.trends.data).toBeDefined()
      expect(result.current.recommendations.data).toBeDefined()
    })
  })
})
