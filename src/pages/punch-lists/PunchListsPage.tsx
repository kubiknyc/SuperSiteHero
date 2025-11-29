// File: /src/pages/punch-lists/PunchListsPage.tsx
// Main punch lists page with filters, search, and table view

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { usePunchItems } from '@/features/punch-lists/hooks/usePunchItems'
import { CreatePunchItemDialog } from '@/features/punch-lists/components/CreatePunchItemDialog'
import { EditPunchItemDialog } from '@/features/punch-lists/components/EditPunchItemDialog'
import { DeletePunchItemConfirmation } from '@/features/punch-lists/components/DeletePunchItemConfirmation'
import { PunchItemStatusBadge } from '@/features/punch-lists/components/PunchItemStatusBadge'
import { VirtualizedTable } from '@/components/ui/virtualized-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Plus, Edit, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import type { PunchItem } from '@/types/database'

export function PunchListsPage() {
  const navigate = useNavigate()
  const { data: projects } = useMyProjects()

  // Selected project
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const activeProjectId = selectedProjectId || projects?.find((p) => p.status === 'active')?.id || projects?.[0]?.id

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
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

  const handleRowClick = (punchItemId: string) => {
    navigate(`/punch-lists/${punchItemId}`)
  }

  const handleEdit = (e: React.MouseEvent, punchItem: PunchItem) => {
    e.stopPropagation()
    setEditingPunchItem(punchItem)
    setEditDialogOpen(true)
  }

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
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
            <h1 className="text-3xl font-bold text-gray-900">Punch Lists</h1>
            <p className="text-gray-600 mt-1">Track and manage punch list items</p>
          </div>
          {activeProjectId && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Punch Item
            </Button>
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
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="ml-2 text-gray-500">Loading punch items...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-red-600">Error loading punch items: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && (!filteredPunchItems || filteredPunchItems.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {punchItems && punchItems.length > 0 ? 'No matching punch items' : 'No punch items yet'}
              </h3>
              <p className="text-gray-600 mb-6">
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
                      <h3 className="font-semibold text-gray-900 flex-1">{item.title}</h3>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleEdit(e, item)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DeletePunchItemConfirmation punchItem={item} />
                      </div>
                    </div>

                    {/* Status and Priority */}
                    <PunchItemStatusBadge status={item.status} priority={item.priority} />

                    {/* Details */}
                    <div className="text-sm text-gray-600 space-y-1">
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
      </div>
    </AppLayout>
  )
}
