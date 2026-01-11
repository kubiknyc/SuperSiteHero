/**
 * Route Approval Tool
 * Intelligently routes documents/items to the appropriate approver based on type, value, and history
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface RouteApprovalInput {
  project_id: string
  item_type: 'change_order' | 'invoice' | 'submittal' | 'rfi' | 'payment_application' | 'purchase_order'
  item_id: string
  urgency?: 'low' | 'normal' | 'high' | 'critical'
}

interface ApproverRecommendation {
  user_id: string
  user_name: string
  role: string
  confidence: number
  reasoning: string
  avg_response_time_hours: number
  current_workload: number
  is_available: boolean
}

interface ApprovalPath {
  step: number
  approver_role: string
  approver_id?: string
  approver_name?: string
  threshold_applies: boolean
  threshold_description?: string
}

interface RouteApprovalOutput {
  item_type: string
  item_id: string
  item_description: string
  estimated_value?: number
  recommended_approver: ApproverRecommendation
  alternate_approvers: ApproverRecommendation[]
  approval_path: ApprovalPath[]
  routing_rules_applied: string[]
  requires_multiple_approvals: boolean
  estimated_completion_date: string
}

// Approval thresholds by item type and value
const APPROVAL_THRESHOLDS: Record<string, { threshold: number; requires: string[] }[]> = {
  change_order: [
    { threshold: 5000, requires: ['project_manager'] },
    { threshold: 25000, requires: ['project_manager', 'project_executive'] },
    { threshold: 100000, requires: ['project_manager', 'project_executive', 'owner'] },
  ],
  invoice: [
    { threshold: 10000, requires: ['project_manager'] },
    { threshold: 50000, requires: ['project_manager', 'accounting_manager'] },
  ],
  payment_application: [
    { threshold: 50000, requires: ['project_manager'] },
    { threshold: 250000, requires: ['project_manager', 'project_executive'] },
  ],
  purchase_order: [
    { threshold: 5000, requires: ['project_manager'] },
    { threshold: 25000, requires: ['project_manager', 'operations_manager'] },
  ],
  submittal: [
    { threshold: 0, requires: ['project_engineer'] },
  ],
  rfi: [
    { threshold: 0, requires: ['project_engineer'] },
  ],
}

// Role hierarchy for fallback routing
const ROLE_HIERARCHY: Record<string, string[]> = {
  project_engineer: ['project_manager', 'superintendent'],
  project_manager: ['project_executive', 'operations_manager'],
  superintendent: ['project_manager', 'operations_manager'],
  project_executive: ['owner', 'principal'],
  operations_manager: ['project_executive', 'principal'],
}

function getRequiredApprovers(itemType: string, value: number): string[] {
  const thresholds = APPROVAL_THRESHOLDS[itemType] || APPROVAL_THRESHOLDS.submittal

  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (value >= thresholds[i].threshold) {
      return thresholds[i].requires
    }
  }

  return thresholds[0].requires
}

function calculateAvailability(user: {
  pending_approvals?: number
  last_login?: string
  is_active?: boolean
}): boolean {
  if (!user.is_active) return false

  // Check if user has logged in within last 7 days
  if (user.last_login) {
    const lastLogin = new Date(user.last_login)
    const daysSinceLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLogin > 7) return false
  }

  return true
}

function calculateWorkload(pendingCount: number): number {
  // Normalize to 0-100 scale
  return Math.min(pendingCount * 10, 100)
}

export const routeApprovalTool = createTool<RouteApprovalInput, RouteApprovalOutput>({
  name: 'route_approval',
  displayName: 'Route Approval',
  description: 'Intelligently routes documents and items to the appropriate approver based on item type, value thresholds, user workload, and historical response times.',
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
        description: 'Type of item requiring approval'
      },
      item_id: {
        type: 'string',
        description: 'ID of the item to route'
      },
      urgency: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'critical'],
        description: 'Urgency level (default: normal)'
      }
    },
    required: ['project_id', 'item_type', 'item_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 800,

  async execute(input, context) {
    const { project_id, item_type, item_id, urgency = 'normal' } = input

    // Get item details based on type
    let itemData: { description: string; value?: number } = { description: 'Unknown item' }

    if (item_type === 'change_order') {
      const { data } = await supabase
        .from('change_orders')
        .select('title, amount, description')
        .eq('id', item_id)
        .single()
      if (data) {
        itemData = { description: data.title || data.description, value: data.amount }
      }
    } else if (item_type === 'invoice') {
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number, amount, vendor_name')
        .eq('id', item_id)
        .single()
      if (data) {
        itemData = { description: `Invoice #${data.invoice_number} - ${data.vendor_name}`, value: data.amount }
      }
    } else if (item_type === 'submittal') {
      const { data } = await supabase
        .from('submittals')
        .select('number, title, spec_section')
        .eq('id', item_id)
        .single()
      if (data) {
        itemData = { description: `${data.number}: ${data.title}`, value: 0 }
      }
    } else if (item_type === 'rfi') {
      const { data } = await supabase
        .from('rfis')
        .select('number, subject')
        .eq('id', item_id)
        .single()
      if (data) {
        itemData = { description: `RFI #${data.number}: ${data.subject}`, value: 0 }
      }
    }

    const estimatedValue = itemData.value || 0
    const requiredRoles = getRequiredApprovers(item_type, estimatedValue)

    // Get project team members with their roles
    const { data: teamMembers } = await supabase
      .from('project_team')
      .select(`
        user_id,
        role,
        users (
          id,
          full_name,
          email,
          last_sign_in_at
        )
      `)
      .eq('project_id', project_id)

    // Get pending approval counts for workload calculation
    const { data: pendingApprovals } = await supabase
      .from('workflow_items')
      .select('assigned_to, count')
      .eq('status', 'pending')
      .in('assigned_to', teamMembers?.map(t => t.user_id) || [])

    const pendingByUser = new Map<string, number>()
    for (const item of pendingApprovals || []) {
      pendingByUser.set(item.assigned_to, (pendingByUser.get(item.assigned_to) || 0) + 1)
    }

    // Get historical response times
    const { data: responseHistory } = await supabase
      .from('workflow_items')
      .select('assigned_to, created_at, completed_at')
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .in('assigned_to', teamMembers?.map(t => t.user_id) || [])
      .order('completed_at', { ascending: false })
      .limit(100)

    const avgResponseByUser = new Map<string, number>()
    const responsesByUser = new Map<string, number[]>()

    for (const item of responseHistory || []) {
      if (item.created_at && item.completed_at) {
        const hours = (new Date(item.completed_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60)
        const existing = responsesByUser.get(item.assigned_to) || []
        existing.push(hours)
        responsesByUser.set(item.assigned_to, existing)
      }
    }

    for (const [userId, times] of Array.from(responsesByUser.entries())) {
      avgResponseByUser.set(userId, times.reduce((a, b) => a + b, 0) / times.length)
    }

    // Build approver recommendations
    const approverRecommendations: ApproverRecommendation[] = []
    const rulesApplied: string[] = []

    for (const role of requiredRoles) {
      const matchingMembers = teamMembers?.filter(t =>
        t.role?.toLowerCase().replace(/\s+/g, '_') === role ||
        t.role?.toLowerCase().includes(role.replace(/_/g, ' '))
      ) || []

      for (const member of matchingMembers) {
        const user = member.users as { id: string; full_name: string; email: string; last_sign_in_at?: string }
        if (!user) continue

        const pendingCount = pendingByUser.get(user.id) || 0
        const avgResponse = avgResponseByUser.get(user.id) || 24
        const isAvailable = calculateAvailability({
          pending_approvals: pendingCount,
          last_login: user.last_sign_in_at,
          is_active: true
        })

        let confidence = 0.5
        let reasoning = `Matched role: ${role}`

        // Boost confidence based on factors
        if (isAvailable) confidence += 0.2
        if (pendingCount < 5) confidence += 0.15
        if (avgResponse < 24) confidence += 0.15

        approverRecommendations.push({
          user_id: user.id,
          user_name: user.full_name || user.email,
          role: member.role || role,
          confidence: Math.min(confidence, 1),
          reasoning,
          avg_response_time_hours: Math.round(avgResponse),
          current_workload: calculateWorkload(pendingCount),
          is_available: isAvailable
        })
      }
    }

    // Sort by confidence
    approverRecommendations.sort((a, b) => b.confidence - a.confidence)

    // Build approval path
    const approvalPath: ApprovalPath[] = requiredRoles.map((role, index) => {
      const matchingApprover = approverRecommendations.find(a =>
        a.role.toLowerCase().replace(/\s+/g, '_') === role
      )

      const thresholds = APPROVAL_THRESHOLDS[item_type]
      const applicableThreshold = thresholds?.find(t => estimatedValue >= t.threshold && t.requires.includes(role))

      return {
        step: index + 1,
        approver_role: role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        approver_id: matchingApprover?.user_id,
        approver_name: matchingApprover?.user_name,
        threshold_applies: !!applicableThreshold,
        threshold_description: applicableThreshold
          ? `Required for items over $${applicableThreshold.threshold.toLocaleString()}`
          : undefined
      }
    })

    // Add rules applied
    if (estimatedValue > 0) {
      rulesApplied.push(`Value-based routing: $${estimatedValue.toLocaleString()}`)
    }
    if (requiredRoles.length > 1) {
      rulesApplied.push(`Multi-level approval required (${requiredRoles.length} approvers)`)
    }
    if (urgency === 'critical' || urgency === 'high') {
      rulesApplied.push(`Priority routing: ${urgency} urgency`)
    }

    // Calculate estimated completion
    const totalEstimatedHours = approvalPath.reduce((sum, step) => {
      const approver = approverRecommendations.find(a => a.user_id === step.approver_id)
      return sum + (approver?.avg_response_time_hours || 24)
    }, 0)

    const estimatedCompletion = new Date()
    estimatedCompletion.setHours(estimatedCompletion.getHours() + totalEstimatedHours)

    const recommended = approverRecommendations[0] || {
      user_id: '',
      user_name: 'No approver found',
      role: requiredRoles[0],
      confidence: 0,
      reasoning: 'No matching team member found for required role',
      avg_response_time_hours: 0,
      current_workload: 0,
      is_available: false
    }

    return {
      success: true,
      data: {
        item_type,
        item_id,
        item_description: itemData.description,
        estimated_value: estimatedValue,
        recommended_approver: recommended,
        alternate_approvers: approverRecommendations.slice(1, 4),
        approval_path: approvalPath,
        routing_rules_applied: rulesApplied,
        requires_multiple_approvals: requiredRoles.length > 1,
        estimated_completion_date: estimatedCompletion.toISOString()
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { recommended_approver, approval_path, requires_multiple_approvals } = output

    return {
      title: 'Approval Routing Complete',
      summary: `Route to ${recommended_approver.user_name} (${Math.round(recommended_approver.confidence * 100)}% match)`,
      icon: requires_multiple_approvals ? 'git-branch' : 'user-check',
      status: recommended_approver.is_available ? 'success' : 'warning',
      details: [
        { label: 'Recommended', value: recommended_approver.user_name, type: 'text' },
        { label: 'Role', value: recommended_approver.role, type: 'badge' },
        { label: 'Avg Response', value: `${recommended_approver.avg_response_time_hours}h`, type: 'text' },
        { label: 'Workload', value: `${recommended_approver.current_workload}%`, type: 'text' },
        { label: 'Approval Steps', value: approval_path.length, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
