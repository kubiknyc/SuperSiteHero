// File: /src/pages/rfis/DedicatedRFIDetailPage.tsx
// Dedicated RFI detail page with tabbed interface, workflow indicator, and ball-in-court tracking

import { useState, useMemo } from 'react'
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
import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
  AlertTriangle,
  History,
  Paperclip,
  Send,
  DollarSign,
  CalendarClock,
  Link,
  Image,
  Users,
  Search,
  Check,
  UserPlus,
  Pencil,
  FileDown,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  WorkflowProgressIndicator,
  RFI_WORKFLOW_STEPS,
  RFI_STATUS_STEP_MAP,
  getStepFromStatus,
} from '@/components/shared'
import { RFIResponseForm } from '@/features/rfis/components/RFIResponseForm'
import { RFIAttachmentUploader } from '@/features/rfis/components/RFIAttachmentUploader'
import { useProjectUsers } from '@/features/messaging/hooks/useProjectUsers'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  useRFI,
  useUpdateRFI,
  useDeleteRFI,
  useRespondToRFI,
  useCloseRFI,
  useUpdateBallInCourt,
  useRFIComments,
  useRFIAttachments,
  useRFIHistory,
  useAddRFIComment,
  RFI_STATUSES,
  RFI_PRIORITIES,
  BALL_IN_COURT_ROLES,
  formatRFINumber,
} from '@/features/rfis/hooks/useDedicatedRFIs'
import { downloadRFIPDF } from '@/features/rfis/utils/pdfExport'
import { useCreateConversation } from '@/features/messaging/hooks'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { RFIStatus, BallInCourtRole } from '@/types/database-extensions'
import { logger } from '../../lib/utils/logger';


