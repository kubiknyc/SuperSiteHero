/**
 * useAtticStock Hook
 *
 * React Query hooks for Attic Stock Tracker functionality.
 * Manages attic stock items, deliveries, and verification.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  AtticStockItem,
  AtticStockItemWithDetails,
  AtticStockDelivery,
  CreateAtticStockItemDTO,
  UpdateAtticStockItemDTO,
  CreateAtticStockDeliveryDTO,
  AtticStockStatistics,
} from '@/types/closeout-extended'

// =============================================
// Query Keys
// =============================================

export const atticStockKeys = {
  all: ['attic-stock'] as const,
  items: (projectId: string) => [...atticStockKeys.all, 'items', projectId] as const,
  item: (id: string) => [...atticStockKeys.all, 'item', id] as const,
  deliveries: (itemId: string) => [...atticStockKeys.all, 'deliveries', itemId] as const,
  statistics: (projectId: string) => [...atticStockKeys.all, 'statistics', projectId] as const,
}

// =============================================
// Item Hooks
// =============================================

/**
 * Fetch attic stock items for a project
 */
export function useAtticStockItems(projectId: string | undefined) {
  return useQuery({
    queryKey: atticStockKeys.items(projectId || ''),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      const { data, error } = await supabase
        .from('attic_stock_items')
        .select(`
          *,
          subcontractor:contacts!attic_stock_items_subcontractor_id_fkey(id, company_name),
          verified_by_user:profiles!attic_stock_items_verified_by_fkey(id, full_name)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('item_name', { ascending: true })

      if (error) throw error
      return data as AtticStockItemWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single attic stock item with deliveries
 */
export function useAtticStockItem(itemId: string | undefined) {
  return useQuery({
    queryKey: atticStockKeys.item(itemId || ''),
    queryFn: async () => {
      if (!itemId) throw new Error('Item ID required')

      const { data: item, error: itemError } = await supabase
        .from('attic_stock_items')
        .select(`
          *,
          subcontractor:contacts!attic_stock_items_subcontractor_id_fkey(id, company_name),
          verified_by_user:profiles!attic_stock_items_verified_by_fkey(id, full_name)
        `)
        .eq('id', itemId)
        .single()

      if (itemError) throw itemError

      // Fetch deliveries for this item
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('attic_stock_deliveries')
        .select('*')
        .eq('attic_stock_item_id', itemId)
        .order('delivery_date', { ascending: false })

      if (deliveriesError) throw deliveriesError

      return {
        ...item,
        deliveries: deliveries || [],
      } as AtticStockItemWithDetails
    },
    enabled: !!itemId,
  })
}

/**
 * Create a new attic stock item
 */
export function useCreateAtticStockItem() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateAtticStockItemDTO) => {
      const { data, error } = await supabase
        .from('attic_stock_items')
        .insert({
          company_id: userProfile?.company_id,
          project_id: input.project_id,
          item_name: input.item_name,
          description: input.description || null,
          spec_section: input.spec_section || null,
          manufacturer: input.manufacturer || null,
          model_number: input.model_number || null,
          color_finish: input.color_finish || null,
          quantity_required: input.quantity_required,
          quantity_delivered: 0,
          unit: input.unit || 'each',
          building_location: input.building_location || null,
          floor_level: input.floor_level || null,
          room_area: input.room_area || null,
          storage_notes: input.storage_notes || null,
          subcontractor_id: input.subcontractor_id || null,
          photo_urls: [],
          owner_verified: false,
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as AtticStockItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: atticStockKeys.items(data.project_id) })
      queryClient.invalidateQueries({ queryKey: atticStockKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Update an attic stock item
 */
export function useUpdateAtticStockItem() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAtticStockItemDTO & { id: string }) => {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Set verification timestamp if marking verified
      if (updates.owner_verified === true) {
        updateData.verified_at = new Date().toISOString()
        updateData.verified_by = userProfile?.id
      } else if (updates.owner_verified === false) {
        updateData.verified_at = null
        updateData.verified_by = null
        updateData.verification_notes = null
      }

      const { data, error } = await supabase
        .from('attic_stock_items')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as AtticStockItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: atticStockKeys.item(data.id) })
      queryClient.invalidateQueries({ queryKey: atticStockKeys.items(data.project_id) })
      queryClient.invalidateQueries({ queryKey: atticStockKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Delete an attic stock item (soft delete)
 */
export function useDeleteAtticStockItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('attic_stock_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('project_id')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: atticStockKeys.items(data.project_id) })
      queryClient.invalidateQueries({ queryKey: atticStockKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Verify an attic stock item (owner sign-off)
 */
export function useVerifyAtticStockItem() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      verificationNotes,
    }: {
      id: string
      verificationNotes?: string
    }) => {
      const { data, error } = await supabase
        .from('attic_stock_items')
        .update({
          owner_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: userProfile?.id,
          verification_notes: verificationNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as AtticStockItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: atticStockKeys.item(data.id) })
      queryClient.invalidateQueries({ queryKey: atticStockKeys.items(data.project_id) })
      queryClient.invalidateQueries({ queryKey: atticStockKeys.statistics(data.project_id) })
    },
  })
}

// =============================================
// Delivery Hooks
// =============================================

/**
 * Fetch deliveries for an attic stock item
 */
export function useAtticStockDeliveries(itemId: string | undefined) {
  return useQuery({
    queryKey: atticStockKeys.deliveries(itemId || ''),
    queryFn: async () => {
      if (!itemId) throw new Error('Item ID required')

      const { data, error } = await supabase
        .from('attic_stock_deliveries')
        .select('*')
        .eq('attic_stock_item_id', itemId)
        .order('delivery_date', { ascending: false })

      if (error) throw error
      return data as AtticStockDelivery[]
    },
    enabled: !!itemId,
  })
}

/**
 * Add a delivery to an attic stock item
 */
export function useAddAtticStockDelivery() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateAtticStockDeliveryDTO) => {
      // Create the delivery record
      const { data: delivery, error: deliveryError } = await supabase
        .from('attic_stock_deliveries')
        .insert({
          attic_stock_item_id: input.attic_stock_item_id,
          delivery_date: input.delivery_date,
          quantity_delivered: input.quantity_delivered,
          delivery_ticket_number: input.delivery_ticket_number || null,
          delivery_ticket_url: input.delivery_ticket_url || null,
          photo_urls: input.photo_urls || [],
          received_by: userProfile?.id,
          received_by_name: input.received_by_name || userProfile?.full_name,
          notes: input.notes || null,
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (deliveryError) throw deliveryError

      // Update the item's total delivered quantity
      const { data: item } = await supabase
        .from('attic_stock_items')
        .select('quantity_delivered')
        .eq('id', input.attic_stock_item_id)
        .single()

      const newTotal = (item?.quantity_delivered || 0) + input.quantity_delivered

      const { error: updateError } = await supabase
        .from('attic_stock_items')
        .update({
          quantity_delivered: newTotal,
          delivery_date: input.delivery_date,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.attic_stock_item_id)

      if (updateError) throw updateError

      return delivery as AtticStockDelivery
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: atticStockKeys.item(data.attic_stock_item_id) })
      queryClient.invalidateQueries({ queryKey: atticStockKeys.deliveries(data.attic_stock_item_id) })
      queryClient.invalidateQueries({ queryKey: atticStockKeys.all })
    },
  })
}

// =============================================
// Statistics Hook
// =============================================

/**
 * Get attic stock statistics for a project
 */
export function useAtticStockStatistics(projectId: string | undefined) {
  const { data: items } = useAtticStockItems(projectId)

  return useQuery({
    queryKey: atticStockKeys.statistics(projectId || ''),
    queryFn: async (): Promise<AtticStockStatistics> => {
      if (!items) {
        return {
          total_items: 0,
          fully_delivered: 0,
          partially_delivered: 0,
          not_delivered: 0,
          owner_verified: 0,
          pending_verification: 0,
        }
      }

      const fullyDelivered = items.filter(
        (i) => i.quantity_delivered >= i.quantity_required
      ).length

      const partiallyDelivered = items.filter(
        (i) => i.quantity_delivered > 0 && i.quantity_delivered < i.quantity_required
      ).length

      const notDelivered = items.filter((i) => i.quantity_delivered === 0).length

      const ownerVerified = items.filter((i) => i.owner_verified).length

      const pendingVerification = items.filter(
        (i) => i.quantity_delivered >= i.quantity_required && !i.owner_verified
      ).length

      return {
        total_items: items.length,
        fully_delivered: fullyDelivered,
        partially_delivered: partiallyDelivered,
        not_delivered: notDelivered,
        owner_verified: ownerVerified,
        pending_verification: pendingVerification,
      }
    },
    enabled: !!projectId && !!items,
  })
}
