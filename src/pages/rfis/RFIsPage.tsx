// File: /src/pages/rfis/RFIsPage.tsx
// RFIs list page with filtering, sorting, and project selection

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isPast, differenceInDays } from 'date-fns'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { useRFIs, useRFIWorkflowType } from '@/features/rfis/hooks/useRFIs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect as Select } from '@/components/ui/select'
import { LiveUpdateBadge } from '@/components/realtime/LiveUpdateBadge'
import { PresenceAvatars } from '@/components/presence/PresenceAvatars'
import { useWorkflowItemsRealtime } from '@/hooks/useRealtimeUpdates'
import { usePagePresence } from '@/hooks/useRealtimePresence'
import { useAuth } from '@/lib/auth'
import {
  Plus,
  AlertCircle,
  Loader2,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileQuestion,
  ChevronRight,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreateRFIDialog } from '@/features/rfis/components/CreateRFIDialog'
import { useProjectRFIs } from '@/features/rfis/hooks/useDedicatedRFIs'
import { downloadRFIsAsExcel, downloadRFIsAsCSV } from '@/features/rfis/utils/rfiExport'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WorkflowItem } from '@/types/database'

type RFIStatusFilter = 'all' | 'draft' | 'submitted' | 'answered' | 'approved' | 'rejected' | 'closed' | 'overdue'
type RFIPriorityFilter = 'all' | 'low' | 'normal' | 'high'

