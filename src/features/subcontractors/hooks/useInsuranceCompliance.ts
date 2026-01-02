/**
 * useInsuranceCompliance Hook
 * React Query hooks for subcontractor insurance compliance management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  InsuranceComplianceSubcontractor,
  InsuranceComplianceFilters,
  InsuranceReminderSettings,
  SendReminderDTO,
  BulkReminderResult,
} from '../types'

// Use any for tables not in generated types
const db = supabase as any

// Query keys
export const insuranceComplianceKeys = {
  all: ['insuranceCompliance'] as const,
  subcontractors: () => [...insuranceComplianceKeys.all, 'subcontractors'] as const,
  subcontractorsList: (filters: InsuranceComplianceFilters) =>
    [...insuranceComplianceKeys.subcontractors(), filters] as const,
  subcontractor: (id: string) => [...insuranceComplianceKeys.subcontractors(), id] as const,
  expiring: (days: number) => [...insuranceComplianceKeys.all, 'expiring', days] as const,
  calendar: (month: string) => [...insuranceComplianceKeys.all, 'calendar', month] as const,
  dashboard: () => [...insuranceComplianceKeys.all, 'dashboard'] as const,
  reminderSettings: () => [...insuranceComplianceKeys.all, 'reminderSettings'] as const,
  reminderHistory: (subId: string) => [...insuranceComplianceKeys.all, 'reminderHistory', subId] as const,
}

// =============================================
// Subcontractor Compliance Queries
// =============================================

/**
 * Get all subcontractors with insurance compliance status
 */
