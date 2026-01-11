// File: /src/features/documents/hooks/useMeasurements.ts
// React Query hooks for measurement annotation operations including enhanced features

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import type {
  MeasurementAnnotation,
  MeasurementType,
  MeasurementUnit,
  VolumeUnit,
  CountMarker,
  CountCategory,
  MeasurementExportOptions,
  ScaleCalibration,
  RunningTotalsState,
} from '../types/markup'
import { DEFAULT_COUNT_CATEGORIES } from '../types/markup'
import type { Database } from '@/types/database'
import { exportMeasurements, exportCounts } from '../utils/measurementExport'
import { UNIT_CONVERSION, calculateVolume, convertVolume } from '../components/markup/MeasurementTools'

type DbMeasurement = Database['public']['Tables']['document_markup_measurements']['Row']
type DbMeasurementInsert = Database['public']['Tables']['document_markup_measurements']['Insert']

// Volume conversion to cubic feet as base
const VOLUME_TO_CUBIC_FEET: Record<VolumeUnit, number> = {
  cubic_feet: 1,
  cubic_meters: 35.3147,
  cubic_yards: 27,
  cubic_inches: 0.000578704,
  liters: 0.0353147,
  gallons: 0.133681,
}

// Convert DB measurement to MeasurementAnnotation type
function dbToMeasurement(db: DbMeasurement): MeasurementAnnotation {
  // Handle extended fields that may be stored as JSON metadata
  const metadata = (db as unknown as { metadata?: Record<string, unknown> }).metadata || {}

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
    // Extended fields from metadata
    depth: metadata.depth as number | undefined,
    depthUnit: metadata.depthUnit as MeasurementUnit | undefined,
    volumeValue: metadata.volumeValue as number | undefined,
    volumeUnit: metadata.volumeUnit as VolumeUnit | undefined,
    angleValue: metadata.angleValue as number | undefined,
    isInteriorAngle: metadata.isInteriorAngle as boolean | undefined,
  }
}

/**
 * Fetch all measurements for a document
 */
export function useMeasurements(documentId: string | undefined, pageNumber: number = 1) {
  return useQuery({
    queryKey: ['measurements', documentId, pageNumber],
    queryFn: async () => {
      if (!documentId) {throw new Error('Document ID required')}

      const { data, error } = await supabase
        .from('document_markup_measurements')
        .select('*')
        .eq('document_id', documentId)
        .eq('page_number', pageNumber)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {throw error}
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
      if (!documentId) {throw new Error('Document ID required')}

      const { data, error } = await supabase
        .from('document_markup_measurements')
        .select('*')
        .eq('document_id', documentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {throw error}
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
      if (!userProfile?.id) {throw new Error('User not authenticated')}

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

      if (error) {throw error}
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

      if (error) {throw error}
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

      if (error) {throw error}
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

      if (error) {throw error}
      return { documentId, pageNumber }
    },
    onSuccess: ({ documentId, pageNumber }) => {
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, pageNumber] })
      queryClient.invalidateQueries({ queryKey: ['measurements', documentId, 'all'] })
    },
  })
}

// ============================================================
// ENHANCED MEASUREMENT HOOK WITH RUNNING TOTALS & EXPORT
// ============================================================

interface UseEnhancedMeasurementsOptions {
  documentId: string | undefined
  pageNumber?: number
  scale?: ScaleCalibration | null
  sheetName?: string
  currentUnit?: MeasurementUnit
  volumeUnit?: VolumeUnit
}

/**
 * Enhanced measurements hook with running totals, volume calculations, and export
 */
