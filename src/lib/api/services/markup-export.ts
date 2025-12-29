/**
 * Markup Export Service
 *
 * Provides functionality for exporting document markups in various formats.
 * Supports PDF, PNG, and JSON export with options for individual or merged output.
 *
 * Required dependency: npm install jszip
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type { DocumentMarkup } from './markups'
import { logger } from '../../utils/logger';


// Dynamic import for JSZip (optional dependency)
let JSZip: typeof import('jszip') | null = null

async function getJSZip(): Promise<typeof import('jszip')> {
  if (!JSZip) {
    try {
      const module = await import('jszip')
      JSZip = module.default || module
    } catch (_error) {
      throw new Error(
        'JSZip is required for bulk export. Please install it: npm install jszip'
      )
    }
  }
  return JSZip as typeof import('jszip')
}

// ============================================================================
// Types
// ============================================================================

export type MarkupExportFormat = 'pdf' | 'png' | 'json'

export type MarkupExportMode = 'individual' | 'merged' | 'data-only'

export interface DrawingWithMarkups {
  id: string
  name: string
  file_url: string
  file_name: string
  file_type: string
  project_id: string
  page_count?: number
  markups: DocumentMarkup[]
  markupCount: number
  selected: boolean
}

export interface MarkupExportOptions {
  format: MarkupExportFormat
  mode: MarkupExportMode
  includeMetadata: boolean
  includeComments: boolean
  selectedDrawingIds: string[]
  quality?: 'low' | 'medium' | 'high'
  pageSize?: 'letter' | 'legal' | 'a4'
  orientation?: 'portrait' | 'landscape'
}

export interface MarkupExportProgress {
  currentDrawing: number
  totalDrawings: number
  currentStep: string
  percentage: number
  drawingName?: string
}

export interface MarkupExportResult {
  success: boolean
  blob?: Blob
  filename: string
  mimeType: string
  fileCount: number
  totalMarkups: number
  error?: string
}

export interface MarkupMetadata {
  id: string
  type: string
  author: {
    id: string
    name: string
    email?: string
  }
  createdAt: string
  updatedAt?: string
  color?: string
  layerId?: string
  layerName?: string
  comments?: string[]
  data: Record<string, unknown>
}

export interface DrawingExportData {
  documentId: string
  documentName: string
  projectId: string
  exportedAt: string
  markups: MarkupMetadata[]
}

// ============================================================================
// Quality Settings
// ============================================================================

const QUALITY_SETTINGS = {
  low: { scale: 1, jpegQuality: 0.6 },
  medium: { scale: 1.5, jpegQuality: 0.8 },
  high: { scale: 2, jpegQuality: 0.95 },
}

const PAGE_SIZES = {
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
  a4: { width: 595, height: 842 },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetch drawings with their markups for a project
 */
