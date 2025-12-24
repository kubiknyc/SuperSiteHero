/**
 * Weather Display Component
 * Shows weather conditions for daily reports
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudSun,
  CloudDrizzle,
  Wind,
  Droplets,
  Thermometer,
  RefreshCw,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Snowflake,
} from 'lucide-react'
import { useWeatherForDate, type ExtendedWeatherData } from '../hooks/useWeather'
import {
  formatTemperature,
  formatPrecipitation,
  formatWindSpeed,
  formatHumidity,
  isWorkableWeather,
} from '@/types/weather'
import { cn } from '@/lib/utils'

interface WeatherDisplayProps {
  projectId: string
  date: string
  coordinates?: { latitude: number; longitude: number }
  onWeatherLoad?: (weather: ExtendedWeatherData) => void
  compact?: boolean
  showWorkability?: boolean
  className?: string
}

// Icon mapping based on condition
function getWeatherIconComponent(condition: string) {
  const lowerCondition = condition.toLowerCase()

  if (lowerCondition.includes('thunder')) {return CloudLightning}
  if (lowerCondition.includes('snow') || lowerCondition.includes('sleet')) {return CloudSnow}
  if (lowerCondition.includes('rain') || lowerCondition.includes('shower')) {return CloudRain}
  if (lowerCondition.includes('drizzle')) {return CloudDrizzle}
  if (lowerCondition.includes('fog') || lowerCondition.includes('mist')) {return CloudFog}
  if (lowerCondition.includes('cloudy') || lowerCondition.includes('overcast')) {return Cloud}
  if (lowerCondition.includes('partly')) {return CloudSun}
  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) {return Sun}

  return Cloud
}

function getWeatherIconColor(condition: string): string {
  const lowerCondition = condition.toLowerCase()

  if (lowerCondition.includes('thunder')) {return 'text-purple-500'}
  if (lowerCondition.includes('snow')) {return 'text-blue-300'}
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {return 'text-primary'}
  if (lowerCondition.includes('fog')) {return 'text-disabled'}
  if (lowerCondition.includes('overcast') || lowerCondition.includes('cloudy')) {return 'text-muted'}
  if (lowerCondition.includes('clear') || lowerCondition.includes('sunny')) {return 'text-warning'}

  return 'text-muted'
}

/**
 * Compact weather badge for inline use
 */
export function WeatherBadge({
  weather,
  className,
}: {
  weather: ExtendedWeatherData
  className?: string
}) {
  const IconComponent = getWeatherIconComponent(weather.condition)
  const iconColor = getWeatherIconColor(weather.condition)

  return (
    <Badge variant="outline" className={cn('gap-1', className)}>
      <IconComponent className={cn('h-3 w-3', iconColor)} />
      {weather.condition}
      {weather.temperatureHigh && (
        <span className="ml-1">
          {formatTemperature(weather.temperatureHigh)}
        </span>
      )}
    </Badge>
  )
}

/**
 * Weather summary row for tables/lists
 */
