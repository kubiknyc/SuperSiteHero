/**
 * Division Summary Chart Component
 * Shows budget breakdown by CSI division with visual bars
 */

import { useMemo } from 'react'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CSI_DIVISIONS } from '@/types/cost-tracking'
import type { BudgetSummaryByDivision } from '@/types/cost-tracking'

interface DivisionSummaryChartProps {
  divisions: BudgetSummaryByDivision[]
  isLoading: boolean
}

export function DivisionSummaryChart({ divisions, isLoading }: DivisionSummaryChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toFixed(0)}`
  }

  // Get division name from CSI_DIVISIONS
  const getDivisionName = (divisionCode: string) => {
    const division = CSI_DIVISIONS.find(d => d.division === divisionCode)
    return division?.name || `Division ${divisionCode}`
  }

  // Calculate max for scaling bars
  const maxBudget = useMemo(() => {
    if (!divisions.length) {return 0}
    return Math.max(...divisions.map(d => d.revised_budget))
  }, [divisions])

  // Sort by budget descending
  const sortedDivisions = useMemo(() => {
    return [...divisions].sort((a, b) => b.revised_budget - a.revised_budget)
  }, [divisions])

  // Group divisions by category
  const groupedDivisions = useMemo(() => {
    const groups: Record<string, BudgetSummaryByDivision[]> = {
      'General': [],
      'Facility Construction': [],
      'Facility Services': [],
      'Site and Infrastructure': [],
      'Process Equipment': [],
      'Other': [],
    }

    sortedDivisions.forEach(div => {
      const csiDiv = CSI_DIVISIONS.find(d => d.division === div.division)
      const group = csiDiv?.group || 'Other'
      if (groups[group]) {
        groups[group].push(div)
      } else {
        groups['Other'].push(div)
      }
    })

    // Filter out empty groups
    return Object.entries(groups).filter(([_, divs]) => divs.length > 0)
  }, [sortedDivisions])

  // Calculate totals
  const totals = useMemo(() => {
    return divisions.reduce(
      (acc, d) => ({
        original: acc.original + d.original_budget,
        revised: acc.revised + d.revised_budget,
        actual: acc.actual + d.actual_cost,
        variance: acc.variance + d.variance,
      }),
      { original: 0, revised: 0, actual: 0, variance: 0 }
    )
  }, [divisions])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-32 mb-2" />
            <div className="h-8 bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (divisions.length === 0) {
    return (
      <div className="py-12 text-center">
        <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-muted">No division data available</p>
        <p className="text-sm text-disabled">Add budget lines to see division breakdown</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface rounded-lg">
          <p className="text-sm text-muted">Total Budget</p>
          <p className="text-xl font-bold">{formatCurrency(totals.revised)}</p>
        </div>
        <div className="p-4 bg-surface rounded-lg">
          <p className="text-sm text-muted">Total Spent</p>
          <p className="text-xl font-bold">{formatCurrency(totals.actual)}</p>
        </div>
        <div className="p-4 bg-surface rounded-lg">
          <p className="text-sm text-muted">Divisions</p>
          <p className="text-xl font-bold">{divisions.length}</p>
        </div>
        <div className={cn(
          'p-4 rounded-lg',
          totals.variance < 0 ? 'bg-error-light' : 'bg-success-light'
        )}>
          <p className="text-sm text-muted">Variance</p>
          <p className={cn(
            'text-xl font-bold',
            totals.variance < 0 ? 'text-error' : 'text-success'
          )}>
            {totals.variance < 0 ? '-' : '+'}{formatCurrency(Math.abs(totals.variance))}
          </p>
        </div>
      </div>

      {/* Division Bars */}
      <div className="space-y-6">
        {groupedDivisions.map(([groupName, groupDivisions]) => (
          <Card key={groupName}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-secondary">{groupName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupDivisions.map((division) => {
                const budgetPercent = maxBudget > 0 ? (division.revised_budget / maxBudget) * 100 : 0
                const spentPercent = division.revised_budget > 0
                  ? (division.actual_cost / division.revised_budget) * 100
                  : 0
                const isOverBudget = division.variance < 0
                const isNearBudget = spentPercent > 90 && spentPercent <= 100

                return (
                  <div key={division.division} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {division.division}
                        </Badge>
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {getDivisionName(division.division)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted">
                          Budget: {formatCompact(division.revised_budget)}
                        </span>
                        <span className="text-muted">
                          Spent: {formatCompact(division.actual_cost)}
                        </span>
                        <span className={cn(
                          'font-medium flex items-center gap-1',
                          isOverBudget ? 'text-error' : isNearBudget ? 'text-orange-600' : 'text-success'
                        )}>
                          {isOverBudget ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : (
                            <TrendingUp className="h-4 w-4" />
                          )}
                          {isOverBudget ? '-' : '+'}
                          {formatCompact(Math.abs(division.variance))}
                        </span>
                      </div>
                    </div>

                    {/* Budget Bar */}
                    <div className="relative">
                      {/* Background bar (total available width based on max budget) */}
                      <div
                        className="h-6 bg-muted rounded-md overflow-hidden"
                        style={{ width: `${budgetPercent}%`, minWidth: '100px' }}
                      >
                        {/* Budget bar */}
                        <div className="h-full bg-blue-200 relative">
                          {/* Spent overlay */}
                          <div
                            className={cn(
                              'h-full transition-all',
                              isOverBudget ? 'bg-red-400' :
                              isNearBudget ? 'bg-orange-400' :
                              'bg-green-400'
                            )}
                            style={{ width: `${Math.min(spentPercent, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Percentage label */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-secondary">
                        {spentPercent.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm text-secondary">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-200 rounded" />
          <span>Budget</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-400 rounded" />
          <span>On Track</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-400 rounded" />
          <span>Near Budget (90%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 rounded" />
          <span>Over Budget</span>
        </div>
      </div>
    </div>
  )
}
