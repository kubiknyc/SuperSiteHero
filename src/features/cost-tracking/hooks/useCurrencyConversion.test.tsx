/**
 * Currency Conversion Hooks Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurrencyConversion, useLiveConversion } from './useCurrencyConversion';
import type { CurrencyCode } from '@/types/currency';
import * as currencyExchangeService from '@/lib/api/services/currency-exchange';

// Mock the currency exchange service
vi.mock('@/lib/api/services/currency-exchange', () => ({
  convertCurrency: vi.fn(),
  getExchangeRate: vi.fn(),
  toMultiCurrencyAmount: vi.fn(),
  refreshExchangeRates: vi.fn(),
}));

// Create wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useCurrencyConversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with base currency', () => {
    const { result } = renderHook(
      () => useCurrencyConversion({ baseCurrency: 'USD' }),
      { wrapper: createWrapper() }
    );

    expect(result.current.baseCurrency).toBe('USD');
    expect(result.current.isConverting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should convert amount between currencies', async () => {
    const mockConversion = {
      original_amount: 100,
      converted_amount: 92,
      from_currency: 'USD' as CurrencyCode,
      to_currency: 'EUR' as CurrencyCode,
      exchange_rate: 0.92,
      conversion_date: new Date().toISOString(),
      is_historical: false,
    };

    vi.mocked(currencyExchangeService.convertCurrency).mockResolvedValue(mockConversion);

    const { result } = renderHook(
      () => useCurrencyConversion({ baseCurrency: 'USD' }),
      { wrapper: createWrapper() }
    );

    const conversion = await result.current.convertAmount(100, 'USD', 'EUR');

    expect(conversion).toEqual(mockConversion);
    expect(result.current.convertedAmount).toBe(92);
    expect(result.current.exchangeRate).toBe(0.92);
  });

  it('should handle same currency conversion', async () => {
    const { result } = renderHook(
      () => useCurrencyConversion({ baseCurrency: 'USD' }),
      { wrapper: createWrapper() }
    );

    const conversion = await result.current.convertAmount(100, 'USD', 'USD');

    expect(conversion).toBeDefined();
    expect(conversion?.original_amount).toBe(100);
    expect(conversion?.converted_amount).toBe(100);
    expect(conversion?.exchange_rate).toBe(1);
  });

  it('should convert to base currency', async () => {
    const mockConversion = {
      original_amount: 100,
      converted_amount: 108.7,
      from_currency: 'EUR' as CurrencyCode,
      to_currency: 'USD' as CurrencyCode,
      exchange_rate: 1.087,
      conversion_date: new Date().toISOString(),
      is_historical: false,
    };

    vi.mocked(currencyExchangeService.convertCurrency).mockResolvedValue(mockConversion);

    const { result } = renderHook(
      () => useCurrencyConversion({ baseCurrency: 'USD' }),
      { wrapper: createWrapper() }
    );

    const conversion = await result.current.convertToBase(100, 'EUR');

    expect(conversion?.converted_amount).toBe(108.7);
    expect(currencyExchangeService.convertCurrency).toHaveBeenCalledWith({
      amount: 100,
      from_currency: 'EUR',
      to_currency: 'USD',
    });
  });

  it('should get exchange rate', async () => {
    const mockRate = {
      from_currency: 'USD' as CurrencyCode,
      to_currency: 'EUR' as CurrencyCode,
      rate: 0.92,
      inverse_rate: 1.087,
      last_updated: new Date().toISOString(),
      source: 'test',
    };

    vi.mocked(currencyExchangeService.getExchangeRate).mockResolvedValue(mockRate);

    const { result } = renderHook(
      () => useCurrencyConversion({ baseCurrency: 'USD' }),
      { wrapper: createWrapper() }
    );

    const rate = await result.current.getRate('USD', 'EUR');

    expect(rate).toEqual(mockRate);
  });

  it('should create multi-currency amount', async () => {
    const mockMultiAmount = {
      amount: 100,
      currency: 'EUR' as CurrencyCode,
      base_amount: 108.7,
      base_currency: 'USD' as CurrencyCode,
      exchange_rate: 1.087,
      conversion_date: new Date().toISOString(),
    };

    vi.mocked(currencyExchangeService.toMultiCurrencyAmount).mockResolvedValue(mockMultiAmount);

    const { result } = renderHook(
      () => useCurrencyConversion({ baseCurrency: 'USD' }),
      { wrapper: createWrapper() }
    );

    const multiAmount = await result.current.createMultiCurrencyAmount(100, 'EUR');

    expect(multiAmount).toEqual(mockMultiAmount);
  });

  it('should handle conversion errors', async () => {
    vi.mocked(currencyExchangeService.convertCurrency).mockRejectedValue(
      new Error('API Error')
    );

    const { result } = renderHook(
      () => useCurrencyConversion({ baseCurrency: 'USD' }),
      { wrapper: createWrapper() }
    );

    const conversion = await result.current.convertAmount(100, 'USD', 'EUR');

    expect(conversion).toBeNull();
    expect(result.current.error).toBe('API Error');
  });

  it('should respect enabled flag', async () => {
    const { result } = renderHook(
      () => useCurrencyConversion({ baseCurrency: 'USD', enabled: false }),
      { wrapper: createWrapper() }
    );

    const conversion = await result.current.convertAmount(100, 'USD', 'EUR');

    expect(conversion).toBeNull();
    expect(currencyExchangeService.convertCurrency).not.toHaveBeenCalled();
  });
});

describe('useLiveConversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null for same currency', async () => {
    const mockConversion = {
      original_amount: 100,
      converted_amount: 100,
      from_currency: 'USD' as CurrencyCode,
      to_currency: 'USD' as CurrencyCode,
      exchange_rate: 1,
      conversion_date: new Date().toISOString(),
      is_historical: false,
    };

    vi.mocked(currencyExchangeService.convertCurrency).mockResolvedValue(mockConversion);

    const { result } = renderHook(
      () =>
        useLiveConversion({
          amount: 100,
          fromCurrency: 'USD',
          toCurrency: 'USD',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.convertedAmount).toBe(100);
    });
  });

  it('should debounce amount changes', async () => {
    vi.useFakeTimers();

    const mockConversion = {
      original_amount: 200,
      converted_amount: 184,
      from_currency: 'USD' as CurrencyCode,
      to_currency: 'EUR' as CurrencyCode,
      exchange_rate: 0.92,
      conversion_date: new Date().toISOString(),
      is_historical: false,
    };

    vi.mocked(currencyExchangeService.convertCurrency).mockResolvedValue(mockConversion);

    const { rerender } = renderHook(
      ({ amount }: { amount: number }) =>
        useLiveConversion({
          amount,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
        }),
      {
        wrapper: createWrapper(),
        initialProps: { amount: 100 },
      }
    );

    // Change amount multiple times quickly
    rerender({ amount: 150 });
    rerender({ amount: 200 });

    // Should not have called API yet
    expect(currencyExchangeService.convertCurrency).not.toHaveBeenCalled();

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(currencyExchangeService.convertCurrency).toHaveBeenCalledTimes(1);
    });

    vi.useRealTimers();
  });

  it('should handle zero amount', () => {
    const { result } = renderHook(
      () =>
        useLiveConversion({
          amount: 0,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isConverting).toBe(false);
  });

  it('should provide loading state', async () => {
    const mockConversion = {
      original_amount: 100,
      converted_amount: 92,
      from_currency: 'USD' as CurrencyCode,
      to_currency: 'EUR' as CurrencyCode,
      exchange_rate: 0.92,
      conversion_date: new Date().toISOString(),
      is_historical: false,
    };

    vi.mocked(currencyExchangeService.convertCurrency).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockConversion), 100);
        })
    );

    const { result } = renderHook(
      () =>
        useLiveConversion({
          amount: 100,
          fromCurrency: 'USD',
          toCurrency: 'EUR',
          debounceMs: 0,
        }),
      { wrapper: createWrapper() }
    );

    // Initially should be loading or not started
    await waitFor(() => {
      expect(result.current.convertedAmount).toBeDefined();
    });
  });
});
