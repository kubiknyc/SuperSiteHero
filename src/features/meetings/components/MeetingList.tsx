// File: src/features/meetings/components/MeetingList.tsx
// Meeting list/register view for project meetings

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type {
  MeetingWithDetails,
  MeetingType,
  MeetingStatus,
  MeetingStatistics,
} from '@/types/meeting-minutes'
import {
  MEETING_TYPES,
  MEETING_STATUSES,
  getMeetingTypeLabel,
  getMeetingStatusColor,
  formatMeetingTimeRange,
  isUpcomingMeeting,
} from '@/types/meeting-minutes'

// =============================================
// Types
// =============================================

interface MeetingListProps {
  meetings: MeetingWithDetails[]
  statistics?: MeetingStatistics | null
  onMeetingClick?: (meeting: MeetingWithDetails) => void
  onCreateMeeting?: () => void
  onExport?: () => void
  className?: string
}

// =============================================
// Helper Components
// =============================================

/**
 * Meeting status badge
 */
function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  const config = MEETING_STATUSES.find((s) => s.value === status)
  const color = getMeetingStatusColor(status)

  const colorClasses: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    cyan: 'bg-cyan-100 text-cyan-800',
    purple: 'bg-purple-100 text-purple-800',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', colorClasses[color])}>
      {config?.label || status}
    </Badge>
  )
}

/**
 * Meeting type badge
 */
function MeetingTypeBadge({ type }: { type: MeetingType }) {
  const typeColors: Record<MeetingType, string> = {
    oac: 'bg-purple-100 text-purple-800',
    subcontractor: 'bg-orange-100 text-orange-800',
    safety: 'bg-red-100 text-red-800',
    progress: 'bg-blue-100 text-blue-800',
    preconstruction: 'bg-cyan-100 text-cyan-800',
    kickoff: 'bg-green-100 text-green-800',
    closeout: 'bg-slate-100 text-slate-800',
    weekly: 'bg-indigo-100 text-indigo-800',
    schedule: 'bg-amber-100 text-amber-800',
    budget: 'bg-emerald-100 text-emerald-800',
    quality: 'bg-teal-100 text-teal-800',
    design: 'bg-violet-100 text-violet-800',
    other: 'bg-gray-100 text-gray-800',
  }

  return (
    <Badge variant="outline" className={cn('text-xs', typeColors[type])}>
      {getMeetingTypeLabel(type)}
    </Badge>
  )
}

/**
 * Location type indicator
 */
function LocationIndicator({ type }: { type: 'in_person' | 'virtual' | 'hybrid' }) {
  const icons = {
    in_person: '📍',
    virtual: '💻',
    hybrid: '🔄',
  }
  const labels = {
    in_person: 'In Person',
    virtual: 'Virtual',
    hybrid: 'Hybrid',
  }

  return (
    <span className="text-xs text-gray-600 flex items-center gap-1">
      <span>{icons[type]}</span>
      <span>{labels[type]}</span>
    </span>
  )
}

/**
 * Attendee count display
 */
function AttendeeCount({ meeting }: { meeting: MeetingWithDetails }) {
  const total = meeting.attendee_count || meeting.attendees?.length || 0
  const confirmed = meeting.confirmed_count || 0

  if (total === 0) return <span className="text-gray-400">-</span>

  return (
    <span className="text-xs">
      {confirmed > 0 ? (
        <>
          <span className="text-green-600 font-medium">{confirmed}</span>
          <span className="text-gray-400">/{total}</span>
        </>
      ) : (
        <span className="text-gray-600">{total}</span>
      )}
    </span>
  )
}

/**
 * Action items count display
 */
function ActionItemsCount({ meeting }: { meeting: MeetingWithDetails }) {
  const total = meeting.action_items?.length || 0
  const open = meeting.open_action_items_count || 0

  if (total === 0) return <span className="text-gray-400">-</span>

  return (
    <span className="text-xs">
      {open > 0 ? (
        <>
          <span className="text-orange-600 font-medium">{open}</span>
          <span className="text-gray-400">/{total} open</span>
        </>
      ) : (
        <span className="text-green-600">{total} done</span>
      )}
    </span>
  )
}

// =============================================
// Statistics Card
// =============================================

function MeetingStatsCard({ stats }: { stats: MeetingStatistics }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div className="text-center p-3 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-gray-700">{stats.total_meetings}</div>
        <div className="text-xs text-gray-500">Total Meetings</div>
      </div>
      <div className="text-center p-3 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-700">{stats.upcoming_count}</div>
        <div className="text-xs text-gray-500">Upcoming</div>
      </div>
      <div className="text-center p-3 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-700">{stats.this_month_count}</div>
        <div className="text-xs text-gray-500">This Month</div>
      </div>
      <div className="text-center p-3 bg-yellow-50 rounded-lg">
        <div className="text-2xl font-bold text-yellow-700">{stats.total_action_items}</div>
        <div className="text-xs text-gray-500">Action Items</div>
      </div>
      <div className="text-center p-3 bg-orange-50 rounded-lg">
        <div className="text-2xl font-bold text-orange-700">{stats.open_action_items}</div>
        <div className="text-xs text-gray-500">Open Items</div>
      </div>
      <div className="text-center p-3 bg-red-50 rounded-lg">
        <div className="text-2xl font-bold text-red-700">{stats.overdue_action_items}</div>
        <div className="text-xs text-gray-500">Overdue</div>
      </div>
    </div>
  )
}

