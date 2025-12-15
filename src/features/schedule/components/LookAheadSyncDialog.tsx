/**
 * Look-Ahead Sync Dialog Component
 *
 * Dialog for pushing master schedule activities to the 3-week look-ahead.
 * Features multi-select with filters, preview, and sync options.
 */

import * as React from 'react'
import { format, parseISO, addWeeks, startOfWeek, isWithinInterval } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowRight,
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Clock,
  Flag,
  Link2,
} from 'lucide-react'
import type { ScheduleActivity } from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

type FilterPeriod = 'next_week' | 'next_2_weeks' | 'next_3_weeks' | 'all'

interface SyncResult {
  synced: number
  skipped: number
  errors: string[]
}

// =============================================
// Helper Functions
// =============================================

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {return '—'}
  try {
    return format(parseISO(dateString), 'MMM d')
  } catch {
    return dateString
  }
}

function getWeekRange(period: FilterPeriod): { start: Date; end: Date } | null {
  if (period === 'all') {return null}

  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday

  const weeks = period === 'next_week' ? 1 : period === 'next_2_weeks' ? 2 : 3
  const end = addWeeks(weekStart, weeks)

  return { start: weekStart, end }
}

function isActivityInPeriod(
  activity: ScheduleActivity,
  range: { start: Date; end: Date } | null
): boolean {
  if (!range) {return true}
  if (!activity.planned_start) {return false}

  try {
    const activityStart = parseISO(activity.planned_start)
    return isWithinInterval(activityStart, range)
  } catch {
    return false
  }
}

// =============================================
// Component Props
// =============================================

interface LookAheadSyncDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  companyId: string
  activities: ScheduleActivity[]
  onSync?: (
    activityIds: string[],
    options: { overwriteExisting: boolean }
  ) => Promise<SyncResult>
  onSyncComplete?: (count: number) => void
  isSyncing?: boolean
}

// =============================================
// Component
// =============================================

