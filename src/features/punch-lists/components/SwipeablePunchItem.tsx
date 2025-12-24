// File: /src/features/punch-lists/components/SwipeablePunchItem.tsx
// Swipeable punch item card with touch gestures for status updates
// Milestone 1.1: Enhanced Punch List Mobile UX

import React, { useState, useCallback } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  MapPin,
  Calendar,
  User,
  Camera,
} from 'lucide-react'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { cn } from '@/lib/utils'
import type { PunchItem, PunchItemStatus } from '@/types/database'

interface SwipeablePunchItemProps {
  punchItem: PunchItem
  onComplete?: (punchItemId: string) => void
  onReject?: (punchItemId: string) => void
  onPress?: (punchItem: PunchItem) => void
  onSwipeStart?: () => void
  onSwipeEnd?: () => void
  disabled?: boolean
  showSwipeHints?: boolean
  className?: string
}

// Haptic feedback utility
function triggerHaptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern)
    } catch {
      // Ignore - vibration may not be supported
    }
  }
}

// Status badge colors
const statusColors: Record<string, string> = {
  open: 'bg-error-light text-red-800',
  'in-progress': 'bg-warning-light text-yellow-800',
  completed: 'bg-success-light text-green-800',
  verified: 'bg-info-light text-blue-800',
  rejected: 'bg-muted text-foreground',
}

// Priority indicator colors
const priorityColors: Record<string, string> = {
  low: 'bg-gray-400',
  normal: 'bg-blue-500',
  high: 'bg-red-500',
}

export function SwipeablePunchItem({
  punchItem,
  onComplete,
  onReject,
  onPress,
  onSwipeStart,
  onSwipeEnd,
  disabled = false,
  showSwipeHints = true,
  className,
}: SwipeablePunchItemProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle swipe completion
  const handleSwipeRight = useCallback(() => {
    if (disabled) {return}
    setIsAnimating(true)
    triggerHaptic([10, 50, 10])

    setTimeout(() => {
      onComplete?.(punchItem.id)
      setIsAnimating(false)
    }, 200)
  }, [disabled, onComplete, punchItem.id])

  // Handle swipe rejection
  const handleSwipeLeft = useCallback(() => {
    if (disabled) {return}
    setIsAnimating(true)
    triggerHaptic([10, 50, 10])

    setTimeout(() => {
      onReject?.(punchItem.id)
      setIsAnimating(false)
    }, 200)
  }, [disabled, onReject, punchItem.id])

  // Swipe gesture hook
  const { state, handlers, reset } = useSwipeGesture({
    threshold: 100,
    maxSwipeTime: 500,
    hapticFeedback: true,
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft,
    onSwiping: (direction, distance, progress) => {
      if (progress > 0.1 && !disabled) {
        onSwipeStart?.()
      }
    },
    onSwipeCancel: () => {
      onSwipeEnd?.()
    },
  })

  // Handle card press
  const handlePress = () => {
    if (!state.isSwiping && !isAnimating) {
      onPress?.(punchItem)
    }
  }

  // Calculate transform based on swipe state
  const getTransform = () => {
    if (isAnimating) {
      if (state.direction === 'right') {
        return 'translateX(100%)'
      }
      if (state.direction === 'left') {
        return 'translateX(-100%)'
      }
    }
    if (state.isSwiping && state.direction) {
      const offset = state.direction === 'right' ? state.distance : -state.distance
      return `translateX(${offset}px)`
    }
    return 'translateX(0)'
  }

  // Get background action indicator
  const getBackgroundAction = () => {
    if (!state.isSwiping || !state.direction) {return null}

    if (state.direction === 'right') {
      return (
        <div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-start pl-6 transition-colors',
            state.progress >= 1 ? 'bg-green-500' : 'bg-green-200'
          )}
          style={{ width: Math.max(state.distance, 80) }}
        >
          <CheckCircle2
            className={cn(
              'h-8 w-8 transition-transform',
              state.progress >= 1 ? 'text-white scale-110' : 'text-success'
            )}
          />
          {state.progress >= 1 && (
            <span className="ml-2 text-white font-medium">Complete</span>
          )}
        </div>
      )
    }

    if (state.direction === 'left') {
      return (
        <div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-end pr-6 transition-colors',
            state.progress >= 1 ? 'bg-red-500' : 'bg-red-200'
          )}
          style={{ width: Math.max(state.distance, 80) }}
        >
          {state.progress >= 1 && (
            <span className="mr-2 text-white font-medium">Reject</span>
          )}
          <XCircle
            className={cn(
              'h-8 w-8 transition-transform',
              state.progress >= 1 ? 'text-white scale-110' : 'text-error'
            )}
          />
        </div>
      )
    }

    return null
  }

  // Location string
  const locationParts = [
    punchItem.building,
    punchItem.floor,
    punchItem.room,
  ].filter(Boolean)
  const locationString = locationParts.length > 0 ? locationParts.join(' / ') : null

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className)}>
      {/* Background action indicators */}
      {getBackgroundAction()}

      {/* Card content */}
      <div
        {...handlers}
        onClick={handlePress}
        className={cn(
          'relative bg-card border rounded-lg p-4 shadow-sm transition-all duration-200',
          'touch-manipulation cursor-pointer',
          !disabled && 'active:bg-surface',
          isAnimating && 'opacity-50',
          state.isSwiping && 'shadow-md'
        )}
        style={{
          transform: getTransform(),
          transition: state.isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Priority indicator */}
        <div
          className={cn(
            'absolute top-0 left-0 w-1 h-full rounded-l-lg',
            priorityColors[punchItem.priority || 'normal']
          )}
        />

        {/* Main content */}
        <div className="pl-2">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate pr-2" className="heading-subsection">
                {punchItem.title}
              </h3>
              {punchItem.description && (
                <p className="text-sm text-secondary line-clamp-2 mt-0.5">
                  {punchItem.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full',
                  statusColors[punchItem.status || 'open']
                )}
              >
                {punchItem.status || 'open'}
              </span>
              <ChevronRight className="h-5 w-5 text-disabled" />
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-muted">
            {/* Trade */}
            <span className="font-medium text-secondary">{punchItem.trade}</span>

            {/* Location */}
            {locationString && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {locationString}
              </span>
            )}

            {/* Due date */}
            {punchItem.due_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(punchItem.due_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Status change request indicator */}
          {(punchItem as any).status_change_request && (
            <div className="mt-2 flex items-center gap-1 text-xs text-warning bg-warning-light px-2 py-1 rounded">
              <AlertCircle className="h-3 w-3" />
              Status change requested
            </div>
          )}
        </div>

        {/* Swipe hints */}
        {showSwipeHints && !state.isSwiping && !disabled && (
          <div className="absolute inset-x-0 bottom-1 flex justify-between px-4 text-[10px] text-disabled pointer-events-none">
            <span className="flex items-center gap-0.5">
              <XCircle className="h-3 w-3" />
              Swipe to reject
            </span>
            <span className="flex items-center gap-0.5">
              Swipe to complete
              <CheckCircle2 className="h-3 w-3" />
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default SwipeablePunchItem
