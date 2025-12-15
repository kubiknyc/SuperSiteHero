/**
 * Inspection Schedule Widget
 * Displays today's scheduled inspections
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, Clock, ArrowRight, CalendarCheck } from 'lucide-react'
import { useInspections } from '@/features/inspections/hooks/useInspections'
import { cn } from '@/lib/utils'
import type { WidgetProps } from '@/types/dashboard'

export function InspectionScheduleWidget({
  projectId,
  config: _config,
  className,
}: WidgetProps) {
  const navigate = useNavigate()
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const { data: inspections = [], isLoading } = useInspections(projectId, {
    scheduled_date: today,
    status: 'scheduled',
  })

  const sortedInspections = useMemo(() => {
    return [...inspections]
      .filter((insp) => insp.scheduled_date === today && insp.status === 'scheduled')
      .sort((a, b) => {
        if (!a.scheduled_time) {return 1}
        if (!b.scheduled_time) {return -1}
        return a.scheduled_time.localeCompare(b.scheduled_time)
      })
  }, [inspections, today])

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Today's Inspections
            {sortedInspections.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {sortedInspections.length}
              </Badge>
            )}
          </CardTitle>
          <button
            onClick={() => navigate(`/projects/${projectId}/inspections`)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedInspections.length > 0 ? (
          <>
            {sortedInspections.slice(0, 4).map((inspection) => (
              <button
                key={inspection.id}
                onClick={() =>
                  navigate(`/projects/${projectId}/inspections/${inspection.id}`)
                }
                className="w-full rounded-lg bg-muted/50 p-3 text-left hover:bg-muted transition-colors min-h-[56px]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {inspection.inspection_type
                        ?.replace(/_/g, ' ')
                        .replace(/\b\w/g, (l) => l.toUpperCase()) || 'Inspection'}
                    </p>
                    {inspection.scheduled_time && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(`2000-01-01T${inspection.scheduled_time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline">Scheduled</Badge>
                </div>
              </button>
            ))}
            {sortedInspections.length > 4 && (
              <button
                onClick={() => navigate(`/projects/${projectId}/inspections`)}
                className="w-full text-sm text-muted-foreground hover:text-foreground py-2"
              >
                +{sortedInspections.length - 4} more inspections
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No inspections scheduled</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
