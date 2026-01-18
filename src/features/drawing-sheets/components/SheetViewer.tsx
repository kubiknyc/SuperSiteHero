// File: /src/features/drawing-sheets/components/SheetViewer.tsx
// Full-screen sheet viewer with zoom, pan, and callout display

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Info,
  Link2,
  ExternalLink,
  X,
} from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { useDrawingSheet, useSheetCallouts } from '../hooks/useDrawingSheets'
import { CalloutOverlay } from './CalloutOverlay'
import type { DrawingSheet, SheetCallout } from '@/types/drawing-sheets'
import { DISCIPLINE_LABELS } from '@/types/drawing-sheets'

interface SheetViewerProps {
  sheetId: string
  onNavigateToSheet?: (sheetId: string) => void
  onClose?: () => void
  showCallouts?: boolean
  className?: string
}

/**
 * SheetViewer Component
 *
 * Full-featured drawing sheet viewer with:
 * - Pan and zoom controls
 * - Rotation support
 * - Callout overlay with clickable links
 * - Sheet metadata panel
 * - Navigation to linked sheets
 */
export function SheetViewer({
  sheetId,
  onNavigateToSheet,
  onClose,
  showCallouts = true,
  className,
}: SheetViewerProps) {
  const { data: sheet, isLoading: sheetLoading } = useDrawingSheet(sheetId)
  const { data: callouts, isLoading: calloutsLoading } = useSheetCallouts(
    showCallouts ? sheetId : undefined
  )

  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [selectedCallout, setSelectedCallout] = useState<SheetCallout | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25))
  const handleZoomReset = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  // Rotation
  const handleRotate = () => setRotation((r) => (r + 90) % 360)

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) {return}

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }, [isFullscreen])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) {return} // Only left click
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) {return}
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom((z) => Math.max(0.25, Math.min(4, z + delta)))
  }

  // Handle callout click
  const handleCalloutClick = (callout: SheetCallout) => {
    if (callout.target_sheet_id && onNavigateToSheet) {
      onNavigateToSheet(callout.target_sheet_id)
    } else {
      setSelectedCallout(callout)
    }
  }

  if (sheetLoading) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="w-3/4 h-3/4" />
        </div>
      </div>
    )
  }

  if (!sheet) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Sheet not found
      </div>
    )
  }

  const imageUrl = sheet.full_image_url || sheet.thumbnail_url

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col h-full bg-background',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">
            {sheet.sheet_number || `Page ${sheet.page_number}`}
          </h2>
          {sheet.title && (
            <span className="text-muted-foreground text-sm truncate max-w-xs">
              {sheet.title}
            </span>
          )}
          {sheet.discipline && (
            <Badge variant="secondary">{DISCIPLINE_LABELS[sheet.discipline]}</Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomReset}
            className="min-w-[60px]"
          >
            {Math.round(zoom * 100)}%
          </Button>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          {/* Rotation */}
          <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotate">
            <RotateCw className="h-4 w-4" />
          </Button>

          {/* Metadata toggle */}
          <Button
            variant={showMetadata ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setShowMetadata(!showMetadata)}
            title="Sheet info"
          >
            <Info className="h-4 w-4" />
          </Button>

          {/* Fullscreen */}
          <Button variant="ghost" size="icon" onClick={toggleFullscreen} title="Fullscreen">
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Close */}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} title="Close">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Image viewer */}
        <div
          className={cn(
            'flex-1 overflow-hidden relative bg-muted/30',
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {imageUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                }}
                className="relative"
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt={sheet.sheet_number || 'Sheet'}
                  className="max-w-none select-none"
                  draggable={false}
                />

                {/* Callout overlay */}
                {showCallouts && callouts && callouts.length > 0 && (
                  <CalloutOverlay
                    callouts={callouts}
                    onCalloutClick={handleCalloutClick}
                    selectedCalloutId={selectedCallout?.id}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No image available
            </div>
          )}
        </div>

        {/* Metadata panel */}
        {showMetadata && (
          <div className="w-80 border-l bg-background overflow-auto">
            <SheetMetadataPanel sheet={sheet} callouts={callouts || []} />
          </div>
        )}
      </div>

      {/* Callout detail popup */}
      {selectedCallout && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Callout</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setSelectedCallout(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Text</span>
                <p className="font-medium">{selectedCallout.callout_text}</p>
              </div>
              {selectedCallout.target_sheet_number && (
                <div>
                  <span className="text-xs text-muted-foreground">Target Sheet</span>
                  <p className="font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    {selectedCallout.target_sheet_number}
                    {selectedCallout.target_sheet_id ? (
                      <Badge variant="outline" className="text-xs">
                        Linked
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Not linked
                      </Badge>
                    )}
                  </p>
                </div>
              )}
              {selectedCallout.target_sheet_id && onNavigateToSheet && (
                <Button
                  size="sm"
                  onClick={() => {
                    onNavigateToSheet(selectedCallout.target_sheet_id!)
                    setSelectedCallout(null)
                  }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Go to sheet
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Metadata panel component
function SheetMetadataPanel({
  sheet,
  callouts,
}: {
  sheet: DrawingSheet
  callouts: SheetCallout[]
}) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold">Sheet Details</h3>

      <div className="space-y-3 text-sm">
        <MetadataItem label="Sheet Number" value={sheet.sheet_number} />
        <MetadataItem label="Title" value={sheet.title} />
        <MetadataItem
          label="Discipline"
          value={sheet.discipline ? DISCIPLINE_LABELS[sheet.discipline] : null}
        />
        <MetadataItem label="Scale" value={sheet.scale} />
        <MetadataItem label="Revision" value={sheet.revision} />
        <MetadataItem label="Revision Date" value={sheet.revision_date} />
        <MetadataItem label="Page Number" value={sheet.page_number?.toString()} />
        <MetadataItem
          label="AI Confidence"
          value={
            sheet.ai_confidence_score
              ? `${Math.round(sheet.ai_confidence_score * 100)}%`
              : null
          }
        />
      </div>

      {/* Callouts section */}
      {callouts.length > 0 && (
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">
            Callouts ({callouts.length})
          </h4>
          <div className="space-y-2">
            {callouts.map((callout) => (
              <div
                key={callout.id}
                className="text-sm p-2 rounded bg-muted/50 flex items-center gap-2"
              >
                <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{callout.callout_text}</span>
                {callout.is_verified && (
                  <Badge variant="outline" className="text-xs ml-auto">
                    Verified
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Metadata item component
function MetadataItem({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) {return null}

  return (
    <div>
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="font-medium">{value}</p>
    </div>
  )
}
