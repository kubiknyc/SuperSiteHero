/**
 * Currency Exchange Service
 *
 * Handles currency conversion with exchange rate API integration
 * - Fetches real-time exchange rates
 * - Caches rates with daily refresh
 * - Supports historical rates
 * - Handles offline fallback
 */

import type {
  CurrencyCode,
  ExchangeRate,
  ExchangeRateCache,
  ConversionRequest,
  ConversionResult,
  MultiCurrencyAmount,
} from '@/types/currency';
import { getExchangeRateKey, convertAmount, roundToCurrency } from '@/types/currency';

// =============================================
// Configuration
// =============================================

const EXCHANGE_RATE_API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1';
const CACHE_KEY = 'exchange_rates_cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Exchange rate API response format
 */
interface ExchangeRateAPIResponse {
  date: string;
  [currencyCode: string]: number | string;
}

// =============================================
// Cache Management
// =============================================

/**
 * Get cached exchange rates
 */
function getCachedRates(): ExchangeRateCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {return null;}

    const cache: ExchangeRateCache = JSON.parse(cached);
    const nextRefresh = new Date(cache.next_refresh);

    // Check if cache is still valid
    if (nextRefresh > new Date()) {
      return cache;
    }

    return null;
  } catch (error) {
    console.error('Error reading exchange rate cache:', error);
    return null;
  }
}

/**
 * Save exchange rates to cache
 */
function setCachedRates(cache: ExchangeRateCache): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving exchange rate cache:', error);
  }
}

/**
 * Clear exchange rate cache
 */
export function clearExchangeRateCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing exchange rate cache:', error);
  }
}

// =============================================
// Exchange Rate API
// =============================================

/**
 * Fetch exchange rates from API
 */
async function fetchExchangeRates(baseCurrency: CurrencyCode = 'USD'): Promise<ExchangeRateAPIResponse> {
  const baseCode = baseCurrency.toLowerCase();
  const url = `${EXCHANGE_RATE_API_URL}/currencies/${baseCode}.json`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data[baseCode];
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    throw new Error('Unable to fetch exchange rates. Please check your internet connection.');
  }
}

/**
 * Build exchange rate cache from API data
 */
function buildExchangeRateCache(
  baseCurrency: CurrencyCode,
  apiData: ExchangeRateAPIResponse
): ExchangeRateCache {
  const rates: Record<string, ExchangeRate> = {};
  const now = new Date().toISOString();
  const nextRefresh = new Date(Date.now() + CACHE_DURATION_MS).toISOString();

  // Process all currency pairs
  Object.entries(apiData).forEach(([targetCode, rate]) => {
    if (targetCode === 'date' || typeof rate !== 'number') {return;}

    const target = targetCode.toUpperCase() as CurrencyCode;
    const key = getExchangeRateKey(baseCurrency, target);

    rates[key] = {
      from_currency: baseCurrency,
      to_currency: target,
      rate,
      inverse_rate: 1 / rate,
      last_updated: now,
      source: 'fawazahmed0/currency-api',
    };

    // Also store inverse rate for bidirectional conversion
    const inverseKey = getExchangeRateKey(target, baseCurrency);
    rates[inverseKey] = {
      from_currency: target,
      to_currency: baseCurrency,
      rate: 1 / rate,
      inverse_rate: rate,
      last_updated: now,
      source: 'fawazahmed0/currency-api',
    };
  });

  return {
    rates,
    last_refresh: now,
    next_refresh: nextRefresh,
  };
}

/**
 * Refresh exchange rates from API
 */
