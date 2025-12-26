/**
 * Report Export Service
 *
 * Generates PDF, Excel, and CSV exports for custom reports.
 * Supports various data sources and formatting options.
 */

import type {
  ReportDataSource,
  ReportOutputFormat,
  ReportTemplateFieldInput,
  ReportTemplateFilterInput,
  ReportTemplateSortingInput,
  ReportFieldType,
  ChartConfiguration,
} from '@/types/report-builder'
import { supabaseUntyped } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Lazy Loaders for Heavy Export Libraries
// ============================================================================

type JsPDFModule = typeof import('jspdf')
type AutoTableModule = typeof import('jspdf-autotable')
type ExcelJSModule = typeof import('exceljs')

// Type alias for jsPDF document instance
type JsPDFDocument = InstanceType<JsPDFModule['default']>
type AutoTableFunction = AutoTableModule['default']

let jsPDFCache: JsPDFModule | null = null
let autoTableCache: AutoTableModule | null = null
let excelJSCache: ExcelJSModule | null = null

async function loadJsPDF(): Promise<JsPDFModule['default']> {
  if (!jsPDFCache) {
    jsPDFCache = await import('jspdf')
  }
  return jsPDFCache.default
}

async function loadAutoTable(): Promise<AutoTableModule['default']> {
  if (!autoTableCache) {
    autoTableCache = await import('jspdf-autotable')
  }
  return autoTableCache.default
}

async function loadExcelJS(): Promise<ExcelJSModule> {
  if (!excelJSCache) {
    excelJSCache = await import('exceljs')
  }
  return excelJSCache
}

// ============================================================================
// Types
// ============================================================================

export interface ReportExportOptions {
  dataSource: ReportDataSource
  fields: ReportTemplateFieldInput[]
  filters?: ReportTemplateFilterInput[]
  sorting?: ReportTemplateSortingInput[]
  projectId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  title?: string
  includeHeaders?: boolean
  orientation?: 'portrait' | 'landscape'
  chartConfig?: ChartConfiguration
  includeChart?: boolean
  companyLogo?: string
  companyName?: string
}

export interface ReportExportResult {
  blob: Blob
  filename: string
  mimeType: string
  rowCount: number
}

// ============================================================================
// PDF Styling Configuration
// ============================================================================

const PDF_STYLES = {
  colors: {
    primary: [37, 99, 235] as [number, number, number], // Blue
    headerText: [255, 255, 255] as [number, number, number],
    black: [33, 37, 41] as [number, number, number],
    darkGray: [75, 85, 99] as [number, number, number],
    mediumGray: [107, 114, 128] as [number, number, number],
    lightGray: [229, 231, 235] as [number, number, number],
    alternateRow: [249, 250, 251] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    success: [34, 197, 94] as [number, number, number],
    warning: [234, 179, 8] as [number, number, number],
    error: [239, 68, 68] as [number, number, number],
  },
  fonts: {
    title: 18,
    subtitle: 12,
    header: 10,
    body: 9,
    small: 8,
    footer: 7,
  },
  spacing: {
    margin: 15,
    cellPadding: 3,
    lineHeight: 1.2,
  },
}

// Chart colors for PDF rendering
const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
]

// ============================================================================
// Data Source to Table Mapping
// ============================================================================

const DATA_SOURCE_TABLE_MAP: Record<ReportDataSource, string> = {
  rfis: 'rfis',
  submittals: 'submittals',
  daily_reports: 'daily_reports',
  change_orders: 'change_orders',
  payment_applications: 'payment_applications',
  safety_incidents: 'safety_incidents',
  inspections: 'inspections',
  punch_list: 'punch_list_items',
  tasks: 'tasks',
  meetings: 'meeting_minutes',
  documents: 'documents',
  equipment: 'equipment',
  lien_waivers: 'lien_waivers',
  insurance_certificates: 'insurance_certificates',
  toolbox_talks: 'toolbox_talks',
}

// ============================================================================
// Filter Application
// ============================================================================

