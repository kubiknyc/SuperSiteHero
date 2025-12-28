/**
 * MeasurementSettings Component
 * Settings page for measurement unit preferences
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Ruler, RotateCcw, Square, Box } from 'lucide-react'
import { toast } from 'sonner'
import {
  useMeasurementPreferences,
  useUpdateMeasurementPreferences,
  useResetMeasurementPreferences,
  LINEAR_UNITS,
  AREA_UNITS,
  VOLUME_UNITS,
  formatMeasurement,
} from '@/features/takeoffs/hooks/useMeasurementPreferences'
import type { LinearUnit, AreaUnit, VolumeUnit } from '@/features/takeoffs/utils/measurements'

const PRECISION_OPTIONS = [
  { value: 0, label: '0 decimals' },
  { value: 1, label: '1 decimal' },
  { value: 2, label: '2 decimals' },
  { value: 3, label: '3 decimals' },
  { value: 4, label: '4 decimals' },
]

/**
 * MeasurementSettings Component
 *
 * Allows users to configure:
 * - Unit system (Imperial / Metric)
 * - Default linear, area, and volume units
 * - Display precision
 */
export function MeasurementSettings() {
  const preferences = useMeasurementPreferences()
  const updatePreferences = useUpdateMeasurementPreferences()
  const resetPreferences = useResetMeasurementPreferences()

  const isImperial = preferences.unitSystem === 'imperial'

  // Filter units by current system
  const filteredLinearUnits = LINEAR_UNITS.filter(
    (u) => u.system === preferences.unitSystem
  )
  const filteredAreaUnits = AREA_UNITS.filter(
    (u) => u.system === preferences.unitSystem
  )
  const filteredVolumeUnits = VOLUME_UNITS.filter(
    (u) => u.system === preferences.unitSystem
  )

  const handleToggleUnitSystem = () => {
    updatePreferences({
      unitSystem: isImperial ? 'metric' : 'imperial',
    })
    toast.success(`Switched to ${isImperial ? 'Metric' : 'Imperial'} units`)
  }

  const handleReset = () => {
    resetPreferences()
    toast.success('Measurement preferences reset to defaults')
  }

  // Sample measurements for preview
  const sampleLinear = 25.5
  const sampleArea = 1250.75
  const sampleVolume = 450.25

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ruler className="w-5 h-5" />
          Measurement Units
        </CardTitle>
        <CardDescription>
          Configure default units for takeoff measurements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Unit System Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Unit System</Label>
            <p className="text-sm text-muted-foreground">
              Toggle between Imperial and Metric units
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isImperial ? 'font-medium' : 'text-muted-foreground'}`}>
              Imperial
            </span>
            <Switch
              checked={!isImperial}
              onCheckedChange={handleToggleUnitSystem}
            />
            <span className={`text-sm ${!isImperial ? 'font-medium' : 'text-muted-foreground'}`}>
              Metric
            </span>
          </div>
        </div>

        {/* Linear Unit */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-muted-foreground" />
            <Label>Linear Unit</Label>
          </div>
          <RadixSelect
            value={preferences.linearUnit}
            onValueChange={(value) => updatePreferences({ linearUnit: value as LinearUnit })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filteredLinearUnits.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </RadixSelect>
          <p className="text-xs text-muted-foreground">
            Preview: {formatMeasurement(sampleLinear, preferences.linearUnit, preferences.precision)}
          </p>
        </div>

        {/* Area Unit */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Square className="w-4 h-4 text-muted-foreground" />
            <Label>Area Unit</Label>
          </div>
          <RadixSelect
            value={preferences.areaUnit}
            onValueChange={(value) => updatePreferences({ areaUnit: value as AreaUnit })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filteredAreaUnits.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </RadixSelect>
          <p className="text-xs text-muted-foreground">
            Preview: {formatMeasurement(sampleArea, preferences.areaUnit, preferences.precision)}
          </p>
        </div>

        {/* Volume Unit */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-muted-foreground" />
            <Label>Volume Unit</Label>
          </div>
          <RadixSelect
            value={preferences.volumeUnit}
            onValueChange={(value) => updatePreferences({ volumeUnit: value as VolumeUnit })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filteredVolumeUnits.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </RadixSelect>
          <p className="text-xs text-muted-foreground">
            Preview: {formatMeasurement(sampleVolume, preferences.volumeUnit, preferences.precision)}
          </p>
        </div>

        {/* Precision */}
        <div className="space-y-2">
          <Label>Decimal Precision</Label>
          <RadixSelect
            value={preferences.precision.toString()}
            onValueChange={(value) => updatePreferences({ precision: parseInt(value, 10) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRECISION_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value.toString()}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </RadixSelect>
        </div>

        {/* Reset Button */}
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default MeasurementSettings
