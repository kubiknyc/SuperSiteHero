// File: /src/features/site-instructions/components/SignatureCanvas.tsx
// Touch-friendly signature capture component for mobile devices
// Milestone 1.2: Site Instructions QR Code Workflow

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui/button'
import { X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SignatureCanvasHandle {
  getSignatureData: () => string | null
  clearSignature: () => void
  isEmpty: () => boolean
}

interface SignatureCanvasProps {
  width?: number
  height?: number
  lineWidth?: number
  lineColor?: string
  backgroundColor?: string
  className?: string
  onSignatureChange?: (hasSignature: boolean) => void
}

interface Point {
  x: number
  y: number
}

export const SignatureCanvas = forwardRef<SignatureCanvasHandle, SignatureCanvasProps>(
  function SignatureCanvas(
    {
      width = 400,
      height = 150,
      lineWidth = 2,
      lineColor = '#000000',
      backgroundColor = '#ffffff',
      className,
      onSignatureChange,
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)
    const [canvasSize, setCanvasSize] = useState({ width, height })
    const lastPoint = useRef<Point | null>(null)

    // Handle responsive sizing
    useEffect(() => {
      const updateSize = () => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth
          const newWidth = Math.min(containerWidth, width)
          const aspectRatio = height / width
          const newHeight = newWidth * aspectRatio
          setCanvasSize({ width: newWidth, height: newHeight })
        }
      }

      updateSize()
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }, [width, height])

    // Initialize canvas
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) {return}

      const ctx = canvas.getContext('2d')
      if (!ctx) {return}

      // Set up canvas for high DPI displays
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvasSize.width * dpr
      canvas.height = canvasSize.height * dpr
      canvas.style.width = `${canvasSize.width}px`
      canvas.style.height = `${canvasSize.height}px`
      ctx.scale(dpr, dpr)

      // Fill background
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

      // Set line style
      ctx.strokeStyle = lineColor
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }, [canvasSize, backgroundColor, lineColor, lineWidth])

    const getPointFromEvent = useCallback(
      (e: React.TouchEvent | React.MouseEvent): Point => {
        const canvas = canvasRef.current
        if (!canvas) {return { x: 0, y: 0 }}

        const rect = canvas.getBoundingClientRect()
        let clientX: number
        let clientY: number

        if ('touches' in e) {
          clientX = e.touches[0].clientX
          clientY = e.touches[0].clientY
        } else {
          clientX = e.clientX
          clientY = e.clientY
        }

        return {
          x: clientX - rect.left,
          y: clientY - rect.top,
        }
      },
      []
    )

    const startDrawing = useCallback(
      (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault()
        setIsDrawing(true)
        const point = getPointFromEvent(e)
        lastPoint.current = point

        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (ctx) {
          ctx.beginPath()
          ctx.moveTo(point.x, point.y)
        }
      },
      [getPointFromEvent]
    )

    const draw = useCallback(
      (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDrawing) {return}
        e.preventDefault()

        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !lastPoint.current) {return}

        const point = getPointFromEvent(e)

        // Draw smooth line using quadratic curve
        ctx.beginPath()
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y)

        // Use midpoint for smoother curve
        const midX = (lastPoint.current.x + point.x) / 2
        const midY = (lastPoint.current.y + point.y) / 2
        ctx.quadraticCurveTo(lastPoint.current.x, lastPoint.current.y, midX, midY)
        ctx.stroke()

        lastPoint.current = point

        if (!hasSignature) {
          setHasSignature(true)
          onSignatureChange?.(true)
        }
      },
      [isDrawing, getPointFromEvent, hasSignature, onSignatureChange]
    )

    const stopDrawing = useCallback(() => {
      setIsDrawing(false)
      lastPoint.current = null
    }, [])

    const clearSignature = useCallback(() => {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) {return}

      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
      setHasSignature(false)
      onSignatureChange?.(false)
    }, [backgroundColor, canvasSize, onSignatureChange])

    const getSignatureData = useCallback((): string | null => {
      const canvas = canvasRef.current
      if (!canvas || !hasSignature) {return null}
      return canvas.toDataURL('image/png')
    }, [hasSignature])

    const isEmpty = useCallback((): boolean => {
      return !hasSignature
    }, [hasSignature])

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getSignatureData,
        clearSignature,
        isEmpty,
      }),
      [getSignatureData, clearSignature, isEmpty]
    )

    return (
      <div ref={containerRef} className={cn('relative', className)}>
        <div className="relative border rounded-lg overflow-hidden bg-card">
          <canvas
            ref={canvasRef}
            className="touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          />

          {/* Signature line hint */}
          <div
            className="absolute bottom-8 left-4 right-4 border-b border-dashed border-input pointer-events-none"
            style={{ opacity: hasSignature ? 0 : 0.5 }}
          />

          {/* Placeholder text */}
          {!hasSignature && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-disabled text-sm">Sign here</span>
            </div>
          )}

          {/* Clear button */}
          {hasSignature && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0"
              onClick={clearSignature}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear signature</span>
            </Button>
          )}
        </div>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {hasSignature ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 hover:text-foreground"
              onClick={clearSignature}
            >
              <RotateCcw className="h-3 w-3" />
              Clear and sign again
            </button>
          ) : (
            'Draw your signature above using your finger or mouse'
          )}
        </p>
      </div>
    )
  }
)
