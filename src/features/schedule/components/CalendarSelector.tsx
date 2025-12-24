/**
 * Calendar Selector Component
 *
 * Dropdown for selecting a work calendar when creating/editing activities.
 * Shows calendar name with weekly hours summary and supports creating new calendars.
 */

import * as React from 'react'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Plus, Star, Clock } from 'lucide-react'
import { useScheduleCalendars } from '../hooks/useScheduleActivities'
import type { ScheduleCalendar } from '@/types/schedule-activities'

// =============================================
// Helper Functions
// =============================================

/**
 * Calculate total weekly hours from a calendar
 */
function calculateWeeklyHours(calendar: ScheduleCalendar): number {
  return (
    (calendar.sunday_hours || 0) +
    (calendar.monday_hours || 0) +
    (calendar.tuesday_hours || 0) +
    (calendar.wednesday_hours || 0) +
    (calendar.thursday_hours || 0) +
    (calendar.friday_hours || 0) +
    (calendar.saturday_hours || 0)
  )
}

/**
 * Get a summary of working days
 */
function getWorkDaysSummary(calendar: ScheduleCalendar): string {
  const days: string[] = []
  if (calendar.monday_hours > 0) {days.push('M')}
  if (calendar.tuesday_hours > 0) {days.push('T')}
  if (calendar.wednesday_hours > 0) {days.push('W')}
  if (calendar.thursday_hours > 0) {days.push('Th')}
  if (calendar.friday_hours > 0) {days.push('F')}
  if (calendar.saturday_hours > 0) {days.push('Sa')}
  if (calendar.sunday_hours > 0) {days.push('Su')}

  if (days.length === 7) {return 'All days'}
  if (days.length === 5 && !days.includes('Sa') && !days.includes('Su')) {return 'Mon-Fri'}
  if (days.length === 6 && !days.includes('Su')) {return 'Mon-Sat'}
  return days.join(', ')
}

// =============================================
// Component Props
// =============================================

interface CalendarSelectorProps {
  value: string | null
  onChange: (calendarId: string | null) => void
  companyId: string
  projectId?: string
  disabled?: boolean
  placeholder?: string
  showCreateButton?: boolean
  onCreateClick?: () => void
  className?: string
}

// =============================================
// Component
// =============================================

export function CalendarSelector({
  value,
  onChange,
  companyId,
  projectId,
  disabled = false,
  placeholder = 'Select calendar...',
  showCreateButton = false,
  onCreateClick,
  className,
}: CalendarSelectorProps) {
  const { data: calendars, isLoading, isError } = useScheduleCalendars(companyId, projectId)

  // Find selected calendar
  const selectedCalendar = React.useMemo(
    () => calendars?.find((c) => c.id === value),
    [calendars, value]
  )

  // Render loading state
  if (isLoading) {
    return <Skeleton className="h-10 w-full" />
  }

  // Render error state
  if (isError) {
    return (
      <div className="text-sm text-error p-2 border border-red-200 rounded-md bg-error-light">
        Failed to load calendars
      </div>
    )
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select
        value={value || ''}
        onValueChange={(val) => onChange(val === '' ? null : val)}
        disabled={disabled}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={placeholder}>
            {selectedCalendar ? (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{selectedCalendar.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({calculateWeeklyHours(selectedCalendar)}h/wk)
                </span>
                {selectedCalendar.is_default && (
                  <Star className="h-3 w-3 text-warning fill-yellow-500" />
                )}
              </div>
            ) : (
              placeholder
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* No calendar option */}
          <SelectItem value="">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>No calendar (use project default)</span>
            </div>
          </SelectItem>

          {/* Calendar list */}
          {calendars && calendars.length > 0 ? (
            calendars.map((calendar) => {
              const weeklyHours = calculateWeeklyHours(calendar)
              const workDays = getWorkDaysSummary(calendar)

              return (
                <SelectItem key={calendar.id} value={calendar.id}>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{calendar.name}</span>
                        {calendar.is_default && (
                          <Star className="h-3 w-3 text-warning fill-yellow-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {weeklyHours}h/week • {workDays}
                        </span>
                      </div>
                    </div>
                  </div>
                </SelectItem>
              )
            })
          ) : (
            <div className="px-2 py-4 text-sm text-center text-muted-foreground">
              No calendars available
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Create new button */}
      {showCreateButton && onCreateClick && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onCreateClick}
          disabled={disabled}
          title="Create new calendar"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// =============================================
// Display Component (read-only)
// =============================================

interface CalendarDisplayProps {
  calendar: ScheduleCalendar | null | undefined
  className?: string
}

/**
 * Read-only display of a calendar (for detail views)
 */
export function CalendarDisplay({ calendar, className }: CalendarDisplayProps) {
  if (!calendar) {
    return (
      <span className={`text-muted-foreground ${className}`}>No calendar assigned</span>
    )
  }

  const weeklyHours = calculateWeeklyHours(calendar)
  const workDays = getWorkDaysSummary(calendar)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Calendar className="h-4 w-4 text-primary" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-medium">{calendar.name}</span>
          {calendar.is_default && (
            <Star className="h-3 w-3 text-warning fill-yellow-500" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {weeklyHours}h/week • {workDays}
        </span>
      </div>
    </div>
  )
}

// =============================================
// Compact Badge Component
// =============================================

interface CalendarBadgeProps {
  calendar: ScheduleCalendar | null | undefined
  className?: string
}

/**
 * Compact badge showing calendar hours (for tables/lists)
 */
export function CalendarBadge({ calendar, className }: CalendarBadgeProps) {
  if (!calendar) {
    return null
  }

  const weeklyHours = calculateWeeklyHours(calendar)

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-primary-hover ${className}`}
      title={`${calendar.name} - ${weeklyHours}h/week`}
    >
      <Clock className="h-3 w-3" />
      {weeklyHours}h/wk
    </span>
  )
}
