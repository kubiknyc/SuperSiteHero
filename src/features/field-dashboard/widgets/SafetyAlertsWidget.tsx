/**
 * Safety Alerts Widget
 * Displays recent safety observations requiring attention
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { HardHat, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useObservations } from '@/features/safety/hooks/useSafetyObservations'
import { cn } from '@/lib/utils'
import type { WidgetProps } from '@/types/dashboard'

export function SafetyAlertsWidget({
  projectId,
  config: _config,
  className,
}: WidgetProps) {
  const navigate = useNavigate()
  const { data: observations = [], isLoading } = useObservations({
    project_id: projectId,
    status: ['open', 'acknowledged', 'action_required'],
  })

  const recentAlerts = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    return observations
      .filter((obs) => {
        const createdDate = new Date(obs.created_at || '')
        return createdDate >= sevenDaysAgo && obs.status !== 'closed'
      })
      .sort((a, b) => {
        // Sort by status priority then by date
        const statusPriority: Record<string, number> = {
          action_required: 0,
          open: 1,
          acknowledged: 2,
        }
        const aPriority = statusPriority[a.status || ''] ?? 3
        const bPriority = statusPriority[b.status || ''] ?? 3
        if (aPriority !== bPriority) {return aPriority - bPriority}
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      })
      .slice(0, 5)
  }, [observations])

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  const actionRequiredCount = recentAlerts.filter(
    (obs) => obs.status === 'action_required'
  ).length

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <HardHat className="h-4 w-4" />
            Safety Alerts
            {actionRequiredCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {actionRequiredCount}
              </Badge>
            )}
          </CardTitle>
          <button
            onClick={() => navigate(`/projects/${projectId}/safety/observations`)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentAlerts.length > 0 ? (
          recentAlerts.map((observation) => (
            <button
              key={observation.id}
              onClick={() =>
                navigate(`/projects/${projectId}/safety/observations/${observation.id}`)
              }
              className={cn(
                'w-full rounded-lg p-3 text-left transition-colors min-h-[56px]',
                observation.status === 'action_required'
                  ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                  : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-950/30'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {observation.observation_type
                      ?.replace(/_/g, ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Safety Observation'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(observation.created_at || '').toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={observation.status === 'action_required' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {observation.status
                    ?.replace(/_/g, ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No active safety alerts</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
