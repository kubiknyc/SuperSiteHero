// File: /src/features/takeoffs/utils/measurements.ts
// Core measurement calculations for all 9 takeoff measurement types
// Handles unit conversions and geometric calculations

import type { MeasurementUnit } from '@/features/documents/types/markup'

// Re-export MeasurementUnit for convenience
export type { MeasurementUnit }

/**
 * Measurement types supported by the system
 */
export type MeasurementType =
  | 'linear'
  | 'area'
  | 'count'
  | 'linear_with_drop'
  | 'pitched_area'
  | 'pitched_linear'
  | 'surface_area'
  | 'volume_2d'
  | 'volume_3d'

/**
 * Unit systems for measurements
 */
export type UnitSystem = 'imperial' | 'metric'

/**
 * Linear units
 */
export type LinearUnit = 'in' | 'ft' | 'yd' | 'mi' | 'mm' | 'cm' | 'm' | 'km'

/**
 * Area units
 */
export type AreaUnit = 'in2' | 'ft2' | 'yd2' | 'ac' | 'mm2' | 'cm2' | 'm2' | 'ha' | 'km2'

/**
 * Volume units
 */
export type VolumeUnit = 'in3' | 'ft3' | 'yd3' | 'mm3' | 'cm3' | 'm3'

/**
 * Point in 2D space (pixels on canvas)
 */
export interface Point {
  x: number
  y: number
}

/**
 * Coordinate with real-world scale (after calibration)
 */
export interface Coordinate {
  x: number
  y: number
  unit: LinearUnit
}

/**
 * Scale factor from pixels to real-world units
 */
export interface ScaleFactor {
  pixelsPerUnit: number
  unit: LinearUnit
  /** Original pixel distance used for calibration (for persistence) */
  pixelDistance?: number
  /** Original real-world distance used for calibration (for persistence) */
  realWorldDistance?: number
}

// ============================================
// UNIT CONVERSION CONSTANTS
// ============================================

const LINEAR_TO_INCHES: Record<LinearUnit, number> = {
  in: 1,
  ft: 12,
  yd: 36,
  mi: 63360,
  mm: 0.0393701,
  cm: 0.393701,
  m: 39.3701,
  km: 39370.1,
}

const AREA_TO_SQUARE_INCHES: Record<AreaUnit, number> = {
  in2: 1,
  ft2: 144,
  yd2: 1296,
  ac: 6272640,
  mm2: 0.00155,
  cm2: 0.155,
  m2: 1550,
  ha: 15500000,
  km2: 1550000000,
}

const VOLUME_TO_CUBIC_INCHES: Record<VolumeUnit, number> = {
  in3: 1,
  ft3: 1728,
  yd3: 46656,
  mm3: 0.0000610237,
  cm3: 0.0610237,
  m3: 61023.7,
}

// ============================================
// UNIT CONVERSION FUNCTIONS
// ============================================

/**
 * Convert MeasurementUnit (full name) to LinearUnit (abbreviation)
 */
export function measurementUnitToLinearUnit(unit: MeasurementUnit | string): LinearUnit {
  const mapping: Record<string, LinearUnit> = {
    feet: 'ft',
    inches: 'in',
    meters: 'm',
    centimeters: 'cm',
    millimeters: 'mm',
    yards: 'yd',
  }
  return mapping[unit] || 'ft'
}

/**
 * Convert LinearUnit (abbreviation) to MeasurementUnit (full name)
 */
export function linearUnitToMeasurementUnit(unit: LinearUnit): MeasurementUnit {
  const mapping: Record<LinearUnit, MeasurementUnit> = {
    ft: 'feet',
    in: 'inches',
    m: 'meters',
    cm: 'centimeters',
    mm: 'millimeters',
    yd: 'yards',
    mi: 'feet', // fallback
    km: 'meters', // fallback
  }
  return mapping[unit] || 'feet'
}

/**
 * Convert length from one linear unit to another
 */
export function convertLinearUnit(value: number, fromUnit: LinearUnit, toUnit: LinearUnit): number {
  const inches = value * LINEAR_TO_INCHES[fromUnit]
  return inches / LINEAR_TO_INCHES[toUnit]
}

/**
 * Convert area from one unit to another
 */
export function convertAreaUnit(value: number, fromUnit: AreaUnit, toUnit: AreaUnit): number {
  const squareInches = value * AREA_TO_SQUARE_INCHES[fromUnit]
  return squareInches / AREA_TO_SQUARE_INCHES[toUnit]
}

/**
 * Convert volume from one unit to another
 */
export function convertVolumeUnit(value: number, fromUnit: VolumeUnit, toUnit: VolumeUnit): number {
  const cubicInches = value * VOLUME_TO_CUBIC_INCHES[fromUnit]
  return cubicInches / VOLUME_TO_CUBIC_INCHES[toUnit]
}

