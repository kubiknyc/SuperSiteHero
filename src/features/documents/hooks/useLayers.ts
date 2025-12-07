// File: /src/features/documents/hooks/useLayers.ts
// React Query hooks for markup layer operations
//
// NOTE: This file references database tables that are created in migration 014_enhanced_markup_features.sql
// The database types in src/types/database.ts need to be updated after running the migration.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MarkupLayer, LayerOrderAction } from '../types/markup'

// Layer type from database (matches document_markup_layers table)
// This interface mirrors what will be in the database after running the migration
interface DbMarkupLayer {
  id: string
  document_id: string
  name: string
  color: string
  visible: boolean
  locked: boolean
  order_index: number
  description: string | null
  is_default: boolean | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

// Type assertion helper for new tables not yet in database.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// Convert DB layer to MarkupLayer type
function dbToMarkupLayer(db: DbMarkupLayer): MarkupLayer {
  return {
    id: db.id,
    documentId: db.document_id,
    name: db.name,
    color: db.color,
    visible: db.visible,
    locked: db.locked,
    order: db.order_index,
    description: db.description || undefined,
    isDefault: db.is_default || undefined,
    createdBy: db.created_by || '',
    createdAt: db.created_at || new Date().toISOString(),
    updatedAt: db.updated_at || new Date().toISOString(),
  }
}

/**
 * Fetch all layers for a document
 */
export function useDocumentLayers(documentId: string | undefined) {
  return useQuery({
    queryKey: ['layers', documentId],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      const { data, error } = await db
        .from('document_markup_layers')
        .select('*')
        .eq('document_id', documentId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true })

      if (error) throw error
      return (data || []).map(dbToMarkupLayer)
    },
    enabled: !!documentId,
  })
}

/**
 * Create a new layer
 */
export function useCreateLayer() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (layer: Omit<MarkupLayer, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const { data, error } = await db
        .from('document_markup_layers')
        .insert({
          document_id: layer.documentId,
          name: layer.name,
          color: layer.color,
          visible: layer.visible,
          locked: layer.locked,
          order_index: layer.order,
          description: layer.description,
          is_default: layer.isDefault,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) throw error
      return dbToMarkupLayer(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['layers', data.documentId] })
    },
  })
}

/**
 * Update a layer
 */
export function useUpdateLayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      documentId,
      ...updates
    }: Partial<MarkupLayer> & { id: string; documentId: string }) => {
      const { data, error } = await db
        .from('document_markup_layers')
        .update({
          name: updates.name,
          color: updates.color,
          visible: updates.visible,
          locked: updates.locked,
          order_index: updates.order,
          description: updates.description,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...dbToMarkupLayer(data), documentId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['layers', data.documentId] })
    },
  })
}

/**
 * Delete a layer (soft delete)
 */
export function useDeleteLayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, documentId }: { id: string; documentId: string }) => {
      const { error } = await db
        .from('document_markup_layers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      return { id, documentId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['layers', data.documentId] })
    },
  })
}

/**
 * Toggle layer visibility
 */
export function useToggleLayerVisibility() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      documentId,
      visible,
    }: {
      id: string
      documentId: string
      visible: boolean
    }) => {
      const { data, error } = await db
        .from('document_markup_layers')
        .update({ visible: !visible })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...dbToMarkupLayer(data), documentId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['layers', data.documentId] })
    },
  })
}

/**
 * Toggle layer lock
 */
export function useToggleLayerLock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      documentId,
      locked,
    }: {
      id: string
      documentId: string
      locked: boolean
    }) => {
      const { data, error } = await db
        .from('document_markup_layers')
        .update({ locked: !locked })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...dbToMarkupLayer(data), documentId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['layers', data.documentId] })
    },
  })
}

/**
 * Reorder layer
 */
export function useReorderLayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      documentId,
      action,
      layers,
    }: {
      id: string
      documentId: string
      action: LayerOrderAction
      layers: MarkupLayer[]
    }) => {
      const currentIndex = layers.findIndex(l => l.id === id)
      if (currentIndex === -1) throw new Error('Layer not found')

      let newIndex: number
      switch (action) {
        case 'bring-to-front':
          newIndex = layers.length - 1
          break
        case 'send-to-back':
          newIndex = 0
          break
        case 'move-up':
          newIndex = Math.min(currentIndex + 1, layers.length - 1)
          break
        case 'move-down':
          newIndex = Math.max(currentIndex - 1, 0)
          break
        default:
          newIndex = currentIndex
      }

      // Reorder the layers array
      const reordered = [...layers]
      const [removed] = reordered.splice(currentIndex, 1)
      reordered.splice(newIndex, 0, removed)

      // Update all layers with new order
      const updates = reordered.map((layer, index) =>
        db
          .from('document_markup_layers')
          .update({ order_index: index })
          .eq('id', layer.id)
      )

      await Promise.all(updates)

      return { documentId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['layers', data.documentId] })
    },
  })
}

/**
 * Create default layer if none exists
 */
export function useCreateDefaultLayer() {
  const createLayer = useCreateLayer()
  const { userProfile } = useAuth()

  return async (documentId: string) => {
    if (!userProfile?.id) throw new Error('User not authenticated')

    return createLayer.mutateAsync({
      documentId,
      name: 'Default Layer',
      color: '#FF0000',
      visible: true,
      locked: false,
      order: 0,
      description: 'Default markup layer',
      isDefault: true,
      createdBy: userProfile.id,
    })
  }
}

export default {
  useDocumentLayers,
  useCreateLayer,
  useUpdateLayer,
  useDeleteLayer,
  useToggleLayerVisibility,
  useToggleLayerLock,
  useReorderLayer,
  useCreateDefaultLayer,
}
