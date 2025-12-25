// File: /src/features/workflows/components/WorkflowsProjectView.tsx
// Main view for displaying workflow items in a project

import { useState } from 'react'
import { useWorkflowItems, useDeleteWorkflowItem } from '../hooks/useWorkflowItems'
import { CreateWorkflowItemDialog } from './CreateWorkflowItemDialog'
import { EditWorkflowItemDialog } from './EditWorkflowItemDialog'
import { WorkflowItemStatusBadge } from './WorkflowItemStatusBadge'
import { VirtualizedTable } from '@/components/ui/virtualized-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { WorkflowItem } from '@/types/database'
import { format } from 'date-fns'
import { Trash2, Edit2, Plus } from 'lucide-react'

interface WorkflowsProjectViewProps {
  projectId: string
  workflowTypeId?: string
  workflowTypeName?: string
}

export function WorkflowsProjectView({
  projectId,
  workflowTypeId,
  workflowTypeName = 'Workflows',
}: WorkflowsProjectViewProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<WorkflowItem | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: items = [], isLoading, error } = useWorkflowItems(projectId, workflowTypeId)
  const deleteItem = useDeleteWorkflowItem()

  // Filter items based on search query
  const filteredItems = items.filter(
    (item) =>
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async (itemId: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteItem.mutate(itemId)
    }
  }

  const tableColumns = [
    {
      key: 'refNumber',
      header: 'Reference #',
      render: (item: WorkflowItem) => (
        <span className="font-medium text-sm">{item.reference_number || '-'}</span>
      ),
      className: 'w-28',
    },
    {
      key: 'title',
      header: 'Title',
      render: (item: WorkflowItem) => <span>{item.title}</span>,
    },
    {
      key: 'discipline',
      header: 'Discipline',
      render: (item: WorkflowItem) => (
        <span className="text-sm text-secondary">{item.discipline || '-'}</span>
      ),
      className: 'w-28',
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: WorkflowItem) => (
        <WorkflowItemStatusBadge
          status={item.status}
          priority={item.priority ?? undefined}
        />
      ),
      className: 'w-32',
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (item: WorkflowItem) => (
        <span className="text-sm">
          {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : '-'}
        </span>
      ),
      className: 'w-20',
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (item: WorkflowItem) => (
        <span className="text-sm">
          {item.due_date ? format(new Date(item.due_date), 'MMM dd, yyyy') : '-'}
        </span>
      ),
      className: 'w-28',
    },
    {
      key: 'costImpact',
      header: 'Cost Impact',
      render: (item: WorkflowItem) => (
        <span className="text-sm">
          {item.cost_impact ? `$${item.cost_impact.toLocaleString()}` : '-'}
        </span>
      ),
      className: 'w-24',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: WorkflowItem) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingItem(item)}
            disabled={deleteItem.isPending}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.id)}
            disabled={deleteItem.isPending}
            className="text-error hover:text-error-dark"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: 'w-20',
    },
  ]

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-error-light p-4 text-red-800">
        <h3 className="font-semibold heading-subsection">Error loading {workflowTypeName}</h3>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold heading-section">{workflowTypeName}</h2>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New {workflowTypeName}
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder={`Search ${workflowTypeName.toLowerCase()}...`}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      {isLoading ? (
        <div className="py-8 text-center text-muted">
          Loading {workflowTypeName.toLowerCase()}...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-8 text-center text-muted">
          No {workflowTypeName.toLowerCase()} found
        </div>
      ) : (
        <VirtualizedTable<WorkflowItem>
          data={filteredItems}
          columns={tableColumns}
          estimatedRowHeight={73}
          emptyMessage={`No ${workflowTypeName.toLowerCase()} available`}
        />
      )}

      {/* Dialogs */}
      {workflowTypeId && (
        <CreateWorkflowItemDialog
          projectId={projectId}
          workflowTypeId={workflowTypeId}
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      )}

      {editingItem && (
        <EditWorkflowItemDialog
          workflowItem={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => {
            if (!open) {setEditingItem(null)}
          }}
        />
      )}
    </div>
  )
}
