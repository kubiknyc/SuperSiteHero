/**
 * Currency Types
 * Multi-currency support for financial transactions and budgets
 */

// =============================================
// Currency Codes and Constants
// =============================================

/**
 * ISO 4217 Currency Codes - Major supported currencies
 */
export type CurrencyCode =
  | 'USD' // US Dollar
  | 'EUR' // Euro
  | 'GBP' // British Pound
  | 'CAD' // Canadian Dollar
  | 'AUD' // Australian Dollar
  | 'JPY' // Japanese Yen
  | 'CNY' // Chinese Yuan
  | 'CHF' // Swiss Franc
  | 'INR' // Indian Rupee
  | 'MXN' // Mexican Peso
  | 'BRL' // Brazilian Real
  | 'ZAR' // South African Rand
  | 'NZD' // New Zealand Dollar
  | 'SGD' // Singapore Dollar
  | 'HKD' // Hong Kong Dollar
  | 'SEK' // Swedish Krona
  | 'NOK' // Norwegian Krone
  | 'DKK' // Danish Krone
  | 'KRW' // South Korean Won
  | 'AED'; // UAE Dirham

/**
 * Currency Information
 */
export interface Currency {
  code: CurrencyCode;
  name: string;
  symbol: string;
  decimals: number; // Number of decimal places
  format: 'before' | 'after'; // Symbol position
  locale: string; // Locale for number formatting
  region: string; // Geographic region
}

/**
 * Supported currencies with formatting information
 */
export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    decimals: 2,
    format: 'before',
    locale: 'en-US',
    region: 'North America',
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    decimals: 2,
    format: 'before',
    locale: 'de-DE',
    region: 'Europe',
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    decimals: 2,
    format: 'before',
    locale: 'en-GB',
    region: 'Europe',
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'CA$',
    decimals: 2,
    format: 'before',
    locale: 'en-CA',
    region: 'North America',
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    decimals: 2,
    format: 'before',
    locale: 'en-AU',
    region: 'Asia-Pacific',
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    decimals: 0,
    format: 'before',
    locale: 'ja-JP',
    region: 'Asia-Pacific',
  },
  CNY: {
    code: 'CNY',
    name: 'Chinese Yuan',
    symbol: '¥',
    decimals: 2,
    format: 'before',
    locale: 'zh-CN',
    region: 'Asia-Pacific',
  },
  CHF: {
    code: 'CHF',
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimals: 2,
    format: 'after',
    locale: 'de-CH',
    region: 'Europe',
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    decimals: 2,
    format: 'before',
    locale: 'en-IN',
    region: 'Asia-Pacific',
  },
  MXN: {
    code: 'MXN',
    name: 'Mexican Peso',
    symbol: 'MX$',
    decimals: 2,
    format: 'before',
    locale: 'es-MX',
    region: 'Latin America',
  },
  BRL: {
    code: 'BRL',
    name: 'Brazilian Real',
    symbol: 'R$',
    decimals: 2,
    format: 'before',
    locale: 'pt-BR',
    region: 'Latin America',
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    decimals: 2,
    format: 'before',
    locale: 'en-ZA',
    region: 'Africa',
  },
  NZD: {
    code: 'NZD',
    name: 'New Zealand Dollar',
    symbol: 'NZ$',
    decimals: 2,
    format: 'before',
    locale: 'en-NZ',
    region: 'Asia-Pacific',
  },
  SGD: {
    code: 'SGD',
    name: 'Singapore Dollar',
    symbol: 'S$',
    decimals: 2,
    format: 'before',
    locale: 'en-SG',
    region: 'Asia-Pacific',
  },
  HKD: {
    code: 'HKD',
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    decimals: 2,
    format: 'before',
    locale: 'zh-HK',
    region: 'Asia-Pacific',
  },
  SEK: {
    code: 'SEK',
    name: 'Swedish Krona',
    symbol: 'kr',
    decimals: 2,
    format: 'after',
    locale: 'sv-SE',
    region: 'Europe',
  },
  NOK: {
    code: 'NOK',
    name: 'Norwegian Krone',
    symbol: 'kr',
    decimals: 2,
    format: 'after',
    locale: 'nb-NO',
    region: 'Europe',
  },
  DKK: {
    code: 'DKK',
    name: 'Danish Krone',
    symbol: 'kr',
    decimals: 2,
    format: 'after',
    locale: 'da-DK',
    region: 'Europe',
  },
  KRW: {
    code: 'KRW',
    name: 'South Korean Won',
    symbol: '₩',
    decimals: 0,
    format: 'before',
    locale: 'ko-KR',
    region: 'Asia-Pacific',
  },
  AED: {
    code: 'AED',
    name: 'UAE Dirham',
    symbol: 'د.إ',
    decimals: 2,
    format: 'after',
    locale: 'ar-AE',
    region: 'Middle East',
  },
};