function applyFilters(
  query: any,
  filters: ReportTemplateFilterInput[],
  dateFrom?: string | null,
  dateTo?: string | null
): any {
  let q = query

  // Apply date range filters
  if (dateFrom) {
    q = q.gte('created_at', dateFrom)
  }
  if (dateTo) {
    q = q.lte('created_at', dateTo)
  }

  // Apply custom filters
  for (const filter of filters) {
    const { field_name, operator, filter_value, is_relative_date, relative_date_value, relative_date_unit } = filter

    // Handle relative dates
    let value = filter_value
    if (is_relative_date && relative_date_value && relative_date_unit) {
      const now = new Date()
      switch (relative_date_unit) {
        case 'days':
          now.setDate(now.getDate() - relative_date_value)
          break
        case 'weeks':
          now.setDate(now.getDate() - relative_date_value * 7)
          break
        case 'months':
          now.setMonth(now.getMonth() - relative_date_value)
          break
      }
      value = now.toISOString().split('T')[0]
    }

    // Apply operator
    switch (operator) {
      case 'equals':
        q = q.eq(field_name, value)
        break
      case 'not_equals':
        q = q.neq(field_name, value)
        break
      case 'contains':
        q = q.ilike(field_name, `%${value}%`)
        break
      case 'not_contains':
        q = q.not(field_name, 'ilike', `%${value}%`)
        break
      case 'starts_with':
        q = q.ilike(field_name, `${value}%`)
        break
      case 'ends_with':
        q = q.ilike(field_name, `%${value}`)
        break
      case 'greater_than':
        q = q.gt(field_name, value)
        break
      case 'less_than':
        q = q.lt(field_name, value)
        break
      case 'greater_or_equal':
        q = q.gte(field_name, value)
        break
      case 'less_or_equal':
        q = q.lte(field_name, value)
        break
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          q = q.gte(field_name, value[0]).lte(field_name, value[1])
        }
        break
      case 'in':
        if (Array.isArray(value)) {
          q = q.in(field_name, value)
        }
        break
      case 'not_in':
        if (Array.isArray(value)) {
          q = q.not(field_name, 'in', `(${value.join(',')})`)
        }
        break
      case 'is_null':
        q = q.is(field_name, null)
        break
      case 'is_not_null':
        q = q.not(field_name, 'is', null)
        break
    }
  }

  return q
}

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchReportData(options: ReportExportOptions): Promise<Record<string, unknown>[]> {
  const { dataSource, fields, filters = [], sorting = [], projectId, dateFrom, dateTo } = options

  const tableName = DATA_SOURCE_TABLE_MAP[dataSource]
  if (!tableName) {
    throw new Error(`Unknown data source: ${dataSource}`)
  }

  // Build select columns
  const selectColumns = fields.map(f => f.field_name).join(', ')

  let query = supabaseUntyped
    .from(tableName)
    .select(selectColumns || '*')

  // Filter by project if applicable
  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  // Filter out deleted records
  query = query.is('deleted_at', null)

  // Apply filters
  query = applyFilters(query, filters, dateFrom, dateTo)

  // Apply sorting
  for (const sort of sorting) {
    query = query.order(sort.field_name, { ascending: sort.direction === 'asc' })
  }

  // Default sort by created_at if no sorting specified
  if (sorting.length === 0) {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    logger.error('[ReportExport] Error fetching data:', error)
    throw error
  }

  return data || []
}

// ============================================================================
// Value Formatting
// ============================================================================

function formatValue(value: unknown, fieldType: ReportFieldType, formatString?: string | null): string {
  if (value === null || value === undefined) {
    return ''
  }

  switch (fieldType) {
    case 'date':
      try {
        const date = new Date(value as string)
        if (formatString) {
          // Basic format string support
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: formatString.includes('MMM') ? 'short' : '2-digit',
            day: '2-digit',
          })
        }
        return date.toLocaleDateString('en-US')
      } catch {
        return String(value)
      }

    case 'datetime':
      try {
        const datetime = new Date(value as string)
        return datetime.toLocaleString('en-US')
      } catch {
        return String(value)
      }

    case 'currency':
      try {
        const num = typeof value === 'number' ? value : parseFloat(String(value))
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(num)
      } catch {
        return String(value)
      }

    case 'number':
      try {
        const num = typeof value === 'number' ? value : parseFloat(String(value))
        return formatString
          ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num)
          : String(num)
      } catch {
        return String(value)
      }

    case 'boolean':
      return value ? 'Yes' : 'No'

    case 'status':
      // Capitalize and replace underscores
      return String(value).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    default:
      return String(value)
  }
}

/**
 * Format a value specifically for PDF display (with truncation for long text)
 */
