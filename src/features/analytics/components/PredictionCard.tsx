// File: /src/features/analytics/components/PredictionCard.tsx
// Card components for displaying budget and schedule predictions

import { cn } from '@/lib/utils'
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Badge,
} from '@/components/ui'
import type { BudgetPrediction, SchedulePrediction, FeatureImportance } from '@/types/analytics'

// ============================================================================
// Budget Prediction Card
// ============================================================================

interface BudgetPredictionCardProps {
  prediction: BudgetPrediction
  budget?: number
  className?: string
}

/**
 * BudgetPredictionCard Component
 *
 * Displays budget overrun prediction with:
 * - Probability gauge
 * - Amount range (low/mid/high)
 * - Confidence score
 * - Contributing factors
 *
 * Usage:
 * ```tsx
 * <BudgetPredictionCard prediction={budgetPrediction} budget={1000000} />
 * ```
 */
export function BudgetPredictionCard({
  prediction,
  budget,
  className,
}: BudgetPredictionCardProps) {
  const probabilityPercent = Math.round(prediction.probability * 100)

  // Probability color
  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) {return 'text-error bg-error-light'}
    if (prob >= 0.4) {return 'text-warning bg-warning-light'}
    return 'text-success bg-success-light'
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toFixed(0)}`
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>💰</span>
            <span>Budget Overrun Risk</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {Math.round(prediction.confidence * 100)}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Probability */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary">Probability</span>
          <div
            className={cn(
              'px-3 py-1 rounded-full font-bold text-lg',
              getProbabilityColor(prediction.probability)
            )}
          >
            {probabilityPercent}%
          </div>
        </div>

        {/* Amount range */}
        <div className="space-y-2">
          <span className="text-sm text-secondary">Projected Overrun Range</span>
          <div className="grid grid-cols-3 gap-2">
            <PredictionRangeItem
              label="Low"
              value={formatCurrency(prediction.amount_low)}
              percentage={budget ? (prediction.amount_low / budget) * 100 : undefined}
            />
            <PredictionRangeItem
              label="Expected"
              value={formatCurrency(prediction.amount_mid)}
              percentage={budget ? (prediction.amount_mid / budget) * 100 : undefined}
              highlight
            />
            <PredictionRangeItem
              label="High"
              value={formatCurrency(prediction.amount_high)}
              percentage={budget ? (prediction.amount_high / budget) * 100 : undefined}
            />
          </div>
        </div>

        {/* Contributing factors */}
        {prediction.contributing_factors && prediction.contributing_factors.length > 0 && (
          <ContributingFactors factors={prediction.contributing_factors} />
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Schedule Prediction Card
// ============================================================================

interface SchedulePredictionCardProps {
  prediction: SchedulePrediction
  className?: string
}

/**
 * SchedulePredictionCard Component
 *
 * Displays schedule delay prediction with:
 * - Probability gauge
 * - Delay range in days
 * - Projected completion date
 * - Contributing factors
 *
 * Usage:
 * ```tsx
 * <SchedulePredictionCard prediction={schedulePrediction} />
 * ```
 */
export function SchedulePredictionCard({
  prediction,
  className,
}: SchedulePredictionCardProps) {
  const probabilityPercent = Math.round(prediction.probability * 100)

  // Probability color
  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) {return 'text-error bg-error-light'}
    if (prob >= 0.4) {return 'text-warning bg-warning-light'}
    return 'text-success bg-success-light'
  }

  // Format days
  const formatDays = (days: number) => {
    if (days === 0) {return 'On time'}
    if (days === 1) {return '1 day'}
    if (days < 7) {return `${days} days`}
    const weeks = Math.round(days / 7)
    if (weeks < 4) {return `${weeks} week${weeks > 1 ? 's' : ''}`}
    const months = Math.round(days / 30)
    return `${months} month${months > 1 ? 's' : ''}`
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span>📅</span>
            <span>Schedule Delay Risk</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {Math.round(prediction.confidence * 100)}% confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Probability */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary">Probability</span>
          <div
            className={cn(
              'px-3 py-1 rounded-full font-bold text-lg',
              getProbabilityColor(prediction.probability)
            )}
          >
            {probabilityPercent}%
          </div>
        </div>

        {/* Delay range */}
        <div className="space-y-2">
          <span className="text-sm text-secondary">Projected Delay</span>
          <div className="grid grid-cols-3 gap-2">
            <PredictionRangeItem
              label="Best Case"
              value={formatDays(prediction.days_low)}
              subValue={`${prediction.days_low}d`}
            />
            <PredictionRangeItem
              label="Expected"
              value={formatDays(prediction.days_mid)}
              subValue={`${prediction.days_mid}d`}
              highlight
            />
            <PredictionRangeItem
              label="Worst Case"
              value={formatDays(prediction.days_high)}
              subValue={`${prediction.days_high}d`}
            />
          </div>
        </div>

        {/* Projected completion date */}
        {prediction.projected_completion_date && (
          <div className="flex items-center justify-between p-3 bg-surface rounded-lg">
            <span className="text-sm text-secondary">Projected Completion</span>
            <span className="font-semibold">
              {new Date(prediction.projected_completion_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Contributing factors */}
        {prediction.contributing_factors && prediction.contributing_factors.length > 0 && (
          <ContributingFactors factors={prediction.contributing_factors} />
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Shared Components
// ============================================================================

interface PredictionRangeItemProps {
  label: string
  value: string
  subValue?: string
  percentage?: number
  highlight?: boolean
}

function PredictionRangeItem({
  label,
  value,
  subValue,
  percentage,
  highlight,
}: PredictionRangeItemProps) {
  return (
    <div
      className={cn(
        'p-2 rounded-lg text-center',
        highlight ? 'bg-blue-50 border border-blue-200' : 'bg-surface'
      )}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className={cn('font-semibold', highlight ? 'text-primary-hover' : 'text-foreground')}>
        {value}
      </p>
      {(subValue || percentage !== undefined) && (
        <p className="text-xs text-disabled">
          {percentage !== undefined ? `${percentage.toFixed(1)}%` : subValue}
        </p>
      )}
    </div>
  )
}

interface ContributingFactorsProps {
  factors: FeatureImportance[]
  maxItems?: number
}

function ContributingFactors({ factors, maxItems = 4 }: ContributingFactorsProps) {
  const displayFactors = factors.slice(0, maxItems)

  return (
    <div className="pt-3 border-t">
      <p className="text-xs font-medium text-muted mb-2">Contributing Factors</p>
      <div className="space-y-1.5">
        {displayFactors.map((factor, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs',
                factor.direction === 'positive'
                  ? 'text-error'
                  : factor.direction === 'negative'
                  ? 'text-success'
                  : 'text-disabled'
              )}
            >
              {factor.direction === 'positive' ? '↑' : factor.direction === 'negative' ? '↓' : '–'}
            </span>
            <span className="text-sm text-secondary flex-1">{factor.feature}</span>
            <div className="w-16 bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full"
                style={{ width: `${Math.round(factor.importance * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Combined Prediction Summary
// ============================================================================

interface PredictionSummaryProps {
  budget?: BudgetPrediction | null
  schedule?: SchedulePrediction | null
  className?: string
}

export function PredictionSummary({
  budget,
  schedule,
  className,
}: PredictionSummaryProps) {
  if (!budget && !schedule) {
    return (
      <div className={cn('text-center text-muted py-8', className)}>
        <span className="text-3xl">📊</span>
        <p className="mt-2">No predictions available</p>
        <p className="text-sm">Generate a prediction to see results</p>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', className)}>
      {budget && <BudgetPredictionCard prediction={budget} />}
      {schedule && <SchedulePredictionCard prediction={schedule} />}
    </div>
  )
}
