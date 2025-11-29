// File: /src/features/checklists/components/SignaturePad.tsx
// Canvas-based signature capture component using Konva
// Phase: 3.2 - Photo & Signature Capture

import { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Line } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import Konva from 'konva'

interface SignaturePadProps {
  onSignatureCapture: (dataUrl: string) => void
  onClear?: () => void
  width?: number
  height?: number
  disabled?: boolean
  existingSignature?: string | null
}

interface LineData {
  tool: 'pen'
  points: number[]
  strokeColor: string
  strokeWidth: number
}

export function SignaturePad({
  onSignatureCapture,
  onClear,
  width = 600,
  height = 200,
  disabled = false,
  existingSignature,
}: SignaturePadProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const [lines, setLines] = useState<LineData[]>([])
  const [isDrawing, setIsDrawing] = useState(false)

  // Track if signature has been modified
  const [hasSignature, setHasSignature] = useState(false)

  // Auto-capture signature when drawing stops
  useEffect(() => {
    if (hasSignature && !isDrawing && lines.length > 0) {
      const timer = setTimeout(() => {
        captureSignature()
      }, 500) // Debounce capture by 500ms

      return () => clearTimeout(timer)
    }
  }, [hasSignature, isDrawing, lines])

  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (disabled) {return}

    setIsDrawing(true)
    setHasSignature(true)

    const pos = e.target.getStage()?.getPointerPosition()
    if (!pos) {return}

    setLines([
      ...lines,
      {
        tool: 'pen',
        points: [pos.x, pos.y],
        strokeColor: '#000000',
        strokeWidth: 2,
      },
    ])
  }

  const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing || disabled) {return}

    const stage = e.target.getStage()
    const pos = stage?.getPointerPosition()
    if (!pos) {return}

    const lastLine = lines[lines.length - 1]
    if (!lastLine) {return}

    // Add point to the current line
    lastLine.points = lastLine.points.concat([pos.x, pos.y])

    // Replace the last line with updated points
    setLines(lines.slice(0, -1).concat([lastLine]))
  }

  const handleMouseUp = () => {
    if (disabled) {return}
    setIsDrawing(false)
  }

  const captureSignature = () => {
    if (!stageRef.current) {return}

    try {
      // Export to data URL
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 2, // Higher resolution
      })

      onSignatureCapture(dataUrl)
    } catch (error) {
      console.error('Failed to capture signature:', error)
    }
  }

  const handleClear = () => {
    setLines([])
    setHasSignature(false)
    onClear?.()
  }

  return (
    <div className="signature-pad-container">
      <div
        className={`relative border-2 rounded-lg overflow-hidden bg-white ${
          disabled ? 'border-gray-300 cursor-not-allowed' : 'border-gray-400'
        }`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* Placeholder text when empty */}
        {!hasSignature && !existingSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-400 text-lg font-light">Sign here</span>
          </div>
        )}

        {/* Existing signature preview */}
        {existingSignature && !hasSignature && (
          <div className="absolute inset-0">
            <img
              src={existingSignature}
              alt="Existing signature"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Konva Stage for drawing */}
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className={disabled ? 'pointer-events-none' : ''}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.strokeColor}
                strokeWidth={line.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation="source-over"
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Clear button */}
      {(hasSignature || existingSignature) && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Clear Signature
        </button>
      )}
    </div>
  )
}
