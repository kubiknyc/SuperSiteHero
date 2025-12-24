/**
 * Weather Widget
 * Displays current weather conditions and forecast
 */

import { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Cloud,
  CloudRain,
  Sun,
  Snowflake,
  Wind,
  Droplets,
  AlertTriangle,
} from 'lucide-react'
import { useWeatherForDate } from '@/features/daily-reports/hooks/useWeather'
import { cn } from '@/lib/utils'
import type { WidgetProps } from '@/types/dashboard'

export function WeatherWidget({
  projectId,
  config: _config,
  className,
}: WidgetProps) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const { data: weather, isLoading, error } = useWeatherForDate(projectId, today)

  const hasWeatherAlert = weather && (
    (weather.precipitation || 0) > 0.5 ||
    (weather.windSpeed || 0) > 20
  )

  if (isLoading) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !weather) {
    return (
      <Card className={cn('h-full', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            Weather data unavailable
          </div>
        </CardContent>
      </Card>
    )
  }

  const WeatherIcon = getWeatherIcon(weather.condition || 'Unknown')

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <WeatherIcon className="h-4 w-4" />
            Weather
          </CardTitle>
          {hasWeatherAlert && (
            <AlertTriangle className="h-4 w-4 text-warning" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main condition */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <WeatherIcon className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-semibold">
              {weather.condition || 'Unknown'}
            </p>
            {weather.temperatureHigh !== null && weather.temperatureLow !== null && (
              <p className="text-sm text-muted-foreground">
                {Math.round(weather.temperatureLow)}° - {Math.round(weather.temperatureHigh)}°F
              </p>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {weather.precipitation !== null && weather.precipitation > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
              <Droplets className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Precip</p>
                <p className="font-medium">{weather.precipitation.toFixed(2)}"</p>
              </div>
            </div>
          )}

          {weather.windSpeed !== null && weather.windSpeed > 0 && (
            <div className={cn(
              'flex items-center gap-2 p-2 rounded',
              weather.windSpeed > 20
                ? 'bg-warning-light dark:bg-amber-950/20'
                : 'bg-muted/50'
            )}>
              <Wind className={cn(
                'h-4 w-4',
                weather.windSpeed > 20 ? 'text-warning' : 'text-muted-foreground'
              )} />
              <div>
                <p className="text-xs text-muted-foreground">Wind</p>
                <p className="font-medium">{Math.round(weather.windSpeed)} mph</p>
              </div>
            </div>
          )}

          {weather.humidity !== null && (
            <div className="flex items-center gap-2 p-2 bg-muted/50 rounded">
              <Droplets className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Humidity</p>
                <p className="font-medium">{Math.round(weather.humidity)}%</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getWeatherIcon(condition: string) {
  const lower = condition.toLowerCase()

  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    return CloudRain
  }
  if (lower.includes('snow') || lower.includes('sleet') || lower.includes('ice')) {
    return Snowflake
  }
  if (lower.includes('cloud') || lower.includes('overcast')) {
    return Cloud
  }
  if (lower.includes('clear') || lower.includes('sunny')) {
    return Sun
  }

  return Cloud
}