// ============================================
// GEOMETRIC CALCULATIONS
// ============================================

/**
 * Calculate Euclidean distance between two points
 */
export function distanceBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate total length of a polyline
 */
export function calculatePolylineLength(points: Point[]): number {
  if (points.length < 2) {return 0}

  let totalLength = 0
  for (let i = 0; i < points.length - 1; i++) {
    totalLength += distanceBetweenPoints(points[i], points[i + 1])
  }
  return totalLength
}

/**
 * Calculate area of a polygon using the Shoelace formula
 * Points should be in order (clockwise or counterclockwise)
 */
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) {return 0}

  let area = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }

  return Math.abs(area / 2)
}

/**
 * Calculate perimeter of a polygon
 */
export function calculatePolygonPerimeter(points: Point[]): number {
  if (points.length < 2) {return 0}

  let perimeter = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    perimeter += distanceBetweenPoints(points[i], points[j])
  }

  return perimeter
}

/**
 * Calculate area of a rectangle
 */
export function calculateRectangleArea(width: number, height: number): number {
  return width * height
}

/**
 * Calculate area of an ellipse
 */
export function calculateEllipseArea(radiusX: number, radiusY: number): number {
  return Math.PI * radiusX * radiusY
}

/**
 * Calculate area of a circle
 */
export function calculateCircleArea(radius: number): number {
  return Math.PI * radius * radius
}

/**
 * Calculate circumference of a circle
 */
export function calculateCircleCircumference(radius: number): number {
  return 2 * Math.PI * radius
}

// ============================================
// MEASUREMENT TYPE CALCULATIONS
// ============================================

/**
 * Type 1: Linear Measurement
 * Measures straight lines or polylines
 */
export function calculateLinear(
  points: Point[],
  scale: ScaleFactor,
  targetUnit: LinearUnit = 'ft'
): number {
  const pixelLength = calculatePolylineLength(points)
  const lengthInScaleUnit = pixelLength / scale.pixelsPerUnit
  return convertLinearUnit(lengthInScaleUnit, scale.unit, targetUnit)
}

/**
 * Type 2: Area Measurement
 * Measures enclosed polygon area
 */
export function calculateArea(
  points: Point[],
  scale: ScaleFactor,
  targetUnit: AreaUnit = 'ft2'
): number {
  const pixelArea = calculatePolygonArea(points)
  const pixelsPerSquareUnit = scale.pixelsPerUnit * scale.pixelsPerUnit
  const areaInScaleUnit = pixelArea / pixelsPerSquareUnit

  // Convert from square scale units to target unit
  const scaleAreaUnit = (scale.unit + '2') as AreaUnit
  return convertAreaUnit(areaInScaleUnit, scaleAreaUnit, targetUnit)
}

/**
 * Type 3: Count Measurement
 * Counts discrete items (points)
 */
export function calculateCount(points: Point[]): number {
  return points.length
}

/**
 * Type 4: Linear with Drop
 * Measures linear length with vertical drop adjustment
 * Used for conduit runs, pipe with elevation changes
 */
export function calculateLinearWithDrop(
  points: Point[],
  dropHeight: number, // in target units
  scale: ScaleFactor,
  targetUnit: LinearUnit = 'ft'
): { horizontal: number; vertical: number; total: number } {
  const horizontalLength = calculateLinear(points, scale, targetUnit)
  const verticalLength = dropHeight
  const totalLength = Math.sqrt(horizontalLength * horizontalLength + verticalLength * verticalLength)

  return {
    horizontal: horizontalLength,
    vertical: verticalLength,
    total: totalLength,
  }
}

/**
 * Type 5: Pitched Area
 * Calculates area with pitch/slope adjustment
 * Used for roofing, sloped surfaces
 */
export function calculatePitchedArea(
  points: Point[],
  pitch: number, // rise over run (e.g., 4/12 = 0.333)
  scale: ScaleFactor,
  targetUnit: AreaUnit = 'ft2'
): { planar: number; actual: number; factor: number } {
  const planarArea = calculateArea(points, scale, targetUnit)

  // Calculate pitch factor: sqrt(1 + (rise/run)^2)
  const pitchFactor = Math.sqrt(1 + pitch * pitch)
  const actualArea = planarArea * pitchFactor

  return {
    planar: planarArea,
    actual: actualArea,
    factor: pitchFactor,
  }
}

/**
 * Type 6: Pitched Linear
 * Calculates linear length with pitch adjustment
 * Used for sloped rails, ramps
 */
export function calculatePitchedLinear(
  points: Point[],
  pitch: number, // rise over run
  scale: ScaleFactor,
  targetUnit: LinearUnit = 'ft'
): { horizontal: number; actual: number; factor: number } {
  const horizontalLength = calculateLinear(points, scale, targetUnit)

  // Calculate pitch factor: sqrt(1 + (rise/run)^2)
  const pitchFactor = Math.sqrt(1 + pitch * pitch)
  const actualLength = horizontalLength * pitchFactor

  return {
    horizontal: horizontalLength,
    actual: actualLength,
    factor: pitchFactor,
  }
}

