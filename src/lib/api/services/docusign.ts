/**
 * DocuSign E-Signature API Service
 *
 * Service for managing DocuSign OAuth, envelopes, and document signing.
 * Integrates with construction documents: payment applications, change orders, lien waivers.
 */

import { supabaseUntyped } from '@/lib/supabase'
import type {
  DSConnection,
  DSEnvelope,
  DSEnvelopeRecipient,
  DSEnvelopeStatus,
  DSDocumentType,
  DSOAuthTokens,
  DSUserInfo,
  DSEnvelopeSummary,
  DSRecipientViewUrl,
  InitiateDSConnectionDTO,
  CompleteDSConnectionDTO,
  CreateEnvelopeDTO,
  RequestSigningUrlDTO,
  VoidEnvelopeDTO,
  ResendEnvelopeDTO,
  DSConnectionStatus,
  DSEnvelopeStats,
  DSDashboard,
  PaymentApplicationSigningConfig,
  ChangeOrderSigningConfig,
  LienWaiverSigningConfig,
} from '@/types/docusign'
import {
  connectionNeedsRefresh,
  getDSAuthorizeUrl,
  getDSTokenUrl,
  getDSUserInfoUrl,
  buildDSApiUrl,
  DS_API_URLS,
} from '@/types/docusign'
import type {
  DocuSignOAuthStateRow,
  DocuSignOAuthStateInsert,
  DocuSignConnectionRow,
  DocuSignConnectionInsert,
  DocuSignConnectionUpdate,
  DocuSignEnvelopeRow,
  DocuSignEnvelopeInsert,
  DocuSignEnvelopeUpdate,
  DocuSignEnvelopeRecipientRow,
  DocuSignEnvelopeRecipientInsert,
  DocuSignEnvelopeRecipientUpdate,
  DocuSignEnvelopeEventInsert,
  DocuSignRecipientStatus,
} from '@/types/database-extensions'
import { logger } from '../../utils/logger'

// Type-safe wrapper for Supabase queries on DocuSign tables
const docuSignDb = {
  connections: () => supabaseUntyped.from('docusign_connections'),
  oauthStates: () => supabaseUntyped.from('docusign_oauth_states'),
  envelopes: () => supabaseUntyped.from('docusign_envelopes'),
  recipients: () => supabaseUntyped.from('docusign_envelope_recipients'),
  events: () => supabaseUntyped.from('docusign_envelope_events'),
}


// ============================================================================
// Connection Management
// ============================================================================

/**
 * Get DocuSign connection for the current company
 */
