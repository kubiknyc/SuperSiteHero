/**
 * useOnlineStatus - Hook for detecting online/offline status
 * Provides real-time network connectivity detection with quality assessment
 */

import { useState, useEffect, useCallback } from 'react';

export interface NetworkQuality {
  type: 'online' | 'offline' | 'slow';
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number; // Mbps
  rtt?: number; // Round-trip time in ms
  saveData?: boolean;
}

export interface UseOnlineStatusReturn {
  isOnline: boolean;
  networkQuality: NetworkQuality;
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
}

/**
 * React hook to monitor online/offline status with quality detection
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>({
    type: navigator.onLine ? 'online' : 'offline',
  });
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(
    navigator.onLine ? Date.now() : null
  );
  const [lastOfflineAt, setLastOfflineAt] = useState<number | null>(
    !navigator.onLine ? Date.now() : null
  );

  const updateNetworkQuality = useCallback(() => {
    // Use Network Information API if available
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;

    if (connection) {
      const quality: NetworkQuality = {
        type: navigator.onLine ? 'online' : 'offline',
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };

      // Determine if connection is slow
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        quality.type = 'slow';
      } else if (connection.rtt > 500 || connection.downlink < 0.5) {
        quality.type = 'slow';
      }

      setNetworkQuality(quality);
    } else {
      // Fallback if Network Information API not available
      setNetworkQuality({
        type: navigator.onLine ? 'online' : 'offline',
      });
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(Date.now());
      updateNetworkQuality();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastOfflineAt(Date.now());
      setNetworkQuality({ type: 'offline' });
    };

    const handleConnectionChange = () => {
      updateNetworkQuality();
    };

    // Set initial state
    updateNetworkQuality();

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes (if supported)
    const connection = (navigator as any).connection ||
                      (navigator as any).mozConnection ||
                      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkQuality]);

  return {
    isOnline,
    networkQuality,
    lastOnlineAt,
    lastOfflineAt,
  };
}

export default useOnlineStatus;
