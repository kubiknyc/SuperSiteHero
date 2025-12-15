/**
 * Touch Gesture Utilities
 *
 * Provides reusable hooks and utilities for touch-based interactions
 * including swipe detection, long-press, pinch-to-zoom, and pull-to-refresh.
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeEvent {
  direction: SwipeDirection;
  deltaX: number;
  deltaY: number;
  velocity: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface PinchEvent {
  scale: number;
  centerX: number;
  centerY: number;
  initialDistance: number;
  currentDistance: number;
}

export interface LongPressEvent {
  x: number;
  y: number;
  target: EventTarget | null;
}

export interface SwipeState {
  isSwiping: boolean;
  direction: SwipeDirection | null;
  deltaX: number;
  deltaY: number;
  progress: number; // 0-1 based on threshold
}

export interface UseSwipeOptions {
  onSwipe?: (event: SwipeEvent) => void;
  onSwipeLeft?: (event: SwipeEvent) => void;
  onSwipeRight?: (event: SwipeEvent) => void;
  onSwipeUp?: (event: SwipeEvent) => void;
  onSwipeDown?: (event: SwipeEvent) => void;
  onSwipeStart?: () => void;
  onSwipeMove?: (state: SwipeState) => void;
  onSwipeEnd?: (state: SwipeState) => void;
  threshold?: number; // minimum distance to trigger swipe
  velocityThreshold?: number; // minimum velocity to trigger swipe
  preventScroll?: boolean;
  enabled?: boolean;
}

export interface UseLongPressOptions {
  onLongPress: (event: LongPressEvent) => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  delay?: number; // milliseconds to hold before triggering
  threshold?: number; // max movement allowed during long press
  enabled?: boolean;
}

export interface UsePinchOptions {
  onPinch?: (event: PinchEvent) => void;
  onPinchStart?: (event: PinchEvent) => void;
  onPinchEnd?: (event: PinchEvent) => void;
  minScale?: number;
  maxScale?: number;
  enabled?: boolean;
}

export interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // pull distance to trigger refresh
  resistance?: number; // resistance factor (higher = harder to pull)
  enabled?: boolean;
}

export interface PullToRefreshState {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
  canRefresh: boolean;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate the distance between two touch points
 */
function getTouchDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate the center point between two touches
 */
function getTouchCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
}

/**
 * Get the primary swipe direction based on deltas
 */
function getSwipeDirection(deltaX: number, deltaY: number): SwipeDirection {
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  if (absDeltaX > absDeltaY) {
    return deltaX > 0 ? 'right' : 'left';
  }
  return deltaY > 0 ? 'down' : 'up';
}

/**
 * Check if the device supports touch events
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {return false;}
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Trigger haptic feedback if supported
 */
