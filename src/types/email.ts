/**
 * Email Integration Types
 *
 * TypeScript types for in-app email management:
 * - Email accounts (Gmail, Outlook, IMAP)
 * - Email threads and messages
 * - Entity linking
 */

// =====================================================
// ENUMS
// =====================================================

export type EmailProvider = 'gmail' | 'outlook' | 'imap'
export type EmailSyncStatus = 'pending' | 'syncing' | 'completed' | 'failed'
export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash' | 'archive' | 'spam' | 'custom'
export type EmailLinkType = 'manual' | 'auto' | 'ai_suggested'

// Supported entity types for linking
export type LinkableEntityType =
  | 'project'
  | 'rfi'
  | 'submittal'
  | 'change_order'
  | 'daily_report'
  | 'contact'
  | 'bid_package'

// =====================================================
// CORE INTERFACES
// =====================================================

export interface EmailAccount {
  id: string
  user_id: string
  company_id: string | null
  email_address: string
  display_name: string | null
  provider: EmailProvider

  // OAuth tokens (not exposed to frontend)
  access_token?: string
  refresh_token?: string
  token_expires_at: string | null

  // IMAP settings
  imap_host: string | null
  imap_port: number
  smtp_host: string | null
  smtp_port: number

  // Sync settings
  sync_enabled: boolean
  last_sync_at: string | null
  sync_status: EmailSyncStatus
  sync_error: string | null
  sync_from_date: string

  // Status
  is_active: boolean
  connected_at: string

  // Timestamps
  created_at: string
  updated_at: string
}

export interface EmailParticipant {
  email: string
  name: string
}

export interface EmailThread {
  id: string
  account_id: string
  thread_id: string | null
  subject: string

  // Thread metadata
  message_count: number
  unread_count: number
  has_attachments: boolean
  participants: EmailParticipant[]

  // Preview
  snippet: string | null
  last_message_at: string | null

  // Status
  is_starred: boolean
  is_archived: boolean
  folder: EmailFolder
  labels: string[]

  // Timestamps
  created_at: string
  updated_at: string

  // Relations (populated)
  emails?: Email[]
  entity_links?: EmailEntityLink[]
}

export interface EmailAttachment {
  id: string
  name: string
  mime_type: string
  size: number
  storage_path?: string
}

export interface Email {
  id: string
  account_id: string
  thread_id: string | null

  // Identification
  message_id: string
  provider_id: string | null
  in_reply_to: string | null
  references: string[]

  // Sender
  from_address: string
  from_name: string | null

  // Recipients
  to_addresses: EmailParticipant[]
  cc_addresses: EmailParticipant[]
  bcc_addresses: EmailParticipant[]
  reply_to_address: string | null

  // Content
  subject: string
  body_text: string | null
  body_html: string | null
  snippet: string | null

  // Attachments
  attachments: EmailAttachment[]
  has_attachments: boolean

  // Status
  is_read: boolean
  is_starred: boolean
  is_draft: boolean
  is_sent: boolean
  folder: EmailFolder
  labels: string[]

  // Timestamps
  date_sent: string
  date_received: string | null
  created_at: string
  updated_at: string

  // Relations (populated)
  thread?: EmailThread
  entity_links?: EmailEntityLink[]
}

export interface EmailEntityLink {
  id: string
  email_id: string | null
  thread_id: string | null
  entity_type: LinkableEntityType
  entity_id: string
  link_type: EmailLinkType
  confidence_score: number | null
  created_by: string | null
  created_at: string

  // Populated entity info
  entity?: {
    id: string
    name?: string
    number?: string | number
    [key: string]: unknown
  }
}

export interface EmailSyncLog {
  id: string
  account_id: string
  sync_type: 'full' | 'incremental' | 'webhook'
  started_at: string
  completed_at: string | null
  status: EmailSyncStatus
  emails_fetched: number
  emails_created: number
  emails_updated: number
  error_message: string | null
  sync_cursor: string | null
}

// =====================================================
// DTOs
// =====================================================

export interface ConnectEmailAccountDTO {
  provider: EmailProvider
  code?: string // OAuth authorization code
  // For IMAP
  imap_host?: string
  imap_port?: number
  smtp_host?: string
  smtp_port?: number
  email_address?: string
  password?: string
}

export interface ComposeEmailDTO {
  account_id: string
  to: EmailParticipant[]
  cc?: EmailParticipant[]
  bcc?: EmailParticipant[]
  subject: string
  body_html: string
  body_text?: string
  attachments?: File[]
  reply_to_email_id?: string
  // Entity to auto-link
  link_to_entity?: {
    entity_type: LinkableEntityType
    entity_id: string
  }
}

export interface CreateEntityLinkDTO {
  email_id?: string
  thread_id?: string
  entity_type: LinkableEntityType
  entity_id: string
  link_type?: EmailLinkType
}

export interface EmailSearchParams {
  query?: string
  folder?: EmailFolder
  is_read?: boolean
  is_starred?: boolean
  has_attachments?: boolean
  from?: string
  date_from?: string
  date_to?: string
  entity_type?: LinkableEntityType
  entity_id?: string
  limit?: number
  offset?: number
}

