/**
 * Punch Items Widget
 * Displays open/in-progress punch item counts by priority
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardCheck, AlertTriangle, ArrowRight } from 'lucide-react'
import { usePunchItems } from '@/features/punch-lists/hooks/usePunchItems'
import { cn } from '@/lib/utils'
import type { WidgetProps } from '@/types/dashboard'

export function PunchItemsWidget({
  projectId,
  config: _config,
  className,
}: WidgetProps) {
  const navigate = useNavigate()
  const { data: punchItems = [], isLoading } = usePunchItems(projectId)

  const stats = useMemo(() => {
    const activeItems = punchItems.filter(
      (item) => !item.deleted_at && (item.status === 'open' || item.status === 'in_progress')
    )

    return {
      total: activeItems.length,
      open: activeItems.filter((item) => item.status === 'open').length,
      inProgress: activeItems.filter((item) => item.status === 'in_progress').length,
      byPriority: {
        critical: activeItems.filter((item) => item.priority === 'critical').length,
        high: activeItems.filter((item) => item.priority === 'high').length,
        medium: activeItems.filter((item) => item.priority === 'medium').length,
        low: activeItems.filter((item) => item.priority === 'low').length,
      },
    }
  }, [punchItems])

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
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
            <ClipboardCheck className="h-4 w-4" />
            Punch Items
          </CardTitle>
          <button
            onClick={() => navigate(`/projects/${projectId}/punch-lists`)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/punch-lists?status=open`)}
            className="rounded-lg bg-muted/50 p-3 text-left hover:bg-muted transition-colors min-h-[60px]"
          >
            <p className="text-xs text-muted-foreground">Open</p>
            <p className="text-2xl font-bold">{stats.open}</p>
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/punch-lists?status=in_progress`)}
            className="rounded-lg bg-muted/50 p-3 text-left hover:bg-muted transition-colors min-h-[60px]"
          >
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold">{stats.inProgress}</p>
          </button>
        </div>

        {/* Priority breakdown */}
        {stats.total > 0 && (
          <div className="flex gap-2 flex-wrap">
            {stats.byPriority.critical > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Critical: {stats.byPriority.critical}
              </Badge>
            )}
            {stats.byPriority.high > 0 && (
              <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                High: {stats.byPriority.high}
              </Badge>
            )}
            {stats.byPriority.medium > 0 && (
              <Badge variant="outline" className="gap-1">
                Medium: {stats.byPriority.medium}
              </Badge>
            )}
            {stats.byPriority.low > 0 && (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                Low: {stats.byPriority.low}
              </Badge>
            )}
          </div>
        )}

        {/* Empty state */}
        {stats.total === 0 && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No active punch items
          </div>
        )}
      </CardContent>
    </Card>
  )
}
