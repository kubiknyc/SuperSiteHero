/**
 * Markup Export Utility Functions
 *
 * Helper functions for bulk markup export operations including
 * canvas rendering, file generation, and ZIP creation.
 */

import type { DocumentMarkup } from '@/lib/api/services/markups'
import type { MarkupExportOptions, DrawingWithMarkups } from '@/lib/api/services/markup-export'

// ============================================================================
// Types
// ============================================================================

export interface CanvasRenderOptions {
  scale: number
  backgroundColor: string
  showGrid: boolean
  gridSize: number
  gridColor: string
}

export interface MarkupBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface ExportValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_CANVAS_OPTIONS: CanvasRenderOptions = {
  scale: 1.5,
  backgroundColor: '#FFFFFF',
  showGrid: false,
  gridSize: 50,
  gridColor: '#E5E5E5',
}

export const EXPORT_LIMITS = {
  maxDrawings: 100,
  maxTotalMarkups: 1000,
  maxFileSizeMB: 500,
  maxConcurrentOperations: 5,
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate export options before starting export
 */
export function validateExportOptions(
  options: MarkupExportOptions,
  drawings: DrawingWithMarkups[]
): ExportValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if any drawings are selected
  if (!options.selectedDrawingIds || options.selectedDrawingIds.length === 0) {
    errors.push('No drawings selected for export')
  }

  // Check drawing count limits
  if (options.selectedDrawingIds && options.selectedDrawingIds.length > EXPORT_LIMITS.maxDrawings) {
    errors.push(`Cannot export more than ${EXPORT_LIMITS.maxDrawings} drawings at once`)
  }

  // Check total markup count
  const totalMarkups = drawings.reduce((sum, d) => sum + d.markupCount, 0)
  if (totalMarkups > EXPORT_LIMITS.maxTotalMarkups) {
    warnings.push(`Large number of markups (${totalMarkups}) may result in slow export`)
  }

  // Check for drawings without markups
  const drawingsWithoutMarkups = drawings.filter((d) => d.markupCount === 0)
  if (drawingsWithoutMarkups.length > 0) {
    warnings.push(`${drawingsWithoutMarkups.length} selected drawing(s) have no markups`)
  }

  // Validate format-specific options
  if (options.format === 'pdf' && options.mode === 'merged') {
    if (drawings.length > 50) {
      warnings.push('Merged PDF with many pages may be slow to generate')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate the bounding box of all markups on a drawing
 */
export function calculateMarkupBounds(markups: DocumentMarkup[]): MarkupBounds {
  if (markups.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const markup of markups) {
    const data = markup.markup_data
    const x = data.x || 0
    const y = data.y || 0

    let markupMaxX = x
    let markupMaxY = y

    switch (markup.markup_type) {
      case 'rectangle':
      case 'cloud':
        markupMaxX = x + (data.width || 0)
        markupMaxY = y + (data.height || 0)
        break

      case 'circle': {
        const radius = data.radius || 0
        minX = Math.min(minX, x - radius)
        minY = Math.min(minY, y - radius)
        markupMaxX = x + radius
        markupMaxY = y + radius
        break
      }

      case 'arrow':
      case 'freehand':
        if (data.points) {
          for (let i = 0; i < data.points.length; i += 2) {
            const px = x + (data.points[i] || 0)
            const py = y + (data.points[i + 1] || 0)
            minX = Math.min(minX, px)
            minY = Math.min(minY, py)
            markupMaxX = Math.max(markupMaxX, px)
            markupMaxY = Math.max(markupMaxY, py)
          }
        }
        break

      case 'text': {
        // Approximate text bounds
        const textWidth = (data.text?.length || 0) * 8 // Rough estimate
        const textHeight = 16
        markupMaxX = x + textWidth
        markupMaxY = y + textHeight
        break
      }
    }

    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, markupMaxX)
    maxY = Math.max(maxY, markupMaxY)
  }

  return {
    minX: Math.max(0, minX - 10),
    minY: Math.max(0, minY - 10),
    maxX: maxX + 10,
    maxY: maxY + 10,
    width: maxX - minX + 20,
    height: maxY - minY + 20,
  }
}

/**
 * Estimate the file size of the export
 */
export function estimateExportSize(
  drawings: DrawingWithMarkups[],
  options: MarkupExportOptions
): { estimatedSizeMB: number; sizeLabel: string } {
  // Base estimate: average image size * number of drawings
  const avgImageSizeMB = options.quality === 'high' ? 2 : options.quality === 'medium' ? 1 : 0.5
  const imageSizeEstimate = drawings.length * avgImageSizeMB

  // Add overhead for metadata
  const metadataOverhead = options.includeMetadata ? 0.1 * drawings.length : 0

  // Format-specific adjustments
  let formatMultiplier = 1
  if (options.format === 'png') {
    formatMultiplier = 1.2 // PNG is larger than JPEG
  } else if (options.format === 'pdf') {
    formatMultiplier = 0.9 // PDF compression
  } else if (options.format === 'json') {
    // JSON is much smaller
    const markupCount = drawings.reduce((sum, d) => sum + d.markupCount, 0)
    const estimatedSizeMB = (markupCount * 0.001) + 0.01
    return {
      estimatedSizeMB,
      sizeLabel: formatFileSize(estimatedSizeMB * 1024 * 1024),
    }
  }

  const estimatedSizeMB = (imageSizeEstimate + metadataOverhead) * formatMultiplier

  return {
    estimatedSizeMB,
    sizeLabel: formatFileSize(estimatedSizeMB * 1024 * 1024),
  }
}

// ============================================================================
// Formatting Functions
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {return '0 B'}

  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`
}

/**
 * Format duration for display
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`
  }
  if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`
  }
  const minutes = Math.floor(milliseconds / 60000)
  const seconds = Math.round((milliseconds % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

/**
 * Sanitize filename for safe file system use
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Remove consecutive underscores
    .replace(/^\./, '') // Remove leading dots
    .substring(0, 200) // Limit length
    .trim()
}

// ============================================================================
// Color Utilities
// ============================================================================

/**
 * Convert hex color to RGBA
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {return `rgba(0, 0, 0, ${alpha})`}

  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Get contrasting text color for a background
 */
export function getContrastingColor(hexColor: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor)
  if (!result) {return '#000000'}

  const r = parseInt(result[1], 16)
  const g = parseInt(result[2], 16)
  const b = parseInt(result[3], 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? '#000000' : '#FFFFFF'
}

// ============================================================================
// Grouping and Sorting
// ============================================================================

/**
 * Group drawings by folder or category
 */
export function groupDrawingsByFolder(
  drawings: DrawingWithMarkups[]
): Map<string, DrawingWithMarkups[]> {
  const groups = new Map<string, DrawingWithMarkups[]>()

  for (const drawing of drawings) {
    // Extract folder from name (assumes path-like naming)
    const parts = drawing.name.split('/')
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Root'

    const existing = groups.get(folder) || []
    existing.push(drawing)
    groups.set(folder, existing)
  }

  return groups
}

/**
 * Sort drawings by various criteria
 */
export function sortDrawings(
  drawings: DrawingWithMarkups[],
  sortBy: 'name' | 'markupCount' | 'date' = 'name',
  ascending: boolean = true
): DrawingWithMarkups[] {
  const sorted = [...drawings].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'markupCount':
        return a.markupCount - b.markupCount
      case 'date':
        // Assuming file_url contains timestamp or using name
        return a.name.localeCompare(b.name)
      default:
        return 0
    }
  })

  return ascending ? sorted : sorted.reverse()
}

// ============================================================================
// Selection Helpers
// ============================================================================

/**
 * Get summary statistics for selected drawings
 */
export function getSelectionSummary(drawings: DrawingWithMarkups[]): {
  totalDrawings: number
  totalMarkups: number
  drawingsWithMarkups: number
  drawingsWithoutMarkups: number
  markupsByType: Record<string, number>
  uniqueAuthors: number
} {
  const markupsByType: Record<string, number> = {}
  const authorIds = new Set<string>()
  let totalMarkups = 0
  let drawingsWithMarkups = 0
  let drawingsWithoutMarkups = 0

  for (const drawing of drawings) {
    if (drawing.markupCount > 0) {
      drawingsWithMarkups++
    } else {
      drawingsWithoutMarkups++
    }

    for (const markup of drawing.markups) {
      totalMarkups++
      const type = markup.markup_type
      markupsByType[type] = (markupsByType[type] || 0) + 1
      if (markup.created_by) {
        authorIds.add(markup.created_by)
      }
    }
  }

  return {
    totalDrawings: drawings.length,
    totalMarkups,
    drawingsWithMarkups,
    drawingsWithoutMarkups,
    markupsByType,
    uniqueAuthors: authorIds.size,
  }
}

/**
 * Toggle selection for all drawings
 */
export function toggleAllSelection(
  drawings: DrawingWithMarkups[],
  selected: boolean
): DrawingWithMarkups[] {
  return drawings.map((d) => ({ ...d, selected }))
}

/**
 * Toggle selection for drawings with markups only
 */
export function selectDrawingsWithMarkups(drawings: DrawingWithMarkups[]): DrawingWithMarkups[] {
  return drawings.map((d) => ({ ...d, selected: d.markupCount > 0 }))
}

// ============================================================================
// Export Progress Utilities
// ============================================================================

/**
 * Calculate estimated time remaining based on progress
 */
export function estimateTimeRemaining(
  currentItem: number,
  totalItems: number,
  elapsedMs: number
): string {
  if (currentItem === 0) {return 'Calculating...'}

  const msPerItem = elapsedMs / currentItem
  const remainingItems = totalItems - currentItem
  const remainingMs = msPerItem * remainingItems

  return formatDuration(remainingMs)
}

/**
 * Create a progress update message
 */
export function createProgressMessage(
  currentDrawing: number,
  totalDrawings: number,
  step: string,
  drawingName?: string
): string {
  const progress = `${currentDrawing}/${totalDrawings}`
  const name = drawingName ? ` - ${drawingName}` : ''
  return `${step} (${progress})${name}`
}
