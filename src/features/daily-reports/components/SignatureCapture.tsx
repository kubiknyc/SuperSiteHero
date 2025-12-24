// Canvas-based signature capture component
import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eraser, Check, PenTool } from 'lucide-react'

interface SignatureCaptureProps {
  onSave: (signatureDataUrl: string) => void
  onClear?: () => void
  existingSignature?: string
  label?: string
  disabled?: boolean
}

export function SignatureCapture({
  onSave,
  onClear,
  existingSignature,
  label = 'Signature',
  disabled = false,
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {return}

    const ctx = canvas.getContext('2d')
    if (!ctx) {return}

    // Set canvas size based on container
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Set drawing styles
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Load existing signature if provided
    if (existingSignature) {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
        setHasSignature(true)
      }
      img.src = existingSignature
    }
  }, [existingSignature])

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) {return null}

    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) {return}

    const coords = getCoordinates(e)
    if (!coords) {return}

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) {return}

    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }, [disabled, getCoordinates])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) {return}

    const coords = getCoordinates(e)
    if (!coords) {return}

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) {return}

    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    setHasSignature(true)
  }, [isDrawing, disabled, getCoordinates])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) {return}

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onClear?.()
  }, [onClear])

  const saveSignature = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) {return}

    const dataUrl = canvas.toDataURL('image/png')
    onSave(dataUrl)
  }, [hasSignature, onSave])

  // Prevent scrolling while drawing on touch devices
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {return}

    const preventScroll = (e: TouchEvent) => {
      if (isDrawing) {
        e.preventDefault()
      }
    }

    canvas.addEventListener('touchmove', preventScroll, { passive: false })
    return () => {
      canvas.removeEventListener('touchmove', preventScroll)
    }
  }, [isDrawing])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PenTool className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className={`relative border-2 rounded-lg ${
            disabled ? 'bg-muted border-border' : 'border-input bg-card'
          }`}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-32 cursor-crosshair touch-none"
            style={{ display: 'block' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasSignature && !disabled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-disabled text-sm">
              Sign here
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            disabled={disabled || !hasSignature}
            className="flex-1"
          >
            <Eraser className="h-4 w-4 mr-2" />
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={saveSignature}
            disabled={disabled || !hasSignature}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Save Signature
          </Button>
        </div>

        {existingSignature && (
          <p className="text-xs text-success flex items-center gap-1">
            <Check className="h-3 w-3" />
            Signature saved
          </p>
        )}
      </CardContent>
    </Card>
  )
}
