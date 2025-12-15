/**
 * Swipe Gesture Hook
 * Touch gesture support for swipe actions on mobile devices
 */

import { useRef, useCallback, useState } from 'react'

export type SwipeDirection = 'left' | 'right' | 'up' | 'down' | null

export interface SwipeConfig {
  /** Minimum distance in pixels to trigger swipe */
  threshold?: number
  /** Maximum time in ms for swipe gesture */
  maxSwipeTime?: number
  /** Enable/disable haptic feedback */
  hapticFeedback?: boolean
  /** Callback when swiping (for visual feedback) */
  onSwiping?: (direction: SwipeDirection, distance: number, progress: number) => void
  /** Callback when swipe completes left */
  onSwipeLeft?: () => void
  /** Callback when swipe completes right */
  onSwipeRight?: () => void
  /** Callback when swipe completes up */
  onSwipeUp?: () => void
  /** Callback when swipe completes down */
  onSwipeDown?: () => void
  /** Callback when swipe is cancelled */
  onSwipeCancel?: () => void
}

export interface SwipeState {
  /** Current swipe direction */
  direction: SwipeDirection
  /** Current swipe distance */
  distance: number
  /** Progress from 0 to 1 towards threshold */
  progress: number
  /** Whether currently swiping */
  isSwiping: boolean
}

export interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
  onTouchCancel: (e: React.TouchEvent) => void
}

const DEFAULT_CONFIG: Required<Omit<SwipeConfig, 'onSwiping' | 'onSwipeLeft' | 'onSwipeRight' | 'onSwipeUp' | 'onSwipeDown' | 'onSwipeCancel'>> = {
  threshold: 100,
  maxSwipeTime: 500,
  hapticFeedback: true,
}

/**
 * Trigger haptic feedback if supported and enabled
 */
function triggerHaptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Ignore errors - vibration may not be supported
    }
  }
}

/**
 * Hook for handling swipe gestures on touch devices
 * @param config - Swipe configuration options
 * @returns Object with swipe state and touch event handlers
 */
export function useSwipeGesture(config: SwipeConfig = {}): {
  state: SwipeState
  handlers: SwipeHandlers
  reset: () => void
} {
  const opts = { ...DEFAULT_CONFIG, ...config }

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const [state, setState] = useState<SwipeState>({
    direction: null,
    distance: 0,
    progress: 0,
    isSwiping: false,
  })

  const reset = useCallback(() => {
    touchStart.current = null
    setState({
      direction: null,
      distance: 0,
      progress: 0,
      isSwiping: false,
    })
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
    setState(prev => ({ ...prev, isSwiping: true }))
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) {return}

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStart.current.x
    const deltaY = touch.clientY - touchStart.current.y
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Determine direction based on primary axis
    let direction: SwipeDirection = null
    let distance = 0

    if (absX > absY) {
      direction = deltaX > 0 ? 'right' : 'left'
      distance = absX
    } else {
      direction = deltaY > 0 ? 'down' : 'up'
      distance = absY
    }

    const progress = Math.min(distance / opts.threshold, 1)

    setState({
      direction,
      distance,
      progress,
      isSwiping: true,
    })

    config.onSwiping?.(direction, distance, progress)

    // Haptic feedback at threshold
    if (opts.hapticFeedback && progress >= 1 && state.progress < 1) {
      triggerHaptic(20)
    }
  }, [config, opts.hapticFeedback, opts.threshold, state.progress])

  const onTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (!touchStart.current) {
      reset()
      return
    }

    const elapsed = Date.now() - touchStart.current.time

    // Check if swipe was fast enough
    if (elapsed > opts.maxSwipeTime) {
      config.onSwipeCancel?.()
      reset()
      return
    }

    // Check if swipe distance met threshold
    if (state.distance < opts.threshold) {
      config.onSwipeCancel?.()
      reset()
      return
    }

    // Trigger haptic feedback
    if (opts.hapticFeedback) {
      triggerHaptic([10, 50, 10])
    }

    // Call appropriate callback
    switch (state.direction) {
      case 'left':
        config.onSwipeLeft?.()
        break
      case 'right':
        config.onSwipeRight?.()
        break
      case 'up':
        config.onSwipeUp?.()
        break
      case 'down':
        config.onSwipeDown?.()
        break
    }

    reset()
  }, [config, opts.hapticFeedback, opts.maxSwipeTime, opts.threshold, reset, state.direction, state.distance])

  const onTouchCancel = useCallback(() => {
    config.onSwipeCancel?.()
    reset()
  }, [config, reset])

  return {
    state,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
    reset,
  }
}

/**
 * Hook for pull-to-refresh gesture
 * @param onRefresh - Callback when pull-to-refresh is triggered
 * @param threshold - Minimum pull distance to trigger refresh
 */
export function usePullToRefresh(
  onRefresh: () => void | Promise<void>,
  threshold: number = 80
): {
  pullDistance: number
  isRefreshing: boolean
  handlers: SwipeHandlers
} {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartY = useRef<number | null>(null)
  const canPull = useRef(true)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only allow pull when at top of scroll container
    const target = e.currentTarget as HTMLElement
    canPull.current = target.scrollTop === 0

    if (canPull.current) {
      touchStartY.current = e.touches[0].clientY
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!canPull.current || touchStartY.current === null || isRefreshing) {return}

    const currentY = e.touches[0].clientY
    const delta = currentY - touchStartY.current

    if (delta > 0) {
      // Apply resistance - pull distance increases logarithmically
      const distance = Math.min(delta * 0.5, threshold * 1.5)
      setPullDistance(distance)
    }
  }, [isRefreshing, threshold])

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      triggerHaptic([10, 30, 10])

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }

    touchStartY.current = null
    setPullDistance(0)
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  const onTouchCancel = useCallback(() => {
    touchStartY.current = null
    setPullDistance(0)
  }, [])

  return {
    pullDistance,
    isRefreshing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
  }
}

export default useSwipeGesture
