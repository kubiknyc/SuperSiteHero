/**
 * Measurement Preferences Hook
 * Manages user preferences for unit system (Imperial/Metric)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LinearUnit, AreaUnit, VolumeUnit, UnitSystem } from '../utils/measurements'

// ============================================
// TYPES
// ============================================

export interface MeasurementPreferences {
  /** Unit system: imperial or metric */
  unitSystem: UnitSystem
  /** Default linear unit for display */
  linearUnit: LinearUnit
  /** Default area unit for display */
  areaUnit: AreaUnit
  /** Default volume unit for display */
  volumeUnit: VolumeUnit
  /** Decimal precision for measurements */
  precision: number
}

interface MeasurementPreferencesState extends MeasurementPreferences {
  /** Update preferences */
  setPreferences: (prefs: Partial<MeasurementPreferences>) => void
  /** Toggle between imperial and metric */
  toggleUnitSystem: () => void
  /** Reset to defaults */
  resetToDefaults: () => void
}

// ============================================
// DEFAULTS
// ============================================

const IMPERIAL_DEFAULTS: MeasurementPreferences = {
  unitSystem: 'imperial',
  linearUnit: 'ft',
  areaUnit: 'ft2',
  volumeUnit: 'ft3',
  precision: 2,
}

const METRIC_DEFAULTS: MeasurementPreferences = {
  unitSystem: 'metric',
  linearUnit: 'm',
  areaUnit: 'm2',
  volumeUnit: 'm3',
  precision: 2,
}

// ============================================
// STORE
// ============================================

export const useMeasurementPreferencesStore = create<MeasurementPreferencesState>()(
  persist(
    (set, get) => ({
      // Default to imperial
      ...IMPERIAL_DEFAULTS,

      setPreferences: (prefs) => {
        set((state) => {
          const newState = { ...state, ...prefs }

          // If unit system changed, update default units
          if (prefs.unitSystem && prefs.unitSystem !== state.unitSystem) {
            if (prefs.unitSystem === 'metric') {
              return { ...newState, ...METRIC_DEFAULTS, ...prefs }
            } else {
              return { ...newState, ...IMPERIAL_DEFAULTS, ...prefs }
            }
          }

          return newState
        })
      },

      toggleUnitSystem: () => {
        const current = get().unitSystem
        const newSystem = current === 'imperial' ? 'metric' : 'imperial'
        const defaults = newSystem === 'metric' ? METRIC_DEFAULTS : IMPERIAL_DEFAULTS

        set({
          ...defaults,
          precision: get().precision, // Keep precision
        })
      },

      resetToDefaults: () => {
        set(IMPERIAL_DEFAULTS)
      },
    }),
    {
      name: 'measurement-preferences',
      version: 1,
    }
  )
)

// ============================================
// HOOKS
// ============================================

/**
 * Get current measurement preferences
 */
export function useMeasurementPreferences(): MeasurementPreferences {
  return useMeasurementPreferencesStore((state) => ({
    unitSystem: state.unitSystem,
    linearUnit: state.linearUnit,
    areaUnit: state.areaUnit,
    volumeUnit: state.volumeUnit,
    precision: state.precision,
  }))
}

/**
 * Update measurement preferences
 */
export function useUpdateMeasurementPreferences() {
  return useMeasurementPreferencesStore((state) => state.setPreferences)
}

/**
 * Toggle unit system (Imperial ↔ Metric)
 */
export function useToggleUnitSystem() {
  return useMeasurementPreferencesStore((state) => state.toggleUnitSystem)
}

/**
 * Reset preferences to defaults
 */
export function useResetMeasurementPreferences() {
  return useMeasurementPreferencesStore((state) => state.resetToDefaults)
}

/**
 * Check if currently using imperial units
 */
export function useIsImperial(): boolean {
  return useMeasurementPreferencesStore((state) => state.unitSystem === 'imperial')
}

/**
 * Check if currently using metric units
 */
