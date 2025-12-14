/**
 * DocuSign Hooks - Public API
 */

export {
  // Query keys
  docuSignKeys,

  // Connection hooks
  useDocuSignConnectionStatus,
  useInitiateDocuSignConnection,
  useCompleteDocuSignConnection,
  useRefreshDocuSignToken,
  useDisconnectDocuSign,

  // Envelope hooks
  useDocuSignEnvelopes,
  useDocuSignEnvelope,
  useDocuSignEnvelopeByDocument,
  useCreateDocuSignEnvelope,
  useSendDocuSignEnvelope,
  useGetSigningUrl,
  useVoidDocuSignEnvelope,
  useResendDocuSignEnvelope,

  // Construction document hooks
  useCreatePaymentApplicationEnvelope,
  useCreateChangeOrderEnvelope,
  useCreateLienWaiverEnvelope,

  // Dashboard hooks
  useDocuSignStats,
  useDocuSignDashboard,
} from './useDocuSign'

export { default } from './useDocuSign'
