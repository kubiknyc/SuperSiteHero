// Batch export service for daily reports
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface ReportData {
  id: string
  report_date: string
  report_number?: string
  status: string
  weather_condition?: string
  temperature_high?: number
  temperature_low?: number
  precipitation?: number
  wind_speed?: number
  weather_delays?: boolean
  weather_delay_notes?: string
  work_completed?: string
  issues?: string
  observations?: string
  total_workers?: number
  project?: { name: string }
}

interface RelatedData {
  workforce: Array<{
    daily_report_id: string
    entry_type: string
    team_name?: string
    worker_name?: string
    trade?: string
    worker_count?: number
    activity?: string
    hours_worked?: number
  }>
  equipment: Array<{
    daily_report_id: string
    equipment_type: string
    equipment_description?: string
    quantity: number
    owner?: string
    hours_used?: number
  }>
  deliveries: Array<{
    daily_report_id: string
    material_description: string
    quantity?: string
    vendor?: string
  }>
  visitors: Array<{
    daily_report_id: string
    visitor_name: string
    company?: string
    purpose?: string
  }>
}

// Fetch reports for a date range
export async function fetchReportsForDateRange(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<ReportData[]> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*, project:projects(name)')
    .eq('project_id', projectId)
    .gte('report_date', startDate)
    .lte('report_date', endDate)
    .order('report_date', { ascending: true })

  if (error) {throw error}
  return (data || []) as ReportData[]
}

// Fetch related data for multiple reports
export async function fetchRelatedDataForReports(reportIds: string[]): Promise<RelatedData> {
  const [workforce, equipment, deliveries, visitors] = await Promise.all([
    supabase
      .from('daily_report_workforce')
      .select('*')
      .in('daily_report_id', reportIds),
    supabase
      .from('daily_report_equipment')
      .select('*')
      .in('daily_report_id', reportIds),
    supabase
      .from('daily_report_deliveries')
      .select('*')
      .in('daily_report_id', reportIds),
    supabase
      .from('daily_report_visitors')
      .select('*')
      .in('daily_report_id', reportIds),
  ])

  return {
    workforce: (workforce.data || []) as RelatedData['workforce'],
    equipment: (equipment.data || []) as RelatedData['equipment'],
    deliveries: (deliveries.data || []) as RelatedData['deliveries'],
    visitors: (visitors.data || []) as RelatedData['visitors'],
  }
}

// Export to CSV format
export function exportToCSV(
  reports: ReportData[],
  _relatedData: RelatedData
): string {
  const headers = [
    'Report Date',
    'Report Number',
    'Status',
    'Weather Condition',
    'High Temp (F)',
    'Low Temp (F)',
    'Precipitation (in)',
    'Wind Speed (mph)',
    'Weather Delays',
    'Total Workers',
    'Work Completed',
    'Issues',
    'Observations',
  ]

  const rows = reports.map((report) => {
    return [
      report.report_date,
      report.report_number || '',
      report.status,
      report.weather_condition || '',
      report.temperature_high?.toString() || '',
      report.temperature_low?.toString() || '',
      report.precipitation?.toString() || '',
      report.wind_speed?.toString() || '',
      report.weather_delays ? 'Yes' : 'No',
      report.total_workers?.toString() || '0',
      (report.work_completed || '').replace(/[\n\r,]/g, ' '),
      (report.issues || '').replace(/[\n\r,]/g, ' '),
      (report.observations || '').replace(/[\n\r,]/g, ' '),
    ]
  })

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  return csvContent
}

// Export workforce data to CSV
export function exportWorkforceToCSV(
  reports: ReportData[],
  relatedData: RelatedData
): string {
  const headers = [
    'Report Date',
    'Type',
    'Team/Worker Name',
    'Trade',
    'Count',
    'Hours Worked',
    'Activity',
  ]

  const rows: string[][] = []

  reports.forEach((report) => {
    const reportWorkforce = relatedData.workforce.filter(
      (w) => w.daily_report_id === report.id
    )

    reportWorkforce.forEach((entry) => {
      rows.push([
        report.report_date,
        entry.entry_type,
        entry.entry_type === 'team' ? entry.team_name || '' : entry.worker_name || '',
        entry.trade || '',
        entry.worker_count?.toString() || '1',
        entry.hours_worked?.toString() || '',
        (entry.activity || '').replace(/[\n\r,]/g, ' '),
      ])
    })
  })

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  return csvContent
}

// Download CSV file
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Main export function
export async function exportReportsToCSV(
  projectId: string,
  startDate: string,
  endDate: string,
  projectName: string
): Promise<void> {
  const reports = await fetchReportsForDateRange(projectId, startDate, endDate)

  if (reports.length === 0) {
    throw new Error('No reports found for the selected date range')
  }

  const reportIds = reports.map((r) => r.id)
  const relatedData = await fetchRelatedDataForReports(reportIds)

  // Generate main report CSV
  const mainCSV = exportToCSV(reports, relatedData)
  const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '_')
  const dateRange = `${startDate}_to_${endDate}`

  downloadCSV(mainCSV, `${safeProjectName}_daily_reports_${dateRange}.csv`)

  // Generate workforce CSV if there's workforce data
  if (relatedData.workforce.length > 0) {
    const workforceCSV = exportWorkforceToCSV(reports, relatedData)
    downloadCSV(workforceCSV, `${safeProjectName}_workforce_${dateRange}.csv`)
  }
}

// Export summary statistics
export interface ReportSummary {
  totalReports: number
  dateRange: string
  totalWorkers: number
  totalWorkDays: number
  weatherDelayDays: number
  averageHighTemp: number
  averageLowTemp: number
}

export function calculateReportSummary(reports: ReportData[]): ReportSummary {
  if (reports.length === 0) {
    return {
      totalReports: 0,
      dateRange: 'N/A',
      totalWorkers: 0,
      totalWorkDays: 0,
      weatherDelayDays: 0,
      averageHighTemp: 0,
      averageLowTemp: 0,
    }
  }

  const sortedDates = reports.map((r) => r.report_date).sort()
  const startDate = format(new Date(sortedDates[0]), 'MMM d, yyyy')
  const endDate = format(new Date(sortedDates[sortedDates.length - 1]), 'MMM d, yyyy')

  const totalWorkers = reports.reduce((sum, r) => sum + (r.total_workers || 0), 0)
  const weatherDelayDays = reports.filter((r) => r.weather_delays).length

  const tempsHigh = reports.filter((r) => r.temperature_high).map((r) => r.temperature_high!)
  const tempsLow = reports.filter((r) => r.temperature_low).map((r) => r.temperature_low!)

  const averageHighTemp = tempsHigh.length > 0
    ? Math.round(tempsHigh.reduce((a, b) => a + b, 0) / tempsHigh.length)
    : 0

  const averageLowTemp = tempsLow.length > 0
    ? Math.round(tempsLow.reduce((a, b) => a + b, 0) / tempsLow.length)
    : 0

  return {
    totalReports: reports.length,
    dateRange: `${startDate} - ${endDate}`,
    totalWorkers,
    totalWorkDays: reports.length,
    weatherDelayDays,
    averageHighTemp,
    averageLowTemp,
  }
}
