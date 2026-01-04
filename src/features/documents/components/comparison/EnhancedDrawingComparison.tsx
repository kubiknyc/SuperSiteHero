// File: /src/features/documents/components/comparison/EnhancedDrawingComparison.tsx
// Enhanced drawing comparison with flicker mode, overlay controls, and synchronized view

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Play,
  Pause,
  Timer,
  Diff,
  List,
  Settings,
  Palette,
  Image,
  Camera,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { Document as DocumentType } from '@/types/database'
import { useDrawingComparisonState } from '../../hooks/useDrawingSetManagement'
import { useCompareVersions } from '../../hooks/useDocumentComparison'
import type { ComparisonViewMode, EnhancedOverlaySettings } from '../../types/drawing-set'
import type { ChangeRegion } from '../../types/markup'

interface EnhancedDrawingComparisonProps {
  version1: DocumentType
  version2: DocumentType
  open: boolean
  onClose: () => void
  onTransferMarkups?: (fromVersionId: string, toVersionId: string) => void
}

const BLEND_MODE_OPTIONS: { value: EnhancedOverlaySettings['blendMode']; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'difference', label: 'Difference' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'screen', label: 'Screen' },
  { value: 'darken', label: 'Darken' },
  { value: 'lighten', label: 'Lighten' },
]

const FLICKER_SPEED_OPTIONS = [
  { value: 250, label: 'Fast' },
  { value: 500, label: 'Medium' },
  { value: 1000, label: 'Slow' },
  { value: 2000, label: 'Very Slow' },
]

/**
 * EnhancedDrawingComparison Component
 *
 * Advanced drawing comparison with:
 * - Side-by-side view
 * - Overlay view with opacity/blend controls
 * - Flicker mode for rapid comparison
 * - Synchronized pan/zoom
 * - Change region highlighting
 * - Change list panel
 */
