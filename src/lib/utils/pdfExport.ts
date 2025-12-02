// File: /src/lib/utils/pdfExport.ts
// PDF export utilities

import DOMPurify from 'dompurify'
import { logger } from '@/lib/utils/logger'

/**
 * Escape HTML special characters for safe title insertion
 */
function escapeHtml(text: string): string {
  return text.replace(/[<>&'"]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c] || c))
}

/**
 * Export HTML element to PDF using browser print functionality
 * This is a simple approach that works across browsers
 */
export function exportToPDF(elementId: string, filename: string) {
  const element = document.getElementById(elementId)
  if (!element) {
    logger.error(`Element with ID ${elementId} not found`)
    return
  }

  // Create a print window
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    logger.error('Failed to open print window')
    return
  }

  // Sanitize HTML content to prevent XSS
  const content = DOMPurify.sanitize(element.innerHTML)
  const escapedFilename = escapeHtml(filename)

  // Write to print window
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapedFilename}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          margin: 20px;
          color: #333;
          line-height: 1.6;
        }
        h1 { font-size: 28px; margin-bottom: 20px; color: #111; }
        h2 { font-size: 20px; margin-top: 20px; margin-bottom: 10px; color: #222; border-bottom: 2px solid #ddd; padding-bottom: 5px; }
        h3 { font-size: 16px; margin-top: 15px; margin-bottom: 8px; color: #333; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th, td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        tr:hover {
          background-color: #f9f9f9;
        }
        .metric-card {
          background-color: #f5f5f5;
          padding: 15px;
          margin: 10px 0;
          border-left: 4px solid #007bff;
          border-radius: 4px;
        }
        .metric-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: #111;
          margin-top: 5px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin: 15px 0;
        }
        .alert {
          padding: 12px 15px;
          margin: 15px 0;
          border-radius: 4px;
          border-left: 4px solid #ffc107;
          background-color: #fff3cd;
          color: #856404;
        }
        .alert.danger {
          border-left-color: #dc3545;
          background-color: #f8d7da;
          color: #721c24;
        }
        .alert.success {
          border-left-color: #28a745;
          background-color: #d4edda;
          color: #155724;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          h2 { page-break-before: avoid; }
        }
      </style>
    </head>
    <body>
      ${content}
      <script>
        setTimeout(() => {
          window.print();
          window.close();
        }, 250);
      </script>
    </body>
    </html>
  `)
  printWindow.document.close()
}

/**
 * Generate a CSV download from data
 */
export function exportToCSV(data: Array<Record<string, any>>, filename: string) {
  if (data.length === 0) {
    logger.warn('No data to export')
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header]
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"` // Escape quotes
          }
          return value
        })
        .join(',')
    ),
  ].join('\n')

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format date for reports
 */
export function formatReportDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format currency for reports
 */
export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) {return 'N/A'}
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}
