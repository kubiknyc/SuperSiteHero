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
 * Uses ExcelJS library (secure alternative to xlsx)
 */
export async function exportToExcel(
  measurements: TakeoffMeasurement[],
  scale?: ScaleFactor,
  projectName?: string,
  documentName?: string
): Promise<Blob> {
  // Lazy load exceljs library
  const ExcelJS = await import('exceljs')

  const rows = measurementsToRows(measurements, scale)
  const summary = calculateSummary(measurements, scale)

  // Create workbook
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'JobSight'
  workbook.created = new Date()

  // Measurements sheet
  const measurementsSheet = workbook.addWorksheet('Measurements')

  measurementsSheet.columns = [
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Unit', key: 'unit', width: 8 },
    { header: 'Color', key: 'color', width: 10 },
    { header: 'Notes', key: 'notes', width: 40 },
  ]

  // Style header row
  measurementsSheet.getRow(1).font = { bold: true }
  measurementsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  // Add data rows
  rows.forEach((row) => {
    measurementsSheet.addRow(row)
  })

  // Summary sheet
  const summarySheet = workbook.addWorksheet('Summary')

  summarySheet.columns = [
    { header: 'Field', key: 'field', width: 25 },
    { header: 'Value', key: 'value', width: 15 },
    { header: 'Unit', key: 'unit', width: 10 },
  ]

  // Add summary data
  summarySheet.addRow({ field: 'Takeoff Summary', value: '', unit: '' })
  summarySheet.addRow({ field: '', value: '', unit: '' })
  summarySheet.addRow({ field: 'Project:', value: projectName || 'Unknown', unit: '' })
  summarySheet.addRow({ field: 'Document:', value: documentName || 'Unknown', unit: '' })
  summarySheet.addRow({ field: 'Date:', value: new Date().toLocaleDateString(), unit: '' })
  summarySheet.addRow({ field: '', value: '', unit: '' })
  summarySheet.addRow({ field: 'Total Measurements:', value: summary.totalMeasurements, unit: '' })
  summarySheet.addRow({ field: '', value: '', unit: '' })
  summarySheet.addRow({ field: 'By Type:', value: '', unit: '' })
  Object.entries(summary.byType).forEach(([type, qty]) => {
    summarySheet.addRow({ field: type, value: qty, unit: getUnit(type) })
  })

  // Style summary title
  summarySheet.getRow(1).font = { bold: true, size: 14 }

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
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

/**
 * Helper function to convert database TakeoffItem to TakeoffMeasurement
 */
function dbItemToMeasurement(item: any): TakeoffMeasurement {
  const measurementData = typeof item.measurement_data === 'object' && item.measurement_data !== null
    ? item.measurement_data as Record<string, any>
    : {}

  return {
    id: item.id,
    type: item.measurement_type,
    points: Array.isArray(measurementData.points) ? measurementData.points : [],
    color: item.color || '#FF0000',
    name: item.name,
    dropHeight: measurementData.dropHeight,
    pitch: measurementData.pitch,
    height: measurementData.height,
    depth: measurementData.depth,
    crossSections: measurementData.crossSections,
  }
}

/**
 * Export takeoff items (from database) to CSV
 */
export function exportTakeoffsToCSV(
  takeoffItems: any[],
  projectName: string,
  documentName: string
): void {
  const measurements = takeoffItems.map(dbItemToMeasurement)
  // Use default scale for now - in production, should fetch from project settings
  const csvContent = exportToCSV(measurements, undefined, projectName)
  const filename = `${projectName}-${documentName}-takeoffs-${Date.now()}.csv`
  downloadFile(csvContent, filename)
}

/**
 * Export takeoff items (from database) to Excel
 */
export async function exportTakeoffsToExcel(
  takeoffItems: any[],
  projectName: string,
  documentName: string
): Promise<void> {
  const measurements = takeoffItems.map(dbItemToMeasurement)
  // Use default scale for now - in production, should fetch from project settings
  const blob = await exportToExcel(measurements, undefined, projectName, documentName)
  const filename = `${projectName}-${documentName}-takeoffs-${Date.now()}.xlsx`
  downloadFile(blob, filename)
}
