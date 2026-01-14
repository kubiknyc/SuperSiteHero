/**
 * Public Report Viewer Component
 *
 * Displays a shared report accessed via public token.
 * Features:
 * - No authentication required
 * - Company branding (logo, name)
 * - Export to PDF/Excel/CSV (if allowed)
 * - Custom message display
 * - JobSight branding (if enabled)
 * - Error handling for expired/invalid tokens
 */

import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Loader2,
  Download,
  FileText,
  Table as TableIcon,
  FileSpreadsheet,
  Building2,
  Clock,
  AlertTriangle,
  ExternalLink,
  BarChart3,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePublicSharedReport } from '../hooks/useReportSharing'
import { ChartRenderer } from './ChartRenderer'
import { reportExportService, type ReportExportOptions } from '../services/reportExportService'
import { supabase } from '@/lib/supabase'
import type { ReportDataSource, ReportOutputFormat } from '@/types/report-builder'
import { logger } from '../../../lib/utils/logger'

// Data source to table mapping
const DATA_SOURCE_TABLE_MAP: Record<string, string> = {
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

// Default fields for common data sources
const DEFAULT_DISPLAY_FIELDS: Record<string, { field: string; label: string; type: string }[]> = {
  rfis: [
    { field: 'rfi_number', label: 'RFI #', type: 'text' },
    { field: 'subject', label: 'Subject', type: 'text' },
    { field: 'status', label: 'Status', type: 'status' },
    { field: 'priority', label: 'Priority', type: 'status' },
    { field: 'date_submitted', label: 'Submitted', type: 'date' },
    { field: 'date_required', label: 'Required By', type: 'date' },
  ],
  submittals: [
    { field: 'submittal_number', label: 'Submittal #', type: 'text' },
    { field: 'title', label: 'Title', type: 'text' },
    { field: 'spec_section', label: 'Spec Section', type: 'text' },
    { field: 'status', label: 'Status', type: 'status' },
    { field: 'date_submitted', label: 'Submitted', type: 'date' },
  ],
  daily_reports: [
    { field: 'report_date', label: 'Date', type: 'date' },
    { field: 'weather_conditions', label: 'Weather', type: 'text' },
    { field: 'temperature_high', label: 'High Temp', type: 'number' },
    { field: 'work_performed', label: 'Work Performed', type: 'text' },
    { field: 'status', label: 'Status', type: 'status' },
  ],
  tasks: [
    { field: 'title', label: 'Title', type: 'text' },
    { field: 'description', label: 'Description', type: 'text' },
    { field: 'status', label: 'Status', type: 'status' },
    { field: 'priority', label: 'Priority', type: 'status' },
    { field: 'due_date', label: 'Due Date', type: 'date' },
  ],
  safety_incidents: [
    { field: 'incident_number', label: 'Incident #', type: 'text' },
    { field: 'incident_type', label: 'Type', type: 'status' },
    { field: 'severity', label: 'Severity', type: 'status' },
    { field: 'incident_date', label: 'Date', type: 'date' },
    { field: 'status', label: 'Status', type: 'status' },
  ],
}

// Format value for display
function formatDisplayValue(value: unknown, type: string): string {
  if (value === null || value === undefined) {return '—'}

  switch (type) {
    case 'date':
      try {
        return format(new Date(value as string), 'MMM d, yyyy')
      } catch {
        return String(value)
      }
    case 'datetime':
      try {
        return format(new Date(value as string), 'MMM d, yyyy h:mm a')
      } catch {
        return String(value)
      }
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(Number(value) || 0)
    case 'number':
      return new Intl.NumberFormat('en-US').format(Number(value) || 0)
    case 'boolean':
      return value ? 'Yes' : 'No'
    case 'status':
      return String(value).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    default: {
      const strValue = String(value)
      return strValue.length > 100 ? strValue.substring(0, 97) + '...' : strValue
    }
  }
}


export function PublicReportViewer() {
  const { token } = useParams<{ token: string }>()
  const [exporting, setExporting] = useState<string | null>(null)

  // Fetch shared report data
  const { data: sharedReport, isLoading, error } = usePublicSharedReport(token)

  // Determine display fields based on template configuration or defaults
  const displayFields = useMemo(() => {
    if (!sharedReport) {return []}

    const dataSource = sharedReport.template.dataSource
    const config = sharedReport.template.configuration

    // If template has specific fields configured, use those
    if (config?.selectedFieldIds && config.selectedFieldIds.length > 0) {
      // For now, use the selected field IDs as field names
      return config.selectedFieldIds.map(fieldName => ({
        field: fieldName,
        label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        type: 'text' as const,
      }))
    }

    // Otherwise use defaults for this data source
    return DEFAULT_DISPLAY_FIELDS[dataSource] || [
      { field: 'id', label: 'ID', type: 'text' },
      { field: 'created_at', label: 'Created', type: 'datetime' },
    ]
  }, [sharedReport])

  // Fetch actual report data
  const {
    data: reportData = [],
    isLoading: isLoadingData,
    error: dataError,
  } = useQuery({
    queryKey: ['public-report-data', sharedReport?.template.dataSource, sharedReport?.companyId],
    queryFn: async () => {
      if (!sharedReport) {return []}

      const tableName = DATA_SOURCE_TABLE_MAP[sharedReport.template.dataSource]
      if (!tableName) {
        logger.warn(`Unknown data source: ${sharedReport.template.dataSource}`)
        return []
      }

      // Build select columns from display fields
      const selectColumns = displayFields.map(f => f.field).join(', ')

      const { data, error } = await supabase
        .from(tableName)
        .select(selectColumns || '*')
        .eq('company_id', sharedReport.companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100) // Limit for public views

      if (error) {
        logger.error('[PublicReportViewer] Error fetching data:', error)
        throw error
      }

      return data || []
    },
    enabled: !!sharedReport && displayFields.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Handle export using the reportExportService
  const handleExport = async (formatType: 'pdf' | 'excel' | 'csv') => {
    if (!sharedReport?.allowExport) {return}

    setExporting(formatType)
    try {
      // Build export options from template configuration
      const exportOptions: ReportExportOptions = {
        dataSource: sharedReport.template.dataSource as ReportDataSource,
        fields: displayFields.map((f, index) => ({
          field_name: f.field,
          display_name: f.label,
          field_type: f.type as any,
          display_order: index,
        })),
        title: sharedReport.template.name,
        orientation: (sharedReport.template.pageOrientation as 'portrait' | 'landscape') || 'landscape',
        companyName: sharedReport.company.name,
        companyLogo: sharedReport.company.logoUrl || undefined,
        includeChart: sharedReport.template.includeCharts,
        chartConfig: sharedReport.template.configuration?.chartConfig,
      }

      const result = await reportExportService.generateReport(
        formatType as ReportOutputFormat,
        exportOptions
      )

      // Trigger download
      reportExportService.downloadReport(result)

      logger.info(`[PublicReportViewer] Export completed: ${formatType}, ${result.rowCount} rows`)
    } catch (err) {
      logger.error('[PublicReportViewer] Export failed:', err)
    } finally {
      setExporting(null)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-secondary">Loading report...</p>
        </div>
      </div>
    )
  }

  // Error state - invalid or expired token
  if (error || !sharedReport) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-16 w-16 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2 heading-section">
              Report Not Available
            </h2>
            <p className="text-secondary mb-6">
              This report link may have expired or is no longer available.
              Please contact the person who shared this link with you.
            </p>
            <Button asChild variant="outline">
              <a href="https://JobSight.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn About JobSight
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Company Branding */}
            <div className="flex items-center gap-3">
              {sharedReport.company.logoUrl ? (
                <img
                  src={sharedReport.company.logoUrl}
                  alt={sharedReport.company.name}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="h-10 w-10 bg-info-light rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-foreground heading-page">
                  {sharedReport.company.name}
                </h1>
                <p className="text-sm text-muted">
                  {sharedReport.template.name}
                </p>
              </div>
            </div>

            {/* Export Actions */}
            {sharedReport.allowExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleExport('pdf')}
                    disabled={exporting !== null}
                  >
                    {exporting === 'pdf' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport('excel')}
                    disabled={exporting !== null}
                  >
                    {exporting === 'excel' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TableIcon className="h-4 w-4 mr-2" />
                    )}
                    Export as Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleExport('csv')}
                    disabled={exporting !== null}
                  >
                    {exporting === 'csv' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    Export as CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Custom Message */}
        {sharedReport.customMessage && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="py-4">
              <p className="text-blue-800">{sharedReport.customMessage}</p>
            </CardContent>
          </Card>
        )}

        {/* Report Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {sharedReport.template.name}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {sharedReport.template.dataSource.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(sharedReport.createdAt), 'MMM d, yyyy')}
                </Badge>
              </div>
            </div>
            {sharedReport.template.description && (
              <p className="text-muted-foreground mt-2">
                {sharedReport.template.description}
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Report Chart (if configured) */}
        {sharedReport.template.includeCharts &&
          sharedReport.template.configuration?.chartConfig && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {sharedReport.template.configuration.chartConfig.title || 'Chart'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartRenderer
                  config={sharedReport.template.configuration.chartConfig}
                  data={reportData}
                />
              </CardContent>
            </Card>
          )}

        {/* Report Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report Data</CardTitle>
              {reportData.length > 0 && (
                <Badge variant="secondary">
                  {reportData.length} {reportData.length === 1 ? 'record' : 'records'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading report data...</p>
              </div>
            ) : dataError ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-warning" />
                <p>Unable to load report data.</p>
                <p className="text-sm mt-2">Please try refreshing the page.</p>
              </div>
            ) : reportData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No data available for this report.</p>
                <p className="text-sm mt-2">
                  Data source: {sharedReport.template.dataSource.replace(/_/g, ' ')}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {displayFields.map((field) => (
                        <TableHead key={field.field} className="whitespace-nowrap">
                          {field.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((row: Record<string, unknown>, index: number) => (
                      <TableRow key={row.id as string || index}>
                        {displayFields.map((field) => (
                          <TableCell key={field.field} className="max-w-xs truncate">
                            {formatDisplayValue(row[field.field], field.type)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Section */}
        {sharedReport.template.includeSummary && reportData.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{reportData.length}</p>
                  <p className="text-sm text-blue-600">Total Records</p>
                </div>
                {/* Show additional summaries based on data source */}
                {sharedReport.template.dataSource === 'rfis' && (
                  <>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">
                        {reportData.filter((r: any) => r.status === 'closed' || r.status === 'answered').length}
                      </p>
                      <p className="text-sm text-green-600">Closed/Answered</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-700">
                        {reportData.filter((r: any) => r.status === 'open' || r.status === 'pending').length}
                      </p>
                      <p className="text-sm text-yellow-600">Open/Pending</p>
                    </div>
                  </>
                )}
                {sharedReport.template.dataSource === 'submittals' && (
                  <>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">
                        {reportData.filter((r: any) => r.status === 'approved').length}
                      </p>
                      <p className="text-sm text-green-600">Approved</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-700">
                        {reportData.filter((r: any) => r.status === 'pending' || r.status === 'submitted').length}
                      </p>
                      <p className="text-sm text-yellow-600">Pending Review</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-red-700">
                        {reportData.filter((r: any) => r.status === 'rejected' || r.status === 'revise_resubmit').length}
                      </p>
                      <p className="text-sm text-red-600">Rejected/Revise</p>
                    </div>
                  </>
                )}
                {sharedReport.template.dataSource === 'tasks' && (
                  <>
                    <div className="bg-green-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-green-700">
                        {reportData.filter((r: any) => r.status === 'completed').length}
                      </p>
                      <p className="text-sm text-green-600">Completed</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-700">
                        {reportData.filter((r: any) => r.status === 'in_progress').length}
                      </p>
                      <p className="text-sm text-yellow-600">In Progress</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-700">
                        {reportData.filter((r: any) => r.status === 'not_started' || r.status === 'pending').length}
                      </p>
                      <p className="text-sm text-gray-600">Not Started</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm text-muted">
            <div className="flex items-center gap-4">
              <span>
                Report generated {format(new Date(), 'MMMM d, yyyy')}
              </span>
              <span>|</span>
              <span>{sharedReport.viewCount} views</span>
            </div>

            {sharedReport.showBranding && (
              <a
                href="https://JobSight.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:text-primary-hover"
              >
                Powered by JobSight
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PublicReportViewer
