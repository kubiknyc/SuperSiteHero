// File: /src/features/documents/components/viewers/PDFViewer.tsx
// PDF viewer with zoom, pan, and page navigation capabilities

import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Pencil } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { UnifiedDrawingCanvas } from '../markup/UnifiedDrawingCanvas'
import { useEnhancedMarkupState } from '../../hooks/useEnhancedMarkupState'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

interface PDFViewerProps {
  documentId: string
  projectId: string
  fileUrl: string
  fileName?: string
  allowMarkup?: boolean
  readOnly?: boolean
  onMarkupCreate?: (markup: any) => void
  height?: string
  enableMarkup?: boolean
  markupState?: ReturnType<typeof useEnhancedMarkupState>
  /** External page number control - when provided, component uses this page */
  pageNumber?: number
  /** Callback when page changes internally (for syncing with external state) */
  onPageChange?: (page: number) => void
  /** Hide the internal page navigation UI (when parent controls navigation) */
  hidePageNavigation?: boolean
  /** Enable real-time collaborative markup with other users */
  collaborative?: boolean
}

/**
 * PDFViewer Component
 *
 * A PDF viewer with zoom controls, page navigation, and optional markup capability.
 *
 * Features:
 * - Page navigation (previous/next, jump to page)
 * - Zoom controls (fit to width, fit to page, custom zoom)
 * - Page counter display
 * - Thumbnail sidebar (optional)
 * - Download button
 * - Responsive design
 * - Touch-friendly controls
 *
 * Usage:
 * ```tsx
 * <PDFViewer
 *   fileUrl="https://example.com/document.pdf"
 *   fileName="example.pdf"
 *   allowMarkup={false}
 * />
 * ```
 */
export function PDFViewer({
  documentId,
  projectId,
  fileUrl,
  fileName = 'document.pdf',
  allowMarkup = false,
  readOnly = false,
  onMarkupCreate,
  height = 'h-screen',
  enableMarkup: initialEnableMarkup = false,
  markupState,
  pageNumber: externalPageNumber,
  onPageChange,
  hidePageNavigation = false,
  collaborative = false,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [internalPage, setInternalPage] = useState(1)

  // Use external page number if provided, otherwise use internal state
  const currentPage = externalPageNumber ?? internalPage

  // Wrapper to update page - notifies parent if callback provided
  const setCurrentPage = (page: number) => {
    if (externalPageNumber === undefined) {
      setInternalPage(page)
    }
    onPageChange?.(page)
  }
  const [zoom, setZoom] = useState(100)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enableMarkup, setEnableMarkup] = useState(initialEnableMarkup)
  const [pageWidth, setPageWidth] = useState(800)
  const [pageHeight, setPageHeight] = useState(600)
  const [pdfWorkerReady, setPdfWorkerReady] = useState(false)

  const pageContainerRef = useRef<HTMLDivElement>(null)

  // Initialize PDF.js worker lazily on component mount
  useEffect(() => {
    const initWorker = () => {
      if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()
      }
      setPdfWorkerReady(true)
    }
    initWorker()
  }, [])

  // Handle PDF load success
  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
  }

  // Handle PDF load error
  const handleDocumentLoadError = (error: Error) => {
    setError(error.message)
    setIsLoading(false)
  }

  // Navigation handlers
  const goToNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value, 10)
    if (page > 0 && numPages && page <= numPages) {
      setCurrentPage(page)
    }
  }

  // Zoom handlers
  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 200))
  }

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50))
  }

  const resetZoom = () => {
    setZoom(100)
  }

  // Download handler
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNextPage()
      } else if (e.key === 'ArrowLeft') {
        goToPreviousPage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, numPages])

  return (
    <div className={cn('flex flex-col bg-background', height)}>
      {/* Toolbar */}
      <div className="bg-surface border-b border-gray-700 p-3 flex items-center justify-between flex-wrap gap-2">
        {/* Left side - Navigation (hidden when parent controls navigation) */}
        {!hidePageNavigation && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              title="Previous page (Left arrow)"
              className="text-white hover:bg-gray-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-1 px-2">
              <input
                type="number"
                min="1"
                max={numPages || 1}
                value={currentPage}
                onChange={handlePageInputChange}
                className="w-12 text-center bg-gray-700 text-white text-sm rounded px-1 py-1 border-0"
              />
              <span className="text-gray-300 text-sm">
                / {numPages || '?'}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextPage}
              disabled={!numPages || currentPage >= numPages}
              title="Next page (Right arrow)"
              className="text-white hover:bg-gray-700"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Center - Filename */}
        <div className="text-gray-300 text-sm truncate flex-1 text-center px-2">
          {fileName}
        </div>

        {/* Right side - Zoom & Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={zoom <= 50}
            title="Zoom out"
            className="text-white hover:bg-gray-700"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>

          <div className="text-gray-300 text-sm w-10 text-center">
            {zoom}%
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={zoom >= 200}
            title="Zoom in"
            className="text-white hover:bg-gray-700"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <div className="w-px h-4 bg-gray-600" />

          <Button
            variant="ghost"
            size="sm"
            onClick={resetZoom}
            title="Reset zoom to 100%"
            className="text-white hover:bg-gray-700 text-xs"
          >
            Reset
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            title="Download PDF"
            className="text-white hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
          </Button>

          {allowMarkup && !readOnly && (
            <>
              <div className="w-px h-4 bg-gray-600" />
              <Button
                variant={enableMarkup ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setEnableMarkup(!enableMarkup)}
                title={enableMarkup ? 'Disable markup' : 'Enable markup'}
                className={enableMarkup ? '' : 'text-white hover:bg-gray-700'}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div className="flex-1 overflow-auto bg-background p-4 flex items-center justify-center relative">
        {!pdfWorkerReady && (
          <div className="text-disabled text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mb-2"></div>
            <p>Initializing PDF viewer...</p>
          </div>
        )}

        {pdfWorkerReady && isLoading && (
          <div className="text-disabled text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mb-2"></div>
            <p>Loading PDF...</p>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-center max-w-md">
            <p className="font-medium mb-2">Error loading PDF</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {pdfWorkerReady && !error && (
          <div ref={pageContainerRef} className="relative">
            <Document
              file={fileUrl}
              onLoadSuccess={handleDocumentLoadSuccess}
              onLoadError={handleDocumentLoadError}
              loading={
                <div className="text-disabled">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={zoom / 100}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={Math.min(window.innerWidth - 32, 1000)}
                onLoadSuccess={(page) => {
                  const viewport = page.getViewport({ scale: zoom / 100 })
                  setPageWidth(viewport.width)
                  setPageHeight(viewport.height)
                }}
              />
            </Document>

            {/* Drawing Canvas Overlay */}
            {enableMarkup && allowMarkup && !readOnly && (
              <div className="absolute top-0 left-0 pointer-events-auto">
                <UnifiedDrawingCanvas
                  documentId={documentId}
                  projectId={projectId}
                  pageNumber={currentPage}
                  width={pageWidth}
                  height={pageHeight}
                  readOnly={false}
                  markupState={markupState}
                  collaborative={collaborative}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