export function useInsuranceComplianceList(filters: InsuranceComplianceFilters = {}) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: insuranceComplianceKeys.subcontractorsList(filters),
    queryFn: async (): Promise<InsuranceComplianceSubcontractor[]> => {
      // Get subcontractors with their compliance status
      let query = db
        .from('subcontractors')
        .select(`
          id,
          company_name,
          contact_name,
          email,
          phone,
          compliance_status:subcontractor_compliance_status(
            is_compliant,
            compliance_score,
            missing_insurance_types,
            expiring_soon_count,
            expired_count,
            payment_hold,
            next_expiration_date,
            last_checked_at
          )
        `)
        .eq('company_id', userProfile?.company_id)
        .is('deleted_at', null)

      if (filters.projectId) {
        query = query.eq('compliance_status.project_id', filters.projectId)
      }

      if (filters.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`)
      }

      if (filters.onlyWithHold) {
        query = query.eq('compliance_status.payment_hold', true)
      }

      const { data: subcontractors, error: subError } = await query

      if (subError) throw subError

      // Get certificates for each subcontractor
      const subIds = subcontractors?.map((s: any) => s.id) || []

      if (subIds.length === 0) return []

      const { data: certificates, error: certError } = await db
        .from('insurance_certificates')
        .select('*')
        .in('subcontractor_id', subIds)
        .is('deleted_at', null)
        .order('expiration_date', { ascending: true })

      if (certError) throw certError

      // Build compliance list
      return subcontractors.map((sub: any) => {
        const subCerts = certificates?.filter((c: any) => c.subcontractor_id === sub.id) || []
        const status = sub.compliance_status?.[0]

        const now = new Date()
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

        const certInfos = subCerts.map((cert: any) => {
          const expDate = new Date(cert.expiration_date)
          const daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

          let certStatus: 'active' | 'expiring_soon' | 'expired' = 'active'
          if (daysUntilExpiry < 0) certStatus = 'expired'
          else if (daysUntilExpiry <= 30) certStatus = 'expiring_soon'

          return {
            id: cert.id,
            type: cert.insurance_type,
            typeName: getInsuranceTypeName(cert.insurance_type),
            carrier: cert.carrier_name,
            policyNumber: cert.policy_number,
            effectiveDate: cert.effective_date,
            expirationDate: cert.expiration_date,
            daysUntilExpiry,
            status: certStatus,
            coverageAmount: cert.coverage_amount,
            requiredAmount: null, // Would come from requirements
            meetsRequirement: true,
            documentUrl: cert.document_url,
            additionalInsured: cert.additional_insured_verified,
            waiverOfSubrogation: cert.waiver_of_subrogation_verified,
          }
        })

        const expiringCerts = certInfos.filter((c) => c.status === 'expiring_soon')
        const expiredCerts = certInfos.filter((c) => c.status === 'expired')

        let overallStatus: InsuranceComplianceSubcontractor['overallStatus'] = 'compliant'
        if (expiredCerts.length > 0 || (status?.missing_insurance_types?.length || 0) > 0) {
          overallStatus = 'non_compliant'
        } else if (expiringCerts.length > 0) {
          overallStatus = 'expiring'
        }

        // Apply status filter
        if (filters.status && filters.status.length > 0) {
          if (!filters.status.includes(overallStatus)) {
            return null
          }
        }

        return {
          id: sub.id,
          companyName: sub.company_name,
          contactName: sub.contact_name,
          email: sub.email,
          phone: sub.phone,
          overallStatus,
          complianceScore: status?.compliance_score || 0,
          certificates: certInfos,
          expiringCertificates: expiringCerts,
          missingTypes: status?.missing_insurance_types || [],
          lastReminderSent: null, // Would come from reminder history
          projectAssignments: 0, // Would come from project assignments count
          paymentHold: status?.payment_hold || false,
        }
      }).filter(Boolean) as InsuranceComplianceSubcontractor[]
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Get single subcontractor compliance details
 */
export function useSubcontractorCompliance(subcontractorId: string | undefined) {
  return useQuery({
    queryKey: insuranceComplianceKeys.subcontractor(subcontractorId || ''),
    queryFn: async () => {
      const { data: sub, error: subError } = await db
        .from('subcontractors')
        .select(`
          *,
          compliance_status:subcontractor_compliance_status(*),
          certificates:insurance_certificates(*)
        `)
        .eq('id', subcontractorId)
        .single()

      if (subError) throw subError
      return sub
    },
    enabled: !!subcontractorId,
  })
}

// =============================================
// Expiring Certificates
// =============================================

/**
 * Get certificates expiring within N days
 */
export function useExpiringCertificates(daysAhead: number = 30) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: insuranceComplianceKeys.expiring(daysAhead),
    queryFn: async () => {
      const expiryDate = new Date()
      expiryDate.setDate(expiryDate.getDate() + daysAhead)

      const { data, error } = await db
        .from('insurance_certificates')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, contact_name, email)
        `)
        .eq('company_id', userProfile?.company_id)
        .lte('expiration_date', expiryDate.toISOString().split('T')[0])
        .gte('expiration_date', new Date().toISOString().split('T')[0])
        .is('deleted_at', null)
        .in('status', ['active', 'expiring_soon'])
        .order('expiration_date', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Get expiration calendar for a month
 */
export function useExpirationCalendar(month: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: insuranceComplianceKeys.calendar(month),
    queryFn: async () => {
      const startDate = new Date(month + '-01')
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

      const { data, error } = await db
        .from('insurance_certificates')
        .select(`
          id,
          insurance_type,
          expiration_date,
          subcontractor:subcontractors(id, company_name)
        `)
        .eq('company_id', userProfile?.company_id)
        .gte('expiration_date', startDate.toISOString().split('T')[0])
        .lte('expiration_date', endDate.toISOString().split('T')[0])
        .is('deleted_at', null)
        .order('expiration_date', { ascending: true })

      if (error) throw error

      // Group by date
      const byDate: Record<string, any[]> = {}
      data?.forEach((cert: any) => {
        const date = cert.expiration_date
        if (!byDate[date]) byDate[date] = []
        byDate[date].push(cert)
      })

      return byDate
    },
    enabled: !!userProfile?.company_id && !!month,
  })
}

// =============================================
// Dashboard
// =============================================

/**
 * Get insurance compliance dashboard stats
 */
