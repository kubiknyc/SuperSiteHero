/**
 * Subcontractor Assignment Hooks
 * Hooks for fetching RFIs, Documents, and Payments in MyAssignments
 * Milestone 4.1: Mobile-Optimized Portal UI
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorRFI,
  SubcontractorDocument,
  SubcontractorPayment,
} from '@/types/subcontractor-portal'

// Query keys
export const subcontractorAssignmentKeys = {
  all: ['subcontractor', 'assignments'] as const,
  rfis: () => [...subcontractorAssignmentKeys.all, 'rfis'] as const,
  documents: () => [...subcontractorAssignmentKeys.all, 'documents'] as const,
  payments: () => [...subcontractorAssignmentKeys.all, 'payments'] as const,
}

/**
 * Fetch RFIs assigned to the subcontractor (ball in their court)
 */
export function useSubcontractorRFIs() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorRFI[]>({
    queryKey: subcontractorAssignmentKeys.rfis(),
    queryFn: async () => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }
      return subcontractorPortalApi.getRFIs(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}

/**
 * Fetch documents shared with the subcontractor
 */
export function useSubcontractorDocuments() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorDocument[]>({
    queryKey: subcontractorAssignmentKeys.documents(),
    queryFn: async () => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }
      return subcontractorPortalApi.getDocuments(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}

/**
 * Fetch payment applications for the subcontractor
 */
export function useSubcontractorPayments() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorPayment[]>({
    queryKey: subcontractorAssignmentKeys.payments(),
    queryFn: async () => {
      if (!userProfile?.id) {
        throw new Error('User not authenticated')
      }
      return subcontractorPortalApi.getPayments(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  })
}
