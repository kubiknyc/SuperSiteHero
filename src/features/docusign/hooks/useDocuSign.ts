/**
 * DocuSign React Query Hooks
 *
 * Hooks for managing DocuSign OAuth, envelopes, and document signing.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { docuSignApi } from '@/lib/api/services/docusign'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import type {
  DSEnvelope,
  DSEnvelopeStatus,
  DSDocumentType,
  InitiateDSConnectionDTO,
  CompleteDSConnectionDTO,
  CreateEnvelopeDTO,
  RequestSigningUrlDTO,
  VoidEnvelopeDTO,
  ResendEnvelopeDTO,
  PaymentApplicationSigningConfig,
  ChangeOrderSigningConfig,
  LienWaiverSigningConfig,
} from '@/types/docusign'

// ============================================================================
// Query Keys
// ============================================================================

export const docuSignKeys = {
  all: ['docusign'] as const,
  connection: (companyId: string) => [...docuSignKeys.all, 'connection', companyId] as const,
  connectionStatus: (companyId: string) => [...docuSignKeys.all, 'connection-status', companyId] as const,
  envelopes: (companyId: string) => [...docuSignKeys.all, 'envelopes', companyId] as const,
  envelope: (id: string) => [...docuSignKeys.all, 'envelope', id] as const,
  envelopeByDocument: (companyId: string, docType: string, docId: string) =>
    [...docuSignKeys.all, 'envelope-by-document', companyId, docType, docId] as const,
  stats: (companyId: string) => [...docuSignKeys.all, 'stats', companyId] as const,
  dashboard: (companyId: string) => [...docuSignKeys.all, 'dashboard', companyId] as const,
}

// ============================================================================
// Connection Hooks
// ============================================================================

/**
 * Get DocuSign connection status
 */
export function useDocuSignConnectionStatus() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: docuSignKeys.connectionStatus(companyId || ''),
    queryFn: () => docuSignApi.getConnectionStatus(companyId!),
    enabled: !!companyId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Initiate DocuSign OAuth connection
 */
export function useInitiateDocuSignConnection() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (dto: InitiateDSConnectionDTO) =>
      docuSignApi.initiateConnection(companyId!, dto),
    onSuccess: (data) => {
      // Redirect user to DocuSign OAuth page
      window.location.href = data.authorizationUrl
    },
    onError: (error: Error) => {
      toast.error(`Failed to connect DocuSign: ${error.message}`)
    },
  })
}

/**
 * Complete DocuSign OAuth connection
 */
export function useCompleteDocuSignConnection() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (dto: CompleteDSConnectionDTO) =>
      docuSignApi.completeConnection(companyId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docuSignKeys.connectionStatus(companyId!) })
      toast.success('DocuSign connected successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete DocuSign connection: ${error.message}`)
    },
  })
}

/**
 * Refresh DocuSign token
 */
export function useRefreshDocuSignToken() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (connectionId: string) => docuSignApi.refreshToken(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docuSignKeys.connectionStatus(companyId!) })
    },
    onError: (error: Error) => {
      toast.error(`Failed to refresh token: ${error.message}`)
    },
  })
}

/**
 * Disconnect DocuSign
 */
export function useDisconnectDocuSign() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (connectionId: string) => docuSignApi.disconnect(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docuSignKeys.connectionStatus(companyId!) })
      toast.success('DocuSign disconnected')
    },
    onError: (error: Error) => {
      toast.error(`Failed to disconnect DocuSign: ${error.message}`)
    },
  })
}

// ============================================================================
// Envelope Hooks
// ============================================================================

/**
 * Get envelopes with optional filters
 */
export function useDocuSignEnvelopes(filters?: {
  document_type?: DSDocumentType
  status?: DSEnvelopeStatus
  local_document_id?: string
  limit?: number
  offset?: number
}) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: [...docuSignKeys.envelopes(companyId || ''), filters],
    queryFn: () => docuSignApi.getEnvelopes(companyId!, filters),
    enabled: !!companyId,
    staleTime: 30000,
  })
}

/**
 * Get single envelope
 */
export function useDocuSignEnvelope(envelopeDbId: string | undefined) {
  return useQuery({
    queryKey: docuSignKeys.envelope(envelopeDbId || ''),
    queryFn: () => docuSignApi.getEnvelope(envelopeDbId!),
    enabled: !!envelopeDbId,
    staleTime: 30000,
  })
}

/**
 * Get envelope by local document
 */
export function useDocuSignEnvelopeByDocument(
  documentType: DSDocumentType | undefined,
  localDocumentId: string | undefined
) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: docuSignKeys.envelopeByDocument(
      companyId || '',
      documentType || '',
      localDocumentId || ''
    ),
    queryFn: () =>
      docuSignApi.getEnvelopeByDocument(companyId!, documentType!, localDocumentId!),
    enabled: !!companyId && !!documentType && !!localDocumentId,
    staleTime: 30000,
  })
}

/**
 * Create envelope
 */