export function useInsuranceComplianceDashboard() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: insuranceComplianceKeys.dashboard(),
    queryFn: async () => {
      // Get overall stats
      const { data: certificates, error: certError } = await db
        .from('insurance_certificates')
        .select('status, expiration_date')
        .eq('company_id', userProfile?.company_id)
        .is('deleted_at', null)

      if (certError) throw certError

      // Get compliance status counts
      const { data: complianceStats, error: compError } = await db
        .from('subcontractor_compliance_status')
        .select('is_compliant, payment_hold')
        .eq('company_id', userProfile?.company_id)

      if (compError) throw compError

      const now = new Date()
      const thirtyDays = new Date()
      thirtyDays.setDate(thirtyDays.getDate() + 30)
      const sixtyDays = new Date()
      sixtyDays.setDate(sixtyDays.getDate() + 60)
      const ninetyDays = new Date()
      ninetyDays.setDate(ninetyDays.getDate() + 90)

      const stats = {
        totalCertificates: certificates?.length || 0,
        activeCertificates: certificates?.filter((c: any) => c.status === 'active').length || 0,
        expiringIn30Days: certificates?.filter((c: any) => {
          const exp = new Date(c.expiration_date)
          return exp >= now && exp <= thirtyDays
        }).length || 0,
        expiringIn60Days: certificates?.filter((c: any) => {
          const exp = new Date(c.expiration_date)
          return exp >= thirtyDays && exp <= sixtyDays
        }).length || 0,
        expiringIn90Days: certificates?.filter((c: any) => {
          const exp = new Date(c.expiration_date)
          return exp >= sixtyDays && exp <= ninetyDays
        }).length || 0,
        expiredCertificates: certificates?.filter((c: any) => c.status === 'expired').length || 0,
        compliantSubcontractors: complianceStats?.filter((c: any) => c.is_compliant).length || 0,
        nonCompliantSubcontractors: complianceStats?.filter((c: any) => !c.is_compliant).length || 0,
        onPaymentHold: complianceStats?.filter((c: any) => c.payment_hold).length || 0,
      }

      return stats
    },
    enabled: !!userProfile?.company_id,
  })
}

// =============================================
// Reminder Management
// =============================================

/**
 * Get reminder settings
 */
export function useReminderSettings() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: insuranceComplianceKeys.reminderSettings(),
    queryFn: async () => {
      const { data, error } = await db
        .from('insurance_reminder_settings')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      // Return defaults if not found
      return data || {
        enabled: true,
        daysBeforeExpiry: [30, 14, 7],
        emailTemplate: 'default',
        ccAddresses: [],
        includeAttachment: false,
      }
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Update reminder settings
 */
export function useUpdateReminderSettings() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (settings: InsuranceReminderSettings) => {
      const { data, error } = await db
        .from('insurance_reminder_settings')
        .upsert({
          company_id: userProfile?.company_id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'company_id',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceComplianceKeys.reminderSettings() })
      toast.success('Reminder settings updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`)
    },
  })
}

/**
 * Send bulk reminders
 */
export function useSendBulkReminders() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (dto: SendReminderDTO): Promise<BulkReminderResult> => {
      // Call edge function to send emails
      const { data, error } = await db.functions.invoke('send-insurance-reminders', {
        body: {
          companyId: userProfile?.company_id,
          subcontractorIds: dto.subcontractorIds,
          reminderType: dto.reminderType,
          customMessage: dto.customMessage,
        },
      })

      if (error) throw error

      // Log reminders sent
      for (const subId of dto.subcontractorIds) {
        await db.from('insurance_reminder_log').insert({
          company_id: userProfile?.company_id,
          subcontractor_id: subId,
          reminder_type: dto.reminderType,
          sent_at: new Date().toISOString(),
          sent_by: userProfile?.id,
        })
      }

      return data || { sent: dto.subcontractorIds.length, failed: 0, errors: [] }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: insuranceComplianceKeys.subcontractors() })
      if (result.failed > 0) {
        toast.warning(`Sent ${result.sent} reminders, ${result.failed} failed`)
      } else {
        toast.success(`Sent ${result.sent} reminders`)
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to send reminders: ${error.message}`)
    },
  })
}

/**
 * Send single reminder
 */
export function useSendReminder() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      subcontractorId,
      certificateIds,
      message,
    }: {
      subcontractorId: string
      certificateIds?: string[]
      message?: string
    }) => {
      const { data, error } = await db.functions.invoke('send-insurance-reminder', {
        body: {
          companyId: userProfile?.company_id,
          subcontractorId,
          certificateIds,
          customMessage: message,
        },
      })

      if (error) throw error

      // Log reminder
      await db.from('insurance_reminder_log').insert({
        company_id: userProfile?.company_id,
        subcontractor_id: subcontractorId,
        certificate_ids: certificateIds,
        reminder_type: 'manual',
        sent_at: new Date().toISOString(),
        sent_by: userProfile?.id,
      })

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceComplianceKeys.subcontractors() })
      toast.success('Reminder sent')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send reminder: ${error.message}`)
    },
  })
}

