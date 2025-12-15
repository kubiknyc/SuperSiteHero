/**
 * Tests for Touch Gesture Utilities
 */

import { renderHook, act } from '@testing-library/react';
import {
  useSwipe,
  useLongPress,
  usePinch,
  usePullToRefresh,
  useDoubleTap,
  isTouchDevice,
  triggerHapticFeedback,
  touchTargetClasses,
  touchSpacingClasses,
} from './touchGestures';

// Mock navigator.vibrate
const mockVibrate = vi.fn();
Object.defineProperty(navigator, 'vibrate', {
  value: mockVibrate,
  writable: true,
});

describe('touchGestures utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isTouchDevice', () => {
    it('returns false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      expect(isTouchDevice()).toBe(false);
      global.window = originalWindow;
    });

    it('detects touch support via ontouchstart', () => {
      // Mock ontouchstart
      const originalOntouchstart = (window as any).ontouchstart;
      (window as any).ontouchstart = true;
      expect(isTouchDevice()).toBe(true);
      (window as any).ontouchstart = originalOntouchstart;
    });
  });

  describe('triggerHapticFeedback', () => {
    it('calls navigator.vibrate with light duration', () => {
      triggerHapticFeedback('light');
      expect(mockVibrate).toHaveBeenCalledWith(10);
    });

    it('calls navigator.vibrate with medium duration', () => {
      triggerHapticFeedback('medium');
      expect(mockVibrate).toHaveBeenCalledWith(20);
    });

    it('calls navigator.vibrate with heavy duration', () => {
      triggerHapticFeedback('heavy');
      expect(mockVibrate).toHaveBeenCalledWith(30);
    });
  });

  describe('useSwipe hook', () => {
    it('returns initial state', () => {
      const { result } = renderHook(() => useSwipe());

      expect(result.current.state).toEqual({
        isSwiping: false,
        direction: null,
        deltaX: 0,
        deltaY: 0,
        progress: 0,
      });
    });

    it('returns handlers object', () => {
      const { result } = renderHook(() => useSwipe());

      expect(result.current.handlers).toHaveProperty('onTouchStart');
      expect(result.current.handlers).toHaveProperty('onTouchMove');
      expect(result.current.handlers).toHaveProperty('onTouchEnd');
    });

    it('respects enabled option', () => {
      const onSwipe = vi.fn();
      const { result } = renderHook(() =>
        useSwipe({ onSwipe, enabled: false })
      );

      // Simulate touch events
      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchStart(touchStart);
      });

      // Should not update state when disabled
      expect(result.current.state.isSwiping).toBe(false);
    });

    it('calls onSwipeStart when touch starts', () => {
      const onSwipeStart = vi.fn();
      const { result } = renderHook(() => useSwipe({ onSwipeStart }));

      const touchStart = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as unknown as React.TouchEvent;

      act(() => {
        result.current.handlers.onTouchStart(touchStart);
      });

      expect(onSwipeStart).toHaveBeenCalled();
      expect(result.current.state.isSwiping).toBe(true);
    });

    it('calculates swipe direction correctly', () => {
      const onSwipeRight = vi.fn();
      const { result } = renderHook(() =>
        useSwipe({ onSwipeRight, threshold: 20 })
      );

      // Start touch
      act(() => {
        result.current.handlers.onTouchStart({
          touches: [{ clientX: 100, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      // Move right
      act(() => {
        result.current.handlers.onTouchMove({
          touches: [{ clientX: 150, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      expect(result.current.state.direction).toBe('right');
      expect(result.current.state.deltaX).toBe(50);
    });
  });

  describe('useLongPress hook', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns initial state', () => {
      const { result } = renderHook(() =>
        useLongPress({ onLongPress: vi.fn() })
      );

      expect(result.current.isPressed).toBe(false);
    });

    it('returns handlers object', () => {
      const { result } = renderHook(() =>
        useLongPress({ onLongPress: vi.fn() })
      );

      expect(result.current.handlers).toHaveProperty('onTouchStart');
      expect(result.current.handlers).toHaveProperty('onTouchMove');
      expect(result.current.handlers).toHaveProperty('onTouchEnd');
      expect(result.current.handlers).toHaveProperty('onMouseDown');
    });

    it('triggers long press after delay', () => {
      const onLongPress = vi.fn();
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, delay: 500 })
      );

      act(() => {
        result.current.handlers.onTouchStart({
          touches: [{ clientX: 100, clientY: 100 }],
          target: null,
        } as unknown as React.TouchEvent);
      });

      expect(result.current.isPressed).toBe(true);
      expect(onLongPress).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).toHaveBeenCalledWith({
        x: 100,
        y: 100,
        target: null,
      });
    });

    it('cancels long press on move beyond threshold', () => {
      const onLongPress = vi.fn();
      const { result } = renderHook(() =>
        useLongPress({ onLongPress, delay: 500, threshold: 10 })
      );

      act(() => {
        result.current.handlers.onTouchStart({
          touches: [{ clientX: 100, clientY: 100 }],
          target: null,
        } as unknown as React.TouchEvent);
      });

      act(() => {
        result.current.handlers.onTouchMove({
          touches: [{ clientX: 120, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('usePinch hook', () => {
    it('returns initial state', () => {
      const { result } = renderHook(() => usePinch());

      expect(result.current.scale).toBe(1);
    });

    it('returns handlers object', () => {
      const { result } = renderHook(() => usePinch());

      expect(result.current.handlers).toHaveProperty('onTouchStart');
      expect(result.current.handlers).toHaveProperty('onTouchMove');
      expect(result.current.handlers).toHaveProperty('onTouchEnd');
    });

    it('ignores single-finger touches', () => {
      const onPinchStart = vi.fn();
      const { result } = renderHook(() => usePinch({ onPinchStart }));

      act(() => {
        result.current.handlers.onTouchStart({
          touches: [{ clientX: 100, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      expect(onPinchStart).not.toHaveBeenCalled();
    });

    it('detects pinch start with two fingers', () => {
      const onPinchStart = vi.fn();
      const { result } = renderHook(() => usePinch({ onPinchStart }));

      act(() => {
        result.current.handlers.onTouchStart({
          touches: [
            { clientX: 100, clientY: 100 },
            { clientX: 200, clientY: 100 },
          ],
        } as unknown as React.TouchEvent);
      });

      expect(onPinchStart).toHaveBeenCalled();
    });
  });

  describe('usePullToRefresh hook', () => {
    it('returns initial state', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      );

      expect(result.current.state).toEqual({
        isPulling: false,
        pullDistance: 0,
        isRefreshing: false,
        canRefresh: false,
      });
    });

    it('returns handlers object', () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      );

      expect(result.current.handlers).toHaveProperty('onTouchStart');
      expect(result.current.handlers).toHaveProperty('onTouchMove');
      expect(result.current.handlers).toHaveProperty('onTouchEnd');
    });
  });

  describe('useDoubleTap hook', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns handlers object', () => {
      const { result } = renderHook(() => useDoubleTap(vi.fn()));

      expect(result.current.handlers).toHaveProperty('onTouchEnd');
    });

    it('triggers callback on double tap', () => {
      const onDoubleTap = vi.fn();
      const { result } = renderHook(() => useDoubleTap(onDoubleTap, 300));

      // First tap
      act(() => {
        result.current.handlers.onTouchEnd({
          changedTouches: [{ clientX: 100, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      expect(onDoubleTap).not.toHaveBeenCalled();

      // Second tap within delay
      act(() => {
        vi.advanceTimersByTime(200);
        result.current.handlers.onTouchEnd({
          changedTouches: [{ clientX: 105, clientY: 105 }],
        } as unknown as React.TouchEvent);
      });

      expect(onDoubleTap).toHaveBeenCalledWith(105, 105);
    });

    it('does not trigger on slow double tap', () => {
      const onDoubleTap = vi.fn();
      const { result } = renderHook(() => useDoubleTap(onDoubleTap, 300));

      // First tap
      act(() => {
        result.current.handlers.onTouchEnd({
          changedTouches: [{ clientX: 100, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      // Second tap after delay
      act(() => {
        vi.advanceTimersByTime(400);
        result.current.handlers.onTouchEnd({
          changedTouches: [{ clientX: 100, clientY: 100 }],
        } as unknown as React.TouchEvent);
      });

      expect(onDoubleTap).not.toHaveBeenCalled();
    });
  });

  describe('CSS utility classes', () => {
    it('provides touch target classes', () => {
      expect(touchTargetClasses.minimum).toBe('min-h-[44px] min-w-[44px]');
      expect(touchTargetClasses.comfortable).toBe('min-h-[48px] min-w-[48px]');
      expect(touchTargetClasses.large).toBe('min-h-[56px] min-w-[56px]');
    });

    it('provides touch spacing classes', () => {
      expect(touchSpacingClasses.gap).toBe('gap-2');
      expect(touchSpacingClasses.padding).toBe('p-3');
      expect(touchSpacingClasses.margin).toBe('my-4');
    });
  });
});
