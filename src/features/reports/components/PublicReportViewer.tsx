/**
 * Public Report Viewer Component
 *
 * Displays a shared report accessed via public token.
 * Features:
 * - No authentication required
 * - Company branding (logo, name)
 * - Export to PDF/Excel/CSV (if allowed)
 * - Custom message display
 * - SuperSiteHero branding (if enabled)
 * - Error handling for expired/invalid tokens
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
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
  Table,
  FileSpreadsheet,
  Building2,
  Clock,
  AlertTriangle,
  ExternalLink,
  BarChart3,
} from 'lucide-react'
import { usePublicSharedReport } from '../hooks/useReportSharing'
import { ChartRenderer } from './ChartRenderer'
import type { PublicSharedReportData } from '@/types/report-builder'

export function PublicReportViewer() {
  const { token } = useParams<{ token: string }>()
  const [exporting, setExporting] = useState<string | null>(null)

  // Fetch shared report data
  const { data: sharedReport, isLoading, error } = usePublicSharedReport(token)

  // Handle export
  const handleExport = async (formatType: 'pdf' | 'excel' | 'csv') => {
    if (!sharedReport?.allowExport) return

    setExporting(formatType)
    try {
      // TODO: Implement actual export using the reportExportService
      // For now, just show a placeholder
      await new Promise((resolve) => setTimeout(resolve, 1000))
      console.log(`Exporting as ${formatType}...`)
    } catch (err) {
      console.error('Export failed:', err)
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
            <h2 className="text-xl font-semibold text-foreground mb-2" className="heading-section">
              Report Not Available
            </h2>
            <p className="text-secondary mb-6">
              This report link may have expired or is no longer available.
              Please contact the person who shared this link with you.
            </p>
            <Button asChild variant="outline">
              <a href="https://supersitehero.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn About SuperSiteHero
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
                <h1 className="font-semibold text-foreground" className="heading-page">
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
                      <Table className="h-4 w-4 mr-2" />
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
                  data={[]} // TODO: Fetch actual report data
                />
              </CardContent>
            </Card>
          )}

        {/* Report Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Report Data</CardTitle>
          </CardHeader>
          <CardContent>
            {/* TODO: Render actual report data based on template configuration */}
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Report data will be displayed here based on the template configuration.</p>
              <p className="text-sm mt-2">
                Data source: {sharedReport.template.dataSource.replace(/_/g, ' ')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary Section */}
        {sharedReport.template.includeSummary && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Summary totals will be displayed here.</p>
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
                href="https://supersitehero.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:text-primary-hover"
              >
                Powered by SuperSiteHero
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
