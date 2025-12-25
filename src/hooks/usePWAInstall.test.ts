// File: src/hooks/usePWAInstall.test.ts
// Tests for PWA install hook with enhanced functionality

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePWAInstall, type PWAAnalyticsEvent } from './usePWAInstall';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Mock matchMedia for standalone detection
const createMatchMediaMock = (matches: boolean) =>
  vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

// Mock navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
  standalone: undefined,
};

describe('usePWAInstall', () => {
  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    localStorageMock.clear();

    // Setup matchMedia mock (not standalone)
    window.matchMedia = createMatchMediaMock(false);

    // Setup navigator mock
    Object.defineProperty(window, 'navigator', {
      value: mockNavigator,
      writable: true,
    });

    // Setup document referrer mock
    Object.defineProperty(document, 'referrer', {
      value: '',
      writable: true,
    });

    // Mock Date.now for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(false);
      expect(result.current.isDismissed).toBe(false);
      expect(result.current.isStandalone).toBe(false);
      expect(result.current.shouldShowBanner).toBe(false);
      expect(result.current.pageViewCount).toBeGreaterThanOrEqual(0);
    });

    it('should accept options', () => {
      const analyticsCallback = vi.fn();
      const { result } = renderHook(() =>
        usePWAInstall({
          onAnalyticsEvent: analyticsCallback,
          showAfterSeconds: 10,
          showAfterPageViews: 2,
          dismissalExpiryDays: 14,
        })
      );

      expect(result.current.isInstalled).toBe(false);
    });
  });

  describe('device detection', () => {
    it('should detect iOS device', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          standalone: undefined,
        },
        writable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isIOS).toBe(true);
      expect(result.current.isAndroid).toBe(false);
    });

    it('should detect iPad device', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
          standalone: undefined,
        },
        writable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isIOS).toBe(true);
    });

    it('should detect Android device', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5)',
          standalone: undefined,
        },
        writable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isIOS).toBe(false);
      expect(result.current.isAndroid).toBe(true);
    });

    it('should detect standalone mode', () => {
      window.matchMedia = createMatchMediaMock(true);

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isStandalone).toBe(true);
      expect(result.current.isInstalled).toBe(true);
    });

    it('should detect iOS standalone mode', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          standalone: true,
        },
        writable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isStandalone).toBe(true);
      expect(result.current.isInstalled).toBe(true);
    });
  });

  describe('dismissal handling', () => {
    it('should restore permanent dismissed state from localStorage', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'jobsight-pwa-dismissed') {return 'true';}
        return null;
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isDismissed).toBe(true);
    });

    it('should restore temporary dismissed state if not expired', () => {
      const dismissedTime = Date.now() - (3 * 24 * 60 * 60 * 1000); // 3 days ago
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'jobsight-pwa-dismissed-at') {return dismissedTime.toString();}
        return null;
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isDismissed).toBe(true);
    });

    it('should not be dismissed if expiry has passed', () => {
      const dismissedTime = Date.now() - (10 * 24 * 60 * 60 * 1000); // 10 days ago (past 7 day default)
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'jobsight-pwa-dismissed-at') {return dismissedTime.toString();}
        return null;
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isDismissed).toBe(false);
    });

    it('should dismiss temporarily and persist timestamp', () => {
      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isDismissed).toBe(false);

      act(() => {
        result.current.dismissPrompt(false);
      });

      expect(result.current.isDismissed).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'jobsight-pwa-dismissed-at',
        expect.any(String)
      );
    });

    it('should dismiss permanently and persist flag', () => {
      const { result } = renderHook(() => usePWAInstall());

      act(() => {
        result.current.dismissPrompt(true);
      });

      expect(result.current.isDismissed).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('jobsight-pwa-dismissed', 'true');
    });

    it('should reset dismissed state', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'jobsight-pwa-dismissed') {return 'true';}
        return null;
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isDismissed).toBe(true);

      act(() => {
        result.current.resetDismissed();
      });

      expect(result.current.isDismissed).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('jobsight-pwa-dismissed');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('jobsight-pwa-dismissed-at');
    });
  });

  describe('install prompt events', () => {
    it('should handle beforeinstallprompt event', async () => {
      vi.useRealTimers(); // Use real timers for this test

      const { result } = renderHook(() => usePWAInstall());

      // Initially not installable (no beforeinstallprompt event)
      expect(result.current.isInstallable).toBe(false);

      // Simulate beforeinstallprompt event
      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockEvent = new Event('beforeinstallprompt') as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string; platform: string }>;
      };
      mockEvent.prompt = mockPrompt;
      mockEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      // State should update synchronously from event
      expect(result.current.isInstallable).toBe(true);
    });

    it('should be installable on iOS even without beforeinstallprompt', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          standalone: false,
        },
        writable: true,
      });

      const { result } = renderHook(() => usePWAInstall());

      // iOS should show install prompt with manual instructions
      expect(result.current.isIOS).toBe(true);
      expect(result.current.isInstallable).toBe(true);
    });

    it('should not be installable when already installed', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'jobsight-pwa-installed') {return 'true';}
        return null;
      });
      window.matchMedia = createMatchMediaMock(true); // Standalone mode

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.isInstalled).toBe(true);
      expect(result.current.isInstallable).toBe(false);
    });
  });

  describe('banner display timing', () => {
    it('should initially not show banner when time and page views criteria not met', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          standalone: false,
        },
        writable: true,
      });

      const { result } = renderHook(() =>
        usePWAInstall({
          showAfterSeconds: 60,
          showAfterPageViews: 100, // High number so not triggered
        })
      );

      // Initially should not show since time has not elapsed
      expect(result.current.shouldShowBanner).toBe(false);
    });

    it('should show banner immediately if time already elapsed', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          standalone: false,
        },
        writable: true,
      });

      // Set first visit to 60 seconds ago
      const firstVisit = Date.now() - (60 * 1000);
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'jobsight-pwa-first-visit') {return firstVisit.toString();}
        return null;
      });

      const { result } = renderHook(() =>
        usePWAInstall({
          showAfterSeconds: 30, // 30 seconds, but already 60 seconds since first visit
          showAfterPageViews: 100,
        })
      );

      // Should show immediately since time criteria is met
      expect(result.current.shouldShowBanner).toBe(true);
    });

    it('should show banner after enough page views', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          standalone: false,
        },
        writable: true,
      });

      // Pre-set page views
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'jobsight-pwa-page-views') {return '5';}
        if (key === 'jobsight-pwa-first-visit') {return Date.now().toString();}
        return null;
      });

      const { result } = renderHook(() =>
        usePWAInstall({
          showAfterSeconds: 3600, // High number so page views trigger first
          showAfterPageViews: 3,
        })
      );

      expect(result.current.shouldShowBanner).toBe(true);
    });
  });

  describe('analytics tracking', () => {
    it('should call analytics callback on dismiss', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          standalone: false,
        },
        writable: true,
      });

      const analyticsCallback = vi.fn();
      const { result } = renderHook(() =>
        usePWAInstall({ onAnalyticsEvent: analyticsCallback })
      );

      act(() => {
        result.current.dismissPrompt(true);
      });

      expect(analyticsCallback).toHaveBeenCalledWith(
        'pwa_prompt_dismissed',
        expect.objectContaining({
          permanent: true,
          platform: 'ios',
        })
      );
    });

    it('should track prompt shown', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          standalone: false,
        },
        writable: true,
      });

      const analyticsCallback = vi.fn();
      const { result } = renderHook(() =>
        usePWAInstall({ onAnalyticsEvent: analyticsCallback })
      );

      act(() => {
        result.current.trackPromptShown();
      });

      expect(analyticsCallback).toHaveBeenCalledWith(
        'pwa_prompt_shown',
        expect.objectContaining({
          platform: 'ios',
        })
      );
    });

    it('should only track prompt shown once per hook instance', () => {
      const analyticsCallback = vi.fn();
      const { result, rerender } = renderHook(() =>
        usePWAInstall({ onAnalyticsEvent: analyticsCallback })
      );

      // First call should track
      act(() => {
        result.current.trackPromptShown();
      });

      // Second call should not track (same instance)
      act(() => {
        result.current.trackPromptShown();
      });

      const promptShownCalls = analyticsCallback.mock.calls.filter(
        (call) => call[0] === 'pwa_prompt_shown'
      );
      expect(promptShownCalls.length).toBe(1);
    });
  });

  describe('page view tracking', () => {
    it('should increment page views on mount', () => {
      renderHook(() => usePWAInstall());

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'jobsight-pwa-page-views',
        expect.any(String)
      );
    });

    it('should return current page view count', () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'jobsight-pwa-page-views') {return '5';}
        return null;
      });

      const { result } = renderHook(() => usePWAInstall());

      expect(result.current.pageViewCount).toBe(6); // 5 + 1 increment on mount
    });
  });
});
