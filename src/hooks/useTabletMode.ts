/**
 * useTabletMode Hook
 *
 * Provides comprehensive tablet detection and optimization utilities
 * for responsive tablet layouts in both portrait and landscape orientations.
 *
 * Features:
 * - Detects tablet device type (standard tablet vs iPad Pro)
 * - Tracks orientation (portrait/landscape)
 * - Provides breakpoint utilities for tablet-specific layouts
 * - Supports responsive sidebar behavior
 * - Touch capability detection
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Tablet breakpoint definitions
const TABLET_BREAKPOINTS = {
  // Standard tablets (iPad, Android tablets)
  min: 768,
  max: 1024,
  // iPad Pro and larger tablets
  proMin: 1024,
  proMax: 1366,
  // Combined range for all tablets
  allMin: 768,
  allMax: 1366,
} as const;

export type TabletType = 'standard' | 'pro' | 'none';
export type TabletOrientation = 'portrait' | 'landscape' | null;

export interface TabletModeState {
  /** Whether the current device is a tablet */
  isTablet: boolean;
  /** Whether in landscape orientation on tablet */
  isLandscape: boolean;
  /** Whether in portrait orientation on tablet */
  isPortrait: boolean;
  /** Current orientation ('portrait' | 'landscape' | null) */
  orientation: TabletOrientation;
  /** Type of tablet ('standard' | 'pro' | 'none') */
  tabletType: TabletType;
  /** Whether this is a larger tablet (iPad Pro, Surface Pro) */
  isLargeTablet: boolean;
  /** Whether touch is the primary input */
  isTouchDevice: boolean;
  /** Current viewport width */
  viewportWidth: number;
  /** Current viewport height */
  viewportHeight: number;
  /** Whether the sidebar should be collapsed by default */
  shouldCollapseSidebar: boolean;
  /** Recommended number of grid columns for the current mode */
  recommendedGridCols: number;
  /** Whether to show persistent sidebar (vs drawer) */
  showPersistentSidebar: boolean;
}

export interface UseTabletModeOptions {
  /** Callback when tablet mode changes */
  onTabletModeChange?: (state: TabletModeState) => void;
  /** Callback when orientation changes */
  onOrientationChange?: (orientation: TabletOrientation) => void;
  /** Override default sidebar collapse behavior */
  forceSidebarBehavior?: 'collapsed' | 'expanded' | 'auto';
}

/**
 * Detect if the device has touch capability
 */
function detectTouchCapability(): boolean {
  if (typeof window === 'undefined') {return false;}
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  );
}

/**
 * Get tablet type based on screen dimensions
 *
 * IMPORTANT: We need to check BOTH dimensions to avoid false positives.
 * A desktop window of 1520x966 was incorrectly detected as tablet because
 * the shorter side (966px) fell within the tablet range.
 *
 * True tablets have:
 * - Standard: shorter side 768-1024px AND longer side <= 1366px
 * - Pro: shorter side up to 1024px AND longer side 1024-1366px
 */
function getTabletType(width: number, height: number, isTouch: boolean): TabletType {
  const longerSide = Math.max(width, height);
  const shorterSide = Math.min(width, height);

  // Desktop screens are wider than tablet max - not a tablet
  // This prevents false positives on desktop with one dimension in tablet range
  if (longerSide > TABLET_BREAKPOINTS.proMax) {
    return 'none';
  }

  // Standard tablet range: 768-1024px shorter side, longer side within tablet max
  if (shorterSide >= TABLET_BREAKPOINTS.min && shorterSide <= TABLET_BREAKPOINTS.max) {
    // Check if it's a large tablet (iPad Pro territory)
    if (longerSide > TABLET_BREAKPOINTS.max && longerSide <= TABLET_BREAKPOINTS.proMax) {
      return 'pro';
    }
    return 'standard';
  }

  // Large tablet in portrait (Pro devices)
  if (shorterSide > TABLET_BREAKPOINTS.max && shorterSide <= TABLET_BREAKPOINTS.proMax) {
    if (isTouch) {
      return 'pro';
    }
  }

  // Not a tablet
  return 'none';
}

/**
 * Calculate recommended grid columns based on tablet mode
 */
function getRecommendedGridCols(
  isTablet: boolean,
  orientation: TabletOrientation,
  tabletType: TabletType
): number {
  if (!isTablet) {return 4;} // Desktop default

  if (tabletType === 'pro') {
    return orientation === 'landscape' ? 4 : 3;
  }

  return orientation === 'landscape' ? 3 : 2;
}

/**
 * Hook for detecting and responding to tablet mode
 */
