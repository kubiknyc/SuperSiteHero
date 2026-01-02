// File: /src/features/documents/components/comparison/EnhancedVersionComparison.tsx
// Enhanced version comparison with synchronized zoom/pan, overlay mode, and change detection

import { useState, useRef, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { Document as DocumentType } from '@/types/database'
import { useCompareVersions } from '../../hooks/useDocumentComparison'

// PDF.js worker will be initialized lazily on component mount

interface EnhancedVersionComparisonProps {
  version1: DocumentType
  version2: DocumentType
  open: boolean
  onClose: () => void
  onTransferMarkups?: (fromVersionId: string, toVersionId: string) => void
}

type ViewMode = 'side-by-side' | 'overlay' | 'difference'
type BlendMode = 'normal' | 'difference' | 'multiply' | 'overlay'

const BLEND_MODE_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'difference', label: 'Difference' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'overlay', label: 'Overlay' },
]

export function EnhancedVersionComparison({
  version1,
  version2,
  open,
  onClose,
  onTransferMarkups,
}: EnhancedVersionComparisonProps) {
  // Determine older/newer versions
  const date1 = version1.created_at ? new Date(version1.created_at) : new Date(0)
  const date2 = version2.created_at ? new Date(version2.created_at) : new Date(0)
  const olderVersion = date1 < date2 ? version1 : version2
  const newerVersion = date1 < date2 ? version2 : version1

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')

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

  // Overlay settings
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettings>({
    opacity1: 50,
    opacity2: 50,
    blendMode: 'difference',
    showChangeHighlights: true,
    changeHighlightColor: '#FFD700',
  })

  // Real change detection using comparison hook
  const {
    data: comparisonResult,
    isLoading: isComparing,
    error: comparisonError,
  } = useCompareVersions(
    olderVersion.id,
    newerVersion.id,
    { pageNumber: currentPage1 }
  )

  // Extract change regions from comparison result
  const changeRegions = comparisonResult?.changeRegions || []
  const [showChangeRegions, setShowChangeRegions] = useState(true)

  // Loading states
  const [_loading1, setLoading1] = useState(true)
  const [_loading2, setLoading2] = useState(true)
  const [_pdfWorkerReady, setPdfWorkerReady] = useState(false)

  // Container ref for pan calculations
  const containerRef = useRef<HTMLDivElement>(null)

  // Initialize PDF.js worker lazily on component mount
  useEffect(() => {
    const initWorker = () => {
      if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
        // Use CDN version matching react-pdf's bundled pdfjs-dist version (5.4.296)
        // This avoids Vite bundler issues with worker file resolution
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/build/pdf.worker.min.mjs`
      }
      setPdfWorkerReady(true)
    }
    initWorker()
  }, [])

  // Synchronized page navigation
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
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25))
  }

  const handleResetView = () => {
    setZoom(100)
    setPosition({ x: 0, y: 0 })
  }

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) {return} // Only left click
    setIsPanning(true)
    lastPanPosition.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) {return}

    const dx = e.clientX - lastPanPosition.current.x
    const dy = e.clientY - lastPanPosition.current.y

    setPosition(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }))

    lastPanPosition.current = { x: e.clientX, y: e.clientY }
  }, [isPanning])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) {return}

      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn()
      } else if (e.key === '-') {
        handleZoomOut()
      } else if (e.key === '0') {
        handleResetView()
      } else if (e.key === 'ArrowRight') {
        handlePageChange(1, 'next')
      } else if (e.key === 'ArrowLeft') {
        handlePageChange(1, 'prev')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Check if files are PDFs
  const _isPdf1 = version1.file_type === 'application/pdf'
  const _isPdf2 = version2.file_type === 'application/pdf'

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b bg-surface flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  Version Comparison
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
                </div>

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
                title="Sync zoom and pan between views"
              >
                {syncZoomPan ? <Link2 className="w-4 h-4" /> : <Unlink2 className="w-4 h-4" />}
                <span className="ml-1 text-xs">Sync View</span>
              </Button>

              <Button
                size="sm"
                variant={syncPages ? 'default' : 'outline'}
                onClick={() => setSyncPages(!syncPages)}
                title="Sync page navigation"
              >
                {syncPages ? <Link2 className="w-4 h-4" /> : <Unlink2 className="w-4 h-4" />}
                <span className="ml-1 text-xs">Sync Pages</span>
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
                  {currentPage1} / {numPages1 || '?'}
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

            {/* Right: Comparison Status & Overlay Controls */}
            <div className="flex items-center gap-4">
              {/* Comparison Status */}
              {isComparing ? (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing changes...</span>
                </div>
              ) : comparisonError ? (
                <div className="flex items-center gap-2 text-sm text-error">
                  <AlertCircle className="w-4 h-4" />
                  <span>Comparison failed</span>
                </div>
              ) : comparisonResult ? (
                <div className="flex items-center gap-2">
                  <Badge variant={changeRegions.length > 0 ? 'default' : 'secondary'}>
                    {changeRegions.length} changes
                  </Badge>
                  {comparisonResult.overallChangePercentage > 0 && (
                    <span className="text-xs text-muted">
                      ({comparisonResult.overallChangePercentage.toFixed(1)}% changed)
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant={showChangeRegions ? 'default' : 'outline'}
                    onClick={() => setShowChangeRegions(!showChangeRegions)}
                    title="Toggle change highlighting"
                    className="h-7"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Highlights
                  </Button>
                </div>
              ) : null}

              {/* Overlay Controls (when in overlay mode) */}
              {viewMode === 'overlay' && (
                <>
                  <div className="w-px h-6 bg-gray-300" />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Older:</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overlaySettings.opacity1}
                      onChange={(e) => setOverlaySettings({
                        ...overlaySettings,
                        opacity1: parseInt(e.target.value),
                      })}
                      className="w-20"
                    />
                    <span className="text-xs w-8">{overlaySettings.opacity1}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Newer:</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={overlaySettings.opacity2}
                      onChange={(e) => setOverlaySettings({
                        ...overlaySettings,
                        opacity2: parseInt(e.target.value),
                      })}
                      className="w-20"
                    />
                    <span className="text-xs w-8">{overlaySettings.opacity2}%</span>
                  </div>

                  <Select
                    value={overlaySettings.blendMode}
                    onChange={(e) => setOverlaySettings({
                      ...overlaySettings,
                      blendMode: e.target.value as BlendMode,
                    })}
                    className="h-8 text-xs w-28"
                  >
                    {BLEND_MODE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div
            ref={containerRef}
            className={cn(
              'flex-1 overflow-hidden bg-background',
              isPanning && 'cursor-grabbing'
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {viewMode === 'side-by-side' ? (
              // Side by Side View
              <div className="grid grid-cols-2 h-full divide-x divide-gray-700">
                {/* Older Version */}
                <div className="relative overflow-hidden">
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-gray-700 text-white">
                      v{olderVersion.version} (Older)
                    </Badge>
                  </div>
                  <div
                    className="flex items-center justify-center h-full"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {isPdf1 ? (
                      <Document
                        file={olderVersion.file_url}
                        onLoadSuccess={({ numPages }) => {
                          setNumPages1(numPages)
                          setLoading1(false)
                        }}
                        loading={<LoadingSpinner />}
                      >
                        <Page
                          pageNumber={currentPage1}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                    ) : (
                      <img
                        src={olderVersion.file_url}
                        alt={`Version ${olderVersion.version}`}
                        className="max-w-full max-h-full"
                      />
                    )}
                  </div>
                </div>

                {/* Newer Version */}
                <div className="relative overflow-hidden">
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className="bg-primary text-white">
                      v{newerVersion.version} (Newer)
                    </Badge>
                  </div>
                  <div
                    className="flex items-center justify-center h-full"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {isPdf2 ? (
                      <Document
                        file={newerVersion.file_url}
                        onLoadSuccess={({ numPages }) => {
                          setNumPages2(numPages)
                          setLoading2(false)
                        }}
                        loading={<LoadingSpinner />}
                      >
                        <Page
                          pageNumber={currentPage2}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                    ) : (
                      <img
                        src={newerVersion.file_url}
                        alt={`Version ${newerVersion.version}`}
                        className="max-w-full max-h-full"
                      />
                    )}
                  </div>

                  {/* Change Region Highlights */}
                  {showChangeRegions && changeRegions.map(region => {
                    // Color-code based on change type
                    const colorClasses = {
                      added: 'border-green-500 bg-green-500/20',
                      removed: 'border-red-500 bg-red-500/20',
                      modified: 'border-yellow-400 bg-yellow-400/20',
                    }
                    const colorClass = colorClasses[region.changeType] || colorClasses.modified

                    return (
                      <div
                        key={region.id}
                        className={cn(
                          'absolute border-2 pointer-events-none transition-opacity',
                          colorClass
                        )}
                        style={{
                          left: region.x,
                          top: region.y,
                          width: region.width,
                          height: region.height,
                          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
                        }}
                        title={`${region.changeType}: ${region.description || 'Change detected'}`}
                      />
                    )
                  })}
                </div>
              </div>
            ) : (
              // Overlay View
              <div className="relative h-full flex items-center justify-center overflow-hidden">
                <div
                  className="relative"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Older version (bottom layer) */}
                  <div
                    className="absolute inset-0"
                    style={{
                      opacity: overlaySettings.opacity1 / 100,
                    }}
                  >
                    {isPdf1 ? (
                      <Document
                        file={olderVersion.file_url}
                        onLoadSuccess={({ numPages }) => setNumPages1(numPages)}
                        loading={<LoadingSpinner />}
                      >
                        <Page
                          pageNumber={currentPage1}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                    ) : (
                      <img
                        src={olderVersion.file_url}
                        alt={`Version ${olderVersion.version}`}
                      />
                    )}
                  </div>

                  {/* Newer version (top layer) */}
                  <div
                    style={{
                      opacity: overlaySettings.opacity2 / 100,
                      mixBlendMode: overlaySettings.blendMode,
                    }}
                  >
                    {isPdf2 ? (
                      <Document
                        file={newerVersion.file_url}
                        onLoadSuccess={({ numPages }) => setNumPages2(numPages)}
                        loading={<LoadingSpinner />}
                      >
                        <Page
                          pageNumber={currentPage2}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                        />
                      </Document>
                    ) : (
                      <img
                        src={newerVersion.file_url}
                        alt={`Version ${newerVersion.version}`}
                      />
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-black/70 text-white p-2 rounded text-xs">
                  <p>Older: Red/Magenta tones</p>
                  <p>Newer: Green/Cyan tones</p>
                  <p>Unchanged: Gray/Black</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer with Version Info */}
          <div className="p-3 border-t bg-surface flex-shrink-0">
            {/* Comparison Summary */}
            {comparisonResult && (
              <div className="mb-3 p-2 bg-card rounded border text-sm">
                <p className="text-secondary">{comparisonResult.summary}</p>
                {showChangeRegions && changeRegions.length > 0 && (
                  <div className="mt-2 flex gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-green-500/20 border border-green-500 rounded" />
                      Added ({changeRegions.filter(r => r.changeType === 'added').length})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-red-500/20 border border-red-500 rounded" />
                      Removed ({changeRegions.filter(r => r.changeType === 'removed').length})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-yellow-400/20 border border-yellow-400 rounded" />
                      Modified ({changeRegions.filter(r => r.changeType === 'modified').length})
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">v{olderVersion.version}</p>
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
                  <p className="font-medium">v{newerVersion.version}</p>
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

            {/* Transfer Markups Option */}
            {onTransferMarkups && (
              <div className="mt-3 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTransferMarkups(olderVersion.id, newerVersion.id)}
                >
                  Transfer Markups from v{olderVersion.version} to v{newerVersion.version}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
    </div>
  )
}

export default EnhancedVersionComparison
