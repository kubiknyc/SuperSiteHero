/**
 * RFI Aging Alerts Component
 *
 * Displays a dashboard panel showing RFIs approaching or past their due dates.
 * Includes visual indicators for aging levels and quick actions.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, differenceInDays, isToday, isPast, isFuture } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Bell,
  CalendarClock,
  TrendingDown,
  ExternalLink,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { WorkflowItem } from '@/types/database'

// ============================================================================
// Types
// ============================================================================

interface RFIAgingAlertsProps {
  projectId: string
  workflowTypeId: string
  maxItems?: number
  showSummary?: boolean
  className?: string
}

interface RFIWithAging extends WorkflowItem {
  daysUntilDue: number
  agingLevel: 'overdue' | 'critical' | 'urgent' | 'warning' | 'healthy'
  isOverdue: boolean
}

interface AgingStats {
  total: number
  overdue: number
  critical: number
  urgent: number
  warning: number
  healthy: number
  averageAge: number
}

// ============================================================================
// Constants
// ============================================================================

const AGING_CONFIG = {
  warning: 7,   // 7 days or less until due
  urgent: 3,    // 3 days or less until due
  critical: 1,  // 1 day or less until due
}

const AGING_COLORS = {
  overdue: {
    badge: 'bg-red-100 text-red-800 border-red-200',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertTriangle,
    label: 'Overdue',
  },
  critical: {
    badge: 'bg-red-100 text-red-800 border-red-200',
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: AlertCircle,
    label: 'Critical',
  },
  urgent: {
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: Clock,
    label: 'Urgent',
  },
  warning: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    text: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    icon: Bell,
    label: 'Due Soon',
  },
  healthy: {
    badge: 'bg-green-100 text-green-800 border-green-200',
    text: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: CheckCircle2,
    label: 'On Track',
  },
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-gray-100 text-gray-800',
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateAgingLevel(dueDate: string | null): { level: RFIWithAging['agingLevel']; daysUntilDue: number } {
  if (!dueDate) {
    return { level: 'healthy', daysUntilDue: 999 }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const daysUntilDue = differenceInDays(due, today)

  if (daysUntilDue < 0) {
    return { level: 'overdue', daysUntilDue }
  } else if (daysUntilDue <= AGING_CONFIG.critical) {
    return { level: 'critical', daysUntilDue }
  } else if (daysUntilDue <= AGING_CONFIG.urgent) {
    return { level: 'urgent', daysUntilDue }
  } else if (daysUntilDue <= AGING_CONFIG.warning) {
    return { level: 'warning', daysUntilDue }
  }

  return { level: 'healthy', daysUntilDue }
}

function formatRFINumber(number: number | null): string {
  return `RFI-${String(number || 0).padStart(4, '0')}`
}

function formatDaysLabel(days: number): string {
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days === -1) return '1 day overdue'
  if (days < 0) return `${Math.abs(days)} days overdue`
  return `${days} days left`
}

// ============================================================================
// Sub-Components
// ============================================================================

interface RFIAgingItemProps {
  rfi: RFIWithAging
  projectId: string
}

function RFIAgingItem({ rfi, projectId }: RFIAgingItemProps) {
  const config = AGING_COLORS[rfi.agingLevel]
  const Icon = config.icon

  return (
    <Link
      to={`/projects/${projectId}/rfis/${rfi.id}`}
      className={cn(
        'block p-3 rounded-lg border transition-colors hover:bg-gray-50',
        config.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn('p-2 rounded-lg', config.bg)}>
            <Icon className={cn('h-4 w-4', config.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 text-sm">
                {formatRFINumber(rfi.number)}
              </span>
              <Badge variant="outline" className={cn('text-xs', PRIORITY_COLORS[rfi.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.normal)}>
                {rfi.priority || 'normal'}
              </Badge>
            </div>
            <p className="text-sm text-gray-700 truncate mb-1">
              {rfi.title}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className={cn('text-xs', config.badge)}>
                {config.label}
              </Badge>
              <span className={cn('font-medium', config.text)}>
                {formatDaysLabel(rfi.daysUntilDue)}
              </span>
            </div>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </Link>
  )
}

interface AgingSummaryCardProps {
  stats: AgingStats
}

function AgingSummaryCard({ stats }: AgingSummaryCardProps) {
  const healthPercentage = stats.total > 0
    ? Math.round((stats.healthy / stats.total) * 100)
    : 100

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className={cn('p-3 rounded-lg text-center', stats.overdue > 0 ? 'bg-red-50' : 'bg-gray-50')}>
        <p className={cn('text-2xl font-bold', stats.overdue > 0 ? 'text-red-700' : 'text-gray-400')}>
          {stats.overdue}
        </p>
        <p className="text-xs text-gray-600">Overdue</p>
      </div>
      <div className={cn('p-3 rounded-lg text-center', stats.critical > 0 ? 'bg-orange-50' : 'bg-gray-50')}>
        <p className={cn('text-2xl font-bold', stats.critical > 0 ? 'text-orange-700' : 'text-gray-400')}>
          {stats.critical + stats.urgent}
        </p>
        <p className="text-xs text-gray-600">Critical/Urgent</p>
      </div>
      <div className={cn('p-3 rounded-lg text-center', stats.warning > 0 ? 'bg-yellow-50' : 'bg-gray-50')}>
        <p className={cn('text-2xl font-bold', stats.warning > 0 ? 'text-yellow-700' : 'text-gray-400')}>
          {stats.warning}
        </p>
        <p className="text-xs text-gray-600">Due Soon</p>
      </div>
      <div className="p-3 rounded-lg text-center bg-green-50">
        <p className="text-2xl font-bold text-green-700">{healthPercentage}%</p>
        <p className="text-xs text-gray-600">On Track</p>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function RFIAgingAlerts({
  projectId,
  workflowTypeId,
  maxItems = 10,
  showSummary = true,
  className,
}: RFIAgingAlertsProps) {
  // Fetch RFIs
  const { data: rfis, isLoading, error } = useQuery({
    queryKey: ['rfis-aging', projectId, workflowTypeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .in('status', ['pending', 'submitted', 'under_review'])
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (error) throw error
      return data as WorkflowItem[]
    },
    enabled: !!projectId && !!workflowTypeId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  })

  // Process RFIs with aging info
  const { agingRFIs, stats } = useMemo(() => {
    if (!rfis) {
      return {
        agingRFIs: [],
        stats: {
          total: 0,
          overdue: 0,
          critical: 0,
          urgent: 0,
          warning: 0,
          healthy: 0,
          averageAge: 0,
        } as AgingStats,
      }
    }

    let totalAge = 0
    const stats: AgingStats = {
      total: rfis.length,
      overdue: 0,
      critical: 0,
      urgent: 0,
      warning: 0,
      healthy: 0,
      averageAge: 0,
    }

    const processed: RFIWithAging[] = rfis.map(rfi => {
      const { level, daysUntilDue } = calculateAgingLevel(rfi.due_date)

      stats[level]++

      // Calculate age from created date
      if (rfi.created_at) {
        const ageDays = differenceInDays(new Date(), new Date(rfi.created_at))
        totalAge += ageDays
      }

      return {
        ...rfi,
        daysUntilDue,
        agingLevel: level,
        isOverdue: level === 'overdue',
      }
    })

    stats.averageAge = rfis.length > 0 ? Math.round(totalAge / rfis.length) : 0

    // Sort by aging severity (overdue first, then by days until due)
    const sorted = processed.sort((a, b) => {
      // Overdue items first
      if (a.isOverdue && !b.isOverdue) return -1
      if (!a.isOverdue && b.isOverdue) return 1

      // Then by days until due (most urgent first)
      return a.daysUntilDue - b.daysUntilDue
    })

    // Filter to only show items needing attention (exclude healthy)
    const needsAttention = sorted.filter(rfi => rfi.agingLevel !== 'healthy')

    return {
      agingRFIs: needsAttention.slice(0, maxItems),
      stats,
    }
  }, [rfis, maxItems])

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Failed to load RFI aging data</p>
        </CardContent>
      </Card>
    )
  }

  const hasAlertsToShow = agingRFIs.length > 0
  const needsAttentionCount = stats.overdue + stats.critical + stats.urgent + stats.warning

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-lg">RFI Aging Alerts</CardTitle>
          </div>
          {stats.overdue > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.overdue} Overdue
            </Badge>
          )}
        </div>
        <CardDescription>
          {needsAttentionCount > 0
            ? `${needsAttentionCount} RFI${needsAttentionCount !== 1 ? 's' : ''} need attention`
            : 'All RFIs are on track'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {showSummary && stats.total > 0 && (
          <AgingSummaryCard stats={stats} />
        )}

        {hasAlertsToShow ? (
          <ScrollArea className="h-[320px] pr-4">
            <div className="space-y-2">
              {agingRFIs.map(rfi => (
                <RFIAgingItem key={rfi.id} rfi={rfi} projectId={projectId} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">All Clear!</p>
            <p className="text-sm text-gray-500">No RFIs require immediate attention</p>
          </div>
        )}

        {stats.total > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Link to={`/projects/${projectId}/rfis`}>
              <Button variant="outline" size="sm" className="w-full">
                View All RFIs ({stats.total})
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RFIAgingAlerts
