// File: /src/pages/change-orders/ChangeOrderDetailPage.tsx
// Detail view for a single change order

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { useChangeOrder } from '@/features/change-orders/hooks/useChangeOrders'
import { useUpdateChangeOrderStatusWithNotification, useAddChangeOrderCommentWithNotification } from '@/features/change-orders/hooks/useChangeOrderMutations'
import { EditChangeOrderDialog } from '@/features/change-orders/components/EditChangeOrderDialog'
import { DeleteChangeOrderConfirmation } from '@/features/change-orders/components/DeleteChangeOrderConfirmation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  ArrowLeft,
  FileEdit,
  DollarSign,
  Clock,
  User,
  Calendar,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubmitForApprovalButton, ApprovalStatusBadge } from '@/features/approvals/components'
import { useEntityApprovalStatus } from '@/features/approvals/hooks'

export function ChangeOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()

  const { data: changeOrder, isLoading, error } = useChangeOrder(id)
  const { data: approvalStatus } = useEntityApprovalStatus('change_order', id)
  const updateStatus = useUpdateChangeOrderStatusWithNotification()
  const addComment = useAddChangeOrderCommentWithNotification()

  // Dialog and comment state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [newComment, setNewComment] = useState('')

  const handleStatusChange = async (newStatus: string) => {
    if (!changeOrder) return
    await updateStatus.mutateAsync({
      changeOrderId: changeOrder.id,
      status: newStatus,
    })
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changeOrder || !newComment.trim()) return

    await addComment.mutateAsync({
      workflow_item_id: changeOrder.id,
      comment: newComment.trim(),
    })
    setNewComment('')
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-blue-100 text-blue-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-600',
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'Not specified'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Loading change order...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !changeOrder) {
    return (
      <AppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Change Order</h3>
              <p className="text-gray-600 mb-6">{error?.message || 'Change order not found'}</p>
              <Link to="/change-orders">
                <Button>Back to Change Orders</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
  }

  const changeOrderNumber = `${changeOrder.workflow_type?.prefix || 'CO'}-${String(changeOrder.number).padStart(3, '0')}`
  const awardedBid = changeOrder.bids?.find((b: any) => b.is_awarded)
  const totalCost = awardedBid?.lump_sum_cost || changeOrder.cost_impact

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/change-orders">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{changeOrderNumber}</h1>
              <p className="text-gray-600 mt-1">Change Order Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
              <FileEdit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <DeleteChangeOrderConfirmation
              changeOrderId={changeOrder.id}
              changeOrderNumber={changeOrder.number}
              onSuccess={() => navigate('/change-orders')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Change Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-gray-600">Title</Label>
                  <p className="text-lg font-medium mt-1">{changeOrder.title}</p>
                </div>
                {changeOrder.description && (
                  <div>
                    <Label className="text-gray-600">Description</Label>
                    <p className="mt-1 whitespace-pre-wrap">{changeOrder.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-600">Priority</Label>
                    <Badge variant="outline" className="capitalize mt-1">
                      {changeOrder.priority}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-600">Cost Impact</Label>
                    <p className="font-medium mt-1">{formatCurrency(changeOrder.cost_impact)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Schedule Impact</Label>
                    <p className="font-medium mt-1">
                      {changeOrder.schedule_impact !== null ? `${changeOrder.schedule_impact} days` : 'Not specified'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bids Card */}
            {changeOrder.bids && changeOrder.bids.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Bids</CardTitle>
                  <CardDescription>Subcontractor bids for this change order</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {changeOrder.bids.map((bid: any) => (
                      <div
                        key={bid.id}
                        className={cn(
                          'p-4 border rounded-lg',
                          bid.is_awarded && 'border-green-500 bg-green-50'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{bid.subcontractor?.company_name}</h4>
                              {bid.is_awarded && (
                                <Badge className="bg-green-600">Awarded</Badge>
                              )}
                              <Badge variant="outline">{bid.bid_status}</Badge>
                            </div>
                            {bid.lump_sum_cost && (
                              <p className="text-lg font-medium text-green-600">
                                {formatCurrency(bid.lump_sum_cost)}
                              </p>
                            )}
                            {bid.duration_days && (
                              <p className="text-sm text-gray-600">Duration: {bid.duration_days} days</p>
                            )}
                            {bid.notes && (
                              <p className="text-sm text-gray-600 mt-2">{bid.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
                <CardDescription>Discussion and updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {changeOrder.comments && changeOrder.comments.length > 0 ? (
                  <div className="space-y-4">
                    {changeOrder.comments.map((comment: any) => (
                      <div key={comment.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">
                                {comment.created_by_user?.first_name} {comment.created_by_user?.last_name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {comment.created_at ? format(new Date(comment.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
                )}

                <form onSubmit={handleAddComment} className="space-y-2 pt-4 border-t">
                  <Label htmlFor="new-comment">Add Comment</Label>
                  <Textarea
                    id="new-comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={!newComment.trim() || addComment.isPending}>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {addComment.isPending ? 'Adding...' : 'Add Comment'}
                    </Button>
                  </div>
                </form>
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
                    className="mt-2"
                    value={changeOrder.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="closed">Closed</option>
                  </Select>
                </div>
                <Badge className={cn('w-full justify-center', getStatusColor(changeOrder.status))}>
                  {changeOrder.status.replace('_', ' ')}
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
                      entityType="change_order"
                      entityId={changeOrder.id}
                      entityName={changeOrder.title}
                      projectId={changeOrder.project_id}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Metadata Card */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-gray-600">Raised By</Label>
                    <p className="text-sm">
                      {changeOrder.raised_by_user?.first_name} {changeOrder.raised_by_user?.last_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-gray-600">Created</Label>
                    <p className="text-sm">{changeOrder.created_at ? format(new Date(changeOrder.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-gray-600">Updated</Label>
                    <p className="text-sm">{changeOrder.updated_at ? format(new Date(changeOrder.updated_at), 'MMM d, yyyy h:mm a') : 'N/A'}</p>
                  </div>
                </div>
                {totalCost !== null && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <Label className="text-gray-600">Total Cost</Label>
                      <p className="text-sm font-medium">{formatCurrency(totalCost)}</p>
                    </div>
                  </div>
                )}
                {changeOrder.schedule_impact !== null && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <Label className="text-gray-600">Schedule Impact</Label>
                      <p className="text-sm">{changeOrder.schedule_impact} days</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        <EditChangeOrderDialog
          changeOrder={changeOrder}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      </div>
    </AppLayout>
  )
}
