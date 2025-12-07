// File: /src/pages/tasks/TasksPage.tsx
// Tasks list and management page

import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useTasks } from '@/features/tasks/hooks/useTasks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VirtualizedList } from '@/components/ui/virtualized-table'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  Edit,
  Calendar,
  Flag,
} from 'lucide-react'
import { format, isPast } from 'date-fns'
import type { Task } from '@/types/database'

export function TasksPage() {
  const { data: projects } = useMyProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Use the selected project or first active project
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  const { data: tasks, isLoading, error } = useTasks(activeProjectId)

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) {return []}

    return tasks.filter((task) => {
      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) {return false}

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {return false}

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const title = task.title?.toLowerCase() || ''
        const description = task.description?.toLowerCase() || ''

        if (!title.includes(query) && !description.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [tasks, statusFilter, priorityFilter, searchQuery])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!filteredTasks) {return { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 }}

    const pending = filteredTasks.filter((t) => t.status === 'pending').length
    const inProgress = filteredTasks.filter((t) => t.status === 'in_progress').length
    const completed = filteredTasks.filter((t) => t.status === 'completed').length
    const overdue = filteredTasks.filter(
      (t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed'
    ).length

    return {
      total: filteredTasks.length,
      pending,
      inProgress,
      completed,
      overdue,
    }
  }, [filteredTasks])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-100 text-blue-800'
      case 'normal':
        return 'bg-gray-100 text-gray-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary'
      case 'in_progress':
        return 'default'
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'outline'
      default:
        return 'default'
    }
  }

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-1">Manage and track project tasks</p>
          </div>
          {activeProjectId && (
            <Link to={`/tasks/new?projectId=${activeProjectId}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </Link>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold mt-1">{stats.pending}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold mt-1">{stats.inProgress}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold mt-1">{stats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          {stats.overdue > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Overdue</p>
                    <p className="text-2xl font-bold mt-1 text-red-600">{stats.overdue}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Project selector */}
              {projects && projects.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="project-select">Project</Label>
                  <Select
                    id="project-select"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {/* Status filter */}
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status</Label>
                <Select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </div>

              {/* Priority filter */}
              <div className="space-y-2">
                <Label htmlFor="priority-filter">Priority</Label>
                <Select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading tasks...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600">Error loading tasks: {error.message}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!filteredTasks || filteredTasks.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {tasks && tasks.length > 0 ? 'No matching tasks' : 'No tasks yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {tasks && tasks.length > 0
                  ? 'Try adjusting your filters to see more results.'
                  : 'Create your first task to get started.'}
              </p>
              {activeProjectId && (!tasks || tasks.length === 0) && (
                <Link to={`/tasks/new?projectId=${activeProjectId}`}>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Task
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tasks List */}
        {filteredTasks && filteredTasks.length > 0 && (
          <VirtualizedList<Task>
            data={filteredTasks}
            estimatedItemHeight={140}
            maxHeight="calc(100vh - 500px)"
            emptyMessage="No tasks available"
            renderItem={(task) => (
              <Card className="hover:shadow-md transition-shadow mb-4">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                        <Badge variant={getStatusColor(task.status ?? 'pending')}>
                          {formatStatus(task.status ?? 'pending')}
                        </Badge>
                        <Badge className={getPriorityColor(task.priority ?? 'normal')}>
                          {task.priority ?? 'normal'}
                        </Badge>
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        {task.location && <span>📍 {task.location}</span>}

                        {task.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Started {task.start_date ? format(new Date(task.start_date), 'MMM d') : 'N/A'}</span>
                          </div>
                        )}

                        {task.due_date && (
                          <div
                            className={`flex items-center gap-1 ${
                              isPast(new Date(task.due_date)) && task.status !== 'completed'
                                ? 'text-red-600 font-semibold'
                                : ''
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                            <span>Due {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'N/A'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/tasks/${task.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <Link to={`/tasks/${task.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          />
        )}
      </div>
    </AppLayout>
  )
}
