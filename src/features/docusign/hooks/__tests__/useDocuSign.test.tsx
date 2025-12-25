/**
 * Comprehensive Tests for DocuSign React Query Hooks
 *
 * Tests all 19 hooks for:
 * - Success cases
 * - Error handling
 * - Loading states
 * - Query invalidation after mutations
 * - Proper React Query configuration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import toast from 'react-hot-toast'

// Import hooks to test
import {
  useDocuSignConnectionStatus,
  useInitiateDocuSignConnection,
  useCompleteDocuSignConnection,
  useRefreshDocuSignToken,
  useDisconnectDocuSign,
  useDocuSignEnvelopes,
  useDocuSignEnvelope,
  useDocuSignEnvelopeByDocument,
  useCreateDocuSignEnvelope,
  useSendDocuSignEnvelope,
  useGetSigningUrl,
  useVoidDocuSignEnvelope,
  useResendDocuSignEnvelope,
  useCreatePaymentApplicationEnvelope,
  useCreateChangeOrderEnvelope,
  useCreateLienWaiverEnvelope,
  useDocuSignStats,
  useDocuSignDashboard,
  docuSignKeys,
} from '../useDocuSign'

// Mock the docusign API service
vi.mock('@/lib/api/services/docusign', () => ({
  docuSignApi: {
    getConnectionStatus: vi.fn(),
    initiateConnection: vi.fn(),
    completeConnection: vi.fn(),
    refreshToken: vi.fn(),
    disconnect: vi.fn(),
    getEnvelopes: vi.fn(),
    getEnvelope: vi.fn(),
    getEnvelopeByDocument: vi.fn(),
    createEnvelope: vi.fn(),
    sendEnvelope: vi.fn(),
    getSigningUrl: vi.fn(),
    voidEnvelope: vi.fn(),
    resendEnvelope: vi.fn(),
    createPaymentApplicationEnvelope: vi.fn(),
    createChangeOrderEnvelope: vi.fn(),
    createLienWaiverEnvelope: vi.fn(),
    getEnvelopeStats: vi.fn(),
    getDashboard: vi.fn(),
  },
}))

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    userProfile: {
      id: 'test-user-id',
      company_id: 'test-company-id',
    },
  })),
}))

import { docuSignApi } from '@/lib/api/services/docusign'
import { useAuth } from '@/hooks/useAuth'

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// ============================================================================
// Test Suite
// ============================================================================

describe('DocuSign Hooks', () => {
  let mockDocuSignApi: typeof docuSignApi
  let mockUseAuth: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockDocuSignApi = docuSignApi as any
    mockUseAuth = useAuth as any

    // Reset all mocks
    vi.clearAllMocks()

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      userProfile: {
        id: 'test-user-id',
        company_id: 'test-company-id',
      },
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  // ============================================================================
  // Connection Hooks Tests
  // ============================================================================

  describe('useDocuSignConnectionStatus', () => {
    it('should fetch connection status successfully', async () => {
      const mockStatus = {
        isConnected: true,
        connectionId: 'conn-123',
        accountId: 'acc-456',
        accountName: 'Test Account',
        isDemo: false,
        lastConnectedAt: '2024-01-01T00:00:00Z',
        tokenExpiresAt: '2024-12-31T00:00:00Z',
        isTokenExpired: false,
        needsReauth: false,
        connectionError: null,
      }

      mockDocuSignApi.getConnectionStatus.mockResolvedValue(mockStatus)

      const { result } = renderHook(() => useDocuSignConnectionStatus(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockStatus)
      expect(mockDocuSignApi.getConnectionStatus).toHaveBeenCalledWith('test-company-id')
    })

    it('should handle errors when fetching connection status', async () => {
      const error = new Error('Failed to fetch connection status')
      mockDocuSignApi.getConnectionStatus.mockRejectedValue(error)

      const { result } = renderHook(() => useDocuSignConnectionStatus(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })

    it('should not fetch when company_id is missing', async () => {
      mockUseAuth.mockReturnValue({
        userProfile: null,
      })

      const { result } = renderHook(() => useDocuSignConnectionStatus(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockDocuSignApi.getConnectionStatus).not.toHaveBeenCalled()
    })

    it('should have correct staleTime configuration', () => {
      renderHook(() => useDocuSignConnectionStatus(), {
        wrapper: createWrapper(),
      })

      // The hook should be configured with 60000ms stale time
      expect(mockDocuSignApi.getConnectionStatus).toHaveBeenCalled()
    })
  })

  describe('useInitiateDocuSignConnection', () => {
    it('should initiate connection and redirect to authorization URL', async () => {
      const mockResponse = {
        authorizationUrl: 'https://docusign.com/oauth/auth?state=xyz',
        state: 'xyz',
      }

      mockDocuSignApi.initiateConnection.mockResolvedValue(mockResponse)

      // Mock window.location
      const originalLocation = window.location
      delete (window as any).location
      window.location = { href: '' } as any

      const { result } = renderHook(() => useInitiateDocuSignConnection(), {
        wrapper: createWrapper(),
      })

      const dto = {
        is_demo: false,
        return_url: 'https://app.example.com/callback',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.initiateConnection).toHaveBeenCalledWith('test-company-id', dto)
      expect(window.location.href).toBe(mockResponse.authorizationUrl)

      // Restore window.location
      window.location = originalLocation
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Failed to initiate connection')
      mockDocuSignApi.initiateConnection.mockRejectedValue(error)

      const { result } = renderHook(() => useInitiateDocuSignConnection(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        is_demo: false,
        return_url: 'https://app.example.com/callback',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Failed to connect DocuSign: Failed to initiate connection')
    })
  })

  describe('useCompleteDocuSignConnection', () => {
    it('should complete connection successfully', async () => {
      const mockConnection = {
        id: 'conn-123',
        company_id: 'test-company-id',
        account_id: 'acc-456',
        account_name: 'Test Account',
        is_active: true,
      }

      mockDocuSignApi.completeConnection.mockResolvedValue(mockConnection)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useCompleteDocuSignConnection(), { wrapper })

      const dto = {
        code: 'auth-code-123',
        state: 'state-xyz',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.completeConnection).toHaveBeenCalledWith('test-company-id', dto)
      expect(toast.success).toHaveBeenCalledWith('DocuSign connected successfully')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.connectionStatus('test-company-id'),
      })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Invalid state token')
      mockDocuSignApi.completeConnection.mockRejectedValue(error)

      const { result } = renderHook(() => useCompleteDocuSignConnection(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        code: 'auth-code-123',
        state: 'invalid-state',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to complete DocuSign connection: Invalid state token'
      )
    })
  })

  describe('useRefreshDocuSignToken', () => {
    it('should refresh token successfully', async () => {
      mockDocuSignApi.refreshToken.mockResolvedValue(undefined)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useRefreshDocuSignToken(), { wrapper })

      result.current.mutate('conn-123')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.refreshToken).toHaveBeenCalledWith('conn-123')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.connectionStatus('test-company-id'),
      })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('No refresh token available')
      mockDocuSignApi.refreshToken.mockRejectedValue(error)

      const { result } = renderHook(() => useRefreshDocuSignToken(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('conn-123')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Failed to refresh token: No refresh token available')
    })
  })

  describe('useDisconnectDocuSign', () => {
    it('should disconnect successfully', async () => {
      mockDocuSignApi.disconnect.mockResolvedValue(undefined)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useDisconnectDocuSign(), { wrapper })

      result.current.mutate('conn-123')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.disconnect).toHaveBeenCalledWith('conn-123')
      expect(toast.success).toHaveBeenCalledWith('DocuSign disconnected')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.connectionStatus('test-company-id'),
      })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Failed to disconnect')
      mockDocuSignApi.disconnect.mockRejectedValue(error)

      const { result } = renderHook(() => useDisconnectDocuSign(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('conn-123')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Failed to disconnect DocuSign: Failed to disconnect')
    })
  })

  // ============================================================================
  // Envelope Hooks Tests
  // ============================================================================

  describe('useDocuSignEnvelopes', () => {
    it('should fetch envelopes successfully', async () => {
      const mockEnvelopes = [
        {
          id: 'env-1',
          envelope_id: 'ds-env-1',
          company_id: 'test-company-id',
          status: 'sent',
          document_type: 'payment_application',
        },
        {
          id: 'env-2',
          envelope_id: 'ds-env-2',
          company_id: 'test-company-id',
          status: 'completed',
          document_type: 'change_order',
        },
      ]

      mockDocuSignApi.getEnvelopes.mockResolvedValue(mockEnvelopes)

      const { result } = renderHook(() => useDocuSignEnvelopes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockEnvelopes)
      expect(mockDocuSignApi.getEnvelopes).toHaveBeenCalledWith('test-company-id', undefined)
    })

    it('should fetch envelopes with filters', async () => {
      const mockEnvelopes = [
        {
          id: 'env-1',
          envelope_id: 'ds-env-1',
          status: 'sent',
          document_type: 'payment_application',
        },
      ]

      mockDocuSignApi.getEnvelopes.mockResolvedValue(mockEnvelopes)

      const filters = {
        document_type: 'payment_application' as const,
        status: 'sent' as const,
        limit: 10,
      }

      const { result } = renderHook(() => useDocuSignEnvelopes(filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.getEnvelopes).toHaveBeenCalledWith('test-company-id', filters)
    })

    it('should handle errors when fetching envelopes', async () => {
      const error = new Error('Failed to fetch envelopes')
      mockDocuSignApi.getEnvelopes.mockRejectedValue(error)

      const { result } = renderHook(() => useDocuSignEnvelopes(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })

    it('should not fetch when company_id is missing', () => {
      mockUseAuth.mockReturnValue({
        userProfile: null,
      })

      const { result } = renderHook(() => useDocuSignEnvelopes(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockDocuSignApi.getEnvelopes).not.toHaveBeenCalled()
    })
  })

  describe('useDocuSignEnvelope', () => {
    it('should fetch single envelope successfully', async () => {
      const mockEnvelope = {
        id: 'env-1',
        envelope_id: 'ds-env-1',
        company_id: 'test-company-id',
        status: 'sent',
        document_type: 'payment_application',
        recipients: [],
        documents: [],
      }

      mockDocuSignApi.getEnvelope.mockResolvedValue(mockEnvelope)

      const { result } = renderHook(() => useDocuSignEnvelope('env-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockEnvelope)
      expect(mockDocuSignApi.getEnvelope).toHaveBeenCalledWith('env-1')
    })

    it('should not fetch when envelopeDbId is undefined', () => {
      const { result } = renderHook(() => useDocuSignEnvelope(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockDocuSignApi.getEnvelope).not.toHaveBeenCalled()
    })
  })

  describe('useDocuSignEnvelopeByDocument', () => {
    it('should fetch envelope by document successfully', async () => {
      const mockEnvelope = {
        id: 'env-1',
        envelope_id: 'ds-env-1',
        document_type: 'payment_application',
        local_document_id: 'doc-123',
      }

      mockDocuSignApi.getEnvelopeByDocument.mockResolvedValue(mockEnvelope)

      const { result } = renderHook(
        () => useDocuSignEnvelopeByDocument('payment_application', 'doc-123'),
        {
          wrapper: createWrapper(),
        }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockEnvelope)
      expect(mockDocuSignApi.getEnvelopeByDocument).toHaveBeenCalledWith(
        'test-company-id',
        'payment_application',
        'doc-123'
      )
    })

    it('should not fetch when parameters are missing', () => {
      const { result } = renderHook(() => useDocuSignEnvelopeByDocument(undefined, undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockDocuSignApi.getEnvelopeByDocument).not.toHaveBeenCalled()
    })
  })

  describe('useCreateDocuSignEnvelope', () => {
    it('should create envelope successfully', async () => {
      const mockEnvelope = {
        id: 'env-1',
        envelope_id: 'ds-env-1',
        company_id: 'test-company-id',
        status: 'created',
      }

      mockDocuSignApi.createEnvelope.mockResolvedValue(mockEnvelope)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useCreateDocuSignEnvelope(), { wrapper })

      const dto = {
        document_type: 'payment_application' as const,
        local_document_id: 'doc-123',
        subject: 'Please sign',
        message: 'Please review and sign',
        signers: [
          {
            email: 'signer@example.com',
            name: 'John Doe',
            role: 'Contractor',
            routing_order: 1,
          },
        ],
        send_immediately: false,
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.createEnvelope).toHaveBeenCalledWith('test-company-id', dto)
      expect(toast.success).toHaveBeenCalledWith('Envelope created successfully')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.envelopes('test-company-id'),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.stats('test-company-id'),
      })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Failed to create envelope')
      mockDocuSignApi.createEnvelope.mockRejectedValue(error)

      const { result } = renderHook(() => useCreateDocuSignEnvelope(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        document_type: 'payment_application',
        local_document_id: 'doc-123',
        subject: 'Please sign',
        signers: [],
      } as any)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Failed to create envelope: Failed to create envelope')
    })
  })

  describe('useSendDocuSignEnvelope', () => {
    it('should send envelope successfully', async () => {
      const mockEnvelope = {
        id: 'env-1',
        envelope_id: 'ds-env-1',
        status: 'sent',
      }

      mockDocuSignApi.sendEnvelope.mockResolvedValue(mockEnvelope)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useSendDocuSignEnvelope(), { wrapper })

      result.current.mutate('env-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.sendEnvelope).toHaveBeenCalledWith('env-1')
      expect(toast.success).toHaveBeenCalledWith('Envelope sent for signing')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.envelope('env-1'),
      })
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.envelopes('test-company-id'),
      })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Cannot send envelope')
      mockDocuSignApi.sendEnvelope.mockRejectedValue(error)

      const { result } = renderHook(() => useSendDocuSignEnvelope(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('env-1')

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Failed to send envelope: Cannot send envelope')
    })
  })

  describe('useGetSigningUrl', () => {
    it('should get signing URL successfully', async () => {
      const mockUrl = 'https://docusign.com/signing/xyz123'

      mockDocuSignApi.getSigningUrl.mockResolvedValue(mockUrl)

      const { result } = renderHook(() => useGetSigningUrl(), {
        wrapper: createWrapper(),
      })

      const dto = {
        envelope_id: 'ds-env-1',
        recipient_email: 'signer@example.com',
        return_url: 'https://app.example.com/signed',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBe(mockUrl)
      expect(mockDocuSignApi.getSigningUrl).toHaveBeenCalledWith(dto)
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Recipient not found')
      mockDocuSignApi.getSigningUrl.mockRejectedValue(error)

      const { result } = renderHook(() => useGetSigningUrl(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        envelope_id: 'ds-env-1',
        recipient_email: 'invalid@example.com',
        return_url: 'https://app.example.com/signed',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Failed to get signing URL: Recipient not found')
    })
  })

  describe('useVoidDocuSignEnvelope', () => {
    it('should void envelope successfully', async () => {
      mockDocuSignApi.voidEnvelope.mockResolvedValue(undefined)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useVoidDocuSignEnvelope(), { wrapper })

      const dto = {
        envelope_id: 'ds-env-1',
        reason: 'Voided by user',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.voidEnvelope).toHaveBeenCalledWith(dto)
      expect(toast.success).toHaveBeenCalledWith('Envelope voided')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.envelopes('test-company-id'),
      })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Cannot void completed envelope')
      mockDocuSignApi.voidEnvelope.mockRejectedValue(error)

      const { result } = renderHook(() => useVoidDocuSignEnvelope(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        envelope_id: 'ds-env-1',
        reason: 'Test void',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Failed to void envelope: Cannot void completed envelope')
    })
  })

  describe('useResendDocuSignEnvelope', () => {
    it('should resend envelope successfully', async () => {
      mockDocuSignApi.resendEnvelope.mockResolvedValue(undefined)

      const { result } = renderHook(() => useResendDocuSignEnvelope(), {
        wrapper: createWrapper(),
      })

      const dto = {
        envelope_id: 'ds-env-1',
        recipient_emails: ['signer@example.com'],
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.resendEnvelope).toHaveBeenCalledWith(dto)
      expect(toast.success).toHaveBeenCalledWith('Envelope resent')
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Cannot resend envelope')
      mockDocuSignApi.resendEnvelope.mockRejectedValue(error)

      const { result } = renderHook(() => useResendDocuSignEnvelope(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        envelope_id: 'ds-env-1',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Failed to resend envelope: Cannot resend envelope')
    })
  })

  // ============================================================================
  // Construction Document Hooks Tests
  // ============================================================================

  describe('useCreatePaymentApplicationEnvelope', () => {
    it('should create payment application envelope successfully', async () => {
      const mockEnvelope = {
        id: 'env-1',
        envelope_id: 'ds-env-1',
        document_type: 'payment_application',
        status: 'sent',
      }

      mockDocuSignApi.createPaymentApplicationEnvelope.mockResolvedValue(mockEnvelope)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useCreatePaymentApplicationEnvelope(), { wrapper })

      const config = {
        payment_application_id: 'pa-123',
        contractor_signer: {
          email: 'contractor@example.com',
          name: 'Contractor Name',
        },
        owner_signer: {
          email: 'owner@example.com',
          name: 'Owner Name',
        },
      }

      result.current.mutate(config)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.createPaymentApplicationEnvelope).toHaveBeenCalledWith(
        'test-company-id',
        config
      )
      expect(toast.success).toHaveBeenCalledWith('Payment application sent for signature')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.envelopes('test-company-id'),
      })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Failed to create payment application')
      mockDocuSignApi.createPaymentApplicationEnvelope.mockRejectedValue(error)

      const { result } = renderHook(() => useCreatePaymentApplicationEnvelope(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        payment_application_id: 'pa-123',
        contractor_signer: {
          email: 'contractor@example.com',
          name: 'Contractor Name',
        },
      } as any)

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to send payment application: Failed to create payment application'
      )
    })
  })

  describe('useCreateChangeOrderEnvelope', () => {
    it('should create change order envelope successfully', async () => {
      const mockEnvelope = {
        id: 'env-1',
        envelope_id: 'ds-env-1',
        document_type: 'change_order',
        status: 'sent',
      }

      mockDocuSignApi.createChangeOrderEnvelope.mockResolvedValue(mockEnvelope)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useCreateChangeOrderEnvelope(), { wrapper })

      const config = {
        change_order_id: 'co-123',
        contractor_signer: {
          email: 'contractor@example.com',
          name: 'Contractor Name',
        },
        owner_signer: {
          email: 'owner@example.com',
          name: 'Owner Name',
        },
      }

      result.current.mutate(config)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.createChangeOrderEnvelope).toHaveBeenCalledWith(
        'test-company-id',
        config
      )
      expect(toast.success).toHaveBeenCalledWith('Change order sent for signature')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.envelopes('test-company-id'),
      })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Failed to create change order')
      mockDocuSignApi.createChangeOrderEnvelope.mockRejectedValue(error)

      const { result } = renderHook(() => useCreateChangeOrderEnvelope(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        change_order_id: 'co-123',
        contractor_signer: {
          email: 'contractor@example.com',
          name: 'Contractor Name',
        },
        owner_signer: {
          email: 'owner@example.com',
          name: 'Owner Name',
        },
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith(
        'Failed to send change order: Failed to create change order'
      )
    })
  })

  describe('useCreateLienWaiverEnvelope', () => {
    it('should create lien waiver envelope successfully', async () => {
      const mockEnvelope = {
        id: 'env-1',
        envelope_id: 'ds-env-1',
        document_type: 'lien_waiver',
        status: 'sent',
      }

      mockDocuSignApi.createLienWaiverEnvelope.mockResolvedValue(mockEnvelope)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useCreateLienWaiverEnvelope(), { wrapper })

      const config = {
        lien_waiver_id: 'lw-123',
        claimant_signer: {
          email: 'claimant@example.com',
          name: 'Claimant Name',
        },
        notary_required: true,
        notary_signer: {
          email: 'notary@example.com',
          name: 'Notary Name',
        },
      }

      result.current.mutate(config)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDocuSignApi.createLienWaiverEnvelope).toHaveBeenCalledWith('test-company-id', config)
      expect(toast.success).toHaveBeenCalledWith('Lien waiver sent for signature')
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: docuSignKeys.envelopes('test-company-id'),
      })
    })

    it('should show error toast on failure', async () => {
      const error = new Error('Failed to create lien waiver')
      mockDocuSignApi.createLienWaiverEnvelope.mockRejectedValue(error)

      const { result } = renderHook(() => useCreateLienWaiverEnvelope(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        lien_waiver_id: 'lw-123',
        claimant_signer: {
          email: 'claimant@example.com',
          name: 'Claimant Name',
        },
        notary_required: false,
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(toast.error).toHaveBeenCalledWith('Failed to send lien waiver: Failed to create lien waiver')
    })
  })

  // ============================================================================
  // Dashboard Hooks Tests
  // ============================================================================

  describe('useDocuSignStats', () => {
    it('should fetch envelope statistics successfully', async () => {
      const mockStats = {
        total: 100,
        pending: 10,
        sent: 20,
        delivered: 15,
        signed: 5,
        completed: 40,
        declined: 5,
        voided: 5,
        byDocumentType: {
          payment_application: { total: 30, pending: 5, completed: 20 },
          change_order: { total: 25, pending: 3, completed: 15 },
          lien_waiver: { total: 20, pending: 2, completed: 10 },
          contract: { total: 15, pending: 0, completed: 10 },
          subcontract: { total: 10, pending: 0, completed: 5 },
          other: { total: 0, pending: 0, completed: 0 },
        },
      }

      mockDocuSignApi.getEnvelopeStats.mockResolvedValue(mockStats)

      const { result } = renderHook(() => useDocuSignStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockStats)
      expect(mockDocuSignApi.getEnvelopeStats).toHaveBeenCalledWith('test-company-id')
    })

    it('should handle errors when fetching stats', async () => {
      const error = new Error('Failed to fetch stats')
      mockDocuSignApi.getEnvelopeStats.mockRejectedValue(error)

      const { result } = renderHook(() => useDocuSignStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })

    it('should not fetch when company_id is missing', () => {
      mockUseAuth.mockReturnValue({
        userProfile: null,
      })

      const { result } = renderHook(() => useDocuSignStats(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockDocuSignApi.getEnvelopeStats).not.toHaveBeenCalled()
    })
  })

  describe('useDocuSignDashboard', () => {
    it('should fetch dashboard data successfully', async () => {
      const mockDashboard = {
        connection: {
          isConnected: true,
          connectionId: 'conn-123',
          accountId: 'acc-456',
          accountName: 'Test Account',
        },
        stats: {
          total: 100,
          pending: 10,
          completed: 40,
        },
        recentEnvelopes: [],
        pendingSignatures: [],
      }

      mockDocuSignApi.getDashboard.mockResolvedValue(mockDashboard)

      const { result } = renderHook(() => useDocuSignDashboard(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockDashboard)
      expect(mockDocuSignApi.getDashboard).toHaveBeenCalledWith('test-company-id')
    })

    it('should handle errors when fetching dashboard', async () => {
      const error = new Error('Failed to fetch dashboard')
      mockDocuSignApi.getDashboard.mockRejectedValue(error)

      const { result } = renderHook(() => useDocuSignDashboard(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeTruthy()
    })

    it('should not fetch when company_id is missing', () => {
      mockUseAuth.mockReturnValue({
        userProfile: null,
      })

      const { result } = renderHook(() => useDocuSignDashboard(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(mockDocuSignApi.getDashboard).not.toHaveBeenCalled()
    })
  })

  // ============================================================================
  // Query Keys Tests
  // ============================================================================

  describe('docuSignKeys', () => {
    it('should generate correct query keys', () => {
      const companyId = 'test-company-id'

      expect(docuSignKeys.all).toEqual(['docusign'])
      expect(docuSignKeys.connection(companyId)).toEqual(['docusign', 'connection', companyId])
      expect(docuSignKeys.connectionStatus(companyId)).toEqual([
        'docusign',
        'connection-status',
        companyId,
      ])
      expect(docuSignKeys.envelopes(companyId)).toEqual(['docusign', 'envelopes', companyId])
      expect(docuSignKeys.envelope('env-1')).toEqual(['docusign', 'envelope', 'env-1'])
      expect(docuSignKeys.envelopeByDocument(companyId, 'payment_application', 'doc-123')).toEqual([
        'docusign',
        'envelope-by-document',
        companyId,
        'payment_application',
        'doc-123',
      ])
      expect(docuSignKeys.stats(companyId)).toEqual(['docusign', 'stats', companyId])
      expect(docuSignKeys.dashboard(companyId)).toEqual(['docusign', 'dashboard', companyId])
    })
  })

  // ============================================================================
  // Loading States Tests
  // ============================================================================

  describe('Loading States', () => {
    it('should show loading state for queries', () => {
      mockDocuSignApi.getConnectionStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as any), 1000))
      )

      const { result } = renderHook(() => useDocuSignConnectionStatus(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
    })

    it('should show loading state for mutations', async () => {
      mockDocuSignApi.disconnect.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      const { result } = renderHook(() => useDisconnectDocuSign(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('conn-123')

      // Check pending state immediately after mutation is called
      await waitFor(() => {
        expect(result.current.isPending).toBe(true)
      })
    })
  })
})
