/**
 * Device Detection Utility
 *
 * Synchronous device detection that runs before React renders.
 * Determines whether to load the mobile or desktop app shell.
 */

export type DeviceMode = 'mobile' | 'desktop';

/**
 * Detects the current device mode based on viewport, touch capability, and user agent.
 *
 * Mobile criteria (any of):
 * - Viewport width < 768px (phone or small tablet)
 * - Touch device with viewport < 1024px (tablet in portrait)
 * - Mobile user agent with touch capability
 *
 * Desktop criteria:
 * - Viewport width >= 1024px regardless of device
 * - Non-touch device with viewport >= 768px
 */
export function detectDeviceMode(): DeviceMode {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const width = window.innerWidth;

  // Check for touch capability
  const isTouchDevice =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (window.matchMedia?.('(pointer: coarse)').matches ?? false);

  // Check for mobile user agent
  const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Phone-sized viewport (always mobile)
  if (width < 768) {
    return 'mobile';
  }

  // Tablet in portrait mode (mobile)
  if (isTouchDevice && width < 1024) {
    return 'mobile';
  }

  // Mobile device in landscape but still narrow (mobile)
  if (isMobileUA && isTouchDevice && width < 1024) {
    return 'mobile';
  }

  // Large tablet in landscape or desktop
  return 'desktop';
}

const DEVICE_MODE_KEY = 'device-mode';
const USER_OVERRIDE_KEY = 'device-mode-override';

/**
 * Gets the current device mode, checking for user override first.
 * Stores detected mode in sessionStorage for persistence across navigations.
 */
export function getDeviceMode(): DeviceMode {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  // Check for user override (persists across sessions)
  const override = localStorage.getItem(USER_OVERRIDE_KEY) as DeviceMode | null;
  if (override && (override === 'mobile' || override === 'desktop')) {
    return override;
  }

  // Check session cache
  const cached = sessionStorage.getItem(DEVICE_MODE_KEY) as DeviceMode | null;
  if (cached && (cached === 'mobile' || cached === 'desktop')) {
    return cached;
  }

  // Detect and cache
  const detected = detectDeviceMode();
  sessionStorage.setItem(DEVICE_MODE_KEY, detected);
  return detected;
}

/**
 * Sets a user override for device mode.
 * This persists across sessions until cleared.
 */
export function setDeviceModeOverride(mode: DeviceMode): void {
  if (typeof window === 'undefined') {return;}
  localStorage.setItem(USER_OVERRIDE_KEY, mode);
  sessionStorage.setItem(DEVICE_MODE_KEY, mode);
}

/**
 * Clears the user override, returning to auto-detection.
 */
export function clearDeviceModeOverride(): void {
  if (typeof window === 'undefined') {return;}
  localStorage.removeItem(USER_OVERRIDE_KEY);
  sessionStorage.removeItem(DEVICE_MODE_KEY);
}

/**
 * Checks if the user has manually overridden the device mode.
 */
export function hasDeviceModeOverride(): boolean {
  if (typeof window === 'undefined') {return false;}
  return localStorage.getItem(USER_OVERRIDE_KEY) !== null;
}

/**
 * Re-detects device mode without considering cached values.
 * Useful after orientation changes.
 */
export function redetectDeviceMode(): DeviceMode {
  const detected = detectDeviceMode();

  // Only update cache if no user override
  if (!hasDeviceModeOverride()) {
    sessionStorage.setItem(DEVICE_MODE_KEY, detected);
  }

  return detected;
}
