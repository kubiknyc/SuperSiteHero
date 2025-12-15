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
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: 'text-red-600',
        badge: 'bg-red-100 text-red-800',
      }
    }

    if (score.passed) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: 'text-green-600',
        badge: 'bg-green-100 text-green-800',
      }
    }

    return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-600',
      badge: 'bg-red-100 text-red-800',
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
                <div className={cn('text-gray-600', sizes.label)}>
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
                score.passed ? 'bg-green-600' : 'bg-red-600'
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
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {score.breakdown.pass_count}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">Pass</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-2xl font-bold text-red-600">
                      {score.breakdown.fail_count}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">Fail</div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-gray-600">
                      {score.breakdown.na_count}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">N/A</div>
                </div>
              </div>

              {/* Points Breakdown (if applicable) */}
              {score.scoring_type === 'points' && score.breakdown.total_points && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Points Earned</span>
                    <span className="font-semibold">
                      {score.breakdown.earned_points} / {score.breakdown.total_points}
                    </span>
                  </div>
                </div>
              )}

              {/* Completion Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Items Completed</span>
                  <span className="font-semibold">
                    {score.breakdown.completed_items} / {score.breakdown.total_items}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">Scorable Items</span>
                  <span className="font-semibold">{score.breakdown.scorable_items}</span>
                </div>
              </div>

              {/* Critical Failures Alert */}
              {score.breakdown.critical_failures && score.breakdown.critical_failures.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900 text-sm">Critical Item Failures</p>
                      <p className="text-xs text-red-700 mt-1">
                        {score.breakdown.critical_failures.length} critical{' '}
                        {score.breakdown.critical_failures.length === 1 ? 'item' : 'items'} failed
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs text-gray-500 text-center pt-2">
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
    ? 'bg-green-100 text-green-800 border-green-300'
    : 'bg-red-100 text-red-800 border-red-300'

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
      <div className="inline-flex items-center gap-1 text-gray-600 text-sm">
        <span className="font-medium">No change</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        isImproving ? 'text-green-600' : 'text-red-600'
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
