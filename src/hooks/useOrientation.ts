/**
 * useOrientation Hook
 *
 * Detects device orientation changes and provides orientation-aware utilities
 * for responsive tablet layouts.
 *
 * Features:
 * - Detects portrait/landscape orientation
 * - Provides device type detection (phone/tablet/desktop)
 * - Handles orientation change events
 * - Supports orientation lock API where available
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../lib/utils/logger';


export type Orientation = 'portrait' | 'landscape';
export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface OrientationState {
  /** Current orientation: 'portrait' or 'landscape' */
  orientation: Orientation;
  /** Screen width in pixels */
  width: number;
  /** Screen height in pixels */
  height: number;
  /** Detected device type based on screen size */
  deviceType: DeviceType;
  /** Whether the device is a tablet in portrait mode */
  isTabletPortrait: boolean;
  /** Whether the device is a tablet in landscape mode */
  isTabletLandscape: boolean;
  /** Whether the device is any type of tablet */
  isTablet: boolean;
  /** Whether touch is the primary input method */
  isTouchDevice: boolean;
  /** Orientation angle (0, 90, 180, 270) */
  angle: number;
}

export interface UseOrientationOptions {
  /** Callback when orientation changes */
  onOrientationChange?: (state: OrientationState) => void;
  /** Enable/disable orientation detection */
  enabled?: boolean;
}

// Breakpoints for device type detection
const BREAKPOINTS = {
  phone: { min: 0, max: 767 },
  tablet: { min: 768, max: 1199 },
  desktop: { min: 1200, max: Infinity },
} as const;

// More specific tablet detection
const TABLET_PORTRAIT_MIN = 768;
const TABLET_LANDSCAPE_MIN = 1024;
const TABLET_LANDSCAPE_MAX = 1366;

/**
 * Get device type based on screen width
 */
function getDeviceType(width: number): DeviceType {
  if (width < BREAKPOINTS.tablet.min) {
    return 'phone';
  } else if (width < BREAKPOINTS.desktop.min) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Determine orientation from width and height
 */
function getOrientation(width: number, height: number): Orientation {
  return width >= height ? 'landscape' : 'portrait';
}

/**
 * Get orientation angle from Screen Orientation API or fallback
 */
function getOrientationAngle(): number {
  if (typeof window !== 'undefined' && window.screen?.orientation) {
    return window.screen.orientation.angle;
  }
  // Fallback for older browsers
  if (typeof window !== 'undefined' && 'orientation' in window) {
    const orientation = (window as Window & { orientation?: number }).orientation || 0;
    return Math.abs(orientation);
  }
  return 0;
}

/**
 * Check if device has touch capability
 */
function isTouchCapable(): boolean {
  if (typeof window === 'undefined') {return false;}
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );
}

/**
 * Create orientation state object
 */
function createOrientationState(width: number, height: number): OrientationState {
  const orientation = getOrientation(width, height);
  const deviceType = getDeviceType(width);
  const angle = getOrientationAngle();
  const isTouchDevice = isTouchCapable();

  // Tablet detection considers both screen size and touch capability
  const isLikelyTablet = isTouchDevice && deviceType === 'tablet';

  // More granular tablet orientation detection
  const isTabletPortrait = isLikelyTablet &&
    orientation === 'portrait' &&
    width >= TABLET_PORTRAIT_MIN;

  const isTabletLandscape = isLikelyTablet &&
    orientation === 'landscape' &&
    width >= TABLET_LANDSCAPE_MIN &&
    width <= TABLET_LANDSCAPE_MAX;

  return {
    orientation,
    width,
    height,
    deviceType,
    isTabletPortrait,
    isTabletLandscape,
    isTablet: isLikelyTablet,
    isTouchDevice,
    angle,
  };
}

/**
 * Hook for detecting and responding to device orientation changes
 */
export function useOrientation(options: UseOrientationOptions = {}): OrientationState {
  const { onOrientationChange, enabled = true } = options;

  const [state, setState] = useState<OrientationState>(() => {
    if (typeof window === 'undefined') {
      // SSR fallback
      return createOrientationState(1024, 768);
    }
    return createOrientationState(window.innerWidth, window.innerHeight);
  });

  const handleOrientationChange = useCallback(() => {
    if (!enabled) {return;}

    // Small delay to ensure dimensions have updated after rotation
    requestAnimationFrame(() => {
      const newState = createOrientationState(
        window.innerWidth,
        window.innerHeight
      );

      setState(prevState => {
        // Only update if something actually changed
        const hasChanged =
          prevState.orientation !== newState.orientation ||
          prevState.width !== newState.width ||
          prevState.height !== newState.height ||
          prevState.deviceType !== newState.deviceType;

        if (hasChanged) {
          onOrientationChange?.(newState);
          return newState;
        }
        return prevState;
      });
    });
  }, [enabled, onOrientationChange]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {return;}

    // Initial state
    handleOrientationChange();

    // Modern Screen Orientation API
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    }

    // Resize event as fallback and for desktop resizing
    window.addEventListener('resize', handleOrientationChange);

    // Legacy orientation change event for older mobile browsers
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [enabled, handleOrientationChange]);

  return state;
}

/**
 * Hook for checking if current view should use tablet layout
 */
export function useIsTabletLayout(): boolean {
  const { isTablet, deviceType, width } = useOrientation();

  // Consider tablet layout for:
  // 1. Actual tablets (touch + tablet size)
  // 2. Desktop browsers in tablet-width range (for testing)
  const isTabletWidthRange = deviceType === 'tablet' && width >= TABLET_PORTRAIT_MIN;
  return isTablet || isTabletWidthRange;
}

/**
 * Hook for getting responsive layout type
 */
export function useResponsiveLayout(): 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop' {
  const { orientation, deviceType, isTablet, width } = useOrientation();

  return useMemo(() => {
    if (deviceType === 'phone') {
      return 'mobile';
    }

    const isTabletWidthRange = deviceType === 'tablet' && width >= TABLET_PORTRAIT_MIN;
    if (isTablet || isTabletWidthRange) {
      return orientation === 'portrait' ? 'tablet-portrait' : 'tablet-landscape';
    }

    return 'desktop';
  }, [orientation, deviceType, isTablet, width]);
}

/**
 * Utility to lock screen orientation (where supported)
 * Note: Requires fullscreen mode in most browsers
 */
export async function lockOrientation(
  orientation: OrientationLockType
): Promise<boolean> {
  if (typeof window === 'undefined') {return false;}

  try {
    if (window.screen?.orientation?.lock) {
      await window.screen.orientation.lock(orientation);
      return true;
    }
  } catch (_error) {
    logger.warn('Orientation lock not supported or denied:', _error);
  }
  return false;
}

/**
 * Utility to unlock screen orientation
 */
export function unlockOrientation(): void {
  if (typeof window === 'undefined') {return;}

  try {
    if (window.screen?.orientation?.unlock) {
      window.screen.orientation.unlock();
    }
  } catch (_error) {
    logger.warn('Orientation unlock failed:', _error);
  }
}

export default useOrientation;
