/**
 * Near-Miss Heat Map Components
 *
 * Visualizations for location-based and time-based heat maps
 * showing near-miss incident concentrations.
 */

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  LocationHeatMapData,
  TimeMatrix,
  ZoneRiskLevel,
} from '@/types/near-miss-analytics'
import { DAY_OF_WEEK_SHORT, HOUR_LABELS } from '@/types/near-miss-analytics' // eslint-disable-line no-duplicate-imports
import { ROOT_CAUSE_LABELS } from '@/types/safety-incidents'
import { MapPin, Clock, AlertTriangle } from 'lucide-react'

// ============================================================================
// Location Heat Map
// ============================================================================

interface LocationHeatMapProps {
  data: LocationHeatMapData[] | undefined
  isLoading?: boolean
  onLocationClick?: (location: LocationHeatMapData) => void
  maxItems?: number
  className?: string
}

/**
 * LocationHeatMap Component
 *
 * Displays a heat map of near-miss incidents by location.
 */
export function LocationHeatMap({
  data,
  isLoading,
  onLocationClick,
  maxItems = 10,
  className,
}: LocationHeatMapProps) {
  const sortedData = useMemo(() => {
    if (!data) return []
    return [...data]
      .sort((a, b) => (b.risk_score || b.incident_count) - (a.risk_score || a.incident_count))
      .slice(0, maxItems)
  }, [data, maxItems])

  const maxCount = useMemo(() => {
    return Math.max(...(sortedData.map(d => d.incident_count) || [1]))
  }, [sortedData])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location Heat Map
          </CardTitle>
          <CardDescription>Near-miss hotspots by location</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">
            No location data available for the selected period.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location Heat Map
        </CardTitle>
        <CardDescription>
          Top {Math.min(maxItems, data.length)} locations by near-miss concentration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedData.map((location, index) => (
            <LocationHeatMapRow
              key={`${location.location}-${index}`}
              location={location}
              maxCount={maxCount}
              onClick={onLocationClick}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-200" />
              Low
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-200" />
              Medium
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-200" />
              High
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-200" />
              Critical
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface LocationHeatMapRowProps {
  location: LocationHeatMapData
  maxCount: number
  onClick?: (location: LocationHeatMapData) => void
}

function LocationHeatMapRow({ location, maxCount, onClick }: LocationHeatMapRowProps) {
  const percentage = (location.incident_count / maxCount) * 100
  const riskLevel = getRiskLevel(location.incident_count, location.high_severity_count)

  const bgColor = {
    low: 'bg-green-100 dark:bg-green-900/30',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30',
    high: 'bg-orange-100 dark:bg-orange-900/30',
    critical: 'bg-red-100 dark:bg-red-900/30',
  }[riskLevel]

  const barColor = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  }[riskLevel]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative p-3 rounded-lg cursor-pointer transition-all hover:shadow-md',
              bgColor,
              onClick && 'hover:ring-2 hover:ring-primary/20'
            )}
            onClick={() => onClick?.(location)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate max-w-[200px]">
                  {location.location}
                </span>
                {location.zone_name && (
                  <Badge variant="outline" className="text-xs">
                    {location.zone_name}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{location.incident_count}</span>
                {location.high_severity_count > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {location.high_severity_count}
                  </Badge>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-white/50 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', barColor)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{location.location}</p>
            <div className="text-xs space-y-1">
              <p>Total incidents: {location.incident_count}</p>
              <p>High severity potential: {location.high_severity_count}</p>
              <p>Last incident: {new Date(location.last_incident_date).toLocaleDateString()}</p>
              {location.root_causes.length > 0 && (
                <p>
                  Root causes: {location.root_causes.map(c => ROOT_CAUSE_LABELS[c] || c).join(', ')}
                </p>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function getRiskLevel(count: number, highSeverityCount: number): ZoneRiskLevel {
  const riskScore = count + highSeverityCount * 3
  if (riskScore >= 15) return 'critical'
  if (riskScore >= 8) return 'high'
  if (riskScore >= 4) return 'medium'
  return 'low'
}

// ============================================================================
// Time-Based Heat Map (Hour x Day of Week Matrix)
// ============================================================================

interface TimeHeatMapProps {
  data: TimeMatrix | undefined
  isLoading?: boolean
  className?: string
}

/**
 * TimeHeatMap Component
 *
 * Displays a heat map matrix of incidents by hour and day of week.
 */
export function TimeHeatMap({ data, isLoading, className }: TimeHeatMapProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.totalIncidents === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Pattern Heat Map
          </CardTitle>
          <CardDescription>Near-miss patterns by time of day and day of week</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">
            No time pattern data available. Ensure incidents have time information.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Only show working hours (5 AM to 9 PM) for cleaner visualization
  const startHour = 5
  const endHour = 21
  const visibleHours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Time Pattern Heat Map
        </CardTitle>
        <CardDescription>
          {data.totalIncidents} incidents analyzed | Peak times highlighted
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-1 text-left font-medium text-muted-foreground">Hour</th>
                {DAY_OF_WEEK_SHORT.map((day) => (
                  <th key={day} className="p-1 text-center font-medium text-muted-foreground">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleHours.map(hour => (
                <tr key={hour}>
                  <td className="p-1 text-muted-foreground whitespace-nowrap">
                    {HOUR_LABELS[hour]}
                  </td>
                  {Array.from({ length: 7 }, (_, dayOfWeek) => {
                    const count = data.matrix[hour][dayOfWeek]
                    const intensity = data.maxValue > 0 ? count / data.maxValue : 0

                    return (
                      <td key={dayOfWeek} className="p-0.5">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'w-8 h-6 rounded flex items-center justify-center transition-colors',
                                  getHeatColor(intensity)
                                )}
                              >
                                {count > 0 && (
                                  <span className="text-[10px] font-medium">{count}</span>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {DAY_OF_WEEK_SHORT[dayOfWeek]} {HOUR_LABELS[hour]}: {count} incidents
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
          <span>Intensity:</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800" />
            <span>0</span>
          </div>
          <div className="w-16 h-4 rounded bg-gradient-to-r from-blue-100 via-blue-300 to-blue-600" />
          <span>{data.maxValue}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function getHeatColor(intensity: number): string {
  if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800'
  if (intensity < 0.25) return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
  if (intensity < 0.5) return 'bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200'
  if (intensity < 0.75) return 'bg-blue-400 dark:bg-blue-700/60 text-white'
  return 'bg-blue-600 dark:bg-blue-600 text-white'
}

// ============================================================================
// Risk Score Badge
// ============================================================================

interface RiskScoreBadgeProps {
  score: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function RiskScoreBadge({ score, showLabel = true, size = 'md' }: RiskScoreBadgeProps) {
  const riskLevel = getRiskLevelFromScore(score)

  const colors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }

  const sizes = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        colors[riskLevel],
        sizes[size]
      )}
    >
      <span>{score.toFixed(1)}</span>
      {showLabel && <span className="capitalize">{riskLevel}</span>}
    </span>
  )
}

function getRiskLevelFromScore(score: number): ZoneRiskLevel {
  if (score >= 50) return 'critical'
  if (score >= 25) return 'high'
  if (score >= 10) return 'medium'
  return 'low'
}

export default LocationHeatMap
