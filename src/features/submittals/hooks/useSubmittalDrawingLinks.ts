/**
 * Hook for managing Submittal drawing links
 * Supports multiple drawing references per submittal with pin locations
 * Similar to RFI drawing links for consistency
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'

// =============================================
// Types
// =============================================

export interface SubmittalDrawingLink {
  id: string
  submittal_id: string
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

export interface CreateSubmittalDrawingLinkInput {
  submittal_id: string
  document_id: string
  drawing_number?: string
  sheet_number?: string
  pin_x?: number
  pin_y?: number
  pin_label?: string
  pin_color?: string
  notes?: string
}

export interface UpdateSubmittalDrawingLinkInput {
  pin_x?: number
  pin_y?: number
  pin_label?: string
  pin_color?: string
  notes?: string
}

// =============================================
// Query Keys
// =============================================

export const submittalDrawingLinkKeys = {
  all: ['submittal-drawing-links'] as const,
  bySubmittal: (submittalId: string) => [...submittalDrawingLinkKeys.all, 'submittal', submittalId] as const,
  byDocument: (documentId: string) => [...submittalDrawingLinkKeys.all, 'document', documentId] as const,
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all drawing links for a submittal
 */
export function useSubmittalDrawingLinks(submittalId: string | undefined) {
  return useQuery({
    queryKey: submittalDrawingLinkKeys.bySubmittal(submittalId || ''),
    queryFn: async () => {
      if (!submittalId) throw new Error('Submittal ID required')

      const { data, error } = await supabase
        .from('submittal_drawing_links')
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
        .eq('submittal_id', submittalId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as SubmittalDrawingLink[]
    },
    enabled: !!submittalId,
  })
}

/**
 * Fetch submittals linked to a specific drawing
 * Useful for showing submittal callouts on drawings
 */
export function useSubmittalsByDrawing(documentId: string | undefined) {
  return useQuery({
    queryKey: submittalDrawingLinkKeys.byDocument(documentId || ''),
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      const { data, error } = await supabase
        .from('submittal_drawing_links')
        .select(`
          *,
          submittal:submittals(
            id,
            submittal_number,
            spec_section,
            spec_section_title,
            title,
            review_status,
            date_required,
            submittal_type
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
 * Add a drawing link to a submittal
 */
export function useAddSubmittalDrawingLink() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateSubmittalDrawingLinkInput) => {
      const { data, error } = await supabase
        .from('submittal_drawing_links')
        .insert({
          ...input,
          pin_color: input.pin_color || '#8B5CF6', // Purple for submittals
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
      return data as SubmittalDrawingLink
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalDrawingLinkKeys.bySubmittal(data.submittal_id) })
      queryClient.invalidateQueries({ queryKey: submittalDrawingLinkKeys.byDocument(data.document_id) })
    },
  })
}

/**
 * Update a drawing link (e.g., move pin position)
 */
export function useUpdateSubmittalDrawingLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      submittalId,
      ...updates
    }: UpdateSubmittalDrawingLinkInput & { id: string; submittalId: string }) => {
      const { data, error } = await supabase
        .from('submittal_drawing_links')
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
      return data as SubmittalDrawingLink
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalDrawingLinkKeys.bySubmittal(data.submittal_id) })
      queryClient.invalidateQueries({ queryKey: submittalDrawingLinkKeys.byDocument(data.document_id) })
    },
  })
}

/**
 * Remove a drawing link from a submittal
 */
export function useRemoveSubmittalDrawingLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      submittalId,
      documentId,
    }: {
      id: string
      submittalId: string
      documentId: string
    }) => {
      const { error } = await supabase.from('submittal_drawing_links').delete().eq('id', id)

      if (error) throw error
      return { id, submittalId, documentId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalDrawingLinkKeys.bySubmittal(data.submittalId) })
      queryClient.invalidateQueries({ queryKey: submittalDrawingLinkKeys.byDocument(data.documentId) })
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
 * Get pin color based on submittal review status
 */
export function getPinColorForStatus(status: string): string {
  switch (status) {
    case 'approved':
      return '#22C55E' // Green
    case 'approved_as_noted':
      return '#84CC16' // Lime
    case 'revise_resubmit':
      return '#F97316' // Orange
    case 'rejected':
      return '#EF4444' // Red
    case 'under_review':
    case 'submitted':
      return '#3B82F6' // Blue
    default:
      return '#8B5CF6' // Purple (default)
  }
}

/**
 * Get pin color based on submittal type
 */
export function getPinColorForType(submittalType: string): string {
  switch (submittalType) {
    case 'shop_drawing':
      return '#8B5CF6' // Purple
    case 'product_data':
      return '#3B82F6' // Blue
    case 'sample':
      return '#10B981' // Emerald
    case 'mix_design':
      return '#F59E0B' // Amber
    case 'test_report':
      return '#6366F1' // Indigo
    case 'certificate':
    case 'warranty':
      return '#EC4899' // Pink
    default:
      return '#8B5CF6' // Purple (default)
  }
}
