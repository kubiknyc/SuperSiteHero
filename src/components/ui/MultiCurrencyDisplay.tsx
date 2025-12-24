/**
 * Multi-Currency Display Component
 * Displays amounts with conversion between original and base currency
 */

import React from 'react';
import type { CurrencyCode, CurrencyDisplayMode, MultiCurrencyAmount } from '@/types/currency';
import { formatCurrency, formatMultiCurrency } from '@/types/currency';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Badge } from './badge';
import { ArrowRightLeft } from 'lucide-react';

interface MultiCurrencyDisplayProps {
  amount: number;
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
  baseAmount?: number;
  exchangeRate?: number;
  displayMode?: CurrencyDisplayMode;
  className?: string;
  colorize?: boolean;
  showRate?: boolean;
  compact?: boolean;
}

export function MultiCurrencyDisplay({
  amount,
  currency,
  baseCurrency,
  baseAmount,
  exchangeRate,
  displayMode = 'both',
  className = '',
  colorize = false,
  showRate = false,
  compact = false,
}: MultiCurrencyDisplayProps) {
  // Same currency - show single amount
  if (currency === baseCurrency) {
    return (
      <span className={className}>
        {formatCurrency(amount, currency, { compactNotation: compact })}
      </span>
    );
  }

  const isNegative = amount < 0;
  const colorClass = colorize ? (isNegative ? 'text-error' : 'text-success') : '';

  // Display mode: original only
  if (displayMode === 'original') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`${colorClass} ${className}`}>
              {formatCurrency(amount, currency, { compactNotation: compact })}
            </span>
          </TooltipTrigger>
          {baseAmount !== undefined && (
            <TooltipContent>
              <div className="text-sm">
                <div>Base: {formatCurrency(baseAmount, baseCurrency)}</div>
                {exchangeRate && (
                  <div className="text-xs text-muted mt-1">
                    Rate: {exchangeRate.toFixed(4)}
                  </div>
                )}
              </div>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Display mode: base only
  if (displayMode === 'base' && baseAmount !== undefined) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`${colorClass} ${className}`}>
              {formatCurrency(baseAmount, baseCurrency, { compactNotation: compact })}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div>Original: {formatCurrency(amount, currency)}</div>
              {exchangeRate && (
                <div className="text-xs text-muted mt-1">
                  Rate: {exchangeRate.toFixed(4)}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Display mode: both
  if (baseAmount !== undefined) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className={colorClass}>
          {formatCurrency(amount, currency, { compactNotation: compact })}
        </span>
        {showRate && exchangeRate && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ArrowRightLeft className="h-3 w-3 text-disabled" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  Exchange Rate: {exchangeRate.toFixed(4)}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <span className="text-muted text-sm">
          ({formatCurrency(baseAmount, baseCurrency, { compactNotation: compact })})
        </span>
      </div>
    );
  }

  // Fallback - show original only
  return (
    <span className={`${colorClass} ${className}`}>
      {formatCurrency(amount, currency, { compactNotation: compact })}
    </span>
  );
}

/**
 * Multi-Currency Amount with Badge
 * Shows currency badge alongside amount
 */
interface MultiCurrencyAmountWithBadgeProps {
  amount: number;
  currency: CurrencyCode;
  baseCurrency: CurrencyCode;
  baseAmount?: number;
  displayMode?: CurrencyDisplayMode;
  className?: string;
}

export function MultiCurrencyAmountWithBadge({
  amount,
  currency,
  baseCurrency,
  baseAmount,
  displayMode = 'both',
  className = '',
}: MultiCurrencyAmountWithBadgeProps) {
  const displayCurrency = displayMode === 'base' && baseAmount !== undefined ? baseCurrency : currency;
  const displayAmount = displayMode === 'base' && baseAmount !== undefined ? baseAmount : amount;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant="outline">{displayCurrency}</Badge>
      <MultiCurrencyDisplay
        amount={amount}
        currency={currency}
        baseCurrency={baseCurrency}
        baseAmount={baseAmount}
        displayMode={displayMode}
      />
    </div>
  );
}

/**
 * Currency Conversion Preview
 * Shows live conversion as user types
 */
interface CurrencyConversionPreviewProps {
  amount: number;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  convertedAmount: number | null;
  exchangeRate: number | null;
  isConverting?: boolean;
  className?: string;
}

export function CurrencyConversionPreview({
  amount,
  fromCurrency,
  toCurrency,
  convertedAmount,
  exchangeRate,
  isConverting = false,
  className = '',
}: CurrencyConversionPreviewProps) {
  if (fromCurrency === toCurrency) {
    return null;
  }

  return (
    <div className={`text-sm text-secondary ${className}`}>
      {isConverting ? (
        <span className="italic">Converting...</span>
      ) : convertedAmount !== null ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{formatCurrency(amount, fromCurrency)}</span>
            <ArrowRightLeft className="h-3 w-3 text-disabled" />
            <span className="font-medium">{formatCurrency(convertedAmount, toCurrency)}</span>
          </div>
          {exchangeRate && (
            <div className="text-xs text-muted">
              Rate: 1 {fromCurrency} = {exchangeRate.toFixed(4)} {toCurrency}
            </div>
          )}
        </div>
      ) : (
        <span className="text-error">Conversion unavailable</span>
      )}
    </div>
  );
}

/**
 * Multi-Currency Summary
 * Shows total in multiple currencies
 */
interface MultiCurrencySummaryProps {
  amounts: Array<{
    currency: CurrencyCode;
    amount: number;
  }>;
  baseCurrency: CurrencyCode;
  totalBaseAmount: number;
  className?: string;
}

export function MultiCurrencySummary({
  amounts,
  baseCurrency,
  totalBaseAmount,
  className = '',
}: MultiCurrencySummaryProps) {
  // Group amounts by currency
  const currencyTotals = amounts.reduce((acc, item) => {
    if (!acc[item.currency]) {
      acc[item.currency] = 0;
    }
    acc[item.currency] += item.amount;
    return acc;
  }, {} as Record<CurrencyCode, number>);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="font-semibold text-lg">
        Total: {formatCurrency(totalBaseAmount, baseCurrency)}
      </div>

      {Object.keys(currencyTotals).length > 1 && (
        <div className="text-sm text-secondary space-y-1">
          <div className="font-medium">Breakdown by Currency:</div>
          {Object.entries(currencyTotals).map(([currency, total]) => (
            <div key={currency} className="flex items-center gap-2">
              <Badge variant="outline" className="w-16">
                {currency}
              </Badge>
              <span>{formatCurrency(total, currency as CurrencyCode)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Exchange Rate Info Badge
 * Shows current exchange rate with last update time
 */
interface ExchangeRateInfoProps {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: number;
  lastUpdated?: string;
  className?: string;
}

export function ExchangeRateInfo({
  fromCurrency,
  toCurrency,
  rate,
  lastUpdated,
  className = '',
}: ExchangeRateInfoProps) {
  if (fromCurrency === toCurrency) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`cursor-help ${className}`}>
            1 {fromCurrency} = {rate.toFixed(4)} {toCurrency}
          </Badge>
        </TooltipTrigger>
        {lastUpdated && (
          <TooltipContent>
            <div className="text-xs">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
