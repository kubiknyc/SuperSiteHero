/**
 * useSubcontracts Hook
 * React Query hooks for subcontract management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  Subcontract,
  SubcontractWithDetails,
  SubcontractAmendment,
  SubcontractFilters,
  CreateSubcontractDTO,
  CreateSubcontractFromBidDTO,
  CreateAmendmentDTO,
  SubcontractListItem,
  SubcontractPayment,
  SubcontractChangeOrder,
  SubcontractSummary,
} from '../types'

// Use any for tables not in generated types
const db = supabase as any

// Query keys
export const subcontractKeys = {
  all: ['subcontracts'] as const,
  lists: () => [...subcontractKeys.all, 'list'] as const,
  list: (filters: SubcontractFilters) => [...subcontractKeys.lists(), filters] as const,
  detail: (id: string) => [...subcontractKeys.all, 'detail', id] as const,
  amendments: (id: string) => [...subcontractKeys.all, 'amendments', id] as const,
  payments: (id: string) => [...subcontractKeys.all, 'payments', id] as const,
  changeOrders: (id: string) => [...subcontractKeys.all, 'changeOrders', id] as const,
  summary: (projectId?: string) => [...subcontractKeys.all, 'summary', projectId] as const,
  byProject: (projectId: string) => [...subcontractKeys.all, 'byProject', projectId] as const,
  bySubcontractor: (subId: string) => [...subcontractKeys.all, 'bySubcontractor', subId] as const,
}

// =============================================
// Subcontract Queries
// =============================================

/**
 * Get subcontracts with filters
 */
