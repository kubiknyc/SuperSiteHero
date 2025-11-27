// File: /src/features/documents/components/LinkMarkupDialog.test.tsx
// Tests for LinkMarkupDialog component

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LinkMarkupDialog, type LinkableItemType } from './LinkMarkupDialog'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'workflow-type-1' } }),
    })),
  },
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('LinkMarkupDialog', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const mockOnLink = vi.fn().mockResolvedValue(undefined)
  const mockOnUnlink = vi.fn().mockResolvedValue(undefined)
  const mockOnOpenChange = vi.fn()

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <LinkMarkupDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          projectId="project-123"
          onLink={mockOnLink}
          onUnlink={mockOnUnlink}
          {...props}
        />
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('should render dialog with title when open', () => {
    renderComponent()
    expect(screen.getByText('Link Markup to Item')).toBeInTheDocument()
  })

  it('should not render dialog when closed', () => {
    renderComponent({ open: false })
    expect(screen.queryByText('Link Markup to Item')).not.toBeInTheDocument()
  })

  it('should display three tabs: RFIs, Tasks, Punch', () => {
    renderComponent()

    expect(screen.getByRole('tab', { name: /rfis/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /tasks/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /punch/i })).toBeInTheDocument()
  })

  it('should have RFIs tab selected by default', () => {
    renderComponent()

    // Check that search placeholder shows RFIs by default
    expect(screen.getByPlaceholderText(/search rfis/i)).toBeInTheDocument()
  })

  it('should switch tabs when clicked', async () => {
    renderComponent()

    const tasksTab = screen.getByRole('tab', { name: /tasks/i })
    fireEvent.click(tasksTab)

    // Verify tab switch by checking search placeholder changes
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument()
    })
  })

  it('should display search input', () => {
    renderComponent()
    expect(screen.getByPlaceholderText(/search rfis/i)).toBeInTheDocument()
  })

  it('should update search placeholder when switching tabs', () => {
    renderComponent()

    fireEvent.click(screen.getByRole('tab', { name: /tasks/i }))
    expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /punch/i }))
    expect(screen.getByPlaceholderText(/search punch items/i)).toBeInTheDocument()
  })

  it('should display current link info when linked', () => {
    renderComponent({
      currentLink: { id: 'item-123', type: 'rfi' },
    })

    expect(screen.getByText(/currently linked to/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /unlink/i })).toBeInTheDocument()
  })

  it('should call onUnlink when unlink button is clicked', async () => {
    renderComponent({
      currentLink: { id: 'item-123', type: 'rfi' },
    })

    fireEvent.click(screen.getByRole('button', { name: /unlink/i }))

    await waitFor(() => {
      expect(mockOnUnlink).toHaveBeenCalled()
    })
  })

  it('should display cancel button', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should close dialog when cancel is clicked', () => {
    renderComponent()

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('should display "No items found" when list is empty', () => {
    renderComponent()
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })
})
