// File: /src/pages/rfis/RFIsPage.tsx
// RFIs list page with filtering, sorting, and project selection

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isPast, differenceInDays } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useRFIs, useRFIWorkflowType } from '@/features/rfis/hooks/useRFIs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Plus,
  AlertCircle,
  Loader2,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileQuestion,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreateRFIDialog } from '@/features/rfis/components/CreateRFIDialog'
import type { WorkflowItem } from '@/types/database'

type RFIStatusFilter = 'all' | 'draft' | 'submitted' | 'answered' | 'approved' | 'rejected' | 'closed' | 'overdue'
type RFIPriorityFilter = 'all' | 'low' | 'normal' | 'high'

export function RFIsPage() {
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<RFIStatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<RFIPriorityFilter>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Fetch projects and RFI workflow type
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: workflowType, isLoading: workflowTypeLoading } = useRFIWorkflowType()
  const { data: rfis, isLoading: rfisLoading, error: rfisError } = useRFIs(
    selectedProjectId || undefined,
    workflowType?.id
  )

  // Filter and search RFIs
  const filteredRFIs = useMemo(() => {
    if (!rfis) {return []}

    return rfis.filter((rfi) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        rfi.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfi.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfi.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(rfi.number).includes(searchTerm)

      // Status filter
      let matchesStatus = true
      if (statusFilter === 'overdue') {
        matchesStatus = rfi.due_date ? isPast(new Date(rfi.due_date)) && rfi.status !== 'closed' : false
      } else if (statusFilter !== 'all') {
        matchesStatus = rfi.status === statusFilter
      }

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || rfi.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [rfis, searchTerm, statusFilter, priorityFilter])

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!rfis) {return { total: 0, open: 0, overdue: 0, answered: 0 }}

    const open = rfis.filter((r) => ['draft', 'submitted'].includes(r.status)).length
    const overdue = rfis.filter(
      (r) => r.due_date && isPast(new Date(r.due_date)) && r.status !== 'closed'
    ).length
    const answered = rfis.filter((r) => r.status === 'answered' || r.status === 'approved').length

    return { total: rfis.length, open, overdue, answered }
  }, [rfis])

  // Helper functions
  const getRFINumber = (rfi: WorkflowItem) => {
    return `${workflowType?.prefix || 'RFI'}-${String(rfi.number).padStart(3, '0')}`
  }

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      answered: 'bg-green-100 text-green-800',
      approved: 'bg-green-600 text-white',
      rejected: 'bg-red-100 text-red-800',
      closed: 'bg-slate-200 text-slate-800',
    }
    return classes[status] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityBadgeClass = (priority: string) => {
    const classes: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      normal: 'bg-amber-100 text-amber-800',
      high: 'bg-red-100 text-red-800',
    }
    return classes[priority] || 'bg-gray-100 text-gray-800'
  }

  const getDueDateInfo = (dueDate: string | null) => {
    if (!dueDate) {return { text: 'No due date', class: 'text-gray-500', isOverdue: false }}

    const date = new Date(dueDate)
    const daysUntil = differenceInDays(date, new Date())

    if (daysUntil < 0) {
      return { text: `${Math.abs(daysUntil)} days overdue`, class: 'text-red-600 font-medium', isOverdue: true }
    } else if (daysUntil === 0) {
      return { text: 'Due today', class: 'text-orange-600 font-medium', isOverdue: false }
    } else if (daysUntil <= 3) {
      return { text: `Due in ${daysUntil} days`, class: 'text-amber-600', isOverdue: false }
    }
    return { text: format(date, 'MMM d, yyyy'), class: 'text-gray-600', isOverdue: false }
  }

  const isLoading = projectsLoading || workflowTypeLoading

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Requests for Information</h1>
            <p className="text-gray-600 mt-1">Track and manage RFIs across your projects</p>
          </div>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            disabled={!selectedProjectId || !workflowType}
          >
            <Plus className="h-4 w-4 mr-2" />
            New RFI
          </Button>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 w-full sm:w-auto">
                <Label htmlFor="project-select" className="text-sm font-medium text-gray-700">
                  Select Project
                </Label>
                <Select
                  id="project-select"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="mt-1"
                  disabled={projectsLoading}
                >
                  <option value="">Select a project...</option>
                  {projects?.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
              </div>
              {!selectedProjectId && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Select a project to view RFIs
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        {selectedProjectId && !rfisLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FileQuestion className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-gray-600">Total RFIs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('submitted')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
                    <p className="text-sm text-gray-600">Open</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('overdue')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
                    <p className="text-sm text-gray-600">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('answered')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.answered}</p>
                    <p className="text-sm text-gray-600">Answered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        {selectedProjectId && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search RFIs by title, description, or number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="w-full md:w-48">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as RFIStatusFilter)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="answered">Answered</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="closed">Closed</option>
                    <option value="overdue">Overdue</option>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="w-full md:w-40">
                  <Select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as RFIPriorityFilter)}
                  >
                    <option value="all">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RFIs List */}
        {!selectedProjectId ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileQuestion className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Project Selected</h3>
              <p className="text-gray-600">Select a project above to view and manage RFIs</p>
            </CardContent>
          </Card>
        ) : rfisLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading RFIs...</p>
            </CardContent>
          </Card>
        ) : rfisError ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading RFIs</h3>
              <p className="text-gray-600">{rfisError.message}</p>
            </CardContent>
          </Card>
        ) : filteredRFIs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {rfis?.length === 0 ? 'No RFIs Yet' : 'No Matching RFIs'}
              </h3>
              <p className="text-gray-600 mb-4">
                {rfis?.length === 0
                  ? 'Create your first RFI to get started'
                  : 'Try adjusting your filters or search term'}
              </p>
              {rfis?.length === 0 && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create RFI
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>RFIs</CardTitle>
              <CardDescription>
                Showing {filteredRFIs.length} of {rfis?.length || 0} RFIs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {filteredRFIs.map((rfi) => {
                  const dueDateInfo = getDueDateInfo(rfi.due_date)
                  return (
                    <div
                      key={rfi.id}
                      className={cn(
                        'py-4 px-2 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors',
                        dueDateInfo.isOverdue && 'bg-red-50/50 hover:bg-red-50'
                      )}
                      onClick={() => navigate(`/rfis/${rfi.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-blue-600">{getRFINumber(rfi)}</span>
                            <Badge className={cn('capitalize text-xs', getStatusBadgeClass(rfi.status))}>
                              {rfi.status}
                            </Badge>
                            <Badge className={cn('capitalize text-xs', getPriorityBadgeClass(rfi.priority || 'normal'))}>
                              {rfi.priority || 'normal'}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-gray-900 truncate">{rfi.title || 'Untitled RFI'}</h3>
                          {rfi.description && (
                            <p className="text-sm text-gray-600 truncate mt-1">{rfi.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className={dueDateInfo.class}>
                              <Calendar className="h-3.5 w-3.5 inline mr-1" />
                              {dueDateInfo.text}
                            </span>
                            <span className="text-gray-500">
                              Created {rfi.created_at ? format(new Date(rfi.created_at), 'MMM d, yyyy') : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create RFI Dialog */}
      <CreateRFIDialog
        projectId={selectedProjectId || undefined}
        workflowTypeId={workflowType?.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          // Dialog will close automatically
        }}
      />
    </AppLayout>
  )
}
