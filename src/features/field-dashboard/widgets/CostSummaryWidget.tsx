/**
 * Cost Summary Widget
 * Displays budget vs actual cost overview
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { DollarSign, TrendingDown, ArrowRight, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { WidgetProps } from '@/types/dashboard'

interface CostSummary {
  totalBudget: number
  totalActual: number
  committed: number
  pendingChanges: number
}

export function CostSummaryWidget({
  projectId,
  config: _config,
  className,
}: WidgetProps) {
  const navigate = useNavigate()

  const { data: costData, isLoading } = useQuery({
    queryKey: ['cost-summary', projectId],
    queryFn: async () => {
      // Fetch project budget and cost tracking data
      const [projectResult, costResult] = await Promise.all([
        supabase
          .from('projects')
          .select('budget, contract_value')
          .eq('id', projectId)
          .single(),
        supabase
          .from('cost_tracking')
          .select('budget_amount, actual_amount, committed_amount')
          .eq('project_id', projectId),
      ])

      const project = projectResult.data
      const costs = costResult.data || []

      // Calculate totals
      const totalBudget = costs.reduce((sum, c) => sum + (c.budget_amount || 0), 0) ||
        (project?.budget || project?.contract_value || 0)
      const totalActual = costs.reduce((sum, c) => sum + (c.actual_amount || 0), 0)
      const committed = costs.reduce((sum, c) => sum + (c.committed_amount || 0), 0)

      return {
        totalBudget,
        totalActual,
        committed,
        pendingChanges: 0, // Would come from change orders
      } as CostSummary
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`
    }
    return `$${amount.toFixed(0)}`
  }

  const stats = useMemo(() => {
    if (!costData || costData.totalBudget === 0) {return null}

    const variance = costData.totalBudget - costData.totalActual
    const variancePercent = (variance / costData.totalBudget) * 100
    const spentPercent = (costData.totalActual / costData.totalBudget) * 100

    return {
      variance,
      variancePercent,
      spentPercent,
      isOverBudget: variance < 0,
    }
  }, [costData])

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!costData || costData.totalBudget === 0) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No budget data available</p>
            <button
              onClick={() => navigate(`/projects/${projectId}/costs`)}
              className="text-sm text-primary hover:underline mt-2"
            >
              Set up budget
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Cost Summary
          </CardTitle>
          <button
            onClick={() => navigate(`/projects/${projectId}/costs`)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Details
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Budget Used</span>
            <span className="font-medium">
              {stats?.spentPercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all rounded-full',
                stats?.isOverBudget ? 'bg-red-500' : 'bg-green-500'
              )}
              style={{ width: `${Math.min(stats?.spentPercent || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Budget</p>
            <p className="text-lg font-bold">{formatCurrency(costData.totalBudget)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Actual</p>
            <p className="text-lg font-bold">{formatCurrency(costData.totalActual)}</p>
          </div>
        </div>

        {/* Variance indicator */}
        {stats && (
          <div className={cn(
            'flex items-center justify-between p-3 rounded-lg',
            stats.isOverBudget
              ? 'bg-error-light dark:bg-red-950/20'
              : 'bg-success-light dark:bg-green-950/20'
          )}>
            <div className="flex items-center gap-2">
              {stats.isOverBudget ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-error" />
                  <span className="text-sm font-medium text-error-dark dark:text-red-300">
                    Over Budget
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-success-dark dark:text-green-300">
                    Under Budget
                  </span>
                </>
              )}
            </div>
            <Badge
              variant={stats.isOverBudget ? 'destructive' : 'default'}
              className={cn(
                !stats.isOverBudget && 'bg-success-light text-green-800 dark:bg-green-900/30 dark:text-green-200'
              )}
            >
              {stats.isOverBudget ? '-' : '+'}
              {formatCurrency(Math.abs(stats.variance))}
            </Badge>
          </div>
        )}

        {/* Committed costs */}
        {costData.committed > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            Committed: {formatCurrency(costData.committed)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
