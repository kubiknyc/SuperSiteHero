/**
 * Pull to Refresh Hook
 *
 * Implements native-feeling pull-to-refresh for iOS PWAs.
 * Works with touch events and provides visual feedback.
 *
 * Features:
 * - Customizable pull threshold
 * - Haptic feedback on iOS (when available)
 * - Animated refresh indicator
 * - Prevents conflicts with native scroll
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePullToRefreshOptions {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>
  /** Pull distance required to trigger refresh (default: 80px) */
  threshold?: number
  /** Maximum pull distance (default: 120px) */
  maxPull?: number
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean
  /** Element to attach to (default: document.body) */
  targetRef?: React.RefObject<HTMLElement>
}

interface UsePullToRefreshReturn {
  /** Current pull distance in pixels */
  pullDistance: number
  /** Whether currently refreshing */
  isRefreshing: boolean
  /** Whether pull threshold has been met */
  isPulling: boolean
  /** Progress percentage (0-100) */
  pullProgress: number
  /** CSS transform style for pull indicator */
  pullStyle: React.CSSProperties
}

/**
 * Check if we're in a PWA standalone mode
 */
function isStandalone(): boolean {
  if (typeof window === 'undefined') {return false}
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
}

/**
 * Check if touch is at top of scrollable area
 */
function isAtTop(element: HTMLElement | null): boolean {
  if (!element) {
    return window.scrollY <= 0
  }
  return element.scrollTop <= 0
}

/**
 * Trigger haptic feedback if available
 */
function triggerHaptic(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10)
  }
}

/**
 * Hook for implementing pull-to-refresh in PWAs
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const { pullDistance, isRefreshing, pullStyle } = usePullToRefresh({
 *     onRefresh: async () => {
 *       await fetchData()
 *     }
 *   })
 *
 *   return (
 *     <div>
 *       <div style={pullStyle} className="refresh-indicator">
 *         {isRefreshing ? <Spinner /> : <ArrowDown />}
 *       </div>
 *       <Content />
 *     </div>
 *   )
 * }
 * ```
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  enabled = true,
  targetRef,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)

  const startY = useRef(0)
  const currentY = useRef(0)
  const isTracking = useRef(false)

  // Calculate progress percentage
  const pullProgress = Math.min(100, (pullDistance / threshold) * 100)

  // CSS style for pull indicator
  const pullStyle: React.CSSProperties = {
    transform: `translateY(${Math.min(pullDistance, maxPull)}px)`,
    opacity: pullProgress / 100,
    transition: isTracking.current ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
  }

  // Handle refresh trigger
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) {return}

    setIsRefreshing(true)
    triggerHaptic()

    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
      setPullDistance(0)
      setIsPulling(false)
    }
  }, [onRefresh, isRefreshing])

  // Touch event handlers
  useEffect(() => {
    if (!enabled) {return}
    if (typeof window === 'undefined') {return}

    // Only enable in PWA mode to avoid conflicts with browser's native pull-to-refresh
    if (!isStandalone()) {return}

    const target = targetRef?.current || document.body

    const handleTouchStart = (e: TouchEvent) => {
      // Only track if at top of scroll
      if (!isAtTop(targetRef?.current || null)) {return}
      if (isRefreshing) {return}

      startY.current = e.touches[0].clientY
      currentY.current = startY.current
      isTracking.current = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking.current) {return}
      if (isRefreshing) {return}

      currentY.current = e.touches[0].clientY
      const diff = currentY.current - startY.current

      // Only track downward pull from top
      if (diff > 0 && isAtTop(targetRef?.current || null)) {
        // Apply resistance to make it feel more natural
        const resistance = 0.5
        const adjustedDiff = Math.min(diff * resistance, maxPull)

        setPullDistance(adjustedDiff)
        setIsPulling(adjustedDiff >= threshold)

        // Prevent default scroll when pulling
        if (adjustedDiff > 10) {
          e.preventDefault()
        }

        // Haptic feedback when threshold is crossed
        if (adjustedDiff >= threshold && pullDistance < threshold) {
          triggerHaptic()
        }
      }
    }

    const handleTouchEnd = () => {
      if (!isTracking.current) {return}
      isTracking.current = false

      if (pullDistance >= threshold && !isRefreshing) {
        handleRefresh()
      } else {
        setPullDistance(0)
        setIsPulling(false)
      }
    }

    const handleTouchCancel = () => {
      isTracking.current = false
      setPullDistance(0)
      setIsPulling(false)
    }

    target.addEventListener('touchstart', handleTouchStart, { passive: true })
    target.addEventListener('touchmove', handleTouchMove, { passive: false })
    target.addEventListener('touchend', handleTouchEnd)
    target.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      target.removeEventListener('touchstart', handleTouchStart)
      target.removeEventListener('touchmove', handleTouchMove)
      target.removeEventListener('touchend', handleTouchEnd)
      target.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [enabled, isRefreshing, threshold, maxPull, pullDistance, handleRefresh, targetRef])

  return {
    pullDistance,
    isRefreshing,
    isPulling,
    pullProgress,
    pullStyle,
  }
}

export default usePullToRefresh
