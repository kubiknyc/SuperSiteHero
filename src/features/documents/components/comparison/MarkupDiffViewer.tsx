// File: /src/features/documents/components/comparison/MarkupDiffViewer.tsx
// Canvas-based diff visualization with interactive change exploration

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ChangeRegion } from '../../types/markup'
import { Loader2, ZoomIn } from 'lucide-react'
import { logger } from '../../../../lib/utils/logger';


interface MarkupDiffViewerProps {
  diffImageDataUrl?: string
  changeRegions: ChangeRegion[]
  showHighlights: boolean
  selectedChangeId: string | null
  zoom: number
  position: { x: number; y: number }
  className?: string
}

export function MarkupDiffViewer({
  diffImageDataUrl,
  changeRegions,
  showHighlights,
  selectedChangeId,
  zoom,
  position,
  className,
}: MarkupDiffViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Load and draw the diff image
  useEffect(() => {
    if (!diffImageDataUrl || !canvasRef.current) {return}

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {return}

    // Load the image
    const img = new Image()
    imageRef.current = img

    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width
      canvas.height = img.height

      // Draw the diff image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      setImageLoaded(true)
      setIsLoading(false)
    }

    img.onerror = () => {
      logger.error('Failed to load diff image')
      setIsLoading(false)
    }

    img.src = diffImageDataUrl

    return () => {
      if (imageRef.current) {
        imageRef.current.onload = null
        imageRef.current.onerror = null
      }
    }
  }, [diffImageDataUrl])

  // Draw change region highlights
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded || !imageRef.current) {return}
    if (!showHighlights) {
      // Redraw base image without highlights
      const ctx = canvasRef.current.getContext('2d')
      if (ctx && imageRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctx.drawImage(imageRef.current, 0, 0)
      }
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx || !imageRef.current) {return}

    // Redraw base image
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imageRef.current, 0, 0)

    // Draw change region overlays
    changeRegions.forEach(region => {
      const isSelected = region.id === selectedChangeId

      // Set colors based on change type
      let strokeColor: string
      let fillColor: string
      switch (region.changeType) {
        case 'added':
          strokeColor = '#22c55e' // green-500
          fillColor = 'rgba(34, 197, 94, 0.2)'
          break
        case 'removed':
          strokeColor = '#ef4444' // red-500
          fillColor = 'rgba(239, 68, 68, 0.2)'
          break
        case 'modified':
          strokeColor = '#facc15' // yellow-400
          fillColor = 'rgba(250, 204, 21, 0.2)'
          break
        default:
          strokeColor = '#3b82f6' // blue-500
          fillColor = 'rgba(59, 130, 246, 0.2)'
      }

      // Draw filled rectangle
      ctx.fillStyle = fillColor
      ctx.fillRect(region.x, region.y, region.width, region.height)

      // Draw border
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = isSelected ? 4 : 2
      if (isSelected) {
        ctx.setLineDash([5, 5]) // Dashed line for selected
      } else {
        ctx.setLineDash([])
      }
      ctx.strokeRect(region.x, region.y, region.width, region.height)

      // Draw label for selected region
      if (isSelected) {
        const label = region.description || `${region.changeType} change`
        const padding = 4
        const fontSize = 12
        ctx.font = `${fontSize}px sans-serif`
        const metrics = ctx.measureText(label)
        const labelWidth = metrics.width + padding * 2
        const labelHeight = fontSize + padding * 2

        // Position label above or below region
        const labelY = region.y > labelHeight + 5 ? region.y - labelHeight - 5 : region.y + region.height + 5

        // Draw label background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.fillRect(region.x, labelY, labelWidth, labelHeight)

        // Draw label text
        ctx.fillStyle = '#ffffff'
        ctx.fillText(label, region.x + padding, labelY + fontSize + padding / 2)
      }
    })

    // Reset line dash
    ctx.setLineDash([])
  }, [changeRegions, showHighlights, selectedChangeId, imageLoaded])

  if (!diffImageDataUrl) {
    return (
      <div className={cn('flex items-center justify-center h-full bg-background', className)}>
        <div className="text-center text-disabled">
          <ZoomIn className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No diff image available</p>
          <p className="text-xs mt-1">Please run a comparison first</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center h-full bg-background overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="text-center text-white">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm">Loading diff visualization...</p>
          </div>
        </div>
      )}

      <div
        className="relative"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        <canvas
          ref={canvasRef}
          className={cn(
            'max-w-full max-h-full',
            !imageLoaded && 'opacity-0'
          )}
        />
      </div>

      {/* Legend */}
      {imageLoaded && (
        <div className="absolute bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs space-y-2">
          <p className="font-semibold mb-2">Diff Legend:</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500/30 border border-red-500 rounded" />
              <span>Red: Differences in images</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500/30 border border-gray-500 rounded" />
              <span>Gray: Unchanged areas</span>
            </div>
          </div>
          {showHighlights && (
            <>
              <div className="border-t border-gray-600 my-2 pt-2">
                <p className="font-semibold mb-1.5">Change Types:</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500/30 border-2 border-green-500 rounded" />
                    <span>Added markup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500/30 border-2 border-red-500 rounded" />
                    <span>Removed markup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-400/30 border-2 border-yellow-400 rounded" />
                    <span>Modified markup</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default MarkupDiffViewer
