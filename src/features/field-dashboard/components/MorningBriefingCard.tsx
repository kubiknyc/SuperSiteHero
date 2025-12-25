/**
 * Morning Briefing Card Component
 * Displays aggregated field data for the day with real-time updates
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  RefreshableList,
} from '@/components/ui'
import { useFieldDashboard } from '../hooks/useFieldDashboard'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Cloud,
  CloudRain,
  Sun,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  HardHat,
  Calendar,
  ThermometerSun,
  Wind,
  Droplets,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MorningBriefingCardProps {
  projectId: string
  className?: string
}

export function MorningBriefingCard({
  projectId,
  className,
}: MorningBriefingCardProps) {
  const navigate = useNavigate()
  const { data, isLoading, refetch } = useFieldDashboard({ projectId })

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
  }, [])

  const handleRefresh = async () => {
    await refetch()
  }

  if (isLoading) {
    return <BriefingCardSkeleton />
  }

  if (!data) {
    return null
  }

  const weatherIcon = getWeatherIcon(data.weather?.condition || 'Unknown')
  const hasWeatherAlert = data.weather && (
    (data.weather.precipitation || 0) > 0.5 ||
    (data.weather.windSpeed || 0) > 20
  )

  return (
    <RefreshableList onRefresh={handleRefresh}>
      <Card className={cn('w-full', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">Morning Briefing</CardTitle>
              <CardDescription className="mt-1">{todayFormatted}</CardDescription>
            </div>
            {hasWeatherAlert && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Weather Alert
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Weather Section */}
          {data.weather && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 heading-subsection">
                {weatherIcon}
                Weather
              </h3>
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Condition</p>
                  <p className="text-sm font-medium">{data.weather.condition}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ThermometerSun className="h-3 w-3" />
                    Temperature
                  </p>
                  <p className="text-sm font-medium">
                    {data.weather.temperatureHigh !== null &&
                    data.weather.temperatureLow !== null
                      ? `${Math.round(data.weather.temperatureLow)}° - ${Math.round(data.weather.temperatureHigh)}°F`
                      : 'N/A'}
                  </p>
                </div>
                {data.weather.precipitation !== null && data.weather.precipitation > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      Precipitation
                    </p>
                    <p className="text-sm font-medium">
                      {data.weather.precipitation.toFixed(2)}"
                    </p>
                  </div>
                )}
                {data.weather.windSpeed !== null && data.weather.windSpeed > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Wind className="h-3 w-3" />
                      Wind
                    </p>
                    <p className="text-sm font-medium">
                      {Math.round(data.weather.windSpeed)} mph
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Punch Items Section */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2 heading-subsection">
                <ClipboardCheck className="h-4 w-4" />
                Punch Items
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => navigate(`/projects/${projectId}/punch-lists`)}
              >
                View All
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-lg bg-muted/50 p-3 space-y-1 cursor-pointer hover:bg-muted transition-colors min-h-[44px] flex flex-col justify-center"
                onClick={() => navigate(`/projects/${projectId}/punch-lists?status=open`)}
              >
                <p className="text-xs text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{data.punchItems.open}</p>
              </div>
              <div
                className="rounded-lg bg-muted/50 p-3 space-y-1 cursor-pointer hover:bg-muted transition-colors min-h-[44px] flex flex-col justify-center"
                onClick={() => navigate(`/projects/${projectId}/punch-lists?status=in_progress`)}
              >
                <p className="text-xs text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{data.punchItems.inProgress}</p>
              </div>
            </div>
            {/* Priority Breakdown */}
            {data.punchItems.total > 0 && (
              <div className="flex gap-2 flex-wrap pt-1">
                {data.punchItems.byPriority.critical > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    Critical: {data.punchItems.byPriority.critical}
                  </Badge>
                )}
                {data.punchItems.byPriority.high > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    High: {data.punchItems.byPriority.high}
                  </Badge>
                )}
                {data.punchItems.byPriority.medium > 0 && (
                  <Badge variant="outline" className="gap-1">
                    Medium: {data.punchItems.byPriority.medium}
                  </Badge>
                )}
              </div>
            )}
          </section>

          {/* Inspections Section */}
          {data.inspections.total > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 heading-subsection">
                <CheckCircle2 className="h-4 w-4" />
                Scheduled Inspections ({data.inspections.total})
              </h3>
              <div className="space-y-2">
                {data.inspections.scheduled.slice(0, 3).map((inspection) => (
                  <div
                    key={inspection.id}
                    className="rounded-lg bg-muted/50 p-3 cursor-pointer hover:bg-muted transition-colors min-h-[44px] flex items-center justify-between"
                    onClick={() => navigate(`/projects/${projectId}/inspections/${inspection.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {inspection.inspection_type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Inspection'}
                      </p>
                      {inspection.scheduled_time && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(`2000-01-01T${inspection.scheduled_time}`).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">Scheduled</Badge>
                  </div>
                ))}
                {data.inspections.total > 3 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="w-full h-8"
                    onClick={() => navigate(`/projects/${projectId}/inspections`)}
                  >
                    +{data.inspections.total - 3} more
                  </Button>
                )}
              </div>
            </section>
          )}

          {/* Safety Alerts Section */}
          {data.safetyAlerts.total > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-warning heading-subsection">
                <HardHat className="h-4 w-4" />
                Safety Alerts ({data.safetyAlerts.total})
              </h3>
              <div className="space-y-2">
                {data.safetyAlerts.recent.slice(0, 3).map((observation) => (
                  <div
                    key={observation.id}
                    className="rounded-lg bg-warning-light dark:bg-amber-950/20 p-3 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors min-h-[44px]"
                    onClick={() => navigate(`/projects/${projectId}/safety/observations/${observation.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {observation.observation_type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(observation.created_at || '').toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={observation.status === 'action_required' ? 'destructive' : 'secondary'}
                      >
                        {observation.status?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Schedule Milestones */}
          {data.schedule.milestones.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 heading-subsection">
                <Calendar className="h-4 w-4" />
                Upcoming Milestones
              </h3>
              <div className="space-y-2">
                {data.schedule.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 min-h-[44px]"
                  >
                    <p className="text-sm font-medium">{milestone.description}</p>
                    {milestone.planned_end_date && (
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(milestone.planned_end_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {data.punchItems.total === 0 &&
            data.inspections.total === 0 &&
            data.safetyAlerts.total === 0 &&
            data.schedule.activitiesToday.length === 0 && (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                <p className="text-sm font-medium">All clear for today!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No pending tasks or scheduled activities
                </p>
              </div>
            )}
        </CardContent>
      </Card>
    </RefreshableList>
  )
}

/**
 * Skeleton loading state for the briefing card
 */
function BriefingCardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Get weather icon based on condition
 */
function getWeatherIcon(condition: string) {
  const lower = condition.toLowerCase()

  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    return <CloudRain className="h-4 w-4" />
  }

  if (lower.includes('cloud') || lower.includes('overcast')) {
    return <Cloud className="h-4 w-4" />
  }

  if (lower.includes('clear') || lower.includes('sunny')) {
    return <Sun className="h-4 w-4" />
  }

  return <Cloud className="h-4 w-4" />
}
