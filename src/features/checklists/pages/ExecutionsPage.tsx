// File: /src/features/checklists/pages/ExecutionsPage.tsx
// Main page for browsing and managing checklist executions
// Phase: 3.1 - Checklist Execution UI

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Grid3x3,
  List,
  X,
  CheckSquare,
  ClipboardList,
} from 'lucide-react'
import { ExecutionCard } from '../components/ExecutionCard'
import { StartExecutionDialog } from '../components/StartExecutionDialog'
import { useExecutions, useDeleteExecution } from '../hooks/useExecutions'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import type { ChecklistExecution, ChecklistFilters } from '@/types/checklists'

type ViewMode = 'grid' | 'list'
type StatusFilter = 'all' | 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'

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
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showStartDialog, setShowStartDialog] = useState(false)

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

    return f
  }, [activeProjectId, statusFilter])

  // Data hooks
  const { data: allExecutions = [], isLoading } = useExecutions(filters)
  const { mutate: deleteExecution } = useDeleteExecution()

  // Client-side search (API doesn't support search yet, so filter in memory)
  const filteredExecutions = useMemo(() => {
    let result = allExecutions

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

    return result
  }, [allExecutions, searchQuery])

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
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Active Checklists</h1>
              <p className="text-gray-600">
                View and manage inspection checklist executions
              </p>
            </div>
            <Button onClick={handleCreateExecution} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              New Checklist
            </Button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Total Checklists</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">In Progress</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">{stats.inProgress}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Completed</div>
            <div className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Avg Score</div>
            <div className="text-3xl font-bold text-purple-600 mt-1">{stats.avgScore}%</div>
          </div>
        </div>

        {/* Filters and View Controls */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              className="flex h-10 w-full lg:w-48 items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary">
                  Search: "{searchQuery}"
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary">
                  Status: {statusFilter}
                </Badge>
              )}
              <button
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Executions Grid/List */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-600">Loading checklists...</p>
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <ClipboardList className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {allExecutions.length === 0 ? 'No checklists yet' : 'No checklists match your filters'}
            </h3>
            <p className="text-gray-600 mb-4">
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
  )
}

export default ExecutionsPage