/**
 * Currency list sorted by region for UI selection
 */
export const CURRENCY_LIST: Currency[] = Object.values(CURRENCIES).sort((a, b) => {
  if (a.region === b.region) {
    return a.name.localeCompare(b.name);
  }
  return a.region.localeCompare(b.region);
});

/**
 * Most commonly used currencies for quick access
 */
export const COMMON_CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

// =============================================
// Exchange Rate Types
// =============================================

/**
 * Exchange Rate - Conversion rate between currencies
 */
export interface ExchangeRate {
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  inverse_rate: number; // 1 / rate for bidirectional conversion
  last_updated: string;
  source: string; // API source
}

/**
 * Exchange Rate Cache Entry
 */
export interface ExchangeRateCache {
  rates: Record<string, ExchangeRate>; // Key: "FROM_TO" e.g., "USD_EUR"
  last_refresh: string;
  next_refresh: string;
}

/**
 * Currency Conversion Request
 */
export interface ConversionRequest {
  amount: number;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  date?: string; // Optional historical date
}

/**
 * Currency Conversion Result
 */
export interface ConversionResult {
  original_amount: number;
  converted_amount: number;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  exchange_rate: number;
  conversion_date: string;
  is_historical: boolean;
}

/**
 * Multi-Currency Amount
 * Stores an amount in both original and base currency
 */
export interface MultiCurrencyAmount {
  amount: number; // Amount in original currency
  currency: CurrencyCode;
  base_amount: number; // Amount converted to base currency
  base_currency: CurrencyCode; // Project/company base currency
  exchange_rate: number; // Rate used for conversion
  conversion_date: string;
}

// =============================================
// Project Currency Settings
// =============================================

/**
 * Currency Display Mode
 * How to display amounts in multi-currency contexts
 */
export type CurrencyDisplayMode =
  | 'original'  // Show only original currency
  | 'base'      // Show only base currency
  | 'both';     // Show both with conversion

/**
 * Project Currency Configuration
 */
export interface ProjectCurrencyConfig {
  project_id: string;
  base_currency: CurrencyCode; // Primary currency for the project
  currency_display_mode: CurrencyDisplayMode; // How to display amounts
  allowed_currencies: CurrencyCode[]; // Currencies allowed for transactions
  auto_convert: boolean; // Auto-convert to base currency
  require_exchange_rate: boolean; // Require manual rate for conversions
  created_at: string;
  updated_at: string;
}

/**
 * Company Currency Settings
 */
export interface CompanyCurrencySettings {
  company_id: string;
  default_currency: CurrencyCode;
  enabled_currencies: CurrencyCode[];
  exchange_rate_source: 'auto' | 'manual';
  refresh_interval_hours: number; // How often to refresh rates
  created_at: string;
  updated_at: string;
}

// =============================================
// Formatting Types
// =============================================

/**
 * Currency Format Options
 */