/**
 * Type 7: Surface Area
 * Calculates surface area of 3D object from perimeter and height
 * Used for walls, cylinders, prisms
 */
export function calculateSurfaceArea(
  points: Point[], // perimeter points
  height: number, // in target units
  scale: ScaleFactor,
  targetUnit: AreaUnit = 'ft2',
  includeEnds: boolean = false
): { lateral: number; ends?: number; total: number } {
  const perimeterPixels = calculatePolygonPerimeter(points)
  const perimeterLength = perimeterPixels / scale.pixelsPerUnit
  const perimeterInTarget = convertLinearUnit(perimeterLength, scale.unit, targetUnit.replace('2', '') as LinearUnit)

  const lateralArea = perimeterInTarget * height

  let endsArea = 0
  if (includeEnds) {
    endsArea = calculateArea(points, scale, targetUnit) * 2
  }

  const totalArea = lateralArea + endsArea

  return {
    lateral: lateralArea,
    ...(includeEnds && { ends: endsArea }),
    total: totalArea,
  }
}

/**
 * Type 8: Volume 2D
 * Calculates volume from 2D area and depth/height
 * Used for concrete slabs, excavation
 */
export function calculateVolume2D(
  points: Point[],
  depth: number, // in target length units
  scale: ScaleFactor,
  targetUnit: VolumeUnit = 'ft3'
): number {
  // Get area in square units matching the target volume unit
  const lengthUnit = targetUnit.replace('3', '') as LinearUnit
  const areaUnit = (lengthUnit + '2') as AreaUnit

  const area = calculateArea(points, scale, areaUnit)
  const volume = area * depth

  return volume
}

/**
 * Type 9: Volume 3D
 * Calculates volume of complex 3D shapes using cross-sections
 * Used for earthwork, complex excavations
 */
export function calculateVolume3D(
  crossSections: Array<{ points: Point[]; elevation: number }>,
  scale: ScaleFactor,
  targetUnit: VolumeUnit = 'ft3'
): number {
  if (crossSections.length < 2) {return 0}

  // Sort by elevation
  const sorted = [...crossSections].sort((a, b) => a.elevation - b.elevation)

  let totalVolume = 0
  const lengthUnit = targetUnit.replace('3', '') as LinearUnit
  const areaUnit = (lengthUnit + '2') as AreaUnit

  // Use average end area method
  for (let i = 0; i < sorted.length - 1; i++) {
    const area1 = calculateArea(sorted[i].points, scale, areaUnit)
    const area2 = calculateArea(sorted[i + 1].points, scale, areaUnit)
    const distance = sorted[i + 1].elevation - sorted[i].elevation

    // Volume = (A1 + A2) / 2 * distance
    const sectionVolume = ((area1 + area2) / 2) * distance
    totalVolume += sectionVolume
  }

  return totalVolume
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format measurement value with appropriate precision
 */
export function formatMeasurement(value: number, precision: number = 2): string {
  return value.toFixed(precision)
}

/**
 * Get display name for measurement type
 */
export function getMeasurementTypeName(type: MeasurementType): string {
  const names: Record<MeasurementType, string> = {
    linear: 'Linear',
    area: 'Area',
    count: 'Count',
    linear_with_drop: 'Linear with Drop',
    pitched_area: 'Pitched Area',
    pitched_linear: 'Pitched Linear',
    surface_area: 'Surface Area',
    volume_2d: 'Volume (2D)',
    volume_3d: 'Volume (3D)',
  }
  return names[type]
}

/**
 * Get unit symbol for display
 */
export function getUnitSymbol(unit: LinearUnit | AreaUnit | VolumeUnit): string {
  // Already formatted in the type definitions
  return unit
}

/**
 * Validate points array for measurement type
 */
export function validatePoints(points: Point[], type: MeasurementType): { valid: boolean; error?: string } {
  if (!points || points.length === 0) {
    return { valid: false, error: 'No points provided' }
  }

  switch (type) {
    case 'linear':
    case 'linear_with_drop':
    case 'pitched_linear':
      if (points.length < 2) {
        return { valid: false, error: 'Linear measurements require at least 2 points' }
      }
      break

    case 'area':
    case 'pitched_area':
    case 'surface_area':
    case 'volume_2d':
      if (points.length < 3) {
        return { valid: false, error: 'Area measurements require at least 3 points' }
      }
      break

    case 'count':
      // Count can have any number of points
      break

    case 'volume_3d':
      // Volume 3D requires multiple cross-sections, validated elsewhere
      break

    default:
      return { valid: false, error: 'Unknown measurement type' }
  }

  return { valid: true }
}
