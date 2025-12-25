/**
 * DocuSign Signing Workflow Integration Tests
 *
 * Tests the complete end-to-end signing workflow:
 * - Connection setup and OAuth flow
 * - Creating signature requests
 * - Managing envelope lifecycle
 * - Handling signing events
 * - Error scenarios and recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@/__tests__/helpers'
import {
  useDocuSignConnectionStatus,
  useInitiateConnection,
  useCompleteConnection,
  useCreatePaymentApplicationEnvelope,
  useCreateChangeOrderEnvelope,
  useCreateLienWaiverEnvelope,
  useGetEnvelopeStatus,
  useVoidEnvelope,
  useResendEnvelope,
} from '../../hooks/useDocuSign'
import { DocuSignRequestDialog } from '../../components/DocuSignRequestDialog'
import { DocuSignDashboard } from '../../components/DocuSignDashboard'
import {
  createMockDSConnection,
  createMockDSEnvelope,
  createMockDSRecipient,
  createActiveDSConnection,
  createPendingDSEnvelope,
  createCompletedDSEnvelope,
  createMockUser,
  createMockProject,
} from '@/__tests__/factories'
import {
  createMockServer,
  createDocuSignHandlers,
  successResponse,
  errorResponse,
  createDelayedHandler,
} from '@/__tests__/helpers'
import type { DSEnvelopeStatus } from '@/types/docusign'

// ============================================================================
// Test Setup
// ============================================================================

const mockUser = createMockUser({ role: 'project_manager' })
const mockProject = createMockProject()
const mockConnection = createActiveDSConnection({
  company_id: mockUser.company_id,
})

const server = createMockServer()

beforeEach(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
  server.close()
  vi.clearAllMocks()
})

// ============================================================================
// Complete Signing Workflow Tests
// ============================================================================

describe('DocuSign Signing Workflow Integration', () => {
  describe('Connection Setup Flow', () => {
    it('should complete full OAuth connection flow', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      // Step 1: Check initial connection status (not connected)
      const { result: statusResult } = renderHook(
        () => useDocuSignConnectionStatus(),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      )

      await waitFor(() => {
        expect(statusResult.current.data?.is_connected).toBe(false)
      })

      // Step 2: Initiate OAuth connection
      const { result: initiateResult } = renderHook(
        () => useInitiateConnection(),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      )

      let authorizationUrl: string | undefined

      await act(async () => {
        initiateResult.current.mutate(
          { demo: false },
          {
            onSuccess: (data) => {
              authorizationUrl = data.authorization_url
            },
          }
        )
      })

      await waitFor(() => {
        expect(initiateResult.current.isSuccess).toBe(true)
        expect(authorizationUrl).toBeDefined()
        expect(authorizationUrl).toContain('docusign.net/oauth/auth')
      })

      // Step 3: Complete OAuth connection (simulate callback)
      const { result: completeResult } = renderHook(
        () => useCompleteConnection(),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      )

      const mockAuthCode = 'mock_auth_code_12345'

      await act(async () => {
        completeResult.current.mutate({
          code: mockAuthCode,
          demo: false,
        })
      })

      await waitFor(() => {
        expect(completeResult.current.isSuccess).toBe(true)
        expect(completeResult.current.data?.is_connected).toBe(true)
      })

      // Step 4: Verify connection is now active
      await waitFor(() => {
        expect(statusResult.current.data?.is_connected).toBe(true)
        expect(statusResult.current.data?.account_name).toBeDefined()
      })
    })

    it('should handle OAuth connection errors gracefully', async () => {
      server.use(
        createDelayedHandler('POST', '/api/docusign/connection/initiate', {
          delay: 100,
          response: errorResponse('Connection failed', 500),
        })
      )

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const { result } = renderHook(() => useInitiateConnection(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      await act(async () => {
        result.current.mutate({ demo: false })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
        expect(result.current.error).toBeDefined()
      })
    })
  })

  describe('Payment Application Signing Workflow', () => {
    it('should complete full payment application signing flow', async () => {
      const mockPayApp = {
        id: 'pay-app-123',
        number: 'PAY-001',
        name: 'Payment Application #1',
        project_id: mockProject.id,
        amount: 150000,
      }

      const mockSigners = [
        createMockDSRecipient({
          email: 'contractor@example.com',
          name: 'John Contractor',
          role: 'Contractor',
        }),
        createMockDSRecipient({
          email: 'owner@example.com',
          name: 'Jane Owner',
          role: 'Owner',
        }),
      ]

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      // Step 1: Create envelope for payment application
      const { result: createResult } = renderHook(
        () => useCreatePaymentApplicationEnvelope(),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      )

      let envelopeId: string | undefined

      await act(async () => {
        createResult.current.mutate(
          {
            payment_application_id: mockPayApp.id,
            signers: mockSigners.map((s) => ({
              email: s.email,
              name: s.name,
              role: s.role,
            })),
            subject: `Signature Request: ${mockPayApp.name}`,
            message: 'Please review and sign this payment application.',
          },
          {
            onSuccess: (data) => {
              envelopeId = data.envelope_id
            },
          }
        )
      })

      await waitFor(() => {
        expect(createResult.current.isSuccess).toBe(true)
        expect(envelopeId).toBeDefined()
      })

      // Step 2: Check envelope status (should be "sent")
      const { result: statusResult } = renderHook(
        () => useGetEnvelopeStatus(envelopeId!),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      )

      await waitFor(() => {
        expect(statusResult.current.data?.status).toBe('sent')
        expect(statusResult.current.data?.recipients).toHaveLength(2)
      })

      // Step 3: Simulate first signer completing signature
      const mockSignedEnvelope = createMockDSEnvelope({
        envelope_id: envelopeId!,
        status: 'partially_signed',
        recipients: [
          { ...mockSigners[0], status: 'completed' },
          { ...mockSigners[1], status: 'sent' },
        ],
      })

      server.use(
        createDelayedHandler('GET', `/api/docusign/envelopes/${envelopeId}`, {
          delay: 50,
          response: successResponse(mockSignedEnvelope),
        })
      )

      // Refetch status
      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: ['docusign', 'envelope', envelopeId],
        })
      })

      await waitFor(() => {
        expect(statusResult.current.data?.status).toBe('partially_signed')
        expect(
          statusResult.current.data?.recipients?.find(
            (r) => r.email === mockSigners[0].email
          )?.status
        ).toBe('completed')
      })

      // Step 4: Simulate final signer completing signature
      const mockCompletedEnvelope = createCompletedDSEnvelope({
        envelope_id: envelopeId!,
        recipients: mockSigners.map((s) => ({ ...s, status: 'completed' })),
      })

      server.use(
        createDelayedHandler('GET', `/api/docusign/envelopes/${envelopeId}`, {
          delay: 50,
          response: successResponse(mockCompletedEnvelope),
        })
      )

      // Refetch status
      await act(async () => {
        await queryClient.invalidateQueries({
          queryKey: ['docusign', 'envelope', envelopeId],
        })
      })

      await waitFor(() => {
        expect(statusResult.current.data?.status).toBe('completed')
        expect(statusResult.current.data?.completed_at).toBeDefined()
        expect(
          statusResult.current.data?.recipients?.every(
            (r) => r.status === 'completed'
          )
        ).toBe(true)
      })
    })

    it('should handle signer declining to sign', async () => {
      const mockPayApp = {
        id: 'pay-app-456',
        number: 'PAY-002',
      }

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const { result: createResult } = renderHook(
        () => useCreatePaymentApplicationEnvelope(),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      )

      let envelopeId: string | undefined

      await act(async () => {
        createResult.current.mutate(
          {
            payment_application_id: mockPayApp.id,
            signers: [
              {
                email: 'signer@example.com',
                name: 'Declining Signer',
                role: 'Reviewer',
              },
            ],
            subject: 'Test Payment App',
            message: 'Please sign',
          },
          {
            onSuccess: (data) => {
              envelopeId = data.envelope_id
            },
          }
        )
      })

      await waitFor(() => {
        expect(envelopeId).toBeDefined()
      })

      // Simulate signer declining
      const mockDeclinedEnvelope = createMockDSEnvelope({
        envelope_id: envelopeId!,
        status: 'declined',
        recipients: [
          createMockDSRecipient({
            email: 'signer@example.com',
            status: 'declined',
            decline_reason: 'Incorrect document version',
          }),
        ],
      })

      server.use(
        createDelayedHandler('GET', `/api/docusign/envelopes/${envelopeId}`, {
          delay: 50,
          response: successResponse(mockDeclinedEnvelope),
        })
      )

      const { result: statusResult } = renderHook(
        () => useGetEnvelopeStatus(envelopeId!),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      )

      await waitFor(() => {
        expect(statusResult.current.data?.status).toBe('declined')
        expect(
          statusResult.current.data?.recipients?.[0]?.decline_reason
        ).toBeDefined()
      })
    })
  })

  describe('Change Order Signing Workflow', () => {
    it('should create and track change order envelope', async () => {
      const mockChangeOrder = {
        id: 'co-789',
        number: 'CO-003',
        name: 'Change Order #3',
        amount: 25000,
      }

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const { result } = renderHook(
        () => useCreateChangeOrderEnvelope(),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      )

      let envelopeId: string | undefined

      await act(async () => {
        result.current.mutate(
          {
            change_order_id: mockChangeOrder.id,
            signers: [
              {
                email: 'architect@example.com',
                name: 'Alice Architect',
                role: 'Architect',
              },
            ],
            subject: `Change Order: ${mockChangeOrder.name}`,
            message: 'Please approve this change order.',
          },
          {
            onSuccess: (data) => {
              envelopeId = data.envelope_id
            },
          }
        )
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(envelopeId).toBeDefined()
      })
    })
  })

  describe('Lien Waiver Signing Workflow', () => {
    it('should create lien waiver envelope with proper configuration', async () => {
      const mockLienWaiver = {
        id: 'lw-101',
        type: 'conditional',
        amount: 100000,
      }

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const { result } = renderHook(() => useCreateLienWaiverEnvelope(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      let envelopeId: string | undefined

      await act(async () => {
        result.current.mutate(
          {
            lien_waiver_id: mockLienWaiver.id,
            signers: [
              {
                email: 'subcontractor@example.com',
                name: 'Bob Builder',
                role: 'Subcontractor',
                company: 'BuildCo LLC',
              },
            ],
            subject: 'Conditional Lien Waiver',
            message: 'Please sign to acknowledge receipt of payment.',
            require_notarization: false,
          },
          {
            onSuccess: (data) => {
              envelopeId = data.envelope_id
            },
          }
        )
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
        expect(envelopeId).toBeDefined()
      })
    })
  })

  describe('Envelope Management', () => {
    it('should void envelope successfully', async () => {
      const mockEnvelope = createPendingDSEnvelope()

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const { result } = renderHook(() => useVoidEnvelope(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      await act(async () => {
        result.current.mutate({
          envelope_id: mockEnvelope.envelope_id,
          void_reason: 'Document contains errors',
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should resend envelope to signer', async () => {
      const mockEnvelope = createPendingDSEnvelope()

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const { result } = renderHook(() => useResendEnvelope(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      await act(async () => {
        result.current.mutate({
          envelope_id: mockEnvelope.envelope_id,
        })
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should handle void errors for completed envelopes', async () => {
      const mockEnvelope = createCompletedDSEnvelope()

      server.use(
        createDelayedHandler(
          'POST',
          `/api/docusign/envelopes/${mockEnvelope.envelope_id}/void`,
          {
            delay: 50,
            response: errorResponse(
              'Cannot void a completed envelope',
              400
            ),
          }
        )
      )

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const { result } = renderHook(() => useVoidEnvelope(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      })

      await act(async () => {
        result.current.mutate({
          envelope_id: mockEnvelope.envelope_id,
          void_reason: 'Test void',
        })
      })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })
    })
  })

  describe('UI Integration - Request Dialog', () => {
    it('should render and submit signing request', async () => {
      const onOpenChange = vi.fn()
      const onSuccess = vi.fn()

      render(
        <DocuSignRequestDialog
          open={true}
          onOpenChange={onOpenChange}
          documentType="payment_application"
          documentId="pay-app-123"
          documentName="Payment Application #1"
          documentNumber="PAY-001"
          onSuccess={onSuccess}
        />
      )

      // Check dialog is visible
      expect(
        screen.getByText(/Send for Signature/i)
      ).toBeInTheDocument()

      // Add a signer
      const addSignerButton = screen.getByText(/Add Signer/i)
      fireEvent.click(addSignerButton)

      // Fill in signer details
      const emailInputs = screen.getAllByLabelText(/Email/i)
      const nameInputs = screen.getAllByLabelText(/Name/i)

      fireEvent.change(emailInputs[0], {
        target: { value: 'signer@example.com' },
      })
      fireEvent.change(nameInputs[0], {
        target: { value: 'Test Signer' },
      })

      // Submit
      const sendButton = screen.getByRole('button', { name: /Send/i })
      fireEvent.click(sendButton)

      // Verify submission
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('UI Integration - Dashboard', () => {
    it('should display envelope list and stats', async () => {
      render(<DocuSignDashboard />)

      // Check dashboard renders
      await waitFor(() => {
        expect(
          screen.getByText(/DocuSign Dashboard/i)
        ).toBeInTheDocument()
      })

      // Check stats are displayed
      expect(screen.getByText(/Total Envelopes/i)).toBeInTheDocument()
    })
  })

  describe('Error Recovery', () => {
    it('should retry failed envelope creation', async () => {
      let attemptCount = 0

      server.use(
        createDelayedHandler(
          'POST',
          '/api/docusign/envelopes/payment-application',
          {
            delay: 50,
            response: () => {
              attemptCount++
              if (attemptCount < 3) {
                return errorResponse('Temporary error', 500)
              }
              return successResponse(createPendingDSEnvelope())
            },
          }
        )
      )

      const queryClient = new QueryClient({
        defaultOptions: {
          mutations: {
            retry: 2,
            retryDelay: 100,
          },
        },
      })

      const { result } = renderHook(
        () => useCreatePaymentApplicationEnvelope(),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>
              {children}
            </QueryClientProvider>
          ),
        }
      )

      await act(async () => {
        result.current.mutate({
          payment_application_id: 'pay-123',
          signers: [
            {
              email: 'test@example.com',
              name: 'Test',
              role: 'Signer',
            },
          ],
          subject: 'Test',
          message: 'Test',
        })
      })

      await waitFor(
        () => {
          expect(result.current.isSuccess).toBe(true)
          expect(attemptCount).toBe(3)
        },
        { timeout: 5000 }
      )
    })
  })
})
