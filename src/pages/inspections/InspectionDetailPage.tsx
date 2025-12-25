/**
 * Inspection Detail Page
 *
 * Displays detailed information about a single inspection,
 * including status, result, and related items.
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  InspectionStatusBadge,
  InspectionTypeBadge,
  InspectionResultDialog,
} from '@/features/inspections/components'
import {
  useInspection,
  useRecordInspectionResult,
  useCancelInspection,
  useDeleteInspection,
} from '@/features/inspections/hooks'
import { useToast } from '@/lib/notifications/ToastContext'
import type { RecordInspectionResultInput } from '@/features/inspections/types'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Building,
  Phone,
  FileText,
  Edit,
  Trash2,
  XCircle,
  CheckCircle,
  AlertTriangle,
  ClipboardCheck,
  Link as LinkIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [showResultDialog, setShowResultDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Fetch inspection data
  const { data: inspection, isLoading, error } = useInspection(id)

  // Mutations
  const recordResultMutation = useRecordInspectionResult()
  const cancelMutation = useCancelInspection()
  const deleteMutation = useDeleteInspection()

  const handleRecordResult = (data: RecordInspectionResultInput) => {
    recordResultMutation.mutate(data, {
      onSuccess: () => {
        addToast(
          'success',
          'Result Recorded',
          'Inspection result has been saved successfully.'
        )
        setShowResultDialog(false)
      },
      onError: () => {
        addToast(
          'error',
          'Error',
          'Failed to record inspection result.'
        )
      },
    })
  }

  const handleCancel = () => {
    if (!id) {return}
    cancelMutation.mutate(id, {
      onSuccess: () => {
        addToast(
          'info',
          'Inspection Cancelled',
          'The inspection has been cancelled.'
        )
      },
      onError: () => {
        addToast(
          'error',
          'Error',
          'Failed to cancel inspection.'
        )
      },
    })
  }

  const handleDelete = () => {
    if (!id || !inspection) {return}
    deleteMutation.mutate(
      { id, projectId: inspection.project_id },
      {
        onSuccess: () => {
          addToast(
            'info',
            'Inspection Deleted',
            'The inspection has been deleted.'
          )
          navigate('/inspections')
        },
        onError: () => {
          addToast(
            'error',
            'Error',
            'Failed to delete inspection.'
          )
        },
      }
    )
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted mt-4">Loading inspection...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !inspection) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12 bg-card rounded-lg border">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
            <h3 className="text-lg font-medium text-foreground mt-4 heading-subsection">
              Inspection Not Found
            </h3>
            <p className="text-muted mt-2">
              The inspection you're looking for doesn't exist or has been deleted.
            </p>
            <Link to="/inspections" className="mt-4 inline-block">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inspections
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  const canRecordResult = inspection.status === 'scheduled'
  const canCancel = inspection.status === 'scheduled'
  const canEdit = inspection.status !== 'cancelled'

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <Link
              to="/inspections"
              className="mt-1 p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground heading-page">
                  {inspection.inspection_name}
                </h1>
                <InspectionTypeBadge type={inspection.inspection_type} />
              </div>
              <div className="flex items-center gap-3 mt-2">
                <InspectionStatusBadge
                  status={inspection.status}
                  result={inspection.result}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canRecordResult && (
              <Button onClick={() => setShowResultDialog(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Result
              </Button>
            )}
            {canEdit && (
              <Link to={`/inspections/${id}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
            {canCancel && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button
              variant="outline"
              className="text-error hover:text-error-dark"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {inspection.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-secondary whitespace-pre-wrap">
                    {inspection.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Result Information (if completed) */}
            {inspection.result && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inspection Result</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {inspection.result === 'pass' && (
                      <CheckCircle className="h-8 w-8 text-success" />
                    )}
                    {inspection.result === 'fail' && (
                      <XCircle className="h-8 w-8 text-error" />
                    )}
                    {inspection.result === 'conditional' && (
                      <AlertTriangle className="h-8 w-8 text-warning" />
                    )}
                    <div>
                      <p className="font-medium text-lg capitalize">
                        {inspection.result}
                      </p>
                      {inspection.result_date && (
                        <p className="text-sm text-muted">
                          {format(new Date(inspection.result_date), 'MMMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>

                  {inspection.inspector_notes && (
                    <div>
                      <h4 className="text-sm font-medium text-secondary mb-1 heading-card">
                        Inspector Notes
                      </h4>
                      <p className="text-secondary whitespace-pre-wrap bg-surface p-3 rounded-lg">
                        {inspection.inspector_notes}
                      </p>
                    </div>
                  )}

                  {inspection.failure_reasons && (
                    <div>
                      <h4 className="text-sm font-medium text-error-dark mb-1 heading-card">
                        Failure Reasons
                      </h4>
                      <p className="text-secondary whitespace-pre-wrap bg-error-light p-3 rounded-lg border border-red-200">
                        {inspection.failure_reasons}
                      </p>
                    </div>
                  )}

                  {inspection.corrective_actions_required && (
                    <div>
                      <h4 className="text-sm font-medium text-orange-700 mb-1 heading-card">
                        Corrective Actions Required
                      </h4>
                      <p className="text-secondary whitespace-pre-wrap bg-orange-50 p-3 rounded-lg border border-orange-200">
                        {inspection.corrective_actions_required}
                      </p>
                    </div>
                  )}

                  {inspection.reinspection_scheduled_date && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-primary-hover">
                          Reinspection Scheduled
                        </p>
                        <p className="text-primary">
                          {format(
                            new Date(inspection.reinspection_scheduled_date),
                            'MMMM d, yyyy'
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Related Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Related Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {inspection.related_checklist_id ? (
                    <Link
                      to={`/checklists/executions/${inspection.related_checklist_id}`}
                      className="flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-muted transition-colors"
                    >
                      <ClipboardCheck className="h-5 w-5 text-muted" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Related Checklist
                        </p>
                        <p className="text-xs text-muted">
                          View linked checklist
                        </p>
                      </div>
                      <LinkIcon className="h-4 w-4 text-disabled ml-auto" />
                    </Link>
                  ) : (
                    <p className="text-sm text-muted">No checklist linked</p>
                  )}

                  {inspection.related_permit_id ? (
                    <Link
                      to={`/permits/${inspection.related_permit_id}`}
                      className="flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-muted transition-colors"
                    >
                      <FileText className="h-5 w-5 text-muted" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Related Permit
                        </p>
                        <p className="text-xs text-muted">
                          View linked permit
                        </p>
                      </div>
                      <LinkIcon className="h-4 w-4 text-disabled ml-auto" />
                    </Link>
                  ) : (
                    <p className="text-sm text-muted">No permit linked</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Schedule Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {inspection.scheduled_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-disabled" />
                    <div>
                      <p className="text-sm text-muted">Scheduled Date</p>
                      <p className="font-medium">
                        {format(
                          new Date(inspection.scheduled_date),
                          'MMMM d, yyyy'
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {inspection.scheduled_time && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-disabled" />
                    <div>
                      <p className="text-sm text-muted">Scheduled Time</p>
                      <p className="font-medium">{inspection.scheduled_time}</p>
                    </div>
                  </div>
                )}

                {inspection.reminder_days_before && (
                  <div className="text-sm text-muted">
                    Reminder: {inspection.reminder_days_before} day
                    {inspection.reminder_days_before > 1 ? 's' : ''} before
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inspector Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inspector</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {inspection.inspector_name ? (
                  <>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-disabled" />
                      <div>
                        <p className="text-sm text-muted">Name</p>
                        <p className="font-medium">{inspection.inspector_name}</p>
                      </div>
                    </div>

                    {inspection.inspector_company && (
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-disabled" />
                        <div>
                          <p className="text-sm text-muted">Company</p>
                          <p className="font-medium">
                            {inspection.inspector_company}
                          </p>
                        </div>
                      </div>
                    )}

                    {inspection.inspector_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-disabled" />
                        <div>
                          <p className="text-sm text-muted">Phone</p>
                          <a
                            href={`tel:${inspection.inspector_phone}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {inspection.inspector_phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    No inspector information
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {inspection.created_at && (
                  <div className="flex justify-between">
                    <span className="text-muted">Created</span>
                    <span className="font-medium">
                      {format(new Date(inspection.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {inspection.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-muted">Last Updated</span>
                    <span className="font-medium">
                      {format(new Date(inspection.updated_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-foreground heading-subsection">
                Delete Inspection
              </h3>
              <p className="text-muted mt-2">
                Are you sure you want to delete this inspection? This action
                cannot be undone.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    handleDelete()
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Record Result Dialog */}
        <InspectionResultDialog
          open={showResultDialog}
          onOpenChange={setShowResultDialog}
          inspectionId={inspection.id}
          inspectionName={inspection.inspection_name}
          onSubmit={handleRecordResult}
          isSubmitting={recordResultMutation.isPending}
        />
      </div>
    </AppLayout>
  )
}

export default InspectionDetailPage
