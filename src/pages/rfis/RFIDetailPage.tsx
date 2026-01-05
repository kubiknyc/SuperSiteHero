// File: /src/pages/rfis/RFIDetailPage.tsx
// RFI detail page with status management and answers

import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { useRFI, useRFIComments, useRFIWorkflowType } from '@/features/rfis/hooks/useRFIs'
import { useUpdateRFIWithNotification, useChangeRFIStatusWithNotification, useDeleteRFIWithNotification } from '@/features/rfis/hooks/useRFIMutations'
import { useEditConflictDetection } from '@/hooks/useEditConflictDetection'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { NativeSelect as Select } from '@/components/ui/select'
import { EditConflictBanner } from '@/components/realtime/EditConflictBanner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, AlertCircle, Trash2, Loader2, MessageSquare, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubmitForApprovalButton, ApprovalStatusBadge } from '@/features/approvals/components'
import { useEntityApprovalStatus } from '@/features/approvals/hooks'
import { useCreateConversation } from '@/features/messaging/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { logger } from '../../lib/utils/logger';
import { UserName } from '@/components/shared'
import type { WorkflowItem } from '@/types/database'


export function RFIDetailPage() {
  const { rfiId } = useParams<{ rfiId: string }>()
  const navigate = useNavigate()

  const [answerText, setAnswerText] = useState('')
  const [showAnswerForm, setShowAnswerForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const queryClient = useQueryClient()
  const { data: rfi, isLoading, error } = useRFI(rfiId)
  const { data: comments } = useRFIComments(rfiId)
  const { data: workflowType } = useRFIWorkflowType()
  const { data: approvalStatus } = useEntityApprovalStatus('rfi', rfiId)
  const updateStatus = useChangeRFIStatusWithNotification()
  const updateRFI = useUpdateRFIWithNotification()
  const deleteRFI = useDeleteRFIWithNotification()
  const createConversation = useCreateConversation()

  // Detect if another user updates this RFI while we're viewing/editing
  const {
    hasConflict,
    dismissConflict,
    acceptServerChanges,
    resolveWithLocalChanges,
  } = useEditConflictDetection<WorkflowItem>({
    table: 'workflow_items',
    recordId: rfiId,
    enabled: !!rfiId,
    onConflict: () => {
      logger.info('[RFIDetail] Conflict detected - another user updated this RFI')
    },
  })

  // Handle accepting server changes - refetch the RFI data
  const handleAcceptServerChanges = useCallback(() => {
    acceptServerChanges()
    // Invalidate the query to refetch latest data
    queryClient.invalidateQueries({ queryKey: ['rfi', rfiId] })
  }, [acceptServerChanges, queryClient, rfiId])

  // Start a messaging conversation about this RFI
  const handleDiscussRFI = async () => {
    if (!rfi) {return}

    // Get participants - creator and any assignees
    const participantIds: string[] = []
    if (rfi.created_by) {participantIds.push(rfi.created_by)}
    if (rfi.assignees?.length) {
      rfi.assignees.forEach((assignee: any) => {
        if (assignee.user_id && !participantIds.includes(assignee.user_id)) {
          participantIds.push(assignee.user_id)
        }
      })
    }

    const rfiNumber = `${workflowType?.prefix || 'RFI'}-${String(rfi.number).padStart(3, '0')}`

    try {
      const result = await createConversation.mutateAsync({
        type: 'group',
        participant_ids: participantIds,
        name: `${rfiNumber}: ${rfi.title}`,
        project_id: rfi.project_id,
      })

      if (result?.id) {
        navigate(`/messages/${result.id}`)
      }
    } catch (error) {
      logger.error('Failed to create conversation:', error)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!rfi) {return}
    await updateStatus.mutateAsync({
      rfiId: rfi.id,
      newStatus: newStatus,
    })
  }

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rfi || !answerText.trim()) {return}

    await updateRFI.mutateAsync({
      id: rfi.id,
      updates: {
        resolution: answerText.trim(),
      }
    })

    await updateStatus.mutateAsync({
      rfiId: rfi.id,
      newStatus: 'answered',
    })

    setAnswerText('')
    setShowAnswerForm(false)
  }

  const handleDelete = async () => {
    if (!rfi) {return}
    try {
      await deleteRFI.mutateAsync(rfi.id)
      navigate(-1)
    } finally {
      setShowDeleteDialog(false)
    }
  }

  if (!rfiId) {
    return (
      <SmartLayout title="RFI Details">
        <div className="p-6">
          <div className="text-center">
            <p className="text-error">RFI ID not found</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  if (isLoading) {
    return (
      <SmartLayout title="RFI Details">
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-disabled" />
            <p className="ml-2 text-muted">Loading RFI...</p>
          </div>
        </div>
      </SmartLayout>
    )
  }

  if (error || !rfi) {
    return (
      <SmartLayout title="RFI Details">
        <div className="p-6">
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">Error Loading RFI</h3>
              <p className="text-secondary">{error?.message || 'RFI not found'}</p>
            </CardContent>
          </Card>
        </div>
      </SmartLayout>
    )
  }

  const rfiNumber = `${workflowType?.prefix || 'RFI'}-${String(rfi.number).padStart(3, '0')}`

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

  return (
    <SmartLayout title="RFI Details">
      <div className="p-6 space-y-6">
        {/* Conflict detection banner */}
        {hasConflict && (
          <EditConflictBanner
            message="This RFI was updated by another user"
            onAcceptServer={handleAcceptServerChanges}
            onKeepLocal={resolveWithLocalChanges}
            onDismiss={dismissConflict}
          />
        )}

        {/* Back button */}
        <div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground heading-page">{rfiNumber}</h1>
                <p className="text-secondary mt-1">{rfi.title}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscussRFI}
                disabled={createConversation.isPending}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {createConversation.isPending ? 'Creating...' : 'Discuss'}
              </Button>
            </div>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>RFI Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rfi.description && (
                  <div>
                    <Label className="text-secondary">Description</Label>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{rfi.description}</p>
                  </div>
                )}

                {rfi.more_information && (
                  <div>
                    <Label className="text-secondary">Additional Information</Label>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{rfi.more_information}</p>
                  </div>
                )}

                {rfi.resolution && (
                  <div className="p-4 bg-success-light border border-green-200 rounded-lg">
                    <Label className="text-secondary font-semibold">Answer</Label>
                    <p className="mt-2 whitespace-pre-wrap text-foreground">{rfi.resolution}</p>
                    <p className="text-xs text-muted mt-2">Answered on {rfi.updated_at ? format(new Date(rfi.updated_at), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Answer Form */}
            {!rfi.resolution && (rfi.status === 'submitted' || rfi.status === 'draft') && (
              <Card>
                <CardHeader>
                  <CardTitle>Provide Answer</CardTitle>
                  <CardDescription>Respond to this RFI</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showAnswerForm ? (
                    <Button onClick={() => setShowAnswerForm(true)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Answer RFI
                    </Button>
                  ) : (
                    <form onSubmit={handleAnswerSubmit} className="space-y-3">
                      <Textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder="Type your answer here..."
                        rows={4}
                        required
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowAnswerForm(false)
                            setAnswerText('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={!answerText.trim() || updateRFI.isPending}>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Answer
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
                <CardDescription>{comments?.length || 0} comments</CardDescription>
              </CardHeader>
              <CardContent>
                {comments && comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment: any) => (
                      <div key={comment.id} className="border-b pb-4 last:border-0">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-sm text-foreground">
                            <UserName userId={comment.created_by} fallback="User" />
                          </span>
                          <span className="text-xs text-muted">
                            {comment.created_at ? format(new Date(comment.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-secondary">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted text-center py-4">No comments yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Current Status</Label>
                  <Select
                    id="status"
                    value={rfi.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updateStatus.isPending}
                    className="mt-2"
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="answered">Answered</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="closed">Closed</option>
                  </Select>
                </div>
                <Badge className={cn('w-full justify-center capitalize', getStatusColor(rfi.status))}>
                  {rfi.status}
                </Badge>

                {/* Approval Status */}
                {approvalStatus?.has_active_request && (
                  <div className="pt-2 border-t">
                    <Label className="text-secondary">Approval Status</Label>
                    <div className="mt-2">
                      <ApprovalStatusBadge
                        status={approvalStatus.status!}
                        conditions={approvalStatus.conditions}
                        showConditions
                      />
                    </div>
                  </div>
                )}

                {/* Submit for Approval */}
                {approvalStatus?.can_submit && (
                  <div className="pt-2">
                    <SubmitForApprovalButton
                      entityType="rfi"
                      entityId={rfi.id}
                      entityName={rfi.title}
                      projectId={rfi.project_id}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <Label className="text-secondary">Created</Label>
                  <p className="mt-1 text-foreground">
                    {rfi.created_at ? format(new Date(rfi.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </p>
                </div>

                {rfi.due_date && (
                  <div>
                    <Label className="text-secondary">Due Date</Label>
                    <p className="mt-1 text-foreground">
                      {rfi.due_date ? format(new Date(rfi.due_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                )}

                {rfi.assignees && rfi.assignees.length > 0 && (
                  <div>
                    <Label className="text-secondary">Assigned To</Label>
                    <p className="mt-1 text-foreground">{rfi.assignees.length} user(s)</p>
                  </div>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deleteRFI.isPending}
                  className="w-full mt-4"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete RFI
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete RFI</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this RFI? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteRFI.isPending ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SmartLayout>
  )
}
