/**
 * DocuSign E-Signature Integration Types
 *
 * Types for OAuth, envelope operations, and document signing workflows.
 * Supports construction document signing: payment applications, change orders, lien waivers.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type DSEnvelopeStatus =
  | 'created'
  | 'sent'
  | 'delivered'
  | 'signed'
  | 'completed'
  | 'declined'
  | 'voided'
  | 'deleted'

export type DSRecipientStatus =
  | 'created'
  | 'sent'
  | 'delivered'
  | 'signed'
  | 'completed'
  | 'declined'
  | 'autoresponded'

export type DSRecipientType =
  | 'signer'
  | 'cc'
  | 'certifiedDelivery'
  | 'inPersonSigner'
  | 'notary'
  | 'witness'

export type DSSignatureType =
  | 'electronic'
  | 'advanced'
  | 'digital'

export type DSDocumentType =
  | 'payment_application'
  | 'change_order'
  | 'lien_waiver'
  | 'contract'
  | 'subcontract'
  | 'other'

export const DS_ENVELOPE_STATUSES: { value: DSEnvelopeStatus; label: string; color: string }[] = [
  { value: 'created', label: 'Created', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'delivered', label: 'Delivered', color: 'yellow' },
  { value: 'signed', label: 'Signed', color: 'green' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'declined', label: 'Declined', color: 'red' },
  { value: 'voided', label: 'Voided', color: 'gray' },
  { value: 'deleted', label: 'Deleted', color: 'gray' },
]

export const DS_DOCUMENT_TYPES: { value: DSDocumentType; label: string; localTable: string }[] = [
  { value: 'payment_application', label: 'Payment Application', localTable: 'payment_applications' },
  { value: 'change_order', label: 'Change Order', localTable: 'change_orders' },
  { value: 'lien_waiver', label: 'Lien Waiver', localTable: 'lien_waivers' },
  { value: 'contract', label: 'Contract', localTable: 'contracts' },
  { value: 'subcontract', label: 'Subcontract', localTable: 'subcontracts' },
  { value: 'other', label: 'Other', localTable: 'documents' },
]

// ============================================================================
// Core Database Types
// ============================================================================

/**
 * DocuSign connection/integration record
 */
