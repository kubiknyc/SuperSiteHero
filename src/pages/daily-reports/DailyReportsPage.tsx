// File: /src/pages/daily-reports/DailyReportsPage.tsx
// Daily reports list and management page
/* eslint-disable react-hooks/preserve-manual-memoization */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LocalErrorBoundary } from '@/components/errors'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useDailyReports } from '@/features/daily-reports/hooks/useDailyReports'
import { DailyReportsCalendar } from '@/features/daily-reports/components/DailyReportsCalendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NativeSelect as Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { VirtualizedTable } from '@/components/ui/virtualized-table'
import { MultiSelectFilter } from '@/components/ui/multi-select-filter'
import {
  Plus,
  FileText,
  Calendar,
  CalendarDays,
  List,
  Cloud,
  Users,
  Eye,
  Edit,
  Thermometer,
  Clock,
  Search,
  X,
  SlidersHorizontal,
  Download,
} from 'lucide-react'
import { BatchExportDialog } from '@/features/daily-reports/components/BatchExportDialog'
import { format } from 'date-fns'
import type { DailyReport } from '@/types/database'

interface DateRange {
  from: string
  to: string
}

interface WorkerRange {
  min: string
  max: string
}

export function DailyReportsPage() {
  'use no memo'
  const { data: projects } = useMyProjects()
  const navigate = useNavigate()
  const location = useLocation()

  // Initialize state from URL parameters
  const searchParams = new URLSearchParams(location.search)

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    searchParams.get('project') || ''
  )
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get('search') || ''
  )
  const [statusFilter, setStatusFilter] = useState<string[]>(
    searchParams.get('status')?.split(',').filter(Boolean) || []
  )
  const [dateRange, setDateRange] = useState<DateRange>({
    from: searchParams.get('dateFrom') || '',
    to: searchParams.get('dateTo') || '',
  })
  const [weatherFilter, setWeatherFilter] = useState<string[]>(
    searchParams.get('weather')?.split(',').filter(Boolean) || []
  )
  const [workerRange, setWorkerRange] = useState<WorkerRange>({
    min: searchParams.get('workerMin') || '',
    max: searchParams.get('workerMax') || '',
  })
  const [createdByFilter, setCreatedByFilter] = useState(
    searchParams.get('createdBy') || ''
  )
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(
    searchParams.has('advanced')
  )
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(
    (searchParams.get('view') as 'list' | 'calendar') || 'list'
  )
  const [showBatchExport, setShowBatchExport] = useState(false)

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()

    if (selectedProjectId) {params.set('project', selectedProjectId)}
    if (searchQuery) {params.set('search', searchQuery)}
    if (statusFilter.length > 0) {params.set('status', statusFilter.join(','))}
    if (dateRange.from) {params.set('dateFrom', dateRange.from)}
    if (dateRange.to) {params.set('dateTo', dateRange.to)}
    if (weatherFilter.length > 0) {params.set('weather', weatherFilter.join(','))}
    if (workerRange.min) {params.set('workerMin', workerRange.min)}
    if (workerRange.max) {params.set('workerMax', workerRange.max)}
    if (createdByFilter) {params.set('createdBy', createdByFilter)}
    if (showAdvancedFilters) {params.set('advanced', 'true')}
    if (viewMode !== 'list') {params.set('view', viewMode)}

    const newSearch = params.toString()
    const currentSearch = location.search.replace('?', '')

    if (newSearch !== currentSearch) {
      navigate(`?${newSearch}`, { replace: true })
    }
  }, [
    selectedProjectId,
    searchQuery,
    statusFilter,
    dateRange,
    weatherFilter,
    workerRange,
    createdByFilter,
    showAdvancedFilters,
    viewMode,
    navigate,
    location.search,
  ])

  // Use the selected project or first active project
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  const { data: reports, isLoading, error } = useDailyReports(activeProjectId)

  // Comprehensive filtering logic
  const filteredReports = useMemo(() => {
    if (!reports) {return []}

    return reports.filter((report) => {
      // Text search across multiple fields
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchableText = [
          report.report_number,
          report.work_completed,
          report.issues,
          report.observations,
          report.comments,
          report.weather_condition,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!searchableText.includes(query)) {return false}
      }

      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(report.status ?? 'draft')) {
        return false
      }

      // Date range filter
      if (dateRange.from && report.report_date < dateRange.from) {return false}
      if (dateRange.to && report.report_date > dateRange.to) {return false}

      // Weather condition filter
      if (
        weatherFilter.length > 0 &&
        !weatherFilter.includes(report.weather_condition ?? '')
      ) {
        return false
      }

      // Worker count range
      if (workerRange.min && (report.total_workers ?? 0) < parseInt(workerRange.min)) {
        return false
      }
      if (workerRange.max && (report.total_workers ?? 0) > parseInt(workerRange.max)) {
        return false
      }

      // Created by filter
      if (createdByFilter && report.created_by !== createdByFilter) {
        return false
      }

      return true
    })
  }, [
    reports,
    searchQuery,
    statusFilter,
    dateRange,
    weatherFilter,
    workerRange,
    createdByFilter,
  ])

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'in_review':
      case 'submitted':
        return 'default'
      case 'approved':
        return 'success'
      default:
        return 'outline'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Get unique weather conditions from reports
  const uniqueWeatherConditions = useMemo(() => {
    if (!reports) {return []}
    const conditions = new Set(reports.map((r) => r.weather_condition).filter(Boolean))
    return Array.from(conditions).map((c) => ({ value: c!, label: c! }))
  }, [reports])

  // Get unique creators
  const uniqueCreators = useMemo(() => {
    if (!reports) {return []}
    const creators = new Set(
      reports.map((r) => r.created_by).filter((c): c is string => Boolean(c))
    )
    return Array.from(creators)
  }, [reports])

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery) {count++}
    if (statusFilter.length > 0) {count += statusFilter.length}
    if (dateRange.from || dateRange.to) {count++}
    if (weatherFilter.length > 0) {count += weatherFilter.length}
    if (workerRange.min || workerRange.max) {count++}
    if (createdByFilter) {count++}
    return count
  }, [searchQuery, statusFilter, dateRange, weatherFilter, workerRange, createdByFilter])

  // Clear all filters - memoized to prevent re-renders
  const clearAllFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter([])
    setDateRange({ from: '', to: '' })
    setWeatherFilter([])
    setWorkerRange({ min: '', max: '' })
    setCreatedByFilter('')
    setShowAdvancedFilters(false)
  }, [])

  // Memoized event handlers
  const handleProjectChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProjectId(e.target.value)
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleViewModeChange = useCallback((mode: 'list' | 'calendar') => {
    setViewMode(mode)
  }, [])

  const handleToggleAdvancedFilters = useCallback(() => {
    setShowAdvancedFilters(prev => !prev)
  }, [])

  const handleDateFromChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, from: e.target.value }))
  }, [])

  const handleDateToChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, to: e.target.value }))
  }, [])

  const handleWorkerMinChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkerRange(prev => ({ ...prev, min: e.target.value }))
  }, [])

  const handleWorkerMaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkerRange(prev => ({ ...prev, max: e.target.value }))
  }, [])

  const handleCreatedByChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setCreatedByFilter(e.target.value)
  }, [])

  const tableColumns = [
    {
      key: 'date',
      header: 'Date',
      render: (report: DailyReport) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-disabled" />
          {report.report_date ? format(new Date(report.report_date), 'MMM d, yyyy') : 'N/A'}
        </div>
      ),
      className: 'w-32',
    },
    {
      key: 'weather',
      header: 'Weather',
      render: (report: DailyReport) => (
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-disabled" />
          {report.weather_condition || 'Not recorded'}
        </div>
      ),
    },
    {
      key: 'temperature',
      header: 'Temperature',
      render: (report: DailyReport) => (
        <>
          {report.temperature_high && report.temperature_low ? (
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-disabled" />
              {report.temperature_high}°/{report.temperature_low}°
            </div>
          ) : (
            <span className="text-disabled">-</span>
          )}
        </>
      ),
      className: 'w-32',
    },
    {
      key: 'workforce',
      header: 'Workforce',
      render: (report: DailyReport) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-disabled" />
          {report.total_workers || 0} workers
        </div>
      ),
      className: 'w-24',
    },
    {
      key: 'status',
      header: 'Status',
      render: (report: DailyReport) => (
        <Badge variant={getStatusVariant(report.status ?? 'draft')}>
          {formatStatus(report.status ?? 'draft')}
        </Badge>
      ),
      className: 'w-32',
    },
    {
      key: 'createdBy',
      header: 'Created By',
      render: (report: DailyReport) => (
        <span className="text-sm text-secondary">{report.created_by || 'Unknown'}</span>
      ),
      className: 'w-32',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (report: DailyReport) => (
        <div className="flex items-center justify-end gap-2">
          <Link to={`/daily-reports/${report.id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          {report.status === 'draft' && (
            <Link to={`/daily-reports/${report.id}/edit`}>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      ),
      className: 'w-24',
    },
  ]

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="heading-page text-foreground dark:text-white heading-page">Daily Reports</h1>
            <p className="text-secondary mt-1">
              Track daily activities, weather, and workforce
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('calendar')}
                title="Calendar view"
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowBatchExport(true)}
              disabled={!activeProjectId}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link to="/daily-reports/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Project selector */}
            {projects && projects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Project
                </label>
                <Select
                  value={selectedProjectId}
                  onChange={handleProjectChange}
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
              <Search className="h-5 w-5 text-disabled flex-shrink-0" />
              <Input
                type="text"
                placeholder="Search reports by number, work completed, issues..."
                value={searchQuery}
                onChange={handleSearchChange}
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
              <MultiSelectFilter
                label="Status"
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'submitted', label: 'Submitted' },
                  { value: 'in_review', label: 'In Review' },
                  { value: 'approved', label: 'Approved' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />

              {uniqueWeatherConditions.length > 0 && (
                <MultiSelectFilter
                  label="Weather"
                  options={uniqueWeatherConditions}
                  value={weatherFilter}
                  onChange={setWeatherFilter}
                />
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleAdvancedFilters}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                {showAdvancedFilters ? 'Hide' : 'Show'} Advanced
              </Button>
            </div>

            {/* Advanced filters panel */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-surface rounded-lg">
                {/* Date range */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Date Range
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateRange.from}
                      onChange={handleDateFromChange}
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={dateRange.to}
                      onChange={handleDateToChange}
                      placeholder="To"
                    />
                  </div>
                </div>

                {/* Worker count range */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">
                    Worker Count
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={workerRange.min}
                      onChange={handleWorkerMinChange}
                      placeholder="Min"
                      min="0"
                    />
                    <Input
                      type="number"
                      value={workerRange.max}
                      onChange={handleWorkerMaxChange}
                      placeholder="Max"
                      min="0"
                    />
                  </div>
                </div>

                {/* Created by */}
                {uniqueCreators.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-secondary mb-2">
                      Created By
                    </label>
                    <Select
                      value={createdByFilter}
                      onChange={handleCreatedByChange}
                    >
                      <option value="">All users</option>
                      {uniqueCreators.map((creator) => (
                        <option key={creator} value={creator}>
                          {creator}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted">Loading daily reports...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12">
            <p className="text-error">Error loading daily reports: {error.message}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!filteredReports || filteredReports.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-disabled mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">
                No daily reports yet
              </h3>
              <p className="text-secondary mb-6">
                {activeFilterCount > 0
                  ? 'No reports match your current filters. Try adjusting your search criteria.'
                  : 'Start documenting your daily activities by creating your first report.'}
              </p>
              {activeFilterCount === 0 && (
                <Link to="/daily-reports/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Report
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && !isLoading && !error && (
          <LocalErrorBoundary
            title="Unable to load calendar"
            description="We couldn't render the calendar view. Try switching to list view."
          >
            <DailyReportsCalendar
              reports={filteredReports || []}
              projectId={activeProjectId}
              isLoading={isLoading}
            />
          </LocalErrorBoundary>
        )}

        {/* List View - Reports Table */}
        {viewMode === 'list' && filteredReports && filteredReports.length > 0 && (
          <LocalErrorBoundary
            title="Unable to load reports table"
            description="We couldn't render the reports list. Please try refreshing the page."
          >
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>
                  {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VirtualizedTable<DailyReport>
                  data={filteredReports}
                  columns={tableColumns}
                  estimatedRowHeight={73}
                  emptyMessage="No reports available"
                />
              </CardContent>
            </Card>
          </LocalErrorBoundary>
        )}

        {/* Summary Cards - Only show in list view */}
        {viewMode === 'list' && filteredReports && filteredReports.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-uppercase-label text-secondary dark:text-disabled">Total Reports</p>
                    <p className="text-2xl font-bold mt-1">{filteredReports.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-primary dark:text-primary-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-uppercase-label text-secondary dark:text-disabled">Pending Approval</p>
                    <p className="text-2xl font-bold mt-1">
                      {filteredReports.filter((r) => r.status === 'submitted').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-uppercase-label text-secondary dark:text-disabled">Weather Delays</p>
                    <p className="text-2xl font-bold mt-1">
                      {filteredReports.filter((r) => r.weather_delays).length}
                    </p>
                  </div>
                  <Cloud className="h-8 w-8 text-secondary" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Batch Export Dialog */}
        {showBatchExport && activeProjectId && (
          <BatchExportDialog
            projectId={activeProjectId}
            projectName={projects?.find(p => p.id === activeProjectId)?.name || 'Project'}
            onClose={() => setShowBatchExport(false)}
          />
        )}
      </div>
    </AppLayout>
  )
}