export function LookAheadSyncDialog({
  open,
  onOpenChange,
  projectId,
  companyId,
  activities,
  onSync,
  onSyncComplete,
  isSyncing = false,
}: LookAheadSyncDialogProps) {
  // State
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filterPeriod, setFilterPeriod] = React.useState<FilterPeriod>('next_3_weeks')
  const [criticalOnly, setCriticalOnly] = React.useState(false)
  const [overwriteExisting, setOverwriteExisting] = React.useState(false)
  const [syncResult, setSyncResult] = React.useState<SyncResult | null>(null)

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedIds(new Set())
      setSearchQuery('')
      setFilterPeriod('next_3_weeks')
      setCriticalOnly(false)
      setOverwriteExisting(false)
      setSyncResult(null)
    }
  }, [open])

  // Filter activities
  const filteredActivities = React.useMemo(() => {
    const weekRange = getWeekRange(filterPeriod)

    return activities.filter((activity) => {
      // Period filter
      if (!isActivityInPeriod(activity, weekRange)) {return false}

      // Critical only filter
      if (criticalOnly && !activity.is_critical) {return false}

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          activity.name.toLowerCase().includes(query) ||
          activity.activity_id.toLowerCase().includes(query) ||
          activity.wbs_code?.toLowerCase().includes(query)
        )
      }

      return true
    })
  }, [activities, filterPeriod, criticalOnly, searchQuery])

  // Check if activity is already linked to look-ahead
  const getActivityStatus = (activity: ScheduleActivity): 'new' | 'linked' => {
    // In a real implementation, we'd check if there's a look-ahead activity
    // with schedule_item_id === activity.id
    // For now, we'll assume all are new
    return 'new'
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredActivities.map((a) => a.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  // Handle individual selection
  const handleSelect = (activityId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(activityId)
    } else {
      newSelected.delete(activityId)
    }
    setSelectedIds(newSelected)
  }

  // Handle sync
  const handleSync = async () => {
    if (selectedIds.size === 0) {return}

    try {
      if (onSync) {
        const result = await onSync(Array.from(selectedIds), { overwriteExisting })
        setSyncResult(result)
        onSyncComplete?.(result.synced)
      } else {
        // If no onSync provided, just call onSyncComplete with selected count
        onSyncComplete?.(selectedIds.size)
      }
    } catch (error) {
      setSyncResult({
        synced: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
      })
    }
  }

  const allSelected = filteredActivities.length > 0 &&
    filteredActivities.every((a) => selectedIds.has(a.id))
  const someSelected = filteredActivities.some((a) => selectedIds.has(a.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Push to Look-Ahead
          </DialogTitle>
          <DialogDescription>
            Select activities to push to the 3-week look-ahead schedule
          </DialogDescription>
        </DialogHeader>

        {syncResult ? (
          // Sync Result View
          <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-4">
            {syncResult.errors.length > 0 ? (
              <>
                <AlertTriangle className="h-16 w-16 text-yellow-500" />
                <h3 className="text-lg font-semibold">Sync Completed with Issues</h3>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h3 className="text-lg font-semibold">Sync Successful</h3>
              </>
            )}

            <div className="text-center text-muted-foreground">
              <p>{syncResult.synced} activities pushed to look-ahead</p>
              {syncResult.skipped > 0 && (
                <p>{syncResult.skipped} activities skipped (already exist)</p>
              )}
            </div>

            {syncResult.errors.length > 0 && (
              <Alert variant="destructive" className="max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {syncResult.errors.map((error, i) => (
                      <li key={i} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          // Selection View
          <>
            {/* Filters */}
            <div className="flex items-center gap-4 py-2">
              <Select value={filterPeriod} onValueChange={(v: string) => setFilterPeriod(v as FilterPeriod)}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next_week">Next Week</SelectItem>
                  <SelectItem value="next_2_weeks">Next 2 Weeks</SelectItem>
                  <SelectItem value="next_3_weeks">Next 3 Weeks</SelectItem>
                  <SelectItem value="all">All Activities</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                <Checkbox
                  checked={criticalOnly}
                  onCheckedChange={(checked) => setCriticalOnly(checked === true)}
                />
                Critical Only
              </label>
            </div>

            <Separator />

            {/* Select All */}
            <div className="flex items-center justify-between py-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className={someSelected && !allSelected ? 'data-[state=checked]:bg-primary/50' : ''}
                />
                Select All ({filteredActivities.length} activities)
              </label>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
            </div>

            <Separator />

            {/* Activity List */}
            <ScrollArea className="flex-1 min-h-[300px]">
              {filteredActivities.length > 0 ? (
                <div className="space-y-1 py-2">
                  {filteredActivities.map((activity) => {
                    const isSelected = selectedIds.has(activity.id)
                    const status = getActivityStatus(activity)

                    return (
                      <div
                        key={activity.id}
                        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer ${
                          isSelected ? 'bg-muted' : ''
                        }`}
                        onClick={() => handleSelect(activity.id, !isSelected)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleSelect(activity.id, checked === true)}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{activity.name}</span>
                            {activity.is_milestone && (
                              <Flag className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                            )}
                            {activity.is_critical && (
                              <Badge variant="destructive" className="text-xs flex-shrink-0">
                                Critical
                              </Badge>
                            )}
                            {status === 'linked' && (
                              <Link2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {activity.activity_id}
                            {activity.wbs_code && ` • WBS: ${activity.wbs_code}`}
                          </div>
                        </div>

                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(activity.planned_start)} - {formatDate(activity.planned_finish)}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {activity.planned_duration || 0} days
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No activities match the current filters</p>
                </div>
              )}
            </ScrollArea>

            <Separator />

            {/* Options */}
            <div className="py-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={overwriteExisting}
                  onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                />
                Overwrite existing look-ahead activities
              </label>
              {overwriteExisting && (
                <p className="text-xs text-yellow-600 mt-1 ml-6">
                  Warning: This will replace any existing look-ahead activities linked to the selected schedule activities
                </p>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        {!syncResult && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSync}
              disabled={selectedIds.size === 0 || isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Push {selectedIds.size} Activities
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
