/**
 * RFI Aging Alert Service
 *
 * Manages automatic alerts for overdue RFI responses.
 * Supports configurable thresholds at 7, 14, and 30 days.
 * Integrates with the notification service for email and in-app notifications.
 */

import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/email-service'
import {
  generateRFIAgingAlertEmail,
  generateRFIOverdueEmail,
  generateRFIAgingSummaryEmail,
} from '@/lib/email/templates/rfi-aging-alert'
import { logger } from '@/lib/utils/logger'
import type { WorkflowItem } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export type AgingLevel = 'warning' | 'urgent' | 'critical' | 'overdue'

export interface RFIWithDetails extends WorkflowItem {
  project?: {
    id: string
    name: string
  }
  raised_by_user?: {
    id: string
    full_name: string
    email: string
  }
  assignee_users?: Array<{
    id: string
    full_name: string
    email: string
  }>
}

export interface RFIAgingConfig {
  warningDays: number       // Days until due for warning alert (default: 7)
  urgentDays: number        // Days until due for urgent alert (default: 3)
  criticalDays: number      // Days until due for critical alert (default: 1)
  overdueAlertFrequency: number // How often to send overdue alerts in days (default: 3)
  escalateAfterDays: number // Days overdue before escalating to PM (default: 7)
  sendEmail: boolean
  sendInApp: boolean
  sendDigest: boolean       // Send daily digest summary
}

export const DEFAULT_RFI_AGING_CONFIG: RFIAgingConfig = {
  warningDays: 7,
  urgentDays: 3,
  criticalDays: 1,
  overdueAlertFrequency: 3,
  escalateAfterDays: 7,
  sendEmail: true,
  sendInApp: true,
  sendDigest: true,
}

export interface AgingAlertResult {
  rfiId: string
  rfiNumber: string
  agingLevel: AgingLevel
  recipientEmail: string
  success: boolean
  error?: string
}

export interface AgingAlertBatchResult {
  processedCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
  results: AgingAlertResult[]
}