export function useTabletMode(options: UseTabletModeOptions = {}): TabletModeState {
  const {
    onTabletModeChange,
    onOrientationChange,
    forceSidebarBehavior = 'auto',
  } = options;

  const [state, setState] = useState<TabletModeState>(() => {
    // SSR fallback
    if (typeof window === 'undefined') {
      return {
        isTablet: false,
        isLandscape: false,
        isPortrait: false,
        orientation: null,
        tabletType: 'none',
        isLargeTablet: false,
        isTouchDevice: false,
        viewportWidth: 1024,
        viewportHeight: 768,
        shouldCollapseSidebar: false,
        recommendedGridCols: 4,
        showPersistentSidebar: true,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouch = detectTouchCapability();
    const tabletType = getTabletType(width, height, isTouch);
    const orientation: TabletOrientation =
      tabletType !== 'none' ? (width > height ? 'landscape' : 'portrait') : null;
    const isTablet = tabletType !== 'none';
    const isLandscape = orientation === 'landscape';
    const isPortrait = orientation === 'portrait';

    return {
      isTablet,
      isLandscape,
      isPortrait,
      orientation,
      tabletType,
      isLargeTablet: tabletType === 'pro',
      isTouchDevice: isTouch,
      viewportWidth: width,
      viewportHeight: height,
      shouldCollapseSidebar: isTablet && isPortrait,
      recommendedGridCols: getRecommendedGridCols(isTablet, orientation, tabletType),
      showPersistentSidebar: !isTablet || isLandscape,
    };
  });

  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouch = detectTouchCapability();
    const tabletType = getTabletType(width, height, isTouch);
    const orientation: TabletOrientation =
      tabletType !== 'none' ? (width > height ? 'landscape' : 'portrait') : null;
    const isTablet = tabletType !== 'none';
    const isLandscape = orientation === 'landscape';
    const isPortrait = orientation === 'portrait';

    // Determine sidebar behavior
    let shouldCollapseSidebar: boolean;
    if (forceSidebarBehavior === 'collapsed') {
      shouldCollapseSidebar = true;
    } else if (forceSidebarBehavior === 'expanded') {
      shouldCollapseSidebar = false;
    } else {
      // Auto: collapse in portrait, expand in landscape
      shouldCollapseSidebar = isTablet && isPortrait;
    }

    const newState: TabletModeState = {
      isTablet,
      isLandscape,
      isPortrait,
      orientation,
      tabletType,
      isLargeTablet: tabletType === 'pro',
      isTouchDevice: isTouch,
      viewportWidth: width,
      viewportHeight: height,
      shouldCollapseSidebar,
      recommendedGridCols: getRecommendedGridCols(isTablet, orientation, tabletType),
      showPersistentSidebar: !isTablet || isLandscape,
    };

    setState((prevState) => {
      // Check if anything meaningful changed
      const hasChanged =
        prevState.isTablet !== newState.isTablet ||
        prevState.orientation !== newState.orientation ||
        prevState.viewportWidth !== newState.viewportWidth ||
        prevState.viewportHeight !== newState.viewportHeight;

      if (hasChanged) {
        // Trigger callbacks
        if (onTabletModeChange) {
          onTabletModeChange(newState);
        }
        if (onOrientationChange && prevState.orientation !== newState.orientation) {
          onOrientationChange(newState.orientation);
        }
        return newState;
      }
      return prevState;
    });
  }, [forceSidebarBehavior, onTabletModeChange, onOrientationChange]);

  useEffect(() => {
    if (typeof window === 'undefined') {return;}

    // Initial check
    setTimeout(() => {
      handleResize();
    }, 0);

    // Listen to resize and orientation change events
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Modern Screen Orientation API
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleResize);
      }
    };
  }, [handleResize]);

  return state;
}

/**
 * Simplified hook that returns just tablet detection boolean
 */
export function useIsTablet(): boolean {
  const { isTablet } = useTabletMode();
  return isTablet;
}

/**
 * Hook for tablet orientation
 */
export function useTabletOrientation(): TabletOrientation {
  const { orientation } = useTabletMode();
  return orientation;
}

/**
 * Hook for getting tablet-specific CSS classes
 */
export function useTabletClasses(): {
  containerClass: string;
  gridClass: string;
  formClass: string;
  sidebarClass: string;
} {
  const { isTablet, isLandscape, isPortrait, isLargeTablet } = useTabletMode();

  return useMemo(() => {
    if (!isTablet) {
      return {
        containerClass: '',
        gridClass: 'grid-cols-4',
        formClass: 'grid-cols-2',
        sidebarClass: '',
      };
    }

    if (isLandscape) {
      return {
        containerClass: 'tablet-container tablet-landscape-main-with-sidebar',
        gridClass: isLargeTablet ? 'tablet-pro-landscape-grid' : 'tablet-landscape-grid',
        formClass: 'tablet-landscape-form',
        sidebarClass: 'tablet-landscape-nav-sidebar',
      };
    }

    if (isPortrait) {
      return {
        containerClass: 'tablet-container',
        gridClass: isLargeTablet ? 'tablet-pro-portrait-grid' : 'tablet-portrait-grid',
        formClass: 'tablet-portrait-form',
        sidebarClass: 'tablet-portrait-nav-drawer',
      };
    }

    return {
      containerClass: 'tablet-container',
      gridClass: 'tablet-grid',
      formClass: 'tablet-portrait-form',
      sidebarClass: '',
    };
  }, [isTablet, isLandscape, isPortrait, isLargeTablet]);
}

/**
 * Hook for responsive sidebar behavior on tablets
 */
export function useTabletSidebar(initialState?: boolean): {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  shouldShowPersistent: boolean;
} {
  const { showPersistentSidebar, shouldCollapseSidebar, isTablet, orientation } = useTabletMode();
  const [isOpen, setIsOpen] = useState(initialState ?? !shouldCollapseSidebar);

  // Auto-adjust sidebar when orientation changes
  useEffect(() => {
    setTimeout(() => {
      if (isTablet) {
        setIsOpen(!shouldCollapseSidebar);
      }
    }, 0);
  }, [isTablet, shouldCollapseSidebar, orientation]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    toggle,
    open,
    close,
    shouldShowPersistent: showPersistentSidebar,
  };
}

export default useTabletMode;
