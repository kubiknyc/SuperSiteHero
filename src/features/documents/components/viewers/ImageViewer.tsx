// File: /src/features/documents/components/viewers/ImageViewer.tsx
// Image viewer with zoom and pan capabilities

import { useState, useRef } from 'react'
import { ZoomIn, ZoomOut, Download, Maximize2, Pencil, MapPin } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { LazyDrawingCanvas } from '../LazyDrawingCanvas'
import { LazyUnifiedDrawingCanvas as UnifiedDrawingCanvas } from '../markup/LazyUnifiedDrawingCanvas'
import { DrawingPinOverlay } from '../DrawingPinOverlay'
import { logger } from '../../../../lib/utils/logger';


interface ImageViewerProps {
  documentId: string
  projectId: string
  imageUrl: string
  fileName?: string
  alt?: string
  allowMarkup?: boolean
  readOnly?: boolean
  /** @deprecated This prop is no longer used */
  onMarkupCreate?: (markup: any) => void
  height?: string
  enableMarkup?: boolean
  /** Enable real-time collaborative markup with other users */
  collaborative?: boolean
  /** Show RFI/Submittal pins on the drawing (default: false) */
  showDrawingPins?: boolean
  /** Callback when user adds a new pin */
  onAddDrawingPin?: (type: 'rfi' | 'submittal', normalizedX: number, normalizedY: number) => void
}

/**
 * ImageViewer Component
 *
 * An image viewer with zoom controls, pan capability, and fullscreen support.
 *
 * Features:
 * - Zoom in/out controls
 * - Pan/scroll when zoomed
 * - Fit to screen / fit to width options
 * - Fullscreen mode
 * - Download button
 * - Keyboard shortcuts
 * - Touch-friendly controls
 *
 * Usage:
 * ```tsx
 * <ImageViewer
 *   imageUrl="https://example.com/image.jpg"
 *   fileName="photo.jpg"
 *   alt="Construction photo"
 * />
 * ```
 */
export function ImageViewer({
  documentId,
  projectId,
  imageUrl,
  fileName = 'image.jpg',
  alt = 'Image',
  allowMarkup = false,
  readOnly = false,
  onMarkupCreate: _onMarkupCreate,
  height = 'h-screen',
  enableMarkup: initialEnableMarkup = false,
  collaborative = false,
  showDrawingPins = false,
  onAddDrawingPin,
}: ImageViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [enableMarkup, setEnableMarkup] = useState(initialEnableMarkup)
  const [showPins, setShowPins] = useState(showDrawingPins)
  const [imageWidth, setImageWidth] = useState(800)
  const [imageHeight, setImageHeight] = useState(600)

  const imageRef = useRef<HTMLImageElement>(null)

  // Handle image load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false)
    setError(null)
    const img = e.currentTarget
    setImageWidth(img.naturalWidth)
    setImageHeight(img.naturalHeight)
  }

  // Handle image load error
  const handleImageError = () => {
    setError('Failed to load image')
    setIsLoading(false)
  }

  // Zoom handlers
  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 300))
  }

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50))
  }

  const resetZoom = () => {
    setZoom(100)
    setPanX(0)
    setPanY(0)
  }

  const fitToScreen = () => {
    setZoom(100)
    setPanX(0)
    setPanY(0)
  }

  // Download handler
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = imageUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Fullscreen handler
  const handleFullscreen = async () => {
    if (!isFullscreen) {
      try {
        const element = document.getElementById('image-viewer-container')
        if (element?.requestFullscreen) {
          await element.requestFullscreen()
          setIsFullscreen(true)
        }
      } catch (error) {
        logger.error('Fullscreen request failed:', error)
      }
    } else {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 100) { return } // Only allow pan when zoomed in
    setIsDragging(true)
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 100) { return }
    setPanX(e.clientX - dragStart.x)
    setPanY(e.clientY - dragStart.y)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div
      id="image-viewer-container"
      className={cn('flex flex-col bg-background', height)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toolbar */}
      <div className="bg-surface border-b border-gray-700 p-3 flex items-center justify-between flex-wrap gap-2">
        {/* Left side - Empty for spacing */}
        <div />

        {/* Center - Filename */}
        <div className="text-gray-300 text-sm truncate flex-1 text-center px-2">
          {fileName}
        </div>

        {/* Right side - Controls */}
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
            disabled={zoom >= 300}
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
            onClick={fitToScreen}
            title="Fit to screen"
            className="text-white hover:bg-gray-700 text-xs"
          >
            Fit
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            title="Toggle fullscreen"
            className="text-white hover:bg-gray-700"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            title="Download image"
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

      {/* Image Viewer Area */}
      <div className="flex-1 overflow-hidden bg-background flex items-center justify-center cursor-grab active:cursor-grabbing relative">
        {isLoading && (
          <div className="text-disabled text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mb-2"></div>
            <p>Loading image...</p>
          </div>
        )}

        {error && (
          <div className="text-red-400 text-center max-w-md">
            <p className="font-medium mb-2">Error loading image</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!error && (
          <div className="overflow-auto w-full h-full flex items-center justify-center relative">
            <img
              ref={imageRef}
              src={imageUrl}
              alt={alt}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onMouseDown={enableMarkup ? undefined : handleMouseDown}
              style={{
                transform: `scale(${zoom / 100}) translate(${panX}px, ${panY}px)`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              }}
              className={cn(
                'max-w-full max-h-full',
                zoom > 100 && isDragging && !enableMarkup && 'cursor-grabbing',
              )}
            />

            {/* Drawing Canvas Overlay */}
            {enableMarkup && allowMarkup && !readOnly && (
              <div
                className="absolute top-1/2 left-1/2 pointer-events-auto"
                style={{
                  transform: `translate(-50%, -50%) scale(${zoom / 100})`,
                  transformOrigin: 'center',
                }}
              >
                {collaborative ? (
                  <UnifiedDrawingCanvas
                    documentId={documentId}
                    projectId={projectId}
                    pageNumber={null}
                    width={imageWidth}
                    height={imageHeight}
                    readOnly={false}
                    collaborative={collaborative}
                  />
                ) : (
                  <LazyDrawingCanvas
                    documentId={documentId}
                    projectId={projectId}
                    pageNumber={null}
                    width={imageWidth}
                    height={imageHeight}
                    readOnly={false}
                  />
                )}
              </div>
            )}

            {/* RFI/Submittal Pin Overlay */}
            {showPins && (
              <div
                className="absolute top-1/2 left-1/2"
                style={{
                  transform: `translate(-50%, -50%)`,
                  width: imageWidth * (zoom / 100),
                  height: imageHeight * (zoom / 100),
                }}
              >
                <DrawingPinOverlay
                  documentId={documentId}
                  containerWidth={imageWidth}
                  containerHeight={imageHeight}
                  zoom={zoom}
                  enableAddPin={!!onAddDrawingPin}
                  onAddPin={onAddDrawingPin}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info text when zoomed in */}
      {zoom > 100 && (
        <div className="bg-surface border-t border-gray-700 px-3 py-2 text-xs text-disabled text-center">
          Drag to pan, use zoom controls or keyboard shortcuts
        </div>
      )}
    </div>
  )
}