export function RFIsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedProjectId, setSelectedProjectId, projects, isLoading: projectsLoading } = useSelectedProject()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<RFIStatusFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<RFIPriorityFilter>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const [isExporting, setIsExporting] = useState(false)

  // Fetch RFI workflow type
  const { data: workflowType } = useRFIWorkflowType()
  const { data: rfis, isLoading: rfisLoading, error: rfisError } = useRFIs(
    selectedProjectId || undefined,
    workflowType?.id
  )

  // Fetch dedicated RFIs for export (has ball-in-court tracking)
  const { data: dedicatedRFIs } = useProjectRFIs(selectedProjectId || undefined)

  // Realtime updates - show banner when RFIs change
  const { pendingUpdates, applyUpdates, dismissUpdates } = useWorkflowItemsRealtime(
    selectedProjectId || '',
    'rfis',
    true // showBanner
  )

  // Presence tracking - show who's viewing RFIs
  const { users: presenceUsers } = usePagePresence('rfis', selectedProjectId || 'all')

  // Get project name for export
  const selectedProject = projects?.find((p) => p.id === selectedProjectId)

  // Export handlers
  const handleExportExcel = async () => {
    if (!dedicatedRFIs || dedicatedRFIs.length === 0) {return}
    setIsExporting(true)
    try {
      await downloadRFIsAsExcel(dedicatedRFIs, selectedProject?.name)
    } catch (error) {
      console.error('Failed to export RFIs:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = () => {
    if (!dedicatedRFIs || dedicatedRFIs.length === 0) {return}
    downloadRFIsAsCSV(dedicatedRFIs, selectedProject?.name)
  }

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
      draft: 'bg-muted text-foreground',
      submitted: 'bg-info-light text-blue-800',
      answered: 'bg-success-light text-green-800',
      approved: 'bg-success text-white',
      rejected: 'bg-error-light text-red-800',
      closed: 'bg-slate-200 text-slate-800',
    }
    return classes[status] || 'bg-muted text-foreground'
  }

  const getPriorityBadgeClass = (priority: string) => {
    const classes: Record<string, string> = {
      low: 'bg-success-light text-green-800',
      normal: 'bg-amber-100 text-amber-800',
      high: 'bg-error-light text-red-800',
    }
    return classes[priority] || 'bg-muted text-foreground'
  }

  const getDueDateInfo = (dueDate: string | null) => {
    if (!dueDate) {return { text: 'No due date', class: 'text-muted', isOverdue: false }}

    const date = new Date(dueDate)
    const daysUntil = differenceInDays(date, new Date())

    if (daysUntil < 0) {
      return { text: `${Math.abs(daysUntil)} days overdue`, class: 'text-error font-medium', isOverdue: true }
    } else if (daysUntil === 0) {
      return { text: 'Due today', class: 'text-orange-600 font-medium', isOverdue: false }
    } else if (daysUntil <= 3) {
      return { text: `Due in ${daysUntil} days`, class: 'text-warning', isOverdue: false }
    }
    return { text: format(date, 'MMM d, yyyy'), class: 'text-secondary', isOverdue: false }
  }

  return (
    <SmartLayout title="RFIs" subtitle="Requests for information">
      <div className="p-6 space-y-6">
        {/* Realtime update banner */}
        {pendingUpdates > 0 && (
          <LiveUpdateBadge
            count={pendingUpdates}
            onRefresh={applyUpdates}
            onDismiss={dismissUpdates}
            variant="banner"
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground heading-page">Requests for Information</h1>
              <p className="text-secondary mt-1">Track and manage RFIs across your projects</p>
            </div>
            {/* Presence avatars */}
            {presenceUsers.length > 0 && (
              <PresenceAvatars
                users={presenceUsers}
                maxVisible={3}
                size="sm"
                currentUserId={user?.id}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Export Dropdown */}
            {selectedProjectId && (dedicatedRFIs?.length ?? 0) > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export to Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export to CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              onClick={() => setCreateDialogOpen(true)}
              disabled={!selectedProjectId || !workflowType}
            >
              <Plus className="h-4 w-4 mr-2" />
              New RFI
            </Button>
          </div>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 w-full sm:w-auto">
                <Label htmlFor="project-select" className="text-sm font-medium text-secondary">
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
                <p className="text-sm text-warning flex items-center gap-1">
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
                  <div className="p-2 rounded-lg bg-info-light">
                    <FileQuestion className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                    <p className="text-sm text-secondary">Total RFIs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('submitted')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.open}</p>
                    <p className="text-sm text-secondary">Open</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('overdue')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-error-light">
                    <AlertTriangle className="h-5 w-5 text-error" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.overdue}</p>
                    <p className="text-sm text-secondary">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('answered')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success-light">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.answered}</p>
                    <p className="text-sm text-secondary">Answered</p>
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-disabled" />
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
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">No Project Selected</h3>
              <p className="text-secondary">Select a project above to view and manage RFIs</p>
            </CardContent>
          </Card>
        ) : rfisLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="h-12 w-12 text-disabled mx-auto mb-4 animate-spin" />
              <p className="text-secondary">Loading RFIs...</p>
            </CardContent>
          </Card>
        ) : rfisError ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">Error Loading RFIs</h3>
              <p className="text-secondary">{rfisError.message}</p>
            </CardContent>
          </Card>
        ) : filteredRFIs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">
                {rfis?.length === 0 ? 'No RFIs Yet' : 'No Matching RFIs'}
              </h3>
              <p className="text-secondary mb-4">
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
                        'py-4 px-2 hover:bg-surface cursor-pointer rounded-lg transition-colors',
                        dueDateInfo.isOverdue && 'bg-error-light/50 hover:bg-error-light'
                      )}
                      onClick={() => navigate(`/rfis/${rfi.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold text-primary">{getRFINumber(rfi)}</span>
                            <Badge className={cn('capitalize text-xs', getStatusBadgeClass(rfi.status))}>
                              {rfi.status}
                            </Badge>
                            <Badge className={cn('capitalize text-xs', getPriorityBadgeClass(rfi.priority || 'normal'))}>
                              {rfi.priority || 'normal'}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-foreground truncate heading-subsection">{rfi.title || 'Untitled RFI'}</h3>
                          {rfi.description && (
                            <p className="text-sm text-secondary truncate mt-1">{rfi.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className={dueDateInfo.class}>
                              <Calendar className="h-3.5 w-3.5 inline mr-1" />
                              {dueDateInfo.text}
                            </span>
                            <span className="text-muted">
                              Created {rfi.created_at ? format(new Date(rfi.created_at), 'MMM d, yyyy') : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-disabled flex-shrink-0" />
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
    </SmartLayout>
  )
}
