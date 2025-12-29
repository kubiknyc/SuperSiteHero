/**
 * Hook for Submittal Lead Time Tracking
 *
 * Tracks and analyzes submittal approval timelines.
 * Provides metrics for average review time, bottleneck identification,
 * and historical trend analysis.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInDays, differenceInBusinessDays, parseISO, format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { WorkflowItem, WorkflowItemHistory } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

export interface SubmittalWithLeadTime extends WorkflowItem {
  leadTimeMetrics: LeadTimeMetrics
  statusHistory: StatusHistoryEntry[]
}

export interface LeadTimeMetrics {
  totalDays: number
  businessDays: number
  submittedToReview: number | null    // Days from submitted to under_review
  reviewToApproval: number | null     // Days from under_review to approved/rejected
  submittedToApproval: number | null  // Total days from submitted to final status
  isOverdue: boolean
  daysOverdue: number
  expectedApprovalDate: string | null
  status: 'pending' | 'on_track' | 'at_risk' | 'overdue' | 'completed'
}

export interface StatusHistoryEntry {
  status: string
  timestamp: string
  daysInStatus: number
  changedBy?: string
}

export interface LeadTimeStats {
  totalSubmittals: number
  completedCount: number
  pendingCount: number
  overdueCount: number
  averageLeadTimeDays: number
  averageBusinessDays: number
  averageSubmitToReviewDays: number
  averageReviewToApprovalDays: number
  fastestApprovalDays: number
  slowestApprovalDays: number
  medianLeadTimeDays: number
  percentile90Days: number
  byStatus: Record<string, number>
  byMonth: MonthlyStats[]
  bottlenecks: BottleneckInfo[]
}

export interface MonthlyStats {
  month: string
  year: number
  submitted: number
  approved: number
  rejected: number
  averageLeadTime: number
}

export interface BottleneckInfo {
  stage: string
  averageDays: number
  maxDays: number
  count: number
  percentOfTotal: number
}

export interface LeadTimeFilters {
  status?: string[]
  dateRange?: {
    start: string
    end: string
  }
  discipline?: string
}

// ============================================================================
// Constants
// ============================================================================

const _STATUS_ORDER = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'resubmit_required']

const EXPECTED_LEAD_TIMES = {
  submitToReview: 3,       // 3 days to start review
  reviewToApproval: 7,     // 7 days for review
  totalStandard: 14,       // 14 days total standard lead time
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate lead time metrics for a single submittal
 */
