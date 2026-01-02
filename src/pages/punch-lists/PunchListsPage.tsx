// File: /src/pages/punch-lists/PunchListsPage.tsx
// Main punch lists page with filters, search, and table view

import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useSelectedProject } from '@/hooks/useSelectedProject'
import { usePunchItems } from '@/features/punch-lists/hooks/usePunchItems'
import { CreatePunchItemDialog } from '@/features/punch-lists/components/CreatePunchItemDialog'
import { EditPunchItemDialog } from '@/features/punch-lists/components/EditPunchItemDialog'
import { DeletePunchItemConfirmation } from '@/features/punch-lists/components/DeletePunchItemConfirmation'
import { PunchItemStatusBadge } from '@/features/punch-lists/components/PunchItemStatusBadge'
import { QuickPunchMode } from '@/features/punch-lists/components/QuickPunchMode'
import { QRCodeScanner, FloatingScanButton } from '@/features/punch-lists/components/QRCodeScanner'
import { BatchQRCodePrint } from '@/features/punch-lists/components/PunchItemQRCode'
import { usePunchItemSync } from '@/features/punch-lists/hooks/usePunchItemSync'
import { VirtualizedTable } from '@/components/ui/virtualized-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Plus, Edit, Loader2, CheckCircle2, Clock, AlertCircle, ListChecks, Zap, WifiOff, RefreshCw, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import type { PunchItem } from '@/types/database'

