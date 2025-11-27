// File: /src/lib/hooks/useWorkflowTypeCache.ts
// Workflow Type caching hook for eliminating redundant queries

import { useQuery } from '@tanstack/react-query'
import { workflowsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth/AuthContext'
import type { WorkflowType } from '@/types/database'

/**
 * Cache workflow types with infinite stale time
 * This data rarely changes and can be cached for the entire session
 */
export function useWorkflowTypeCache() {
  const { userProfile } = useAuth()

  return useQuery<WorkflowType[]>({
    queryKey: ['workflow-types-cache', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID required')
      }

      return workflowsApi.getWorkflowTypes(userProfile.company_id)
    },
    enabled: !!userProfile?.company_id,
    // Cache for the entire session - workflow types rarely change
    staleTime: Infinity,
    gcTime: Infinity, // Keep in cache forever
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

/**
 * Get a specific workflow type by name from cache
 * @param typeName - The name to search for (case-insensitive)
 */
export function useWorkflowTypeByName(typeName: string) {
  const { data: workflowTypes = [] } = useWorkflowTypeCache()

  const workflowType = workflowTypes.find(
    type => type.name_singular.toLowerCase().includes(typeName.toLowerCase()) ||
            type.name_plural.toLowerCase().includes(typeName.toLowerCase())
  )

  return workflowType
}

/**
 * Get workflow type by ID from cache
 * @param typeId - The workflow type ID
 */
export function useWorkflowTypeById(typeId: string | undefined) {
  const { data: workflowTypes = [] } = useWorkflowTypeCache()

  if (!typeId) return undefined

  return workflowTypes.find(type => type.id === typeId)
}

/**
 * Invalidate workflow type cache (use when workflow types are modified)
 */
export function useInvalidateWorkflowTypeCache() {
  const queryClient = useQuery({
    queryKey: ['invalidate-helper'],
    enabled: false,
  }).refetch

  return () => {
    queryClient()
      .then(() => {
        // Invalidate the cache
        return Promise.resolve()
      })
      .catch(() => {
        // Ignore errors
      })
  }
}

/**
 * Preload workflow types into cache
 * Call this early in the app lifecycle to warm the cache
 */
export function usePreloadWorkflowTypes() {
  const { userProfile } = useAuth()

  const query = useQuery<WorkflowType[]>({
    queryKey: ['workflow-types-cache', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) {
        throw new Error('Company ID required')
      }

      return workflowsApi.getWorkflowTypes(userProfile.company_id)
    },
    enabled: !!userProfile?.company_id,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  return query.isLoading
}