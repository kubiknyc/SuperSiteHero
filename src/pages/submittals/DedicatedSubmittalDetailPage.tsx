// @ts-nocheck
// File: /src/pages/submittals/DedicatedSubmittalDetailPage.tsx
// Dedicated Submittal detail page with CSI spec sections and ball-in-court tracking

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  AlertCircle,
  Trash2,
  Loader2,
  MessageSquare,
  FileText,
  Clock,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Paperclip,
  Send,
  FileDown,
} from 'lucide-react'
import {
  useSubmittal,
  useUpdateSubmittal,
  useDeleteSubmittal,
  useAddSubmittalReview,
  useSubmitForReview,
  useSubmittalReviews,
  useSubmittalAttachments,
  useSubmittalHistory,
  REVIEW_STATUSES,
  SUBMITTAL_TYPES,
  BALL_IN_COURT_ENTITIES,
} from '@/features/submittals/hooks/useDedicatedSubmittals'
import { downloadSubmittalPDF } from '@/features/submittals/utils/pdfExport'
import { useCreateConversation } from '@/features/messaging/hooks'
import type { SubmittalReviewStatus, BallInCourtEntity } from '@/types/database'

// Helper function for review status colors
function getReviewStatusStyle(status: string): { bg: string; text: string } {
  switch (status) {
    case 'approved':
      return { bg: 'bg-green-100', text: 'text-green-800' }
    case 'approved_as_noted':
      return { bg: 'bg-lime-100', text: 'text-lime-800' }
    case 'submitted':
      return { bg: 'bg-blue-100', text: 'text-blue-800' }
    case 'under_review':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' }
    case 'revise_resubmit':
      return { bg: 'bg-orange-100', text: 'text-orange-800' }
    case 'rejected':
      return { bg: 'bg-red-100', text: 'text-red-800' }
    case 'void':
      return { bg: 'bg-gray-100', text: 'text-gray-600' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' }
  }
}

// Review status badge component
function ReviewStatusBadge({ status }: { status: string }) {
  const statusInfo = REVIEW_STATUSES.find((s) => s.value === status)
  const style = getReviewStatusStyle(status)

  return (
    <Badge className={`${style.bg} ${style.text}`}>
      {statusInfo?.label || status}
    </Badge>
  )
}

export function DedicatedSubmittalDetailPage() {
  const { submittalId } = useParams<{ submittalId: string }>()
  const navigate = useNavigate()

  const [reviewComment, setReviewComment] = useState('')
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<SubmittalReviewStatus | ''>('')

  // Queries
  const { data: submittal, isLoading, error } = useSubmittal(submittalId)
  const { data: reviews } = useSubmittalReviews(submittalId)
  const { data: attachments } = useSubmittalAttachments(submittalId)
  const { data: history } = useSubmittalHistory(submittalId)

  // Mutations
  const updateSubmittal = useUpdateSubmittal()
  const deleteSubmittal = useDeleteSubmittal()
  const addReview = useAddSubmittalReview()
  const submitForReview = useSubmitForReview()
  const createConversation = useCreateConversation()

  // Calculate days open
  const daysOpen = submittal?.created_at
    ? differenceInDays(new Date(), new Date(submittal.created_at))
    : 0

  // Calculate if overdue
  const isOverdue =
    submittal?.date_required &&
    new Date(submittal.date_required) < new Date() &&
    !['approved', 'approved_as_noted'].includes(submittal.review_status)

  // Start a messaging conversation about this submittal
  const handleDiscuss = async () => {
    if (!submittal) return

    try {
      const result = await createConversation.mutateAsync({
        type: 'group',
        participant_ids: submittal.created_by ? [submittal.created_by] : [],
        name: `${submittal.submittal_number}: ${submittal.title}`,
        project_id: submittal.project_id,
      })

      if (result?.id) {
        navigate(`/messages/${result.id}`)
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  // Update ball-in-court
  const handleBallInCourtChange = async (entity: BallInCourtEntity) => {
    if (!submittal) return
    await updateSubmittal.mutateAsync({
      id: submittal.id,
      ball_in_court_entity: entity,
    })
  }

  // Submit for review
  const handleSubmitForReview = async () => {
    if (!submittal) return
    await submitForReview.mutateAsync(submittal.id)
  }

  // Add a review
  const handleAddReview = async () => {
    if (!submittal || !selectedReviewStatus) return

    await addReview.mutateAsync({
      submittalId: submittal.id,
      reviewStatus: selectedReviewStatus,
      comments: reviewComment || undefined,
    })

    setSelectedReviewStatus('')
    setReviewComment('')
  }

  // Delete submittal
  const handleDelete = async () => {
    if (!submittal || !window.confirm('Are you sure you want to delete this submittal?')) return
    await deleteSubmittal.mutateAsync(submittal.id)
    navigate(-1)
  }

  // Loading state
  if (!submittalId) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-red-600">Submittal ID not found</p>
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
            <p className="ml-2 text-gray-500">Loading submittal...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !submittal) {
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Submittal</h3>
              <p className="text-gray-600">{(error as Error)?.message || 'Submittal not found'}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  const typeInfo = SUBMITTAL_TYPES.find((t) => t.value === submittal.submittal_type)

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
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">{submittal.submittal_number}</h1>
                  {submittal.revision_number > 0 && (
                    <Badge variant="outline">Rev {submittal.revision_number}</Badge>
                  )}
                </div>
                <p className="text-gray-600 mt-1">{submittal.title}</p>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-mono">{submittal.spec_section}</span>
                  {submittal.spec_section_title && ` - ${submittal.spec_section_title}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadSubmittalPDF({ submittal, includeItems: true, includeReviews: true, includeAttachments: true })}
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDiscuss}
                  disabled={createConversation.isPending}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {createConversation.isPending ? 'Creating...' : 'Discuss'}
                </Button>
              </div>
            </div>

            {/* Overdue Warning */}
            {isOverdue && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Submittal Overdue</p>
                  <p className="text-sm text-red-600">
                    Required by {format(new Date(submittal.date_required!), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Submittal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submittal.description && (
                  <div>
                    <Label className="text-gray-600">Description</Label>
                    <p className="mt-1 whitespace-pre-wrap text-gray-900">{submittal.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 py-4 border-t">
                  <div>
                    <Label className="text-gray-600">Submittal Type</Label>
                    <p className="mt-1 text-gray-900">{typeInfo?.label || submittal.submittal_type}</p>
                    {typeInfo?.description && (
                      <p className="text-xs text-gray-500 mt-1">{typeInfo.description}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-gray-600">Lead Time</Label>
                    <p className="mt-1 text-gray-900">
                      {submittal.lead_time_days ? `${submittal.lead_time_days} days` : 'Not specified'}
                    </p>
                  </div>

                  {submittal.drawing_reference && (
                    <div>
                      <Label className="text-gray-600">Drawing Reference</Label>
                      <p className="mt-1 text-gray-900">{submittal.drawing_reference}</p>
                    </div>
                  )}
                </div>

                {submittal.review_comments && (
                  <div className="pt-4 border-t">
                    <Label className="text-gray-600">Latest Review Comments</Label>
                    <p className="mt-1 whitespace-pre-wrap text-gray-900 bg-gray-50 p-3 rounded">
                      {submittal.review_comments}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Review History
                </CardTitle>
                <CardDescription>{reviews?.length || 0} reviews</CardDescription>
              </CardHeader>
              <CardContent>
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <ReviewStatusBadge status={review.review_status} />
                            <span className="text-sm text-gray-500">
                              by {review.reviewer_name || 'Unknown'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {review.reviewed_at
                              ? format(new Date(review.reviewed_at), 'MMM d, yyyy h:mm a')
                              : 'N/A'}
                          </span>
                        </div>
                        {review.comments && (
                          <p className="text-sm whitespace-pre-wrap text-gray-700 mt-2">
                            {review.comments}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No reviews yet</p>
                )}

                {/* Add Review Form */}
                {submittal.review_status !== 'not_submitted' && (
                  <div className="mt-6 pt-4 border-t space-y-4">
                    <h4 className="font-medium text-gray-900">Add Review</h4>
                    <div>
                      <Label htmlFor="reviewStatus">Review Decision</Label>
                      <select
                        id="reviewStatus"
                        className="w-full mt-2 border rounded-md px-3 py-2"
                        value={selectedReviewStatus}
                        onChange={(e) => setSelectedReviewStatus(e.target.value as SubmittalReviewStatus)}
                      >
                        <option value="">Select decision...</option>
                        <option value="approved">Approved</option>
                        <option value="approved_as_noted">Approved as Noted</option>
                        <option value="revise_resubmit">Revise and Resubmit</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="reviewComment">Comments</Label>
                      <Textarea
                        id="reviewComment"
                        placeholder="Enter review comments..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={3}
                        className="mt-2"
                      />
                    </div>
                    <Button
                      onClick={handleAddReview}
                      disabled={!selectedReviewStatus || addReview.isPending}
                    >
                      {addReview.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Review
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments
                </CardTitle>
                <CardDescription>{attachments?.length || 0} files</CardDescription>
              </CardHeader>
              <CardContent>
                {attachments && attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-sm">{attachment.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {attachment.file_type} • {attachment.uploaded_at && format(new Date(attachment.uploaded_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No attachments</p>
                )}
              </CardContent>
            </Card>

            {/* Change History */}
            {history && history.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Change History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {history.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />
                        <div>
                          <p className="text-gray-700">
                            <span className="font-medium">{entry.field_name}</span> changed
                            {entry.old_value && ` from "${entry.old_value}"`}
                            {entry.new_value && ` to "${entry.new_value}"`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {entry.changed_at && format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
                  <Label className="text-gray-600">Review Status</Label>
                  <div className="mt-2">
                    <ReviewStatusBadge status={submittal.review_status} />
                  </div>
                </div>

                {submittal.review_status === 'not_submitted' && (
                  <Button
                    onClick={handleSubmitForReview}
                    disabled={submitForReview.isPending}
                    className="w-full"
                  >
                    {submitForReview.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit for Review
                      </>
                    )}
                  </Button>
                )}

                <div className="pt-2 border-t">
                  <Label htmlFor="ballInCourt" className="text-gray-600">Ball-in-Court</Label>
                  <select
                    id="ballInCourt"
                    className="w-full mt-2 border rounded-md px-3 py-2 text-sm"
                    value={submittal.ball_in_court_entity || ''}
                    onChange={(e) => handleBallInCourtChange(e.target.value as BallInCourtEntity)}
                    disabled={updateSubmittal.isPending}
                  >
                    <option value="">Not assigned</option>
                    {BALL_IN_COURT_ENTITIES.map((entity) => (
                      <option key={entity.value} value={entity.value}>
                        {entity.label}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <Label className="text-gray-600">Created</Label>
                    <p className="text-gray-900">
                      {submittal.created_at
                        ? format(new Date(submittal.created_at), 'MMM d, yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {submittal.date_required && (
                  <div className="flex items-start gap-3">
                    <Clock className={`h-4 w-4 mt-0.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                    <div>
                      <Label className="text-gray-600">Required Date</Label>
                      <p className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                        {format(new Date(submittal.date_required), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {submittal.date_submitted && (
                  <div className="flex items-start gap-3">
                    <Send className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-gray-600">Submitted</Label>
                      <p className="text-gray-900">
                        {format(new Date(submittal.date_submitted), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {submittal.date_returned && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <Label className="text-gray-600">Returned</Label>
                      <p className="text-gray-900">
                        {format(new Date(submittal.date_returned), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <Label className="text-gray-600">Days Open</Label>
                    <p className="text-gray-900">{daysOpen} days</p>
                  </div>
                </div>

                {submittal.subcontractor && (
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <Building2 className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-gray-600">Subcontractor</Label>
                      <p className="text-gray-900">
                        {submittal.subcontractor.company_name || submittal.subcontractor.name}
                      </p>
                    </div>
                  </div>
                )}

                {submittal.project && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <Label className="text-gray-600">Project</Label>
                      <p className="text-gray-900">{submittal.project.name}</p>
                    </div>
                  </div>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteSubmittal.isPending}
                  className="w-full mt-4"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Submittal
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default DedicatedSubmittalDetailPage
