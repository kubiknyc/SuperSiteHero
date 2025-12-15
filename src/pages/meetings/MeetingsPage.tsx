// @ts-nocheck
// File: /src/pages/meetings/MeetingsPage.tsx
// Meetings list and management page

import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useAllMeetings, useMeetings, MEETING_TYPES, MEETING_STATUSES } from '@/features/meetings/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  Eye,
  Edit,
  Search,
  X,
  SlidersHorizontal,
  FileText,
  CalendarCheck,
  ListChecks,
} from 'lucide-react'
import { format, parseISO, isToday, isFuture, isPast } from 'date-fns'

export function MeetingsPage() {
  const { data: projects } = useMyProjects()
  const navigate = useNavigate()

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<'all' | 'upcoming' | 'past' | 'today'>('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [dateRange, setDateRange] = useState({ from: '', to: '' })

  // Fetch meetings based on project selection
  const { data: allMeetings, isLoading: loadingAll } = useAllMeetings()
  const { data: projectMeetings, isLoading: loadingProject } = useMeetings(selectedProjectId || undefined)

  const meetings = selectedProjectId ? projectMeetings : allMeetings
  const isLoading = selectedProjectId ? loadingProject : loadingAll

  // Filter meetings
  const filteredMeetings = useMemo(() => {
    if (!meetings) {return []}

    return meetings.filter((meeting) => {
      // Text search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableText = [
          meeting.meeting_name,
          meeting.agenda,
          meeting.location,
          meeting.meeting_type,
          meeting.discussion_notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!searchableText.includes(query)) {return false}
      }

      // Type filter
      if (typeFilter.length > 0 && !typeFilter.includes(meeting.meeting_type)) {
        return false
      }

      // Date filter (upcoming/past/today)
      if (dateFilter !== 'all') {
        const meetingDate = parseISO(meeting.meeting_date)
        if (dateFilter === 'upcoming' && !isFuture(meetingDate)) {return false}
        if (dateFilter === 'past' && !isPast(meetingDate)) {return false}
        if (dateFilter === 'today' && !isToday(meetingDate)) {return false}
      }

      // Date range filter
      if (dateRange.from && meeting.meeting_date < dateRange.from) {return false}
      if (dateRange.to && meeting.meeting_date > dateRange.to) {return false}

      return true
    })
  }, [meetings, searchQuery, typeFilter, dateFilter, dateRange])

  // Get meeting type label
  const getMeetingTypeLabel = (type: string) => {
    return MEETING_TYPES.find((t) => t.value === type)?.label || type
  }

  // Get meeting status label and variant
  const getMeetingStatusLabel = (status: string) => {
    return MEETING_STATUSES.find((s) => s.value === status)?.label || status
  }

  const getMeetingStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'default'
      case 'cancelled':
        return 'destructive'
      case 'postponed':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // Get badge variant based on date
  const getDateBadgeVariant = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) {return 'default'}
    if (isFuture(date)) {return 'secondary'}
    return 'outline'
  }

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr)
    if (isToday(date)) {return 'Today'}
    if (isFuture(date)) {return 'Upcoming'}
    return 'Past'
  }

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery) {count++}
    if (typeFilter.length > 0) {count += typeFilter.length}
    if (dateFilter !== 'all') {count++}
    if (dateRange.from || dateRange.to) {count++}
    return count
  }, [searchQuery, typeFilter, dateFilter, dateRange])

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setTypeFilter([])
    setDateFilter('all')
    setDateRange({ from: '', to: '' })
    setShowAdvancedFilters(false)
  }

  // Stats
  const stats = useMemo(() => {
    if (!filteredMeetings) {return { total: 0, upcoming: 0, today: 0, withActionItems: 0 }}

    return {
      total: filteredMeetings.length,
      upcoming: filteredMeetings.filter((m) => isFuture(parseISO(m.meeting_date))).length,
      today: filteredMeetings.filter((m) => isToday(parseISO(m.meeting_date))).length,
      withActionItems: filteredMeetings.filter(
        (m) => m.action_items && Array.isArray(m.action_items) && m.action_items.length > 0
      ).length,
    }
  }, [filteredMeetings])

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
            <p className="text-gray-600 mt-1">
              Schedule and document project meetings and minutes
            </p>
          </div>
          <Link to="/meetings/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Meeting
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Project selector */}
            {projects && projects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <Select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">All projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Search bar */}
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <Input
                type="text"
                placeholder="Search meetings by name, agenda, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear ({activeFilterCount})
                </Button>
              )}
            </div>

            {/* Quick filters */}
            <div className="flex flex-wrap gap-2">
              {/* Date quick filter */}
              <div className="flex items-center border rounded-lg p-1">
                {(['all', 'today', 'upcoming', 'past'] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={dateFilter === filter ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setDateFilter(filter)}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Button>
                ))}
              </div>

              <MultiSelectFilter
                label="Type"
                options={MEETING_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                value={typeFilter}
                onChange={setTypeFilter}
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
              </Button>
            </div>

            {/* Advanced filters panel */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                {/* Date range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) =>
                        setDateRange((prev) => ({ ...prev, from: e.target.value }))
                      }
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) =>
                        setDateRange((prev) => ({ ...prev, to: e.target.value }))
                      }
                      placeholder="To"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading meetings...</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!filteredMeetings || filteredMeetings.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <CalendarCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No meetings found
              </h3>
              <p className="text-gray-600 mb-6">
                {activeFilterCount > 0
                  ? 'No meetings match your current filters. Try adjusting your search criteria.'
                  : 'Schedule your first meeting to start documenting project discussions.'}
              </p>
              {activeFilterCount === 0 && (
                <Link to="/meetings/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Meetings List */}
        {filteredMeetings && filteredMeetings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Meetings</CardTitle>
              <CardDescription>
                {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {filteredMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="py-4 flex items-start justify-between gap-4 hover:bg-gray-50 -mx-4 px-4 cursor-pointer"
                    onClick={() => navigate(`/meetings/${meeting.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {meeting.meeting_name || getMeetingTypeLabel(meeting.meeting_type)}
                        </h3>
                        <Badge variant={getDateBadgeVariant(meeting.meeting_date)}>
                          {getDateLabel(meeting.meeting_date)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(meeting.meeting_date), 'MMM d, yyyy')}
                        </div>
                        {meeting.meeting_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {meeting.meeting_time}
                          </div>
                        )}
                        {meeting.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {meeting.location}
                          </div>
                        )}
                        {meeting.attendees && Array.isArray(meeting.attendees) && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? 's' : ''}
                          </div>
                        )}
                        {meeting.action_items && Array.isArray(meeting.action_items) && meeting.action_items.length > 0 && (
                          <div className="flex items-center gap-1">
                            <ListChecks className="h-4 w-4" />
                            {meeting.action_items.length} action item{meeting.action_items.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {'projects' in meeting && meeting.projects && (
                        <p className="text-xs text-gray-500 mt-1">
                          Project: {(meeting.projects as { name?: string })?.name}
                        </p>
                      )}

                      {meeting.agenda && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {meeting.agenda}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {getMeetingTypeLabel(meeting.meeting_type)}
                      </Badge>
                      <Link
                        to={`/meetings/${meeting.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link
                        to={`/meetings/${meeting.id}/edit`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {filteredMeetings && filteredMeetings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Meetings</p>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Today</p>
                    <p className="text-2xl font-bold mt-1">{stats.today}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Upcoming</p>
                    <p className="text-2xl font-bold mt-1">{stats.upcoming}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">With Action Items</p>
                    <p className="text-2xl font-bold mt-1">{stats.withActionItems}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