export function triggerHapticFeedback(type: 'light' | 'medium' | 'heavy' = 'medium'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
    navigator.vibrate(duration);
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for detecting swipe gestures
 */
export function useSwipe<T extends HTMLElement = HTMLElement>(
  options: UseSwipeOptions = {}
): {
  ref: React.RefObject<T>;
  state: SwipeState;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
} {
  const {
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onSwipeStart,
    onSwipeMove,
    onSwipeEnd,
    threshold = 50,
    velocityThreshold = 0.3,
    preventScroll = false,
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const startPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    direction: null,
    deltaX: 0,
    deltaY: 0,
    progress: 0,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || e.touches.length !== 1) {return;}

      const touch = e.touches[0];
      startPos.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      setState({
        isSwiping: true,
        direction: null,
        deltaX: 0,
        deltaY: 0,
        progress: 0,
      });

      onSwipeStart?.();
    },
    [enabled, onSwipeStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startPos.current || e.touches.length !== 1) {return;}

      const touch = e.touches[0];
      const deltaX = touch.clientX - startPos.current.x;
      const deltaY = touch.clientY - startPos.current.y;
      const direction = getSwipeDirection(deltaX, deltaY);
      const progress = Math.min(
        1,
        Math.max(Math.abs(deltaX), Math.abs(deltaY)) / threshold
      );

      if (preventScroll && Math.abs(deltaX) > Math.abs(deltaY)) {
        e.preventDefault();
      }

      const newState: SwipeState = {
        isSwiping: true,
        direction,
        deltaX,
        deltaY,
        progress,
      };

      setState(newState);
      onSwipeMove?.(newState);
    },
    [enabled, threshold, preventScroll, onSwipeMove]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startPos.current) {return;}

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startPos.current.x;
      const deltaY = touch.clientY - startPos.current.y;
      const duration = Date.now() - startPos.current.time;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const velocity = distance / duration;
      const direction = getSwipeDirection(deltaX, deltaY);

      const finalState: SwipeState = {
        isSwiping: false,
        direction,
        deltaX,
        deltaY,
        progress: Math.min(1, distance / threshold),
      };

      setState({
        isSwiping: false,
        direction: null,
        deltaX: 0,
        deltaY: 0,
        progress: 0,
      });

      // Check if swipe threshold is met
      const isValidSwipe =
        distance >= threshold || velocity >= velocityThreshold;

      if (isValidSwipe) {
        const event: SwipeEvent = {
          direction,
          deltaX,
          deltaY,
          velocity,
          startX: startPos.current.x,
          startY: startPos.current.y,
          endX: touch.clientX,
          endY: touch.clientY,
        };

        onSwipe?.(event);

        switch (direction) {
          case 'left':
            onSwipeLeft?.(event);
            break;
          case 'right':
            onSwipeRight?.(event);
            break;
          case 'up':
            onSwipeUp?.(event);
            break;
          case 'down':
            onSwipeDown?.(event);
            break;
        }

        triggerHapticFeedback('light');
      }

      onSwipeEnd?.(finalState);
      startPos.current = null;
    },
    [
      enabled,
      threshold,
      velocityThreshold,
      onSwipe,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onSwipeEnd,
    ]
  );

  return {
    ref,
    state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * Hook for detecting long press gestures
 */
export function useLongPress<T extends HTMLElement = HTMLElement>(
  options: UseLongPressOptions
): {
  ref: React.RefObject<T>;
  isPressed: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onTouchCancel: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onMouseLeave: () => void;
  };
} {
  const {
    onLongPress,
    onPressStart,
    onPressEnd,
    delay = 500,
    threshold = 10,
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleStart = useCallback(
    (x: number, y: number, target: EventTarget | null) => {
      if (!enabled) {return;}

      startPosRef.current = { x, y };
      setIsPressed(true);
      onPressStart?.();

      timerRef.current = setTimeout(() => {
        onLongPress({ x, y, target });
        triggerHapticFeedback('medium');
        setIsPressed(false);
        onPressEnd?.();
      }, delay);
    },
    [enabled, delay, onLongPress, onPressStart, onPressEnd]
  );

  const handleMove = useCallback(
    (x: number, y: number) => {
      if (!startPosRef.current) {return;}

      const deltaX = Math.abs(x - startPosRef.current.x);
      const deltaY = Math.abs(y - startPosRef.current.y);

      if (deltaX > threshold || deltaY > threshold) {
        clearTimer();
        setIsPressed(false);
        onPressEnd?.();
      }
    },
    [threshold, clearTimer, onPressEnd]
  );

  const handleEnd = useCallback(() => {
    clearTimer();
    setIsPressed(false);
    startPosRef.current = null;
    onPressEnd?.();
  }, [clearTimer, onPressEnd]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return {
    ref,
    isPressed,
    handlers: {
      onTouchStart: (e: React.TouchEvent) => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY, e.target);
      },
      onTouchMove: (e: React.TouchEvent) => {
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      },
      onTouchEnd: handleEnd,
      onTouchCancel: handleEnd,
      onMouseDown: (e: React.MouseEvent) => {
        handleStart(e.clientX, e.clientY, e.target);
      },
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd,
    },
  };
}

/**
 * Hook for detecting pinch-to-zoom gestures
 */
