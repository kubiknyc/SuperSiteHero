// File: /src/features/payment-applications/hooks/usePaymentApplications.ts
// React Query hooks for Payment Applications (AIA G702/G703)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  PaymentApplication,
  PaymentApplicationWithDetails,
  ScheduleOfValuesItem,
  PaymentApplicationHistory,
  PaymentApplicationStatus,
  CreatePaymentApplicationDTO,
  UpdatePaymentApplicationDTO,
  CreateSOVItemDTO,
  UpdateSOVItemDTO,
  BulkUpdateSOVItemDTO,
  SubmitPaymentApplicationDTO,
  ApprovePaymentApplicationDTO,
  RejectPaymentApplicationDTO,
  MarkPaidDTO,
  ProjectPaymentSummary,
} from '@/types/payment-application'

// Re-export constants from types
export { PAYMENT_APPLICATION_STATUSES, RETAINAGE_OPTIONS } from '@/types/payment-application'

// =============================================
// Query Keys
// =============================================

export const paymentApplicationKeys = {
  all: ['payment-applications'] as const,
  lists: () => [...paymentApplicationKeys.all, 'list'] as const,
  list: (projectId: string) => [...paymentApplicationKeys.lists(), projectId] as const,
  details: () => [...paymentApplicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentApplicationKeys.details(), id] as const,
  sov: (appId: string) => [...paymentApplicationKeys.all, appId, 'sov'] as const,
  history: (appId: string) => [...paymentApplicationKeys.all, appId, 'history'] as const,
  summary: (projectId: string) => [...paymentApplicationKeys.all, 'summary', projectId] as const,
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all payment applications for a project
 */
export function useProjectPaymentApplications(projectId: string | undefined) {
  return useQuery({
    queryKey: paymentApplicationKeys.list(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const { data, error } = await supabase
        .from('payment_applications')
        .select(`
          *,
          project:project_id (
            id,
            name,
            project_number
          ),
          submitted_by_user:submitted_by (
            id,
            full_name,
            email
          ),
          approved_by_user:approved_by (
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('application_number', { ascending: false })

      if (error) throw error

      // Add display_number and sov_item_count
      return (data || []).map(app => ({
        ...app,
        display_number: `App #${(app as any).application_number}`,
        sov_item_count: 0, // Will be populated separately if needed
      })) as unknown as PaymentApplicationWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single payment application by ID with all details
 */
export function usePaymentApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: paymentApplicationKeys.detail(applicationId || ''),
    queryFn: async () => {
      if (!applicationId) throw new Error('Application ID required')

      const { data, error } = await supabase
        .from('payment_applications')
        .select(`
          *,
          project:project_id (
            id,
            name,
            project_number
          ),
          submitted_by_user:submitted_by (
            id,
            full_name,
            email
          ),
          approved_by_user:approved_by (
            id,
            full_name,
            email
          ),
          created_by_user:created_by (
            id,
            full_name,
            email
          )
        `)
        .eq('id', applicationId)
        .single()

      if (error) throw error

      return {
        ...data,
        display_number: `App #${(data as any).application_number}`,
        sov_item_count: 0,
      } as unknown as PaymentApplicationWithDetails
    },
    enabled: !!applicationId,
  })
}

/**
 * Fetch Schedule of Values items for a payment application
 */
