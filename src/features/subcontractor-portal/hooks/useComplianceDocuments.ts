/**
 * Compliance Documents Hooks
 * React Query hooks for subcontractor compliance document management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { subcontractorPortalApi } from '@/lib/api/services/subcontractor-portal'
import { useToast } from '@/components/ui/use-toast'
import type {
  ComplianceDocumentWithRelations,
  CreateComplianceDocumentDTO,
  ComplianceDocumentsFilter,
  ExpiringDocument,
} from '@/types/subcontractor-portal'

// Query keys
export const complianceKeys = {
  all: ['subcontractor', 'compliance'] as const,
  documents: (filter?: ComplianceDocumentsFilter) =>
    [...complianceKeys.all, 'documents', filter] as const,
  document: (id: string) => [...complianceKeys.all, 'document', id] as const,
  expiring: () => [...complianceKeys.all, 'expiring'] as const,
}

/**
 * Fetch compliance documents for the subcontractor
 */
export function useComplianceDocuments(filter?: ComplianceDocumentsFilter) {
  const { userProfile } = useAuth()

  return useQuery<ComplianceDocumentWithRelations[]>({
    queryKey: complianceKeys.documents(filter),
    queryFn: () => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      return subcontractorPortalApi.getComplianceDocuments(userProfile.id, filter)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch documents by type
 */
export function useInsuranceCertificates() {
  return useComplianceDocuments({ document_type: 'insurance_certificate' })
}

export function useLicenses() {
  return useComplianceDocuments({ document_type: 'license' })
}

/**
 * Fetch documents expiring soon (within 30 days)
 */
export function useExpiringDocuments() {
  return useComplianceDocuments({ expiring_within_days: 30 })
}

/**
 * Upload a new compliance document
 */
export function useUploadComplianceDocument() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (data: CreateComplianceDocumentDTO) => {
      if (!userProfile?.id) throw new Error('User not authenticated')
      return subcontractorPortalApi.uploadComplianceDocument(userProfile.id, data)
    },
    onSuccess: () => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: complianceKeys.all })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'stats'] })
      queryClient.invalidateQueries({ queryKey: ['subcontractor', 'dashboard'] })

      toast({
        title: 'Document Uploaded',
        description: 'Your compliance document has been uploaded and is pending review.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload document',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Get document type display name
 */
export function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    insurance_certificate: 'Insurance Certificate',
    license: 'License',
    w9: 'W-9 Form',
    bond: 'Bond',
    safety_cert: 'Safety Certification',
    other: 'Other Document',
  }
  return labels[type] || type
}

/**
 * Get document status color
 */
export function getDocumentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'yellow',
    approved: 'green',
    rejected: 'red',
    expired: 'gray',
  }
  return colors[status] || 'gray'
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expirationDate: string | null): number | null {
  if (!expirationDate) return null

  const expDate = new Date(expirationDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expDate.setHours(0, 0, 0, 0)

  const diffTime = expDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Check if document is expiring soon (within threshold days)
 */
export function isExpiringSoon(expirationDate: string | null, thresholdDays = 30): boolean {
  const days = getDaysUntilExpiration(expirationDate)
  return days !== null && days > 0 && days <= thresholdDays
}

/**
 * Check if document is expired
 */
export function isExpired(expirationDate: string | null): boolean {
  const days = getDaysUntilExpiration(expirationDate)
  return days !== null && days <= 0
}