export interface DSConnection {
  id: string
  company_id: string
  account_id: string
  account_name: string | null
  base_uri: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  is_demo: boolean
  is_active: boolean
  last_connected_at: string | null
  connection_error: string | null
  webhook_uri: string | null
  webhook_secret: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * DocuSign envelope record (signature request)
 */
export interface DSEnvelope {
  id: string
  company_id: string
  connection_id: string
  envelope_id: string
  document_type: DSDocumentType
  local_document_id: string
  local_document_number: string | null
  status: DSEnvelopeStatus
  subject: string | null
  message: string | null
  sent_at: string | null
  completed_at: string | null
  voided_at: string | null
  void_reason: string | null
  expires_at: string | null
  signing_order_enabled: boolean
  reminder_enabled: boolean
  reminder_delay_days: number | null
  reminder_frequency_days: number | null
  created_at: string
  updated_at: string
  created_by: string | null
  // Joined data
  recipients?: DSEnvelopeRecipient[]
  documents?: DSEnvelopeDocument[]
}

/**
 * Recipient on an envelope
 */
export interface DSEnvelopeRecipient {
  id: string
  envelope_db_id: string
  recipient_id: string
  recipient_type: DSRecipientType
  email: string
  name: string
  role_name: string | null
  routing_order: number
  status: DSRecipientStatus
  signed_at: string | null
  declined_at: string | null
  decline_reason: string | null
  delivered_at: string | null
  client_user_id: string | null
  user_id: string | null
  authentication_method: string | null
  created_at: string
  updated_at: string
}

/**
 * Document within an envelope
 */
export interface DSEnvelopeDocument {
  id: string
  envelope_db_id: string
  document_id: string
  name: string
  file_extension: string | null
  uri: string | null
  order: number
  pages: number | null
  created_at: string
}

/**
 * Signature/tab placement on a document
 */
export interface DSSignatureTab {
  id: string
  envelope_db_id: string
  document_id: string
  recipient_id: string
  tab_type: 'signHere' | 'initialHere' | 'dateSigned' | 'text' | 'checkbox' | 'company' | 'title'
  tab_label: string | null
  page_number: number
  x_position: number
  y_position: number
  width: number | null
  height: number | null
  required: boolean
  locked: boolean
  value: string | null
}

/**
 * Audit log for envelope events
 */
export interface DSEnvelopeEvent {
  id: string
  envelope_db_id: string
  event_type: string
  event_time: string
  recipient_email: string | null
  recipient_name: string | null
  ip_address: string | null
  user_agent: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// ============================================================================
// DocuSign API Response Types
// ============================================================================

/**
 * OAuth token response from DocuSign
 */
export interface DSOAuthTokens {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_in: number
  scope: string
}

/**
 * User info from DocuSign
 */
export interface DSUserInfo {
  sub: string
  name: string
  given_name: string
  family_name: string
  email: string
  accounts: DSAccountInfo[]
}

/**
 * Account info from DocuSign
 */
export interface DSAccountInfo {
  account_id: string
  account_name: string
  base_uri: string
  is_default: boolean
}

/**
 * Envelope definition for creating signature request
 */
export interface DSEnvelopeDefinition {
  emailSubject: string
  emailBlurb?: string
  status: 'created' | 'sent'
  documents: DSDocumentDefinition[]
  recipients: DSRecipientDefinition
  notification?: DSNotificationDefinition
  eventNotification?: DSEventNotificationDefinition
}

/**
 * Document definition for envelope
 */
export interface DSDocumentDefinition {
  documentId: string
  name: string
  fileExtension?: string
  documentBase64?: string
  uri?: string
  order?: number
}

/**
 * Recipient definitions for envelope
 */
export interface DSRecipientDefinition {
  signers?: DSSigner[]
  carbonCopies?: DSCarbonCopy[]
  certifiedDeliveries?: DSCertifiedDelivery[]
  inPersonSigners?: DSInPersonSigner[]
}

/**
 * Signer definition
 */
export interface DSSigner {
  recipientId: string
  email: string
  name: string
  routingOrder: string
  roleName?: string
  clientUserId?: string
  tabs?: DSTabsDefinition
}

/**
 * Carbon copy recipient (receives copy but doesn't sign)
 */
export interface DSCarbonCopy {
  recipientId: string
  email: string
  name: string
  routingOrder: string
  roleName?: string
}

/**
 * Certified delivery recipient
 */
export interface DSCertifiedDelivery {
  recipientId: string
  email: string
  name: string
  routingOrder: string
}

/**
 * In-person signer definition
 */
export interface DSInPersonSigner {
  recipientId: string
  hostEmail: string
  hostName: string
  signerEmail?: string
  signerName: string
  routingOrder: string
  clientUserId?: string
  tabs?: DSTabsDefinition
}

/**
 * Tab definitions (signature placements)
 */
export interface DSTabsDefinition {
  signHereTabs?: DSSignHereTab[]
  initialHereTabs?: DSInitialHereTab[]
  dateSignedTabs?: DSDateSignedTab[]
  textTabs?: DSTextTab[]
  checkboxTabs?: DSCheckboxTab[]
  companyTabs?: DSCompanyTab[]
  titleTabs?: DSTitleTab[]
}

/**
 * Sign here tab
 */
export interface DSSignHereTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel?: string
  scaleValue?: string
}

/**
 * Initial here tab
 */
export interface DSInitialHereTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel?: string
  scaleValue?: string
}

/**
 * Date signed tab
 */
export interface DSDateSignedTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel?: string
}

/**
 * Text input tab
 */
export interface DSTextTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel?: string
  value?: string
  locked?: string
  required?: string
  width?: string
  height?: string
}

/**
 * Checkbox tab
 */
export interface DSCheckboxTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel?: string
  selected?: string
}

