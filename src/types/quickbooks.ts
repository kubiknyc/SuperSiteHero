/**
 * QuickBooks Online Integration Types
 * 
 * Types for OAuth, sync operations, and QB API entities.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type QBSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'skipped'
export type QBSyncDirection = 'to_quickbooks' | 'from_quickbooks' | 'bidirectional'
export type QBEntityType = 'vendor' | 'customer' | 'invoice' | 'bill' | 'payment' | 'expense' | 'account' | 'journal_entry'

export const QB_SYNC_STATUSES: { value: QBSyncStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'syncing', label: 'Syncing', color: 'blue' },
  { value: 'synced', label: 'Synced', color: 'green' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'skipped', label: 'Skipped', color: 'yellow' },
]

export const QB_ENTITY_TYPES: { value: QBEntityType; label: string; localType: string }[] = [
  { value: 'vendor', label: 'Vendor', localType: 'subcontractors' },
  { value: 'bill', label: 'Bill', localType: 'change_orders' },
  { value: 'invoice', label: 'Invoice', localType: 'payment_applications' },
  { value: 'expense', label: 'Expense', localType: 'cost_transactions' },
  { value: 'customer', label: 'Customer', localType: 'projects' },
  { value: 'account', label: 'Account', localType: 'cost_codes' },
]

export const QB_SYNC_DIRECTIONS: { value: QBSyncDirection; label: string }[] = [
  { value: 'to_quickbooks', label: 'To QuickBooks' },
  { value: 'from_quickbooks', label: 'From QuickBooks' },
  { value: 'bidirectional', label: 'Two-way Sync' },
]

// ============================================================================
// Core Database Types
// ============================================================================

/**
 * QuickBooks connection record
 */
