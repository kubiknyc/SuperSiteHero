// File: /src/pages/weather-logs/WeatherLogDetailPage.tsx
// Detailed view of a single weather log

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useWeatherLog, useDeleteWeatherLog } from '@/features/weather-logs/hooks/useWeatherLogs'
import { WeatherLogFormDialog } from '@/features/weather-logs/components/WeatherLogFormDialog'
import { WeatherConditionsIcon, getWeatherConditionLabel } from '@/features/weather-logs/components/WeatherConditionsIcon'
import { WeatherImpactBadge } from '@/features/weather-logs/components/WeatherImpactBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/notifications/ToastContext'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  ThermometerSun,
  Droplets,
  Wind,
  Clock,
  AlertTriangle,
  Shield,
  MapPin,
  User,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export function WeatherLogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: weatherLog, isLoading, error } = useWeatherLog(id)
  const deleteMutation = useDeleteWeatherLog()

  const handleDelete = async () => {
    if (!id) {return}

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Weather log deleted successfully', 'The weather log has been deleted.')
      navigate('/weather-logs')
    } catch (_error) {
      toast.error('Failed to delete weather log', 'Please try again.')
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-secondary">Loading weather log...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !weatherLog) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">Weather Log Not Found</h3>
              <p className="text-secondary mb-4">
                The weather log you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button onClick={() => navigate('/weather-logs')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Weather Logs
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        {/* Header */}
        <div className="bg-card border-b px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/weather-logs')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <WeatherConditionsIcon condition={weatherLog.conditions} className="w-8 h-8" />
                <div>
                  <h1 className="text-2xl font-bold text-foreground heading-page">
                    {getWeatherConditionLabel(weatherLog.conditions)}
                  </h1>
                  <p className="text-sm text-secondary">
                    {format(new Date(weatherLog.log_date), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-error hover:text-error-dark hover:bg-error-light"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </Button>
            </div>
          </div>

          {/* Project and Impact */}
          <div className="flex items-center gap-4">
            <Link
              to={`/projects/${weatherLog.project.id}`}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover"
            >
              <MapPin className="w-4 h-4" />
              {weatherLog.project.name}
            </Link>
            <WeatherImpactBadge impact={weatherLog.work_impact} />
            {weatherLog.work_stopped && (
              <Badge variant="destructive">Work Stopped</Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Weather Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Weather Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Temperature */}
                {(weatherLog.temperature_high !== null || weatherLog.temperature_low !== null) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ThermometerSun className="w-5 h-5 text-orange-500" />
                      <span className="font-medium">Temperature</span>
                    </div>
                    <div className="space-y-1">
                      {weatherLog.temperature_high !== null && (
                        <p className="text-sm text-secondary">
                          High: <span className="font-semibold text-lg">{weatherLog.temperature_high}°F</span>
                        </p>
                      )}
                      {weatherLog.temperature_low !== null && (
                        <p className="text-sm text-secondary">
                          Low: <span className="font-semibold text-lg">{weatherLog.temperature_low}°F</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Precipitation */}
                {weatherLog.precipitation_amount > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="w-5 h-5 text-primary" />
                      <span className="font-medium">Precipitation</span>
                    </div>
                    <p className="text-sm text-secondary">
                      <span className="font-semibold text-lg">{weatherLog.precipitation_amount}"</span>
                      {' '}
                      <span className="capitalize">{weatherLog.precipitation_type}</span>
                    </p>
                  </div>
                )}

                {/* Wind */}
                {weatherLog.wind_speed !== null && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Wind className="w-5 h-5 text-muted" />
                      <span className="font-medium">Wind</span>
                    </div>
                    <p className="text-sm text-secondary">
                      <span className="font-semibold text-lg">{weatherLog.wind_speed} mph</span>
                      {weatherLog.wind_direction && (
                        <>
                          {' '}
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {weatherLog.wind_direction}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                )}

                {/* Humidity */}
                {weatherLog.humidity_percent !== null && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="w-5 h-5 text-blue-400" />
                      <span className="font-medium">Humidity</span>
                    </div>
                    <p className="text-sm text-secondary">
                      <span className="font-semibold text-lg">{weatherLog.humidity_percent}%</span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Work Impact */}
          {weatherLog.work_impact !== 'none' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Work Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-secondary">Impact Level:</span>
                    <div className="mt-1">
                      <WeatherImpactBadge impact={weatherLog.work_impact} />
                    </div>
                  </div>

                  {weatherLog.hours_lost > 0 && (
                    <div>
                      <span className="text-sm text-secondary">Hours Lost:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span className="font-semibold text-lg">{weatherLog.hours_lost}</span>
                      </div>
                    </div>
                  )}

                  {weatherLog.work_stopped && (
                    <Badge variant="destructive" className="h-fit">
                      Work Completely Stopped
                    </Badge>
                  )}
                </div>

                {/* Impact Notes */}
                {weatherLog.impact_notes && (
                  <div>
                    <h4 className="text-sm font-medium text-secondary mb-2 heading-card">Impact Notes:</h4>
                    <p className="text-sm text-secondary whitespace-pre-wrap bg-surface p-3 rounded-md">
                      {weatherLog.impact_notes}
                    </p>
                  </div>
                )}

                {/* Affected Activities */}
                {weatherLog.affected_activities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-secondary mb-2 heading-card">Affected Activities:</h4>
                    <div className="flex flex-wrap gap-2">
                      {weatherLog.affected_activities.map((activity, index) => (
                        <Badge key={index} variant="outline">
                          {activity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Safety Concerns */}
          {weatherLog.safety_concerns && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <Shield className="w-5 h-5 text-orange-600" />
                  Safety Concerns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-900 whitespace-pre-wrap">
                  {weatherLog.safety_concerns}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {weatherLog.photo_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Weather Photos ({weatherLog.photo_urls.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {weatherLog.photo_urls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg overflow-hidden border hover:border-blue-500 transition-colors"
                    >
                      <img
                        src={url}
                        alt={`Weather photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Log Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-secondary">Recorded By:</span>
                  <p className="font-medium">
                    {weatherLog.recorded_by_user.first_name} {weatherLog.recorded_by_user.last_name}
                  </p>
                </div>
                <div>
                  <span className="text-secondary">Created:</span>
                  <p className="font-medium">
                    {format(new Date(weatherLog.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {weatherLog.updated_at !== weatherLog.created_at && (
                  <div>
                    <span className="text-secondary">Last Updated:</span>
                    <p className="font-medium">
                      {format(new Date(weatherLog.updated_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      {weatherLog && (
        <WeatherLogFormDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          projectId={weatherLog.project_id}
          weatherLog={weatherLog}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle>Delete Weather Log?</CardTitle>
              <CardDescription>
                Are you sure you want to delete this weather log? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  )
}
