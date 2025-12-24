// Dialog for batch exporting daily reports
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { X, Download, FileText, Table, Loader2 } from 'lucide-react'
import { exportReportsToCSV, fetchReportsForDateRange, calculateReportSummary, type ReportSummary } from '../services/batchExportService'
import toast from 'react-hot-toast'

interface BatchExportDialogProps {
  projectId: string
  projectName: string
  onClose: () => void
}

export function BatchExportDialog({ projectId, projectName, onClose }: BatchExportDialogProps) {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [summary, setSummary] = useState<ReportSummary | null>(null)

  const handlePreview = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date must be before end date')
      return
    }

    setIsLoading(true)
    try {
      const reports = await fetchReportsForDateRange(projectId, startDate, endDate)
      const reportSummary = calculateReportSummary(reports)
      setSummary(reportSummary)

      if (reports.length === 0) {
        toast.error('No reports found for the selected date range')
      }
    } catch (error) {
      toast.error('Failed to fetch reports')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportCSV = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates')
      return
    }

    setIsLoading(true)
    try {
      await exportReportsToCSV(projectId, startDate, endDate, projectName)
      toast.success('CSV files downloaded successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Batch Export Reports
          </CardTitle>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-secondary">
            Export multiple daily reports for <strong>{projectName}</strong>
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={isLoading || !startDate || !endDate}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Preview
          </Button>

          {summary && summary.totalReports > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2" className="heading-card">Export Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                <div>Reports: <strong>{summary.totalReports}</strong></div>
                <div>Date Range: <strong>{summary.dateRange}</strong></div>
                <div>Total Workers: <strong>{summary.totalWorkers}</strong></div>
                <div>Weather Delays: <strong>{summary.weatherDelayDays} days</strong></div>
                <div>Avg High: <strong>{summary.averageHighTemp}°F</strong></div>
                <div>Avg Low: <strong>{summary.averageLowTemp}°F</strong></div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleExportCSV}
              disabled={isLoading || !startDate || !endDate}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Table className="h-4 w-4 mr-2" />
              )}
              Export to CSV
            </Button>
          </div>

          <p className="text-xs text-muted text-center">
            CSV export includes main report data and separate workforce file
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
