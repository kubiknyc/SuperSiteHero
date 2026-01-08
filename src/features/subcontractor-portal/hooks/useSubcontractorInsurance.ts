/**
 * Subcontractor Insurance Endorsement Hooks
 * React Query hooks for insurance certificate and endorsement verification
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorInsuranceCertificate,
  SubcontractorInsuranceRequirement,
  SubcontractorInsuranceComplianceSummary,
  EndorsementStatus,
  InsuranceType,
} from '@/types/subcontractor-portal'

// Query keys
export const insuranceKeys = {
  all: ['subcontractor', 'insurance'] as const,
  certificates: () => [...insuranceKeys.all, 'certificates'] as const,
  requirements: () => [...insuranceKeys.all, 'requirements'] as const,
  summary: () => [...insuranceKeys.all, 'summary'] as const,
}

/**
 * Fetch insurance certificates with endorsement status
 */
export function useSubcontractorInsuranceCertificates() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorInsuranceCertificate[]>({
    queryKey: insuranceKeys.certificates(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getInsuranceCertificates(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch project insurance requirements
 */
export function useSubcontractorInsuranceRequirements() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorInsuranceRequirement[]>({
    queryKey: insuranceKeys.requirements(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getInsuranceRequirements(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch insurance compliance summary
 */
export function useInsuranceComplianceSummary() {
  const { userProfile } = useAuth()

  return useQuery<SubcontractorInsuranceComplianceSummary>({
    queryKey: insuranceKeys.summary(),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getInsuranceComplianceSummary(userProfile.id)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get insurance type display label
 */
export function getInsuranceTypeLabel(type: InsuranceType): string {
  const labels: Record<InsuranceType, string> = {
    general_liability: 'General Liability',
    auto_liability: 'Auto Liability',
    workers_compensation: "Workers' Compensation",
    umbrella: 'Umbrella/Excess',
    professional_liability: 'Professional Liability',
    builders_risk: "Builder's Risk",
    pollution: 'Pollution',
    cyber: 'Cyber Liability',
    other: 'Other',
  }
  return labels[type] || type
}

/**
 * Get insurance type short label
 */
export function getInsuranceTypeShortLabel(type: InsuranceType): string {
  const labels: Record<InsuranceType, string> = {
    general_liability: 'GL',
    auto_liability: 'Auto',
    workers_compensation: 'WC',
    umbrella: 'Umbrella',
    professional_liability: 'Prof',
    builders_risk: 'BR',
    pollution: 'Poll',
    cyber: 'Cyber',
    other: 'Other',
  }
  return labels[type] || type
}

/**
 * Get endorsement type display label
 */
export function getEndorsementTypeLabel(
  type: 'additional_insured' | 'waiver_of_subrogation' | 'primary_noncontributory'
): string {
  const labels = {
    additional_insured: 'Additional Insured',
    waiver_of_subrogation: 'Waiver of Subrogation',
    primary_noncontributory: 'Primary & Non-Contributory',
  }
  return labels[type] || type
}

/**
 * Get endorsement type short label
 */
export function getEndorsementTypeShortLabel(
  type: 'additional_insured' | 'waiver_of_subrogation' | 'primary_noncontributory'
): string {
  const labels = {
    additional_insured: 'AI',
    waiver_of_subrogation: 'WoS',
    primary_noncontributory: 'P&NC',
  }
  return labels[type] || type
}

/**
 * Get endorsement status badge variant
 */
export function getEndorsementStatusBadgeVariant(
  status: EndorsementStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<EndorsementStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    verified: 'default',
    required: 'secondary',
    missing: 'destructive',
    not_required: 'outline',
  }
  return variants[status] || 'outline'
}

/**
 * Get endorsement status label
 */
export function getEndorsementStatusLabel(status: EndorsementStatus): string {
  const labels: Record<EndorsementStatus, string> = {
    verified: 'Verified',
    required: 'Required',
    missing: 'Missing',
    not_required: 'Not Required',
  }
  return labels[status] || status
}

/**
 * Get certificate status badge variant
 */
export function getCertificateStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    expiring_soon: 'secondary',
    expired: 'destructive',
    pending_renewal: 'secondary',
    void: 'outline',
  }
  return variants[status] || 'outline'
}

/**
 * Get certificate status label
 */
export function getCertificateStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
    pending_renewal: 'Pending Renewal',
    void: 'Void',
  }
  return labels[status] || status
}

/**
 * Format coverage amount
 */
export function formatCoverageAmount(amount: number | null): string {
  if (amount === null || amount === undefined) {return 'N/A'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Check if certificate is expiring within N days
 */
export function isCertificateExpiringSoon(expirationDate: string, days: number = 30): boolean {
  const expDate = new Date(expirationDate)
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(today.getDate() + days)
  return expDate > today && expDate <= futureDate
}

/**
 * Check if certificate is expired
 */
export function isCertificateExpired(expirationDate: string): boolean {
  return new Date(expirationDate) < new Date()
}

/**
 * Get days until expiration
 */
export function getDaysUntilExpiration(expirationDate: string): number {
  const expDate = new Date(expirationDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expDate.setHours(0, 0, 0, 0)
  const diffTime = expDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get compliance score color class
 */
export function getComplianceScoreColor(score: number): string {
  if (score >= 90) {return 'text-green-600'}
  if (score >= 70) {return 'text-yellow-600'}
  if (score >= 50) {return 'text-orange-600'}
  return 'text-red-600'
}

/**
 * Get compliance score background class
 */
export function getComplianceScoreBgColor(score: number): string {
  if (score >= 90) {return 'bg-green-100'}
  if (score >= 70) {return 'bg-yellow-100'}
  if (score >= 50) {return 'bg-orange-100'}
  return 'bg-red-100'
}
