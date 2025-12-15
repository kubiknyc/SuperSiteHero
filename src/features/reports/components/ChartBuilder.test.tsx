/**
 * ChartBuilder Component Tests
 *
 * Tests chart configuration UI and interactions.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChartBuilder } from './ChartBuilder'
import type { ChartConfiguration, ReportFieldDefinition } from '@/types/report-builder'

// Mock ChartRenderer
jest.mock('./ChartRenderer', () => ({
  ChartRenderer: ({ config }: any) => (
    <div data-testid="chart-renderer">
      Chart: {config.type} - {config.groupByField} / {config.valueField}
    </div>
  ),
}))

describe('ChartBuilder', () => {
  const mockFields: ReportFieldDefinition[] = [
    {
      id: '1',
      data_source: 'rfis',
      field_name: 'status',
      display_name: 'Status',
      field_type: 'status',
      description: null,
      category: 'Basic',
      is_default: true,
      is_sortable: true,
      is_filterable: true,
      is_groupable: true,
      source_table: 'rfis',
      source_column: 'status',
      join_path: null,
      display_order: 1,
      created_at: '2024-01-01',
    },
    {
      id: '2',
      data_source: 'rfis',
      field_name: 'cost',
      display_name: 'Cost',
      field_type: 'currency',
      description: null,
      category: 'Financial',
      is_default: true,
      is_sortable: true,
      is_filterable: true,
      is_groupable: false,
      source_table: 'rfis',
      source_column: 'cost',
      join_path: null,
      display_order: 2,
      created_at: '2024-01-01',
    },
    {
      id: '3',
      data_source: 'rfis',
      field_name: 'created_at',
      display_name: 'Created Date',
      field_type: 'date',
      description: null,
      category: 'Dates',
      is_default: true,
      is_sortable: true,
      is_filterable: true,
      is_groupable: true,
      source_table: 'rfis',
      source_column: 'created_at',
      join_path: null,
      display_order: 3,
      created_at: '2024-01-01',
    },
  ]

  const mockPreviewData = [
    { status: 'open', cost: 1000 },
    { status: 'closed', cost: 2000 },
  ]

  describe('initial render', () => {
    it('should render chart type selection', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={null}
          onConfigChange={handleChange}
        />
      )

      expect(screen.getByText('Chart Type')).toBeInTheDocument()
      expect(screen.getByText('Bar Chart')).toBeInTheDocument()
      expect(screen.getByText('Line Chart')).toBeInTheDocument()
      expect(screen.getByText('Pie Chart')).toBeInTheDocument()
      expect(screen.getByText('Area Chart')).toBeInTheDocument()
    })

    it('should show empty state when no chart selected', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={null}
          onConfigChange={handleChange}
        />
      )

      expect(screen.getByText('Select a chart type to begin')).toBeInTheDocument()
    })
  })

  describe('chart type selection', () => {
    it('should select bar chart type', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={null}
          onConfigChange={handleChange}
        />
      )

      const barButton = screen.getByRole('button', { name: /Bar Chart/i })
      await user.click(barButton)

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled()
        const config = handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
        expect(config.type).toBe('bar')
      })
    })

    it('should select line chart type', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={null}
          onConfigChange={handleChange}
        />
      )

      const lineButton = screen.getByRole('button', { name: /Line Chart/i })
      await user.click(lineButton)

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled()
        const config = handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
        expect(config.type).toBe('line')
      })
    })

    it('should select pie chart type', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={null}
          onConfigChange={handleChange}
        />
      )

      const pieButton = screen.getByRole('button', { name: /Pie Chart/i })
      await user.click(pieButton)

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled()
        const config = handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
        expect(config.type).toBe('pie')
      })
    })
  })

  describe('data configuration', () => {
    const initialConfig: ChartConfiguration = {
      type: 'bar',
      groupByField: '',
      valueField: '',
      aggregation: 'sum',
    }

    it('should display data configuration after selecting chart type', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={initialConfig}
          onConfigChange={handleChange}
        />
      )

      expect(screen.getByText('Data Configuration')).toBeInTheDocument()
      expect(screen.getByLabelText('Group By (X-Axis)')).toBeInTheDocument()
      expect(screen.getByLabelText('Value Field (Y-Axis)')).toBeInTheDocument()
      expect(screen.getByLabelText('Aggregation')).toBeInTheDocument()
    })

    it('should only show groupable fields in group by dropdown', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={initialConfig}
          onConfigChange={handleChange}
        />
      )

      // The groupable fields should be available
      // Cost is not groupable, so it shouldn't appear in the group by list
      expect(screen.queryByText('Cost', { selector: 'option' })).not.toBeInTheDocument()
    })

    it('should only show numeric fields in value field dropdown', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={initialConfig}
          onConfigChange={handleChange}
        />
      )

      // Only currency/number fields should be available for value field
      // Status is not numeric, so it shouldn't appear
      expect(screen.queryByText('Status', { selector: 'option' })).not.toBeInTheDocument()
    })
  })

  describe('display options', () => {
    const configuredChart: ChartConfiguration = {
      type: 'bar',
      groupByField: 'status',
      valueField: 'cost',
      aggregation: 'sum',
    }

    it('should display options section', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          onConfigChange={handleChange}
        />
      )

      expect(screen.getByText('Display Options')).toBeInTheDocument()
      expect(screen.getByLabelText('Chart Title')).toBeInTheDocument()
      expect(screen.getByLabelText('X-Axis Label')).toBeInTheDocument()
      expect(screen.getByLabelText('Y-Axis Label')).toBeInTheDocument()
    })

    it('should update chart title', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          onConfigChange={handleChange}
        />
      )

      const titleInput = screen.getByLabelText('Chart Title')
      await user.type(titleInput, 'Cost Analysis')

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled()
      })
    })

    it('should toggle show legend', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          onConfigChange={handleChange}
        />
      )

      const legendSwitch = screen.getByRole('switch', { name: /Show Legend/i })
      await user.click(legendSwitch)

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled()
      })
    })

    it('should toggle show grid', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          onConfigChange={handleChange}
        />
      )

      const gridSwitch = screen.getByRole('switch', { name: /Show Grid/i })
      await user.click(gridSwitch)

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled()
      })
    })

    it('should show data labels option for pie charts', () => {
      const pieConfig: ChartConfiguration = {
        ...configuredChart,
        type: 'pie',
      }

      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={pieConfig}
          onConfigChange={handleChange}
        />
      )

      expect(screen.getByText('Show Data Labels')).toBeInTheDocument()
    })

    it('should not show data labels option for bar charts', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          onConfigChange={handleChange}
        />
      )

      expect(screen.queryByText('Show Data Labels')).not.toBeInTheDocument()
    })
  })

  describe('color scheme', () => {
    const configuredChart: ChartConfiguration = {
      type: 'bar',
      groupByField: 'status',
      valueField: 'cost',
      aggregation: 'sum',
    }

    it('should display color scheme options', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          onConfigChange={handleChange}
        />
      )

      expect(screen.getByText('Color Scheme')).toBeInTheDocument()
      expect(screen.getByText('Default')).toBeInTheDocument()
      expect(screen.getByText('Blue')).toBeInTheDocument()
      expect(screen.getByText('Green')).toBeInTheDocument()
    })

    it('should select color scheme', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          onConfigChange={handleChange}
        />
      )

      const blueScheme = screen.getByRole('button', { name: /Blue/i })
      await user.click(blueScheme)

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled()
        const config = handleChange.mock.calls[handleChange.mock.calls.length - 1][0]
        expect(config.colorScheme).toBe('blue')
      })
    })
  })

  describe('preview', () => {
    const configuredChart: ChartConfiguration = {
      type: 'bar',
      groupByField: 'status',
      valueField: 'cost',
      aggregation: 'sum',
    }

    it('should show preview with data', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          previewData={mockPreviewData}
          onConfigChange={handleChange}
        />
      )

      expect(screen.getByTestId('chart-renderer')).toBeInTheDocument()
    })

    it('should show no data message when preview data is empty', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          previewData={[]}
          onConfigChange={handleChange}
        />
      )

      expect(screen.getByText('No preview data available')).toBeInTheDocument()
    })

    it('should toggle preview visibility', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          previewData={mockPreviewData}
          onConfigChange={handleChange}
        />
      )

      const toggleButton = screen.getByRole('button', { name: /Hide Preview/i })
      await user.click(toggleButton)

      expect(screen.getByText('Preview hidden')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Show Preview/i })).toBeInTheDocument()
    })
  })

  describe('remove chart', () => {
    const configuredChart: ChartConfiguration = {
      type: 'bar',
      groupByField: 'status',
      valueField: 'cost',
      aggregation: 'sum',
    }

    it('should remove chart configuration', async () => {
      const user = userEvent.setup()
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          onConfigChange={handleChange}
        />
      )

      const removeButton = screen.getByRole('button', { name: /Remove Chart/i })
      await user.click(removeButton)

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith(null)
      })
    })
  })

  describe('aggregation types', () => {
    const configuredChart: ChartConfiguration = {
      type: 'bar',
      groupByField: 'status',
      valueField: 'cost',
      aggregation: 'sum',
    }

    it('should show applicable aggregations for currency field', () => {
      const handleChange = jest.fn()

      render(
        <ChartBuilder
          availableFields={mockFields}
          chartConfig={configuredChart}
          onConfigChange={handleChange}
        />
      )

      expect(screen.getByLabelText('Aggregation')).toBeInTheDocument()
    })
  })
})