function formatPdfValue(value: unknown, fieldType: ReportFieldType, formatString?: string | null, maxLength = 50): string {
  const formatted = formatValue(value, fieldType, formatString)
  if (formatted.length > maxLength && fieldType === 'text') {
    return formatted.substring(0, maxLength - 3) + '...'
  }
  return formatted
}

// ============================================================================
// CSV Export
// ============================================================================

export async function exportToCsv(options: ReportExportOptions): Promise<ReportExportResult> {
  const data = await fetchReportData(options)
  const { fields, title } = options

  // Build CSV content
  const lines: string[] = []

  // Header row
  const headers = fields.map(f => `"${f.display_name.replace(/"/g, '""')}"`)
  lines.push(headers.join(','))

  // Data rows
  for (const row of data) {
    const values = fields.map(f => {
      const value = row[f.field_name]
      const formatted = formatValue(value, f.field_type, f.format_string)
      // Escape quotes and wrap in quotes
      return `"${formatted.replace(/"/g, '""')}"`
    })
    lines.push(values.join(','))
  }

  const csvContent = lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const filename = `${title || 'report'}_${new Date().toISOString().split('T')[0]}.csv`

  return {
    blob,
    filename,
    mimeType: 'text/csv',
    rowCount: data.length,
  }
}

// ============================================================================
// Chart Data Helpers
// ============================================================================

/**
 * Generate chart data for export
 */
function generateChartDataForExport(
  data: Record<string, unknown>[],
  chartConfig: ChartConfiguration
): { labels: string[]; values: number[] } {
  const groups = new Map<string, number[]>()

  data.forEach((row) => {
    const groupValue = String(row[chartConfig.groupByField] || 'N/A')
    const value = Number(row[chartConfig.valueField]) || 0

    if (!groups.has(groupValue)) {
      groups.set(groupValue, [])
    }
    groups.get(groupValue)!.push(value)
  })

  const labels: string[] = []
  const values: number[] = []

  groups.forEach((vals, label) => {
    labels.push(label)
    const aggregation = chartConfig.aggregation || 'sum'
    let value = 0

    switch (aggregation) {
      case 'sum':
        value = vals.reduce((acc, v) => acc + v, 0)
        break
      case 'average':
        value = vals.reduce((acc, v) => acc + v, 0) / vals.length
        break
      case 'count':
        value = vals.length
        break
      case 'min':
        value = Math.min(...vals)
        break
      case 'max':
        value = Math.max(...vals)
        break
      default:
        value = vals[0] || 0
    }

    values.push(value)
  })

  return { labels, values }
}

// ============================================================================
// Excel Export
// ============================================================================

export async function exportToExcel(options: ReportExportOptions): Promise<ReportExportResult> {
  const data = await fetchReportData(options)
  const { fields, title, orientation = 'landscape' } = options

  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'JobSight'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(title || 'Report', {
    pageSetup: {
      orientation: orientation,
      fitToPage: true,
      fitToWidth: 1,
    },
  })

  // Define columns
  worksheet.columns = fields.map(f => ({
    header: f.display_name,
    key: f.field_name,
    width: f.column_width ? f.column_width / 7 : getDefaultColumnWidth(f.field_type),
  }))

  // Style header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E79' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 24

  // Add data rows
  for (const row of data) {
    const rowData: Record<string, unknown> = {}
    for (const field of fields) {
      const value = row[field.field_name]
      rowData[field.field_name] = formatValueForExcel(value, field.field_type)
    }
    worksheet.addRow(rowData)
  }

  // Apply number formats
  for (let colIndex = 0; colIndex < fields.length; colIndex++) {
    const field = fields[colIndex]
    const column = worksheet.getColumn(colIndex + 1)

    switch (field.field_type) {
      case 'currency':
        column.numFmt = '"$"#,##0.00'
        break
      case 'number':
        column.numFmt = '#,##0.00'
        break
      case 'date':
        column.numFmt = 'mm/dd/yyyy'
        break
      case 'datetime':
        column.numFmt = 'mm/dd/yyyy hh:mm'
        break
    }
  }

  // Add alternating row colors
  for (let i = 2; i <= data.length + 1; i++) {
    if (i % 2 === 0) {
      const row = worksheet.getRow(i)
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      }
    }
  }

  // Auto-filter
  if (data.length > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.length + 1, column: fields.length },
    }
  }

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]

  // Add chart if configured
  if (options.includeChart && options.chartConfig) {
    try {
      const chartData = generateChartDataForExport(data, options.chartConfig)
      const chartSheet = workbook.addWorksheet('Chart Data')

      // Add chart data
      chartSheet.addRow(['Category', 'Value'])
      chartData.labels.forEach((label, i) => {
        chartSheet.addRow([label, chartData.values[i]])
      })

      // Style header
      const chartHeaderRow = chartSheet.getRow(1)
      chartHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      chartHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' },
      }

      // Add note about chart
      chartSheet.getCell('D1').value = 'Chart Type:'
      chartSheet.getCell('E1').value = options.chartConfig.type.toUpperCase()
      chartSheet.getCell('D2').value = 'Aggregation:'
      chartSheet.getCell('E2').value = options.chartConfig.aggregation.toUpperCase()
    } catch (error) {
      logger.error('[ReportExport] Error adding chart to Excel:', error)
    }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const filename = `${title || 'report'}_${new Date().toISOString().split('T')[0]}.xlsx`

  return {
    blob,
    filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    rowCount: data.length,
  }
}

