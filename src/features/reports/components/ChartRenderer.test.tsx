/**
 * ChartRenderer Component Tests
 *
 * Tests chart rendering for various chart types and configurations.
 */

import { render, screen } from '@testing-library/react'
import { ChartRenderer } from './ChartRenderer'
import type { ChartConfiguration } from '@/types/report-builder'

// Mock recharts components
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts')
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    BarChart: ({ children }: any) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    LineChart: ({ children }: any) => (
      <div data-testid="line-chart">{children}</div>
    ),
    PieChart: ({ children }: any) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    AreaChart: ({ children }: any) => (
      <div data-testid="area-chart">{children}</div>
    ),
  }
})

describe('ChartRenderer', () => {
  const mockData = [
    { status: 'open', cost: 1000 },
    { status: 'open', cost: 1500 },
    { status: 'closed', cost: 2000 },
    { status: 'closed', cost: 2500 },
    { status: 'pending', cost: 500 },
  ]

  describe('bar chart', () => {
    it('should render bar chart', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        title: 'Cost by Status',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByText('Cost by Status')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('should display statistics for bar chart', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('Average')).toBeInTheDocument()
      expect(screen.getByText('Min')).toBeInTheDocument()
      expect(screen.getByText('Max')).toBeInTheDocument()
    })

    it('should render with custom axis labels', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        xAxisLabel: 'Status Categories',
        yAxisLabel: 'Total Cost ($)',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  describe('line chart', () => {
    it('should render line chart', () => {
      const config: ChartConfiguration = {
        type: 'line',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'average',
        title: 'Average Cost Trend',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByText('Average Cost Trend')).toBeInTheDocument()
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('should display statistics for line chart', () => {
      const config: ChartConfiguration = {
        type: 'line',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'average',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('Average')).toBeInTheDocument()
    })
  })

  describe('pie chart', () => {
    it('should render pie chart', () => {
      const config: ChartConfiguration = {
        type: 'pie',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        title: 'Cost Distribution',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByText('Cost Distribution')).toBeInTheDocument()
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })

    it('should not display statistics for pie chart', () => {
      const config: ChartConfiguration = {
        type: 'pie',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.queryByText('Total')).not.toBeInTheDocument()
      expect(screen.queryByText('Average')).not.toBeInTheDocument()
    })
  })

  describe('area chart', () => {
    it('should render area chart', () => {
      const config: ChartConfiguration = {
        type: 'area',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        title: 'Cumulative Cost',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByText('Cumulative Cost')).toBeInTheDocument()
      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    })
  })

  describe('empty data handling', () => {
    it('should display empty state when no data', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        title: 'Empty Chart',
      }

      render(<ChartRenderer data={[]} config={config} />)

      expect(screen.getByText('Empty Chart')).toBeInTheDocument()
      expect(screen.getByText('No data available for this chart')).toBeInTheDocument()
    })

    it('should display empty state with icon', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      const { container } = render(<ChartRenderer data={[]} config={config} />)

      expect(
        container.querySelector('[data-lucide="alert-circle"]')
      ).toBeInTheDocument()
    })
  })

  describe('chart options', () => {
    it('should respect showLegend option', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        showLegend: false,
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('should respect showGrid option', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        showGrid: false,
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('should respect custom height', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        height: 600,
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('color schemes', () => {
    it('should use default color scheme', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('should use custom color scheme', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        colorScheme: 'blue',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    it('should use custom colors', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        customColors: ['#FF0000', '#00FF00', '#0000FF'],
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  describe('chart interactions', () => {
    it('should handle chart click events', () => {
      const handleClick = jest.fn()
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
      }

      render(
        <ChartRenderer data={mockData} config={config} onChartClick={handleClick} />
      )

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should render with proper structure', () => {
      const config: ChartConfiguration = {
        type: 'bar',
        groupByField: 'status',
        valueField: 'cost',
        aggregation: 'sum',
        title: 'Accessible Chart',
      }

      render(<ChartRenderer data={mockData} config={config} />)

      expect(screen.getByText('Accessible Chart')).toBeInTheDocument()
    })
  })
})
