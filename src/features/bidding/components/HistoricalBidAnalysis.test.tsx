/**
 * Tests for Historical Bid Analysis Component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HistoricalBidAnalysis } from './HistoricalBidAnalysis'
import { historicalBidAnalysisApi } from '@/lib/api/services/historical-bid-analysis'

// Mock the API service
vi.mock('@/lib/api/services/historical-bid-analysis')

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

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  ComposedChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Cell: () => null,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('HistoricalBidAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render loading state initially', () => {
    vi.mocked(historicalBidAnalysisApi.getBidTrendAnalysis).mockReturnValue(
      new Promise(() => {}) // Never resolves
    )
    vi.mocked(historicalBidAnalysisApi.getRecommendedVendors).mockReturnValue(
      new Promise(() => {})
    )

    render(<HistoricalBidAnalysis />, { wrapper: createWrapper() })

    expect(screen.getByText('Historical Bid Analysis')).toBeInTheDocument()
  })

  it('should display summary cards with data', async () => {
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
        reasons: ['Strong win rate'],
        concerns: [],
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

    vi.mocked(historicalBidAnalysisApi.getRecommendedVendors).mockResolvedValue({
      success: true,
      data: mockRecommendations,
      metadata: {
        total_evaluated: 25,
        criteria: { limit: 5 },
        generated_at: new Date().toISOString(),
      },
    })

    render(<HistoricalBidAnalysis />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Total Bids Analyzed/i)).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument() // bid count
    })
  })

  it('should allow filtering by date range', async () => {
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
        criteria: {},
        generated_at: new Date().toISOString(),
      },
    })

    render(<HistoricalBidAnalysis />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText('From Date')).toBeInTheDocument()
      expect(screen.getByLabelText('To Date')).toBeInTheDocument()
    })

    const fromDateInput = screen.getByLabelText('From Date')
    fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } })

    expect(fromDateInput).toHaveValue('2024-01-01')
  })

  it('should switch between tabs', async () => {
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
        criteria: {},
        generated_at: new Date().toISOString(),
      },
    })

    render(<HistoricalBidAnalysis />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Bid Trends/i })).toBeInTheDocument()
    })

    const vendorTab = screen.getByRole('tab', { name: /Vendor Performance/i })
    fireEvent.click(vendorTab)

    await waitFor(() => {
      expect(screen.getByText(/Top Performing Vendors/i)).toBeInTheDocument()
    })
  })

  it('should display error state when data fetch fails', async () => {
    vi.mocked(historicalBidAnalysisApi.getBidTrendAnalysis).mockRejectedValue(
      new Error('Failed to fetch trends')
    )
    vi.mocked(historicalBidAnalysisApi.getRecommendedVendors).mockRejectedValue(
      new Error('Failed to fetch recommendations')
    )

    render(<HistoricalBidAnalysis />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Failed to load bid analysis data/i)).toBeInTheDocument()
    })
  })

  it('should show empty state when no data available', async () => {
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
        criteria: {},
        generated_at: new Date().toISOString(),
      },
    })

    render(<HistoricalBidAnalysis />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/No trend data available/i)).toBeInTheDocument()
    })
  })
})
