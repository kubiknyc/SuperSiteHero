// File: /src/pages/change-orders/ChangeOrderDetailPage.tsx
// Detail view for a single change order

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  useChangeOrder,
  useUpdateChangeOrder,
  useDeleteChangeOrder,
  useAddChangeOrderComment,
} from '@/features/change-orders/hooks/useChangeOrders'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  ArrowLeft,
  FileEdit,
  DollarSign,
  Clock,
  User,
  Calendar,
  MessageSquare,
  Trash2,
  Save,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ChangeOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const { addToast } = useToast()

  const { data: changeOrder, isLoading, error } = useChangeOrder(id)
  const updateChangeOrder = useUpdateChangeOrder()
  const deleteChangeOrder = useDeleteChangeOrder()
  const addComment = useAddChangeOrderComment()

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedPriority, setEditedPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [editedCostImpact, setEditedCostImpact] = useState('')
  const [editedScheduleImpact, setEditedScheduleImpact] = useState('')

  // Comment state
  const [newComment, setNewComment] = useState('')

  // Initialize edit form when entering edit mode
  const handleStartEdit = () => {
    if (changeOrder) {
      setEditedTitle(changeOrder.title || '')
      setEditedDescription(changeOrder.description || '')
      setEditedPriority(changeOrder.priority)
      setEditedCostImpact(changeOrder.cost_impact?.toString() || '')
      setEditedScheduleImpact(changeOrder.schedule_impact?.toString() || '')
      setIsEditing(true)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!changeOrder) return

    try {
      await updateChangeOrder.mutateAsync({
        id: changeOrder.id,
        title: editedTitle.trim(),
        description: editedDescription.trim() || null,
        priority: editedPriority,
        cost_impact: editedCostImpact ? parseFloat(editedCostImpact) : null,
        schedule_impact: editedScheduleImpact ? parseInt(editedScheduleImpact) : null,
      })

      addToast({
        title: 'Success',
        description: 'Change order updated successfully',
        variant: 'success',
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update change order:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update change order',
        variant: 'destructive',
      })
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!changeOrder) return

    try {
      await updateChangeOrder.mutateAsync({
        id: changeOrder.id,
        status: newStatus,
      })

      addToast({
        title: 'Success',
        description: 'Status updated successfully',
        variant: 'success',
      })
    } catch (error) {
      console.error('Failed to update status:', error)
      addToast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!changeOrder || !window.confirm('Are you sure you want to delete this change order?')) return

    try {
      await deleteChangeOrder.mutateAsync(changeOrder.id)
      addToast({
        title: 'Success',
        description: 'Change order deleted successfully',
        variant: 'success',
      })
      navigate('/change-orders')
    } catch (error) {
      console.error('Failed to delete change order:', error)
      addToast({
        title: 'Error',
        description: 'Failed to delete change order',
        variant: 'destructive',
      })
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!changeOrder || !newComment.trim()) return

    try {
      await addComment.mutateAsync({
        workflow_item_id: changeOrder.id,
        comment: newComment.trim(),
      })

      addToast({
        title: 'Success',
        description: 'Comment added successfully',
        variant: 'success',
      })
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
      addToast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      })
    }
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
            {!isEditing && (
              <>
                <Button variant="outline" onClick={handleStartEdit}>
                  <FileEdit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </>
            )}
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
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        rows={6}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          id="priority"
                          value={editedPriority}
                          onChange={(e) => setEditedPriority(e.target.value as 'low' | 'normal' | 'high')}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cost-impact">Cost Impact ($)</Label>
                        <Input
                          id="cost-impact"
                          type="number"
                          step="0.01"
                          value={editedCostImpact}
                          onChange={(e) => setEditedCostImpact(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schedule-impact">Schedule Impact (days)</Label>
                        <Input
                          id="schedule-impact"
                          type="number"
                          value={editedScheduleImpact}
                          onChange={(e) => setEditedScheduleImpact(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEdit} disabled={updateChangeOrder.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {updateChangeOrder.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
                                {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
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
                    <p className="text-sm">{format(new Date(changeOrder.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-gray-600">Updated</Label>
                    <p className="text-sm">{format(new Date(changeOrder.updated_at), 'MMM d, yyyy h:mm a')}</p>
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
      </div>
    </AppLayout>
  )
}
