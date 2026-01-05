// File: /src/pages/submittals/SubmittalsPage.tsx
// Main submittals page showing all submittals

import { useState } from 'react'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useSubmittalWorkflowType, useSubmittals } from '@/features/submittals/hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect as Select } from '@/components/ui/select'
import { CreateSubmittalDialog, SubmittalStatusBadge } from '@/features/submittals/components'
import { LiveUpdateBadge } from '@/components/realtime/LiveUpdateBadge'
import { PresenceAvatars } from '@/components/presence/PresenceAvatars'
import { useWorkflowItemsRealtime } from '@/hooks/useRealtimeUpdates'
import { usePagePresence } from '@/hooks/useRealtimePresence'
import { useAuth } from '@/lib/auth'
import { Plus, AlertCircle, Loader2, FileText, Clock, CheckCircle2, XCircle, Download, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'
import { useProjectSubmittals } from '@/features/submittals/hooks/useDedicatedSubmittals'
import { downloadSubmittalLog, downloadSubmittalLogCSV } from '@/features/submittals/utils/submittalExport'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { WorkflowItem } from '@/types/database'
import type { SubmittalWithDetails } from '@/types/submittal'

interface SubmittalsPageState {
  selectedProjectId: string
  searchTerm: string
  statusFilter: string
  createOpen: boolean
  isExporting: boolean
}

export function SubmittalsPage() {
  const { data: projects, isLoading: projectsLoading } = useMyProjects()
  const { user } = useAuth()

  const [state, setState] = useState<SubmittalsPageState>({
    selectedProjectId: '',
    searchTerm: '',
    statusFilter: '',
    createOpen: false,
    isExporting: false,
  })

  // Use selected project or first active project
  const projectId = state.selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id || ''

  const { data: workflowType } = useSubmittalWorkflowType()
  const { data: submittals, isLoading, error } = useSubmittals(projectId, workflowType?.id)

  // Fetch dedicated submittals for export (has lead time, ball-in-court tracking)
  const { data: dedicatedSubmittals } = useProjectSubmittals(projectId || undefined)

  // Realtime updates - show banner when submittals change
  const { pendingUpdates, applyUpdates, dismissUpdates } = useWorkflowItemsRealtime(
    projectId || '',
    'submittals',
    true // showBanner
  )

  // Presence tracking - show who's viewing submittals
  const { users: presenceUsers } = usePagePresence('submittals', projectId || 'all')

  // Get project name for export
  const selectedProject = projects?.find((p) => p.id === projectId)

  // Export handlers
  const handleExportExcel = async () => {
    if (!dedicatedSubmittals || dedicatedSubmittals.length === 0) {return}
    setState((s) => ({ ...s, isExporting: true }))
    try {
      await downloadSubmittalLog(dedicatedSubmittals as SubmittalWithDetails[], selectedProject?.name)
    } catch (error) {
      console.error('Failed to export submittals:', error)
    } finally {
      setState((s) => ({ ...s, isExporting: false }))
    }
  }

  const handleExportCSV = () => {
    if (!dedicatedSubmittals || dedicatedSubmittals.length === 0) {return}
    downloadSubmittalLogCSV(dedicatedSubmittals as SubmittalWithDetails[], selectedProject?.name)
  }

  // Filter submittals
  const filtered = (submittals || []).filter((item) => {
    const matchesSearch =
      item.title?.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(state.searchTerm.toLowerCase())

    const matchesStatus = state.statusFilter ? item.status === state.statusFilter : true

    return matchesSearch && matchesStatus
  })

  // Calculate statistics
  const stats = {
    total: submittals?.length || 0,
    draft: submittals?.filter((s) => s.status === 'draft').length || 0,
    submitted: submittals?.filter((s) => s.status === 'submitted' || s.status === 'under_review').length || 0,
    approved: submittals?.filter((s) => s.status === 'approved').length || 0,
    rejected: submittals?.filter((s) => s.status === 'rejected' || s.status === 'resubmit_required').length || 0,
  }

  return (
    <SmartLayout title="Submittals" subtitle="Document submissions">
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
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground heading-page">Submittals</h1>
              <p className="text-secondary mt-1">Manage project submittals and approvals</p>
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
            {projectId && (dedicatedSubmittals?.length ?? 0) > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={state.isExporting}>
                    {state.isExporting ? (
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

            <Button onClick={() => setState({ ...state, createOpen: true })}>
              <Plus className="h-4 w-4 mr-2" />
              New Submittal
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {!isLoading && submittals && submittals.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card
              className={`cursor-pointer transition-all ${state.statusFilter === '' ? 'ring-2 ring-blue-500' : 'hover:bg-surface'}`}
              onClick={() => setState({ ...state, statusFilter: '' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-info-light rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${state.statusFilter === 'submitted' ? 'ring-2 ring-yellow-500' : 'hover:bg-surface'}`}
              onClick={() => setState({ ...state, statusFilter: 'submitted' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning-light rounded-lg">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.submitted}</p>
                    <p className="text-sm text-muted">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${state.statusFilter === 'approved' ? 'ring-2 ring-green-500' : 'hover:bg-surface'}`}
              onClick={() => setState({ ...state, statusFilter: 'approved' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success-light rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.approved}</p>
                    <p className="text-sm text-muted">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${state.statusFilter === 'rejected' ? 'ring-2 ring-red-500' : 'hover:bg-surface'}`}
              onClick={() => setState({ ...state, statusFilter: 'rejected' })}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-error-light rounded-lg">
                    <XCircle className="h-5 w-5 text-error" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.rejected}</p>
                    <p className="text-sm text-muted">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Project Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-secondary mb-1">Project</label>
                <Select
                  value={state.selectedProjectId}
                  onChange={(e) => setState({ ...state, selectedProjectId: e.target.value })}
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
            </div>
          </CardContent>
        </Card>

        {/* Main Content Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Submittal List</CardTitle>
              <CardDescription>
                {filtered.length} item{filtered.length !== 1 ? 's' : ''} • {stats.draft} draft •{' '}
                {stats.submitted} submitted • {stats.approved} approved
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Input
                placeholder="Search by title..."
                value={state.searchTerm}
                onChange={(e) => setState({ ...state, searchTerm: e.target.value })}
                className="flex-1"
              />
              <Select
                value={state.statusFilter}
                onChange={(e) => setState({ ...state, statusFilter: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="resubmit_required">Resubmit Required</option>
              </Select>
            </div>

            {/* Submittals Table */}
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 text-disabled mx-auto mb-4 animate-spin" />
                <p className="text-secondary">Loading submittals...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-error">Failed to load submittals</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-muted">No submittals found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-secondary">#</th>
                      <th className="text-left py-3 px-4 font-medium text-secondary">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-secondary">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-secondary">Cost Impact</th>
                      <th className="text-left py-3 px-4 font-medium text-secondary">Schedule Impact</th>
                      <th className="text-left py-3 px-4 font-medium text-secondary">Due Date</th>
                      <th className="text-left py-3 px-4 font-medium text-secondary">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item: WorkflowItem) => (
                      <tr key={item.id} className="border-b hover:bg-surface">
                        <td className="py-3 px-4 font-medium text-foreground">{item.number}</td>
                        <td className="py-3 px-4">
                          <a href={`/submittals/${item.id}`} className="text-primary hover:underline">
                            {item.title}
                          </a>
                        </td>
                        <td className="py-3 px-4">
                          <SubmittalStatusBadge status={item.status} />
                        </td>
                        <td className="py-3 px-4 text-secondary text-sm">{item.cost_impact || '-'}</td>
                        <td className="py-3 px-4 text-secondary text-sm">{item.schedule_impact || '-'}</td>
                        <td className="py-3 px-4 text-secondary text-sm">
                          {item.due_date ? item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : 'N/A' : '-'}
                        </td>
                        <td className="py-3 px-4 text-secondary text-sm">
                          {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <CreateSubmittalDialog
          projectId={projectId || undefined}
          open={state.createOpen}
          onOpenChange={(open) => setState({ ...state, createOpen: open })}
          onSuccess={() => setState({ ...state, searchTerm: '' })}
        />
      </div>
    </SmartLayout>
  )
}