// =====================================================
// FILTERS
// =====================================================

export interface EmailThreadFilters {
  account_id?: string
  folder?: EmailFolder
  is_starred?: boolean
  is_archived?: boolean
  has_unread?: boolean
  search?: string
  limit?: number
  offset?: number
}

export interface EmailFilters {
  thread_id?: string
  account_id?: string
  folder?: EmailFolder
  is_read?: boolean
  is_starred?: boolean
  has_attachments?: boolean
  search?: string
  limit?: number
  offset?: number
}

// =====================================================
// UI CONFIGURATION
// =====================================================

export const EMAIL_PROVIDER_CONFIG = {
  gmail: {
    label: 'Gmail',
    icon: 'Mail',
    color: 'red',
    description: 'Connect your Google Workspace or Gmail account',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
  },
  outlook: {
    label: 'Outlook',
    icon: 'Mail',
    color: 'blue',
    description: 'Connect your Microsoft 365 or Outlook account',
    scopes: [
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'offline_access',
    ],
  },
  imap: {
    label: 'Other (IMAP)',
    icon: 'Server',
    color: 'gray',
    description: 'Connect any email provider using IMAP/SMTP',
    scopes: [],
  },
} as const

export const EMAIL_FOLDER_CONFIG = {
  inbox: { label: 'Inbox', icon: 'Inbox', color: 'blue' },
  sent: { label: 'Sent', icon: 'Send', color: 'green' },
  drafts: { label: 'Drafts', icon: 'FileText', color: 'orange' },
  trash: { label: 'Trash', icon: 'Trash2', color: 'red' },
  archive: { label: 'Archive', icon: 'Archive', color: 'gray' },
  spam: { label: 'Spam', icon: 'ShieldOff', color: 'yellow' },
  custom: { label: 'Custom', icon: 'Folder', color: 'purple' },
} as const

export const LINKABLE_ENTITY_CONFIG: Record<LinkableEntityType, { label: string; icon: string }> = {
  project: { label: 'Project', icon: 'Building' },
  rfi: { label: 'RFI', icon: 'HelpCircle' },
  submittal: { label: 'Submittal', icon: 'FileCheck' },
  change_order: { label: 'Change Order', icon: 'FileEdit' },
  daily_report: { label: 'Daily Report', icon: 'Calendar' },
  contact: { label: 'Contact', icon: 'User' },
  bid_package: { label: 'Bid Package', icon: 'Package' },
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Format email participant for display
 */
export function formatParticipant(participant: EmailParticipant): string {
  if (participant.name) {
    return `${participant.name} <${participant.email}>`
  }
  return participant.email
}

/**
 * Format multiple participants
 */
export function formatParticipants(participants: EmailParticipant[], maxDisplay = 3): string {
  if (participants.length === 0) return ''
  if (participants.length <= maxDisplay) {
    return participants.map(formatParticipant).join(', ')
  }
  const displayed = participants.slice(0, maxDisplay).map(formatParticipant).join(', ')
  return `${displayed} +${participants.length - maxDisplay} more`
}

/**
 * Get initials from email participant
 */
export function getParticipantInitials(participant: EmailParticipant): string {
  if (participant.name) {
    const parts = participant.name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return participant.name.substring(0, 2).toUpperCase()
  }
  return participant.email.substring(0, 2).toUpperCase()
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * Format email date for display
 */
export function formatEmailDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) {
    return 'Yesterday'
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })
}

/**
 * Check if email is unread
 */
export function isUnread(email: Email): boolean {
  return !email.is_read
}

/**
 * Extract domain from email address
 */
export function getEmailDomain(email: string): string {
  const parts = email.split('@')
  return parts.length > 1 ? parts[1] : ''
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Parse email addresses from a string (e.g., from a form input)
 */
export function parseEmailAddresses(input: string): EmailParticipant[] {
  const results: EmailParticipant[] = []
  const parts = input.split(/[,;]/)

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Try to parse "Name <email>" format
    const match = trimmed.match(/^(.+?)\s*<(.+?)>$/)
    if (match) {
      results.push({ name: match[1].trim(), email: match[2].trim() })
    } else if (isValidEmail(trimmed)) {
      results.push({ name: '', email: trimmed })
    }
  }

  return results
}

// =====================================================
// SYNC STATUS HELPERS
// =====================================================

export function getSyncStatusColor(status: EmailSyncStatus): string {
  switch (status) {
    case 'completed':
      return 'green'
    case 'syncing':
      return 'blue'
    case 'pending':
      return 'gray'
    case 'failed':
      return 'red'
    default:
      return 'gray'
  }
}

export function getSyncStatusLabel(status: EmailSyncStatus): string {
  switch (status) {
    case 'completed':
      return 'Synced'
    case 'syncing':
      return 'Syncing...'
    case 'pending':
      return 'Pending'
    case 'failed':
      return 'Sync Failed'
    default:
      return status
  }
}
