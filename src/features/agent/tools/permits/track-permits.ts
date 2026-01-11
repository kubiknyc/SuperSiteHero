/**
 * Track Permits Tool
 * Tracks permit status, application dates, approvals, and expirations for a project
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface TrackPermitsInput {
  project_id: string
  include_expired?: boolean
}

interface PermitItem {
  id: string
  permit_number: string
  permit_type: string
  description: string
  status: 'pending' | 'applied' | 'approved' | 'expired' | 'rejected' | 'renewed'
  issuing_authority: string | null
  application_date: string | null
  approval_date: string | null
  expiration_date: string | null
  days_until_expiration: number | null
  renewal_required: boolean
  fees_paid: number | null
  conditions: string | null
  inspector_name: string | null
  inspector_contact: string | null
  document_id: string | null
}

interface PermitsByStatus {
  pending: number
  applied: number
  approved: number
  expired: number
  rejected: number
  renewed: number
}

interface UpcomingExpiration {
  id: string
  permit_number: string
  permit_type: string
  expiration_date: string
  days_until_expiration: number
  urgency: 'critical' | 'high' | 'medium' | 'low'
  recommended_action: string
}

interface ActionItem {
  permit_id: string
  permit_number: string
  action_type: 'renew' | 'follow_up' | 'apply' | 'submit_documents' | 'schedule_inspection'
  priority: 'critical' | 'high' | 'medium' | 'low'
  description: string
  due_date: string | null
}

interface TrackPermitsOutput {
  summary: {
    total_permits: number
    active_permits: number
    expiring_soon: number
    expired: number
    pending_approval: number
    by_status: PermitsByStatus
  }
  permits: PermitItem[]
  upcoming_expirations: UpcomingExpiration[]
  action_items: ActionItem[]
  by_type: Record<string, { total: number; active: number; expiring: number }>
  recommendations: string[]
}

export const trackPermitsTool = createTool<TrackPermitsInput, TrackPermitsOutput>({
  name: 'track_permits',
  displayName: 'Track Permits',
  description: 'Tracks permit status by listing all permits for a project with their status, tracking application, approval, and expiration dates, calculating days until expiration, and identifying permits needing renewal.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to track permits for'
      },
      include_expired: {
        type: 'boolean',
        description: 'Include expired permits in results (default: false)'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 600,

  async execute(input, context) {
    const {
      project_id,
      include_expired = false
    } = input

    const startTime = Date.now()

    // Get project data
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date')
      .eq('id', project_id)
      .single()

    if (!project) {
      return {
        success: false,
        error: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND'
      }
    }

    // Get permits for the project
    let query = supabase
      .from('permits')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    if (!include_expired) {
      query = query.or('status.neq.expired,expiration_date.gte.' + new Date().toISOString().split('T')[0])
    }

    const { data: permits } = await query.order('expiration_date', { ascending: true })

    const now = new Date()
    const thirtyDaysFromNow = new Date(now)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const sixtyDaysFromNow = new Date(now)
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
    const ninetyDaysFromNow = new Date(now)
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90)

    // Process permits
    const processedPermits: PermitItem[] = []
    const upcomingExpirations: UpcomingExpiration[] = []
    const actionItems: ActionItem[] = []
    const byType: Record<string, { total: number; active: number; expiring: number }> = {}

    const byStatus: PermitsByStatus = {
      pending: 0,
      applied: 0,
      approved: 0,
      expired: 0,
      rejected: 0,
      renewed: 0
    }

    let activeCount = 0
    let expiringSoonCount = 0
    let expiredCount = 0
    let pendingApprovalCount = 0

    for (const permit of permits || []) {
      const expirationDate = permit.expiration_date ? new Date(permit.expiration_date) : null
      const applicationDate = permit.application_date ? new Date(permit.application_date) : null
      const approvalDate = permit.approval_date ? new Date(permit.approval_date) : null

      // Calculate days until expiration
      let daysUntilExpiration: number | null = null
      let renewalRequired = false

      if (expirationDate) {
        const diffMs = expirationDate.getTime() - now.getTime()
        daysUntilExpiration = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (daysUntilExpiration <= 90 && daysUntilExpiration > 0) {
          renewalRequired = true
          expiringSoonCount++
        } else if (daysUntilExpiration <= 0) {
          expiredCount++
        }
      }

      // Determine effective status
      let effectiveStatus = permit.status || 'pending'
      if (expirationDate && expirationDate < now && effectiveStatus === 'approved') {
        effectiveStatus = 'expired'
      }

      // Count by status
      if (effectiveStatus in byStatus) {
        byStatus[effectiveStatus as keyof PermitsByStatus]++
      }

      // Count active permits
      if (effectiveStatus === 'approved' && (!expirationDate || expirationDate >= now)) {
        activeCount++
      }

      // Count pending approval
      if (effectiveStatus === 'applied' || effectiveStatus === 'pending') {
        pendingApprovalCount++
      }

      // Track by type
      const permitType = permit.permit_type || permit.type || 'General'
      if (!byType[permitType]) {
        byType[permitType] = { total: 0, active: 0, expiring: 0 }
      }
      byType[permitType].total++
      if (effectiveStatus === 'approved' && (!expirationDate || expirationDate >= now)) {
        byType[permitType].active++
      }
      if (renewalRequired) {
        byType[permitType].expiring++
      }

      const permitItem: PermitItem = {
        id: permit.id,
        permit_number: permit.permit_number || permit.number || '',
        permit_type: permitType,
        description: permit.description || permit.name || '',
        status: effectiveStatus as PermitItem['status'],
        issuing_authority: permit.issuing_authority || permit.authority || null,
        application_date: permit.application_date || null,
        approval_date: permit.approval_date || null,
        expiration_date: permit.expiration_date || null,
        days_until_expiration: daysUntilExpiration,
        renewal_required: renewalRequired,
        fees_paid: permit.fees_paid || permit.fee_amount || null,
        conditions: permit.conditions || permit.special_conditions || null,
        inspector_name: permit.inspector_name || permit.inspector || null,
        inspector_contact: permit.inspector_contact || permit.inspector_phone || permit.inspector_email || null,
        document_id: permit.document_id || null
      }

      processedPermits.push(permitItem)

      // Add to upcoming expirations if expiring within 90 days
      if (daysUntilExpiration !== null && daysUntilExpiration > 0 && daysUntilExpiration <= 90) {
        const urgency = getExpirationUrgency(daysUntilExpiration)
        upcomingExpirations.push({
          id: permit.id,
          permit_number: permitItem.permit_number,
          permit_type: permitItem.permit_type,
          expiration_date: permit.expiration_date,
          days_until_expiration: daysUntilExpiration,
          urgency,
          recommended_action: getRecommendedAction(daysUntilExpiration, permitItem.permit_type)
        })
      }

      // Generate action items
      const permitActions = generatePermitActionItems(permitItem, daysUntilExpiration)
      actionItems.push(...permitActions)
    }

    // Sort upcoming expirations by days remaining
    upcomingExpirations.sort((a, b) => a.days_until_expiration - b.days_until_expiration)

    // Sort action items by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    // Generate recommendations
    const recommendations = generatePermitRecommendations(
      processedPermits,
      upcomingExpirations,
      byStatus,
      pendingApprovalCount
    )

    const output: TrackPermitsOutput = {
      summary: {
        total_permits: processedPermits.length,
        active_permits: activeCount,
        expiring_soon: expiringSoonCount,
        expired: expiredCount,
        pending_approval: pendingApprovalCount,
        by_status: byStatus
      },
      permits: processedPermits,
      upcoming_expirations: upcomingExpirations.slice(0, 10),
      action_items: actionItems.slice(0, 15),
      by_type: byType,
      recommendations
    }

    return {
      success: true,
      data: output,
      metadata: {
        executionTimeMs: Date.now() - startTime
      }
    }
  },

  formatOutput(output) {
    const { summary, upcoming_expirations, action_items } = output

    const criticalActions = action_items.filter(a => a.priority === 'critical').length
    const highActions = action_items.filter(a => a.priority === 'high').length

    const status = criticalActions > 0 ? 'error' :
      highActions > 0 || summary.expiring_soon > 0 ? 'warning' : 'success'

    return {
      title: 'Permit Status Tracker',
      summary: `${summary.total_permits} permits: ${summary.active_permits} active, ${summary.expiring_soon} expiring soon, ${summary.pending_approval} pending`,
      icon: 'file-badge',
      status,
      details: [
        { label: 'Total Permits', value: summary.total_permits.toString(), type: 'text' },
        { label: 'Active', value: summary.active_permits.toString(), type: 'badge' },
        { label: 'Expiring Soon', value: summary.expiring_soon.toString(), type: summary.expiring_soon > 0 ? 'badge' : 'text' },
        { label: 'Expired', value: summary.expired.toString(), type: summary.expired > 0 ? 'badge' : 'text' },
        { label: 'Pending Approval', value: summary.pending_approval.toString(), type: 'text' },
        { label: 'Action Items', value: `${criticalActions} critical, ${highActions} high priority`, type: 'badge' },
        { label: 'Next Expiration', value: upcoming_expirations.length > 0 ? `${upcoming_expirations[0].permit_type} in ${upcoming_expirations[0].days_until_expiration} days` : 'None upcoming', type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

function getExpirationUrgency(daysUntilExpiration: number): 'critical' | 'high' | 'medium' | 'low' {
  if (daysUntilExpiration <= 14) {return 'critical'}
  if (daysUntilExpiration <= 30) {return 'high'}
  if (daysUntilExpiration <= 60) {return 'medium'}
  return 'low'
}

function getRecommendedAction(daysUntilExpiration: number, permitType: string): string {
  if (daysUntilExpiration <= 7) {
    return `URGENT: Submit ${permitType} renewal application immediately to avoid work stoppage`
  } else if (daysUntilExpiration <= 14) {
    return `Submit renewal application this week - processing may take 10-14 days`
  } else if (daysUntilExpiration <= 30) {
    return `Begin renewal process - gather required documents and schedule inspections`
  } else if (daysUntilExpiration <= 60) {
    return `Plan for renewal - review permit conditions and any required updates`
  } else {
    return `Monitor expiration date - begin renewal planning 60 days before expiration`
  }
}

function generatePermitActionItems(
  permit: PermitItem,
  daysUntilExpiration: number | null
): ActionItem[] {
  const actions: ActionItem[] = []

  // Renewal actions for expiring permits
  if (daysUntilExpiration !== null && daysUntilExpiration > 0 && daysUntilExpiration <= 90) {
    const priority = getExpirationUrgency(daysUntilExpiration)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + Math.max(daysUntilExpiration - 14, 1))

    actions.push({
      permit_id: permit.id,
      permit_number: permit.permit_number,
      action_type: 'renew',
      priority,
      description: `Renew ${permit.permit_type} permit (expires in ${daysUntilExpiration} days)`,
      due_date: dueDate.toISOString().split('T')[0]
    })
  }

  // Follow up on pending applications
  if (permit.status === 'applied' && permit.application_date) {
    const applicationDate = new Date(permit.application_date)
    const daysSinceApplication = Math.floor((Date.now() - applicationDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSinceApplication >= 14) {
      const priority = daysSinceApplication >= 30 ? 'high' : 'medium'
      actions.push({
        permit_id: permit.id,
        permit_number: permit.permit_number,
        action_type: 'follow_up',
        priority,
        description: `Follow up on ${permit.permit_type} application (submitted ${daysSinceApplication} days ago)`,
        due_date: null
      })
    }
  }

  // Actions for pending permits not yet applied
  if (permit.status === 'pending') {
    actions.push({
      permit_id: permit.id,
      permit_number: permit.permit_number || 'TBD',
      action_type: 'apply',
      priority: 'high',
      description: `Submit application for ${permit.permit_type} permit`,
      due_date: null
    })
  }

  // Actions for rejected permits
  if (permit.status === 'rejected') {
    actions.push({
      permit_id: permit.id,
      permit_number: permit.permit_number,
      action_type: 'submit_documents',
      priority: 'high',
      description: `Address rejection reasons and resubmit ${permit.permit_type} application`,
      due_date: null
    })
  }

  // Expired permits needing renewal
  if (permit.status === 'expired' || (daysUntilExpiration !== null && daysUntilExpiration <= 0)) {
    actions.push({
      permit_id: permit.id,
      permit_number: permit.permit_number,
      action_type: 'renew',
      priority: 'critical',
      description: `EXPIRED: ${permit.permit_type} permit requires immediate renewal`,
      due_date: new Date().toISOString().split('T')[0]
    })
  }

  return actions
}

function generatePermitRecommendations(
  permits: PermitItem[],
  upcomingExpirations: UpcomingExpiration[],
  byStatus: PermitsByStatus,
  pendingApproval: number
): string[] {
  const recommendations: string[] = []

  // Critical expirations
  const criticalExpirations = upcomingExpirations.filter(e => e.urgency === 'critical')
  if (criticalExpirations.length > 0) {
    recommendations.push(
      `URGENT: ${criticalExpirations.length} permit(s) expiring within 14 days - immediate action required to avoid work stoppage`
    )
  }

  // High priority expirations
  const highExpirations = upcomingExpirations.filter(e => e.urgency === 'high')
  if (highExpirations.length > 0) {
    recommendations.push(
      `${highExpirations.length} permit(s) expiring within 30 days - begin renewal process immediately`
    )
  }

  // Expired permits
  if (byStatus.expired > 0) {
    recommendations.push(
      `${byStatus.expired} expired permit(s) on file - verify if work requiring these permits has been completed or renew immediately`
    )
  }

  // Pending applications
  if (pendingApproval > 0) {
    recommendations.push(
      `${pendingApproval} permit application(s) pending - follow up with issuing authorities on status`
    )
  }

  // Rejected permits
  if (byStatus.rejected > 0) {
    recommendations.push(
      `${byStatus.rejected} rejected permit(s) - review rejection reasons and prepare revised applications`
    )
  }

  // General best practices
  if (recommendations.length < 3) {
    recommendations.push('Maintain a 90-day rolling calendar for permit renewals')
    recommendations.push('Document all permit conditions and ensure compliance during inspections')
  }

  // Positive status
  if (criticalExpirations.length === 0 && byStatus.expired === 0 && pendingApproval === 0) {
    recommendations.push('All permits are current - maintain regular monitoring schedule')
  }

  recommendations.push('Keep digital copies of all permits accessible at the job site')

  return recommendations.slice(0, 6)
}
