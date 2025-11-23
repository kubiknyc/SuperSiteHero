// File: /src/pages/submittals/SubmittalDetailPage.tsx
// Submittal detail page with status management and procurement tracking

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { useSubmittal, useSubmittalComments, useSubmittalProcurement } from '@/features/submittals/hooks/useSubmittals'
import { useUpdateSubmittalStatusWithNotification, useDeleteSubmittalWithNotification, useUpdateSubmittalProcurementStatusWithNotification } from '@/features/submittals/hooks/useSubmittalMutations'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ArrowLeft, AlertCircle, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SubmittalStatusBadge } from '@/features/submittals/components'

export function SubmittalDetailPage() {
  const { submittalId } = useParams<{ submittalId: string }>()
  const navigate = useNavigate()

  const { data: submittal, isLoading, error } = useSubmittal(submittalId)
  const { data: comments } = useSubmittalComments(submittalId)
  const { data: procurementRecords } = useSubmittalProcurement(submittalId)
  const updateStatus = useUpdateSubmittalStatusWithNotification()
  const updateProcurementStatus = useUpdateSubmittalProcurementStatusWithNotification()
  const deleteSubmittal = useDeleteSubmittalWithNotification()

  const handleStatusChange = async (newStatus: string) => {
    if (!submittal) return
    await updateStatus.mutateAsync({
      submittalId: submittal.id,
      status: newStatus,
    })
  }

  const handleProcurementStatusChange = async (procurementId: string, newStatus: string) => {
    await updateProcurementStatus.mutateAsync({
      procurementId,
      status: newStatus,
    })
  }

  const handleDelete = async () => {
    if (!submittal || !window.confirm('Are you sure you want to delete this submittal?')) return
    await deleteSubmittal.mutateAsync(submittal.id)
    navigate(-1)
  }

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
              <p className="text-gray-600">{error?.message || 'Submittal not found'}</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    )
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
              <h1 className="text-3xl font-bold text-gray-900">S-{String(submittal.number).padStart(3, '0')}</h1>
              <p className="text-gray-600 mt-1">{submittal.title}</p>
            </div>

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
                  {submittal.cost_impact && (
                    <div>
                      <Label className="text-gray-600">Cost Impact</Label>
                      <p className="mt-1 text-gray-900 font-semibold">{submittal.cost_impact}</p>
                    </div>
                  )}

                  {submittal.schedule_impact && (
                    <div>
                      <Label className="text-gray-600">Schedule Impact</Label>
                      <p className="mt-1 text-gray-900 font-semibold">{submittal.schedule_impact}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Procurement Records */}
            {procurementRecords && procurementRecords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Procurement Pipeline</CardTitle>
                  <CardDescription>{procurementRecords.length} record(s)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {procurementRecords.map((record) => (
                      <div key={record.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{record.vendor || 'Vendor'}</p>
                            {record.order_number && (
                              <p className="text-sm text-gray-600">Order: {record.order_number}</p>
                            )}
                          </div>
                          <Select
                            value={record.procurement_status}
                            onChange={(e) => handleProcurementStatusChange(record.id, e.target.value)}
                            disabled={updateProcurementStatus.isPending}
                            className="w-48"
                          >
                            <option value="pending_approval">Pending Approval</option>
                            <option value="approved">Approved</option>
                            <option value="ordered">Ordered</option>
                            <option value="in_transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                          </Select>
                        </div>

                        {record.notes && (
                          <p className="text-sm text-gray-600 mt-2">{record.notes}</p>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          Updated {record.updated_at ? format(new Date(record.updated_at), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
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
                    value={submittal.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updateStatus.isPending}
                    className="mt-2"
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="resubmit_required">Resubmit Required</option>
                  </Select>
                </div>
                <SubmittalStatusBadge status={submittal.status} />
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
                    {submittal.created_at ? format(new Date(submittal.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </p>
                </div>

                {submittal.due_date && (
                  <div>
                    <Label className="text-gray-600">Due Date</Label>
                    <p className="mt-1 text-gray-900">
                      {submittal.due_date ? format(new Date(submittal.due_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                )}

                {submittal.assignees && submittal.assignees.length > 0 && (
                  <div>
                    <Label className="text-gray-600">Assigned To</Label>
                    <p className="mt-1 text-gray-900">{submittal.assignees.length} user(s)</p>
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