function getDefaultColumnWidth(fieldType: ReportFieldType): number {
  switch (fieldType) {
    case 'date':
    case 'datetime':
      return 15
    case 'currency':
    case 'number':
      return 12
    case 'boolean':
      return 8
    case 'status':
      return 15
    default:
      return 20
  }
}

function formatValueForExcel(value: unknown, fieldType: ReportFieldType): unknown {
  if (value === null || value === undefined) {
    return ''
  }

  switch (fieldType) {
    case 'date':
    case 'datetime':
      try {
        return new Date(value as string)
      } catch {
        return value
      }

    case 'currency':
    case 'number':
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0

    case 'boolean':
      return value ? 'Yes' : 'No'

    case 'status':
      return String(value).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    default:
      return String(value)
  }
}

// ============================================================================
// PDF Export - Helper Functions
// ============================================================================

/**
 * Add company header with optional logo to PDF
 */
function addCompanyHeader(
  doc: JsPDFDocument,
  options: {
    companyName?: string
    companyLogo?: string
    title: string
    orientation: 'portrait' | 'landscape'
  }
): number {
  const { companyName, title, orientation } = options
  const pageWidth = orientation === 'landscape' ? 297 : 210
  const margin = PDF_STYLES.spacing.margin
  let y = margin

  // Company name / branding
  if (companyName) {
    doc.setFontSize(PDF_STYLES.fonts.subtitle)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PDF_STYLES.colors.darkGray)
    doc.text(companyName, margin, y + 5)
    y += 10
  }

  // Title bar
  doc.setFillColor(...PDF_STYLES.colors.primary)
  doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F')

  doc.setFontSize(PDF_STYLES.fonts.title)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_STYLES.colors.headerText)
  doc.text(title.toUpperCase(), pageWidth / 2, y + 8.5, { align: 'center' })

  y += 16

  // Generation info
  doc.setFontSize(PDF_STYLES.fonts.small)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_STYLES.colors.mediumGray)
  const generatedDate = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  doc.text(`Generated: ${generatedDate}`, margin, y + 3)

  y += 8

  return y
}

/**
 * Add a data table to the PDF with styling
 */
