/**
 * useGeolocation - Hook for capturing real-time GPS coordinates
 * Used to supplement photos that don't have EXIF GPS data
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watchPosition?: boolean;
}

interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: string | null;
  isLoading: boolean;
  isSupported: boolean;
  permissionStatus: PermissionState | null;
  getCurrentPosition: () => Promise<GeolocationPosition | null>;
  clearPosition: () => void;
}

const DEFAULT_OPTIONS: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000, // 10 seconds
  maximumAge: 60000, // 1 minute cache
  watchPosition: false,
};

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Check if geolocation is supported
  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // Convert GeolocationPosition to our interface
  const convertPosition = (pos: globalThis.GeolocationPosition): GeolocationPosition => ({
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    altitude: pos.coords.altitude ?? undefined,
    altitudeAccuracy: pos.coords.altitudeAccuracy ?? undefined,
    heading: pos.coords.heading ?? undefined,
    speed: pos.coords.speed ?? undefined,
    timestamp: pos.timestamp,
  });

  // Convert GeolocationPositionError to user-friendly message
  const convertError = (err: globalThis.GeolocationPositionError): string => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location access in your browser settings.';
      case err.POSITION_UNAVAILABLE:
        return 'Location information is unavailable.';
      case err.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'An unknown error occurred while getting location.';
    }
  };

  // Check permission status
  useEffect(() => {
    if (!isSupported) {return;}

    // Check permission if available
    if ('permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setPermissionStatus(result.state);

          // Listen for permission changes
          result.onchange = () => {
            setPermissionStatus(result.state);
          };
        })
        .catch(() => {
          // Permissions API not available, continue without it
        });
    }
  }, [isSupported]);

  // Watch position if enabled
  useEffect(() => {
    if (!isSupported || !mergedOptions.watchPosition) {return;}

    const handleSuccess = (pos: globalThis.GeolocationPosition) => {
      setPosition(convertPosition(pos));
      setError(null);
      setIsLoading(false);
    };

    const handleError = (err: globalThis.GeolocationPositionError) => {
      setError(convertError(err));
      setIsLoading(false);
    };

    setIsLoading(true);
    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: mergedOptions.enableHighAccuracy,
      timeout: mergedOptions.timeout,
      maximumAge: mergedOptions.maximumAge,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isSupported, mergedOptions.watchPosition, mergedOptions.enableHighAccuracy, mergedOptions.timeout, mergedOptions.maximumAge]);

  // Get current position (one-time)
  const getCurrentPosition = useCallback((): Promise<GeolocationPosition | null> => {
    if (!isSupported) {
      setError('Geolocation is not supported by your browser.');
      return Promise.resolve(null);
    }

    setIsLoading(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const convertedPos = convertPosition(pos);
          setPosition(convertedPos);
          setError(null);
          setIsLoading(false);
          resolve(convertedPos);
        },
        (err) => {
          const errorMsg = convertError(err);
          setError(errorMsg);
          setIsLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: mergedOptions.enableHighAccuracy,
          timeout: mergedOptions.timeout,
          maximumAge: mergedOptions.maximumAge,
        }
      );
    });
  }, [isSupported, mergedOptions.enableHighAccuracy, mergedOptions.timeout, mergedOptions.maximumAge]);

  // Clear current position
  const clearPosition = useCallback(() => {
    setPosition(null);
    setError(null);
  }, []);

  return {
    position,
    error,
    isLoading,
    isSupported,
    permissionStatus,
    getCurrentPosition,
    clearPosition,
  };
}

// Helper to calculate distance between two coordinates in meters
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Format coordinates for display
export function formatCoordinates(lat: number, lon: number, precision: number = 6): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(precision)}° ${latDir}, ${Math.abs(lon).toFixed(precision)}° ${lonDir}`;
}

export default useGeolocation;
