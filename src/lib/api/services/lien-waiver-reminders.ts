/**
 * Lien Waiver Reminder Service
 *
 * Manages automatic reminders and escalations for pending lien waivers.
 * Integrates with the notification service for email and in-app notifications.
 */

import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/email-service'
import {
  generateLienWaiverReminderEmail,
  generateLienWaiverOverdueEmail,
} from '@/lib/email/templates'
import { logger } from '@/lib/utils/logger'
import type { LienWaiver } from '@/types/lien-waiver'

// Using extended Database types for tables not yet in generated types
const db: any = supabase

// ============================================================================
// Types
// ============================================================================

export type EscalationLevel = 'first' | 'second' | 'third' | 'overdue'

export interface WaiverReminderConfig {
  firstReminderDays: number       // Days before due date for first reminder (default: 7)
  secondReminderDays: number      // Days before due date for second reminder (default: 3)
  thirdReminderDays: number       // Days before due date for third reminder (default: 1)
  overdueReminderFrequency: number // How often to send overdue reminders in days (default: 1)
  escalateOverdueAfterDays: number // Days overdue before escalating to PM (default: 3)
  sendEmail: boolean
  sendInApp: boolean
}

export const DEFAULT_REMINDER_CONFIG: WaiverReminderConfig = {
  firstReminderDays: 7,
  secondReminderDays: 3,
  thirdReminderDays: 1,
  overdueReminderFrequency: 1,
  escalateOverdueAfterDays: 3,
  sendEmail: true,
  sendInApp: true,
}

export interface WaiverWithDetails extends LienWaiver {
  project?: {
    id: string
    name: string
    project_number: string | null
  }
  subcontractor?: {
    id: string
    company_name: string
    contact_email: string | null
  }
  payment_application?: {
    id: string
    application_number: number
  }
}

