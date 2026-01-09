/**
 * CreatePunchItemDialog Component Tests
 *
 * Tests for the punch item creation dialog component including:
 * - Form rendering and validation
 * - User interactions and input handling
 * - Form submission with various field combinations
 * - Assignee selection for users and subcontractors
 * - Floor plan location integration
 * - Voice input integration
 * - Form reset on dialog close
 * - Error handling and edge cases
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreatePunchItemDialog } from './CreatePunchItemDialog'

// Mock dependencies
vi.mock('../hooks/usePunchItemsMutations', () => ({
  useCreatePunchItemWithNotification: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
  })),
}))

vi.mock('@/components/AssigneeSelector', () => ({
  AssigneeSelector: ({ value, onChange, label, projectId }: any) => (
    <div data-testid="assignee-selector">
      <label>{label}</label>
      <select
        data-testid="assignee-select"
        value={value?.id || ''}
        onChange={(e) => {
          const val = e.target.value
          if (val === 'user-1') {
            onChange({ type: 'user', id: 'user-1', name: 'John Doe' })
          } else if (val === 'sub-1') {
            onChange({ type: 'subcontractor', id: 'sub-1', name: 'ABC Electric' })
          } else {
            onChange(null)
          }
        }}
      >
        <option value="">Select assignee</option>
        <option value="user-1">John Doe</option>
        <option value="sub-1">ABC Electric</option>
      </select>
    </div>
  ),
}))

vi.mock('@/components/ui/voice-input', () => ({
  VoiceInputButton: ({ onTranscript, currentValue, mode }: any) => (
    <button
      data-testid="voice-input-button"
      onClick={() => {
        const newText = 'Voice transcribed text'
        onTranscript(mode === 'append' ? currentValue + ' ' + newText : newText)
      }}
    >
      Voice Input
    </button>
  ),
}))

vi.mock('./LazyFloorPlanPinDrop', () => ({
  LazyFloorPlanPinDrop: ({ value, onChange, projectId }: any) => (
    <div data-testid="floor-plan-pin-drop">
      <label>Floor Plan Location</label>
      <button
        data-testid="set-floor-location"
        onClick={() =>
          onChange({
            x: 100,
            y: 200,
            documentId: 'doc-123',
          })
        }
      >
        Set Location
      </button>
      {value && <span data-testid="floor-location-value">{`${value.x},${value.y}`}</span>}
    </div>
  ),
}))

// Create test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('CreatePunchItemDialog', () => {
  const mockOnOpenChange = vi.fn()
  const defaultProps = {
    projectId: 'project-123',
    open: true,
    onOpenChange: mockOnOpenChange,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dialog when open is true', () => {
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Create Punch Item')).toBeInTheDocument()
    })

    it('should not render dialog when open is false', () => {
      render(<CreatePunchItemDialog {...defaultProps} open={false} />, {
        wrapper: createWrapper(),
      })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should render all required form fields', () => {
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Required fields
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/trade/i)).toBeInTheDocument()

      // Optional fields
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/building/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/floor/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/room/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/area/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/location notes/i)).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    })

    it('should render assignee selector', () => {
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByTestId('assignee-selector')).toBeInTheDocument()
      expect(screen.getByText('Assign To')).toBeInTheDocument()
    })

    it('should render floor plan pin drop component', () => {
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByTestId('floor-plan-pin-drop')).toBeInTheDocument()
    })

    it('should render voice input buttons for description and location notes', () => {
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const voiceButtons = screen.getAllByTestId('voice-input-button')
      expect(voiceButtons).toHaveLength(2)
    })
  })

  describe('Form Interactions', () => {
    it('should update title field on input', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const titleInput = screen.getByLabelText(/title/i)
      await user.type(titleInput, 'Fix electrical outlet')

      expect(titleInput).toHaveValue('Fix electrical outlet')
    })

    it('should update trade field on input', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const tradeInput = screen.getByLabelText(/trade/i)
      await user.type(tradeInput, 'Electrical')

      expect(tradeInput).toHaveValue('Electrical')
    })

    it('should update description field on input', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const descriptionInput = screen.getByLabelText(/description/i)
      await user.type(descriptionInput, 'Outlet not working properly')

      expect(descriptionInput).toHaveValue('Outlet not working properly')
    })

    it('should update location fields on input', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      await user.type(screen.getByLabelText(/building/i), 'Building A')
      await user.type(screen.getByLabelText(/floor/i), '2nd Floor')
      await user.type(screen.getByLabelText(/room/i), 'Room 205')
      await user.type(screen.getByLabelText(/area/i), 'East Wall')

      expect(screen.getByLabelText(/building/i)).toHaveValue('Building A')
      expect(screen.getByLabelText(/floor/i)).toHaveValue('2nd Floor')
      expect(screen.getByLabelText(/room/i)).toHaveValue('Room 205')
      expect(screen.getByLabelText(/area/i)).toHaveValue('East Wall')
    })

    it('should update due date on input', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const dueDateInput = screen.getByLabelText(/due date/i)
      await user.type(dueDateInput, '2024-02-15')

      expect(dueDateInput).toHaveValue('2024-02-15')
    })

    it('should handle assignee selection for user', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const assigneeSelect = screen.getByTestId('assignee-select')
      await user.selectOptions(assigneeSelect, 'user-1')

      expect(assigneeSelect).toHaveValue('user-1')
    })

    it('should handle assignee selection for subcontractor', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const assigneeSelect = screen.getByTestId('assignee-select')
      await user.selectOptions(assigneeSelect, 'sub-1')

      expect(assigneeSelect).toHaveValue('sub-1')
    })

    it('should handle floor plan location setting', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const setLocationButton = screen.getByTestId('set-floor-location')
      await user.click(setLocationButton)

      expect(screen.getByTestId('floor-location-value')).toHaveTextContent('100,200')
    })

    it('should handle voice input for description', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const descriptionInput = screen.getByLabelText(/description/i)
      await user.type(descriptionInput, 'Initial text')

      const voiceButtons = screen.getAllByTestId('voice-input-button')
      await user.click(voiceButtons[0]) // First voice button is for description

      await waitFor(() => {
        expect(descriptionInput).toHaveValue('Initial text Voice transcribed text')
      })
    })

    it('should handle voice input for location notes', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      const locationNotesInput = screen.getByLabelText(/location notes/i)
      await user.type(locationNotesInput, 'Initial location')

      const voiceButtons = screen.getAllByTestId('voice-input-button')
      await user.click(voiceButtons[1]) // Second voice button is for location notes

      await waitFor(() => {
        expect(locationNotesInput).toHaveValue('Initial location Voice transcribed text')
      })
    })
  })

  describe('Form Submission', () => {
    it('should call mutate with correct data on valid form submission', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Fill required fields
      await user.type(screen.getByLabelText(/title/i), 'Fix electrical outlet')
      await user.type(screen.getByLabelText(/trade/i), 'Electrical')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            project_id: 'project-123',
            title: 'Fix electrical outlet',
            trade: 'Electrical',
            priority: 'normal',
            status: 'open',
          }),
          expect.objectContaining({
            onSuccess: expect.any(Function),
          })
        )
      })
    })

    it('should not submit form when title is empty', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Fill only trade field
      await user.type(screen.getByLabelText(/trade/i), 'Electrical')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create/i }))

      // Should not call mutate
      expect(mockMutate).not.toHaveBeenCalled()
    })

    it('should not submit form when trade is empty', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Fill only title field
      await user.type(screen.getByLabelText(/title/i), 'Fix electrical outlet')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create/i }))

      // Should not call mutate
      expect(mockMutate).not.toHaveBeenCalled()
    })

    it('should trim whitespace from inputs before submission', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Fill fields with whitespace
      await user.type(screen.getByLabelText(/title/i), '  Fix outlet  ')
      await user.type(screen.getByLabelText(/trade/i), '  Electrical  ')
      await user.type(screen.getByLabelText(/description/i), '  Outlet issue  ')

      // Submit form
      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Fix outlet',
            trade: 'Electrical',
            description: 'Outlet issue',
          }),
          expect.any(Object)
        )
      })
    })

    it('should include user assignee when selected', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      await user.type(screen.getByLabelText(/title/i), 'Fix outlet')
      await user.type(screen.getByLabelText(/trade/i), 'Electrical')
      await user.selectOptions(screen.getByTestId('assignee-select'), 'user-1')

      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            assigned_to: 'user-1',
            subcontractor_id: null,
          }),
          expect.any(Object)
        )
      })
    })

    it('should include subcontractor assignee when selected', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      await user.type(screen.getByLabelText(/title/i), 'Fix outlet')
      await user.type(screen.getByLabelText(/trade/i), 'Electrical')
      await user.selectOptions(screen.getByTestId('assignee-select'), 'sub-1')

      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            assigned_to: null,
            subcontractor_id: 'sub-1',
          }),
          expect.any(Object)
        )
      })
    })

    it('should include floor plan location when set', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      await user.type(screen.getByLabelText(/title/i), 'Fix outlet')
      await user.type(screen.getByLabelText(/trade/i), 'Electrical')
      await user.click(screen.getByTestId('set-floor-location'))

      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            floor_plan_location: { x: 100, y: 200, documentId: 'doc-123' },
            floor_plan_document_id: 'doc-123',
          }),
          expect.any(Object)
        )
      })
    })

    it('should close dialog on successful submission', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn((data, options) => {
        // Simulate successful mutation
        options.onSuccess?.()
      })

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      await user.type(screen.getByLabelText(/title/i), 'Fix outlet')
      await user.type(screen.getByLabelText(/trade/i), 'Electrical')
      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should disable buttons when mutation is pending', async () => {
      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })
  })

  describe('Form Reset', () => {
    it('should reset form when dialog closes', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<CreatePunchItemDialog {...defaultProps} open={true} />, {
        wrapper: createWrapper(),
      })

      // Fill form
      await user.type(screen.getByLabelText(/title/i), 'Fix outlet')
      await user.type(screen.getByLabelText(/trade/i), 'Electrical')
      await user.type(screen.getByLabelText(/description/i), 'Test description')

      // Close dialog
      rerender(<CreatePunchItemDialog {...defaultProps} open={false} />)

      // Reopen dialog
      rerender(<CreatePunchItemDialog {...defaultProps} open={true} />)

      // Form should be reset
      await waitFor(() => {
        expect(screen.getByLabelText(/title/i)).toHaveValue('')
        expect(screen.getByLabelText(/trade/i)).toHaveValue('')
        expect(screen.getByLabelText(/description/i)).toHaveValue('')
      })
    })

    it('should reset all fields including location fields on close', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<CreatePunchItemDialog {...defaultProps} open={true} />, {
        wrapper: createWrapper(),
      })

      // Fill all fields
      await user.type(screen.getByLabelText(/building/i), 'Building A')
      await user.type(screen.getByLabelText(/floor/i), '2nd Floor')
      await user.type(screen.getByLabelText(/room/i), 'Room 205')

      // Close and reopen
      rerender(<CreatePunchItemDialog {...defaultProps} open={false} />)
      rerender(<CreatePunchItemDialog {...defaultProps} open={true} />)

      // All fields should be reset
      await waitFor(() => {
        expect(screen.getByLabelText(/building/i)).toHaveValue('')
        expect(screen.getByLabelText(/floor/i)).toHaveValue('')
        expect(screen.getByLabelText(/room/i)).toHaveValue('')
      })
    })
  })

  describe('Cancel Button', () => {
    it('should close dialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty optional fields correctly', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      await user.type(screen.getByLabelText(/title/i), 'Fix outlet')
      await user.type(screen.getByLabelText(/trade/i), 'Electrical')

      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            description: null,
            building: null,
            floor: null,
            room: null,
            area: null,
            location_notes: null,
            due_date: null,
          }),
          expect.any(Object)
        )
      })
    })

    it('should convert whitespace-only strings to null', async () => {
      const user = userEvent.setup()
      const mockMutate = vi.fn()

      const { useCreatePunchItemWithNotification } = await import(
        '../hooks/usePunchItemsMutations'
      )
      vi.mocked(useCreatePunchItemWithNotification).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isSuccess: false,
        isError: false,
      } as any)

      render(<CreatePunchItemDialog {...defaultProps} />, { wrapper: createWrapper() })

      await user.type(screen.getByLabelText(/title/i), 'Fix outlet')
      await user.type(screen.getByLabelText(/trade/i), 'Electrical')
      await user.type(screen.getByLabelText(/description/i), '   ')

      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            description: null,
          }),
          expect.any(Object)
        )
      })
    })
  })
})
