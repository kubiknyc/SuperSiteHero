/**
 * Weather Forecast Widget
 * Enhanced weather display with:
 * - Current conditions
 * - 5-day forecast
 * - Construction weather alerts (wind, rain, extreme temps)
 */

import { useState } from 'react'
import { useProjectWeather } from '../hooks/useWeatherForecast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  CloudFog,
  Thermometer,
  Droplets,
  Eye,
  Sunrise,
  Sunset,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  MapPin,
  Loader2,
} from 'lucide-react'
import type { WeatherIcon, ConstructionAlert } from '../hooks/useWeatherForecast'

interface WeatherForecastWidgetProps {
  projectId?: string
  className?: string
}

// Weather icon mapping component
function WeatherIconDisplay({
  icon,
  size = 'md',
  className,
}: {
  icon: WeatherIcon
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }
  const iconClass = cn(sizeClasses[size], className)

  switch (icon) {
    case 'clear-day':
      return <Sun className={cn(iconClass, 'text-yellow-500')} />
    case 'clear-night':
      return <Sun className={cn(iconClass, 'text-indigo-400')} />
    case 'partly-cloudy-day':
    case 'partly-cloudy-night':
      return <Cloud className={cn(iconClass, 'text-gray-400')} />
    case 'cloudy':
      return <Cloud className={cn(iconClass, 'text-gray-500')} />
    case 'rain':
    case 'showers':
      return <CloudRain className={cn(iconClass, 'text-blue-500')} />
    case 'snow':
      return <CloudSnow className={cn(iconClass, 'text-blue-300')} />
    case 'thunderstorm':
      return <CloudLightning className={cn(iconClass, 'text-purple-500')} />
    case 'fog':
      return <CloudFog className={cn(iconClass, 'text-gray-400')} />
    case 'wind':
      return <Wind className={cn(iconClass, 'text-gray-500')} />
    default:
      return <Sun className={cn(iconClass, 'text-yellow-500')} />
  }
}

// Alert severity colors
const alertSeverityStyles: Record<ConstructionAlert['severity'], { bg: string; text: string; border: string }> = {
  advisory: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  danger: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
}

export function WeatherForecastWidget({ projectId, className }: WeatherForecastWidgetProps) {
  const { data: weather, isLoading, error, refetch, isFetching } = useProjectWeather(projectId)
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [expandedForecast, setExpandedForecast] = useState(false)

  if (isLoading) {
    return (
      <div className={cn('bg-white rounded-xl border border-slate-200 p-6', className)}>
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-16 h-16 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className={cn('bg-white rounded-xl border border-slate-200 p-6', className)}>
        <div className="text-center py-8">
          <Cloud className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-slate-600">Unable to load weather</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  const { current, forecast, alerts, location, lastUpdated } = weather

  // Get visible alerts
  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 2)
  const hasMoreAlerts = alerts.length > 2

  // Forecast to show
  const visibleForecast = expandedForecast ? forecast : forecast.slice(0, 5)

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-blue-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {location.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Current Weather */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <WeatherIconDisplay icon={current.icon} size="lg" />
            <div>
              <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                {Math.round(current.temperature)}°F
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {current.condition}
              </p>
            </div>
          </div>

          {/* Current Stats */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Thermometer className="w-4 h-4" />
              <span>Feels like {Math.round(current.feelsLike)}°</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Wind className="w-4 h-4" />
              <span>{Math.round(current.windSpeed)} mph</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Droplets className="w-4 h-4" />
              <span>{current.humidity}% humidity</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Sun className="w-4 h-4" />
              <span>UV {current.uvIndex}</span>
            </div>
          </div>
        </div>

        {/* Construction Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Construction Alerts
              </h4>
              {hasMoreAlerts && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                >
                  {showAllAlerts ? (
                    <>Show Less <ChevronUp className="w-3 h-3 ml-1" /></>
                  ) : (
                    <>+{alerts.length - 2} More <ChevronDown className="w-3 h-3 ml-1" /></>
                  )}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {visibleAlerts.map((alert) => {
                const styles = alertSeverityStyles[alert.severity]
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      styles.bg,
                      styles.border
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={cn('w-4 h-4 mt-0.5 flex-shrink-0', styles.text)} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-semibold', styles.text)}>
                            {alert.title}
                          </span>
                          <Badge variant="outline" className={cn('text-[10px]', styles.text)}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className={cn('text-xs mt-0.5', styles.text.replace('700', '600'))}>
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 5-Day Forecast */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              5-Day Forecast
            </h4>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {visibleForecast.map((day) => (
              <div
                key={day.dayName}
                className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center border border-slate-100 dark:border-slate-700"
              >
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {day.dayName}
                </p>
                <WeatherIconDisplay icon={day.icon} size="sm" className="mx-auto mb-2" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {Math.round(day.high)}°
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {Math.round(day.low)}°
                  </p>
                </div>
                {day.precipitationProbability > 30 && (
                  <div className="flex items-center justify-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400">
                    <Droplets className="w-3 h-3" />
                    {day.precipitationProbability}%
                  </div>
                )}
                {day.windSpeedMax > 20 && (
                  <div className="flex items-center justify-center gap-1 mt-1 text-xs text-amber-600 dark:text-amber-400">
                    <Wind className="w-3 h-3" />
                    {Math.round(day.windSpeedMax)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sunrise/Sunset */}
        {forecast[0] && (
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Sunrise className="w-4 h-4 text-orange-500" />
              <span>
                {format(new Date(forecast[0].sunrise), 'h:mm a')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Sunset className="w-4 h-4 text-orange-600" />
              <span>
                {format(new Date(forecast[0].sunset), 'h:mm a')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Last updated: {format(lastUpdated, 'h:mm a')}
        </p>
      </div>
    </div>
  )
}

export default WeatherForecastWidget
