// File: /src/pages/weather-logs/WeatherLogsPage.tsx
// Main weather logs page with list, filters, and statistics

import { useState, useMemo } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useWeatherLogs, useWeatherStatistics, type WeatherLogFilters } from '@/features/weather-logs/hooks/useWeatherLogs'
import { WeatherLogCard } from '@/features/weather-logs/components/WeatherLogCard'
import { WeatherLogFormDialog } from '@/features/weather-logs/components/WeatherLogFormDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect as Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { WeatherCondition, WorkImpact } from '@/types/database-extensions'
import {
  Plus,
  CloudSun,
  Filter,
  X,
  TrendingUp,
  ThermometerSun,
  Clock,
  AlertTriangle,
  Search,
  Calendar,
} from 'lucide-react'
import { format, subDays, startOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'

export function WeatherLogsPage() {
  const { data: projects, isLoading: projectsLoading } = useMyProjects()

  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Filter state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedConditions, setSelectedConditions] = useState<WeatherCondition[]>([])
  const [selectedImpacts, setSelectedImpacts] = useState<WorkImpact[]>([])
  const [workStoppedFilter, setWorkStoppedFilter] = useState<string>('all')

  // Use the selected project or first active project
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  // Build filters object
  const filters: WeatherLogFilters = useMemo(() => {
    const f: WeatherLogFilters = {}
    if (dateFrom) {f.dateFrom = dateFrom}
    if (dateTo) {f.dateTo = dateTo}
    if (selectedConditions.length > 0) {f.conditions = selectedConditions}
    if (selectedImpacts.length > 0) {f.workImpact = selectedImpacts}
    if (workStoppedFilter === 'yes') {f.workStopped = true}
    if (workStoppedFilter === 'no') {f.workStopped = false}
    return f
  }, [dateFrom, dateTo, selectedConditions, selectedImpacts, workStoppedFilter])

  const { data: weatherLogs, isLoading: logsLoading, error } = useWeatherLogs(activeProjectId, filters)
  const { data: statistics, isLoading: statsLoading } = useWeatherStatistics(activeProjectId, filters)

  // Apply search filter
  const filteredLogs = useMemo(() => {
    if (!weatherLogs) {return []}
    if (!searchQuery) {return weatherLogs}

    const query = searchQuery.toLowerCase()
    return weatherLogs.filter((log) => {
      return (
        log.impact_notes?.toLowerCase().includes(query) ||
        log.safety_concerns?.toLowerCase().includes(query) ||
        log.affected_activities.some((activity) => activity.toLowerCase().includes(query))
      )
    })
  }, [weatherLogs, searchQuery])

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSelectedConditions([])
    setSelectedImpacts([])
    setWorkStoppedFilter('all')
    setSearchQuery('')
  }

  const hasActiveFilters =
    dateFrom || dateTo || selectedConditions.length > 0 || selectedImpacts.length > 0 || workStoppedFilter !== 'all' || searchQuery

  const quickFilterDays = (days: number) => {
    setDateFrom(format(subDays(new Date(), days), 'yyyy-MM-dd'))
    setDateTo(format(new Date(), 'yyyy-MM-dd'))
  }

  const isLoading = projectsLoading || logsLoading

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info-light rounded-lg">
                <CloudSun className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground heading-page">Weather Logs</h1>
                <p className="text-sm text-secondary">
                  Track daily weather conditions and their impact on work
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} disabled={!activeProjectId}>
              <Plus className="w-4 h-4 mr-2" />
              Add Weather Log
            </Button>
          </div>

          {/* Project Selector */}
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                disabled={projectsLoading}
              >
                <option value="">
                  {projectsLoading ? 'Loading projects...' : 'Select a project'}
                </option>
                {projects?.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-disabled" />
                <Input
                  type="text"
                  placeholder="Search notes, activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(hasActiveFilters && 'border-primary text-primary')}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="default" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Filter Weather Logs</CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="w-4 h-4 mr-2" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Date Filters */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Quick Date Filters</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => quickFilterDays(7)}>
                      Last 7 days
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => quickFilterDays(30)}>
                      Last 30 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
                        setDateTo(format(new Date(), 'yyyy-MM-dd'))
                      }}
                    >
                      This Month
                    </Button>
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">From Date</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">To Date</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>

                {/* Work Impact Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Work Impact</label>
                  <div className="flex gap-2">
                    {(['none', 'minor', 'moderate', 'severe'] as WorkImpact[]).map((impact) => (
                      <Button
                        key={impact}
                        variant={selectedImpacts.includes(impact) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedImpacts((prev) =>
                            prev.includes(impact)
                              ? prev.filter((i) => i !== impact)
                              : [...prev, impact]
                          )
                        }}
                      >
                        {impact.charAt(0).toUpperCase() + impact.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Work Stopped Filter */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Work Stopped</label>
                  <Select
                    value={workStoppedFilter}
                    onChange={(e) => setWorkStoppedFilter(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="yes">Yes - Work Stopped</option>
                    <option value="no">No - Work Continued</option>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Statistics Cards */}
        {activeProjectId && !statsLoading && statistics && (
          <div className="px-6 py-4 bg-surface border-b">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-muted" />
                    <span className="text-sm text-secondary">Total Logs</span>
                  </div>
                  <p className="text-2xl font-bold">{statistics.totalLogs}</p>
                </CardContent>
              </Card>

              {statistics.averageHighTemp !== null && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <ThermometerSun className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-secondary">Avg High</span>
                    </div>
                    <p className="text-2xl font-bold">{statistics.averageHighTemp}°F</p>
                  </CardContent>
                </Card>
              )}

              {statistics.averageLowTemp !== null && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <ThermometerSun className="w-4 h-4 text-primary" />
                      <span className="text-sm text-secondary">Avg Low</span>
                    </div>
                    <p className="text-2xl font-bold">{statistics.averageLowTemp}°F</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-secondary">Hours Lost</span>
                  </div>
                  <p className="text-2xl font-bold">{statistics.totalHoursLost}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-sm text-secondary">Days w/ Impact</span>
                  </div>
                  <p className="text-2xl font-bold">{statistics.daysWithImpact}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm text-secondary">Precipitation</span>
                  </div>
                  <p className="text-2xl font-bold">{statistics.totalPrecipitation}"</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!activeProjectId && !projectsLoading && (
            <Card>
              <CardContent className="py-12 text-center">
                <CloudSun className="w-16 h-16 text-disabled mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">No Project Selected</h3>
                <p className="text-secondary mb-4">
                  Select a project to view its weather logs
                </p>
              </CardContent>
            </Card>
          )}

          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-secondary">Loading weather logs...</p>
            </div>
          )}

          {error && (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="w-16 h-16 text-error mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">Error Loading Weather Logs</h3>
                <p className="text-secondary">{error.message}</p>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && activeProjectId && filteredLogs && (
            <>
              {filteredLogs.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CloudSun className="w-16 h-16 text-disabled mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">
                      {hasActiveFilters ? 'No Weather Logs Match Filters' : 'No Weather Logs Yet'}
                    </h3>
                    <p className="text-secondary mb-4">
                      {hasActiveFilters
                        ? 'Try adjusting your filters to see more results'
                        : 'Start tracking weather conditions by creating your first log'}
                    </p>
                    {!hasActiveFilters && (
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Weather Log
                      </Button>
                    )}
                    {hasActiveFilters && (
                      <Button variant="outline" onClick={clearFilters}>
                        <X className="w-4 h-4 mr-2" />
                        Clear Filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {filteredLogs.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredLogs.map((log) => (
                    <WeatherLogCard key={log.id} weatherLog={log} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      {activeProjectId && (
        <WeatherLogFormDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          projectId={activeProjectId}
        />
      )}
    </AppLayout>
  )
}
