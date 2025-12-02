// File: /src/features/takeoffs/utils/export.ts
// Export utilities for takeoff measurements (CSV and Excel)

import type { TakeoffMeasurement } from '../components/TakeoffCanvas'
import type { ScaleFactor } from './measurements'
import {
  calculateLinear,
  calculateArea,
  calculateCount,
  calculateLinearWithDrop,
  calculatePitchedArea,
  calculatePitchedLinear,
  calculateSurfaceArea,
  calculateVolume2D,
} from './measurements'

export interface ExportRow {
  name: string
  type: string
  quantity: number
  unit: string
  color: string
  notes: string
}

export interface ExportSummary {
  totalMeasurements: number
  byType: Record<string, number>
  totalQuantity: number
}

/**
 * Calculate quantity for a measurement
 */
function calculateQuantity(measurement: TakeoffMeasurement, scale?: ScaleFactor): number {
  if (!scale) return 0

  try {
    switch (measurement.type) {
      case 'linear':
        return calculateLinear(measurement.points, scale, 'ft')

      case 'area':
        return calculateArea(measurement.points, scale, 'ft2')

      case 'count':
        return calculateCount(measurement.points)

      case 'linear_with_drop': {
        const result = calculateLinearWithDrop(
          measurement.points,
          measurement.dropHeight || 0,
          scale,
          'ft'
        )
        return result.total
      }

      case 'pitched_area': {
        const result = calculatePitchedArea(
          measurement.points,
          measurement.pitch || 0,
          scale,
          'ft2'
        )
        return result.actual
      }

      case 'pitched_linear': {
        const result = calculatePitchedLinear(
          measurement.points,
          measurement.pitch || 0,
          scale,
          'ft'
        )
        return result.actual
      }

      case 'surface_area': {
        const result = calculateSurfaceArea(
          measurement.points,
          measurement.height || 0,
          scale,
          'ft2',
          false
        )
        return result.total
      }

      case 'volume_2d':
        return calculateVolume2D(measurement.points, measurement.depth || 0, scale, 'ft3')

      case 'volume_3d':
        return 0 // Requires special calculation

      default:
        return 0
    }
  } catch {
    return 0
  }
}

/**
 * Get unit for measurement type
 */
function getUnit(type: string): string {
  switch (type) {
    case 'linear':
    case 'linear_with_drop':
    case 'pitched_linear':
      return 'LF'

    case 'area':
    case 'pitched_area':
    case 'surface_area':
      return 'SF'

    case 'count':
      return 'EA'

    case 'volume_2d':
    case 'volume_3d':
      return 'CF'

    default:
      return ''
  }
}

/**
 * Convert measurements to export rows
 */
export function measurementsToRows(
  measurements: TakeoffMeasurement[],
  scale?: ScaleFactor
): ExportRow[] {
  return measurements.map((m) => ({
    name: m.name || `${m.type}-${m.id.slice(0, 8)}`,
    type: m.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    quantity: calculateQuantity(m, scale),
    unit: getUnit(m.type),
    color: m.color,
    notes: buildNotes(m),
  }))
}

/**
 * Build notes for a measurement
 */
function buildNotes(measurement: TakeoffMeasurement): string {
  const notes: string[] = []

  if (measurement.dropHeight) {
    notes.push(`Drop: ${measurement.dropHeight}ft`)
  }

  if (measurement.pitch) {
    const pitchRatio = Math.round(measurement.pitch * 12)
    notes.push(`Pitch: ${pitchRatio}:12`)
  }

  if (measurement.height) {
    notes.push(`Height: ${measurement.height}ft`)
  }

  if (measurement.depth) {
    notes.push(`Depth: ${measurement.depth}ft`)
  }

  if (measurement.points) {
    notes.push(`Points: ${measurement.points.length}`)
  }

  return notes.join(' | ')
}

/**
 * Calculate export summary
 */
export function calculateSummary(
  measurements: TakeoffMeasurement[],
  scale?: ScaleFactor
): ExportSummary {
  const byType: Record<string, number> = {}
  let totalQuantity = 0

  measurements.forEach((m) => {
    const quantity = calculateQuantity(m, scale)
    totalQuantity += quantity

    const typeName = m.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    byType[typeName] = (byType[typeName] || 0) + quantity
  })

  return {
    totalMeasurements: measurements.length,
    byType,
    totalQuantity,
  }
}

/**
 * Export to CSV
 */
export function exportToCSV(
  measurements: TakeoffMeasurement[],
  scale?: ScaleFactor,
  projectName?: string
): string {
  const rows = measurementsToRows(measurements, scale)

  // CSV header
  const header = ['Name', 'Type', 'Quantity', 'Unit', 'Color', 'Notes'].join(',')

  // CSV rows
  const csvRows = rows.map((row) => {
    return [
      escapeCSV(row.name),
      escapeCSV(row.type),
      row.quantity.toFixed(2),
      row.unit,
      row.color,
      escapeCSV(row.notes),
    ].join(',')
  })

  // Summary rows
  const summary = calculateSummary(measurements, scale)
  const summaryRows = [
    '',
    'SUMMARY',
    `Total Measurements,${summary.totalMeasurements}`,
    '',
    'By Type:',
    ...Object.entries(summary.byType).map(([type, qty]) => `${type},${qty.toFixed(2)}`),
  ]

  // Combine all
  const content = [header, ...csvRows, ...summaryRows].join('\n')

  return content
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Export to Excel (XLSX format)
 * Uses the xlsx library which should be lazy loaded
 */
export async function exportToExcel(
  measurements: TakeoffMeasurement[],
  scale?: ScaleFactor,
  projectName?: string,
  documentName?: string
): Promise<Blob> {
  // Lazy load xlsx library
  const XLSX = await import('xlsx')

  const rows = measurementsToRows(measurements, scale)
  const summary = calculateSummary(measurements, scale)

  // Create workbook
  const wb = XLSX.utils.book_new()

  // Measurements sheet
  const measurementsData = [
    ['Name', 'Type', 'Quantity', 'Unit', 'Color', 'Notes'],
    ...rows.map((row) => [
      row.name,
      row.type,
      row.quantity,
      row.unit,
      row.color,
      row.notes,
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(measurementsData)

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Name
    { wch: 15 }, // Type
    { wch: 12 }, // Quantity
    { wch: 8 }, // Unit
    { wch: 10 }, // Color
    { wch: 40 }, // Notes
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Measurements')

  // Summary sheet
  const summaryData = [
    ['Takeoff Summary'],
    [],
    ['Project:', projectName || 'Unknown'],
    ['Document:', documentName || 'Unknown'],
    ['Date:', new Date().toLocaleDateString()],
    [],
    ['Total Measurements:', summary.totalMeasurements],
    [],
    ['By Type:'],
    ['Type', 'Quantity', 'Unit'],
    ...Object.entries(summary.byType).map(([type, qty]) => [type, qty, getUnit(type)]),
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

  // Set column widths for summary
  wsSummary['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 10 },
  ]

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // Generate Excel file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  return blob
}

/**
 * Download file helper
 */
export function downloadFile(content: string | Blob, filename: string) {
  const blob = typeof content === 'string' ? new Blob([content], { type: 'text/csv' }) : content

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
