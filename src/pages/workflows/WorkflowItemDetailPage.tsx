// File: /src/pages/workflows/WorkflowItemDetailPage.tsx
// Detail page for viewing and editing a single workflow item

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useWorkflowItem, useDeleteWorkflowItem, useUpdateWorkflowItemStatus } from '@/features/workflows/hooks/useWorkflowItems'
import { EditWorkflowItemDialog } from '@/features/workflows/components/EditWorkflowItemDialog'
import { WorkflowItemStatusBadge } from '@/features/workflows/components/WorkflowItemStatusBadge'
import { WorkflowItemCommentsPanel } from '@/features/workflows/components/WorkflowItemCommentsPanel'
import { WorkflowItemHistoryPanel } from '@/features/workflows/components/WorkflowItemHistoryPanel'
import { WorkflowItemAssigneesPanel } from '@/features/workflows/components/WorkflowItemAssigneesPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, Trash2, Edit2 } from 'lucide-react'
import { format } from 'date-fns'

export function WorkflowItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const { data: item, isLoading, error } = useWorkflowItem(id)
  const deleteItem = useDeleteWorkflowItem()
  const updateStatus = useUpdateWorkflowItemStatus()

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this workflow item?')) {
      deleteItem.mutate(id || '', {
        onSuccess: () => {
          navigate(-1)
        },
      })
    }
  }

  const handleStatusChange = (newStatus: string) => {
    if (id) {
      updateStatus.mutate({ workflowItemId: id, status: newStatus })
    }
  }

  if (!id) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-error-light">
            <CardContent className="pt-6">
              <p className="text-red-800">Invalid workflow item ID</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-disabled" />
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !item) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card className="border-red-200 bg-error-light">
            <CardContent className="pt-6">
              <p className="text-red-800">
                {error instanceof Error ? error.message : 'Failed to load workflow item'}
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold heading-page">{item.title}</h1>
            {item.reference_number && (
              <p className="text-secondary">Ref: {item.reference_number}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(true)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteItem.isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Status, Details, and Assignees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-secondary mb-2">Current Status</p>
                <WorkflowItemStatusBadge
                  status={item.status}
                  priority={item.priority ?? undefined}
                />
              </div>

              <div>
                <label className="text-sm text-secondary">Change Status</label>
                <select
                  value={item.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updateStatus.isPending}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Key Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.discipline && (
                <div>
                  <p className="text-sm text-secondary">Discipline</p>
                  <p className="font-medium">{item.discipline}</p>
                </div>
              )}
              {item.due_date && (
                <div>
                  <p className="text-sm text-secondary">Due Date</p>
                  <p className="font-medium">{format(new Date(item.due_date), 'MMMM dd, yyyy')}</p>
                </div>
              )}
              {item.priority && (
                <div>
                  <p className="text-sm text-secondary">Priority</p>
                  <p className="font-medium capitalize">{item.priority}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignees Panel */}
          {item.project_id && (
            <WorkflowItemAssigneesPanel
              workflowItemId={id}
              projectId={item.project_id}
            />
          )}
        </div>

        {/* Description Card */}
        {item.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-secondary">{item.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Impact Analysis Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Impact Analysis</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {item.cost_impact !== null && (
              <div>
                <p className="text-sm text-secondary mb-1">Cost Impact</p>
                <p className="text-2xl font-bold text-error">
                  ${item.cost_impact.toLocaleString()}
                </p>
              </div>
            )}
            {item.schedule_impact !== null && (
              <div>
                <p className="text-sm text-secondary mb-1">Schedule Impact</p>
                <p className="text-2xl font-bold text-orange-600">
                  {item.schedule_impact} {item.schedule_impact === 1 ? 'day' : 'days'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolution Card */}
        {item.resolution && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-secondary">{item.resolution}</p>
            </CardContent>
          </Card>
        )}

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {item.created_at && (
              <div>
                <p className="text-secondary">Created</p>
                <p className="font-medium">{format(new Date(item.created_at), 'MMM dd, yyyy')}</p>
              </div>
            )}
            {item.updated_at && (
              <div>
                <p className="text-secondary">Updated</p>
                <p className="font-medium">{format(new Date(item.updated_at), 'MMM dd, yyyy')}</p>
              </div>
            )}
            {item.closed_date && (
              <div>
                <p className="text-secondary">Closed</p>
                <p className="font-medium">{format(new Date(item.closed_date), 'MMM dd, yyyy')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments Panel */}
        <WorkflowItemCommentsPanel workflowItemId={id} />

        {/* Activity History Panel */}
        <WorkflowItemHistoryPanel workflowItemId={id} />

        {/* Edit Dialog */}
        {editDialogOpen && (
          <EditWorkflowItemDialog
            workflowItem={item}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        )}
      </div>
    </AppLayout>
  )
}