export function useScheduleOfValues(applicationId: string | undefined) {
  return useQuery({
    queryKey: paymentApplicationKeys.sov(applicationId || ''),
    queryFn: async () => {
      if (!applicationId) throw new Error('Application ID required')

      const { data, error } = await supabase
        .from('schedule_of_values')
        .select(`
          *,
          cost_code_details:cost_code_id (
            id,
            code,
            name,
            division
          )
        `)
        .eq('payment_application_id', applicationId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as ScheduleOfValuesItem[]
    },
    enabled: !!applicationId,
  })
}

/**
 * Fetch payment application history
 */
export function usePaymentApplicationHistory(applicationId: string | undefined) {
  return useQuery({
    queryKey: paymentApplicationKeys.history(applicationId || ''),
    queryFn: async () => {
      if (!applicationId) throw new Error('Application ID required')

      const { data, error } = await supabase
        .from('payment_application_history')
        .select(`
          *,
          changed_by_user:changed_by (
            id,
            full_name,
            email
          )
        `)
        .eq('payment_application_id', applicationId)
        .order('changed_at', { ascending: false })

      if (error) throw error
      return data as PaymentApplicationHistory[]
    },
    enabled: !!applicationId,
  })
}

/**
 * Get project payment summary statistics
 */
export function useProjectPaymentSummary(projectId: string | undefined) {
  const { data: applications } = useProjectPaymentApplications(projectId)

  if (!applications) {
    return {
      total_applications: 0,
      total_billed: 0,
      total_received: 0,
      total_outstanding: 0,
      total_retainage_held: 0,
      last_application_date: null,
      last_payment_date: null,
      percent_billed: 0,
    } as ProjectPaymentSummary
  }

  const paidApps = applications.filter(a => a.status === 'paid')
  const approvedApps = applications.filter(a => a.status === 'approved')
  const latestApp = applications[0]

  const total_billed = applications.reduce((sum, a) =>
    a.status !== 'draft' && a.status !== 'void'
      ? sum + (a.current_payment_due || 0)
      : sum, 0)

  const total_received = paidApps.reduce((sum, a) =>
    sum + (a.payment_received_amount || 0), 0)

  const total_outstanding = total_billed - total_received

  const total_retainage_held = applications.reduce((sum, a) =>
    a.status !== 'void' ? sum + (a.total_retainage || 0) : sum, 0)

  const contractSum = latestApp?.contract_sum_to_date || 0
  const percent_billed = contractSum > 0
    ? Math.round((total_billed / contractSum) * 100)
    : 0

  return {
    total_applications: applications.length,
    total_billed,
    total_received,
    total_outstanding,
    total_retainage_held,
    last_application_date: latestApp?.period_to || null,
    last_payment_date: paidApps[0]?.paid_at || null,
    percent_billed,
  } as ProjectPaymentSummary
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Create a new payment application
 */
export function useCreatePaymentApplication() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreatePaymentApplicationDTO) => {
      if (!userProfile?.company_id) throw new Error('Company ID required')

      // Get next application number
      const { data: nextNum, error: numError } = await supabase
        .rpc('get_next_application_number', { p_project_id: input.project_id })

      if (numError) throw numError

      const { data, error } = await supabase
        .from('payment_applications')
        .insert({
          ...input,
          application_number: nextNum || 1,
          company_id: userProfile.company_id,
          created_by: userProfile.id,
          status: 'draft',
        })
        .select()
        .single()

      if (error) throw error
      return data as PaymentApplication
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(data.project_id) })
    },
  })
}

/**
 * Update a payment application
 */
export function useUpdatePaymentApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePaymentApplicationDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PaymentApplication
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(data.project_id) })
    },
  })
}

/**
 * Submit payment application for review
 */
export function useSubmitPaymentApplication() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...input }: SubmitPaymentApplicationDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_applications')
        .update({
          ...input,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: userProfile?.id,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PaymentApplication
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(data.project_id) })
    },
  })
}

/**
 * Approve payment application
 */
export function useApprovePaymentApplication() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...input }: ApprovePaymentApplicationDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_applications')
        .update({
          ...input,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: userProfile?.id,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PaymentApplication
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(data.project_id) })
    },
  })
}

/**
 * Reject payment application
 */
export function useRejectPaymentApplication() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, rejection_reason }: RejectPaymentApplicationDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_applications')
        .update({
          status: 'rejected',
          rejection_reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userProfile?.id,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PaymentApplication
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(data.project_id) })
    },
  })
}

/**
 * Mark payment application as paid
 */
export function useMarkPaymentApplicationPaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: MarkPaidDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_applications')
        .update({
          status: 'paid',
          payment_received_amount: input.payment_received_amount,
          payment_reference: input.payment_reference,
          paid_at: input.paid_at || new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PaymentApplication
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(data.project_id) })
    },
  })
}

/**
 * Update payment application signature
 */
export function useUpdatePaymentApplicationSignature() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      role,
      signatureUrl,
      signatureDate,
    }: {
      id: string
      role: 'contractor' | 'architect' | 'owner'
      signatureUrl: string | null
      signatureDate: string | null
    }) => {
      const updateFields: Record<string, string | null> = {}

      if (role === 'contractor') {
        updateFields.contractor_signature_url = signatureUrl
        updateFields.contractor_signature_date = signatureDate
      } else if (role === 'architect') {
        updateFields.architect_signature_url = signatureUrl
        updateFields.architect_signature_date = signatureDate
      } else if (role === 'owner') {
        updateFields.owner_signature_url = signatureUrl
        updateFields.owner_signature_date = signatureDate
      }

      const { data, error } = await supabase
        .from('payment_applications')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as PaymentApplication
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(data.project_id) })
    },
  })
}

