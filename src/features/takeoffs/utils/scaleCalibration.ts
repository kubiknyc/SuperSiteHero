// File: /src/features/takeoffs/utils/scaleCalibration.ts
// Scale calibration utilities for converting pixel measurements to real-world units
// Handles drawing scale extraction and calibration line setup

import type { Point, ScaleFactor, LinearUnit } from './measurements'

/**
 * Calibration line data
 */
export interface CalibrationLine {
  start: Point
  end: Point
  knownLength: number
  unit: LinearUnit
}

/**
 * Calibration result with scale factor
 */
export interface CalibrationResult {
  scaleFactor: ScaleFactor
  pixelDistance: number
  calibrationLine: CalibrationLine
  accuracy: 'high' | 'medium' | 'low' // Based on line length
}

/**
 * Common drawing scales (architectural/engineering)
 */
export const COMMON_SCALES: Array<{ name: string; ratio: number; unit: LinearUnit }> = [
  // Architectural scales (imperial)
  { name: '1/16" = 1\'-0"', ratio: 192, unit: 'in' },
  { name: '1/8" = 1\'-0"', ratio: 96, unit: 'in' },
  { name: '1/4" = 1\'-0"', ratio: 48, unit: 'in' },
  { name: '3/8" = 1\'-0"', ratio: 32, unit: 'in' },
  { name: '1/2" = 1\'-0"', ratio: 24, unit: 'in' },
  { name: '3/4" = 1\'-0"', ratio: 16, unit: 'in' },
  { name: '1" = 1\'-0"', ratio: 12, unit: 'in' },
  { name: '1-1/2" = 1\'-0"', ratio: 8, unit: 'in' },
  { name: '3" = 1\'-0"', ratio: 4, unit: 'in' },

  // Engineering scales (imperial)
  { name: '1" = 10\'', ratio: 120, unit: 'in' },
  { name: '1" = 20\'', ratio: 240, unit: 'in' },
  { name: '1" = 30\'', ratio: 360, unit: 'in' },
  { name: '1" = 40\'', ratio: 480, unit: 'in' },
  { name: '1" = 50\'', ratio: 600, unit: 'in' },
  { name: '1" = 60\'', ratio: 720, unit: 'in' },
  { name: '1" = 100\'', ratio: 1200, unit: 'in' },

  // Metric scales
  { name: '1:50', ratio: 50, unit: 'mm' },
  { name: '1:100', ratio: 100, unit: 'mm' },
  { name: '1:200', ratio: 200, unit: 'mm' },
  { name: '1:500', ratio: 500, unit: 'mm' },
  { name: '1:1000', ratio: 1000, unit: 'mm' },
]

/**
 * Calculate Euclidean distance between two points (in pixels)
 */
function calculatePixelDistance(start: Point, end: Point): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Create scale factor from calibration line
 * User draws a line and specifies its known length
 */
export function calibrateFromLine(calibrationLine: CalibrationLine): CalibrationResult {
  const pixelDistance = calculatePixelDistance(calibrationLine.start, calibrationLine.end)

  if (pixelDistance === 0) {
    throw new Error('Calibration line has zero length')
  }

  if (calibrationLine.knownLength <= 0) {
    throw new Error('Known length must be positive')
  }

  // Calculate pixels per unit
  const pixelsPerUnit = pixelDistance / calibrationLine.knownLength

  // Determine accuracy based on calibration line length
  let accuracy: 'high' | 'medium' | 'low'
  if (pixelDistance > 200) {
    accuracy = 'high'
  } else if (pixelDistance > 100) {
    accuracy = 'medium'
  } else {
    accuracy = 'low'
  }

  const scaleFactor: ScaleFactor = {
    pixelsPerUnit,
    unit: calibrationLine.unit,
  }

  return {
    scaleFactor,
    pixelDistance,
    calibrationLine,
    accuracy,
  }
}

/**
 * Create scale factor from known drawing scale
 * Used when the drawing scale is explicitly stated on the drawing
 */
export function calibrateFromScale(
  scaleName: string,
  pdfDpi: number = 72 // Standard PDF DPI
): ScaleFactor {
  const scale = COMMON_SCALES.find(s => s.name === scaleName)

  if (!scale) {
    throw new Error(`Unknown scale: ${scaleName}`)
  }

  // Convert scale ratio to pixels per unit at given DPI
  // For example: 1/4" = 1'-0" means 1 inch on paper = 48 inches in reality
  // At 72 DPI, 1 inch on paper = 72 pixels
  // So pixels per real inch = 72 / 48 = 1.5
  const pixelsPerUnit = pdfDpi / scale.ratio

  return {
    pixelsPerUnit,
    unit: scale.unit,
  }
}

/**
 * Validate calibration accuracy
 * Returns warnings if calibration may be inaccurate
 */
export function validateCalibration(result: CalibrationResult): {
  valid: boolean
  warnings: string[]
} {
  const warnings: string[] = []

  // Check if line is too short
  if (result.pixelDistance < 50) {
    warnings.push('Calibration line is very short. Draw a longer line for better accuracy.')
  }

  // Check if pixels per unit seems unreasonable
  if (result.scaleFactor.pixelsPerUnit < 0.1) {
    warnings.push('Scale factor seems too small. Verify the known length is correct.')
  }

  if (result.scaleFactor.pixelsPerUnit > 1000) {
    warnings.push('Scale factor seems too large. Verify the known length and unit are correct.')
  }

  // Check accuracy rating
  if (result.accuracy === 'low') {
    warnings.push('Low accuracy calibration. Draw a longer reference line for better results.')
  }

  return {
    valid: warnings.length === 0 || result.accuracy !== 'low',
    warnings,
  }
}

/**
 * Adjust scale factor for zoom level
 * When user zooms in/out on the PDF, we need to adjust the scale
 */
export function adjustScaleForZoom(scaleFactor: ScaleFactor, zoomLevel: number): ScaleFactor {
  return {
    pixelsPerUnit: scaleFactor.pixelsPerUnit * zoomLevel,
    unit: scaleFactor.unit,
  }
}

/**
 * Save calibration to storage (for persistence across page views)
 */
export function serializeCalibration(result: CalibrationResult): string {
  return JSON.stringify({
    pixelsPerUnit: result.scaleFactor.pixelsPerUnit,
    unit: result.scaleFactor.unit,
    calibrationLine: result.calibrationLine,
    pixelDistance: result.pixelDistance,
    accuracy: result.accuracy,
  })
}

/**
 * Load calibration from storage
 */
export function deserializeCalibration(data: string): CalibrationResult {
  const parsed = JSON.parse(data)

  return {
    scaleFactor: {
      pixelsPerUnit: parsed.pixelsPerUnit,
      unit: parsed.unit,
    },
    pixelDistance: parsed.pixelDistance,
    calibrationLine: parsed.calibrationLine,
    accuracy: parsed.accuracy,
  }
}

/**
 * Check if two calibrations are similar (within tolerance)
 * Useful for detecting if recalibration is needed
 */
export function areCalibrationsEquivalent(
  cal1: ScaleFactor,
  cal2: ScaleFactor,
  tolerancePercent: number = 5
): boolean {
  if (cal1.unit !== cal2.unit) {
    return false
  }

  const diff = Math.abs(cal1.pixelsPerUnit - cal2.pixelsPerUnit)
  const avgPixelsPerUnit = (cal1.pixelsPerUnit + cal2.pixelsPerUnit) / 2
  const percentDiff = (diff / avgPixelsPerUnit) * 100

  return percentDiff <= tolerancePercent
}
