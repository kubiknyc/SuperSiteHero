/**
 * Currency Conversion Hook for Cost Tracking
 * Provides currency conversion utilities for budget and transaction forms
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { CurrencyCode, ConversionResult } from '@/types/currency';
import {
  convertCurrency,
  getExchangeRate,
  toMultiCurrencyAmount,
  refreshExchangeRates,
} from '@/lib/api/services/currency-exchange';
import { logger } from '../../../lib/utils/logger';


interface UseCurrencyConversionProps {
  baseCurrency: CurrencyCode;
  enabled?: boolean;
}

interface ConversionState {
  amount: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  convertedAmount: number | null;
  exchangeRate: number | null;
  isConverting: boolean;
  error: string | null;
}

export function useCurrencyConversion({
  baseCurrency,
  enabled = true,
}: UseCurrencyConversionProps) {
  const [conversionState, setConversionState] = useState<ConversionState>({
    amount: 0,
    fromCurrency: baseCurrency,
    toCurrency: baseCurrency,
    convertedAmount: null,
    exchangeRate: null,
    isConverting: false,
    error: null,
  });

  // Convert amount between currencies
  const convertAmount = useCallback(
    async (
      amount: number,
      fromCurrency: CurrencyCode,
      toCurrency: CurrencyCode
    ): Promise<ConversionResult | null> => {
      if (!enabled) {return null;}

      // Same currency - no conversion needed
      if (fromCurrency === toCurrency) {
        return {
          original_amount: amount,
          converted_amount: amount,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          exchange_rate: 1,
          conversion_date: new Date().toISOString(),
          is_historical: false,
        };
      }

      setConversionState((prev) => ({
        ...prev,
        isConverting: true,
        error: null,
      }));

      try {
        const result = await convertCurrency({
          amount,
          from_currency: fromCurrency,
          to_currency: toCurrency,
        });

        setConversionState({
          amount,
          fromCurrency,
          toCurrency,
          convertedAmount: result.converted_amount,
          exchangeRate: result.exchange_rate,
          isConverting: false,
          error: null,
        });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
        setConversionState((prev) => ({
          ...prev,
          isConverting: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [enabled]
  );

  // Convert to base currency
  const convertToBase = useCallback(
    async (amount: number, fromCurrency: CurrencyCode): Promise<ConversionResult | null> => {
      return convertAmount(amount, fromCurrency, baseCurrency);
    },
    [baseCurrency, convertAmount]
  );

  // Get exchange rate
  const getRate = useCallback(
    async (fromCurrency: CurrencyCode, toCurrency: CurrencyCode) => {
      if (!enabled) {return null;}

      try {
        const rate = await getExchangeRate(fromCurrency, toCurrency);
        return rate;
      } catch (error) {
        logger.error('Failed to get exchange rate:', error);
        return null;
      }
    },
    [enabled]
  );

  // Create multi-currency amount
  const createMultiCurrencyAmount = useCallback(
    async (amount: number, currency: CurrencyCode) => {
      if (!enabled) {return null;}

      try {
        const multiAmount = await toMultiCurrencyAmount(amount, currency, baseCurrency);
        return multiAmount;
      } catch (error) {
        logger.error('Failed to create multi-currency amount:', error);
        return null;
      }
    },
    [baseCurrency, enabled]
  );

  return {
    // State
    ...conversionState,

    // Methods
    convertAmount,
    convertToBase,
    getRate,
    createMultiCurrencyAmount,

    // Base currency
    baseCurrency,
  };
}

/**
 * Hook for live conversion preview
 * Updates conversion as user types
 */
interface UseLiveConversionProps {
  amount: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  debounceMs?: number;
}

export function useLiveConversion({
  amount,
  fromCurrency,
  toCurrency,
  debounceMs = 500,
}: UseLiveConversionProps) {
  const [debouncedAmount, setDebouncedAmount] = useState(amount);

  // Debounce amount changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAmount(amount);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [amount, debounceMs]);

  // Query for conversion
  const {
    data: conversion,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['currency-conversion', debouncedAmount, fromCurrency, toCurrency],
    queryFn: async () => {
      if (debouncedAmount === 0 || fromCurrency === toCurrency) {
        return {
          original_amount: debouncedAmount,
          converted_amount: debouncedAmount,
          from_currency: fromCurrency,
          to_currency: toCurrency,
          exchange_rate: 1,
          conversion_date: new Date().toISOString(),
          is_historical: false,
        };
      }

      return convertCurrency({
        amount: debouncedAmount,
        from_currency: fromCurrency,
        to_currency: toCurrency,
      });
    },
    enabled: debouncedAmount > 0 && fromCurrency !== toCurrency,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    convertedAmount: conversion?.converted_amount ?? null,
    exchangeRate: conversion?.exchange_rate ?? null,
    isConverting: isLoading,
    error: error ? 'Conversion failed' : null,
  };
}

/**
 * Hook to refresh exchange rates
 */
export function useRefreshExchangeRates() {
  const refreshMutation = useMutation({
    mutationFn: async (baseCurrencies?: CurrencyCode[]) => {
      await refreshExchangeRates(baseCurrencies?.[0] || 'USD');
    },
  });

  return {
    refreshRates: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
    error: refreshMutation.error?.message ?? null,
  };
}

/**
 * Hook for batch currency conversions
 */
interface BatchConversionItem {
  id: string;
  amount: number;
  currency: CurrencyCode;
}

export function useBatchConversion(baseCurrency: CurrencyCode) {
  const [conversions, setConversions] = useState<
    Map<string, { baseAmount: number; rate: number }>
  >(new Map());

  const convertBatch = useCallback(
    async (items: BatchConversionItem[]) => {
      const results = new Map<string, { baseAmount: number; rate: number }>();

      for (const item of items) {
        try {
          if (item.currency === baseCurrency) {
            results.set(item.id, {
              baseAmount: item.amount,
              rate: 1,
            });
          } else {
            const result = await convertCurrency({
              amount: item.amount,
              from_currency: item.currency,
              to_currency: baseCurrency,
            });

            results.set(item.id, {
              baseAmount: result.converted_amount,
              rate: result.exchange_rate,
            });
          }
        } catch (error) {
          logger.error(`Failed to convert item ${item.id}:`, error);
          results.set(item.id, {
            baseAmount: item.amount,
            rate: 1,
          });
        }
      }

      setConversions(results);
      return results;
    },
    [baseCurrency]
  );

  return {
    conversions,
    convertBatch,
  };
}
