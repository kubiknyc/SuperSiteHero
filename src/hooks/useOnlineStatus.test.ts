import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return online status initially', () => {
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.networkQuality.type).toBe('online');
  });

  it('should update when going offline', async () => {
    const { result } = renderHook(() => useOnlineStatus());

    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    window.dispatchEvent(new Event('offline'));

    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
      expect(result.current.networkQuality.type).toBe('offline');
      expect(result.current.lastOfflineAt).toBeGreaterThan(0);
    });
  });

  it('should update when coming back online', async () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() => useOnlineStatus());

    // Simulate coming back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    window.dispatchEvent(new Event('online'));

    await waitFor(() => {
      expect(result.current.isOnline).toBe(true);
      expect(result.current.networkQuality.type).toBe('online');
      expect(result.current.lastOnlineAt).toBeGreaterThan(0);
    });
  });

  it('should detect slow connection if Network Information API available', async () => {
    // Mock Network Information API
    const mockConnection = {
      effectiveType: '2g',
      downlink: 0.3,
      rtt: 600,
      saveData: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'connection', {
      writable: true,
      value: mockConnection,
    });

    const { result } = renderHook(() => useOnlineStatus());

    await waitFor(() => {
      expect(result.current.networkQuality.type).toBe('slow');
      expect(result.current.networkQuality.effectiveType).toBe('2g');
    });
  });

  it('should track last online and offline timestamps', async () => {
    const { result } = renderHook(() => useOnlineStatus());

    const initialOnlineTime = result.current.lastOnlineAt;
    expect(initialOnlineTime).toBeGreaterThan(0);

    // Go offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });
    window.dispatchEvent(new Event('offline'));

    await waitFor(() => {
      expect(result.current.lastOfflineAt).toBeGreaterThan(initialOnlineTime!);
    });
  });
});
