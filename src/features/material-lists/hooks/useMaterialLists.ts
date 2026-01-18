// File: /src/features/material-lists/hooks/useMaterialLists.ts
// React Query hooks for material lists (procurement from takeoffs)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  materialListsApi,
  type MaterialListFilters,
} from '@/lib/api/services/material-lists'
import type {
  MaterialList,
  MaterialListInsert,
  MaterialListUpdate,
  MaterialListItem,
  MaterialListStatus,
  ExportFormat,
} from '@/types/drawing-sheets'

// =============================================
// Query Keys
// =============================================

export const materialListKeys = {
  all: ['material-lists'] as const,
  lists: () => [...materialListKeys.all, 'list'] as const,
  list: (projectId: string, filters?: MaterialListFilters) =>
    [...materialListKeys.lists(), projectId, filters] as const,
  details: () => [...materialListKeys.all, 'detail'] as const,
  detail: (id: string) => [...materialListKeys.details(), id] as const,
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all material lists for a project with optional filtering
 * @param projectId - Project ID
 * @param filters - Optional filters (status, takeoffId)
 *
 * Usage:
 * const { data: lists } = useMaterialLists(projectId)
 * const { data: lists } = useMaterialLists(projectId, { status: 'draft' })
 */
export function useMaterialLists(
  projectId: string | undefined,
  filters?: MaterialListFilters
) {
  return useQuery({
    queryKey: materialListKeys.list(projectId || '', filters),
    queryFn: () => materialListsApi.getProjectMaterialLists(projectId!, filters),
    enabled: !!projectId,
  })
}

/**
 * Fetch a single material list by ID
 * @param listId - Material list ID
 *
 * Usage:
 * const { data: list } = useMaterialList(listId)
 */
export function useMaterialList(listId: string | undefined) {
  return useQuery({
    queryKey: materialListKeys.detail(listId || ''),
    queryFn: () => materialListsApi.getMaterialList(listId!),
    enabled: !!listId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Create a new material list
 *
 * Usage:
 * const createList = useCreateMaterialList()
 * await createList.mutateAsync({
 *   project_id: projectId,
 *   company_id: companyId,
 *   name: 'Electrical Materials - Phase 1'
 * })
 */
export function useCreateMaterialList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (list: MaterialListInsert) =>
      materialListsApi.createMaterialList(list),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.lists() })
    },
  })
}

/**
 * Update a material list
 *
 * Usage:
 * const updateList = useUpdateMaterialList()
 * await updateList.mutateAsync({
 *   id: listId,
 *   name: 'Updated Name',
 *   description: 'Updated description'
 * })
 */
export function useUpdateMaterialList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...updates }: MaterialListUpdate & { id: string }) =>
      materialListsApi.updateMaterialList(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialListKeys.detail(data.id) })
    },
  })
}

/**
 * Delete a material list (soft delete)
 *
 * Usage:
 * const deleteList = useDeleteMaterialList()
 * await deleteList.mutateAsync(listId)
 */
export function useDeleteMaterialList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (listId: string) => materialListsApi.deleteMaterialList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.lists() })
    },
  })
}

/**
 * Update material list status
 *
 * Usage:
 * const updateStatus = useUpdateMaterialListStatus()
 * await updateStatus.mutateAsync({ listId, status: 'finalized' })
 */
export function useUpdateMaterialListStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      listId,
      status,
    }: {
      listId: string
      status: MaterialListStatus
    }) => materialListsApi.updateStatus(listId, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialListKeys.detail(data.id) })
    },
  })
}

/**
 * Add items to a material list
 *
 * Usage:
 * const addItems = useAddMaterialListItems()
 * await addItems.mutateAsync({
 *   listId,
 *   items: [{ id: uuid, name: '2x4x8 Lumber', quantity: 100, unit: 'EA', ... }]
 * })
 */
export function useAddMaterialListItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      listId,
      items,
    }: {
      listId: string
      items: MaterialListItem[]
    }) => materialListsApi.addItems(listId, items),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.detail(data.id) })
    },
  })
}

/**
 * Update a specific item in a material list
 *
 * Usage:
 * const updateItem = useUpdateMaterialListItem()
 * await updateItem.mutateAsync({
 *   listId,
 *   itemId,
 *   updates: { quantity: 150 }
 * })
 */
