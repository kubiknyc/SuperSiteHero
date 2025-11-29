// File: /src/features/notices/hooks/useNotices.ts
// React Query hooks for Notice queries

import { useQuery } from '@tanstack/react-query'
import { noticesApi } from '@/lib/api/services/notices'
import type { NoticeFilters } from '../types'

// =============================================
// Query Keys
// =============================================

export const noticeKeys = {
  all: ['notices'] as const,
  lists: () => [...noticeKeys.all, 'list'] as const,
  list: (projectId: string, filters?: NoticeFilters) =>
    [...noticeKeys.lists(), projectId, filters] as const,
  details: () => [...noticeKeys.all, 'detail'] as const,
  detail: (id: string) => [...noticeKeys.details(), id] as const,
  stats: (projectId: string) => [...noticeKeys.all, 'stats', projectId] as const,
  overdue: (projectId?: string) => [...noticeKeys.all, 'overdue', projectId] as const,
  dueSoon: (projectId: string, days: number) =>
    [...noticeKeys.all, 'dueSoon', projectId, days] as const,
  critical: (projectId: string) => [...noticeKeys.all, 'critical', projectId] as const,
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all notices for a project with optional filtering
 * @param projectId - Project ID
 * @param filters - Optional filters (status, notice_type, direction, is_critical, search)
 * @returns Query result with Notice array
 *
 * Usage:
 * const { data: notices, isLoading } = useNotices(projectId, { status: 'pending_response' })
 */
export function useNotices(projectId: string | undefined, filters?: NoticeFilters) {
  return useQuery({
    queryKey: noticeKeys.list(projectId!, filters),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }
      return noticesApi.getProjectNotices(projectId, filters)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single notice by ID
 * @param noticeId - Notice ID
 * @returns Query result with single Notice
 *
 * Usage:
 * const { data: notice, isLoading } = useNotice(noticeId)
 */
export function useNotice(noticeId: string | undefined) {
  return useQuery({
    queryKey: noticeKeys.detail(noticeId!),
    queryFn: async () => {
      if (!noticeId) {
        throw new Error('Notice ID is required')
      }
      return noticesApi.getNotice(noticeId)
    },
    enabled: !!noticeId,
  })
}

/**
 * Fetch notice statistics for a project
 * @param projectId - Project ID
 * @returns Query result with stats (total, critical, awaitingResponse, overdue, sentThisMonth)
 *
 * Usage:
 * const { data: stats } = useNoticeStats(projectId)
 */
export function useNoticeStats(projectId: string | undefined) {
  return useQuery({
    queryKey: noticeKeys.stats(projectId!),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }
      return noticesApi.getNoticeStats(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch overdue notices (responses past due date)
 * @param projectId - Optional project ID to filter by
 * @returns Query result with overdue Notice array
 *
 * Usage:
 * const { data: overdueNotices } = useOverdueNotices(projectId)
 */
export function useOverdueNotices(projectId?: string) {
  return useQuery({
    queryKey: noticeKeys.overdue(projectId),
    queryFn: async () => {
      return noticesApi.getOverdueNotices(projectId)
    },
  })
}

/**
 * Fetch notices with responses due within specified days
 * @param projectId - Project ID
 * @param days - Number of days ahead to look (default 7)
 * @returns Query result with Notice array
 *
 * Usage:
 * const { data: upcomingNotices } = useNoticesDueSoon(projectId, 7)
 */
export function useNoticesDueSoon(projectId: string | undefined, days: number = 7) {
  return useQuery({
    queryKey: noticeKeys.dueSoon(projectId!, days),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }
      return noticesApi.getNoticesDueSoon(projectId, days)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch critical notices for a project
 * @param projectId - Project ID
 * @returns Query result with critical Notice array
 *
 * Usage:
 * const { data: criticalNotices } = useCriticalNotices(projectId)
 */
export function useCriticalNotices(projectId: string | undefined) {
  return useQuery({
    queryKey: noticeKeys.critical(projectId!),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }
      return noticesApi.getCriticalNotices(projectId)
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch notices by status
 * @param projectId - Project ID
 * @param status - Status value
 * @returns Query result with filtered Notice array
 *
 * Usage:
 * const { data: pendingNotices } = useNoticesByStatus(projectId, 'pending_response')
 */
export function useNoticesByStatus(projectId: string | undefined, status: string) {
  return useQuery({
    queryKey: noticeKeys.list(projectId!, { status: status as any }),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }
      return noticesApi.getProjectNotices(projectId, { status: status as any })
    },
    enabled: !!projectId && !!status,
  })
}

/**
 * Fetch notices by direction (incoming/outgoing)
 * @param projectId - Project ID
 * @param direction - 'incoming' or 'outgoing'
 * @returns Query result with filtered Notice array
 *
 * Usage:
 * const { data: sentNotices } = useNoticesByDirection(projectId, 'outgoing')
 */
export function useNoticesByDirection(
  projectId: string | undefined,
  direction: 'incoming' | 'outgoing'
) {
  return useQuery({
    queryKey: noticeKeys.list(projectId!, { direction }),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Project ID is required')
      }
      return noticesApi.getProjectNotices(projectId, { direction })
    },
    enabled: !!projectId && !!direction,
  })
}
