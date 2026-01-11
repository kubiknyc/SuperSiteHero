/**
 * Schedule of Values (SOV) React Query Hooks
 *
 * Query and mutation hooks for managing Schedule of Values,
 * line items, and billing operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth'
import type {
  ScheduleOfValues,
  SOVLineItem,
  SOVInsert,
  SOVLineItemInsert,
  SOVLineItemBillingUpdate,
  SOVFilters,
} from '../types/sov'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const sovKeys = {
  all: ['schedule-of-values'] as const,
  lists: () => [...sovKeys.all, 'list'] as const,
  list: (filters: SOVFilters) => [...sovKeys.lists(), filters] as const,
  details: () => [...sovKeys.all, 'detail'] as const,
  detail: (id: string) => [...sovKeys.details(), id] as const,
  byProject: (projectId: string) => [...sovKeys.all, 'project', projectId] as const,
  lineItems: (sovId: string) => [...sovKeys.all, 'line-items', sovId] as const,
  summary: (projectId: string) => [...sovKeys.all, 'summary', projectId] as const,
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get Schedule of Values for a project
 */
export function useScheduleOfValues(projectId: string | undefined) {
  return useQuery({
    queryKey: sovKeys.byProject(projectId || ''),
    queryFn: async () => {
      if (!projectId) {return null}

      const { data, error } = await supabase
        .from('schedule_of_values')
        .select(`
          *,
          sov_line_items (
            *
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (!data) {return null}

      // Calculate totals from line items
      const lineItems = data.sov_line_items || []
      const totals = lineItems.reduce(
        (acc: any, li: any) => {
          const workTotal = (li.work_completed_previous || 0) + (li.work_completed_this_period || 0)
          const materialsTotal = (li.materials_stored_previous || 0) + (li.materials_stored_this_period || 0)
          const completedAndStored = workTotal + materialsTotal
          const retainageAmount = completedAndStored * ((li.retainage_percent || 10) / 100)

          return {
            total_scheduled_value: acc.total_scheduled_value + (li.scheduled_value || 0),
            total_work_completed: acc.total_work_completed + workTotal,
            total_materials_stored: acc.total_materials_stored + materialsTotal,
            total_completed_and_stored: acc.total_completed_and_stored + completedAndStored,
            total_retainage_held: acc.total_retainage_held + retainageAmount,
            total_balance_to_finish: acc.total_balance_to_finish + ((li.scheduled_value || 0) - completedAndStored),
          }
        },
        {
          total_scheduled_value: 0,
          total_work_completed: 0,
          total_materials_stored: 0,
          total_completed_and_stored: 0,
          total_retainage_held: 0,
          total_balance_to_finish: 0,
        }
      )

      const sov: ScheduleOfValues = {
        ...data,
        ...totals,
        overall_percent_complete:
          totals.total_scheduled_value > 0
            ? (totals.total_completed_and_stored / totals.total_scheduled_value) * 100
            : 0,
        line_items: lineItems.map((li: any) => {
          const workTotal = (li.work_completed_previous || 0) + (li.work_completed_this_period || 0)
          const materialsTotal = (li.materials_stored_previous || 0) + (li.materials_stored_this_period || 0)
          const completedAndStored = workTotal + materialsTotal

          return {
            ...li,
            work_completed_total: workTotal,
            materials_stored_total: materialsTotal,
            total_completed_and_stored: completedAndStored,
            percent_complete:
              li.scheduled_value > 0 ? (completedAndStored / li.scheduled_value) * 100 : 0,
            balance_to_finish: (li.scheduled_value || 0) - completedAndStored,
            retainage_amount: completedAndStored * ((li.retainage_percent || 10) / 100),
          }
        }),
      }

      return sov
    },
    enabled: !!projectId,
  })
}

/**
 * Get SOV line items for a specific SOV
 */
export function useSOVLineItems(sovId: string | undefined) {
  return useQuery({
    queryKey: sovKeys.lineItems(sovId || ''),
    queryFn: async () => {
      if (!sovId) {return []}

      const { data, error } = await supabase
        .from('sov_line_items')
        .select('*')
        .eq('sov_id', sovId)
        .order('sort_order', { ascending: true })

      if (error) {throw error}

      return (data || []).map((li) => {
        const workTotal = (li.work_completed_previous || 0) + (li.work_completed_this_period || 0)
        const materialsTotal =
          (li.materials_stored_previous || 0) + (li.materials_stored_this_period || 0)
        const completedAndStored = workTotal + materialsTotal

        return {
          ...li,
          work_completed_total: workTotal,
          materials_stored_total: materialsTotal,
          total_completed_and_stored: completedAndStored,
          percent_complete:
            li.scheduled_value > 0 ? (completedAndStored / li.scheduled_value) * 100 : 0,
          balance_to_finish: (li.scheduled_value || 0) - completedAndStored,
          retainage_amount: completedAndStored * ((li.retainage_percent || 10) / 100),
        } as SOVLineItem
      })
    },
    enabled: !!sovId,
  })
}

/**
 * Get SOV summary from view
 */
export function useSOVSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: sovKeys.summary(projectId || ''),
    queryFn: async () => {
      if (!projectId) {return null}

      const { data, error } = await supabase
        .from('sov_summary')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    },
    enabled: !!projectId,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new Schedule of Values
 */
export function useCreateSOV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: SOVInsert) => {
      const { data: sov, error } = await supabase
        .from('schedule_of_values')
        .insert({
          ...data,
          company_id: user?.company_id,
          created_by: user?.id,
          status: data.status || 'draft',
          retainage_percent: data.retainage_percent || 10,
        })
        .select()
        .single()

      if (error) {throw error}
      return sov
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sovKeys.byProject(data.project_id) })
      toast({
        title: 'Schedule of Values Created',
        description: 'The SOV has been created successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create Schedule of Values.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update Schedule of Values
 */
export function useUpdateSOV() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<Omit<ScheduleOfValues, 'id' | 'line_items'>>
    }) => {
      const { data: sov, error } = await supabase
        .from('schedule_of_values')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return sov
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sovKeys.byProject(data.project_id) })
      queryClient.invalidateQueries({ queryKey: sovKeys.detail(data.id) })
      toast({
        title: 'SOV Updated',
        description: 'The Schedule of Values has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update Schedule of Values.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Add a line item to SOV
 */
export function useAddSOVLineItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: SOVLineItemInsert) => {
      // Get current max sort_order
      const { data: existing } = await supabase
        .from('sov_line_items')
        .select('sort_order')
        .eq('sov_id', data.sov_id)
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1

      const { data: lineItem, error } = await supabase
        .from('sov_line_items')
        .insert({
          ...data,
          sort_order: data.sort_order ?? nextOrder,
          retainage_percent: data.retainage_percent || 10,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return lineItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sovKeys.lineItems(data.sov_id) })
      queryClient.invalidateQueries({ queryKey: sovKeys.all })
      toast({
        title: 'Line Item Added',
        description: 'The line item has been added to the SOV.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add line item.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a line item
 */
export function useUpdateSOVLineItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<SOVLineItemInsert>
    }) => {
      const { data: lineItem, error } = await supabase
        .from('sov_line_items')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return lineItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sovKeys.lineItems(data.sov_id) })
      queryClient.invalidateQueries({ queryKey: sovKeys.all })
      toast({
        title: 'Line Item Updated',
        description: 'The line item has been updated.',
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
 * Update billing for a line item
 */
export function useUpdateSOVLineItemBilling() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (updates: SOVLineItemBillingUpdate[]) => {
      const results = await Promise.all(
        updates.map(async (update) => {
          const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
          }

          if (update.work_completed_this_period !== undefined) {
            updateData.work_completed_this_period = update.work_completed_this_period
          }
          if (update.materials_stored_this_period !== undefined) {
            updateData.materials_stored_this_period = update.materials_stored_this_period
          }
          if (update.retainage_released !== undefined) {
            updateData.retainage_released = update.retainage_released
          }

          const { data, error } = await supabase
            .from('sov_line_items')
            .update(updateData)
            .eq('id', update.id)
            .select()
            .single()

          if (error) {throw error}
          return data
        })
      )

      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sovKeys.all })
      toast({
        title: 'Billing Updated',
        description: 'Line item billing has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update billing.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a line item
 */
export function useDeleteSOVLineItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the sov_id for cache invalidation
      const { data: lineItem } = await supabase
        .from('sov_line_items')
        .select('sov_id')
        .eq('id', id)
        .single()

      const { error } = await supabase.from('sov_line_items').delete().eq('id', id)

      if (error) {throw error}
      return { id, sov_id: lineItem?.sov_id }
    },
    onSuccess: (data) => {
      if (data.sov_id) {
        queryClient.invalidateQueries({ queryKey: sovKeys.lineItems(data.sov_id) })
      }
      queryClient.invalidateQueries({ queryKey: sovKeys.all })
      toast({
        title: 'Line Item Deleted',
        description: 'The line item has been removed from the SOV.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete line item.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Reorder line items
 */
export function useReorderSOVLineItems() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      sovId,
      itemIds,
    }: {
      sovId: string
      itemIds: string[]
    }) => {
      await Promise.all(
        itemIds.map((id, index) =>
          supabase
            .from('sov_line_items')
            .update({ sort_order: index + 1 })
            .eq('id', id)
        )
      )

      return { sovId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sovKeys.lineItems(data.sovId) })
      toast({
        title: 'Items Reordered',
        description: 'Line item order has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reorder items.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Roll billing forward (move this_period to previous)
 */
export function useRollBillingForward() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (sovId: string) => {
      // Get all line items
      const { data: lineItems, error: fetchError } = await supabase
        .from('sov_line_items')
        .select('*')
        .eq('sov_id', sovId)

      if (fetchError) {throw fetchError}

      // Update each line item
      await Promise.all(
        (lineItems || []).map((li) =>
          supabase
            .from('sov_line_items')
            .update({
              work_completed_previous:
                (li.work_completed_previous || 0) + (li.work_completed_this_period || 0),
              work_completed_this_period: 0,
              materials_stored_previous:
                (li.materials_stored_previous || 0) + (li.materials_stored_this_period || 0),
              materials_stored_this_period: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('id', li.id)
        )
      )

      return { sovId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: sovKeys.lineItems(data.sovId) })
      queryClient.invalidateQueries({ queryKey: sovKeys.all })
      toast({
        title: 'Billing Rolled Forward',
        description: 'This period values have been moved to previous.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to roll billing forward.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * CSI Division options for categorizing line items
 */
export function useCSIDivisions() {
  return [
    { code: '00', name: 'Procurement and Contracting Requirements' },
    { code: '01', name: 'General Requirements' },
    { code: '02', name: 'Existing Conditions' },
    { code: '03', name: 'Concrete' },
    { code: '04', name: 'Masonry' },
    { code: '05', name: 'Metals' },
    { code: '06', name: 'Wood, Plastics, and Composites' },
    { code: '07', name: 'Thermal and Moisture Protection' },
    { code: '08', name: 'Openings' },
    { code: '09', name: 'Finishes' },
    { code: '10', name: 'Specialties' },
    { code: '11', name: 'Equipment' },
    { code: '12', name: 'Furnishings' },
    { code: '13', name: 'Special Construction' },
    { code: '14', name: 'Conveying Equipment' },
    { code: '21', name: 'Fire Suppression' },
    { code: '22', name: 'Plumbing' },
    { code: '23', name: 'Heating, Ventilating, and Air Conditioning' },
    { code: '25', name: 'Integrated Automation' },
    { code: '26', name: 'Electrical' },
    { code: '27', name: 'Communications' },
    { code: '28', name: 'Electronic Safety and Security' },
    { code: '31', name: 'Earthwork' },
    { code: '32', name: 'Exterior Improvements' },
    { code: '33', name: 'Utilities' },
    { code: '34', name: 'Transportation' },
    { code: '35', name: 'Waterway and Marine Construction' },
    { code: '40', name: 'Process Integration' },
    { code: '41', name: 'Material Processing and Handling Equipment' },
    { code: '42', name: 'Process Heating, Cooling, and Drying Equipment' },
    { code: '43', name: 'Process Gas and Liquid Handling' },
    { code: '44', name: 'Pollution Control Equipment' },
    { code: '45', name: 'Industry-Specific Manufacturing Equipment' },
    { code: '46', name: 'Water and Wastewater Equipment' },
    { code: '48', name: 'Electrical Power Generation' },
  ]
}
