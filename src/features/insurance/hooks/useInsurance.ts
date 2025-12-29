/**
 * Insurance Certificate React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insuranceApi } from '@/lib/api/services/insurance'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  CreateInsuranceCertificateDTO,
  UpdateInsuranceCertificateDTO,
  CreateInsuranceRequirementDTO,
  UpdateInsuranceRequirementDTO,
  CertificateStatus,
  InsuranceType,
  CreateAIExtractionDTO,
  CreateProjectRequirementDTO,
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
  projectRequirements: (projectId: string) =>
    [...insuranceKeys.requirements(), 'project', projectId] as const,
  compliance: () => [...insuranceKeys.all, 'compliance'] as const,
  complianceCheck: (subcontractorId: string, projectId?: string) =>
    [...insuranceKeys.compliance(), subcontractorId, projectId] as const,
  complianceSummary: (companyId: string) =>
    [...insuranceKeys.compliance(), 'summary', companyId] as const,
  complianceStatus: (subcontractorId: string, projectId?: string) =>
    [...insuranceKeys.compliance(), 'status', subcontractorId, projectId] as const,
  complianceStatuses: (companyId: string, filters?: { projectId?: string; onlyNonCompliant?: boolean; onlyWithHold?: boolean }) =>
    [...insuranceKeys.compliance(), 'statuses', companyId, filters] as const,
  complianceDashboard: (companyId: string, projectId?: string) =>
    [...insuranceKeys.compliance(), 'dashboard', companyId, projectId] as const,
  stats: (companyId: string) => [...insuranceKeys.all, 'stats', companyId] as const,
  subcontractor: (subcontractorId: string) =>
    [...insuranceKeys.certificates(), 'subcontractor', subcontractorId] as const,
  aiExtraction: (certificateId: string) =>
    [...insuranceKeys.all, 'aiExtraction', certificateId] as const,
  aiExtractionsNeedingReview: (companyId: string) =>
    [...insuranceKeys.all, 'aiExtractions', 'needsReview', companyId] as const,
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
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: insuranceKeys.certificatesList({
      companyId: companyId ?? undefined,
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
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<CreateInsuranceCertificateDTO, 'company_id'>) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return insuranceApi.createCertificate({
        ...data,
        company_id: userProfile.company_id,
      })
    },
    onSuccess: () => {
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: insuranceKeys.certificates() })
        queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
        queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(userProfile.company_id) })
      }
    },
  })
}

/**
 * Update insurance certificate mutation
 */
export function useUpdateInsuranceCertificate() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

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
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(userProfile.company_id) })
      }
    },
  })
}

/**
 * Delete insurance certificate mutation
 */
export function useDeleteInsuranceCertificate() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (certificateId: string) => insuranceApi.deleteCertificate(certificateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.certificates() })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(userProfile.company_id) })
      }
    },
  })
}

/**
 * Void insurance certificate mutation
 */
export function useVoidInsuranceCertificate() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({ certificateId, reason }: { certificateId: string; reason?: string }) =>
      insuranceApi.voidCertificate(certificateId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.certificate(variables.certificateId),
      })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.certificates() })
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(userProfile.company_id) })
      }
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
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

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
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

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
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<CreateInsuranceRequirementDTO, 'company_id'>) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return insuranceApi.createRequirement({
        ...data,
        company_id: userProfile.company_id,
      })
    },
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
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

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
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

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
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({ certificateId, file }: { certificateId: string; file: File }) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return insuranceApi.uploadCertificateDocument(certificateId, file, userProfile.company_id)
    },
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
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (alertId: string) => insuranceApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceKeys.certificates() })
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(userProfile.company_id) })
      }
    },
  })
}

// =============================================
// ENHANCED COMPLIANCE STATUS HOOKS
// =============================================

/**
 * Get subcontractor compliance status
 */
export function useSubcontractorComplianceStatus(
  subcontractorId: string | undefined,
  projectId?: string
) {
  return useQuery({
    queryKey: insuranceKeys.complianceStatus(subcontractorId!, projectId),
    queryFn: () => insuranceApi.getSubcontractorComplianceStatus(subcontractorId!, projectId),
    enabled: !!subcontractorId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get all compliance statuses for a company
 */
export function useCompanyComplianceStatuses(options?: {
  projectId?: string
  onlyNonCompliant?: boolean
  onlyWithHold?: boolean
}) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: insuranceKeys.complianceStatuses(companyId!, options),
    queryFn: () => insuranceApi.getCompanyComplianceStatuses(companyId!, options),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get compliance dashboard data
 */
export function useComplianceDashboard(projectId?: string) {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: insuranceKeys.complianceDashboard(companyId!, projectId),
    queryFn: () => insuranceApi.getComplianceDashboard(companyId!, projectId),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Recalculate compliance status for a subcontractor
 */
export function useRecalculateComplianceStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({
      subcontractorId,
      projectId,
    }: {
      subcontractorId: string
      projectId?: string
    }) => insuranceApi.recalculateComplianceStatus(
      subcontractorId,
      projectId,
      userProfile?.company_id
    ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.complianceStatus(variables.subcontractorId, variables.projectId),
      })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(userProfile.company_id) })
      }
    },
  })
}

/**
 * Apply payment hold mutation
 */
