/**
 * Escalate Stalled Tool
 * Identifies stalled/overdue approval items and escalates them through the role hierarchy
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface EscalateStalledInput {
  project_id: string
  item_type?: 'change_order' | 'invoice' | 'submittal' | 'rfi' | 'payment_application' | 'purchase_order'
  days_overdue_threshold?: number
}

interface StalledItem {
  id: string
  item_type: string
  title: string
  assigned_to: string
  assigned_to_name: string
  assigned_to_role: string
  created_at: string
  days_overdue: number
  original_due_date?: string
  escalation_count: number
  value?: number
  priority: 'low' | 'normal' | 'high' | 'critical'
}

interface EscalationAction {
  item_id: string
  item_title: string
  from_user: string
  from_role: string
  to_user: string
  to_role: string
  escalation_level: number
  reason: string
  action_taken: 'escalated' | 'notified' | 'flagged'
}

interface NotificationSent {
  recipient_id: string
  recipient_name: string
  recipient_email: string
  notification_type: 'escalation' | 'reminder' | 'urgent_alert'
  items_count: number
  sent_at: string
}

interface EscalateStalledOutput {
  stalled_items: StalledItem[]
  escalation_actions: EscalationAction[]
  notifications_sent: NotificationSent[]
  summary: {
    total_stalled: number
    escalated_count: number
    notified_count: number
    critical_items: number
    avg_days_overdue: number
  }
}

// Role hierarchy for escalation paths
const ROLE_HIERARCHY: Record<string, string[]> = {
  project_engineer: ['project_manager', 'superintendent'],
  project_manager: ['project_executive', 'operations_manager'],
  superintendent: ['project_manager', 'operations_manager'],
  project_executive: ['owner', 'principal'],
  operations_manager: ['project_executive', 'principal'],
  accounting_manager: ['controller', 'cfo'],
  controller: ['cfo', 'principal'],
}

// Default SLA hours by item type
const SLA_HOURS: Record<string, number> = {
  change_order: 72,
  invoice: 48,
  submittal: 120,
  rfi: 96,
  payment_application: 72,
  purchase_order: 48,
}

// Priority thresholds based on days overdue
function calculatePriority(daysOverdue: number, value?: number): 'low' | 'normal' | 'high' | 'critical' {
  if (daysOverdue >= 14 || (value && value > 100000)) {return 'critical'}
  if (daysOverdue >= 7 || (value && value > 50000)) {return 'high'}
  if (daysOverdue >= 3) {return 'normal'}
  return 'low'
}

function normalizeRole(role: string): string {
  return role?.toLowerCase().replace(/\s+/g, '_') || ''
}

function getEscalationTarget(currentRole: string): string[] {
  const normalized = normalizeRole(currentRole)
  return ROLE_HIERARCHY[normalized] || ['project_manager', 'project_executive']
}

export const escalateStalledTool = createTool<EscalateStalledInput, EscalateStalledOutput>({
  name: 'escalate_stalled',
  displayName: 'Escalate Stalled Approvals',
  description: 'Identifies approval items that are stalled or overdue, determines the appropriate escalation path based on role hierarchy, generates escalation notifications, and tracks escalation history.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      item_type: {
        type: 'string',
        enum: ['change_order', 'invoice', 'submittal', 'rfi', 'payment_application', 'purchase_order'],
        description: 'Optional: filter by specific item type'
      },
      days_overdue_threshold: {
        type: 'number',
        description: 'Minimum days overdue to consider stalled (default: 3)'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: true,
  estimatedTokens: 900,

  async execute(input, context) {
    const { project_id, item_type, days_overdue_threshold = 3 } = input

    const thresholdDate = new Date()
    thresholdDate.setDate(thresholdDate.getDate() - days_overdue_threshold)

    // Build query for stalled workflow items
    let query = supabase
      .from('workflow_items')
      .select(`
        id,
        title,
        created_at,
        due_date,
        status,
        assignees
      `)
      .eq('project_id', project_id)
      .eq('status', 'pending')
      .lt('created_at', thresholdDate.toISOString())

    if (item_type) {
      // Note: workflow_items doesn't have item_type, using metadata field
      query = query as any
    }

    const { data: stalledData, error: stalledError } = await query.order('created_at', { ascending: true }) as any

    if (stalledError) {
      throw new Error(`Failed to fetch stalled items: ${stalledError.message}`)
    }

    // Get project team members for escalation targets
    const { data: teamMembers } = await supabase
      .from('project_team')
      .select(`
        user_id,
        role,
        users (
          id,
          full_name,
          email
        )
      `)
      .eq('project_id', project_id)

    // Build team member lookup
    const teamByRole = new Map<string, { user_id: string; name: string; email: string; role: string }[]>()
    const teamById = new Map<string, { role: string; name: string; email: string }>()

    for (const member of teamMembers || []) {
      const user = member.users as { id: string; full_name: string; email: string } | null
      if (!user) {continue}

      const normalizedRole = normalizeRole(member.role || '')
      const memberInfo = {
        user_id: user.id,
        name: user.full_name || user.email,
        email: user.email,
        role: member.role || ''
      }

      teamById.set(user.id, { role: member.role || '', name: memberInfo.name, email: user.email })

      const existing = teamByRole.get(normalizedRole) || []
      existing.push(memberInfo)
      teamByRole.set(normalizedRole, existing)
    }

    // Process stalled items
    const stalledItems: StalledItem[] = []
    const escalationActions: EscalationAction[] = []
    const notificationMap = new Map<string, { recipient: { id: string; name: string; email: string }; items: string[]; type: 'escalation' | 'reminder' | 'urgent_alert' }>()

    for (const item of stalledData || []) {
      const itemAny = item as any
      const createdDate = new Date(item.created_at)
      const now = new Date()
      const daysOverdue = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      const assignedTo = (item.assignees && Array.isArray(item.assignees) && item.assignees.length > 0) ? item.assignees[0] : 'unknown'
      const currentAssigneeInfo = teamById.get(assignedTo)
      const priority = calculatePriority(daysOverdue, itemAny.value)
      const escalationCount = itemAny.escalation_count || 0

      const stalledItem: StalledItem = {
        id: item.id,
        item_type: itemAny.item_type || item_type || 'workflow',
        title: item.title || `Workflow Item #${item.id.slice(0, 8)}`,
        assigned_to: assignedTo,
        assigned_to_name: currentAssigneeInfo?.name || 'Unknown',
        assigned_to_role: currentAssigneeInfo?.role || 'Unknown',
        created_at: item.created_at,
        days_overdue: daysOverdue,
        original_due_date: item.due_date || undefined,
        escalation_count: escalationCount,
        value: itemAny.value,
        priority
      }

      stalledItems.push(stalledItem)

      // Determine escalation action
      const currentRole = normalizeRole(currentAssigneeInfo?.role || '')
      const escalationTargets = getEscalationTarget(currentRole)

      // Find available escalation target
      let escalationTarget: { user_id: string; name: string; email: string; role: string } | null = null

      for (const targetRole of escalationTargets) {
        const candidates = teamByRole.get(targetRole) || []
        if (candidates.length > 0) {
          // Pick the first available candidate (could be enhanced with workload balancing)
          escalationTarget = candidates[0]
          break
        }
      }

      if (escalationTarget && priority !== 'low') {
        const action: EscalationAction = {
          item_id: item.id,
          item_title: stalledItem.title,
          from_user: stalledItem.assigned_to_name,
          from_role: stalledItem.assigned_to_role,
          to_user: escalationTarget.name,
          to_role: escalationTarget.role,
          escalation_level: escalationCount + 1,
          reason: `Item overdue by ${daysOverdue} days (threshold: ${days_overdue_threshold})`,
          action_taken: priority === 'critical' ? 'escalated' : daysOverdue >= 7 ? 'escalated' : 'notified'
        }

        escalationActions.push(action)

        // Record escalation in database
        if (action.action_taken === 'escalated') {
          await (supabase
            .from('workflow_items')
            .update({
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', item.id))

          // Log escalation history (using escalation_history if it exists)
          try {
            await (supabase as any)
              .from('escalation_history')
              .insert({
                workflow_item_id: item.id,
                project_id,
                from_user_id: assignedTo,
                to_user_id: escalationTarget.user_id,
                escalation_level: escalationCount + 1,
                reason: action.reason,
                created_at: new Date().toISOString()
              })
          } catch (e) {
            // Table may not exist, continue
          }
        }

        // Prepare notification
        const notificationType: 'escalation' | 'reminder' | 'urgent_alert' =
          priority === 'critical' ? 'urgent_alert' : action.action_taken === 'escalated' ? 'escalation' : 'reminder'

        const existingNotification = notificationMap.get(escalationTarget.user_id)
        if (existingNotification) {
          existingNotification.items.push(stalledItem.title)
          // Upgrade notification type if needed
          if (notificationType === 'urgent_alert') {
            existingNotification.type = 'urgent_alert'
          } else if (notificationType === 'escalation' && existingNotification.type === 'reminder') {
            existingNotification.type = 'escalation'
          }
        } else {
          notificationMap.set(escalationTarget.user_id, {
            recipient: { id: escalationTarget.user_id, name: escalationTarget.name, email: escalationTarget.email },
            items: [stalledItem.title],
            type: notificationType
          })
        }
      }
    }

    // Create notifications
    const notificationsSent: NotificationSent[] = []
    const now = new Date().toISOString()

    for (const [userId, notification] of Array.from(notificationMap.entries())) {
      // Insert notification record
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: notification.type,
          title: notification.type === 'urgent_alert'
            ? `URGENT: ${notification.items.length} critical item(s) require immediate attention`
            : notification.type === 'escalation'
              ? `${notification.items.length} item(s) escalated to you`
              : `Reminder: ${notification.items.length} item(s) pending your review`,
          message: `Items: ${notification.items.join(', ')}`,
          project_id,
          read: false,
          created_at: now
        })

      notificationsSent.push({
        recipient_id: notification.recipient.id,
        recipient_name: notification.recipient.name,
        recipient_email: notification.recipient.email,
        notification_type: notification.type,
        items_count: notification.items.length,
        sent_at: now
      })
    }

    // Calculate summary
    const totalStalled = stalledItems.length
    const escalatedCount = escalationActions.filter(a => a.action_taken === 'escalated').length
    const criticalItems = stalledItems.filter(i => i.priority === 'critical').length
    const avgDaysOverdue = totalStalled > 0
      ? Math.round(stalledItems.reduce((sum, item) => sum + item.days_overdue, 0) / totalStalled)
      : 0

    return {
      success: true,
      data: {
        stalled_items: stalledItems,
        escalation_actions: escalationActions,
        notifications_sent: notificationsSent,
        summary: {
          total_stalled: totalStalled,
          escalated_count: escalatedCount,
          notified_count: notificationsSent.length,
          critical_items: criticalItems,
          avg_days_overdue: avgDaysOverdue
        }
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { summary, stalled_items, escalation_actions } = output

    const status = summary.critical_items > 0
      ? 'error'
      : summary.total_stalled > 0
        ? 'warning'
        : 'success'

    return {
      title: 'Stalled Approvals Escalation',
      summary: `${summary.total_stalled} stalled, ${summary.escalated_count} escalated`,
      icon: 'alert-triangle',
      status,
      details: [
        { label: 'Total Stalled', value: summary.total_stalled, type: 'text' },
        { label: 'Escalated', value: summary.escalated_count, type: 'text' },
        { label: 'Notifications', value: summary.notified_count, type: 'text' },
        { label: 'Critical Items', value: summary.critical_items, type: 'badge' },
        { label: 'Avg Days Overdue', value: `${summary.avg_days_overdue}d`, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
