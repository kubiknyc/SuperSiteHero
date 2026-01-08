// File: /src/features/checklists/pages/ExecutionsPage.tsx
// Main page for browsing and managing checklist executions
// Phase: 3.1 - Checklist Execution UI

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Grid3x3,
  List,
  X,
  ClipboardList,
  Filter,
  Calendar,
  User as UserIcon,
  TrendingUp,
  BarChart3,
  FileText,
} from 'lucide-react'
import { ExecutionCard } from '../components/ExecutionCard'
import { StartExecutionDialog } from '../components/StartExecutionDialog'
import { FailedItemsBanner } from '../components/FailedItemsNotification'
import { useExecutions, useDeleteExecution } from '../hooks/useExecutions'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useFailedItemsNotifications } from '../hooks/useFailedItemsNotifications'
import type { ChecklistExecution, ChecklistFilters } from '@/types/checklists'
import { subDays, startOfDay, endOfDay } from 'date-fns'

type ViewMode = 'grid' | 'list'
type StatusFilter = 'all' | 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'custom'
type ScoreFilter = 'all' | 'passed' | 'failed' | 'mixed'

/**
 * ExecutionsPage Component
 *
 * Main page for browsing and managing checklist executions
 * Features:
 * - Grid/list view toggle
 * - Search and filter functionality
 * - Execution CRUD operations
 * - Quick stats dashboard
 */
