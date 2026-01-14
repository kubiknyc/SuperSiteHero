// File: /src/lib/api/services/insurance.ts
// Insurance Certificate Tracking API service

import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'
import type { QueryOptions } from '../types'
import type {
  InsuranceCertificate,
  InsuranceCertificateWithRelations,
  CreateInsuranceCertificateDTO,
  UpdateInsuranceCertificateDTO,
  InsuranceRequirement,
  CreateInsuranceRequirementDTO,
  UpdateInsuranceRequirementDTO,
  InsuranceCertificateHistory,
  InsuranceExpirationAlert,
  ComplianceCheckResult,
  ComplianceSummary,
  ExpiringCertificate,
  InsuranceDashboardStats,
  SubcontractorComplianceStatus,
  ComplianceDashboardData,
  InsuranceAIExtraction,
  CreateAIExtractionDTO,
  ProjectInsuranceRequirement,
  CreateProjectRequirementDTO,
} from '@/types/insurance'

export const insuranceApi = {
  // =============================================
  // CERTIFICATES
  // =============================================

  /**
   * Fetch all insurance certificates for a company
   */
  async getCertificates(
    companyId: string,
    options?: QueryOptions & {
      projectId?: string
      subcontractorId?: string
      status?: string
      insuranceType?: string
    }
  ): Promise<InsuranceCertificateWithRelations[]> {
    try {
      let query = supabase
        .from('insurance_certificates')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, contact_name, contact_email, contact_phone),
          project:projects(id, name, project_number)
        `)
        .eq('company_id', companyId)
        .is('deleted_at', null)

      if (options?.projectId) {
        query = query.eq('project_id', options.projectId)
      }
      if (options?.subcontractorId) {
        query = query.eq('subcontractor_id', options.subcontractorId)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.insuranceType) {
        query = query.eq('insurance_type', options.insuranceType)
      }

      query = query.order('expiration_date', { ascending: true })

      const { data, error } = await query

      if (error) {throw error}
      return data as InsuranceCertificateWithRelations[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_CERTIFICATES_ERROR',
            message: 'Failed to fetch insurance certificates',
          })
    }
  },

  /**
   * Fetch a single certificate by ID
   */
  async getCertificate(certificateId: string): Promise<InsuranceCertificateWithRelations> {
    try {
      const { data, error } = await supabase
        .from('insurance_certificates')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, contact_name, contact_email, contact_phone),
          project:projects(id, name, project_number)
        `)
        .eq('id', certificateId)
        .is('deleted_at', null)
        .single()

      if (error) {throw error}
      return data as InsuranceCertificateWithRelations
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_CERTIFICATE_ERROR',
            message: 'Failed to fetch insurance certificate',
          })
    }
  },

  /**
   * Create a new insurance certificate
   */
  async createCertificate(
    certificate: CreateInsuranceCertificateDTO
  ): Promise<InsuranceCertificate> {
    try {
      const { data, error } = await supabase
        .from('insurance_certificates')
        .insert(certificate)
        .select()
        .single()

      if (error) {throw error}
      return data as InsuranceCertificate
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_CERTIFICATE_ERROR',
            message: 'Failed to create insurance certificate',
          })
    }
  },

  /**
   * Update an insurance certificate
   */
  async updateCertificate(
    certificateId: string,
    updates: UpdateInsuranceCertificateDTO
  ): Promise<InsuranceCertificate> {
    try {
      const { data, error } = await supabase
        .from('insurance_certificates')
        .update(updates)
        .eq('id', certificateId)
        .select()
        .single()

      if (error) {throw error}
      return data as InsuranceCertificate
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_CERTIFICATE_ERROR',
            message: 'Failed to update insurance certificate',
          })
    }
  },

  /**
   * Soft delete an insurance certificate
   */
  async deleteCertificate(certificateId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('insurance_certificates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', certificateId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_CERTIFICATE_ERROR',
            message: 'Failed to delete insurance certificate',
          })
    }
  },

  /**
   * Void a certificate (mark as invalid)
   */
  async voidCertificate(certificateId: string, reason?: string): Promise<InsuranceCertificate> {
    try {
      const { data, error } = await supabase
        .from('insurance_certificates')
        .update({
          status: 'void',
          notes: reason ? `Voided: ${reason}` : 'Certificate voided',
        })
        .eq('id', certificateId)
        .select()
        .single()

      if (error) {throw error}
      return data as InsuranceCertificate
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'VOID_CERTIFICATE_ERROR',
            message: 'Failed to void insurance certificate',
          })
    }
  },

  // =============================================
  // EXPIRING CERTIFICATES
  // =============================================

  /**
   * Get certificates expiring within N days
   */
  async getExpiringCertificates(
    companyId: string,
    daysAhead: number = 30
  ): Promise<ExpiringCertificate[]> {
    try {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)

      const { data, error } = await supabase
        .from('insurance_certificates')
        .select(`
          id,
          certificate_number,
          insurance_type,
          carrier_name,
          expiration_date,
          status,
          subcontractor_id,
          subcontractor:subcontractors(company_name),
          project_id,
          project:projects(name),
          company:companies(name)
        `)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .neq('status', 'void')
        .lte('expiration_date', futureDate.toISOString().split('T')[0])
        .order('expiration_date', { ascending: true })

      if (error) {throw error}

      // Calculate days until expiry and flatten data
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      return (data || []).map((cert: any) => ({
        id: cert.id,
        certificate_number: cert.certificate_number,
        insurance_type: cert.insurance_type,
        carrier_name: cert.carrier_name,
        expiration_date: cert.expiration_date,
        days_until_expiry: Math.ceil(
          (new Date(cert.expiration_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        ),
        status: cert.status,
        subcontractor_id: cert.subcontractor_id,
        subcontractor_name: cert.subcontractor?.company_name || null,
        project_id: cert.project_id,
        project_name: cert.project?.name || null,
        company_name: cert.company?.name || null,
      }))
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_EXPIRING_CERTS_ERROR',
            message: 'Failed to fetch expiring certificates',
          })
    }
  },

  // =============================================
  // REQUIREMENTS
  // =============================================

  /**
   * Fetch insurance requirements for a company/project
   */
  async getRequirements(
    companyId: string,
    projectId?: string
  ): Promise<InsuranceRequirement[]> {
    try {
      let query = supabase
        .from('insurance_requirements')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)

      if (projectId) {
        query = query.or(`project_id.is.null,project_id.eq.${projectId}`)
      }

      const { data, error } = await query.order('insurance_type', { ascending: true })

      if (error) {throw error}
      return data as InsuranceRequirement[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_REQUIREMENTS_ERROR',
            message: 'Failed to fetch insurance requirements',
          })
    }
  },

  /**
   * Create an insurance requirement
   */
  async createRequirement(
    requirement: CreateInsuranceRequirementDTO
  ): Promise<InsuranceRequirement> {
    try {
      const { data, error } = await supabase
        .from('insurance_requirements')
        .insert(requirement)
        .select()
        .single()

      if (error) {throw error}
      return data as InsuranceRequirement
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_REQUIREMENT_ERROR',
            message: 'Failed to create insurance requirement',
          })
    }
  },

  /**
   * Update an insurance requirement
   */
  async updateRequirement(
    requirementId: string,
    updates: UpdateInsuranceRequirementDTO
  ): Promise<InsuranceRequirement> {
    try {
      const { data, error } = await supabase
        .from('insurance_requirements')
        .update(updates)
        .eq('id', requirementId)
        .select()
        .single()

      if (error) {throw error}
      return data as InsuranceRequirement
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_REQUIREMENT_ERROR',
            message: 'Failed to update insurance requirement',
          })
    }
  },

  /**
   * Delete an insurance requirement
   */
  async deleteRequirement(requirementId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('insurance_requirements')
        .delete()
        .eq('id', requirementId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_REQUIREMENT_ERROR',
            message: 'Failed to delete insurance requirement',
          })
    }
  },

  // =============================================
  // COMPLIANCE
  // =============================================

  /**
   * Check compliance for a subcontractor
   */
  async checkCompliance(
    subcontractorId: string,
    projectId?: string
  ): Promise<ComplianceCheckResult[]> {
    try {
      const { data, error } = await supabase.rpc('check_insurance_compliance', {
        p_subcontractor_id: subcontractorId,
        p_project_id: projectId || null,
      })

      if (error) {throw error}
      return (data as unknown) as ComplianceCheckResult[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CHECK_COMPLIANCE_ERROR',
            message: 'Failed to check insurance compliance',
          })
    }
  },

  /**
   * Get compliance summary for all subcontractors
   */
  async getComplianceSummary(companyId: string): Promise<ComplianceSummary[]> {
    try {
      const { data, error } = await supabase
        .from('insurance_compliance_summary')
        .select('*')
        .eq('company_id', companyId)

      if (error) {throw error}
      return (data as unknown) as ComplianceSummary[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_COMPLIANCE_SUMMARY_ERROR',
            message: 'Failed to fetch compliance summary',
          })
    }
  },

  // =============================================
  // HISTORY
  // =============================================

  /**
   * Get history for a certificate
   */
  async getCertificateHistory(certificateId: string): Promise<InsuranceCertificateHistory[]> {
    try {
      const { data, error } = await supabase
        .from('insurance_certificate_history')
        .select('*')
        .eq('certificate_id', certificateId)
        .order('changed_at', { ascending: false })

      if (error) {throw error}
      return (data as unknown) as InsuranceCertificateHistory[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_HISTORY_ERROR',
            message: 'Failed to fetch certificate history',
          })
    }
  },

  // =============================================
  // ALERTS
  // =============================================

  /**
   * Get alerts for a certificate
   */
  async getCertificateAlerts(certificateId: string): Promise<InsuranceExpirationAlert[]> {
    try {
      const { data, error } = await supabase
        .from('insurance_expiration_alerts')
        .select('*')
        .eq('certificate_id', certificateId)
        .order('sent_at', { ascending: false })

      if (error) {throw error}
      return (data as unknown) as InsuranceExpirationAlert[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ALERTS_ERROR',
            message: 'Failed to fetch certificate alerts',
          })
    }
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('insurance_expiration_alerts')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', alertId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'ACKNOWLEDGE_ALERT_ERROR',
            message: 'Failed to acknowledge alert',
          })
    }
  },

  // =============================================
  // DASHBOARD STATS
  // =============================================

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(companyId: string): Promise<InsuranceDashboardStats> {
    try {
      // Get certificate counts by status
      const { data: certificates, error: certError } = await supabase
        .from('insurance_certificates')
        .select('status')
        .eq('company_id', companyId)
        .is('deleted_at', null)

      if (certError) {throw certError}

      const stats = ((certificates || []) as Array<{ status: string }>).reduce(
        (acc: InsuranceDashboardStats, cert: { status: string }) => {
          acc.totalCertificates++
          if (cert.status === 'active') {acc.activeCertificates++}
          if (cert.status === 'expiring_soon') {acc.expiringWithin30Days++}
          if (cert.status === 'expired') {acc.expiredCertificates++}
          if (cert.status === 'pending_renewal') {acc.pendingRenewal++}
          return acc
        },
        {
          totalCertificates: 0,
          activeCertificates: 0,
          expiringWithin30Days: 0,
          expiredCertificates: 0,
          pendingRenewal: 0,
          complianceRate: 0,
          subcontractorsWithGaps: 0,
        } as InsuranceDashboardStats
      )

      // Calculate compliance rate
      if (stats.totalCertificates > 0) {
        stats.complianceRate = Math.round(
          ((stats.activeCertificates + stats.expiringWithin30Days) / stats.totalCertificates) * 100
        )
      }

      // Count subcontractors with gaps (expired or missing)
      const { data: compliance, error: compError } = await supabase
        .from('insurance_compliance_summary')
        .select('subcontractor_id, expired_certificates')
        .eq('company_id', companyId)
        .gt('expired_certificates', 0)

      if (compError) {throw compError}
      stats.subcontractorsWithGaps = compliance?.length || 0

      return stats
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_STATS_ERROR',
            message: 'Failed to fetch dashboard statistics',
          })
    }
  },

  // =============================================
  // SUBCONTRACTOR CERTIFICATES
  // =============================================

  /**
   * Get all certificates for a subcontractor
   */
  async getSubcontractorCertificates(
    subcontractorId: string
  ): Promise<InsuranceCertificate[]> {
    try {
      const { data, error } = await supabase
        .from('insurance_certificates')
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .is('deleted_at', null)
        .order('insurance_type', { ascending: true })

      if (error) {throw error}
      return data as InsuranceCertificate[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SUB_CERTS_ERROR',
            message: 'Failed to fetch subcontractor certificates',
          })
    }
  },

  // =============================================
  // DOCUMENT UPLOAD
  // =============================================

  /**
   * Upload a certificate document
   */
  async uploadCertificateDocument(
    certificateId: string,
    file: File,
    companyId: string
  ): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${companyId}/certificates/${certificateId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) {throw uploadError}

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Update certificate with document URL
      await supabase
        .from('insurance_certificates')
        .update({
          certificate_url: urlData.publicUrl,
          certificate_storage_path: fileName,
        })
        .eq('id', certificateId)

      return urlData.publicUrl
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPLOAD_DOCUMENT_ERROR',
            message: 'Failed to upload certificate document',
          })
    }
  },

  // =============================================
  // COMPLIANCE STATUS (Enhanced)
  // =============================================

  /**
   * Get subcontractor compliance status
   */
  async getSubcontractorComplianceStatus(
    subcontractorId: string,
    projectId?: string
  ): Promise<SubcontractorComplianceStatus | null> {
    try {
      let query = supabase
        .from('subcontractor_compliance_status')
        .select('*')
        .eq('subcontractor_id', subcontractorId)

      if (projectId) {
        query = query.eq('project_id', projectId)
      } else {
        query = query.is('project_id', null)
      }

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {throw error} // PGRST116 = not found
      return data as SubcontractorComplianceStatus | null
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_COMPLIANCE_STATUS_ERROR',
            message: 'Failed to fetch compliance status',
          })
    }
  },

  /**
   * Get all compliance statuses for a company
   */
  async getCompanyComplianceStatuses(
    companyId: string,
    options?: {
      projectId?: string
      onlyNonCompliant?: boolean
      onlyWithHold?: boolean
    }
  ): Promise<SubcontractorComplianceStatus[]> {
    try {
      let query = supabase
        .from('subcontractor_compliance_status')
        .select('*')
        .eq('company_id', companyId)

      if (options?.projectId) {
        query = query.eq('project_id', options.projectId)
      }
      if (options?.onlyNonCompliant) {
        query = query.eq('is_compliant', false)
      }
      if (options?.onlyWithHold) {
        query = query.eq('payment_hold', true)
      }

      const { data, error } = await query.order('compliance_score', { ascending: true })

      if (error) {throw error}
      return data as SubcontractorComplianceStatus[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_COMPLIANCE_STATUSES_ERROR',
            message: 'Failed to fetch compliance statuses',
          })
    }
  },

  /**
   * Recalculate compliance status for a subcontractor
   */
  async recalculateComplianceStatus(
    subcontractorId: string,
    projectId?: string,
    companyId?: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('recalculate_compliance_status', {
        p_subcontractor_id: subcontractorId,
        p_project_id: projectId || null,
        p_company_id: companyId || null,
      })

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'RECALCULATE_COMPLIANCE_ERROR',
            message: 'Failed to recalculate compliance status',
          })
    }
  },

  /**
   * Apply payment hold for non-compliant subcontractor
   */
  async applyPaymentHold(
    subcontractorId: string,
    projectId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('apply_payment_hold', {
        p_subcontractor_id: subcontractorId,
        p_project_id: projectId,
        p_reason: reason || 'Insurance compliance violation',
      })

      if (error) {throw error}
      return data as boolean
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'APPLY_HOLD_ERROR',
            message: 'Failed to apply payment hold',
          })
    }
  },

  /**
   * Release payment hold
   */
  async releasePaymentHold(
    subcontractorId: string,
    projectId: string,
    overrideReason?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('release_payment_hold', {
        p_subcontractor_id: subcontractorId,
        p_project_id: projectId,
        p_override_reason: overrideReason || null,
      })

      if (error) {throw error}
      return data as boolean
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'RELEASE_HOLD_ERROR',
            message: 'Failed to release payment hold',
          })
    }
  },

  /**
   * Get compliance dashboard data
   */
  async getComplianceDashboard(
    companyId: string,
    projectId?: string
  ): Promise<ComplianceDashboardData[]> {
    try {
      let query = supabase
        .from('insurance_compliance_dashboard')
        .select('*')
        .eq('company_id', companyId)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {throw error}
      return data as ComplianceDashboardData[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DASHBOARD_ERROR',
            message: 'Failed to fetch compliance dashboard',
          })
    }
  },

  // =============================================
  // AI EXTRACTIONS
  // =============================================

  /**
   * Create AI extraction record
   */
  async createAIExtraction(
    extraction: CreateAIExtractionDTO
  ): Promise<InsuranceAIExtraction> {
    try {
      const { data, error } = await supabase
        .from('insurance_ai_extractions')
        .insert(extraction)
        .select()
        .single()

      if (error) {throw error}
      return data as InsuranceAIExtraction
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_EXTRACTION_ERROR',
            message: 'Failed to create AI extraction',
          })
    }
  },

  /**
   * Get AI extraction for a certificate
   */
  async getAIExtraction(certificateId: string): Promise<InsuranceAIExtraction | null> {
    try {
      const { data, error } = await supabase
        .from('insurance_ai_extractions')
        .select('*')
        .eq('certificate_id', certificateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {throw error}
      return data as InsuranceAIExtraction | null
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_EXTRACTION_ERROR',
            message: 'Failed to fetch AI extraction',
          })
    }
  },

  /**
   * Get extractions needing review
   */
  async getExtractionsNeedingReview(
    companyId: string
  ): Promise<InsuranceAIExtraction[]> {
    try {
      const { data, error } = await supabase
        .from('insurance_ai_extractions')
        .select('*')
        .eq('company_id', companyId)
        .eq('needs_review', true)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as InsuranceAIExtraction[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_EXTRACTIONS_ERROR',
            message: 'Failed to fetch extractions needing review',
          })
    }
  },

  /**
   * Mark extraction as reviewed
   */
  async markExtractionReviewed(
    extractionId: string,
    notes?: string
  ): Promise<InsuranceAIExtraction> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('insurance_ai_extractions')
        .update({
          needs_review: false,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq('id', extractionId)
        .select()
        .single()

      if (error) {throw error}
      return data as InsuranceAIExtraction
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'REVIEW_EXTRACTION_ERROR',
            message: 'Failed to mark extraction as reviewed',
          })
    }
  },

  /**
   * Update extraction status
   */
  async updateExtractionStatus(
    extractionId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<InsuranceAIExtraction> {
    try {
      const updateData: Record<string, unknown> = {
        processing_status: status,
        updated_at: new Date().toISOString(),
      }

      if (status === 'completed') {
        updateData.processed_at = new Date().toISOString()
      }
      if (status === 'failed' && error) {
        updateData.processing_error = error
      }

      const { data, error: dbError } = await supabase
        .from('insurance_ai_extractions')
        .update(updateData)
        .eq('id', extractionId)
        .select()
        .single()

      if (dbError) {throw dbError}
      return data as InsuranceAIExtraction
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_EXTRACTION_ERROR',
            message: 'Failed to update extraction status',
          })
    }
  },

  // =============================================
  // PROJECT INSURANCE REQUIREMENTS
  // =============================================

  /**
   * Get project-specific insurance requirements
   */
  async getProjectRequirements(projectId: string): Promise<ProjectInsuranceRequirement[]> {
    try {
      const { data, error } = await supabase
        .from('project_insurance_requirements')
        .select('*')
        .eq('project_id', projectId)
        .order('insurance_type', { ascending: true })

      if (error) {throw error}
      return data as ProjectInsuranceRequirement[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_PROJECT_REQS_ERROR',
            message: 'Failed to fetch project requirements',
          })
    }
  },

  /**
   * Create or update project insurance requirement
   */
  async upsertProjectRequirement(
    requirement: CreateProjectRequirementDTO
  ): Promise<ProjectInsuranceRequirement> {
    try {
      const { data, error } = await supabase
        .from('project_insurance_requirements')
        .upsert(requirement, {
          onConflict: 'project_id,insurance_type',
        })
        .select()
        .single()

      if (error) {throw error}
      return data as ProjectInsuranceRequirement
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPSERT_PROJECT_REQ_ERROR',
            message: 'Failed to save project requirement',
          })
    }
  },

  /**
   * Delete project insurance requirement
   */
  async deleteProjectRequirement(requirementId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('project_insurance_requirements')
        .delete()
        .eq('id', requirementId)

      if (error) {throw error}
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_PROJECT_REQ_ERROR',
            message: 'Failed to delete project requirement',
          })
    }
  },

  /**
   * Bulk update project requirements
   */
  async bulkUpdateProjectRequirements(
    projectId: string,
    requirements: CreateProjectRequirementDTO[]
  ): Promise<ProjectInsuranceRequirement[]> {
    try {
      // First delete all existing requirements for the project
      const { error: deleteError } = await supabase
        .from('project_insurance_requirements')
        .delete()
        .eq('project_id', projectId)

      if (deleteError) {throw deleteError}

      // Then insert all new requirements
      if (requirements.length === 0) {return []}

      const { data, error } = await supabase
        .from('project_insurance_requirements')
        .insert(requirements)
        .select()

      if (error) {throw error}
      return data as ProjectInsuranceRequirement[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'BULK_UPDATE_REQS_ERROR',
            message: 'Failed to bulk update project requirements',
          })
    }
  },
}