export async function getConnection(companyId: string): Promise<DSConnection | null> {
  const { data, error } = await docuSignDb.connections()
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get DocuSign connection: ${error.message}`)
  }

  return (data as DocuSignConnectionRow | null) as DSConnection | null
}

/**
 * Get connection status for display
 */
export async function getConnectionStatus(companyId: string): Promise<DSConnectionStatus> {
  const connection = await getConnection(companyId)

  if (!connection) {
    return {
      isConnected: false,
      connectionId: null,
      accountId: null,
      accountName: null,
      isDemo: false,
      lastConnectedAt: null,
      tokenExpiresAt: null,
      isTokenExpired: false,
      needsReauth: false,
      connectionError: null,
    }
  }

  const tokenExpired = connection.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : true

  return {
    isConnected: true,
    connectionId: connection.id,
    accountId: connection.account_id,
    accountName: connection.account_name,
    isDemo: connection.is_demo,
    lastConnectedAt: connection.last_connected_at,
    tokenExpiresAt: connection.token_expires_at,
    isTokenExpired: tokenExpired,
    needsReauth: connectionNeedsRefresh(connection),
    connectionError: connection.connection_error,
  }
}

/**
 * Initiate DocuSign OAuth flow
 * Returns the authorization URL to redirect the user to
 */
export async function initiateConnection(
  companyId: string,
  dto: InitiateDSConnectionDTO
): Promise<{ authorizationUrl: string; state: string }> {
  // Generate state token for CSRF protection
  const state = crypto.randomUUID()

  // Store state in session or database for verification
  const { error: stateError } = await supabase
    .from('docusign_oauth_states' as any)
    .insert({
      state,
      company_id: companyId,
      is_demo: dto.is_demo || false,
      return_url: dto.return_url,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    })

  if (stateError) {
    throw new Error(`Failed to store OAuth state: ${stateError.message}`)
  }

  // Build authorization URL
  const authUrl = getDSAuthorizeUrl(dto.is_demo || false)
  const params = new URLSearchParams({
    response_type: 'code',
    scope: DS_API_URLS.scopes,
    client_id: import.meta.env.VITE_DOCUSIGN_CLIENT_ID || '',
    redirect_uri: import.meta.env.VITE_DOCUSIGN_REDIRECT_URI || '',
    state,
  })

  return {
    authorizationUrl: `${authUrl}?${params.toString()}`,
    state,
  }
}

/**
 * Complete DocuSign OAuth flow with authorization code
 */
export async function completeConnection(
  companyId: string,
  dto: CompleteDSConnectionDTO
): Promise<DSConnection> {
  // Verify state token
  const { data: stateData, error: stateError } = await supabase
    .from('docusign_oauth_states' as any)
    .select('*')
    .eq('state', dto.state)
    .eq('company_id', companyId)
    .single()

  if (stateError || !stateData) {
    throw new Error('Invalid or expired OAuth state')
  }

  const state = stateData as unknown as { is_demo: boolean; return_url?: string }
  const isDemo = state.is_demo

  // Exchange code for tokens
  const tokenUrl = getDSTokenUrl(isDemo)
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(
        `${import.meta.env.VITE_DOCUSIGN_CLIENT_ID}:${import.meta.env.VITE_DOCUSIGN_CLIENT_SECRET}`
      )}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: dto.code,
      redirect_uri: import.meta.env.VITE_DOCUSIGN_REDIRECT_URI || '',
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    throw new Error(`Failed to exchange code for tokens: ${errorText}`)
  }

  const tokens: DSOAuthTokens = await tokenResponse.json()

  // Get user info to find account
  const userInfoUrl = getDSUserInfoUrl(isDemo)
  const userInfoResponse = await fetch(userInfoUrl, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  })

  if (!userInfoResponse.ok) {
    throw new Error('Failed to get DocuSign user info')
  }

  const userInfo: DSUserInfo = await userInfoResponse.json()
  const account = userInfo.accounts.find(a => a.is_default) || userInfo.accounts[0]

  if (!account) {
    throw new Error('No DocuSign account found')
  }

  // Create or update connection
  const connectionData = {
    company_id: companyId,
    account_id: account.account_id,
    account_name: account.account_name,
    base_uri: account.base_uri,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    is_demo: isDemo,
    is_active: true,
    last_connected_at: new Date().toISOString(),
    connection_error: null,
  }

  const { data: connection, error: connectionError } = await supabase
    .from('docusign_connections' as any)
    .upsert(connectionData, { onConflict: 'company_id' })
    .select()
    .single()

  if (connectionError) {
    throw new Error(`Failed to save DocuSign connection: ${connectionError.message}`)
  }

  // Clean up OAuth state
  await supabase
    .from('docusign_oauth_states' as any)
    .delete()
    .eq('state', dto.state)

  return connection as unknown as DSConnection
}

/**
 * Refresh DocuSign access token
 */
export async function refreshToken(connectionId: string): Promise<void> {
  const { data: connectionData, error: getError } = await supabase
    .from('docusign_connections' as any)
    .select('*')
    .eq('id', connectionId)
    .single()

  if (getError || !connectionData) {
    throw new Error('Connection not found')
  }

  const connection = connectionData as unknown as DSConnection

  if (!connection.refresh_token) {
    throw new Error('No refresh token available')
  }

  const tokenUrl = getDSTokenUrl(connection.is_demo)
  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(
        `${import.meta.env.VITE_DOCUSIGN_CLIENT_ID}:${import.meta.env.VITE_DOCUSIGN_CLIENT_SECRET}`
      )}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
    }),
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    await supabase
      .from('docusign_connections' as any)
      .update({ connection_error: errorText })
      .eq('id', connectionId)
    throw new Error(`Failed to refresh token: ${errorText}`)
  }

  const tokens: DSOAuthTokens = await tokenResponse.json()

  await supabase
    .from('docusign_connections' as any)
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      connection_error: null,
    })
    .eq('id', connectionId)
}

/**
 * Disconnect DocuSign
 */
export async function disconnect(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('docusign_connections' as any)
    .update({
      is_active: false,
      access_token: null,
      refresh_token: null,
    })
    .eq('id', connectionId)

  if (error) {
    throw new Error(`Failed to disconnect: ${error.message}`)
  }
}

// ============================================================================
// Envelope Management
// ============================================================================

/**
 * Get envelopes with optional filters
 */
export async function getEnvelopes(
  companyId: string,
  filters?: {
    document_type?: DSDocumentType
    status?: DSEnvelopeStatus
    local_document_id?: string
    limit?: number
    offset?: number
  }
): Promise<DSEnvelope[]> {
  let query = supabase
    .from('docusign_envelopes' as any)
    .select('*, recipients:docusign_envelope_recipients(*)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (filters?.document_type) {
    query = query.eq('document_type', filters.document_type)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.local_document_id) {
    query = query.eq('local_document_id', filters.local_document_id)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get envelopes: ${error.message}`)
  }

  return (data || []) as unknown as DSEnvelope[]
}

