import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DraftReport } from '@/features/daily-reports/store/offlineReportStore'

interface WeatherSectionProps {
  expanded: boolean
  onToggle: () => void
  draft: DraftReport | null
  onUpdate: (updates: Partial<DraftReport>) => void
}

export function WeatherSection({ expanded, onToggle, draft, onUpdate }: WeatherSectionProps) {
  if (!draft) {return null}

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div>
          <CardTitle className="text-base">Weather Conditions</CardTitle>
          <CardDescription>Temperature, conditions, and weather impacts</CardDescription>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weather Condition
              </label>
              <Input
                placeholder="e.g., Sunny, Cloudy, Rainy"
                value={draft.weather_condition || ''}
                onChange={(e) => onUpdate({ weather_condition: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                High Temperature (°F)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g., 72"
                value={draft.temperature_high || ''}
                onChange={(e) =>
                  onUpdate({
                    temperature_high: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low Temperature (°F)
              </label>
              <Input
                type="number"
                step="0.1"
                placeholder="e.g., 65"
                value={draft.temperature_low || ''}
                onChange={(e) =>
                  onUpdate({
                    temperature_low: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <span className="text-sm font-medium text-gray-700">Weather Caused Delays</span>
            </label>
          </div>

          {draft.weather_delays && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delay Notes
              </label>
              <textarea
                placeholder="Describe weather-related delays..."
                value={draft.weather_delay_notes || ''}
                onChange={(e) => onUpdate({ weather_delay_notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
