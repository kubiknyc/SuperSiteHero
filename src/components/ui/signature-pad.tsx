/**
 * Signature Pad Component
 * Canvas-based signature capture with touch/mouse support
 */

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { X, Check, RotateCcw, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SignaturePadProps {
  /** Width of the signature pad */
  width?: number
  /** Height of the signature pad */
  height?: number
  /** Stroke color */
  penColor?: string
  /** Stroke width */
  penWidth?: number
  /** Background color */
  backgroundColor?: string
  /** Callback when signature changes */
  onChange?: (dataUrl: string | null) => void
  /** Callback when signature is saved */
  onSave?: (dataUrl: string) => void
  /** Initial signature data URL */
  defaultValue?: string
  /** Whether the pad is disabled */
  disabled?: boolean
  /** Additional CSS classes */
  className?: string
  /** Show controls */
  showControls?: boolean
  /** Label */
  label?: string
  /** Placeholder text */
  placeholder?: string
}

export interface SignaturePadRef {
  clear: () => void
  save: () => string | null
  isEmpty: () => boolean
  toDataURL: (type?: string) => string
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  (
    {
      width = 400,
      height = 200,
      penColor = '#000000',
      penWidth = 2,
      backgroundColor = '#ffffff',
      onChange,
      onSave,
      defaultValue,
      disabled = false,
      className,
      showControls = true,
      label = 'Signature',
      placeholder = 'Sign here',
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [isEmpty, setIsEmpty] = useState(true)
    const lastPointRef = useRef<{ x: number; y: number } | null>(null)

    // Get canvas context
    const getContext = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return null
      return canvas.getContext('2d')
    }, [])

    // Initialize canvas
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas resolution for high DPI displays
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)

      // Fill background
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)

      // Load default value if provided
      if (defaultValue) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height)
          setIsEmpty(false)
        }
        img.src = defaultValue
      }
    }, [width, height, backgroundColor, defaultValue])

    // Get coordinates from event
    const getCoordinates = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return null

        const rect = canvas.getBoundingClientRect()
        const scaleX = width / rect.width
        const scaleY = height / rect.height

        if ('touches' in e) {
          const touch = e.touches[0] || e.changedTouches[0]
          return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY,
          }
        }

        return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY,
        }
      },
      [width, height]
    )

    // Draw line between points
    const drawLine = useCallback(
      (from: { x: number; y: number }, to: { x: number; y: number }) => {
        const ctx = getContext()
        if (!ctx) return

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = penColor
        ctx.lineWidth = penWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
      },
      [getContext, penColor, penWidth]
    )

    // Handle drawing start
    const handleStart = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return

        e.preventDefault()
        const coords = getCoordinates(e)
        if (!coords) return

        setIsDrawing(true)
        setIsEmpty(false)
        lastPointRef.current = coords

        // Draw a dot at the start
        const ctx = getContext()
        if (ctx) {
          ctx.beginPath()
          ctx.arc(coords.x, coords.y, penWidth / 2, 0, Math.PI * 2)
          ctx.fillStyle = penColor
          ctx.fill()
        }
      },
      [disabled, getCoordinates, getContext, penColor, penWidth]
    )

    // Handle drawing move
    const handleMove = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || disabled) return

        e.preventDefault()
        const coords = getCoordinates(e)
        if (!coords || !lastPointRef.current) return

        drawLine(lastPointRef.current, coords)
        lastPointRef.current = coords
      },
      [isDrawing, disabled, getCoordinates, drawLine]
    )

    // Handle drawing end
    const handleEnd = useCallback(() => {
      if (!isDrawing) return

      setIsDrawing(false)
      lastPointRef.current = null

      // Notify parent of change
      const canvas = canvasRef.current
      if (canvas && onChange) {
        onChange(canvas.toDataURL('image/png'))
      }
    }, [isDrawing, onChange])

    // Clear signature
    const clear = useCallback(() => {
      const canvas = canvasRef.current
      const ctx = getContext()
      if (!canvas || !ctx) return

      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, width, height)
      setIsEmpty(true)
      onChange?.(null)
    }, [getContext, backgroundColor, width, height, onChange])

    // Save signature
    const save = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas || isEmpty) return null

      const dataUrl = canvas.toDataURL('image/png')
      onSave?.(dataUrl)
      return dataUrl
    }, [isEmpty, onSave])

    // Export methods via ref
    useImperativeHandle(
      ref,
      () => ({
        clear,
        save,
        isEmpty: () => isEmpty,
        toDataURL: (type = 'image/png') => canvasRef.current?.toDataURL(type) || '',
      }),
      [clear, save, isEmpty]
    )

    // Download signature
    const handleDownload = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas || isEmpty) return

      const link = document.createElement('a')
      link.download = `signature-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }, [isEmpty])

    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}

        <div className="relative">
          <canvas
            ref={canvasRef}
            className={cn(
              'border rounded-lg cursor-crosshair touch-none',
              disabled && 'opacity-50 cursor-not-allowed',
              isEmpty && 'border-dashed'
            )}
            style={{
              width,
              height,
              backgroundColor,
            }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />

          {/* Placeholder */}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            </div>
          )}

          {/* Signature line */}
          <div
            className="absolute bottom-8 left-4 right-4 border-b border-dashed border-muted-foreground/30"
            style={{ pointerEvents: 'none' }}
          />
          <span
            className="absolute bottom-2 left-4 text-xs text-muted-foreground"
            style={{ pointerEvents: 'none' }}
          >
            X
          </span>
        </div>

        {/* Controls */}
        {showControls && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clear}
              disabled={disabled || isEmpty}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={disabled || isEmpty}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>

            {onSave && (
              <Button
                type="button"
                size="sm"
                onClick={() => save()}
                disabled={disabled || isEmpty}
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }
)

SignaturePad.displayName = 'SignaturePad'

export default SignaturePad
