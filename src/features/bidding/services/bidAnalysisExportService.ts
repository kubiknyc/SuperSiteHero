/**
 * Bid Analysis Export Service
 *
 * Generates PDF, Excel, and CSV exports for historical bid analysis data.
 * Supports vendor performance reports, bid trends, and accuracy metrics.
 */

import type {
  BidAnalysisFilters,
  ExportFormat,
  BidTrendData,
  VendorRecommendation,
} from '@/types/historical-bid-analysis'
import { format } from 'date-fns'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export interface BidAnalysisExportData {
  trends: BidTrendData[]
  recommendations: VendorRecommendation[]
  filters: BidAnalysisFilters
  summaryMetrics: {
    totalBids: number
    avgAccuracy: number
    topVendorsCount: number
    dateRange: {
      from: string
      to: string
    }
  }
}

export interface BidAnalysisExportResult {
  blob: Blob
  filename: string
  mimeType: string
}

export interface BidAnalysisExportOptions {
  includeCharts?: boolean
  includeVendorDetails?: boolean
  includeRawData?: boolean
  companyName?: string
}

// ============================================================================
// Lazy Loaders for Heavy Export Libraries
// ============================================================================

type JsPDFModule = typeof import('jspdf')
type AutoTableModule = typeof import('jspdf-autotable')
type ExcelJSModule = typeof import('exceljs')

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
// PDF Export
// ============================================================================

const PDF_STYLES = {
  colors: {
    primary: [37, 99, 235] as [number, number, number],
    headerText: [255, 255, 255] as [number, number, number],
    black: [33, 37, 41] as [number, number, number],
    darkGray: [75, 85, 99] as [number, number, number],
    lightGray: [229, 231, 235] as [number, number, number],
    alternateRow: [249, 250, 251] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  },
  fonts: {
    title: 18,
    subtitle: 14,
    heading: 12,
    body: 10,
    small: 8,
  },
}

