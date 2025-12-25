/**
 * Email Integration API Service
 *
 * Manages email operations:
 * - Email accounts (connect, disconnect, sync)
 * - Email threads and messages
 * - Entity linking
 * - Compose and send
 */

import { supabase } from '@/lib/supabase'
import type {
  EmailAccount,
  EmailThread,
  Email,
  EmailEntityLink,
  EmailSyncLog,
  ConnectEmailAccountDTO,
  ComposeEmailDTO,
  CreateEntityLinkDTO,
  EmailSearchParams,
  EmailThreadFilters,
  EmailFilters,
  EmailProvider,
  EmailFolder,
} from '@/types/email'

// =====================================================
// EMAIL ACCOUNTS
// =====================================================

/**
 * Get all email accounts for the current user
 */
export async function getEmailAccounts(): Promise<{
  data: EmailAccount[] | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single email account by ID
 */
export async function getEmailAccount(accountId: string): Promise<{
  data: EmailAccount | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .single()

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get OAuth authorization URL for email provider
 */
export function getOAuthUrl(provider: EmailProvider, redirectUri: string): string {
  const state = crypto.randomUUID()

  if (provider === 'gmail') {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ')

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${state}`
  }

  if (provider === 'outlook') {
    const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID
    const scopes = [
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'offline_access',
      'openid',
      'email',
    ].join(' ')

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${state}`
  }

  throw new Error(`Unsupported provider: ${provider}`)
}

/**
 * Connect email account (complete OAuth flow or IMAP setup)
 */
export async function connectEmailAccount(data: ConnectEmailAccountDTO): Promise<{
  data: EmailAccount | null
  error: Error | null
}> {
  try {
    if (data.provider === 'imap') {
      // Direct IMAP connection
      const { data: account, error } = await supabase
        .from('email_accounts')
        .insert({
          email_address: data.email_address,
          provider: 'imap',
          imap_host: data.imap_host,
          imap_port: data.imap_port || 993,
          smtp_host: data.smtp_host,
          smtp_port: data.smtp_port || 587,
          // Password should be handled securely via edge function
        })
        .select()
        .single()

      if (error) {throw error}
      return { data: account, error: null }
    }

    // OAuth flow - exchange code for tokens via edge function
    const { data: result, error } = await supabase.functions.invoke('email-complete-oauth', {
      body: {
        provider: data.provider,
        code: data.code,
      },
    })

    if (error) {throw error}
    return { data: result.account, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Disconnect email account
 */
export async function disconnectEmailAccount(accountId: string): Promise<{
  data: boolean
  error: Error | null
}> {
  try {
    const { error } = await supabase
      .from('email_accounts')
      .update({ is_active: false })
      .eq('id', accountId)

    if (error) {throw error}
    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Toggle sync for an email account
 */
export async function toggleEmailSync(
  accountId: string,
  enabled: boolean
): Promise<{ data: EmailAccount | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('email_accounts')
      .update({ sync_enabled: enabled })
      .eq('id', accountId)
      .select()
      .single()

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Trigger manual sync for an account
 */
export async function triggerEmailSync(accountId: string): Promise<{
  data: { success: boolean; message: string } | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-emails-cron', {
      body: { accountId },
    })

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get sync logs for an account
 */
export async function getEmailSyncLogs(
  accountId: string,
  limit = 10
): Promise<{ data: EmailSyncLog[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('email_sync_logs')
      .select('*')
      .eq('account_id', accountId)
      .order('started_at', { ascending: false })
      .limit(limit)

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

// =====================================================
// EMAIL THREADS
// =====================================================

/**
 * Get email threads with filters
 */
export async function getEmailThreads(
  filters?: EmailThreadFilters
): Promise<{ data: EmailThread[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('email_threads')
      .select(`
        *,
        account:email_accounts(id, email_address, provider)
      `)

    if (filters?.account_id) {
      query = query.eq('account_id', filters.account_id)
    }

    if (filters?.folder) {
      query = query.eq('folder', filters.folder)
    }

    if (filters?.is_starred !== undefined) {
      query = query.eq('is_starred', filters.is_starred)
    }

    if (filters?.is_archived !== undefined) {
      query = query.eq('is_archived', filters.is_archived)
    }

    if (filters?.has_unread) {
      query = query.gt('unread_count', 0)
    }

    if (filters?.search) {
      query = query.textSearch('subject', filters.search)
    }

    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    query = query
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single thread with all emails
 */
export async function getEmailThread(threadId: string): Promise<{
  data: EmailThread | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('email_threads')
      .select(`
        *,
        emails:emails(*)
      `)
      .eq('id', threadId)
      .single()

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Update thread (star, archive, move to folder)
 */
export async function updateEmailThread(
  threadId: string,
  updates: Partial<Pick<EmailThread, 'is_starred' | 'is_archived' | 'folder' | 'labels'>>
): Promise<{ data: EmailThread | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('email_threads')
      .update(updates)
      .eq('id', threadId)
      .select()
      .single()

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Mark all emails in thread as read/unread
 */
export async function markThreadAsRead(
  threadId: string,
  isRead: boolean
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('emails')
      .update({ is_read: isRead })
      .eq('thread_id', threadId)

    if (error) {throw error}
    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

// =====================================================
// EMAILS
// =====================================================

/**
 * Get emails with filters
 */
export async function getEmails(
  filters?: EmailFilters
): Promise<{ data: Email[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('emails')
      .select(`
        *,
        thread:email_threads(id, subject)
      `)

    if (filters?.thread_id) {
      query = query.eq('thread_id', filters.thread_id)
    }

    if (filters?.account_id) {
      query = query.eq('account_id', filters.account_id)
    }

    if (filters?.folder) {
      query = query.eq('folder', filters.folder)
    }

    if (filters?.is_read !== undefined) {
      query = query.eq('is_read', filters.is_read)
    }

    if (filters?.is_starred !== undefined) {
      query = query.eq('is_starred', filters.is_starred)
    }

    if (filters?.has_attachments !== undefined) {
      query = query.eq('has_attachments', filters.has_attachments)
    }

    if (filters?.search) {
      query = query.textSearch('subject', filters.search)
    }

    const limit = filters?.limit || 50
    const offset = filters?.offset || 0

    query = query
      .order('date_sent', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single email by ID
 */
export async function getEmail(emailId: string): Promise<{
  data: Email | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('emails')
      .select(`
        *,
        thread:email_threads(id, subject, participants),
        entity_links:email_entity_links(*)
      `)
      .eq('id', emailId)
      .single()

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Mark email as read/unread
 */
export async function markEmailAsRead(
  emailId: string,
  isRead: boolean
): Promise<{ data: Email | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('emails')
      .update({ is_read: isRead })
      .eq('id', emailId)
      .select()
      .single()

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Star/unstar email
 */
export async function starEmail(
  emailId: string,
  isStarred: boolean
): Promise<{ data: Email | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('emails')
      .update({ is_starred: isStarred })
      .eq('id', emailId)
      .select()
      .single()

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Move email to folder
 */
export async function moveEmailToFolder(
  emailId: string,
  folder: EmailFolder
): Promise<{ data: Email | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('emails')
      .update({ folder })
      .eq('id', emailId)
      .select()
      .single()

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Search emails
 */
export async function searchEmails(
  params: EmailSearchParams
): Promise<{ data: Email[] | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {throw new Error('Not authenticated')}

    const { data, error } = await supabase.rpc('search_emails', {
      p_user_id: user.id,
      p_query: params.query || '',
      p_folder: params.folder || null,
      p_limit: params.limit || 50,
    })

    if (error) {throw error}

    // Map RPC result to Email type
    const emails: Email[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.email_id as string,
      thread_id: row.thread_id as string,
      subject: row.subject as string,
      snippet: row.snippet as string,
      from_address: row.from_address as string,
      from_name: row.from_name as string,
      date_sent: row.date_sent as string,
      is_read: row.is_read as boolean,
      has_attachments: row.has_attachments as boolean,
      // Minimal fields for search results
      account_id: '',
      message_id: '',
      provider_id: null,
      in_reply_to: null,
      references: [],
      to_addresses: [],
      cc_addresses: [],
      bcc_addresses: [],
      reply_to_address: null,
      body_text: null,
      body_html: null,
      attachments: [],
      is_starred: false,
      is_draft: false,
      is_sent: false,
      folder: 'inbox' as EmailFolder,
      labels: [],
      date_received: null,
      created_at: '',
      updated_at: '',
    }))

    return { data: emails, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

// =====================================================
// COMPOSE & SEND
// =====================================================

/**
 * Send an email
 */
export async function sendEmail(data: ComposeEmailDTO): Promise<{
  data: { success: boolean; email_id?: string } | null
  error: Error | null
}> {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-composed-email', {
      body: data,
    })

    if (error) {throw error}
    return { data: result, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Save email as draft
 */
export async function saveDraft(data: ComposeEmailDTO): Promise<{
  data: Email | null
  error: Error | null
}> {
  try {
    const { data: result, error } = await supabase
      .from('emails')
      .insert({
        account_id: data.account_id,
        message_id: `draft-${crypto.randomUUID()}`,
        from_address: '', // Will be filled from account
        to_addresses: data.to,
        cc_addresses: data.cc || [],
        bcc_addresses: data.bcc || [],
        subject: data.subject,
        body_html: data.body_html,
        body_text: data.body_text || '',
        is_draft: true,
        folder: 'drafts',
        date_sent: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {throw error}
    return { data: result, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

// =====================================================
// ENTITY LINKING
// =====================================================

/**
 * Link email/thread to an entity
 */
export async function createEntityLink(
  data: CreateEntityLinkDTO
): Promise<{ data: EmailEntityLink | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const { data: link, error } = await supabase
      .from('email_entity_links')
      .insert({
        email_id: data.email_id || null,
        thread_id: data.thread_id || null,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        link_type: data.link_type || 'manual',
        created_by: user?.id,
      })
      .select()
      .single()

    if (error) {throw error}
    return { data: link, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Remove entity link
 */
export async function removeEntityLink(linkId: string): Promise<{
  data: boolean
  error: Error | null
}> {
  try {
    const { error } = await supabase
      .from('email_entity_links')
      .delete()
      .eq('id', linkId)

    if (error) {throw error}
    return { data: true, error: null }
  } catch (error) {
    return { data: false, error: error as Error }
  }
}

/**
 * Get emails linked to an entity
 */
export async function getEntityEmails(
  entityType: string,
  entityId: string,
  limit = 20
): Promise<{ data: Email[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_entity_emails', {
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_limit: limit,
    })

    if (error) {throw error}

    // Map RPC result to Email type
    const emails: Email[] = (data || []).map((row: Record<string, unknown>) => ({
      id: row.email_id as string,
      thread_id: row.thread_id as string,
      subject: row.subject as string,
      snippet: row.snippet as string,
      from_address: row.from_address as string,
      from_name: row.from_name as string,
      date_sent: row.date_sent as string,
      // Minimal fields
      account_id: '',
      message_id: '',
      provider_id: null,
      in_reply_to: null,
      references: [],
      to_addresses: [],
      cc_addresses: [],
      bcc_addresses: [],
      reply_to_address: null,
      body_text: null,
      body_html: null,
      attachments: [],
      has_attachments: false,
      is_read: true,
      is_starred: false,
      is_draft: false,
      is_sent: false,
      folder: 'inbox' as EmailFolder,
      labels: [],
      date_received: null,
      created_at: '',
      updated_at: '',
    }))

    return { data: emails, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

/**
 * Get entity links for an email
 */
export async function getEmailEntityLinks(emailId: string): Promise<{
  data: EmailEntityLink[] | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('email_entity_links')
      .select('*')
      .eq('email_id', emailId)

    if (error) {throw error}
    return { data, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}

// =====================================================
// UNREAD COUNTS
// =====================================================

/**
 * Get total unread email count for user
 */
export async function getUnreadEmailCount(): Promise<{
  data: number
  error: Error | null
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {throw new Error('Not authenticated')}

    const { data, error } = await supabase.rpc('get_unread_email_count', {
      p_user_id: user.id,
    })

    if (error) {throw error}
    return { data: data || 0, error: null }
  } catch (error) {
    return { data: 0, error: error as Error }
  }
}

/**
 * Get unread count per folder
 */
export async function getUnreadCountsByFolder(): Promise<{
  data: Record<EmailFolder, number> | null
  error: Error | null
}> {
  try {
    const { data, error } = await supabase
      .from('email_threads')
      .select('folder, unread_count')
      .gt('unread_count', 0)
      .not('is_archived', 'eq', true)

    if (error) {throw error}

    // Aggregate by folder
    const counts: Record<EmailFolder, number> = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      trash: 0,
      archive: 0,
      spam: 0,
      custom: 0,
    }

    for (const thread of data || []) {
      counts[thread.folder as EmailFolder] += thread.unread_count
    }

    return { data: counts, error: null }
  } catch (error) {
    return { data: null, error: error as Error }
  }
}
