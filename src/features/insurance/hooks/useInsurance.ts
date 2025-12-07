/**
 * Insurance Certificate React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insuranceApi } from '@/lib/api/services/insurance'
import { useAuth } from '@/lib/auth'
import type {
  InsuranceCertificate,
  InsuranceCertificateWithRelations,
  CreateInsuranceCertificateDTO,
  UpdateInsuranceCertificateDTO,
  InsuranceRequirement,
  CreateInsuranceRequirementDTO,
  UpdateInsuranceRequirementDTO,
  ExpiringCertificate,
  ComplianceCheckResult,
  ComplianceSummary,
  InsuranceDashboardStats,
  InsuranceCertificateHistory,
  CertificateStatus,
  InsuranceType,
} from '@/types/insurance'

// Query Keys
export const insuranceKeys = {
  all: ['insurance'] as const,
  certificates: () => [...insuranceKeys.all, 'certificates'] as const,
  certificatesList: (filters: {
    companyId?: string
    projectId?: string
    subcontractorId?: string
    status?: string
    insuranceType?: string
  }) => [...insuranceKeys.certificates(), filters] as const,
  certificate: (id: string) => [...insuranceKeys.certificates(), id] as const,
  certificateHistory: (id: string) => [...insuranceKeys.certificate(id), 'history'] as const,
  expiring: (companyId: string, days: number) =>
    [...insuranceKeys.certificates(), 'expiring', companyId, days] as const,
  requirements: () => [...insuranceKeys.all, 'requirements'] as const,
  requirementsList: (companyId: string, projectId?: string) =>
    [...insuranceKeys.requirements(), companyId, projectId] as const,
  compliance: () => [...insuranceKeys.all, 'compliance'] as const,
  complianceCheck: (subcontractorId: string, projectId?: string) =>
    [...insuranceKeys.compliance(), subcontractorId, projectId] as const,
  complianceSummary: (companyId: string) =>
    [...insuranceKeys.compliance(), 'summary', companyId] as const,
  stats: (companyId: string) => [...insuranceKeys.all, 'stats', companyId] as const,
  subcontractor: (subcontractorId: string) =>
    [...insuranceKeys.certificates(), 'subcontractor', subcontractorId] as const,
}

// =============================================
// CERTIFICATE HOOKS
// =============================================

/**
 * Fetch insurance certificates
 */
export function useInsuranceCertificates(options?: {
  projectId?: string
  subcontractorId?: string
  status?: CertificateStatus
  insuranceType?: InsuranceType
  enabled?: boolean
}) {
  const { user } = useAuth()
  const companyId = user?.company_id

  return useQuery({
    queryKey: insuranceKeys.certificatesList({
      companyId,
      projectId: options?.projectId,
      subcontractorId: options?.subcontractorId,
      status: options?.status,
      insuranceType: options?.insuranceType,
    }),
    queryFn: () =>
      insuranceApi.getCertificates(companyId!, {
        projectId: options?.projectId,
        subcontractorId: options?.subcontractorId,
        status: options?.status,
        insuranceType: options?.insuranceType,
      }),
    enabled: !!companyId && (options?.enabled !== false),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Fetch a single insurance certificate
 */
export function useInsuranceCertificate(certificateId: string | undefined) {
  return useQuery({
    queryKey: insuranceKeys.certificate(certificateId!),
    queryFn: () => insuranceApi.getCertificate(certificateId!),
    enabled: !!certificateId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch certificate history
 */
export function useCertificateHistory(certificateId: string | undefined) {
  return useQuery({
    queryKey: insuranceKeys.certificateHistory(certificateId!),
    queryFn: () => insuranceApi.getCertificateHistory(certificateId!),
    enabled: !!certificateId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Create insurance certificate mutation
 */
export function useCreateInsuranceCertificate() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<CreateInsuranceCertificateDTO, 'company_id'>) =>
      insuranceApi.createCertificate({
        ...data,
        company_id: user?.company_id!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.certificates() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(user?.company_id!) })
    },
  })
}

/**
 * Update insurance certificate mutation
 */
export function useUpdateInsuranceCertificate() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({
      certificateId,
      updates,
    }: {
      certificateId: string
      updates: UpdateInsuranceCertificateDTO
    }) => insuranceApi.updateCertificate(certificateId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.certificate(variables.certificateId),
      })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.certificates() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(user?.company_id!) })
    },
  })
}

