/**
 * Currency Exchange Service Tests
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true);
import {
  currencyExchangeApi,
  getExchangeRate,
  convertCurrency,
  toMultiCurrencyAmount,
  batchConvertCurrency,
  refreshExchangeRates,
  clearExchangeRateCache,
  getExchangeRateCacheStatus,
} from './currency-exchange';
import type { CurrencyCode, ConversionRequest } from '@/types/currency';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

describe('Currency Exchange Service', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('getExchangeRate', () => {
    it('should return rate 1 for same currency', async () => {
      const rate = await getExchangeRate('USD', 'USD');

      expect(rate.from_currency).toBe('USD');
      expect(rate.to_currency).toBe('USD');
      expect(rate.rate).toBe(1);
      expect(rate.inverse_rate).toBe(1);
      expect(rate.source).toBe('same-currency');
    });

    it('should fetch and cache exchange rates from API', async () => {
      const mockApiResponse = {
        usd: {
          date: '2024-01-15',
          eur: 0.92,
          gbp: 0.79,
          jpy: 148.5,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const rate = await getExchangeRate('USD', 'EUR');

      expect(rate.from_currency).toBe('USD');
      expect(rate.to_currency).toBe('EUR');
      expect(rate.rate).toBe(0.92);
      expect(rate.inverse_rate).toBeCloseTo(1 / 0.92);
      expect(rate.source).toBe('fawazahmed0/currency-api');

      // Check that rates are cached
      const cacheStatus = getExchangeRateCacheStatus();
      expect(cacheStatus.isCached).toBe(true);
      expect(cacheStatus.rateCount).toBeGreaterThan(0);
    });

    it('should use cached rates if available', async () => {
      const mockApiResponse = {
        usd: {
          date: '2024-01-15',
          eur: 0.92,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      // First call - fetches from API
      await getExchangeRate('USD', 'EUR');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - uses cache
      const rate = await getExchangeRate('USD', 'EUR');
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still only called once
      expect(rate.rate).toBe(0.92);
    });

    it('should calculate cross rates through USD', async () => {
      const mockApiResponse = {
        usd: {
          date: '2024-01-15',
          eur: 0.92,
          gbp: 0.79,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      // Get EUR to GBP rate (cross rate through USD)
      await getExchangeRate('USD', 'EUR'); // Prime cache
      const rate = await getExchangeRate('EUR', 'GBP');

      expect(rate.from_currency).toBe('EUR');
      expect(rate.to_currency).toBe('GBP');
      expect(rate.source).toBe('cross-rate-via-USD');
      // EUR to USD = 1/0.92, USD to GBP = 0.79, so EUR to GBP = (1/0.92) * 0.79
      expect(rate.rate).toBeCloseTo((1 / 0.92) * 0.79, 4);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(getExchangeRate('USD', 'EUR')).rejects.toThrow();
    });

    it('should use stale cache as fallback when API fails', async () => {
      // Set up stale cache
      const staleCache = {
        rates: {
          USD_EUR: {
            from_currency: 'USD' as CurrencyCode,
            to_currency: 'EUR' as CurrencyCode,
            rate: 0.90,
            inverse_rate: 1.11,
            last_updated: '2024-01-01T00:00:00.000Z',
            source: 'fawazahmed0/currency-api',
          },
        },
        last_refresh: '2024-01-01T00:00:00.000Z',
        next_refresh: '2024-01-01T00:00:00.000Z', // Expired
      };
      localStorageMock.setItem('exchange_rates_cache', JSON.stringify(staleCache));

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Service Unavailable',
      });

      const rate = await getExchangeRate('USD', 'EUR');
      expect(rate.rate).toBe(0.90);
    });
  });

  describe('convertCurrency', () => {
    beforeEach(() => {
      const mockApiResponse = {
        usd: {
          date: '2024-01-15',
          eur: 0.92,
          gbp: 0.79,
          jpy: 148.5,
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });
    });

    it('should convert amount between currencies', async () => {
      const request: ConversionRequest = {
        amount: 100,
        from_currency: 'USD',
        to_currency: 'EUR',
      };

      const result = await convertCurrency(request);

      expect(result.original_amount).toBe(100);
      expect(result.converted_amount).toBeCloseTo(92, 1);
      expect(result.from_currency).toBe('USD');
      expect(result.to_currency).toBe('EUR');
      expect(result.exchange_rate).toBe(0.92);
      expect(result.is_historical).toBe(false);
    });

    it('should round to appropriate decimal places', async () => {
      const request: ConversionRequest = {
        amount: 100,
        from_currency: 'USD',
        to_currency: 'JPY',
      };

      const result = await convertCurrency(request);

      // JPY has 0 decimal places
      expect(result.converted_amount).toBe(14850);
      expect(Number.isInteger(result.converted_amount)).toBe(true);
    });

    it('should handle same currency conversion', async () => {
      const request: ConversionRequest = {
        amount: 100,
        from_currency: 'USD',
        to_currency: 'USD',
      };

      const result = await convertCurrency(request);

      expect(result.original_amount).toBe(100);
      expect(result.converted_amount).toBe(100);
      expect(result.exchange_rate).toBe(1);
    });

    it('should support historical date parameter', async () => {
      const historicalDate = '2024-01-01';
      const request: ConversionRequest = {
        amount: 100,
        from_currency: 'USD',
        to_currency: 'EUR',
        date: historicalDate,
      };

      const result = await convertCurrency(request);

      expect(result.conversion_date).toBe(historicalDate);
      expect(result.is_historical).toBe(true);
    });
  });

  describe('toMultiCurrencyAmount', () => {
    beforeEach(() => {
      const mockEurApiResponse = {
        eur: {
          date: '2024-01-15',
          usd: 1.087,
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockEurApiResponse,
      });
    });

    it('should create multi-currency amount with conversion', async () => {
      const result = await toMultiCurrencyAmount(100, 'EUR', 'USD');

      expect(result.amount).toBe(100);
      expect(result.currency).toBe('EUR');
      expect(result.base_currency).toBe('USD');
      expect(result.base_amount).toBeCloseTo(108.7, 1); // 100 * 1.087
      expect(result.exchange_rate).toBeCloseTo(1.087, 4);
    });

    it('should handle same currency without conversion', async () => {
      const result = await toMultiCurrencyAmount(100, 'USD', 'USD');

      expect(result.amount).toBe(100);
      expect(result.currency).toBe('USD');
      expect(result.base_amount).toBe(100);
      expect(result.base_currency).toBe('USD');
      expect(result.exchange_rate).toBe(1);
    });
  });

  describe('batchConvertCurrency', () => {
    beforeEach(() => {
      const mockApiResponse = {
        usd: {
          date: '2024-01-15',
          eur: 0.92,
          gbp: 0.79,
          jpy: 148.5,
        },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockApiResponse,
      });
    });

    it('should convert multiple amounts efficiently', async () => {
      const requests: ConversionRequest[] = [
        { amount: 100, from_currency: 'USD', to_currency: 'EUR' },
        { amount: 200, from_currency: 'USD', to_currency: 'EUR' },
        { amount: 50, from_currency: 'USD', to_currency: 'GBP' },
      ];

      const results = await batchConvertCurrency(requests);

      expect(results).toHaveLength(3);
      expect(results[0].converted_amount).toBeCloseTo(92, 1);
      expect(results[1].converted_amount).toBeCloseTo(184, 1);
      expect(results[2].converted_amount).toBeCloseTo(39.5, 1);
    });

    it('should minimize API calls by grouping currency pairs', async () => {
      const requests: ConversionRequest[] = [
        { amount: 100, from_currency: 'USD', to_currency: 'EUR' },
        { amount: 200, from_currency: 'USD', to_currency: 'EUR' },
        { amount: 300, from_currency: 'USD', to_currency: 'EUR' },
      ];

      await batchConvertCurrency(requests);

      // Should only call API once since all requests are for the same currency pair
      // and rates get cached
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshExchangeRates', () => {
    it('should fetch new rates and update cache', async () => {
      const mockApiResponse = {
        usd: {
          date: '2024-01-15',
          eur: 0.92,
          gbp: 0.79,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const cache = await refreshExchangeRates('USD');

      expect(cache.rates).toBeDefined();
      expect(cache.last_refresh).toBeDefined();
      expect(cache.next_refresh).toBeDefined();

      const cacheStatus = getExchangeRateCacheStatus();
      expect(cacheStatus.isCached).toBe(true);
    });

    it('should support different base currencies', async () => {
      const mockApiResponse = {
        eur: {
          date: '2024-01-15',
          usd: 1.09,
          gbp: 0.86,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const cache = await refreshExchangeRates('EUR');

      expect(cache.rates['EUR_USD']).toBeDefined();
      expect(cache.rates['EUR_USD'].rate).toBe(1.09);
    });
  });

  describe('clearExchangeRateCache', () => {
    it('should clear cached rates', async () => {
      // Set up cache
      const mockApiResponse = {
        usd: {
          date: '2024-01-15',
          eur: 0.92,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      await getExchangeRate('USD', 'EUR');
      expect(getExchangeRateCacheStatus().isCached).toBe(true);

      // Clear cache
      clearExchangeRateCache();
      expect(getExchangeRateCacheStatus().isCached).toBe(false);
    });
  });

  describe('getExchangeRateCacheStatus', () => {
    it('should return cache status', async () => {
      const statusBefore = getExchangeRateCacheStatus();
      expect(statusBefore.isCached).toBe(false);
      expect(statusBefore.rateCount).toBe(0);

      const mockApiResponse = {
        usd: {
          date: '2024-01-15',
          eur: 0.92,
          gbp: 0.79,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      await getExchangeRate('USD', 'EUR');

      const statusAfter = getExchangeRateCacheStatus();
      expect(statusAfter.isCached).toBe(true);
      expect(statusAfter.lastRefresh).toBeDefined();
      expect(statusAfter.nextRefresh).toBeDefined();
      expect(statusAfter.rateCount).toBeGreaterThan(0);
    });
  });

  describe('currencyExchangeApi', () => {
    it('should export all API methods', () => {
      expect(currencyExchangeApi.getExchangeRate).toBeDefined();
      expect(currencyExchangeApi.getAllExchangeRates).toBeDefined();
      expect(currencyExchangeApi.refreshExchangeRates).toBeDefined();
      expect(currencyExchangeApi.convertCurrency).toBeDefined();
      expect(currencyExchangeApi.toMultiCurrencyAmount).toBeDefined();
      expect(currencyExchangeApi.batchConvertCurrency).toBeDefined();
      expect(currencyExchangeApi.clearCache).toBeDefined();
      expect(currencyExchangeApi.getCacheStatus).toBeDefined();
      expect(currencyExchangeApi.shouldRefresh).toBeDefined();
      expect(currencyExchangeApi.getCacheAge).toBeDefined();
    });
  });
});