function calculateLeadTimeMetrics(
  submittal: WorkflowItem,
  history: WorkflowItemHistory[]
): LeadTimeMetrics {
  const metrics: LeadTimeMetrics = {
    totalDays: 0,
    businessDays: 0,
    submittedToReview: null,
    reviewToApproval: null,
    submittedToApproval: null,
    isOverdue: false,
    daysOverdue: 0,
    expectedApprovalDate: null,
    status: 'pending',
  }

  if (!submittal.created_at) {
    return metrics
  }

  const createdDate = parseISO(submittal.created_at)
  const today = new Date()

  // Build status timeline from history
  const statusTimeline = new Map<string, Date>()

  // Add initial status
  statusTimeline.set('created', createdDate)

  // Add status changes from history
  history
    .filter(h => h.field_changed === 'status' && h.new_value && h.changed_at)
    .sort((a, b) => new Date(a.changed_at!).getTime() - new Date(b.changed_at!).getTime())
    .forEach(h => {
      if (h.changed_at && h.new_value) {
        statusTimeline.set(h.new_value, parseISO(h.changed_at))
      }
    })

  // Get key timestamps
  const submittedDate = statusTimeline.get('submitted')
  const reviewDate = statusTimeline.get('under_review')
  const approvedDate = statusTimeline.get('approved')
  const rejectedDate = statusTimeline.get('rejected')
  const finalDate = approvedDate || rejectedDate

  // Calculate total days
  const endDate = finalDate || today
  metrics.totalDays = differenceInDays(endDate, createdDate)
  metrics.businessDays = differenceInBusinessDays(endDate, createdDate)

  // Calculate stage-specific metrics
  if (submittedDate) {
    if (reviewDate) {
      metrics.submittedToReview = differenceInDays(reviewDate, submittedDate)
    } else if (!finalDate) {
      // Still waiting for review
      metrics.submittedToReview = differenceInDays(today, submittedDate)
    }

    if (reviewDate && finalDate) {
      metrics.reviewToApproval = differenceInDays(finalDate, reviewDate)
    } else if (reviewDate && !finalDate) {
      // Still in review
      metrics.reviewToApproval = differenceInDays(today, reviewDate)
    }

    if (finalDate) {
      metrics.submittedToApproval = differenceInDays(finalDate, submittedDate)
    }
  }

  // Calculate expected approval date
  if (submittedDate && !finalDate) {
    const expectedDate = new Date(submittedDate)
    expectedDate.setDate(expectedDate.getDate() + EXPECTED_LEAD_TIMES.totalStandard)
    metrics.expectedApprovalDate = expectedDate.toISOString()

    // Check if overdue
    if (today > expectedDate) {
      metrics.isOverdue = true
      metrics.daysOverdue = differenceInDays(today, expectedDate)
    }
  }

  // Determine overall status
  if (finalDate) {
    metrics.status = 'completed'
  } else if (metrics.isOverdue) {
    metrics.status = 'overdue'
  } else if (submittal.due_date) {
    const dueDate = parseISO(submittal.due_date)
    const daysUntilDue = differenceInDays(dueDate, today)
    if (daysUntilDue < 0) {
      metrics.status = 'overdue'
      metrics.isOverdue = true
      metrics.daysOverdue = Math.abs(daysUntilDue)
    } else if (daysUntilDue <= 3) {
      metrics.status = 'at_risk'
    } else {
      metrics.status = 'on_track'
    }
  } else {
    metrics.status = metrics.totalDays > EXPECTED_LEAD_TIMES.totalStandard ? 'at_risk' : 'on_track'
  }

  return metrics
}

/**
 * Build status history with time spent in each status
 */
function buildStatusHistory(
  submittal: WorkflowItem,
  history: WorkflowItemHistory[]
): StatusHistoryEntry[] {
  const entries: StatusHistoryEntry[] = []

  if (!submittal.created_at) {
    return entries
  }

  // Get status change events
  const statusChanges = history
    .filter(h => h.field_changed === 'status' && h.new_value && h.changed_at)
    .sort((a, b) => new Date(a.changed_at!).getTime() - new Date(b.changed_at!).getTime())

  // Add initial status (draft or whatever the first status was)
  let previousTimestamp = parseISO(submittal.created_at)
  let previousStatus = statusChanges.length > 0 ? statusChanges[0].old_value || 'draft' : submittal.status

  statusChanges.forEach((change) => {
    if (!change.changed_at) {return}
    const changeDate = parseISO(change.changed_at)
    const daysInStatus = differenceInDays(changeDate, previousTimestamp)

    entries.push({
      status: previousStatus!,
      timestamp: previousTimestamp.toISOString(),
      daysInStatus,
      changedBy: change.changed_by || undefined,
    })

    previousTimestamp = changeDate
    previousStatus = change.new_value!
  })

  // Add current status
  entries.push({
    status: submittal.status,
    timestamp: previousTimestamp.toISOString(),
    daysInStatus: differenceInDays(new Date(), previousTimestamp),
  })

  return entries
}

/**
 * Calculate statistics from an array of lead times
 */
