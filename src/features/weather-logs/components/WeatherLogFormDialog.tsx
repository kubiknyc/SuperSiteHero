// File: /src/features/weather-logs/components/WeatherLogFormDialog.tsx
// Form dialog for creating and editing weather logs

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/lib/notifications/ToastContext'
import { useCreateWeatherLog, useUpdateWeatherLog, useWeatherLogByDate } from '../hooks/useWeatherLogs'
import { useProjectLocation } from '@/features/daily-reports/hooks/useWeather'
import { getWeatherForLocation, getCurrentLocation } from '@/features/daily-reports/services/weatherService'
import type { WeatherLog, WeatherCondition, PrecipitationType, WindDirection, WorkImpact } from '@/types/database-extensions'
import { format } from 'date-fns'
import { Loader2, MapPin, X } from 'lucide-react'

// Map Open-Meteo text conditions to WeatherCondition enum values
function mapWeatherConditionToEnum(condition: string): WeatherCondition {
  const lower = condition.toLowerCase()
  if (lower.includes('clear') || lower.includes('sunny')) {return 'sunny'}
  if (lower.includes('partly')) {return 'partly_cloudy'}
  if (lower.includes('overcast')) {return 'overcast'}
  if (lower.includes('fog')) {return 'fog'}
  if (lower.includes('drizzle')) {return 'drizzle'}
  if (lower.includes('heavy rain') || lower.includes('violent')) {return 'heavy_rain'}
  if (lower.includes('rain') || lower.includes('shower')) {return 'rain'}
  if (lower.includes('heavy snow')) {return 'heavy_snow'}
  if (lower.includes('snow')) {return 'snow'}
  if (lower.includes('sleet')) {return 'sleet'}
  if (lower.includes('hail')) {return 'hail'}
  if (lower.includes('thunderstorm')) {return 'thunderstorm'}
  if (lower.includes('storm')) {return 'storm'}
  if (lower.includes('wind')) {return 'wind'}
  return 'cloudy' // default
}

// Map weather condition string to precipitation type
function mapConditionToPrecipType(condition: string, hasPrecp: boolean): PrecipitationType {
  if (!hasPrecp) {return 'none'}
  const lower = condition.toLowerCase()
  if (lower.includes('snow')) {return 'snow'}
  if (lower.includes('sleet')) {return 'sleet'}
  if (lower.includes('hail')) {return 'hail'}
  return 'rain'
}

interface WeatherLogFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  weatherLog?: WeatherLog
  defaultDate?: string
}

const weatherConditions: { value: WeatherCondition; label: string }[] = [
  { value: 'sunny', label: 'Sunny' },
  { value: 'partly_cloudy', label: 'Partly Cloudy' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'overcast', label: 'Overcast' },
  { value: 'drizzle', label: 'Drizzle' },
  { value: 'rain', label: 'Rain' },
  { value: 'heavy_rain', label: 'Heavy Rain' },
  { value: 'snow', label: 'Snow' },
  { value: 'heavy_snow', label: 'Heavy Snow' },
  { value: 'sleet', label: 'Sleet' },
  { value: 'hail', label: 'Hail' },
  { value: 'fog', label: 'Fog' },
  { value: 'wind', label: 'Windy' },
  { value: 'storm', label: 'Storm' },
  { value: 'thunderstorm', label: 'Thunderstorm' },
]

const precipitationTypes: { value: PrecipitationType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'rain', label: 'Rain' },
  { value: 'snow', label: 'Snow' },
  { value: 'sleet', label: 'Sleet' },
  { value: 'hail', label: 'Hail' },
  { value: 'mixed', label: 'Mixed' },
]

const windDirections: { value: Exclude<WindDirection, null>; label: string }[] = [
  { value: 'N', label: 'N' },
  { value: 'NE', label: 'NE' },
  { value: 'E', label: 'E' },
  { value: 'SE', label: 'SE' },
  { value: 'S', label: 'S' },
  { value: 'SW', label: 'SW' },
  { value: 'W', label: 'W' },
  { value: 'NW', label: 'NW' },
  { value: 'variable', label: 'Variable' },
]

const workImpactLevels: { value: WorkImpact; label: string }[] = [
  { value: 'none', label: 'No Impact' },
  { value: 'minor', label: 'Minor Impact' },
  { value: 'moderate', label: 'Moderate Impact' },
  { value: 'severe', label: 'Severe Impact' },
]

