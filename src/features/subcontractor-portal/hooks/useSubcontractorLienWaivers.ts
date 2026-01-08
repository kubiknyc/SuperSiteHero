/**
 * Subcontractor Lien Waivers Hooks
 * React Query hooks for subcontractor portal lien waiver management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import { useToast } from '@/components/ui/use-toast'
import type {
  SubcontractorLienWaiver,
  SubcontractorLienWaiverFilters,
  SignLienWaiverDTO,
  LienWaiverSummary,
} from '@/types/subcontractor-portal'

// Query keys
export const lienWaiverKeys = {
  all: ['subcontractor', 'lien-waivers'] as const,
  list: (filter?: SubcontractorLienWaiverFilters) =>
    [...lienWaiverKeys.all, 'list', filter] as const,
  pending: () => [...lienWaiverKeys.all, 'pending'] as const,
  summary: () => [...lienWaiverKeys.all, 'summary'] as const,
  detail: (id: string) => [...lienWaiverKeys.all, 'detail', id] as const,
}

/**
 * Fetch lien waivers for the subcontractor
 */
export function useSubcontractorLienWaivers(filter?: SubcontractorLienWaiverFilters) {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorLienWaiver[]>({
    queryKey: lienWaiverKeys.list(filter),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getLienWaivers(userProfile.id, filter)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch pending lien waivers awaiting signature
 */
export function usePendingLienWaivers() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorLienWaiver[]>({
    queryKey: lienWaiverKeys.pending(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getPendingLienWaivers(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Fetch lien waiver summary for dashboard
 */
export function useLienWaiverSummary() {
  const { userProfile } = useAuth()

  return useQuery<LienWaiverSummary>({
    queryKey: lienWaiverKeys.summary(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getLienWaiverSummary(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Sign a lien waiver
 */
export function useSignLienWaiver() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ waiverId, data }: { waiverId: string; data: SignLienWaiverDTO }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.signLienWaiver(waiverId, userProfile.id, data)
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: lienWaiverKeys.all })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'dashboard'] })

      toast({
        title: 'Lien Waiver Signed',
        description: 'Your lien waiver has been signed and submitted for review.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Signing Failed',
        description: error instanceof Error ? error.message : 'Failed to sign lien waiver',
        variant: 'destructive',
      })
    },
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get waiver type display name
 */
export function getWaiverTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    conditional_progress: 'Conditional Progress',
    unconditional_progress: 'Unconditional Progress',
    conditional_final: 'Conditional Final',
    unconditional_final: 'Unconditional Final',
  }
  return labels[type] || type
}

/**
 * Get waiver type description
 */
export function getWaiverTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    conditional_progress: 'Conditional Waiver and Release on Progress Payment - Effective upon receipt of payment',
    unconditional_progress: 'Unconditional Waiver and Release on Progress Payment - Immediately effective',
    conditional_final: 'Conditional Waiver and Release on Final Payment - Effective upon receipt of final payment',
    unconditional_final: 'Unconditional Waiver and Release on Final Payment - Immediately effective, releases all claims',
  }
  return descriptions[type] || type
}

/**
 * Check if waiver type is conditional
 */
export function isConditionalWaiver(type: string): boolean {
  return type.startsWith('conditional_')
}

/**
 * Check if waiver type is final
 */
export function isFinalWaiver(type: string): boolean {
  return type.endsWith('_final')
}

/**
 * Get waiver status display name
 */
export function getWaiverStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    sent: 'Awaiting Signature',
    received: 'Signed',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return labels[status] || status
}

/**
 * Get waiver status badge variant
 */
export function getWaiverStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    sent: 'outline',
    received: 'secondary',
    under_review: 'secondary',
    approved: 'default',
    rejected: 'destructive',
  }
  return variants[status] || 'outline'
}

/**
 * Get waiver status color for styling
 */
export function getWaiverStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'gray',
    sent: 'blue',
    received: 'yellow',
    under_review: 'yellow',
    approved: 'green',
    rejected: 'red',
  }
  return colors[status] || 'gray'
}

/**
 * Check if waiver needs action from subcontractor
 */
export function waiverNeedsAction(status: string): boolean {
  return ['pending', 'sent'].includes(status)
}

/**
 * Check if waiver is overdue
 */
export function isWaiverOverdue(waiver: SubcontractorLienWaiver): boolean {
  if (!waiver.due_date) {return false}
  if (['approved', 'rejected'].includes(waiver.status)) {return false}
  return new Date(waiver.due_date) < new Date()
}

/**
 * Calculate days until due
 */
export function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) {return null}

  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Format currency for display
 */
export function formatWaiverAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
