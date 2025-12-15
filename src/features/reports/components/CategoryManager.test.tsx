/**
 * Tests for CategoryManager Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryManager, TemplateCategory } from './CategoryManager'

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}))

vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: (arr: any[], oldIndex: number, newIndex: number) => {
    const result = [...arr]
    const [removed] = result.splice(oldIndex, 1)
    result.splice(newIndex, 0, removed)
    return result
  },
  SortableContext: ({ children }: any) => <div>{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
  }),
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockCategories: TemplateCategory[] = [
  {
    id: 'cat-1',
    name: 'Daily Reports',
    description: 'Reports generated daily',
    color: 'blue',
    icon: 'Calendar',
    sortOrder: 0,
    templateCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'Weekly Reports',
    description: 'Reports generated weekly',
    color: 'green',
    icon: 'CalendarDays',
    sortOrder: 1,
    templateCount: 3,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'cat-3',
    name: 'Monthly Reports',
    description: 'Reports generated monthly',
    color: 'purple',
    icon: 'CalendarRange',
    sortOrder: 2,
    templateCount: 0,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
]

const defaultProps = {
  categories: mockCategories,
  onCategoryCreate: vi.fn().mockResolvedValue(undefined),
  onCategoryUpdate: vi.fn().mockResolvedValue(undefined),
  onCategoryDelete: vi.fn().mockResolvedValue(undefined),
  onCategoryReorder: vi.fn().mockResolvedValue(undefined),
}

describe('CategoryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<CategoryManager {...defaultProps} />)
      expect(screen.getByText('Categories')).toBeInTheDocument()
    })

    it('should render all categories', () => {
      render(<CategoryManager {...defaultProps} />)
      expect(screen.getByText('Daily Reports')).toBeInTheDocument()
      expect(screen.getByText('Weekly Reports')).toBeInTheDocument()
      expect(screen.getByText('Monthly Reports')).toBeInTheDocument()
    })

    it('should render category descriptions', () => {
      render(<CategoryManager {...defaultProps} />)
      expect(screen.getByText('Reports generated daily')).toBeInTheDocument()
      expect(screen.getByText('Reports generated weekly')).toBeInTheDocument()
      expect(screen.getByText('Reports generated monthly')).toBeInTheDocument()
    })

    it('should render template counts', () => {
      render(<CategoryManager {...defaultProps} />)
      expect(screen.getByText('5 templates')).toBeInTheDocument()
      expect(screen.getByText('3 templates')).toBeInTheDocument()
      expect(screen.getByText('0 templates')).toBeInTheDocument()
    })

    it('should render Add Category button', () => {
      render(<CategoryManager {...defaultProps} />)
      expect(screen.getByRole('button', { name: /add category/i })).toBeInTheDocument()
    })

    it('should show loading state', () => {
      render(<CategoryManager {...defaultProps} isLoading={true} />)
      // Should show loading spinner
      expect(screen.queryByText('Categories')).not.toBeInTheDocument()
    })

    it('should show empty state when no categories', () => {
      render(<CategoryManager {...defaultProps} categories={[]} />)
      expect(screen.getByText('No categories yet')).toBeInTheDocument()
      expect(screen.getByText('Add First Category')).toBeInTheDocument()
    })
  })

  describe('Add Category', () => {
    it('should open add dialog on button click', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Add Category')).toBeInTheDocument()
    })

    it('should have required fields in add dialog', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/color/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/icon/i)).toBeInTheDocument()
    })

    it('should create category on form submit', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))
      await user.type(screen.getByLabelText(/name/i), 'New Category')
      await user.type(screen.getByLabelText(/description/i), 'A new category')

      const submitButton = screen.getByRole('button', { name: /add category/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(defaultProps.onCategoryCreate).toHaveBeenCalled()
      })
    })

    it('should close dialog on cancel', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('should show error for empty name', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))

      // Try to submit without name
      const dialog = screen.getByRole('dialog')
      const submitButton = dialog.querySelector('button[type="submit"]')
      if (submitButton) {
        await user.click(submitButton)
      }

      // onCategoryCreate should not be called
      expect(defaultProps.onCategoryCreate).not.toHaveBeenCalled()
    })
  })

  describe('Edit Category', () => {
    it('should show edit button for each category', () => {
      render(<CategoryManager {...defaultProps} />)
      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      expect(editButtons).toHaveLength(mockCategories.length)
    })

    it('should open edit dialog with category data', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Category')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Daily Reports')).toBeInTheDocument()
    })

    it('should update category on form submit', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      const nameInput = screen.getByLabelText(/name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Daily Reports')

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(defaultProps.onCategoryUpdate).toHaveBeenCalledWith('cat-1', expect.objectContaining({
          name: 'Updated Daily Reports',
        }))
      })
    })
  })

  describe('Delete Category', () => {
    it('should show delete button for each category', () => {
      render(<CategoryManager {...defaultProps} />)
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      expect(deleteButtons).toHaveLength(mockCategories.length)
    })

    it('should disable delete for categories with templates', () => {
      render(<CategoryManager {...defaultProps} />)
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })

      // First category has 5 templates, should be disabled
      expect(deleteButtons[0]).toBeDisabled()

      // Third category has 0 templates, should be enabled
      expect(deleteButtons[2]).not.toBeDisabled()
    })

    it('should show confirmation dialog for delete', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      // Click on the category with 0 templates
      await user.click(deleteButtons[2])

      expect(screen.getByText(/delete category/i)).toBeInTheDocument()
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
    })

    it('should delete category on confirmation', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[2])

      await user.click(screen.getByRole('button', { name: /^delete$/i }))

      await waitFor(() => {
        expect(defaultProps.onCategoryDelete).toHaveBeenCalledWith('cat-3')
      })
    })

    it('should cancel delete on cancel button', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[2])

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(defaultProps.onCategoryDelete).not.toHaveBeenCalled()
    })
  })

  describe('Preview', () => {
    it('should show preview in add dialog', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))

      expect(screen.getByText('Preview')).toBeInTheDocument()
    })

    it('should update preview when name changes', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))
      await user.type(screen.getByLabelText(/name/i), 'Test Category')

      expect(screen.getByText('Test Category')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle create error', async () => {
      const onCategoryCreate = vi.fn().mockRejectedValue(new Error('Create failed'))
      const user = userEvent.setup()

      render(<CategoryManager {...defaultProps} onCategoryCreate={onCategoryCreate} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))
      await user.type(screen.getByLabelText(/name/i), 'New Category')

      const dialog = screen.getByRole('dialog')
      const submitButton = dialog.querySelector('button[type="submit"]')
      if (submitButton) {
        await user.click(submitButton)
      }

      await waitFor(() => {
        expect(onCategoryCreate).toHaveBeenCalled()
      })
    })

    it('should handle update error', async () => {
      const onCategoryUpdate = vi.fn().mockRejectedValue(new Error('Update failed'))
      const user = userEvent.setup()

      render(<CategoryManager {...defaultProps} onCategoryUpdate={onCategoryUpdate} />)

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      await user.click(editButtons[0])

      await user.click(screen.getByRole('button', { name: /save changes/i }))

      await waitFor(() => {
        expect(onCategoryUpdate).toHaveBeenCalled()
      })
    })

    it('should handle delete error', async () => {
      const onCategoryDelete = vi.fn().mockRejectedValue(new Error('Delete failed'))
      const user = userEvent.setup()

      render(<CategoryManager {...defaultProps} onCategoryDelete={onCategoryDelete} />)

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      await user.click(deleteButtons[2])

      await user.click(screen.getByRole('button', { name: /^delete$/i }))

      await waitFor(() => {
        expect(onCategoryDelete).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible dialog', async () => {
      const user = userEvent.setup()
      render(<CategoryManager {...defaultProps} />)

      await user.click(screen.getByRole('button', { name: /add category/i }))

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('should have accessible buttons', () => {
      render(<CategoryManager {...defaultProps} />)

      const addButton = screen.getByRole('button', { name: /add category/i })
      expect(addButton).toBeInTheDocument()

      const editButtons = screen.getAllByRole('button', { name: /edit/i })
      expect(editButtons.length).toBeGreaterThan(0)

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })
})
