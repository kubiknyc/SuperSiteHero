/**
 * Takeoff Calibration Hooks
 * React Query hooks for managing scale calibrations per document page
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { LinearUnit, ScaleFactor } from '../utils/measurements'

// ============================================
// TYPES
// ============================================

export interface TakeoffCalibration {
  id: string
  company_id: string
  document_id: string
  page_number: number
  pixels_per_unit: number
  unit: LinearUnit
  pixel_distance: number | null
  real_world_distance: number | null
  accuracy: 'high' | 'medium' | 'low' | null
  start_x: number | null
  start_y: number | null
  end_x: number | null
  end_y: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TakeoffCalibrationHistory {
  id: string
  calibration_id: string
  pixels_per_unit: number
  unit: string
  pixel_distance: number | null
  real_world_distance: number | null
  accuracy: string | null
  start_x: number | null
  start_y: number | null
  end_x: number | null
  end_y: number | null
  changed_by: string | null
  changed_at: string
  change_reason: string | null
}

export interface SaveCalibrationInput {
  documentId: string
  pageNumber: number
  scaleFactor: ScaleFactor
  calibrationLine?: {
    start: { x: number; y: number }
    end: { x: number; y: number }
  }
  accuracy?: 'high' | 'medium' | 'low'
}

// ============================================
// QUERY KEYS
// ============================================

const calibrationKeys = {
  all: ['takeoff-calibrations'] as const,
  document: (documentId: string) =>
    [...calibrationKeys.all, 'document', documentId] as const,
  page: (documentId: string, pageNumber: number) =>
    [...calibrationKeys.document(documentId), 'page', pageNumber] as const,
  history: (calibrationId: string) =>
    [...calibrationKeys.all, 'history', calibrationId] as const,
}

// ============================================
// HOOKS
// ============================================

/**
 * Fetch calibration for a specific document page
 */
export function useCalibration(
  documentId: string | undefined,
  pageNumber: number = 1
) {
  return useQuery({
    queryKey: calibrationKeys.page(documentId || '', pageNumber),
    queryFn: async (): Promise<TakeoffCalibration | null> => {
      if (!documentId) {return null}

      const { data, error } = await supabase
        .from('takeoff_calibrations')
        .select('*')
        .eq('document_id', documentId)
        .eq('page_number', pageNumber)
        .maybeSingle()

      if (error) {throw error}
      return data as TakeoffCalibration | null
    },
    enabled: !!documentId,
  })
}

/**
 * Fetch all calibrations for a document (all pages)
 */
export function useDocumentCalibrations(documentId: string | undefined) {
  return useQuery({
    queryKey: calibrationKeys.document(documentId || ''),
    queryFn: async (): Promise<TakeoffCalibration[]> => {
      if (!documentId) {return []}

      const { data, error } = await supabase
        .from('takeoff_calibrations')
        .select('*')
        .eq('document_id', documentId)
        .order('page_number')

      if (error) {throw error}
      return (data || []) as TakeoffCalibration[]
    },
    enabled: !!documentId,
  })
}

/**
 * Save or update a calibration for a document page
 */
export function useSaveCalibration() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (input: SaveCalibrationInput): Promise<TakeoffCalibration> => {
      const { documentId, pageNumber, scaleFactor, calibrationLine, accuracy } = input

      // Get company_id from the document
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('company_id')
        .eq('id', documentId)
        .single()

      if (docError || !document) {
        throw new Error('Could not find document')
      }

      const calibrationData = {
        company_id: document.company_id,
        document_id: documentId,
        page_number: pageNumber,
        pixels_per_unit: scaleFactor.pixelsPerUnit,
        unit: scaleFactor.unit,
        pixel_distance: scaleFactor.pixelDistance || null,
        real_world_distance: scaleFactor.realWorldDistance || null,
        accuracy: accuracy || null,
        start_x: calibrationLine?.start.x || null,
        start_y: calibrationLine?.start.y || null,
        end_x: calibrationLine?.end.x || null,
        end_y: calibrationLine?.end.y || null,
        created_by: user?.id || null,
      }

      // Upsert: insert or update on conflict
      const { data, error } = await supabase
        .from('takeoff_calibrations')
        .upsert(calibrationData, {
          onConflict: 'document_id,page_number',
        })
        .select()
        .single()

      if (error) {throw error}
      return data as TakeoffCalibration
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: calibrationKeys.document(data.document_id),
      })
      queryClient.invalidateQueries({
        queryKey: calibrationKeys.page(data.document_id, data.page_number),
      })
    },
  })
}