// Hook to fetch distribution list users
function useDistributionListUsers(userIds: string[] | undefined) {
  return useQuery({
    queryKey: ['users', 'distribution-list', userIds],
    queryFn: async () => {
      if (!userIds?.length) {return []}

      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', userIds)

      if (error) {throw error}
      return data || []
    },
    enabled: !!userIds?.length,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Status badge component
function RFIStatusBadge({ status }: { status: string }) {
  const statusInfo = RFI_STATUSES.find((s) => s.value === status)
  return (
    <Badge className={statusInfo?.color || 'bg-muted text-foreground'}>
      {statusInfo?.label || status}
    </Badge>
  )
}

// Priority badge component
function PriorityBadge({ priority }: { priority: string }) {
  const priorityInfo = RFI_PRIORITIES.find((p) => p.value === priority)
  return (
    <Badge className={priorityInfo?.color || 'bg-muted text-foreground'}>
      {priorityInfo?.label || priority}
    </Badge>
  )
}

export function DedicatedRFIDetailPage() {
  const { rfiId } = useParams<{ rfiId: string }>()
  const navigate = useNavigate()

  const { userProfile } = useAuth()

  // Tab state
  const [activeTab, setActiveTab] = useState('details')

  const [responseText, setResponseText] = useState('')
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [commentText, setCommentText] = useState('')

  // Distribution list editing state
  const [isEditingDistribution, setIsEditingDistribution] = useState(false)
  const [selectedDistributionIds, setSelectedDistributionIds] = useState<string[]>([])
  const [distributionFilter, setDistributionFilter] = useState('')

  // Delete confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Queries
  const { data: rfi, isLoading, error } = useRFI(rfiId)
  const { data: comments } = useRFIComments(rfiId)
  const { data: attachments } = useRFIAttachments(rfiId)
  const { data: history } = useRFIHistory(rfiId)
  const { data: distributionUsers = [] } = useDistributionListUsers(rfi?.distribution_list)

  // Fetch project users for editing distribution list
  const { data: projectUsers = [] } = useProjectUsers(rfi?.project_id)

  // Filter out current user and apply search filter for distribution list editing
  const availableDistributionUsers = useMemo(() => {
    return projectUsers.filter(pu => pu.user?.id !== userProfile?.id)
  }, [projectUsers, userProfile?.id])

  const filteredDistributionUsers = useMemo(() => {
    if (!distributionFilter.trim()) {return availableDistributionUsers}
    const search = distributionFilter.toLowerCase()
    return availableDistributionUsers.filter((pu) => {
      const user = pu.user
      if (!user) {return false}
      const name = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase()
      return name.includes(search) || user.email.toLowerCase().includes(search)
    })
  }, [availableDistributionUsers, distributionFilter])

  // Mutations
  const updateRFI = useUpdateRFI()
  const deleteRFI = useDeleteRFI()
  const respondToRFI = useRespondToRFI()
  const closeRFI = useCloseRFI()
  const updateBallInCourt = useUpdateBallInCourt()
  const addComment = useAddRFIComment()
  const createConversation = useCreateConversation()

  // Calculate days open
  const daysOpen = rfi?.created_at
    ? differenceInDays(new Date(), new Date(rfi.created_at))
    : 0

  // Calculate if overdue
  const isOverdue =
    rfi?.date_required &&
    new Date(rfi.date_required) < new Date() &&
    !['closed', 'void', 'responded'].includes(rfi.status)

  // Start a messaging conversation about this RFI
  const handleDiscuss = async () => {
    if (!rfi) {return}

    try {
      const result = await createConversation.mutateAsync({
        type: 'group',
        participant_ids: rfi.submitted_by ? [rfi.submitted_by] : [],
        name: `${formatRFINumber(rfi.rfi_number)}: ${rfi.subject}`,
        project_id: rfi.project_id,
      })

      if (result?.id) {
        navigate(`/messages/${result.id}`)
      }
    } catch (error) {
      logger.error('Failed to create conversation:', error)
    }
  }

  // Update status
  const handleStatusChange = async (newStatus: RFIStatus) => {
    if (!rfi) {return}
    await updateRFI.mutateAsync({
      id: rfi.id,
      status: newStatus,
    })
  }

  // Update ball-in-court
  const handleBallInCourtChange = async (role: BallInCourtRole) => {
    if (!rfi) {return}
    await updateBallInCourt.mutateAsync({
      rfiId: rfi.id,
      userId: null,
      role,
    })
  }

  // Submit response
  const _handleSubmitResponse = async () => {
    if (!rfi || !responseText.trim()) {return}

    await respondToRFI.mutateAsync({
      rfiId: rfi.id,
      response: responseText.trim(),
    })

    setResponseText('')
    setShowResponseForm(false)
  }

  // Close RFI
  const handleClose = async () => {
    if (!rfi) {return}
    await closeRFI.mutateAsync(rfi.id)
  }

  // Add comment
  const handleAddComment = async () => {
    if (!rfi || !commentText.trim()) {return}

    await addComment.mutateAsync({
      rfiId: rfi.id,
      comment: commentText.trim(),
    })

    setCommentText('')
  }

  // Delete RFI
  const handleDelete = async () => {
    if (!rfi) {return}
    try {
      await deleteRFI.mutateAsync(rfi.id)
      navigate(-1)
    } finally {
      setShowDeleteDialog(false)
    }
  }

  // Distribution list editing handlers
  const handleStartEditDistribution = () => {
    setSelectedDistributionIds(rfi?.distribution_list || [])
    setIsEditingDistribution(true)
    setDistributionFilter('')
  }

  const handleCancelEditDistribution = () => {
    setIsEditingDistribution(false)
    setSelectedDistributionIds([])
    setDistributionFilter('')
  }

  const toggleDistributionUser = (userId: string) => {
    setSelectedDistributionIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId)
      }
      return [...prev, userId]
    })
  }

  const handleSaveDistribution = async () => {
    if (!rfi) {return}
    await updateRFI.mutateAsync({
      id: rfi.id,
      distribution_list: selectedDistributionIds,
    })
    setIsEditingDistribution(false)
    setDistributionFilter('')
  }

  // Loading state
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
              <p className="text-secondary">{(error as Error)?.message || 'RFI not found'}</p>
            </CardContent>
          </Card>
        </div>
      </SmartLayout>
    )
  }

  return (
    <SmartLayout title="RFI Details">
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
                  <h1 className="text-3xl font-bold text-foreground heading-page">
                    {formatRFINumber(rfi.rfi_number)}
                  </h1>
                  {rfi.priority && <PriorityBadge priority={rfi.priority} />}
                </div>
                <p className="text-secondary mt-1">{rfi.subject}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await downloadRFIPDF({
                      rfi,
                      projectId: rfi.project_id,
                      includeComments: true,
                      includeAttachments: true
                    })
                  }}
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
              <div className="bg-error-light border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-error" />
                <div>
                  <p className="font-medium text-red-800">RFI Overdue</p>
                  <p className="text-sm text-error">
                    Required by {format(new Date(rfi.date_required!), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {/* Workflow Progress Indicator */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  Workflow Status
                  <RFIStatusBadge status={rfi.status} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WorkflowProgressIndicator
                  steps={RFI_WORKFLOW_STEPS}
                  currentStep={getStepFromStatus(rfi.status, RFI_STATUS_STEP_MAP)}
                  isError={rfi.status === 'void'}
                  isVoided={rfi.status === 'void'}
                  ballInCourt={rfi.ball_in_court_user ? {
                    name: rfi.ball_in_court_user.full_name,
                    role: rfi.ball_in_court_role || undefined,
                  } : undefined}
                />
              </CardContent>
            </Card>

            {/* Tabbed Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">
                  <FileText className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="attachments">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Attachments
                  {attachments?.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {attachments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="comments">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comments
                  {comments?.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {comments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                {/* Question Card */}
                <Card>
              <CardHeader>
                <CardTitle>Question</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="whitespace-pre-wrap text-foreground">
                  {rfi.question || 'No question provided'}
                </div>

                {/* Drawing & Spec References */}
                {(rfi.drawing_reference || rfi.spec_section) && (
                  <div className="pt-4 border-t grid grid-cols-2 gap-4">
                    {rfi.drawing_reference && (
                      <div className="flex items-start gap-2">
                        <Image className="h-4 w-4 text-disabled mt-0.5" />
                        <div>
                          <Label className="text-secondary">Drawing Reference</Label>
                          <p className="text-foreground">{rfi.drawing_reference}</p>
                        </div>
                      </div>
                    )}
                    {rfi.spec_section && (
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-disabled mt-0.5" />
                        <div>
                          <Label className="text-secondary">Spec Section</Label>
                          <p className="text-foreground font-mono">{rfi.spec_section}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Response Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Response
                  {rfi.response_type && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {rfi.response_type.replace('_', ' ')}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rfi.response ? (
                  <div className="p-4 bg-success-light border border-green-200 rounded-lg">
                    <p className="whitespace-pre-wrap text-foreground">{rfi.response}</p>
                    <div className="mt-3 pt-3 border-t border-green-200 text-sm text-secondary">
                      {rfi.responded_by_user && (
                        <p>Responded by {rfi.responded_by_user.full_name || rfi.responded_by_user.email}</p>
                      )}
                      {rfi.date_responded && (
                        <p>on {format(new Date(rfi.date_responded), 'MMM d, yyyy h:mm a')}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {!showResponseForm ? (
                      <div className="text-center py-4">
                        <p className="text-muted mb-4">No response yet</p>
                        {['draft', 'open', 'pending_response'].includes(rfi.status) && (
                          <Button onClick={() => setShowResponseForm(true)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Provide Response
                          </Button>
                        )}
                      </div>
                    ) : (
                      <RFIResponseForm
                        rfiId={rfi.id}
                        onSuccess={() => setShowResponseForm(false)}
                        onCancel={() => setShowResponseForm(false)}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Impact Assessment Card */}
            {(rfi.cost_impact || rfi.schedule_impact_days) && (
              <Card>
                <CardHeader>
                  <CardTitle>Impact Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {rfi.cost_impact !== undefined && (
                      <div className="flex items-center gap-3 p-3 bg-warning-light rounded-lg">
                        <DollarSign className={`h-5 w-5 ${rfi.cost_impact ? 'text-warning' : 'text-success'}`} />
                        <div>
                          <Label className="text-secondary">Cost Impact</Label>
                          <p className="font-medium">
                            {rfi.cost_impact ? 'Yes - Cost impact expected' : 'No cost impact'}
                          </p>
                        </div>
                      </div>
                    )}
                    {rfi.schedule_impact_days !== null && rfi.schedule_impact_days !== undefined && (
                      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                        <CalendarClock className={`h-5 w-5 ${rfi.schedule_impact_days > 0 ? 'text-orange-600' : 'text-success'}`} />
                        <div>
                          <Label className="text-secondary">Schedule Impact</Label>
                          <p className="font-medium">
                            {rfi.schedule_impact_days > 0
                              ? `${rfi.schedule_impact_days} days delay`
                              : 'No schedule impact'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Items Card */}
            {(rfi.related_submittal_id || rfi.related_change_order_id) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Related Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {rfi.related_submittal_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/submittals-v2/${rfi.related_submittal_id}`)}
                    >
                      View Related Submittal
                    </Button>
                  )}
                  {rfi.related_change_order_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/change-orders/${rfi.related_change_order_id}`)}
                    >
                      View Related Change Order
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
              </TabsContent>

              {/* Attachments Tab */}
              <TabsContent value="attachments" className="space-y-6">
                <RFIAttachmentUploader
                  rfiId={rfi.id}
                  existingAttachments={attachments?.map((a: any) => ({
                    id: a.id,
                    file_name: a.file_name || a.document?.name || null,
                    file_type: a.file_type || a.document?.file_type || null,
                    file_size: a.file_size || null,
                    file_url: a.file_url || a.document?.file_url || null,
                    attachment_type: a.attachment_type || 'general',
                    uploaded_by_user: a.uploaded_by_user,
                    created_at: a.created_at,
                  })) || []}
                />
              </TabsContent>

              {/* Comments Tab */}
              <TabsContent value="comments" className="space-y-6">
            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
                <CardDescription>{comments?.length || 0} comments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments && comments.length > 0 ? (
                  <div className="space-y-4">
                    {comments.map((comment: any) => (
                      <div key={comment.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted" />
                            </div>
                            <div>
                              <span className="font-medium text-sm text-foreground">
                                {comment.created_by_user?.full_name || 'User'}
                              </span>
                              {comment.comment_type && comment.comment_type !== 'comment' && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {comment.comment_type.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted">
                            {comment.created_at
                              ? format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')
                              : 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap text-secondary ml-10">
                          {comment.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted text-center py-4">No comments yet</p>
                )}

                {/* Add Comment Form */}
                <div className="pt-4 border-t space-y-3">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={2}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || addComment.isPending}
                  >
                    {addComment.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Add Comment
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-6">
            {/* Change History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Change History
                </CardTitle>
                <CardDescription>
                  {history?.length || 0} changes recorded
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history && history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map((entry: any) => (
                      <div key={entry.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-gray-300 mt-2" />
                        <div>
                          <p className="text-secondary">
                            <span className="font-medium">{entry.field_name}</span> changed
                            {entry.old_value && ` from "${entry.old_value}"`}
                            {entry.new_value && ` to "${entry.new_value}"`}
                          </p>
                          <p className="text-xs text-muted">
                            {entry.changed_by_user?.full_name && `by ${entry.changed_by_user.full_name} • `}
                            {entry.changed_at && format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted text-center py-4">No history recorded yet</p>
                )}
              </CardContent>
            </Card>
              </TabsContent>
            </Tabs>
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
                  <Label htmlFor="status" className="text-secondary">Current Status</Label>
                  <select
                    id="status"
                    className="w-full mt-2 border rounded-md px-3 py-2 text-sm"
                    value={rfi.status}
                    onChange={(e) => handleStatusChange(e.target.value as RFIStatus)}
                    disabled={updateRFI.isPending}
                  >
                    {RFI_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-center">
                  <RFIStatusBadge status={rfi.status} />
                </div>

                <div className="pt-2 border-t">
                  <Label htmlFor="ballInCourt" className="text-secondary">Ball-in-Court</Label>
                  <select
                    id="ballInCourt"
                    className="w-full mt-2 border rounded-md px-3 py-2 text-sm"
                    value={rfi.ball_in_court_role || ''}
                    onChange={(e) => handleBallInCourtChange(e.target.value as BallInCourtRole)}
                    disabled={updateBallInCourt.isPending}
                  >
                    <option value="">Not assigned</option>
                    {BALL_IN_COURT_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>

                {rfi.status === 'responded' && rfi.status !== 'closed' && (
                  <Button
                    onClick={handleClose}
                    disabled={closeRFI.isPending}
                    className="w-full"
                  >
                    {closeRFI.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Closing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Close RFI
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Distribution List Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Distribution List
                  </CardTitle>
                  {!isEditingDistribution && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleStartEditDistribution}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isEditingDistribution
                    ? `${selectedDistributionIds.length} selected`
                    : `${distributionUsers.length} recipient${distributionUsers.length !== 1 ? 's' : ''}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditingDistribution ? (
                  <>
                    {/* Edit mode */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search project members..."
                        value={distributionFilter}
                        onChange={(e) => setDistributionFilter(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    <div className="max-h-[250px] overflow-auto border rounded-lg">
                      {filteredDistributionUsers.length === 0 ? (
                        <div className="py-4 text-center text-muted-foreground text-sm">
                          {distributionFilter ? 'No matching members found' : 'No members in this project'}
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredDistributionUsers.map((projectUser) => {
                            const user = projectUser.user
                            if (!user) {return null}
                            const isSelected = selectedDistributionIds.includes(user.id)
                            return (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => toggleDistributionUser(user.id)}
                                className={`w-full flex items-center gap-2 p-2 text-left hover:bg-muted/50 ${
                                  isSelected ? 'bg-blue-50' : ''
                                }`}
                              >
                                {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt=""
                                    className="h-6 w-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
                                    {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {user.first_name && user.last_name
                                      ? `${user.first_name} ${user.last_name}`
                                      : user.email}
                                  </p>
                                </div>
                                {isSelected && (
                                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEditDistribution}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveDistribution}
                        disabled={updateRFI.isPending}
                        className="flex-1"
                      >
                        {updateRFI.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* View mode */}
                    {distributionUsers.length > 0 ? (
                      distributionUsers.map((user: any) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                        >
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt=""
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-info-light flex items-center justify-center text-xs text-primary">
                              {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.first_name && user.last_name
                                ? `${user.first_name} ${user.last_name}`
                                : user.email}
                            </p>
                            {user.first_name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : rfi.distribution_list?.length > 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Loading recipients...
                      </p>
                    ) : (
                      <div className="text-center py-3">
                        <p className="text-sm text-muted-foreground mb-2">No recipients</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleStartEditDistribution}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Recipients
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Information Card */}
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-disabled mt-0.5" />
                  <div>
                    <Label className="text-secondary">Created</Label>
                    <p className="text-foreground">
                      {rfi.created_at
                        ? format(new Date(rfi.created_at), 'MMM d, yyyy')
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {rfi.date_submitted && (
                  <div className="flex items-start gap-3">
                    <Send className="h-4 w-4 text-disabled mt-0.5" />
                    <div>
                      <Label className="text-secondary">Submitted</Label>
                      <p className="text-foreground">
                        {format(new Date(rfi.date_submitted), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {rfi.date_required && (
                  <div className="flex items-start gap-3">
                    <Clock className={`h-4 w-4 mt-0.5 ${isOverdue ? 'text-error' : 'text-disabled'}`} />
                    <div>
                      <Label className="text-secondary">Required Date</Label>
                      <p className={isOverdue ? 'text-error font-medium' : 'text-foreground'}>
                        {format(new Date(rfi.date_required), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {rfi.date_closed && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5" />
                    <div>
                      <Label className="text-secondary">Closed</Label>
                      <p className="text-foreground">
                        {format(new Date(rfi.date_closed), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-disabled mt-0.5" />
                  <div>
                    <Label className="text-secondary">Days Open</Label>
                    <p className="text-foreground">{daysOpen} days</p>
                  </div>
                </div>

                {rfi.submitted_by_user && (
                  <div className="flex items-start gap-3 pt-2 border-t">
                    <User className="h-4 w-4 text-disabled mt-0.5" />
                    <div>
                      <Label className="text-secondary">Submitted By</Label>
                      <p className="text-foreground">
                        {rfi.submitted_by_user.full_name || rfi.submitted_by_user.email}
                      </p>
                    </div>
                  </div>
                )}

                {rfi.assigned_to_user && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-disabled mt-0.5" />
                    <div>
                      <Label className="text-secondary">Assigned To</Label>
                      <p className="text-foreground">
                        {rfi.assigned_to_user.full_name || rfi.assigned_to_user.email}
                      </p>
                    </div>
                  </div>
                )}

                {rfi.project && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-disabled mt-0.5" />
                    <div>
                      <Label className="text-secondary">Project</Label>
                      <p className="text-foreground">{rfi.project.name}</p>
                    </div>
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
      </div>

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
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SmartLayout>
  )
}

export default DedicatedRFIDetailPage
