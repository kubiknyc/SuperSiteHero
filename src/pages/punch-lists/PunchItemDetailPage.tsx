// File: /src/pages/punch-lists/PunchItemDetailPage.tsx
// Detailed view of a single punch item with status management

import { useState } from 'react'
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
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePunchItem, useUpdatePunchItemStatus } from '@/features/punch-lists/hooks/usePunchItems'
import { useDeletePunchItemWithNotification } from '@/features/punch-lists/hooks/usePunchItemsMutations'
import { EditPunchItemDialog } from '@/features/punch-lists/components/EditPunchItemDialog'
import { PunchItemStatusBadge } from '@/features/punch-lists/components/PunchItemStatusBadge'
import { BackChargesList } from '@/features/punch-lists/components/BackChargesList'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, AlertCircle, Loader2, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'
import type { PunchItemStatus } from '@/types/database'

export function PunchItemDetailPage() {
  const { punchItemId } = useParams<{ punchItemId: string }>()
  const navigate = useNavigate()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [showRejectionForm, setShowRejectionForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: punchItem, isLoading, error } = usePunchItem(punchItemId)
  const updateStatus = useUpdatePunchItemStatus()
  const deletePunchItem = useDeletePunchItemWithNotification()

  const handleStatusChange = async (newStatus: PunchItemStatus) => {
    if (!punchItem) {return}

    // If rejecting, require notes
    if (newStatus === 'rejected' && !showRejectionForm) {
      setShowRejectionForm(true)
      return
    }

    await updateStatus.mutateAsync({
      punchItemId: punchItem.id,
      status: newStatus ?? 'open',
    })
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!punchItem || !rejectionNotes.trim()) {return}

    // Update with rejection notes (would need to modify the mutation to accept notes)
    await updateStatus.mutateAsync({
      punchItemId: punchItem.id,
      status: 'rejected',
    })

    setRejectionNotes('')
    setShowRejectionForm(false)
  }

  const handleDelete = async () => {
    if (!punchItem) {return}
    try {
      await deletePunchItem.mutateAsync(punchItem.id)
      navigate('/punch-lists')
    } finally {
      setShowDeleteDialog(false)
    }
  }

  if (!punchItemId) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center">
            <p className="text-error">Punch item ID not found</p>
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
            <Loader2 className="h-8 w-8 animate-spin text-disabled" />
            <p className="ml-2 text-muted">Loading punch item...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !punchItem) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate('/punch-lists')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Punch Lists
            </Button>
          </div>
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2 heading-subsection">Error Loading Punch Item</h3>
              <p className="text-secondary">{error?.message || 'Punch item not found'}</p>
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
          <Button variant="outline" onClick={() => navigate('/punch-lists')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Punch Lists
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground heading-page">{punchItem.title}</h1>
                <div className="mt-2">
                  <PunchItemStatusBadge status={punchItem.status} priority={punchItem.priority} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={deletePunchItem.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {/* Description */}
            {punchItem.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-foreground">{punchItem.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Location Details */}
            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {punchItem.building && (
                    <div>
                      <Label className="text-secondary">Building</Label>
                      <p className="mt-1 text-foreground">{punchItem.building}</p>
                    </div>
                  )}
                  {punchItem.floor && (
                    <div>
                      <Label className="text-secondary">Floor</Label>
                      <p className="mt-1 text-foreground">{punchItem.floor}</p>
                    </div>
                  )}
                  {punchItem.room && (
                    <div>
                      <Label className="text-secondary">Room</Label>
                      <p className="mt-1 text-foreground">{punchItem.room}</p>
                    </div>
                  )}
                  {punchItem.area && (
                    <div>
                      <Label className="text-secondary">Area</Label>
                      <p className="mt-1 text-foreground">{punchItem.area}</p>
                    </div>
                  )}
                </div>
                {punchItem.location_notes && (
                  <div>
                    <Label className="text-secondary">Location Notes</Label>
                    <p className="mt-1 whitespace-pre-wrap text-foreground">{punchItem.location_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tracking Info */}
            <Card>
              <CardHeader>
                <CardTitle>Tracking Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-secondary">Trade</Label>
                    <p className="mt-1 text-foreground">{punchItem.trade}</p>
                  </div>
                  <div>
                    <Label className="text-secondary">Priority</Label>
                    <p className="mt-1">
                      <PunchItemStatusBadge status={punchItem.status} priority={punchItem.priority} />
                    </p>
                  </div>
                  {punchItem.due_date && (
                    <div>
                      <Label className="text-secondary">Due Date</Label>
                      <p className="mt-1 text-foreground">
                        {punchItem.due_date ? format(new Date(punchItem.due_date), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  )}
                  {punchItem.assigned_to && (
                    <div>
                      <Label className="text-secondary">Assigned To</Label>
                      <p className="mt-1 text-foreground">{punchItem.assigned_to}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Completion Info */}
            {(punchItem.completed_date || punchItem.verified_date || punchItem.rejection_notes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Completion Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {punchItem.completed_date && (
                    <div>
                      <Label className="text-secondary">Completed Date</Label>
                      <p className="mt-1 text-foreground">
                        {punchItem.completed_date ? format(new Date(punchItem.completed_date), 'MMM d, yyyy h:mm a') : 'N/A'}
                      </p>
                    </div>
                  )}
                  {punchItem.verified_date && (
                    <div>
                      <Label className="text-secondary">Verified Date</Label>
                      <p className="mt-1 text-foreground">
                        {punchItem.verified_date ? format(new Date(punchItem.verified_date), 'MMM d, yyyy h:mm a') : 'N/A'}
                      </p>
                    </div>
                  )}
                  {punchItem.rejection_notes && (
                    <div className="p-4 bg-error-light border border-red-200 rounded-lg">
                      <Label className="text-secondary font-semibold">Rejection Notes</Label>
                      <p className="mt-2 whitespace-pre-wrap text-foreground">{punchItem.rejection_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Back-Charges */}
            <BackChargesList
              punchItemId={punchItem.id}
              projectId={punchItem.project_id}
              subcontractorId={punchItem.subcontractor_id}
              subcontractorName={(punchItem as any).subcontractor_name}
            />

            {/* Quick Actions for Status Change */}
            {punchItem.status !== 'verified' && (
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Change the status of this punch item</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(punchItem.status === 'open' || punchItem.status === 'in_progress' || punchItem.status === 'ready_for_review') && (
                      <Button
                        onClick={() => handleStatusChange('completed')}
                        disabled={updateStatus.isPending}
                        variant="outline"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                    {punchItem.status === 'completed' && (
                      <Button
                        onClick={() => handleStatusChange('verified')}
                        disabled={updateStatus.isPending}
                        variant="default"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Verified
                      </Button>
                    )}
                    {punchItem.status !== 'rejected' && (
                      <Button
                        onClick={() => handleStatusChange('rejected')}
                        disabled={updateStatus.isPending}
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    )}
                  </div>

                  {/* Rejection Form */}
                  {showRejectionForm && (
                    <form onSubmit={handleReject} className="space-y-3 mt-4 p-4 bg-error-light border border-red-200 rounded-lg">
                      <Label htmlFor="rejection-notes">Rejection Notes (Required)</Label>
                      <Textarea
                        id="rejection-notes"
                        value={rejectionNotes}
                        onChange={(e) => setRejectionNotes(e.target.value)}
                        placeholder="Explain why this item is being rejected..."
                        rows={3}
                        required
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowRejectionForm(false)
                            setRejectionNotes('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="destructive" disabled={!rejectionNotes.trim()}>
                          Submit Rejection
                        </Button>
                      </div>
                    </form>
                  )}
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
              <CardContent>
                <PunchItemStatusBadge status={punchItem.status} />
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <Label className="text-secondary">Created</Label>
                  <p className="mt-1 text-foreground">
                    {punchItem.created_at ? format(new Date(punchItem.created_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-secondary">Last Updated</Label>
                  <p className="mt-1 text-foreground">
                    {punchItem.updated_at ? format(new Date(punchItem.updated_at), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </p>
                </div>
                {punchItem.number && (
                  <div>
                    <Label className="text-secondary">Item Number</Label>
                    <p className="mt-1 text-foreground">#{punchItem.number}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        {punchItem && (
          <EditPunchItemDialog
            punchItem={punchItem}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        )}

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Punch Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{punchItem?.title}"? This action cannot be undone.
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
      </div>
    </AppLayout>
  )
}
