// File: /src/lib/offline/bandwidth-detector.ts
// Network speed estimation and adaptive sync configuration

import { logger } from '@/lib/utils/logger';

/**
 * Network connection type
 */
export type ConnectionType =
  | 'wifi'
  | 'cellular'
  | 'ethernet'
  | 'bluetooth'
  | 'unknown';

/**
 * Network speed category
 */
export type NetworkSpeed = 'fast' | 'medium' | 'slow' | 'offline';

/**
 * Bandwidth measurement
 */
export interface BandwidthMeasurement {
  downloadSpeed: number; // Mbps
  uploadSpeed: number; // Mbps
  latency: number; // ms
  timestamp: number;
  connectionType: ConnectionType;
}

/**
 * Sync configuration based on network conditions
 */
export interface AdaptiveSyncConfig {
  maxBatchSize: number; // bytes
  maxBatchItems: number;
  retryDelay: number; // ms
  timeout: number; // ms
  enableBackgroundSync: boolean;
  enableLargeUploads: boolean; // photos, documents
}

/**
 * Bandwidth detector class
 * Estimates network speed and provides adaptive sync configurations
 */
export class BandwidthDetector {
  private measurements: BandwidthMeasurement[] = [];
  private readonly maxMeasurements = 10;
  private isDetecting = false;

  /**
   * Get network information from Navigator API
   */
  getConnectionInfo(): {
    type: ConnectionType;
    effectiveType?: string;
    downlink?: number; // Mbps
    rtt?: number; // ms
    saveData?: boolean;
  } | null {
    // Check if Network Information API is available
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      return {
        type: this.mapConnectionType(connection.type || connection.effectiveType),
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }

    return null;
  }

  /**
   * Map connection type to our enum
   */
  private mapConnectionType(type: string | undefined): ConnectionType {
    if (!type) {return 'unknown';}

    const lowerType = type.toLowerCase();

    if (lowerType.includes('wifi')) {return 'wifi';}
    if (lowerType.includes('ethernet')) {return 'ethernet';}
    if (lowerType.includes('cellular') || lowerType.includes('4g') || lowerType.includes('3g')) {
      return 'cellular';
    }
    if (lowerType.includes('bluetooth')) {return 'bluetooth';}

    return 'unknown';
  }

  /**
   * Measure download speed using a small test file
   */
  async measureDownloadSpeed(testUrl?: string): Promise<number> {
    const url = testUrl || this.generateTestUrl();
    const startTime = performance.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch test resource');
      }

      const blob = await response.blob();
      const endTime = performance.now();

      const durationSeconds = (endTime - startTime) / 1000;
      const sizeBytes = blob.size;
      const sizeMegabits = (sizeBytes * 8) / 1000000;
      const speedMbps = sizeMegabits / durationSeconds;

      logger.log('[BandwidthDetector] Download speed measured:', {
        speed: speedMbps.toFixed(2) + ' Mbps',
        size: sizeBytes,
        duration: durationSeconds.toFixed(2) + 's',
      });

