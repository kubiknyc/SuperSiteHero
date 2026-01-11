/**
 * Hook for RFI cost impact aggregation and rollup
 * Provides cost impact summary, filtering, and export capabilities
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

// =============================================
// Types
// =============================================

export type CostImpactStatus = 'estimated' | 'approved' | 'rejected' | 'pending'

export interface RFICostRollup {
  total_estimated: number
  total_approved: number
  total_rejected: number
  total_pending: number
  rfi_count: number
  rfis_with_cost_impact: number
  rfis_linked_to_co: number
  total_schedule_days: number
}

export interface RFICostImpactItem {
  id: string
  rfi_number: number
  subject: string
  status: string
  priority: string
  cost_impact: number | null
  cost_impact_status: CostImpactStatus | null
  schedule_impact_days: number | null
  linked_change_order_id: string | null
  date_required: string | null
  date_responded: string | null
  project_id: string
  created_at: string
  // Joined data
  linked_change_order?: {
    id: string
    pco_number: number
    co_number: number | null
    title: string
    status: string
    approved_amount: number | null
  } | null
}

export interface CostImpactFilters {
  status?: CostImpactStatus
  minAmount?: number
  maxAmount?: number
  hasChangeOrder?: boolean
  rfiStatus?: string
  dateFrom?: string
  dateTo?: string
}

// =============================================
// Query Keys
// =============================================

export const rfiCostRollupKeys = {
  all: ['rfi-cost-rollup'] as const,
  summary: (projectId: string) => [...rfiCostRollupKeys.all, 'summary', projectId] as const,
  items: (projectId: string, filters?: CostImpactFilters) =>
    [...rfiCostRollupKeys.all, 'items', projectId, filters] as const,
  byMonth: (projectId: string) => [...rfiCostRollupKeys.all, 'by-month', projectId] as const,
}

// =============================================
// Query Hooks
// =============================================

/**
 * Get cost impact rollup summary for a project
 */
export function useRFICostRollup(projectId: string | undefined) {
  return useQuery({
    queryKey: rfiCostRollupKeys.summary(projectId || ''),
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase.rpc('get_rfi_cost_rollup', {
        p_project_id: projectId,
      })

      if (error) {throw error}
      return data as RFICostRollup
    },
    enabled: !!projectId,
  })
}

/**
 * Get all RFIs with cost impact for a project (with filtering)
 */
export function useRFIsWithCostImpact(
  projectId: string | undefined,
  filters?: CostImpactFilters
) {
  return useQuery({
    queryKey: rfiCostRollupKeys.items(projectId || '', filters),
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      let query = supabase
        .from('rfis')
        .select(
          `
          id,
          rfi_number,
          subject,
          status,
          priority,
          cost_impact,
          cost_impact_status,
          schedule_impact_days,
          linked_change_order_id,
          date_required,
          date_responded,
          project_id,
          created_at,
          linked_change_order:change_orders(
            id,
            pco_number,
            co_number,
            title,
            status,
            approved_amount
          )
        `
        )
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .or('cost_impact.not.is.null,schedule_impact_days.not.is.null')
        .order('cost_impact', { ascending: false, nullsFirst: false })

      // Apply filters
      if (filters?.status) {
        query = query.eq('cost_impact_status', filters.status)
      }

      if (filters?.minAmount !== undefined) {
        query = query.gte('cost_impact', filters.minAmount)
      }

      if (filters?.maxAmount !== undefined) {
        query = query.lte('cost_impact', filters.maxAmount)
      }

      if (filters?.hasChangeOrder !== undefined) {
        if (filters.hasChangeOrder) {
          query = query.not('linked_change_order_id', 'is', null)
        } else {
          query = query.is('linked_change_order_id', null)
        }
      }

      if (filters?.rfiStatus) {
        query = query.eq('status', filters.rfiStatus)
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      const { data, error } = await query

      if (error) {throw error}
      return data as RFICostImpactItem[]
    },
    enabled: !!projectId,
  })
}

/**
 * Get cost impact summary by month for trend analysis
 */
