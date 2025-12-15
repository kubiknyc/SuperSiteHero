/**
 * Toolbox Talks List Page
 *
 * Dashboard view of all toolbox talks with statistics,
 * filtering, and talk cards.
 */

import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToolboxTalkCard } from '@/features/toolbox-talks/components'
import {
  useToolboxTalks,
  useToolboxTalkStats,
  useUpcomingToolboxTalks,
} from '@/features/toolbox-talks/hooks'
import type { ToolboxTalkStatus, ToolboxTopicCategory } from '@/types/toolbox-talks'
import {
  TALK_STATUS_LABELS,
  TOPIC_CATEGORY_LABELS,
} from '@/types/toolbox-talks'
import { useProjectContext } from '@/lib/contexts/ProjectContext'
import {
  Plus,
  Search,
  ClipboardList,
  Users,
  CheckCircle2,
  Calendar,
  Filter,
  X,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ToolboxTalksPage() {
  const { currentProject } = useProjectContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')

  // Get filters from URL
  const statusFilter = searchParams.get('status') as ToolboxTalkStatus | null
  const categoryFilter = searchParams.get('category') as ToolboxTopicCategory | null

  // Fetch toolbox talks with filters
  const { data: talks = [], isLoading } = useToolboxTalks({
    project_id: currentProject?.id,
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    search: search || undefined,
  })

  // Fetch statistics
  const { data: stats } = useToolboxTalkStats(currentProject?.id || '')

  // Fetch upcoming talks
  const { data: upcomingTalks = [] } = useUpcomingToolboxTalks(
    currentProject?.id || '',
    7
  )

  // Filter talks locally by search
  const filteredTalks = useMemo(() => {
    if (!search) {return talks}
    const lowerSearch = search.toLowerCase()
    return talks.filter(
      (t) =>
        t.talk_number.toLowerCase().includes(lowerSearch) ||
        t.custom_topic_title?.toLowerCase().includes(lowerSearch) ||
        t.topic?.title.toLowerCase().includes(lowerSearch) ||
        t.location?.toLowerCase().includes(lowerSearch)
    )
  }, [talks, search])

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (value) {
      newParams.set(key, value)
    } else {
      newParams.delete(key)
    }
    setSearchParams(newParams)
  }

  const clearFilters = () => {
    setSearchParams({})
    setSearch('')
  }

  const hasActiveFilters = statusFilter || categoryFilter

  if (!currentProject) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900">No Project Selected</h2>
            <p className="text-gray-500 mt-1">
              Please select a project to view toolbox talks.
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Toolbox Talks</h1>
            <p className="text-gray-500 mt-1">
              Safety briefings and attendance tracking
            </p>
          </div>
          <Link to="/toolbox-talks/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Talk
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 rounded-lg p-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Talks</p>
                  <p className="text-2xl font-bold">{stats.total_talks}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-lg p-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.completed_talks}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 rounded-lg p-2">
                  <Calendar className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scheduled</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.scheduled_talks}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 rounded-lg p-2">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Attendees</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.total_attendees}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Talks Alert */}
        {upcomingTalks.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {upcomingTalks.length} upcoming talk{upcomingTalks.length > 1 ? 's' : ''} this week
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {upcomingTalks.slice(0, 3).map((talk) => (
                <Link
                  key={talk.id}
                  to={`/toolbox-talks/${talk.id}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-sm text-blue-700 hover:bg-blue-100"
                >
                  <span>{talk.talk_number}</span>
                  <span className="text-blue-400">-</span>
                  <span>{talk.scheduled_date}</span>
                </Link>
              ))}
              {upcomingTalks.length > 3 && (
                <span className="text-sm text-blue-600">
                  +{upcomingTalks.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search talks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status filter */}
            <Select
              value={statusFilter || ''}
              onValueChange={(v) => updateFilter('status', v || null)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {Object.entries(TALK_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select
              value={categoryFilter || ''}
              onValueChange={(v) => updateFilter('category', v || null)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {Object.entries(TOPIC_CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Talks Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg border p-4 animate-pulse"
              >
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-3 bg-gray-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredTalks.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900">No Toolbox Talks Found</h2>
            <p className="text-gray-500 mt-1">
              {hasActiveFilters || search
                ? 'Try adjusting your filters or search terms.'
                : 'Schedule your first toolbox talk to get started.'}
            </p>
            {!hasActiveFilters && !search && (
              <Link to="/toolbox-talks/new">
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Talk
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTalks.map((talk) => (
              <ToolboxTalkCard key={talk.id} talk={talk} />
            ))}
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredTalks.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredTalks.length} toolbox talk{filteredTalks.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default ToolboxTalksPage