function addTableToPdf(
  doc: JsPDFDocument,
  data: Record<string, unknown>[],
  fields: ReportTemplateFieldInput[],
  startY: number,
  options: {
    orientation: 'portrait' | 'landscape'
  },
  autoTable: AutoTableFunction
): number {
  const { orientation } = options
  const pageWidth = orientation === 'landscape' ? 297 : 210
  const margin = PDF_STYLES.spacing.margin

  // Prepare table headers
  const headers = fields.map(f => f.display_name)

  // Prepare table body
  const body = data.map(row => {
    return fields.map(field => {
      const value = row[field.field_name]
      return formatPdfValue(value, field.field_type, field.format_string, 40)
    })
  })

  // Calculate column widths based on field types
  const contentWidth = pageWidth - 2 * margin
  const columnWidths = fields.map(f => {
    if (f.column_width) {return f.column_width}
    switch (f.field_type) {
      case 'date':
        return 25
      case 'datetime':
        return 35
      case 'currency':
      case 'number':
        return 22
      case 'boolean':
        return 15
      case 'status':
        return 25
      default:
        return 'auto'
    }
  })

  // Generate table using autoTable
  autoTable(doc as Parameters<typeof autoTable>[0], {
    startY: startY,
    head: [headers],
    body: body,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: PDF_STYLES.fonts.body,
      cellPadding: PDF_STYLES.spacing.cellPadding,
      overflow: 'linebreak',
      lineColor: PDF_STYLES.colors.lightGray,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: PDF_STYLES.colors.primary,
      textColor: PDF_STYLES.colors.headerText,
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: PDF_STYLES.colors.alternateRow,
    },
    columnStyles: columnWidths.reduce((acc, width, index) => {
      if (width !== 'auto') {
        acc[index] = { cellWidth: width }
      }
      // Align numeric/currency fields to the right
      const fieldType = fields[index].field_type
      if (fieldType === 'currency' || fieldType === 'number') {
        acc[index] = { ...acc[index], halign: 'right' }
      }
      return acc
    }, {} as Record<number, { cellWidth?: number; halign?: 'left' | 'center' | 'right' }>),
    didDrawPage: (hookData) => {
      // Add page number on each page
      const pageCount = doc.getNumberOfPages()
      const currentPage = hookData.pageNumber
      doc.setFontSize(PDF_STYLES.fonts.footer)
      doc.setTextColor(...PDF_STYLES.colors.mediumGray)

      const pageHeight = orientation === 'landscape' ? 210 : 297
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      )
    },
  })

  // Return the final Y position after the table
  return (doc as any).lastAutoTable?.finalY || startY + 50
}

/**
 * Add a chart visualization to the PDF
 */
function addChartToPdf(
  doc: JsPDFDocument,
  chartData: { labels: string[]; values: number[] },
  chartConfig: ChartConfiguration,
  startY: number,
  options: {
    orientation: 'portrait' | 'landscape'
  }
): number {
  const { orientation } = options
  const pageWidth = orientation === 'landscape' ? 297 : 210
  const pageHeight = orientation === 'landscape' ? 210 : 297
  const margin = PDF_STYLES.spacing.margin
  const contentWidth = pageWidth - 2 * margin

  // Check if we need a new page for the chart
  if (startY + 100 > pageHeight - 30) {
    doc.addPage()
    startY = margin
  }

  let y = startY

  // Chart title
  const chartTitle = chartConfig.title || `${chartConfig.type.charAt(0).toUpperCase() + chartConfig.type.slice(1)} Chart`
  doc.setFontSize(PDF_STYLES.fonts.header)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_STYLES.colors.black)
  doc.text(chartTitle, margin, y + 5)
  y += 12

  // Draw chart based on type
  const maxValue = Math.max(...chartData.values, 1) // Prevent division by zero
  const chartHeight = 80
  const chartWidth = Math.min(contentWidth, 180)
  const chartStartX = margin + (contentWidth - chartWidth) / 2

  if (chartConfig.type === 'bar') {
    // Bar chart
    const barWidth = Math.min(30, (chartWidth - 20) / chartData.labels.length - 5)
    const chartAreaWidth = chartData.labels.length * (barWidth + 5)
    const barStartX = chartStartX + (chartWidth - chartAreaWidth) / 2

    // Draw bars
    chartData.labels.forEach((label, index) => {
      const barHeight = (chartData.values[index] / maxValue) * (chartHeight - 20)
      const x = barStartX + index * (barWidth + 5)
      const barY = y + chartHeight - barHeight

      // Draw bar
      const color = CHART_COLORS[index % CHART_COLORS.length]
      const rgb = hexToRgb(color)
      doc.setFillColor(rgb.r, rgb.g, rgb.b)
      doc.rect(x, barY, barWidth, barHeight, 'F')

      // Draw value above bar
      doc.setFontSize(PDF_STYLES.fonts.small)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...PDF_STYLES.colors.black)
      const valueStr = formatChartValue(chartData.values[index])
      doc.text(valueStr, x + barWidth / 2, barY - 2, { align: 'center' })

      // Draw label below bar
      doc.setFontSize(PDF_STYLES.fonts.footer)
      doc.setTextColor(...PDF_STYLES.colors.darkGray)
      const truncatedLabel = label.length > 10 ? label.substring(0, 8) + '..' : label
      doc.text(truncatedLabel, x + barWidth / 2, y + chartHeight + 5, { align: 'center' })
    })

    y += chartHeight + 15
  } else if (chartConfig.type === 'pie') {
    // Pie chart - render as a legend table since jsPDF doesn't have native pie charts
    const total = chartData.values.reduce((sum, v) => sum + v, 0) || 1

    // Draw legend table
    doc.setFontSize(PDF_STYLES.fonts.body)
    chartData.labels.forEach((label, index) => {
      const color = CHART_COLORS[index % CHART_COLORS.length]
      const rgb = hexToRgb(color)
      const percent = ((chartData.values[index] / total) * 100).toFixed(1)
      const value = formatChartValue(chartData.values[index])

      // Color box
      doc.setFillColor(rgb.r, rgb.g, rgb.b)
      doc.rect(margin, y, 8, 6, 'F')

      // Label and value
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...PDF_STYLES.colors.black)
      doc.text(`${label}: ${value} (${percent}%)`, margin + 12, y + 4.5)

      y += 8
    })

    y += 5
  } else if (chartConfig.type === 'line' || chartConfig.type === 'area') {
    // Line/Area chart - simplified representation
    const pointSpacing = chartWidth / Math.max(chartData.labels.length - 1, 1)

    // Draw line
    doc.setDrawColor(...PDF_STYLES.colors.primary)
    doc.setLineWidth(1)

    let prevX = 0
    let prevY = 0

    chartData.values.forEach((value, index) => {
      const x = chartStartX + index * pointSpacing
      const pointY = y + chartHeight - (value / maxValue) * (chartHeight - 10)

      if (index > 0) {
        doc.line(prevX, prevY, x, pointY)
      }

      // Draw point
      doc.setFillColor(...PDF_STYLES.colors.primary)
      doc.circle(x, pointY, 2, 'F')

      prevX = x
      prevY = pointY
    })

    // Draw labels below
    doc.setFontSize(PDF_STYLES.fonts.footer)
    doc.setTextColor(...PDF_STYLES.colors.darkGray)
    chartData.labels.forEach((label, index) => {
      if (index % Math.ceil(chartData.labels.length / 6) === 0 || index === chartData.labels.length - 1) {
        const x = chartStartX + index * pointSpacing
        const truncatedLabel = label.length > 8 ? label.substring(0, 6) + '..' : label
        doc.text(truncatedLabel, x, y + chartHeight + 5, { align: 'center' })
      }
    })

    y += chartHeight + 15
  }

  return y
}

