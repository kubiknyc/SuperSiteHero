/**
 * Subcontractor Change Orders Hooks
 * Hooks for fetching and displaying change order impact (P1-2 Feature)
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorChangeOrder,
  SubcontractorChangeOrderItem,
  ChangeOrderSummary,
  ChangeOrderStatus,
  ChangeOrderType,
} from '@/types/subcontractor-portal'

// =============================================
// QUERY KEYS
// =============================================

export const changeOrderKeys = {
  all: ['subcontractor', 'change-orders'] as const,
  list: () => [...changeOrderKeys.all, 'list'] as const,
  detail: (id: string) => [...changeOrderKeys.all, 'detail', id] as const,
  items: (id: string) => [...changeOrderKeys.all, 'items', id] as const,
  summary: () => [...changeOrderKeys.all, 'summary'] as const,
}

// =============================================
// QUERY HOOKS
// =============================================

/**
 * Fetch all change orders for the current subcontractor
 */
export function useSubcontractorChangeOrders() {
  const { user } = useAuth()

  return useQuery({
    queryKey: changeOrderKeys.list(),
    queryFn: () => subcontractorPortalApi.getChangeOrders(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch line items for a specific change order
 */
export function useChangeOrderItems(changeOrderId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: changeOrderKeys.items(changeOrderId),
    queryFn: () => subcontractorPortalApi.getChangeOrderItems(user?.id || '', changeOrderId),
    enabled: !!user?.id && !!changeOrderId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch change order summary for dashboard
 */
export function useChangeOrderSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: changeOrderKeys.summary(),
    queryFn: () => subcontractorPortalApi.getChangeOrderSummary(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get status badge variant for change order status
 */
export function getChangeOrderStatusVariant(status: ChangeOrderStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'draft':
      return 'outline'
    case 'pending_estimate':
    case 'estimate_complete':
    case 'pending_internal_approval':
    case 'internally_approved':
    case 'pending_owner_review':
      return 'secondary'
    case 'approved':
      return 'default'
    case 'rejected':
    case 'void':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get human-readable label for change order status
 */
export function getChangeOrderStatusLabel(status: ChangeOrderStatus): string {
  const labels: Record<ChangeOrderStatus, string> = {
    draft: 'Draft',
    pending_estimate: 'Pending Estimate',
    estimate_complete: 'Estimate Complete',
    pending_internal_approval: 'Pending Internal Approval',
    internally_approved: 'Internally Approved',
    pending_owner_review: 'Pending Owner Review',
    approved: 'Approved',
    rejected: 'Rejected',
    void: 'Void',
  }
  return labels[status] || status
}

/**
 * Get status color for styling
 */
export function getChangeOrderStatusColor(status: ChangeOrderStatus): string {
  switch (status) {
    case 'draft':
      return 'text-muted-foreground'
    case 'pending_estimate':
    case 'estimate_complete':
      return 'text-primary'
    case 'pending_internal_approval':
    case 'internally_approved':
    case 'pending_owner_review':
      return 'text-warning'
    case 'approved':
      return 'text-success'
    case 'rejected':
    case 'void':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get human-readable label for change order type
 */
export function getChangeOrderTypeLabel(type: ChangeOrderType): string {
  const labels: Record<ChangeOrderType, string> = {
    scope_change: 'Scope Change',
    design_clarification: 'Design Clarification',
    unforeseen_condition: 'Unforeseen Condition',
    owner_request: 'Owner Request',
    value_engineering: 'Value Engineering',
    error_omission: 'Error/Omission',
  }
  return labels[type] || type
}

/**
 * Get icon color for change type
 */
export function getChangeOrderTypeColor(type: ChangeOrderType): string {
  switch (type) {
    case 'scope_change':
      return 'text-primary'
    case 'design_clarification':
      return 'text-info'
    case 'unforeseen_condition':
      return 'text-warning'
    case 'owner_request':
      return 'text-success'
    case 'value_engineering':
      return 'text-success'
    case 'error_omission':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Check if a change order is pending
 */
export function isPending(status: ChangeOrderStatus): boolean {
  return [
    'pending_estimate',
    'estimate_complete',
    'pending_internal_approval',
    'internally_approved',
    'pending_owner_review',
  ].includes(status)
}

/**
 * Check if a change order is finalized (approved, rejected, or void)
 */
export function isFinalized(status: ChangeOrderStatus): boolean {
  return ['approved', 'rejected', 'void'].includes(status)
}

/**
 * Get display number for a change order (PCO or CO)
 */
export function getDisplayNumber(co: SubcontractorChangeOrder): string {
  if (co.is_pco) {
    return `PCO-${co.pco_number || '?'}`
  }
  return `CO-${co.co_number || '?'}`
}

/**
 * Format amount as currency
 */
export function formatAmount(amount: number | null | undefined): string {
  if (amount == null) { return '$0.00' }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format days impact
 */
export function formatDaysImpact(days: number | null | undefined): string {
  if (days == null || days === 0) { return 'No impact' }
  const sign = days > 0 ? '+' : ''
  return `${sign}${days} day${Math.abs(days) !== 1 ? 's' : ''}`
}

/**
 * Group change orders by project
 */
export function groupChangeOrdersByProject(
  changeOrders: SubcontractorChangeOrder[]
): Record<string, SubcontractorChangeOrder[]> {
  return changeOrders.reduce((acc, co) => {
    const key = co.project_id
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(co)
    return acc
  }, {} as Record<string, SubcontractorChangeOrder[]>)
}

/**
 * Calculate total for change order items
 */
export function calculateItemsTotals(items: SubcontractorChangeOrderItem[]) {
  return items.reduce(
    (acc, item) => ({
      labor_amount: acc.labor_amount + item.labor_amount,
      material_amount: acc.material_amount + item.material_amount,
      equipment_amount: acc.equipment_amount + item.equipment_amount,
      subcontract_amount: acc.subcontract_amount + item.subcontract_amount,
      other_amount: acc.other_amount + item.other_amount,
      markup_amount: acc.markup_amount + item.markup_amount,
      total_amount: acc.total_amount + item.total_amount,
    }),
    {
      labor_amount: 0,
      material_amount: 0,
      equipment_amount: 0,
      subcontract_amount: 0,
      other_amount: 0,
      markup_amount: 0,
      total_amount: 0,
    }
  )
}

// Re-export types for convenience
export type {
  SubcontractorChangeOrder,
  SubcontractorChangeOrderItem,
  ChangeOrderSummary,
  ChangeOrderStatus,
  ChangeOrderType,
}
