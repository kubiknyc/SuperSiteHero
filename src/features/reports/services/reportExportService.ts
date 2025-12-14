/**
 * Report Export Service
 *
 * Generates PDF, Excel, and CSV exports for custom reports.
 * Supports various data sources and formatting options.
 */

import ExcelJS from 'exceljs'
import type {
  ReportDataSource,
  ReportOutputFormat,
  ReportTemplateFieldInput,
  ReportTemplateFilterInput,
  ReportTemplateSortingInput,
  ReportFieldType,
  ReportFilterOperator,
} from '@/types/report-builder'
import { supabaseUntyped } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

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
}

export interface ReportExportResult {
  blob: Blob
  filename: string
  mimeType: string
  rowCount: number
}

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
// Excel Export
// ============================================================================

export async function exportToExcel(options: ReportExportOptions): Promise<ReportExportResult> {
  const data = await fetchReportData(options)
  const { fields, title, orientation = 'landscape' } = options

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
// PDF Export
// ============================================================================

export async function exportToPdf(options: ReportExportOptions): Promise<ReportExportResult> {
  const data = await fetchReportData(options)
  const { fields, title, orientation = 'landscape' } = options

  // Build HTML table
  const headerCells = fields
    .map(f => `<th style="background:#1f4e79;color:white;padding:8px;text-align:left;border:1px solid #ddd;">${escapeHtml(f.display_name)}</th>`)
    .join('')

  const rows = data
    .map((row, i) => {
      const bgColor = i % 2 === 0 ? '#fff' : '#f2f2f2'
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
          color: #1f4e79;
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
      <h1>${escapeHtml(title || 'Report')}</h1>
      <div class="meta">
        Generated: ${new Date().toLocaleString()} | Total Records: ${data.length}
      </div>
      <table>
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="footer">
        Generated by JobSight | Page 1
      </div>
    </body>
    </html>
  `

  // Convert HTML to PDF using browser's print functionality
  const blob = new Blob([html], { type: 'text/html' })
  const filename = `${title || 'report'}_${new Date().toISOString().split('T')[0]}.html`

  // Note: For true PDF generation, you would integrate a library like jsPDF or use a server-side solution
  // For now, we return HTML that can be printed to PDF by the browser

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
  downloadReport,
}