export function useEnhancedMeasurements({
  documentId,
  pageNumber = 1,
  scale = null,
  sheetName,
  currentUnit = 'feet',
  volumeUnit = 'cubic_feet',
}: UseEnhancedMeasurementsOptions) {
  const { userProfile } = useAuth()
  const measurementsQuery = useMeasurements(documentId, pageNumber)
  const createMutation = useCreateMeasurement()
  const updateMutation = useUpdateMeasurement()
  const deleteMutation = useDeleteMeasurement()
  const clearMutation = useClearMeasurements()

  const measurements = measurementsQuery.data || []

  // Calculate running totals
  const runningTotals = useMemo((): RunningTotalsState => {
    const distanceTotal = measurements
      .filter((m) => m.type === 'distance')
      .reduce((sum, m) => sum + m.value * UNIT_CONVERSION[m.unit][currentUnit], 0)

    const areaTotal = measurements
      .filter((m) => m.type === 'area')
      .reduce((sum, m) => sum + m.value * Math.pow(UNIT_CONVERSION[m.unit][currentUnit], 2), 0)

    const volumeTotal = measurements
      .filter((m) => m.volumeValue !== undefined)
      .reduce((sum, m) => {
        if (m.volumeValue && m.volumeUnit) {
          const cubicFeet = m.volumeValue * VOLUME_TO_CUBIC_FEET[m.volumeUnit]
          return sum + cubicFeet
        }
        return sum
      }, 0)

    // Count angle measurements
    const angleCount = measurements.filter((m) => m.type === 'angle').length

    // Count by category (for count measurements)
    const countsByCategory: Record<string, number> = {}
    measurements
      .filter((m) => m.type === 'count')
      .forEach((m) => {
        const category = m.displayLabel || 'uncategorized'
        countsByCategory[category] = (countsByCategory[category] || 0) + 1
      })

    return {
      distanceTotal,
      areaTotal,
      volumeTotal,
      angleCount,
      countsByCategory,
      measurementCount: measurements.length,
    }
  }, [measurements, currentUnit])

  // Export measurements
  const handleExport = useCallback(
    (options: MeasurementExportOptions) => {
      if (!documentId) {return}

      exportMeasurements(
        measurements,
        options,
        scale,
        pageNumber,
        sheetName,
        userProfile?.full_name || userProfile?.email
      )
    },
    [documentId, measurements, scale, pageNumber, sheetName, userProfile]
  )

  // Add volume to measurement
  const addVolumeToMeasurement = useCallback(
    async (
      measurementId: string,
      depth: number,
      depthUnit: MeasurementUnit,
      displayVolumeUnit: VolumeUnit
    ) => {
      const measurement = measurements.find((m) => m.id === measurementId)
      if (!measurement || measurement.type !== 'area' || !documentId) {return}

      const volumeInCubicFeet = calculateVolume(
        measurement.value,
        measurement.unit,
        depth,
        depthUnit
      )
      const volumeInDisplayUnit = convertVolume(volumeInCubicFeet, displayVolumeUnit)

      await updateMutation.mutateAsync({
        id: measurementId,
        documentId,
        pageNumber,
        updates: {
          depth,
          depthUnit,
          volumeValue: volumeInDisplayUnit,
          volumeUnit: displayVolumeUnit,
        },
      })
    },
    [measurements, documentId, pageNumber, updateMutation]
  )

  return {
    measurements,
    isLoading: measurementsQuery.isLoading,
    error: measurementsQuery.error,
    runningTotals,

    // Mutations
    createMeasurement: createMutation.mutateAsync,
    updateMeasurement: updateMutation.mutateAsync,
    deleteMeasurement: deleteMutation.mutateAsync,
    clearMeasurements: clearMutation.mutateAsync,
    addVolumeToMeasurement,

    // Export
    exportMeasurements: handleExport,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isClearing: clearMutation.isPending,
  }
}

// ============================================================
// COUNT MARKERS HOOK
// ============================================================

interface UseCountMarkersOptions {
  documentId: string | undefined
  pageNumber?: number
  initialCategories?: Omit<CountCategory, 'count'>[]
}

/**
 * Hook for managing count markers on drawings
 */
