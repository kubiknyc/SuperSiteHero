import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultiSelectFilter } from '../multi-select-filter'

describe('MultiSelectFilter', () => {
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ]
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render button with label', () => {
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByRole('button', { name: /test filter/i })).toBeInTheDocument()
    })

    it('should render dropdown when button clicked', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('should render all options from props', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)

      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Option 3' })).toBeInTheDocument()
    })

    it('should not render if options array is empty', () => {
      const { container } = render(
        <MultiSelectFilter
          label="Test Filter"
          options={[]}
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should show count badge when items selected', () => {
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={['option1', 'option2']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should toggle dropdown on button click', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })

      // Click to open
      await user.click(button)
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      // Click to close
      await user.click(button)
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('should select option when clicked', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)

      const option = screen.getByRole('option', { name: 'Option 1' })
      await user.click(option)

      expect(mockOnChange).toHaveBeenCalledWith(['option1'])
    })

    it('should deselect option when clicked again', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={['option1']}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)

      const option = screen.getByRole('option', { name: 'Option 1' })
      await user.click(option)

      expect(mockOnChange).toHaveBeenCalledWith([])
    })

    it('should call onChange with updated array', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={['option1']}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)

      const option = screen.getByRole('option', { name: 'Option 2' })
      await user.click(option)

      expect(mockOnChange).toHaveBeenCalledWith(['option1', 'option2'])
    })

    it('should close dropdown on outside click', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <MultiSelectFilter
            label="Test Filter"
            options={defaultOptions}
            value={[]}
            onChange={mockOnChange}
          />
        </div>
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      const outside = screen.getByTestId('outside')
      await user.click(outside)

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('should close dropdown on Escape key', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      expect(button).toHaveAttribute('aria-haspopup', 'listbox')
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have role="listbox" on dropdown', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)

      const listbox = screen.getByRole('listbox')
      expect(listbox).toBeInTheDocument()
      expect(listbox).toHaveAttribute('aria-label', 'Test Filter filter options')
    })

    it('should have role="option" on each option', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)

      const options = screen.getAllByRole('option')
      expect(options).toHaveLength(3)
      options.forEach(option => {
        expect(option).toHaveAttribute('role', 'option')
      })
    })

    it('should mark selected options with aria-selected', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={['option1', 'option2']}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)

      const option1 = screen.getByRole('option', { name: 'Option 1' })
      const option2 = screen.getByRole('option', { name: 'Option 2' })
      const option3 = screen.getByRole('option', { name: 'Option 3' })

      expect(option1).toHaveAttribute('aria-selected', 'true')
      expect(option2).toHaveAttribute('aria-selected', 'true')
      expect(option3).toHaveAttribute('aria-selected', 'false')
    })
  })

  describe('Visual Feedback', () => {
    it('should show checkmark on selected items', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={['option1']}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      await user.click(button)

      const option1 = screen.getByRole('option', { name: 'Option 1' })
      // Check icon should be present in selected option
      const checkIcon = option1.querySelector('svg')
      expect(checkIcon).toBeInTheDocument()
    })

    it('should rotate chevron icon when open', async () => {
      const user = userEvent.setup()
      render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={[]}
          onChange={mockOnChange}
        />
      )

      const button = screen.getByRole('button', { name: /test filter/i })
      const chevron = button.querySelector('svg')

      // Initially not rotated
      expect(chevron).not.toHaveClass('rotate-180')

      await user.click(button)

      // Should be rotated when open
      expect(chevron).toHaveClass('rotate-180')
    })

    it('should update badge count when selections change', () => {
      const { rerender } = render(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={['option1']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('1')).toBeInTheDocument()

      rerender(
        <MultiSelectFilter
          label="Test Filter"
          options={defaultOptions}
          value={['option1', 'option2', 'option3']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })
})
