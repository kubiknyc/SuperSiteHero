/**
 * Email Service
 *
 * Provider-agnostic email service abstraction.
 * Supports multiple email providers:
 * - Resend via Edge Function (recommended for production - secure, no API key in browser)
 * - Console (development mode - logs to console)
 *
 * Configuration via environment variables:
 * - VITE_EMAIL_PROVIDER: 'resend' | 'console'
 * - VITE_SUPABASE_URL: Supabase project URL (for Edge Function calls)
 * - VITE_SUPABASE_ANON_KEY: Supabase anon key (for authentication)
 */

import { supabase } from '../supabase'

// ============================================================================
// Types
// ============================================================================

export interface EmailRecipient {
  email: string
  name?: string
}

export interface EmailAttachment {
  filename: string
  content: string // Base64 encoded
  contentType: string
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[]
  subject: string
  html: string
  text?: string
  cc?: EmailRecipient[]
  bcc?: EmailRecipient[]
  replyTo?: EmailRecipient
  attachments?: EmailAttachment[]
  tags?: string[] // For tracking/categorization
}

export interface SendTemplatedEmailOptions {
  to: EmailRecipient | EmailRecipient[]
  templateId: string
  templateData: Record<string, any>
  cc?: EmailRecipient[]
  bcc?: EmailRecipient[]
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailProvider {
  send(options: SendEmailOptions): Promise<EmailResult>
  sendTemplated?(options: SendTemplatedEmailOptions): Promise<EmailResult>
}

// ============================================================================
// Console Provider (Development)
// ============================================================================

class ConsoleEmailProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<EmailResult> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to]

    console.log('========================================')
    console.log('[EMAIL] Sending email (console mode)')
    console.log('========================================')
    console.log('To:', recipients.map(r => `${r.name || ''} <${r.email}>`).join(', '))
    console.log('Subject:', options.subject)
    console.log('----------------------------------------')
    console.log('HTML Content:')
    console.log(options.html)
    console.log('----------------------------------------')
    if (options.text) {
      console.log('Text Content:')
      console.log(options.text)
    }
    console.log('========================================')

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    }
  }

  async sendTemplated(options: SendTemplatedEmailOptions): Promise<EmailResult> {
    console.log('========================================')
    console.log('[EMAIL] Sending templated email (console mode)')
    console.log('========================================')
    console.log('Template ID:', options.templateId)
    console.log('Template Data:', JSON.stringify(options.templateData, null, 2))
    console.log('========================================')

    return {
      success: true,
      messageId: `console-template-${Date.now()}`,
    }
  }
}

// ============================================================================
// Resend Edge Function Provider (Production - Secure)
// ============================================================================

class ResendEdgeFunctionProvider implements EmailProvider {
  async send(options: SendEmailOptions): Promise<EmailResult> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to]

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: recipients,
          subject: options.subject,
          html: options.html,
          text: options.text,
          cc: options.cc,
          bcc: options.bcc,
          reply_to: options.replyTo,
          attachments: options.attachments?.map(a => ({
            filename: a.filename,
            content: a.content,
            content_type: a.contentType,
          })),
          tags: options.tags,
        },
      })

      if (error) {
        console.error('[Resend Edge Function] Error:', error)
        return {
          success: false,
          error: error.message || 'Edge function error',
        }
      }

      if (!data?.success) {
        return {
          success: false,
          error: data?.error || 'Unknown error from edge function',
        }
      }

      return {
        success: true,
        messageId: data.message_id,
      }
    } catch (error) {
      console.error('[Resend Edge Function] Exception:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Resend doesn't use external templates - we generate HTML locally
  async sendTemplated(options: SendTemplatedEmailOptions): Promise<EmailResult> {
    console.warn('[Resend] Template emails should use local HTML generation, not external templates')
    return {
      success: false,
      error: 'Use local HTML templates with Resend instead of external template IDs',
    }
  }
}

// ============================================================================
// Email Service (Singleton)
// ============================================================================

class EmailService {
  private provider: EmailProvider
  private static instance: EmailService

  private constructor() {
    const providerType = import.meta.env.VITE_EMAIL_PROVIDER || 'console'

    switch (providerType) {
      case 'resend':
        this.provider = new ResendEdgeFunctionProvider()
        console.log('[EmailService] Using Resend provider (via Edge Function)')
        break
      case 'console':
      default:
        this.provider = new ConsoleEmailProvider()
        console.log('[EmailService] Using Console provider (development mode)')
    }
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  /**
   * Send an email
   */
  async send(options: SendEmailOptions): Promise<EmailResult> {
    return this.provider.send(options)
  }

  /**
   * Send a templated email (if provider supports it)
   */
  async sendTemplated(options: SendTemplatedEmailOptions): Promise<EmailResult> {
    if (this.provider.sendTemplated) {
      return this.provider.sendTemplated(options)
    }

    // Fallback: just log for providers without template support
    console.warn('[EmailService] Template emails not supported by current provider')
    return {
      success: false,
      error: 'Template emails not supported',
    }
  }

  /**
   * Check if email service is properly configured
   */
  isConfigured(): boolean {
    const provider = import.meta.env.VITE_EMAIL_PROVIDER || 'console'

    if (provider === 'console') {
      return true // Console always works
    }

    if (provider === 'resend') {
      // Resend uses Edge Function, so just need Supabase to be configured
      return !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY
    }

    return false
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance()

// Export convenience function
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  return emailService.send(options)
}

export async function sendTemplatedEmail(options: SendTemplatedEmailOptions): Promise<EmailResult> {
  return emailService.sendTemplated(options)
}
