/**
 * useBulkMarkupExport Hook
 *
 * React hook for managing bulk markup export operations.
 * Provides state management, progress tracking, and export functionality.
 */

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  markupExportService,
  type DrawingWithMarkups,
  type MarkupExportOptions,
  type MarkupExportProgress,
  type MarkupExportResult,
  type MarkupExportFormat,
  type MarkupExportMode,
} from '@/lib/api/services/markup-export'
import {
  validateExportOptions,
  estimateExportSize,
  getSelectionSummary,
  sortDrawings,
} from '../utils/markupExportUtils'

// ============================================================================
// Types
// ============================================================================

export interface BulkMarkupExportState {
  drawings: DrawingWithMarkups[]
  selectedDrawingIds: string[]
  format: MarkupExportFormat
  mode: MarkupExportMode
  includeMetadata: boolean
  includeComments: boolean
  quality: 'low' | 'medium' | 'high'
  pageSize: 'letter' | 'legal' | 'a4'
  orientation: 'portrait' | 'landscape'
}

export interface BulkMarkupExportHook {
  // Data
  drawings: DrawingWithMarkups[]
  selectedDrawings: DrawingWithMarkups[]
  isLoading: boolean
  isExporting: boolean
  error: string | null

  // State
  state: BulkMarkupExportState
  progress: MarkupExportProgress | null
  lastResult: MarkupExportResult | null

  // Summary
  summary: {
    totalDrawings: number
    totalMarkups: number
    drawingsWithMarkups: number
    selectedCount: number
    estimatedSize: string
  }

  // Validation
  validation: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }

  // Actions
  toggleDrawingSelection: (drawingId: string) => void
  selectAll: () => void
  selectNone: () => void
  selectWithMarkups: () => void
  setFormat: (format: MarkupExportFormat) => void
  setMode: (mode: MarkupExportMode) => void
  setQuality: (quality: 'low' | 'medium' | 'high') => void
  setPageSize: (size: 'letter' | 'legal' | 'a4') => void
  setOrientation: (orientation: 'portrait' | 'landscape') => void
  setIncludeMetadata: (include: boolean) => void
  setIncludeComments: (include: boolean) => void
  sortBy: (criteria: 'name' | 'markupCount') => void
  startExport: () => Promise<void>
  downloadResult: () => void
  reset: () => void
}

// ============================================================================
// Default State
// ============================================================================

