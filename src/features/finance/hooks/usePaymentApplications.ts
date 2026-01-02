/**
 * Payment Applications (AIA G702/G703) React Query Hooks
 *
 * Query and mutation hooks for managing AIA payment applications
 * and continuation sheets.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth'
import type {
  AIAG702,
  AIAG702Create,
  AIAG703,
  AIAG703LineItem,
  BillingFilters,
} from '../types/sov'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const paymentAppKeys = {
  all: ['payment-applications'] as const,
  lists: () => [...paymentAppKeys.all, 'list'] as const,
  list: (filters: BillingFilters) => [...paymentAppKeys.lists(), filters] as const,
  details: () => [...paymentAppKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentAppKeys.details(), id] as const,
  byProject: (projectId: string) => [...paymentAppKeys.all, 'project', projectId] as const,
  bySov: (sovId: string) => [...paymentAppKeys.all, 'sov', sovId] as const,
  g703: (g702Id: string) => [...paymentAppKeys.all, 'g703', g702Id] as const,
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get all payment applications for a project
 */
export function usePaymentApplications(projectId: string | undefined) {
  return useQuery({
    queryKey: paymentAppKeys.byProject(projectId || ''),
    queryFn: async () => {
      if (!projectId) return []

      const { data, error } = await supabase
        .from('aia_g702_applications')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('application_number', { ascending: false })

      if (error) throw error
      return data as AIAG702[]
    },
    enabled: !!projectId,
  })
}

/**
 * Get a single payment application with G703 line items
 */
