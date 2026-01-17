/**
 * Subcontractor Certifications Hooks
 * Hooks for managing equipment & labor certifications (P2-3 Feature)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import type {
  SubcontractorCertification,
  CreateCertificationDTO,
  CertificationSummary,
  CertificationType,
  CertificationStatusType,
} from '@/types/subcontractor-portal'

// =============================================
// QUERY KEYS
// =============================================

export const certificationKeys = {
  all: ['subcontractor', 'certifications'] as const,
  list: () => [...certificationKeys.all, 'list'] as const,
  summary: () => [...certificationKeys.all, 'summary'] as const,
}

// =============================================
// QUERY HOOKS
// =============================================

/**
 * Fetch all certifications for the subcontractor
 */
export function useSubcontractorCertifications() {
  const { user } = useAuth()

  return useQuery({
    queryKey: certificationKeys.list(),
    queryFn: () => subcontractorPortalApi.getCertifications(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch certification summary for dashboard
 */
export function useCertificationSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: certificationKeys.summary(),
    queryFn: () => subcontractorPortalApi.getCertificationSummary(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// =============================================
// MUTATION HOOKS
// =============================================

/**
 * Upload a new certification
 */
export function useUploadCertification() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateCertificationDTO) =>
      subcontractorPortalApi.uploadCertification(user?.id || '', data),
    onSuccess: () => {
      // Invalidate certifications and summary
      queryClient.invalidateQueries({ queryKey: certificationKeys.list() })
      queryClient.invalidateQueries({ queryKey: certificationKeys.summary() })
    },
  })
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Get certification type label
 */
export function getCertificationTypeLabel(type: CertificationType): string {
  const labels: Record<CertificationType, string> = {
    equipment_operator: 'Equipment Operator',
    safety_training: 'Safety Training',
    first_aid: 'First Aid/CPR',
    trade_license: 'Trade License',
    professional: 'Professional License',
    hazmat: 'Hazmat',
    confined_space: 'Confined Space',
    fall_protection: 'Fall Protection',
    welding: 'Welding',
    other: 'Other',
  }
  return labels[type] || type
}

/**
 * Get certification type short label
 */
export function getCertificationTypeShortLabel(type: CertificationType): string {
  const labels: Record<CertificationType, string> = {
    equipment_operator: 'Operator',
    safety_training: 'Safety',
    first_aid: 'First Aid',
    trade_license: 'Trade',
    professional: 'Professional',
    hazmat: 'Hazmat',
    confined_space: 'Confined',
    fall_protection: 'Fall',
    welding: 'Welding',
    other: 'Other',
  }
  return labels[type] || type
}

/**
 * Get certification type icon name (for use with lucide-react)
 */
export function getCertificationTypeIcon(type: CertificationType): string {
  const icons: Record<CertificationType, string> = {
    equipment_operator: 'Truck',
    safety_training: 'Shield',
    first_aid: 'Heart',
    trade_license: 'Wrench',
    professional: 'Award',
    hazmat: 'AlertTriangle',
    confined_space: 'Box',
    fall_protection: 'ArrowDown',
    welding: 'Flame',
    other: 'FileText',
  }
  return icons[type] || 'FileText'
}

/**
 * Get certification status badge variant
 */
export function getCertificationStatusBadgeVariant(status: CertificationStatusType): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'valid':
      return 'default'
    case 'expiring_soon':
      return 'secondary'
    case 'expired':
      return 'destructive'
    case 'pending_verification':
      return 'outline'
    default:
      return 'outline'
  }
}

/**
 * Get certification status label
 */
export function getCertificationStatusLabel(status: CertificationStatusType): string {
  const labels: Record<CertificationStatusType, string> = {
    valid: 'Valid',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
    pending_verification: 'Pending Verification',
  }
  return labels[status] || status
}

/**
 * Get certification status color
 */