export function ExecutionsPage() {
  const navigate = useNavigate()
  const { data: projects } = useMyProjects()

  // Selected project
  const [selectedProjectId, _setSelectedProjectId] = useState<string>('')
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Advanced filters
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>('all')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [inspectorFilter, setInspectorFilter] = useState('')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all')
  const [minScore, setMinScore] = useState('')
  const [maxScore, setMaxScore] = useState('')

  // Build filters object
  const filters: ChecklistFilters = useMemo(() => {
    const f: ChecklistFilters = {}

    // Project filter
    if (activeProjectId) {
      f.project_id = activeProjectId
    }

    // Status filter
    if (statusFilter !== 'all') {
      f.status = statusFilter
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date()
      switch (dateRangeFilter) {
        case 'today':
          f.date_from = startOfDay(now).toISOString()
          f.date_to = endOfDay(now).toISOString()
          break
        case 'week':
          f.date_from = startOfDay(subDays(now, 7)).toISOString()
          f.date_to = endOfDay(now).toISOString()
          break
        case 'month':
          f.date_from = startOfDay(subDays(now, 30)).toISOString()
          f.date_to = endOfDay(now).toISOString()
          break
        case 'custom':
          if (customDateFrom) {f.date_from = new Date(customDateFrom).toISOString()}
          if (customDateTo) {f.date_to = new Date(customDateTo).toISOString()}
          break
      }
    }

    return f
  }, [activeProjectId, statusFilter, dateRangeFilter, customDateFrom, customDateTo])

  // Data hooks
  const { data: allExecutions = [], isLoading } = useExecutions(filters)
  const { mutate: deleteExecution } = useDeleteExecution()

  // Failed items notifications
  const { summary: failedItemsSummary } = useFailedItemsNotifications({
    filters,
    enableToasts: false,
  })

  // Get unique inspectors from all executions
  const uniqueInspectors = useMemo(() => {
    const inspectors = new Set<string>()
    allExecutions.forEach((e) => {
      if (e.inspector_name) {
        inspectors.add(e.inspector_name)
      }
    })
    return Array.from(inspectors).sort()
  }, [allExecutions])

  // Client-side filtering for advanced filters not supported by API
  const filteredExecutions = useMemo(() => {
    let result = allExecutions

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.category?.toLowerCase().includes(query) ||
          e.location?.toLowerCase().includes(query)
      )
    }

    // Inspector filter
    if (inspectorFilter && inspectorFilter !== 'all') {
      result = result.filter((e) => e.inspector_name === inspectorFilter)
    }

    // Score filter
    if (scoreFilter !== 'all' && result.length > 0) {
      result = result.filter((e) => {
        if (!e.score_percentage && e.score_percentage !== 0) {return false}

        switch (scoreFilter) {
          case 'passed':
            return e.score_percentage >= 70 // 70% or higher = passed
          case 'failed':
            return e.score_percentage < 70 // Below 70% = failed
          case 'mixed':
            return e.score_percentage >= 50 && e.score_percentage < 70 // 50-70% = mixed
          default:
            return true
        }
      })
    }

    // Custom score range filter
    if (minScore || maxScore) {
      result = result.filter((e) => {
        if (!e.score_percentage && e.score_percentage !== 0) {return false}
        const score = e.score_percentage
        const min = minScore ? parseFloat(minScore) : 0
        const max = maxScore ? parseFloat(maxScore) : 100
        return score >= min && score <= max
      })
    }

    return result
  }, [allExecutions, searchQuery, inspectorFilter, scoreFilter, minScore, maxScore])

  // Statistics
  const stats = useMemo(() => {
    const total = allExecutions.length
    const inProgress = allExecutions.filter((e) => e.status === 'in_progress' || e.status === 'draft').length
    const completed = allExecutions.filter((e) => e.is_completed).length

    // Calculate average score for completed executions with scores
    const completedWithScores = allExecutions.filter((e) => e.is_completed)
    const avgScore = completedWithScores.length > 0
      ? Math.round(completedWithScores.reduce((sum) => sum, 0) / completedWithScores.length)
      : 0

    return { total, inProgress, completed, avgScore }
  }, [allExecutions])

  // Handlers
  const handleCreateExecution = () => {
    setShowStartDialog(true)
  }

  const handleDeleteExecution = (execution: ChecklistExecution) => {
    deleteExecution(execution.id)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setDateRangeFilter('all')
    setCustomDateFrom('')
    setCustomDateTo('')
    setInspectorFilter('')
    setScoreFilter('all')
    setMinScore('')
    setMaxScore('')
  }

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== 'all' ||
    dateRangeFilter !== 'all' ||
    inspectorFilter ||
    scoreFilter !== 'all' ||
    minScore ||
    maxScore

  const activeFilterCount = [
    searchQuery ? 1 : 0,
    statusFilter !== 'all' ? 1 : 0,
    dateRangeFilter !== 'all' ? 1 : 0,
    inspectorFilter ? 1 : 0,
    scoreFilter !== 'all' ? 1 : 0,
    minScore || maxScore ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <SmartLayout title="Active Checklists" subtitle="View and manage checklist executions">
      <div className="min-h-screen bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 heading-page">Active Checklists</h1>
              <p className="text-secondary">
                View and manage inspection checklist executions
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/checklists/dashboard')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/checklists/templates')}>
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </Button>
              <Button onClick={handleCreateExecution} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                New Checklist
              </Button>
            </div>
          </div>
        </div>

        {/* Failed Items Banner */}
        {failedItemsSummary.totalFailedItems > 0 && (
          <FailedItemsBanner
            executions={failedItemsSummary.executionsWithFailures}
            totalFailedCount={failedItemsSummary.totalFailedItems}
            onViewAll={() => navigate('/checklists/dashboard')}
          />
        )}

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg shadow p-4 border border-border">
            <div className="text-sm font-medium text-secondary">Total Checklists</div>
            <div className="text-3xl font-bold text-foreground mt-1">{stats.total}</div>
          </div>
          <div className="bg-card rounded-lg shadow p-4 border border-border">
            <div className="text-sm font-medium text-secondary">In Progress</div>
            <div className="text-3xl font-bold text-primary mt-1">{stats.inProgress}</div>
          </div>
          <div className="bg-card rounded-lg shadow p-4 border border-border">
            <div className="text-sm font-medium text-secondary">Completed</div>
            <div className="text-3xl font-bold text-success mt-1">{stats.completed}</div>
          </div>
          <div className="bg-card rounded-lg shadow p-4 border border-border">
            <div className="text-sm font-medium text-secondary">Avg Score</div>
            <div className="text-3xl font-bold text-purple-600 mt-1">{stats.avgScore}%</div>
          </div>
        </div>

        {/* Filters and View Controls */}
        <div className="bg-card rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-disabled" />
              <Input
                type="text"
                placeholder="Search checklists by name, description, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="flex h-10 w-full lg:w-48 items-center justify-between rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Advanced Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="relative"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge
                  variant="default"
                  className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 heading-subsection">
                <Filter className="w-4 h-4" />
                Advanced Filters
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Date Range
                  </label>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => setDateRangeFilter(e.target.value as DateRangeFilter)}
                    className="w-full h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Custom Date Range Inputs */}
                {dateRangeFilter === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        From Date
                      </label>
                      <Input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => setCustomDateFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-secondary mb-1">
                        To Date
                      </label>
                      <Input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => setCustomDateTo(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Inspector Filter */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-1">
                    <UserIcon className="w-4 h-4" />
                    Inspector
                  </label>
                  <select
                    value={inspectorFilter}
                    onChange={(e) => setInspectorFilter(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                  >
                    <option value="">All Inspectors</option>
                    {uniqueInspectors.map((inspector) => (
                      <option key={inspector} value={inspector}>
                        {inspector}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Score Filter */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Pass/Fail Status
                  </label>
                  <select
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(e.target.value as ScoreFilter)}
                    className="w-full h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                  >
                    <option value="all">All Scores</option>
                    <option value="passed">Passed (≥70%)</option>
                    <option value="mixed">Mixed (50-69%)</option>
                    <option value="failed">Failed (&lt;50%)</option>
                  </select>
                </div>

                {/* Custom Score Range */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Min Score (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary mb-1">
                    Max Score (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>

              {/* Clear Advanced Filters Button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && !showAdvancedFilters && (
            <div className="mt-4 flex items-center gap-2 flex-wrap text-sm text-secondary">
              <span className="font-medium">Active filters ({activeFilterCount}):</span>
              {searchQuery && (
                <Badge variant="secondary">
                  Search: "{searchQuery}"
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary">
                  Status: {statusFilter.replace('_', ' ')}
                </Badge>
              )}
              {dateRangeFilter !== 'all' && (
                <Badge variant="secondary">
                  Date: {dateRangeFilter === 'custom' ? 'Custom range' : dateRangeFilter}
                </Badge>
              )}
              {inspectorFilter && (
                <Badge variant="secondary">
                  Inspector: {inspectorFilter}
                </Badge>
              )}
              {scoreFilter !== 'all' && (
                <Badge variant="secondary">
                  Score: {scoreFilter}
                </Badge>
              )}
              {(minScore || maxScore) && (
                <Badge variant="secondary">
                  Score range: {minScore || '0'}-{maxScore || '100'}%
                </Badge>
              )}
              <button
                onClick={clearFilters}
                className="text-primary hover:text-blue-800 text-xs font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Executions Grid/List */}
        {isLoading ? (
          <div className="bg-card rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="mt-4 text-secondary">Loading checklists...</p>
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="bg-card rounded-lg shadow p-12 text-center">
            <div className="text-disabled mb-4">
              <ClipboardList className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1 heading-subsection">
              {allExecutions.length === 0 ? 'No checklists yet' : 'No checklists match your filters'}
            </h3>
            <p className="text-secondary mb-4">
              {allExecutions.length === 0
                ? 'Get started by creating your first checklist from a template.'
                : 'Try adjusting your search and filter criteria.'}
            </p>
            {allExecutions.length === 0 && (
              <Button onClick={handleCreateExecution}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Checklist
              </Button>
            )}
            {allExecutions.length > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="w-4 h-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredExecutions.map((execution) => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                viewMode={viewMode}
                onDelete={handleDeleteExecution}
              />
            ))}
          </div>
        )}
      </div>

        {/* Start Execution Dialog */}
        {activeProjectId && (
          <StartExecutionDialog
            open={showStartDialog}
            onOpenChange={setShowStartDialog}
            projectId={activeProjectId}
          />
        )}
        </div>
      </div>
    </SmartLayout>
  )
}

export default ExecutionsPage
