// File: /src/lib/api/services/insurance.ts
// Insurance Certificate Tracking API service

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase, supabaseUntyped } from '@/lib/supabase'
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
      let query = supabaseUntyped
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
      const { data, error } = await supabaseUntyped
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
      const { data, error } = await supabaseUntyped
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
      const { data, error } = await supabaseUntyped
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
      const { error } = await supabaseUntyped
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
      const { data, error } = await supabaseUntyped
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

      const { data, error } = await supabaseUntyped
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
      let query = supabaseUntyped
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
      const { data, error } = await supabaseUntyped
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
      const { data, error } = await supabaseUntyped
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
      const { error } = await supabaseUntyped
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
      const { data, error } = await supabaseUntyped.rpc('check_insurance_compliance', {
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
      const { data, error } = await supabaseUntyped
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
      const { data, error } = await supabaseUntyped
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
      const { data, error } = await supabaseUntyped
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
      const { error } = await supabaseUntyped
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
      const { data: certificates, error: certError } = await supabaseUntyped
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
      const { data: compliance, error: compError } = await supabaseUntyped
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
      const { data, error } = await supabaseUntyped
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
      await supabaseUntyped
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
}
