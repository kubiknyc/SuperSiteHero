import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { ChevronDown, ChevronUp, Cloud, MapPin, Loader2 } from 'lucide-react'
import { DraftReport } from '@/features/daily-reports/store/offlineReportStore'
import { weatherSchema } from '../validation/dailyReportSchema'
import { getCharacterCount } from '../validation/validationUtils'
import { getWeatherForDate } from '../services/weatherService'
import { toast } from 'sonner'

interface WeatherSectionProps {
  expanded: boolean
  onToggle: () => void
  draft: DraftReport | null
  onUpdate: (updates: Partial<DraftReport>) => void
  reportDate?: string
}

interface FieldErrors {
  weather_condition?: string
  temperature_high?: string
  temperature_low?: string
  weather_notes?: string
}

export function WeatherSection({ expanded, onToggle, draft, onUpdate, reportDate }: WeatherSectionProps) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isLoadingWeather, setIsLoadingWeather] = useState(false)

  if (!draft) {return null}

  const handleAutoFillWeather = async () => {
    const dateToUse = reportDate || draft.report_date || new Date().toISOString().split('T')[0]

    setIsLoadingWeather(true)
    try {
      const weatherData = await getWeatherForDate(dateToUse)
      onUpdate({
        weather_condition: weatherData.weather_condition,
        temperature_high: weatherData.temperature_high,
        temperature_low: weatherData.temperature_low,
        precipitation: weatherData.precipitation,
        wind_speed: weatherData.wind_speed,
      })
      toast.success('Weather data filled from your location')
    } catch (_error) {
      const message = _error instanceof Error ? _error.message : 'Failed to fetch weather'
      toast.error(message)
    } finally {
      setIsLoadingWeather(false)
    }
  }

  const validateField = (field: keyof FieldErrors, value: any) => {
    const fieldSchema = weatherSchema.shape[field]
    if (!fieldSchema) {return}

    const result = fieldSchema.safeParse(value)
    setErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }))
  }

  const notesCount = getCharacterCount(draft.weather_notes, 500)

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-surface"
      >
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-secondary" />
          <div className="text-left">
            <CardTitle className="text-base">Weather Conditions</CardTitle>
            <CardDescription>Temperature, conditions, and weather impacts</CardDescription>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-disabled" />
        ) : (
          <ChevronDown className="h-5 w-5 text-disabled" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-6">
          {/* Auto-fill from location button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoFillWeather}
              disabled={isLoadingWeather}
              className="gap-2"
            >
              {isLoadingWeather ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {isLoadingWeather ? 'Fetching...' : 'Auto-fill from Location'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Weather Condition"
              htmlFor="weather_condition"
              required
              error={errors.weather_condition}
            >
              <Input
                id="weather_condition"
                placeholder="e.g., Sunny, Cloudy, Rainy"
                value={draft.weather_condition || ''}
                onChange={(e) => {
                  onUpdate({ weather_condition: e.target.value })
                  validateField('weather_condition', e.target.value)
                }}
                onBlur={(e) => validateField('weather_condition', e.target.value)}
                className={errors.weather_condition ? 'border-red-500' : ''}
              />
            </FormField>

            <FormField
              label="High Temperature (°F)"
              htmlFor="temperature_high"
              error={errors.temperature_high}
            >
              <Input
                id="temperature_high"
                type="number"
                step="0.1"
                placeholder="e.g., 72"
                value={draft.temperature_high ?? ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined
                  onUpdate({ temperature_high: value })
                  validateField('temperature_high', value)
                }}
                onBlur={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined
                  validateField('temperature_high', value)
                }}
                className={errors.temperature_high ? 'border-red-500' : ''}
              />
            </FormField>

            <FormField
              label="Low Temperature (°F)"
              htmlFor="temperature_low"
              error={errors.temperature_low}
            >
              <Input
                id="temperature_low"
                type="number"
                step="0.1"
                placeholder="e.g., 65"
                value={draft.temperature_low ?? ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined
                  onUpdate({ temperature_low: value })
                  validateField('temperature_low', value)
                }}
                onBlur={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined
                  validateField('temperature_low', value)
                }}
                className={errors.temperature_low ? 'border-red-500' : ''}
              />
            </FormField>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Precipitation (inches)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 0.25"
                value={draft.precipitation || ''}
                onChange={(e) =>
                  onUpdate({
                    precipitation: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-2">
                Wind Speed (mph)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g., 8.5"
                value={draft.wind_speed || ''}
                onChange={(e) =>
                  onUpdate({
                    wind_speed: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.weather_delays || false}
                onChange={(e) => onUpdate({ weather_delays: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-secondary">Weather Caused Delays</span>
            </label>
          </div>

          {draft.weather_delays && (
            <FormField
              label="Weather Notes"
              htmlFor="weather_notes"
              error={errors.weather_notes}
              characterCount={{
                current: notesCount.count,
                max: 500,
                isNearLimit: notesCount.isNearLimit,
                isOverLimit: notesCount.isOverLimit,
              }}
            >
              <textarea
                id="weather_notes"
                placeholder="Describe weather-related delays..."
                value={draft.weather_notes || ''}
                onChange={(e) => {
                  onUpdate({ weather_notes: e.target.value })
                  validateField('weather_notes', e.target.value)
                }}
                onBlur={(e) => validateField('weather_notes', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                  errors.weather_notes ? 'border-red-500' : 'border-input'
                }`}
              />
            </FormField>
          )}
        </CardContent>
      )}
    </Card>
  )
}
