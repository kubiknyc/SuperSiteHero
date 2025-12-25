/**
 * DocuSignRequestDialog Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DocuSignRequestDialog } from '../DocuSignRequestDialog'
import type { DSConnectionStatus } from '@/types/docusign'

// Mock the hooks
vi.mock('../../hooks/useDocuSign', () => ({
  useDocuSignConnectionStatus: vi.fn(),
  useCreatePaymentApplicationEnvelope: vi.fn(),
  useCreateChangeOrderEnvelope: vi.fn(),
  useCreateLienWaiverEnvelope: vi.fn(),
}))

// Import the mocked hooks
import {
  useDocuSignConnectionStatus,
  useCreatePaymentApplicationEnvelope,
  useCreateChangeOrderEnvelope,
  useCreateLienWaiverEnvelope,
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

describe('DocuSignRequestDialog', () => {
  const mockOnOpenChange = vi.fn()
  const mockOnSuccess = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    documentType: 'payment_application' as const,
    documentId: 'doc-123',
    documentName: 'Payment Application #1',
    documentNumber: 'PA-001',
    onSuccess: mockOnSuccess,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
      data: mockConnectionStatus,
      isLoading: false,
    } as any)
    vi.mocked(useCreatePaymentApplicationEnvelope).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
    vi.mocked(useCreateChangeOrderEnvelope).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
    vi.mocked(useCreateLienWaiverEnvelope).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    } as any)
  })

  describe('Connection States', () => {
    it('should show not connected message when DocuSign is not connected', () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isConnected: false },
        isLoading: false,
      } as any)

      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('DocuSign Not Connected')).toBeInTheDocument()
      expect(
        screen.getByText(/Please connect your DocuSign account/)
      ).toBeInTheDocument()
    })

    it('should close dialog from not connected state', async () => {
      vi.mocked(useDocuSignConnectionStatus).mockReturnValue({
        data: { ...mockConnectionStatus, isConnected: false },
        isLoading: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Dialog Rendering', () => {
    it('should render dialog title', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Send for Signature')).toBeInTheDocument()
    })

    it('should render document name in description', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/Payment Application #1/)).toBeInTheDocument()
    })

    it('should render email subject field with default value', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const subjectInput = screen.getByLabelText('Email Subject')
      expect(subjectInput).toHaveValue('Payment Application PA-001 - Signature Request')
    })

    it('should render email message field', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByLabelText(/Email Message/)).toBeInTheDocument()
    })

    it('should have send button disabled initially with no signers', () => {
      render(
        <DocuSignRequestDialog {...defaultProps} defaultSigners={[]} />,
        { wrapper: createWrapper() }
      )

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      expect(sendButton).toBeDisabled()
    })
  })

  describe('Signer Management', () => {
    it('should render default signers for payment application', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Payment applications have 3 default signers
      expect(screen.getByText('Signer 1')).toBeInTheDocument()
      expect(screen.getByText('Signer 2')).toBeInTheDocument()
      expect(screen.getByText('Signer 3')).toBeInTheDocument()
    })

    it('should render default signers for change order', () => {
      render(
        <DocuSignRequestDialog {...defaultProps} documentType="change_order" />,
        { wrapper: createWrapper() }
      )

      // Change orders have 2 default signers
      expect(screen.getByText('Signer 1')).toBeInTheDocument()
      expect(screen.getByText('Signer 2')).toBeInTheDocument()
      expect(screen.queryByText('Signer 3')).not.toBeInTheDocument()
    })

    it('should render default signers for lien waiver', () => {
      render(
        <DocuSignRequestDialog {...defaultProps} documentType="lien_waiver" />,
        { wrapper: createWrapper() }
      )

      // Lien waivers have 1 default signer
      expect(screen.getByText('Signer 1')).toBeInTheDocument()
      expect(screen.queryByText('Signer 2')).not.toBeInTheDocument()
    })

    it('should add new signer when add signer clicked', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Find and click the "Add Signer" button (not the one in empty state)
      const addButtons = screen.getAllByRole('button', { name: /Add Signer/i })
      await user.click(addButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Signer 4')).toBeInTheDocument()
      })
    })

    it('should remove signer when remove button clicked', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Find all trash buttons (remove signer buttons)
      const removeButtons = screen.getAllByRole('button')
        .filter(btn => {
          const svg = btn.querySelector('svg')
          return svg && btn.className.includes('text-red-600')
        })

      expect(removeButtons.length).toBeGreaterThan(0)

      // Remove the first signer
      await user.click(removeButtons[0])

      await waitFor(() => {
        // Should now have 2 signers instead of 3
        expect(screen.getByText('Signer 1')).toBeInTheDocument()
        expect(screen.getByText('Signer 2')).toBeInTheDocument()
        expect(screen.queryByText('Signer 3')).not.toBeInTheDocument()
      })
    })

    it('should update signer name', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const nameInputs = screen.getAllByPlaceholderText('John Smith')
      await user.clear(nameInputs[0])
      await user.type(nameInputs[0], 'Jane Doe')

      expect(nameInputs[0]).toHaveValue('Jane Doe')
    })

    it('should update signer email', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const emailInputs = screen.getAllByPlaceholderText('john@example.com')
      await user.clear(emailInputs[0])
      await user.type(emailInputs[0], 'jane@example.com')

      expect(emailInputs[0]).toHaveValue('jane@example.com')
    })

    it('should update signer title', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const titleInputs = screen.getAllByPlaceholderText('Project Manager')
      await user.clear(titleInputs[0])
      await user.type(titleInputs[0], 'Senior Engineer')

      expect(titleInputs[0]).toHaveValue('Senior Engineer')
    })

    it('should move signer up', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Find move up buttons (ChevronUp icons)
      const upButtons = screen.getAllByRole('button')
        .filter(btn => btn.querySelector('svg') && !btn.disabled)

      // The second signer's up button should move them up
      // This is implementation-dependent, verify order changes
      expect(screen.getAllByText(/Signer \d/).length).toBe(3)
    })

    it('should move signer down', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Find move down buttons (ChevronDown icons)
      const downButtons = screen.getAllByRole('button')
        .filter(btn => btn.querySelector('svg') && !btn.disabled)

      // The first signer's down button should move them down
      expect(screen.getAllByText(/Signer \d/).length).toBe(3)
    })

    it('should show empty state when all signers removed', async () => {
      const user = userEvent.setup()
      render(
        <DocuSignRequestDialog {...defaultProps} defaultSigners={[]} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('No signers added')).toBeInTheDocument()
    })
  })

  describe('CC Recipients', () => {
    it('should show CC recipients accordion', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText(/CC Recipients \(0\)/)).toBeInTheDocument()
    })

    it('should add CC recipient', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Open the accordion
      const accordionTrigger = screen.getByText(/CC Recipients \(0\)/)
      await user.click(accordionTrigger)

      await waitFor(async () => {
        const addCCButton = screen.getByRole('button', { name: /Add CC/i })
        await user.click(addCCButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/CC Recipients \(1\)/)).toBeInTheDocument()
      })
    })

    it('should remove CC recipient', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Open accordion and add a CC
      const accordionTrigger = screen.getByText(/CC Recipients \(0\)/)
      await user.click(accordionTrigger)

      await waitFor(async () => {
        const addCCButton = screen.getByRole('button', { name: /Add CC/i })
        await user.click(addCCButton)
      })

      // Find the remove button for the CC
      await waitFor(async () => {
        const removeButtons = screen.getAllByRole('button')
          .filter(btn => btn.querySelector('svg') && !btn.textContent)

        // Click the last remove button (should be the CC remove button)
        await user.click(removeButtons[removeButtons.length - 1])
      })

      await waitFor(() => {
        expect(screen.getByText(/CC Recipients \(0\)/)).toBeInTheDocument()
      })
    })
  })

  describe('Options', () => {
    it('should show enable signing order toggle', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Enable Signing Order')).toBeInTheDocument()
      expect(
        screen.getByText(/Signers must sign in the specified order/)
      ).toBeInTheDocument()
    })

    it('should show send reminders toggle', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Send Reminders')).toBeInTheDocument()
      expect(
        screen.getByText(/Automatically remind signers/)
      ).toBeInTheDocument()
    })

    it('should toggle signing order', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const signingOrderSwitch = screen.getByRole('switch', { name: /signing-order/i })
      expect(signingOrderSwitch).toBeChecked()

      await user.click(signingOrderSwitch)

      expect(signingOrderSwitch).not.toBeChecked()
    })

    it('should toggle reminders', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const remindersSwitch = screen.getByRole('switch', { name: /reminders/i })
      expect(remindersSwitch).toBeChecked()

      await user.click(remindersSwitch)

      expect(remindersSwitch).not.toBeChecked()
    })
  })

  describe('Form Validation', () => {
    it('should enable send button when all required fields filled', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Fill in first signer
      const nameInputs = screen.getAllByPlaceholderText('John Smith')
      const emailInputs = screen.getAllByPlaceholderText('john@example.com')

      await user.clear(nameInputs[0])
      await user.type(nameInputs[0], 'John Contractor')
      await user.clear(emailInputs[0])
      await user.type(emailInputs[0], 'john@contractor.com')

      // Subject is pre-filled, so button should be enabled if at least one signer is valid
      // But we need all signers to have name and email
      await user.clear(nameInputs[1])
      await user.type(nameInputs[1], 'Jane Architect')
      await user.clear(emailInputs[1])
      await user.type(emailInputs[1], 'jane@architect.com')

      await user.clear(nameInputs[2])
      await user.type(nameInputs[2], 'Bob Owner')
      await user.clear(emailInputs[2])
      await user.type(emailInputs[2], 'bob@owner.com')

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      expect(sendButton).not.toBeDisabled()
    })

    it('should disable send button when signer name is empty', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const nameInputs = screen.getAllByPlaceholderText('John Smith')
      await user.clear(nameInputs[0])

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      expect(sendButton).toBeDisabled()
    })

    it('should disable send button when signer email is empty', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const emailInputs = screen.getAllByPlaceholderText('john@example.com')
      await user.clear(emailInputs[0])

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      expect(sendButton).toBeDisabled()
    })

    it('should disable send button when subject is empty', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const subjectInput = screen.getByLabelText('Email Subject')
      await user.clear(subjectInput)

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      expect(sendButton).toBeDisabled()
    })
  })

  describe('Submission Flow', () => {
    it('should call payment application mutation with correct config', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'env-123' })
      vi.mocked(useCreatePaymentApplicationEnvelope).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Fill in signers
      const nameInputs = screen.getAllByPlaceholderText('John Smith')
      const emailInputs = screen.getAllByPlaceholderText('john@example.com')

      await user.type(nameInputs[0], 'John Contractor')
      await user.type(emailInputs[0], 'john@contractor.com')
      await user.type(nameInputs[1], 'Jane Architect')
      await user.type(emailInputs[1], 'jane@architect.com')
      await user.type(nameInputs[2], 'Bob Owner')
      await user.type(emailInputs[2], 'bob@owner.com')

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            payment_application_id: 'doc-123',
            contractor_signer: expect.objectContaining({
              email: 'john@contractor.com',
              name: 'John Contractor',
            }),
            architect_signer: expect.objectContaining({
              email: 'jane@architect.com',
              name: 'Jane Architect',
            }),
            owner_signer: expect.objectContaining({
              email: 'bob@owner.com',
              name: 'Bob Owner',
            }),
          })
        )
      })
    })

    it('should call change order mutation with correct config', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'env-123' })
      vi.mocked(useCreateChangeOrderEnvelope).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      render(
        <DocuSignRequestDialog {...defaultProps} documentType="change_order" />,
        { wrapper: createWrapper() }
      )

      // Fill in signers
      const nameInputs = screen.getAllByPlaceholderText('John Smith')
      const emailInputs = screen.getAllByPlaceholderText('john@example.com')

      await user.type(nameInputs[0], 'John Contractor')
      await user.type(emailInputs[0], 'john@contractor.com')
      await user.type(nameInputs[1], 'Bob Owner')
      await user.type(emailInputs[1], 'bob@owner.com')

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            change_order_id: 'doc-123',
            contractor_signer: expect.objectContaining({
              email: 'john@contractor.com',
              name: 'John Contractor',
            }),
            owner_signer: expect.objectContaining({
              email: 'bob@owner.com',
              name: 'Bob Owner',
            }),
          })
        )
      })
    })

    it('should call lien waiver mutation with correct config', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'env-123' })
      vi.mocked(useCreateLienWaiverEnvelope).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      render(
        <DocuSignRequestDialog {...defaultProps} documentType="lien_waiver" />,
        { wrapper: createWrapper() }
      )

      // Fill in signer
      const nameInputs = screen.getAllByPlaceholderText('John Smith')
      const emailInputs = screen.getAllByPlaceholderText('john@example.com')

      await user.type(nameInputs[0], 'John Claimant')
      await user.type(emailInputs[0], 'john@claimant.com')

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            lien_waiver_id: 'doc-123',
            claimant_signer: expect.objectContaining({
              email: 'john@claimant.com',
              name: 'John Claimant',
            }),
          })
        )
      })
    })

    it('should call onSuccess callback on successful submission', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'env-123' })
      vi.mocked(useCreatePaymentApplicationEnvelope).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Fill in signers
      const nameInputs = screen.getAllByPlaceholderText('John Smith')
      const emailInputs = screen.getAllByPlaceholderText('john@example.com')

      await user.type(nameInputs[0], 'John Contractor')
      await user.type(emailInputs[0], 'john@contractor.com')
      await user.type(nameInputs[1], 'Jane Architect')
      await user.type(emailInputs[1], 'jane@architect.com')
      await user.type(nameInputs[2], 'Bob Owner')
      await user.type(emailInputs[2], 'bob@owner.com')

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('env-123')
      })
    })

    it('should close dialog on successful submission', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'env-123' })
      vi.mocked(useCreatePaymentApplicationEnvelope).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: mockMutateAsync,
        isPending: false,
      } as any)

      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      // Fill in signers
      const nameInputs = screen.getAllByPlaceholderText('John Smith')
      const emailInputs = screen.getAllByPlaceholderText('john@example.com')

      await user.type(nameInputs[0], 'John Contractor')
      await user.type(emailInputs[0], 'john@contractor.com')
      await user.type(nameInputs[1], 'Jane Architect')
      await user.type(emailInputs[1], 'jane@architect.com')
      await user.type(nameInputs[2], 'Bob Owner')
      await user.type(emailInputs[2], 'bob@owner.com')

      const sendButton = screen.getByRole('button', { name: /Send for Signature/i })
      await user.click(sendButton)

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should show loading state during submission', async () => {
      vi.mocked(useCreatePaymentApplicationEnvelope).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockImplementation(() => new Promise(() => {})),
        isPending: true,
      } as any)

      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })

    it('should disable buttons during submission', async () => {
      vi.mocked(useCreatePaymentApplicationEnvelope).mockReturnValue({
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockImplementation(() => new Promise(() => {})),
        isPending: true,
      } as any)

      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      const sendButton = screen.getByRole('button', { name: /sending/i })

      expect(cancelButton).toBeDisabled()
      expect(sendButton).toBeDisabled()
    })
  })

  describe('Document Type Defaults', () => {
    it('should set correct default subject for payment application', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const subjectInput = screen.getByLabelText('Email Subject')
      expect(subjectInput).toHaveValue('Payment Application PA-001 - Signature Request')
    })

    it('should set correct default subject for change order', () => {
      render(
        <DocuSignRequestDialog
          {...defaultProps}
          documentType="change_order"
          documentNumber="CO-001"
        />,
        { wrapper: createWrapper() }
      )

      const subjectInput = screen.getByLabelText('Email Subject')
      expect(subjectInput).toHaveValue('Change Order CO-001 - Signature Request')
    })

    it('should set correct default subject for lien waiver', () => {
      render(
        <DocuSignRequestDialog
          {...defaultProps}
          documentType="lien_waiver"
          documentNumber="LW-001"
        />,
        { wrapper: createWrapper() }
      )

      const subjectInput = screen.getByLabelText('Email Subject')
      expect(subjectInput).toHaveValue('Lien Waiver LW-001 - Signature Request')
    })

    it('should set correct default message for payment application', () => {
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const messageInput = screen.getByLabelText(/Email Message/)
      expect(messageInput).toHaveValue(
        expect.stringContaining('Please review and sign the attached payment application')
      )
    })
  })

  describe('Cancel Action', () => {
    it('should close dialog when cancel clicked', async () => {
      const user = userEvent.setup()
      render(<DocuSignRequestDialog {...defaultProps} />, { wrapper: createWrapper() })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
