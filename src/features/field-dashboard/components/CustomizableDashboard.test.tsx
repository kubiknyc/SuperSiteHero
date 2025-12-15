/**
 * Customizable Dashboard Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { CustomizableDashboard } from './CustomizableDashboard'

// Mock the hooks
vi.mock('../hooks/useDashboardLayout', () => ({
  useDefaultLayout: vi.fn(() => ({
    data: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useSaveWidgetPositions: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useAddWidget: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
  useRemoveWidget: vi.fn(() => ({
    mutateAsync: vi.fn(),
  })),
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    )
  }
}

describe('CustomizableDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dashboard with default widgets when no layout exists', async () => {
    render(<CustomizableDashboard projectId="test-project-id" />, {
      wrapper: createWrapper(),
    })

    // Should show dashboard header
    expect(screen.getByText('Dashboard')).toBeInTheDocument()

    // Should show edit button
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
  })

  it('enters edit mode when edit button is clicked', async () => {
    render(<CustomizableDashboard projectId="test-project-id" />, {
      wrapper: createWrapper(),
    })

    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    // Should show "Add Widget" button in edit mode
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add widget/i })).toBeInTheDocument()
    })
  })

  it('shows widget catalog when add widget button is clicked', async () => {
    render(<CustomizableDashboard projectId="test-project-id" />, {
      wrapper: createWrapper(),
    })

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i })
    fireEvent.click(editButton)

    // Click add widget
    const addWidgetButton = await screen.findByRole('button', { name: /add widget/i })
    fireEvent.click(addWidgetButton)

    // Should show widget catalog dialog
    await waitFor(() => {
      expect(screen.getByText('Choose a widget to add to your dashboard')).toBeInTheDocument()
    })
  })

  it('shows empty state when no widgets', async () => {
    // Override to return empty widgets
    const { useDefaultLayout } = await import('../hooks/useDashboardLayout')
    vi.mocked(useDefaultLayout).mockReturnValue({
      data: {
        id: 'layout-1',
        user_id: 'user-1',
        project_id: 'test-project-id',
        name: 'Default',
        description: null,
        layout_config: [],
        is_default: true,
        is_shared: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        widgets: [],
      },
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDefaultLayout>)

    render(<CustomizableDashboard projectId="test-project-id" />, {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(screen.getByText('No widgets yet')).toBeInTheDocument()
    })
  })

  it('shows loading skeleton while fetching layout', () => {
    const { useDefaultLayout } = vi.mocked(await import('../hooks/useDashboardLayout'))
    vi.mocked(useDefaultLayout).mockReturnValue({
      data: null,
      isLoading: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDefaultLayout>)

    const { container } = render(
      <CustomizableDashboard projectId="test-project-id" />,
      { wrapper: createWrapper() }
    )

    // Should show skeleton elements
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0)
  })
})
