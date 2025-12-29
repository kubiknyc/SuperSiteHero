/**
 * Subcontractor Daily Reports Hooks
 * React Query hooks for read-only daily report access
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  subcontractorPortalApi,
  type SubcontractorDailyReport,
  type SubcontractorDailyReportDetail,
} from '@/lib/api/services/subcontractor-portal'

// Query keys
export const dailyReportKeys = {
  all: ['subcontractor', 'daily-reports'] as const,
  list: (filters?: { projectId?: string; startDate?: string; endDate?: string }) =>
    [...dailyReportKeys.all, 'list', filters] as const,
  detail: (reportId: string) => [...dailyReportKeys.all, 'detail', reportId] as const,
  workforce: (reportId: string) => [...dailyReportKeys.all, 'workforce', reportId] as const,
  equipment: (reportId: string) => [...dailyReportKeys.all, 'equipment', reportId] as const,
  photos: (reportId: string) => [...dailyReportKeys.all, 'photos', reportId] as const,
  canView: () => [...dailyReportKeys.all, 'can-view'] as const,
}

/**
 * Check if current user can view daily reports
 */
export function useCanViewDailyReports() {
  const { userProfile } = useAuth()

  return useQuery<boolean>({
    queryKey: dailyReportKeys.canView(),
    queryFn: () => {
      if (!userProfile?.id) {return false}
      return subcontractorPortalApi.canViewDailyReports(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

/**
 * Fetch daily reports for subcontractor (filtered to their scope)
 */
export function useSubcontractorDailyReports(filters?: {
  projectId?: string
  startDate?: string
  endDate?: string
}) {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorDailyReport[]>({
    queryKey: dailyReportKeys.list(filters),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getDailyReports(userProfile.id, filters)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch a single daily report detail (read-only)
 */
export function useSubcontractorDailyReportDetail(reportId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorDailyReportDetail | null>({
    queryKey: dailyReportKeys.detail(reportId || ''),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      if (!reportId) {return null}
      return subcontractorPortalApi.getDailyReport(userProfile.id, reportId)
    },
    enabled: !!userProfile?.id && !!reportId && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch workforce data for a daily report
 */
export function useSubcontractorDailyReportWorkforce(reportId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: dailyReportKeys.workforce(reportId || ''),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      if (!reportId) {return []}
      return subcontractorPortalApi.getDailyReportWorkforce(userProfile.id, reportId)
    },
    enabled: !!userProfile?.id && !!reportId && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch equipment data for a daily report
 */
export function useSubcontractorDailyReportEquipment(reportId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: dailyReportKeys.equipment(reportId || ''),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      if (!reportId) {return []}
      return subcontractorPortalApi.getDailyReportEquipment(userProfile.id, reportId)
    },
    enabled: !!userProfile?.id && !!reportId && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch photos for a daily report
 */
export function useSubcontractorDailyReportPhotos(reportId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: dailyReportKeys.photos(reportId || ''),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      if (!reportId) {return []}
      return subcontractorPortalApi.getDailyReportPhotos(userProfile.id, reportId)
    },
    enabled: !!userProfile?.id && !!reportId && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch complete daily report with all related data
 */
export function useSubcontractorDailyReportFull(reportId: string | undefined) {
  const detail = useSubcontractorDailyReportDetail(reportId)
  const workforce = useSubcontractorDailyReportWorkforce(reportId)
  const equipment = useSubcontractorDailyReportEquipment(reportId)
  const photos = useSubcontractorDailyReportPhotos(reportId)

  return {
    report: detail.data,
    workforce: workforce.data || [],
    equipment: equipment.data || [],
    photos: photos.data || [],
    isLoading: detail.isLoading || workforce.isLoading || equipment.isLoading || photos.isLoading,
    isError: detail.isError || workforce.isError || equipment.isError || photos.isError,
    error: detail.error || workforce.error || equipment.error || photos.error,
  }
}
