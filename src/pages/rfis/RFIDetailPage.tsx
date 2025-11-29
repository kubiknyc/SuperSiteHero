// File: /src/pages/rfis/RFIDetailPage.tsx
// RFI detail page with status management and answers

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { useRFI, useRFIComments, useRFIWorkflowType } from '@/features/rfis/hooks/useRFIs'
import { useUpdateRFIWithNotification, useChangeRFIStatusWithNotification, useDeleteRFIWithNotification } from '@/features/rfis/hooks/useRFIMutations'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { ArrowLeft, AlertCircle, Trash2, Loader2, MessageSquare, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubmitForApprovalButton, ApprovalStatusBadge } from '@/features/approvals/components'
import { useEntityApprovalStatus } from '@/features/approvals/hooks'

export function RFIDetailPage() {
  const { rfiId } = useParams<{ rfiId: string }>()
  const navigate = useNavigate()

  const [answerText, setAnswerText] = useState('')
  const [showAnswerForm, setShowAnswerForm] = useState(false)

  const { data: rfi, isLoading, error } = useRFI(rfiId)
  const { data: comments } = useRFIComments(rfiId)
  const { data: workflowType } = useRFIWorkflowType()
  const { data: approvalStatus } = useEntityApprovalStatus('rfi', rfiId)
  const updateStatus = useChangeRFIStatusWithNotification()
  const updateRFI = useUpdateRFIWithNotification()
  const deleteRFI = useDeleteRFIWithNotification()

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
    if (!rfi || !window.confirm('Are you sure you want to delete this RFI?')) {return}
    await deleteRFI.mutateAsync(rfi.id)
    navigate(-1)
  }

  if (!rfiId) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-red-600">RFI ID not found</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="ml-2 text-gray-500">Loading RFI...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !rfi) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading RFI</h3>
              <p className="text-gray-600">{error?.message || 'RFI not found'}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  const rfiNumber = `${workflowType?.prefix || 'RFI'}-${String(rfi.number).padStart(3, '0')}`

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

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{rfiNumber}</h1>
              <p className="text-gray-600 mt-1">{rfi.title}</p>
            </div>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>RFI Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rfi.description && (
                  <div>
                    <Label className="text-gray-600">Description</Label>
                    <p className="mt-1 whitespace-pre-wrap text-gray-900">{rfi.description}</p>
                  </div>
                )}

                {rfi.more_information && (
                  <div>
                    <Label className="text-gray-600">Additional Information</Label>
                    <p className="mt-1 whitespace-pre-wrap text-gray-900">{rfi.more_information}</p>
                  </div>
                )}

                {rfi.resolution && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <Label className="text-gray-600 font-semibold">Answer</Label>
                    <p className="mt-2 whitespace-pre-wrap text-gray-900">{rfi.resolution}</p>
                    <p className="text-xs text-gray-500 mt-2">Answered on {rfi.updated_at ? format(new Date(rfi.updated_at), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
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
                          <span className="font-semibold text-sm text-gray-900">
                            {comment.created_by?.substring(0, 8) || 'User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {comment.created_at ? format(new Date(comment.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-gray-700">{comment.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
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
                    <Label className="text-gray-600">Approval Status</Label>
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
                  <Label className="text-gray-600">Created</Label>
                  <p className="mt-1 text-gray-900">
                    {rfi.created_at ? format(new Date(rfi.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </p>
                </div>

                {rfi.due_date && (
                  <div>
                    <Label className="text-gray-600">Due Date</Label>
                    <p className="mt-1 text-gray-900">
                      {rfi.due_date ? format(new Date(rfi.due_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                )}

                {rfi.assignees && rfi.assignees.length > 0 && (
                  <div>
                    <Label className="text-gray-600">Assigned To</Label>
                    <p className="mt-1 text-gray-900">{rfi.assignees.length} user(s)</p>
                  </div>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
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
      </div>
    </AppLayout>
  )
}