/**
 * Get single envelope by ID
 */
export async function getEnvelope(envelopeDbId: string): Promise<DSEnvelope | null> {
  const { data, error } = await supabase
    .from('docusign_envelopes' as any)
    .select(`
      *,
      recipients:docusign_envelope_recipients(*),
      documents:docusign_envelope_documents(*)
    `)
    .eq('id', envelopeDbId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get envelope: ${error.message}`)
  }

  return data as unknown as DSEnvelope | null
}

/**
 * Get envelope by local document ID
 */
export async function getEnvelopeByDocument(
  companyId: string,
  documentType: DSDocumentType,
  localDocumentId: string
): Promise<DSEnvelope | null> {
  const { data, error } = await supabase
    .from('docusign_envelopes' as any)
    .select(`
      *,
      recipients:docusign_envelope_recipients(*),
      documents:docusign_envelope_documents(*)
    `)
    .eq('company_id', companyId)
    .eq('document_type', documentType)
    .eq('local_document_id', localDocumentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get envelope: ${error.message}`)
  }

  return data as unknown as DSEnvelope | null
}

/**
 * Get a valid access token, refreshing if needed
 */
async function getValidAccessToken(connection: DSConnection): Promise<string> {
  if (connectionNeedsRefresh(connection)) {
    await refreshToken(connection.id)
    // Re-fetch to get updated token
    const refreshedConnection = await getConnection(connection.company_id)
    if (!refreshedConnection?.access_token) {
      throw new Error('Failed to get refreshed access token')
    }
    return refreshedConnection.access_token
  }

  if (!connection.access_token) {
    throw new Error('No access token available')
  }

  return connection.access_token
}

/**
 * Make an authenticated API call to DocuSign
 */