export function useCreateDocuSignEnvelope() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (dto: CreateEnvelopeDTO) => docuSignApi.createEnvelope(companyId!, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: docuSignKeys.envelopes(companyId!) })
      queryClient.invalidateQueries({ queryKey: docuSignKeys.stats(companyId!) })
      toast.success('Envelope created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create envelope: ${error.message}`)
    },
  })
}

/**
 * Send envelope
 */
export function useSendDocuSignEnvelope() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (envelopeDbId: string) => docuSignApi.sendEnvelope(envelopeDbId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: docuSignKeys.envelope(data.id) })
      queryClient.invalidateQueries({ queryKey: docuSignKeys.envelopes(companyId!) })
      queryClient.invalidateQueries({ queryKey: docuSignKeys.stats(companyId!) })
      toast.success('Envelope sent for signing')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send envelope: ${error.message}`)
    },
  })
}

/**
 * Get signing URL
 */
export function useGetSigningUrl() {
  return useMutation({
    mutationFn: (dto: RequestSigningUrlDTO) => docuSignApi.getSigningUrl(dto),
    onError: (error: Error) => {
      toast.error(`Failed to get signing URL: ${error.message}`)
    },
  })
}

/**
 * Void envelope
 */
export function useVoidDocuSignEnvelope() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (dto: VoidEnvelopeDTO) => docuSignApi.voidEnvelope(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: docuSignKeys.envelopes(companyId!) })
      queryClient.invalidateQueries({ queryKey: docuSignKeys.stats(companyId!) })
      toast.success('Envelope voided')
    },
    onError: (error: Error) => {
      toast.error(`Failed to void envelope: ${error.message}`)
    },
  })
}

/**
 * Resend envelope
 */
export function useResendDocuSignEnvelope() {
  return useMutation({
    mutationFn: (dto: ResendEnvelopeDTO) => docuSignApi.resendEnvelope(dto),
    onSuccess: () => {
      toast.success('Envelope resent')
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend envelope: ${error.message}`)
    },
  })
}

// ============================================================================
// Construction Document Hooks
// ============================================================================

/**
 * Create payment application envelope
 */
export function useCreatePaymentApplicationEnvelope() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (config: PaymentApplicationSigningConfig) =>
      docuSignApi.createPaymentApplicationEnvelope(companyId!, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: docuSignKeys.envelopes(companyId!) })
      queryClient.invalidateQueries({ queryKey: docuSignKeys.stats(companyId!) })
      toast.success('Payment application sent for signature')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send payment application: ${error.message}`)
    },
  })
}

/**
 * Create change order envelope
 */
export function useCreateChangeOrderEnvelope() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (config: ChangeOrderSigningConfig) =>
      docuSignApi.createChangeOrderEnvelope(companyId!, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: docuSignKeys.envelopes(companyId!) })
      queryClient.invalidateQueries({ queryKey: docuSignKeys.stats(companyId!) })
      toast.success('Change order sent for signature')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send change order: ${error.message}`)
    },
  })
}

/**
 * Create lien waiver envelope
 */
export function useCreateLienWaiverEnvelope() {
  const { userProfile } = useAuth()
  const queryClient = useQueryClient()
  const companyId = userProfile?.company_id

  return useMutation({
    mutationFn: (config: LienWaiverSigningConfig) =>
      docuSignApi.createLienWaiverEnvelope(companyId!, config),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: docuSignKeys.envelopes(companyId!) })
      queryClient.invalidateQueries({ queryKey: docuSignKeys.stats(companyId!) })
      toast.success('Lien waiver sent for signature')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send lien waiver: ${error.message}`)
    },
  })
}

// ============================================================================
// Dashboard Hooks
// ============================================================================

/**
 * Get envelope statistics
 */
export function useDocuSignStats() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: docuSignKeys.stats(companyId || ''),
    queryFn: () => docuSignApi.getEnvelopeStats(companyId!),
    enabled: !!companyId,
    staleTime: 60000,
  })
}

/**
 * Get dashboard data
 */
export function useDocuSignDashboard() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: docuSignKeys.dashboard(companyId || ''),
    queryFn: () => docuSignApi.getDashboard(companyId!),
    enabled: !!companyId,
    staleTime: 60000,
  })
}

// ============================================================================
// Export All
// ============================================================================

export default {
  keys: docuSignKeys,

  // Connection
  useDocuSignConnectionStatus,
  useInitiateDocuSignConnection,
  useCompleteDocuSignConnection,
  useRefreshDocuSignToken,
  useDisconnectDocuSign,

  // Envelopes
  useDocuSignEnvelopes,
  useDocuSignEnvelope,
  useDocuSignEnvelopeByDocument,
  useCreateDocuSignEnvelope,
  useSendDocuSignEnvelope,
  useGetSigningUrl,
  useVoidDocuSignEnvelope,
  useResendDocuSignEnvelope,

  // Construction documents
  useCreatePaymentApplicationEnvelope,
  useCreateChangeOrderEnvelope,
  useCreateLienWaiverEnvelope,

  // Dashboard
  useDocuSignStats,
  useDocuSignDashboard,
}
