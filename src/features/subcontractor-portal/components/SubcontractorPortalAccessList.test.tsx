/**
 * SubcontractorPortalAccessList Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { SubcontractorPortalAccessWithRelations } from '@/types/subcontractor-portal'

// Mock UI components that may not exist
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Import the component after mocking dependencies
import { SubcontractorPortalAccessList } from './SubcontractorPortalAccessList'

// Mock hooks
const mockAccessRecords: SubcontractorPortalAccessWithRelations[] = [
  {
    id: 'access-1',
    subcontractor_id: 'sub-1',
    user_id: 'user-1',
    project_id: 'project-123',
    invited_by: 'gc-user',
    invited_at: '2025-01-27T10:00:00Z',
    accepted_at: '2025-01-28T10:00:00Z',
    is_active: true,
    created_at: '2025-01-27T10:00:00Z',
    updated_at: '2025-01-27T10:00:00Z',
    subcontractor: {
      id: 'sub-1',
      company_name: 'ABC Plumbing',
      trade: 'Plumbing',
    },
    user: {
      id: 'user-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@abcplumbing.com',
    },
    invited_by_user: {
      id: 'gc-user',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@gc.com',
    },
  },
  {
    id: 'access-2',
    subcontractor_id: 'sub-2',
    user_id: 'user-2',
    project_id: 'project-123',
    invited_by: 'gc-user',
    invited_at: '2025-01-29T10:00:00Z',
    accepted_at: null,
    is_active: true,
    created_at: '2025-01-29T10:00:00Z',
    updated_at: '2025-01-29T10:00:00Z',
    subcontractor: {
      id: 'sub-2',
      company_name: 'XYZ Electric',
      trade: 'Electrical',
    },
    user: {
      id: 'user-2',
      email: 'contact@xyzelectric.com',
    },
    invited_by_user: {
      id: 'gc-user',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@gc.com',
    },
  },
]

vi.mock('../hooks/useInvitations', () => ({
  useProjectPortalAccess: vi.fn(() => ({
    data: mockAccessRecords,
    isLoading: false,
    isError: false,
  })),
  useRevokePortalAccess: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

// Mock InviteSubcontractorDialog
vi.mock('./InviteSubcontractorDialog', () => ({
  InviteSubcontractorDialog: () => null,
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

describe('SubcontractorPortalAccessList', () => {
  const defaultProps = {
    projectId: 'project-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render card title', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Subcontractor Portal Access')).toBeInTheDocument()
    })

    it('should render card description', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText(/manage which subcontractors can access/i)).toBeInTheDocument()
    })

    it('should render invite button', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument()
    })

    it('should render table headers', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Subcontractor')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Invited')).toBeInTheDocument()
    })
  })

  describe('Data Display', () => {
    it('should render subcontractor names', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('ABC Plumbing')).toBeInTheDocument()
      expect(screen.getByText('XYZ Electric')).toBeInTheDocument()
    })

    it('should render trades', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Plumbing')).toBeInTheDocument()
      expect(screen.getByText('Electrical')).toBeInTheDocument()
    })

    it('should show Active status for accepted invitations', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('should show Pending status for unaccepted invitations', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('should display user names', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should display user emails', () => {
      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText('john@abcplumbing.com')).toBeInTheDocument()
      // Email may appear multiple times when user doesn't have a name
      expect(screen.getAllByText('contact@xyzelectric.com').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Loading State', () => {
    it('should show skeleton when loading', async () => {
      const { useProjectPortalAccess } = await import('../hooks/useInvitations')
      vi.mocked(useProjectPortalAccess).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as ReturnType<typeof useProjectPortalAccess>)

      const { container } = render(
        <SubcontractorPortalAccessList {...defaultProps} />,
        { wrapper: createWrapper() }
      )

      // Should show skeleton elements
      expect(container.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state message when no records', async () => {
      const { useProjectPortalAccess } = await import('../hooks/useInvitations')
      vi.mocked(useProjectPortalAccess).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useProjectPortalAccess>)

      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText(/no subcontractors have portal access yet/i)).toBeInTheDocument()
    })

    it('should show send first invitation button in empty state', async () => {
      const { useProjectPortalAccess } = await import('../hooks/useInvitations')
      vi.mocked(useProjectPortalAccess).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useProjectPortalAccess>)

      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByRole('button', { name: /send first invitation/i })).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should show error message when loading fails', async () => {
      const { useProjectPortalAccess } = await import('../hooks/useInvitations')
      vi.mocked(useProjectPortalAccess).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as ReturnType<typeof useProjectPortalAccess>)

      render(<SubcontractorPortalAccessList {...defaultProps} />, { wrapper: createWrapper() })
      expect(screen.getByText(/failed to load portal access records/i)).toBeInTheDocument()
    })
  })
})
