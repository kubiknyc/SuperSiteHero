/**
 * Alert Permit Deadlines Tool
 * Scans active permits for upcoming deadlines, categorizes urgency,
 * generates notifications for responsible parties, and tracks inspection requirements
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { Permit, PermitStatus, PermitType } from '@/types/permits'

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

interface AlertPermitDeadlinesInput {
  project_id: string
  days_ahead?: number
}

interface PermitAlert {
  permit_id: string
  permit_name: string
  permit_number: string | null
  permit_type: PermitType | string
  urgency: 'expired' | 'critical' | 'warning' | 'upcoming'
  urgency_reason: string
  expiration_date: string | null
  days_until_expiration: number | null
  work_cannot_proceed_without: boolean
  requires_inspections: boolean
  issuing_agency: string | null
  agency_contact: string | null
  agency_phone: string | null
  recommended_action: string
}

interface NotificationToSend {
  recipient_role: string
  recipient_name: string | null
  notification_type: 'email' | 'in_app' | 'sms'
  subject: string
  message: string
  priority: 'high' | 'medium' | 'low'
  related_permits: string[]
}

interface InspectionRequirement {
  permit_id: string
  permit_name: string
  permit_type: PermitType | string
  inspection_type: string
  status: 'pending' | 'scheduled' | 'overdue' | 'passed' | 'failed'
  due_date: string | null
  notes: string | null
}

interface DeadlineSummary {
  total_active_permits: number
  expired_count: number
  critical_count: number
  warning_count: number
  upcoming_count: number
  permits_requiring_inspections: number
  critical_permits_not_obtained: number
}

interface AlertPermitDeadlinesOutput {
  alerts: PermitAlert[]
  deadline_summary: DeadlineSummary
  notifications_to_send: NotificationToSend[]
  inspection_requirements: InspectionRequirement[]
  recommendations: string[]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateDaysUntil(date: string | null): number | null {
  if (!date) {return null}
  const targetDate = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  targetDate.setHours(0, 0, 0, 0)
  return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function determineUrgency(
  permit: Permit,
  daysUntilExpiration: number | null
): { urgency: PermitAlert['urgency']; reason: string } {
  // Check if permit status is already expired
  if (permit.status === 'expired' || permit.status === 'revoked') {
    return { urgency: 'expired', reason: 'Permit status is expired or revoked' }
  }

  // Check expiration date
  if (daysUntilExpiration !== null) {
    if (daysUntilExpiration < 0) {
      return { urgency: 'expired', reason: `Expired ${Math.abs(daysUntilExpiration)} days ago` }
    }
    if (daysUntilExpiration <= 7) {
      return {
        urgency: 'critical',
        reason: daysUntilExpiration === 0
          ? 'Expires today'
          : `Expires in ${daysUntilExpiration} day${daysUntilExpiration === 1 ? '' : 's'}`,
      }
    }
    if (daysUntilExpiration <= 14) {
      return { urgency: 'warning', reason: `Expires in ${daysUntilExpiration} days` }
    }
    if (daysUntilExpiration <= 30) {
      return { urgency: 'upcoming', reason: `Expires in ${daysUntilExpiration} days` }
    }
  }

  // Check if critical permit not yet obtained
  if (
    permit.work_cannot_proceed_without &&
    permit.status !== 'issued' &&
    permit.status !== 'active'
  ) {
    return { urgency: 'critical', reason: 'Critical permit not yet obtained - work cannot proceed' }
  }

  return { urgency: 'upcoming', reason: 'Within monitoring window' }
}

function getRecommendedAction(permit: Permit, urgency: PermitAlert['urgency']): string {
  if (urgency === 'expired') {
    return 'Contact issuing agency immediately to renew or reapply for permit. Work requiring this permit must stop until renewed.'
  }

  if (urgency === 'critical') {
    if (permit.status === 'pending' || permit.status === 'applied') {
      return 'Follow up with issuing agency on permit status. Consider expediting if available.'
    }
    return 'Submit renewal application immediately. Prepare all required documentation.'
  }

  if (urgency === 'warning') {
    return 'Begin renewal process. Gather required documents and schedule renewal submission.'
  }

  if (permit.requires_inspections) {
    return 'Schedule required inspections before permit expiration.'
  }

  return 'Monitor permit status and plan for renewal within the next 30 days.'
}

function generateNotifications(
  alerts: PermitAlert[],
  projectId: string
): NotificationToSend[] {
  const notifications: NotificationToSend[] = []

  // Group alerts by urgency
  const expiredAlerts = alerts.filter((a) => a.urgency === 'expired')
  const criticalAlerts = alerts.filter((a) => a.urgency === 'critical')
  const warningAlerts = alerts.filter((a) => a.urgency === 'warning')

  // Notification for expired permits - HIGH PRIORITY
  if (expiredAlerts.length > 0) {
    const criticalPermits = expiredAlerts.filter((a) => a.work_cannot_proceed_without)
    const permitNames = expiredAlerts.map((a) => a.permit_name).join(', ')

    notifications.push({
      recipient_role: 'superintendent',
      recipient_name: null,
      notification_type: 'email',
      subject: `URGENT: ${expiredAlerts.length} Expired Permit(s) Require Immediate Action`,
      message: `The following permits have expired and require immediate attention:\n\n${permitNames}\n\n${
        criticalPermits.length > 0
          ? `WARNING: ${criticalPermits.length} of these permits are marked as critical - work cannot proceed without them.`
          : ''
      }\n\nPlease contact the issuing agencies immediately to renew or reapply.`,
      priority: 'high',
      related_permits: expiredAlerts.map((a) => a.permit_id),
    })

    // Also notify project manager
    notifications.push({
      recipient_role: 'project_manager',
      recipient_name: null,
      notification_type: 'email',
      subject: `URGENT: ${expiredAlerts.length} Expired Permit(s) on Project`,
      message: `${expiredAlerts.length} permit(s) have expired and may impact project operations. Please review and coordinate renewal efforts.`,
      priority: 'high',
      related_permits: expiredAlerts.map((a) => a.permit_id),
    })
  }

  // Notification for critical permits - HIGH PRIORITY
  if (criticalAlerts.length > 0) {
    const permitNames = criticalAlerts.map((a) => `${a.permit_name} (${a.urgency_reason})`).join('\n- ')

    notifications.push({
      recipient_role: 'superintendent',
      recipient_name: null,
      notification_type: 'in_app',
      subject: `${criticalAlerts.length} Permit(s) Expiring Within 7 Days`,
      message: `The following permits require urgent attention:\n- ${permitNames}`,
      priority: 'high',
      related_permits: criticalAlerts.map((a) => a.permit_id),
    })
  }

  // Notification for warning permits - MEDIUM PRIORITY
  if (warningAlerts.length > 0) {
    const permitNames = warningAlerts.map((a) => a.permit_name).join(', ')

    notifications.push({
      recipient_role: 'superintendent',
      recipient_name: null,
      notification_type: 'in_app',
      subject: `${warningAlerts.length} Permit(s) Expiring Within 14 Days`,
      message: `Plan for renewal of the following permits: ${permitNames}`,
      priority: 'medium',
      related_permits: warningAlerts.map((a) => a.permit_id),
    })
  }

  // Notification for permits requiring inspections
  const inspectionPermits = alerts.filter(
    (a) => a.requires_inspections && (a.urgency === 'critical' || a.urgency === 'warning')
  )
  if (inspectionPermits.length > 0) {
    notifications.push({
      recipient_role: 'inspector',
      recipient_name: null,
      notification_type: 'in_app',
      subject: `${inspectionPermits.length} Permit(s) Require Inspections Before Expiration`,
      message: `Schedule inspections for permits expiring soon to avoid compliance issues.`,
      priority: 'medium',
      related_permits: inspectionPermits.map((a) => a.permit_id),
    })
  }

  return notifications
}

function generateInspectionRequirements(permits: Permit[]): InspectionRequirement[] {
  const requirements: InspectionRequirement[] = []

  // Define common inspection types by permit type
  const inspectionsByPermitType: Record<string, string[]> = {
    building: ['Foundation', 'Framing', 'Rough-in', 'Final'],
    electrical: ['Rough Electrical', 'Final Electrical'],
    plumbing: ['Underground', 'Rough Plumbing', 'Final Plumbing'],
    mechanical: ['Rough Mechanical', 'Final Mechanical'],
    fire: ['Fire Sprinkler Rough', 'Fire Alarm', 'Fire Sprinkler Final'],
    grading: ['Compaction', 'Final Grade'],
    demolition: ['Pre-Demolition', 'Final Clearance'],
    occupancy: ['Final Building', 'Fire Life Safety', 'Certificate of Occupancy'],
  }

  for (const permit of permits.filter((p) => p.requires_inspections)) {
    const permitTypeKey = (permit.permit_type || '').toLowerCase()
    const inspectionTypes = inspectionsByPermitType[permitTypeKey] || ['General Inspection']

    for (const inspectionType of inspectionTypes) {
      requirements.push({
        permit_id: permit.id,
        permit_name: permit.permit_name,
        permit_type: permit.permit_type,
        inspection_type: inspectionType,
        status: 'pending',
        due_date: permit.expiration_date,
        notes: `Required inspection for ${permit.permit_name} before permit expiration`,
      })
    }
  }

  return requirements
}

function generateRecommendations(
  summary: DeadlineSummary,
  alerts: PermitAlert[]
): string[] {
  const recommendations: string[] = []

  if (summary.expired_count > 0) {
    recommendations.push(
      `URGENT: ${summary.expired_count} permit(s) have expired. Stop affected work immediately and contact issuing agencies.`
    )
  }

  if (summary.critical_permits_not_obtained > 0) {
    recommendations.push(
      `${summary.critical_permits_not_obtained} critical permit(s) not yet obtained. Expedite applications to avoid work stoppages.`
    )
  }

  if (summary.critical_count > 0) {
    recommendations.push(
      `${summary.critical_count} permit(s) expiring within 7 days. Prioritize renewal submissions this week.`
    )
  }

  if (summary.warning_count > 0) {
    recommendations.push(
      `${summary.warning_count} permit(s) expiring within 14 days. Begin renewal process and gather required documentation.`
    )
  }

  if (summary.permits_requiring_inspections > 0) {
    recommendations.push(
      `${summary.permits_requiring_inspections} permit(s) require inspections. Schedule inspections promptly to maintain compliance.`
    )
  }

  // Add general best practices
  if (summary.total_active_permits > 10) {
    recommendations.push(
      'Consider implementing a permit tracking calendar to manage multiple permits efficiently.'
    )
  }

  if (alerts.some((a) => !a.agency_contact)) {
    recommendations.push(
      'Some permits are missing agency contact information. Update records to streamline future communications.'
    )
  }

  // Ensure at least one recommendation
  if (recommendations.length === 0) {
    recommendations.push('All permits are in good standing. Continue monitoring expiration dates.')
  }

  return recommendations.slice(0, 8)
}

// ============================================================================
// TOOL DEFINITION
// ============================================================================

export const alertPermitDeadlinesTool = createTool<AlertPermitDeadlinesInput, AlertPermitDeadlinesOutput>({
  name: 'alert_permit_deadlines',
  displayName: 'Alert Permit Deadlines',
  description:
    'Scans all active permits for upcoming deadlines, categorizes urgency (expired, expiring soon, due for inspection), generates notifications for responsible parties, and tracks permit inspection requirements.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to scan for permit deadlines',
      },
      days_ahead: {
        type: 'number',
        description: 'Number of days to look ahead for expiring permits (default: 30)',
      },
    },
    required: ['project_id'],
  },
  requiresConfirmation: false,
  estimatedTokens: 800,

  async execute(input, context) {
    const { project_id, days_ahead = 30 } = input

    const now = new Date()
    const lookAheadDate = new Date(now)
    lookAheadDate.setDate(lookAheadDate.getDate() + days_ahead)

    // Fetch all active permits for the project
    const { data: permits, error: permitsError } = await supabase
      .from('permits')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)
      .not('status', 'in', '("closed")')
      .order('expiration_date', { ascending: true })

    if (permitsError) {
      throw new Error(`Failed to fetch permits: ${permitsError.message}`)
    }

    const activePermits = (permits || []) as Permit[]

    // Process permits and generate alerts
    const alerts: PermitAlert[] = []
    let expiredCount = 0
    let criticalCount = 0
    let warningCount = 0
    let upcomingCount = 0
    let permitsRequiringInspections = 0
    let criticalPermitsNotObtained = 0

    for (const permit of activePermits) {
      const daysUntilExpiration = calculateDaysUntil(permit.expiration_date)
      const { urgency, reason } = determineUrgency(permit, daysUntilExpiration)

      // Only include permits within our monitoring window or with issues
      const shouldInclude =
        urgency === 'expired' ||
        urgency === 'critical' ||
        urgency === 'warning' ||
        (daysUntilExpiration !== null && daysUntilExpiration <= days_ahead) ||
        (permit.work_cannot_proceed_without &&
          permit.status !== 'issued' &&
          permit.status !== 'active')

      if (shouldInclude) {
        const alert: PermitAlert = {
          permit_id: permit.id,
          permit_name: permit.permit_name,
          permit_number: permit.permit_number,
          permit_type: permit.permit_type,
          urgency,
          urgency_reason: reason,
          expiration_date: permit.expiration_date,
          days_until_expiration: daysUntilExpiration,
          work_cannot_proceed_without: permit.work_cannot_proceed_without || false,
          requires_inspections: permit.requires_inspections || false,
          issuing_agency: permit.issuing_agency,
          agency_contact: permit.agency_contact,
          agency_phone: permit.agency_phone,
          recommended_action: getRecommendedAction(permit, urgency),
        }

        alerts.push(alert)

        // Update counters
        switch (urgency) {
          case 'expired':
            expiredCount++
            break
          case 'critical':
            criticalCount++
            break
          case 'warning':
            warningCount++
            break
          case 'upcoming':
            upcomingCount++
            break
        }

        if (permit.requires_inspections) {
          permitsRequiringInspections++
        }

        if (
          permit.work_cannot_proceed_without &&
          permit.status !== 'issued' &&
          permit.status !== 'active'
        ) {
          criticalPermitsNotObtained++
        }
      }
    }

    // Sort alerts by urgency priority
    const urgencyOrder: Record<PermitAlert['urgency'], number> = {
      expired: 0,
      critical: 1,
      warning: 2,
      upcoming: 3,
    }
    alerts.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

    // Generate summary
    const deadlineSummary: DeadlineSummary = {
      total_active_permits: activePermits.length,
      expired_count: expiredCount,
      critical_count: criticalCount,
      warning_count: warningCount,
      upcoming_count: upcomingCount,
      permits_requiring_inspections: permitsRequiringInspections,
      critical_permits_not_obtained: criticalPermitsNotObtained,
    }

    // Generate notifications
    const notificationsToSend = generateNotifications(alerts, project_id)

    // Generate inspection requirements
    const inspectionRequirements = generateInspectionRequirements(
      activePermits.filter((p) => p.requires_inspections)
    )

    // Generate recommendations
    const recommendations = generateRecommendations(deadlineSummary, alerts)

    return {
      success: true,
      data: {
        alerts: alerts.slice(0, 20), // Limit to 20 most urgent
        deadline_summary: deadlineSummary,
        notifications_to_send: notificationsToSend,
        inspection_requirements: inspectionRequirements.slice(0, 15),
        recommendations,
      },
      metadata: {
        executionTimeMs: 0,
      },
    }
  },

  formatOutput(output) {
    const { alerts, deadline_summary, notifications_to_send, inspection_requirements } = output

    const urgentCount = deadline_summary.expired_count + deadline_summary.critical_count
    const hasUrgent = urgentCount > 0
    const hasExpired = deadline_summary.expired_count > 0

    let status: 'error' | 'warning' | 'success' = 'success'
    let icon = 'check-circle'

    if (hasExpired) {
      status = 'error'
      icon = 'alert-octagon'
    } else if (hasUrgent) {
      status = 'warning'
      icon = 'alert-triangle'
    }

    const summaryParts: string[] = []
    if (deadline_summary.expired_count > 0) {
      summaryParts.push(`${deadline_summary.expired_count} expired`)
    }
    if (deadline_summary.critical_count > 0) {
      summaryParts.push(`${deadline_summary.critical_count} critical`)
    }
    if (deadline_summary.warning_count > 0) {
      summaryParts.push(`${deadline_summary.warning_count} warning`)
    }
    if (summaryParts.length === 0) {
      summaryParts.push('No urgent deadlines')
    }

    return {
      title: 'Permit Deadline Alerts',
      summary: summaryParts.join(', '),
      icon,
      status,
      details: [
        {
          label: 'Total Active Permits',
          value: deadline_summary.total_active_permits,
          type: 'text',
        },
        {
          label: 'Expired',
          value: deadline_summary.expired_count,
          type: 'badge',
        },
        {
          label: 'Critical (7 days)',
          value: deadline_summary.critical_count,
          type: 'text',
        },
        {
          label: 'Warning (14 days)',
          value: deadline_summary.warning_count,
          type: 'text',
        },
        {
          label: 'Notifications',
          value: notifications_to_send.length,
          type: 'text',
        },
        {
          label: 'Inspections Required',
          value: inspection_requirements.length,
          type: 'text',
        },
      ],
      expandedContent: output as unknown as Record<string, unknown>,
    }
  },
})