export function getCertificationStatusColor(status: CertificationStatusType): string {
  switch (status) {
    case 'valid':
      return 'text-success'
    case 'expiring_soon':
      return 'text-warning'
    case 'expired':
      return 'text-destructive'
    case 'pending_verification':
      return 'text-info'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get certification status background color
 */
export function getCertificationStatusBgColor(status: CertificationStatusType): string {
  switch (status) {
    case 'valid':
      return 'bg-success/10 text-success'
    case 'expiring_soon':
      return 'bg-warning/10 text-warning'
    case 'expired':
      return 'bg-destructive/10 text-destructive'
    case 'pending_verification':
      return 'bg-info/10 text-info'
    default:
      return 'bg-muted'
  }
}

/**
 * Format certification date for display
 */
export function formatCertificationDate(dateString: string | null): string {
  if (!dateString) { return '-' }
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expirationDate: string | null): number | null {
  if (!expirationDate) { return null }
  const expiry = new Date(expirationDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if certification is expired
 */
export function isCertificationExpired(cert: SubcontractorCertification): boolean {
  if (cert.status === 'expired') { return true }
  if (!cert.expiration_date) { return false }
  const days = getDaysUntilExpiration(cert.expiration_date)
  return days !== null && days < 0
}

/**
 * Check if certification is expiring soon (within 30 days)
 */
export function isCertificationExpiringSoon(cert: SubcontractorCertification, days: number = 30): boolean {
  if (cert.status === 'expiring_soon') { return true }
  if (!cert.expiration_date) { return false }
  if (isCertificationExpired(cert)) { return false }
  const daysLeft = getDaysUntilExpiration(cert.expiration_date)
  return daysLeft !== null && daysLeft <= days
}

/**
 * Get expiration status text
 */
export function getExpirationStatusText(cert: SubcontractorCertification): string {
  if (!cert.expiration_date) { return 'No expiration' }
  const days = getDaysUntilExpiration(cert.expiration_date)
  if (days === null) { return '-' }
  if (days < 0) { return `Expired ${Math.abs(days)} days ago` }
  if (days === 0) { return 'Expires today' }
  if (days === 1) { return 'Expires tomorrow' }
  if (days <= 30) { return `Expires in ${days} days` }
  if (days <= 60) { return `Expires in ${Math.ceil(days / 7)} weeks` }
  return `Expires ${formatCertificationDate(cert.expiration_date)}`
}

/**
 * Filter certifications by status
 */
export function filterCertificationsByStatus(
  certs: SubcontractorCertification[],
  filter: 'all' | 'valid' | 'expiring' | 'expired' | 'pending'
): SubcontractorCertification[] {
  switch (filter) {
    case 'valid':
      return certs.filter(c => c.status === 'valid')
    case 'expiring':
      return certs.filter(c => c.status === 'expiring_soon')
    case 'expired':
      return certs.filter(c => c.status === 'expired')
    case 'pending':
      return certs.filter(c => c.status === 'pending_verification')
    default:
      return certs
  }
}

/**
 * Filter certifications by type
 */
export function filterCertificationsByType(
  certs: SubcontractorCertification[],
  type: CertificationType | 'all'
): SubcontractorCertification[] {
  if (type === 'all') { return certs }
  return certs.filter(c => c.certification_type === type)
}

/**
 * Group certifications by type
 */
export function groupCertificationsByType(
  certs: SubcontractorCertification[]
): Record<CertificationType, SubcontractorCertification[]> {
  return certs.reduce((acc, cert) => {
    const key = cert.certification_type
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(cert)
    return acc
  }, {} as Record<CertificationType, SubcontractorCertification[]>)
}

/**
 * Group certifications by holder
 */
export function groupCertificationsByHolder(
  certs: SubcontractorCertification[]
): Record<string, SubcontractorCertification[]> {
  return certs.reduce((acc, cert) => {
    const key = cert.holder_name
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(cert)
    return acc
  }, {} as Record<string, SubcontractorCertification[]>)
}

/**
 * Sort certifications by expiration date (soonest first)
 */
export function sortCertificationsByExpiration(
  certs: SubcontractorCertification[]
): SubcontractorCertification[] {
  return [...certs].sort((a, b) => {
    if (!a.expiration_date && !b.expiration_date) { return 0 }
    if (!a.expiration_date) { return 1 }
    if (!b.expiration_date) { return -1 }
    return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime()
  })
}

/**
 * Get certification health score (percentage of valid certs)
 */
export function getCertificationHealthScore(certs: SubcontractorCertification[]): number {
  if (certs.length === 0) { return 100 }
  const validCount = certs.filter(c => c.status === 'valid' || c.status === 'expiring_soon').length
  return Math.round((validCount / certs.length) * 100)
}

/**
 * Get health score color
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 90) { return 'text-success' }
  if (score >= 70) { return 'text-warning' }
  if (score >= 50) { return 'text-warning' }
  return 'text-destructive'
}

/**
 * Get health score background color
 */
export function getHealthScoreBgColor(score: number): string {
  if (score >= 90) { return 'bg-success/10 text-success' }
  if (score >= 70) { return 'bg-warning/10 text-warning' }
  if (score >= 50) { return 'bg-warning/10 text-warning' }
  return 'bg-destructive/10 text-destructive'
}

// Re-export types for convenience
export type {
  SubcontractorCertification,
  CreateCertificationDTO,
  CertificationSummary,
  CertificationType,
  CertificationStatusType,
}