export function useIsMetric(): boolean {
  return useMeasurementPreferencesStore((state) => state.unitSystem === 'metric')
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get the default linear unit for a unit system
 */
export function getDefaultLinearUnit(system: UnitSystem): LinearUnit {
  return system === 'imperial' ? 'ft' : 'm'
}

/**
 * Get the default area unit for a unit system
 */
export function getDefaultAreaUnit(system: UnitSystem): AreaUnit {
  return system === 'imperial' ? 'ft2' : 'm2'
}

/**
 * Get the default volume unit for a unit system
 */
export function getDefaultVolumeUnit(system: UnitSystem): VolumeUnit {
  return system === 'imperial' ? 'ft3' : 'm3'
}

/**
 * Get display label for a linear unit
 */
export function getLinearUnitLabel(unit: LinearUnit): string {
  const labels: Record<LinearUnit, string> = {
    in: 'Inches',
    ft: 'Feet',
    yd: 'Yards',
    mi: 'Miles',
    mm: 'Millimeters',
    cm: 'Centimeters',
    m: 'Meters',
    km: 'Kilometers',
  }
  return labels[unit]
}

/**
 * Get display label for an area unit
 */
export function getAreaUnitLabel(unit: AreaUnit): string {
  const labels: Record<AreaUnit, string> = {
    in2: 'Square Inches',
    ft2: 'Square Feet',
    yd2: 'Square Yards',
    ac: 'Acres',
    mm2: 'Square Millimeters',
    cm2: 'Square Centimeters',
    m2: 'Square Meters',
    ha: 'Hectares',
    km2: 'Square Kilometers',
  }
  return labels[unit]
}

/**
 * Get display label for a volume unit
 */
export function getVolumeUnitLabel(unit: VolumeUnit): string {
  const labels: Record<VolumeUnit, string> = {
    in3: 'Cubic Inches',
    ft3: 'Cubic Feet',
    yd3: 'Cubic Yards',
    mm3: 'Cubic Millimeters',
    cm3: 'Cubic Centimeters',
    m3: 'Cubic Meters',
  }
  return labels[unit]
}

/**
 * Get symbol for a linear unit
 */
export function getLinearUnitSymbol(unit: LinearUnit): string {
  const symbols: Record<LinearUnit, string> = {
    in: '"',
    ft: "'",
    yd: 'yd',
    mi: 'mi',
    mm: 'mm',
    cm: 'cm',
    m: 'm',
    km: 'km',
  }
  return symbols[unit]
}

/**
 * Format a measurement value with unit
 */
export function formatMeasurement(
  value: number,
  unit: string,
  precision: number = 2
): string {
  return `${value.toFixed(precision)} ${unit}`
}

/**
 * Available linear units for selection
 */
export const LINEAR_UNITS: Array<{ value: LinearUnit; label: string; system: UnitSystem }> = [
  { value: 'in', label: 'Inches', system: 'imperial' },
  { value: 'ft', label: 'Feet', system: 'imperial' },
  { value: 'yd', label: 'Yards', system: 'imperial' },
  { value: 'mi', label: 'Miles', system: 'imperial' },
  { value: 'mm', label: 'Millimeters', system: 'metric' },
  { value: 'cm', label: 'Centimeters', system: 'metric' },
  { value: 'm', label: 'Meters', system: 'metric' },
  { value: 'km', label: 'Kilometers', system: 'metric' },
]

/**
 * Available area units for selection
 */
export const AREA_UNITS: Array<{ value: AreaUnit; label: string; system: UnitSystem }> = [
  { value: 'in2', label: 'Square Inches', system: 'imperial' },
  { value: 'ft2', label: 'Square Feet', system: 'imperial' },
  { value: 'yd2', label: 'Square Yards', system: 'imperial' },
  { value: 'ac', label: 'Acres', system: 'imperial' },
  { value: 'mm2', label: 'Square Millimeters', system: 'metric' },
  { value: 'cm2', label: 'Square Centimeters', system: 'metric' },
  { value: 'm2', label: 'Square Meters', system: 'metric' },
  { value: 'ha', label: 'Hectares', system: 'metric' },
  { value: 'km2', label: 'Square Kilometers', system: 'metric' },
]

/**
 * Available volume units for selection
 */
export const VOLUME_UNITS: Array<{ value: VolumeUnit; label: string; system: UnitSystem }> = [
  { value: 'in3', label: 'Cubic Inches', system: 'imperial' },
  { value: 'ft3', label: 'Cubic Feet', system: 'imperial' },
  { value: 'yd3', label: 'Cubic Yards', system: 'imperial' },
  { value: 'mm3', label: 'Cubic Millimeters', system: 'metric' },
  { value: 'cm3', label: 'Cubic Centimeters', system: 'metric' },
  { value: 'm3', label: 'Cubic Meters', system: 'metric' },
]