/**
 * Company name tab
 */
export interface DSCompanyTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel?: string
}

/**
 * Title tab
 */
export interface DSTitleTab {
  documentId: string
  pageNumber: string
  xPosition: string
  yPosition: string
  tabLabel?: string
}

/**
 * Notification settings
 */
export interface DSNotificationDefinition {
  useAccountDefaults?: string
  reminders?: {
    reminderEnabled: string
    reminderDelay: string
    reminderFrequency: string
  }
  expirations?: {
    expireEnabled: string
    expireAfter: string
    expireWarn: string
  }
}

/**
 * Event notification (webhook) settings
 */
export interface DSEventNotificationDefinition {
  url: string
  loggingEnabled?: string
  requireAcknowledgment?: string
  envelopeEvents?: { envelopeEventStatusCode: string }[]
  recipientEvents?: { recipientEventStatusCode: string }[]
}

/**
 * Envelope summary from API
 */
export interface DSEnvelopeSummary {
  envelopeId: string
  status: string
  statusDateTime: string
  uri: string
}

/**
 * Recipient view URL (embedded signing)
 */
export interface DSRecipientViewUrl {
  url: string
}

// ============================================================================
// DTO Types (Input/Output)
// ============================================================================

/**
 * Initiate OAuth connection
 */
export interface InitiateDSConnectionDTO {
  is_demo?: boolean
  return_url?: string
}

/**
 * Complete OAuth callback
 */
export interface CompleteDSConnectionDTO {
  code: string
  state: string
}

/**
 * Create envelope for document signing
 */
export interface CreateEnvelopeDTO {
  document_type: DSDocumentType
  local_document_id: string
  subject?: string
  message?: string
  signers: CreateEnvelopeSignerDTO[]
  carbon_copies?: CreateEnvelopeCCDTO[]
  send_immediately?: boolean
  signing_order_enabled?: boolean
  reminder_enabled?: boolean
  reminder_delay_days?: number
  reminder_frequency_days?: number
  expires_in_days?: number
}

/**
 * Signer for envelope creation
 */
export interface CreateEnvelopeSignerDTO {
  email: string
  name: string
  role: string
  routing_order?: number
  tabs?: {
    sign_here?: { page: number; x: number; y: number }[]
    initial_here?: { page: number; x: number; y: number }[]
    date_signed?: { page: number; x: number; y: number }[]
    text?: { page: number; x: number; y: number; label: string; value?: string }[]
  }
}

/**
 * Carbon copy recipient for envelope creation
 */
export interface CreateEnvelopeCCDTO {
  email: string
  name: string
  routing_order?: number
}

/**
 * Request embedded signing URL
 */
export interface RequestSigningUrlDTO {
  envelope_id: string
  recipient_email: string
  return_url: string
  authentication_method?: 'none' | 'email' | 'phone' | 'knowledge' | 'id_check'
}

/**
 * Void envelope request
 */
export interface VoidEnvelopeDTO {
  envelope_id: string
  reason: string
}

/**
 * Resend envelope request
 */
export interface ResendEnvelopeDTO {
  envelope_id: string
  recipient_emails?: string[]
}

// ============================================================================
// Dashboard/Stats Types
// ============================================================================

/**
 * Connection status for display
 */
export interface DSConnectionStatus {
  isConnected: boolean
  connectionId: string | null
  accountId: string | null
  accountName: string | null
  isDemo: boolean
  lastConnectedAt: string | null
  tokenExpiresAt: string | null
  isTokenExpired: boolean
  needsReauth: boolean
  connectionError: string | null
}

/**
 * Envelope statistics
 */
export interface DSEnvelopeStats {
  total: number
  pending: number
  sent: number
  delivered: number
  signed: number
  completed: number
  declined: number
  voided: number
  byDocumentType: Record<DSDocumentType, {
    total: number
    pending: number
    completed: number
  }>
}

/**
 * Dashboard data
 */