/**
 * Delete (soft delete) payment application
 */
export function useDeletePaymentApplication() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (applicationId: string) => {
      // First get the project_id for cache invalidation
      const { data: app } = await supabase
        .from('payment_applications')
        .select('project_id')
        .eq('id', applicationId)
        .single()

      const { error } = await supabase
        .from('payment_applications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', applicationId)

      if (error) throw error
      return app?.project_id
    },
    onSuccess: (projectId) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.list(projectId) })
      }
      queryClient.invalidateQueries({ queryKey: paymentApplicationKeys.all })
    },
  })
}

// =============================================
// SOV Item Mutations
// =============================================

/**
 * Create a SOV item
 */
export function useCreateSOVItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSOVItemDTO) => {
      const { data, error } = await supabase
        .from('schedule_of_values')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data as ScheduleOfValuesItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.sov(data.payment_application_id)
      })
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.detail(data.payment_application_id)
      })
    },
  })
}

/**
 * Update a SOV item
 */
export function useUpdateSOVItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSOVItemDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('schedule_of_values')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as ScheduleOfValuesItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.sov(data.payment_application_id)
      })
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.detail(data.payment_application_id)
      })
    },
  })
}

/**
 * Bulk update SOV items (for spreadsheet editing)
 */
export function useBulkUpdateSOVItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      applicationId,
      items
    }: {
      applicationId: string
      items: BulkUpdateSOVItemDTO[]
    }) => {
      // Update each item
      const updates = items.map(item =>
        supabase
          .from('schedule_of_values')
          .update({
            work_completed_this_period: item.work_completed_this_period,
            materials_stored: item.materials_stored,
            notes: item.notes,
          })
          .eq('id', item.id)
      )

      const results = await Promise.all(updates)
      const errors = results.filter(r => r.error)

      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} items`)
      }

      return applicationId
    },
    onSuccess: (applicationId) => {
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.sov(applicationId)
      })
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.detail(applicationId)
      })
    },
  })
}

/**
 * Delete a SOV item
 */
export function useDeleteSOVItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, applicationId }: { id: string; applicationId: string }) => {
      const { error } = await supabase
        .from('schedule_of_values')
        .delete()
        .eq('id', id)

      if (error) throw error
      return applicationId
    },
    onSuccess: (applicationId) => {
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.sov(applicationId)
      })
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.detail(applicationId)
      })
    },
  })
}

/**
 * Copy SOV from previous application
 */
export function useCopySOVFromPrevious() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      newApplicationId,
      previousApplicationId
    }: {
      newApplicationId: string
      previousApplicationId: string
    }) => {
      const { error } = await supabase.rpc('copy_sov_from_previous_application', {
        p_new_application_id: newApplicationId,
        p_previous_application_id: previousApplicationId,
      })

      if (error) throw error
      return newApplicationId
    },
    onSuccess: (applicationId) => {
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.sov(applicationId)
      })
      queryClient.invalidateQueries({
        queryKey: paymentApplicationKeys.detail(applicationId)
      })
    },
  })
}

// =============================================
// Utility Functions
// =============================================

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '0%'
  return `${value.toFixed(1)}%`
}

/**
 * Get status color for badges
 */
export function getStatusColor(status: PaymentApplicationStatus): string {
  const colors: Record<PaymentApplicationStatus, string> = {
    draft: 'gray',
    submitted: 'blue',
    under_review: 'yellow',
    approved: 'green',
    rejected: 'red',
    paid: 'emerald',
    void: 'gray',
  }
  return colors[status] || 'gray'
}

export default {
  useProjectPaymentApplications,
  usePaymentApplication,
  useScheduleOfValues,
  usePaymentApplicationHistory,
  useProjectPaymentSummary,
  useCreatePaymentApplication,
  useUpdatePaymentApplication,
  useSubmitPaymentApplication,
  useApprovePaymentApplication,
  useRejectPaymentApplication,
  useMarkPaymentApplicationPaid,
  useDeletePaymentApplication,
  useCreateSOVItem,
  useUpdateSOVItem,
  useBulkUpdateSOVItems,
  useDeleteSOVItem,
  useCopySOVFromPrevious,
  formatCurrency,
  formatPercent,
  getStatusColor,
}