export function useCountMarkers({
  documentId,
  pageNumber = 1,
  initialCategories = DEFAULT_COUNT_CATEGORIES,
}: UseCountMarkersOptions) {
  const { userProfile } = useAuth()
  const [markers, setMarkers] = useState<CountMarker[]>([])
  const [categories, setCategories] = useState<CountCategory[]>(
    initialCategories.map((c) => ({ ...c, count: 0 }))
  )
  const [activeCategory, setActiveCategory] = useState<CountCategory | null>(null)
  const [isActive, setIsActive] = useState(false)

  // Calculate counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    markers.forEach((marker) => {
      counts[marker.categoryId] = (counts[marker.categoryId] || 0) + 1
    })
    return counts
  }, [markers])

  // Update categories with counts
  const categoriesWithCounts = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      count: categoryCounts[cat.id] || 0,
    }))
  }, [categories, categoryCounts])

  // Add a marker
  const addMarker = useCallback(
    (position: { x: number; y: number }, label?: string) => {
      if (!activeCategory || !userProfile?.id) {return null}

      const categoryMarkers = markers.filter((m) => m.categoryId === activeCategory.id)
      const nextNumber = categoryMarkers.length + 1

      const newMarker: CountMarker = {
        id: `count-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        position,
        category: activeCategory.name,
        categoryId: activeCategory.id,
        number: nextNumber,
        label,
        color: activeCategory.color,
        pageNumber,
        createdAt: new Date().toISOString(),
        createdBy: userProfile.id,
      }

      setMarkers((prev) => [...prev, newMarker])
      return newMarker
    },
    [activeCategory, markers, pageNumber, userProfile?.id]
  )

  // Delete a marker
  const deleteMarker = useCallback((id: string) => {
    setMarkers((prev) => {
      const markerToDelete = prev.find((m) => m.id === id)
      if (!markerToDelete) {return prev}

      // Remove marker and renumber remaining markers in same category
      const remaining = prev.filter((m) => m.id !== id)
      return remaining.map((m) => {
        if (m.categoryId === markerToDelete.categoryId && m.number > markerToDelete.number) {
          return { ...m, number: m.number - 1 }
        }
        return m
      })
    })
  }, [])

  // Clear markers (all or by category)
  const clearMarkers = useCallback((categoryId?: string) => {
    if (categoryId) {
      setMarkers((prev) => prev.filter((m) => m.categoryId !== categoryId))
    } else {
      setMarkers([])
    }
  }, [])

  // Add category
  const addCategory = useCallback((category: Omit<CountCategory, 'count'>) => {
    setCategories((prev) => [...prev, { ...category, count: 0 }])
  }, [])

  // Update category
  const updateCategory = useCallback((updatedCategory: CountCategory) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
    )
    // Update markers with new category info
    setMarkers((prev) =>
      prev.map((m) =>
        m.categoryId === updatedCategory.id
          ? { ...m, category: updatedCategory.name, color: updatedCategory.color }
          : m
      )
    )
  }, [])

  // Delete category
  const deleteCategory = useCallback((categoryId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId))
    setMarkers((prev) => prev.filter((m) => m.categoryId !== categoryId))
    if (activeCategory?.id === categoryId) {
      setActiveCategory(null)
      setIsActive(false)
    }
  }, [activeCategory])

  // Export counts
  const handleExportCounts = useCallback(() => {
    exportCounts(markers, categoriesWithCounts, `document-${documentId}`)
  }, [markers, categoriesWithCounts, documentId])

  // Total count
  const totalCount = markers.length

  return {
    markers,
    categories: categoriesWithCounts,
    activeCategory,
    isActive,
    totalCount,

    // Actions
    setActiveCategory,
    setIsActive,
    addMarker,
    deleteMarker,
    clearMarkers,
    addCategory,
    updateCategory,
    deleteCategory,
    exportCounts: handleExportCounts,
  }
}

export default {
  useMeasurements,
  useAllMeasurements,
  useCreateMeasurement,
  useUpdateMeasurement,
  useDeleteMeasurement,
  useClearMeasurements,
  useEnhancedMeasurements,
  useCountMarkers,
}
