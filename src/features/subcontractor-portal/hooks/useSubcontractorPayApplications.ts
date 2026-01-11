/**
 * Subcontractor Pay Applications Hooks
 * Hooks for fetching and managing pay applications with line items (P1 Feature)
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorPayApplication,
  SubcontractorPayAppLineItem,
  PayApplicationSummary,
  PayApplicationStatus,
} from '@/types/subcontractor-portal'

// =============================================
// QUERY KEYS
// =============================================

export const payApplicationKeys = {
  all: ['subcontractor', 'pay-applications'] as const,
  list: () => [...payApplicationKeys.all, 'list'] as const,
  detail: (id: string) => [...payApplicationKeys.all, 'detail', id] as const,
  summary: () => [...payApplicationKeys.all, 'summary'] as const,
}

// =============================================
// QUERY HOOKS
// =============================================

/**
 * Fetch all pay applications for the current subcontractor
 */
export function useSubcontractorPayApplications() {
  const { user } = useAuth()

  return useQuery({
    queryKey: payApplicationKeys.list(),
    queryFn: () => subcontractorPortalApi.getPayApplications(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch a single pay application by ID
 */
export function useSubcontractorPayApplication(applicationId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: payApplicationKeys.detail(applicationId),
    queryFn: () => subcontractorPortalApi.getPayApplication(user?.id || '', applicationId),
    enabled: !!user?.id && !!applicationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch pay application summary for dashboard
 */
export function usePayApplicationSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: payApplicationKeys.summary(),
    queryFn: () => subcontractorPortalApi.getPayApplicationSummary(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get status badge variant for pay application status
 */
export function getPayAppStatusVariant(status: PayApplicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'draft':
      return 'outline'
    case 'submitted':
    case 'under_review':
      return 'secondary'
    case 'approved':
    case 'paid':
      return 'default'
    case 'rejected':
    case 'void':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Get human-readable label for pay application status
 */
export function getPayAppStatusLabel(status: PayApplicationStatus): string {
  const labels: Record<PayApplicationStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
    void: 'Void',
  }
  return labels[status] || status
}

/**
 * Get status color for styling
 */
export function getPayAppStatusColor(status: PayApplicationStatus): string {
  switch (status) {
    case 'draft':
      return 'text-muted-foreground'
    case 'submitted':
      return 'text-blue-600'
    case 'under_review':
      return 'text-yellow-600'
    case 'approved':
      return 'text-green-600'
    case 'paid':
      return 'text-emerald-600'
    case 'rejected':
      return 'text-red-600'
    case 'void':
      return 'text-gray-500'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) {return '$0.00'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) {return '0%'}
  return `${value.toFixed(1)}%`
}

/**
 * Calculate total for line items
 */
export function calculateLineItemsTotals(lineItems: SubcontractorPayAppLineItem[]) {
  return lineItems.reduce(
    (acc, item) => ({
      scheduled_value: acc.scheduled_value + item.scheduled_value,
      change_order_adjustments: acc.change_order_adjustments + item.change_order_adjustments,
      total_scheduled_value: acc.total_scheduled_value + item.total_scheduled_value,
      work_completed_previous: acc.work_completed_previous + item.work_completed_previous,
      work_completed_this_period: acc.work_completed_this_period + item.work_completed_this_period,
      materials_stored: acc.materials_stored + item.materials_stored,
      total_completed_stored: acc.total_completed_stored + item.total_completed_stored,
      balance_to_finish: acc.balance_to_finish + item.balance_to_finish,
      retainage_amount: acc.retainage_amount + item.retainage_amount,
    }),
    {
      scheduled_value: 0,
      change_order_adjustments: 0,
      total_scheduled_value: 0,
      work_completed_previous: 0,
      work_completed_this_period: 0,
      materials_stored: 0,
      total_completed_stored: 0,
      balance_to_finish: 0,
      retainage_amount: 0,
    }
  )
}

/**
 * Group pay applications by project
 */
export function groupPayApplicationsByProject(
  applications: SubcontractorPayApplication[]
): Record<string, SubcontractorPayApplication[]> {
  return applications.reduce((acc, app) => {
    const key = app.project_id
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(app)
    return acc
  }, {} as Record<string, SubcontractorPayApplication[]>)
}

/**
 * Check if a pay application is awaiting action
 */
export function isAwaitingAction(status: PayApplicationStatus): boolean {
  return ['submitted', 'under_review'].includes(status)
}

/**
 * Check if a pay application is complete (paid or void)
 */
export function isComplete(status: PayApplicationStatus): boolean {
  return ['paid', 'void'].includes(status)
}

// Re-export types for convenience
export type {
  SubcontractorPayApplication,
  SubcontractorPayAppLineItem,
  PayApplicationSummary,
  PayApplicationStatus,
}