export interface CurrencyFormatOptions {
  showSymbol?: boolean; // Show currency symbol
  showCode?: boolean; // Show currency code (USD, EUR, etc.)
  decimals?: number; // Override default decimal places
  locale?: string; // Override locale for formatting
  compactNotation?: boolean; // Use compact notation (1.2K, 1.5M)
  signDisplay?: 'auto' | 'always' | 'never'; // Show +/- sign
}

/**
 * Default format options
 */
export const DEFAULT_FORMAT_OPTIONS: Required<CurrencyFormatOptions> = {
  showSymbol: true,
  showCode: false,
  decimals: 2,
  locale: 'en-US',
  compactNotation: false,
  signDisplay: 'auto',
};

// =============================================
// Helper Functions
// =============================================

/**
 * Get currency information by code
 */
export function getCurrency(code: CurrencyCode): Currency {
  return CURRENCIES[code];
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCIES[code]?.symbol || code;
}

/**
 * Get currency name
 */
export function getCurrencyName(code: CurrencyCode): string {
  return CURRENCIES[code]?.name || code;
}

/**
 * Check if currency code is valid
 */
export function isValidCurrency(code: string): code is CurrencyCode {
  return code in CURRENCIES;
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  options: CurrencyFormatOptions = {}
): string {
  const currencyInfo = CURRENCIES[currency];
  if (!currencyInfo) {
    return amount.toFixed(2);
  }

  const opts = { ...DEFAULT_FORMAT_OPTIONS, ...options };
  const decimals = opts.decimals ?? currencyInfo.decimals;

  try {
    const formatter = new Intl.NumberFormat(opts.locale || currencyInfo.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: opts.compactNotation ? 'compact' : 'standard',
      signDisplay: opts.signDisplay,
    });

    let formatted = formatter.format(amount);

    // If showing code instead of symbol
    if (opts.showCode && !opts.showSymbol) {
      formatted = formatted.replace(currencyInfo.symbol, '').trim();
      formatted = `${formatted} ${currency}`;
    }

    // If not showing symbol at all
    if (!opts.showSymbol && !opts.showCode) {
      formatted = formatted.replace(currencyInfo.symbol, '').trim();
    }

    return formatted;
  } catch (error) {
    // Fallback formatting
    const formatted = amount.toFixed(decimals);
    if (opts.showSymbol) {
      return currencyInfo.format === 'before'
        ? `${currencyInfo.symbol}${formatted}`
        : `${formatted} ${currencyInfo.symbol}`;
    }
    return formatted;
  }
}

/**
 * Format multi-currency amount with conversion info
 */
export function formatMultiCurrency(
  multiAmount: MultiCurrencyAmount,
  options: CurrencyFormatOptions = {}
): string {
  const original = formatCurrency(multiAmount.amount, multiAmount.currency, options);

  // If same currency, just return original
  if (multiAmount.currency === multiAmount.base_currency) {
    return original;
  }

  const converted = formatCurrency(multiAmount.base_amount, multiAmount.base_currency, options);
  return `${original} (${converted})`;
}

/**
 * Create exchange rate cache key
 */
export function getExchangeRateKey(from: CurrencyCode, to: CurrencyCode): string {
  return `${from}_${to}`;
}

/**
 * Parse exchange rate key
 */
export function parseExchangeRateKey(key: string): {
  from: CurrencyCode;
  to: CurrencyCode;
} | null {
  const parts = key.split('_');
  if (parts.length !== 2) {return null;}

  const [from, to] = parts;
  if (!isValidCurrency(from) || !isValidCurrency(to)) {return null;}

  return { from: from as CurrencyCode, to: to as CurrencyCode };
}

/**
 * Calculate conversion with rate
 */
export function convertAmount(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rate: number
): number {
  if (fromCurrency === toCurrency) {return amount;}
  return amount * rate;
}

/**
 * Round to currency decimals
 */
export function roundToCurrency(amount: number, currency: CurrencyCode): number {
  const currencyInfo = CURRENCIES[currency];
  const decimals = currencyInfo?.decimals ?? 2;
  const multiplier = Math.pow(10, decimals);
  return Math.round(amount * multiplier) / multiplier;
}
