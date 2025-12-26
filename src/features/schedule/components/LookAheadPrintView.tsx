/**
 * Look-Ahead Print View Component
 *
 * Print-friendly 4-week schedule view for field teams.
 * Displays activities in a simple table format optimized for printing.
 */

import { useState, useMemo } from 'react'
import { format, addDays, addWeeks, parseISO, isWithinInterval } from 'date-fns'
import { Calendar, Printer, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { ScheduleActivity } from '@/types/schedule-activities'
import { exportLookAheadToPdf, exportLookAheadToExcel } from '../utils/lookAheadExport'
import { logger } from '../../../lib/utils/logger';


// ============================================================================
// TYPES
// ============================================================================

interface LookAheadPrintViewProps {
  projectId: string
  projectName: string
  activities: ScheduleActivity[]
  onClose?: () => void
}

interface LookAheadActivity {
  id: string
  name: string
  startDate: string
  endDate: string
  duration: number
  status: string
  assignedTo?: string
  percentComplete: number
}

// ============================================================================
// HELPERS
// ============================================================================

function getStatusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    not_started: 'bg-muted text-foreground',
    in_progress: 'bg-info-light text-blue-800',
    completed: 'bg-success-light text-green-800',
    on_hold: 'bg-warning-light text-yellow-800',
    cancelled: 'bg-error-light text-red-800',
  }
  return colors[status] || colors.not_started
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_started: 'Not Started',
    in_progress: 'In Progress',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled',
  }
  return labels[status] || status
}

function calculateDuration(startDate: string, endDate: string): number {
  try {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  } catch {
    return 0
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LookAheadPrintView({
  projectId,
  projectName,
  activities,
  onClose,
}: LookAheadPrintViewProps) {
  // Default to today as start date
  const [startDate, setStartDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  )

  // Calculate end date (4 weeks from start)
  const endDate = useMemo(() => {
    try {
      const start = parseISO(startDate)
      const end = addWeeks(start, 4)
      return format(end, 'yyyy-MM-dd')
    } catch {
      return format(addWeeks(new Date(), 4), 'yyyy-MM-dd')
    }
  }, [startDate])

  // Filter activities within the 4-week window
  const filteredActivities = useMemo<LookAheadActivity[]>(() => {
    try {
      const start = parseISO(startDate)
      const end = parseISO(endDate)

      return activities
        .filter((activity) => {
          if (!activity.planned_start_date) {return false}

          const activityStart = parseISO(activity.planned_start_date)
          const activityEnd = activity.planned_end_date
            ? parseISO(activity.planned_end_date)
            : activityStart

          // Include if activity starts, ends, or spans the look-ahead window
          return (
            isWithinInterval(activityStart, { start, end }) ||
            isWithinInterval(activityEnd, { start, end }) ||
            (activityStart < start && activityEnd > end)
          )
        })
        .map((activity) => ({
          id: activity.id,
          name: activity.activity_name || 'Untitled Activity',
          startDate: activity.planned_start_date!,
          endDate: activity.planned_end_date || activity.planned_start_date!,
          duration: calculateDuration(
            activity.planned_start_date!,
            activity.planned_end_date || activity.planned_start_date!
          ),
          status: activity.status || 'not_started',
          assignedTo: activity.responsible_party || undefined,
          percentComplete: activity.percent_complete || 0,
        }))
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
    } catch {
      return []
    }
  }, [activities, startDate, endDate])

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Handle PDF export
  const handleExportPdf = async () => {
    try {
      await exportLookAheadToPdf({
        projectName,
        startDate,
        endDate,
        activities: filteredActivities,
      })
    } catch (error) {
      logger.error('Failed to export PDF:', error)
    }
  }

  // Handle Excel export
  const handleExportExcel = async () => {
    try {
      await exportLookAheadToExcel({
        projectName,
        startDate,
        endDate,
        activities: filteredActivities,
      })
    } catch (error) {
      logger.error('Failed to export Excel:', error)
    }
  }

  return (
    <div className="look-ahead-print-view">
      {/* Controls (hidden when printing) */}
      <div className="no-print mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold heading-section">4-Week Look-Ahead Schedule</h2>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date (4 weeks)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  disabled
                  className="bg-surface"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handlePrint} variant="default">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button onClick={handleExportPdf} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button onClick={handleExportExcel} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="rounded-md bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            <strong>Found {filteredActivities.length} activities</strong> scheduled
            between {format(parseISO(startDate), 'MMM d, yyyy')} and{' '}
            {format(parseISO(endDate), 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      {/* Print Content */}
      <div className="print-content">
        {/* Header (visible in print) */}
        <div className="print-only mb-8">
          <h1 className="text-3xl font-bold heading-page">{projectName}</h1>
          <h2 className="text-xl text-secondary heading-section">4-Week Look-Ahead Schedule</h2>
          <p className="mt-2 text-sm text-muted">
            {format(parseISO(startDate), 'MMMM d, yyyy')} -{' '}
            {format(parseISO(endDate), 'MMMM d, yyyy')}
          </p>
          <p className="text-sm text-muted">
            Printed: {format(new Date(), 'MMMM d, yyyy h:mm a')}
          </p>
        </div>

        {/* Activities Table */}
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-disabled" />
                <p className="text-lg font-medium">No activities scheduled</p>
                <p className="text-sm">
                  No activities found in the selected 4-week period.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-input bg-surface">
                  <th className="px-4 py-3 text-left font-semibold">Activity Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Start Date</th>
                  <th className="px-4 py-3 text-left font-semibold">End Date</th>
                  <th className="px-4 py-3 text-center font-semibold">Duration</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">% Complete</th>
                  <th className="px-4 py-3 text-left font-semibold">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity, index) => (
                  <tr
                    key={activity.id}
                    className={`border-b ${
                      index % 2 === 0 ? 'bg-card' : 'bg-surface'
                    }`}
                  >
                    <td className="px-4 py-3 font-medium">{activity.name}</td>
                    <td className="px-4 py-3">
                      {format(parseISO(activity.startDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      {format(parseISO(activity.endDate), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {activity.duration} days
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusBadgeColor(activity.status)}>
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {activity.percentComplete}%
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {activity.assignedTo || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary (visible in print) */}
        {filteredActivities.length > 0 && (
          <div className="mt-8 border-t-2 border-input pt-4">
            <p className="text-sm font-semibold">
              Total Activities: {filteredActivities.length}
            </p>
            <p className="text-xs text-muted">
              {projectName} • {format(parseISO(startDate), 'MMM d')} -{' '}
              {format(parseISO(endDate), 'MMM d, yyyy')}
            </p>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-content {
            page-break-inside: avoid;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          @page {
            size: landscape;
            margin: 0.5in;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default LookAheadPrintView
