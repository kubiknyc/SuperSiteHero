/**
 * StatusUpdateButton Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBadge, PunchItemStatusButton, TaskStatusButton } from './StatusUpdateButton'

// Mock the hooks
vi.mock('../hooks', () => ({
  useUpdatePunchItemStatus: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateTaskStatus: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

describe('StatusBadge', () => {
  describe('Rendering', () => {
    it('should render open status', () => {
      render(<StatusBadge status="open" type="punch-item" />)
      expect(screen.getByText('Open')).toBeInTheDocument()
    })

    it('should render pending status', () => {
      render(<StatusBadge status="pending" type="task" />)
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('should render in_progress status', () => {
      render(<StatusBadge status="in_progress" type="punch-item" />)
      expect(screen.getByText('In Progress')).toBeInTheDocument()
    })

    it('should render ready_for_review status', () => {
      render(<StatusBadge status="ready_for_review" type="punch-item" />)
      expect(screen.getByText('Ready for Review')).toBeInTheDocument()
    })

    it('should render completed status', () => {
      render(<StatusBadge status="completed" type="task" />)
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('should render verified status', () => {
      render(<StatusBadge status="verified" type="punch-item" />)
      expect(screen.getByText('Verified')).toBeInTheDocument()
    })

    it('should render rejected status', () => {
      render(<StatusBadge status="rejected" type="punch-item" />)
      expect(screen.getByText('Rejected')).toBeInTheDocument()
    })

    it('should render cancelled status', () => {
      render(<StatusBadge status="cancelled" type="task" />)
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
    })

    it('should render unknown status as-is', () => {
      render(<StatusBadge status="unknown_status" type="punch-item" />)
      expect(screen.getByText('unknown_status')).toBeInTheDocument()
    })
  })
})

describe('PunchItemStatusButton', () => {
  const defaultProps = {
    punchItemId: 'punch-123',
    currentStatus: 'open' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with current status', () => {
      render(<PunchItemStatusButton {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should render badge only for verified status', () => {
      render(
        <PunchItemStatusButton {...defaultProps} currentStatus="verified" />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByText('Verified')).toBeInTheDocument()
      // Should not have a dropdown button for verified status
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should render badge only for rejected status', () => {
      render(
        <PunchItemStatusButton {...defaultProps} currentStatus="rejected" />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByText('Rejected')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <PunchItemStatusButton {...defaultProps} disabled />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })
})

describe('TaskStatusButton', () => {
  const defaultProps = {
    taskId: 'task-123',
    currentStatus: 'pending' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with current status', () => {
      render(<TaskStatusButton {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should render badge only for completed status', () => {
      render(
        <TaskStatusButton {...defaultProps} currentStatus="completed" />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should render badge only for cancelled status', () => {
      render(
        <TaskStatusButton {...defaultProps} currentStatus="cancelled" />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <TaskStatusButton {...defaultProps} disabled />,
        { wrapper: createWrapper() }
      )
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })
})
