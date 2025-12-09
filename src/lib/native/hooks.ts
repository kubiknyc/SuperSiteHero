/**
 * Native Feature Hooks
 * React hooks for using native device features
 */

import { useState, useEffect, useCallback } from 'react';
import { Network, ConnectionStatus } from '@capacitor/network';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Geolocation, Position } from '@capacitor/geolocation';
import { isNative, isPluginAvailable, getPlatform } from './platform';
import { takePhoto, pickPhotos, CapturedPhoto, CameraOptions } from './camera';

/**
 * Hook for network status
 */
export function useNetwork() {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    if (!isPluginAvailable('Network')) return;

    // Get initial status
    Network.getStatus().then(setStatus);

    // Listen for changes
    const listener = Network.addListener('networkStatusChange', setStatus);

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  return {
    isConnected: status.connected,
    connectionType: status.connectionType,
  };
}

/**
 * Hook for camera functionality
 */
export function useCamera() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(async (options?: CameraOptions): Promise<CapturedPhoto | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const photo = await takePhoto(options);
      return photo;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickFromGallery = useCallback(async (limit = 10): Promise<CapturedPhoto[]> => {
    setIsLoading(true);
    setError(null);
    try {
      return await pickPhotos(limit);
    } catch (err) {
      setError((err as Error).message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    capture,
    pickFromGallery,
    isLoading,
    error,
  };
}

/**
 * Hook for haptic feedback
 */
export function useHaptics() {
  const isAvailable = isNative() && isPluginAvailable('Haptics');

  const impact = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (!isAvailable) return;

    const styleMap: Record<string, ImpactStyle> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    await Haptics.impact({ style: styleMap[style] });
  }, [isAvailable]);

  const notification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success') => {
    if (!isAvailable) return;

    const typeMap: Record<string, NotificationType> = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };

    await Haptics.notification({ type: typeMap[type] });
  }, [isAvailable]);

  const vibrate = useCallback(async (duration = 300) => {
    if (!isAvailable) return;
    await Haptics.vibrate({ duration });
  }, [isAvailable]);

  return { impact, notification, vibrate, isAvailable };
}

/**
 * Hook for sharing content
 */
export function useShare() {
  const isAvailable = isPluginAvailable('Share');

  const share = useCallback(async (data: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }) => {
    if (!isAvailable) {
      // Fallback to Web Share API
      if (navigator.share) {
        await navigator.share(data);
        return true;
      }
      return false;
    }

    try {
      await Share.share(data);
      return true;
    } catch (error) {
      // User cancelled
      return false;
    }
  }, [isAvailable]);

  return { share, isAvailable };
}

/**
 * Hook for geolocation
 */
export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentPosition = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isNative() && isPluginAvailable('Geolocation')) {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        setPosition(pos);
        return pos;
      } else if (navigator.geolocation) {
        // Browser fallback
        return new Promise<Position>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (browserPos) => {
              const pos: Position = {
                timestamp: browserPos.timestamp,
                coords: {
                  latitude: browserPos.coords.latitude,
                  longitude: browserPos.coords.longitude,
                  accuracy: browserPos.coords.accuracy,
                  altitude: browserPos.coords.altitude,
                  altitudeAccuracy: browserPos.coords.altitudeAccuracy,
                  heading: browserPos.coords.heading,
                  speed: browserPos.coords.speed,
                },
              };
              setPosition(pos);
              resolve(pos);
            },
            (err) => {
              setError(err.message);
              reject(err);
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }
      throw new Error('Geolocation not available');
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { position, getCurrentPosition, error, isLoading };
}

/**
 * Hook for keyboard events (mobile)
 */
export function useKeyboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!isNative() || !isPluginAvailable('Keyboard')) return;

    const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
      setIsVisible(true);
      setKeyboardHeight(info.keyboardHeight);
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setIsVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showListener.then((l) => l.remove());
      hideListener.then((l) => l.remove());
    };
  }, []);

  const hide = useCallback(async () => {
    if (isNative() && isPluginAvailable('Keyboard')) {
      await Keyboard.hide();
    }
  }, []);

  return { isVisible, keyboardHeight, hide };
}

/**
 * Hook for app lifecycle events
 */
export function useAppState() {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isNative() || !isPluginAvailable('App')) return;

    const listener = App.addListener('appStateChange', (state) => {
      setIsActive(state.isActive);
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  return { isActive };
}

/**
 * Hook for status bar customization
 */
export function useStatusBar() {
  const isAvailable = isNative() && isPluginAvailable('StatusBar');

  const setStyle = useCallback(async (style: 'light' | 'dark') => {
    if (!isAvailable) return;

    await StatusBar.setStyle({
      style: style === 'light' ? Style.Light : Style.Dark,
    });
  }, [isAvailable]);

  const setBackgroundColor = useCallback(async (color: string) => {
    if (!isAvailable || getPlatform() !== 'android') return;

    await StatusBar.setBackgroundColor({ color });
  }, [isAvailable]);

  const hide = useCallback(async () => {
    if (!isAvailable) return;
    await StatusBar.hide();
  }, [isAvailable]);

  const show = useCallback(async () => {
    if (!isAvailable) return;
    await StatusBar.show();
  }, [isAvailable]);

  return { setStyle, setBackgroundColor, hide, show, isAvailable };
}