      return speedMbps;
    } catch (error) {
      logger.error('[BandwidthDetector] Failed to measure download speed:', error);
      return 0;
    }
  }

  /**
   * Estimate upload speed using timing of a small POST request
   */
  async measureUploadSpeed(endpoint?: string): Promise<number> {
    // Generate test data (100KB)
    const testData = new Blob([new ArrayBuffer(100000)]);
    const url = endpoint || '/api/ping'; // Fallback endpoint

    const startTime = performance.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: testData,
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      const endTime = performance.now();

      if (!response.ok) {
        // If endpoint doesn't exist, just use timing anyway
        logger.warn('[BandwidthDetector] Upload test endpoint not available, using timing estimate');
      }

      const durationSeconds = (endTime - startTime) / 1000;
      const sizeBytes = testData.size;
      const sizeMegabits = (sizeBytes * 8) / 1000000;
      const speedMbps = sizeMegabits / durationSeconds;

      logger.log('[BandwidthDetector] Upload speed measured:', {
        speed: speedMbps.toFixed(2) + ' Mbps',
        size: sizeBytes,
        duration: durationSeconds.toFixed(2) + 's',
      });

      return speedMbps;
    } catch (error) {
      logger.error('[BandwidthDetector] Failed to measure upload speed:', error);
      return 0;
    }
  }

  /**
   * Measure network latency
   */
  async measureLatency(endpoint?: string): Promise<number> {
    const url = endpoint || window.location.origin + '/favicon.ico';
    const startTime = performance.now();

    try {
      await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
      });

      const endTime = performance.now();
      const latency = endTime - startTime;

      logger.log('[BandwidthDetector] Latency measured:', latency.toFixed(2) + 'ms');

      return latency;
    } catch (error) {
      logger.error('[BandwidthDetector] Failed to measure latency:', error);
      return 999;
    }
  }

  /**
   * Perform full bandwidth test
   */
  async performBandwidthTest(): Promise<BandwidthMeasurement | null> {
    if (this.isDetecting) {
      logger.warn('[BandwidthDetector] Bandwidth test already in progress');
      return null;
    }

    if (!navigator.onLine) {
      logger.warn('[BandwidthDetector] Cannot test bandwidth while offline');
      return null;
    }

    this.isDetecting = true;

    try {
      const connectionInfo = this.getConnectionInfo();
      const connectionType = connectionInfo?.type || 'unknown';

      // Use Network Information API data if available
      if (connectionInfo?.downlink && connectionInfo?.rtt) {
        const measurement: BandwidthMeasurement = {
          downloadSpeed: connectionInfo.downlink,
          uploadSpeed: connectionInfo.downlink * 0.8, // Estimate upload as 80% of download
          latency: connectionInfo.rtt,
          timestamp: Date.now(),
          connectionType,
        };

        this.addMeasurement(measurement);
        return measurement;
      }

      // Otherwise, perform manual measurements
      const [latency, downloadSpeed] = await Promise.all([
        this.measureLatency(),
        this.measureDownloadSpeed(),
      ]);

      // Estimate upload speed as 80% of download (common ratio)
      const uploadSpeed = downloadSpeed * 0.8;

      const measurement: BandwidthMeasurement = {
        downloadSpeed,
        uploadSpeed,
        latency,
        timestamp: Date.now(),
        connectionType,
      };

      this.addMeasurement(measurement);
      return measurement;
    } catch (error) {
      logger.error('[BandwidthDetector] Bandwidth test failed:', error);
      return null;
    } finally {
      this.isDetecting = false;
    }
  }

  /**
   * Add measurement to history
   */
  private addMeasurement(measurement: BandwidthMeasurement): void {
    this.measurements.push(measurement);

    // Keep only last N measurements
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements = this.measurements.slice(-this.maxMeasurements);
    }
  }

  /**
   * Get average bandwidth from recent measurements
   */
  getAverageBandwidth(): BandwidthMeasurement | null {
    if (this.measurements.length === 0) {return null;}

    const sum = this.measurements.reduce(
      (acc, m) => ({
        downloadSpeed: acc.downloadSpeed + m.downloadSpeed,
        uploadSpeed: acc.uploadSpeed + m.uploadSpeed,
        latency: acc.latency + m.latency,
      }),
      { downloadSpeed: 0, uploadSpeed: 0, latency: 0 }
    );

    const count = this.measurements.length;
    const latest = this.measurements[this.measurements.length - 1];

    return {
      downloadSpeed: sum.downloadSpeed / count,
      uploadSpeed: sum.uploadSpeed / count,
      latency: sum.latency / count,
      timestamp: Date.now(),
      connectionType: latest.connectionType,
    };
  }

  /**
   * Categorize network speed
   */
  categorizeSpeed(bandwidth: BandwidthMeasurement | null): NetworkSpeed {
    if (!navigator.onLine || !bandwidth) {return 'offline';}

    const { uploadSpeed, latency } = bandwidth;

    // Fast: > 5 Mbps upload, < 100ms latency
    if (uploadSpeed > 5 && latency < 100) {return 'fast';}

    // Medium: 1-5 Mbps upload, 100-300ms latency
    if (uploadSpeed > 1 && latency < 300) {return 'medium';}

    // Slow: < 1 Mbps upload or > 300ms latency
    return 'slow';
  }

  /**
   * Get adaptive sync configuration based on network conditions
   */
  getAdaptiveSyncConfig(
    bandwidth: BandwidthMeasurement | null = this.getAverageBandwidth()
  ): AdaptiveSyncConfig {
    const speed = this.categorizeSpeed(bandwidth);
    const connectionInfo = this.getConnectionInfo();
    const isWifi = bandwidth?.connectionType === 'wifi' || bandwidth?.connectionType === 'ethernet';
    const isSaveDataMode = connectionInfo?.saveData || false;

    let config: AdaptiveSyncConfig;

    switch (speed) {
      case 'fast':
        config = {
          maxBatchSize: isWifi ? 10 * 1024 * 1024 : 5 * 1024 * 1024, // 10MB WiFi, 5MB cellular
          maxBatchItems: 100,
          retryDelay: 5000,
          timeout: 60000,
          enableBackgroundSync: true,
          enableLargeUploads: true,
        };
        break;

      case 'medium':
        config = {
          maxBatchSize: 2 * 1024 * 1024, // 2MB
          maxBatchItems: 50,
          retryDelay: 10000,
          timeout: 120000,
          enableBackgroundSync: true,
          enableLargeUploads: isWifi,
        };
        break;

      case 'slow':
        config = {
          maxBatchSize: 500 * 1024, // 500KB
          maxBatchItems: 20,
          retryDelay: 20000,
          timeout: 180000,
          enableBackgroundSync: false,
          enableLargeUploads: false,
        };
        break;

      case 'offline':
      default:
        config = {
          maxBatchSize: 0,
          maxBatchItems: 0,
          retryDelay: 60000,
          timeout: 30000,
          enableBackgroundSync: false,
          enableLargeUploads: false,
        };
        break;
    }

    // Apply data saver mode restrictions
    if (isSaveDataMode) {
      config.maxBatchSize = Math.min(config.maxBatchSize, 1 * 1024 * 1024); // Max 1MB
      config.maxBatchItems = Math.min(config.maxBatchItems, 25);
      config.enableLargeUploads = false;
    }

    logger.log('[BandwidthDetector] Adaptive sync config:', {
      speed,
      connectionType: bandwidth?.connectionType,
      saveData: isSaveDataMode,
      config,
    });

    return config;
  }

  /**
   * Generate a test URL for download speed measurement
   */
  private generateTestUrl(): string {
    // Use a small file from the origin (like favicon or a known static asset)
    // For production, you'd want a dedicated test endpoint
    return window.location.origin + '/favicon.ico?t=' + Date.now();
  }

  /**
   * Get current network speed category
   */
  getCurrentSpeed(): NetworkSpeed {
    const bandwidth = this.getAverageBandwidth();
    return this.categorizeSpeed(bandwidth);
  }

  /**
   * Clear measurement history
   */
  clearMeasurements(): void {
    this.measurements = [];
    logger.log('[BandwidthDetector] Measurement history cleared');
  }

  /**
   * Get all measurements
   */
  getAllMeasurements(): BandwidthMeasurement[] {
    return [...this.measurements];
  }
}

// Singleton instance
export const bandwidthDetector = new BandwidthDetector();