export interface RFIAgingStats {
  totalOpen: number
  overdueCount: number
  dueTodayCount: number
  dueThisWeekCount: number
  dueNextWeekCount: number
  averageAgeDays: number
  oldestOverdueDays: number
  byPriority: {
    high: number
    normal: number
    low: number
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate days until due or days overdue
 */
function calculateDaysFromDue(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Determine aging level based on days until due
 */
function determineAgingLevel(
  daysUntilDue: number,
  config: RFIAgingConfig
): AgingLevel | null {
  if (daysUntilDue < 0) {
    return 'overdue'
  } else if (daysUntilDue <= config.criticalDays) {
    return 'critical'
  } else if (daysUntilDue <= config.urgentDays) {
    return 'urgent'
  } else if (daysUntilDue <= config.warningDays) {
    return 'warning'
  }
  return null
}

/**
 * Check if alert should be sent based on last alert date
 */
function shouldSendAlert(
  rfi: RFIWithDetails,
  agingLevel: AgingLevel,
  config: RFIAgingConfig
): boolean {
  // Check custom metadata for last alert timestamp
  const metadata = rfi.custom_metadata as { last_aging_alert?: string } | null
  if (!metadata?.last_aging_alert) {
    return true
  }

  const lastAlertDate = new Date(metadata.last_aging_alert)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  lastAlertDate.setHours(0, 0, 0, 0)

  const daysSinceLastAlert = Math.floor(
    (today.getTime() - lastAlertDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (agingLevel === 'overdue') {
    return daysSinceLastAlert >= config.overdueAlertFrequency
  }

  // For pre-due alerts, send if we haven't alerted today
  return daysSinceLastAlert >= 1
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

/**
 * Format RFI number with prefix
 */
function formatRFINumber(number: number): string {
  return `RFI-${String(number).padStart(4, '0')}`
}

// ============================================================================
// RFI Aging Service
// ============================================================================

export const rfiAgingService = {
  /**
   * Get all RFIs that need aging alerts
   */
  async getRFIsNeedingAlerts(
    projectId: string,
    workflowTypeId: string,
    config: RFIAgingConfig = DEFAULT_RFI_AGING_CONFIG
  ): Promise<RFIWithDetails[]> {
    // Calculate the earliest date we should check (warning threshold)
    const alertDate = new Date()
    alertDate.setDate(alertDate.getDate() + config.warningDays)

    const { data, error } = await supabase
      .from('workflow_items')
      .select(`
        *,
        project:projects(id, name)
      `)
      .eq('project_id', projectId)
      .eq('workflow_type_id', workflowTypeId)
      .in('status', ['pending', 'submitted', 'under_review'])
      .not('due_date', 'is', null)
      .lte('due_date', alertDate.toISOString().split('T')[0])
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (error) {
      logger.error('[RFIAging] Failed to fetch RFIs:', error)
      throw error
    }

    return (data || []) as RFIWithDetails[]
  },

  /**
   * Get overdue RFIs specifically
   */
  async getOverdueRFIs(
    projectId: string,
    workflowTypeId: string
  ): Promise<RFIWithDetails[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('workflow_items')
      .select(`
        *,
        project:projects(id, name)
      `)
      .eq('project_id', projectId)
      .eq('workflow_type_id', workflowTypeId)
      .in('status', ['pending', 'submitted', 'under_review'])
      .not('due_date', 'is', null)
      .lt('due_date', today)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (error) {
      logger.error('[RFIAging] Failed to fetch overdue RFIs:', error)
      throw error
    }

    return (data || []) as RFIWithDetails[]
  },

  /**
   * Get project manager for a project
   */
  async getProjectManager(projectId: string): Promise<{ email: string; name: string } | null> {
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
      return {
        email: (data.users as any).email,
        name: (data.users as any).full_name,
      }
    }
    return null
  },

  /**
   * Get user details by ID
   */
  async getUserDetails(userId: string): Promise<{ email: string; name: string } | null> {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', userId)
      .single()

    if (data) {
      return {
        email: data.email,
        name: data.full_name || data.email.split('@')[0],
      }
    }
    return null
  },

  /**
   * Send aging alert for a single RFI
   */
  async sendRFIAgingAlert(
    rfi: RFIWithDetails,
    agingLevel: AgingLevel,
    config: RFIAgingConfig = DEFAULT_RFI_AGING_CONFIG
  ): Promise<AgingAlertResult> {
    const appUrl = import.meta.env?.VITE_APP_URL || 'https://JobSight.com'
    const daysFromDue = calculateDaysFromDue(rfi.due_date!)
    const rfiNumber = formatRFINumber(rfi.number)

    // Get assignees' emails
    const assigneeEmails: string[] = []
    const assigneeNames: string[] = []

    if (rfi.assignees && Array.isArray(rfi.assignees)) {
      for (const assigneeId of rfi.assignees) {
        const user = await this.getUserDetails(assigneeId)
        if (user) {
          assigneeEmails.push(user.email)
          assigneeNames.push(user.name)
        }
      }
    }

    // Get submitter info
    let submitterName: string | undefined
    if (rfi.raised_by) {
      const submitter = await this.getUserDetails(rfi.raised_by)
      submitterName = submitter?.name
    }

    // If no assignees, notify project manager
    let pmInfo: { email: string; name: string } | null = null
    if (assigneeEmails.length === 0 || (agingLevel === 'overdue' && Math.abs(daysFromDue) >= config.escalateAfterDays)) {
      pmInfo = await this.getProjectManager(rfi.project_id)
      if (pmInfo && !assigneeEmails.includes(pmInfo.email)) {
        assigneeEmails.push(pmInfo.email)
        assigneeNames.push(pmInfo.name)
      }
    }

    if (assigneeEmails.length === 0) {
      return {
        rfiId: rfi.id,
        rfiNumber,
        agingLevel,
        recipientEmail: 'none',
        success: false,
        error: 'No recipient email found',
      }
    }

    try {
      const viewUrl = `${appUrl}/projects/${rfi.project_id}/rfis/${rfi.id}`

      for (let i = 0; i < assigneeEmails.length; i++) {
        const recipientEmail = assigneeEmails[i]
        const recipientName = assigneeNames[i]

        if (agingLevel === 'overdue') {
          const emailData = {
            recipientName,
            rfiNumber,
            rfiTitle: rfi.title,
            projectName: rfi.project?.name || 'Project',
            discipline: rfi.discipline || undefined,
            priority: (rfi.priority as 'low' | 'normal' | 'high') || 'normal',
            dueDate: formatDate(rfi.due_date!),
            daysOverdue: Math.abs(daysFromDue),
            viewUrl,
            submittedBy: submitterName,
            submittedDate: rfi.created_at ? formatDate(rfi.created_at) : undefined,
            projectManager: pmInfo?.name,
          }

          if (config.sendEmail) {
            const { html, text } = generateRFIOverdueEmail(emailData)
            await sendEmail({
              to: { email: recipientEmail, name: recipientName },
              subject: `OVERDUE: ${rfiNumber} - ${rfi.title}`,
              html,
              text,
              tags: ['rfi', 'overdue', 'alert'],
            })
          }
        } else {
          const emailData = {
            recipientName,
            rfiNumber,
            rfiTitle: rfi.title,
            projectName: rfi.project?.name || 'Project',
            discipline: rfi.discipline || undefined,
            priority: (rfi.priority as 'low' | 'normal' | 'high') || 'normal',
            dueDate: formatDate(rfi.due_date!),
            daysUntilDue: daysFromDue,
            agingLevel,
            viewUrl,
            submittedBy: submitterName,
            submittedDate: rfi.created_at ? formatDate(rfi.created_at) : undefined,
            assignees: assigneeNames,
          }

          if (config.sendEmail) {
            const { html, text } = generateRFIAgingAlertEmail(emailData)
            const urgencyLabels = { warning: 'Response Due Soon', urgent: 'Urgent', critical: 'Critical' }
            await sendEmail({
              to: { email: recipientEmail, name: recipientName },
              subject: `${urgencyLabels[agingLevel as keyof typeof urgencyLabels]}: ${rfiNumber} due ${formatDate(rfi.due_date!)}`,
              html,
              text,
              tags: ['rfi', 'reminder', agingLevel],
            })
          }
        }

        // Create in-app notification if enabled
        if (config.sendInApp) {
          const { data: user } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', recipientEmail)
            .single()

          if (user) {
            await supabase
              .from('notifications')
              .insert({
                user_id: user.id,
                type: agingLevel === 'overdue' ? 'rfi_overdue' : 'rfi_due_soon',
                title: agingLevel === 'overdue'
                  ? `Overdue: ${rfiNumber}`
                  : `RFI Due Soon: ${rfiNumber}`,
                message: agingLevel === 'overdue'
                  ? `${rfiNumber} - ${rfi.title} is ${Math.abs(daysFromDue)} days overdue.`
                  : `${rfiNumber} - ${rfi.title} is due in ${daysFromDue} day(s).`,
                related_to_type: 'rfi',
                related_to_id: rfi.id,
              })
          }
        }
      }

      // Update last alert timestamp
      await supabase
        .from('workflow_items')
        .update({
          custom_metadata: {
            ...(rfi.custom_metadata as object || {}),
            last_aging_alert: new Date().toISOString(),
          }
        })
        .eq('id', rfi.id)

      logger.info(`[RFIAging] Sent ${agingLevel} alert for ${rfiNumber}`)

      return {
        rfiId: rfi.id,
        rfiNumber,
        agingLevel,
        recipientEmail: assigneeEmails.join(', '),
        success: true,
      }
    } catch (error) {
      logger.error(`[RFIAging] Failed to send alert for ${rfiNumber}:`, error)
      return {
        rfiId: rfi.id,
        rfiNumber,
        agingLevel,
        recipientEmail: assigneeEmails.join(', ') || 'unknown',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  /**
   * Process all pending alerts for a project
   */
  async processAlerts(
    projectId: string,
    workflowTypeId: string,
    config: RFIAgingConfig = DEFAULT_RFI_AGING_CONFIG
  ): Promise<AgingAlertBatchResult> {
    const result: AgingAlertBatchResult = {
      processedCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: [],
    }

    try {
      const rfis = await this.getRFIsNeedingAlerts(projectId, workflowTypeId, config)
      result.processedCount = rfis.length

      for (const rfi of rfis) {
        if (!rfi.due_date) {
          result.skippedCount++
          continue
        }

        const daysFromDue = calculateDaysFromDue(rfi.due_date)
        const agingLevel = determineAgingLevel(daysFromDue, config)

        if (!agingLevel) {
          result.skippedCount++
          continue
        }

        // Check if we should send based on last alert
        if (!shouldSendAlert(rfi, agingLevel, config)) {
          result.skippedCount++
          continue
        }

        const alertResult = await this.sendRFIAgingAlert(rfi, agingLevel, config)
        result.results.push(alertResult)

        if (alertResult.success) {
          result.sentCount++
        } else {
          result.failedCount++
        }
      }

      logger.info(`[RFIAging] Processed ${result.processedCount} RFIs, sent ${result.sentCount} alerts`)
      return result
    } catch (error) {
      logger.error('[RFIAging] Failed to process alerts:', error)
      throw error
    }
  },

  /**
   * Get aging statistics for a project
   */
  async getAgingStats(
    projectId: string,
    workflowTypeId: string
  ): Promise<RFIAgingStats> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(today)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    const endOfNextWeek = new Date(today)
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 14)

    const { data: rfis, error } = await supabase
      .from('workflow_items')
      .select('id, due_date, priority, status, created_at')
      .eq('project_id', projectId)
      .eq('workflow_type_id', workflowTypeId)
      .in('status', ['pending', 'submitted', 'under_review'])
      .is('deleted_at', null)

    if (error) {throw error}

    const stats: RFIAgingStats = {
      totalOpen: rfis?.length || 0,
      overdueCount: 0,
      dueTodayCount: 0,
      dueThisWeekCount: 0,
      dueNextWeekCount: 0,
      averageAgeDays: 0,
      oldestOverdueDays: 0,
      byPriority: {
        high: 0,
        normal: 0,
        low: 0,
      },
    }

    let totalAgeDays = 0

    rfis?.forEach((rfi: { due_date: string | null; priority: string; created_at: string }) => {
      // Count by priority
      const priority = (rfi.priority as 'high' | 'normal' | 'low') || 'normal'
      stats.byPriority[priority]++

      // Calculate age
      if (rfi.created_at) {
        const createdDate = new Date(rfi.created_at)
        const ageDays = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        totalAgeDays += ageDays
      }

      // Check due date
      if (rfi.due_date) {
        const dueDate = new Date(rfi.due_date)
        dueDate.setHours(0, 0, 0, 0)
        const days = calculateDaysFromDue(rfi.due_date)

        if (days < 0) {
          stats.overdueCount++
          stats.oldestOverdueDays = Math.max(stats.oldestOverdueDays, Math.abs(days))
        } else if (days === 0) {
          stats.dueTodayCount++
        } else if (dueDate <= endOfWeek) {
          stats.dueThisWeekCount++
        } else if (dueDate <= endOfNextWeek) {
          stats.dueNextWeekCount++
        }
      }
    })

    stats.averageAgeDays = rfis && rfis.length > 0 ? Math.round(totalAgeDays / rfis.length) : 0

    return stats
  },

  /**
   * Send daily digest summary
   */
  async sendDigestSummary(
    projectId: string,
    workflowTypeId: string,
    recipientEmail: string,
    recipientName: string,
    config: RFIAgingConfig = DEFAULT_RFI_AGING_CONFIG
  ): Promise<boolean> {
    if (!config.sendDigest) {return false}

    try {
      const stats = await this.getAgingStats(projectId, workflowTypeId)

      // Only send if there are items needing attention
      if (stats.overdueCount === 0 && stats.dueTodayCount === 0 && stats.dueThisWeekCount === 0) {
        return false
      }

      const overdueRFIs = await this.getOverdueRFIs(projectId, workflowTypeId)
      const appUrl = import.meta.env?.VITE_APP_URL || 'https://JobSight.com'

      // Get project name
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single()

      const emailData = {
        recipientName,
        projectName: project?.name || 'Project',
        projectId,
        overdueCount: stats.overdueCount,
        dueTodayCount: stats.dueTodayCount,
        dueThisWeekCount: stats.dueThisWeekCount,
        overdueRFIs: overdueRFIs.slice(0, 10).map(rfi => ({
          number: formatRFINumber(rfi.number),
          title: rfi.title,
          daysOverdue: Math.abs(calculateDaysFromDue(rfi.due_date!)),
          viewUrl: `${appUrl}/projects/${projectId}/rfis/${rfi.id}`,
        })),
        viewAllUrl: `${appUrl}/projects/${projectId}/rfis?status=overdue`,
      }

      const { html, text } = generateRFIAgingSummaryEmail(emailData)
      await sendEmail({
        to: { email: recipientEmail, name: recipientName },
        subject: `RFI Aging Summary: ${stats.overdueCount} Overdue, ${stats.dueTodayCount} Due Today - ${project?.name}`,
        html,
        text,
        tags: ['rfi', 'digest', 'summary'],
      })

      logger.info(`[RFIAging] Sent digest summary to ${recipientEmail}`)
      return true
    } catch (error) {
      logger.error('[RFIAging] Failed to send digest summary:', error)
      return false
    }
  },
}

export default rfiAgingService
