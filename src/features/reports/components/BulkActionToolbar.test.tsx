/**
 * Tests for BulkActionToolbar Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkActionToolbar, Category } from './BulkActionToolbar'

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Daily Reports', color: 'blue' },
  { id: 'cat-2', name: 'Weekly Reports', color: 'green' },
  { id: 'cat-3', name: 'Monthly Reports', color: 'purple' },
]

const defaultProps = {
  selectedCount: 3,
  selectedIds: ['template-1', 'template-2', 'template-3'],
  categories: mockCategories,
  onClearSelection: vi.fn(),
  onBulkDelete: vi.fn().mockResolvedValue(undefined),
  onBulkCategoryChange: vi.fn().mockResolvedValue(undefined),
  onBulkClone: vi.fn().mockResolvedValue(undefined),
  onBulkExport: vi.fn().mockResolvedValue(undefined),
}

describe('BulkActionToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render when items are selected', () => {
      render(<BulkActionToolbar {...defaultProps} />)
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText(/templates selected/i)).toBeInTheDocument()
    })

    it('should not render when no items selected', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={0} selectedIds={[]} />)
      expect(screen.queryByText(/templates selected/i)).not.toBeInTheDocument()
    })

    it('should show singular when one item selected', () => {
      render(<BulkActionToolbar {...defaultProps} selectedCount={1} selectedIds={['template-1']} />)
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText(/template selected/i)).toBeInTheDocument()
    })

    it('should render all action buttons', () => {
      render(<BulkActionToolbar {...defaultProps} />)
      expect(screen.getByRole('button', { name: /clone/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /move to/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })

    it('should render close button', () => {
      render(<BulkActionToolbar {...defaultProps} />)
      expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument()
    })

    it('should not render clone button when onBulkClone not provided', () => {
      const { onBulkClone, ...props } = defaultProps
      render(<BulkActionToolbar {...props} />)
      expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument()
    })

    it('should not render export button when onBulkExport not provided', () => {
      const { onBulkExport, ...props } = defaultProps
      render(<BulkActionToolbar {...props} />)
      expect(screen.queryByRole('button', { name: /export/i })).not.toBeInTheDocument()
    })
  })

  describe('Clear Selection', () => {
    it('should call onClearSelection when close button clicked', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /clear selection/i }))

      expect(defaultProps.onClearSelection).toHaveBeenCalled()
    })
  })

  describe('Bulk Clone', () => {
    it('should call onBulkClone when clone button clicked', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /clone/i }))

      await waitFor(() => {
        expect(defaultProps.onBulkClone).toHaveBeenCalledWith(defaultProps.selectedIds)
      })
    })

    it('should clear selection after successful clone', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /clone/i }))

      await waitFor(() => {
        expect(defaultProps.onClearSelection).toHaveBeenCalled()
      })
    })
  })

  describe('Bulk Delete', () => {
    it('should open confirmation dialog when delete clicked', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /delete/i }))

      expect(screen.getByText(/delete 3 templates/i)).toBeInTheDocument()
      expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument()
    })

    it('should call onBulkDelete when confirmed', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /delete/i }))
      await user.click(screen.getByRole('button', { name: /^delete$/i }))

      await waitFor(() => {
        expect(defaultProps.onBulkDelete).toHaveBeenCalledWith(defaultProps.selectedIds)
      })
    })

    it('should close dialog when cancelled', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /delete/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(defaultProps.onBulkDelete).not.toHaveBeenCalled()
    })

    it('should clear selection after successful delete', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /delete/i }))
      await user.click(screen.getByRole('button', { name: /^delete$/i }))

      await waitFor(() => {
        expect(defaultProps.onClearSelection).toHaveBeenCalled()
      })
    })
  })

  describe('Bulk Category Change', () => {
    it('should open category dialog when move to clicked', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /move to/i }))

      expect(screen.getByText(/move 3 templates to category/i)).toBeInTheDocument()
    })

    it('should show category options', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /move to/i }))

      // Open the select dropdown
      const select = screen.getByRole('combobox')
      await user.click(select)

      // Check categories are listed
      expect(screen.getByText('Daily Reports')).toBeInTheDocument()
      expect(screen.getByText('Weekly Reports')).toBeInTheDocument()
      expect(screen.getByText('Monthly Reports')).toBeInTheDocument()
      expect(screen.getByText('No category')).toBeInTheDocument()
    })

    it('should call onBulkCategoryChange when confirmed', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /move to/i }))

      // Select a category
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('Weekly Reports'))

      // Confirm
      await user.click(screen.getByRole('button', { name: /move/i }))

      await waitFor(() => {
        expect(defaultProps.onBulkCategoryChange).toHaveBeenCalledWith(
          defaultProps.selectedIds,
          'cat-2'
        )
      })
    })

    it('should allow removing from category', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /move to/i }))

      // Select no category
      const select = screen.getByRole('combobox')
      await user.click(select)
      await user.click(screen.getByText('No category'))

      // Confirm
      await user.click(screen.getByRole('button', { name: /move/i }))

      await waitFor(() => {
        expect(defaultProps.onBulkCategoryChange).toHaveBeenCalledWith(
          defaultProps.selectedIds,
          null
        )
      })
    })

    it('should clear selection after successful category change', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /move to/i }))
      await user.click(screen.getByRole('button', { name: /move/i }))

      await waitFor(() => {
        expect(defaultProps.onClearSelection).toHaveBeenCalled()
      })
    })
  })

  describe('Bulk Export', () => {
    it('should show export dropdown menu', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /export/i }))

      expect(screen.getByText('Export as JSON')).toBeInTheDocument()
      expect(screen.getByText('Export as CSV')).toBeInTheDocument()
    })

    it('should call onBulkExport with json format', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /export/i }))
      await user.click(screen.getByText('Export as JSON'))

      await waitFor(() => {
        expect(defaultProps.onBulkExport).toHaveBeenCalledWith(
          defaultProps.selectedIds,
          'json'
        )
      })
    })

    it('should call onBulkExport with csv format', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /export/i }))
      await user.click(screen.getByText('Export as CSV'))

      await waitFor(() => {
        expect(defaultProps.onBulkExport).toHaveBeenCalledWith(
          defaultProps.selectedIds,
          'csv'
        )
      })
    })
  })

  describe('Loading States', () => {
    it('should disable buttons when loading', () => {
      render(<BulkActionToolbar {...defaultProps} isLoading={true} />)

      expect(screen.getByRole('button', { name: /clone/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /move to/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /export/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
    })

    it('should show loading indicator during operation', async () => {
      const slowDelete = vi.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 100))
      )
      const user = userEvent.setup()

      render(<BulkActionToolbar {...defaultProps} onBulkDelete={slowDelete} />)

      await user.click(screen.getByRole('button', { name: /delete/i }))
      await user.click(screen.getByRole('button', { name: /^delete$/i }))

      // Buttons should be disabled during operation
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })
  })

  describe('Error Handling', () => {
    it('should handle delete error', async () => {
      const onBulkDelete = vi.fn().mockRejectedValue(new Error('Delete failed'))
      const user = userEvent.setup()

      render(<BulkActionToolbar {...defaultProps} onBulkDelete={onBulkDelete} />)

      await user.click(screen.getByRole('button', { name: /delete/i }))
      await user.click(screen.getByRole('button', { name: /^delete$/i }))

      await waitFor(() => {
        expect(onBulkDelete).toHaveBeenCalled()
      })

      // Selection should NOT be cleared on error
      expect(defaultProps.onClearSelection).not.toHaveBeenCalled()
    })

    it('should handle category change error', async () => {
      const onBulkCategoryChange = vi.fn().mockRejectedValue(new Error('Update failed'))
      const user = userEvent.setup()

      render(<BulkActionToolbar {...defaultProps} onBulkCategoryChange={onBulkCategoryChange} />)

      await user.click(screen.getByRole('button', { name: /move to/i }))
      await user.click(screen.getByRole('button', { name: /move/i }))

      await waitFor(() => {
        expect(onBulkCategoryChange).toHaveBeenCalled()
      })
    })

    it('should handle clone error', async () => {
      const onBulkClone = vi.fn().mockRejectedValue(new Error('Clone failed'))
      const user = userEvent.setup()

      render(<BulkActionToolbar {...defaultProps} onBulkClone={onBulkClone} />)

      await user.click(screen.getByRole('button', { name: /clone/i }))

      await waitFor(() => {
        expect(onBulkClone).toHaveBeenCalled()
      })
    })

    it('should handle export error', async () => {
      const onBulkExport = vi.fn().mockRejectedValue(new Error('Export failed'))
      const user = userEvent.setup()

      render(<BulkActionToolbar {...defaultProps} onBulkExport={onBulkExport} />)

      await user.click(screen.getByRole('button', { name: /export/i }))
      await user.click(screen.getByText('Export as JSON'))

      await waitFor(() => {
        expect(onBulkExport).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<BulkActionToolbar {...defaultProps} />)

      expect(screen.getByRole('button', { name: /clone/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /move to/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument()
    })

    it('should have accessible dialogs', async () => {
      const user = userEvent.setup()
      render(<BulkActionToolbar {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /delete/i }))

      const dialog = screen.getByRole('alertdialog')
      expect(dialog).toBeInTheDocument()
    })
  })
})