export function usePinch<T extends HTMLElement = HTMLElement>(
  options: UsePinchOptions = {}
): {
  ref: React.RefObject<T>;
  scale: number;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
} {
  const {
    onPinch,
    onPinchStart,
    onPinchEnd,
    minScale = 0.5,
    maxScale = 3,
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const [scale, setScale] = useState(1);
  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef(1);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || e.touches.length !== 2) {return;}

      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);

      initialDistanceRef.current = distance;
      initialScaleRef.current = scale;

      onPinchStart?.({
        scale,
        centerX: center.x,
        centerY: center.y,
        initialDistance: distance,
        currentDistance: distance,
      });
    },
    [enabled, scale, onPinchStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || e.touches.length !== 2 || !initialDistanceRef.current)
        {return;}

      e.preventDefault();

      const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      const scaleChange = currentDistance / initialDistanceRef.current;
      const newScale = Math.min(
        maxScale,
        Math.max(minScale, initialScaleRef.current * scaleChange)
      );

      setScale(newScale);

      const event: PinchEvent = {
        scale: newScale,
        centerX: center.x,
        centerY: center.y,
        initialDistance: initialDistanceRef.current,
        currentDistance,
      };

      onPinch?.(event);
    },
    [enabled, minScale, maxScale, onPinch]
  );

  const handleTouchEnd = useCallback(
    (_e: React.TouchEvent) => {
      if (!enabled || !initialDistanceRef.current) {return;}

      const event: PinchEvent = {
        scale,
        centerX: 0,
        centerY: 0,
        initialDistance: initialDistanceRef.current,
        currentDistance: initialDistanceRef.current * scale,
      };

      onPinchEnd?.(event);
      initialDistanceRef.current = null;
    },
    [enabled, scale, onPinchEnd]
  );

  return {
    ref,
    scale,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * Hook for pull-to-refresh functionality
 */
export function usePullToRefresh<T extends HTMLElement = HTMLElement>(
  options: UsePullToRefreshOptions
): {
  ref: React.RefObject<T>;
  state: PullToRefreshState;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
} {
  const {
    onRefresh,
    threshold = 80,
    resistance = 2.5,
    enabled = true,
  } = options;

  const ref = useRef<T>(null);
  const startYRef = useRef<number | null>(null);
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    pullDistance: 0,
    isRefreshing: false,
    canRefresh: false,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || state.isRefreshing) {return;}

      // Only activate at the top of the scrollable area
      const element = ref.current;
      if (element && element.scrollTop > 0) {return;}

      startYRef.current = e.touches[0].clientY;
      setState((prev) => ({ ...prev, isPulling: true }));
    },
    [enabled, state.isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!enabled || !startYRef.current || state.isRefreshing) {return;}

      const deltaY = e.touches[0].clientY - startYRef.current;

      // Only allow pulling down
      if (deltaY < 0) {
        startYRef.current = null;
        setState((prev) => ({
          ...prev,
          isPulling: false,
          pullDistance: 0,
          canRefresh: false,
        }));
        return;
      }

      // Apply resistance
      const pullDistance = deltaY / resistance;
      const canRefresh = pullDistance >= threshold;

      if (pullDistance > 0) {
        e.preventDefault();
      }

      setState((prev) => ({
        ...prev,
        isPulling: true,
        pullDistance,
        canRefresh,
      }));
    },
    [enabled, state.isRefreshing, threshold, resistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || !startYRef.current) {return;}

    startYRef.current = null;

    if (state.canRefresh && !state.isRefreshing) {
      setState((prev) => ({
        ...prev,
        isPulling: false,
        isRefreshing: true,
      }));

      triggerHapticFeedback('medium');

      try {
        await onRefresh();
      } finally {
        setState({
          isPulling: false,
          pullDistance: 0,
          isRefreshing: false,
          canRefresh: false,
        });
      }
    } else {
      setState({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
        canRefresh: false,
      });
    }
  }, [enabled, state.canRefresh, state.isRefreshing, onRefresh]);

  return {
    ref,
    state,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

/**
 * Hook for double-tap detection (useful for zoom)
 */
export function useDoubleTap<T extends HTMLElement = HTMLElement>(
  onDoubleTap: (x: number, y: number) => void,
  delay = 300
): {
  ref: React.RefObject<T>;
  handlers: {
    onTouchEnd: (e: React.TouchEvent) => void;
  };
} {
  const ref = useRef<T>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      const now = Date.now();

      if (
        lastTapRef.current &&
        now - lastTapRef.current.time < delay &&
        Math.abs(touch.clientX - lastTapRef.current.x) < 30 &&
        Math.abs(touch.clientY - lastTapRef.current.y) < 30
      ) {
        onDoubleTap(touch.clientX, touch.clientY);
        lastTapRef.current = null;
      } else {
        lastTapRef.current = {
          time: now,
          x: touch.clientX,
          y: touch.clientY,
        };
      }
    },
    [onDoubleTap, delay]
  );

  return {
    ref,
    handlers: {
      onTouchEnd: handleTouchEnd,
    },
  };
}

// ============================================================================
// CSS Utility Classes for Touch-Friendly UI
// ============================================================================

/**
 * Returns Tailwind CSS classes for touch-friendly minimum touch targets
 * Following WCAG 2.1 guidelines (44x44px minimum)
 */
export const touchTargetClasses = {
  /** Minimum 44x44px touch target */
  minimum: 'min-h-[44px] min-w-[44px]',
  /** Comfortable 48x48px touch target */
  comfortable: 'min-h-[48px] min-w-[48px]',
  /** Large 56x56px touch target for primary actions */
  large: 'min-h-[56px] min-w-[56px]',
};

/**
 * Returns Tailwind CSS classes for touch-friendly spacing
 */
export const touchSpacingClasses = {
  /** Gap between interactive elements (minimum 8px) */
  gap: 'gap-2',
  /** Padding for touch targets */
  padding: 'p-3',
  /** Margin between sections */
  margin: 'my-4',
};

export default {
  useSwipe,
  useLongPress,
  usePinch,
  usePullToRefresh,
  useDoubleTap,
  isTouchDevice,
  triggerHapticFeedback,
  touchTargetClasses,
  touchSpacingClasses,
};
