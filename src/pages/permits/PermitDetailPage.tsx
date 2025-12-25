import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileCheck,
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Building2,
  User,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  FileText,
} from 'lucide-react'
import {
  usePermit,
  useUpdatePermit,
  useUpdatePermitStatus,
  useDeletePermit,
} from '@/features/permits/hooks/usePermits'
import {
  PermitStatus,
  PermitType,
  getPermitStatusColor,
  getPermitStatusLabel,
  getPermitTypeLabel,
  getDaysUntilExpiration,
  isPermitExpired,
  isPermitExpiringSoon,
  getNextPermitStatusOptions,
} from '@/types/permits'

export function PermitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)

  const { data: permit, isLoading } = usePermit(id)
  const updatePermit = useUpdatePermit()
  const updateStatus = useUpdatePermitStatus()
  const deletePermit = useDeletePermit()

  // Edit form state
  const [editForm, setEditForm] = useState({
    permit_name: '',
    permit_type: '',
    permit_number: '',
    status: '',
    issuing_agency: '',
    agency_contact: '',
    agency_phone: '',
    application_date: '',
    issue_date: '',
    expiration_date: '',
    renewal_date: '',
    renewal_reminder_days_before: 30,
    work_cannot_proceed_without: false,
    requires_inspections: false,
    notes: '',
  })

  const openEditDialog = () => {
    if (permit) {
      setEditForm({
        permit_name: permit.permit_name || '',
        permit_type: permit.permit_type || '',
        permit_number: permit.permit_number || '',
        status: permit.status || '',
        issuing_agency: permit.issuing_agency || '',
        agency_contact: permit.agency_contact || '',
        agency_phone: permit.agency_phone || '',
        application_date: permit.application_date || '',
        issue_date: permit.issue_date || '',
        expiration_date: permit.expiration_date || '',
        renewal_date: permit.renewal_date || '',
        renewal_reminder_days_before: permit.renewal_reminder_days_before || 30,
        work_cannot_proceed_without: permit.work_cannot_proceed_without || false,
        requires_inspections: permit.requires_inspections || false,
        notes: permit.notes || '',
      })
      setShowEditDialog(true)
    }
  }

  const handleUpdate = async () => {
    if (!id) {return}

    try {
      await updatePermit.mutateAsync({
        id,
        ...editForm,
      })
      setShowEditDialog(false)
    } catch (error) {
      console.error('Failed to update permit:', error)
    }
  }

  const handleStatusChange = async (newStatus: PermitStatus) => {
    if (!id) {return}

    try {
      await updateStatus.mutateAsync({ id, status: newStatus })
      setShowStatusDialog(false)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleDelete = async () => {
    if (!id) {return}

    try {
      await deletePermit.mutateAsync(id)
      navigate('/permits')
    } catch (error) {
      console.error('Failed to delete permit:', error)
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12 text-muted">Loading permit...</div>
        </div>
      </AppLayout>
    )
  }

  if (!permit) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-muted">Permit not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/permits')}>
              Back to Permits
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const daysUntilExpiration = getDaysUntilExpiration(permit)
  const expired = isPermitExpired(permit)
  const expiringSoon = isPermitExpiringSoon(permit)
  const nextStatusOptions = getNextPermitStatusOptions(permit.status)

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/permits')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold heading-page">{permit.permit_name}</h1>
                {permit.work_cannot_proceed_without && (
                  <AlertCircle className="h-5 w-5 text-error" aria-label="Critical permit" />
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {permit.permit_number && (
                  <span className="text-muted">#{permit.permit_number}</span>
                )}
                <Badge className={getPermitStatusColor(permit.status)}>
                  {getPermitStatusLabel(permit.status)}
                </Badge>
                <Badge variant="outline">
                  {getPermitTypeLabel(permit.permit_type)}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowStatusDialog(true)}>
              Update Status
            </Button>
            <Button variant="outline" onClick={openEditDialog}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" className="text-error" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Permit Details */}
            <Card>
              <CardHeader>
                <CardTitle>Permit Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted">Permit Type</p>
                    <p className="font-medium">{getPermitTypeLabel(permit.permit_type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Permit Number</p>
                    <p className="font-medium">{permit.permit_number || 'Not assigned'}</p>
                  </div>
                  {permit.project && (
                    <div>
                      <p className="text-sm text-muted">Project</p>
                      <Link
                        to={`/projects/${permit.project.id}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <Building2 className="h-4 w-4" />
                        {permit.project.name}
                      </Link>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted">Status</p>
                    <Badge className={getPermitStatusColor(permit.status)}>
                      {getPermitStatusLabel(permit.status)}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-4">
                    {permit.work_cannot_proceed_without && (
                      <div className="flex items-center gap-2 text-error">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Critical - Work cannot proceed without</span>
                      </div>
                    )}
                    {permit.requires_inspections && (
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Requires inspections</span>
                      </div>
                    )}
                  </div>
                </div>

                {permit.notes && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted mb-2">Notes</p>
                    <p className="text-secondary whitespace-pre-wrap">{permit.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Issuing Authority */}
            <Card>
              <CardHeader>
                <CardTitle>Issuing Authority</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {permit.issuing_agency && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-disabled" />
                    <div>
                      <p className="text-sm text-muted">Agency</p>
                      <p className="font-medium">{permit.issuing_agency}</p>
                    </div>
                  </div>
                )}
                {permit.agency_contact && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-disabled" />
                    <div>
                      <p className="text-sm text-muted">Contact</p>
                      <p className="font-medium">{permit.agency_contact}</p>
                    </div>
                  </div>
                )}
                {permit.agency_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-disabled" />
                    <div>
                      <p className="text-sm text-muted">Phone</p>
                      <a href={`tel:${permit.agency_phone}`} className="font-medium text-primary hover:underline">
                        {permit.agency_phone}
                      </a>
                    </div>
                  </div>
                )}
                {!permit.issuing_agency && !permit.agency_contact && !permit.agency_phone && (
                  <p className="text-muted text-sm">No agency information provided</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Important Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {permit.application_date && (
                  <div>
                    <p className="text-sm text-muted">Application Date</p>
                    <p className="font-medium">
                      {new Date(permit.application_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {permit.issue_date && (
                  <div>
                    <p className="text-sm text-muted">Issue Date</p>
                    <p className="font-medium">
                      {new Date(permit.issue_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {permit.expiration_date && (
                  <div>
                    <p className="text-sm text-muted">Expiration Date</p>
                    <p className={`font-medium flex items-center gap-2 ${
                      expired ? 'text-error' : expiringSoon ? 'text-warning' : ''
                    }`}>
                      {new Date(permit.expiration_date).toLocaleDateString()}
                      {expired && <Badge variant="destructive">Expired</Badge>}
                      {!expired && expiringSoon && (
                        <Badge className="bg-warning-light text-yellow-800">
                          {daysUntilExpiration} days left
                        </Badge>
                      )}
                    </p>
                  </div>
                )}
                {permit.renewal_date && (
                  <div>
                    <p className="text-sm text-muted">Renewal Date</p>
                    <p className="font-medium">
                      {new Date(permit.renewal_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {!permit.application_date && !permit.issue_date && !permit.expiration_date && (
                  <p className="text-muted text-sm">No dates set</p>
                )}
              </CardContent>
            </Card>

            {/* Permit Document */}
            {permit.permit_document_url && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Permit Document
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <a
                    href={permit.permit_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Document
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {permit.created_by_user && (
                  <div>
                    <p className="text-muted">Created By</p>
                    <p className="font-medium">{permit.created_by_user.full_name}</p>
                  </div>
                )}
                {permit.created_at && (
                  <div>
                    <p className="text-muted">Created</p>
                    <p className="font-medium">
                      {new Date(permit.created_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {permit.updated_at && (
                  <div>
                    <p className="text-muted">Last Updated</p>
                    <p className="font-medium">
                      {new Date(permit.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Update Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Permit Status</DialogTitle>
              <DialogDescription>
                Select the new status for this permit.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted mb-3">
                Current status: <Badge className={getPermitStatusColor(permit.status)}>
                  {getPermitStatusLabel(permit.status)}
                </Badge>
              </p>
              <div className="space-y-2">
                {nextStatusOptions.length > 0 ? (
                  nextStatusOptions.map(status => (
                    <Button
                      key={status}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleStatusChange(status)}
                      disabled={updateStatus.isPending}
                    >
                      <Badge className={`mr-2 ${getPermitStatusColor(status)}`}>
                        {getPermitStatusLabel(status)}
                      </Badge>
                    </Button>
                  ))
                ) : (
                  <p className="text-muted text-sm">This permit is in a final state and cannot be updated.</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Permit</DialogTitle>
              <DialogDescription>
                Update the permit details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_permit_name">Permit Name *</Label>
                <Input
                  id="edit_permit_name"
                  value={editForm.permit_name}
                  onChange={(e) => setEditForm({ ...editForm, permit_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_permit_type">Permit Type</Label>
                  <select
                    id="edit_permit_type"
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={editForm.permit_type}
                    onChange={(e) => setEditForm({ ...editForm, permit_type: e.target.value })}
                  >
                    {Object.values(PermitType).map(type => (
                      <option key={type} value={type}>{getPermitTypeLabel(type)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_permit_number">Permit Number</Label>
                  <Input
                    id="edit_permit_number"
                    value={editForm.permit_number}
                    onChange={(e) => setEditForm({ ...editForm, permit_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 heading-card">Issuing Authority</h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="edit_issuing_agency">Agency</Label>
                    <Input
                      id="edit_issuing_agency"
                      value={editForm.issuing_agency}
                      onChange={(e) => setEditForm({ ...editForm, issuing_agency: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_agency_contact">Contact Name</Label>
                      <Input
                        id="edit_agency_contact"
                        value={editForm.agency_contact}
                        onChange={(e) => setEditForm({ ...editForm, agency_contact: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_agency_phone">Phone</Label>
                      <Input
                        id="edit_agency_phone"
                        value={editForm.agency_phone}
                        onChange={(e) => setEditForm({ ...editForm, agency_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 heading-card">Dates</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_application_date">Application Date</Label>
                    <Input
                      id="edit_application_date"
                      type="date"
                      value={editForm.application_date}
                      onChange={(e) => setEditForm({ ...editForm, application_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_issue_date">Issue Date</Label>
                    <Input
                      id="edit_issue_date"
                      type="date"
                      value={editForm.issue_date}
                      onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_expiration_date">Expiration Date</Label>
                    <Input
                      id="edit_expiration_date"
                      type="date"
                      value={editForm.expiration_date}
                      onChange={(e) => setEditForm({ ...editForm, expiration_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_renewal_date">Renewal Date</Label>
                    <Input
                      id="edit_renewal_date"
                      type="date"
                      value={editForm.renewal_date}
                      onChange={(e) => setEditForm({ ...editForm, renewal_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Label htmlFor="edit_renewal_reminder">Renewal Reminder (days before expiration)</Label>
                  <Input
                    id="edit_renewal_reminder"
                    type="number"
                    min="1"
                    max="365"
                    value={editForm.renewal_reminder_days_before}
                    onChange={(e) => setEditForm({ ...editForm, renewal_reminder_days_before: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.work_cannot_proceed_without}
                      onChange={(e) => setEditForm({ ...editForm, work_cannot_proceed_without: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Critical - Work cannot proceed without</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.requires_inspections}
                      onChange={(e) => setEditForm({ ...editForm, requires_inspections: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Requires inspections</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_notes">Notes</Label>
                <Textarea
                  id="edit_notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updatePermit.isPending}>
                {updatePermit.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Permit</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this permit? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deletePermit.isPending}
              >
                {deletePermit.isPending ? 'Deleting...' : 'Delete Permit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}

export default PermitDetailPage