const commonActivities = [
  'Concrete Pouring',
  'Framing',
  'Roofing',
  'Exterior Painting',
  'Site Work',
  'Excavation',
  'Foundation Work',
  'Masonry',
  'HVAC Installation',
  'Electrical Work',
  'Plumbing',
  'Drywall',
  'Flooring',
]

export function WeatherLogFormDialog({
  open,
  onOpenChange,
  projectId,
  weatherLog,
  defaultDate,
}: WeatherLogFormDialogProps) {
  const toast = useToast()
  const createMutation = useCreateWeatherLog()
  const updateMutation = useUpdateWeatherLog()

  const isEditing = !!weatherLog

  // Project location for weather fetching
  const { data: projectLocation } = useProjectLocation(projectId)

  // Weather auto-fetch state
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)
  const [weatherFetched, setWeatherFetched] = useState(false)

  // Form state
  const [logDate, setLogDate] = useState(
    weatherLog?.log_date || defaultDate || format(new Date(), 'yyyy-MM-dd')
  )
  const [tempHigh, setTempHigh] = useState(weatherLog?.temperature_high?.toString() || '')
  const [tempLow, setTempLow] = useState(weatherLog?.temperature_low?.toString() || '')
  const [conditions, setConditions] = useState<WeatherCondition>(weatherLog?.conditions || 'sunny')
  const [precipAmount, setPrecipAmount] = useState(weatherLog?.precipitation_amount?.toString() || '0')
  const [precipType, setPrecipType] = useState<PrecipitationType>(weatherLog?.precipitation_type || 'none')
  const [windSpeed, setWindSpeed] = useState(weatherLog?.wind_speed?.toString() || '')
  const [windDir, setWindDir] = useState<string>(weatherLog?.wind_direction ?? '')
  const [humidity, setHumidity] = useState(weatherLog?.humidity_percent?.toString() || '')
  const [workImpact, setWorkImpact] = useState<WorkImpact>(weatherLog?.work_impact || 'none')
  const [impactNotes, setImpactNotes] = useState(weatherLog?.impact_notes || '')
  const [workStopped, setWorkStopped] = useState(weatherLog?.work_stopped || false)
  const [hoursLost, setHoursLost] = useState(weatherLog?.hours_lost?.toString() || '0')
  const [selectedActivities, setSelectedActivities] = useState<string[]>(weatherLog?.affected_activities || [])
  const [safetyConcerns, setSafetyConcerns] = useState(weatherLog?.safety_concerns || '')

  // Check for existing log on this date (for create mode)
  const { data: existingLog } = useWeatherLogByDate(
    !isEditing ? projectId : undefined,
    !isEditing ? logDate : undefined
  )

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Use setTimeout to avoid synchronous state update in effect
      setTimeout(() => {
        setErrors({})
        setWeatherFetched(false)
      }, 0)
    }
  }, [open])

  // Fetch weather data from API
  const handleFetchWeather = useCallback(async () => {
    setIsLoadingWeather(true)
    try {
      let lat: number, lon: number

      // Prefer project location, fall back to GPS
      if (projectLocation?.latitude && projectLocation?.longitude) {
        lat = projectLocation.latitude
        lon = projectLocation.longitude
      } else {
        const location = await getCurrentLocation()
        lat = location.lat
        lon = location.lon
      }

      const weatherData = await getWeatherForLocation(lat, lon, logDate)

      // Map weather service data to form fields
      setConditions(mapWeatherConditionToEnum(weatherData.weather_condition))
      setTempHigh(Math.round(weatherData.temperature_high).toString())
      setTempLow(Math.round(weatherData.temperature_low).toString())
      setPrecipAmount(weatherData.precipitation.toString())
      setWindSpeed(Math.round(weatherData.wind_speed).toString())

      // Set precipitation type based on condition
      setPrecipType(mapConditionToPrecipType(weatherData.weather_condition, weatherData.precipitation > 0))

      setWeatherFetched(true)
      toast.success('Weather data loaded', projectLocation?.latitude
        ? `Loaded from project location`
        : 'Loaded from your current location')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch weather'
      toast.error('Weather fetch failed', message)
    } finally {
      setIsLoadingWeather(false)
    }
  }, [projectLocation, logDate, toast])

  // Auto-fetch weather when creating a new log
  useEffect(() => {
    if (open && !isEditing && !weatherFetched && !isLoadingWeather) {
      handleFetchWeather()
    }
  }, [open, isEditing, weatherFetched, isLoadingWeather, handleFetchWeather])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!logDate) {
      newErrors.logDate = 'Date is required'
    }

    if (!conditions) {
      newErrors.conditions = 'Weather condition is required'
    }

    if (tempHigh && tempLow) {
      const high = parseInt(tempHigh)
      const low = parseInt(tempLow)
      if (low > high) {
        newErrors.tempLow = 'Low temperature cannot be higher than high temperature'
      }
    }

    if (tempHigh && (parseInt(tempHigh) < -50 || parseInt(tempHigh) > 150)) {
      newErrors.tempHigh = 'Temperature must be between -50°F and 150°F'
    }

    if (tempLow && (parseInt(tempLow) < -50 || parseInt(tempLow) > 150)) {
      newErrors.tempLow = 'Temperature must be between -50°F and 150°F'
    }

    if (precipAmount && parseFloat(precipAmount) < 0) {
      newErrors.precipAmount = 'Precipitation cannot be negative'
    }

    if (windSpeed && (parseInt(windSpeed) < 0 || parseInt(windSpeed) > 200)) {
      newErrors.windSpeed = 'Wind speed must be between 0 and 200 mph'
    }

    if (humidity && (parseInt(humidity) < 0 || parseInt(humidity) > 100)) {
      newErrors.humidity = 'Humidity must be between 0 and 100%'
    }

    if (hoursLost && parseFloat(hoursLost) < 0) {
      newErrors.hoursLost = 'Hours lost cannot be negative'
    }

    // Check for duplicate log (create mode only)
    if (!isEditing && existingLog) {
      newErrors.logDate = 'A weather log already exists for this date'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const weatherLogData = {
      project_id: projectId,
      log_date: logDate,
      conditions,
      temperature_high: tempHigh ? parseInt(tempHigh) : null,
      temperature_low: tempLow ? parseInt(tempLow) : null,
      precipitation_amount: parseFloat(precipAmount) || 0,
      precipitation_type: precipType,
      wind_speed: windSpeed ? parseInt(windSpeed) : null,
      wind_direction: (windDir || null) as WindDirection,
      humidity_percent: humidity ? parseInt(humidity) : null,
      work_impact: workImpact,
      impact_notes: impactNotes || null,
      work_stopped: workStopped,
      hours_lost: parseFloat(hoursLost) || 0,
      affected_activities: selectedActivities,
      safety_concerns: safetyConcerns || null,
      photo_urls: weatherLog?.photo_urls || [],
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: weatherLog.id, ...weatherLogData })
        toast.success('Weather log updated successfully', 'The weather log has been updated.')
      } else {
        await createMutation.mutateAsync(weatherLogData)
        toast.success('Weather log created successfully', 'The weather log has been created.')
      }
      onOpenChange(false)
    } catch (_error) {
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} weather log`, 'Please try again.')
    }
  }

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity]
    )
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isEditing ? 'Edit Weather Log' : 'Create Weather Log'}</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <DialogDescription>
            {isEditing
              ? 'Update the weather conditions and their impact on work'
              : 'Record daily weather conditions and their impact on construction activities'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date and Auto-fetch */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="logDate">Date *</Label>
              <Input
                id="logDate"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                required
              />
              {errors.logDate && <p className="text-sm text-error mt-1">{errors.logDate}</p>}
            </div>

            {/* Auto-fill Weather Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchWeather}
                disabled={isLoadingWeather}
                className="gap-2"
              >
                {isLoadingWeather ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                {isLoadingWeather ? 'Fetching weather...' : 'Refresh Weather Data'}
              </Button>
            </div>
          </div>

          {/* Weather Conditions */}
          <div>
            <Label htmlFor="conditions">Weather Conditions *</Label>
            <Select
              id="conditions"
              value={conditions}
              onChange={(e) => setConditions(e.target.value as WeatherCondition)}
              required
            >
              {weatherConditions.map((cond) => (
                <option key={cond.value} value={cond.value}>
                  {cond.label}
                </option>
              ))}
            </Select>
            {errors.conditions && <p className="text-sm text-error mt-1">{errors.conditions}</p>}
          </div>

          {/* Temperature */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tempHigh">High Temperature (°F)</Label>
              <Input
                id="tempHigh"
                type="number"
                value={tempHigh}
                onChange={(e) => setTempHigh(e.target.value)}
                placeholder="e.g., 72"
                min="-50"
                max="150"
              />
              {errors.tempHigh && <p className="text-sm text-error mt-1">{errors.tempHigh}</p>}
            </div>
            <div>
              <Label htmlFor="tempLow">Low Temperature (°F)</Label>
              <Input
                id="tempLow"
                type="number"
                value={tempLow}
                onChange={(e) => setTempLow(e.target.value)}
                placeholder="e.g., 55"
                min="-50"
                max="150"
              />
              {errors.tempLow && <p className="text-sm text-error mt-1">{errors.tempLow}</p>}
            </div>
          </div>

          {/* Precipitation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="precipAmount">Precipitation (inches)</Label>
              <Input
                id="precipAmount"
                type="number"
                step="0.01"
                value={precipAmount}
                onChange={(e) => setPrecipAmount(e.target.value)}
                placeholder="0.00"
                min="0"
              />
              {errors.precipAmount && <p className="text-sm text-error mt-1">{errors.precipAmount}</p>}
            </div>
            <div>
              <Label htmlFor="precipType">Precipitation Type</Label>
              <Select
                id="precipType"
                value={precipType}
                onChange={(e) => setPrecipType(e.target.value as PrecipitationType)}
              >
                {precipitationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Wind */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="windSpeed">Wind Speed (mph)</Label>
              <Input
                id="windSpeed"
                type="number"
                value={windSpeed}
                onChange={(e) => setWindSpeed(e.target.value)}
                placeholder="e.g., 15"
                min="0"
                max="200"
              />
              {errors.windSpeed && <p className="text-sm text-error mt-1">{errors.windSpeed}</p>}
            </div>
            <div>
              <Label htmlFor="windDir">Wind Direction</Label>
              <Select
                id="windDir"
                value={windDir || ''}
                onChange={(e) => setWindDir(e.target.value)}
              >
                <option value="">Select direction</option>
                {windDirections.map((dir) => (
                  <option key={dir.value} value={dir.value}>
                    {dir.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Humidity */}
          <div>
            <Label htmlFor="humidity">Humidity (%)</Label>
            <Input
              id="humidity"
              type="number"
              value={humidity}
              onChange={(e) => setHumidity(e.target.value)}
              placeholder="e.g., 65"
              min="0"
              max="100"
            />
            {errors.humidity && <p className="text-sm text-error mt-1">{errors.humidity}</p>}
          </div>

          {/* Work Impact */}
          <div>
            <Label htmlFor="workImpact">Work Impact Level *</Label>
            <Select
              id="workImpact"
              value={workImpact}
              onChange={(e) => setWorkImpact(e.target.value as WorkImpact)}
              required
            >
              {workImpactLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Impact Notes */}
          <div>
            <Label htmlFor="impactNotes">Impact Notes</Label>
            <Textarea
              id="impactNotes"
              value={impactNotes}
              onChange={(e) => setImpactNotes(e.target.value)}
              placeholder="Describe how weather impacted work..."
              rows={3}
            />
          </div>

          {/* Work Stopped */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="workStopped"
              checked={workStopped}
              onCheckedChange={(checked) => setWorkStopped(checked as boolean)}
            />
            <Label htmlFor="workStopped" className="cursor-pointer">
              Work was completely stopped due to weather
            </Label>
          </div>

          {/* Hours Lost */}
          {(workStopped || workImpact !== 'none') && (
            <div>
              <Label htmlFor="hoursLost">Hours Lost</Label>
              <Input
                id="hoursLost"
                type="number"
                step="0.5"
                value={hoursLost}
                onChange={(e) => setHoursLost(e.target.value)}
                placeholder="0.0"
                min="0"
              />
              {errors.hoursLost && <p className="text-sm text-error mt-1">{errors.hoursLost}</p>}
            </div>
          )}

          {/* Affected Activities */}
          {workImpact !== 'none' && (
            <div>
              <Label>Affected Activities</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                {commonActivities.map((activity) => (
                  <div key={activity} className="flex items-center space-x-2">
                    <Checkbox
                      id={`activity-${activity}`}
                      checked={selectedActivities.includes(activity)}
                      onCheckedChange={() => toggleActivity(activity)}
                    />
                    <Label htmlFor={`activity-${activity}`} className="cursor-pointer text-sm">
                      {activity}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Concerns */}
          <div>
            <Label htmlFor="safetyConcerns">Safety Concerns</Label>
            <Textarea
              id="safetyConcerns"
              value={safetyConcerns}
              onChange={(e) => setSafetyConcerns(e.target.value)}
              placeholder="Any safety concerns related to weather conditions..."
              rows={2}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Weather Log' : 'Create Weather Log'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
