/**
 * Signature Pad Component
 * Canvas-based signature capture with touch/mouse support
 *
 * Enhanced Features:
 * - Full-width canvas on mobile with landscape prompt
 * - Minimum stroke complexity validation
 * - Capture metadata: timestamp, device info, signer name
 * - Audit trail data with signature
 */

import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { X, Check, RotateCcw, Download, RotateCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface SignatureMetadata {
  /** ISO timestamp when signature was captured */
  timestamp: string
  /** Device/browser info */
  deviceInfo: {
    userAgent: string
    platform: string
    screenWidth: number
    screenHeight: number
    pixelRatio: number
    orientation: 'portrait' | 'landscape'
  }
  /** Signer name if provided */
  signerName?: string
  /** IP address (if provided by server) */
  ipAddress?: string
  /** Number of strokes */
  strokeCount: number
  /** Total path length in pixels */
  totalPathLength: number
  /** Canvas dimensions */
  canvasDimensions: {
    width: number
    height: number
  }
}

export interface SignatureData {
  /** Base64 data URL of the signature image */
  dataUrl: string
  /** Audit metadata */
  metadata: SignatureMetadata
}

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
  /** Callback when signature is saved with full data */
  onSave?: (data: SignatureData) => void
  /** Legacy callback - just data URL */
  onSaveDataUrl?: (dataUrl: string) => void
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
  /** Signer name for audit trail */
  signerName?: string
  /** Minimum number of strokes required */
  minStrokes?: number
  /** Minimum total path length required (in pixels) */
  minPathLength?: number
  /** Show landscape prompt on mobile portrait */
  showLandscapePrompt?: boolean
  /** Force full width on mobile */
  fullWidthOnMobile?: boolean
}

export interface SignaturePadRef {
  clear: () => void
  save: () => SignatureData | null
  saveDataUrl: () => string | null
  isEmpty: () => boolean
  toDataURL: (type?: string) => string
  getMetadata: () => SignatureMetadata
  isValid: () => boolean
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
      onSaveDataUrl,
      defaultValue,
      disabled = false,
      className,
      showControls = true,
      label = 'Signature',
      placeholder = 'Sign here',
      signerName,
      minStrokes = 3,
      minPathLength = 100,
      showLandscapePrompt = true,
      fullWidthOnMobile = true,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [isEmpty, setIsEmpty] = useState(true)
    const lastPointRef = useRef<{ x: number; y: number } | null>(null)

    // Stroke tracking for validation
    const [strokeCount, setStrokeCount] = useState(0)
    const [totalPathLength, setTotalPathLength] = useState(0)
    const currentStrokeLengthRef = useRef(0)

    // Orientation detection
    const [isPortrait, setIsPortrait] = useState(false)
    const [actualWidth, setActualWidth] = useState(width)
    const [showOrientationHint, setShowOrientationHint] = useState(false)

    // Detect orientation and adjust width
    useEffect(() => {
      const checkOrientation = () => {
        const portrait = window.innerHeight > window.innerWidth
        setIsPortrait(portrait)

        // On mobile portrait, use full width
        if (fullWidthOnMobile && window.innerWidth < 768) {
          const containerWidth = containerRef.current?.offsetWidth || window.innerWidth - 32
          setActualWidth(Math.min(containerWidth, width))
        } else {
          setActualWidth(width)
        }

        // Show landscape hint on mobile portrait
        if (showLandscapePrompt && portrait && window.innerWidth < 768) {
          setShowOrientationHint(true)
        } else {
          setShowOrientationHint(false)
        }
      }

      checkOrientation()
      window.addEventListener('resize', checkOrientation)
      window.addEventListener('orientationchange', checkOrientation)

      return () => {
        window.removeEventListener('resize', checkOrientation)
        window.removeEventListener('orientationchange', checkOrientation)
      }
    }, [width, fullWidthOnMobile, showLandscapePrompt])

    // Validation check
    const isValidSignature = useCallback(() => {
      return strokeCount >= minStrokes && totalPathLength >= minPathLength
    }, [strokeCount, totalPathLength, minStrokes, minPathLength])

