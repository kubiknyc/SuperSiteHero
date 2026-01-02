/**
 * Network Status Hook
 *
 * Hook for detecting and monitoring network online/offline status
 * with connection quality estimation
 */

import { useState, useEffect, useCallback } from 'react'
import { useOfflineStore } from '@/stores/offline-store'

export interface NetworkStatus {
  isOnline: boolean
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  downlink: number | null // Mbps
  rtt: number | null // Round-trip time in ms
  saveData: boolean
  lastChecked: number
}

export interface ConnectionQuality {
  type: 'excellent' | 'good' | 'poor' | 'offline'
  canUploadPhotos: boolean
  canUploadDocuments: boolean
  estimatedSpeed: string
}

/**
 * Hook for monitoring network status
 */
export function useNetworkStatus() {
  const { isOnline, setOnline } = useOfflineStore()
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: 'unknown',
    downlink: null,
    rtt: null,
    saveData: false,
    lastChecked: Date.now(),
  })

  // Check if Network Information API is available
  const getNetworkInfo = useCallback((): NetworkStatus => {
    const connection = (navigator as any).connection
      || (navigator as any).mozConnection
      || (navigator as any).webkitConnection

    if (connection) {
      return {
        isOnline: navigator.onLine,
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || null,
        rtt: connection.rtt || null,
        saveData: connection.saveData || false,
        lastChecked: Date.now(),
      }
    }

    return {
      isOnline: navigator.onLine,
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false,
      lastChecked: Date.now(),
    }
  }, [])

  // Update network status
  const updateNetworkStatus = useCallback(() => {
    const status = getNetworkInfo()
    setNetworkStatus(status)
    setOnline(status.isOnline)
  }, [getNetworkInfo, setOnline])

  // Set up event listeners
  useEffect(() => {
    // Initial check
    updateNetworkStatus()

    // Online/offline events
    const handleOnline = () => updateNetworkStatus()
    const handleOffline = () => updateNetworkStatus()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Network Information API change event
    const connection = (navigator as any).connection
      || (navigator as any).mozConnection
      || (navigator as any).webkitConnection

    if (connection) {
      connection.addEventListener('change', updateNetworkStatus)
    }

    // Periodic check every 30 seconds
    const interval = setInterval(updateNetworkStatus, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus)
      }
      clearInterval(interval)
    }
  }, [updateNetworkStatus])

  return {
    ...networkStatus,
    refresh: updateNetworkStatus,
  }
}

/**
 * Hook for getting connection quality assessment
 */
export function useConnectionQuality(): ConnectionQuality {
  const networkStatus = useNetworkStatus()

  if (!networkStatus.isOnline) {
    return {
      type: 'offline',
      canUploadPhotos: false,
      canUploadDocuments: false,
      estimatedSpeed: 'Offline',
    }
  }

  // Assess quality based on effective type and downlink
  const effectiveType = networkStatus.effectiveType
  const downlink = networkStatus.downlink

  if (effectiveType === '4g' || (downlink && downlink > 5)) {
    return {
      type: 'excellent',
      canUploadPhotos: true,
      canUploadDocuments: true,
      estimatedSpeed: downlink ? `${downlink.toFixed(1)} Mbps` : 'Fast',
    }
  }

  if (effectiveType === '3g' || (downlink && downlink > 1.5)) {
    return {
      type: 'good',
      canUploadPhotos: true,
      canUploadDocuments: true,
      estimatedSpeed: downlink ? `${downlink.toFixed(1)} Mbps` : 'Good',
    }
  }

  // Slow connection
  return {
    type: 'poor',
    canUploadPhotos: false,
    canUploadDocuments: !networkStatus.saveData,
    estimatedSpeed: downlink ? `${downlink.toFixed(1)} Mbps` : 'Slow',
  }
}

/**
 * Hook for checking if a specific operation should be allowed based on connection
 */
export function useConnectionCheck() {
  const quality = useConnectionQuality()
  const { syncPreferences } = useOfflineStore()

  const canSync = useCallback((operation: 'data' | 'photos' | 'documents'): boolean => {
    if (!quality.type || quality.type === 'offline') {
      return false
    }

    // Check if on cellular and user preferences
    const connection = (navigator as any).connection
      || (navigator as any).mozConnection
      || (navigator as any).webkitConnection

    const isCellular = connection?.type === 'cellular'

    if (isCellular) {
      if (operation === 'photos' && !syncPreferences.syncPhotosOnCellular) {
        return false
      }
      if (!syncPreferences.syncOnCellular) {
        return false
      }
    }

    // Check connection quality
    switch (operation) {
      case 'photos':
        return quality.canUploadPhotos
      case 'documents':
        return quality.canUploadDocuments
      case 'data':
        return quality.type !== 'offline'
      default:
        return false
    }
  }, [quality, syncPreferences])

  return {
    canSyncData: canSync('data'),
    canSyncPhotos: canSync('photos'),
    canSyncDocuments: canSync('documents'),
    quality,
  }
}

/**
 * Hook for estimating upload time
 */
export function useUploadTimeEstimate() {
  const networkStatus = useNetworkStatus()

  const estimateUploadTime = useCallback((fileSizeBytes: number): {
    estimatedSeconds: number
    estimatedText: string
  } => {
    if (!networkStatus.isOnline || !networkStatus.downlink) {
      return {
        estimatedSeconds: 0,
        estimatedText: 'Unknown',
      }
    }

    // Convert to megabits and estimate (downlink is typically for download, upload is usually slower)
    const uploadSpeedMbps = networkStatus.downlink * 0.8 // Assume upload is 80% of download
    const fileSizeMb = fileSizeBytes / (1024 * 1024)
    const estimatedSeconds = Math.ceil((fileSizeMb * 8) / uploadSpeedMbps)

    let estimatedText = ''
    if (estimatedSeconds < 60) {
      estimatedText = `${estimatedSeconds}s`
    } else if (estimatedSeconds < 3600) {
      estimatedText = `${Math.ceil(estimatedSeconds / 60)}m`
    } else {
      estimatedText = `${Math.ceil(estimatedSeconds / 3600)}h`
    }

    return {
      estimatedSeconds,
      estimatedText,
    }
  }, [networkStatus])

  return estimateUploadTime
}

export default useNetworkStatus