async function callDocuSignApi<T>(
  connection: DSConnection,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken(connection)

  if (!connection.base_uri || !connection.account_id) {
    throw new Error('Invalid DocuSign connection: missing base_uri or account_id')
  }

  const url = buildDSApiUrl(connection.base_uri, connection.account_id, endpoint)

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DocuSign API error (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * Generate PDF document from local document (placeholder - implement based on document type)
 */
async function generateDocumentPDF(
  documentType: DSDocumentType,
  localDocumentId: string
): Promise<{ base64: string; name: string }> {
  // This would call the appropriate PDF generation service based on document type
  // For now, we return a placeholder that should be replaced with actual PDF generation

  // In a real implementation:
  // - payment_application -> call payment application PDF generator
  // - change_order -> call change order PDF generator
  // - lien_waiver -> call lien waiver PDF generator
  // etc.

  const documentNames: Record<DSDocumentType, string> = {
    payment_application: 'Payment_Application.pdf',
    change_order: 'Change_Order.pdf',
    lien_waiver: 'Lien_Waiver.pdf',
    contract: 'Contract.pdf',
    subcontract: 'Subcontract.pdf',
    other: 'Document.pdf',
  }

  // Placeholder - in production, this would generate actual PDF content
  logger.warn(`PDF generation for ${documentType} ${localDocumentId} - using placeholder`)

  return {
    base64: '', // Would be actual base64-encoded PDF content
    name: documentNames[documentType] || 'Document.pdf',
  }
}

/**
 * Build DocuSign envelope definition from DTO
 */
function buildEnvelopeDefinition(
  dto: CreateEnvelopeDTO,
  documentBase64: string,
  documentName: string,
  webhookUrl?: string
): Record<string, unknown> {
  // Build signers with tabs
  const signers = dto.signers.map((signer, index) => {
    const signerDef: Record<string, unknown> = {
      recipientId: String(index + 1),
      email: signer.email,
      name: signer.name,
      routingOrder: String(signer.routing_order || index + 1),
      roleName: signer.role,
    }

    // Add tabs if specified
    if (signer.tabs) {
      const tabs: Record<string, unknown[]> = {}

      if (signer.tabs.sign_here?.length) {
        tabs.signHereTabs = signer.tabs.sign_here.map((tab, tabIndex) => ({
          documentId: '1',
          pageNumber: String(tab.page),
          xPosition: String(tab.x),
          yPosition: String(tab.y),
          tabLabel: `signature_${index + 1}_${tabIndex + 1}`,
        }))
      }

      if (signer.tabs.initial_here?.length) {
        tabs.initialHereTabs = signer.tabs.initial_here.map((tab, tabIndex) => ({
          documentId: '1',
          pageNumber: String(tab.page),
          xPosition: String(tab.x),
          yPosition: String(tab.y),
          tabLabel: `initial_${index + 1}_${tabIndex + 1}`,
        }))
      }

      if (signer.tabs.date_signed?.length) {
        tabs.dateSignedTabs = signer.tabs.date_signed.map((tab, tabIndex) => ({
          documentId: '1',
          pageNumber: String(tab.page),
          xPosition: String(tab.x),
          yPosition: String(tab.y),
          tabLabel: `date_${index + 1}_${tabIndex + 1}`,
        }))
      }

      if (signer.tabs.text?.length) {
        tabs.textTabs = signer.tabs.text.map((tab, tabIndex) => ({
          documentId: '1',
          pageNumber: String(tab.page),
          xPosition: String(tab.x),
          yPosition: String(tab.y),
          tabLabel: tab.label || `text_${index + 1}_${tabIndex + 1}`,
          value: tab.value,
        }))
      }

      if (Object.keys(tabs).length > 0) {
        signerDef.tabs = tabs
      }
    }

    return signerDef
  })

  // Build carbon copies
  const carbonCopies = (dto.carbon_copies || []).map((cc, index) => ({
    recipientId: String(dto.signers.length + index + 1),
    email: cc.email,
    name: cc.name,
    routingOrder: String(cc.routing_order || dto.signers.length + index + 1),
  }))

  // Build envelope definition
  const envelopeDefinition: Record<string, unknown> = {
    emailSubject: dto.subject || 'Please sign this document',
    emailBlurb: dto.message,
    status: dto.send_immediately ? 'sent' : 'created',
    documents: [
      {
        documentId: '1',
        name: documentName,
        fileExtension: 'pdf',
        documentBase64: documentBase64,
      },
    ],
    recipients: {
      signers,
      carbonCopies: carbonCopies.length > 0 ? carbonCopies : undefined,
    },
  }

  // Add notification settings
  if (dto.reminder_enabled || dto.expires_in_days) {
    envelopeDefinition.notification = {
      useAccountDefaults: 'false',
      reminders: dto.reminder_enabled
        ? {
            reminderEnabled: 'true',
            reminderDelay: String(dto.reminder_delay_days || 1),
            reminderFrequency: String(dto.reminder_frequency_days || 1),
          }
        : undefined,
      expirations: dto.expires_in_days
        ? {
            expireEnabled: 'true',
            expireAfter: String(dto.expires_in_days),
            expireWarn: String(Math.min(dto.expires_in_days - 1, 3)),
          }
        : undefined,
    }
  }

  // Add webhook for status updates
  if (webhookUrl) {
    envelopeDefinition.eventNotification = {
      url: webhookUrl,
      loggingEnabled: 'true',
      requireAcknowledgment: 'true',
      envelopeEvents: [
        { envelopeEventStatusCode: 'sent' },
        { envelopeEventStatusCode: 'delivered' },
        { envelopeEventStatusCode: 'completed' },
        { envelopeEventStatusCode: 'declined' },
        { envelopeEventStatusCode: 'voided' },
      ],
      recipientEvents: [
        { recipientEventStatusCode: 'Sent' },
        { recipientEventStatusCode: 'Delivered' },
        { recipientEventStatusCode: 'Completed' },
        { recipientEventStatusCode: 'Declined' },
      ],
    }
  }

  return envelopeDefinition
}

/**
 * Create envelope and send for signing
 */
export async function createEnvelope(
  companyId: string,
  dto: CreateEnvelopeDTO
): Promise<DSEnvelope> {
  // Get connection
  const connection = await getConnection(companyId)
  if (!connection) {
    throw new Error('DocuSign not connected')
  }

  // Ensure token is valid
  if (connectionNeedsRefresh(connection)) {
    await refreshToken(connection.id)
  }

  // Generate PDF from local document
  const { base64: documentBase64, name: documentName } = await generateDocumentPDF(
    dto.document_type,
    dto.local_document_id
  )

  // Build envelope definition
  const webhookUrl = connection.webhook_uri || undefined
  const envelopeDefinition = buildEnvelopeDefinition(dto, documentBase64, documentName, webhookUrl)

  // Call DocuSign API to create envelope
  let envelopeId: string
  let envelopeStatus: DSEnvelopeStatus = 'created'

  try {
    const result = await callDocuSignApi<DSEnvelopeSummary>(connection, 'envelopes', {
      method: 'POST',
      body: JSON.stringify(envelopeDefinition),
    })
    envelopeId = result.envelopeId
    envelopeStatus = (dto.send_immediately ? 'sent' : 'created') as DSEnvelopeStatus
  } catch (error) {
    // If API call fails, store envelope locally with pending status for retry
    logger.error('DocuSign API call failed, storing locally:', error)
    envelopeId = `pending_${crypto.randomUUID()}`
  }

  // Store envelope in database
  const { data: envelope, error: insertError } = await supabase
    .from('docusign_envelopes' as any)
    .insert({
      company_id: companyId,
      connection_id: connection.id,
      envelope_id: envelopeId,
      document_type: dto.document_type,
      local_document_id: dto.local_document_id,
      status: envelopeStatus,
      subject: dto.subject,
      message: dto.message,
      signing_order_enabled: dto.signing_order_enabled || false,
      reminder_enabled: dto.reminder_enabled || false,
      reminder_delay_days: dto.reminder_delay_days,
      reminder_frequency_days: dto.reminder_frequency_days,
      sent_at: dto.send_immediately ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (insertError) {
    throw new Error(`Failed to create envelope: ${insertError.message}`)
  }

  const createdEnvelope = envelope as unknown as DSEnvelope

  // Create recipients
  const recipientStatus = dto.send_immediately ? 'sent' : 'created'

  for (let i = 0; i < dto.signers.length; i++) {
    const signer = dto.signers[i]
    await supabase.from('docusign_envelope_recipients' as any).insert({
      envelope_db_id: createdEnvelope.id,
      recipient_id: `${i + 1}`,
      recipient_type: 'signer',
      email: signer.email,
      name: signer.name,
      role_name: signer.role,
      routing_order: signer.routing_order || i + 1,
      status: recipientStatus,
    })
  }

  if (dto.carbon_copies) {
    for (let i = 0; i < dto.carbon_copies.length; i++) {
      const cc = dto.carbon_copies[i]
      await supabase.from('docusign_envelope_recipients' as any).insert({
        envelope_db_id: createdEnvelope.id,
        recipient_id: `${dto.signers.length + i + 1}`,
        recipient_type: 'cc',
        email: cc.email,
        name: cc.name,
        routing_order: cc.routing_order || dto.signers.length + i + 1,
        status: recipientStatus,
      })
    }
  }

  return createdEnvelope
}

/**
 * Send envelope for signing
 */
export async function sendEnvelope(envelopeDbId: string): Promise<DSEnvelope> {
  const envelope = await getEnvelope(envelopeDbId)
  if (!envelope) {
    throw new Error('Envelope not found')
  }

  if (envelope.status !== 'created') {
    throw new Error(`Cannot send envelope with status: ${envelope.status}`)
  }

  // Get connection
  const { data: connectionData, error: connError } = await supabase
    .from('docusign_connections' as any)
    .select('*')
    .eq('id', envelope.connection_id)
    .single()

  if (connError || !connectionData) {
    throw new Error('DocuSign connection not found')
  }

  const connection = connectionData as unknown as DSConnection

  // Check if envelope was created in DocuSign (not a pending local envelope)
  if (!envelope.envelope_id.startsWith('pending_')) {
    // Call DocuSign API to update envelope status to sent
    try {
      await callDocuSignApi<DSEnvelopeSummary>(
        connection,
        `envelopes/${envelope.envelope_id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'sent' }),
        }
      )
    } catch (error) {
      logger.error('Failed to send envelope via DocuSign API:', error)
      throw new Error(`Failed to send envelope: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update local database
  const { data, error } = await supabase
    .from('docusign_envelopes' as any)
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', envelopeDbId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update envelope status: ${error.message}`)
  }

  // Update recipient statuses
  await supabase
    .from('docusign_envelope_recipients' as any)
    .update({ status: 'sent' })
    .eq('envelope_db_id', envelopeDbId)

  return data as unknown as DSEnvelope
}

/**
 * Get embedded signing URL
 */
export async function getSigningUrl(dto: RequestSigningUrlDTO): Promise<string> {
  const { data: envelopeData, error: envError } = await supabase
    .from('docusign_envelopes' as any)
    .select('*, connection:docusign_connections(*), recipients:docusign_envelope_recipients(*)')
    .eq('envelope_id', dto.envelope_id)
    .single()

  if (envError || !envelopeData) {
    throw new Error('Envelope not found')
  }

  const envelope = envelopeData as unknown as DSEnvelope & {
    connection: DSConnection
    recipients: DSEnvelopeRecipient[]
  }
  const connection = envelope.connection
  if (!connection) {
    throw new Error('Connection not found')
  }

  // Find the recipient
  const recipient = envelope.recipients?.find(
    (r) => r.email.toLowerCase() === dto.recipient_email.toLowerCase()
  )

  if (!recipient) {
    throw new Error(`Recipient not found: ${dto.recipient_email}`)
  }

  // For pending envelopes, return placeholder URL
  if (envelope.envelope_id.startsWith('pending_')) {
    logger.warn('Attempting to get signing URL for pending envelope')
    return `${dto.return_url}?event=signing_pending&envelope_id=${dto.envelope_id}`
  }

  // Build recipient view request
  const recipientViewRequest = {
    returnUrl: dto.return_url,
    authenticationMethod: dto.authentication_method || 'none',
    email: recipient.email,
    userName: recipient.name,
    recipientId: recipient.recipient_id,
    clientUserId: recipient.client_user_id || undefined,
  }

  try {
    // Call DocuSign API to get recipient view URL
    const result = await callDocuSignApi<DSRecipientViewUrl>(
      connection,
      `envelopes/${envelope.envelope_id}/views/recipient`,
      {
        method: 'POST',
        body: JSON.stringify(recipientViewRequest),
      }
    )

    return result.url
  } catch (error) {
    logger.error('Failed to get signing URL from DocuSign:', error)

    // Fall back to console signing URL if embedded fails
    // This happens when the signer is not embedded (clientUserId not set)
    return `${connection.base_uri}/signing/emails/v2.0/${envelope.envelope_id}?return=${encodeURIComponent(dto.return_url)}`
  }
}

/**
 * Void an envelope
 */
export async function voidEnvelope(dto: VoidEnvelopeDTO): Promise<void> {
  // Get envelope with connection
  const { data: envelopeData, error: envError } = await supabase
    .from('docusign_envelopes' as any)
    .select('*, connection:docusign_connections(*)')
    .eq('envelope_id', dto.envelope_id)
    .single()

  if (envError || !envelopeData) {
    throw new Error('Envelope not found')
  }

  const envelope = envelopeData as unknown as DSEnvelope & { connection: DSConnection }

  // Can only void envelopes that are not in terminal state
  if (['completed', 'declined', 'voided', 'deleted'].includes(envelope.status)) {
    throw new Error(`Cannot void envelope with status: ${envelope.status}`)
  }

  // Call DocuSign API to void envelope (if not a pending local envelope)
  if (!envelope.envelope_id.startsWith('pending_') && envelope.connection) {
    try {
      await callDocuSignApi(
        envelope.connection,
        `envelopes/${envelope.envelope_id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status: 'voided',
            voidedReason: dto.reason,
          }),
        }
      )
    } catch (error) {
      logger.error('Failed to void envelope via DocuSign API:', error)
      throw new Error(`Failed to void envelope: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update local database
  const { error } = await supabase
    .from('docusign_envelopes' as any)
    .update({
      status: 'voided',
      voided_at: new Date().toISOString(),
      void_reason: dto.reason,
    })
    .eq('envelope_id', dto.envelope_id)

  if (error) {
    throw new Error(`Failed to update envelope status: ${error.message}`)
  }

  // Update recipient statuses
  await supabase
    .from('docusign_envelope_recipients' as any)
    .update({ status: 'voided' as any })
    .eq('envelope_db_id', envelope.id)
}

/**
 * Resend envelope to recipients
 */
export async function resendEnvelope(dto: ResendEnvelopeDTO): Promise<void> {
  // Get envelope with connection
  const { data: envelopeData, error: envError } = await supabase
    .from('docusign_envelopes' as any)
    .select('*, connection:docusign_connections(*)')
    .eq('envelope_id', dto.envelope_id)
    .single()

  if (envError || !envelopeData) {
    throw new Error('Envelope not found')
  }

  const envelope = envelopeData as unknown as DSEnvelope & { connection: DSConnection }

  // Can only resend envelopes that are in sent or delivered status
  if (!['sent', 'delivered'].includes(envelope.status)) {
    throw new Error(`Cannot resend envelope with status: ${envelope.status}`)
  }

  // Call DocuSign API to resend envelope (if not a pending local envelope)
  if (!envelope.envelope_id.startsWith('pending_') && envelope.connection) {
    try {
      // Build resend request - optionally limit to specific recipients
      const resendRequest: Record<string, unknown> = {}

      if (dto.recipient_emails && dto.recipient_emails.length > 0) {
        // Get recipient IDs for specified emails
        const { data: recipients } = await supabase
          .from('docusign_envelope_recipients' as any)
          .select('recipient_id, email')
          .eq('envelope_db_id', envelope.id)
          .in('email', dto.recipient_emails)

        if (recipients && recipients.length > 0) {
          resendRequest.resendEnvelope = 'true'
        }
      }

      await callDocuSignApi(
        envelope.connection,
        `envelopes/${envelope.envelope_id}?resend_envelope=true`,
        {
          method: 'PUT',
          body: JSON.stringify({ status: 'sent' }),
        }
      )

      // Log the resend event
      await supabase.from('docusign_envelope_events' as any).insert({
        envelope_db_id: envelope.id,
        event_type: 'envelope_resent',
        event_time: new Date().toISOString(),
        details: {
          recipient_emails: dto.recipient_emails,
        },
      })
    } catch (error) {
      logger.error('Failed to resend envelope via DocuSign API:', error)
      throw new Error(`Failed to resend envelope: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  } else {
    logger.log('Resending pending envelope:', dto.envelope_id)
  }
}

// ============================================================================
// Construction Document Helpers
// ============================================================================

/**
 * Create envelope for payment application signing
 */
export async function createPaymentApplicationEnvelope(
  companyId: string,
  config: PaymentApplicationSigningConfig
): Promise<DSEnvelope> {
  const signers: CreateEnvelopeDTO['signers'] = [
    {
      email: config.contractor_signer.email,
      name: config.contractor_signer.name,
      role: 'Contractor',
      routing_order: 1,
    },
  ]

  if (config.architect_signer) {
    signers.push({
      email: config.architect_signer.email,
      name: config.architect_signer.name,
      role: 'Architect',
      routing_order: 2,
    })
  }

  if (config.owner_signer) {
    signers.push({
      email: config.owner_signer.email,
      name: config.owner_signer.name,
      role: 'Owner',
      routing_order: 3,
    })
  }

  return createEnvelope(companyId, {
    document_type: 'payment_application',
    local_document_id: config.payment_application_id,
    subject: 'Payment Application for Signature',
    message: 'Please review and sign the attached payment application.',
    signers,
    carbon_copies: config.cc_recipients,
    send_immediately: true,
    signing_order_enabled: true,
  })
}

/**
 * Create envelope for change order signing
 */
export async function createChangeOrderEnvelope(
  companyId: string,
  config: ChangeOrderSigningConfig
): Promise<DSEnvelope> {
  return createEnvelope(companyId, {
    document_type: 'change_order',
    local_document_id: config.change_order_id,
    subject: 'Change Order for Signature',
    message: 'Please review and sign the attached change order.',
    signers: [
      {
        email: config.contractor_signer.email,
        name: config.contractor_signer.name,
        role: 'Contractor',
        routing_order: 1,
      },
      {
        email: config.owner_signer.email,
        name: config.owner_signer.name,
        role: 'Owner',
        routing_order: 2,
      },
    ],
    carbon_copies: config.cc_recipients,
    send_immediately: true,
    signing_order_enabled: true,
  })
}

/**
 * Create envelope for lien waiver signing
 */
export async function createLienWaiverEnvelope(
  companyId: string,
  config: LienWaiverSigningConfig
): Promise<DSEnvelope> {
  const signers: CreateEnvelopeDTO['signers'] = [
    {
      email: config.claimant_signer.email,
      name: config.claimant_signer.name,
      role: 'Claimant',
      routing_order: 1,
    },
  ]

  if (config.notary_required && config.notary_signer) {
    signers.push({
      email: config.notary_signer.email,
      name: config.notary_signer.name,
      role: 'Notary',
      routing_order: 2,
    })
  }

  return createEnvelope(companyId, {
    document_type: 'lien_waiver',
    local_document_id: config.lien_waiver_id,
    subject: 'Lien Waiver for Signature',
    message: 'Please review and sign the attached lien waiver.',
    signers,
    carbon_copies: config.cc_recipients,
    send_immediately: true,
    signing_order_enabled: config.notary_required,
  })
}

// ============================================================================
// Statistics and Dashboard
// ============================================================================

/**
 * Get envelope statistics
 */
export async function getEnvelopeStats(companyId: string): Promise<DSEnvelopeStats> {
  const { data: envelopesData, error } = await supabase
    .from('docusign_envelopes' as any)
    .select('status, document_type')
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Failed to get envelope stats: ${error.message}`)
  }

  const envelopes = (envelopesData || []) as unknown as Array<{ status: string; document_type: string }>

  const stats: DSEnvelopeStats = {
    total: envelopes.length,
    pending: 0,
    sent: 0,
    delivered: 0,
    signed: 0,
    completed: 0,
    declined: 0,
    voided: 0,
    byDocumentType: {
      payment_application: { total: 0, pending: 0, completed: 0 },
      change_order: { total: 0, pending: 0, completed: 0 },
      lien_waiver: { total: 0, pending: 0, completed: 0 },
      contract: { total: 0, pending: 0, completed: 0 },
      subcontract: { total: 0, pending: 0, completed: 0 },
      other: { total: 0, pending: 0, completed: 0 },
    },
  }

  for (const env of envelopes) {
    // Count by status
    switch (env.status) {
      case 'created':
        stats.pending++
        break
      case 'sent':
        stats.sent++
        break
      case 'delivered':
        stats.delivered++
        break
      case 'signed':
        stats.signed++
        break
      case 'completed':
        stats.completed++
        break
      case 'declined':
        stats.declined++
        break
      case 'voided':
        stats.voided++
        break
    }

    // Count by document type
    const docType = env.document_type as DSDocumentType
    if (stats.byDocumentType[docType]) {
      stats.byDocumentType[docType].total++
      if (env.status === 'created' || env.status === 'sent' || env.status === 'delivered') {
        stats.byDocumentType[docType].pending++
      }
      if (env.status === 'completed') {
        stats.byDocumentType[docType].completed++
      }
    }
  }

  return stats
}

/**
 * Get dashboard data
 */
export async function getDashboard(companyId: string): Promise<DSDashboard> {
  const [connection, stats, recentEnvelopes, pendingSignatures] = await Promise.all([
    getConnectionStatus(companyId),
    getEnvelopeStats(companyId),
    getEnvelopes(companyId, { limit: 5 }),
    getEnvelopes(companyId, {
      status: 'sent',
      limit: 10,
    }),
  ])

  return {
    connection,
    stats,
    recentEnvelopes,
    pendingSignatures,
  }
}

// ============================================================================
// Export API
// ============================================================================

export const docuSignApi = {
  // Connection
  getConnection,
  getConnectionStatus,
  initiateConnection,
  completeConnection,
  refreshToken,
  disconnect,

  // Envelopes
  getEnvelopes,
  getEnvelope,
  getEnvelopeByDocument,
  createEnvelope,
  sendEnvelope,
  getSigningUrl,
  voidEnvelope,
  resendEnvelope,

  // Construction documents
  createPaymentApplicationEnvelope,
  createChangeOrderEnvelope,
  createLienWaiverEnvelope,

  // Dashboard
  getEnvelopeStats,
  getDashboard,
}

export default docuSignApi