export async function refreshExchangeRates(baseCurrency: CurrencyCode = 'USD'): Promise<ExchangeRateCache> {
  try {
    const apiData = await fetchExchangeRates(baseCurrency);
    const cache = buildExchangeRateCache(baseCurrency, apiData);
    setCachedRates(cache);
    return cache;
  } catch (error) {
    console.error('Error refreshing exchange rates:', error);
    throw error;
  }
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(
  from: CurrencyCode,
  to: CurrencyCode
): Promise<ExchangeRate> {
  // Same currency - rate is 1
  if (from === to) {
    const now = new Date().toISOString();
    return {
      from_currency: from,
      to_currency: to,
      rate: 1,
      inverse_rate: 1,
      last_updated: now,
      source: 'same-currency',
    };
  }

  // Try to get from cache first
  let cache = getCachedRates();

  // If no cache or expired, refresh
  if (!cache) {
    try {
      cache = await refreshExchangeRates(from);
    } catch (error) {
      // If refresh fails, try to use stale cache as fallback
      const staleCache = localStorage.getItem(CACHE_KEY);
      if (staleCache) {
        cache = JSON.parse(staleCache);
        console.warn('Using stale exchange rate cache due to API error');
      } else {
        throw new Error('No exchange rate data available');
      }
    }
  }

  const key = getExchangeRateKey(from, to);
  const rate = cache.rates[key];

  if (!rate) {
    // Try to calculate cross rate through USD
    if (from !== 'USD' && to !== 'USD') {
      const fromToUSD = cache.rates[getExchangeRateKey(from, 'USD')];
      const usdToTarget = cache.rates[getExchangeRateKey('USD', to)];

      if (fromToUSD && usdToTarget) {
        const crossRate = fromToUSD.rate * usdToTarget.rate;
        return {
          from_currency: from,
          to_currency: to,
          rate: crossRate,
          inverse_rate: 1 / crossRate,
          last_updated: fromToUSD.last_updated,
          source: 'cross-rate-via-USD',
        };
      }
    }

    throw new Error(`Exchange rate not available for ${from} to ${to}`);
  }

  return rate;
}

/**
 * Get all exchange rates for a base currency
 */
export async function getAllExchangeRates(baseCurrency: CurrencyCode = 'USD'): Promise<ExchangeRate[]> {
  let cache = getCachedRates();

  if (!cache) {
    cache = await refreshExchangeRates(baseCurrency);
  }

  return Object.values(cache.rates).filter(
    (rate) => rate.from_currency === baseCurrency
  );
}

// =============================================
// Currency Conversion
// =============================================

/**
 * Convert amount between currencies
 */
export async function convertCurrency(
  request: ConversionRequest
): Promise<ConversionResult> {
  const { amount, from_currency, to_currency, date } = request;

  // Get exchange rate
  const exchangeRate = await getExchangeRate(from_currency, to_currency);

  // Calculate converted amount
  const convertedAmount = convertAmount(amount, from_currency, to_currency, exchangeRate.rate);
  const roundedAmount = roundToCurrency(convertedAmount, to_currency);

  return {
    original_amount: amount,
    converted_amount: roundedAmount,
    from_currency,
    to_currency,
    exchange_rate: exchangeRate.rate,
    conversion_date: date || new Date().toISOString(),
    is_historical: !!date,
  };
}

/**
 * Convert to multi-currency amount
 */
export async function toMultiCurrencyAmount(
  amount: number,
  currency: CurrencyCode,
  baseCurrency: CurrencyCode
): Promise<MultiCurrencyAmount> {
  // If same currency, no conversion needed
  if (currency === baseCurrency) {
    return {
      amount,
      currency,
      base_amount: amount,
      base_currency: baseCurrency,
      exchange_rate: 1,
      conversion_date: new Date().toISOString(),
    };
  }

  // Convert to base currency
  const result = await convertCurrency({
    amount,
    from_currency: currency,
    to_currency: baseCurrency,
  });

  return {
    amount,
    currency,
    base_amount: result.converted_amount,
    base_currency: baseCurrency,
    exchange_rate: result.exchange_rate,
    conversion_date: result.conversion_date,
  };
}

/**
 * Batch convert multiple amounts
 */
export async function batchConvertCurrency(
  requests: ConversionRequest[]
): Promise<ConversionResult[]> {
  // Group by currency pair to minimize API calls
  const uniquePairs = new Map<string, ConversionRequest[]>();

  requests.forEach((req) => {
    const key = getExchangeRateKey(req.from_currency, req.to_currency);
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, []);
    }
    uniquePairs.get(key)!.push(req);
  });

  // Process conversions
  const results: ConversionResult[] = [];

  for (const [_key, reqs] of uniquePairs) {
    const firstReq = reqs[0];
    const exchangeRate = await getExchangeRate(
      firstReq.from_currency,
      firstReq.to_currency
    );

    for (const req of reqs) {
      const convertedAmount = convertAmount(
        req.amount,
        req.from_currency,
        req.to_currency,
        exchangeRate.rate
      );

      results.push({
        original_amount: req.amount,
        converted_amount: roundToCurrency(convertedAmount, req.to_currency),
        from_currency: req.from_currency,
        to_currency: req.to_currency,
        exchange_rate: exchangeRate.rate,
        conversion_date: req.date || new Date().toISOString(),
        is_historical: !!req.date,
      });
    }
  }

  return results;
}

// =============================================
// Rate Information
// =============================================

/**
 * Get cache status
 */
export function getExchangeRateCacheStatus(): {
  isCached: boolean;
  lastRefresh: string | null;
  nextRefresh: string | null;
  rateCount: number;
} {
  const cache = getCachedRates();

  if (!cache) {
    return {
      isCached: false,
      lastRefresh: null,
      nextRefresh: null,
      rateCount: 0,
    };
  }

  return {
    isCached: true,
    lastRefresh: cache.last_refresh,
    nextRefresh: cache.next_refresh,
    rateCount: Object.keys(cache.rates).length,
  };
}

/**
 * Check if exchange rates need refresh
 */
export function shouldRefreshExchangeRates(): boolean {
  const cache = getCachedRates();
  return !cache; // Returns true if no valid cache
}

/**
 * Get exchange rate age in hours
 */
export function getExchangeRateAge(): number | null {
  const cache = getCachedRates();
  if (!cache) {return null;}

  const lastRefresh = new Date(cache.last_refresh);
  const now = new Date();
  const ageMs = now.getTime() - lastRefresh.getTime();
  return ageMs / (1000 * 60 * 60); // Convert to hours
}

// =============================================
// Export API
// =============================================

export const currencyExchangeApi = {
  // Exchange rates
  getExchangeRate,
  getAllExchangeRates,
  refreshExchangeRates,

  // Conversion
  convertCurrency,
  toMultiCurrencyAmount,
  batchConvertCurrency,

  // Cache management
  clearCache: clearExchangeRateCache,
  getCacheStatus: getExchangeRateCacheStatus,
  shouldRefresh: shouldRefreshExchangeRates,
  getCacheAge: getExchangeRateAge,
};