// =============================================
// Certificate Upload
// =============================================

/**
 * Upload certificate for subcontractor
 */
export function useUploadCertificate() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      subcontractorId,
      file,
      certificateData,
    }: {
      subcontractorId: string
      file: File
      certificateData: {
        insuranceType: string
        carrierName?: string
        policyNumber?: string
        effectiveDate: string
        expirationDate: string
        coverageAmount?: number
      }
    }) => {
      // Upload file to storage
      const fileName = `${subcontractorId}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('insurance-certificates')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('insurance-certificates')
        .getPublicUrl(fileName)

      // Create certificate record
      const { data, error } = await db
        .from('insurance_certificates')
        .insert({
          company_id: userProfile?.company_id,
          subcontractor_id: subcontractorId,
          insurance_type: certificateData.insuranceType,
          carrier_name: certificateData.carrierName,
          policy_number: certificateData.policyNumber,
          effective_date: certificateData.effectiveDate,
          expiration_date: certificateData.expirationDate,
          coverage_amount: certificateData.coverageAmount,
          document_url: urlData.publicUrl,
          status: 'active',
          uploaded_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, { subcontractorId }) => {
      queryClient.invalidateQueries({ queryKey: insuranceComplianceKeys.subcontractor(subcontractorId) })
      queryClient.invalidateQueries({ queryKey: insuranceComplianceKeys.subcontractors() })
      queryClient.invalidateQueries({ queryKey: insuranceComplianceKeys.dashboard() })
      toast.success('Certificate uploaded')
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`)
    },
  })
}

/**
 * Verify certificate requirements
 */
export function useVerifyCertificate() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      certificateId,
      verifications,
    }: {
      certificateId: string
      verifications: {
        additionalInsured?: boolean
        waiverOfSubrogation?: boolean
        primaryNoncontributory?: boolean
        coverageMeetsRequirement?: boolean
      }
    }) => {
      const { data, error } = await db
        .from('insurance_certificates')
        .update({
          additional_insured_verified: verifications.additionalInsured,
          waiver_of_subrogation_verified: verifications.waiverOfSubrogation,
          primary_noncontributory_verified: verifications.primaryNoncontributory,
          coverage_meets_requirement: verifications.coverageMeetsRequirement,
          verified_by: userProfile?.id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', certificateId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: insuranceComplianceKeys.subcontractors() })
      toast.success('Certificate verified')
    },
    onError: (error: Error) => {
      toast.error(`Verification failed: ${error.message}`)
    },
  })
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get human-readable insurance type name
 */
export function getInsuranceTypeName(type: string): string {
  const types: Record<string, string> = {
    general_liability: 'General Liability',
    auto_liability: 'Auto Liability',
    workers_comp: "Workers' Compensation",
    umbrella: 'Umbrella/Excess',
    professional_liability: 'Professional Liability',
    builders_risk: "Builder's Risk",
    pollution: 'Pollution Liability',
    cyber: 'Cyber Liability',
    other: 'Other',
  }
  return types[type] || type
}

/**
 * Get status badge color
 */
export function getComplianceStatusColor(status: string): string {
  switch (status) {
    case 'compliant':
      return 'bg-success text-success-foreground'
    case 'expiring':
      return 'bg-warning text-warning-foreground'
    case 'non_compliant':
    case 'missing':
      return 'bg-error text-error-foreground'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

/**
 * Get days until expiry text
 */
export function getExpiryText(daysUntilExpiry: number): string {
  if (daysUntilExpiry < 0) {
    return `Expired ${Math.abs(daysUntilExpiry)} days ago`
  } else if (daysUntilExpiry === 0) {
    return 'Expires today'
  } else if (daysUntilExpiry === 1) {
    return 'Expires tomorrow'
  } else if (daysUntilExpiry <= 7) {
    return `Expires in ${daysUntilExpiry} days`
  } else if (daysUntilExpiry <= 30) {
    const weeks = Math.floor(daysUntilExpiry / 7)
    return `Expires in ${weeks} week${weeks > 1 ? 's' : ''}`
  } else {
    const months = Math.floor(daysUntilExpiry / 30)
    return `Expires in ${months} month${months > 1 ? 's' : ''}`
  }
}
