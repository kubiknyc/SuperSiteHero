// Supabase Edge Function: send-email
// Secure email sending via Resend API
// API key stored as Supabase secret, never exposed to client

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Types
interface EmailRecipient {
  email: string
  name?: string
}

interface EmailAttachment {
  filename: string
  content: string // Base64 encoded
  content_type: string
}

interface SendEmailRequest {
  to: EmailRecipient | EmailRecipient[]
  subject: string
  html: string
  text?: string
  cc?: EmailRecipient[]
  bcc?: EmailRecipient[]
  reply_to?: EmailRecipient
  attachments?: EmailAttachment[]
  tags?: string[]
  // For logging
  template_name?: string
  recipient_user_id?: string
}

interface ResendEmailPayload {
  from: string
  to: string[]
  subject: string
  html: string
  text?: string
  cc?: string[]
  bcc?: string[]
  reply_to?: string
  attachments?: Array<{
    filename: string
    content: string
    content_type: string
  }>
  tags?: Array<{
    name: string
    value: string
  }>
}

interface EmailResult {
  success: boolean
  message_id?: string
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom = Deno.env.get('EMAIL_FROM') || 'SuperSiteHero <noreply@supersitehero.com>'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    // Verify authentication (optional but recommended)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Parse request
    const request: SendEmailRequest = await req.json()
    const { to, subject, html, text, cc, bcc, reply_to, attachments, tags, template_name, recipient_user_id } = request

    if (!to || !subject || !html) {
      throw new Error('Missing required fields: to, subject, and html are required')
    }

    // Normalize recipients to array
    const toRecipients = Array.isArray(to) ? to : [to]
    const toEmails = toRecipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email)

    // Build Resend payload
    const resendPayload: ResendEmailPayload = {
      from: emailFrom,
      to: toEmails,
      subject,
      html,
    }

    if (text) {
      resendPayload.text = text
    }

    if (cc && cc.length > 0) {
      resendPayload.cc = cc.map(r => r.name ? `${r.name} <${r.email}>` : r.email)
    }

    if (bcc && bcc.length > 0) {
      resendPayload.bcc = bcc.map(r => r.name ? `${r.name} <${r.email}>` : r.email)
    }

    if (reply_to) {
      resendPayload.reply_to = reply_to.name ? `${reply_to.name} <${reply_to.email}>` : reply_to.email
    }

    if (attachments && attachments.length > 0) {
      resendPayload.attachments = attachments.map(a => ({
        filename: a.filename,
        content: a.content,
        content_type: a.content_type,
      }))
    }

    if (tags && tags.length > 0) {
      resendPayload.tags = tags.map(tag => ({ name: 'category', value: tag }))
    }

    console.log(`Sending email to: ${toEmails.join(', ')} | Subject: ${subject}`)

    // Call Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendPayload),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData)
      throw new Error(resendData.message || `Resend API error: ${resendResponse.status}`)
    }

    const messageId = resendData.id

    console.log(`Email sent successfully. Message ID: ${messageId}`)

    // Log email to database (Phase 6 requirement)
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      await supabase.from('email_logs').insert({
        recipient_email: toEmails[0], // Primary recipient
        recipient_user_id: recipient_user_id || null,
        template_name: template_name || 'custom',
        subject,
        status: 'sent',
        resend_id: messageId,
        metadata: {
          to_count: toEmails.length,
          cc_count: cc?.length || 0,
          bcc_count: bcc?.length || 0,
          has_attachments: (attachments?.length || 0) > 0,
          tags,
        },
      })
    } catch (logError) {
      // Don't fail the email send if logging fails
      console.warn('Failed to log email:', logError)
    }

    const result: EmailResult = {
      success: true,
      message_id: messageId,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Send email error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    const result: EmailResult = {
      success: false,
      error: errorMessage,
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof Error && error.message.includes('Missing') ? 400 : 500,
    })
  }
})