async function exportToPdf(
  data: BidAnalysisExportData,
  options: BidAnalysisExportOptions
): Promise<BidAnalysisExportResult> {
  const jsPDF = await loadJsPDF()
  const autoTable = await loadAutoTable()

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  let yPosition = 20

  // Header
  doc.setFillColor(...PDF_STYLES.colors.primary)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 25, 'F')

  doc.setTextColor(...PDF_STYLES.colors.headerText)
  doc.setFontSize(PDF_STYLES.fonts.title)
  doc.text('Historical Bid Analysis Report', 14, 15)

  if (options.companyName) {
    doc.setFontSize(PDF_STYLES.fonts.body)
    doc.text(options.companyName, doc.internal.pageSize.getWidth() - 14, 15, { align: 'right' })
  }

  yPosition = 35

  // Summary Section
  doc.setTextColor(...PDF_STYLES.colors.black)
  doc.setFontSize(PDF_STYLES.fonts.heading)
  doc.text('Summary', 14, yPosition)
  yPosition += 8

  doc.setFontSize(PDF_STYLES.fonts.body)
  doc.setTextColor(...PDF_STYLES.colors.darkGray)

  const summaryLines = [
    `Date Range: ${data.summaryMetrics.dateRange.from} to ${data.summaryMetrics.dateRange.to}`,
    `Total Bids Analyzed: ${data.summaryMetrics.totalBids.toLocaleString()}`,
    `Average Accuracy: ${data.summaryMetrics.avgAccuracy}%`,
    `Top Performing Vendors: ${data.summaryMetrics.topVendorsCount}`,
  ]

  summaryLines.forEach((line) => {
    doc.text(line, 14, yPosition)
    yPosition += 6
  })

  yPosition += 10

  // Bid Trends Table
  if (data.trends.length > 0) {
    doc.setTextColor(...PDF_STYLES.colors.black)
    doc.setFontSize(PDF_STYLES.fonts.heading)
    doc.text('Bid Trends', 14, yPosition)
    yPosition += 5

    const trendTableData = data.trends.map((trend) => [
      trend.period,
      trend.bid_count.toLocaleString(),
      `$${(trend.average_bid / 1000).toFixed(1)}K`,
      trend.win_rate ? `${(trend.win_rate * 100).toFixed(1)}%` : 'N/A',
      trend.trend_direction || 'stable',
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['Period', 'Bid Count', 'Avg Bid', 'Win Rate', 'Trend']],
      body: trendTableData,
      theme: 'striped',
      headStyles: {
        fillColor: PDF_STYLES.colors.primary,
        textColor: PDF_STYLES.colors.headerText,
        fontSize: PDF_STYLES.fonts.body,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: PDF_STYLES.fonts.small,
        textColor: PDF_STYLES.colors.black,
      },
      alternateRowStyles: {
        fillColor: PDF_STYLES.colors.alternateRow,
      },
      margin: { left: 14, right: 14 },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15
  }

  // Recommended Vendors Table
  if (options.includeVendorDetails && data.recommendations.length > 0) {
    // Check if we need a new page
    if (yPosition > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage()
      yPosition = 20
    }

    doc.setTextColor(...PDF_STYLES.colors.black)
    doc.setFontSize(PDF_STYLES.fonts.heading)
    doc.text('Recommended Vendors', 14, yPosition)
    yPosition += 5

    const vendorTableData = data.recommendations.map((vendor) => [
      vendor.vendor_name || vendor.vendor_id,
      vendor.same_trade_bids.toLocaleString(),
      `${(vendor.win_rate * 100).toFixed(1)}%`,
      vendor.quality_score ? `${vendor.quality_score.toFixed(1)}%` : 'N/A',
      vendor.score.toFixed(0),
    ])

    autoTable(doc, {
      startY: yPosition,
      head: [['Vendor', 'Total Bids', 'Win Rate', 'Accuracy', 'Score']],
      body: vendorTableData,
      theme: 'striped',
      headStyles: {
        fillColor: PDF_STYLES.colors.primary,
        textColor: PDF_STYLES.colors.headerText,
        fontSize: PDF_STYLES.fonts.body,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: PDF_STYLES.fonts.small,
        textColor: PDF_STYLES.colors.black,
      },
      alternateRowStyles: {
        fillColor: PDF_STYLES.colors.alternateRow,
      },
      margin: { left: 14, right: 14 },
    })
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(PDF_STYLES.fonts.small)
    doc.setTextColor(...PDF_STYLES.colors.darkGray)
    doc.text(
      `Generated on ${format(new Date(), 'PPP')} | Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }

  const blob = doc.output('blob')
  const filename = `bid-analysis-${format(new Date(), 'yyyy-MM-dd')}.pdf`

  return {
    blob,
    filename,
    mimeType: 'application/pdf',
  }
}

// ============================================================================
// Excel Export
// ============================================================================

async function exportToExcel(
  data: BidAnalysisExportData,
  options: BidAnalysisExportOptions
): Promise<BidAnalysisExportResult> {
  const ExcelJS = await loadExcelJS()
  const workbook = new ExcelJS.Workbook()

  workbook.creator = options.companyName || 'Bid Analysis System'
  workbook.created = new Date()

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 30 },
  ]

  summarySheet.addRows([
    { metric: 'Report Generated', value: format(new Date(), 'PPP pp') },
    { metric: 'Date Range From', value: data.summaryMetrics.dateRange.from },
    { metric: 'Date Range To', value: data.summaryMetrics.dateRange.to },
    { metric: 'Total Bids Analyzed', value: data.summaryMetrics.totalBids },
    { metric: 'Average Accuracy', value: `${data.summaryMetrics.avgAccuracy}%` },
    { metric: 'Top Performing Vendors', value: data.summaryMetrics.topVendorsCount },
  ])

  // Style header row
  const summaryHeaderRow = summarySheet.getRow(1)
  summaryHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  summaryHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  }

  // Trends Sheet
  if (data.trends.length > 0) {
    const trendsSheet = workbook.addWorksheet('Bid Trends')
    trendsSheet.columns = [
      { header: 'Period', key: 'period', width: 15 },
      { header: 'Bid Count', key: 'bid_count', width: 15 },
      { header: 'Average Bid', key: 'average_bid', width: 18 },
      { header: 'Total Value', key: 'total_value', width: 20 },
      { header: 'Win Rate', key: 'win_rate', width: 12 },
      { header: 'Trend', key: 'trend', width: 12 },
    ]

    data.trends.forEach((trend) => {
      trendsSheet.addRow({
        period: trend.period,
        bid_count: trend.bid_count,
        average_bid: trend.average_bid,
        total_value: trend.total_bid_value,
        win_rate: trend.win_rate ? `${(trend.win_rate * 100).toFixed(1)}%` : 'N/A',
        trend: trend.trend_direction || 'stable',
      })
    })

    // Style header row
    const trendsHeaderRow = trendsSheet.getRow(1)
    trendsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    trendsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    }

    // Format currency columns
    trendsSheet.getColumn('average_bid').numFmt = '$#,##0.00'
    trendsSheet.getColumn('total_value').numFmt = '$#,##0.00'
  }

  // Vendors Sheet
  if (options.includeVendorDetails && data.recommendations.length > 0) {
    const vendorsSheet = workbook.addWorksheet('Recommended Vendors')
    vendorsSheet.columns = [
      { header: 'Vendor Name', key: 'vendor_name', width: 30 },
      { header: 'Total Bids', key: 'total_bids', width: 12 },
      { header: 'Win Rate', key: 'win_rate', width: 12 },
      { header: 'Avg Accuracy', key: 'avg_accuracy', width: 15 },
      { header: 'Avg Response Time', key: 'avg_response', width: 18 },
      { header: 'Score', key: 'score', width: 10 },
      { header: 'Recommendation', key: 'recommendation', width: 20 },
    ]

    data.recommendations.forEach((vendor) => {
      vendorsSheet.addRow({
        vendor_name: vendor.vendor_name || vendor.vendor_id,
        total_bids: vendor.same_trade_bids,
        win_rate: `${(vendor.win_rate * 100).toFixed(1)}%`,
        avg_accuracy: vendor.quality_score
          ? `${vendor.quality_score.toFixed(1)}%`
          : 'N/A',
        avg_response: vendor.on_time_delivery
          ? `${vendor.on_time_delivery.toFixed(1)}%`
          : 'N/A',
        score: vendor.score.toFixed(0),
        recommendation: vendor.reasons.join('; '),
      })
    })

    // Style header row
    const vendorsHeaderRow = vendorsSheet.getRow(1)
    vendorsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    vendorsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    }
  }

  // Raw Data Sheet (if requested)
  if (options.includeRawData && data.trends.length > 0) {
    const rawDataSheet = workbook.addWorksheet('Raw Data')
    rawDataSheet.columns = [
      { header: 'Period', key: 'period', width: 15 },
      { header: 'Bid Count', key: 'bid_count', width: 12 },
      { header: 'Average Bid', key: 'average_bid', width: 18 },
      { header: 'Total Value', key: 'total_value', width: 20 },
      { header: 'Winning Bids', key: 'winning_bids', width: 15 },
      { header: 'Win Rate', key: 'win_rate', width: 12 },
      { header: 'Change %', key: 'change_percent', width: 12 },
      { header: 'Trend Direction', key: 'trend_direction', width: 15 },
    ]

    data.trends.forEach((trend) => {
      rawDataSheet.addRow({
        period: trend.period,
        bid_count: trend.bid_count,
        average_bid: trend.average_bid,
        total_value: trend.total_bid_value,
        winning_bids: trend.win_count || 0,
        win_rate: trend.win_rate || 0,
        change_percent: trend.month_over_month_change || 0,
        trend_direction: trend.trend_direction || 'stable',
      })
    })

    // Style header row
    const rawHeaderRow = rawDataSheet.getRow(1)
    rawHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    rawHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' },
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const filename = `bid-analysis-${format(new Date(), 'yyyy-MM-dd')}.xlsx`

  return {
    blob,
    filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
}

// ============================================================================
// CSV Export
// ============================================================================

async function exportToCsv(
  data: BidAnalysisExportData,
  _options: BidAnalysisExportOptions
): Promise<BidAnalysisExportResult> {
  const lines: string[] = []

  // Helper to escape CSV values
  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) {return ''}
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Header comment with metadata
  lines.push(`# Bid Analysis Export - Generated ${format(new Date(), 'PPP pp')}`)
  lines.push(
    `# Date Range: ${data.summaryMetrics.dateRange.from} to ${data.summaryMetrics.dateRange.to}`
  )
  lines.push('')

  // Trends section
  lines.push('# BID TRENDS')
  lines.push('Period,Bid Count,Average Bid,Total Value,Win Rate,Trend Direction')

  data.trends.forEach((trend) => {
    lines.push(
      [
        escapeCSV(trend.period),
        escapeCSV(trend.bid_count),
        escapeCSV(trend.average_bid),
        escapeCSV(trend.total_bid_value),
        escapeCSV(trend.win_rate ? `${(trend.win_rate * 100).toFixed(1)}%` : 'N/A'),
        escapeCSV(trend.trend_direction || 'stable'),
      ].join(',')
    )
  })

  lines.push('')

  // Vendors section
  if (data.recommendations.length > 0) {
    lines.push('# RECOMMENDED VENDORS')
    lines.push('Vendor,Total Bids,Win Rate,Avg Accuracy,Score,Recommendation')

    data.recommendations.forEach((vendor) => {
      lines.push(
        [
          escapeCSV(vendor.vendor_name || vendor.vendor_id),
          escapeCSV(vendor.same_trade_bids),
          escapeCSV(`${(vendor.win_rate * 100).toFixed(1)}%`),
          escapeCSV(
            vendor.quality_score ? `${vendor.quality_score.toFixed(1)}%` : 'N/A'
          ),
          escapeCSV(vendor.score.toFixed(0)),
          escapeCSV(vendor.reasons.join('; ')),
        ].join(',')
      )
    })
  }

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const filename = `bid-analysis-${format(new Date(), 'yyyy-MM-dd')}.csv`

  return {
    blob,
    filename,
    mimeType: 'text/csv',
  }
}

// ============================================================================
// Main Export Function
// ============================================================================

export async function exportBidAnalysis(
  format: ExportFormat,
  data: BidAnalysisExportData,
  options: BidAnalysisExportOptions = {}
): Promise<BidAnalysisExportResult> {
  logger.info(`[BidAnalysisExport] Generating ${format} export`)

  switch (format) {
    case 'pdf':
      return exportToPdf(data, options)
    case 'excel':
      return exportToExcel(data, options)
    case 'csv':
      return exportToCsv(data, options)
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

export function downloadBidAnalysisExport(result: BidAnalysisExportResult): void {
  const url = URL.createObjectURL(result.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