export function useSubcontracts(filters: SubcontractFilters = {}) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: subcontractKeys.list(filters),
    queryFn: async (): Promise<SubcontractListItem[]> => {
      let query = db
        .from('subcontracts')
        .select(`
          *,
          project:projects(id, name, project_number),
          subcontractor:subcontractors(id, company_name, contact_name),
          compliance_status:subcontractor_compliance_status(is_compliant, payment_hold)
        `)
        .eq('company_id', userProfile?.company_id)
        .is('deleted_at', null)

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.subcontractorId) {
        query = query.eq('subcontractor_id', filters.subcontractorId)
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters.search) {
        query = query.or(`
          contract_name.ilike.%${filters.search}%,
          contract_number.ilike.%${filters.search}%,
          subcontractor.company_name.ilike.%${filters.search}%
        `)
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {throw error}

      // Get payment totals for each contract
      const contractIds = data?.map((c: any) => c.id) || []

      if (contractIds.length === 0) {return []}

      const { data: payments } = await db
        .from('subcontract_payments')
        .select('subcontract_id, net_payment_due, status, paid_amount')
        .in('subcontract_id', contractIds)

      const paymentTotals: Record<string, { invoiced: number; paid: number }> = {}
      payments?.forEach((p: any) => {
        if (!paymentTotals[p.subcontract_id]) {
          paymentTotals[p.subcontract_id] = { invoiced: 0, paid: 0 }
        }
        if (p.status !== 'rejected') {
          paymentTotals[p.subcontract_id].invoiced += p.net_payment_due || 0
        }
        if (p.status === 'paid') {
          paymentTotals[p.subcontract_id].paid += p.paid_amount || 0
        }
      })

      return data.map((contract: any) => {
        const payments = paymentTotals[contract.id] || { invoiced: 0, paid: 0 }
        const compliance = contract.compliance_status?.[0]

        return {
          id: contract.id,
          contractNumber: contract.contract_number,
          contractName: contract.contract_name,
          projectId: contract.project_id,
          projectName: contract.project?.name || '',
          subcontractorId: contract.subcontractor_id,
          subcontractorName: contract.subcontractor?.company_name || '',
          status: contract.status,
          originalValue: contract.original_contract_value,
          currentValue: contract.current_contract_value,
          approvedChangeOrders: contract.approved_change_orders || 0,
          pendingChangeOrders: contract.pending_change_orders || 0,
          invoicedAmount: payments.invoiced,
          paidAmount: payments.paid,
          retentionHeld: (payments.invoiced * (contract.retention_percent || 0)) / 100,
          remainingBalance: contract.current_contract_value - payments.paid,
          complianceStatus: compliance?.is_compliant ? 'compliant' :
            compliance?.payment_hold ? 'non_compliant' : 'warning',
          startDate: contract.start_date,
          completionDate: contract.completion_date,
          percentComplete: payments.invoiced > 0 && contract.current_contract_value > 0
            ? Math.round((payments.invoiced / contract.current_contract_value) * 100)
            : 0,
        } as SubcontractListItem
      })
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Get single subcontract with details
 */
export function useSubcontract(id: string | undefined) {
  return useQuery({
    queryKey: subcontractKeys.detail(id || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('subcontracts')
        .select(`
          *,
          project:projects(id, name, project_number),
          subcontractor:subcontractors(*),
          bid_package:bid_packages(id, name, package_number),
          amendments:subcontract_amendments(*),
          gc_signed_by_user:users!gc_signed_by(id, full_name),
          created_by_user:users!created_by(id, full_name)
        `)
        .eq('id', id)
        .single()

      if (error) {throw error}

      // Get counts
      const [{ count: changeOrdersCount }, { count: paymentsCount }] = await Promise.all([
        db
          .from('subcontract_change_orders')
          .select('*', { count: 'exact', head: true })
          .eq('subcontract_id', id),
        db
          .from('subcontract_payments')
          .select('*', { count: 'exact', head: true })
          .eq('subcontract_id', id),
      ])

      // Get payment totals
      const { data: paymentData } = await db
        .from('subcontract_payments')
        .select('net_payment_due, paid_amount, status')
        .eq('subcontract_id', id)

      let invoicedAmount = 0
      let paidAmount = 0
      paymentData?.forEach((p: any) => {
        if (p.status !== 'rejected') {invoicedAmount += p.net_payment_due || 0}
        if (p.status === 'paid') {paidAmount += p.paid_amount || 0}
      })

      return {
        ...data,
        changeOrdersCount,
        paymentsCount,
        invoicedAmount,
        paidAmount,
      } as SubcontractWithDetails
    },
    enabled: !!id,
  })
}

/**
 * Get subcontracts by project
 */
export function useSubcontractsByProject(projectId: string | undefined) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: subcontractKeys.byProject(projectId || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('subcontracts')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, contact_name)
        `)
        .eq('project_id', projectId)
        .eq('company_id', userProfile?.company_id)
        .is('deleted_at', null)
        .order('contract_number', { ascending: true })

      if (error) {throw error}
      return data as Subcontract[]
    },
    enabled: !!projectId && !!userProfile?.company_id,
  })
}

/**
 * Get subcontract summary
 */
export function useSubcontractSummary(projectId?: string) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: subcontractKeys.summary(projectId),
    queryFn: async (): Promise<SubcontractSummary> => {
      let query = db
        .from('subcontracts')
        .select('status, original_contract_value, current_contract_value, approved_change_orders, pending_change_orders')
        .eq('company_id', userProfile?.company_id)
        .is('deleted_at', null)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {throw error}

      const summary: SubcontractSummary = {
        totalContracts: data?.length || 0,
        totalOriginalValue: 0,
        totalCurrentValue: 0,
        totalApprovedCOs: 0,
        totalPendingCOs: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        totalRetention: 0,
        byStatus: {},
      }

      data?.forEach((c: any) => {
        summary.totalOriginalValue += c.original_contract_value || 0
        summary.totalCurrentValue += c.current_contract_value || 0
        summary.totalApprovedCOs += c.approved_change_orders || 0
        summary.totalPendingCOs += c.pending_change_orders || 0

        if (!summary.byStatus[c.status]) {
          summary.byStatus[c.status] = 0
        }
        summary.byStatus[c.status]++
      })

      return summary
    },
    enabled: !!userProfile?.company_id,
  })
}

// =============================================
// Amendments
// =============================================

/**
 * Get amendments for a subcontract
 */
export function useSubcontractAmendments(subcontractId: string | undefined) {
  return useQuery({
    queryKey: subcontractKeys.amendments(subcontractId || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('subcontract_amendments')
        .select(`
          *,
          gc_signed_by_user:users!gc_signed_by(id, full_name),
          created_by_user:users!created_by(id, full_name)
        `)
        .eq('subcontract_id', subcontractId)
        .order('amendment_number', { ascending: true })

      if (error) {throw error}
      return data as SubcontractAmendment[]
    },
    enabled: !!subcontractId,
  })
}

// =============================================
// Payments
// =============================================

/**
 * Get payments for a subcontract
 */
export function useSubcontractPayments(subcontractId: string | undefined) {
  return useQuery({
    queryKey: subcontractKeys.payments(subcontractId || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('subcontract_payments')
        .select('*')
        .eq('subcontract_id', subcontractId)
        .order('payment_number', { ascending: false })

      if (error) {throw error}
      return data as SubcontractPayment[]
    },
    enabled: !!subcontractId,
  })
}

// =============================================
// Change Orders
// =============================================

/**
 * Get change orders for a subcontract
 */
export function useSubcontractChangeOrders(subcontractId: string | undefined) {
  return useQuery({
    queryKey: subcontractKeys.changeOrders(subcontractId || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('subcontract_change_orders')
        .select(`
          *,
          approved_by_user:users!approved_by(id, full_name)
        `)
        .eq('subcontract_id', subcontractId)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as SubcontractChangeOrder[]
    },
    enabled: !!subcontractId,
  })
}

// =============================================
// Mutations
// =============================================

/**
 * Create a new subcontract
 */
export function useCreateSubcontract() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (dto: CreateSubcontractDTO) => {
      // Generate contract number
      const { data: existing } = await db
        .from('subcontracts')
        .select('contract_number')
        .eq('project_id', dto.projectId)
        .order('created_at', { ascending: false })
        .limit(1)

      let nextNumber = 1
      if (existing?.[0]?.contract_number) {
        const match = existing[0].contract_number.match(/SC-(\d+)/)
        if (match) {nextNumber = parseInt(match[1]) + 1}
      }

      const contractNumber = `SC-${String(nextNumber).padStart(3, '0')}`

      const { data, error } = await db
        .from('subcontracts')
        .insert({
          company_id: userProfile?.company_id,
          project_id: dto.projectId,
          bid_package_id: dto.bidPackageId,
          submission_id: dto.submissionId,
          subcontractor_id: dto.subcontractorId,
          contract_number: contractNumber,
          contract_name: dto.contractName,
          original_contract_value: dto.originalContractValue,
          current_contract_value: dto.originalContractValue,
          start_date: dto.startDate,
          completion_date: dto.completionDate,
          retention_percent: dto.retentionPercent || 10,
          payment_terms: dto.paymentTerms,
          scope_of_work: dto.scopeOfWork,
          exclusions: dto.exclusions,
          inclusions: dto.inclusions,
          special_conditions: dto.specialConditions,
          status: 'draft',
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as Subcontract
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subcontractKeys.lists() })
      toast.success('Subcontract created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subcontract: ${error.message}`)
    },
  })
}