export interface ReminderResult {
  waiverId: string
  waiverNumber: string
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
 * Calculate days until due or days overdue
 */
function calculateDaysFromDue(dueDate: string): number {
  // Parse date string as local date (add T00:00:00 to force local interpretation)
  // This avoids timezone issues when parsing "YYYY-MM-DD" format
  const due = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Determine escalation level based on days until due
 */
function determineEscalationLevel(
  daysUntilDue: number,
  config: WaiverReminderConfig
): EscalationLevel | null {
  if (daysUntilDue < 0) {
    return 'overdue'
  } else if (daysUntilDue <= config.thirdReminderDays) {
    return 'third'
  } else if (daysUntilDue <= config.secondReminderDays) {
    return 'second'
  } else if (daysUntilDue <= config.firstReminderDays) {
    return 'first'
  }
  return null
}

/**
 * Check if reminder should be sent based on last reminder date
 */
function shouldSendReminder(
  waiver: WaiverWithDetails,
  escalationLevel: EscalationLevel,
  config: WaiverReminderConfig
): boolean {
  if (!waiver.reminder_sent_at) {
    return true
  }

  const lastReminderDate = new Date(waiver.reminder_sent_at)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  lastReminderDate.setHours(0, 0, 0, 0)

  const daysSinceLastReminder = Math.floor(
    (today.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (escalationLevel === 'overdue') {
    // For overdue, respect the frequency setting
    return daysSinceLastReminder >= config.overdueReminderFrequency
  }

  // For pre-due reminders, send if we haven't reminded today
  return daysSinceLastReminder >= 1
}

/**
 * Get waiver type label
 */
function getWaiverTypeLabel(waiverType: string): string {
  const types: Record<string, string> = {
    conditional_progress: 'Conditional Progress',
    unconditional_progress: 'Unconditional Progress',
    conditional_final: 'Conditional Final',
    unconditional_final: 'Unconditional Final',
  }
  return types[waiverType] || waiverType
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
// Lien Waiver Reminder Service
// ============================================================================

export const lienWaiverReminderService = {
  /**
   * Get all waivers that need reminders
   */
  async getWaiversNeedingReminders(
    companyId: string,
    config: WaiverReminderConfig = DEFAULT_REMINDER_CONFIG
  ): Promise<WaiverWithDetails[]> {
    // Calculate the earliest date we should check (first reminder threshold)
    const reminderDate = new Date()
    reminderDate.setDate(reminderDate.getDate() + config.firstReminderDays)

    const { data, error } = await db
      .from('lien_waivers')
      .select(`
        *,
        project:projects(id, name, project_number),
        subcontractor:subcontractors(id, company_name, contact_email),
        payment_application:payment_applications(id, application_number)
      `)
      .eq('company_id', companyId)
      .in('status', ['pending', 'draft', 'sent', 'received', 'under_review'])
      .not('due_date', 'is', null)
      .lte('due_date', reminderDate.toISOString().split('T')[0])
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (error) {
      logger.error('[LienWaiverReminders] Failed to fetch waivers:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get overdue waivers specifically
   */
  async getOverdueWaivers(companyId: string): Promise<WaiverWithDetails[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await db
      .from('lien_waivers')
      .select(`
        *,
        project:projects(id, name, project_number),
        subcontractor:subcontractors(id, company_name, contact_email),
        payment_application:payment_applications(id, application_number)
      `)
      .eq('company_id', companyId)
      .in('status', ['pending', 'draft', 'sent', 'received', 'under_review'])
      .not('due_date', 'is', null)
      .lt('due_date', today)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (error) {
      logger.error('[LienWaiverReminders] Failed to fetch overdue waivers:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get project manager email for a project
   */
  async getProjectManagerEmail(projectId: string): Promise<{ email: string; name: string } | null> {
    const { data } = await db
      .from('project_team_members')
      .select(`
        users!inner(id, email, full_name)
      `)
      .eq('project_id', projectId)
      .in('role', ['project_manager', 'pm', 'owner'])
      .limit(1)
      .single()

    if (data?.users) {
      return {
        email: data.users.email,
        name: data.users.full_name,
      }
    }
    return null
  },

  /**
   * Send reminder for a single waiver
   */
  async sendWaiverReminder(
    waiver: WaiverWithDetails,
    escalationLevel: EscalationLevel,
    config: WaiverReminderConfig = DEFAULT_REMINDER_CONFIG
  ): Promise<ReminderResult> {
    const appUrl = import.meta.env?.VITE_APP_URL || 'https://supersitehero.com'
    const daysFromDue = calculateDaysFromDue(waiver.due_date!)

    // Determine recipient - vendor email, subcontractor email, or escalate to PM
    let recipientEmail = waiver.sent_to_email
    let recipientName = waiver.vendor_name || waiver.claimant_name || 'Vendor'

    if (!recipientEmail && waiver.subcontractor?.contact_email) {
      recipientEmail = waiver.subcontractor.contact_email
      recipientName = waiver.subcontractor.company_name
    }

    // If overdue and beyond escalation threshold, also notify PM
    const shouldEscalateToPM = escalationLevel === 'overdue' &&
      Math.abs(daysFromDue) >= config.escalateOverdueAfterDays

    // Get PM info if escalating
    let pmInfo: { email: string; name: string } | null = null
    if (shouldEscalateToPM) {
      pmInfo = await this.getProjectManagerEmail(waiver.project_id)
    }

    // Must have at least one recipient
    if (!recipientEmail && !pmInfo) {
      return {
        waiverId: waiver.id,
        waiverNumber: waiver.waiver_number,
        escalationLevel,
        recipientEmail: 'none',
        success: false,
        error: 'No recipient email found',
      }
    }

    try {
      const viewUrl = `${appUrl}/projects/${waiver.project_id}/lien-waivers/${waiver.id}`

      // Generate and send appropriate email
      if (escalationLevel === 'overdue') {
        const emailData = {
          recipientName,
          waiverNumber: waiver.waiver_number,
          waiverType: getWaiverTypeLabel(waiver.waiver_type),
          vendorName: waiver.vendor_name || waiver.subcontractor?.company_name || 'Vendor',
          projectName: waiver.project?.name || 'Project',
          paymentAmount: waiver.payment_amount,
          dueDate: formatDate(waiver.due_date!),
          daysOverdue: Math.abs(daysFromDue),
          viewUrl,
          projectManager: pmInfo?.name,
          blocksPayment: true, // Could be based on requirements config
        }

        if (recipientEmail && config.sendEmail) {
          const { html, text } = generateLienWaiverOverdueEmail(emailData)
          await sendEmail({
            to: { email: recipientEmail, name: recipientName },
            subject: `OVERDUE: Lien Waiver ${waiver.waiver_number} - ${waiver.project?.name}`,
            html,
            text,
            tags: ['lien-waiver', 'overdue', 'reminder'],
          })
        }

        // Send escalation to PM
        if (pmInfo && config.sendEmail) {
          const pmEmailData = {
            ...emailData,
            recipientName: pmInfo.name,
          }
          const { html, text } = generateLienWaiverOverdueEmail(pmEmailData)
          await sendEmail({
            to: { email: pmInfo.email, name: pmInfo.name },
            subject: `ESCALATION: Overdue Lien Waiver ${waiver.waiver_number} - ${waiver.project?.name}`,
            html,
            text,
            tags: ['lien-waiver', 'overdue', 'escalation'],
          })
        }
      } else {
        const emailData = {
          recipientName,
          waiverNumber: waiver.waiver_number,
          waiverType: getWaiverTypeLabel(waiver.waiver_type),
          vendorName: waiver.vendor_name || waiver.subcontractor?.company_name || 'Vendor',
          projectName: waiver.project?.name || 'Project',
          paymentAmount: waiver.payment_amount,
          throughDate: formatDate(waiver.through_date),
          dueDate: formatDate(waiver.due_date!),
          daysUntilDue: daysFromDue,
          escalationLevel,
          viewUrl,
        }

        if (recipientEmail && config.sendEmail) {
          const { html, text } = generateLienWaiverReminderEmail(emailData)
          const urgencyLabels = { first: 'Reminder', second: 'Second Notice', third: 'Final Notice' }
          await sendEmail({
            to: { email: recipientEmail, name: recipientName },
            subject: `${urgencyLabels[escalationLevel]}: Lien Waiver ${waiver.waiver_number} Due ${formatDate(waiver.due_date!)}`,
            html,
            text,
            tags: ['lien-waiver', 'reminder', escalationLevel],
          })
        }
      }

      // Update reminder_sent_at timestamp
      await db
        .from('lien_waivers')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', waiver.id)

      // Log to history
      await db
        .from('lien_waiver_history')
        .insert({
          lien_waiver_id: waiver.id,
          action: escalationLevel === 'overdue' ? 'overdue_reminder_sent' : 'reminder_sent',
          field_changed: 'reminder_sent_at',
          old_value: waiver.reminder_sent_at,
          new_value: new Date().toISOString(),
          notes: `${escalationLevel} reminder sent to ${recipientEmail || pmInfo?.email}`,
        })

      // Create in-app notification if enabled
      if (config.sendInApp) {
        // Get user ID from email for in-app notification
        const { data: user } = await db
          .from('users')
          .select('id')
          .eq('email', recipientEmail || pmInfo?.email)
          .single()

        if (user) {
          await db
            .from('notifications')
            .insert({
              user_id: user.id,
              type: escalationLevel === 'overdue' ? 'lien_waiver_overdue' : 'lien_waiver_reminder',
              title: escalationLevel === 'overdue'
                ? `Overdue: Lien Waiver ${waiver.waiver_number}`
                : `Reminder: Lien Waiver Due ${formatDate(waiver.due_date!)}`,
              message: escalationLevel === 'overdue'
                ? `Lien waiver ${waiver.waiver_number} for ${waiver.project?.name} is ${Math.abs(daysFromDue)} days overdue.`
                : `Lien waiver ${waiver.waiver_number} for ${waiver.project?.name} is due in ${daysFromDue} day(s).`,
              related_to_type: 'lien_waiver',
              related_to_id: waiver.id,
            })
        }
      }

      logger.info(`[LienWaiverReminders] Sent ${escalationLevel} reminder for waiver ${waiver.waiver_number}`)

      return {
        waiverId: waiver.id,
        waiverNumber: waiver.waiver_number,
        escalationLevel,
        recipientEmail: recipientEmail || pmInfo?.email || 'escalated',
        success: true,
      }
    } catch (error) {
      logger.error(`[LienWaiverReminders] Failed to send reminder for waiver ${waiver.waiver_number}:`, error)
      return {
        waiverId: waiver.id,
        waiverNumber: waiver.waiver_number,
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
    config: WaiverReminderConfig = DEFAULT_REMINDER_CONFIG
  ): Promise<ReminderBatchResult> {
    const result: ReminderBatchResult = {
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: [],
    }

    try {
      const waivers = await this.getWaiversNeedingReminders(companyId, config)
      result.processedCount = waivers.length

      for (const waiver of waivers) {
        if (!waiver.due_date) {
          result.skippedCount++
          continue
        }

        const daysFromDue = calculateDaysFromDue(waiver.due_date)
        const escalationLevel = determineEscalationLevel(daysFromDue, config)

        if (!escalationLevel) {
          result.skippedCount++
          continue
        }

        // Check if we should send based on last reminder
        if (!shouldSendReminder(waiver, escalationLevel, config)) {
          result.skippedCount++
          continue
        }

        const reminderResult = await this.sendWaiverReminder(waiver, escalationLevel, config)
        result.results.push(reminderResult)

        if (reminderResult.success) {
          result.sentCount++
        } else {
          result.failedCount++
        }
      }

      logger.info(`[LienWaiverReminders] Processed ${result.processedCount} waivers, sent ${result.sentCount} reminders`)
      return result
    } catch (error) {
      logger.error('[LienWaiverReminders] Failed to process reminders:', error)
      throw error
    }
  },

  /**
   * Get reminder statistics for a company
   */
  async getReminderStats(companyId: string): Promise<{
    totalPending: number
    dueWithin7Days: number
    dueWithin3Days: number
    dueWithin1Day: number
    overdue: number
    oldestOverdueDays: number
  }> {
    const _today = new Date().toISOString().split('T')[0]
    const in1Day = new Date()
    in1Day.setDate(in1Day.getDate() + 1)
    const in3Days = new Date()
    in3Days.setDate(in3Days.getDate() + 3)
    const in7Days = new Date()
    in7Days.setDate(in7Days.getDate() + 7)

    const { data: waivers, error } = await db
      .from('lien_waivers')
      .select('due_date, status')
      .eq('company_id', companyId)
      .in('status', ['pending', 'draft', 'sent', 'received', 'under_review'])
      .not('due_date', 'is', null)
      .is('deleted_at', null)

    if (error) {throw error}

    const stats = {
      totalPending: waivers?.length || 0,
      dueWithin7Days: 0,
      dueWithin3Days: 0,
      dueWithin1Day: 0,
      overdue: 0,
      oldestOverdueDays: 0,
    }

    waivers?.forEach((w: { due_date: string }) => {
      const days = calculateDaysFromDue(w.due_date)
      if (days < 0) {
        stats.overdue++
        stats.oldestOverdueDays = Math.max(stats.oldestOverdueDays, Math.abs(days))
      } else if (days <= 1) {
        stats.dueWithin1Day++
      } else if (days <= 3) {
        stats.dueWithin3Days++
      } else if (days <= 7) {
        stats.dueWithin7Days++
      }
    })

    return stats
  },
}

export default lienWaiverReminderService