export function usePaymentApplication(id: string | undefined) {
  return useQuery({
    queryKey: paymentAppKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('aia_g702_applications')
        .select(`
          *,
          aia_g703_line_items (
            *
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      return {
        ...data,
        g703_line_items: data.aia_g703_line_items || [],
      } as AIAG702 & { g703_line_items: AIAG703LineItem[] }
    },
    enabled: !!id,
  })
}

/**
 * Get G703 continuation sheet for a G702
 */
export function useG703(g702Id: string | undefined) {
  return useQuery({
    queryKey: paymentAppKeys.g703(g702Id || ''),
    queryFn: async () => {
      if (!g702Id) return null

      // Get G702 info
      const { data: g702, error: g702Error } = await supabase
        .from('aia_g702_applications')
        .select('application_number, period_to')
        .eq('id', g702Id)
        .single()

      if (g702Error) throw g702Error

      // Get G703 line items
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('aia_g703_line_items')
        .select('*')
        .eq('g702_id', g702Id)
        .order('sort_order', { ascending: true })

      if (lineItemsError) throw lineItemsError

      // Calculate totals
      const totals = (lineItems || []).reduce(
        (acc, li) => ({
          total_scheduled_value: acc.total_scheduled_value + (li.scheduled_value || 0),
          total_from_previous: acc.total_from_previous + (li.from_previous_application || 0),
          total_this_period: acc.total_this_period + (li.this_period || 0),
          total_materials_stored: acc.total_materials_stored + (li.materials_presently_stored || 0),
          total_completed_and_stored:
            acc.total_completed_and_stored + (li.total_completed_and_stored || 0),
          total_balance_to_finish: acc.total_balance_to_finish + (li.balance_to_finish || 0),
          total_retainage: acc.total_retainage + (li.retainage || 0),
        }),
        {
          total_scheduled_value: 0,
          total_from_previous: 0,
          total_this_period: 0,
          total_materials_stored: 0,
          total_completed_and_stored: 0,
          total_balance_to_finish: 0,
          total_retainage: 0,
        }
      )

      const g703: AIAG703 = {
        g702_id: g702Id,
        application_number: g702.application_number,
        period_to: g702.period_to,
        ...totals,
        line_items: lineItems as AIAG703LineItem[],
      }

      return g703
    },
    enabled: !!g702Id,
  })
}

/**
 * Get applications filtered by status and date range
 */
export function useFilteredApplications(filters: BillingFilters) {
  return useQuery({
    queryKey: paymentAppKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('aia_g702_applications')
        .select('*')
        .is('deleted_at', null)

      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.sov_id) {
        query = query.eq('sov_id', filters.sov_id)
      }
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.period_from) {
        query = query.gte('period_to', filters.period_from)
      }
      if (filters.period_to) {
        query = query.lte('period_to', filters.period_to)
      }

      const { data, error } = await query.order('period_to', { ascending: false })

      if (error) throw error
      return data as AIAG702[]
    },
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new payment application (G702 with G703 line items)
 */
export function useCreatePaymentApplication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: AIAG702Create) => {
      // Use the database function to create G702 with G703 line items
      const { data: g702Id, error } = await supabase.rpc('create_g702_application', {
        p_project_id: data.project_id,
        p_sov_id: data.sov_id,
        p_period_to: data.period_to,
        p_created_by: user?.id,
      })

      if (error) throw error

      // Fetch the created application
      const { data: application, error: fetchError } = await supabase
        .from('aia_g702_applications')
        .select('*')
        .eq('id', g702Id)
        .single()

      if (fetchError) throw fetchError

      return application as AIAG702
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.byProject(data.project_id) })
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.bySov(data.sov_id) })
      toast({
        title: 'Payment Application Created',
        description: `Application #${data.application_number} has been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payment application.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a payment application
 */
export function useUpdatePaymentApplication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<AIAG702>
    }) => {
      const { data: application, error } = await supabase
        .from('aia_g702_applications')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return application as AIAG702
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.byProject(data.project_id) })
      toast({
        title: 'Application Updated',
        description: 'The payment application has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update application.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update G703 line item billing
 */
export function useUpdateG703LineItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<AIAG703LineItem>
    }) => {
      // Calculate derived fields
      const updateData: Record<string, any> = { ...data }

      if (
        data.from_previous_application !== undefined ||
        data.this_period !== undefined ||
        data.materials_presently_stored !== undefined
      ) {
        // Get current values
        const { data: current } = await supabase
          .from('aia_g703_line_items')
          .select('*')
          .eq('id', id)
          .single()

        if (current) {
          const fromPrevious = data.from_previous_application ?? current.from_previous_application
          const thisPeriod = data.this_period ?? current.this_period
          const materials = data.materials_presently_stored ?? current.materials_presently_stored
          const scheduledValue = current.scheduled_value

          const totalCompleted = fromPrevious + thisPeriod + materials

          updateData.percent_complete =
            scheduledValue > 0 ? Math.round((totalCompleted / scheduledValue) * 100 * 100) / 100 : 0
          updateData.balance_to_finish = scheduledValue - totalCompleted
          updateData.retainage = totalCompleted * 0.1 // Assuming 10% retainage
        }
      }

      const { data: lineItem, error } = await supabase
        .from('aia_g703_line_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return lineItem as AIAG703LineItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.g703(data.g702_id) })
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.detail(data.g702_id) })
      toast({
        title: 'Line Item Updated',
        description: 'The G703 line item has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update line item.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Submit a payment application for approval
 */
export function useSubmitPaymentApplication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: application, error } = await supabase
        .from('aia_g702_applications')
        .update({
          status: 'submitted',
          date_submitted: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return application as AIAG702
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.byProject(data.project_id) })
      toast({
        title: 'Application Submitted',
        description: `Application #${data.application_number} has been submitted for approval.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Approve a payment application
 */
export function useApprovePaymentApplication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      certificationAmount,
      architectName,
    }: {
      id: string
      certificationAmount?: number
      architectName?: string
    }) => {
      const { data: application, error } = await supabase
        .from('aia_g702_applications')
        .update({
          status: 'approved',
          date_approved: new Date().toISOString(),
          architect_certification_amount: certificationAmount,
          architect_name: architectName || user?.full_name,
          architect_signature_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return application as AIAG702
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.byProject(data.project_id) })
      toast({
        title: 'Application Approved',
        description: `Application #${data.application_number} has been approved.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve application.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Mark application as paid
 */
export function useMarkApplicationPaid() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      checkNumber,
      paymentDate,
    }: {
      id: string
      checkNumber?: string
      paymentDate?: string
    }) => {
      const { data: application, error } = await supabase
        .from('aia_g702_applications')
        .update({
          status: 'paid',
          date_paid: paymentDate || new Date().toISOString(),
          check_number: checkNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return application as AIAG702
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.byProject(data.project_id) })
      toast({
        title: 'Payment Recorded',
        description: `Application #${data.application_number} has been marked as paid.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record payment.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Reject a payment application
 */
export function useRejectPaymentApplication() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      reason,
    }: {
      id: string
      reason: string
    }) => {
      const { data: application, error } = await supabase
        .from('aia_g702_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return application as AIAG702
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.byProject(data.project_id) })
      toast({
        title: 'Application Rejected',
        description: `Application #${data.application_number} has been rejected.`,
        variant: 'destructive',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject application.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Add signature to application
 */
export function useAddSignature() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      signatureType,
      signatureUrl,
      name,
    }: {
      id: string
      signatureType: 'contractor' | 'architect' | 'owner' | 'notary'
      signatureUrl: string
      name: string
    }) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      const dateField = `${signatureType}_signature_date`
      const urlField = `${signatureType}_signature_url`
      const nameField = `${signatureType}_name`

      updateData[urlField] = signatureUrl
      updateData[nameField] = name
      updateData[dateField] = new Date().toISOString().split('T')[0]

      if (signatureType === 'notary') {
        updateData.notarized = true
        updateData.notary_date = new Date().toISOString().split('T')[0]
      }

      const { data: application, error } = await supabase
        .from('aia_g702_applications')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return application as AIAG702
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.detail(data.id) })
      toast({
        title: 'Signature Added',
        description: 'The signature has been added to the application.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add signature.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Recalculate G702 totals from G703 line items
 */
export function useRecalculateG702Totals() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (g702Id: string) => {
      // Get G703 line items
      const { data: lineItems, error: fetchError } = await supabase
        .from('aia_g703_line_items')
        .select('*')
        .eq('g702_id', g702Id)

      if (fetchError) throw fetchError

      // Calculate totals
      const totals = (lineItems || []).reduce(
        (acc, li) => ({
          total_completed_and_stored_to_date:
            acc.total_completed_and_stored_to_date + (li.total_completed_and_stored || 0),
          retainage_from_work_completed:
            acc.retainage_from_work_completed + (li.retainage || 0),
          balance_to_finish_including_retainage:
            acc.balance_to_finish_including_retainage +
            (li.balance_to_finish || 0) +
            (li.retainage || 0),
        }),
        {
          total_completed_and_stored_to_date: 0,
          retainage_from_work_completed: 0,
          balance_to_finish_including_retainage: 0,
        }
      )

      // Get current G702 data
      const { data: g702 } = await supabase
        .from('aia_g702_applications')
        .select('less_previous_certificates')
        .eq('id', g702Id)
        .single()

      const totalEarnedLessRetainage =
        totals.total_completed_and_stored_to_date - totals.retainage_from_work_completed
      const currentPaymentDue = totalEarnedLessRetainage - (g702?.less_previous_certificates || 0)

      // Update G702
      const { data: updated, error } = await supabase
        .from('aia_g702_applications')
        .update({
          ...totals,
          total_earned_less_retainage: totalEarnedLessRetainage,
          current_payment_due: currentPaymentDue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', g702Id)
        .select()
        .single()

      if (error) throw error
      return updated as AIAG702
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: paymentAppKeys.g703(data.id) })
    },
  })
}
