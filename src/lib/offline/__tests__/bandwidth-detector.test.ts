/**
 * Bandwidth Detector Test Suite
 * Tests network quality detection and adaptive sync configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BandwidthDetector } from '../bandwidth-detector';
import { mockNetworkInformation, setupOfflineTestEnvironment } from '@/__tests__/mocks/indexeddb.mock';

describe('BandwidthDetector', () => {
  let detector: BandwidthDetector;

  beforeEach(() => {
    setupOfflineTestEnvironment();
    detector = new BandwidthDetector();
    vi.clearAllMocks();
  });

  afterEach(() => {
    detector.clearMeasurements();
  });

  describe('Network Information API', () => {
    it('should get connection info when API is available', () => {
      mockNetworkInformation({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false,
      });

      const info = detector.getConnectionInfo();

      expect(info).toBeDefined();
      expect(info?.type).toBe('wifi');
      expect(info?.downlink).toBe(10);
      expect(info?.rtt).toBe(50);
      expect(info?.saveData).toBe(false);
    });

    it('should map connection types correctly', () => {
      mockNetworkInformation({ effectiveType: '4g' });
      let info = detector.getConnectionInfo();
      expect(info?.type).toBe('cellular');

      mockNetworkInformation({ effectiveType: '3g' });
      info = detector.getConnectionInfo();
      expect(info?.type).toBe('cellular');
    });

    it('should return null when Network Information API is not available', () => {
      // Remove connection property
      Object.defineProperty(navigator, 'connection', {
        value: undefined,
        writable: true,
      });

      const info = detector.getConnectionInfo();
      expect(info).toBeNull();
    });
  });

  describe('Bandwidth Measurement', () => {
    beforeEach(() => {
      // Mock fetch for speed tests
      global.fetch = vi.fn().mockImplementation((url) => {
        const responseSize = 100000; // 100KB
        const blob = new Blob([new ArrayBuffer(responseSize)]);

        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(blob),
        });
      });
    });

    it('should measure download speed', async () => {
      const speed = await detector.measureDownloadSpeed();

      expect(speed).toBeGreaterThan(0);
      expect(typeof speed).toBe('number');
    });

    it('should measure latency', async () => {
      const latency = await detector.measureLatency();

      expect(latency).toBeGreaterThanOrEqual(0);
      expect(typeof latency).toBe('number');
    });

    it('should perform full bandwidth test', async () => {
      mockNetworkInformation({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
      });

      const measurement = await detector.performBandwidthTest();

      expect(measurement).toBeDefined();
      expect(measurement?.downloadSpeed).toBeDefined();
      expect(measurement?.uploadSpeed).toBeDefined();
      expect(measurement?.latency).toBeDefined();
      expect(measurement?.timestamp).toBeDefined();
      expect(measurement?.connectionType).toBeDefined();
    });

    it('should use Network Information API data when available', async () => {
      mockNetworkInformation({
        effectiveType: '4g',
        downlink: 15,
        rtt: 30,
      });

      const measurement = await detector.performBandwidthTest();

      expect(measurement?.downloadSpeed).toBe(15);
      expect(measurement?.latency).toBe(30);
      // Upload estimated as 80% of download
      expect(measurement?.uploadSpeed).toBe(12);
    });

    it('should handle measurement errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const speed = await detector.measureDownloadSpeed();
      expect(speed).toBe(0);

      const latency = await detector.measureLatency();
      expect(latency).toBe(999);
    });

    it('should prevent concurrent bandwidth tests', async () => {
      mockNetworkInformation({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
      });

      // Start two tests concurrently
      const test1Promise = detector.performBandwidthTest();
      const test2Promise = detector.performBandwidthTest();

      const [result1, result2] = await Promise.all([test1Promise, test2Promise]);

      // One should succeed, one should return null
      expect(result1 === null || result2 === null).toBe(true);
      expect(result1 !== null || result2 !== null).toBe(true);
    });

    it('should not test bandwidth when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const measurement = await detector.performBandwidthTest();
      expect(measurement).toBeNull();
    });
  });

  describe('Measurement History', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob([new ArrayBuffer(100000)])),
      });

      mockNetworkInformation({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
      });
    });

    it('should store measurement history', async () => {
      await detector.performBandwidthTest();
      await detector.performBandwidthTest();
      await detector.performBandwidthTest();

      const measurements = detector.getAllMeasurements();
      expect(measurements.length).toBe(3);
    });

    it('should limit measurement history to max count', async () => {
      // Perform 15 tests (max is 10)
      for (let i = 0; i < 15; i++) {
        await detector.performBandwidthTest();
      }

      const measurements = detector.getAllMeasurements();
      expect(measurements.length).toBe(10);
    });

    it('should calculate average bandwidth', async () => {
      mockNetworkInformation({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
      });

      await detector.performBandwidthTest();

      mockNetworkInformation({
        effectiveType: '4g',
        downlink: 20,
        rtt: 30,
      });

      await detector.performBandwidthTest();

      const average = detector.getAverageBandwidth();

      expect(average).toBeDefined();
      expect(average?.downloadSpeed).toBe(15); // (10 + 20) / 2
      expect(average?.latency).toBe(40); // (50 + 30) / 2
    });

    it('should return null for average when no measurements', () => {
      const average = detector.getAverageBandwidth();
      expect(average).toBeNull();
    });

    it('should clear measurement history', async () => {
      await detector.performBandwidthTest();
      await detector.performBandwidthTest();

      expect(detector.getAllMeasurements().length).toBe(2);

      detector.clearMeasurements();

      expect(detector.getAllMeasurements().length).toBe(0);
    });
  });

  describe('Speed Categorization', () => {
    it('should categorize fast connection', () => {
      const bandwidth = {
        downloadSpeed: 10,
        uploadSpeed: 8,
        latency: 50,
        timestamp: Date.now(),
        connectionType: 'wifi' as const,
      };

      const speed = detector.categorizeSpeed(bandwidth);
      expect(speed).toBe('fast');
    });

    it('should categorize medium connection', () => {
      const bandwidth = {
        downloadSpeed: 3,
        uploadSpeed: 2,
        latency: 150,
        timestamp: Date.now(),
        connectionType: 'wifi' as const,
      };

      const speed = detector.categorizeSpeed(bandwidth);
      expect(speed).toBe('medium');
    });

    it('should categorize slow connection', () => {
      const bandwidth = {
        downloadSpeed: 1,
        uploadSpeed: 0.5,
        latency: 400,
        timestamp: Date.now(),
        connectionType: 'cellular' as const,
      };

      const speed = detector.categorizeSpeed(bandwidth);
      expect(speed).toBe('slow');
    });

    it('should categorize offline when no bandwidth', () => {
      const speed = detector.categorizeSpeed(null);
      expect(speed).toBe('offline');
    });

    it('should categorize offline when navigator offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const bandwidth = {
        downloadSpeed: 10,
        uploadSpeed: 8,
        latency: 50,
        timestamp: Date.now(),
        connectionType: 'wifi' as const,
      };

      const speed = detector.categorizeSpeed(bandwidth);
      expect(speed).toBe('offline');
    });
  });

  describe('Adaptive Sync Configuration', () => {
    it('should provide fast connection config', () => {
      const bandwidth = {
        downloadSpeed: 10,
        uploadSpeed: 8,
        latency: 50,
        timestamp: Date.now(),
        connectionType: 'wifi' as const,
      };

      const config = detector.getAdaptiveSyncConfig(bandwidth);

      expect(config.maxBatchSize).toBe(10 * 1024 * 1024); // 10MB for WiFi
      expect(config.maxBatchItems).toBe(100);
      expect(config.enableBackgroundSync).toBe(true);
      expect(config.enableLargeUploads).toBe(true);
    });

    it('should provide medium connection config', () => {
      const bandwidth = {
        downloadSpeed: 3,
        uploadSpeed: 2,
        latency: 150,
        timestamp: Date.now(),
        connectionType: 'cellular' as const,
      };

      const config = detector.getAdaptiveSyncConfig(bandwidth);

      expect(config.maxBatchSize).toBe(2 * 1024 * 1024); // 2MB
      expect(config.maxBatchItems).toBe(50);
      expect(config.enableBackgroundSync).toBe(true);
      expect(config.enableLargeUploads).toBe(false); // No large uploads on cellular
    });

    it('should provide slow connection config', () => {
      const bandwidth = {
        downloadSpeed: 1,
        uploadSpeed: 0.5,
        latency: 400,
        timestamp: Date.now(),
        connectionType: 'cellular' as const,
      };

      const config = detector.getAdaptiveSyncConfig(bandwidth);

      expect(config.maxBatchSize).toBe(500 * 1024); // 500KB
      expect(config.maxBatchItems).toBe(20);
      expect(config.enableBackgroundSync).toBe(false);
      expect(config.enableLargeUploads).toBe(false);
    });

    it('should provide offline config', () => {
      const config = detector.getAdaptiveSyncConfig(null);

      expect(config.maxBatchSize).toBe(0);
      expect(config.maxBatchItems).toBe(0);
      expect(config.enableBackgroundSync).toBe(false);
      expect(config.enableLargeUploads).toBe(false);
    });

    it('should reduce batch size on cellular for fast connection', () => {
      const wifiBandwidth = {
        downloadSpeed: 10,
        uploadSpeed: 8,
        latency: 50,
        timestamp: Date.now(),
        connectionType: 'wifi' as const,
      };

      const cellularBandwidth = {
        ...wifiBandwidth,
        connectionType: 'cellular' as const,
      };

      const wifiConfig = detector.getAdaptiveSyncConfig(wifiBandwidth);
      const cellularConfig = detector.getAdaptiveSyncConfig(cellularBandwidth);

      expect(cellularConfig.maxBatchSize).toBeLessThan(wifiConfig.maxBatchSize);
    });

    it('should apply data saver restrictions', () => {
      mockNetworkInformation({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: true,
      });

      const bandwidth = {
        downloadSpeed: 10,
        uploadSpeed: 8,
        latency: 50,
        timestamp: Date.now(),
        connectionType: 'wifi' as const,
      };

      const config = detector.getAdaptiveSyncConfig(bandwidth);

      expect(config.maxBatchSize).toBeLessThanOrEqual(1 * 1024 * 1024); // Max 1MB with data saver
      expect(config.maxBatchItems).toBeLessThanOrEqual(25);
      expect(config.enableLargeUploads).toBe(false);
    });
  });

  describe('Current Speed', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob([new ArrayBuffer(100000)])),
      });

      mockNetworkInformation({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
      });
    });

    it('should get current speed based on measurements', async () => {
      await detector.performBandwidthTest();

      const speed = detector.getCurrentSpeed();
      expect(speed).toBe('fast');
    });

    it('should return offline when no measurements', () => {
      const speed = detector.getCurrentSpeed();
      expect(speed).toBe('offline');
    });
  });
});
