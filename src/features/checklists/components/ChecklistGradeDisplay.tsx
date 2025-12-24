// File: /src/features/checklists/components/ChecklistGradeDisplay.tsx
// Visual display component for checklist grades and scores

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import type { ChecklistScore } from '@/types/checklist-scoring'
import { cn } from '@/lib/utils'

interface ChecklistGradeDisplayProps {
  score: ChecklistScore
  showDetails?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ChecklistGradeDisplay({
  score,
  showDetails = true,
  className,
  size = 'md',
}: ChecklistGradeDisplayProps) {
  // Determine color scheme based on pass/fail
  const getColorScheme = () => {
    if (score.breakdown.critical_failures && score.breakdown.critical_failures.length > 0) {
      return {
        bg: 'bg-error-light',
        border: 'border-red-200',
        text: 'text-error-dark',
        icon: 'text-error',
        badge: 'bg-error-light text-red-800',
      }
    }

    if (score.passed) {
      return {
        bg: 'bg-success-light',
        border: 'border-green-200',
        text: 'text-success-dark',
        icon: 'text-success',
        badge: 'bg-success-light text-green-800',
      }
    }

    return {
      bg: 'bg-error-light',
      border: 'border-red-200',
      text: 'text-error-dark',
      icon: 'text-error',
      badge: 'bg-error-light text-red-800',
    }
  }

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return '#16a34a'
    if (grade.startsWith('B')) return '#22c55e'
    if (grade.startsWith('C')) return '#eab308'
    if (grade.startsWith('D')) return '#f59e0b'
    return '#ef4444' // F
  }

  const colors = getColorScheme()

  const sizeClasses = {
    sm: {
      card: 'p-4',
      score: 'text-4xl',
      label: 'text-sm',
      icon: 'w-5 h-5',
    },
    md: {
      card: 'p-6',
      score: 'text-6xl',
      label: 'text-base',
      icon: 'w-6 h-6',
    },
    lg: {
      card: 'p-8',
      score: 'text-8xl',
      label: 'text-lg',
      icon: 'w-8 h-8',
    },
  }

  const sizes = sizeClasses[size]

  return (
    <div className={className}>
      <Card className={cn('border-2', colors.border, colors.bg)}>
        <CardContent className={sizes.card}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {score.passed ? (
                <CheckCircle2 className={cn(sizes.icon, colors.icon)} />
              ) : (
                <XCircle className={cn(sizes.icon, colors.icon)} />
              )}
              <Badge className={colors.badge}>
                {score.passed ? 'PASSED' : 'FAILED'}
              </Badge>
            </div>

            {score.breakdown.critical_failures && score.breakdown.critical_failures.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Critical Failure
              </Badge>
            )}
          </div>

          {/* Main Score Display */}
          <div className="text-center mb-6">
            {score.scoring_type === 'letter_grade' && score.grade ? (
              <div>
                <div
                  className="font-bold mb-2"
                  style={{
                    fontSize: size === 'lg' ? '6rem' : size === 'md' ? '4rem' : '3rem',
                    color: getGradeColor(score.grade),
                  }}
                >
                  {score.grade}
                </div>
                <div className={cn('font-medium', colors.text, sizes.label)}>
                  {score.score.toFixed(1)}%
                </div>
              </div>
            ) : (
              <div>
                <div className={cn('font-bold', colors.text, sizes.score)}>
                  {score.score.toFixed(1)}
                  <span className={cn('text-2xl ml-1', sizes.label)}>%</span>
                </div>
                <div className={cn('text-secondary', sizes.label)}>
                  {score.scoring_type === 'binary' && 'Binary Score'}
                  {score.scoring_type === 'percentage' && 'Pass Rate'}
                  {score.scoring_type === 'points' && 'Points Score'}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <Progress
              value={score.score}
              className="h-3"
              indicatorClassName={cn(
                score.passed ? 'bg-success' : 'bg-error'
              )}
            />
          </div>

          {/* Details Breakdown */}
          {showDetails && (
            <div className="space-y-4">
              {/* Pass/Fail/NA Counts */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-2xl font-bold text-success">
                      {score.breakdown.pass_count}
                    </span>
                  </div>
                  <div className="text-xs text-secondary">Pass</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="w-4 h-4 text-error" />
                    <span className="text-2xl font-bold text-error">
                      {score.breakdown.fail_count}
                    </span>
                  </div>
                  <div className="text-xs text-secondary">Fail</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-secondary">
                      {score.breakdown.na_count}
                    </span>
                  </div>
                  <div className="text-xs text-secondary">N/A</div>
                </div>
              </div>

              {/* Points Breakdown (if applicable) */}
              {score.scoring_type === 'points' && score.breakdown.total_points && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">Points Earned</span>
                    <span className="font-semibold">
                      {score.breakdown.earned_points} / {score.breakdown.total_points}
                    </span>
                  </div>
                </div>
              )}

              {/* Completion Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">Items Completed</span>
                  <span className="font-semibold">
                    {score.breakdown.completed_items} / {score.breakdown.total_items}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-secondary">Scorable Items</span>
                  <span className="font-semibold">{score.breakdown.scorable_items}</span>
                </div>
              </div>

              {/* Critical Failures Alert */}
              {score.breakdown.critical_failures && score.breakdown.critical_failures.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2 p-3 bg-error-light border border-red-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900 text-sm">Critical Item Failures</p>
                      <p className="text-xs text-error-dark mt-1">
                        {score.breakdown.critical_failures.length} critical{' '}
                        {score.breakdown.critical_failures.length === 1 ? 'item' : 'items'} failed
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-muted text-center pt-2">
                Calculated {new Date(score.calculated_at).toLocaleString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Compact version for use in lists
export function CompactGradeDisplay({ score }: { score: ChecklistScore }) {
  const colors = score.passed
    ? 'bg-success-light text-green-800 border-green-300'
    : 'bg-error-light text-red-800 border-red-300'

  return (
    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border', colors)}>
      {score.scoring_type === 'letter_grade' && score.grade ? (
        <>
          <span className="text-lg font-bold">{score.grade}</span>
          <span className="text-xs opacity-75">({score.score.toFixed(0)}%)</span>
        </>
      ) : (
        <span className="text-sm font-semibold">{score.score.toFixed(1)}%</span>
      )}
      {score.passed ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
    </div>
  )
}

// Trend indicator for comparing scores
export function ScoreTrendIndicator({
  currentScore,
  previousScore,
}: {
  currentScore: number
  previousScore: number
}) {
  const difference = currentScore - previousScore
  const isImproving = difference > 0
  const isUnchanged = difference === 0

  if (isUnchanged) {
    return (
      <div className="inline-flex items-center gap-1 text-secondary text-sm">
        <span className="font-medium">No change</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isImproving ? 'text-success' : 'text-error'
      )}
    >
      {isImproving ? (
        <TrendingUp className="w-4 h-4" />
      ) : (
        <TrendingDown className="w-4 h-4" />
      )}
      <span>
        {isImproving ? '+' : ''}
        {difference.toFixed(1)}%
      </span>
    </div>
  )
}