async function fetchDrawingsWithMarkups(
  projectId: string,
  documentIds?: string[]
): Promise<DrawingWithMarkups[]> {
  let query = supabase
    .from('documents')
    .select(`
      id,
      name,
      file_url,
      file_name,
      file_type,
      project_id,
      page_count
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .in('file_type', ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'])

  if (documentIds && documentIds.length > 0) {
    query = query.in('id', documentIds)
  }

  const { data: documents, error: docError } = await query

  if (docError) {
    throw new ApiErrorClass({
      code: 'FETCH_DOCUMENTS_ERROR',
      message: `Failed to fetch documents: ${docError.message}`,
    })
  }

  if (!documents || documents.length === 0) {
    return []
  }

  // Fetch markups for all documents
  const docIds = documents.map((d) => d.id)
  const { data: markups, error: markupError } = await supabase
    .from('document_markups')
    .select(`
      *,
      creator:users!document_markups_created_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .in('document_id', docIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (markupError) {
    throw new ApiErrorClass({
      code: 'FETCH_MARKUPS_ERROR',
      message: `Failed to fetch markups: ${markupError.message}`,
    })
  }

  // Group markups by document
  const markupsByDoc = new Map<string, DocumentMarkup[]>()
  for (const markup of markups || []) {
    const existing = markupsByDoc.get(markup.document_id) || []
    existing.push(markup as unknown as DocumentMarkup)
    markupsByDoc.set(markup.document_id, existing)
  }

  // Build result
  return documents.map((doc) => ({
    id: doc.id,
    name: doc.name,
    file_url: doc.file_url,
    file_name: doc.file_name,
    file_type: doc.file_type,
    project_id: doc.project_id,
    page_count: doc.page_count,
    markups: markupsByDoc.get(doc.id) || [],
    markupCount: markupsByDoc.get(doc.id)?.length || 0,
    selected: false,
  }))
}

/**
 * Load image from URL
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/**
 * Render a single markup to canvas context
 */
function renderMarkupToContext(
  ctx: CanvasRenderingContext2D,
  markup: DocumentMarkup,
  scale: number = 1
) {
  const data = markup.markup_data
  const x = (data.x || 0) * scale
  const y = (data.y || 0) * scale
  const strokeWidth = (data.strokeWidth || 2) * scale
  const color = data.stroke || markup.color || '#FF0000'

  ctx.strokeStyle = color
  ctx.fillStyle = data.fill || 'transparent'
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  switch (markup.markup_type) {
    case 'rectangle': {
      const width = (data.width || 0) * scale
      const height = (data.height || 0) * scale
      ctx.beginPath()
      ctx.rect(x, y, width, height)
      if (data.fill && data.fill !== 'transparent') {
        ctx.fill()
      }
      ctx.stroke()
      break
    }

    case 'circle': {
      const radius = (data.radius || 0) * scale
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      if (data.fill && data.fill !== 'transparent') {
        ctx.fill()
      }
      ctx.stroke()
      break
    }

    case 'arrow': {
      if (data.points && data.points.length >= 4) {
        const points = data.points.map((p) => p * scale)
        const startX = x + points[0]
        const startY = y + points[1]
        const endX = x + points[2]
        const endY = y + points[3]

        // Draw line
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        // Draw arrowhead
        const angle = Math.atan2(endY - startY, endX - startX)
        const headLength = (data.pointerLength || 10) * scale
        const _headWidth = (data.pointerWidth || 10) * scale

        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - headLength * Math.cos(angle - Math.PI / 6),
          endY - headLength * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          endX - headLength * Math.cos(angle + Math.PI / 6),
          endY - headLength * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fillStyle = color
        ctx.fill()
      }
      break
    }

    case 'freehand': {
      if (data.points && data.points.length >= 2) {
        const points = data.points.map((p) => p * scale)
        ctx.beginPath()
        ctx.moveTo(x + points[0], y + points[1])
        for (let i = 2; i < points.length; i += 2) {
          ctx.lineTo(x + points[i], y + points[i + 1])
        }
        ctx.stroke()
      }
      break
    }

    case 'text': {
      const fontSize = (16 * scale)
      ctx.font = `${fontSize}px Arial, sans-serif`
      ctx.fillStyle = data.fill || color
      ctx.fillText(data.text || '', x, y + fontSize)
      break
    }

    case 'cloud': {
      const width = (data.width || 0) * scale
      const height = (data.height || 0) * scale
      if (width !== 0 && height !== 0) {
        // Simplified cloud rendering
        const numBumps = data.numBumps || 8
        const bumpRadius = Math.min(Math.abs(width), Math.abs(height)) / (numBumps / 2)

        ctx.beginPath()
        // Draw rounded rectangle with bumps (simplified)
        const corners = 4
        for (let i = 0; i < corners; i++) {
          const cx = x + (i % 2 === 0 ? 0 : width)
          const cy = y + (i < 2 ? 0 : height)
          ctx.arc(cx, cy, bumpRadius * 0.3, 0, Math.PI * 2)
        }
        ctx.rect(x, y, width, height)
        if (data.fill && data.fill !== 'transparent') {
          ctx.fill()
        }
        ctx.stroke()
      }
      break
    }

    default:
      logger.warn(`Unknown markup type: ${markup.markup_type}`)
  }
}

/**
 * Render drawing with markups to canvas
 */
async function renderDrawingWithMarkups(
  drawing: DrawingWithMarkups,
  options: MarkupExportOptions
): Promise<HTMLCanvasElement> {
  const qualitySettings = QUALITY_SETTINGS[options.quality || 'medium']
  const scale = qualitySettings.scale

  // Load the base image
  let img: HTMLImageElement
  try {
    img = await loadImage(drawing.file_url)
  } catch (_error) {
    throw new ApiErrorClass({
      code: 'LOAD_IMAGE_ERROR',
      message: `Failed to load drawing: ${drawing.name}`,
    })
  }

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = img.width * scale
  canvas.height = img.height * scale

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Draw base image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // Render markups
  for (const markup of drawing.markups) {
    if (markup.visible !== false) {
      renderMarkupToContext(ctx, markup, scale)
    }
  }

  // Add metadata overlay if requested
  if (options.includeMetadata) {
    const padding = 10 * scale
    const fontSize = 12 * scale
    ctx.font = `${fontSize}px Arial, sans-serif`
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, canvas.height - 30 * scale, canvas.width, 30 * scale)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(
      `${drawing.name} | ${drawing.markups.length} markups | Exported: ${new Date().toLocaleString()}`,
      padding,
      canvas.height - padding
    )
  }

  return canvas
}

/**
 * Convert markup to metadata format
 */
function convertMarkupToMetadata(markup: DocumentMarkup): MarkupMetadata {
  return {
    id: markup.id,
    type: markup.markup_type,
    author: {
      id: markup.created_by || 'unknown',
      name: markup.creator?.full_name || markup.author_name || 'Unknown User',
      email: markup.creator?.email || undefined,
    },
    createdAt: markup.created_at || new Date().toISOString(),
    updatedAt: markup.updated_at || undefined,
    color: markup.color || markup.markup_data.stroke,
    layerId: markup.layer_id || undefined,
    layerName: undefined, // Would need to join with layers table
    comments: [], // Would need to join with comments table
    data: markup.markup_data,
  }
}

/**
 * Generate JSON export data
 */
function generateJsonExport(drawings: DrawingWithMarkups[]): DrawingExportData[] {
  return drawings.map((drawing) => ({
    documentId: drawing.id,
    documentName: drawing.name,
    projectId: drawing.project_id,
    exportedAt: new Date().toISOString(),
    markups: drawing.markups.map(convertMarkupToMetadata),
  }))
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Export markups as individual PNG files in a ZIP archive
 */
async function exportAsPngZip(
  drawings: DrawingWithMarkups[],
  options: MarkupExportOptions,
  onProgress?: (progress: MarkupExportProgress) => void
): Promise<MarkupExportResult> {
  const JSZipModule = await getJSZip()
  const zip = new JSZipModule()
  let totalMarkups = 0

  for (let i = 0; i < drawings.length; i++) {
    const drawing = drawings[i]
    totalMarkups += drawing.markups.length

    onProgress?.({
      currentDrawing: i + 1,
      totalDrawings: drawings.length,
      currentStep: 'Rendering drawing',
      percentage: Math.round(((i + 1) / drawings.length) * 100),
      drawingName: drawing.name,
    })

    try {
      const canvas = await renderDrawingWithMarkups(drawing, options)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/png',
          QUALITY_SETTINGS[options.quality || 'medium'].jpegQuality
        )
      })

      const fileName = `${drawing.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.png`
      zip.file(fileName, blob)
    } catch (error) {
      logger.error(`Failed to process drawing ${drawing.name}:`, error)
    }
  }

  // Add JSON metadata if requested
  if (options.includeMetadata) {
    const jsonData = generateJsonExport(drawings)
    zip.file('markup-metadata.json', JSON.stringify(jsonData, null, 2))
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return {
    success: true,
    blob: zipBlob,
    filename: `markup-export-${new Date().toISOString().split('T')[0]}.zip`,
    mimeType: 'application/zip',
    fileCount: drawings.length,
    totalMarkups,
  }
}

