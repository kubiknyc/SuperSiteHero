// File: /src/features/workflows/components/WorkflowsProjectView.tsx
// Main view for displaying workflow items in a project

import { useState } from 'react'
import { useWorkflowItems, useDeleteWorkflowItem } from '../hooks/useWorkflowItems'
import { CreateWorkflowItemDialog } from './CreateWorkflowItemDialog'
import { EditWorkflowItemDialog } from './EditWorkflowItemDialog'
import { WorkflowItemStatusBadge } from './WorkflowItemStatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        <h3 className="font-semibold">Error loading {workflowTypeName}</h3>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{workflowTypeName}</h2>
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
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Discipline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Cost Impact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                  Loading {workflowTypeName.toLowerCase()}...
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                  No {workflowTypeName.toLowerCase()} found
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm">
                    {item.reference_number || '-'}
                  </TableCell>
                  <TableCell>{item.title}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {item.discipline || '-'}
                  </TableCell>
                  <TableCell>
                    <WorkflowItemStatusBadge
                      status={item.status}
                      priority={item.priority ?? undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {item.priority ? item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.due_date ? format(new Date(item.due_date), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.cost_impact ? `$${item.cost_impact.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
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
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
            if (!open) setEditingItem(null)
          }}
        />
      )}
    </div>
  )
}
