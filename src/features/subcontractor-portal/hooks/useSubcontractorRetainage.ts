/**
 * Subcontractor Retainage Hooks
 * React Query hooks for subcontractor portal retainage tracking
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorRetainageInfo,
  RetainageRelease,
  RetainageSummary,
} from '@/types/subcontractor-portal'

// Query keys
export const retainageKeys = {
  all: ['subcontractor', 'retainage'] as const,
  info: () => [...retainageKeys.all, 'info'] as const,
  releases: (subcontractId: string) =>
    [...retainageKeys.all, 'releases', subcontractId] as const,
  summary: () => [...retainageKeys.all, 'summary'] as const,
}

/**
 * Fetch retainage info for all subcontractor's contracts
 */
export function useRetainageInfo() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorRetainageInfo[]>({
    queryKey: retainageKeys.info(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getRetainageInfo(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch retainage releases for a specific contract
 */
export function useRetainageReleases(subcontractId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery<RetainageRelease[]>({
    queryKey: retainageKeys.releases(subcontractId || ''),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      if (!subcontractId) {throw new Error('Contract ID required')}
      return subcontractorPortalApi.getRetainageReleases(userProfile.id, subcontractId)
    },
    enabled: !!userProfile?.id && !!subcontractId && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch retainage summary for dashboard
 */
export function useRetainageSummary() {
  const { userProfile } = useAuth()

  return useQuery<RetainageSummary>({
    queryKey: retainageKeys.summary(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getRetainageSummary(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get contract status display name
 */
export function getContractStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    substantial_completion: 'Substantial Completion',
    final_completion: 'Final Completion',
    closed: 'Closed',
  }
  return labels[status] || status
}

/**
 * Get contract status badge variant
 */
export function getContractStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'secondary',
    substantial_completion: 'default',
    final_completion: 'default',
    closed: 'outline',
  }
  return variants[status] || 'outline'
}

/**
 * Get release type display name
 */
export function getReleaseTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    partial: 'Partial Release',
    substantial_completion: 'Substantial Completion Release',
    final: 'Final Release',
  }
  return labels[type] || type
}

/**
 * Get release status display name
 */
export function getReleaseStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    released: 'Released',
    rejected: 'Rejected',
  }
  return labels[status] || status
}

/**
 * Get release status badge variant
 */
export function getReleaseStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    approved: 'default',
    released: 'default',
    rejected: 'destructive',
  }
  return variants[status] || 'outline'
}

/**
 * Format currency for display
 */
export function formatRetainageAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatRetainagePercent(percent: number): string {
  return `${percent.toFixed(1)}%`
}

/**
 * Calculate potential retainage release at substantial completion
 * Typically 50% of retainage is released at substantial completion
 */
export function calculateSubstantialCompletionRelease(
  retainageHeld: number,
  releasePercent: number = 50
): number {
  return retainageHeld * (releasePercent / 100)
}

/**
 * Check if contract is eligible for substantial completion release
 */
export function isEligibleForSubstantialRelease(contract: SubcontractorRetainageInfo): boolean {
  return (
    contract.status === 'active' &&
    contract.percent_complete >= 90 &&
    contract.retention_balance > 0
  )
}

/**
 * Check if contract is eligible for final release
 */
export function isEligibleForFinalRelease(contract: SubcontractorRetainageInfo): boolean {
  return (
    (contract.status === 'substantial_completion' || contract.status === 'final_completion') &&
    contract.retention_balance > 0
  )
}

/**
 * Get milestone status for a contract
 */
export function getMilestoneStatus(contract: SubcontractorRetainageInfo): {
  substantial: 'pending' | 'achieved' | 'not_applicable';
  final: 'pending' | 'achieved' | 'not_applicable';
  warranty: 'pending' | 'active' | 'expired' | 'not_applicable';
} {
  const today = new Date()

  const substantial = contract.substantial_completion_date
    ? 'achieved'
    : contract.percent_complete >= 90
      ? 'pending'
      : 'not_applicable'

  const final = contract.final_completion_date
    ? 'achieved'
    : contract.substantial_completion_date
      ? 'pending'
      : 'not_applicable'

  let warranty: 'pending' | 'active' | 'expired' | 'not_applicable' = 'not_applicable'
  if (contract.warranty_expiration_date) {
    const warrantyDate = new Date(contract.warranty_expiration_date)
    warranty = warrantyDate > today ? 'active' : 'expired'
  } else if (contract.final_completion_date) {
    warranty = 'pending'
  }

  return { substantial, final, warranty }
}

/**
 * Get overall retainage health status
 */
export function getRetainageHealth(summary: RetainageSummary): {
  status: 'good' | 'attention' | 'action_required';
  message: string;
} {
  if (summary.pending_releases > 0) {
    return {
      status: 'action_required',
      message: `${summary.pending_releases} contract${summary.pending_releases > 1 ? 's' : ''} with pending lien waivers`,
    }
  }

  if (summary.contracts_at_substantial > 0 || summary.contracts_at_final > 0) {
    const count = summary.contracts_at_substantial + summary.contracts_at_final
    return {
      status: 'attention',
      message: `${count} contract${count > 1 ? 's' : ''} eligible for retainage release`,
    }
  }

  return {
    status: 'good',
    message: 'All retainage tracking up to date',
  }
}
