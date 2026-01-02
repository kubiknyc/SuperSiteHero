// File: /src/features/documents/utils/pdf-to-canvas.ts
// Utility for rendering PDF pages to canvas for visual comparison

import * as pdfjs from 'pdfjs-dist'

// Track worker initialization state
let workerInitialized = false

/**
 * Lazily initialize the PDF.js worker.
 * Only initializes once, on first use.
 * Uses CDN-hosted worker to avoid bundler issues with Vite.
 */
function ensureWorkerInitialized(): void {
  if (workerInitialized || typeof window === 'undefined') {
    return
  }
  // IMPORTANT: react-pdf sets workerSrc to 'pdf.worker.mjs' by default which doesn't work with Vite
  // Serve worker from public folder to avoid CORS/module issues
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`
  workerInitialized = true
}

/**
 * Options for rendering a PDF page to canvas
 */
export interface RenderPdfOptions {
  /** DPI scale for rendering. Higher = better quality but slower. Default: 150 */
  dpi?: number
  /** Maximum dimension (width or height) in pixels. Default: 2000 */
  maxDimension?: number
  /** Background color to use. Default: white (#FFFFFF) */
  backgroundColor?: string
}

const DEFAULT_RENDER_OPTIONS: Required<RenderPdfOptions> = {
  dpi: 150,
  maxDimension: 2000,
  backgroundColor: '#FFFFFF',
}

/**
 * Cached PDF documents to avoid reloading
 */
const pdfCache = new Map<string, pdfjs.PDFDocumentProxy>()

/**
 * Load a PDF document from URL with caching
 */
export async function loadPdfDocument(url: string): Promise<pdfjs.PDFDocumentProxy> {
  // Ensure worker is initialized before first use
  ensureWorkerInitialized()

  // Check cache first
  const cached = pdfCache.get(url)
  if (cached) {
    return cached
  }

  // Load the PDF
  const loadingTask = pdfjs.getDocument({
    url,
    cMapUrl: 'https://unpkg.com/pdfjs-dist@5.4.296/cmaps/',
    cMapPacked: true,
  })

  const pdf = await loadingTask.promise

  // Cache the document (limit cache size)
  if (pdfCache.size > 10) {
    const firstKey = pdfCache.keys().next().value
    if (firstKey) {
      const oldDoc = pdfCache.get(firstKey)
      oldDoc?.destroy()
      pdfCache.delete(firstKey)
    }
  }
  pdfCache.set(url, pdf)

  return pdf
}

/**
 * Clear the PDF cache
 */
export function clearPdfCache(): void {
  pdfCache.forEach((doc) => doc.destroy())
  pdfCache.clear()
}

/**
 * Render a single PDF page to a canvas element
 */
export async function renderPdfPageToCanvas(
  pdfUrl: string,
  pageNumber: number = 1,
  options: RenderPdfOptions = {}
): Promise<HTMLCanvasElement> {
  const opts = { ...DEFAULT_RENDER_OPTIONS, ...options }

  // Load the PDF
  const pdf = await loadPdfDocument(pdfUrl)

  // Validate page number
  if (pageNumber < 1 || pageNumber > pdf.numPages) {
    throw new Error(`Invalid page number ${pageNumber}. PDF has ${pdf.numPages} pages.`)
  }

  // Get the page
  const page = await pdf.getPage(pageNumber)

  // Calculate scale based on DPI and max dimension
  const viewport = page.getViewport({ scale: 1 })
  const baseScale = opts.dpi / 72 // PDF standard is 72 DPI

  // Calculate dimension-limited scale
  const maxScaleW = opts.maxDimension / viewport.width
  const maxScaleH = opts.maxDimension / viewport.height
  const maxScale = Math.min(maxScaleW, maxScaleH, baseScale)

  // Create the scaled viewport
  const scaledViewport = page.getViewport({ scale: maxScale })

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(scaledViewport.width)
  canvas.height = Math.floor(scaledViewport.height)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas 2d context')
  }

  // Fill with background color
  ctx.fillStyle = opts.backgroundColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Render the PDF page to the canvas
  // Using any cast due to pdfjs-dist type inconsistencies across versions
  const renderContext: Parameters<typeof page.render>[0] = {
    canvasContext: ctx,
    viewport: scaledViewport,
    background: opts.backgroundColor,
  } as Parameters<typeof page.render>[0]

  await page.render(renderContext).promise

  return canvas
}

/**
 * Get information about a PDF document
 */
export interface PdfInfo {
  numPages: number
  pageWidth: number
  pageHeight: number
}

export async function getPdfInfo(pdfUrl: string): Promise<PdfInfo> {
  const pdf = await loadPdfDocument(pdfUrl)
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 1 })

  return {
    numPages: pdf.numPages,
    pageWidth: viewport.width,
    pageHeight: viewport.height,
  }
}

/**
 * Render multiple pages of a PDF to canvases
 */
export async function renderPdfPagesToCanvases(
  pdfUrl: string,
  pageNumbers: number[],
  options: RenderPdfOptions = {}
): Promise<Map<number, HTMLCanvasElement>> {
  const results = new Map<number, HTMLCanvasElement>()

  // Render pages in parallel with concurrency limit
  const CONCURRENCY = 3
  const chunks: number[][] = []

  for (let i = 0; i < pageNumbers.length; i += CONCURRENCY) {
    chunks.push(pageNumbers.slice(i, i + CONCURRENCY))
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (pageNum) => {
      const canvas = await renderPdfPageToCanvas(pdfUrl, pageNum, options)
      results.set(pageNum, canvas)
    })
    await Promise.all(promises)
  }

  return results
}

/**
 * Render an image URL to a canvas for comparison
 * (For non-PDF images like PNG, JPG)
 */
export async function renderImageToCanvas(
  imageUrl: string,
  options: RenderPdfOptions = {}
): Promise<HTMLCanvasElement> {
  const opts = { ...DEFAULT_RENDER_OPTIONS, ...options }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      // Calculate scale to fit within max dimension
      const scale = Math.min(
        opts.maxDimension / img.width,
        opts.maxDimension / img.height,
        1 // Don't upscale
      )

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(img.width * scale)
      canvas.height = Math.floor(img.height * scale)

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas 2d context'))
        return
      }

      // Fill with background color
      ctx.fillStyle = opts.backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw the image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      resolve(canvas)
    }

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`))
    }

    img.src = imageUrl
  })
}

/**
 * Render a document (PDF or image) to canvas based on file type
 */
export async function renderDocumentToCanvas(
  fileUrl: string,
  fileType: string,
  pageNumber: number = 1,
  options: RenderPdfOptions = {}
): Promise<HTMLCanvasElement> {
  if (fileType === 'application/pdf') {
    return renderPdfPageToCanvas(fileUrl, pageNumber, options)
  } else if (fileType.startsWith('image/')) {
    return renderImageToCanvas(fileUrl, options)
  } else {
    throw new Error(`Unsupported file type for comparison: ${fileType}`)
  }
}
