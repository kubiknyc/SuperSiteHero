// File: /src/features/documents/utils/measurementExport.ts
// Utility functions for exporting measurements to various formats

import type {
  MeasurementAnnotation,
  MeasurementExportData,
  MeasurementExportOptions,
  ScaleCalibration,
  CountMarker,
  CountCategory,
  MeasurementType,
} from '../types/markup'
import { UNIT_CONVERSION, formatVolume, convertVolume } from '../components/markup/MeasurementTools'

// Simplified export data interface for the task requirement
export interface SimpleMeasurementExportData {
  type: 'distance' | 'area' | 'angle' | 'count'
  value: number
  unit: string
  label?: string
  page: number
  timestamp: string
}

// Unit abbreviations
const UNIT_ABBREV: Record<string, string> = {
  feet: 'ft',
  inches: 'in',
  meters: 'm',
  centimeters: 'cm',
  millimeters: 'mm',
}

// Format measurement value with unit
function formatMeasurementValue(value: number, unit: string, type: string): string {
  const abbrev = UNIT_ABBREV[unit] || unit
  const precision = unit === 'millimeters' || unit === 'inches' ? 1 : 2
  const formattedValue = value.toFixed(precision)

  if (type === 'area') {
    return `${formattedValue} ${abbrev}2`
  }
  if (type === 'angle') {
    return `${formattedValue} deg`
  }
  return `${formattedValue} ${abbrev}`
}

// Convert measurements to export data format
export function prepareMeasurementsForExport(
  measurements: MeasurementAnnotation[],
  scale: ScaleCalibration | null,
  pageNumber: number,
  sheetName?: string,
  currentUser?: string
): MeasurementExportData[] {
  return measurements.map((m) => {
    const exportData: MeasurementExportData = {
      id: m.id,
      type: m.type,
      value: m.value,
      unit: m.unit,
      displayValue: formatMeasurementValue(m.value, m.unit, m.type),
      pageNumber,
      sheetName,
      timestamp: new Date().toISOString(),
      createdBy: currentUser,
    }

    // Add volume data if present
    if (m.volumeValue !== undefined && m.volumeUnit) {
      exportData.depth = m.depth
      exportData.volumeValue = m.volumeValue
      exportData.volumeUnit = m.volumeUnit
    }

    // Add angle data if present
    if (m.type === 'angle' && m.angleValue !== undefined) {
      exportData.value = m.angleValue
      exportData.displayValue = `${m.angleValue.toFixed(1)} deg`
    }

    return exportData
  })
}

// Export to CSV format
export function exportToCSV(
  data: MeasurementExportData[],
  options: MeasurementExportOptions,
  scale?: ScaleCalibration | null
): string {
  const headers: string[] = ['#', 'Type', 'Value', 'Unit', 'Display Value']

  if (options.groupByPage) {
    headers.push('Page', 'Sheet')
  }
  if (options.includeTimestamps) {
    headers.push('Timestamp')
  }
  if (options.includeUserInfo) {
    headers.push('Created By')
  }

  // Add volume columns if any measurements have volume
  const hasVolume = data.some((d) => d.volumeValue !== undefined)
  if (hasVolume) {
    headers.push('Depth', 'Volume', 'Volume Unit')
  }

  const rows: string[][] = []

  // Add scale info if requested
  if (options.includeScale && scale) {
    rows.push([
      'Scale Info',
      '',
      `${scale.pixelDistance}px = ${scale.realWorldDistance} ${scale.unit}`,
      '',
      '',
    ])
    rows.push([]) // Empty row
  }

  // Sort data if grouping is enabled
  const sortedData = [...data]
  if (options.groupByType) {
    sortedData.sort((a, b) => a.type.localeCompare(b.type))
  }
  if (options.groupByPage) {
    sortedData.sort((a, b) => a.pageNumber - b.pageNumber)
  }

  // Add data rows
  sortedData.forEach((item, index) => {
    const row: string[] = [
      String(index + 1),
      item.type,
      String(item.value),
      item.unit,
      item.displayValue,
    ]

    if (options.groupByPage) {
      row.push(String(item.pageNumber), item.sheetName || '')
    }
    if (options.includeTimestamps) {
      row.push(item.timestamp)
    }
    if (options.includeUserInfo) {
      row.push(item.createdBy || '')
    }
    if (hasVolume) {
      row.push(
        item.depth !== undefined ? String(item.depth) : '',
        item.volumeValue !== undefined ? String(item.volumeValue) : '',
        item.volumeUnit || ''
      )
    }

    rows.push(row)
  })

  // Add summary row
  const typeGroups = data.reduce(
    (acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = { count: 0, total: 0 }
      }
      acc[item.type].count++
      acc[item.type].total += item.value
      return acc
    },
    {} as Record<string, { count: number; total: number }>
  )

  rows.push([]) // Empty row
  rows.push(['Summary'])
  Object.entries(typeGroups).forEach(([type, { count, total }]) => {
    rows.push(['', type, `Count: ${count}`, `Total: ${total.toFixed(2)}`])
  })

  // Convert to CSV string
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')

  return csvContent
}

