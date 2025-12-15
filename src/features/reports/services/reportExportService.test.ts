/**
 * Report Export Service Tests
 *
 * Tests for PDF, Excel, and CSV export functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReportExportOptions } from './reportExportService'

// Create a chainable mock for Supabase queries
const createChainableMock = (data: any[] = []) => {
  const mockResult = { data, error: null }

  const chainable: any = {
    select: vi.fn(() => chainable),
    eq: vi.fn(() => chainable),
    neq: vi.fn(() => chainable),
    is: vi.fn(() => chainable),
    not: vi.fn(() => chainable),
    gt: vi.fn(() => chainable),
    lt: vi.fn(() => chainable),
    gte: vi.fn(() => chainable),
    lte: vi.fn(() => chainable),
    in: vi.fn(() => chainable),
    ilike: vi.fn(() => chainable),
    order: vi.fn(() => chainable),
    then: vi.fn((resolve) => resolve(mockResult)),
    // Make it thenable for async/await
    [Symbol.toStringTag]: 'Promise',
  }

  // Make the chainable return data when awaited
  Object.defineProperty(chainable, 'then', {
    value: (onFulfilled: any) => Promise.resolve(mockResult).then(onFulfilled),
  })

  return chainable
}

const mockData = [
  { id: '1', subject: 'Test RFI 1', status: 'open', created_at: '2024-01-15', amount: 1000 },
  { id: '2', subject: 'Test RFI 2', status: 'closed', created_at: '2024-01-16', amount: 2500 },
]

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabaseUntyped: {
    from: vi.fn(() => createChainableMock(mockData)),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('reportExportService', () => {
  const mockOptions: ReportExportOptions = {
    dataSource: 'rfis',
    fields: [
      { field_name: 'id', display_name: 'ID', field_type: 'text', display_order: 0 },
      { field_name: 'subject', display_name: 'Subject', field_type: 'text', display_order: 1 },
      { field_name: 'status', display_name: 'Status', field_type: 'status', display_order: 2 },
      { field_name: 'created_at', display_name: 'Created', field_type: 'date', display_order: 3 },
    ],
    title: 'Test Report',
    orientation: 'landscape',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportToPdf', () => {
    it('should generate a PDF blob with correct mime type', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf(mockOptions)

      expect(result).toBeDefined()
      expect(result.mimeType).toBe('application/pdf')
      expect(result.blob).toBeInstanceOf(Blob)
      expect(result.filename).toContain('.pdf')
      expect(result.filename).toContain('Test_Report')
    })

    it('should include row count in the result', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf(mockOptions)

      expect(result.rowCount).toBe(2)
    })

    it('should handle portrait orientation', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        orientation: 'portrait',
      })

      expect(result.mimeType).toBe('application/pdf')
    })

    it('should include company name when provided', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        companyName: 'Test Construction Co',
      })

      expect(result.mimeType).toBe('application/pdf')
    })

    it('should handle bar charts when configured', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'bar',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'sum',
          title: 'Amount by Status',
        },
      })

      expect(result.mimeType).toBe('application/pdf')
    })

    it('should handle pie charts when configured', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'pie',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'count',
          title: 'RFIs by Status',
        },
      })

      expect(result.mimeType).toBe('application/pdf')
    })

    it('should handle line charts when configured', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'line',
          groupByField: 'created_at',
          valueField: 'amount',
          aggregation: 'sum',
          title: 'Amounts Over Time',
        },
      })

      expect(result.mimeType).toBe('application/pdf')
    })

    it('should throw error when no fields provided', async () => {
      const { exportToPdf } = await import('./reportExportService')

      await expect(exportToPdf({
        ...mockOptions,
        fields: [],
      })).rejects.toThrow('No fields specified for PDF export')
    })
  })

  describe('exportToCsv', () => {
    it('should generate a CSV blob with correct mime type', async () => {
      const { exportToCsv } = await import('./reportExportService')

      const result = await exportToCsv(mockOptions)

      expect(result).toBeDefined()
      expect(result.mimeType).toBe('text/csv')
      expect(result.blob).toBeInstanceOf(Blob)
      expect(result.filename).toContain('.csv')
    })

    it('should include header row in CSV', async () => {
      const { exportToCsv } = await import('./reportExportService')

      const result = await exportToCsv(mockOptions)
      // Read blob content using FileReader polyfill
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(result.blob)
      })

      expect(text).toContain('ID')
      expect(text).toContain('Subject')
      expect(text).toContain('Status')
    })

    it('should include data rows in CSV', async () => {
      const { exportToCsv } = await import('./reportExportService')

      const result = await exportToCsv(mockOptions)
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(result.blob)
      })

      expect(text).toContain('Test RFI 1')
      expect(text).toContain('Test RFI 2')
    })
  })

  describe('exportToExcel', () => {
    it('should generate an Excel blob with correct mime type', async () => {
      const { exportToExcel } = await import('./reportExportService')

      const result = await exportToExcel(mockOptions)

      expect(result).toBeDefined()
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(result.blob).toBeInstanceOf(Blob)
      expect(result.filename).toContain('.xlsx')
    })

    it('should handle chart data sheet when chart is configured', async () => {
      const { exportToExcel } = await import('./reportExportService')

      const result = await exportToExcel({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'bar',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'sum',
        },
      })

      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })
  })

  describe('exportToHtml', () => {
    it('should generate an HTML blob with correct mime type', async () => {
      const { exportToHtml } = await import('./reportExportService')

      const result = await exportToHtml(mockOptions)

      expect(result).toBeDefined()
      expect(result.mimeType).toBe('text/html')
      expect(result.blob).toBeInstanceOf(Blob)
      expect(result.filename).toContain('.html')
    })

    it('should include report title in HTML', async () => {
      const { exportToHtml } = await import('./reportExportService')

      const result = await exportToHtml(mockOptions)
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(result.blob)
      })

      expect(text).toContain('Test Report')
    })

    it('should include bar chart HTML when configured', async () => {
      const { exportToHtml } = await import('./reportExportService')

      const result = await exportToHtml({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'bar',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'count',
          title: 'Chart Title',
        },
      })
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(result.blob)
      })

      expect(text).toContain('Chart Title')
    })

    it('should include pie chart HTML when configured', async () => {
      const { exportToHtml } = await import('./reportExportService')

      const result = await exportToHtml({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'pie',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'sum',
          title: 'Pie Chart',
        },
      })
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsText(result.blob)
      })

      expect(text).toContain('Pie Chart')
      expect(text).toContain('Category')
      expect(text).toContain('Percent')
    })
  })

  describe('generateReport', () => {
    it('should dispatch to PDF export for pdf format', async () => {
      const { generateReport } = await import('./reportExportService')

      const result = await generateReport('pdf', mockOptions)
      expect(result.mimeType).toBe('application/pdf')
    })

    it('should dispatch to CSV export for csv format', async () => {
      const { generateReport } = await import('./reportExportService')

      const result = await generateReport('csv', mockOptions)
      expect(result.mimeType).toBe('text/csv')
    })

    it('should dispatch to Excel export for excel format', async () => {
      const { generateReport } = await import('./reportExportService')

      const result = await generateReport('excel', mockOptions)
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })

    it('should throw error for unsupported format', async () => {
      const { generateReport } = await import('./reportExportService')

      await expect(generateReport('unknown' as any, mockOptions)).rejects.toThrow('Unsupported export format')
    })
  })

  describe('value formatting', () => {
    it('should format currency values correctly in PDF', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const optionsWithCurrency: ReportExportOptions = {
        ...mockOptions,
        fields: [
          { field_name: 'amount', display_name: 'Amount', field_type: 'currency', display_order: 0 },
        ],
      }

      const result = await exportToPdf(optionsWithCurrency)
      expect(result.mimeType).toBe('application/pdf')
    })

    it('should format boolean values correctly in CSV', async () => {
      const { exportToCsv } = await import('./reportExportService')

      const optionsWithBoolean: ReportExportOptions = {
        ...mockOptions,
        fields: [
          { field_name: 'id', display_name: 'ID', field_type: 'text', display_order: 0 },
        ],
      }

      const result = await exportToCsv(optionsWithBoolean)
      expect(result.mimeType).toBe('text/csv')
    })
  })

  describe('chart data generation', () => {
    it('should aggregate data by sum correctly', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'bar',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'sum',
        },
      })

      expect(result.mimeType).toBe('application/pdf')
    })

    it('should aggregate data by count correctly', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'bar',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'count',
        },
      })

      expect(result.mimeType).toBe('application/pdf')
    })

    it('should aggregate data by average correctly', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'bar',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'average',
        },
      })

      expect(result.mimeType).toBe('application/pdf')
    })

    it('should aggregate data by min correctly', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'bar',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'min',
        },
      })

      expect(result.mimeType).toBe('application/pdf')
    })

    it('should aggregate data by max correctly', async () => {
      const { exportToPdf } = await import('./reportExportService')

      const result = await exportToPdf({
        ...mockOptions,
        includeChart: true,
        chartConfig: {
          type: 'bar',
          groupByField: 'status',
          valueField: 'amount',
          aggregation: 'max',
        },
      })

      expect(result.mimeType).toBe('application/pdf')
    })
  })
})
