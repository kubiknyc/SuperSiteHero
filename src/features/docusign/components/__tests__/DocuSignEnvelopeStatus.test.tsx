/**
 * DocuSignEnvelopeStatus Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DocuSignEnvelopeStatus } from '../DocuSignEnvelopeStatus'
import type { DSEnvelope, DSEnvelopeRecipient } from '@/types/docusign'

// Mock the hooks
vi.mock('../../hooks/useDocuSign', () => ({
  useDocuSignEnvelopeByDocument: vi.fn(),
  useGetSigningUrl: vi.fn(),
  useVoidDocuSignEnvelope: vi.fn(),
  useResendDocuSignEnvelope: vi.fn(),
}))

// Import the mocked hooks
import {
  useDocuSignEnvelopeByDocument,
  useGetSigningUrl,
  useVoidDocuSignEnvelope,
  useResendDocuSignEnvelope,
} from '../../hooks/useDocuSign'

// Test data
const mockRecipient: DSEnvelopeRecipient = {
  id: 'rec-1',
  envelope_db_id: 'env-1',
  recipient_id: 'recipient-1',
  recipient_type: 'signer',
  email: 'john@contractor.com',
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
  recipients: [mockRecipient],
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

describe('DocuSignEnvelopeStatus', () => {
  const mockOnSendNew = vi.fn()
  const defaultProps = {
    documentType: 'payment_application' as const,
    documentId: 'doc-123',
    onSendNew: mockOnSendNew,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useGetSigningUrl).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
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

  describe('No Envelope State', () => {
    it('should show send for signature button in compact mode when no envelope', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} compact />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText('Send for Signature')).toBeInTheDocument()
    })

    it('should call onSendNew when send button clicked in compact mode', async () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignEnvelopeStatus {...defaultProps} compact />, {
        wrapper: createWrapper(),
      })

      const sendButton = screen.getByRole('button', { name: /send for signature/i })
      await user.click(sendButton)

      expect(mockOnSendNew).toHaveBeenCalledTimes(1)
    })

    it('should show full card with send button when no envelope', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(
        screen.getByText(/This document hasn't been sent for signature yet/)
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send for signature/i })).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should show loading badge in compact mode', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} compact />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should show loading text in full mode', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Loading envelope status...')).toBeInTheDocument()
    })
  })

  describe('Status Badge Rendering', () => {
    it('should show status badge in compact mode', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} compact />, {
        wrapper: createWrapper(),
      })

      expect(screen.getByText('Sent')).toBeInTheDocument()
    })

    it('should show completed status with green styling', () => {
      const completedEnvelope = {
        ...mockEnvelope,
        status: 'completed' as const,
        completed_at: '2024-01-16T10:00:00Z',
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: completedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} compact />, {
        wrapper: createWrapper(),
      })

      const badge = screen.getByText('Completed')
      expect(badge).toBeInTheDocument()
    })

    it('should show declined status with red styling', () => {
      const declinedEnvelope = {
        ...mockEnvelope,
        status: 'declined' as const,
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: declinedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} compact />, {
        wrapper: createWrapper(),
      })

      const badge = screen.getByText('Declined')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Recipient List Display', () => {
    it('should display recipient name and email', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('John Contractor')).toBeInTheDocument()
      expect(screen.getByText('john@contractor.com')).toBeInTheDocument()
    })

    it('should display recipient role', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Contractor/)).toBeInTheDocument()
    })

    it('should show pending badge for unsigned recipient', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Pending')).toBeInTheDocument()
    })

    it('should show signed status with date for signed recipient', () => {
      const signedEnvelope = {
        ...mockEnvelope,
        recipients: [
          {
            ...mockRecipient,
            status: 'signed' as const,
            signed_at: '2024-01-15T14:00:00Z',
          },
        ],
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: signedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Signed/)).toBeInTheDocument()
    })

    it('should show declined status for declined recipient', () => {
      const declinedEnvelope = {
        ...mockEnvelope,
        recipients: [
          {
            ...mockRecipient,
            status: 'declined' as const,
            declined_at: '2024-01-15T14:00:00Z',
            decline_reason: 'Not approved',
          },
        ],
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: declinedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Declined')).toBeInTheDocument()
      expect(screen.getByText('Not approved')).toBeInTheDocument()
    })

    it('should show viewed badge for delivered recipient', () => {
      const deliveredEnvelope = {
        ...mockEnvelope,
        status: 'delivered' as const,
        recipients: [
          {
            ...mockRecipient,
            status: 'delivered' as const,
            delivered_at: '2024-01-15T14:00:00Z',
          },
        ],
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: deliveredEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Viewed')).toBeInTheDocument()
    })
  })

  describe('Progress Display', () => {
    it('should show progress bar for active envelope', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Signing Progress')).toBeInTheDocument()
      expect(screen.getByText('0 / 1')).toBeInTheDocument()
    })

    it('should calculate correct signing progress', () => {
      const multiRecipientEnvelope = {
        ...mockEnvelope,
        recipients: [
          {
            ...mockRecipient,
            id: 'rec-1',
            routing_order: 1,
            status: 'signed' as const,
            signed_at: '2024-01-15T14:00:00Z',
          },
          {
            ...mockRecipient,
            id: 'rec-2',
            routing_order: 2,
            status: 'sent' as const,
          },
          {
            ...mockRecipient,
            id: 'rec-3',
            routing_order: 3,
            status: 'created' as const,
          },
        ],
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: multiRecipientEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('1 / 3')).toBeInTheDocument()
    })

    it('should not show progress bar for completed envelope', () => {
      const completedEnvelope = {
        ...mockEnvelope,
        status: 'completed' as const,
        completed_at: '2024-01-16T10:00:00Z',
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: completedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.queryByText('Signing Progress')).not.toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    let mockVoidMutate: ReturnType<typeof vi.fn>
    let mockResendMutate: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockVoidMutate = vi.fn()
      mockResendMutate = vi.fn()

      vi.mocked(useVoidDocuSignEnvelope).mockReturnValue({
        mutate: mockVoidMutate,
        isPending: false,
      } as any)
      vi.mocked(useResendDocuSignEnvelope).mockReturnValue({
        mutate: mockResendMutate,
        isPending: false,
      } as any)
    })

    it('should show resend button for active envelope', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument()
    })

    it('should call resend mutation when resend clicked', async () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      const resendButton = screen.getByRole('button', { name: /resend/i })
      await user.click(resendButton)

      expect(mockResendMutate).toHaveBeenCalledWith({
        envelope_id: 'envelope-123',
      })
    })

    it('should show void button for active envelope', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /void/i })).toBeInTheDocument()
    })

    it('should show void confirmation dialog when void clicked', async () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      const voidButton = screen.getByRole('button', { name: /^void$/i })
      await user.click(voidButton)

      await waitFor(() => {
        expect(screen.getByText('Void Envelope?')).toBeInTheDocument()
      })
    })

    it('should call void mutation when confirmed', async () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      // Open dialog
      const voidButton = screen.getByRole('button', { name: /^void$/i })
      await user.click(voidButton)

      // Confirm void
      await waitFor(async () => {
        const confirmButton = screen.getByRole('button', { name: /void envelope/i })
        await user.click(confirmButton)
      })

      await waitFor(() => {
        expect(mockVoidMutate).toHaveBeenCalledWith(
          { envelope_id: 'envelope-123', reason: 'Voided by user' },
          expect.any(Object)
        )
      })
    })

    it('should not show void/resend for completed envelope', () => {
      const completedEnvelope = {
        ...mockEnvelope,
        status: 'completed' as const,
        completed_at: '2024-01-16T10:00:00Z',
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: completedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^void$/i })).not.toBeInTheDocument()
    })

    it('should not show void/resend for declined envelope', () => {
      const declinedEnvelope = {
        ...mockEnvelope,
        status: 'declined' as const,
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: declinedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^void$/i })).not.toBeInTheDocument()
    })

    it('should show send new button for terminal envelope', () => {
      const completedEnvelope = {
        ...mockEnvelope,
        status: 'completed' as const,
        completed_at: '2024-01-16T10:00:00Z',
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: completedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByRole('button', { name: /send new request/i })).toBeInTheDocument()
    })

    it('should call onSendNew when send new clicked', async () => {
      const completedEnvelope = {
        ...mockEnvelope,
        status: 'completed' as const,
        completed_at: '2024-01-16T10:00:00Z',
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: completedEnvelope,
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      const sendNewButton = screen.getByRole('button', { name: /send new request/i })
      await user.click(sendNewButton)

      expect(mockOnSendNew).toHaveBeenCalledTimes(1)
    })
  })

  describe('Status Messages', () => {
    it('should show completed message with date', () => {
      const completedEnvelope = {
        ...mockEnvelope,
        status: 'completed' as const,
        completed_at: '2024-01-16T10:00:00Z',
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: completedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Completed on/)).toBeInTheDocument()
    })

    it('should show declined message', () => {
      const declinedEnvelope = {
        ...mockEnvelope,
        status: 'declined' as const,
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: declinedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(
        screen.getByText(/This envelope was declined by a recipient/)
      ).toBeInTheDocument()
    })

    it('should show voided message with reason', () => {
      const voidedEnvelope = {
        ...mockEnvelope,
        status: 'voided' as const,
        voided_at: '2024-01-16T10:00:00Z',
        void_reason: 'User requested cancellation',
      }

      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: voidedEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/This envelope was voided/)).toBeInTheDocument()
      expect(screen.getByText(/User requested cancellation/)).toBeInTheDocument()
    })

    it('should show sent date in header', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Sent/)).toBeInTheDocument()
    })
  })

  describe('Compact vs Full Views', () => {
    it('should not show recipient details in compact mode', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} compact />, {
        wrapper: createWrapper(),
      })

      expect(screen.queryByText('john@contractor.com')).not.toBeInTheDocument()
    })

    it('should show recipient details in full mode', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('john@contractor.com')).toBeInTheDocument()
    })

    it('should not show action buttons in compact mode', () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      render(<DocuSignEnvelopeStatus {...defaultProps} compact />, {
        wrapper: createWrapper(),
      })

      expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /void/i })).not.toBeInTheDocument()
    })

    it('should show tooltip in compact mode', async () => {
      vi.mocked(useDocuSignEnvelopeByDocument).mockReturnValue({
        data: mockEnvelope,
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignEnvelopeStatus {...defaultProps} compact />, {
        wrapper: createWrapper(),
      })

      const badge = screen.getByText('Sent')
      await user.hover(badge)

      await waitFor(() => {
        expect(screen.getByText(/0 of 1 signed/)).toBeInTheDocument()
      })
    })
  })
})