// =============================================
// Main Component
// =============================================

/**
 * Meeting List/Register Component
 *
 * Features:
 * - Meeting list with type and status badges
 * - Filter by type, status, date
 * - Attendee and action item counts
 * - Upcoming meeting highlighting
 * - Statistics summary
 *
 * @example
 * ```tsx
 * <MeetingList
 *   meetings={projectMeetings}
 *   statistics={meetingStats}
 *   onMeetingClick={(m) => navigate(`/meetings/${m.id}`)}
 *   onCreateMeeting={() => setShowCreateDialog(true)}
 * />
 * ```
 */
export function MeetingList({
  meetings,
  statistics,
  onMeetingClick,
  onCreateMeeting,
  onExport,
  className,
}: MeetingListProps) {
  const [search, setSearch] = React.useState('')
  const [typeFilter, setTypeFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')

  // Filter meetings
  const filteredMeetings = React.useMemo(() => {
    return meetings.filter((m) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !(m.title.toLowerCase().includes(searchLower) ||
            m.description?.toLowerCase().includes(searchLower) ||
            m.location?.toLowerCase().includes(searchLower))
        ) {
          return false
        }
      }

      // Type filter
      if (typeFilter !== 'all' && m.meeting_type !== typeFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && m.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [meetings, search, typeFilter, statusFilter])

  // Separate upcoming meetings
  const { upcomingMeetings, pastMeetings } = React.useMemo(() => {
    const upcoming: MeetingWithDetails[] = []
    const past: MeetingWithDetails[] = []

    filteredMeetings.forEach((m) => {
      if (isUpcomingMeeting(m)) {
        upcoming.push(m)
      } else {
        past.push(m)
      }
    })

    // Sort upcoming by date ascending, past by date descending
    upcoming.sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime())
    past.sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())

    return { upcomingMeetings: upcoming, pastMeetings: past }
  }, [filteredMeetings])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Meeting Minutes</h2>
          <p className="text-sm text-gray-500">
            {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? 's' : ''}
            {upcomingMeetings.length > 0 && ` (${upcomingMeetings.length} upcoming)`}
          </p>
        </div>
        <div className="flex gap-2">
          {onCreateMeeting && (
            <Button onClick={onCreateMeeting} size="sm">
              Schedule Meeting
            </Button>
          )}
          {onExport && (
            <Button variant="outline" onClick={onExport} size="sm">
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {statistics && <MeetingStatsCard stats={statistics} />}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search meetings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {MEETING_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {MEETING_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Upcoming Meetings Section */}
      {upcomingMeetings.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            Upcoming Meetings
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium min-w-[200px]">Title</th>
                  <th className="px-3 py-2 text-left font-medium">Location</th>
                  <th className="px-3 py-2 text-center font-medium">Attendees</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {upcomingMeetings.map((meeting) => (
                  <tr
                    key={meeting.id}
                    className={cn(
                      'hover:bg-blue-50/50 cursor-pointer',
                      'bg-blue-50/30'
                    )}
                    onClick={() => onMeetingClick?.(meeting)}
                  >
                    <td className="px-3 py-2 text-xs font-medium">
                      {new Date(meeting.meeting_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {formatMeetingTimeRange(meeting) || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <MeetingTypeBadge type={meeting.meeting_type} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{meeting.title}</div>
                      {meeting.meeting_number && (
                        <div className="text-xs text-gray-500">#{meeting.meeting_number}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <LocationIndicator type={meeting.location_type} />
                      {meeting.location && (
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">
                          {meeting.location}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <AttendeeCount meeting={meeting} />
                    </td>
                    <td className="px-3 py-2">
                      <MeetingStatusBadge status={meeting.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Past/All Meetings Section */}
      <div className="space-y-2">
        {upcomingMeetings.length > 0 && (
          <h3 className="text-sm font-medium text-gray-600">Past Meetings</h3>
        )}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-left font-medium">Time</th>
                  <th className="px-3 py-2 text-left font-medium">Type</th>
                  <th className="px-3 py-2 text-left font-medium min-w-[200px]">Title</th>
                  <th className="px-3 py-2 text-left font-medium">Location</th>
                  <th className="px-3 py-2 text-center font-medium">Attendees</th>
                  <th className="px-3 py-2 text-center font-medium">Actions</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pastMeetings.map((meeting) => (
                  <tr
                    key={meeting.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onMeetingClick?.(meeting)}
                  >
                    <td className="px-3 py-2 text-xs">
                      {new Date(meeting.meeting_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {formatMeetingTimeRange(meeting) || '-'}
                    </td>
                    <td className="px-3 py-2">
                      <MeetingTypeBadge type={meeting.meeting_type} />
                    </td>
                    <td className="px-3 py-2">
                      <div>{meeting.title}</div>
                      {meeting.meeting_number && (
                        <div className="text-xs text-gray-500">#{meeting.meeting_number}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <LocationIndicator type={meeting.location_type} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <AttendeeCount meeting={meeting} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <ActionItemsCount meeting={meeting} />
                    </td>
                    <td className="px-3 py-2">
                      <MeetingStatusBadge status={meeting.status} />
                    </td>
                  </tr>
                ))}
                {pastMeetings.length === 0 && upcomingMeetings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                      No meetings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MeetingList
