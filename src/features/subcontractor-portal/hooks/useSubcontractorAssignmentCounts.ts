/**
 * useSubcontractorAssignmentCounts Hook
 * Fetches counts for RFIs, Documents, and Payments tabs in MyAssignments
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'

export interface AssignmentCounts {
  rfis: number
  documents: number
  payments: number
}

// Query key for assignment counts
export const assignmentCountsKey = ['subcontractor', 'assignment-counts'] as const

/**
 * Fetch assignment counts for the current subcontractor user
 * Used to populate tab counts in MyAssignments component
 */
export function useSubcontractorAssignmentCounts() {
  const { userProfile } = useAuth()

  return useQuery<AssignmentCounts>({
    queryKey: assignmentCountsKey,
    queryFn: () => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }
      return subcontractorPortalApi.getAssignmentCounts(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}
