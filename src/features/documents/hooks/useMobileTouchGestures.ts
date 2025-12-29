/**
 * useMobileTouchGestures Hook
 *
 * Provides enhanced touch gesture handling for drawing markup on mobile devices.
 * Features:
 * - Pinch-to-zoom with smooth transitions
 * - Two-finger pan
 * - Palm rejection (ignores large touch areas)
 * - Stylus pressure detection
 * - Touch state management
 */

import { useState, useCallback, useRef } from 'react'

export interface TouchPoint {
  x: number
  y: number
  pressure?: number
  touchType?: 'stylus' | 'direct' | 'unknown'
  radiusX?: number
  radiusY?: number
}

export interface GestureState {
  // Zoom
  scale: number
  isZooming: boolean
  zoomCenter: { x: number; y: number } | null

  // Pan
  translateX: number
  translateY: number
  isPanning: boolean

  // Drawing
  isDrawing: boolean
  currentPoints: TouchPoint[]
  pressure: number

  // Touch info
  touchCount: number
  isStylusActive: boolean
}

export interface UseMobileTouchGesturesOptions {
  // Initial values
  initialScale?: number
  initialTranslateX?: number
  initialTranslateY?: number

  // Constraints
  minScale?: number
  maxScale?: number

  // Palm rejection
  enablePalmRejection?: boolean
  palmThresholdRadius?: number // Touch radius above this is considered palm

  // Callbacks
  onZoomChange?: (scale: number, center: { x: number; y: number }) => void
  onPanChange?: (translateX: number, translateY: number) => void
  onDrawStart?: (point: TouchPoint) => void
  onDrawMove?: (points: TouchPoint[]) => void
  onDrawEnd?: (points: TouchPoint[]) => void
  onTap?: (point: TouchPoint) => void
  onDoubleTap?: (point: TouchPoint) => void
}

const DEFAULT_OPTIONS: Required<UseMobileTouchGesturesOptions> = {
  initialScale: 1,
  initialTranslateX: 0,
  initialTranslateY: 0,
  minScale: 0.5,
  maxScale: 4,
  enablePalmRejection: true,
  palmThresholdRadius: 25, // 25px radius = likely palm touch
  onZoomChange: () => {},
  onPanChange: () => {},
  onDrawStart: () => {},
  onDrawMove: () => {},
  onDrawEnd: () => {},
  onTap: () => {},
  onDoubleTap: () => {},
}

