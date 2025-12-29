// File: /src/features/takeoffs/hooks/useTakeoffItems.ts
// React Query hooks for takeoff items data fetching and mutations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { takeoffsApi } from '@/lib/api/services/takeoffs'
import type { Database } from '@/types/database'

type TakeoffItem = Database['public']['Tables']['takeoff_items']['Row']
type TakeoffItemUpdate = Database['public']['Tables']['takeoff_items']['Update']

// Fetch all takeoff items for a project
export function useTakeoffItems(projectId: string | undefined) {
  return useQuery({
    queryKey: ['takeoff-items', 'project', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      return await takeoffsApi.getTakeoffItemsByProject(projectId)
    },
    enabled: !!projectId,
  })
}

// Alias for clarity when fetching all takeoff items for a project
export const useTakeoffItemsByProject = useTakeoffItems

// Fetch takeoff items for a specific document
export function useTakeoffItemsByDocument(
  documentId: string | undefined,
  pageNumber?: number
) {
  return useQuery({
    queryKey: ['takeoff-items', 'document', documentId, pageNumber],
    queryFn: async () => {
      if (!documentId) {throw new Error('Document ID required')}
      return await takeoffsApi.getTakeoffItemsByDocument(documentId, pageNumber)
    },
    enabled: !!documentId,
  })
}

// Fetch takeoff items by measurement type
export function useTakeoffItemsByType(
  documentId: string | undefined,
  measurementType: string | undefined
) {
  return useQuery({
    queryKey: ['takeoff-items', 'document', documentId, 'type', measurementType],
    queryFn: async () => {
      if (!documentId || !measurementType) {
        throw new Error('Document ID and measurement type required')
      }
      return await takeoffsApi.getTakeoffItemsByType(documentId, measurementType)
    },
    enabled: !!documentId && !!measurementType,
  })
}

// Fetch a single takeoff item by ID
export function useTakeoffItem(takeoffItemId: string | undefined) {
  return useQuery({
    queryKey: ['takeoff-items', takeoffItemId],
    queryFn: async () => {
      if (!takeoffItemId) {throw new Error('Takeoff item ID required')}
      return await takeoffsApi.getTakeoffItem(takeoffItemId)
    },
    enabled: !!takeoffItemId,
  })
}

// Create a new takeoff item
export function useCreateTakeoffItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Omit<TakeoffItem, 'id' | 'created_at' | 'updated_at'>) => {
      return await takeoffsApi.createTakeoffItem(data)
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['takeoff-items'] })
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', 'project', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', 'document', data.document_id] })
    },
  })
}

// Batch create multiple takeoff items
export function useBatchCreateTakeoffItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      items: Array<Omit<TakeoffItem, 'id' | 'created_at' | 'updated_at'>>
    ) => {
      return await takeoffsApi.batchCreateTakeoffItems(items)
    },
    onSuccess: (data) => {
      // Invalidate queries for all affected projects and documents
      const projectIds = [...new Set(data.map((item) => item.project_id))]
      const documentIds = [...new Set(data.map((item) => item.document_id))]

      queryClient.invalidateQueries({ queryKey: ['takeoff-items'] })
      projectIds.forEach((projectId) => {
        queryClient.invalidateQueries({ queryKey: ['takeoff-items', 'project', projectId] })
      })
      documentIds.forEach((documentId) => {
        queryClient.invalidateQueries({ queryKey: ['takeoff-items', 'document', documentId] })
      })
    },
  })
}

// Update an existing takeoff item
export function useUpdateTakeoffItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<TakeoffItemUpdate> & { id: string }) => {
      return await takeoffsApi.updateTakeoffItem(id, updates)
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['takeoff-items'] })
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', data.id] })
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', 'project', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['takeoff-items', 'document', data.document_id] })
    },
  })
}

// Batch update multiple takeoff items
export function useBatchUpdateTakeoffItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      updates: Array<{
        id: string
        data: Partial<Omit<TakeoffItem, 'id' | 'created_at' | 'updated_at'>>
      }>
    ) => {
      return await takeoffsApi.batchUpdateTakeoffItems(updates)
    },
    onSuccess: () => {
      // Invalidate all takeoff-items queries since we don't know which items were updated
      queryClient.invalidateQueries({ queryKey: ['takeoff-items'] })
    },
  })
}

// Delete a takeoff item (soft delete)
export function useDeleteTakeoffItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (takeoffItemId: string) => {
      return await takeoffsApi.deleteTakeoffItem(takeoffItemId)
    },
    onSuccess: () => {
      // Invalidate all takeoff-items queries
      queryClient.invalidateQueries({ queryKey: ['takeoff-items'] })
    },
  })
}

// Search takeoff items
export function useSearchTakeoffItems(query: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: ['takeoff-items', 'search', projectId, query],
    queryFn: async () => {
      if (!projectId || !query) {
        throw new Error('Project ID and search query required')
      }
      return await takeoffsApi.searchTakeoffItems(query, projectId)
    },
    enabled: !!projectId && !!query && query.length > 0,
  })
}