function calculateLeadTimeStats(submittals: SubmittalWithLeadTime[]): LeadTimeStats {
  const completed = submittals.filter(s => s.leadTimeMetrics.status === 'completed')
  const pending = submittals.filter(s => s.leadTimeMetrics.status !== 'completed')
  const overdue = submittals.filter(s => s.leadTimeMetrics.isOverdue)

  // Calculate averages from completed submittals
  const leadTimes = completed.map(s => s.leadTimeMetrics.submittedToApproval || 0).filter(t => t > 0)
  const submitToReviewTimes = completed.map(s => s.leadTimeMetrics.submittedToReview || 0).filter(t => t > 0)
  const reviewToApprovalTimes = completed.map(s => s.leadTimeMetrics.reviewToApproval || 0).filter(t => t > 0)
  const businessDays = completed.map(s => s.leadTimeMetrics.businessDays).filter(t => t > 0)

  const sortedLeadTimes = [...leadTimes].sort((a, b) => a - b)

  const stats: LeadTimeStats = {
    totalSubmittals: submittals.length,
    completedCount: completed.length,
    pendingCount: pending.length,
    overdueCount: overdue.length,
    averageLeadTimeDays: leadTimes.length > 0
      ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
      : 0,
    averageBusinessDays: businessDays.length > 0
      ? Math.round(businessDays.reduce((a, b) => a + b, 0) / businessDays.length)
      : 0,
    averageSubmitToReviewDays: submitToReviewTimes.length > 0
      ? Math.round(submitToReviewTimes.reduce((a, b) => a + b, 0) / submitToReviewTimes.length)
      : 0,
    averageReviewToApprovalDays: reviewToApprovalTimes.length > 0
      ? Math.round(reviewToApprovalTimes.reduce((a, b) => a + b, 0) / reviewToApprovalTimes.length)
      : 0,
    fastestApprovalDays: sortedLeadTimes.length > 0 ? sortedLeadTimes[0] : 0,
    slowestApprovalDays: sortedLeadTimes.length > 0 ? sortedLeadTimes[sortedLeadTimes.length - 1] : 0,
    medianLeadTimeDays: sortedLeadTimes.length > 0
      ? sortedLeadTimes[Math.floor(sortedLeadTimes.length / 2)]
      : 0,
    percentile90Days: sortedLeadTimes.length > 0
      ? sortedLeadTimes[Math.floor(sortedLeadTimes.length * 0.9)]
      : 0,
    byStatus: {},
    byMonth: [],
    bottlenecks: [],
  }

  // Count by status
  submittals.forEach(s => {
    const status = s.status
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
  })

  // Calculate monthly stats
  const monthlyData = new Map<string, { submitted: number; approved: number; rejected: number; leadTimes: number[] }>()

  submittals.forEach(s => {
    const date = parseISO(s.created_at!)
    const key = format(date, 'yyyy-MM')

    if (!monthlyData.has(key)) {
      monthlyData.set(key, { submitted: 0, approved: 0, rejected: 0, leadTimes: [] })
    }

    const data = monthlyData.get(key)!
    data.submitted++

    if (s.status === 'approved') {
      data.approved++
      if (s.leadTimeMetrics.submittedToApproval) {
        data.leadTimes.push(s.leadTimeMetrics.submittedToApproval)
      }
    } else if (s.status === 'rejected') {
      data.rejected++
    }
  })

  stats.byMonth = Array.from(monthlyData.entries())
    .map(([key, data]) => ({
      month: key.split('-')[1],
      year: parseInt(key.split('-')[0]),
      submitted: data.submitted,
      approved: data.approved,
      rejected: data.rejected,
      averageLeadTime: data.leadTimes.length > 0
        ? Math.round(data.leadTimes.reduce((a, b) => a + b, 0) / data.leadTimes.length)
        : 0,
    }))
    .sort((a, b) => (a.year * 100 + parseInt(a.month)) - (b.year * 100 + parseInt(b.month)))

  // Identify bottlenecks
  const stageMetrics = new Map<string, { days: number[]; count: number }>()

  submittals.forEach(s => {
    s.statusHistory.forEach(entry => {
      if (!stageMetrics.has(entry.status)) {
        stageMetrics.set(entry.status, { days: [], count: 0 })
      }
      const data = stageMetrics.get(entry.status)!
      data.days.push(entry.daysInStatus)
      data.count++
    })
  })

  stats.bottlenecks = Array.from(stageMetrics.entries())
    .map(([stage, data]) => ({
      stage,
      averageDays: data.days.length > 0
        ? Math.round(data.days.reduce((a, b) => a + b, 0) / data.days.length)
        : 0,
      maxDays: Math.max(...data.days, 0),
      count: data.count,
      percentOfTotal: Math.round((data.count / submittals.length) * 100),
    }))
    .sort((a, b) => b.averageDays - a.averageDays)

  return stats
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to fetch and calculate submittal lead time metrics
 */
export function useSubmittalLeadTime(
  projectId: string | undefined,
  workflowTypeId: string | undefined,
  filters: LeadTimeFilters = {}
) {
  // Fetch submittals
  const { data: submittals, isLoading: loadingSubmittals } = useQuery({
    queryKey: ['submittals-leadtime', projectId, workflowTypeId, filters],
    queryFn: async () => {
      if (!projectId || !workflowTypeId) {
        throw new Error('Project ID and workflow type ID required')
      }

      let query = supabase
        .from('workflow_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters.dateRange) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end)
      }

      if (filters.discipline) {
        query = query.eq('discipline', filters.discipline)
      }

      const { data, error } = await query

      if (error) {throw error}
      return data as WorkflowItem[]
    },
    enabled: !!projectId && !!workflowTypeId,
  })

  // Fetch history for all submittals
  const { data: allHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['submittals-history', projectId, workflowTypeId, submittals?.map(s => s.id)],
    queryFn: async () => {
      if (!submittals || submittals.length === 0) {return []}

      const { data, error } = await supabase
        .from('workflow_item_history')
        .select('*')
        .in('workflow_item_id', submittals.map(s => s.id))
        .order('changed_at', { ascending: true })

      if (error) {throw error}
      return data as WorkflowItemHistory[]
    },
    enabled: !!submittals && submittals.length > 0,
  })

  // Process submittals with lead time metrics
  const { submittalsWithLeadTime, stats } = useMemo(() => {
    if (!submittals) {
      return { submittalsWithLeadTime: [], stats: null }
    }

    const historyBySubmittal = new Map<string, WorkflowItemHistory[]>()
    allHistory?.forEach(h => {
      const existing = historyBySubmittal.get(h.workflow_item_id) || []
      historyBySubmittal.set(h.workflow_item_id, [...existing, h])
    })

    const processed: SubmittalWithLeadTime[] = submittals.map(submittal => {
      const history = historyBySubmittal.get(submittal.id) || []
      const leadTimeMetrics = calculateLeadTimeMetrics(submittal, history)
      const statusHistory = buildStatusHistory(submittal, history)

      return {
        ...submittal,
        leadTimeMetrics,
        statusHistory,
      }
    })

    const calculatedStats = calculateLeadTimeStats(processed)

    return {
      submittalsWithLeadTime: processed,
      stats: calculatedStats,
    }
  }, [submittals, allHistory])

  return {
    submittals: submittalsWithLeadTime,
    stats,
    isLoading: loadingSubmittals || loadingHistory,
  }
}