/**
 * Add summary statistics section to PDF
 */
function addSummarySection(
  doc: JsPDFDocument,
  data: Record<string, unknown>[],
  fields: ReportTemplateFieldInput[],
  startY: number,
  options: {
    orientation: 'portrait' | 'landscape'
  }
): number {
  const { orientation } = options
  const pageWidth = orientation === 'landscape' ? 297 : 210
  const margin = PDF_STYLES.spacing.margin

  let y = startY + 10

  // Section header
  doc.setFillColor(...PDF_STYLES.colors.lightGray)
  doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F')
  doc.setFontSize(PDF_STYLES.fonts.body)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_STYLES.colors.black)
  doc.text('SUMMARY', margin + 2, y + 4.5)
  y += 10

  // Summary stats
  doc.setFontSize(PDF_STYLES.fonts.body)
  doc.setFont('helvetica', 'normal')

  // Total records
  doc.text(`Total Records: ${data.length}`, margin, y + 4)

  // Calculate numeric field summaries
  const numericFields = fields.filter(f => f.field_type === 'currency' || f.field_type === 'number')
  let summaryX = margin + 50

  numericFields.slice(0, 3).forEach(field => {
    const values = data.map(row => {
      const val = row[field.field_name]
      return typeof val === 'number' ? val : parseFloat(String(val)) || 0
    })

    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0)
      const formatted = field.field_type === 'currency'
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(sum)
        : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(sum)

      doc.text(`${field.display_name} Total: ${formatted}`, summaryX, y + 4)
      summaryX += 60
    }
  })

  y += 10

  return y
}

/**
 * Add footer to all pages
 */