/**
 * Delete a calibration
 */
export function useDeleteCalibration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      documentId,
      pageNumber,
    }: {
      documentId: string
      pageNumber: number
    }): Promise<void> => {
      const { error } = await supabase
        .from('takeoff_calibrations')
        .delete()
        .eq('document_id', documentId)
        .eq('page_number', pageNumber)

      if (error) {throw error}
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: calibrationKeys.document(variables.documentId),
      })
      queryClient.invalidateQueries({
        queryKey: calibrationKeys.page(variables.documentId, variables.pageNumber),
      })
    },
  })
}

/**
 * Copy calibration from one page to another
 */
export function useCopyCalibration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sourceDocumentId,
      sourcePageNumber,
      targetDocumentId,
      targetPageNumber,
    }: {
      sourceDocumentId: string
      sourcePageNumber: number
      targetDocumentId: string
      targetPageNumber: number
    }): Promise<string> => {
      const { data, error } = await supabase.rpc('copy_calibration_to_page', {
        p_source_document_id: sourceDocumentId,
        p_source_page_number: sourcePageNumber,
        p_target_document_id: targetDocumentId,
        p_target_page_number: targetPageNumber,
      })

      if (error) {throw error}
      return data as string
    },
    onSuccess: (_, variables) => {
      // Invalidate target document queries
      queryClient.invalidateQueries({
        queryKey: calibrationKeys.document(variables.targetDocumentId),
      })
      queryClient.invalidateQueries({
        queryKey: calibrationKeys.page(
          variables.targetDocumentId,
          variables.targetPageNumber
        ),
      })
    },
  })
}

/**
 * Fetch calibration history for a specific calibration
 */
export function useCalibrationHistory(calibrationId: string | undefined) {
  return useQuery({
    queryKey: calibrationKeys.history(calibrationId || ''),
    queryFn: async (): Promise<TakeoffCalibrationHistory[]> => {
      if (!calibrationId) {return []}

      const { data, error } = await supabase
        .from('takeoff_calibration_history')
        .select('*')
        .eq('calibration_id', calibrationId)
        .order('changed_at', { ascending: false })

      if (error) {throw error}
      return (data || []) as TakeoffCalibrationHistory[]
    },
    enabled: !!calibrationId,
  })
}

/**
 * Revert to a previous calibration from history
 */
export function useRevertCalibration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      calibrationId,
      historyId,
    }: {
      calibrationId: string
      historyId: string
    }): Promise<TakeoffCalibration> => {
      // Get the historical calibration
      const { data: history, error: historyError } = await supabase
        .from('takeoff_calibration_history')
        .select('*')
        .eq('id', historyId)
        .single()

      if (historyError || !history) {
        throw new Error('Historical calibration not found')
      }

      // Update the current calibration with historical values
      const { data, error } = await supabase
        .from('takeoff_calibrations')
        .update({
          pixels_per_unit: history.pixels_per_unit,
          unit: history.unit,
          pixel_distance: history.pixel_distance,
          real_world_distance: history.real_world_distance,
          accuracy: history.accuracy,
          start_x: history.start_x,
          start_y: history.start_y,
          end_x: history.end_x,
          end_y: history.end_y,
        })
        .eq('id', calibrationId)
        .select()
        .single()

      if (error) {throw error}
      return data as TakeoffCalibration
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: calibrationKeys.document(data.document_id),
      })
      queryClient.invalidateQueries({
        queryKey: calibrationKeys.history(variables.calibrationId),
      })
    },
  })
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert a TakeoffCalibration to a ScaleFactor for use in measurement calculations
 */
export function calibrationToScaleFactor(
  calibration: TakeoffCalibration | null
): ScaleFactor | null {
  if (!calibration) {return null}

  return {
    pixelsPerUnit: calibration.pixels_per_unit,
    unit: calibration.unit as LinearUnit,
    pixelDistance: calibration.pixel_distance || undefined,
    realWorldDistance: calibration.real_world_distance || undefined,
  }
}

/**
 * Check if a document page has a calibration
 */
export function useHasCalibration(
  documentId: string | undefined,
  pageNumber: number = 1
): boolean {
  const { data } = useCalibration(documentId, pageNumber)
  return !!data
}