/**
 * Hook to get lead time for a single submittal
 */
export function useSingleSubmittalLeadTime(submittalId: string | undefined) {
  // Fetch the submittal
  const { data: submittal, isLoading: loadingSubmittal } = useQuery({
    queryKey: ['submittal-detail', submittalId],
    queryFn: async () => {
      if (!submittalId) {throw new Error('Submittal ID required')}

      const { data, error } = await supabase
        .from('workflow_items')
        .select('*')
        .eq('id', submittalId)
        .single()

      if (error) {throw error}
      return data as WorkflowItem
    },
    enabled: !!submittalId,
  })

  // Fetch history
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['submittal-history', submittalId],
    queryFn: async () => {
      if (!submittalId) {return []}

      const { data, error } = await supabase
        .from('workflow_item_history')
        .select('*')
        .eq('workflow_item_id', submittalId)
        .order('changed_at', { ascending: true })

      if (error) {throw error}
      return data as WorkflowItemHistory[]
    },
    enabled: !!submittalId,
  })

  // Process the submittal
  const result = useMemo(() => {
    if (!submittal) {return null}

    const leadTimeMetrics = calculateLeadTimeMetrics(submittal, history || [])
    const statusHistory = buildStatusHistory(submittal, history || [])

    return {
      ...submittal,
      leadTimeMetrics,
      statusHistory,
    } as SubmittalWithLeadTime
  }, [submittal, history])

  return {
    submittal: result,
    isLoading: loadingSubmittal || loadingHistory,
  }
}

export default useSubmittalLeadTime