export function PunchListsPage() {
  const navigate = useNavigate()
  const { selectedProjectId, setSelectedProjectId, projects } = useSelectedProject()

  // Offline sync for punch items
  const { pendingCount: offlinePendingCount, syncNow, isOnline } = usePunchItemSync()

  // Use persistent selected project or fall back to first active project
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [quickPunchOpen, setQuickPunchOpen] = useState(false)
  const [editingPunchItem, setEditingPunchItem] = useState<PunchItem | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [tradeSearch, setTradeSearch] = useState('')

  // Fetch punch items
  const { data: punchItems, isLoading, error } = usePunchItems(activeProjectId)

  // Filter punch items
  const filteredPunchItems = useMemo(() => {
    if (!punchItems) {return []}

    return punchItems.filter((item) => {
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {return false}

      // Priority filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {return false}

      // Trade search
      if (tradeSearch) {
        const query = tradeSearch.toLowerCase()
        const trade = item.trade?.toLowerCase() || ''
        const title = item.title?.toLowerCase() || ''
        if (!trade.includes(query) && !title.includes(query)) {return false}
      }

      return true
    })
  }, [punchItems, statusFilter, priorityFilter, tradeSearch])

  // Calculate statistics
  const stats = useMemo(() => {
    if (!punchItems) {return { total: 0, open: 0, inProgress: 0, completed: 0, highPriority: 0 }}
    return {
      total: punchItems.length,
      open: punchItems.filter((p) => p.status === 'open').length,
      inProgress: punchItems.filter((p) => p.status === 'in_progress' || p.status === 'ready_for_review').length,
      completed: punchItems.filter((p) => p.status === 'completed' || p.status === 'verified').length,
      highPriority: punchItems.filter((p) => p.priority === 'high').length,
    }
  }, [punchItems])

  const handleRowClick = useCallback((punchItemId: string) => {
    navigate(`/punch-lists/${punchItemId}`)
  }, [navigate])

  const handleEdit = useCallback((e: React.MouseEvent, punchItem: PunchItem) => {
    e.stopPropagation()
    setEditingPunchItem(punchItem)
    setEditDialogOpen(true)
  }, [])

  const tableColumns = [
    {
      key: 'title',
      header: 'Title',
      render: (item: PunchItem) => <span className="font-medium">{item.title}</span>,
    },
    {
      key: 'trade',
      header: 'Trade',
      render: (item: PunchItem) => <span>{item.trade || '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: PunchItem) => <PunchItemStatusBadge status={item.status} />,
      className: 'w-32',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item: PunchItem) => <PunchItemStatusBadge status={item.status} priority={item.priority} />,
      className: 'w-32',
    },
    {
      key: 'location',
      header: 'Location',
      render: (item: PunchItem) => (
        <span>
          {[item.building, item.floor, item.room]
            .filter(Boolean)
            .join(' / ') || '-'}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (item: PunchItem) => (
        <span>
          {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : '-'}
        </span>
      ),
      className: 'w-32',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: PunchItem) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e: React.MouseEvent) => handleEdit(e, item)}
            className="text-primary hover:text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:text-primary-300 dark:hover:bg-primary-950"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <DeletePunchItemConfirmation punchItem={item} />
        </div>
      ),
      className: 'w-20',
    },
  ]

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground heading-page">Punch Lists</h1>
            <p className="text-secondary mt-1">Track and manage punch list items</p>
          </div>
          {activeProjectId && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/projects/${activeProjectId}/punch-lists/by-area`)}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                By Area Report
              </Button>
              <QRCodeScanner buttonLabel="Scan QR" buttonVariant="outline" />
              <Button
                variant="default"
                className="bg-success hover:bg-green-700"
                onClick={() => setQuickPunchOpen(true)}
              >
                <Zap className="h-4 w-4 mr-2" />
                Quick Punch
              </Button>
              <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Punch Item
              </Button>
              {filteredPunchItems && filteredPunchItems.length > 0 && (
                <BatchQRCodePrint punchItems={filteredPunchItems} />
              )}
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        {!isLoading && punchItems && punchItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card
              className={`cursor-pointer transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary dark:ring-primary-400' : 'hover:bg-surface'}`}
              onClick={() => setStatusFilter('all')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 dark:bg-primary-950 rounded-lg">
                    <ListChecks className="h-5 w-5 text-primary dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-muted">Total Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${statusFilter === 'open' ? 'ring-2 ring-orange-500' : 'hover:bg-surface'}`}
              onClick={() => setStatusFilter('open')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.open}</p>
                    <p className="text-sm text-muted">Open</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${statusFilter === 'in_progress' ? 'ring-2 ring-yellow-500' : 'hover:bg-surface'}`}
              onClick={() => setStatusFilter('in_progress')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning-light rounded-lg">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.inProgress}</p>
                    <p className="text-sm text-muted">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${statusFilter === 'completed' ? 'ring-2 ring-green-500' : 'hover:bg-surface'}`}
              onClick={() => setStatusFilter('completed')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success-light rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-sm text-muted">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Offline Pending Items Banner */}
        {offlinePendingCount > 0 && (
          <Card className={isOnline ? 'bg-primary-50 border-primary-200 dark:bg-primary-950/20 dark:border-primary-800' : 'bg-warning-light border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isOnline ? 'bg-primary-100 dark:bg-primary-950' : 'bg-amber-100 dark:bg-amber-950'}`}>
                    <WifiOff className={`h-5 w-5 ${isOnline ? 'text-primary dark:text-primary-400' : 'text-warning dark:text-amber-400'}`} />
                  </div>
                  <div>
                    <p className={`font-medium ${isOnline ? 'text-primary-900 dark:text-primary-100' : 'text-amber-900 dark:text-amber-100'}`}>
                      {offlinePendingCount} punch item{offlinePendingCount > 1 ? 's' : ''} pending sync
                    </p>
                    <p className={`text-sm ${isOnline ? 'text-primary-700 dark:text-primary-300' : 'text-amber-700 dark:text-amber-300'}`}>
                      {isOnline
                        ? 'Syncing automatically...'
                        : 'Will sync when back online'}
                    </p>
                  </div>
                </div>
                {isOnline && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={syncNow}
                    className="border-primary-300 text-primary-700 hover:bg-primary-100 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Sync Now
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="ready_for_review">Ready for Review</option>
                  <option value="completed">Completed</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
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

              {/* Trade search */}
              <div className="space-y-2">
                <Label htmlFor="trade-search">Search</Label>
                <Input
                  id="trade-search"
                  type="text"
                  placeholder="Search by trade or title..."
                  value={tradeSearch}
                  onChange={(e) => setTradeSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-disabled" />
            <p className="ml-2 text-muted">Loading punch items...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-error">Error loading punch items: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!filteredPunchItems || filteredPunchItems.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">
                {punchItems && punchItems.length > 0 ? 'No matching punch items' : 'No punch items yet'}
              </h3>
              <p className="text-secondary mb-6">
                {punchItems && punchItems.length > 0
                  ? 'Try adjusting your filters to see more results.'
                  : 'Create your first punch item to get started.'}
              </p>
              {activeProjectId && (!punchItems || punchItems.length === 0) && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Punch Item
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Desktop Table View */}
        {filteredPunchItems && filteredPunchItems.length > 0 && (
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <VirtualizedTable<PunchItem>
                  data={filteredPunchItems}
                  columns={tableColumns}
                  estimatedRowHeight={73}
                  onRowClick={(item) => handleRowClick(item.id)}
                  emptyMessage="No punch items available"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mobile Card View */}
        {filteredPunchItems && filteredPunchItems.length > 0 && (
          <div className="md:hidden space-y-4">
            {filteredPunchItems.map((item) => (
              <Card
                key={item.id}
                onClick={() => handleRowClick(item.id)}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground flex-1 heading-subsection">{item.title}</h3>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEdit(e, item)}
                          className="text-primary hover:text-primary-700 hover:bg-primary-50 dark:text-primary-400 dark:hover:text-primary-300 dark:hover:bg-primary-950"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DeletePunchItemConfirmation punchItem={item} />
                      </div>
                    </div>

                    {/* Status and Priority */}
                    <PunchItemStatusBadge status={item.status} priority={item.priority} />

                    {/* Details */}
                    <div className="text-sm text-secondary space-y-1">
                      <div>
                        <span className="font-medium">Trade:</span> {item.trade}
                      </div>
                      {[item.building, item.floor, item.room].filter(Boolean).length > 0 && (
                        <div>
                          <span className="font-medium">Location:</span>{' '}
                          {[item.building, item.floor, item.room].filter(Boolean).join(' / ')}
                        </div>
                      )}
                      {item.due_date && (
                        <div>
                          <span className="font-medium">Due:</span>{' '}
                          {item.due_date ? format(new Date(item.due_date), 'MMM d, yyyy') : 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        {activeProjectId && (
          <CreatePunchItemDialog
            projectId={activeProjectId}
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
          />
        )}

        {/* Quick Punch Mode */}
        {activeProjectId && (
          <QuickPunchMode
            projectId={activeProjectId}
            open={quickPunchOpen}
            onOpenChange={setQuickPunchOpen}
          />
        )}

        {/* Edit Dialog */}
        {editingPunchItem && (
          <EditPunchItemDialog
            punchItem={editingPunchItem}
            open={editDialogOpen}
            onOpenChange={(open) => {
              setEditDialogOpen(open)
              if (!open) {
                setEditingPunchItem(null)
              }
            }}
          />
        )}

        {/* Floating scan button for mobile */}
        <FloatingScanButton />
      </div>
    </AppLayout>
  )
}
