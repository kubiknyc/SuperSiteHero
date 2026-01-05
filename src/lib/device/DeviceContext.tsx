/**
 * Device Context
 *
 * Provides device state throughout the app with orientation change handling.
 * Allows components to respond to device mode and orientation changes.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  type DeviceMode,
  detectDeviceMode,
  getDeviceMode,
  setDeviceModeOverride,
  clearDeviceModeOverride,
  hasDeviceModeOverride,
} from './detection';

export type Orientation = 'portrait' | 'landscape';

export interface DeviceContextValue {
  /** Current device mode (mobile or desktop) */
  mode: DeviceMode;
  /** Current orientation */
  orientation: Orientation;
  /** Whether the device has touch capability */
  isTouch: boolean;
  /** Current viewport width */
  viewportWidth: number;
  /** Current viewport height */
  viewportHeight: number;
  /** Whether user has manually overridden the device mode */
  hasOverride: boolean;
  /** Whether device is transitioning between modes */
  isTransitioning: boolean;
  /** Manually set the device mode (persists across sessions) */
  setMode: (mode: DeviceMode) => void;
  /** Reset to auto-detection */
  resetMode: () => void;
}

const DeviceContext = createContext<DeviceContextValue | null>(null);

function getOrientation(): Orientation {
  if (typeof window === 'undefined') return 'portrait';
  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
}

function getIsTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia?.('(pointer: coarse)').matches ?? false)
  );
}

interface DeviceProviderProps {
  children: ReactNode;
}

export function DeviceProvider({ children }: DeviceProviderProps) {
  const [mode, setModeState] = useState<DeviceMode>(() => getDeviceMode());
  const [orientation, setOrientation] = useState<Orientation>(() => getOrientation());
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 768
  );
  const [isTouch] = useState(() => getIsTouchDevice());
  const [hasOverride, setHasOverride] = useState(() => hasDeviceModeOverride());
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle resize and orientation changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      const newOrientation = newWidth > newHeight ? 'landscape' : 'portrait';

      setViewportWidth(newWidth);
      setViewportHeight(newHeight);
      setOrientation(newOrientation);

      // Only auto-switch modes if no user override
      if (!hasDeviceModeOverride()) {
        const newMode = detectDeviceMode();
        if (newMode !== mode) {
          // Brief transition state for smooth mode switch
          setIsTransitioning(true);
          timeoutId = setTimeout(() => {
            setModeState(newMode);
            setIsTransitioning(false);
          }, 150);
        }
      }
    };

    // Debounced resize handler
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout);
    };
  }, [mode]);

  // Set data attribute on html element for CSS
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-device-mode', mode);
      document.documentElement.setAttribute('data-orientation', orientation);
    }
  }, [mode, orientation]);

  const setMode = useCallback((newMode: DeviceMode) => {
    setDeviceModeOverride(newMode);
    setModeState(newMode);
    setHasOverride(true);
  }, []);

  const resetMode = useCallback(() => {
    clearDeviceModeOverride();
    setHasOverride(false);
    const detected = detectDeviceMode();
    setModeState(detected);
  }, []);

  const value = useMemo<DeviceContextValue>(
    () => ({
      mode,
      orientation,
      isTouch,
      viewportWidth,
      viewportHeight,
      hasOverride,
      isTransitioning,
      setMode,
      resetMode,
    }),
    [mode, orientation, isTouch, viewportWidth, viewportHeight, hasOverride, isTransitioning, setMode, resetMode]
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

/**
 * Hook to access device context
 */
export function useDevice(): DeviceContextValue {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}

/**
 * Hook to check if currently in mobile mode
 */
export function useIsMobileMode(): boolean {
  const { mode } = useDevice();
  return mode === 'mobile';
}

/**
 * Hook to check if currently in desktop mode
 */
export function useIsDesktopMode(): boolean {
  const { mode } = useDevice();
  return mode === 'desktop';
}

/**
 * Hook for responsive layout selection
 */
export function useResponsiveLayout(): 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop' {
  const { mode, orientation, viewportWidth, isTouch } = useDevice();

  if (mode === 'mobile') {
    return 'mobile';
  }

  // Desktop mode but check for tablet characteristics
  if (isTouch && viewportWidth < 1200) {
    return orientation === 'portrait' ? 'tablet-portrait' : 'tablet-landscape';
  }

  return 'desktop';
}
