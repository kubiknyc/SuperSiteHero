/**
 * InviteSubcontractorDialog Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InviteSubcontractorDialog } from './InviteSubcontractorDialog'

// Mock dependencies
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123', email: 'gc@example.com' },
    loading: false,
  })),
}))

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

vi.mock('../hooks/useInvitations', () => ({
  useCreateInvitation: vi.fn(() => ({
    mutate: vi.fn(),
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

describe('InviteSubcontractorDialog', () => {
  const defaultProps = {
    projectId: 'project-123',
    open: true,
    onOpenChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dialog title', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Invite Subcontractor to Portal')).toBeInTheDocument()
    })

    it('should render dialog description', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText(/send an invitation email/i)).toBeInTheDocument()
    })

    it('should render subcontractor selection label', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Subcontractor *')).toBeInTheDocument()
    })

    it('should render email input label', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Email Address *')).toBeInTheDocument()
    })

    it('should render cancel button', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should render send invitation button', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByRole('button', { name: /send invitation/i })).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(
        <InviteSubcontractorDialog {...defaultProps} open={false} />,
        { wrapper: createWrapper() }
      )
      expect(screen.queryByText('Invite Subcontractor to Portal')).not.toBeInTheDocument()
    })
  })

  describe('Form State', () => {
    it('should have email input', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      const emailInput = screen.getByPlaceholderText('subcontractor@example.com')
      expect(emailInput).toBeInTheDocument()
    })

    it('should have send button initially disabled', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      const submitButton = screen.getByRole('button', { name: /send invitation/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have dialog content visible when open', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      // Radix UI Dialog renders content in a portal, check for content presence
      expect(screen.getByText('Invite Subcontractor to Portal')).toBeInTheDocument()
    })

    it('should have labeled email input', () => {
      render(<InviteSubcontractorDialog {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    })
  })
})