// Export to JSON format
export function exportToJSON(
  data: MeasurementExportData[],
  options: MeasurementExportOptions,
  scale?: ScaleCalibration | null
): string {
  const exportObject: {
    exportDate: string
    scale?: {
      pixelDistance: number
      realWorldDistance: number
      unit: string
    }
    summary: {
      totalMeasurements: number
      byType: Record<string, { count: number; total: number }>
    }
    measurements: MeasurementExportData[]
  } = {
    exportDate: new Date().toISOString(),
    summary: {
      totalMeasurements: data.length,
      byType: {},
    },
    measurements: data,
  }

  if (options.includeScale && scale) {
    exportObject.scale = {
      pixelDistance: scale.pixelDistance,
      realWorldDistance: scale.realWorldDistance,
      unit: scale.unit,
    }
  }

  // Calculate summary by type
  data.forEach((item) => {
    if (!exportObject.summary.byType[item.type]) {
      exportObject.summary.byType[item.type] = { count: 0, total: 0 }
    }
    exportObject.summary.byType[item.type].count++
    exportObject.summary.byType[item.type].total += item.value
  })

  return JSON.stringify(exportObject, null, 2)
}

// Export count data to CSV
export function exportCountsToCSV(
  markers: CountMarker[],
  categories: CountCategory[]
): string {
  const headers = ['#', 'Category', 'Number', 'Label', 'X', 'Y', 'Page', 'Created At']

  const rows: string[][] = []

  // Group by category
  const categorizedMarkers = categories.map((cat) => ({
    category: cat,
    markers: markers.filter((m) => m.categoryId === cat.id),
  }))

  let globalIndex = 0
  categorizedMarkers.forEach(({ category, markers: catMarkers }) => {
    if (catMarkers.length === 0) {return}

    catMarkers.forEach((marker) => {
      globalIndex++
      rows.push([
        String(globalIndex),
        category.name,
        String(marker.number),
        marker.label || '',
        String(marker.position.x.toFixed(2)),
        String(marker.position.y.toFixed(2)),
        String(marker.pageNumber),
        marker.createdAt,
      ])
    })
  })

  // Add summary
  rows.push([])
  rows.push(['Summary'])
  categorizedMarkers.forEach(({ category, markers: catMarkers }) => {
    if (catMarkers.length > 0) {
      rows.push(['', category.name, String(catMarkers.length)])
    }
  })
  rows.push(['', 'Total', String(markers.length)])

  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  return [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')
}

// Download file helper
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Main export function
export function exportMeasurements(
  measurements: MeasurementAnnotation[],
  options: MeasurementExportOptions,
  scale: ScaleCalibration | null,
  pageNumber: number,
  sheetName?: string,
  currentUser?: string
): void {
  const data = prepareMeasurementsForExport(
    measurements,
    scale,
    pageNumber,
    sheetName,
    currentUser
  )

  const timestamp = new Date().toISOString().split('T')[0]
  const baseFilename = `measurements_${sheetName || 'page' + pageNumber}_${timestamp}`

  switch (options.format) {
    case 'csv': {
      const csvContent = exportToCSV(data, options, scale)
      downloadFile(csvContent, `${baseFilename}.csv`, 'text/csv')
      break
    }
    case 'json': {
      const jsonContent = exportToJSON(data, options, scale)
      downloadFile(jsonContent, `${baseFilename}.json`, 'application/json')
      break
    }
    case 'xlsx': {
      // For Excel format, we generate CSV and let the user convert
      // A full XLSX implementation would require a library like xlsx
      const csvContent = exportToCSV(data, options, scale)
      downloadFile(csvContent, `${baseFilename}.csv`, 'text/csv')
      console.info('XLSX export: CSV file generated. Open in Excel and save as .xlsx for native format.')
      break
    }
    default:
      console.error('Unknown export format:', options.format)
  }
}

// Export counts
export function exportCounts(
  markers: CountMarker[],
  categories: CountCategory[],
  sheetName?: string
): void {
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `counts_${sheetName || 'document'}_${timestamp}.csv`
  const csvContent = exportCountsToCSV(markers, categories)
  downloadFile(csvContent, filename, 'text/csv')
}

// ============================================================
// SIMPLIFIED EXPORT FUNCTIONS (Task Requirement)
// ============================================================

/**
 * Convert measurements to simplified export format
 */
export function convertToSimpleExportData(
  measurements: MeasurementAnnotation[],
  pageNumber: number = 1
): SimpleMeasurementExportData[] {
  return measurements.map((m) => {
    let type: 'distance' | 'area' | 'angle' | 'count' = 'distance'
    if (m.type === 'area' || m.type === 'perimeter') {type = 'area'}
    else if (m.type === 'angle') {type = 'angle'}
    else if (m.type === 'count') {type = 'count'}
    else {type = 'distance'}

    return {
      type,
      value: m.type === 'angle' ? (m.angleValue ?? m.value) : m.value,
      unit: m.type === 'angle' ? 'degrees' : m.unit,
      label: m.displayLabel || undefined,
      page: pageNumber,
      timestamp: new Date().toISOString(),
    }
  })
}

/**
 * Export measurements to CSV string format
 * Follows the task requirement interface
 */
export function exportMeasurementsToCSV(
  measurements: SimpleMeasurementExportData[]
): string {
  const headers = ['Type', 'Value', 'Unit', 'Label', 'Page', 'Timestamp']

  const rows = measurements.map((m) => [
    m.type,
    String(m.value.toFixed(2)),
    m.unit,
    m.label || '',
    String(m.page),
    m.timestamp,
  ])

  // Summary section
  const typeSummary: Record<string, { count: number; total: number }> = {}
  measurements.forEach((m) => {
    if (!typeSummary[m.type]) {
      typeSummary[m.type] = { count: 0, total: 0 }
    }
    typeSummary[m.type].count++
    typeSummary[m.type].total += m.value
  })

  const summaryRows: string[][] = [
    [],
    ['--- Summary ---'],
  ]

  Object.entries(typeSummary).forEach(([type, { count, total }]) => {
    summaryRows.push([type, `Count: ${count}`, `Total: ${total.toFixed(2)}`])
  })

  // Escape CSV values
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  return [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
    ...summaryRows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')
}

/**
 * Copy measurements to clipboard as formatted text
 * Follows the task requirement interface
 */
export async function copyMeasurementsToClipboard(
  measurements: SimpleMeasurementExportData[]
): Promise<void> {
  const lines: string[] = []

  // Group by type
  const grouped: Record<string, SimpleMeasurementExportData[]> = {}
  measurements.forEach((m) => {
    if (!grouped[m.type]) {
      grouped[m.type] = []
    }
    grouped[m.type].push(m)
  })

  // Format each group
  Object.entries(grouped).forEach(([type, items]) => {
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
    lines.push(`=== ${typeLabel} Measurements ===`)

    items.forEach((item, idx) => {
      let valueStr = `${item.value.toFixed(2)} ${item.unit}`
      if (item.label) {
        valueStr += ` (${item.label})`
      }
      lines.push(`  ${idx + 1}. ${valueStr}`)
    })

    // Calculate total for this type
    const total = items.reduce((sum, item) => sum + item.value, 0)
    lines.push(`  Total: ${total.toFixed(2)} ${items[0]?.unit || ''}`)
    lines.push('')
  })

  // Grand totals
  lines.push('=== Summary ===')
  lines.push(`Total measurements: ${measurements.length}`)
  lines.push(`Exported: ${new Date().toLocaleString()}`)

  const text = lines.join('\n')

  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    throw new Error('Failed to copy measurements to clipboard')
  }
}

/**
 * Copy running totals to clipboard
 */
export async function copyRunningTotalsToClipboard(
  totals: {
    distanceTotal?: number
    areaTotal?: number
    volumeTotal?: number
    angleCount?: number
    countsByCategory?: Record<string, number>
    measurementCount: number
  },
  unit: string,
  volumeUnit?: string
): Promise<void> {
  const lines: string[] = ['=== Running Totals ===']

  if (totals.distanceTotal && totals.distanceTotal > 0) {
    lines.push(`Distance: ${totals.distanceTotal.toFixed(2)} ${unit}`)
  }
  if (totals.areaTotal && totals.areaTotal > 0) {
    lines.push(`Area: ${totals.areaTotal.toFixed(2)} sq ${unit}`)
  }
  if (totals.volumeTotal && totals.volumeTotal > 0 && volumeUnit) {
    lines.push(`Volume: ${totals.volumeTotal.toFixed(2)} ${volumeUnit}`)
  }
  if (totals.angleCount && totals.angleCount > 0) {
    lines.push(`Angles: ${totals.angleCount} measurements`)
  }
  if (totals.countsByCategory && Object.keys(totals.countsByCategory).length > 0) {
    lines.push('')
    lines.push('Counts by Category:')
    Object.entries(totals.countsByCategory).forEach(([category, count]) => {
      lines.push(`  ${category}: ${count}`)
    })
  }

  lines.push('')
  lines.push(`Total measurements: ${totals.measurementCount}`)
  lines.push(`Copied: ${new Date().toLocaleString()}`)

  const text = lines.join('\n')

  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    throw new Error('Failed to copy running totals to clipboard')
  }
}

/**
 * Copy count summary to clipboard
 */
export async function copyCountSummaryToClipboard(
  categories: CountCategory[],
  markers: CountMarker[]
): Promise<void> {
  const lines: string[] = ['=== Count Summary ===', '']

  // Group markers by category
  const categoryCounts: Record<string, { name: string; color: string; count: number }> = {}

  categories.forEach((cat) => {
    const count = markers.filter((m) => m.categoryId === cat.id).length
    if (count > 0) {
      categoryCounts[cat.id] = {
        name: cat.name,
        color: cat.color,
        count,
      }
    }
  })

  Object.values(categoryCounts).forEach(({ name, count }) => {
    lines.push(`${name}: ${count}`)
  })

  const total = markers.length
  lines.push('')
  lines.push(`Total: ${total}`)
  lines.push('')
  lines.push(`Copied: ${new Date().toLocaleString()}`)

  const text = lines.join('\n')

  try {
    await navigator.clipboard.writeText(text)
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    throw new Error('Failed to copy count summary to clipboard')
  }
}
