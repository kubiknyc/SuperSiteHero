// File: /src/features/rfis/components/RFIsList.tsx
// RFIs list with filtering and actions

import { useState, useCallback, useMemo, memo } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useRFIs, useRFIWorkflowType } from '../hooks/useRFIs'
import { useDeleteRFIWithNotification } from '../hooks/useRFIMutations'
import { CreateRFIDialog } from './CreateRFIDialog'
import { Plus, AlertCircle, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowItem } from '@/types/database'

interface RFIsListProps {
  projectId: string | undefined
}

// Memoized row component to prevent re-renders when other rows change
interface RFIRowProps {
  rfi: WorkflowItem
  workflowTypePrefix: string
  getStatusColor: (status: string) => string
  onDelete: (id: string) => void
  isDeleting: boolean
}

const RFIRow = memo(function RFIRow({ rfi, workflowTypePrefix, getStatusColor, onDelete, isDeleting }: RFIRowProps) {
  return (
    <tr className="border-b hover:bg-surface">
      <td className="py-3 px-4 font-medium text-foreground">
        {workflowTypePrefix}-{String(rfi.number).padStart(3, '0')}
      </td>
      <td className="py-3 px-4">
        <div className="flex-1 min-w-0">
          <a
            href={`/rfis/${rfi.id}`}
            className="font-medium text-primary hover:underline truncate"
          >
            {rfi.title}
          </a>
          {rfi.description && (
            <p className="text-xs text-secondary truncate mt-1">{rfi.description}</p>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge className={cn('capitalize', getStatusColor(rfi.status))}>
          {rfi.status}
        </Badge>
      </td>
      <td className="py-3 px-4 text-secondary text-sm">
        {rfi.raised_by ? rfi.raised_by.substring(0, 8) : '-'}
      </td>
      <td className="py-3 px-4 text-secondary text-sm">
        {rfi.created_at ? format(new Date(rfi.created_at), 'MMM d, yyyy') : 'N/A'}
      </td>
      <td className="py-3 px-4">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(rfi.id)}
            disabled={isDeleting}
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-error" />
          </Button>
        </div>
      </td>
    </tr>
  )
})

export function RFIsList({ projectId }: RFIsListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { data: workflowType } = useRFIWorkflowType()
  const { data: rfis, isLoading, error } = useRFIs(projectId, workflowType?.id)
  const deleteRFI = useDeleteRFIWithNotification()

  // Filter RFIs - memoized to prevent recalculation on every render
  const filtered = useMemo(() => (rfis || []).filter((rfi) => {
    const matchesSearch =
      rfi.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfi.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus ? rfi.status === filterStatus : true

    return matchesSearch && matchesStatus
  }), [rfis, searchTerm, filterStatus])

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-foreground',
      submitted: 'bg-info-light text-blue-800',
      answered: 'bg-success-light text-green-800',
      approved: 'bg-success text-white',
      rejected: 'bg-error-light text-red-800',
      closed: 'bg-gray-300 text-foreground',
    }
    return colors[status] || 'bg-muted text-foreground'
  }

  const handleDelete = useCallback(async (rfiId: string) => {
    if (window.confirm('Are you sure you want to delete this RFI?')) {
      await deleteRFI.mutateAsync(rfiId)
    }
  }, [deleteRFI])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }, [])

  const handleStatusFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value)
  }, [])

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-disabled mx-auto mb-4" />
          <p className="text-secondary">No project selected</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 text-disabled mx-auto mb-4 animate-spin" />
          <p className="text-secondary">Loading RFIs...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-error">Failed to load RFIs</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Requests for Information</CardTitle>
            <CardDescription>
              {filtered.length} RFI{filtered.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New RFI
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search RFIs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="flex-1"
            />
            <Select value={filterStatus} onChange={handleStatusFilterChange}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="answered">Answered</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </Select>
          </div>

          {/* RFIs Table */}
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted">No RFIs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-secondary">RFI #</th>
                    <th className="text-left py-3 px-4 font-medium text-secondary">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-secondary">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-secondary">Raised By</th>
                    <th className="text-left py-3 px-4 font-medium text-secondary">Created</th>
                    <th className="text-right py-3 px-4 font-medium text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rfi: WorkflowItem) => (
                    <RFIRow
                      key={rfi.id}
                      rfi={rfi}
                      workflowTypePrefix={workflowType?.prefix || 'RFI'}
                      getStatusColor={getStatusColor}
                      onDelete={handleDelete}
                      isDeleting={deleteRFI.isPending}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateRFIDialog
        projectId={projectId}
        workflowTypeId={workflowType?.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  )
}
