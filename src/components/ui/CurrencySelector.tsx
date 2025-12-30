/**
 * Currency Selector Component
 * Dropdown for selecting currency with search and grouping
 */

import React, { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select';
import { Input } from './input';
import { Badge } from './badge';
import {
  type CurrencyCode,
  type Currency,
  CURRENCY_LIST,
  COMMON_CURRENCIES,
  getCurrency,
} from '@/types/currency';
import { Search } from 'lucide-react';

interface CurrencySelectorProps {
  value?: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
  placeholder?: string;
  showSymbol?: boolean;
  allowedCurrencies?: CurrencyCode[];
  className?: string;
  error?: string;
}

export function CurrencySelector({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select currency',
  showSymbol = true,
  allowedCurrencies,
  className = '',
  error,
}: CurrencySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter currencies based on allowed list
  const availableCurrencies = useMemo(() => {
    if (allowedCurrencies && allowedCurrencies.length > 0) {
      return CURRENCY_LIST.filter((currency) =>
        allowedCurrencies.includes(currency.code)
      );
    }
    return CURRENCY_LIST;
  }, [allowedCurrencies]);

  // Filter currencies based on search query
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableCurrencies;
    }

    const query = searchQuery.toLowerCase();
    return availableCurrencies.filter(
      (currency) =>
        currency.code.toLowerCase().includes(query) ||
        currency.name.toLowerCase().includes(query) ||
        currency.symbol.includes(query)
    );
  }, [availableCurrencies, searchQuery]);

  // Group currencies by region
  const groupedCurrencies = useMemo(() => {
    const groups: Record<string, Currency[]> = {};

    filteredCurrencies.forEach((currency) => {
      if (!groups[currency.region]) {
        groups[currency.region] = [];
      }
      groups[currency.region].push(currency);
    });

    return groups;
  }, [filteredCurrencies]);

  // Common currencies for quick access
  const commonCurrenciesFiltered = useMemo(() => {
    return COMMON_CURRENCIES.filter((code) =>
      filteredCurrencies.some((c) => c.code === code)
    );
  }, [filteredCurrencies]);

  const selectedCurrency = value ? getCurrency(value) : null;

  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder={placeholder}>
            {selectedCurrency && (
              <div className="flex items-center gap-2">
                {showSymbol && (
                  <span className="font-semibold text-secondary">
                    {selectedCurrency.symbol}
                  </span>
                )}
                <span className="font-medium">{selectedCurrency.code}</span>
                <span className="text-muted text-sm">
                  - {selectedCurrency.name}
                </span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="max-h-[400px]">
          {/* Search box */}
          <div className="p-2 border-b sticky top-0 bg-card z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-disabled" />
              <Input
                type="text"
                placeholder="Search currencies..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>

          {/* Common currencies */}
          {!searchQuery && commonCurrenciesFiltered.length > 0 && (
            <SelectGroup>
              <SelectLabel className="flex items-center gap-2">
                <span>Common Currencies</span>
                <Badge variant="secondary" className="text-xs">
                  Frequently Used
                </Badge>
              </SelectLabel>
              {commonCurrenciesFiltered.map((code) => {
                const currency = getCurrency(code);
                return (
                  <SelectItem key={code} value={code}>
                    <div className="flex items-center gap-2">
                      {showSymbol && (
                        <span className="font-semibold text-secondary w-8">
                          {currency.symbol}
                        </span>
                      )}
                      <span className="font-medium w-12">{currency.code}</span>
                      <span className="text-muted">{currency.name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          )}

          {/* Grouped currencies by region */}
          {Object.entries(groupedCurrencies).map(([region, currencies]) => (
            <SelectGroup key={region}>
              <SelectLabel>{region}</SelectLabel>
              {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  <div className="flex items-center gap-2">
                    {showSymbol && (
                      <span className="font-semibold text-secondary w-8">
                        {currency.symbol}
                      </span>
                    )}
                    <span className="font-medium w-12">{currency.code}</span>
                    <span className="text-muted">{currency.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}

          {/* No results */}
          {filteredCurrencies.length === 0 && (
            <div className="p-4 text-center text-muted">
              No currencies found
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Error message */}
      {error && <p className="text-error text-sm mt-1">{error}</p>}
    </div>
  );
}

/**
 * Simple Currency Selector (no groups, compact)
 */
interface SimpleCurrencySelectorProps {
  value?: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
  currencies?: CurrencyCode[];
  className?: string;
}

export function SimpleCurrencySelector({
  value,
  onChange,
  disabled = false,
  currencies = COMMON_CURRENCIES,
  className = '',
}: SimpleCurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Currency">
          {value && (
            <span className="font-medium">{getCurrency(value).code}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {currencies.map((code) => {
          const currency = getCurrency(code);
          return (
            <SelectItem key={code} value={code}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-secondary w-6">
                  {currency.symbol}
                </span>
                <span className="font-medium">{currency.code}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/**
 * Currency Badge - Display currency code/symbol
 */
interface CurrencyBadgeProps {
  currency: CurrencyCode;
  showSymbol?: boolean;
  showCode?: boolean;
  variant?: 'default' | 'secondary' | 'outline';
  className?: string;
}

export function CurrencyBadge({
  currency,
  showSymbol = true,
  showCode = true,
  variant = 'secondary',
  className = '',
}: CurrencyBadgeProps) {
  const currencyInfo = getCurrency(currency);

  return (
    <Badge variant={variant} className={className}>
      {showSymbol && <span className="mr-1">{currencyInfo.symbol}</span>}
      {showCode && <span>{currencyInfo.code}</span>}
    </Badge>
  );
}

/**
 * Currency Display - Show formatted currency amount
 */
interface CurrencyDisplayProps {
  amount: number;
  currency: CurrencyCode;
  showSymbol?: boolean;
  showCode?: boolean;
  compact?: boolean;
  className?: string;
  colorize?: boolean; // Color positive/negative
}

export function CurrencyDisplay({
  amount,
  currency,
  showSymbol = true,
  showCode = false,
  compact = false,
  className = '',
  colorize = false,
}: CurrencyDisplayProps) {
  const currencyInfo = getCurrency(currency);
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Format number
  let formatted: string;
  if (compact && absAmount >= 1000000) {
    formatted = `${(absAmount / 1000000).toFixed(1)}M`;
  } else if (compact && absAmount >= 1000) {
    formatted = `${(absAmount / 1000).toFixed(1)}K`;
  } else {
    formatted = absAmount.toLocaleString(currencyInfo.locale, {
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    });
  }

  const colorClass = colorize
    ? isNegative
      ? 'text-error'
      : 'text-success'
    : '';

  return (
    <span className={`${colorClass} ${className}`}>
      {isNegative && '-'}
      {showSymbol && currencyInfo.format === 'before' && (
        <span className="mr-0.5">{currencyInfo.symbol}</span>
      )}
      {formatted}
      {showSymbol && currencyInfo.format === 'after' && (
        <span className="ml-0.5">{currencyInfo.symbol}</span>
      )}
      {showCode && <span className="ml-1 text-xs text-muted">{currency}</span>}
    </span>
  );
}
