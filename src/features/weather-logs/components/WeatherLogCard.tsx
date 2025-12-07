// File: /src/features/weather-logs/components/WeatherLogCard.tsx
// Card component for displaying individual weather log

import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WeatherConditionsIcon, getWeatherConditionLabel } from './WeatherConditionsIcon'
import { WeatherImpactBadge } from './WeatherImpactBadge'
import {
  Calendar,
  ThermometerSun,
  Droplets,
  Wind,
  Clock,
  AlertTriangle,
  Eye,
} from 'lucide-react'
import { format } from 'date-fns'
import type { WeatherLog, Project } from '@/types/database-extensions'
import { cn } from '@/lib/utils'

interface WeatherLogCardProps {
  weatherLog: WeatherLog & { project?: Pick<Project, 'id' | 'name'> }
  showProject?: boolean
  className?: string
}

export function WeatherLogCard({ weatherLog, showProject = false, className = '' }: WeatherLogCardProps) {
  return (
    <Link to={`/weather-logs/${weatherLog.id}`}>
      <Card className={cn('hover:shadow-md transition-shadow cursor-pointer', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <WeatherConditionsIcon condition={weatherLog.conditions} className="w-8 h-8" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">
                    {getWeatherConditionLabel(weatherLog.conditions)}
                  </h3>
                  {weatherLog.work_stopped && (
                    <Badge variant="destructive" className="text-xs">
                      Work Stopped
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(weatherLog.log_date), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                {showProject && weatherLog.project && (
                  <div className="text-sm text-gray-600 mt-1">
                    Project: {weatherLog.project.name}
                  </div>
                )}
              </div>
            </div>
            <WeatherImpactBadge impact={weatherLog.work_impact} />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Temperature */}
          {(weatherLog.temperature_high !== null || weatherLog.temperature_low !== null) && (
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                {weatherLog.temperature_high !== null && weatherLog.temperature_low !== null ? (
                  <>
                    High: <span className="font-medium">{weatherLog.temperature_high}°F</span>
                    {' / '}
                    Low: <span className="font-medium">{weatherLog.temperature_low}°F</span>
                  </>
                ) : weatherLog.temperature_high !== null ? (
                  <>High: <span className="font-medium">{weatherLog.temperature_high}°F</span></>
                ) : (
                  <>Low: <span className="font-medium">{weatherLog.temperature_low}°F</span></>
                )}
              </span>
            </div>
          )}

          {/* Precipitation */}
          {weatherLog.precipitation_amount > 0 && (
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-700">
                {weatherLog.precipitation_amount}" {weatherLog.precipitation_type}
              </span>
            </div>
          )}

          {/* Wind */}
          {weatherLog.wind_speed !== null && (
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                {weatherLog.wind_speed} mph
                {weatherLog.wind_direction && ` ${weatherLog.wind_direction}`}
              </span>
            </div>
          )}

          {/* Hours Lost */}
          {weatherLog.hours_lost > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-700">
                <span className="font-medium">{weatherLog.hours_lost}</span> hours lost
              </span>
            </div>
          )}

          {/* Affected Activities */}
          {weatherLog.affected_activities.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {weatherLog.affected_activities.slice(0, 3).map((activity: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {activity}
                  </Badge>
                ))}
                {weatherLog.affected_activities.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{weatherLog.affected_activities.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Impact Notes Preview */}
          {weatherLog.impact_notes && (
            <div className="text-sm text-gray-600 line-clamp-2 pt-2 border-t">
              {weatherLog.impact_notes}
            </div>
          )}

          {/* Photo Count */}
          {weatherLog.photo_urls.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Eye className="w-4 h-4" />
              <span>{weatherLog.photo_urls.length} photo{weatherLog.photo_urls.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