export function useRFICostByMonth(projectId: string | undefined) {
  return useQuery({
    queryKey: rfiCostRollupKeys.byMonth(projectId || ''),
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('rfis')
        .select('created_at, cost_impact, cost_impact_status')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .not('cost_impact', 'is', null)
        .order('created_at', { ascending: true })

      if (error) {throw error}

      // Group by month
      const byMonth: Record<
        string,
        {
          month: string
          estimated: number
          approved: number
          rejected: number
          total: number
          count: number
        }
      > = {}

      data.forEach((rfi) => {
        const monthKey = format(new Date(rfi.created_at), 'yyyy-MM')
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = {
            month: monthKey,
            estimated: 0,
            approved: 0,
            rejected: 0,
            total: 0,
            count: 0,
          }
        }

        const amount = rfi.cost_impact || 0
        byMonth[monthKey].total += amount
        byMonth[monthKey].count++

        switch (rfi.cost_impact_status) {
          case 'approved':
            byMonth[monthKey].approved += amount
            break
          case 'rejected':
            byMonth[monthKey].rejected += amount
            break
          default:
            byMonth[monthKey].estimated += amount
        }
      })

      return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month))
    },
    enabled: !!projectId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Update cost impact status for an RFI
 */
export function useUpdateCostImpactStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      rfiId,
      projectId,
      status,
      costImpact,
    }: {
      rfiId: string
      projectId: string
      status: CostImpactStatus
      costImpact?: number
    }) => {
      const updates: Record<string, unknown> = {
        cost_impact_status: status,
      }

      if (costImpact !== undefined) {
        updates.cost_impact = costImpact
      }

      const { data, error } = await supabase
        .from('rfis')
        .update(updates)
        .eq('id', rfiId)
        .select()
        .single()

      if (error) {throw error}
      return { ...data, projectId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiCostRollupKeys.summary(data.projectId) })
      queryClient.invalidateQueries({
        queryKey: rfiCostRollupKeys.items(data.projectId),
      })
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })
    },
  })
}

// =============================================
// Export Functions
// =============================================

/**
 * Export cost impact data as CSV
 */
export function exportCostImpactToCSV(items: RFICostImpactItem[]): string {
  const headers = [
    'RFI #',
    'Subject',
    'RFI Status',
    'Priority',
    'Cost Impact',
    'Cost Status',
    'Schedule Days',
    'Change Order',
    'CO Status',
    'CO Amount',
    'Date Required',
    'Date Responded',
    'Created',
  ]

  const rows = items.map((item) => [
    `RFI-${String(item.rfi_number).padStart(3, '0')}`,
    `"${item.subject.replace(/"/g, '""')}"`,
    item.status,
    item.priority,
    item.cost_impact?.toFixed(2) || '',
    item.cost_impact_status || 'estimated',
    item.schedule_impact_days?.toString() || '',
    item.linked_change_order
      ? item.linked_change_order.co_number
        ? `CO-${String(item.linked_change_order.co_number).padStart(3, '0')}`
        : `PCO-${String(item.linked_change_order.pco_number).padStart(3, '0')}`
      : '',
    item.linked_change_order?.status || '',
    item.linked_change_order?.approved_amount?.toFixed(2) || '',
    item.date_required ? format(new Date(item.date_required), 'MM/dd/yyyy') : '',
    item.date_responded ? format(new Date(item.date_responded), 'MM/dd/yyyy') : '',
    format(new Date(item.created_at), 'MM/dd/yyyy'),
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

/**
 * Download cost impact report as CSV file
 */
export function downloadCostImpactReport(
  items: RFICostImpactItem[],
  projectName?: string
): void {
  const csv = exportCostImpactToCSV(items)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `rfi-cost-impact-${projectName ? projectName.replace(/\s+/g, '-').toLowerCase() + '-' : ''}${format(new Date(), 'yyyy-MM-dd')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get color for cost impact status
 */
export function getCostImpactStatusColor(status: CostImpactStatus | null): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'estimated':
    default:
      return 'bg-blue-100 text-blue-800'
  }
}

/**
 * Get label for cost impact status
 */
export function getCostImpactStatusLabel(status: CostImpactStatus | null): string {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'pending':
      return 'Pending'
    case 'estimated':
    default:
      return 'Estimated'
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {return '-'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Calculate percentage of total
 */
export function calculatePercentage(amount: number, total: number): number {
  if (total === 0) {return 0}
  return Math.round((amount / total) * 100)
}
