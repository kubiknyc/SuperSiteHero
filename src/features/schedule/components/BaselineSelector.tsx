/**
 * Baseline Selector Component
 *
 * Dropdown for selecting an active baseline for variance comparison.
 * Shows baseline name, date, and activity count with option to create new baselines.
 */

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Target, Plus, Calendar, Hash, Star } from 'lucide-react'
import { useScheduleBaselines } from '../hooks/useScheduleActivities'
import type { ScheduleBaseline } from '@/types/schedule-activities'

// =============================================
// Helper Functions
// =============================================

function formatBaselineDate(dateString: string | null | undefined): string {
  if (!dateString) {return ''}
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

// =============================================
// Component Props
// =============================================

interface BaselineSelectorProps {
  projectId: string
  value: string | null
  onChange: (baselineId: string | null) => void
  disabled?: boolean
  placeholder?: string
  showCreateButton?: boolean
  onCreateClick?: () => void
  className?: string
}

// =============================================
// Component
// =============================================

export function BaselineSelector({
  projectId,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select baseline...',
  showCreateButton = false,
  onCreateClick,
  className,
}: BaselineSelectorProps) {
  const { data: baselines, isLoading, isError } = useScheduleBaselines(projectId)

  // Find selected baseline
  const selectedBaseline = React.useMemo(
    () => baselines?.find((b) => b.id === value),
    [baselines, value]
  )

  // Render loading state
  if (isLoading) {
    return <Skeleton className="h-10 w-[200px]" />
  }

  // Render error state
  if (isError) {
    return (
      <div className="text-sm text-error p-2 border border-red-200 rounded-md bg-error-light">
        Failed to load baselines
      </div>
    )
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select
        value={value || '__none__'}
        onValueChange={(val) => onChange(val === '__none__' ? null : val)}
        disabled={disabled}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder={placeholder}>
            {selectedBaseline ? (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="truncate">{selectedBaseline.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>No baseline</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* No baseline option */}
          <SelectItem value="__none__">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>No baseline (no comparison)</span>
            </div>
          </SelectItem>

          {/* Baseline list */}
          {baselines && baselines.length > 0 ? (
            baselines.map((baseline) => (
              <SelectItem key={baseline.id} value={baseline.id}>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{baseline.name}</span>
                      {baseline.is_active && (
                        <Star className="h-3 w-3 text-warning fill-yellow-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatBaselineDate(baseline.created_at)}</span>
                      {baseline.total_activities !== null && (
                        <>
                          <span>•</span>
                          <Hash className="h-3 w-3" />
                          <span>{baseline.total_activities} activities</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-4 text-sm text-center text-muted-foreground">
              No baselines saved yet
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
          title="Save new baseline"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

// =============================================
// Display Component (read-only badge)
// =============================================

interface BaselineDisplayProps {
  baseline: ScheduleBaseline | null | undefined
  className?: string
}

/**
 * Read-only display of a baseline (for detail views)
 */
export function BaselineDisplay({ baseline, className }: BaselineDisplayProps) {
  if (!baseline) {
    return (
      <span className={`text-muted-foreground ${className}`}>No baseline selected</span>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Target className="h-4 w-4 text-primary" />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="font-medium">{baseline.name}</span>
          {baseline.is_active && (
            <Star className="h-3 w-3 text-warning fill-yellow-500" />
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatBaselineDate(baseline.created_at)}
        </span>
      </div>
    </div>
  )
}

// =============================================
// Compact Badge Component
// =============================================

interface BaselineBadgeProps {
  baseline: ScheduleBaseline | null | undefined
  className?: string
}

/**
 * Compact badge showing baseline info (for tables/lists)
 */
export function BaselineBadge({ baseline, className }: BaselineBadgeProps) {
  if (!baseline) {
    return null
  }

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 ${className}`}
      title={`Baseline: ${baseline.name} - ${formatBaselineDate(baseline.created_at)}`}
    >
      <Target className="h-3 w-3" />
      {baseline.name}
    </Badge>
  )
}