export function useMobileTouchGestures(options: UseMobileTouchGesturesOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Gesture state
  const [state, setState] = useState<GestureState>({
    scale: opts.initialScale,
    isZooming: false,
    zoomCenter: null,
    translateX: opts.initialTranslateX,
    translateY: opts.initialTranslateY,
    isPanning: false,
    isDrawing: false,
    currentPoints: [],
    pressure: 0.5,
    touchCount: 0,
    isStylusActive: false,
  })

  // Refs for tracking gesture state without re-renders
  const startTouchesRef = useRef<{ [id: number]: TouchPoint }>({})
  const initialDistanceRef = useRef<number>(0)
  const initialScaleRef = useRef<number>(1)
  const initialTranslateRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastTapTimeRef = useRef<number>(0)
  const lastTapPositionRef = useRef<{ x: number; y: number } | null>(null)
  const drawingPointsRef = useRef<TouchPoint[]>([])

  // Helper to convert Touch to TouchPoint
  const touchToPoint = useCallback((touch: Touch): TouchPoint => {
    // Check for stylus - touchType and force are non-standard but supported on many devices
    // Using type assertion for extended Touch properties
    const extTouch = touch as Touch & { touchType?: string; force?: number }
    const isStylusTouch =
      extTouch.touchType === 'stylus' ||
      (extTouch.force !== undefined && extTouch.force > 0 && extTouch.force < 1)

    return {
      x: touch.clientX,
      y: touch.clientY,
      pressure: extTouch.force || 0.5,
      touchType: isStylusTouch ? 'stylus' : 'direct',
      radiusX: touch.radiusX,
      radiusY: touch.radiusY,
    }
  }, [])

  // Check if touch is likely a palm (large contact area)
  const isPalmTouch = useCallback((touch: Touch): boolean => {
    if (!opts.enablePalmRejection) {return false}

    const radiusX = touch.radiusX || 0
    const radiusY = touch.radiusY || 0
    const avgRadius = (radiusX + radiusY) / 2

    return avgRadius > opts.palmThresholdRadius
  }, [opts.enablePalmRejection, opts.palmThresholdRadius])

  // Calculate distance between two points
  const getDistance = useCallback((p1: TouchPoint, p2: TouchPoint): number => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Calculate center between two points
  const getCenter = useCallback((p1: TouchPoint, p2: TouchPoint): { x: number; y: number } => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    }
  }, [])

  // Touch start handler
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches)
    const validTouches = touches.filter((t) => !isPalmTouch(t))

    if (validTouches.length === 0) {return}

    // Store start touches
    validTouches.forEach((touch) => {
      startTouchesRef.current[touch.identifier] = touchToPoint(touch)
    })

    const touchCount = validTouches.length

    // Check for stylus
    const isStylusActive = validTouches.some(
      (t) =>
        // @ts-expect-error - touchType not in standard Touch interface
        t.touchType === 'stylus'
    )

    if (touchCount === 1) {
      // Single touch - could be drawing or tap
      const point = touchToPoint(validTouches[0])
      drawingPointsRef.current = [point]

      setState((prev) => ({
        ...prev,
        isDrawing: true,
        currentPoints: [point],
        touchCount,
        isStylusActive,
        pressure: point.pressure || 0.5,
      }))

      opts.onDrawStart(point)
    } else if (touchCount === 2) {
      // Two touches - pinch zoom or pan
      const p1 = touchToPoint(validTouches[0])
      const p2 = touchToPoint(validTouches[1])

      initialDistanceRef.current = getDistance(p1, p2)
      initialScaleRef.current = state.scale
      initialTranslateRef.current = { x: state.translateX, y: state.translateY }

      setState((prev) => ({
        ...prev,
        isDrawing: false,
        isZooming: true,
        isPanning: true,
        zoomCenter: getCenter(p1, p2),
        touchCount,
        isStylusActive,
      }))
    }
  }, [isPalmTouch, touchToPoint, getDistance, getCenter, state.scale, state.translateX, state.translateY, opts])

  // Touch move handler
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touches = Array.from(e.touches)
    const validTouches = touches.filter((t) => !isPalmTouch(t))

    if (validTouches.length === 0) {return}

    const touchCount = validTouches.length

    if (touchCount === 1 && state.isDrawing) {
      // Single touch drawing
      const point = touchToPoint(validTouches[0])
      drawingPointsRef.current.push(point)

      setState((prev) => ({
        ...prev,
        currentPoints: [...drawingPointsRef.current],
        pressure: point.pressure || 0.5,
      }))

      opts.onDrawMove([...drawingPointsRef.current])
    } else if (touchCount === 2 && (state.isZooming || state.isPanning)) {
      // Pinch zoom / pan
      const p1 = touchToPoint(validTouches[0])
      const p2 = touchToPoint(validTouches[1])

      const currentDistance = getDistance(p1, p2)
      const center = getCenter(p1, p2)

      // Calculate new scale
      let newScale = (currentDistance / initialDistanceRef.current) * initialScaleRef.current
      newScale = Math.max(opts.minScale, Math.min(opts.maxScale, newScale))

      // Calculate pan offset
      const startCenter = state.zoomCenter || center
      const translateX = initialTranslateRef.current.x + (center.x - startCenter.x)
      const translateY = initialTranslateRef.current.y + (center.y - startCenter.y)

      setState((prev) => ({
        ...prev,
        scale: newScale,
        translateX,
        translateY,
        zoomCenter: center,
      }))

      opts.onZoomChange(newScale, center)
      opts.onPanChange(translateX, translateY)
    }
  }, [isPalmTouch, touchToPoint, getDistance, getCenter, state.isDrawing, state.isZooming, state.isPanning, state.zoomCenter, opts])

  // Touch end handler
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const remainingTouches = Array.from(e.touches)
    const changedTouches = Array.from(e.changedTouches)

    // Remove ended touches from tracking
    changedTouches.forEach((touch) => {
      delete startTouchesRef.current[touch.identifier]
    })

    if (remainingTouches.length === 0) {
      // All touches ended
      if (drawingPointsRef.current.length > 0) {
        // Check for tap vs draw
        const startPoint = drawingPointsRef.current[0]
        const endPoint = drawingPointsRef.current[drawingPointsRef.current.length - 1]
        const distance = getDistance(startPoint, endPoint)

        if (drawingPointsRef.current.length <= 3 && distance < 10) {
          // This was a tap
          const now = Date.now()
          const timeSinceLastTap = now - lastTapTimeRef.current

          if (timeSinceLastTap < 300 && lastTapPositionRef.current) {
            const tapDistance = getDistance(startPoint, lastTapPositionRef.current as TouchPoint)
            if (tapDistance < 30) {
              // Double tap
              opts.onDoubleTap(startPoint)
            }
          } else {
            // Single tap
            opts.onTap(startPoint)
          }

          lastTapTimeRef.current = now
          lastTapPositionRef.current = { x: startPoint.x, y: startPoint.y }
        } else {
          // This was a draw
          opts.onDrawEnd([...drawingPointsRef.current])
        }
      }

      // Reset state
      drawingPointsRef.current = []

      setState((prev) => ({
        ...prev,
        isDrawing: false,
        isZooming: false,
        isPanning: false,
        zoomCenter: null,
        currentPoints: [],
        touchCount: 0,
      }))
    } else if (remainingTouches.length === 1) {
      // Transitioned from multi-touch to single touch
      const point = touchToPoint(remainingTouches[0])
      drawingPointsRef.current = [point]

      setState((prev) => ({
        ...prev,
        isZooming: false,
        isPanning: false,
        isDrawing: true,
        currentPoints: [point],
        touchCount: 1,
      }))
    }
  }, [state.isDrawing, touchToPoint, getDistance, opts])

  // Touch cancel handler
  const handleTouchCancel = useCallback(() => {
    startTouchesRef.current = {}
    drawingPointsRef.current = []

    setState((prev) => ({
      ...prev,
      isDrawing: false,
      isZooming: false,
      isPanning: false,
      zoomCenter: null,
      currentPoints: [],
      touchCount: 0,
    }))
  }, [])

  // Bind touch handlers to an element
  const bindTouchHandlers = useCallback((element: HTMLElement | null) => {
    if (!element) {return () => {}}

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd, { passive: false })
    element.addEventListener('touchcancel', handleTouchCancel, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel])

  // Manual state setters
  const setScale = useCallback((scale: number) => {
    const clampedScale = Math.max(opts.minScale, Math.min(opts.maxScale, scale))
    setState((prev) => ({ ...prev, scale: clampedScale }))
  }, [opts.minScale, opts.maxScale])

  const setTranslate = useCallback((x: number, y: number) => {
    setState((prev) => ({ ...prev, translateX: x, translateY: y }))
  }, [])

  const resetTransform = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: opts.initialScale,
      translateX: opts.initialTranslateX,
      translateY: opts.initialTranslateY,
    }))
  }, [opts.initialScale, opts.initialTranslateX, opts.initialTranslateY])

  return {
    // State
    ...state,

    // Handlers (for manual binding)
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },

    // Binding helper
    bindTouchHandlers,

    // Manual controls
    setScale,
    setTranslate,
    resetTransform,
  }
}

export default useMobileTouchGestures