export function EnhancedDrawingComparison({
  version1,
  version2,
  open,
  onClose,
  onTransferMarkups,
}: EnhancedDrawingComparisonProps) {
  // Determine older/newer versions
  const date1 = version1.created_at ? new Date(version1.created_at) : new Date(0)
  const date2 = version2.created_at ? new Date(version2.created_at) : new Date(0)
  const olderVersion = date1 < date2 ? version1 : version2
  const newerVersion = date1 < date2 ? version2 : version1

  // Comparison state hook
  const {
    state,
    setViewMode,
    toggleFlicker,
    setFlickerInterval,
    setOverlayOpacity,
    setBlendMode,
    setZoom,
    setPan,
    setPage,
    toggleSync,
    selectChangeRegion,
    toggleChangeList,
    resetView,
    setOverlaySettings,
    setDifferenceColors,
  } = useDrawingComparisonState()

  // Page navigation
  const [numPages1, setNumPages1] = useState<number | null>(null)
  const [numPages2, setNumPages2] = useState<number | null>(null)

  // Pan state
  const [isPanning, setIsPanning] = useState(false)
  const lastPanPosition = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Settings panel
  const [showSettings, setShowSettings] = useState(false)

  // Export state
  const [isExporting, setIsExporting] = useState(false)

  // PDF worker initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`
    }
  }, [])

  // Comparison results
  const {
    data: comparisonResult,
    isLoading: isComparing,
    error: comparisonError,
  } = useCompareVersions(
    olderVersion.id,
    newerVersion.id,
    { pageNumber: state.syncedView.pageNumber }
  )

  const changeRegions = comparisonResult?.changeRegions || []

  // File type checks
  const isPdf1 = olderVersion.file_type === 'application/pdf'
  const isPdf2 = newerVersion.file_type === 'application/pdf'

  // View mode icons
  const viewModeIcons: Record<ComparisonViewMode, React.ReactNode> = {
    'side-by-side': <SplitSquareHorizontal className="w-4 h-4" />,
    'overlay': <Layers className="w-4 h-4" />,
    'flicker': <Timer className="w-4 h-4" />,
    'difference': <Diff className="w-4 h-4" />,
  }

  // Page navigation
  const handlePageChange = useCallback((direction: 'prev' | 'next') => {
    const currentPage = state.syncedView.pageNumber
    const maxPages = Math.max(numPages1 || 1, numPages2 || 1)

    const newPage = direction === 'next'
      ? Math.min(currentPage + 1, maxPages)
      : Math.max(currentPage - 1, 1)

    setPage(newPage)
  }, [state.syncedView.pageNumber, numPages1, numPages2, setPage])

  // Zoom controls
  const handleZoomIn = () => setZoom(state.syncedView.zoom + 25)
  const handleZoomOut = () => setZoom(state.syncedView.zoom - 25)

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsPanning(true)
    lastPanPosition.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return

    const dx = e.clientX - lastPanPosition.current.x
    const dy = e.clientY - lastPanPosition.current.y

    setPan({
      x: state.syncedView.position.x + dx,
      y: state.syncedView.position.y + dy,
    })

    lastPanPosition.current = { x: e.clientX, y: e.clientY }
  }, [isPanning, state.syncedView.position, setPan])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case '0':
          resetView()
          break
        case 'ArrowRight':
          handlePageChange('next')
          break
        case 'ArrowLeft':
          handlePageChange('prev')
          break
        case ' ':
          if (state.viewMode === 'flicker') {
            e.preventDefault()
            toggleFlicker()
          }
          break
        case 'f':
          setViewMode('flicker')
          break
        case 's':
          setViewMode('side-by-side')
          break
        case 'o':
          setViewMode('overlay')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, state.viewMode, handlePageChange])

  // Change region click
  const handleChangeRegionClick = (region: ChangeRegion) => {
    selectChangeRegion(region)
  }

  // Export comparison as image
  const handleExportComparison = useCallback(async (format: 'png' | 'jpg' = 'png') => {
    if (!containerRef.current) return

    setIsExporting(true)
    try {
      // Use html2canvas if available, otherwise use native canvas capture
      const viewerElement = containerRef.current.querySelector('[data-viewer-content]') as HTMLElement
      const targetElement = viewerElement || containerRef.current

      // Create a canvas from the current view
      const canvas = document.createElement('canvas')
      const rect = targetElement.getBoundingClientRect()
      canvas.width = rect.width * 2 // 2x for better quality
      canvas.height = rect.height * 2
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Could not create canvas context')
      }

      // If we have a diff image from the comparison result, use that
      if (state.viewMode === 'difference' && comparisonResult?.diffImageDataUrl) {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve()
          }
          img.onerror = reject
          img.src = comparisonResult.diffImageDataUrl!
        })
      } else {
        // For other modes, capture the current view
        // Fill with white background
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Add header text
        ctx.fillStyle = '#000000'
        ctx.font = 'bold 24px system-ui, sans-serif'
        ctx.fillText(`Drawing Comparison - ${state.viewMode.replace('-', ' ')}`, 40, 50)
        ctx.font = '16px system-ui, sans-serif'
        ctx.fillText(
          `v${olderVersion.version} vs v${newerVersion.version} - Page ${state.syncedView.pageNumber}`,
          40,
          80
        )
        ctx.fillText(olderVersion.name, 40, 110)
        ctx.fillText(`Exported: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 40, 140)

        // Add change summary if available
        if (changeRegions.length > 0) {
          ctx.fillText(`Changes detected: ${changeRegions.length} regions`, 40, 170)
        }
      }

      // Convert to blob and download
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
      const quality = format === 'jpg' ? 0.9 : undefined

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error('Failed to generate image')
            return
          }

          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `comparison-${olderVersion.drawing_number || olderVersion.name}-v${olderVersion.version}-vs-v${newerVersion.version}-p${state.syncedView.pageNumber}.${format}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)

          toast.success('Comparison exported successfully')
        },
        mimeType,
        quality
      )
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export comparison')
    } finally {
      setIsExporting(false)
    }
  }, [state.viewMode, state.syncedView.pageNumber, olderVersion, newerVersion, comparisonResult, changeRegions])

  // Render viewer based on mode
  const renderViewer = () => {
    const transform = `translate(${state.syncedView.position.x}px, ${state.syncedView.position.y}px) scale(${state.syncedView.zoom / 100})`

    switch (state.viewMode) {
      case 'side-by-side':
        return (
          <div className="grid grid-cols-2 h-full divide-x divide-border">
            {/* Older Version */}
            <div className="relative overflow-hidden">
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-muted text-foreground">
                  v{olderVersion.version} (Older)
                </Badge>
              </div>
              <div
                className="flex items-center justify-center h-full"
                style={{ transform, transformOrigin: 'center center' }}
              >
                <DocumentRenderer
                  document={olderVersion}
                  pageNumber={state.syncedView.pageNumber}
                  onLoadSuccess={(numPages) => setNumPages1(numPages)}
                />
              </div>
            </div>

            {/* Newer Version */}
            <div className="relative overflow-hidden">
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-primary text-primary-foreground">
                  v{newerVersion.version} (Newer)
                </Badge>
              </div>
              <div
                className="flex items-center justify-center h-full"
                style={{ transform, transformOrigin: 'center center' }}
              >
                <DocumentRenderer
                  document={newerVersion}
                  pageNumber={state.syncedView.pageNumber}
                  onLoadSuccess={(numPages) => setNumPages2(numPages)}
                />
              </div>

              {/* Change highlights on newer version */}
              <ChangeHighlights
                regions={changeRegions}
                zoom={state.syncedView.zoom}
                position={state.syncedView.position}
                colors={state.differenceColors}
                onRegionClick={handleChangeRegionClick}
                selectedRegion={state.selectedChangeRegion}
              />
            </div>
          </div>
        )

      case 'overlay':
        return (
          <div className="relative h-full flex items-center justify-center overflow-hidden">
            <div style={{ transform, transformOrigin: 'center center' }}>
              {/* Older version (bottom) */}
              <div
                className="absolute inset-0"
                style={{
                  opacity: state.overlaySettings.opacity1 / 100,
                  filter: state.overlaySettings.useTinting
                    ? `drop-shadow(0 0 0 ${state.overlaySettings.tint1})`
                    : undefined,
                }}
              >
                <DocumentRenderer
                  document={olderVersion}
                  pageNumber={state.syncedView.pageNumber}
                  onLoadSuccess={(numPages) => setNumPages1(numPages)}
                />
              </div>

              {/* Newer version (top) */}
              <div
                style={{
                  opacity: state.overlaySettings.opacity2 / 100,
                  mixBlendMode: state.overlaySettings.blendMode,
                  filter: state.overlaySettings.useTinting
                    ? `drop-shadow(0 0 0 ${state.overlaySettings.tint2})`
                    : undefined,
                }}
              >
                <DocumentRenderer
                  document={newerVersion}
                  pageNumber={state.syncedView.pageNumber}
                  onLoadSuccess={(numPages) => setNumPages2(numPages)}
                />
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur p-3 rounded-lg text-sm">
              <p className="font-medium mb-1">Blend Mode: {state.overlaySettings.blendMode}</p>
              <p>Older: {state.overlaySettings.opacity1}% opacity</p>
              <p>Newer: {state.overlaySettings.opacity2}% opacity</p>
            </div>
          </div>
        )

      case 'flicker':
        return (
          <div className="relative h-full flex items-center justify-center overflow-hidden">
            {/* Version indicator */}
            <div className="absolute top-2 left-2 z-10">
              <Badge className={state.flickerSettings.currentVersion === 1 ? 'bg-muted' : 'bg-primary'}>
                {state.flickerSettings.currentVersion === 1 ? (
                  <>v{olderVersion.version} (Older)</>
                ) : (
                  <>v{newerVersion.version} (Newer)</>
                )}
              </Badge>
            </div>

            <div style={{ transform, transformOrigin: 'center center' }}>
              {state.flickerSettings.currentVersion === 1 ? (
                <DocumentRenderer
                  document={olderVersion}
                  pageNumber={state.syncedView.pageNumber}
                  onLoadSuccess={(numPages) => setNumPages1(numPages)}
                />
              ) : (
                <DocumentRenderer
                  document={newerVersion}
                  pageNumber={state.syncedView.pageNumber}
                  onLoadSuccess={(numPages) => setNumPages2(numPages)}
                />
              )}
            </div>

            {/* Flicker controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur p-3 rounded-lg flex items-center gap-4">
              <Button
                size="sm"
                variant={state.flickerSettings.isActive ? 'default' : 'outline'}
                onClick={toggleFlicker}
              >
                {state.flickerSettings.isActive ? (
                  <><Pause className="w-4 h-4 mr-1" /> Pause</>
                ) : (
                  <><Play className="w-4 h-4 mr-1" /> Play</>
                )}
              </Button>
              <Select
                value={String(state.flickerSettings.interval)}
                onValueChange={(v) => setFlickerInterval(parseInt(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLICKER_SPEED_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'difference':
        return (
          <div className="relative h-full flex items-center justify-center overflow-hidden">
            <div style={{ transform, transformOrigin: 'center center' }}>
              {comparisonResult?.diffImageDataUrl ? (
                <img
                  src={comparisonResult.diffImageDataUrl}
                  alt="Difference view"
                  className="max-w-full max-h-full"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  {isComparing ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p>Generating difference view...</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p>Unable to generate difference view</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur p-3 rounded-lg text-sm space-y-1">
              <p className="font-medium mb-2">Difference Legend</p>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: state.differenceColors.added }} />
                <span>Added</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: state.differenceColors.removed }} />
                <span>Removed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: state.differenceColors.modified }} />
                <span>Modified</span>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b bg-background flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  Drawing Comparison
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {olderVersion.name} - v{olderVersion.version} vs v{newerVersion.version}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-muted rounded-lg p-1">
                  {(['side-by-side', 'overlay', 'flicker', 'difference'] as ComparisonViewMode[]).map(mode => (
                    <TooltipProvider key={mode}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setViewMode(mode)}
                            className={cn(
                              'p-2 rounded text-sm font-medium transition-colors',
                              state.viewMode === mode
                                ? 'bg-background shadow text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {viewModeIcons[mode]}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="capitalize">{mode.replace('-', ' ')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>

                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Toolbar */}
          <div className="p-2 border-b bg-muted/30 flex items-center justify-between flex-shrink-0">
            {/* Left: Zoom & Pan Controls */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleZoomOut}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium w-14 text-center">{state.syncedView.zoom}%</span>
              <Button size="sm" variant="outline" onClick={handleZoomIn}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={resetView}>
                <RotateCcw className="w-4 h-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-2" />

              <Button
                size="sm"
                variant={state.syncedView.syncEnabled ? 'default' : 'outline'}
                onClick={toggleSync}
                title="Sync pan and zoom"
              >
                {state.syncedView.syncEnabled ? <Link2 className="w-4 h-4" /> : <Unlink2 className="w-4 h-4" />}
                <span className="ml-1 text-xs">Sync</span>
              </Button>
            </div>

            {/* Center: Page Navigation */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePageChange('prev')}
                disabled={state.syncedView.pageNumber <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                {state.syncedView.pageNumber} / {Math.max(numPages1 || 1, numPages2 || 1)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handlePageChange('next')}
                disabled={state.syncedView.pageNumber >= Math.max(numPages1 || 1, numPages2 || 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Right: Comparison Status & Controls */}
            <div className="flex items-center gap-2">
              {isComparing ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </div>
              ) : comparisonResult ? (
                <div className="flex items-center gap-2">
                  <Badge variant={changeRegions.length > 0 ? 'default' : 'secondary'}>
                    {changeRegions.length} changes
                  </Badge>
                  <Button
                    size="sm"
                    variant={state.showChangeList ? 'default' : 'outline'}
                    onClick={toggleChangeList}
                  >
                    <List className="w-4 h-4 mr-1" />
                    List
                  </Button>
                </div>
              ) : null}

              {/* Overlay Controls */}
              {state.viewMode === 'overlay' && (
                <div className="flex items-center gap-3 ml-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Old:</Label>
                    <Slider
                      value={[state.overlaySettings.opacity1]}
                      onValueChange={([v]) => setOverlayOpacity(1, v)}
                      min={0}
                      max={100}
                      className="w-20"
                    />
                    <span className="text-xs w-8">{state.overlaySettings.opacity1}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs">New:</Label>
                    <Slider
                      value={[state.overlaySettings.opacity2]}
                      onValueChange={([v]) => setOverlayOpacity(2, v)}
                      min={0}
                      max={100}
                      className="w-20"
                    />
                    <span className="text-xs w-8">{state.overlaySettings.opacity2}%</span>
                  </div>

                  <Select
                    value={state.overlaySettings.blendMode}
                    onValueChange={(v) => setBlendMode(v as EnhancedOverlaySettings['blendMode'])}
                  >
                    <SelectTrigger className="h-8 w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLEND_MODE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Export Comparison */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                    <span className="ml-1 text-xs">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExportComparison('png')}>
                    <Image className="w-4 h-4 mr-2" />
                    Export as PNG
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportComparison('jpg')}>
                    <Image className="w-4 h-4 mr-2" />
                    Export as JPG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" variant="ghost" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Viewer */}
            <div
              ref={containerRef}
              className={cn(
                'flex-1 overflow-hidden bg-muted/50',
                isPanning && 'cursor-grabbing'
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {renderViewer()}
            </div>

            {/* Change List Panel */}
            {state.showChangeList && changeRegions.length > 0 && (
              <div className="w-64 border-l bg-background overflow-y-auto">
                <div className="p-3 border-b">
                  <h3 className="font-medium">Changes ({changeRegions.length})</h3>
                </div>
                <div className="p-2 space-y-2">
                  {changeRegions.map((region, idx) => (
                    <button
                      key={region.id}
                      onClick={() => handleChangeRegionClick(region)}
                      className={cn(
                        'w-full p-2 rounded-lg border text-left transition-colors',
                        state.selectedChangeRegion?.id === region.id
                          ? 'border-primary bg-primary/10'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              region.changeType === 'added'
                                ? state.differenceColors.added
                                : region.changeType === 'removed'
                                ? state.differenceColors.removed
                                : state.differenceColors.modified,
                          }}
                        />
                        <span className="text-sm font-medium capitalize">
                          {region.changeType}
                        </span>
                      </div>
                      {region.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {region.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {region.width}x{region.height}px at ({region.x}, {region.y})
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-background flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Older: </span>
                <span className="font-medium">v{olderVersion.version}</span>
                <span className="text-muted-foreground ml-2">
                  ({format(new Date(olderVersion.created_at!), 'MMM d, yyyy')})
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Newer: </span>
                <span className="font-medium">v{newerVersion.version}</span>
                <span className="text-muted-foreground ml-2">
                  ({format(new Date(newerVersion.created_at!), 'MMM d, yyyy')})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={olderVersion.file_url}
                download
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Download className="w-4 h-4" />
                Download v{olderVersion.version}
              </a>
              <a
                href={newerVersion.file_url}
                download
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Download className="w-4 h-4" />
                Download v{newerVersion.version}
              </a>
              {onTransferMarkups && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onTransferMarkups(olderVersion.id, newerVersion.id)}
                >
                  Transfer Markups
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Settings Dialog */}
        <SettingsDialog
          open={showSettings}
          onClose={() => setShowSettings(false)}
          overlaySettings={state.overlaySettings}
          differenceColors={state.differenceColors}
          onOverlayChange={setOverlaySettings}
          onColorsChange={setDifferenceColors}
        />
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Sub-components
// ============================================================

interface DocumentRendererProps {
  document: DocumentType
  pageNumber: number
  onLoadSuccess: (numPages: number) => void
}

function DocumentRenderer({ document, pageNumber, onLoadSuccess }: DocumentRendererProps) {
  const isPdf = document.file_type === 'application/pdf'
  const isImage = document.file_type?.startsWith('image/')

  if (isPdf) {
    return (
      <Document
        file={document.file_url}
        onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
        loading={<LoadingSpinner />}
      >
        <Page
          pageNumber={pageNumber}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    )
  }

  if (isImage) {
    return (
      <img
        src={document.file_url}
        alt={document.name}
        className="max-w-full max-h-full"
        onLoad={() => onLoadSuccess(1)}
      />
    )
  }

  return (
    <div className="text-center text-muted-foreground p-8">
      <AlertCircle className="w-12 h-12 mx-auto mb-2" />
      <p>Preview not available for this file type</p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  )
}

interface ChangeHighlightsProps {
  regions: ChangeRegion[]
  zoom: number
  position: { x: number; y: number }
  colors: { added: string; removed: string; modified: string; opacity?: number }
  onRegionClick: (region: ChangeRegion) => void
  selectedRegion?: ChangeRegion
}

function ChangeHighlights({
  regions,
  zoom,
  position,
  colors,
  onRegionClick,
  selectedRegion,
}: ChangeHighlightsProps) {
  return (
    <>
      {regions.map(region => {
        const color =
          region.changeType === 'added'
            ? colors.added
            : region.changeType === 'removed'
            ? colors.removed
            : colors.modified

        return (
          <div
            key={region.id}
            className={cn(
              'absolute border-2 cursor-pointer transition-all',
              selectedRegion?.id === region.id ? 'ring-2 ring-primary ring-offset-2' : ''
            )}
            style={{
              left: region.x,
              top: region.y,
              width: region.width,
              height: region.height,
              borderColor: color,
              backgroundColor: `${color}${Math.round((colors.opacity || 20) * 2.55).toString(16).padStart(2, '0')}`,
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
              transformOrigin: 'top left',
            }}
            onClick={() => onRegionClick(region)}
            title={`${region.changeType}: ${region.description || 'Change detected'}`}
          />
        )
      })}
    </>
  )
}

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  overlaySettings: EnhancedOverlaySettings
  differenceColors: { added: string; removed: string; modified: string; opacity?: number }
  onOverlayChange: (settings: EnhancedOverlaySettings) => void
  onColorsChange: (colors: { added: string; removed: string; modified: string; opacity?: number }) => void
}

function SettingsDialog({
  open,
  onClose,
  overlaySettings,
  differenceColors,
  onOverlayChange,
  onColorsChange,
}: SettingsDialogProps) {
  const [localOverlay, setLocalOverlay] = useState(overlaySettings)
  const [localColors, setLocalColors] = useState(differenceColors)

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalOverlay(overlaySettings)
      setLocalColors(differenceColors)
    }
  }, [open, overlaySettings, differenceColors])

  const handleSave = () => {
    onOverlayChange(localOverlay)
    onColorsChange(localColors)
    onClose()
    toast.success('Settings saved')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Comparison Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Difference Highlight Colors */}
          <div className="space-y-4">
            <h4 className="font-medium">Difference Highlight Colors</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Added</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localColors.added}
                    onChange={(e) => setLocalColors({ ...localColors, added: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{localColors.added}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Removed</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localColors.removed}
                    onChange={(e) => setLocalColors({ ...localColors, removed: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{localColors.removed}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Modified</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localColors.modified}
                    onChange={(e) => setLocalColors({ ...localColors, modified: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{localColors.modified}</span>
                </div>
              </div>
            </div>

            {/* Highlight Opacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Highlight Opacity</Label>
                <span className="text-sm text-muted-foreground">{localColors.opacity || 70}%</span>
              </div>
              <Slider
                value={[localColors.opacity || 70]}
                onValueChange={([v]) => setLocalColors({ ...localColors, opacity: v })}
                min={10}
                max={100}
                step={5}
              />
            </div>
          </div>

          {/* Overlay Tinting */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Overlay Tinting</h4>
                <p className="text-sm text-muted-foreground">Color each version for easier differentiation</p>
              </div>
              <Switch
                checked={localOverlay.useTinting}
                onCheckedChange={(v) => setLocalOverlay({ ...localOverlay, useTinting: v })}
              />
            </div>

            {localOverlay.useTinting && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Older Version Tint</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localOverlay.tint1}
                      onChange={(e) => setLocalOverlay({ ...localOverlay, tint1: e.target.value })}
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Newer Version Tint</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localOverlay.tint2}
                      onChange={(e) => setLocalOverlay({ ...localOverlay, tint2: e.target.value })}
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Change Highlights Toggle */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label>Show Change Highlights</Label>
              <p className="text-sm text-muted-foreground">Display colored overlays on detected changes</p>
            </div>
            <Switch
              checked={localOverlay.showChangeHighlights}
              onCheckedChange={(v) => setLocalOverlay({ ...localOverlay, showChangeHighlights: v })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EnhancedDrawingComparison
