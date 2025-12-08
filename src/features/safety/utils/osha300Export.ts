/**
 * OSHA 300 Log Export Utilities
 *
 * Provides CSV and Excel export functionality for OSHA Form 300 data.
 * Includes both the 300 log and 300A annual summary formats.
 */

import * as XLSX from 'xlsx'
import type { OSHA300LogEntry, OSHA300ASummary } from '@/types/safety-incidents'
import {
  getOSHAInjuryIllnessTypeLabel,
  calculateOSHAIncidentRate,
  calculateDARTRate,
} from '@/types/safety-incidents'

// ============================================================================
// Types
// ============================================================================

interface ExportOptions {
  year: number
  establishmentName: string
  hoursWorked?: number
  averageEmployees?: number
  naicsCode?: string
  companyExecutive?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Export OSHA 300 log entries to CSV format
 */
export function exportOSHA300ToCSV(entries: OSHA300LogEntry[], year: number): string {
  const headers = [
    'Case Number',
    'Employee Name',
    'Job Title',
    'Date of Injury/Illness',
    'Location',
    'Description',
    'Injury/Illness Type',
    'Death',
    'Days Away From Work',
    'Job Transfer/Restriction',
    'Other Recordable',
    'Number of Days Away',
    'Number of Days Restricted',
    'Body Part Affected',
    'Object/Substance',
    'Severity',
  ]

  const rows = entries.map((entry) => [
    entry.case_number || '',
    entry.employee_name || 'Privacy Case',
    entry.job_title || '',
    entry.incident_date,
    entry.location || '',
    entry.description.replace(/"/g, '""'), // Escape quotes
    entry.injury_illness_type ? getOSHAInjuryIllnessTypeLabel(entry.injury_illness_type) : '',
    entry.death ? 'X' : '',
    entry.days_away_from_work ? 'X' : '',
    entry.job_transfer_restriction ? 'X' : '',
    entry.other_recordable ? 'X' : '',
    entry.days_away_count > 0 ? entry.days_away_count.toString() : '',
    entry.days_transfer_restriction > 0 ? entry.days_transfer_restriction.toString() : '',
    entry.body_part || '',
    entry.object_substance || '',
    entry.severity,
  ])

  // Build CSV content
  const csvRows = [
    `OSHA Form 300 - Log of Work-Related Injuries and Illnesses - ${year}`,
    '',
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ]

  // Add summary section
  if (entries.length > 0) {
    csvRows.push('')
    csvRows.push('Summary:')
    csvRows.push(`Total Recordable Cases,${entries.length}`)
    csvRows.push(`Deaths,${entries.filter((e) => e.death).length}`)
    csvRows.push(`Cases with Days Away,${entries.filter((e) => e.days_away_from_work).length}`)
    csvRows.push(`Cases with Job Transfer/Restriction,${entries.filter((e) => e.job_transfer_restriction).length}`)
    csvRows.push(`Other Recordable Cases,${entries.filter((e) => e.other_recordable).length}`)
    csvRows.push(`Total Days Away,${entries.reduce((sum, e) => sum + e.days_away_count, 0)}`)
    csvRows.push(`Total Days Restricted,${entries.reduce((sum, e) => sum + e.days_transfer_restriction, 0)}`)
  }

  return csvRows.join('\n')
}

// ============================================================================
// Excel Export
// ============================================================================

/**
 * Export OSHA 300 log and 300A summary to Excel format
 */
export async function exportOSHA300ToExcel(
  entries: OSHA300LogEntry[],
  summary: OSHA300ASummary | null,
  options: ExportOptions
): Promise<Blob> {
  const workbook = XLSX.utils.book_new()

  // Create OSHA 300 Log sheet
  const logSheet = createOSHA300LogSheet(entries, options)
  XLSX.utils.book_append_sheet(workbook, logSheet, 'OSHA 300 Log')

  // Create OSHA 300A Summary sheet
  const summarySheet = createOSHA300ASummarySheet(entries, summary, options)
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'OSHA 300A Summary')

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * Create the OSHA 300 Log worksheet
 */
function createOSHA300LogSheet(entries: OSHA300LogEntry[], options: ExportOptions): XLSX.WorkSheet {
  const data: (string | number | null)[][] = []

  // Header section
  data.push(['OSHA Form 300'])
  data.push(['Log of Work-Related Injuries and Illnesses'])
  data.push([])
  data.push(['Establishment Name:', options.establishmentName])
  data.push(['Calendar Year:', options.year])
  data.push([])

  // Column headers matching OSHA Form 300 layout
  data.push([
    '(A) Case No.',
    '(B) Employee Name',
    '(C) Job Title',
    '(D) Date of Injury/Illness',
    '(E) Where Event Occurred',
    '(F) Description of Injury/Illness',
    '(G) Injury',
    '(H) Skin Disorder',
    '(I) Respiratory',
    '(J) Poisoning',
    '(K) Hearing Loss',
    '(L) Other Illness',
    '(M) Death',
    '(N) Days Away',
    '(O) Job Transfer/Restriction',
    '(P) Other Recordable',
    'Days Away Count',
    'Days Restricted Count',
  ])

  // Data rows
  entries.forEach((entry) => {
    const type = entry.injury_illness_type
    data.push([
      entry.case_number || '',
      entry.employee_name || 'Privacy Case',
      entry.job_title || '',
      entry.incident_date,
      entry.location || '',
      entry.description,
      type === 'injury' ? 'X' : '',
      type === 'skin_disorder' ? 'X' : '',
      type === 'respiratory' ? 'X' : '',
      type === 'poisoning' ? 'X' : '',
      type === 'hearing_loss' ? 'X' : '',
      type === 'other_illness' ? 'X' : '',
      entry.death ? 'X' : '',
      entry.days_away_from_work ? 'X' : '',
      entry.job_transfer_restriction ? 'X' : '',
      entry.other_recordable ? 'X' : '',
      entry.days_away_count > 0 ? entry.days_away_count : null,
      entry.days_transfer_restriction > 0 ? entry.days_transfer_restriction : null,
    ])
  })

  // Totals row
  data.push([])
  data.push([
    'PAGE TOTALS',
    '',
    '',
    '',
    '',
    '',
    entries.filter((e) => e.injury_illness_type === 'injury').length,
    entries.filter((e) => e.injury_illness_type === 'skin_disorder').length,
    entries.filter((e) => e.injury_illness_type === 'respiratory').length,
    entries.filter((e) => e.injury_illness_type === 'poisoning').length,
    entries.filter((e) => e.injury_illness_type === 'hearing_loss').length,
    entries.filter((e) => e.injury_illness_type === 'other_illness').length,
    entries.filter((e) => e.death).length,
    entries.filter((e) => e.days_away_from_work).length,
    entries.filter((e) => e.job_transfer_restriction).length,
    entries.filter((e) => e.other_recordable).length,
    entries.reduce((sum, e) => sum + e.days_away_count, 0),
    entries.reduce((sum, e) => sum + e.days_transfer_restriction, 0),
  ])

  // Create worksheet
  const sheet = XLSX.utils.aoa_to_sheet(data)

  // Set column widths
  sheet['!cols'] = [
    { wch: 12 }, // Case No.
    { wch: 20 }, // Employee Name
    { wch: 15 }, // Job Title
    { wch: 12 }, // Date
    { wch: 20 }, // Location
    { wch: 40 }, // Description
    { wch: 8 },  // G
    { wch: 8 },  // H
    { wch: 8 },  // I
    { wch: 8 },  // J
    { wch: 8 },  // K
    { wch: 8 },  // L
    { wch: 8 },  // M
    { wch: 8 },  // N
    { wch: 8 },  // O
    { wch: 8 },  // P
    { wch: 12 }, // Days Away
    { wch: 12 }, // Days Restricted
  ]

  return sheet
}

/**
 * Create the OSHA 300A Summary worksheet
 */
function createOSHA300ASummarySheet(
  entries: OSHA300LogEntry[],
  summary: OSHA300ASummary | null,
  options: ExportOptions
): XLSX.WorkSheet {
  // Calculate totals from entries if no summary provided
  const deaths = summary?.total_deaths ?? entries.filter((e) => e.death).length
  const daysAwayCases = summary?.total_days_away_cases ?? entries.filter((e) => e.days_away_from_work).length
  const jobTransferCases = summary?.total_job_transfer_cases ?? entries.filter((e) => e.job_transfer_restriction).length
  const otherCases = summary?.total_other_recordable_cases ?? entries.filter((e) => e.other_recordable).length
  const totalDaysAway = summary?.total_days_away ?? entries.reduce((sum, e) => sum + e.days_away_count, 0)
  const totalDaysRestricted = summary?.total_days_transfer ?? entries.reduce((sum, e) => sum + e.days_transfer_restriction, 0)

  const injuries = summary?.total_injuries ?? entries.filter((e) => e.injury_illness_type === 'injury').length
  const skinDisorders = summary?.total_skin_disorders ?? entries.filter((e) => e.injury_illness_type === 'skin_disorder').length
  const respiratoryConditions = summary?.total_respiratory_conditions ?? entries.filter((e) => e.injury_illness_type === 'respiratory').length
  const poisonings = summary?.total_poisonings ?? entries.filter((e) => e.injury_illness_type === 'poisoning').length
  const hearingLoss = summary?.total_hearing_losses ?? entries.filter((e) => e.injury_illness_type === 'hearing_loss').length
  const otherIllnesses = summary?.total_other_illnesses ?? entries.filter((e) => e.injury_illness_type === 'other_illness').length

  const totalRecordable = deaths + daysAwayCases + jobTransferCases + otherCases

  // Calculate rates if hours worked provided
  const trir = options.hoursWorked ? calculateOSHAIncidentRate(totalRecordable, options.hoursWorked) : 'N/A'
  const dartCases = daysAwayCases + jobTransferCases
  const dart = options.hoursWorked ? calculateDARTRate(dartCases, options.hoursWorked) : 'N/A'

  const data: (string | number)[][] = []

  // Header
  data.push(['OSHA Form 300A'])
  data.push(['Summary of Work-Related Injuries and Illnesses'])
  data.push([])

  // Establishment information
  data.push(['Establishment Information'])
  data.push(['Establishment Name:', options.establishmentName])
  data.push(['Street Address:', options.address || ''])
  data.push(['City:', options.city || ''])
  data.push(['State:', options.state || ''])
  data.push(['ZIP:', options.zip || ''])
  data.push(['Industry Description (NAICS):', options.naicsCode || ''])
  data.push([])

  // Employment information
  data.push(['Employment Information'])
  data.push(['Annual Average Number of Employees:', options.averageEmployees || ''])
  data.push(['Total Hours Worked by All Employees:', options.hoursWorked || ''])
  data.push([])

  // Injury and Illness Summary
  data.push(['Injury and Illness Types'])
  data.push([''])
  data.push(['Number of Cases'])
  data.push(['  (G) Total Deaths:', deaths])
  data.push(['  (H) Total Cases with Days Away from Work:', daysAwayCases])
  data.push(['  (I) Total Cases with Job Transfer or Restriction:', jobTransferCases])
  data.push(['  (J) Total Other Recordable Cases:', otherCases])
  data.push([])

  data.push(['Number of Days'])
  data.push(['  Total Days Away from Work:', totalDaysAway])
  data.push(['  Total Days of Job Transfer or Restriction:', totalDaysRestricted])
  data.push([])

  data.push(['Injury and Illness Types'])
  data.push(['  (1) Injuries:', injuries])
  data.push(['  (2) Skin Disorders:', skinDisorders])
  data.push(['  (3) Respiratory Conditions:', respiratoryConditions])
  data.push(['  (4) Poisonings:', poisonings])
  data.push(['  (5) Hearing Loss:', hearingLoss])
  data.push(['  (6) All Other Illnesses:', otherIllnesses])
  data.push([])

  // Calculated Rates
  data.push(['Calculated Rates (per 100 Full-Time Equivalent Workers)'])
  data.push(['  Total Recordable Incident Rate (TRIR):', trir])
  data.push(['  Days Away, Restricted, or Transferred (DART) Rate:', dart])
  data.push(['  Total Recordable Cases:', totalRecordable])
  data.push(['  DART Cases (Days Away + Job Transfer):', dartCases])
  data.push([])

  // Certification
  data.push(['Certification'])
  data.push(['Post this annual summary from February 1 to April 30 of the year following the calendar year covered.'])
  data.push([])
  data.push(['Calendar Year:', options.year])
  data.push(['Company Executive:', options.companyExecutive || ''])
  data.push(['Title:', ''])
  data.push(['Phone:', options.phone || ''])
  data.push(['Date:', new Date().toLocaleDateString()])

  // Create worksheet
  const sheet = XLSX.utils.aoa_to_sheet(data)

  // Set column widths
  sheet['!cols'] = [
    { wch: 50 },
    { wch: 20 },
  ]

  return sheet
}

// ============================================================================
// File Download Helper
// ============================================================================

/**
 * Trigger file download in the browser
 */
export function downloadFile(blob: Blob, filename: string): void {
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
 * Export OSHA 300 data as printable HTML (for PDF generation)
 */
export function generateOSHA300PrintHTML(
  entries: OSHA300LogEntry[],
  summary: OSHA300ASummary | null,
  options: ExportOptions
): string {
  const totalRecordable = entries.length
  const trir = options.hoursWorked
    ? calculateOSHAIncidentRate(totalRecordable, options.hoursWorked)
    : 'N/A'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OSHA Form 300 - ${options.establishmentName} - ${options.year}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10pt; margin: 20px; }
        h1 { font-size: 14pt; margin-bottom: 5px; }
        h2 { font-size: 12pt; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #000; padding: 4px; text-align: left; font-size: 9pt; }
        th { background: #f0f0f0; font-weight: bold; }
        .center { text-align: center; }
        .header-info { margin-bottom: 15px; }
        .totals { font-weight: bold; background: #f5f5f5; }
        @media print {
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      <h1>OSHA Form 300 - Log of Work-Related Injuries and Illnesses</h1>
      <div class="header-info">
        <strong>Establishment:</strong> ${options.establishmentName}<br>
        <strong>Calendar Year:</strong> ${options.year}
        ${options.hoursWorked ? `<br><strong>Hours Worked:</strong> ${options.hoursWorked.toLocaleString()}` : ''}
        ${options.hoursWorked ? `<br><strong>TRIR:</strong> ${trir}` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th>(A) Case No.</th>
            <th>(B) Employee</th>
            <th>(C) Job Title</th>
            <th>(D) Date</th>
            <th>(E) Location</th>
            <th>(F) Description</th>
            <th class="center">(G-L) Type</th>
            <th class="center">(M)</th>
            <th class="center">(N)</th>
            <th class="center">(O)</th>
            <th class="center">(P)</th>
            <th class="center">Days Away</th>
            <th class="center">Days Restr.</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map((entry) => `
            <tr>
              <td>${entry.case_number || '-'}</td>
              <td>${entry.employee_name || 'Privacy Case'}</td>
              <td>${entry.job_title || '-'}</td>
              <td>${entry.incident_date}</td>
              <td>${entry.location || '-'}</td>
              <td>${entry.description}</td>
              <td class="center">${entry.injury_illness_type ? getOSHAInjuryIllnessTypeLabel(entry.injury_illness_type)?.charAt(0) || '-' : '-'}</td>
              <td class="center">${entry.death ? 'X' : ''}</td>
              <td class="center">${entry.days_away_from_work ? 'X' : ''}</td>
              <td class="center">${entry.job_transfer_restriction ? 'X' : ''}</td>
              <td class="center">${entry.other_recordable ? 'X' : ''}</td>
              <td class="center">${entry.days_away_count || '-'}</td>
              <td class="center">${entry.days_transfer_restriction || '-'}</td>
            </tr>
          `).join('')}
          <tr class="totals">
            <td colspan="7" style="text-align: right;">Page Totals:</td>
            <td class="center">${entries.filter((e) => e.death).length}</td>
            <td class="center">${entries.filter((e) => e.days_away_from_work).length}</td>
            <td class="center">${entries.filter((e) => e.job_transfer_restriction).length}</td>
            <td class="center">${entries.filter((e) => e.other_recordable).length}</td>
            <td class="center">${entries.reduce((sum, e) => sum + e.days_away_count, 0)}</td>
            <td class="center">${entries.reduce((sum, e) => sum + e.days_transfer_restriction, 0)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 20px; font-size: 8pt; color: #666;">
        <p><strong>Column Legend:</strong></p>
        <p>(M) Death | (N) Days Away from Work | (O) Job Transfer/Restriction | (P) Other Recordable Case</p>
        <p>(G) Injury | (H) Skin Disorder | (I) Respiratory | (J) Poisoning | (K) Hearing Loss | (L) Other Illness</p>
      </div>
    </body>
    </html>
  `
}
