/**
 * RFI Trend Report Component Tests
 *
 * Tests for the comprehensive RFI trend report dashboard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RFITrendReport } from './RFITrendReport'
import type { RFIResponseTimeAnalytics } from '@/types/rfi-response-analytics'

// Mock the hooks
vi.mock('@/features/rfis/hooks/useRFIResponseAnalytics', () => ({
  useRFIResponseAnalytics: vi.fn(),
  getDateRangeFromPreset: vi.fn((preset: string) => ({
    startDate: '2024-01-01',
    endDate: '2024-03-31',
  })),
}))

// Mock the chart components to simplify testing
vi.mock('./RFITrendChart', () => ({
  RFITrendChart: ({ title }: any) => <div data-testid="trend-chart">{title}</div>,
  RFIPriorityChart: ({ title }: any) => <div data-testid="priority-chart">{title}</div>,
  RFIAssigneeChart: ({ title }: any) => <div data-testid="assignee-chart">{title}</div>,
  RFIOnTimeTrendChart: ({ title }: any) => <div data-testid="ontime-chart">{title}</div>,
}))

// ============================================================================
// Mock Data
// ============================================================================

const mockAnalytics: RFIResponseTimeAnalytics = {
  projectId: 'project-1',
  dateRange: {
    startDate: '2024-01-01',
    endDate: '2024-03-31',
  },
  generatedAt: '2024-03-31T12:00:00Z',
  summary: {
    projectId: 'project-1',
    dateRange: {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    },
    totalRFIs: 100,
    respondedRFIs: 85,
    pendingRFIs: 15,
    overallAverageResponseDays: 4.5,
    overallMedianResponseDays: 3.8,
    onTimeCount: 68,
    lateCount: 17,
    onTimePercentage: 80,
    statistics: {
      count: 85,
      sum: 382.5,
      mean: 4.5,
      median: 3.8,
      min: 0.5,
      max: 15.0,
      standardDeviation: 2.3,
      variance: 5.29,
    },
  },
  byPriority: [
    {
      priority: 'critical',
      count: 15,
      respondedCount: 14,
      averageResponseDays: 0.8,
      medianResponseDays: 0.5,
      onTimePercentage: 95,
      targetResponseDays: 1,
    },
    {
      priority: 'high',
      count: 25,
      respondedCount: 23,
      averageResponseDays: 2.5,
      medianResponseDays: 2.0,
      onTimePercentage: 88,
      targetResponseDays: 3,
    },
    {
      priority: 'normal',
      count: 40,
      respondedCount: 36,
      averageResponseDays: 5.5,
      medianResponseDays: 5.0,
      onTimePercentage: 75,
      targetResponseDays: 7,
    },
    {
      priority: 'low',
      count: 20,
      respondedCount: 18,
      averageResponseDays: 10.2,
      medianResponseDays: 9.5,
      onTimePercentage: 70,
      targetResponseDays: 14,
    },
  ],
  byAssignee: [
    {
      assigneeId: 'user-1',
      assigneeName: 'John Smith',
      assigneeRole: 'architect',
      totalAssigned: 25,
      respondedCount: 24,
      averageResponseDays: 3.2,
      medianResponseDays: 3.0,
      onTimePercentage: 96,
      fastestResponseDays: 0.5,
      slowestResponseDays: 7.0,
      performanceRating: 'excellent',
    },
    {
      assigneeId: 'user-2',
      assigneeName: 'Jane Doe',
      assigneeRole: 'engineer',
      totalAssigned: 30,
      respondedCount: 28,
      averageResponseDays: 4.5,
      medianResponseDays: 4.0,
      onTimePercentage: 89,
      fastestResponseDays: 1.0,
      slowestResponseDays: 9.0,
      performanceRating: 'good',
    },
    {
      assigneeId: 'user-3',
      assigneeName: 'Bob Johnson',
      assigneeRole: 'gc',
      totalAssigned: 20,
      respondedCount: 18,
      averageResponseDays: 6.8,
      medianResponseDays: 6.5,
      onTimePercentage: 65,
      fastestResponseDays: 2.0,
      slowestResponseDays: 12.0,
      performanceRating: 'needs_improvement',
    },
  ],
  byResponseType: [
    {
      responseType: 'answered',
      count: 45,
      averageResponseDays: 4.2,
      medianResponseDays: 3.5,
      percentage: 52.9,
    },
    {
      responseType: 'see_drawings',
      count: 20,
      averageResponseDays: 3.8,
      medianResponseDays: 3.0,
      percentage: 23.5,
    },
    {
      responseType: 'partial_response',
      count: 10,
      averageResponseDays: 5.5,
      medianResponseDays: 5.0,
      percentage: 11.8,
    },
  ],
  distribution: {
    projectId: 'project-1',
    dateRange: {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    },
    totalResponded: 85,
    onTimeResponses: 68,
    lateResponses: 17,
    onTimePercentage: 80,
    percentiles: {
      p50: 3.8,
      p75: 5.5,
      p90: 8.2,
      p95: 10.5,
      p99: 14.0,
    },
    buckets: [],
  },
  trends: {
    projectId: 'project-1',
    dateRange: {
      startDate: '2024-01-01',
      endDate: '2024-03-31',
    },
    granularity: 'week',
    dataPoints: [
      {
        period: '2024-01-01',
        periodStart: '2024-01-01',
        periodEnd: '2024-01-07',
        totalRFIs: 10,
        respondedRFIs: 8,
        averageResponseDays: 5.2,
        medianResponseDays: 4.5,
        onTimePercentage: 75,
      },
      {
        period: '2024-01-08',
        periodStart: '2024-01-08',
        periodEnd: '2024-01-14',
        totalRFIs: 12,
        respondedRFIs: 10,
        averageResponseDays: 4.2,
        medianResponseDays: 3.8,
        onTimePercentage: 85,
      },
    ],
    overallTrend: 'improving',
    trendPercentageChange: -15.5,
    movingAverages: [],
  },
  byDayOfWeek: [],
  byMonth: [],
  fastestResponses: [],
  slowestResponses: [],
}

// ============================================================================
// Test Setup
// ============================================================================

function createWrapper() {
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

// ============================================================================
// Tests
// ============================================================================

describe('RFITrendReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    // Check for skeleton loaders
    expect(document.querySelectorAll('[class*="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders error state', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to fetch analytics'),
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('Failed to load trend report')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch analytics')).toBeInTheDocument()
  })

  it('renders trend report with data', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('RFI Trend Report')).toBeInTheDocument()
    expect(screen.getByText(/Analysis generated on/)).toBeInTheDocument()
  })

  it('displays summary statistics', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('4.5 days')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('80.0%')).toBeInTheDocument()
    expect(screen.getByText('3.8 days')).toBeInTheDocument()
  })

  it('displays trend indicator', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('15.5%')).toBeInTheDocument()
  })

  it('renders all chart components', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByTestId('trend-chart')).toBeInTheDocument()
    expect(screen.getByTestId('priority-chart')).toBeInTheDocument()
    expect(screen.getByTestId('assignee-chart')).toBeInTheDocument()
    expect(screen.getByTestId('ontime-chart')).toBeInTheDocument()
  })

  it('displays recurring issue categories', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('Recurring Issue Categories')).toBeInTheDocument()
    expect(screen.getByText(/answered/i)).toBeInTheDocument()
    expect(screen.getByText(/see drawings/i)).toBeInTheDocument()
  })

  it('displays top performers', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('Top Performers')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('displays assignees needing attention', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('Needs Attention')).toBeInTheDocument()
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
  })

  it('displays improving trend insight', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('Response times are improving')).toBeInTheDocument()
  })

  it('displays declining trend insight', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: {
        ...mockAnalytics,
        trends: {
          ...mockAnalytics.trends,
          overallTrend: 'declining',
          trendPercentageChange: 20.5,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('Response times are declining')).toBeInTheDocument()
  })

  it('displays low on-time performance insight', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: {
        ...mockAnalytics,
        summary: {
          ...mockAnalytics.summary,
          onTimePercentage: 70,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('On-time performance needs improvement')).toBeInTheDocument()
  })

  it('displays workload redistribution insight when assignees need attention', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('Consider workload redistribution')).toBeInTheDocument()
  })

  it('allows changing date range filter', async () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    const mockHook = vi.fn().mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })
    useRFIResponseAnalytics.mockImplementation(mockHook)

    const user = userEvent.setup()
    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    // Find and click the date range select
    const dateRangeSelects = screen.getAllByRole('combobox')
    const dateRangeSelect = dateRangeSelects[0]

    await user.click(dateRangeSelect)

    // Wait for options to appear
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Last 30 Days' })).toBeInTheDocument()
    })
  })

  it('allows changing priority filter', async () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    const mockHook = vi.fn().mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })
    useRFIResponseAnalytics.mockImplementation(mockHook)

    const user = userEvent.setup()
    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    // Find priority filter select (second combobox)
    const selects = screen.getAllByRole('combobox')
    const prioritySelect = selects[1]

    await user.click(prioritySelect)

    // Wait for options to appear
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'All Priorities' })).toBeInTheDocument()
    })
  })

  it('handles export PDF button click', async () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    // Mock window.alert
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})

    const user = userEvent.setup()
    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    const exportButton = screen.getByRole('button', { name: /export pdf/i })
    await user.click(exportButton)

    expect(alertMock).toHaveBeenCalledWith(
      'PDF export functionality would be implemented here using jsPDF or similar library'
    )

    alertMock.mockRestore()
  })

  it('applies custom className', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isError: false,
      error: null,
    })

    const { container } = render(
      <RFITrendReport projectId="project-1" className="custom-report-class" />,
      { wrapper: createWrapper() }
    )

    expect(container.querySelector('.custom-report-class')).toBeInTheDocument()
  })

  it('shows no assignees needing attention message when all perform well', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: {
        ...mockAnalytics,
        byAssignee: mockAnalytics.byAssignee.map((a) => ({
          ...a,
          performanceRating: 'excellent',
        })),
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('All assignees performing well')).toBeInTheDocument()
  })

  it('shows no recurring issues message when response types are empty', () => {
    const { useRFIResponseAnalytics } = require('@/features/rfis/hooks/useRFIResponseAnalytics')
    useRFIResponseAnalytics.mockReturnValue({
      data: {
        ...mockAnalytics,
        byResponseType: [],
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<RFITrendReport projectId="project-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('No recurring issues identified')).toBeInTheDocument()
  })
})
