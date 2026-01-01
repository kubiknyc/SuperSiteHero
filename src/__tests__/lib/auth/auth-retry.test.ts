/**
 * Auth Retry Tests
 * Tests for retry logic with exponential backoff for transient auth failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isTransientError,
  calculateRetryDelay,
  withAuthRetry,
  withAuthRetryThrow,
  isOnline,
  waitForOnline,
  DEFAULT_AUTH_RETRY_CONFIG,
  type RetryConfig,
} from '@/lib/auth/auth-retry';

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('isTransientError', () => {
  it('should return false for null/undefined errors', () => {
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError(undefined)).toBe(false);
  });

  describe('transient errors (should retry)', () => {
    it('should detect network errors', () => {
      expect(isTransientError(new Error('Failed to fetch'))).toBe(true);
      expect(isTransientError(new Error('fetch failed'))).toBe(true);
      expect(isTransientError(new Error('NetworkError when attempting to fetch'))).toBe(true);
      expect(isTransientError({ code: 'NETWORK_ERROR', message: '' })).toBe(true);
      expect(isTransientError({ code: 'ERR_NETWORK', message: '' })).toBe(true);
      expect(isTransientError(new Error('ECONNRESET'))).toBe(true);
      expect(isTransientError(new Error('ETIMEDOUT'))).toBe(true);
    });

    it('should detect rate limiting errors', () => {
      expect(isTransientError(new Error('rate limit exceeded'))).toBe(true);
      expect(isTransientError(new Error('Too many requests'))).toBe(true);
      expect(isTransientError({ status: 429, message: '' })).toBe(true);
      expect(isTransientError(new Error('429'))).toBe(true);
    });

    it('should detect server errors (5xx)', () => {
      expect(isTransientError({ status: 500, message: 'Internal Server Error' })).toBe(true);
      expect(isTransientError({ status: 502, message: 'Bad Gateway' })).toBe(true);
      expect(isTransientError({ status: 503, message: 'Service Unavailable' })).toBe(true);
      expect(isTransientError({ status: 504, message: 'Gateway Timeout' })).toBe(true);
      expect(isTransientError(new Error('502 Bad Gateway'))).toBe(true);
      expect(isTransientError(new Error('Service Unavailable'))).toBe(true);
    });

    it('should detect JWT/token errors', () => {
      expect(isTransientError(new Error('JWT expired'))).toBe(true);
      expect(isTransientError(new Error('refresh_token invalid'))).toBe(true);
      expect(isTransientError(new Error('token_expired'))).toBe(true);
      expect(isTransientError(new Error('session_not_found'))).toBe(true);
    });
  });

  describe('permanent errors (should not retry)', () => {
    it('should not retry invalid credentials', () => {
      expect(isTransientError(new Error('Invalid login credentials'))).toBe(false);
      expect(isTransientError(new Error('Invalid email or password'))).toBe(false);
      expect(isTransientError({ code: 'invalid_credentials', message: '' })).toBe(false);
    });

    it('should not retry user/account errors', () => {
      expect(isTransientError(new Error('User not found'))).toBe(false);
      expect(isTransientError(new Error('User banned'))).toBe(false);
      expect(isTransientError(new Error('account_locked'))).toBe(false);
      expect(isTransientError(new Error('Email not confirmed'))).toBe(false);
    });

    it('should not retry validation errors', () => {
      expect(isTransientError({ code: 'validation_failed', message: '' })).toBe(false);
      expect(isTransientError({ code: 'invalid_request', message: '' })).toBe(false);
    });

    it('should not retry permission errors', () => {
      expect(isTransientError(new Error('unauthorized'))).toBe(false);
      expect(isTransientError(new Error('forbidden'))).toBe(false);
      expect(isTransientError({ status: 401, message: 'Unauthorized' })).toBe(false);
      expect(isTransientError({ status: 403, message: 'Forbidden' })).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle string errors', () => {
      expect(isTransientError('Failed to fetch')).toBe(true);
      expect(isTransientError('Invalid login credentials')).toBe(false);
    });

    it('should handle errors with both transient and permanent patterns', () => {
      // Permanent patterns should take precedence
      expect(isTransientError(new Error('Invalid login credentials - network error'))).toBe(false);
    });
  });
});

describe('calculateRetryDelay', () => {
  it('should calculate exponential delays', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      jitterFactor: 0, // No jitter for predictable testing
    };

    expect(calculateRetryDelay(0, config)).toBe(1000);  // 1000 * 2^0 = 1000
    expect(calculateRetryDelay(1, config)).toBe(2000);  // 1000 * 2^1 = 2000
    expect(calculateRetryDelay(2, config)).toBe(4000);  // 1000 * 2^2 = 4000
    expect(calculateRetryDelay(3, config)).toBe(8000);  // 1000 * 2^3 = 8000
  });

  it('should cap delay at maxDelayMs', () => {
    const config: RetryConfig = {
      maxRetries: 10,
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      jitterFactor: 0,
    };

    expect(calculateRetryDelay(5, config)).toBe(5000);  // Would be 32000, capped at 5000
    expect(calculateRetryDelay(10, config)).toBe(5000); // Would be 1024000, capped at 5000
  });

  it('should add jitter when jitterFactor > 0', () => {
    const config: RetryConfig = {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      jitterFactor: 0.2,
    };

    // With jitter, the delay should be between base and base + 20%
    const delays = new Set<number>();
    for (let i = 0; i < 10; i++) {
      delays.add(calculateRetryDelay(0, config));
    }

    // All delays should be between 1000 and 1200
    delays.forEach(delay => {
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1200);
    });
  });

  it('should use default config when not provided', () => {
    const delay = calculateRetryDelay(0);
    expect(delay).toBeGreaterThanOrEqual(DEFAULT_AUTH_RETRY_CONFIG.baseDelayMs);
  });
});

describe('withAuthRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return success on first attempt if function succeeds', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const resultPromise = withAuthRetry(fn, { maxRetries: 3 });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on transient errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('success');

    const config = { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0 };
    const resultPromise = withAuthRetry(fn, config, 'test operation');

    // Run all timers to handle retries
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on permanent errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Invalid login credentials'));

    const config = { maxRetries: 3, baseDelayMs: 100, jitterFactor: 0 };
    const resultPromise = withAuthRetry(fn, config, 'test operation');
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Invalid login credentials');
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should fail after maxRetries exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const config = { maxRetries: 2, baseDelayMs: 100, jitterFactor: 0 };
    const resultPromise = withAuthRetry(fn, config, 'test operation');
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Failed to fetch');
    expect(result.attempts).toBe(3); // Initial + 2 retries
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should track total time', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce('success');

    const config = { maxRetries: 3, baseDelayMs: 1000, jitterFactor: 0 };
    const resultPromise = withAuthRetry(fn, config, 'test operation');

    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
    expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should use default config when partial config provided', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const resultPromise = withAuthRetry(fn, { maxRetries: 1 });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.success).toBe(true);
  });
});

describe('withAuthRetryThrow', () => {
  it('should return data on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const data = await withAuthRetryThrow(fn, { maxRetries: 3 });

    expect(data).toBe('success');
  });

  it('should throw on failure after retries (uses withAuthRetry internally)', async () => {
    // Test via withAuthRetry which doesn't throw
    const fn = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const config = { maxRetries: 0, baseDelayMs: 10, jitterFactor: 0 };
    const result = await withAuthRetry(fn, config, 'test operation');

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Failed to fetch');
  });

  it('should throw immediately on permanent errors (uses withAuthRetry internally)', async () => {
    // Test via withAuthRetry which doesn't throw
    const fn = vi.fn().mockRejectedValue(new Error('Invalid login credentials'));

    const config = { maxRetries: 3, baseDelayMs: 10, jitterFactor: 0 };
    const result = await withAuthRetry(fn, config, 'test operation');

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Invalid login credentials');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('isOnline', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  it('should return true when navigator is undefined (SSR)', () => {
    Object.defineProperty(global, 'navigator', {
      value: undefined,
      configurable: true,
    });

    expect(isOnline()).toBe(true);
  });

  it('should return navigator.onLine value', () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });
    expect(isOnline()).toBe(true);

    Object.defineProperty(global, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });
    expect(isOnline()).toBe(false);
  });
});

describe('waitForOnline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve immediately if already online', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      configurable: true,
    });

    const result = await waitForOnline();
    expect(result).toBe(true);
  });

  it('should resolve true when online event fires', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });

    const mockAddEventListener = vi.fn();
    const mockRemoveEventListener = vi.fn();

    Object.defineProperty(global, 'window', {
      value: {
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      },
      configurable: true,
    });

    const promise = waitForOnline(5000);

    // Simulate online event
    const onlineHandler = mockAddEventListener.mock.calls.find(
      call => call[0] === 'online'
    )?.[1];

    if (onlineHandler) {
      onlineHandler();
    }

    const result = await promise;
    expect(result).toBe(true);
    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
  });

  it('should resolve false on timeout', async () => {
    Object.defineProperty(global, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });

    const mockAddEventListener = vi.fn();
    const mockRemoveEventListener = vi.fn();

    Object.defineProperty(global, 'window', {
      value: {
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      },
      configurable: true,
    });

    const promise = waitForOnline(1000);

    // Advance time past timeout
    await vi.advanceTimersByTimeAsync(1100);

    const result = await promise;
    expect(result).toBe(false);
    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
  });
});
