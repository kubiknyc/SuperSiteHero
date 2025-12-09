/**
 * Platform Detection Utility
 * Detects if running on iOS, Android, or Web
 */

import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

export type Platform = 'ios' | 'android' | 'web';

/**
 * Check if running in a native Capacitor app
 */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  return Capacitor.getPlatform() as Platform;
}

/**
 * Check if running on iOS
 */
export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

/**
 * Check if running on Android
 */
export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Check if running on web
 */
export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

/**
 * Check if a plugin is available
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Get detailed device info
 */
export async function getDeviceInfo() {
  try {
    const info = await Device.getInfo();
    const id = await Device.getId();
    const batteryInfo = await Device.getBatteryInfo();
    const languageCode = await Device.getLanguageCode();

    return {
      ...info,
      deviceId: id.identifier,
      batteryLevel: batteryInfo.batteryLevel,
      isCharging: batteryInfo.isCharging,
      languageCode: languageCode.value,
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return null;
  }
}

/**
 * Platform-specific configurations
 */
export const platformConfig = {
  ios: {
    statusBarStyle: 'light',
    safeAreaInsets: true,
    hapticFeedback: true,
  },
  android: {
    statusBarStyle: 'light',
    navigationBarColor: '#1e40af',
    hapticFeedback: true,
  },
  web: {
    statusBarStyle: 'default',
    safeAreaInsets: false,
    hapticFeedback: false,
  },
} as const;

/**
 * Get config for current platform
 */
export function getCurrentPlatformConfig() {
  return platformConfig[getPlatform()];
}
