/**
 * Activity Picker Component
 * Allows selecting a look-ahead activity to link to daily report progress
 */

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Search, Link2, Unlink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLookAheadActivities } from '../hooks/useLookAhead'
import type { LookAheadActivityWithDetails } from '@/types/look-ahead'

interface ActivityPickerProps {
  projectId: string
  value?: string | null
  onChange: (activityId: string | null, activity: LookAheadActivityWithDetails | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ActivityPicker({
  projectId,
  value,
  onChange,
  placeholder = 'Link to look-ahead activity...',
  disabled = false,
  className,
}: ActivityPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data: activities, isLoading } = useLookAheadActivities(projectId)

  // Filter activities by search
  const filteredActivities = useMemo(() => {
    if (!activities) {return []}
    if (!search) {return activities}

    const lowerSearch = search.toLowerCase()
    return activities.filter(
      (a) =>
        a.activity_name.toLowerCase().includes(lowerSearch) ||
        a.trade?.toLowerCase().includes(lowerSearch) ||
        a.location?.toLowerCase().includes(lowerSearch)
    )
  }, [activities, search])

  // Group by trade
  const groupedActivities = useMemo(() => {
    const groups = new Map<string, LookAheadActivityWithDetails[]>()
    for (const activity of filteredActivities) {
      const trade = activity.trade || 'General'
      const existing = groups.get(trade) || []
      existing.push(activity)
      groups.set(trade, existing)
    }
    return groups
  }, [filteredActivities])

  // Find selected activity
  const selectedActivity = activities?.find((a) => a.id === value)

  const handleSelect = (activityId: string) => {
    const activity = activities?.find((a) => a.id === activityId)
    if (value === activityId) {
      // Unlink if clicking the same one
      onChange(null, null)
    } else {
      onChange(activityId, activity || null)
    }
    setOpen(false)
    setSearch('')
  }

  const handleUnlink = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null, null)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted',
            className
          )}
          disabled={disabled}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading activities...
            </span>
          ) : selectedActivity ? (
            <span className="flex items-center gap-2 truncate">
              <Link2 className="h-4 w-4 flex-shrink-0 text-success" />
              <span className="truncate">{selectedActivity.activity_name}</span>
              {selectedActivity.trade && (
                <Badge variant="outline" className="ml-1 flex-shrink-0">
                  {selectedActivity.trade}
                </Badge>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-disabled" />
              {placeholder}
            </span>
          )}
          <div className="flex items-center gap-1">
            {value && !disabled && (
              <Unlink
                className="h-4 w-4 text-disabled hover:text-error cursor-pointer"
                onClick={handleUnlink}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
            <Input
              placeholder="Search activities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-disabled" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted">
              No activities found
            </div>
          ) : (
            Array.from(groupedActivities.entries()).map(([trade, items]) => (
              <div key={trade}>
                <div className="px-3 py-2 text-xs font-semibold text-muted bg-surface">
                  {trade}
                </div>
                {items.map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => handleSelect(activity.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted',
                      value === activity.id && 'bg-blue-50'
                    )}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        value === activity.id ? 'opacity-100 text-primary' : 'opacity-0'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-sm">
                        {activity.activity_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                        {activity.location && <span>{activity.location}</span>}
                        <span>{activity.percent_complete}% complete</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            activity.status === 'completed' && 'bg-success-light text-success-dark',
                            activity.status === 'in_progress' && 'bg-warning-light text-yellow-700',
                            activity.status === 'blocked' && 'bg-error-light text-error-dark'
                          )}
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
