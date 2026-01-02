/**
 * Hook for managing RFI drawing links
 * Supports multiple drawing references per RFI with pin locations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'

// =============================================
// Types
// =============================================

export interface RFIDrawingLink {
  id: string
  rfi_id: string
  document_id: string
  drawing_number: string | null
  sheet_number: string | null
  pin_x: number | null
  pin_y: number | null
  pin_label: string | null
  pin_color: string
  notes: string | null
  created_at: string
  created_by: string | null
  // Joined document data
  document?: {
    id: string
    title: string
    file_url: string | null
    drawing_number: string | null
    drawing_title: string | null
    drawing_discipline: string | null
    revision_number: number
  }
}

export interface CreateRFIDrawingLinkInput {
  rfi_id: string
  document_id: string
  drawing_number?: string
  sheet_number?: string
  pin_x?: number
  pin_y?: number
  pin_label?: string
  pin_color?: string
  notes?: string
}

export interface UpdateRFIDrawingLinkInput {
  pin_x?: number
  pin_y?: number
  pin_label?: string
  pin_color?: string
  notes?: string
}

// =============================================
// Query Keys
// =============================================

export const rfiDrawingLinkKeys = {
  all: ['rfi-drawing-links'] as const,
  byRFI: (rfiId: string) => [...rfiDrawingLinkKeys.all, 'rfi', rfiId] as const,
  byDocument: (documentId: string) => [...rfiDrawingLinkKeys.all, 'document', documentId] as const,
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all drawing links for an RFI
 */
export function useRFIDrawingLinks(rfiId: string | undefined) {
  return useQuery({
    queryKey: rfiDrawingLinkKeys.byRFI(rfiId || ''),
    queryFn: async () => {
      if (!rfiId) throw new Error('RFI ID required')

      const { data, error } = await supabase
        .from('rfi_drawing_links')
        .select(`
          *,
          document:documents(
            id,
            title,
            file_url,
            drawing_number,
            drawing_title,
            drawing_discipline,
            revision_number
          )
        `)
        .eq('rfi_id', rfiId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as RFIDrawingLink[]
    },
    enabled: !!rfiId,
  })
}

/**
 * Fetch RFIs linked to a specific drawing
 * Useful for showing RFI callouts on drawings
 */
export function useRFIsByDrawing(documentId: string | undefined) {
  return useQuery({
    queryKey: rfiDrawingLinkKeys.byDocument(documentId || ''),
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      const { data, error } = await supabase
        .from('rfi_drawing_links')
        .select(`
          *,
          rfi:rfis(
            id,
            rfi_number,
            subject,
            status,
            priority,
            date_required
          )
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!documentId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Add a drawing link to an RFI
 */
export function useAddRFIDrawingLink() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateRFIDrawingLinkInput) => {
      const { data, error } = await supabase
        .from('rfi_drawing_links')
        .insert({
          ...input,
          pin_color: input.pin_color || '#EF4444',
          created_by: userProfile?.id,
        })
        .select(`
          *,
          document:documents(
            id,
            title,
            file_url,
            drawing_number,
            drawing_title,
            drawing_discipline,
            revision_number
          )
        `)
        .single()

      if (error) throw error
      return data as RFIDrawingLink
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiDrawingLinkKeys.byRFI(data.rfi_id) })
      queryClient.invalidateQueries({ queryKey: rfiDrawingLinkKeys.byDocument(data.document_id) })
    },
  })
}

/**
 * Update a drawing link (e.g., move pin position)
 */
export function useUpdateRFIDrawingLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      rfiId,
      ...updates
    }: UpdateRFIDrawingLinkInput & { id: string; rfiId: string }) => {
      const { data, error } = await supabase
        .from('rfi_drawing_links')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          document:documents(
            id,
            title,
            file_url,
            drawing_number,
            drawing_title,
            drawing_discipline,
            revision_number
          )
        `)
        .single()

      if (error) throw error
      return data as RFIDrawingLink
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiDrawingLinkKeys.byRFI(data.rfi_id) })
      queryClient.invalidateQueries({ queryKey: rfiDrawingLinkKeys.byDocument(data.document_id) })
    },
  })
}

/**
 * Remove a drawing link from an RFI
 */
export function useRemoveRFIDrawingLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      rfiId,
      documentId,
    }: {
      id: string
      rfiId: string
      documentId: string
    }) => {
      const { error } = await supabase.from('rfi_drawing_links').delete().eq('id', id)

      if (error) throw error
      return { id, rfiId, documentId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiDrawingLinkKeys.byRFI(data.rfiId) })
      queryClient.invalidateQueries({ queryKey: rfiDrawingLinkKeys.byDocument(data.documentId) })
    },
  })
}

// =============================================
// Utility Functions
// =============================================

/**
 * Convert pixel coordinates to normalized (0-1) coordinates
 */
export function pixelToNormalized(
  pixelX: number,
  pixelY: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(1, pixelX / containerWidth)),
    y: Math.max(0, Math.min(1, pixelY / containerHeight)),
  }
}

/**
 * Convert normalized (0-1) coordinates to pixel coordinates
 */
export function normalizedToPixel(
  normalizedX: number,
  normalizedY: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } {
  return {
    x: normalizedX * containerWidth,
    y: normalizedY * containerHeight,
  }
}

/**
 * Get pin color based on RFI priority
 */
export function getPinColorForPriority(priority: string): string {
  switch (priority) {
    case 'urgent':
      return '#DC2626' // Red
    case 'high':
      return '#F97316' // Orange
    case 'normal':
      return '#3B82F6' // Blue
    case 'low':
      return '#22C55E' // Green
    default:
      return '#EF4444' // Default red
  }
}
