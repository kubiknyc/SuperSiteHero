// File: /src/features/documents/hooks/useMeasurements.ts
// React Query hooks for measurement annotation operations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import type { MeasurementAnnotation, MeasurementType, MeasurementUnit } from '../types/markup'
import type { Database } from '@/types/database'

type DbMeasurement = Database['public']['Tables']['document_markup_measurements']['Row']
type DbMeasurementInsert = Database['public']['Tables']['document_markup_measurements']['Insert']

// Convert DB measurement to MeasurementAnnotation type
function dbToMeasurement(db: DbMeasurement): MeasurementAnnotation {
  return {
    id: db.id,
    type: db.measurement_type as MeasurementType,
    points: Array.isArray(db.points) ? db.points as number[] : [],
    value: db.value,
    unit: db.unit as MeasurementUnit,
    displayLabel: db.display_label || '',
    layerId: db.layer_id || undefined,
    color: db.color || '#0066FF',
    strokeWidth: db.stroke_width || 2,
    fontSize: db.font_size || 12,
    showLabel: db.show_label ?? true,
    labelPosition: db.label_position as { x: number; y: number } || { x: 0, y: 0 },
  }
}

/**
 * Fetch all measurements for a document
 */
export function useMeasurements(documentId: string | undefined, pageNumber: number = 1) {
  return useQuery({
    queryKey: ['measurements', documentId, pageNumber],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      const { data, error } = await supabase
        .from('document_markup_measurements')
        .select('*')
        .eq('document_id', documentId)
        .eq('page_number', pageNumber)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []).map(dbToMeasurement)
    },
    enabled: !!documentId,
  })
}

/**
 * Fetch all measurements for a document (all pages)
 */
export function useAllMeasurements(documentId: string | undefined) {
  return useQuery({
    queryKey: ['measurements', documentId, 'all'],
    queryFn: async () => {
      if (!documentId) throw new Error('Document ID required')

      const { data, error } = await supabase
        .from('document_markup_measurements')
        .select('*')
        .eq('document_id', documentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data || []).map(dbToMeasurement)
    },
    enabled: !!documentId,
  })
}

/**
 * Create a new measurement
 */
export function useCreateMeasurement() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      documentId,
      pageNumber = 1,
      measurement,
    }: {
      documentId: string
      pageNumber?: number
      measurement: Omit<MeasurementAnnotation, 'id'>
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      const insert: DbMeasurementInsert = {
        document_id: documentId,
        page_number: pageNumber,
        measurement_type: measurement.type,
        points: measurement.points as unknown as Database['public']['Tables']['document_markup_measurements']['Row']['points'],
        value: measurement.value,
        unit: measurement.unit,
        display_label: measurement.displayLabel,
        color: measurement.color,
        stroke_width: measurement.strokeWidth,
        font_size: measurement.fontSize,
        show_label: measurement.showLabel,
        label_position: measurement.labelPosition as unknown as Database['public']['Tables']['document_markup_measurements']['Row']['label_position'],
        layer_id: measurement.layerId,
        created_by: userProfile.id,
      }

      const { data, error } = await supabase
        .from('document_markup_measurements')
        .insert(insert)
        .select()
        .single()

      if (error) throw error
      return { measurement: dbToMeasurement(data), documentId, pageNumber }
    },
    onSuccess: ({ documentId, pageNumber }) => {
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, pageNumber] })
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, 'all'] })
    },
  })
}

/**
 * Update a measurement
 */
export function useUpdateMeasurement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      documentId,
      pageNumber,
      updates,
    }: {
      id: string
      documentId: string
      pageNumber: number
      updates: Partial<MeasurementAnnotation>
    }) => {
      const { data, error } = await supabase
        .from('document_markup_measurements')
        .update({
          measurement_type: updates.type,
          points: updates.points as unknown as Database['public']['Tables']['document_markup_measurements']['Row']['points'],
          value: updates.value,
          unit: updates.unit,
          display_label: updates.displayLabel,
          color: updates.color,
          stroke_width: updates.strokeWidth,
          font_size: updates.fontSize,
          show_label: updates.showLabel,
          label_position: updates.labelPosition as unknown as Database['public']['Tables']['document_markup_measurements']['Row']['label_position'],
          layer_id: updates.layerId,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { measurement: dbToMeasurement(data), documentId, pageNumber }
    },
    onSuccess: ({ documentId, pageNumber }) => {
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, pageNumber] })
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, 'all'] })
    },
  })
}

/**
 * Delete a measurement (soft delete)
 */
export function useDeleteMeasurement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      documentId,
      pageNumber,
    }: {
      id: string
      documentId: string
      pageNumber: number
    }) => {
      const { error } = await supabase
        .from('document_markup_measurements')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      return { id, documentId, pageNumber }
    },
    onSuccess: ({ documentId, pageNumber }) => {
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, pageNumber] })
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, 'all'] })
    },
  })
}

/**
 * Delete all measurements for a document page
 */
export function useClearMeasurements() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      documentId,
      pageNumber,
    }: {
      documentId: string
      pageNumber: number
    }) => {
      const { error } = await supabase
        .from('document_markup_measurements')
        .update({ deleted_at: new Date().toISOString() })
        .eq('document_id', documentId)
        .eq('page_number', pageNumber)

      if (error) throw error
      return { documentId, pageNumber }
    },
    onSuccess: ({ documentId, pageNumber }) => {
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, pageNumber] })
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, 'all'] })
    },
  })
}

export default {
  useMeasurements,
  useAllMeasurements,
  useCreateMeasurement,
  useUpdateMeasurement,
  useDeleteMeasurement,
  useClearMeasurements,
}