export interface QBConnection {
  id: string
  company_id: string
  realm_id: string
  company_name: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  refresh_token_expires_at: string | null
  is_sandbox: boolean
  is_active: boolean
  last_connected_at: string | null
  last_sync_at: string | null
  connection_error: string | null
  auto_sync_enabled: boolean
  sync_frequency_hours: number
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Cost code to QB account mapping
 */
export interface QBAccountMapping {
  id: string
  company_id: string
  connection_id: string
  cost_code_id: string | null
  cost_code: string | null
  qb_account_id: string
  qb_account_name: string | null
  qb_account_type: string | null
  qb_account_number: string | null
  is_default: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  // Joined data
  cost_code_details?: {
    id: string
    code: string
    name: string
    division: string
  }
}

/**
 * Local entity to QB entity mapping
 */
export interface QBEntityMapping {
  id: string
  company_id: string
  connection_id: string
  local_entity_type: string
  local_entity_id: string
  qb_entity_type: QBEntityType
  qb_entity_id: string
  qb_sync_token: string | null
  sync_status: QBSyncStatus
  last_synced_at: string | null
  last_sync_error: string | null
  created_at: string
  updated_at: string
}

/**
 * Sync operation log
 */
export interface QBSyncLog {
  id: string
  company_id: string
  connection_id: string
  sync_type: 'manual' | 'scheduled' | 'webhook' | 'auto'
  direction: QBSyncDirection
  entity_type: QBEntityType | null
  status: QBSyncStatus
  records_processed: number
  records_created: number
  records_updated: number
  records_failed: number
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  error_message: string | null
  error_details: Record<string, unknown> | null
  request_summary: Record<string, unknown> | null
  response_summary: Record<string, unknown> | null
  initiated_by: string | null
}

/**
 * Pending sync queue item
 */
export interface QBPendingSync {
  id: string
  company_id: string
  connection_id: string
  local_entity_type: string
  local_entity_id: string
  direction: QBSyncDirection
  priority: number
  scheduled_at: string
  attempt_count: number
  max_attempts: number
  last_attempt_at: string | null
  last_error: string | null
  status: QBSyncStatus
  created_at: string
  created_by: string | null
}

// ============================================================================
// QuickBooks API Response Types
// ============================================================================

/**
 * OAuth token response from QuickBooks
 */
export interface QBOAuthTokens {
  access_token: string
  refresh_token: string
  token_type: 'Bearer'
  expires_in: number
  x_refresh_token_expires_in: number
  id_token?: string
}

/**
 * QuickBooks address
 */
export interface QBAddress {
  Id?: string
  Line1?: string
  Line2?: string
  Line3?: string
  City?: string
  CountrySubDivisionCode?: string
  PostalCode?: string
  Country?: string
}

/**
 * QuickBooks company info
 */
export interface QBCompanyInfo {
  CompanyName: string
  LegalName: string
  CompanyAddr: QBAddress
  CustomerCommunicationAddr: QBAddress
  PrimaryPhone: { FreeFormNumber: string }
  Email: { Address: string }
  WebAddr: { URI: string }
  FiscalYearStartMonth: string
  Country: string
}

/**
 * QuickBooks vendor (maps to Subcontractor)
 */
export interface QBVendor {
  Id?: string
  SyncToken?: string
  DisplayName: string
  CompanyName?: string
  PrintOnCheckName?: string
  PrimaryPhone?: { FreeFormNumber: string }
  Mobile?: { FreeFormNumber: string }
  PrimaryEmailAddr?: { Address: string }
  WebAddr?: { URI: string }
  BillAddr?: QBAddress
  AcctNum?: string
  Vendor1099?: boolean
  TaxIdentifier?: string
  Active?: boolean
  Balance?: number
}

/**
 * QuickBooks account (Chart of Accounts)
 */
export interface QBAccount {
  Id?: string
  SyncToken?: string
  Name: string
  AccountType: string
  AccountSubType?: string
  AcctNum?: string
  Description?: string
  Active?: boolean
  CurrentBalance?: number
  FullyQualifiedName?: string
}

/**
 * QuickBooks bill line detail
 */
export interface QBBillLine {
  Id?: string
  Description?: string
  Amount: number
  DetailType: 'AccountBasedExpenseLineDetail' | 'ItemBasedExpenseLineDetail'
  AccountBasedExpenseLineDetail?: {
    AccountRef: { value: string; name?: string }
    BillableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled'
    CustomerRef?: { value: string; name?: string }
    TaxCodeRef?: { value: string }
  }
}

/**
 * QuickBooks bill (maps to approved Change Order)
 */
export interface QBBill {
  Id?: string
  SyncToken?: string
  DocNumber?: string
  TxnDate: string
  DueDate?: string
  VendorRef: { value: string; name?: string }
  APAccountRef?: { value: string; name?: string }
  Line: QBBillLine[]
  TotalAmt?: number
  Balance?: number
  PrivateNote?: string
  CurrencyRef?: { value: string; name?: string }
}

/**
 * QuickBooks invoice line detail
 */
export interface QBInvoiceLine {
  Id?: string
  Description?: string
  Amount: number
  DetailType: 'SalesItemLineDetail' | 'SubTotalLineDetail' | 'DescriptionOnly'
  SalesItemLineDetail?: {
    ItemRef: { value: string; name?: string }
    UnitPrice?: number
    Qty?: number
    TaxCodeRef?: { value: string }
  }
}

/**
 * QuickBooks invoice (maps to Payment Application)
 */
export interface QBInvoice {
  Id?: string
  SyncToken?: string
  DocNumber?: string
  TxnDate: string
  DueDate?: string
  CustomerRef: { value: string; name?: string }
  Line: QBInvoiceLine[]
  TotalAmt?: number
  Balance?: number
  PrivateNote?: string
  CustomerMemo?: { value: string }
  BillEmail?: { Address: string }
  EmailStatus?: 'NotSet' | 'NeedToSend' | 'EmailSent'
}

/**
 * QuickBooks customer (maps to Project/Owner)
 */
export interface QBCustomer {
  Id?: string
  SyncToken?: string
  DisplayName: string
  CompanyName?: string
  PrimaryPhone?: { FreeFormNumber: string }
  PrimaryEmailAddr?: { Address: string }
  BillAddr?: QBAddress
  ShipAddr?: QBAddress
  Balance?: number
  Active?: boolean
}

// ============================================================================
// DTO Types (Input/Output)
// ============================================================================

/**
 * Initiate OAuth connection
 */
export interface InitiateQBConnectionDTO {
  is_sandbox?: boolean
}

/**
 * Complete OAuth callback
 */
export interface CompleteQBConnectionDTO {
  code: string
  realm_id: string
  state: string
}

/**
 * Update connection settings
 */
export interface UpdateQBConnectionDTO {
  auto_sync_enabled?: boolean
  sync_frequency_hours?: number
}

/**
 * Create account mapping
 */
export interface CreateQBAccountMappingDTO {
  cost_code_id?: string
  cost_code?: string
  qb_account_id: string
  qb_account_name?: string
  qb_account_type?: string
  qb_account_number?: string
  is_default?: boolean
}

/**
 * Sync single entity
 */
export interface SyncEntityDTO {
  entity_type: string
  entity_id: string
  direction?: QBSyncDirection
}

/**
 * Bulk sync entities
 */
export interface BulkSyncDTO {
  entity_type: string
  entity_ids?: string[]
  direction?: QBSyncDirection
}

// ============================================================================
// Dashboard/Stats Types
// ============================================================================

/**
 * Connection status for display
 */
export interface QBConnectionStatus {
  isConnected: boolean
  connectionId: string | null
  companyName: string | null
  realmId: string | null
  isSandbox: boolean
  lastSyncAt: string | null
  tokenExpiresAt: string | null
  isTokenExpired: boolean
  needsReauth: boolean
  connectionError: string | null
  autoSyncEnabled: boolean
  syncFrequencyHours: number
}

/**
 * Sync statistics
 */
export interface QBSyncStats {
  totalMappedEntities: number
  pendingSyncs: number
  failedSyncs: number
  lastSyncAt: string | null
  syncsByEntityType: Record<QBEntityType, {
    total: number
    synced: number
    pending: number
    failed: number
  }>
}

/**
 * Dashboard data
 */
export interface QBSyncDashboard {
  connection: QBConnectionStatus
  stats: QBSyncStats
  recentLogs: QBSyncLog[]
  pendingItems: QBPendingSync[]
}

// ============================================================================
// Entity Mapping Helpers
// ============================================================================

/**
 * Maps a local entity type to QB entity type
 */
export function getQBEntityType(localEntityType: string): QBEntityType | null {
  const mapping = QB_ENTITY_TYPES.find(t => t.localType === localEntityType)
  return mapping?.value || null
}

/**
 * Maps a QB entity type to local entity type
 */
export function getLocalEntityType(qbEntityType: QBEntityType): string | null {
  const mapping = QB_ENTITY_TYPES.find(t => t.value === qbEntityType)
  return mapping?.localType || null
}

/**
 * Get sync status config
 */
export function getSyncStatusConfig(status: QBSyncStatus) {
  return QB_SYNC_STATUSES.find(s => s.value === status) || QB_SYNC_STATUSES[0]
}

/**
 * Check if connection needs refresh
 */
export function connectionNeedsRefresh(connection: QBConnection): boolean {
  if (!connection.token_expires_at) {return true}
  const expiresAt = new Date(connection.token_expires_at)
  const now = new Date()
  // Refresh if expires within 5 minutes
  return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000
}

/**
 * Check if connection needs re-auth (refresh token expired)
 */
export function connectionNeedsReauth(connection: QBConnection): boolean {
  if (!connection.refresh_token_expires_at) {return true}
  const expiresAt = new Date(connection.refresh_token_expires_at)
  const now = new Date()
  return expiresAt < now
}

// ============================================================================
// QuickBooks API URL Helpers
// ============================================================================

export const QB_API_URLS = {
  oauth: {
    authorize: 'https://appcenter.intuit.com/connect/oauth2',
    token: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    revoke: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
    userInfo: 'https://accounts.platform.intuit.com/v1/openid_connect/userinfo',
  },
  api: {
    production: 'https://quickbooks.api.intuit.com',
    sandbox: 'https://sandbox-quickbooks.api.intuit.com',
  },
  scopes: 'com.intuit.quickbooks.accounting',
}

/**
 * Get API base URL based on sandbox mode
 */
export function getQBApiBaseUrl(isSandbox: boolean): string {
  return isSandbox ? QB_API_URLS.api.sandbox : QB_API_URLS.api.production
}

/**
 * Build QB API endpoint URL
 */
export function buildQBApiUrl(
  realmId: string,
  endpoint: string,
  isSandbox: boolean
): string {
  const baseUrl = getQBApiBaseUrl(isSandbox)
  return `${baseUrl}/v3/company/${realmId}/${endpoint}`
}
