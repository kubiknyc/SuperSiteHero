/**
 * IndexedDB Mock Setup
 * Provides fake-indexeddb for testing offline functionality
 */

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { vi } from 'vitest';

/**
 * Setup IndexedDB mock for tests
 * Call this in beforeEach to get a fresh database instance
 */
export function setupIndexedDBMock(): void {
  // Reset the global indexedDB to a fresh instance
  global.indexedDB = new IDBFactory();
}

/**
 * Cleanup IndexedDB mock after tests
 * Call this in afterEach
 */
export function cleanupIndexedDBMock(): void {
  // The database will be automatically cleaned up by fake-indexeddb
  // when we create a new instance in setupIndexedDBMock
}

/**
 * Mock navigator.storage API
 */
export function mockNavigatorStorage(): void {
  Object.defineProperty(navigator, 'storage', {
    value: {
      estimate: vi.fn().mockResolvedValue({
        usage: 1000000, // 1MB used
        quota: 100000000, // 100MB quota
      }),
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
    },
    writable: true,
  });
}

/**
 * Mock online/offline status
 */
export function mockOnlineStatus(isOnline: boolean = true): void {
  Object.defineProperty(navigator, 'onLine', {
    value: isOnline,
    writable: true,
  });
}

/**
 * Simulate going offline
 */
export function simulateOffline(): void {
  mockOnlineStatus(false);
  window.dispatchEvent(new Event('offline'));
}

/**
 * Simulate going online
 */
export function simulateOnline(): void {
  mockOnlineStatus(true);
  window.dispatchEvent(new Event('online'));
}

/**
 * Mock Network Information API
 */
export function mockNetworkInformation(options: {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
} = {}): void {
  const connection = {
    effectiveType: options.effectiveType || '4g',
    downlink: options.downlink ?? 10, // Mbps
    rtt: options.rtt ?? 50, // ms
    saveData: options.saveData ?? false,
    type: 'wifi',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };

  Object.defineProperty(navigator, 'connection', {
    value: connection,
    writable: true,
  });
}

/**
 * Complete test environment setup for offline tests
 */
export function setupOfflineTestEnvironment(): void {
  setupIndexedDBMock();
  mockNavigatorStorage();
  mockOnlineStatus(true);
  mockNetworkInformation();
}

/**
 * Reset all mocks and cleanup
 */
export function cleanupOfflineTestEnvironment(): void {
  cleanupIndexedDBMock();
  vi.clearAllMocks();
}
