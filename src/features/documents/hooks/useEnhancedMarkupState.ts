// File: /src/features/documents/hooks/useEnhancedMarkupState.ts
// Centralized state management for enhanced markup features

import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useDocumentLayers, useCreateLayer, useUpdateLayer, useDeleteLayer, useToggleLayerVisibility, useToggleLayerLock, useReorderLayer } from './useLayers'
import { useScaleCalibration, useSaveScaleCalibration } from './useDocumentComparison'
import { useMeasurements, useCreateMeasurement, useDeleteMeasurement, useClearMeasurements } from './useMeasurements'
import type {
  ExtendedAnnotationType,
  MarkupLayer,
  MeasurementType,
  MeasurementUnit,
  ScaleCalibration,
  MeasurementAnnotation,
  StampType,
  EnhancedShape,
  MarkupAuthor,
  LayerOrderAction,
} from '../types/markup'

export type Tool = ExtendedAnnotationType | 'select' | 'pan' | 'eraser' | 'measure-distance' | 'measure-area' | 'calibrate'

interface EnhancedMarkupStateOptions {
  documentId: string | undefined
  pageNumber?: number
}

export function useEnhancedMarkupState({ documentId, pageNumber = 1 }: EnhancedMarkupStateOptions) {
  const { userProfile } = useAuth()
  const currentUserId = userProfile?.id || ''

  // ============================================================
  // TOOL STATE
  // ============================================================
  const [selectedTool, setSelectedTool] = useState<Tool>('select')
  const [selectedColor, setSelectedColor] = useState('#FF0000')
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [lineWidth, setLineWidth] = useState(2)
  const [zoom, setZoom] = useState(100)

  // ============================================================
  // LAYER STATE & HOOKS
  // ============================================================
  const { data: layers = [], isLoading: layersLoading } = useDocumentLayers(documentId)
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

  const createLayerMutation = useCreateLayer()
  const updateLayerMutation = useUpdateLayer()
  const deleteLayerMutation = useDeleteLayer()
  const toggleVisibilityMutation = useToggleLayerVisibility()
  const toggleLockMutation = useToggleLayerLock()
  const reorderLayerMutation = useReorderLayer()

  const handleCreateLayer = useCallback((layer: Omit<MarkupLayer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!documentId) {return}
    createLayerMutation.mutate({
      ...layer,
      documentId,
    })
  }, [documentId, createLayerMutation])

  const handleUpdateLayer = useCallback((layerId: string, updates: Partial<MarkupLayer>) => {
    if (!documentId) {return}
    updateLayerMutation.mutate({ id: layerId, documentId, ...updates })
  }, [documentId, updateLayerMutation])

  const handleDeleteLayer = useCallback((layerId: string) => {
    if (!documentId) {return}
    deleteLayerMutation.mutate({ id: layerId, documentId })
  }, [documentId, deleteLayerMutation])

  const handleToggleLayerVisibility = useCallback((layerId: string) => {
    if (!documentId) {return}
    const layer = layers.find((l: MarkupLayer) => l.id === layerId)
    if (layer) {
      toggleVisibilityMutation.mutate({ id: layerId, documentId, visible: layer.visible })
    }
  }, [documentId, layers, toggleVisibilityMutation])

  const handleToggleLayerLock = useCallback((layerId: string) => {
    if (!documentId) {return}
    const layer = layers.find((l: MarkupLayer) => l.id === layerId)
    if (layer) {
      toggleLockMutation.mutate({ id: layerId, documentId, locked: layer.locked })
    }
  }, [documentId, layers, toggleLockMutation])

  const handleReorderLayer = useCallback((layerId: string, action: LayerOrderAction) => {
    if (!documentId) {return}
    reorderLayerMutation.mutate({ id: layerId, documentId, action, layers })
  }, [documentId, layers, reorderLayerMutation])

  // ============================================================
  // MEASUREMENT STATE & HOOKS
  // ============================================================
  const [activeMeasurementType, setActiveMeasurementType] = useState<MeasurementType | null>(null)
  const [currentMeasurementUnit, setCurrentMeasurementUnit] = useState<MeasurementUnit>('feet')
  const [isCalibrating, setIsCalibrating] = useState(false)
  const [calibrationPixelDistance, setCalibrationPixelDistance] = useState<number | null>(null)

  const { data: scaleCalibration } = useScaleCalibration(documentId, pageNumber)
  const saveCalibrationMutation = useSaveScaleCalibration()
  const { data: measurements = [] } = useMeasurements(documentId, pageNumber)
  const createMeasurementMutation = useCreateMeasurement()
  const deleteMeasurementMutation = useDeleteMeasurement()
  const clearMeasurementsMutation = useClearMeasurements()

  const handleMeasurementTypeChange = useCallback((type: MeasurementType | null) => {
    setActiveMeasurementType(type)
    if (type) {
      setSelectedTool(type === 'distance' ? 'measure-distance' : 'measure-area')
    }
  }, [])

  const handleStartCalibration = useCallback(() => {
    setIsCalibrating(true)
    setSelectedTool('calibrate')
  }, [])

  const handleCancelCalibration = useCallback(() => {
    setIsCalibrating(false)
    setCalibrationPixelDistance(null)
    setSelectedTool('select')
  }, [])

  const handleCalibrateScale = useCallback((scale: ScaleCalibration) => {
    if (!documentId) {return}
    saveCalibrationMutation.mutate({
      documentId,
      pageNumber,
      pixelDistance: scale.pixelDistance,
      realWorldDistance: scale.realWorldDistance,
      unit: scale.unit,
      calibratedBy: currentUserId,
    })
    setIsCalibrating(false)
    setCalibrationPixelDistance(null)
    setSelectedTool('select')
  }, [documentId, pageNumber, currentUserId, saveCalibrationMutation])

  const handleDeleteMeasurement = useCallback((id: string) => {
    if (!documentId) {return}
    deleteMeasurementMutation.mutate({ id, documentId, pageNumber })
  }, [documentId, pageNumber, deleteMeasurementMutation])

  const handleClearAllMeasurements = useCallback(() => {
    if (!documentId) {return}
    clearMeasurementsMutation.mutate({ documentId, pageNumber })
  }, [documentId, pageNumber, clearMeasurementsMutation])

  // ============================================================
  // STAMP STATE
  // ============================================================
  const [selectedStamp, setSelectedStamp] = useState<StampType | null>(null)
  const [customStampText, setCustomStampText] = useState('')

  const handleStampSelect = useCallback((stamp: StampType | null) => {
    setSelectedStamp(stamp)
    if (stamp) {
      setSelectedTool('stamp' as Tool)
    }
  }, [])

  // ============================================================
  // MARKUP HISTORY STATE (for the history panel)
  // ============================================================
  const [markups, setMarkups] = useState<EnhancedShape[]>([])
  const [selectedMarkupId, setSelectedMarkupId] = useState<string | undefined>()

  // Derive authors from markups
  const authors = useMemo<MarkupAuthor[]>(() => {
    const authorMap = new Map<string, MarkupAuthor>()
    markups.forEach(m => {
      if (m.createdBy && !authorMap.has(m.createdBy)) {
        authorMap.set(m.createdBy, {
          id: m.createdBy,
          name: m.createdByName || 'Unknown',
        })
      }
    })
    return Array.from(authorMap.values())
  }, [markups])

  const handleSelectMarkup = useCallback((markupId: string) => {
    setSelectedMarkupId(markupId)
  }, [])

  const handleDeleteMarkup = useCallback((markupId: string) => {
    // This would be wired to actual delete mutation
    setMarkups(prev => prev.filter(m => m.id !== markupId))
    if (selectedMarkupId === markupId) {
      setSelectedMarkupId(undefined)
    }
  }, [selectedMarkupId])

  const handleEditMarkup = useCallback((markupId: string) => {
    setSelectedMarkupId(markupId)
    setSelectedTool('select')
  }, [])

  const handleViewMarkup = useCallback((markupId: string) => {
    setSelectedMarkupId(markupId)
    // Parent component would handle zooming to the markup
  }, [])

  // ============================================================
  // ZOOM CONTROLS
  // ============================================================
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 400))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25))
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(100)
  }, [])

  // ============================================================
  // COLOR MANAGEMENT
  // ============================================================
  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color)
    // Update recent colors
    setRecentColors(prev => {
      const filtered = prev.filter(c => c !== color)
      return [color, ...filtered].slice(0, 8)
    })
  }, [])

  // ============================================================
  // RETURN ALL STATE AND HANDLERS
  // ============================================================
  return {
    // User
    currentUserId,

    // Tool state
    selectedTool,
    setSelectedTool,
    selectedColor,
    onColorChange: handleColorChange,
    recentColors,
    lineWidth,
    setLineWidth,
    zoom,

    // Layer state
    layers,
    layersLoading,
    selectedLayerId,
    onSelectLayer: setSelectedLayerId,
    onCreateLayer: handleCreateLayer,
    onUpdateLayer: handleUpdateLayer,
    onDeleteLayer: handleDeleteLayer,
    onReorderLayer: handleReorderLayer,
    onToggleLayerVisibility: handleToggleLayerVisibility,
    onToggleLayerLock: handleToggleLayerLock,

    // Measurement state
    activeMeasurementType,
    onMeasurementTypeChange: handleMeasurementTypeChange,
    currentMeasurementUnit,
    onMeasurementUnitChange: setCurrentMeasurementUnit,
    scale: scaleCalibration || null,
    onCalibrateScale: handleCalibrateScale,
    measurements,
    onDeleteMeasurement: handleDeleteMeasurement,
    onClearAllMeasurements: handleClearAllMeasurements,
    isCalibrating,
    onStartCalibration: handleStartCalibration,
    onCancelCalibration: handleCancelCalibration,
    calibrationPixelDistance,
    setCalibrationPixelDistance,

    // Stamp state
    selectedStamp,
    onStampSelect: handleStampSelect,
    customStampText,
    onCustomStampTextChange: setCustomStampText,

    // History state
    markups,
    setMarkups,
    authors,
    selectedMarkupId,
    onSelectMarkup: handleSelectMarkup,
    onDeleteMarkup: handleDeleteMarkup,
    onEditMarkup: handleEditMarkup,
    onViewMarkup: handleViewMarkup,

    // Zoom controls
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onResetView: handleResetView,
  }
}

export default useEnhancedMarkupState
