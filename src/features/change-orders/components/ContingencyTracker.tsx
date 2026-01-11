/**
 * Contingency Tracker Component
 * Displays project contingency usage and remaining budget
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  ArrowRight,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface ContingencyTrackerProps {
  projectId: string
  className?: string
}

interface ProjectContingency {
  id: string
  name: string
  contract_value: number | null
  budget: number | null
  contingency_amount: number | null
  contingency_used: number | null
  spent_to_date: number | null
}

interface ChangeOrderImpact {
  id: string
  display_number: string
  title: string
  approved_amount: number
  date_owner_approved: string
  status: string
  change_type: string
}

// Fetch project contingency data
function useProjectContingency(projectId: string) {
  return useQuery({
    queryKey: ['project-contingency', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, contract_value, budget, contingency_amount, contingency_used, spent_to_date')
        .eq('id', projectId)
        .single()

      if (error) {throw error}
      return data as ProjectContingency
    },
    enabled: !!projectId,
  })
}

// Fetch approved change orders affecting contingency
function useApprovedChangeOrders(projectId: string) {
  return useQuery({
    queryKey: ['approved-change-orders', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select('id, co_number, pco_number, title, approved_amount, date_owner_approved, status, change_type, is_pco')
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .is('deleted_at', null)
        .order('date_owner_approved', { ascending: false })

      if (error) {throw error}

      // Format with display number
      return (data || []).map((co) => ({
        id: co.id,
        display_number: co.is_pco
          ? `PCO-${String(co.pco_number).padStart(3, '0')}`
          : `CO-${String(co.co_number || co.pco_number).padStart(3, '0')}`,
        title: co.title,
        approved_amount: co.approved_amount || 0,
        date_owner_approved: co.date_owner_approved,
        status: co.status,
        change_type: co.change_type,
      })) as ChangeOrderImpact[]
    },
    enabled: !!projectId,
  })
}

// Fetch pending change orders
function usePendingChangeOrders(projectId: string) {
  return useQuery({
    queryKey: ['pending-change-orders-contingency', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select('id, pco_number, title, proposed_amount, status')
        .eq('project_id', projectId)
        .in('status', ['pending_estimate', 'estimate_complete', 'pending_internal_approval', 'internally_approved', 'pending_owner_review'])
        .is('deleted_at', null)

      if (error) {throw error}

      const pendingTotal = (data || []).reduce((sum, co) => sum + (co.proposed_amount || 0), 0)
      return { items: data || [], total: pendingTotal }
    },
    enabled: !!projectId,
  })
}

// Format currency
function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) {return '$0'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Get change type badge color
function getChangeTypeBadge(type: string) {
  const colors: Record<string, string> = {
    scope_change: 'bg-blue-100 text-blue-800',
    design_clarification: 'bg-purple-100 text-purple-800',
    unforeseen_condition: 'bg-amber-100 text-amber-800',
    owner_request: 'bg-green-100 text-green-800',
    value_engineering: 'bg-teal-100 text-teal-800',
    error_omission: 'bg-red-100 text-red-800',
  }
  const labels: Record<string, string> = {
    scope_change: 'Scope Change',
    design_clarification: 'Design Clarification',
    unforeseen_condition: 'Unforeseen Condition',
    owner_request: 'Owner Request',
    value_engineering: 'Value Engineering',
    error_omission: 'Error/Omission',
  }
  return {
    className: colors[type] || 'bg-gray-100 text-gray-800',
    label: labels[type] || type,
  }
}

export function ContingencyTracker({ projectId, className }: ContingencyTrackerProps) {
  const { data: project, isLoading: projectLoading } = useProjectContingency(projectId)
  const { data: approvedCOs } = useApprovedChangeOrders(projectId)
  const { data: pendingCOs } = usePendingChangeOrders(projectId)

  // Calculate contingency metrics
  const metrics = useMemo(() => {
    if (!project) {return null}

    const contingencyAmount = project.contingency_amount || 0
    const contingencyUsed = project.contingency_used || 0
    const contingencyRemaining = contingencyAmount - contingencyUsed
    const percentUsed = contingencyAmount > 0 ? (contingencyUsed / contingencyAmount) * 100 : 0
    const pendingTotal = pendingCOs?.total || 0

    // Health status
    let status: 'healthy' | 'warning' | 'critical' | 'depleted' = 'healthy'
    if (contingencyRemaining <= 0) {
      status = 'depleted'
    } else if (percentUsed > 80) {
      status = 'critical'
    } else if (percentUsed > 50) {
      status = 'warning'
    }

    // If pending COs would exceed remaining
    const projectedUsed = contingencyUsed + pendingTotal
    const projectedPercent = contingencyAmount > 0 ? (projectedUsed / contingencyAmount) * 100 : 0
    const wouldExceed = projectedUsed > contingencyAmount

    return {
      contingencyAmount,
      contingencyUsed,
      contingencyRemaining,
      percentUsed,
      status,
      pendingTotal,
      projectedPercent,
      wouldExceed,
    }
  }, [project, pendingCOs])

  if (projectLoading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted rounded w-1/3" />
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!project || !metrics) {
    return null
  }

  const statusColors = {
    healthy: 'text-green-600',
    warning: 'text-amber-600',
    critical: 'text-red-600',
    depleted: 'text-red-800',
  }

  const progressColors = {
    healthy: 'bg-green-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    depleted: 'bg-red-800',
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Contingency Tracking</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'capitalize',
              metrics.status === 'healthy' && 'border-green-500 text-green-700',
              metrics.status === 'warning' && 'border-amber-500 text-amber-700',
              metrics.status === 'critical' && 'border-red-500 text-red-700',
              metrics.status === 'depleted' && 'border-red-800 text-red-900 bg-red-50'
            )}
          >
            {metrics.status === 'depleted' ? 'Depleted' : `${Math.round(100 - metrics.percentUsed)}% Remaining`}
          </Badge>
        </div>
        <CardDescription>
          Track contingency usage from approved change orders
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold">{formatCurrency(metrics.contingencyAmount)}</p>
            <p className="text-xs text-muted-foreground">Total Contingency</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className={cn('text-2xl font-bold', statusColors[metrics.status])}>
              {formatCurrency(metrics.contingencyUsed)}
            </p>
            <p className="text-xs text-muted-foreground">Used</p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className={cn(
              'text-2xl font-bold',
              metrics.contingencyRemaining < 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {formatCurrency(metrics.contingencyRemaining)}
            </p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span className={cn('font-medium', statusColors[metrics.status])}>
              {metrics.percentUsed.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all', progressColors[metrics.status])}
              style={{ width: `${Math.min(metrics.percentUsed, 100)}%` }}
            />
          </div>
          {metrics.percentUsed > 100 && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" />
              Over budget by {formatCurrency(Math.abs(metrics.contingencyRemaining))}
            </div>
          )}
        </div>

        {/* Pending Warning */}
        {metrics.pendingTotal > 0 && (
          <div className={cn(
            'p-3 rounded-lg flex items-start gap-2 text-sm',
            metrics.wouldExceed ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
          )}>
            <Clock className={cn('h-4 w-4 mt-0.5', metrics.wouldExceed ? 'text-red-600' : 'text-amber-600')} />
            <div>
              <p className={cn('font-medium', metrics.wouldExceed ? 'text-red-800' : 'text-amber-800')}>
                {formatCurrency(metrics.pendingTotal)} in pending change orders
              </p>
              <p className={cn('text-xs', metrics.wouldExceed ? 'text-red-600' : 'text-amber-600')}>
                {metrics.wouldExceed
                  ? `If approved, would exceed contingency by ${formatCurrency(metrics.pendingTotal - metrics.contingencyRemaining)}`
                  : `Would bring total usage to ${metrics.projectedPercent.toFixed(1)}%`}
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Approved Change Orders Impact */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Approved Change Orders</h4>
            <Badge variant="secondary">{approvedCOs?.length || 0}</Badge>
          </div>

          {!approvedCOs || approvedCOs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No approved change orders yet
            </p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {approvedCOs.slice(0, 5).map((co) => {
                const typeBadge = getChangeTypeBadge(co.change_type)
                return (
                  <div
                    key={co.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{co.display_number}</p>
                        <p className="text-xs text-muted-foreground truncate">{co.title}</p>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-right flex-shrink-0 ml-2">
                            <p className={cn(
                              'font-medium',
                              co.approved_amount > 0 ? 'text-red-600' : 'text-green-600'
                            )}>
                              {co.approved_amount > 0 ? '+' : ''}{formatCurrency(co.approved_amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {co.date_owner_approved ? format(new Date(co.date_owner_approved), 'MMM d') : '-'}
                            </p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{typeBadge.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )
              })}
              {approvedCOs.length > 5 && (
                <p className="text-xs text-center text-muted-foreground">
                  + {approvedCOs.length - 5} more change orders
                </p>
              )}
            </div>
          )}
        </div>

        {/* Contract Impact Summary */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Original Contract</p>
              <p className="font-medium">{formatCurrency(project.contract_value)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Net Change</p>
              <p className={cn(
                'font-medium flex items-center gap-1',
                metrics.contingencyUsed > 0 ? 'text-red-600' : 'text-green-600'
              )}>
                {metrics.contingencyUsed > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {metrics.contingencyUsed > 0 ? '+' : ''}{formatCurrency(metrics.contingencyUsed)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ContingencyTracker
