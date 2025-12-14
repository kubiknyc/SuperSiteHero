/**
 * Unit Tests for useMobileTouchGestures Hook
 *
 * Tests mobile touch interactions for drawing markup including:
 * - Pinch-to-zoom
 * - Two-finger pan
 * - Single-touch drawing
 * - Palm rejection
 * - Stylus detection
 * - Tap detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMobileTouchGestures } from './useMobileTouchGestures'

// Helper to create a mock Touch
function createTouch(params: {
  identifier: number
  clientX: number
  clientY: number
  radiusX?: number
  radiusY?: number
  force?: number
  touchType?: string
}): Touch {
  return {
    identifier: params.identifier,
    clientX: params.clientX,
    clientY: params.clientY,
    radiusX: params.radiusX || 5,
    radiusY: params.radiusY || 5,
    force: params.force,
    // @ts-expect-error - touchType not in standard Touch interface
    touchType: params.touchType,
    screenX: params.clientX,
    screenY: params.clientY,
    pageX: params.clientX,
    pageY: params.clientY,
    target: document.createElement('div'),
    rotationAngle: 0,
  } as Touch
}

// Helper to create TouchEvent
function createTouchEvent(
  type: string,
  touches: Touch[],
  changedTouches?: Touch[]
): TouchEvent {
  const event = new Event(type) as TouchEvent
  Object.defineProperty(event, 'touches', { value: touches })
  Object.defineProperty(event, 'changedTouches', {
    value: changedTouches || touches,
  })
  Object.defineProperty(event, 'targetTouches', { value: touches })
  return event
}

describe('useMobileTouchGestures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      expect(result.current.scale).toBe(1)
      expect(result.current.translateX).toBe(0)
      expect(result.current.translateY).toBe(0)
      expect(result.current.isZooming).toBe(false)
      expect(result.current.isPanning).toBe(false)
      expect(result.current.isDrawing).toBe(false)
      expect(result.current.touchCount).toBe(0)
    })

    it('should initialize with custom values', () => {
      const { result } = renderHook(() =>
        useMobileTouchGestures({
          initialScale: 2,
          initialTranslateX: 100,
          initialTranslateY: 50,
        })
      )

      expect(result.current.scale).toBe(2)
      expect(result.current.translateX).toBe(100)
      expect(result.current.translateY).toBe(50)
    })
  })

  describe('Single Touch Drawing', () => {
    it('should start drawing on single touch', () => {
      const onDrawStart = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({ onDrawStart })
      )

      const touch = createTouch({ identifier: 0, clientX: 100, clientY: 100 })
      const event = createTouchEvent('touchstart', [touch])

      act(() => {
        result.current.handlers.onTouchStart(event)
      })

      expect(result.current.isDrawing).toBe(true)
      expect(result.current.touchCount).toBe(1)
      expect(onDrawStart).toHaveBeenCalledWith(
        expect.objectContaining({ x: 100, y: 100 })
      )
    })

    it('should track drawing points during move', () => {
      const onDrawMove = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({ onDrawMove })
      )

      // Start drawing
      const touch1 = createTouch({ identifier: 0, clientX: 100, clientY: 100 })
      const startEvent = createTouchEvent('touchstart', [touch1])

      act(() => {
        result.current.handlers.onTouchStart(startEvent)
      })

      // Move touch
      const touch2 = createTouch({ identifier: 0, clientX: 150, clientY: 150 })
      const moveEvent = createTouchEvent('touchmove', [touch2])

      act(() => {
        result.current.handlers.onTouchMove(moveEvent)
      })

      expect(result.current.currentPoints.length).toBeGreaterThan(1)
      expect(onDrawMove).toHaveBeenCalled()
    })

    it('should end drawing and call onDrawEnd', () => {
      const onDrawEnd = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({ onDrawEnd })
      )

      // Start and move
      const touch1 = createTouch({ identifier: 0, clientX: 100, clientY: 100 })
      const startEvent = createTouchEvent('touchstart', [touch1])

      act(() => {
        result.current.handlers.onTouchStart(startEvent)
      })

      const touch2 = createTouch({ identifier: 0, clientX: 150, clientY: 150 })
      const moveEvent = createTouchEvent('touchmove', [touch2])

      act(() => {
        result.current.handlers.onTouchMove(moveEvent)
      })

      // End touch
      const endEvent = createTouchEvent('touchend', [], [touch2])

      act(() => {
        result.current.handlers.onTouchEnd(endEvent)
      })

      expect(result.current.isDrawing).toBe(false)
      expect(onDrawEnd).toHaveBeenCalled()
    })
  })

  describe('Tap Detection', () => {
    it('should detect single tap', () => {
      const onTap = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({ onTap })
      )

      const touch = createTouch({ identifier: 0, clientX: 100, clientY: 100 })
      const startEvent = createTouchEvent('touchstart', [touch])
      const endEvent = createTouchEvent('touchend', [], [touch])

      act(() => {
        result.current.handlers.onTouchStart(startEvent)
        result.current.handlers.onTouchEnd(endEvent)
      })

      expect(onTap).toHaveBeenCalled()
    })

    it('should detect double tap', () => {
      vi.useFakeTimers()

      const onDoubleTap = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({ onDoubleTap })
      )

      const touch = createTouch({ identifier: 0, clientX: 100, clientY: 100 })

      // First tap
      act(() => {
        const startEvent = createTouchEvent('touchstart', [touch])
        result.current.handlers.onTouchStart(startEvent)

        const endEvent = createTouchEvent('touchend', [], [touch])
        result.current.handlers.onTouchEnd(endEvent)
      })

      // Second tap within 300ms
      act(() => {
        vi.advanceTimersByTime(100)

        const startEvent = createTouchEvent('touchstart', [touch])
        result.current.handlers.onTouchStart(startEvent)

        const endEvent = createTouchEvent('touchend', [], [touch])
        result.current.handlers.onTouchEnd(endEvent)
      })

      expect(onDoubleTap).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('Pinch-to-Zoom', () => {
    it('should start zooming with two touches', () => {
      const onZoomChange = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({ onZoomChange })
      )

      const touch1 = createTouch({ identifier: 0, clientX: 100, clientY: 100 })
      const touch2 = createTouch({ identifier: 1, clientX: 200, clientY: 200 })
      const event = createTouchEvent('touchstart', [touch1, touch2])

      act(() => {
        result.current.handlers.onTouchStart(event)
      })

      expect(result.current.isZooming).toBe(true)
      expect(result.current.touchCount).toBe(2)
      expect(result.current.isDrawing).toBe(false)
    })

    it('should calculate zoom based on pinch distance', () => {
      const onZoomChange = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({
          onZoomChange,
          initialScale: 1,
        })
      )

      // Start with two touches 100px apart
      const touch1 = createTouch({ identifier: 0, clientX: 50, clientY: 100 })
      const touch2 = createTouch({ identifier: 1, clientX: 150, clientY: 100 })
      const startEvent = createTouchEvent('touchstart', [touch1, touch2])

      act(() => {
        result.current.handlers.onTouchStart(startEvent)
      })

      // Move touches to be 200px apart (2x zoom)
      const movedTouch1 = createTouch({ identifier: 0, clientX: 0, clientY: 100 })
      const movedTouch2 = createTouch({ identifier: 1, clientX: 200, clientY: 100 })
      const moveEvent = createTouchEvent('touchmove', [movedTouch1, movedTouch2])

      act(() => {
        result.current.handlers.onTouchMove(moveEvent)
      })

      expect(result.current.scale).toBeGreaterThan(1)
      expect(onZoomChange).toHaveBeenCalled()
    })

    it('should respect min and max scale constraints', () => {
      const { result } = renderHook(() =>
        useMobileTouchGestures({
          initialScale: 1,
          minScale: 0.5,
          maxScale: 3,
        })
      )

      // Try to zoom beyond max
      act(() => {
        result.current.setScale(5)
      })

      expect(result.current.scale).toBe(3)

      // Try to zoom below min
      act(() => {
        result.current.setScale(0.1)
      })

      expect(result.current.scale).toBe(0.5)
    })
  })

  describe('Two-Finger Pan', () => {
    it('should pan with two-finger gesture', () => {
      const onPanChange = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({ onPanChange })
      )

      // Start pinch
      const touch1 = createTouch({ identifier: 0, clientX: 100, clientY: 100 })
      const touch2 = createTouch({ identifier: 1, clientX: 200, clientY: 100 })
      const startEvent = createTouchEvent('touchstart', [touch1, touch2])

      act(() => {
        result.current.handlers.onTouchStart(startEvent)
      })

      // Move both touches in same direction
      const movedTouch1 = createTouch({ identifier: 0, clientX: 150, clientY: 100 })
      const movedTouch2 = createTouch({ identifier: 1, clientX: 250, clientY: 100 })
      const moveEvent = createTouchEvent('touchmove', [movedTouch1, movedTouch2])

      act(() => {
        result.current.handlers.onTouchMove(moveEvent)
      })

      expect(result.current.isPanning).toBe(true)
      expect(onPanChange).toHaveBeenCalled()
    })

    it('should update translate values during pan', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      act(() => {
        result.current.setTranslate(50, 100)
      })

      expect(result.current.translateX).toBe(50)
      expect(result.current.translateY).toBe(100)
    })
  })

  describe('Palm Rejection', () => {
    it('should ignore large touch areas (palm touches)', () => {
      const onDrawStart = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({
          onDrawStart,
          enablePalmRejection: true,
          palmThresholdRadius: 20,
        })
      )

      // Create touch with large radius (palm)
      const palmTouch = createTouch({
        identifier: 0,
        clientX: 100,
        clientY: 100,
        radiusX: 30,
        radiusY: 30,
      })

      const event = createTouchEvent('touchstart', [palmTouch])

      act(() => {
        result.current.handlers.onTouchStart(event)
      })

      expect(result.current.isDrawing).toBe(false)
      expect(onDrawStart).not.toHaveBeenCalled()
    })

    it('should accept normal touch areas when palm rejection enabled', () => {
      const onDrawStart = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({
          onDrawStart,
          enablePalmRejection: true,
          palmThresholdRadius: 20,
        })
      )

      // Create normal touch
      const normalTouch = createTouch({
        identifier: 0,
        clientX: 100,
        clientY: 100,
        radiusX: 5,
        radiusY: 5,
      })

      const event = createTouchEvent('touchstart', [normalTouch])

      act(() => {
        result.current.handlers.onTouchStart(event)
      })

      expect(result.current.isDrawing).toBe(true)
      expect(onDrawStart).toHaveBeenCalled()
    })

    it('should allow disabling palm rejection', () => {
      const onDrawStart = vi.fn()
      const { result } = renderHook(() =>
        useMobileTouchGestures({
          onDrawStart,
          enablePalmRejection: false,
        })
      )

      // Create touch with large radius
      const palmTouch = createTouch({
        identifier: 0,
        clientX: 100,
        clientY: 100,
        radiusX: 50,
        radiusY: 50,
      })

      const event = createTouchEvent('touchstart', [palmTouch])

      act(() => {
        result.current.handlers.onTouchStart(event)
      })

      expect(result.current.isDrawing).toBe(true)
      expect(onDrawStart).toHaveBeenCalled()
    })
  })

  describe('Stylus Detection', () => {
    it('should detect stylus touches', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      const stylusTouch = createTouch({
        identifier: 0,
        clientX: 100,
        clientY: 100,
        touchType: 'stylus',
        force: 0.5,
      })

      const event = createTouchEvent('touchstart', [stylusTouch])

      act(() => {
        result.current.handlers.onTouchStart(event)
      })

      expect(result.current.isStylusActive).toBe(true)
    })

    it('should track stylus pressure', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      const stylusTouch = createTouch({
        identifier: 0,
        clientX: 100,
        clientY: 100,
        touchType: 'stylus',
        force: 0.7,
      })

      const event = createTouchEvent('touchstart', [stylusTouch])

      act(() => {
        result.current.handlers.onTouchStart(event)
      })

      expect(result.current.pressure).toBe(0.7)
    })

    it('should distinguish stylus from finger touches', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      const fingerTouch = createTouch({
        identifier: 0,
        clientX: 100,
        clientY: 100,
        touchType: 'direct',
      })

      const event = createTouchEvent('touchstart', [fingerTouch])

      act(() => {
        result.current.handlers.onTouchStart(event)
      })

      expect(result.current.isStylusActive).toBe(false)
    })
  })

  describe('Touch Cancel', () => {
    it('should reset state on touch cancel', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      // Start drawing
      const touch = createTouch({ identifier: 0, clientX: 100, clientY: 100 })
      const startEvent = createTouchEvent('touchstart', [touch])

      act(() => {
        result.current.handlers.onTouchStart(startEvent)
      })

      expect(result.current.isDrawing).toBe(true)

      // Cancel
      const cancelEvent = createTouchEvent('touchcancel', [])

      act(() => {
        result.current.handlers.onTouchCancel(cancelEvent)
      })

      expect(result.current.isDrawing).toBe(false)
      expect(result.current.touchCount).toBe(0)
      expect(result.current.currentPoints).toHaveLength(0)
    })
  })

  describe('Transform Controls', () => {
    it('should manually set scale', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      act(() => {
        result.current.setScale(2.5)
      })

      expect(result.current.scale).toBe(2.5)
    })

    it('should manually set translate', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      act(() => {
        result.current.setTranslate(100, 200)
      })

      expect(result.current.translateX).toBe(100)
      expect(result.current.translateY).toBe(200)
    })

    it('should reset transform', () => {
      const { result } = renderHook(() =>
        useMobileTouchGestures({
          initialScale: 1,
          initialTranslateX: 0,
          initialTranslateY: 0,
        })
      )

      // Change transform
      act(() => {
        result.current.setScale(3)
        result.current.setTranslate(150, 250)
      })

      expect(result.current.scale).toBe(3)
      expect(result.current.translateX).toBe(150)

      // Reset
      act(() => {
        result.current.resetTransform()
      })

      expect(result.current.scale).toBe(1)
      expect(result.current.translateX).toBe(0)
      expect(result.current.translateY).toBe(0)
    })
  })

  describe('Element Binding', () => {
    it('should provide handlers for manual binding', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      expect(result.current.handlers).toHaveProperty('onTouchStart')
      expect(result.current.handlers).toHaveProperty('onTouchMove')
      expect(result.current.handlers).toHaveProperty('onTouchEnd')
      expect(result.current.handlers).toHaveProperty('onTouchCancel')
    })

    it('should provide bindTouchHandlers helper', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      const mockElement = document.createElement('div')
      const cleanup = result.current.bindTouchHandlers(mockElement)

      expect(typeof cleanup).toBe('function')

      // Cleanup should remove listeners
      cleanup()
    })

    it('should handle null element in bindTouchHandlers', () => {
      const { result } = renderHook(() => useMobileTouchGestures())

      const cleanup = result.current.bindTouchHandlers(null)

      expect(typeof cleanup).toBe('function')
      cleanup() // Should not throw
    })
  })
})
