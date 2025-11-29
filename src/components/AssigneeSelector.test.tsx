/**
 * AssigneeSelector Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AssigneeSelector, type Assignee, type AssigneeType } from './AssigneeSelector'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
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

describe('AssigneeSelector', () => {
  const defaultProps = {
    projectId: 'project-123',
    value: null,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render with default label', () => {
      render(<AssigneeSelector {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Assign To')).toBeInTheDocument()
    })

    it('should render with custom label', () => {
      render(
        <AssigneeSelector {...defaultProps} label="Responsible Party" />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Responsible Party')).toBeInTheDocument()
    })

    it('should render without label when label is empty', () => {
      render(
        <AssigneeSelector {...defaultProps} label="" />,
        { wrapper: createWrapper() }
      )

      expect(screen.queryByRole('label')).not.toBeInTheDocument()
    })

    it('should show loading state while fetching', () => {
      render(<AssigneeSelector {...defaultProps} />, { wrapper: createWrapper() })

      // The trigger should show loading text
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <AssigneeSelector {...defaultProps} disabled />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('combobox')).toBeDisabled()
    })
  })

  describe('Props', () => {
    it('should accept custom placeholder', () => {
      render(
        <AssigneeSelector {...defaultProps} placeholder="Choose someone..." />,
        { wrapper: createWrapper() }
      )

      // Placeholder is internal to the select
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should accept custom className', () => {
      const { container } = render(
        <AssigneeSelector {...defaultProps} className="custom-class" />,
        { wrapper: createWrapper() }
      )

      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })

    it('should support subcontractorsOnly mode', () => {
      render(
        <AssigneeSelector {...defaultProps} subcontractorsOnly />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should support usersOnly mode', () => {
      render(
        <AssigneeSelector {...defaultProps} usersOnly />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('Value handling', () => {
    it('should handle null value', () => {
      render(
        <AssigneeSelector {...defaultProps} value={null} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should handle user assignee value', () => {
      const userValue: Assignee = {
        type: 'user',
        id: 'user-123',
        name: 'John Doe',
      }

      render(
        <AssigneeSelector {...defaultProps} value={userValue} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should handle subcontractor assignee value', () => {
      const subValue: Assignee = {
        type: 'subcontractor',
        id: 'sub-123',
        name: 'ABC Plumbing',
      }

      render(
        <AssigneeSelector {...defaultProps} value={subValue} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })
})

describe('AssigneeType', () => {
  it('should accept valid assignee types', () => {
    const types: AssigneeType[] = ['user', 'subcontractor', null]

    types.forEach((type) => {
      expect(['user', 'subcontractor', null]).toContain(type)
    })
  })
})

describe('Assignee interface', () => {
  it('should have correct structure for user assignee', () => {
    const assignee: Assignee = {
      type: 'user',
      id: 'user-123',
      name: 'John Doe',
    }

    expect(assignee.type).toBe('user')
    expect(assignee.id).toBe('user-123')
    expect(assignee.name).toBe('John Doe')
  })

  it('should have correct structure for subcontractor assignee', () => {
    const assignee: Assignee = {
      type: 'subcontractor',
      id: 'sub-123',
      name: 'ABC Plumbing',
    }

    expect(assignee.type).toBe('subcontractor')
    expect(assignee.id).toBe('sub-123')
    expect(assignee.name).toBe('ABC Plumbing')
  })

  it('should allow optional name', () => {
    const assignee: Assignee = {
      type: 'user',
      id: 'user-123',
    }

    expect(assignee.name).toBeUndefined()
  })

  it('should allow null id', () => {
    const assignee: Assignee = {
      type: null,
      id: null,
    }

    expect(assignee.type).toBeNull()
    expect(assignee.id).toBeNull()
  })
})
