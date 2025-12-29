// File: /src/pages/rfis/DedicatedRFIsPage.tsx
// RFIs page using dedicated rfis table with ball-in-court tracking and drawing references
// Implements construction industry standard RFI workflow

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, differenceInDays, isPast } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { useProjects } from '@/features/projects/hooks/useProjects'
import {
  useProjectRFIs,
  useRFIStats,
  formatRFINumber,
  getRFIStatusColor,
  getRFIPriorityColor,
  getBallInCourtLabel,
  RFI_STATUSES,
  RFI_PRIORITIES,
  BALL_IN_COURT_ROLES,
} from '@/features/rfis/hooks/useDedicatedRFIs'
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
  FileQuestion,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Users,
  Calendar,
  FileText,
  Building2,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CreateDedicatedRFIDialog } from '@/features/rfis/components/CreateDedicatedRFIDialog'
import { downloadRFIsAsExcel } from '@/features/rfis/utils/rfiExport'
import type { RFIStatus, RFIPriority, BallInCourtRole } from '@/types/database-extensions'
import type { RFIWithDetails } from '@/features/rfis/hooks/useDedicatedRFIs'
import { logger } from '../../lib/utils/logger';


type ViewMode = 'list' | 'ball-in-court'

export function DedicatedRFIsPage() {
  const navigate = useNavigate()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<RFIStatus | 'all' | 'overdue'>('all')
  const [priorityFilter, setPriorityFilter] = useState<RFIPriority | 'all'>('all')
  const [ballInCourtFilter, setBallInCourtFilter] = useState<BallInCourtRole | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch data
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const { data: rfis, isLoading: rfisLoading, error: rfisError } = useProjectRFIs(selectedProjectId || undefined)
  const { data: stats } = useRFIStats(selectedProjectId || undefined)

  // Filter and search RFIs
  const filteredRFIs = useMemo(() => {
    if (!rfis) {return []}

    return rfis.filter((rfi) => {
      // Search filter
      const matchesSearch =
        !searchTerm ||
        rfi.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfi.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatRFINumber(rfi.rfi_number).toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfi.drawing_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfi.spec_section?.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      let matchesStatus = true
      if (statusFilter === 'overdue') {
        matchesStatus = rfi.date_required ? isPast(new Date(rfi.date_required)) && !['closed', 'void'].includes(rfi.status) : false
      } else if (statusFilter !== 'all') {
        matchesStatus = rfi.status === statusFilter
      }

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || rfi.priority === priorityFilter

      // Ball-in-court filter
      const matchesBallInCourt = ballInCourtFilter === 'all' || rfi.ball_in_court_role === ballInCourtFilter

      return matchesSearch && matchesStatus && matchesPriority && matchesBallInCourt
    })
  }, [rfis, searchTerm, statusFilter, priorityFilter, ballInCourtFilter])

  // Group RFIs by ball-in-court role
  const rfisByBallInCourt = useMemo(() => {
    const grouped: Record<string, RFIWithDetails[]> = {
      gc: [],
      architect: [],
      subcontractor: [],
      owner: [],
      engineer: [],
      consultant: [],
      unassigned: [],
    }

    filteredRFIs.forEach((rfi) => {
      const role = rfi.ball_in_court_role || 'unassigned'
      if (grouped[role]) {
        grouped[role].push(rfi)
      } else {
        grouped.unassigned.push(rfi)
      }
    })

    return grouped
  }, [filteredRFIs])

  // Get selected project name for export filename
  const selectedProject = projects?.find(p => p.id === selectedProjectId)

  // Export handler
  const handleExportRFIs = async () => {
    if (!filteredRFIs.length) {return}

    setIsExporting(true)
    try {
      await downloadRFIsAsExcel(filteredRFIs, selectedProject?.name)
    } catch (error) {
      logger.error('Failed to export RFIs:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Helper functions
  const getDueDateInfo = (dueDate: string | null, status: string) => {
    if (!dueDate) {return { text: 'No due date', class: 'text-muted', isOverdue: false }}
    if (['closed', 'void'].includes(status)) {return { text: format(new Date(dueDate), 'MMM d, yyyy'), class: 'text-muted', isOverdue: false }}

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

  const renderRFICard = (rfi: RFIWithDetails) => {
    const dueDateInfo = getDueDateInfo(rfi.date_required, rfi.status)

    return (
      <div
        key={rfi.id}
        className={cn(
          'py-4 px-3 hover:bg-surface cursor-pointer rounded-lg transition-colors border-b last:border-b-0',
          dueDateInfo.isOverdue && 'bg-error-light/50 hover:bg-error-light'
        )}
        onClick={() => navigate(`/rfis-v2/${rfi.id}`)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-primary">{formatRFINumber(rfi.rfi_number)}</span>
              <Badge className={cn('capitalize text-xs', getRFIStatusColor(rfi.status as RFIStatus))}>
                {RFI_STATUSES.find(s => s.value === rfi.status)?.label || rfi.status}
              </Badge>
              <Badge className={cn('capitalize text-xs', getRFIPriorityColor((rfi.priority || 'normal') as RFIPriority))}>
                {rfi.priority || 'normal'}
              </Badge>
              {rfi.ball_in_court_role && (
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {getBallInCourtLabel(rfi.ball_in_court_role as BallInCourtRole)}
                </Badge>
              )}
            </div>

            {/* Subject */}
            <h3 className="font-medium text-foreground truncate heading-subsection">{rfi.subject}</h3>

            {/* Question preview */}
            {rfi.question && (
              <p className="text-sm text-secondary truncate mt-1">{rfi.question}</p>
            )}

            {/* Reference info */}
            <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
              {/* Drawing reference */}
              {rfi.drawing_reference && (
                <span className="text-purple-600 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  {rfi.drawing_reference}
                </span>
              )}

              {/* Spec section */}
              {rfi.spec_section && (
                <span className="text-indigo-600 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  Spec {rfi.spec_section}
                </span>
              )}

              {/* Due date */}
              <span className={dueDateInfo.class}>
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                {dueDateInfo.text}
              </span>

              {/* Days open */}
              {rfi.date_submitted && (
                <span className="text-muted">
                  Open {differenceInDays(new Date(), new Date(rfi.date_submitted))} days
                </span>
              )}
            </div>

            {/* Impact indicators */}
            {(rfi.cost_impact || rfi.schedule_impact_days) && (
              <div className="flex items-center gap-2 mt-2">
                {rfi.cost_impact && (
                  <Badge variant="outline" className="text-xs text-success-dark border-green-300">
                    Cost: ${Number(rfi.cost_impact).toLocaleString()}
                  </Badge>
                )}
                {rfi.schedule_impact_days && (
                  <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                    Schedule: {rfi.schedule_impact_days} days
                  </Badge>
                )}
              </div>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-disabled flex-shrink-0" />
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground heading-page">Requests for Information</h1>
            <p className="text-secondary mt-1">Track RFIs with ball-in-court workflow and drawing references</p>
          </div>
          <div className="flex gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-r-none"
              >
                List
              </Button>
              <Button
                variant={viewMode === 'ball-in-court' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('ball-in-court')}
                className="rounded-l-none"
              >
                Ball-in-Court
              </Button>
            </div>
            <Button
                variant="outline"
                disabled={!selectedProjectId || !filteredRFIs.length || isExporting}
                onClick={handleExportRFIs}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            <Button disabled={!selectedProjectId} onClick={() => setCreateDialogOpen(true)}>
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
        {selectedProjectId && stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info-light">
                    <FileQuestion className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                    <p className="text-sm text-secondary">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('open')}>
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

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('responded')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success-light">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.responded}</p>
                    <p className="text-sm text-secondary">Responded</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('closed')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <CheckCircle className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.closed}</p>
                    <p className="text-sm text-secondary">Closed</p>
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
                      placeholder="Search by subject, question, RFI #, drawing ref, or spec..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="w-full md:w-44">
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as RFIStatus | 'all' | 'overdue')}
                  >
                    <option value="all">All Statuses</option>
                    <option value="overdue">Overdue</option>
                    {RFI_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="w-full md:w-36">
                  <Select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as RFIPriority | 'all')}
                  >
                    <option value="all">All Priorities</option>
                    {RFI_PRIORITIES.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Ball-in-Court Filter */}
                <div className="w-full md:w-44">
                  <Select
                    value={ballInCourtFilter}
                    onChange={(e) => setBallInCourtFilter(e.target.value as BallInCourtRole | 'all')}
                  >
                    <option value="all">All Ball-in-Court</option>
                    {BALL_IN_COURT_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RFIs Content */}
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
        ) : viewMode === 'ball-in-court' ? (
          /* Ball-in-Court View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BALL_IN_COURT_ROLES.map((role) => {
              const roleRFIs = rfisByBallInCourt[role.value] || []
              if (roleRFIs.length === 0 && ballInCourtFilter !== 'all') {return null}

              return (
                <Card key={role.value} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted" />
                        {role.label}
                      </CardTitle>
                      <Badge variant="secondary">{roleRFIs.length}</Badge>
                    </div>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 max-h-96 overflow-y-auto">
                    {roleRFIs.length === 0 ? (
                      <p className="text-sm text-muted py-4 text-center">No RFIs</p>
                    ) : (
                      <div className="divide-y">
                        {roleRFIs.map((rfi) => (
                          <div
                            key={rfi.id}
                            className="py-3 cursor-pointer hover:bg-surface rounded px-2 -mx-2"
                            onClick={() => navigate(`/rfis-v2/${rfi.id}`)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-primary">
                                {formatRFINumber(rfi.rfi_number)}
                              </span>
                              <Badge className={cn('text-xs', getRFIPriorityColor((rfi.priority || 'normal') as RFIPriority))}>
                                {rfi.priority || 'normal'}
                              </Badge>
                            </div>
                            <p className="text-sm text-foreground truncate">{rfi.subject}</p>
                            {rfi.date_required && (
                              <p className={cn('text-xs mt-1', getDueDateInfo(rfi.date_required, rfi.status).class)}>
                                {getDueDateInfo(rfi.date_required, rfi.status).text}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {/* Unassigned */}
            {rfisByBallInCourt.unassigned.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-disabled" />
                      Unassigned
                    </CardTitle>
                    <Badge variant="secondary">{rfisByBallInCourt.unassigned.length}</Badge>
                  </div>
                  <CardDescription>No ball-in-court assigned</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {rfisByBallInCourt.unassigned.map((rfi) => (
                      <div
                        key={rfi.id}
                        className="py-3 cursor-pointer hover:bg-surface rounded px-2 -mx-2"
                        onClick={() => navigate(`/rfis-v2/${rfi.id}`)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-primary">
                            {formatRFINumber(rfi.rfi_number)}
                          </span>
                          <Badge className={cn('text-xs', getRFIPriorityColor((rfi.priority || 'normal') as RFIPriority))}>
                            {rfi.priority || 'normal'}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground truncate">{rfi.subject}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create RFI
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          /* List View */
          <Card>
            <CardHeader>
              <CardTitle>RFIs</CardTitle>
              <CardDescription>
                Showing {filteredRFIs.length} of {rfis?.length || 0} RFIs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {filteredRFIs.map(renderRFICard)}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create RFI Dialog */}
      <CreateDedicatedRFIDialog
        projectId={selectedProjectId || undefined}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => setCreateDialogOpen(false)}
      />
    </AppLayout>
  )
}

export default DedicatedRFIsPage