    // Generate metadata
    const getMetadata = useCallback((): SignatureMetadata => {
      return {
        timestamp: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          pixelRatio: window.devicePixelRatio || 1,
          orientation: isPortrait ? 'portrait' : 'landscape',
        },
        signerName,
        strokeCount,
        totalPathLength: Math.round(totalPathLength),
        canvasDimensions: {
          width: actualWidth,
          height,
        },
      }
    }, [isPortrait, signerName, strokeCount, totalPathLength, actualWidth, height])

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
      canvas.width = actualWidth * dpr
      canvas.height = height * dpr
      canvas.style.width = `${actualWidth}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)

      // Fill background
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, actualWidth, height)

      // Load default value if provided
      if (defaultValue) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0, actualWidth, height)
          setIsEmpty(false)
        }
        img.src = defaultValue
      }
    }, [actualWidth, height, backgroundColor, defaultValue])

    // Get coordinates from event
    const getCoordinates = useCallback(
      (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return null

        const rect = canvas.getBoundingClientRect()
        const scaleX = actualWidth / rect.width
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
      [actualWidth, height]
    )

    // Draw line between points and track path length
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

        // Calculate distance and add to current stroke length
        const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
        currentStrokeLengthRef.current += distance
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
        currentStrokeLengthRef.current = 0 // Reset current stroke length

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

      // Update stroke tracking
      setStrokeCount((prev) => prev + 1)
      setTotalPathLength((prev) => prev + currentStrokeLengthRef.current)

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
      ctx.fillRect(0, 0, actualWidth, height)
      setIsEmpty(true)
      setStrokeCount(0)
      setTotalPathLength(0)
      currentStrokeLengthRef.current = 0
      onChange?.(null)
    }, [getContext, backgroundColor, actualWidth, height, onChange])

    // Save signature with full data
    const save = useCallback((): SignatureData | null => {
      const canvas = canvasRef.current
      if (!canvas || isEmpty) return null

      const dataUrl = canvas.toDataURL('image/png')
      const metadata = getMetadata()
      const signatureData: SignatureData = { dataUrl, metadata }

      onSave?.(signatureData)
      onSaveDataUrl?.(dataUrl)

      return signatureData
    }, [isEmpty, onSave, onSaveDataUrl, getMetadata])

    // Save data URL only (legacy)
    const saveDataUrl = useCallback((): string | null => {
      const canvas = canvasRef.current
      if (!canvas || isEmpty) return null
      return canvas.toDataURL('image/png')
    }, [isEmpty])

    // Export methods via ref
    useImperativeHandle(
      ref,
      () => ({
        clear,
        save,
        saveDataUrl,
        isEmpty: () => isEmpty,
        toDataURL: (type = 'image/png') => canvasRef.current?.toDataURL(type) || '',
        getMetadata,
        isValid: isValidSignature,
      }),
      [clear, save, saveDataUrl, isEmpty, getMetadata, isValidSignature]
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

    const isValid = isValidSignature()

    return (
      <div ref={containerRef} className={cn('space-y-2', className)}>
        {label && (
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}

        {/* Landscape prompt for mobile */}
        {showOrientationHint && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
            <RotateCw className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-blue-700 dark:text-blue-300">
              Rotate your device to landscape for easier signing
            </span>
          </div>
        )}

        <div className="relative">
          <canvas
            ref={canvasRef}
            className={cn(
              'border rounded-lg cursor-crosshair touch-none w-full',
              disabled && 'opacity-50 cursor-not-allowed',
              isEmpty && 'border-dashed',
              !isEmpty && !isValid && 'border-yellow-400',
              !isEmpty && isValid && 'border-green-400'
            )}
            style={{
              width: actualWidth,
              height,
              backgroundColor,
              maxWidth: '100%',
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

          {/* Validation indicator */}
          {!isEmpty && !isValid && (
            <div className="absolute top-2 right-2 pointer-events-none">
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900 rounded text-xs text-yellow-700 dark:text-yellow-300">
                <AlertCircle className="h-3 w-3" />
                <span>Keep signing</span>
              </div>
            </div>
          )}

          {!isEmpty && isValid && (
            <div className="absolute top-2 right-2 pointer-events-none">
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 rounded text-xs text-green-700 dark:text-green-300">
                <Check className="h-3 w-3" />
                <span>Valid</span>
              </div>
            </div>
          )}
        </div>

        {/* Stroke info (dev mode - hidden in production) */}
        {process.env.NODE_ENV === 'development' && !isEmpty && (
          <div className="text-xs text-muted-foreground">
            Strokes: {strokeCount}/{minStrokes} | Path length: {Math.round(totalPathLength)}/{minPathLength}px
          </div>
        )}

        {/* Controls */}
        {showControls && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clear}
              disabled={disabled || isEmpty}
              className="min-h-[44px] min-w-[44px]"
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
              className="min-h-[44px] min-w-[44px]"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>

            {(onSave || onSaveDataUrl) && (
              <Button
                type="button"
                size="sm"
                onClick={() => save()}
                disabled={disabled || isEmpty || !isValid}
                className="min-h-[44px] min-w-[44px]"
              >
                <Check className="h-4 w-4 mr-1" />
                Save
              </Button>
            )}
          </div>
        )}

        {/* Signer name display */}
        {signerName && (
          <p className="text-xs text-muted-foreground">
            Signing as: <span className="font-medium">{signerName}</span>
          </p>
        )}
      </div>
    )
  }
)

SignaturePad.displayName = 'SignaturePad'

export default SignaturePad
