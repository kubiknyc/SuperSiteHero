/**
 * Certificate Renewal Reminder Service
 *
 * Manages automatic reminders and escalations for expiring certificates.
 * Supports insurance certificates, licenses, and certifications.
 * Integrates with the notification service for email and in-app notifications.
 */

import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/email-service'
import {
  generateCertificateRenewalEmail,
  generateCertificateExpiredEmail,
} from '@/lib/email/templates/certificate-renewal'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export type CertificateType = 'insurance' | 'license' | 'certification'
export type EscalationLevel = 'first' | 'second' | 'third' | 'expired'

export interface Certificate {
  id: string
  company_id: string
  subcontractor_id?: string
  certificate_type: CertificateType
  name: string
  policy_number?: string
  carrier?: string
  coverage_amount?: number
  expiration_date: string
  document_url?: string
  status: 'active' | 'expiring' | 'expired' | 'pending'
  reminder_sent_at?: string
  vendor_name?: string
  vendor_email?: string
  project_id?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface CertificateWithDetails extends Certificate {
  project?: {
    id: string
    name: string
  }
  subcontractor?: {
    id: string
    company_name: string
    contact_email: string | null
  }
}

export interface ReminderConfig {
  firstReminderDays: number       // Days before expiration for first reminder (default: 90)
  secondReminderDays: number      // Days before expiration for second reminder (default: 60)
  thirdReminderDays: number       // Days before expiration for third reminder (default: 30)
  expiredReminderFrequency: number // How often to send expired reminders in days (default: 7)
  escalateExpiredAfterDays: number // Days expired before escalating to PM (default: 7)
  sendEmail: boolean
  sendInApp: boolean
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  firstReminderDays: 90,
  secondReminderDays: 60,
  thirdReminderDays: 30,
  expiredReminderFrequency: 7,
  escalateExpiredAfterDays: 7,
  sendEmail: true,
  sendInApp: true,
}

export interface ReminderResult {
  certificateId: string
  certificateName: string
  escalationLevel: EscalationLevel
  recipientEmail: string
  success: boolean
  error?: string
}

export interface ReminderBatchResult {
  processedCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
  results: ReminderResult[]
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate days until expiration or days expired
 */
function calculateDaysFromExpiration(expirationDate: string): number {
  const expiration = new Date(expirationDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiration.setHours(0, 0, 0, 0)

  const diffTime = expiration.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Determine escalation level based on days until expiration
 */
function determineEscalationLevel(
  daysUntilExpiration: number,
  config: ReminderConfig
): EscalationLevel | null {
  if (daysUntilExpiration < 0) {
    return 'expired'
  } else if (daysUntilExpiration <= config.thirdReminderDays) {
    return 'third'
  } else if (daysUntilExpiration <= config.secondReminderDays) {
    return 'second'
  } else if (daysUntilExpiration <= config.firstReminderDays) {
    return 'first'
  }
  return null
}

/**
 * Check if reminder should be sent based on last reminder date
 */
function shouldSendReminder(
  certificate: CertificateWithDetails,
  escalationLevel: EscalationLevel,
  config: ReminderConfig
): boolean {
  if (!certificate.reminder_sent_at) {
    return true
  }

  const lastReminderDate = new Date(certificate.reminder_sent_at)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  lastReminderDate.setHours(0, 0, 0, 0)

  const daysSinceLastReminder = Math.floor(
    (today.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (escalationLevel === 'expired') {
    // For expired, respect the frequency setting
    return daysSinceLastReminder >= config.expiredReminderFrequency
  }

  // For pre-expiration reminders, send if we haven't reminded in last 7 days
  // or if we've moved to a higher escalation level
  return daysSinceLastReminder >= 7
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ============================================================================
// Certificate Reminder Service
// ============================================================================

export const certificateReminderService = {
  /**
   * Get all certificates that need reminders
   */
  async getCertificatesNeedingReminders(
    companyId: string,
    config: ReminderConfig = DEFAULT_REMINDER_CONFIG
  ): Promise<CertificateWithDetails[]> {
    // Calculate the earliest date we should check (first reminder threshold)
    const reminderDate = new Date()
    reminderDate.setDate(reminderDate.getDate() + config.firstReminderDays)

    const { data, error } = await supabase
      .from('insurance_certificates')
      .select(`
        *,
        project:projects(id, name),
        subcontractor:subcontractors(id, company_name, contact_email)
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'expiring'])
      .not('expiration_date', 'is', null)
      .lte('expiration_date', reminderDate.toISOString().split('T')[0])
      .is('deleted_at', null)
      .order('expiration_date', { ascending: true })

    if (error) {
      logger.error('[CertificateReminders] Failed to fetch certificates:', error)
      throw error
    }

    return (data || []) as CertificateWithDetails[]
  },

  /**
   * Get expired certificates specifically
   */
  async getExpiredCertificates(companyId: string): Promise<CertificateWithDetails[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('insurance_certificates')
      .select(`
        *,
        project:projects(id, name),
        subcontractor:subcontractors(id, company_name, contact_email)
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'expiring', 'expired'])
      .not('expiration_date', 'is', null)
      .lt('expiration_date', today)
      .is('deleted_at', null)
      .order('expiration_date', { ascending: true })

    if (error) {
      logger.error('[CertificateReminders] Failed to fetch expired certificates:', error)
      throw error
    }

    return (data || []) as CertificateWithDetails[]
  },

  /**
   * Get project manager email for a project
   */
  async getProjectManagerEmail(projectId: string): Promise<{ email: string; name: string } | null> {
    const { data } = await supabase
      .from('project_team_members')
      .select(`
        users!inner(id, email, full_name)
      `)
      .eq('project_id', projectId)
      .in('role', ['project_manager', 'pm', 'owner'])
      .limit(1)
      .single()

    if (data?.users) {
      const users = data.users as { email: string; full_name: string }
      return {
        email: users.email,
        name: users.full_name,
      }
    }
    return null
  },

  /**
   * Send reminder for a single certificate
   */
  async sendCertificateReminder(
    certificate: CertificateWithDetails,
    escalationLevel: EscalationLevel,
    config: ReminderConfig = DEFAULT_REMINDER_CONFIG
  ): Promise<ReminderResult> {
    const appUrl = import.meta.env?.VITE_APP_URL || 'https://JobSight.com'
    const daysFromExpiration = calculateDaysFromExpiration(certificate.expiration_date)

    // Determine recipient
    let recipientEmail = certificate.vendor_email
    let recipientName = certificate.vendor_name || certificate.subcontractor?.company_name || 'Vendor'

    if (!recipientEmail && certificate.subcontractor?.contact_email) {
      recipientEmail = certificate.subcontractor.contact_email
      recipientName = certificate.subcontractor.company_name
    }

    // If expired and beyond escalation threshold, also notify PM
    const shouldEscalateToPM = escalationLevel === 'expired' &&
      Math.abs(daysFromExpiration) >= config.escalateExpiredAfterDays

    // Get PM info if escalating
    let pmInfo: { email: string; name: string } | null = null
    if (shouldEscalateToPM && certificate.project_id) {
      pmInfo = await this.getProjectManagerEmail(certificate.project_id)
    }

    // Must have at least one recipient
    if (!recipientEmail && !pmInfo) {
      return {
        certificateId: certificate.id,
        certificateName: certificate.name,
        escalationLevel,
        recipientEmail: 'none',
        success: false,
        error: 'No recipient email found',
      }
    }

    try {
      const viewUrl = certificate.project_id
        ? `${appUrl}/projects/${certificate.project_id}/insurance/${certificate.id}`
        : `${appUrl}/insurance/${certificate.id}`
      const uploadUrl = `${viewUrl}/upload`

      // Generate and send appropriate email
      if (escalationLevel === 'expired') {
        const emailData = {
          recipientName,
          certificateType: certificate.certificate_type,
          certificateName: certificate.name,
          vendorName: certificate.vendor_name || certificate.subcontractor?.company_name || 'Vendor',
          projectName: certificate.project?.name,
          expirationDate: formatDate(certificate.expiration_date),
          daysExpired: Math.abs(daysFromExpiration),
          viewUrl,
          uploadUrl,
          projectManager: pmInfo?.name,
          blocksWork: true,
        }

        if (recipientEmail && config.sendEmail) {
          const { html, text } = generateCertificateExpiredEmail(emailData)
          await sendEmail({
            to: { email: recipientEmail, name: recipientName },
            subject: `EXPIRED: ${certificate.name} - ${certificate.vendor_name || certificate.subcontractor?.company_name}`,
            html,
            text,
            tags: ['certificate', 'expired', 'reminder'],
          })
        }

        // Send escalation to PM
        if (pmInfo && config.sendEmail) {
          const pmEmailData = {
            ...emailData,
            recipientName: pmInfo.name,
          }
          const { html, text } = generateCertificateExpiredEmail(pmEmailData)
          await sendEmail({
            to: { email: pmInfo.email, name: pmInfo.name },
            subject: `ESCALATION: Expired Certificate ${certificate.name} - ${certificate.vendor_name}`,
            html,
            text,
            tags: ['certificate', 'expired', 'escalation'],
          })
        }
      } else {
        const emailData = {
          recipientName,
          certificateType: certificate.certificate_type,
          certificateName: certificate.name,
          vendorName: certificate.vendor_name || certificate.subcontractor?.company_name || 'Vendor',
          projectName: certificate.project?.name,
          expirationDate: formatDate(certificate.expiration_date),
          daysUntilExpiration: daysFromExpiration,
          escalationLevel,
          viewUrl,
          uploadUrl,
          policyNumber: certificate.policy_number,
          coverageAmount: certificate.coverage_amount,
        }

        if (recipientEmail && config.sendEmail) {
          const { html, text } = generateCertificateRenewalEmail(emailData)
          const urgencyLabels = { first: 'Advance Notice', second: 'Reminder', third: 'Final Notice' }
          await sendEmail({
            to: { email: recipientEmail, name: recipientName },
            subject: `${urgencyLabels[escalationLevel as keyof typeof urgencyLabels]}: ${certificate.name} Expires ${formatDate(certificate.expiration_date)}`,
            html,
            text,
            tags: ['certificate', 'reminder', escalationLevel],
          })
        }
      }

      // Update reminder_sent_at timestamp
      await supabase
        .from('insurance_certificates')
        .update({
          reminder_sent_at: new Date().toISOString(),
          status: escalationLevel === 'expired' ? 'expired' : 'expiring'
        })
        .eq('id', certificate.id)

      // Create in-app notification if enabled
      if (config.sendInApp) {
        // Get user ID from email for in-app notification
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('email', recipientEmail || pmInfo?.email)
          .single()

        if (user) {
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: escalationLevel === 'expired' ? 'certificate_expired' : 'certificate_expiring',
              title: escalationLevel === 'expired'
                ? `Expired: ${certificate.name}`
                : `Certificate Expiring: ${certificate.name}`,
              message: escalationLevel === 'expired'
                ? `${certificate.name} for ${certificate.vendor_name} expired ${Math.abs(daysFromExpiration)} days ago.`
                : `${certificate.name} for ${certificate.vendor_name} expires in ${daysFromExpiration} day(s).`,
              related_to_type: 'insurance_certificate',
              related_to_id: certificate.id,
            })
        }
      }

      logger.info(`[CertificateReminders] Sent ${escalationLevel} reminder for certificate ${certificate.name}`)

      return {
        certificateId: certificate.id,
        certificateName: certificate.name,
        escalationLevel,
        recipientEmail: recipientEmail || pmInfo?.email || 'escalated',
        success: true,
      }
    } catch (error) {
      logger.error(`[CertificateReminders] Failed to send reminder for certificate ${certificate.name}:`, error)
      return {
        certificateId: certificate.id,
        certificateName: certificate.name,
        escalationLevel,
        recipientEmail: recipientEmail || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Process all pending reminders for a company
   * This is the main entry point for scheduled/cron jobs
   */
  async processReminders(
    companyId: string,
    config: ReminderConfig = DEFAULT_REMINDER_CONFIG
  ): Promise<ReminderBatchResult> {
    const result: ReminderBatchResult = {
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: [],
    }

    try {
      const certificates = await this.getCertificatesNeedingReminders(companyId, config)
      result.processedCount = certificates.length

      for (const certificate of certificates) {
        if (!certificate.expiration_date) {
          result.skippedCount++
          continue
        }

        const daysFromExpiration = calculateDaysFromExpiration(certificate.expiration_date)
        const escalationLevel = determineEscalationLevel(daysFromExpiration, config)

        if (!escalationLevel) {
          result.skippedCount++
          continue
        }

        // Check if we should send based on last reminder
        if (!shouldSendReminder(certificate, escalationLevel, config)) {
          result.skippedCount++
          continue
        }

        const reminderResult = await this.sendCertificateReminder(certificate, escalationLevel, config)
        result.results.push(reminderResult)

        if (reminderResult.success) {
          result.sentCount++
        } else {
          result.failedCount++
        }
      }

      logger.info(`[CertificateReminders] Processed ${result.processedCount} certificates, sent ${result.sentCount} reminders`)
      return result
    } catch (error) {
      logger.error('[CertificateReminders] Failed to process reminders:', error)
      throw error
    }
  },

  /**
   * Get reminder statistics for a company
   */
  async getReminderStats(companyId: string): Promise<{
    totalActive: number
    expiringIn90Days: number
    expiringIn60Days: number
    expiringIn30Days: number
    expired: number
    oldestExpiredDays: number
  }> {
    const { data: certificates, error } = await supabase
      .from('insurance_certificates')
      .select('expiration_date, status')
      .eq('company_id', companyId)
      .in('status', ['active', 'expiring', 'expired'])
      .not('expiration_date', 'is', null)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    const stats = {
      totalActive: certificates?.length || 0,
      expiringIn90Days: 0,
      expiringIn60Days: 0,
      expiringIn30Days: 0,
      expired: 0,
      oldestExpiredDays: 0,
    }

    certificates?.forEach((c: { expiration_date: string }) => {
      const days = calculateDaysFromExpiration(c.expiration_date)
      if (days < 0) {
        stats.expired++
        stats.oldestExpiredDays = Math.max(stats.oldestExpiredDays, Math.abs(days))
      } else if (days <= 30) {
        stats.expiringIn30Days++
      } else if (days <= 60) {
        stats.expiringIn60Days++
      } else if (days <= 90) {
        stats.expiringIn90Days++
      }
    })

    return stats
  },
}

export default certificateReminderService
