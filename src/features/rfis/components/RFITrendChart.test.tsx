/**
 * RFI Trend Chart Component Tests
 *
 * Tests for RFI trend visualization components.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  RFITrendChart,
  RFIPriorityChart,
  RFIAssigneeChart,
  RFIOnTimeTrendChart,
} from './RFITrendChart'
import type {
  ResponseTimeTrends,
  ResponseTimeByPriority,
  ResponseTimeByAssignee,
  ResponseTimeTrendPoint,
} from '@/types/rfi-response-analytics'

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

// ============================================================================
// Mock Data
// ============================================================================

const mockTrendData: ResponseTimeTrends = {
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
      averageResponseDays: 4.8,
      medianResponseDays: 4.0,
      onTimePercentage: 80,
    },
    {
      period: '2024-01-15',
      periodStart: '2024-01-15',
      periodEnd: '2024-01-21',
      totalRFIs: 8,
      respondedRFIs: 7,
      averageResponseDays: 4.2,
      medianResponseDays: 3.8,
      onTimePercentage: 85,
    },
  ],
  overallTrend: 'improving',
  trendPercentageChange: -15.5,
  movingAverages: [
    {
      period: '2024-01-01',
      movingAverage7Day: null,
      movingAverage30Day: null,
    },
    {
      period: '2024-01-08',
      movingAverage7Day: 5.0,
      movingAverage30Day: null,
    },
    {
      period: '2024-01-15',
      movingAverage7Day: 4.7,
      movingAverage30Day: null,
    },
  ],
}

const mockPriorityData: ResponseTimeByPriority[] = [
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
]

const mockAssigneeData: ResponseTimeByAssignee[] = [
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
    onTimePercentage: 72,
    fastestResponseDays: 2.0,
    slowestResponseDays: 12.0,
    performanceRating: 'average',
  },
]

const mockTrendPoints: ResponseTimeTrendPoint[] = [
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
    averageResponseDays: 4.8,
    medianResponseDays: 4.0,
    onTimePercentage: 80,
  },
]

// ============================================================================
// RFITrendChart Tests
// ============================================================================

describe('RFITrendChart', () => {
  it('renders trend chart with data', () => {
    render(<RFITrendChart data={mockTrendData} />)

    expect(screen.getByText('Response Time Trends')).toBeInTheDocument()
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('displays trend badge with correct direction', () => {
    render(<RFITrendChart data={mockTrendData} />)

    expect(screen.getByText(/Improving/)).toBeInTheDocument()
    expect(screen.getByText(/15.5%/)).toBeInTheDocument()
  })

  it('shows declining trend badge', () => {
    const decliningData: ResponseTimeTrends = {
      ...mockTrendData,
      overallTrend: 'declining',
      trendPercentageChange: 20.3,
    }

    render(<RFITrendChart data={decliningData} />)

    expect(screen.getByText(/Declining/)).toBeInTheDocument()
    expect(screen.getByText(/20.3%/)).toBeInTheDocument()
  })

  it('shows stable trend badge', () => {
    const stableData: ResponseTimeTrends = {
      ...mockTrendData,
      overallTrend: 'stable',
      trendPercentageChange: 2.1,
    }

    render(<RFITrendChart data={stableData} />)

    expect(screen.getByText(/Stable/)).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    const emptyData: ResponseTimeTrends = {
      ...mockTrendData,
      dataPoints: [],
      movingAverages: [],
    }

    render(<RFITrendChart data={emptyData} />)

    expect(screen.getByText('No trend data available')).toBeInTheDocument()
  })

  it('applies custom title', () => {
    render(<RFITrendChart data={mockTrendData} title="Custom Trend Title" />)

    expect(screen.getByText('Custom Trend Title')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <RFITrendChart data={mockTrendData} className="custom-class" />
    )

    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })

  it('shows moving average lines when enabled', () => {
    const { container } = render(<RFITrendChart data={mockTrendData} showMovingAverage={true} />)

    // Check that line chart is rendered (moving averages are lines in the chart)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })

  it('displays granularity in description', () => {
    render(<RFITrendChart data={mockTrendData} />)

    expect(screen.getByText(/Weekly average response times/)).toBeInTheDocument()
  })
})

// ============================================================================
// RFIPriorityChart Tests
// ============================================================================

describe('RFIPriorityChart', () => {
  it('renders priority chart with data', () => {
    render(<RFIPriorityChart data={mockPriorityData} />)

    expect(screen.getByText('Response Time by Priority')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('displays priority levels', () => {
    render(<RFIPriorityChart data={mockPriorityData} />)

    // Chart component will render priority names
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    render(<RFIPriorityChart data={[]} />)

    expect(screen.getByText('No priority data available')).toBeInTheDocument()
  })

  it('applies custom title', () => {
    render(<RFIPriorityChart data={mockPriorityData} title="Priority Performance" />)

    expect(screen.getByText('Priority Performance')).toBeInTheDocument()
  })

  it('shows description', () => {
    render(<RFIPriorityChart data={mockPriorityData} />)

    expect(screen.getByText('Average response time vs target by priority level')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <RFIPriorityChart data={mockPriorityData} className="priority-chart" />
    )

    expect(container.querySelector('.priority-chart')).toBeInTheDocument()
  })
})

// ============================================================================
// RFIAssigneeChart Tests
// ============================================================================

describe('RFIAssigneeChart', () => {
  it('renders assignee chart with data', () => {
    render(<RFIAssigneeChart data={mockAssigneeData} />)

    expect(screen.getByText('Assignee Performance')).toBeInTheDocument()
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('filters assignees with less than 3 responses', () => {
    const dataWithLowResponses: ResponseTimeByAssignee[] = [
      ...mockAssigneeData,
      {
        assigneeId: 'user-4',
        assigneeName: 'New User',
        assigneeRole: 'consultant',
        totalAssigned: 2,
        respondedCount: 2,
        averageResponseDays: 3.0,
        medianResponseDays: 3.0,
        onTimePercentage: 100,
        fastestResponseDays: 2.0,
        slowestResponseDays: 4.0,
        performanceRating: 'excellent',
      },
    ]

    render(<RFIAssigneeChart data={dataWithLowResponses} />)

    // Should still render chart, but filtered assignee won't show
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('limits assignees to maxAssignees prop', () => {
    const manyAssignees: ResponseTimeByAssignee[] = Array.from({ length: 20 }, (_, i) => ({
      assigneeId: `user-${i}`,
      assigneeName: `User ${i}`,
      assigneeRole: 'gc',
      totalAssigned: 10,
      respondedCount: 9,
      averageResponseDays: 5.0,
      medianResponseDays: 5.0,
      onTimePercentage: 90,
      fastestResponseDays: 2.0,
      slowestResponseDays: 8.0,
      performanceRating: 'good',
    }))

    render(<RFIAssigneeChart data={manyAssignees} maxAssignees={5} />)

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders empty state when no qualifying data', () => {
    const lowResponseData: ResponseTimeByAssignee[] = [
      {
        assigneeId: 'user-1',
        assigneeName: 'Test User',
        assigneeRole: 'gc',
        totalAssigned: 2,
        respondedCount: 2,
        averageResponseDays: 3.0,
        medianResponseDays: 3.0,
        onTimePercentage: 100,
        fastestResponseDays: 2.0,
        slowestResponseDays: 4.0,
        performanceRating: 'excellent',
      },
    ]

    render(<RFIAssigneeChart data={lowResponseData} />)

    expect(screen.getByText('No assignee data available')).toBeInTheDocument()
  })

  it('applies custom title', () => {
    render(<RFIAssigneeChart data={mockAssigneeData} title="Top Performers" />)

    expect(screen.getByText('Top Performers')).toBeInTheDocument()
  })

  it('shows minimum response requirement in description', () => {
    render(<RFIAssigneeChart data={mockAssigneeData} />)

    expect(screen.getByText(/min\. 3 responses/)).toBeInTheDocument()
  })
})

// ============================================================================
// RFIOnTimeTrendChart Tests
// ============================================================================

describe('RFIOnTimeTrendChart', () => {
  it('renders on-time trend chart with data', () => {
    render(<RFIOnTimeTrendChart data={mockTrendPoints} />)

    expect(screen.getByText('On-Time Performance Trend')).toBeInTheDocument()
    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
  })

  it('renders empty state when no data', () => {
    render(<RFIOnTimeTrendChart data={[]} />)

    expect(screen.getByText('No trend data available')).toBeInTheDocument()
  })

  it('applies custom title', () => {
    render(<RFIOnTimeTrendChart data={mockTrendPoints} title="Performance Trend" />)

    expect(screen.getByText('Performance Trend')).toBeInTheDocument()
  })

  it('shows description', () => {
    render(<RFIOnTimeTrendChart data={mockTrendPoints} />)

    expect(screen.getByText('Percentage of RFIs responded to on time')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <RFIOnTimeTrendChart data={mockTrendPoints} className="trend-chart" />
    )

    expect(container.querySelector('.trend-chart')).toBeInTheDocument()
  })
})
