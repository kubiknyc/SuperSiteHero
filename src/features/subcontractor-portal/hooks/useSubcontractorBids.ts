/**
 * Subcontractor Bids Hooks
 * React Query hooks for change order bid management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import { useToast } from '@/components/ui/use-toast'
import type {
  BidWithRelations,
  SubmitBidDTO,
  BidsFilter,
} from '@/types/subcontractor-portal'

// Query keys
export const bidKeys = {
  all: ['subcontractor', 'bids'] as const,
  list: (filter?: BidsFilter) => [...bidKeys.all, 'list', filter] as const,
  pending: () => [...bidKeys.all, 'pending'] as const,
  detail: (id: string) => [...bidKeys.all, 'detail', id] as const,
}

/**
 * Fetch pending bids for the current subcontractor
 */
export function useSubcontractorBids(filter?: BidsFilter) {
  const { userProfile } = useAuth()

  return useQuery<BidWithRelations[]>({
    queryKey: bidKeys.list(filter),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getPendingBids(userProfile.id, filter)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Fetch pending bids only
 */
export function usePendingBids() {
  return useSubcontractorBids({ status: 'pending' })
}

/**
 * Fetch a single bid by ID
 */
export function useSubcontractorBid(bidId: string) {
  return useQuery<BidWithRelations>({
    queryKey: bidKeys.detail(bidId),
    queryFn: () => subcontractorPortalApi.getBid(bidId),
    enabled: !!bidId,
  })
}

/**
 * Submit a bid response
 */
export function useSubmitBid() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ bidId, data }: { bidId: string; data: SubmitBidDTO }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.submitBid(bidId, userProfile.id, data)
    },
    onSuccess: () => {
      // Invalidate bid queries
      queryClient.invalidateQueries({ queryKey: bidKeys.all })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'dashboard'] })

      toast({
        title: 'Bid Submitted',
        description: 'Your bid has been submitted successfully.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit bid',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Decline a bid
 */
export function useDeclineBid() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ bidId, reason }: { bidId: string; reason?: string }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.declineBid(bidId, userProfile.id, reason)
    },
    onSuccess: () => {
      // Invalidate bid queries
      queryClient.invalidateQueries({ queryKey: bidKeys.all })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'dashboard'] })

      toast({
        title: 'Bid Declined',
        description: 'You have declined this bid request.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to decline bid',
        variant: 'destructive',
      })
    },
  })
}
