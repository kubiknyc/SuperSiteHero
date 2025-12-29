/**
 * Daily Reports Calendar Component
 * Displays daily reports in a calendar view with status indicators
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import type { DailyReport } from '@/types/database'

interface DailyReportsCalendarProps {
  reports: DailyReport[]
  projectId?: string
  isLoading?: boolean
}

interface ReportsByDate {
  [dateKey: string]: DailyReport[]
}

// Status colors for indicators
const statusColors: Record<string, string> = {
  draft: 'bg-gray-400',
  submitted: 'bg-blue-500',
  in_review: 'bg-warning',
  approved: 'bg-green-500',
}

export function DailyReportsCalendar({
  reports,
  projectId,
  isLoading = false,
}: DailyReportsCalendarProps) {
  const navigate = useNavigate()

  // Group reports by date
  const reportsByDate = useMemo<ReportsByDate>(() => {
    const grouped: ReportsByDate = {}
    reports.forEach((report) => {
      if (report.report_date) {
        const dateKey = report.report_date.split('T')[0] // YYYY-MM-DD
        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(report)
      }
    })
    return grouped
  }, [reports])

  // Get dates that have reports for DayPicker modifiers
  const datesWithReports = useMemo(() => {
    return Object.keys(reportsByDate).map((dateStr) => new Date(dateStr))
  }, [reportsByDate])

  // Handle day click
  const handleDayClick = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const reportsForDate = reportsByDate[dateKey]

    if (reportsForDate && reportsForDate.length > 0) {
      // Navigate to the first report for this date
      navigate(`/daily-reports/${reportsForDate[0].id}`)
    } else {
      // Navigate to create new report with date pre-filled
      navigate(`/daily-reports/new?date=${dateKey}${projectId ? `&project=${projectId}` : ''}`)
    }
  }

  // Get status indicator for a date
  const getStatusIndicator = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const reportsForDate = reportsByDate[dateKey]

    if (!reportsForDate || reportsForDate.length === 0) {return null}

    // Get the highest priority status (approved > in_review > submitted > draft)
    const statusPriority = ['approved', 'in_review', 'submitted', 'draft']
    let highestStatus = 'draft'
    for (const status of statusPriority) {
      if (reportsForDate.some((r) => r.status === status)) {
        highestStatus = status
        break
      }
    }

    return (
      <div className="flex justify-center mt-1">
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            statusColors[highestStatus] || 'bg-gray-400'
          )}
        />
      </div>
    )
  }

  // Custom day content renderer
  const renderDayContent = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const reportsForDate = reportsByDate[dateKey]
    const hasReports = reportsForDate && reportsForDate.length > 0

    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <span>{date.getDate()}</span>
        {hasReports && getStatusIndicator(date)}
      </div>
    )
  }

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = reports.length
    const draft = reports.filter((r) => r.status === 'draft').length
    const submitted = reports.filter((r) => r.status === 'submitted').length
    const approved = reports.filter((r) => r.status === 'approved').length
    return { total, draft, submitted, approved }
  }, [reports])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Loading calendar...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Report Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <DayPicker
            mode="single"
            modifiers={{
              hasReport: datesWithReports,
            }}
            modifiersClassNames={{
              hasReport: 'font-semibold',
            }}
            onDayClick={handleDayClick}
            className="p-3 mx-auto"
            classNames={{
              months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
              month: 'space-y-4',
              caption: 'flex justify-center pt-1 relative items-center',
              caption_label: 'text-sm font-medium',
              nav: 'space-x-1 flex items-center',
              nav_button: cn(
                buttonVariants({ variant: 'outline' }),
                'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
              ),
              nav_button_previous: 'absolute left-1',
              nav_button_next: 'absolute right-1',
              table: 'w-full border-collapse space-y-1',
              head_row: 'flex',
              head_cell: 'text-muted-foreground rounded-md w-12 font-normal text-[0.8rem]',
              row: 'flex w-full mt-2',
              cell: cn(
                'h-12 w-12 text-center text-sm p-0 relative',
                '[&:has([aria-selected])]:bg-accent',
                'first:[&:has([aria-selected])]:rounded-l-md',
                'last:[&:has([aria-selected])]:rounded-r-md',
                'focus-within:relative focus-within:z-20'
              ),
              day: cn(
                buttonVariants({ variant: 'ghost' }),
                'h-12 w-12 p-0 font-normal aria-selected:opacity-100 hover:bg-accent'
              ),
              day_selected:
                'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
              day_today: 'bg-accent text-accent-foreground',
              day_outside: 'day-outside text-muted-foreground opacity-50',
              day_disabled: 'text-muted-foreground opacity-50',
              day_hidden: 'invisible',
            }}
            components={{
              Chevron: ({ orientation }) => {
                const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
                return <Icon className="h-4 w-4" />
              },
              DayButton: ({ day, ...props }) => (
                <button {...props}>{renderDayContent(day.date)}</button>
              ),
            }}
          />

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors.draft)} />
              <span className="text-sm text-muted-foreground">Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors.submitted)} />
              <span className="text-sm text-muted-foreground">Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors.in_review)} />
              <span className="text-sm text-muted-foreground">In Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors.approved)} />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors.draft)} />
              <span className="text-sm text-muted-foreground">Draft</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors.submitted)} />
              <span className="text-sm text-muted-foreground">Submitted</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.submitted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', statusColors.approved)} />
              <span className="text-sm text-muted-foreground">Approved</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.approved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick tip */}
      <p className="text-sm text-muted-foreground text-center">
        Click on a date to view existing reports or create a new one
      </p>
    </div>
  )
}

export default DailyReportsCalendar