export function useUpdateMaterialListItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      listId,
      itemId,
      updates,
    }: {
      listId: string
      itemId: string
      updates: Partial<MaterialListItem>
    }) => materialListsApi.updateItem(listId, itemId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.detail(data.id) })
    },
  })
}

/**
 * Remove an item from a material list
 *
 * Usage:
 * const removeItem = useRemoveMaterialListItem()
 * await removeItem.mutateAsync({ listId, itemId })
 */
export function useRemoveMaterialListItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      materialListsApi.removeItem(listId, itemId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.detail(data.id) })
    },
  })
}

/**
 * Update waste factors for a material list
 *
 * Usage:
 * const updateWasteFactors = useUpdateWasteFactors()
 * await updateWasteFactors.mutateAsync({
 *   listId,
 *   wasteFactors: { 'Framing': 0.10, 'Electrical': 0.05 }
 * })
 */
export function useUpdateWasteFactors() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      listId,
      wasteFactors,
    }: {
      listId: string
      wasteFactors: Record<string, number>
    }) => materialListsApi.updateWasteFactors(listId, wasteFactors),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.detail(data.id) })
    },
  })
}

/**
 * Record an export in the material list history
 *
 * Usage:
 * const recordExport = useRecordMaterialListExport()
 * await recordExport.mutateAsync({
 *   listId,
 *   format: 'pdf',
 *   exported_by: userId,
 *   recipient: 'supplier@example.com'
 * })
 */
export function useRecordMaterialListExport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      listId,
      format,
      exported_by,
      recipient,
    }: {
      listId: string
      format: ExportFormat
      exported_by: string
      recipient?: string
    }) =>
      materialListsApi.recordExport(listId, { format, exported_by, recipient }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialListKeys.detail(data.id) })
    },
  })
}

/**
 * Finalize a material list (locks it from further edits)
 *
 * Usage:
 * const finalize = useFinalizeMaterialList()
 * await finalize.mutateAsync(listId)
 */
export function useFinalizeMaterialList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (listId: string) => materialListsApi.finalize(listId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialListKeys.detail(data.id) })
    },
  })
}

/**
 * Mark a material list as ordered
 *
 * Usage:
 * const markOrdered = useMarkMaterialListOrdered()
 * await markOrdered.mutateAsync(listId)
 */
export function useMarkMaterialListOrdered() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (listId: string) => materialListsApi.markAsOrdered(listId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialListKeys.detail(data.id) })
    },
  })
}

/**
 * Duplicate a material list
 *
 * Usage:
 * const duplicate = useDuplicateMaterialList()
 * await duplicate.mutateAsync({ listId, newName: 'Copy of Original' })
 */
export function useDuplicateMaterialList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ listId, newName }: { listId: string; newName?: string }) =>
      materialListsApi.duplicate(listId, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialListKeys.lists() })
    },
  })
}

// =============================================
// Edge Function Hooks
// =============================================

interface ExportMaterialListRequest {
  material_list_id: string
  format: 'pdf' | 'excel' | 'csv' | 'email'
  recipient_email?: string
  include_summary?: boolean
  include_waste_factors?: boolean
}

interface ExportMaterialListResponse {
  success: boolean
  format: string
  content?: string
  contentType?: string
  filename?: string
  downloadUrl?: string
  emailSent?: boolean
  error?: string
}

/**
 * Export a material list via Edge Function
 *
 * Usage:
 * const exportList = useExportMaterialList()
 * const result = await exportList.mutateAsync({
 *   material_list_id: listId,
 *   format: 'pdf'
 * })
 * if (result.downloadUrl) window.open(result.downloadUrl)
 */
export function useExportMaterialList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      request: ExportMaterialListRequest
    ): Promise<ExportMaterialListResponse> => {
      // Import supabase to get auth token
      const { supabase } = await import('@/lib/supabase')
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      if (!accessToken) {
        throw new Error('Authentication required')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-material-list`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(request),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Export failed: ${response.status}`)
      }

      const result: ExportMaterialListResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Export failed')
      }

      return result
    },
    onSuccess: (_, variables) => {
      // Refresh the list to show updated export history
      queryClient.invalidateQueries({
        queryKey: materialListKeys.detail(variables.material_list_id),
      })
    },
  })
}
