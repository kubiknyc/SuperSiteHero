// File: /src/features/documents/components/MarkupFilterPanel.test.tsx
// Tests for MarkupFilterPanel component

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MarkupFilterPanel, type MarkupFilter, type MarkupType } from './MarkupFilterPanel'

describe('MarkupFilterPanel', () => {
  const defaultFilter: MarkupFilter = {
    showMyMarkupsOnly: false,
    creatorIds: [],
    types: ['arrow', 'rectangle', 'circle', 'text', 'freehand', 'cloud'],
    dateRange: { start: null, end: null },
    hiddenLayers: [],
  }

  const mockCreators = [
    { id: 'user-1', name: 'John Doe' },
    { id: 'user-2', name: 'Jane Smith' },
  ]

  const mockMarkupCounts: Record<MarkupType, number> = {
    arrow: 5,
    rectangle: 3,
    circle: 2,
    text: 4,
    freehand: 1,
    cloud: 0,
  }

  const mockOnFilterChange = vi.fn()

  const renderComponent = (props = {}) => {
    return render(
      <MarkupFilterPanel
        filter={defaultFilter}
        onFilterChange={mockOnFilterChange}
        creators={mockCreators}
        currentUserId="user-1"
        markupCounts={mockMarkupCounts}
        {...props}
      />
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the filter button', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument()
  })

  it('should open popover when filter button is clicked', async () => {
    renderComponent()

    const filterButton = screen.getByRole('button', { name: /filter/i })
    fireEvent.click(filterButton)

    expect(screen.getByText('Filter Markups')).toBeInTheDocument()
  })

  it('should display "Show my markups only" checkbox', async () => {
    renderComponent()

    fireEvent.click(screen.getByRole('button', { name: /filter/i }))

    expect(screen.getByLabelText(/show my markups only/i)).toBeInTheDocument()
  })

  it('should toggle my markups only filter', async () => {
    renderComponent()

    fireEvent.click(screen.getByRole('button', { name: /filter/i }))
    fireEvent.click(screen.getByLabelText(/show my markups only/i))

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...defaultFilter,
      showMyMarkupsOnly: true,
    })
  })

  it('should display all markup types with checkboxes', async () => {
    renderComponent()

    fireEvent.click(screen.getByRole('button', { name: /filter/i }))

    expect(screen.getByLabelText(/arrows/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/rectangles/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/circles/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/text/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/freehand/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/clouds/i)).toBeInTheDocument()
  })

  it('should toggle type filter when checkbox is clicked', async () => {
    renderComponent()

    fireEvent.click(screen.getByRole('button', { name: /filter/i }))
    fireEvent.click(screen.getByLabelText(/arrows/i))

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...defaultFilter,
      types: ['rectangle', 'circle', 'text', 'freehand', 'cloud'],
    })
  })

  it('should display date range presets', async () => {
    renderComponent()

    fireEvent.click(screen.getByRole('button', { name: /filter/i }))

    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All time' })).toBeInTheDocument()
  })

  it('should display layer visibility section when creators exist', async () => {
    renderComponent()

    fireEvent.click(screen.getByRole('button', { name: /filter/i }))

    expect(screen.getByText('Layer Visibility')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('should mark current user with "(you)"', async () => {
    renderComponent()

    fireEvent.click(screen.getByRole('button', { name: /filter/i }))

    expect(screen.getByText('(you)')).toBeInTheDocument()
  })

  it('should reset all filters when reset button is clicked', async () => {
    const modifiedFilter: MarkupFilter = {
      ...defaultFilter,
      showMyMarkupsOnly: true,
      types: ['arrow'],
    }

    renderComponent({ filter: modifiedFilter })

    fireEvent.click(screen.getByRole('button', { name: /filter/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    expect(mockOnFilterChange).toHaveBeenCalledWith({
      showMyMarkupsOnly: false,
      creatorIds: [],
      types: ['arrow', 'rectangle', 'circle', 'text', 'freehand', 'cloud'],
      dateRange: { start: null, end: null },
      hiddenLayers: [],
    })
  })

  it('should show active filter count badge', async () => {
    const filterWithActiveFilters: MarkupFilter = {
      ...defaultFilter,
      showMyMarkupsOnly: true,
      hiddenLayers: ['user-2'],
    }

    renderComponent({ filter: filterWithActiveFilters })

    // Badge should show count of active filters
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should not show layer visibility section when no creators', async () => {
    renderComponent({ creators: [] })

    fireEvent.click(screen.getByRole('button', { name: /filter/i }))

    expect(screen.queryByText('Layer Visibility')).not.toBeInTheDocument()
  })
})
