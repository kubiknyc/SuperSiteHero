/**
 * Subcontractor Dashboard Hooks
 * React Query hooks for dashboard, stats, and projects
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import { useToast } from '@/components/ui/use-toast'
import type {
  SubcontractorDashboardData,
  SubcontractorStats,
  SubcontractorProject,
} from '@/types/subcontractor-portal'

// Query keys
export const subcontractorKeys = {
  all: ['subcontractor'] as const,
  dashboard: () => [...subcontractorKeys.all, 'dashboard'] as const,
  stats: () => [...subcontractorKeys.all, 'stats'] as const,
  projects: () => [...subcontractorKeys.all, 'projects'] as const,
  project: (id: string) => [...subcontractorKeys.projects(), id] as const,
}

/**
 * Fetch dashboard data for the current subcontractor user
 */
export function useSubcontractorDashboard() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorDashboardData>({
    queryKey: subcontractorKeys.dashboard(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getDashboard(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch stats for the current subcontractor
 */
export function useSubcontractorStats() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorStats>({
    queryKey: subcontractorKeys.stats(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getStats(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}

/**
 * Fetch projects for the current subcontractor
 */
export function useSubcontractorProjects() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorProject[]>({
    queryKey: subcontractorKeys.projects(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getProjects(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Get scope of work for a specific project
 */
export function useSubcontractorScope(projectId: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: [...subcontractorKeys.project(projectId), 'scope'],
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getScope(userProfile.id, projectId)
    },
    enabled: !!userProfile?.id && !!projectId && userProfile.role === 'subcontractor',
  })
}