/**
 * Delete insurance certificate mutation
 */
export function useDeleteInsuranceCertificate() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (certificateId: string) => insuranceApi.deleteCertificate(certificateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.certificates() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(user?.company_id!) })
    },
  })
}

/**
 * Void insurance certificate mutation
 */
export function useVoidInsuranceCertificate() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ certificateId, reason }: { certificateId: string; reason?: string }) =>
      insuranceApi.voidCertificate(certificateId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.certificate(variables.certificateId),
      })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.certificates() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(user?.company_id!) })
    },
  })
}

// =============================================
// EXPIRING CERTIFICATES HOOKS
// =============================================

/**
 * Fetch expiring certificates
 */
export function useExpiringCertificates(daysAhead: number = 30) {
  const { user } = useAuth()
  const companyId = user?.company_id

  return useQuery({
    queryKey: insuranceKeys.expiring(companyId!, daysAhead),
    queryFn: () => insuranceApi.getExpiringCertificates(companyId!, daysAhead),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

// =============================================
// REQUIREMENTS HOOKS
// =============================================

/**
 * Fetch insurance requirements
 */
export function useInsuranceRequirements(projectId?: string) {
  const { user } = useAuth()
  const companyId = user?.company_id

  return useQuery({
    queryKey: insuranceKeys.requirementsList(companyId!, projectId),
    queryFn: () => insuranceApi.getRequirements(companyId!, projectId),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * Create insurance requirement mutation
 */
export function useCreateInsuranceRequirement() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<CreateInsuranceRequirementDTO, 'company_id'>) =>
      insuranceApi.createRequirement({
        ...data,
        company_id: user?.company_id!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.requirements() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
    },
  })
}

/**
 * Update insurance requirement mutation
 */
export function useUpdateInsuranceRequirement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      requirementId,
      updates,
    }: {
      requirementId: string
      updates: UpdateInsuranceRequirementDTO
    }) => insuranceApi.updateRequirement(requirementId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.requirements() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
    },
  })
}

/**
 * Delete insurance requirement mutation
 */
export function useDeleteInsuranceRequirement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (requirementId: string) => insuranceApi.deleteRequirement(requirementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.requirements() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
    },
  })
}

// =============================================
// COMPLIANCE HOOKS
// =============================================

/**
 * Check compliance for a subcontractor
 */
export function useComplianceCheck(subcontractorId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: insuranceKeys.complianceCheck(subcontractorId!, projectId),
    queryFn: () => insuranceApi.checkCompliance(subcontractorId!, projectId),
    enabled: !!subcontractorId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Fetch compliance summary for all subcontractors
 */
export function useComplianceSummary() {
  const { user } = useAuth()
  const companyId = user?.company_id

  return useQuery({
    queryKey: insuranceKeys.complianceSummary(companyId!),
    queryFn: () => insuranceApi.getComplianceSummary(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 10,
  })
}

// =============================================
// DASHBOARD STATS HOOKS
// =============================================

/**
 * Fetch insurance dashboard statistics
 */
export function useInsuranceDashboardStats() {
  const { user } = useAuth()
  const companyId = user?.company_id

  return useQuery({
    queryKey: insuranceKeys.stats(companyId!),
    queryFn: () => insuranceApi.getDashboardStats(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

// =============================================
// SUBCONTRACTOR CERTIFICATES HOOKS
// =============================================

/**
 * Fetch certificates for a specific subcontractor
 */
export function useSubcontractorCertificates(subcontractorId: string | undefined) {
  return useQuery({
    queryKey: insuranceKeys.subcontractor(subcontractorId!),
    queryFn: () => insuranceApi.getSubcontractorCertificates(subcontractorId!),
    enabled: !!subcontractorId,
    staleTime: 1000 * 60 * 5,
  })
}

// =============================================
// DOCUMENT UPLOAD HOOKS
// =============================================

/**
 * Upload certificate document mutation
 */
export function useUploadCertificateDocument() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: ({ certificateId, file }: { certificateId: string; file: File }) =>
      insuranceApi.uploadCertificateDocument(certificateId, file, user?.company_id!),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.certificate(variables.certificateId),
      })
    },
  })
}

// =============================================
// ALERTS HOOKS
// =============================================

/**
 * Acknowledge expiration alert mutation
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (alertId: string) => insuranceApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.certificates() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(user?.company_id!) })
    },
  })
}