export function WeatherSummaryRow({
  weather,
  showDate = false,
}: {
  weather: ExtendedWeatherData
  showDate?: boolean
}) {
  const IconComponent = getWeatherIconComponent(weather.condition)
  const iconColor = getWeatherIconColor(weather.condition)

  return (
    <div className="flex items-center gap-4 text-sm">
      {showDate && (
        <span className="text-muted-foreground w-24">
          {new Date(weather.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )}
      <div className="flex items-center gap-2 min-w-[120px]">
        <IconComponent className={cn('h-4 w-4', iconColor)} />
        <span>{weather.condition}</span>
      </div>
      <div className="flex items-center gap-1">
        <Thermometer className="h-3 w-3 text-error" />
        <span>
          {formatTemperature(weather.temperatureHigh)} / {formatTemperature(weather.temperatureLow)}
        </span>
      </div>
      {weather.precipitation != null && weather.precipitation > 0 && (
        <div className="flex items-center gap-1">
          <Droplets className="h-3 w-3 text-primary" />
          <span>{formatPrecipitation(weather.precipitation)}</span>
        </div>
      )}
      {weather.windSpeed != null && (
        <div className="flex items-center gap-1">
          <Wind className="h-3 w-3 text-muted" />
          <span>{formatWindSpeed(weather.windSpeed)}</span>
        </div>
      )}
    </div>
  )
}

/**
 * Main weather display card
 */
export function WeatherDisplay({
  projectId,
  date,
  coordinates,
  onWeatherLoad,
  compact = false,
  showWorkability = true,
  className,
}: WeatherDisplayProps) {
  const {
    data: weather,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useWeatherForDate(projectId, date, coordinates)

  // Notify parent when weather loads
  if (weather && onWeatherLoad) {
    onWeatherLoad(weather)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load weather data</span>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (!weather) {
    return null
  }

  const IconComponent = getWeatherIconComponent(weather.condition)
  const iconColor = getWeatherIconColor(weather.condition)
  const workability = isWorkableWeather({
    date: weather.date,
    condition: weather.condition,
    conditionCode: weather.conditionCode,
    icon: weather.icon,
    temperatureHigh: weather.temperatureHigh,
    temperatureLow: weather.temperatureLow,
    temperatureAvg: weather.temperatureAvg,
    precipitation: weather.precipitation,
    precipitationProbability: null,
    windSpeed: weather.windSpeed,
    humidity: weather.humidity,
    uvIndex: null,
    sunrise: null,
    sunset: null,
  })

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-3 bg-muted/50 rounded-lg', className)}>
        <IconComponent className={cn('h-8 w-8', iconColor)} />
        <div>
          <p className="font-medium text-sm">{weather.condition}</p>
          <p className="text-xs text-muted-foreground">
            {formatTemperature(weather.temperatureHigh)} / {formatTemperature(weather.temperatureLow)}
          </p>
        </div>
        {showWorkability && (
          <div className="ml-auto">
            {workability.workable ? (
              <Badge className="bg-success-light text-success-dark">
                <CheckCircle className="h-3 w-3 mr-1" />
                Workable
              </Badge>
            ) : (
              <Badge className="bg-error-light text-error-dark">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Caution
              </Badge>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Weather Conditions
          </span>
          <div className="flex items-center gap-2">
            {weather.isCached && (
              <Badge variant="outline" className="text-xs">
                Cached
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main weather display */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'p-4 rounded-full',
              weather.condition.toLowerCase().includes('rain')
                ? 'bg-info-light'
                : weather.condition.toLowerCase().includes('snow')
                  ? 'bg-blue-50'
                  : weather.condition.toLowerCase().includes('clear')
                    ? 'bg-warning-light'
                    : 'bg-muted'
            )}
          >
            <IconComponent className={cn('h-10 w-10', iconColor)} />
          </div>
          <div>
            <p className="text-2xl font-bold">{weather.condition}</p>
            <p className="text-muted-foreground text-sm">
              {new Date(weather.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Weather details grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Temperature */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Thermometer className="h-5 w-5 text-error" />
            <div>
              <p className="text-xs text-muted-foreground">High / Low</p>
              <p className="font-medium">
                {formatTemperature(weather.temperatureHigh)} /{' '}
                {formatTemperature(weather.temperatureLow)}
              </p>
            </div>
          </div>

          {/* Precipitation */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Droplets className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Precipitation</p>
              <p className="font-medium">{formatPrecipitation(weather.precipitation)}</p>
            </div>
          </div>

          {/* Wind */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Wind className="h-5 w-5 text-muted" />
            <div>
              <p className="text-xs text-muted-foreground">Wind Speed</p>
              <p className="font-medium">{formatWindSpeed(weather.windSpeed)}</p>
            </div>
          </div>

          {/* Humidity */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Droplets className="h-5 w-5 text-cyan-500" />
            <div>
              <p className="text-xs text-muted-foreground">Humidity</p>
              <p className="font-medium">{formatHumidity(weather.humidity)}</p>
            </div>
          </div>
        </div>

        {/* Workability Alert */}
        {showWorkability && (
          <Alert
            className={cn(
              workability.workable
                ? 'border-green-200 bg-success-light'
                : 'border-red-200 bg-error-light'
            )}
          >
            {workability.workable ? (
              <>
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-green-800">
                  Weather conditions are suitable for outdoor work
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-error" />
                <AlertDescription className="text-red-800">
                  {workability.reason || 'Weather conditions may impact work'}
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        {/* Last updated */}
        {weather.fetchedAt && (
          <p className="text-xs text-muted-foreground text-right">
            Last updated:{' '}
            {new Date(weather.fetchedAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default WeatherDisplay