export function useApplyPaymentHold() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({
      subcontractorId,
      projectId,
      reason,
    }: {
      subcontractorId: string
      projectId: string
      reason?: string
    }) => insuranceApi.applyPaymentHold(subcontractorId, projectId, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.complianceStatus(variables.subcontractorId, variables.projectId),
      })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(userProfile.company_id) })
      }
    },
  })
}

/**
 * Release payment hold mutation
 */
export function useReleasePaymentHold() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({
      subcontractorId,
      projectId,
      overrideReason,
    }: {
      subcontractorId: string
      projectId: string
      overrideReason?: string
    }) => insuranceApi.releasePaymentHold(subcontractorId, projectId, overrideReason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.complianceStatus(variables.subcontractorId, variables.projectId),
      })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({ queryKey: insuranceKeys.stats(userProfile.company_id) })
      }
    },
  })
}

// =============================================
// AI EXTRACTION HOOKS
// =============================================

/**
 * Get AI extraction for a certificate
 */
export function useAIExtraction(certificateId: string | undefined) {
  return useQuery({
    queryKey: insuranceKeys.aiExtraction(certificateId!),
    queryFn: () => insuranceApi.getAIExtraction(certificateId!),
    enabled: !!certificateId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Get extractions needing review
 */
export function useExtractionsNeedingReview() {
  const { userProfile } = useAuth()
  const companyId = userProfile?.company_id

  return useQuery({
    queryKey: insuranceKeys.aiExtractionsNeedingReview(companyId!),
    queryFn: () => insuranceApi.getExtractionsNeedingReview(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Create AI extraction mutation
 */
export function useCreateAIExtraction() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<CreateAIExtractionDTO, 'company_id'>) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return insuranceApi.createAIExtraction({
        ...data,
        company_id: userProfile.company_id,
      })
    },
    onSuccess: (data) => {
      if (data.certificate_id) {
        queryClient.invalidateQueries({
          queryKey: insuranceKeys.aiExtraction(data.certificate_id),
        })
      }
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({
          queryKey: insuranceKeys.aiExtractionsNeedingReview(userProfile.company_id),
        })
      }
    },
  })
}

/**
 * Mark extraction as reviewed mutation
 */
export function useMarkExtractionReviewed() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({ extractionId, notes }: { extractionId: string; notes?: string }) =>
      insuranceApi.markExtractionReviewed(extractionId, notes),
    onSuccess: (data) => {
      if (data.certificate_id) {
        queryClient.invalidateQueries({
          queryKey: insuranceKeys.aiExtraction(data.certificate_id),
        })
      }
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({
          queryKey: insuranceKeys.aiExtractionsNeedingReview(userProfile.company_id),
        })
      }
    },
  })
}

/**
 * Update extraction status mutation
 */
export function useUpdateExtractionStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({
      extractionId,
      status,
      error,
    }: {
      extractionId: string
      status: 'pending' | 'processing' | 'completed' | 'failed'
      error?: string
    }) => insuranceApi.updateExtractionStatus(extractionId, status, error),
    onSuccess: (data) => {
      if (data.certificate_id) {
        queryClient.invalidateQueries({
          queryKey: insuranceKeys.aiExtraction(data.certificate_id),
        })
      }
      if (userProfile?.company_id) {
        queryClient.invalidateQueries({
          queryKey: insuranceKeys.aiExtractionsNeedingReview(userProfile.company_id),
        })
      }
    },
  })
}

// =============================================
// PROJECT REQUIREMENTS HOOKS
// =============================================

/**
 * Get project-specific insurance requirements
 */
export function useProjectInsuranceRequirements(projectId: string | undefined) {
  return useQuery({
    queryKey: insuranceKeys.projectRequirements(projectId!),
    queryFn: () => insuranceApi.getProjectRequirements(projectId!),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * Upsert project insurance requirement mutation
 */
export function useUpsertProjectRequirement() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: (data: Omit<CreateProjectRequirementDTO, 'company_id'>) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      return insuranceApi.upsertProjectRequirement({
        ...data,
        company_id: userProfile.company_id,
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.projectRequirements(data.project_id),
      })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
    },
  })
}

/**
 * Delete project requirement mutation
 */
export function useDeleteProjectRequirement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ requirementId, projectId: _projectId }: { requirementId: string; projectId: string }) =>
      insuranceApi.deleteProjectRequirement(requirementId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.projectRequirements(variables.projectId),
      })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
    },
  })
}

/**
 * Bulk update project requirements mutation
 */
export function useBulkUpdateProjectRequirements() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: ({
      projectId,
      requirements,
    }: {
      projectId: string
      requirements: Omit<CreateProjectRequirementDTO, 'company_id' | 'project_id'>[]
    }) => {
      if (!userProfile?.company_id) {
        throw new Error('Company information not available')
      }
      const fullRequirements = requirements.map((req) => ({
        ...req,
        company_id: userProfile.company_id!,
        project_id: projectId,
      }))
      return insuranceApi.bulkUpdateProjectRequirements(projectId, fullRequirements)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: insuranceKeys.projectRequirements(variables.projectId),
      })
      queryClient.invalidateQueries({ queryKey: insuranceKeys.compliance() })
    },
  })
}