function addPdfFooter(doc: JsPDFDocument, options: { orientation: 'portrait' | 'landscape'; companyName?: string }): void {
  const { orientation, companyName } = options
  const pageWidth = orientation === 'landscape' ? 297 : 210
  const pageHeight = orientation === 'landscape' ? 210 : 297
  const margin = PDF_STYLES.spacing.margin
  const pageCount = doc.getNumberOfPages()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)

    // Footer line
    doc.setDrawColor(...PDF_STYLES.colors.lightGray)
    doc.setLineWidth(0.3)
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

    doc.setFontSize(PDF_STYLES.fonts.footer)
    doc.setTextColor(...PDF_STYLES.colors.mediumGray)

    // Company name or JobSight
    doc.text(companyName || 'JobSight', margin, pageHeight - 8)

    // Page number
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
  }
}

/**
 * Helper: Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 59, g: 130, b: 246 } // Default blue
}

/**
 * Helper: Format chart values
 */
function formatChartValue(value: number): string {
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K'
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1)
}

// ============================================================================
// PDF Export - Main Function
// ============================================================================

export async function exportToPdf(options: ReportExportOptions): Promise<ReportExportResult> {
  const data = await fetchReportData(options)
  const {
    fields,
    title = 'Report',
    orientation = 'landscape',
    chartConfig,
    includeChart = false,
    companyName,
  } = options

  // Validate data
  if (!fields || fields.length === 0) {
    throw new Error('No fields specified for PDF export')
  }

  // Load PDF libraries dynamically
  const jsPDF = await loadJsPDF()
  const autoTable = await loadAutoTable()

  // Create PDF document
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
  })

  try {
    // Add header
    let currentY = addCompanyHeader(doc, {
      companyName,
      title,
      orientation,
    })

    // Add data table
    currentY = addTableToPdf(doc, data, fields, currentY, { orientation }, autoTable)

    // Add summary section
    currentY = addSummarySection(doc, data, fields, currentY, { orientation })

    // Add chart if configured
    if (includeChart && chartConfig && data.length > 0) {
      try {
        const chartData = generateChartDataForExport(data, chartConfig)
        if (chartData.labels.length > 0) {
          currentY = addChartToPdf(doc, chartData, chartConfig, currentY + 10, { orientation })
        }
      } catch (chartError) {
        logger.warn('[ReportExport] Failed to add chart to PDF:', chartError)
        // Continue without chart
      }
    }

    // Add footer to all pages
    addPdfFooter(doc, { orientation, companyName })

    // Generate PDF blob
    const blob = doc.output('blob')
    const filename = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

    logger.info(`[ReportExport] PDF generated successfully: ${data.length} rows, ${doc.getNumberOfPages()} pages`)

    return {
      blob,
      filename,
      mimeType: 'application/pdf',
      rowCount: data.length,
    }
  } catch (error) {
    logger.error('[ReportExport] Error generating PDF:', error)
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// ============================================================================
// HTML Export (Backward Compatibility)
// ============================================================================

/**
 * Export report as HTML (for backward compatibility or browser printing)
 */
export async function exportToHtml(options: ReportExportOptions): Promise<ReportExportResult> {
  const data = await fetchReportData(options)
  const { fields, title, orientation = 'landscape', chartConfig, includeChart } = options

  // Generate chart HTML if configured
  let chartHtml = ''
  if (includeChart && chartConfig) {
    const chartData = generateChartDataForExport(data, chartConfig)
    const maxValue = Math.max(...chartData.values, 1)
    const chartTitle = chartConfig.title || `${chartConfig.type.toUpperCase()} Chart`

    if (chartConfig.type === 'bar') {
      const bars = chartData.labels
        .map((label, i) => {
          const height = (chartData.values[i] / maxValue) * 200
          const barColor = CHART_COLORS[i % CHART_COLORS.length]
          return `
            <div style="display:inline-block;margin:0 10px;text-align:center;">
              <div style="height:200px;display:flex;align-items:flex-end;">
                <div style="background:${barColor};width:40px;height:${height}px;border-radius:4px 4px 0 0;"></div>
              </div>
              <div style="font-size:10px;margin-top:5px;max-width:60px;word-wrap:break-word;">${escapeHtml(label)}</div>
              <div style="font-size:9px;color:#666;margin-top:2px;">${chartData.values[i].toFixed(0)}</div>
            </div>
          `
        })
        .join('')

      chartHtml = `
        <div style="margin:30px 0;padding:20px;background:#f9fafb;border-radius:8px;">
          <h3 style="margin:0 0 20px 0;color:#1f4e79;">${escapeHtml(chartTitle)}</h3>
          <div style="display:flex;justify-content:center;align-items:flex-end;">
            ${bars}
          </div>
        </div>
      `
    } else if (chartConfig.type === 'pie') {
      const total = chartData.values.reduce((acc, v) => acc + v, 0) || 1
      const rows = chartData.labels
        .map((label, i) => {
          const percent = ((chartData.values[i] / total) * 100).toFixed(1)
          const barColor = CHART_COLORS[i % CHART_COLORS.length]
          return `
            <tr>
              <td style="padding:8px;border:1px solid #ddd;">
                <span style="display:inline-block;width:12px;height:12px;background:${barColor};margin-right:8px;"></span>
                ${escapeHtml(label)}
              </td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;">${chartData.values[i].toFixed(0)}</td>
              <td style="padding:8px;border:1px solid #ddd;text-align:right;">${percent}%</td>
            </tr>
          `
        })
        .join('')

      chartHtml = `
        <div style="margin:30px 0;padding:20px;background:#f9fafb;border-radius:8px;">
          <h3 style="margin:0 0 20px 0;color:#1f4e79;">${escapeHtml(chartTitle)}</h3>
          <table style="border-collapse:collapse;width:100%;max-width:400px;margin:0 auto;">
            <thead>
              <tr style="background:#2563eb;color:white;">
                <th style="padding:8px;text-align:left;border:1px solid #ddd;">Category</th>
                <th style="padding:8px;text-align:right;border:1px solid #ddd;">Value</th>
                <th style="padding:8px;text-align:right;border:1px solid #ddd;">Percent</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `
    }
  }

  // Build HTML table
  const headerCells = fields
    .map(f => `<th style="background:#2563eb;color:white;padding:8px;text-align:left;border:1px solid #ddd;">${escapeHtml(f.display_name)}</th>`)
    .join('')

  const rows = data
    .map((row, i) => {
      const bgColor = i % 2 === 0 ? '#fff' : '#f9fafb'
      const cells = fields
        .map(f => {
          const value = formatValue(row[f.field_name], f.field_type, f.format_string)
          return `<td style="padding:6px 8px;border:1px solid #ddd;background:${bgColor};">${escapeHtml(value)}</td>`
        })
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title || 'Report')}</title>
      <style>
        @page {
          size: ${orientation === 'landscape' ? 'landscape' : 'portrait'};
          margin: 0.5in;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 10pt;
          margin: 0;
          padding: 20px;
        }
        h1 {
          font-size: 18pt;
          margin-bottom: 10px;
          color: #2563eb;
        }
        .meta {
          color: #666;
          font-size: 9pt;
          margin-bottom: 20px;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th, td {
          font-size: 9pt;
        }
        .footer {
          margin-top: 20px;
          text-align: center;
          color: #666;
          font-size: 8pt;
        }
      </style>
    </head>
    <body>
      <h1 className="heading-page">${escapeHtml(title || 'Report')}</h1>
      <div class="meta">
        Generated: ${new Date().toLocaleString()} | Total Records: ${data.length}
      </div>
      ${chartHtml}
      <table>
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="footer">
        Generated by JobSight
      </div>
    </body>
    </html>
  `

  const blob = new Blob([html], { type: 'text/html' })
  const filename = `${title || 'report'}_${new Date().toISOString().split('T')[0]}.html`

  return {
    blob,
    filename,
    mimeType: 'text/html',
    rowCount: data.length,
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ============================================================================
// Main Export Function
// ============================================================================

export async function generateReport(
  format: ReportOutputFormat,
  options: ReportExportOptions
): Promise<ReportExportResult> {
  logger.info(`[ReportExport] Generating ${format} report for ${options.dataSource}`)

  switch (format) {
    case 'csv':
      return exportToCsv(options)
    case 'excel':
      return exportToExcel(options)
    case 'pdf':
      return exportToPdf(options)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

// ============================================================================
// Download Helper
// ============================================================================

export function downloadReport(result: ReportExportResult): void {
  const url = URL.createObjectURL(result.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================================
// Export Service Object
// ============================================================================

export const reportExportService = {
  generateReport,
  exportToCsv,
  exportToExcel,
  exportToPdf,
  exportToHtml,
  downloadReport,
}
