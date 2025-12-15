/**
 * Supabase Edge Function: send-composed-email
 *
 * Sends an email via the user's connected email account:
 * - Uses Gmail API or Microsoft Graph API
 * - Saves sent email to database
 * - Creates entity links if specified
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailParticipant {
  email: string
  name?: string
}

interface SendEmailRequest {
  account_id: string
  to: EmailParticipant[]
  cc?: EmailParticipant[]
  bcc?: EmailParticipant[]
  subject: string
  body_html: string
  body_text?: string
  reply_to_email_id?: string
  link_to_entity?: {
    entity_type: string
    entity_id: string
  }
}

interface EmailAccount {
  id: string
  email_address: string
  provider: 'gmail' | 'outlook' | 'imap'
  access_token: string
  refresh_token: string
  token_expires_at: string
}

// Refresh Google token
async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh Google token')
  }

  return await response.json()
}

// Refresh Microsoft token
async function refreshMicrosoftToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')
  const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')

  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/Mail.Send offline_access',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh Microsoft token')
  }

  return await response.json()
}

// Format recipient for email header
function formatRecipient(r: EmailParticipant): string {
  return r.name ? `${r.name} <${r.email}>` : r.email
}

// Send email via Gmail API
async function sendViaGmail(
  accessToken: string,
  from: string,
  to: EmailParticipant[],
  cc: EmailParticipant[] | undefined,
  bcc: EmailParticipant[] | undefined,
  subject: string,
  bodyHtml: string,
  bodyText?: string
): Promise<{ messageId: string; threadId: string }> {
  // Build MIME message
  const boundary = `boundary_${Date.now()}`

  let mime = `From: ${from}\r\n`
  mime += `To: ${to.map(formatRecipient).join(', ')}\r\n`
  if (cc && cc.length > 0) {
    mime += `Cc: ${cc.map(formatRecipient).join(', ')}\r\n`
  }
  if (bcc && bcc.length > 0) {
    mime += `Bcc: ${bcc.map(formatRecipient).join(', ')}\r\n`
  }
  mime += `Subject: ${subject}\r\n`
  mime += `MIME-Version: 1.0\r\n`
  mime += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`

  // Plain text part
  if (bodyText) {
    mime += `--${boundary}\r\n`
    mime += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`
    mime += `${bodyText}\r\n\r\n`
  }

  // HTML part
  mime += `--${boundary}\r\n`
  mime += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`
  mime += `${bodyHtml}\r\n\r\n`
  mime += `--${boundary}--`

  // Base64url encode
  const encodedMessage = btoa(mime)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  // Send via Gmail API
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedMessage }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Gmail API error: ${error.error?.message || response.statusText}`)
  }

  const result = await response.json()
  return { messageId: result.id, threadId: result.threadId }
}

// Send email via Microsoft Graph API
async function sendViaOutlook(
  accessToken: string,
  to: EmailParticipant[],
  cc: EmailParticipant[] | undefined,
  bcc: EmailParticipant[] | undefined,
  subject: string,
  bodyHtml: string
): Promise<{ messageId: string }> {
  const emailPayload = {
    message: {
      subject,
      body: {
        contentType: 'HTML',
        content: bodyHtml,
      },
      toRecipients: to.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
      ccRecipients: cc?.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
      bccRecipients: bcc?.map((r) => ({
        emailAddress: { address: r.email, name: r.name },
      })),
    },
    saveToSentItems: true,
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Outlook API error: ${error.error?.message || response.statusText}`)
  }

  // Microsoft doesn't return message ID on send, generate one
  return { messageId: `outlook-${Date.now()}` }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Get user from JWT
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Invalid authentication')
    }

    // Parse request
    const request: SendEmailRequest = await req.json()

    if (!request.account_id || !request.to || request.to.length === 0 || !request.subject || !request.body_html) {
      throw new Error('Missing required fields')
    }

    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', request.account_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (accountError || !account) {
      throw new Error('Email account not found or not authorized')
    }

    // Check if token needs refresh
    let accessToken = account.access_token
    if (new Date(account.token_expires_at) < new Date()) {
      console.log('Refreshing expired token...')

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

    // Send email based on provider
    let sendResult: { messageId: string; threadId?: string }

    if (account.provider === 'gmail') {
      sendResult = await sendViaGmail(
        accessToken,
        account.email_address,
        request.to,
        request.cc,
        request.bcc,
        request.subject,
        request.body_html,
        request.body_text
      )
    } else if (account.provider === 'outlook') {
      sendResult = await sendViaOutlook(
        accessToken,
        request.to,
        request.cc,
        request.bcc,
        request.subject,
        request.body_html
      )
    } else {
      throw new Error(`Sending via ${account.provider} not yet supported`)
    }

    console.log(`Email sent successfully: ${sendResult.messageId}`)

    // Save email to database
    const { data: savedEmail, error: saveError } = await supabase
      .from('emails')
      .insert({
        account_id: account.id,
        message_id: sendResult.messageId,
        provider_id: sendResult.messageId,
        from_address: account.email_address,
        from_name: account.display_name,
        to_addresses: request.to,
        cc_addresses: request.cc || [],
        bcc_addresses: request.bcc || [],
        subject: request.subject,
        body_html: request.body_html,
        body_text: request.body_text || '',
        snippet: request.body_text?.substring(0, 200) || request.subject,
        is_read: true,
        is_sent: true,
        folder: 'sent',
        date_sent: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) {
      console.warn('Failed to save sent email to database:', saveError)
    }

    // Create entity link if specified
    if (request.link_to_entity && savedEmail) {
      await supabase.from('email_entity_links').insert({
        email_id: savedEmail.id,
        entity_type: request.link_to_entity.entity_type,
        entity_id: request.link_to_entity.entity_id,
        link_type: 'auto',
        created_by: user.id,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message_id: sendResult.messageId,
        email_id: savedEmail?.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('send-composed-email error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && error.message.includes('Missing') ? 400 : 500,
      }
    )
  }
})
