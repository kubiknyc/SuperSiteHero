/**
 * Tests for useOrientation hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useOrientation,
  useIsTabletLayout,
  useResponsiveLayout,
  lockOrientation,
  unlockOrientation,
  type Orientation,
  type DeviceType,
} from './useOrientation';

// Mock window properties
const mockWindow = (width: number, height: number, touchEnabled = false) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });

  // Mock touch detection
  Object.defineProperty(navigator, 'maxTouchPoints', {
    writable: true,
    configurable: true,
    value: touchEnabled ? 1 : 0,
  });

  // Mock matchMedia for touch detection
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: touchEnabled && query.includes('coarse'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Mock requestAnimationFrame
const mockRequestAnimationFrame = () => {
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
};

describe('useOrientation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestAnimationFrame();
  });

  describe('basic orientation detection', () => {
    it('should detect landscape orientation when width > height', () => {
      mockWindow(1024, 768);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.orientation).toBe('landscape');
      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
    });

    it('should detect portrait orientation when height > width', () => {
      mockWindow(768, 1024);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.orientation).toBe('portrait');
      expect(result.current.width).toBe(768);
      expect(result.current.height).toBe(1024);
    });
  });

  describe('device type detection', () => {
    it('should detect phone for small screens', () => {
      mockWindow(375, 667, true);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.deviceType).toBe('phone');
    });

    it('should detect tablet for medium screens', () => {
      mockWindow(768, 1024, true);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.deviceType).toBe('tablet');
    });

    it('should detect desktop for large screens', () => {
      mockWindow(1920, 1080, false);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.deviceType).toBe('desktop');
    });
  });

  describe('tablet detection', () => {
    it('should detect tablet portrait mode', () => {
      mockWindow(768, 1024, true);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.isTablet).toBe(true);
      expect(result.current.isTabletPortrait).toBe(true);
      expect(result.current.isTabletLandscape).toBe(false);
    });

    it('should detect tablet landscape mode', () => {
      mockWindow(1024, 768, true);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.isTablet).toBe(true);
      expect(result.current.isTabletLandscape).toBe(true);
      expect(result.current.isTabletPortrait).toBe(false);
    });

    it('should not detect tablet for desktop without touch', () => {
      mockWindow(1024, 768, false);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.isTablet).toBe(false);
    });
  });

  describe('touch device detection', () => {
    it('should detect touch device when maxTouchPoints > 0', () => {
      mockWindow(1024, 768, true);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.isTouchDevice).toBe(true);
    });

    it('should not detect touch device on desktop', () => {
      mockWindow(1920, 1080, false);
      const { result } = renderHook(() => useOrientation());

      expect(result.current.isTouchDevice).toBe(false);
    });
  });

  describe('orientation change handling', () => {
    it('should call onOrientationChange callback when orientation changes', async () => {
      mockWindow(1024, 768);
      const onOrientationChange = jest.fn();

      renderHook(() => useOrientation({ onOrientationChange }));

      // Simulate orientation change
      mockWindow(768, 1024);
      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(onOrientationChange).toHaveBeenCalled();
      });
    });

    it('should not update state when disabled', () => {
      mockWindow(1024, 768);
      const { result } = renderHook(() => useOrientation({ enabled: false }));

      // Change window size
      mockWindow(768, 1024);
      window.dispatchEvent(new Event('resize'));

      // State should remain the same (landscape)
      expect(result.current.orientation).toBe('landscape');
    });
  });
});

describe('useIsTabletLayout', () => {
  beforeEach(() => {
    mockRequestAnimationFrame();
  });

  it('should return true for tablets', () => {
    mockWindow(768, 1024, true);
    const { result } = renderHook(() => useIsTabletLayout());

    expect(result.current).toBe(true);
  });

  it('should return true for tablet-width desktop browsers', () => {
    mockWindow(900, 1200, false);
    const { result } = renderHook(() => useIsTabletLayout());

    expect(result.current).toBe(true);
  });

  it('should return false for phones', () => {
    mockWindow(375, 667, true);
    const { result } = renderHook(() => useIsTabletLayout());

    expect(result.current).toBe(false);
  });

  it('should return false for large desktops', () => {
    mockWindow(1920, 1080, false);
    const { result } = renderHook(() => useIsTabletLayout());

    expect(result.current).toBe(false);
  });
});

describe('useResponsiveLayout', () => {
  beforeEach(() => {
    mockRequestAnimationFrame();
  });

  it('should return "mobile" for phone-sized screens', () => {
    mockWindow(375, 667, true);
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toBe('mobile');
  });

  it('should return "tablet-portrait" for tablets in portrait', () => {
    mockWindow(768, 1024, true);
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toBe('tablet-portrait');
  });

  it('should return "tablet-landscape" for tablets in landscape', () => {
    mockWindow(1024, 768, true);
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toBe('tablet-landscape');
  });

  it('should return "desktop" for large screens', () => {
    mockWindow(1920, 1080, false);
    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current).toBe('desktop');
  });
});

describe('orientation lock utilities', () => {
  describe('lockOrientation', () => {
    it('should call screen.orientation.lock when available', async () => {
      const lockMock = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(window.screen, 'orientation', {
        value: { lock: lockMock },
        configurable: true,
      });

      const result = await lockOrientation('landscape');

      expect(lockMock).toHaveBeenCalledWith('landscape');
      expect(result).toBe(true);
    });

    it('should return false when lock is not available', async () => {
      Object.defineProperty(window.screen, 'orientation', {
        value: {},
        configurable: true,
      });

      const result = await lockOrientation('portrait');

      expect(result).toBe(false);
    });

    it('should return false when lock throws an error', async () => {
      const lockMock = jest.fn().mockRejectedValue(new Error('Not supported'));
      Object.defineProperty(window.screen, 'orientation', {
        value: { lock: lockMock },
        configurable: true,
      });

      const result = await lockOrientation('portrait');

      expect(result).toBe(false);
    });
  });

  describe('unlockOrientation', () => {
    it('should call screen.orientation.unlock when available', () => {
      const unlockMock = jest.fn();
      Object.defineProperty(window.screen, 'orientation', {
        value: { unlock: unlockMock },
        configurable: true,
      });

      unlockOrientation();

      expect(unlockMock).toHaveBeenCalled();
    });

    it('should not throw when unlock is not available', () => {
      Object.defineProperty(window.screen, 'orientation', {
        value: {},
        configurable: true,
      });

      expect(() => unlockOrientation()).not.toThrow();
    });
  });
});

describe('edge cases', () => {
  beforeEach(() => {
    mockRequestAnimationFrame();
  });

  it('should handle square screens as landscape', () => {
    mockWindow(1024, 1024);
    const { result } = renderHook(() => useOrientation());

    // Width >= height means landscape
    expect(result.current.orientation).toBe('landscape');
  });

  it('should handle very small screens', () => {
    mockWindow(320, 480, true);
    const { result } = renderHook(() => useOrientation());

    expect(result.current.deviceType).toBe('phone');
    expect(result.current.isTablet).toBe(false);
  });

  it('should handle very large screens', () => {
    mockWindow(2560, 1440, false);
    const { result } = renderHook(() => useOrientation());

    expect(result.current.deviceType).toBe('desktop');
  });
});
