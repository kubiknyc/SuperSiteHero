// File: /src/features/documents/components/comparison/MarkupVersionComparison.tsx
// Markup-focused version comparison with change visualization and markup tracking

import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  SplitSquareHorizontal,
  GitCompare,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Link2,
  Unlink2,
  AlertCircle,
  Loader2,
  FileText,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { Document as DocumentType } from '@/types/database'
import type { ChangeRegion } from '../../types/markup'
import { useCompareVersions } from '../../hooks/useDocumentComparison'
import { MarkupChangesList } from './MarkupChangesList'
import { MarkupDiffViewer } from './MarkupDiffViewer'

// PDF.js worker will be initialized lazily on component mount

interface MarkupVersionComparisonProps {
  version1: DocumentType
  version2: DocumentType
  open: boolean
  onClose: () => void
  onTransferMarkups?: (fromVersionId: string, toVersionId: string, markupIds?: string[]) => void
  onExportReport?: () => void
}

type ViewMode = 'side-by-side' | 'overlay' | 'diff'
type ChangeFilter = 'all' | 'added' | 'removed' | 'modified'

export function MarkupVersionComparison({
  version1,
  version2,
  open,
  onClose,
  onTransferMarkups,
  onExportReport,
}: MarkupVersionComparisonProps) {
  // Determine older/newer versions
  const date1 = version1.created_at ? new Date(version1.created_at) : new Date(0)
  const date2 = version2.created_at ? new Date(version2.created_at) : new Date(0)
  const olderVersion = date1 < date2 ? version1 : version2
  const newerVersion = date1 < date2 ? version2 : version1

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
  const [showChangesPanel, setShowChangesPanel] = useState(true)

  // Page navigation
  const [currentPage1, setCurrentPage1] = useState(1)
  const [currentPage2, setCurrentPage2] = useState(1)
  const [numPages1, setNumPages1] = useState<number | null>(null)
  const [numPages2, setNumPages2] = useState<number | null>(null)
  const [syncPages, setSyncPages] = useState(true)

  // Zoom and pan state
  const [zoom, setZoom] = useState(100)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [syncZoomPan, setSyncZoomPan] = useState(true)
  const [isPanning, setIsPanning] = useState(false)
  const lastPanPosition = useRef({ x: 0, y: 0 })

  // Change filtering
  const [changeFilter, setChangeFilter] = useState<ChangeFilter>('all')
  const [showChangeHighlights, setShowChangeHighlights] = useState(true)
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null)

  // Overlay settings
  const [overlayOpacity1, setOverlayOpacity1] = useState(50)
  const [overlayOpacity2, setOverlayOpacity2] = useState(50)

  // Comparison data
  const {
    data: comparisonResult,
    isLoading: isComparing,
    error: comparisonError,
  } = useCompareVersions(
    olderVersion.id,
    newerVersion.id,
    { pageNumber: syncPages ? Math.min(currentPage1, currentPage2) : currentPage1 }
  )

  // Extract and filter change regions
  const allChangeRegions = comparisonResult?.changeRegions || []
  const filteredChangeRegions = useMemo(() => {
    if (changeFilter === 'all') {return allChangeRegions}
    return allChangeRegions.filter(region => region.changeType === changeFilter)
  }, [allChangeRegions, changeFilter])

  // Container ref
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize PDF.js worker lazily on component mount
  useEffect(() => {
    const initWorker = () => {
      if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()
      }
    }
    initWorker()
  }, [])

  // Page navigation handlers
  const handlePageChange = (version: 1 | 2, direction: 'prev' | 'next') => {
    const currentPage = version === 1 ? currentPage1 : currentPage2
    const numPages = version === 1 ? numPages1 : numPages2
    const setPage = version === 1 ? setCurrentPage1 : setCurrentPage2

    if (!numPages) {return}

    const newPage = direction === 'next'
      ? Math.min(currentPage + 1, numPages)
      : Math.max(currentPage - 1, 1)

    setPage(newPage)

    if (syncPages) {
      const otherNumPages = version === 1 ? numPages2 : numPages1
      const otherSetPage = version === 1 ? setCurrentPage2 : setCurrentPage1
      if (otherNumPages) {
        otherSetPage(Math.min(newPage, otherNumPages))
      }
    }
  }

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25))
  const handleResetView = () => {
    setZoom(100)
    setPosition({ x: 0, y: 0 })
  }

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) {return}
    setIsPanning(true)
    lastPanPosition.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) {return}
    const dx = e.clientX - lastPanPosition.current.x
    const dy = e.clientY - lastPanPosition.current.y
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }))
    lastPanPosition.current = { x: e.clientX, y: e.clientY }
  }, [isPanning])

  const handleMouseUp = useCallback(() => setIsPanning(false), [])

  // Jump to change region
  const handleJumpToChange = (change: ChangeRegion) => {
    setSelectedChangeId(change.id)
    // Center the view on the change
    if (containerRef.current) {
      const centerX = -change.x * (zoom / 100) + containerRef.current.clientWidth / 2
      const centerY = -change.y * (zoom / 100) + containerRef.current.clientHeight / 2
      setPosition({ x: centerX, y: centerY })
    }
  }

  // Count changes by type
  const changeStats = useMemo(() => ({
    added: allChangeRegions.filter(r => r.changeType === 'added').length,
    removed: allChangeRegions.filter(r => r.changeType === 'removed').length,
    modified: allChangeRegions.filter(r => r.changeType === 'modified').length,
    total: allChangeRegions.length,
  }), [allChangeRegions])

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b bg-surface flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  Markup Version Comparison
                </DialogTitle>
                <p className="text-sm text-muted mt-1">
                  {olderVersion.name} - v{olderVersion.version} vs v{newerVersion.version}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('side-by-side')}
                    className={cn(
                      'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                      viewMode === 'side-by-side'
                        ? 'bg-card shadow text-primary'
                        : 'text-secondary hover:text-foreground'
                    )}
                  >
                    <SplitSquareHorizontal className="w-4 h-4 inline mr-1" />
                    Side by Side
                  </button>
                  <button
                    onClick={() => setViewMode('overlay')}
                    className={cn(
                      'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                      viewMode === 'overlay'
                        ? 'bg-card shadow text-primary'
                        : 'text-secondary hover:text-foreground'
                    )}
                  >
                    <Layers className="w-4 h-4 inline mr-1" />
                    Overlay
                  </button>
                  <button
                    onClick={() => setViewMode('diff')}
                    className={cn(
                      'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                      viewMode === 'diff'
                        ? 'bg-card shadow text-primary'
                        : 'text-secondary hover:text-foreground'
                    )}
                  >
                    <GitCompare className="w-4 h-4 inline mr-1" />
                    Diff View
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChangesPanel(!showChangesPanel)}
                >
                  <List className="w-4 h-4 mr-1" />
                  {showChangesPanel ? 'Hide' : 'Show'} Changes
                </Button>

                {onExportReport && (
                  <Button variant="outline" size="sm" onClick={onExportReport}>
                    <Download className="w-4 h-4 mr-1" />
                    Export Report
                  </Button>
                )}

                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Toolbar */}
          <div className="p-2 border-b bg-card flex items-center justify-between flex-shrink-0">
            {/* Left: Zoom Controls */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium w-14 text-center">{zoom}%</span>
              <Button size="sm" variant="outline" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleResetView}>
                <RotateCcw className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-gray-300 mx-2" />

              {/* Sync Controls */}
              <Button
                size="sm"
                variant={syncZoomPan ? 'default' : 'outline'}
                onClick={() => setSyncZoomPan(!syncZoomPan)}
                title="Sync zoom and pan"
              >
                {syncZoomPan ? <Link2 className="w-4 h-4" /> : <Unlink2 className="w-4 h-4" />}
              </Button>

              <Button
                size="sm"
                variant={syncPages ? 'default' : 'outline'}
                onClick={() => setSyncPages(!syncPages)}
                title="Sync pages"
              >
                <FileText className="w-4 h-4" />
              </Button>
            </div>

            {/* Center: Page Navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePageChange(1, 'prev')}
                  disabled={currentPage1 <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage1} / {numPages1 || '?'}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePageChange(1, 'next')}
                  disabled={!numPages1 || currentPage1 >= numPages1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right: Change Stats & Controls */}
            <div className="flex items-center gap-2">
              {isComparing ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </div>
              ) : comparisonError ? (
                <div className="flex items-center gap-2 text-sm text-error">
                  <AlertCircle className="w-4 h-4" />
                  Error
                </div>
              ) : comparisonResult ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-success">
                      {changeStats.added} Added
                    </Badge>
                    <Badge variant="default" className="bg-error">
                      {changeStats.removed} Removed
                    </Badge>
                    <Badge variant="default" className="bg-yellow-600">
                      {changeStats.modified} Modified
                    </Badge>
                  </div>
                  <div className="w-px h-6 bg-gray-300" />
                  <Button
                    size="sm"
                    variant={showChangeHighlights ? 'default' : 'outline'}
                    onClick={() => setShowChangeHighlights(!showChangeHighlights)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Highlights
                  </Button>
                </>
              ) : null}

              {/* Overlay opacity controls */}
              {viewMode === 'overlay' && (
                <>
                  <div className="w-px h-6 bg-gray-300" />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">v{olderVersion.version}:</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overlayOpacity1}
                      onChange={(e) => setOverlayOpacity1(parseInt(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-xs w-8">{overlayOpacity1}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">v{newerVersion.version}:</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overlayOpacity2}
                      onChange={(e) => setOverlayOpacity2(parseInt(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-xs w-8">{overlayOpacity2}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Document Viewer */}
            <div
              ref={containerRef}
              className={cn(
                'flex-1 overflow-hidden bg-background',
                isPanning && 'cursor-grabbing',
                !showChangesPanel && 'w-full'
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {viewMode === 'diff' ? (
                <MarkupDiffViewer
                  diffImageDataUrl={comparisonResult?.diffImageDataUrl}
                  changeRegions={filteredChangeRegions}
                  showHighlights={showChangeHighlights}
                  selectedChangeId={selectedChangeId}
                  zoom={zoom}
                  position={position}
                />
              ) : viewMode === 'side-by-side' ? (
                <div className="grid grid-cols-2 h-full divide-x divide-gray-700">
                  {/* Older Version */}
                  <DocumentView
                    document={olderVersion}
                    currentPage={currentPage1}
                    onLoadSuccess={({ numPages }) => setNumPages1(numPages)}
                    zoom={zoom}
                    position={position}
                    label={`v${olderVersion.version} (Older)`}
                    labelClassName="bg-gray-700"
                  />

                  {/* Newer Version with Change Highlights */}
                  <DocumentView
                    document={newerVersion}
                    currentPage={currentPage2}
                    onLoadSuccess={({ numPages }) => setNumPages2(numPages)}
                    zoom={zoom}
                    position={position}
                    label={`v${newerVersion.version} (Newer)`}
                    labelClassName="bg-primary"
                    changeRegions={showChangeHighlights ? filteredChangeRegions : []}
                    selectedChangeId={selectedChangeId}
                  />
                </div>
              ) : (
                <OverlayView
                  olderVersion={olderVersion}
                  newerVersion={newerVersion}
                  currentPage1={currentPage1}
                  currentPage2={currentPage2}
                  opacity1={overlayOpacity1}
                  opacity2={overlayOpacity2}
                  zoom={zoom}
                  position={position}
                  onLoadSuccess1={({ numPages }) => setNumPages1(numPages)}
                  onLoadSuccess2={({ numPages }) => setNumPages2(numPages)}
                />
              )}
            </div>

            {/* Changes Panel */}
            {showChangesPanel && (
              <div className="w-80 border-l bg-card flex-shrink-0 overflow-hidden">
                <MarkupChangesList
                  changeRegions={allChangeRegions}
                  filter={changeFilter}
                  onFilterChange={setChangeFilter}
                  selectedChangeId={selectedChangeId}
                  onSelectChange={handleJumpToChange}
                  changeStats={changeStats}
                  comparisonSummary={comparisonResult?.summary}
                  onTransferMarkups={onTransferMarkups ? () =>
                    onTransferMarkups(olderVersion.id, newerVersion.id)
                  : undefined}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-surface flex-shrink-0">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">v{olderVersion.version} (Older)</p>
                  <p className="text-xs text-muted">
                    {olderVersion.created_at
                      ? format(new Date(olderVersion.created_at), 'MMM d, yyyy h:mm a')
                      : 'Unknown date'}
                  </p>
                </div>
                <a
                  href={olderVersion.file_url}
                  download
                  className="text-primary hover:text-blue-800"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">v{newerVersion.version} (Newer)</p>
                  <p className="text-xs text-muted">
                    {newerVersion.created_at
                      ? format(new Date(newerVersion.created_at), 'MMM d, yyyy h:mm a')
                      : 'Unknown date'}
                  </p>
                </div>
                <a
                  href={newerVersion.file_url}
                  download
                  className="text-primary hover:text-blue-800"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Document View Component
interface DocumentViewProps {
  document: DocumentType
  currentPage: number
  onLoadSuccess: (info: { numPages: number }) => void
  zoom: number
  position: { x: number; y: number }
  label: string
  labelClassName: string
  changeRegions?: ChangeRegion[]
  selectedChangeId?: string | null
}

function DocumentView({
  document,
  currentPage,
  onLoadSuccess,
  zoom,
  position,
  label,
  labelClassName,
  changeRegions = [],
  selectedChangeId,
}: DocumentViewProps) {
  const isPdf = document.file_type === 'application/pdf'

  return (
    <div className="relative overflow-hidden">
      <div className={cn('absolute top-2 left-2 z-10')}>
        <Badge className={cn('text-white', labelClassName)}>{label}</Badge>
      </div>
      <div
        className="flex items-center justify-center h-full"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        {isPdf ? (
          <Document
            file={document.file_url}
            onLoadSuccess={onLoadSuccess}
            loading={<LoadingSpinner />}
          >
            <Page
              pageNumber={currentPage}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        ) : (
          <img
            src={document.file_url}
            alt={label}
            className="max-w-full max-h-full"
          />
        )}
      </div>

      {/* Change Region Highlights */}
      {changeRegions.map(region => {
        const colorClasses = {
          added: 'border-green-500 bg-green-500/20',
          removed: 'border-red-500 bg-red-500/20',
          modified: 'border-yellow-400 bg-yellow-400/20',
        }
        const isSelected = region.id === selectedChangeId
        const colorClass = colorClasses[region.changeType] || colorClasses.modified

        return (
          <div
            key={region.id}
            className={cn(
              'absolute border-2 pointer-events-none transition-all',
              colorClass,
              isSelected && 'border-4 shadow-lg animate-pulse'
            )}
            style={{
              left: region.x,
              top: region.y,
              width: region.width,
              height: region.height,
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
            }}
            title={region.description}
          />
        )
      })}
    </div>
  )
}

// Overlay View Component
interface OverlayViewProps {
  olderVersion: DocumentType
  newerVersion: DocumentType
  currentPage1: number
  currentPage2: number
  opacity1: number
  opacity2: number
  zoom: number
  position: { x: number; y: number }
  onLoadSuccess1: (info: { numPages: number }) => void
  onLoadSuccess2: (info: { numPages: number }) => void
}

function OverlayView({
  olderVersion,
  newerVersion,
  currentPage1,
  currentPage2,
  opacity1,
  opacity2,
  zoom,
  position,
  onLoadSuccess1,
  onLoadSuccess2,
}: OverlayViewProps) {
  const isPdf1 = olderVersion.file_type === 'application/pdf'
  const isPdf2 = newerVersion.file_type === 'application/pdf'

  return (
    <div className="relative h-full flex items-center justify-center overflow-hidden">
      <div
        className="relative"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Older version (bottom layer) */}
        <div className="absolute inset-0" style={{ opacity: opacity1 / 100 }}>
          {isPdf1 ? (
            <Document
              file={olderVersion.file_url}
              onLoadSuccess={onLoadSuccess1}
              loading={<LoadingSpinner />}
            >
              <Page
                pageNumber={currentPage1}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          ) : (
            <img src={olderVersion.file_url} alt="Older version" />
          )}
        </div>

        {/* Newer version (top layer) */}
        <div
          style={{
            opacity: opacity2 / 100,
            mixBlendMode: 'difference',
          }}
        >
          {isPdf2 ? (
            <Document
              file={newerVersion.file_url}
              onLoadSuccess={onLoadSuccess2}
              loading={<LoadingSpinner />}
            >
              <Page
                pageNumber={currentPage2}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          ) : (
            <img src={newerVersion.file_url} alt="Newer version" />
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded text-xs space-y-1">
        <p className="font-semibold">Overlay Legend:</p>
        <p>• Red/Magenta: Older version content</p>
        <p>• Green/Cyan: Newer version content</p>
        <p>• Gray/Black: Unchanged areas</p>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-white" />
    </div>
  )
}

export default MarkupVersionComparison
