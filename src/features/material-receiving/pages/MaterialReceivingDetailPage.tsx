/**
 * Material Receiving Detail Page
 *
 * View and manage a single material receipt
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Truck,
  User,
  FileText,
  Camera,
  Pencil,
  Trash2,
  Package,
  Upload,
  Link2,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '../components/StatusBadge'
import { ConditionBadge } from '../components/ConditionBadge'
import { MaterialReceivingForm } from '../components/MaterialReceivingForm'
import {
  useMaterialReceipt,
  useMaterialPhotos,
  useUpdateMaterialReceipt,
  useDeleteMaterialReceipt,
  useUploadMaterialPhoto,
  useDeleteMaterialPhoto,
} from '../hooks/useMaterialReceiving'
import { formatDate, formatDateTime } from '@/lib/utils'
import type { MaterialReceivedPhoto } from '@/types/material-receiving'

export function MaterialReceivingDetailPage() {
  const { projectId, materialId } = useParams<{ projectId: string; materialId: string }>()
  const navigate = useNavigate()

  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPhotoDialog, setShowPhotoDialog] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<MaterialReceivedPhoto | null>(null)

  // Queries
  const { data: material, isLoading, error } = useMaterialReceipt(materialId)
  const { data: photos = [] } = useMaterialPhotos(materialId)

  // Mutations
  const updateMutation = useUpdateMaterialReceipt()
  const deleteMutation = useDeleteMaterialReceipt()
  const uploadPhotoMutation = useUploadMaterialPhoto()
  const deletePhotoMutation = useDeleteMaterialPhoto()

  const handleUpdate = async (data: any) => {
    if (materialId) {
      await updateMutation.mutateAsync({ id: materialId, dto: data })
      setShowEditDialog(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this material receipt?')) {
      await deleteMutation.mutateAsync({ id: materialId!, projectId: projectId! })
      navigate(`/projects/${projectId}/material-receiving`)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || !materialId) return

    for (const file of Array.from(files)) {
      await uploadPhotoMutation.mutateAsync({
        materialReceivedId: materialId,
        file,
        metadata: { photo_type: 'delivery' },
      })
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (confirm('Delete this photo?') && materialId) {
      await deletePhotoMutation.mutateAsync({ id: photoId, materialReceivedId: materialId })
    }
  }

  if (!projectId || !materialId) {
    return <div>Invalid parameters</div>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !material) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Material receipt not found</p>
        <Button variant="link" asChild>
          <Link to={`/projects/${projectId}/material-receiving`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Material Receiving
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link to={`/projects/${projectId}/material-receiving`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{material.material_description}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={material.status} />
            <ConditionBadge condition={material.condition} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(material.delivery_date)}</span>
                  </div>
                </div>
                {material.delivery_time && (
                  <div>
                    <p className="text-sm text-muted-foreground">Delivery Time</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{material.delivery_time}</span>
                    </div>
                  </div>
                )}
                {material.delivery_ticket_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Number</p>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{material.delivery_ticket_number}</span>
                    </div>
                  </div>
                )}
                {material.po_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">PO Number</p>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{material.po_number}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Material Details */}
          <Card>
            <CardHeader>
              <CardTitle>Material Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{material.material_description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {material.quantity && (
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {material.quantity}
                        {material.unit && ` ${material.unit}`}
                      </span>
                    </div>
                  </div>
                )}
                {material.storage_location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Storage Location</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{material.storage_location}</span>
                    </div>
                  </div>
                )}
              </div>
              {material.condition_notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Condition Notes</p>
                  <p className="whitespace-pre-wrap">{material.condition_notes}</p>
                </div>
              )}
              {material.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap">{material.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photos ({photos.length})
              </CardTitle>
              <label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </span>
                </Button>
              </label>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No photos uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={photo.thumbnail_url || photo.photo_url}
                        alt={photo.caption || 'Material photo'}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePhoto(photo.id)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {photo.caption && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {photo.caption}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {material.vendor ? (
                <>
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>{material.vendor}</span>
                  </div>
                  {material.vendor_contact && (
                    <p className="text-sm text-muted-foreground">{material.vendor_contact}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">No vendor specified</p>
              )}
            </CardContent>
          </Card>

          {/* People */}
          <Card>
            <CardHeader>
              <CardTitle>People</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Received By</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{material.received_by_name || 'Not specified'}</span>
                </div>
              </div>
              {material.inspected_by_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Inspected By</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{material.inspected_by_name}</span>
                  </div>
                  {material.inspected_at && (
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(material.inspected_at)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {material.submittal_number ? (
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <Link
                    to={`/projects/${projectId}/submittals/${material.submittal_id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Submittal #{material.submittal_number}
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No linked submittal</p>
              )}
              {material.daily_report_id && (
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <Link
                    to={`/projects/${projectId}/daily-reports/${material.daily_report_id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Daily Report - {formatDate(material.daily_report_date || '')}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p>{formatDateTime(material.created_at)}</p>
                {material.created_by_name && (
                  <p className="text-muted-foreground">by {material.created_by_name}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p>{formatDateTime(material.updated_at)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Material Receipt</DialogTitle>
            <DialogDescription>Update the material delivery details</DialogDescription>
          </DialogHeader>
          <MaterialReceivingForm
            projectId={projectId}
            initialData={material}
            onSubmit={handleUpdate}
            onCancel={() => setShowEditDialog(false)}
            isLoading={updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Photo Viewer Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl">
          {selectedPhoto && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedPhoto.caption || 'Photo'}</DialogTitle>
              </DialogHeader>
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.caption || 'Material photo'}
                className="w-full max-h-[70vh] object-contain"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MaterialReceivingDetailPage
