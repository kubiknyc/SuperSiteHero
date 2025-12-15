/**
 * Compliance Documents Hooks
 * React Query hooks for subcontractor compliance document management
 * Phase 4.2: Enhanced with document status updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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
  expiring: (daysAhead?: number) => [...complianceKeys.all, 'expiring', daysAhead] as const,
  bySubcontractor: (subcontractorId: string) =>
    [...complianceKeys.all, 'subcontractor', subcontractorId] as const,
}

// Document types
export type ComplianceDocumentType =
  | 'insurance_certificate'
  | 'license'
  | 'w9'
  | 'bond'
  | 'safety_cert'
  | 'workers_comp'
  | 'liability_insurance'
  | 'auto_insurance'
  | 'professional_license'
  | 'business_license'
  | 'other'

export type ComplianceDocumentStatus = 'pending' | 'approved' | 'rejected' | 'expired'

/**
 * Fetch compliance documents for the subcontractor
 */
export function useComplianceDocuments(filter?: ComplianceDocumentsFilter) {
  const { userProfile } = useAuth()

  return useQuery<ComplianceDocumentWithRelations[]>({
    queryKey: complianceKeys.documents(filter),
    queryFn: () => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}
      return subcontractorPortalApi.getComplianceDocuments(userProfile.id, filter)
    },
    enabled: !!userProfile?.id && userProfile.role === 'subcontractor',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch compliance documents by subcontractor ID (for GC view)
 */
export function useComplianceDocumentsBySubcontractor(subcontractorId: string | undefined) {
  return useQuery({
    queryKey: complianceKeys.bySubcontractor(subcontractorId || ''),
    queryFn: async () => {
      if (!subcontractorId) {throw new Error('Subcontractor ID required')}

      const { data, error } = await supabase
        .from('subcontractor_compliance_documents')
        .select(`
          *,
          reviewed_by_profile:profiles!reviewed_by(id, first_name, last_name),
          uploaded_by_profile:profiles!uploaded_by(id, first_name, last_name)
        `)
        .eq('subcontractor_id', subcontractorId)
        .is('deleted_at', null)
        .order('expires_at', { ascending: true, nullsFirst: false })

      if (error) {throw error}
      return data
    },
    enabled: !!subcontractorId,
    staleTime: 1000 * 60 * 5,
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
 * Fetch documents expiring soon (within specified days)
 */
export function useExpiringDocuments(daysAhead: number = 30) {
  return useComplianceDocuments({ expiring_within_days: daysAhead })
}

/**
 * Get documents expiring within X days for specific subcontractors
 */
export function useExpiringDocumentsForSubcontractors(
  subcontractorIds: string[],
  daysAhead: number = 30
) {
  return useQuery({
    queryKey: complianceKeys.expiring(daysAhead),
    queryFn: async () => {
      if (subcontractorIds.length === 0) {return []}

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('subcontractor_compliance_documents')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name)
        `)
        .in('subcontractor_id', subcontractorIds)
        .eq('status', 'approved')
        .lte('expires_at', futureDate.toISOString().split('T')[0])
        .gt('expires_at', today)
        .is('deleted_at', null)
        .order('expires_at', { ascending: true })

      if (error) {throw error}
      return data
    },
    enabled: subcontractorIds.length > 0,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
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
      if (!userProfile?.id) {throw new Error('User not authenticated')}
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
 * Update compliance document status (GC action)
 */
export function useUpdateComplianceDocumentStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      documentId,
      status,
      rejectionReason,
    }: {
      documentId: string
      status: ComplianceDocumentStatus
      rejectionReason?: string
    }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      const updateData: Record<string, unknown> = {
        status,
        reviewed_by: userProfile.id,
        reviewed_at: new Date().toISOString(),
      }

      if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason
      }

      const { data, error } = await supabase
        .from('subcontractor_compliance_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all })

      const statusMessages: Record<string, string> = {
        approved: 'Document has been approved',
        rejected: 'Document has been rejected',
        pending: 'Document status updated to pending',
        expired: 'Document marked as expired',
      }

      toast({
        title: 'Status Updated',
        description: statusMessages[variables.status] || 'Document status updated',
      })
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update document status',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete compliance document
 */
export function useDeleteComplianceDocument() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Soft delete
      const { error } = await supabase
        .from('subcontractor_compliance_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.all })
      toast({
        title: 'Document Deleted',
        description: 'The compliance document has been removed.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete document',
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
    workers_comp: "Workers' Compensation",
    liability_insurance: 'General Liability Insurance',
    auto_insurance: 'Auto Insurance',
    professional_license: 'Professional License',
    business_license: 'Business License',
    other: 'Other Document',
  }
  return labels[type] || type
}

/**
 * Get document type options for dropdowns
 */
export function getDocumentTypeOptions(): Array<{ value: string; label: string }> {
  return [
    { value: 'insurance_certificate', label: 'Insurance Certificate' },
    { value: 'workers_comp', label: "Workers' Compensation" },
    { value: 'liability_insurance', label: 'General Liability Insurance' },
    { value: 'auto_insurance', label: 'Auto Insurance' },
    { value: 'license', label: 'License' },
    { value: 'professional_license', label: 'Professional License' },
    { value: 'business_license', label: 'Business License' },
    { value: 'w9', label: 'W-9 Form' },
    { value: 'bond', label: 'Bond' },
    { value: 'safety_cert', label: 'Safety Certification' },
    { value: 'other', label: 'Other Document' },
  ]
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
 * Get document status badge variant
 */
export function getDocumentStatusBadgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'secondary',
    approved: 'default',
    rejected: 'destructive',
    expired: 'outline',
  }
  return variants[status] || 'outline'
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expirationDate: string | null): number | null {
  if (!expirationDate) {return null}

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

/**
 * Get expiration status label
 */
export function getExpirationStatusLabel(expirationDate: string | null): {
  label: string
  color: string
  urgent: boolean
} {
  const days = getDaysUntilExpiration(expirationDate)

  if (days === null) {
    return { label: 'No expiration', color: 'gray', urgent: false }
  }

  if (days <= 0) {
    return { label: 'Expired', color: 'red', urgent: true }
  }

  if (days <= 7) {
    return { label: `Expires in ${days} day${days === 1 ? '' : 's'}`, color: 'red', urgent: true }
  }

  if (days <= 30) {
    return { label: `Expires in ${days} days`, color: 'yellow', urgent: true }
  }

  if (days <= 60) {
    return { label: `Expires in ${days} days`, color: 'blue', urgent: false }
  }

  return { label: `Expires in ${days} days`, color: 'green', urgent: false }
}
