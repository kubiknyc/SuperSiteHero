/**
 * Supabase Edge Function: sync-emails-cron
 *
 * Scheduled cron job to sync emails from connected accounts.
 * Runs every 5 minutes to fetch new emails via IMAP or provider APIs.
 *
 * Supports:
 * - Gmail API (OAuth2)
 * - Microsoft Graph API for Outlook (OAuth2)
 * - Generic IMAP (for other providers)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types
interface EmailAccount {
  id: string
  user_id: string
  email_address: string
  provider: 'gmail' | 'outlook' | 'imap'
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  imap_host: string | null
  imap_port: number
  last_sync_at: string | null
  sync_from_date: string
}

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    mimeType: string
    body?: { data?: string; size: number }
    parts?: Array<{
      mimeType: string
      body?: { data?: string; size: number; attachmentId?: string }
      filename?: string
    }>
  }
  internalDate: string
}

interface OutlookMessage {
  id: string
  conversationId: string
  subject: string
  bodyPreview: string
  body: { contentType: string; content: string }
  from: { emailAddress: { address: string; name: string } }
  toRecipients: Array<{ emailAddress: { address: string; name: string } }>
  ccRecipients: Array<{ emailAddress: { address: string; name: string } }>
  receivedDateTime: string
  sentDateTime: string
  isRead: boolean
  hasAttachments: boolean
  attachments?: Array<{
    id: string
    name: string
    contentType: string
    size: number
  }>
}

interface SyncResult {
  accountId: string
  emailsFetched: number
  emailsCreated: number
  emailsUpdated: number
  error?: string
}

// Google OAuth token refresh
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Google token refresh failed: ${error.error_description || error.error}`)
  }

  return await response.json()
}

// Microsoft OAuth token refresh
async function refreshMicrosoftToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    throw new Error('Microsoft OAuth credentials not configured')
  }

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Microsoft token refresh failed: ${error.error_description || error.error}`)
  }

  return await response.json()
}

// Sync emails from Gmail
async function syncGmailEmails(
  supabase: ReturnType<typeof createClient>,
  account: EmailAccount,
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = {
    accountId: account.id,
    emailsFetched: 0,
    emailsCreated: 0,
    emailsUpdated: 0,
  }

  try {
    // Build query for fetching messages
    const query = account.last_sync_at
      ? `after:${Math.floor(new Date(account.last_sync_at).getTime() / 1000)}`
      : `after:${Math.floor(new Date(account.sync_from_date).getTime() / 1000)}`

    // List messages
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!listResponse.ok) {
      throw new Error(`Gmail API error: ${listResponse.statusText}`)
    }

    const listData = await listResponse.json()
    const messageIds = listData.messages || []
    result.emailsFetched = messageIds.length

    // Fetch each message's details
    for (const { id } of messageIds.slice(0, 50)) { // Limit to 50 per sync
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      if (!msgResponse.ok) continue

      const message: GmailMessage = await msgResponse.json()

      // Parse headers
      const headers = Object.fromEntries(
        message.payload.headers.map((h) => [h.name.toLowerCase(), h.value])
      )

      // Get body content
      let bodyText = ''
      let bodyHtml = ''
      if (message.payload.body?.data) {
        bodyText = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
      } else if (message.payload.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            bodyText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            bodyHtml = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
          }
        }
      }

      // Parse attachments
      const attachments = message.payload.parts
        ?.filter((p) => p.filename && p.body?.attachmentId)
        .map((p) => ({
          id: p.body?.attachmentId,
          name: p.filename,
          mime_type: p.mimeType,
          size: p.body?.size || 0,
        })) || []

      // Find or create thread
      let threadId: string | null = null
      const { data: existingThread } = await supabase
        .from('email_threads')
        .select('id')
        .eq('account_id', account.id)
        .eq('thread_id', message.threadId)
        .single()

      if (existingThread) {
        threadId = existingThread.id
      } else {
        const { data: newThread } = await supabase
          .from('email_threads')
          .insert({
            account_id: account.id,
            thread_id: message.threadId,
            subject: headers['subject'] || '(No Subject)',
            snippet: message.snippet,
            participants: [
              { email: headers['from'], name: '' },
              ...parseRecipients(headers['to'] || ''),
            ],
            folder: message.labelIds.includes('INBOX') ? 'inbox' :
                    message.labelIds.includes('SENT') ? 'sent' :
                    message.labelIds.includes('DRAFT') ? 'drafts' :
                    message.labelIds.includes('TRASH') ? 'trash' : 'inbox',
          })
          .select('id')
          .single()

        threadId = newThread?.id || null
      }

      // Parse from address
      const fromMatch = headers['from']?.match(/^(.+?)\s*<(.+?)>$/)
      const fromName = fromMatch ? fromMatch[1].trim() : ''
      const fromAddress = fromMatch ? fromMatch[2] : headers['from']

      // Insert or update email
      const emailData = {
        account_id: account.id,
        thread_id: threadId,
        message_id: headers['message-id'] || id,
        provider_id: id,
        in_reply_to: headers['in-reply-to'] || null,
        references: headers['references']?.split(/\s+/) || [],
        from_address: fromAddress,
        from_name: fromName,
        to_addresses: parseRecipients(headers['to'] || ''),
        cc_addresses: parseRecipients(headers['cc'] || ''),
        subject: headers['subject'] || '(No Subject)',
        body_text: bodyText,
        body_html: bodyHtml,
        snippet: message.snippet,
        attachments: attachments,
        has_attachments: attachments.length > 0,
        is_read: !message.labelIds.includes('UNREAD'),
        is_starred: message.labelIds.includes('STARRED'),
        is_draft: message.labelIds.includes('DRAFT'),
        is_sent: message.labelIds.includes('SENT'),
        folder: message.labelIds.includes('INBOX') ? 'inbox' :
                message.labelIds.includes('SENT') ? 'sent' :
                message.labelIds.includes('DRAFT') ? 'drafts' :
                message.labelIds.includes('TRASH') ? 'trash' : 'inbox',
        date_sent: new Date(parseInt(message.internalDate)).toISOString(),
        date_received: new Date(parseInt(message.internalDate)).toISOString(),
      }

      const { error } = await supabase
        .from('emails')
        .upsert(emailData, { onConflict: 'account_id,message_id' })

      if (!error) {
        result.emailsCreated++
      }
    }

    return result
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
    return result
  }
}

// Sync emails from Outlook
async function syncOutlookEmails(
  supabase: ReturnType<typeof createClient>,
  account: EmailAccount,
  accessToken: string
): Promise<SyncResult> {
  const result: SyncResult = {
    accountId: account.id,
    emailsFetched: 0,
    emailsCreated: 0,
    emailsUpdated: 0,
  }

  try {
    // Build filter for fetching messages
    const filterDate = account.last_sync_at || account.sync_from_date
    const filter = `receivedDateTime ge ${new Date(filterDate).toISOString()}`

    // List messages
    const listResponse = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages?$filter=${encodeURIComponent(filter)}&$top=100&$orderby=receivedDateTime desc`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!listResponse.ok) {
      throw new Error(`Outlook API error: ${listResponse.statusText}`)
    }

    const listData = await listResponse.json()
    const messages: OutlookMessage[] = listData.value || []
    result.emailsFetched = messages.length

    // Process each message
    for (const message of messages.slice(0, 50)) {
      // Find or create thread
      let threadId: string | null = null
      const { data: existingThread } = await supabase
        .from('email_threads')
        .select('id')
        .eq('account_id', account.id)
        .eq('thread_id', message.conversationId)
        .single()

      if (existingThread) {
        threadId = existingThread.id
      } else {
        const { data: newThread } = await supabase
          .from('email_threads')
          .insert({
            account_id: account.id,
            thread_id: message.conversationId,
            subject: message.subject || '(No Subject)',
            snippet: message.bodyPreview,
            participants: [
              { email: message.from.emailAddress.address, name: message.from.emailAddress.name },
              ...message.toRecipients.map((r) => ({ email: r.emailAddress.address, name: r.emailAddress.name })),
            ],
            folder: 'inbox',
          })
          .select('id')
          .single()

        threadId = newThread?.id || null
      }

      // Prepare attachments
      const attachments = message.attachments?.map((a) => ({
        id: a.id,
        name: a.name,
        mime_type: a.contentType,
        size: a.size,
      })) || []

      // Insert or update email
      const emailData = {
        account_id: account.id,
        thread_id: threadId,
        message_id: message.id, // Outlook uses ID as message ID
        provider_id: message.id,
        from_address: message.from.emailAddress.address,
        from_name: message.from.emailAddress.name,
        to_addresses: message.toRecipients.map((r) => ({ email: r.emailAddress.address, name: r.emailAddress.name })),
        cc_addresses: message.ccRecipients.map((r) => ({ email: r.emailAddress.address, name: r.emailAddress.name })),
        subject: message.subject || '(No Subject)',
        body_text: message.body.contentType === 'text' ? message.body.content : '',
        body_html: message.body.contentType === 'html' ? message.body.content : '',
        snippet: message.bodyPreview,
        attachments: attachments,
        has_attachments: message.hasAttachments,
        is_read: message.isRead,
        folder: 'inbox',
        date_sent: message.sentDateTime,
        date_received: message.receivedDateTime,
      }

      const { error } = await supabase
        .from('emails')
        .upsert(emailData, { onConflict: 'account_id,message_id' })

      if (!error) {
        result.emailsCreated++
      }
    }

    return result
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
    return result
  }
}

// Parse email recipients from header string
function parseRecipients(header: string): Array<{ email: string; name: string }> {
  if (!header) return []

  const recipients: Array<{ email: string; name: string }> = []
  const parts = header.split(',')

  for (const part of parts) {
    const trimmed = part.trim()
    const match = trimmed.match(/^(.+?)\s*<(.+?)>$/)
    if (match) {
      recipients.push({ name: match[1].trim().replace(/^"|"$/g, ''), email: match[2] })
    } else if (trimmed.includes('@')) {
      recipients.push({ name: '', email: trimmed })
    }
  }

  return recipients
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all active accounts that need syncing
    const { data: accounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .eq('sync_enabled', true)
      .or(`last_sync_at.is.null,last_sync_at.lt.${new Date(Date.now() - 5 * 60 * 1000).toISOString()}`)
      .limit(10) // Process 10 accounts per run

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`)
    }

    const results: SyncResult[] = []

    for (const account of accounts || []) {
      // Create sync log entry
      const { data: syncLog } = await supabase
        .from('email_sync_logs')
        .insert({
          account_id: account.id,
          sync_type: account.last_sync_at ? 'incremental' : 'full',
          status: 'syncing',
        })
        .select('id')
        .single()

      // Update account sync status
      await supabase
        .from('email_accounts')
        .update({ sync_status: 'syncing' })
        .eq('id', account.id)

      let result: SyncResult
      let accessToken = account.access_token

      try {
        // Check if token needs refresh
        if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
          if (!account.refresh_token) {
            throw new Error('Token expired and no refresh token available')
          }

          if (account.provider === 'gmail') {
            const tokens = await refreshGoogleToken(account.refresh_token)
            accessToken = tokens.access_token

            await supabase
              .from('email_accounts')
              .update({
                access_token: tokens.access_token,
                token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              })
              .eq('id', account.id)
          } else if (account.provider === 'outlook') {
            const tokens = await refreshMicrosoftToken(account.refresh_token)
            accessToken = tokens.access_token

            await supabase
              .from('email_accounts')
              .update({
                access_token: tokens.access_token,
                token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              })
              .eq('id', account.id)
          }
        }

        // Sync based on provider
        if (!accessToken) {
          throw new Error('No access token available')
        }

        if (account.provider === 'gmail') {
          result = await syncGmailEmails(supabase, account, accessToken)
        } else if (account.provider === 'outlook') {
          result = await syncOutlookEmails(supabase, account, accessToken)
        } else {
          // IMAP sync would be implemented here
          result = {
            accountId: account.id,
            emailsFetched: 0,
            emailsCreated: 0,
            emailsUpdated: 0,
            error: 'IMAP sync not yet implemented',
          }
        }

        // Update sync log
        await supabase
          .from('email_sync_logs')
          .update({
            completed_at: new Date().toISOString(),
            status: result.error ? 'failed' : 'completed',
            emails_fetched: result.emailsFetched,
            emails_created: result.emailsCreated,
            emails_updated: result.emailsUpdated,
            error_message: result.error,
          })
          .eq('id', syncLog?.id)

        // Update account status
        await supabase
          .from('email_accounts')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_status: result.error ? 'failed' : 'completed',
            sync_error: result.error || null,
          })
          .eq('id', account.id)

        results.push(result)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Update sync log with error
        if (syncLog?.id) {
          await supabase
            .from('email_sync_logs')
            .update({
              completed_at: new Date().toISOString(),
              status: 'failed',
              error_message: errorMessage,
            })
            .eq('id', syncLog.id)
        }

        // Update account status
        await supabase
          .from('email_accounts')
          .update({
            sync_status: 'failed',
            sync_error: errorMessage,
          })
          .eq('id', account.id)

        results.push({
          accountId: account.id,
          emailsFetched: 0,
          emailsCreated: 0,
          emailsUpdated: 0,
          error: errorMessage,
        })
      }
    }

    console.log(`Email sync completed. Processed ${results.length} accounts.`)

    return new Response(
      JSON.stringify({
        success: true,
        accountsProcessed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Email sync error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
