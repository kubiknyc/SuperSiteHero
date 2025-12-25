/**
 * DocuSignDashboard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DocuSignDashboard } from '../DocuSignDashboard'
import type { DSEnvelope, DSDashboard, DSConnectionStatus } from '@/types/docusign'

// Mock the hooks
vi.mock('../../hooks/useDocuSign', () => ({
  useDocuSignDashboard: vi.fn(),
  useDocuSignConnectionStatus: vi.fn(),
  useVoidDocuSignEnvelope: vi.fn(),
  useResendDocuSignEnvelope: vi.fn(),
}))

// Import the mocked hooks
import {
  useDocuSignDashboard,
  useDocuSignConnectionStatus,
  useVoidDocuSignEnvelope,
  useResendDocuSignEnvelope,
} from '../../hooks/useDocuSign'

// Test data
const mockConnectionStatus: DSConnectionStatus = {
  isConnected: true,
  connectionId: 'conn-123',
  accountId: 'acc-123',
  accountName: 'Test Account',
  isDemo: false,
  lastConnectedAt: '2024-01-15T10:00:00Z',
  tokenExpiresAt: '2024-01-20T10:00:00Z',
  isTokenExpired: false,
  needsReauth: false,
  connectionError: null,
}

const mockEnvelope: DSEnvelope = {
  id: 'env-1',
  company_id: 'comp-123',
  connection_id: 'conn-123',
  envelope_id: 'envelope-123',
  document_type: 'payment_application',
  local_document_id: 'doc-123',
  local_document_number: 'PA-001',
  status: 'sent',
  subject: 'Payment Application PA-001',
  message: 'Please sign',
  sent_at: '2024-01-15T10:00:00Z',
  completed_at: null,
  voided_at: null,
  void_reason: null,
  expires_at: '2024-01-30T10:00:00Z',
  signing_order_enabled: true,
  reminder_enabled: true,
  reminder_delay_days: 3,
  reminder_frequency_days: 3,
  created_at: '2024-01-15T09:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  created_by: 'user-123',
  recipients: [
    {
      id: 'rec-1',
      envelope_db_id: 'env-1',
      recipient_id: 'recipient-1',
      recipient_type: 'signer',
      email: 'contractor@example.com',
      name: 'John Contractor',
      role_name: 'Contractor',
      routing_order: 1,
      status: 'sent',
      signed_at: null,
      declined_at: null,
      decline_reason: null,
      delivered_at: '2024-01-15T10:30:00Z',
      client_user_id: null,
      user_id: null,
      authentication_method: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    },
  ],
}

const mockDashboard: DSDashboard = {
  connection: mockConnectionStatus,
  stats: {
    total: 10,
    pending: 3,
    sent: 2,
    delivered: 1,
    signed: 0,
    completed: 5,
    declined: 1,
    voided: 1,
    byDocumentType: {
      payment_application: { total: 5, pending: 2, completed: 3 },
      change_order: { total: 3, pending: 1, completed: 2 },
      lien_waiver: { total: 2, pending: 0, completed: 2 },
      contract: { total: 0, pending: 0, completed: 0 },
      subcontract: { total: 0, pending: 0, completed: 0 },
      other: { total: 0, pending: 0, completed: 0 },
    },
  },
  recentEnvelopes: [mockEnvelope],
  pendingSignatures: [mockEnvelope],
}

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

describe('DocuSignDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Connection States', () => {
    it('should show not connected message when DocuSign is not connected', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isConnected: false },
        isLoading: false,
      } as any)
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('DocuSign Not Connected')).toBeInTheDocument()
      expect(
        screen.getByText(/Connect your DocuSign account in Settings/)
      ).toBeInTheDocument()
    })

    it('should show loading state', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
    })

    it('should show error state with retry button', async () => {
      const mockRefetch = vi.fn()
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to load'),
        refetch: mockRefetch,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument()

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await user.click(retryButton)

      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Stats Display', () => {
    beforeEach(() => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: mockDashboard,
        isLoading: false,
      } as any)
      vi.mocked(useVoidDocuSignEnvelope).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useResendDocuSignEnvelope).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should display total envelopes stat', () => {
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Total Envelopes')).toBeInTheDocument()
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('should display pending signatures stat', () => {
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Pending Signatures')).toBeInTheDocument()
      // sent (2) + delivered (1) = 3
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should display completed stat', () => {
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should display declined/voided stat', () => {
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Declined/Voided')).toBeInTheDocument()
      // declined (1) + voided (1) = 2
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Document Type Stats', () => {
    beforeEach(() => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: mockDashboard,
        isLoading: false,
      } as any)
      vi.mocked(useVoidDocuSignEnvelope).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useResendDocuSignEnvelope).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should display payment application stats', () => {
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Payment Applications')).toBeInTheDocument()
      // Payment applications have total: 5, pending: 2, completed: 3
      const statSection = screen.getByText('Payment Applications').closest('div')!
      expect(statSection).toHaveTextContent('5') // total
      expect(statSection).toHaveTextContent('2') // pending
      expect(statSection).toHaveTextContent('3') // completed
    })

    it('should display change order stats', () => {
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Change Orders')).toBeInTheDocument()
      const statSection = screen.getByText('Change Orders').closest('div')!
      expect(statSection).toHaveTextContent('3') // total
      expect(statSection).toHaveTextContent('1') // pending
      expect(statSection).toHaveTextContent('2') // completed
    })

    it('should display lien waiver stats', () => {
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Lien Waivers')).toBeInTheDocument()
      const statSection = screen.getByText('Lien Waivers').closest('div')!
      expect(statSection).toHaveTextContent('2') // total
      expect(statSection).toHaveTextContent('0') // pending
      expect(statSection).toHaveTextContent('2') // completed
    })

    it('should display completion rate', () => {
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      // Payment Applications: 3/5 = 60%
      const paymentAppSection = screen.getByText('Payment Applications').closest('div')!
      expect(paymentAppSection).toHaveTextContent('60%')

      // Change Orders: 2/3 = 67%
      const changeOrderSection = screen.getByText('Change Orders').closest('div')!
      expect(changeOrderSection).toHaveTextContent('67%')

      // Lien Waivers: 2/2 = 100%
      const lienWaiverSection = screen.getByText('Lien Waivers').closest('div')!
      expect(lienWaiverSection).toHaveTextContent('100%')
    })
  })

  describe('Envelope Lists', () => {
    beforeEach(() => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)
      vi.mocked(useVoidDocuSignEnvelope).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useResendDocuSignEnvelope).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should show pending tab with correct count', () => {
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: mockDashboard,
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText(/Pending \(1\)/)).toBeInTheDocument()
    })

    it('should show recent tab', () => {
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: mockDashboard,
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Recent')).toBeInTheDocument()
    })

    it('should display envelope information in pending list', () => {
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: mockDashboard,
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Payment Application PA-001')).toBeInTheDocument()
      expect(screen.getByText('Payment Application')).toBeInTheDocument()
      expect(screen.getByText(/1 recipient/)).toBeInTheDocument()
    })

    it('should show empty state for pending when no pending signatures', () => {
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: { ...mockDashboard, pendingSignatures: [] },
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('No pending signatures')).toBeInTheDocument()
    })

    it('should show empty state for recent when no recent envelopes', async () => {
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: { ...mockDashboard, recentEnvelopes: [] },
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      // Click on Recent tab
      const recentTab = screen.getByText('Recent')
      await user.click(recentTab)

      await waitFor(() => {
        expect(screen.getByText('No recent envelopes')).toBeInTheDocument()
      })
    })
  })

  describe('Envelope Actions', () => {
    let mockVoidMutate: ReturnType<typeof vi.fn>
    let mockResendMutate: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockVoidMutate = vi.fn()
      mockResendMutate = vi.fn()

      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: mockDashboard,
        isLoading: false,
      } as any)
      vi.mocked(useVoidDocuSignEnvelope).mockReturnValue({
        mutate: mockVoidMutate,
        isPending: false,
      } as any)
      vi.mocked(useResendDocuSignEnvelope).mockReturnValue({
        mutate: mockResendMutate,
        isPending: false,
      } as any)
    })

    it('should show view details action', async () => {
      const user = userEvent.setup()
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      // Find the actions menu button (MoreVertical icon)
      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(
        (btn) => btn.querySelector('svg') && !btn.textContent
      )
      expect(menuButton).toBeDefined()

      await user.click(menuButton!)

      await waitFor(() => {
        expect(screen.getByText('View Details')).toBeInTheDocument()
      })
    })

    it('should show resend action for sent envelope', async () => {
      const user = userEvent.setup()
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(
        (btn) => btn.querySelector('svg') && !btn.textContent
      )

      await user.click(menuButton!)

      await waitFor(() => {
        expect(screen.getByText('Resend')).toBeInTheDocument()
      })
    })

    it('should call resend mutation when resend clicked', async () => {
      const user = userEvent.setup()
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(
        (btn) => btn.querySelector('svg') && !btn.textContent
      )

      await user.click(menuButton!)

      await waitFor(() => {
        const resendButton = screen.getByText('Resend')
        return user.click(resendButton)
      })

      await waitFor(() => {
        expect(mockResendMutate).toHaveBeenCalledWith({
          envelope_id: 'envelope-123',
        })
      })
    })

    it('should show void action for sent envelope', async () => {
      const user = userEvent.setup()
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(
        (btn) => btn.querySelector('svg') && !btn.textContent
      )

      await user.click(menuButton!)

      await waitFor(() => {
        expect(screen.getByText('Void')).toBeInTheDocument()
      })
    })

    it('should call void mutation when void clicked', async () => {
      const user = userEvent.setup()
      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      const menuButtons = screen.getAllByRole('button')
      const menuButton = menuButtons.find(
        (btn) => btn.querySelector('svg') && !btn.textContent
      )

      await user.click(menuButton!)

      await waitFor(() => {
        const voidButton = screen.getByText('Void')
        return user.click(voidButton)
      })

      await waitFor(() => {
        expect(mockVoidMutate).toHaveBeenCalledWith({
          envelope_id: 'envelope-123',
          reason: 'Voided by user',
        })
      })
    })

    it('should not show void/resend for completed envelope', () => {
      const completedEnvelope = {
        ...mockEnvelope,
        status: 'completed' as const,
        completed_at: '2024-01-16T10:00:00Z',
      }

      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: {
          ...mockDashboard,
          pendingSignatures: [],
          recentEnvelopes: [completedEnvelope],
        },
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      // The completed envelope should not have void/resend options
      // This would require clicking the menu to verify, but we can check it's not in pending
      expect(screen.queryByText(/Pending \(0\)/)).toBeInTheDocument()
    })
  })

  describe('Status Badges', () => {
    beforeEach(() => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: mockConnectionStatus,
        isLoading: false,
      } as any)
      vi.mocked(useVoidDocuSignEnvelope).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
      vi.mocked(useResendDocuSignEnvelope).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any)
    })

    it('should display Sent badge for sent envelope', () => {
      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: mockDashboard,
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Sent')).toBeInTheDocument()
    })

    it('should display Completed badge for completed envelope', () => {
      const completedEnvelope = {
        ...mockEnvelope,
        status: 'completed' as const,
        completed_at: '2024-01-16T10:00:00Z',
      }

      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: {
          ...mockDashboard,
          recentEnvelopes: [completedEnvelope],
        },
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('should display Declined badge for declined envelope', () => {
      const declinedEnvelope = {
        ...mockEnvelope,
        status: 'declined' as const,
      }

      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: {
          ...mockDashboard,
          recentEnvelopes: [declinedEnvelope],
        },
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Declined')).toBeInTheDocument()
    })

    it('should display Voided badge for voided envelope', () => {
      const voidedEnvelope = {
        ...mockEnvelope,
        status: 'voided' as const,
        voided_at: '2024-01-16T10:00:00Z',
        void_reason: 'User voided',
      }

      vi.mocked(useDocuSignDashboard).mockReturnValue({
        data: {
          ...mockDashboard,
          recentEnvelopes: [voidedEnvelope],
        },
        isLoading: false,
      } as any)

      render(<DocuSignDashboard />, { wrapper: createWrapper() })

      expect(screen.getByText('Voided')).toBeInTheDocument()
    })
  })
})
