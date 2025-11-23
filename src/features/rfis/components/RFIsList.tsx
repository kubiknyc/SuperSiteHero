// File: /src/features/rfis/components/RFIsList.tsx
// RFIs list with filtering and actions

import { useState } from 'react'
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

export function RFIsList({ projectId }: RFIsListProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const { data: workflowType } = useRFIWorkflowType()
  const { data: rfis, isLoading, error } = useRFIs(projectId, workflowType?.id)
  const deleteRFI = useDeleteRFIWithNotification()

  // Filter RFIs
  const filtered = (rfis || []).filter((rfi) => {
    const matchesSearch =
      rfi.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfi.description?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = filterStatus ? rfi.status === filterStatus : true

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      answered: 'bg-green-100 text-green-800',
      approved: 'bg-green-600 text-white',
      rejected: 'bg-red-100 text-red-800',
      closed: 'bg-gray-300 text-gray-900',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleDelete = async (rfiId: string) => {
    if (window.confirm('Are you sure you want to delete this RFI?')) {
      await deleteRFI.mutateAsync(rfiId)
    }
  }

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No project selected</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading RFIs...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-600">Failed to load RFIs</p>
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
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
              <p className="text-gray-500">No RFIs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">RFI #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Raised By</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rfi: WorkflowItem) => (
                    <tr key={rfi.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {workflowType?.prefix || 'RFI'}-{String(rfi.number).padStart(3, '0')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex-1 min-w-0">
                          <a
                            href={`/rfis/${rfi.id}`}
                            className="font-medium text-blue-600 hover:underline truncate"
                          >
                            {rfi.title}
                          </a>
                          {rfi.description && (
                            <p className="text-xs text-gray-600 truncate mt-1">{rfi.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={cn('capitalize', getStatusColor(rfi.status))}>
                          {rfi.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {rfi.raised_by ? rfi.raised_by.substring(0, 8) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {rfi.created_at ? format(new Date(rfi.created_at), 'MMM d, yyyy') : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(rfi.id)}
                            disabled={deleteRFI.isPending}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
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
      <CreateRFIDialog
        projectId={projectId}
        workflowTypeId={workflowType?.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  )
}