/**
 * Create subcontract from awarded bid
 */
export function useCreateSubcontractFromBid() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (dto: CreateSubcontractFromBidDTO) => {
      // Get submission details
      const { data: submission, error: subError } = await db
        .from('bid_submissions')
        .select(`
          *,
          package:bid_packages(*),
          invitation:bid_invitations(
            subcontractor:subcontractors(*)
          )
        `)
        .eq('id', dto.submissionId)
        .single()

      if (subError) {throw subError}

      // Generate contract number
      const { data: existing } = await db
        .from('subcontracts')
        .select('contract_number')
        .eq('project_id', submission.package.project_id)
        .order('created_at', { ascending: false })
        .limit(1)

      let nextNumber = 1
      if (existing?.[0]?.contract_number) {
        const match = existing[0].contract_number.match(/SC-(\d+)/)
        if (match) {nextNumber = parseInt(match[1]) + 1}
      }

      const contractNumber = `SC-${String(nextNumber).padStart(3, '0')}`

      // Get terms template if specified
      let terms: any = {}
      if (dto.termsTemplateId) {
        const { data: template } = await db
          .from('contract_terms_templates')
          .select('*')
          .eq('id', dto.termsTemplateId)
          .single()

        if (template) {
          terms = {
            general_conditions: template.general_conditions,
            insurance_requirements: template.insurance_requirements,
            indemnification: template.indemnification,
            dispute_resolution: template.dispute_resolution,
            termination: template.termination,
            warranty: template.warranty,
            safety_requirements: template.safety_requirements,
          }
        }
      }

      const { data, error } = await db
        .from('subcontracts')
        .insert({
          company_id: userProfile?.company_id,
          project_id: submission.package.project_id,
          bid_package_id: submission.bid_package_id,
          submission_id: dto.submissionId,
          subcontractor_id: submission.invitation?.subcontractor?.id,
          contract_number: contractNumber,
          contract_name: `${submission.package.name} - ${submission.invitation?.subcontractor?.company_name}`,
          original_contract_value: submission.award_amount || submission.base_bid_amount,
          current_contract_value: submission.award_amount || submission.base_bid_amount,
          start_date: dto.startDate,
          completion_date: dto.completionDate,
          retention_percent: dto.retentionPercent || 10,
          scope_of_work: submission.package.scope_of_work,
          exclusions: submission.exclusions,
          special_conditions: dto.additionalTerms,
          status: 'draft',
          created_by: userProfile?.id,
          ...terms,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as Subcontract
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subcontractKeys.lists() })
      queryClient.invalidateQueries({ queryKey: ['bidPackages'] })
      toast.success('Subcontract created from bid')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create subcontract: ${error.message}`)
    },
  })
}

/**
 * Update subcontract
 */
export function useUpdateSubcontract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Subcontract>
    }) => {
      const { data, error } = await db
        .from('subcontracts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as Subcontract
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subcontractKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: subcontractKeys.lists() })
      toast.success('Subcontract updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update subcontract: ${error.message}`)
    },
  })
}