/**
 * Export markups as a single merged PDF
 */
async function exportAsMergedPdf(
  drawings: DrawingWithMarkups[],
  options: MarkupExportOptions,
  onProgress?: (progress: MarkupExportProgress) => void
): Promise<MarkupExportResult> {
  // Build HTML for PDF conversion
  const pages: string[] = []
  let totalMarkups = 0

  for (let i = 0; i < drawings.length; i++) {
    const drawing = drawings[i]
    totalMarkups += drawing.markups.length

    onProgress?.({
      currentDrawing: i + 1,
      totalDrawings: drawings.length,
      currentStep: 'Processing drawing',
      percentage: Math.round(((i + 1) / drawings.length) * 100),
      drawingName: drawing.name,
    })

    try {
      const canvas = await renderDrawingWithMarkups(drawing, options)
      const dataUrl = canvas.toDataURL('image/png', QUALITY_SETTINGS[options.quality || 'medium'].jpegQuality)

      let metadataHtml = ''
      if (options.includeMetadata) {
        metadataHtml = `
          <div class="metadata">
            <strong>${escapeHtml(drawing.name)}</strong> |
            ${drawing.markups.length} markup(s) |
            Page ${i + 1} of ${drawings.length}
          </div>
        `
      }

      pages.push(`
        <div class="page">
          <img src="${dataUrl}" alt="${escapeHtml(drawing.name)}" />
          ${metadataHtml}
        </div>
      `)
    } catch (error) {
      logger.error(`Failed to process drawing ${drawing.name}:`, error)
    }
  }

  const pageSettings = PAGE_SIZES[options.pageSize || 'letter']
  const orientation = options.orientation || 'landscape'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Markup Export</title>
      <style>
        @page {
          size: ${orientation === 'landscape' ? `${pageSettings.height}pt ${pageSettings.width}pt` : `${pageSettings.width}pt ${pageSettings.height}pt`};
          margin: 0.5in;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .page {
          page-break-after: always;
          text-align: center;
          padding: 20px;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        .page img {
          max-width: 100%;
          max-height: calc(100vh - 60px);
          object-fit: contain;
        }
        .metadata {
          margin-top: 10px;
          font-size: 10pt;
          color: #666;
        }
        .cover {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          text-align: center;
        }
        .cover h1 {
          font-size: 24pt;
          color: #1f4e79;
          margin-bottom: 20px;
        }
        .cover .info {
          font-size: 12pt;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="page cover">
        <h1 className="heading-page">Markup Export</h1>
        <div class="info">
          <p>Total Drawings: ${drawings.length}</p>
          <p>Total Markups: ${totalMarkups}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
      </div>
      ${pages.join('\n')}
    </body>
    </html>
  `

  // For true PDF, this would use a library like jsPDF or server-side conversion
  // For now, we return HTML that can be printed to PDF
  const blob = new Blob([html], { type: 'text/html' })

  return {
    success: true,
    blob,
    filename: `markup-export-${new Date().toISOString().split('T')[0]}.html`,
    mimeType: 'text/html',
    fileCount: drawings.length,
    totalMarkups,
  }
}

/**
 * Export markups as individual PDF files in a ZIP archive
 */
async function exportAsPdfZip(
  drawings: DrawingWithMarkups[],
  options: MarkupExportOptions,
  onProgress?: (progress: MarkupExportProgress) => void
): Promise<MarkupExportResult> {
  const JSZipModule = await getJSZip()
  const zip = new JSZipModule()
  let totalMarkups = 0

  for (let i = 0; i < drawings.length; i++) {
    const drawing = drawings[i]
    totalMarkups += drawing.markups.length

    onProgress?.({
      currentDrawing: i + 1,
      totalDrawings: drawings.length,
      currentStep: 'Generating PDF',
      percentage: Math.round(((i + 1) / drawings.length) * 100),
      drawingName: drawing.name,
    })

    try {
      const canvas = await renderDrawingWithMarkups(drawing, options)
      const dataUrl = canvas.toDataURL('image/png', QUALITY_SETTINGS[options.quality || 'medium'].jpegQuality)

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${escapeHtml(drawing.name)}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            img { max-width: 100%; }
            .metadata { margin-top: 10px; font-size: 10pt; color: #666; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="${escapeHtml(drawing.name)}" />
          ${options.includeMetadata ? `
            <div class="metadata">
              <strong>${escapeHtml(drawing.name)}</strong> |
              ${drawing.markups.length} markup(s) |
              Exported: ${new Date().toLocaleString()}
            </div>
          ` : ''}
        </body>
        </html>
      `

      const fileName = `${drawing.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.html`
      zip.file(fileName, html)
    } catch (error) {
      logger.error(`Failed to process drawing ${drawing.name}:`, error)
    }
  }

  // Add JSON metadata if requested
  if (options.includeMetadata) {
    const jsonData = generateJsonExport(drawings)
    zip.file('markup-metadata.json', JSON.stringify(jsonData, null, 2))
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  return {
    success: true,
    blob: zipBlob,
    filename: `markup-export-${new Date().toISOString().split('T')[0]}.zip`,
    mimeType: 'application/zip',
    fileCount: drawings.length,
    totalMarkups,
  }
}

/**
 * Export markups data only as JSON
 */
async function exportAsJson(
  drawings: DrawingWithMarkups[],
  options: MarkupExportOptions,
  onProgress?: (progress: MarkupExportProgress) => void
): Promise<MarkupExportResult> {
  onProgress?.({
    currentDrawing: drawings.length,
    totalDrawings: drawings.length,
    currentStep: 'Generating JSON',
    percentage: 100,
  })

  const jsonData = generateJsonExport(drawings)
  const totalMarkups = drawings.reduce((sum, d) => sum + d.markups.length, 0)

  const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' })

  return {
    success: true,
    blob,
    filename: `markup-data-${new Date().toISOString().split('T')[0]}.json`,
    mimeType: 'application/json',
    fileCount: drawings.length,
    totalMarkups,
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ============================================================================
// Main Export Service API
// ============================================================================

export const markupExportService = {
  /**
   * Fetch all drawings with markups for a project
   */
  async getDrawingsWithMarkups(
    projectId: string,
    documentIds?: string[]
  ): Promise<DrawingWithMarkups[]> {
    return fetchDrawingsWithMarkups(projectId, documentIds)
  },

  /**
   * Export markups based on options
   */
  async exportMarkups(
    projectId: string,
    options: MarkupExportOptions,
    onProgress?: (progress: MarkupExportProgress) => void
  ): Promise<MarkupExportResult> {
    try {
      // Fetch drawings with markups
      const allDrawings = await fetchDrawingsWithMarkups(projectId, options.selectedDrawingIds)

      if (allDrawings.length === 0) {
        return {
          success: false,
          filename: '',
          mimeType: '',
          fileCount: 0,
          totalMarkups: 0,
          error: 'No drawings with markups found',
        }
      }

      // Filter to only drawings that have markups
      const drawingsWithMarkups = allDrawings.filter((d) => d.markups.length > 0)

      if (drawingsWithMarkups.length === 0) {
        return {
          success: false,
          filename: '',
          mimeType: '',
          fileCount: 0,
          totalMarkups: 0,
          error: 'Selected drawings have no markups',
        }
      }

      // Export based on format and mode
      switch (options.format) {
        case 'png':
          return exportAsPngZip(drawingsWithMarkups, options, onProgress)

        case 'pdf':
          if (options.mode === 'merged') {
            return exportAsMergedPdf(drawingsWithMarkups, options, onProgress)
          }
          return exportAsPdfZip(drawingsWithMarkups, options, onProgress)

        case 'json':
          return exportAsJson(drawingsWithMarkups, options, onProgress)

        default:
          return {
            success: false,
            filename: '',
            mimeType: '',
            fileCount: 0,
            totalMarkups: 0,
            error: `Unsupported export format: ${options.format}`,
          }
      }
    } catch (error) {
      logger.error('[MarkupExport] Export failed:', error)
      return {
        success: false,
        filename: '',
        mimeType: '',
        fileCount: 0,
        totalMarkups: 0,
        error: error instanceof Error ? error.message : 'Export failed',
      }
    }
  },

  /**
   * Download the export result
   */
  downloadResult(result: MarkupExportResult): void {
    if (!result.success || !result.blob) {
      throw new Error(result.error || 'No file to download')
    }

    const url = URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}

export default markupExportService
