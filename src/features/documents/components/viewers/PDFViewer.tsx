// File: /src/features/documents/components/viewers/PDFViewer.tsx
// PDF viewer with zoom, pan, and page navigation capabilities

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Pencil,
  MapPin,
  ArrowLeft,
  ArrowRight,
  List,
  ChevronDown,
} from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { UnifiedDrawingCanvas } from '../markup/LazyUnifiedDrawingCanvas'
import { DrawingPinOverlay } from '../DrawingPinOverlay'
import { DrawingIndexPanel } from '../DrawingIndexPanel'
import { BookmarkManager, type Viewport } from '../BookmarkManager'
import { useEnhancedMarkupState } from '../../hooks/useEnhancedMarkupState'
import { useSheetNavigationHistory } from '../../hooks/useSheetNavigationHistory'
import type { Document as DocumentType } from '@/types/database'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// IMPORTANT: Set PDF.js worker at module level, before any component renders
// react-pdf sets workerSrc to 'pdf.worker.mjs' by default which doesn't work with Vite
// Serve worker from public folder to avoid CORS/module issues
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`

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
  /** Show RFI/Submittal pins on the drawing (default: true for drawing documents) */
  showDrawingPins?: boolean
  /** Callback when user adds a new pin */
  onAddDrawingPin?: (type: 'rfi' | 'submittal', normalizedX: number, normalizedY: number) => void
  /** All documents in the drawing set for sheet navigation */
  allDocuments?: DocumentType[]
  /** Callback when navigating to a different document */
  onNavigateToDocument?: (documentId: string, page?: number) => void
  /** Enable sheet navigation features (back/forward, index, bookmarks) */
  enableSheetNavigation?: boolean
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
  onMarkupCreate: _onMarkupCreate,
  height = 'h-screen',
  enableMarkup: initialEnableMarkup = false,
  markupState,
  pageNumber: externalPageNumber,
  onPageChange,
  hidePageNavigation = false,
  collaborative = false,
  showDrawingPins = false,
  onAddDrawingPin,
  allDocuments = [],
  onNavigateToDocument,
  enableSheetNavigation = false,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [internalPage, setInternalPage] = useState(1)

  // Use external page number if provided, otherwise use internal state
  const currentPage = externalPageNumber ?? internalPage

  // Sheet navigation state
  const [isIndexPanelOpen, setIsIndexPanelOpen] = useState(false)
  const [viewportPosition, setViewportPosition] = useState({ x: 0, y: 0 })

  // Sheet navigation history hook
  const {
    navigateTo,
    goBack,
    goForward,
    canGoBack,
    canGoForward,
    getRecentSheets,
    currentSheet,
  } = useSheetNavigationHistory()

  // Track navigation when page or document changes
  const trackNavigation = useCallback((docId: string, page: number, docName?: string) => {
    navigateTo({
      documentId: docId,
      pageNumber: page,
      sheetNumber: docName,
    })
  }, [navigateTo])

  // Wrapper to update page - notifies parent if callback provided
  const setCurrentPage = useCallback((page: number) => {
    if (externalPageNumber === undefined) {
      setInternalPage(page)
    }
    onPageChange?.(page)
    // Track navigation to this page
    if (enableSheetNavigation) {
      trackNavigation(documentId, page, fileName)
    }
  }, [externalPageNumber, onPageChange, enableSheetNavigation, trackNavigation, documentId, fileName])

  const [zoom, setZoom] = useState(100)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enableMarkup, setEnableMarkup] = useState(initialEnableMarkup)
  const [showPins, setShowPins] = useState(showDrawingPins)
  const [pageWidth, setPageWidth] = useState(800)
  const [pageHeight, setPageHeight] = useState(600)
  const pageContainerRef = useRef<HTMLDivElement>(null)

  // Current viewport for bookmarks
  const currentViewport: Viewport = useMemo(() => ({
    x: viewportPosition.x,
    y: viewportPosition.y,
    zoom: zoom / 100,
  }), [viewportPosition.x, viewportPosition.y, zoom])

  // Get recent sheets for the dropdown
  const recentSheets = useMemo(() => {
    if (!enableSheetNavigation) return []
    return getRecentSheets(5)
  }, [enableSheetNavigation, getRecentSheets])

  // Group documents by discipline for the sheet selector dropdown
  const documentsByDiscipline = useMemo(() => {
    if (!allDocuments || allDocuments.length === 0) return {}

    const groups: Record<string, DocumentType[]> = {}
    allDocuments.forEach((doc) => {
      const fileName = doc.file_name || doc.name || 'Untitled'
      // Extract discipline prefix (e.g., 'A' from 'A-101')
      const match = fileName.match(/^([A-Z]{1,2})[-\s]?\d/)
      const discipline = match ? match[1] : 'Other'
      if (!groups[discipline]) {
        groups[discipline] = []
      }
      groups[discipline].push(doc)
    })

    // Sort documents within each group
    Object.values(groups).forEach((docs) => {
      docs.sort((a, b) => {
        const aName = a.file_name || a.name || ''
        const bName = b.file_name || b.name || ''
        return aName.localeCompare(bName)
      })
    })

    return groups
  }, [allDocuments])

  // Handle back navigation
  const handleGoBack = useCallback(() => {
    if (canGoBack) {
      goBack()
    }
  }, [goBack, canGoBack])

  // Handle forward navigation
  const handleGoForward = useCallback(() => {
    if (canGoForward) {
      goForward()
    }
  }, [goForward, canGoForward])

  // Effect to navigate when currentSheet changes from back/forward
  useEffect(() => {
    if (currentSheet && onNavigateToDocument) {
      // Only navigate if it's a different document or page
      if (currentSheet.documentId !== documentId || currentSheet.pageNumber !== currentPage) {
        onNavigateToDocument(currentSheet.documentId, currentSheet.pageNumber)
      }
    }
  }, [currentSheet, documentId, currentPage, onNavigateToDocument])

  // Handle navigation from index panel or sheet selector
  const handleNavigateToSheet = useCallback((docId: string, page?: number) => {
    if (onNavigateToDocument) {
      onNavigateToDocument(docId, page)
    }
    setIsIndexPanelOpen(false)
  }, [onNavigateToDocument])

  // Handle bookmark navigation
  const handleBookmarkNavigate = useCallback((docId: string, page: number, viewport?: Viewport) => {
    if (onNavigateToDocument) {
      onNavigateToDocument(docId, page)
    }
    if (viewport) {
      setZoom(Math.round(viewport.zoom * 100))
      setViewportPosition({ x: viewport.x, y: viewport.y })
    }
  }, [onNavigateToDocument])

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
      // Alt+Left for back navigation
      if (e.altKey && e.key === 'ArrowLeft' && enableSheetNavigation) {
        e.preventDefault()
        if (canGoBack) {
          handleGoBack()
        }
        return
      }

      // Alt+Right for forward navigation
      if (e.altKey && e.key === 'ArrowRight' && enableSheetNavigation) {
        e.preventDefault()
        if (canGoForward) {
          handleGoForward()
        }
        return
      }

      // Regular left/right for page navigation (without Alt)
      if (e.key === 'ArrowRight' && !e.altKey) {
        goToNextPage()
      } else if (e.key === 'ArrowLeft' && !e.altKey) {
        goToPreviousPage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, numPages, enableSheetNavigation, canGoBack, canGoForward, handleGoBack, handleGoForward])

  // Track initial document load in navigation history
  useEffect(() => {
    if (enableSheetNavigation && documentId) {
      trackNavigation(documentId, currentPage, fileName)
    }
  }, []) // Only on initial mount

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col bg-background', height)}>
        {/* Toolbar */}
        <div className="bg-surface border-b border-gray-700 p-3 flex items-center justify-between flex-wrap gap-2">
          {/* Left side - Sheet Navigation & Page Navigation */}
          <div className="flex items-center gap-2">
            {/* Sheet Navigation Controls (Back/Forward, Index, Bookmarks) */}
            {enableSheetNavigation && (
              <>
                {/* Back/Forward buttons */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGoBack}
                      disabled={!canGoBack}
                      className="text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Go back (Alt+Left)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGoForward}
                      disabled={!canGoForward}
                      className="text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Go forward (Alt+Right)</TooltipContent>
                </Tooltip>

                {/* Drawing Index Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isIndexPanelOpen ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setIsIndexPanelOpen(!isIndexPanelOpen)}
                      className={isIndexPanelOpen ? '' : 'text-white hover:bg-gray-700'}
                    >
                      <List className="w-4 h-4 mr-1" />
                      Index
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Drawing Index</TooltipContent>
                </Tooltip>

                {/* Bookmarks Button */}
                <BookmarkManager
                  projectId={projectId}
                  documentId={documentId}
                  currentPage={currentPage}
                  currentViewport={currentViewport}
                  onNavigate={handleBookmarkNavigate}
                  variant="dropdown"
                />

                {/* Sheet Selector Dropdown */}
                {allDocuments.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-gray-700 max-w-[180px]"
                      >
                        <span className="truncate">
                          Sheet: {fileName.replace(/\.(pdf|png|jpg|jpeg)$/i, '')}
                        </span>
                        <ChevronDown className="w-3 h-3 ml-1 flex-shrink-0" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-72 max-h-[500px] overflow-y-auto bg-surface border-gray-700"
                    >
                      {/* Recent Sheets */}
                      {recentSheets.length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-xs text-gray-400">
                            Recent Sheets
                          </DropdownMenuLabel>
                          <DropdownMenuGroup>
                            {recentSheets.map((sheet) => (
                              <DropdownMenuItem
                                key={`recent-${sheet.documentId}-${sheet.pageNumber}`}
                                onClick={() => handleNavigateToSheet(sheet.documentId, sheet.pageNumber)}
                                className="text-gray-200 hover:bg-gray-700 cursor-pointer"
                              >
                                <span className="truncate">
                                  {sheet.sheetNumber || sheet.documentId}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  pg. {sheet.pageNumber}
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="bg-gray-700" />
                        </>
                      )}

                      {/* All Sheets by Discipline */}
                      <DropdownMenuLabel className="text-xs text-gray-400">
                        All Sheets
                      </DropdownMenuLabel>
                      {Object.entries(documentsByDiscipline).map(([discipline, docs]) => (
                        <DropdownMenuGroup key={discipline}>
                          <DropdownMenuLabel className="text-xs text-gray-500 py-1">
                            {discipline === 'A' && 'Architectural'}
                            {discipline === 'S' && 'Structural'}
                            {discipline === 'M' && 'Mechanical'}
                            {discipline === 'E' && 'Electrical'}
                            {discipline === 'P' && 'Plumbing'}
                            {discipline === 'C' && 'Civil'}
                            {discipline === 'L' && 'Landscape'}
                            {discipline === 'FP' && 'Fire Protection'}
                            {discipline === 'G' && 'General'}
                            {discipline === 'Other' && 'Other'}
                            {!['A', 'S', 'M', 'E', 'P', 'C', 'L', 'FP', 'G', 'Other'].includes(discipline) && discipline}
                          </DropdownMenuLabel>
                          {docs.map((doc) => (
                            <DropdownMenuItem
                              key={doc.id}
                              onClick={() => handleNavigateToSheet(doc.id)}
                              className={cn(
                                'text-gray-200 hover:bg-gray-700 cursor-pointer',
                                doc.id === documentId && 'bg-gray-700/50'
                              )}
                            >
                              <span className="truncate">
                                {(doc.file_name || doc.name || 'Untitled').replace(/\.(pdf|png|jpg|jpeg)$/i, '')}
                              </span>
                              {doc.id === documentId && (
                                <span className="text-xs text-primary ml-2">(current)</span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuGroup>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <div className="w-px h-4 bg-gray-600" />
              </>
            )}

            {/* Page Navigation (hidden when parent controls navigation) */}
            {!hidePageNavigation && (
              <>
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
              </>
            )}
          </div>

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

          {/* Drawing Pins toggle */}
          <div className="w-px h-4 bg-gray-600" />
          <Button
            variant={showPins ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setShowPins(!showPins)}
            title={showPins ? 'Hide RFI/Submittal pins' : 'Show RFI/Submittal pins'}
            className={showPins ? '' : 'text-white hover:bg-gray-700'}
          >
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div className="flex-1 overflow-auto bg-background p-4 flex items-center justify-center relative">
        {isLoading && (
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

        {!error && (
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

            {/* RFI/Submittal Pin Overlay */}
            {showPins && (
              <DrawingPinOverlay
                documentId={documentId}
                containerWidth={pageWidth}
                containerHeight={pageHeight}
                zoom={zoom}
                enableAddPin={!!onAddDrawingPin}
                onAddPin={onAddDrawingPin}
              />
            )}
          </div>
        )}
      </div>

      {/* Drawing Index Panel (overlay/sidebar) */}
      {enableSheetNavigation && (
        <DrawingIndexPanel
          documents={allDocuments}
          currentDocumentId={documentId}
          currentPage={currentPage}
          onNavigate={handleNavigateToSheet}
          isOpen={isIndexPanelOpen}
          onClose={() => setIsIndexPanelOpen(false)}
        />
      )}
    </div>
    </TooltipProvider>
  )
}