const DEFAULT_STATE: BulkMarkupExportState = {
  drawings: [],
  selectedDrawingIds: [],
  format: 'png',
  mode: 'individual',
  includeMetadata: true,
  includeComments: false,
  quality: 'medium',
  pageSize: 'letter',
  orientation: 'landscape',
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBulkMarkupExport(projectId: string): BulkMarkupExportHook {
  // State
  const [state, setState] = useState<BulkMarkupExportState>(DEFAULT_STATE)
  const [progress, setProgress] = useState<MarkupExportProgress | null>(null)
  const [lastResult, setLastResult] = useState<MarkupExportResult | null>(null)
  const [sortCriteria, setSortCriteria] = useState<'name' | 'markupCount'>('name')

  // Fetch drawings with markups
  const {
    data: fetchedDrawings = [],
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['drawings-with-markups', projectId],
    queryFn: () => markupExportService.getDrawingsWithMarkups(projectId),
    enabled: !!projectId,
  })

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async (options: MarkupExportOptions) => {
      return markupExportService.exportMarkups(projectId, options, (p) => {
        setProgress(p)
      })
    },
    onSuccess: (result) => {
      setLastResult(result)
      if (result.success) {
        toast.success(
          `Export complete: ${result.fileCount} file(s), ${result.totalMarkups} markup(s)`
        )
      } else {
        toast.error(result.error || 'Export failed')
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Export failed')
    },
    onSettled: () => {
      setProgress(null)
    },
  })

  // Computed: sorted drawings
  const sortedDrawings = useMemo(() => {
    return sortDrawings(fetchedDrawings, sortCriteria, true)
  }, [fetchedDrawings, sortCriteria])

  // Computed: drawings with selection state
  const drawings = useMemo(() => {
    return sortedDrawings.map((d) => ({
      ...d,
      selected: state.selectedDrawingIds.includes(d.id),
    }))
  }, [sortedDrawings, state.selectedDrawingIds])

  // Computed: selected drawings
  const selectedDrawings = useMemo(() => {
    return drawings.filter((d) => d.selected)
  }, [drawings])

  // Computed: summary
  const summary = useMemo(() => {
    const _selectionInfo = getSelectionSummary(selectedDrawings)
    const sizeEstimate = estimateExportSize(selectedDrawings, {
      format: state.format,
      mode: state.mode,
      includeMetadata: state.includeMetadata,
      includeComments: state.includeComments,
      selectedDrawingIds: state.selectedDrawingIds,
      quality: state.quality,
      pageSize: state.pageSize,
      orientation: state.orientation,
    })

    return {
      totalDrawings: drawings.length,
      totalMarkups: drawings.reduce((sum, d) => sum + d.markupCount, 0),
      drawingsWithMarkups: drawings.filter((d) => d.markupCount > 0).length,
      selectedCount: selectedDrawings.length,
      estimatedSize: sizeEstimate.sizeLabel,
    }
  }, [drawings, selectedDrawings, state])

  // Computed: validation
  const validation = useMemo(() => {
    return validateExportOptions(
      {
        format: state.format,
        mode: state.mode,
        includeMetadata: state.includeMetadata,
        includeComments: state.includeComments,
        selectedDrawingIds: state.selectedDrawingIds,
        quality: state.quality,
        pageSize: state.pageSize,
        orientation: state.orientation,
      },
      selectedDrawings
    )
  }, [state, selectedDrawings])

  // Actions
  const toggleDrawingSelection = useCallback((drawingId: string) => {
    setState((prev) => {
      const isSelected = prev.selectedDrawingIds.includes(drawingId)
      return {
        ...prev,
        selectedDrawingIds: isSelected
          ? prev.selectedDrawingIds.filter((id) => id !== drawingId)
          : [...prev.selectedDrawingIds, drawingId],
      }
    })
  }, [])

  const selectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedDrawingIds: drawings.map((d) => d.id),
    }))
  }, [drawings])

  const selectNone = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedDrawingIds: [],
    }))
  }, [])

  const selectWithMarkups = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedDrawingIds: drawings.filter((d) => d.markupCount > 0).map((d) => d.id),
    }))
  }, [drawings])

  const setFormat = useCallback((format: MarkupExportFormat) => {
    setState((prev) => ({
      ...prev,
      format,
      // Reset mode to individual if JSON is selected
      mode: format === 'json' ? 'data-only' : prev.mode === 'data-only' ? 'individual' : prev.mode,
    }))
  }, [])

  const setMode = useCallback((mode: MarkupExportMode) => {
    setState((prev) => ({ ...prev, mode }))
  }, [])

  const setQuality = useCallback((quality: 'low' | 'medium' | 'high') => {
    setState((prev) => ({ ...prev, quality }))
  }, [])

  const setPageSize = useCallback((pageSize: 'letter' | 'legal' | 'a4') => {
    setState((prev) => ({ ...prev, pageSize }))
  }, [])

  const setOrientation = useCallback((orientation: 'portrait' | 'landscape') => {
    setState((prev) => ({ ...prev, orientation }))
  }, [])

  const setIncludeMetadata = useCallback((includeMetadata: boolean) => {
    setState((prev) => ({ ...prev, includeMetadata }))
  }, [])

  const setIncludeComments = useCallback((includeComments: boolean) => {
    setState((prev) => ({ ...prev, includeComments }))
  }, [])

  const sortBy = useCallback((criteria: 'name' | 'markupCount') => {
    setSortCriteria(criteria)
  }, [])

  const startExport = useCallback(async () => {
    if (!validation.valid) {
      toast.error(validation.errors[0] || 'Invalid export options')
      return
    }

    if (validation.warnings.length > 0) {
      // Show warning but continue
      validation.warnings.forEach((w) => toast(w, { icon: '!' }))
    }

    await exportMutation.mutateAsync({
      format: state.format,
      mode: state.mode,
      includeMetadata: state.includeMetadata,
      includeComments: state.includeComments,
      selectedDrawingIds: state.selectedDrawingIds,
      quality: state.quality,
      pageSize: state.pageSize,
      orientation: state.orientation,
    })
  }, [validation, state, exportMutation])

  const downloadResult = useCallback(() => {
    if (lastResult && lastResult.success) {
      markupExportService.downloadResult(lastResult)
    }
  }, [lastResult])

  const reset = useCallback(() => {
    setState(DEFAULT_STATE)
    setProgress(null)
    setLastResult(null)
  }, [])

  return {
    // Data
    drawings,
    selectedDrawings,
    isLoading,
    isExporting: exportMutation.isPending,
    error: fetchError instanceof Error ? fetchError.message : null,

    // State
    state,
    progress,
    lastResult,

    // Summary
    summary,

    // Validation
    validation,

    // Actions
    toggleDrawingSelection,
    selectAll,
    selectNone,
    selectWithMarkups,
    setFormat,
    setMode,
    setQuality,
    setPageSize,
    setOrientation,
    setIncludeMetadata,
    setIncludeComments,
    sortBy,
    startExport,
    downloadResult,
    reset,
  }
}

export default useBulkMarkupExport