export interface DSDashboard {
  connection: DSConnectionStatus
  stats: DSEnvelopeStats
  recentEnvelopes: DSEnvelope[]
  pendingSignatures: DSEnvelope[]
}

// ============================================================================
// Construction Document Signing Helpers
// ============================================================================

/**
 * Payment application signing configuration
 */
export interface PaymentApplicationSigningConfig {
  payment_application_id: string
  contractor_signer: {
    email: string
    name: string
    title?: string
  }
  architect_signer?: {
    email: string
    name: string
    title?: string
  }
  owner_signer?: {
    email: string
    name: string
    title?: string
  }
  cc_recipients?: {
    email: string
    name: string
  }[]
}

/**
 * Change order signing configuration
 */
export interface ChangeOrderSigningConfig {
  change_order_id: string
  contractor_signer: {
    email: string
    name: string
    title?: string
  }
  owner_signer: {
    email: string
    name: string
    title?: string
  }
  cc_recipients?: {
    email: string
    name: string
  }[]
}

/**
 * Lien waiver signing configuration
 */
export interface LienWaiverSigningConfig {
  lien_waiver_id: string
  claimant_signer: {
    email: string
    name: string
    title?: string
    company?: string
  }
  notary_required?: boolean
  notary_signer?: {
    email: string
    name: string
  }
  cc_recipients?: {
    email: string
    name: string
  }[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get envelope status config
 */
export function getEnvelopeStatusConfig(status: DSEnvelopeStatus) {
  return DS_ENVELOPE_STATUSES.find(s => s.value === status) || DS_ENVELOPE_STATUSES[0]
}

/**
 * Get document type config
 */
export function getDocumentTypeConfig(type: DSDocumentType) {
  return DS_DOCUMENT_TYPES.find(t => t.value === type) || DS_DOCUMENT_TYPES[5]
}

/**
 * Check if envelope is in terminal state
 */
export function isEnvelopeTerminal(status: DSEnvelopeStatus): boolean {
  return ['completed', 'declined', 'voided', 'deleted'].includes(status)
}

/**
 * Check if envelope can be voided
 */
export function canVoidEnvelope(status: DSEnvelopeStatus): boolean {
  return ['created', 'sent', 'delivered'].includes(status)
}

/**
 * Check if connection needs refresh
 */
export function connectionNeedsRefresh(connection: DSConnection): boolean {
  if (!connection.token_expires_at) return true
  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()
  // Refresh if expires within 5 minutes
  return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000
}

// ============================================================================
// DocuSign API URL Helpers
// ============================================================================

export const DS_API_URLS = {
  oauth: {
    authorize: 'https://account.docusign.com/oauth/auth',
    authorizeDemo: 'https://account-d.docusign.com/oauth/auth',
    token: 'https://account.docusign.com/oauth/token',
    tokenDemo: 'https://account-d.docusign.com/oauth/token',
    userInfo: 'https://account.docusign.com/oauth/userinfo',
    userInfoDemo: 'https://account-d.docusign.com/oauth/userinfo',
  },
  scopes: 'signature impersonation',
}

/**
 * Get OAuth authorize URL based on demo mode
 */
export function getDSAuthorizeUrl(isDemo: boolean): string {
  return isDemo ? DS_API_URLS.oauth.authorizeDemo : DS_API_URLS.oauth.authorize
}

/**
 * Get OAuth token URL based on demo mode
 */
export function getDSTokenUrl(isDemo: boolean): string {
  return isDemo ? DS_API_URLS.oauth.tokenDemo : DS_API_URLS.oauth.token
}

/**
 * Get user info URL based on demo mode
 */
export function getDSUserInfoUrl(isDemo: boolean): string {
  return isDemo ? DS_API_URLS.oauth.userInfoDemo : DS_API_URLS.oauth.userInfo
}

/**
 * Build DocuSign API endpoint URL
 */
export function buildDSApiUrl(
  baseUri: string,
  accountId: string,
  endpoint: string
): string {
  return `${baseUri}/restapi/v2.1/accounts/${accountId}/${endpoint}`
}