/**
 * Update subcontract status
 */
export function useUpdateSubcontractStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: string
    }) => {
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      }

      // Set dates based on status
      if (status === 'executed') {
        updates.contract_date = new Date().toISOString().split('T')[0]
      }

      const { data, error } = await db
        .from('subcontracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as Subcontract
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subcontractKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: subcontractKeys.lists() })
      toast.success('Status updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`)
    },
  })
}

/**
 * Create amendment
 */
export function useCreateAmendment() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (dto: CreateAmendmentDTO) => {
      // Get next amendment number
      const { count } = await db
        .from('subcontract_amendments')
        .select('*', { count: 'exact', head: true })
        .eq('subcontract_id', dto.subcontractId)

      const { data, error } = await db
        .from('subcontract_amendments')
        .insert({
          subcontract_id: dto.subcontractId,
          amendment_number: (count || 0) + 1,
          title: dto.title,
          description: dto.description,
          change_reason: dto.changeReason,
          scope_changes: dto.scopeChanges,
          price_change: dto.priceChange,
          time_extension_days: dto.timeExtensionDays,
          new_completion_date: dto.newCompletionDate,
          status: 'draft',
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as SubcontractAmendment
    },
    onSuccess: (_, { subcontractId }) => {
      queryClient.invalidateQueries({ queryKey: subcontractKeys.amendments(subcontractId) })
      queryClient.invalidateQueries({ queryKey: subcontractKeys.detail(subcontractId) })
      toast.success('Amendment created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create amendment: ${error.message}`)
    },
  })
}

/**
 * Execute amendment (apply changes to subcontract)
 */
export function useExecuteAmendment() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      amendmentId,
      subcontractId,
    }: {
      amendmentId: string
      subcontractId: string
    }) => {
      // Get amendment
      const { data: amendment, error: amendError } = await db
        .from('subcontract_amendments')
        .select('*')
        .eq('id', amendmentId)
        .single()

      if (amendError) {throw amendError}

      // Get current subcontract
      const { data: contract, error: contractError } = await db
        .from('subcontracts')
        .select('current_contract_value, approved_change_orders, completion_date')
        .eq('id', subcontractId)
        .single()

      if (contractError) {throw contractError}

      // Update subcontract
      const updates: any = {
        current_contract_value: contract.current_contract_value + amendment.price_change,
        approved_change_orders: (contract.approved_change_orders || 0) + amendment.price_change,
        updated_at: new Date().toISOString(),
      }

      if (amendment.new_completion_date) {
        updates.completion_date = amendment.new_completion_date
      }

      await db
        .from('subcontracts')
        .update(updates)
        .eq('id', subcontractId)

      // Update amendment status
      const { data, error } = await db
        .from('subcontract_amendments')
        .update({
          status: 'executed',
          effective_date: new Date().toISOString().split('T')[0],
          gc_signed_by: userProfile?.id,
          gc_signed_at: new Date().toISOString(),
        })
        .eq('id', amendmentId)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (_, { subcontractId }) => {
      queryClient.invalidateQueries({ queryKey: subcontractKeys.amendments(subcontractId) })
      queryClient.invalidateQueries({ queryKey: subcontractKeys.detail(subcontractId) })
      queryClient.invalidateQueries({ queryKey: subcontractKeys.lists() })
      toast.success('Amendment executed')
    },
    onError: (error: Error) => {
      toast.error(`Failed to execute amendment: ${error.message}`)
    },
  })
}

/**
 * Delete subcontract (soft delete)
 */
export function useDeleteSubcontract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('subcontracts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subcontractKeys.lists() })
      toast.success('Subcontract deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete subcontract: ${error.message}`)
    },
  })
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get status badge variant
 */
export function getSubcontractStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'executed':
    case 'active':
    case 'completed':
      return 'default'
    case 'draft':
    case 'pending_review':
      return 'secondary'
    case 'suspended':
    case 'terminated':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Format contract value
 */
export function formatContractValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Calculate percent complete
 */
export function calculatePercentComplete(invoiced: number, contractValue: number): number {
  if (contractValue <= 0) {return 0}
  return Math.min(100, Math.round((invoiced / contractValue) * 100))
}
