/**
 * Material Receiving Detail Page
 * Displays detailed information about a single material delivery
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Truck,
  User,
  FileText,
  Camera,
  Package,
  DollarSign,
  AlertCircle,
  Link2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DeliveryStatusBadge } from '@/features/material-receiving/components/DeliveryStatusBadge';
import { ConditionStatusBadge } from '@/features/material-receiving/components/ConditionStatusBadge';
import { DeliveryForm } from '@/features/material-receiving/components/DeliveryForm';
import {
  useDelivery,
  useDeliveryPhotos,
  useUpdateDelivery,
  useDeleteDelivery,
} from '@/features/material-receiving/hooks/useMaterialDeliveries';
import type { CreateMaterialDeliveryDTO } from '@/types/material-receiving';

export function MaterialReceivingDetailPage() {
  const { projectId, materialId } = useParams<{ projectId: string; materialId: string }>();
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const { data: delivery, isLoading, error } = useDelivery(materialId);
  const { data: photos = [] } = useDeliveryPhotos(materialId);
  const updateDeliveryMutation = useUpdateDelivery();
  const deleteDeliveryMutation = useDeleteDelivery();

  const handleUpdateDelivery = async (data: CreateMaterialDeliveryDTO) => {
    if (!materialId) return;
    await updateDeliveryMutation.mutateAsync({ id: materialId, ...data });
    setIsEditDialogOpen(false);
  };

  const handleDeleteDelivery = async () => {
    if (!materialId || !projectId) return;
    await deleteDeliveryMutation.mutateAsync(materialId);
    navigate(`/projects/${projectId}/material-receiving`);
  };

  if (!projectId || !materialId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">Invalid delivery ID</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">Delivery not found</p>
            <p className="text-sm mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
            <Button asChild className="mt-4">
              <Link to={`/projects/${projectId}/material-receiving`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Material Receiving
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasIssues = delivery.condition_status !== 'good' || (delivery.quantity_rejected || 0) > 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/projects/${projectId}/material-receiving`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Material Receiving
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{delivery.material_name}</h1>
          <div className="flex items-center gap-2">
            <DeliveryStatusBadge status={delivery.delivery_status} />
            <ConditionStatusBadge status={delivery.condition_status} />
            {delivery.material_category && (
              <Badge variant="outline">{delivery.material_category}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Issues Warning */}
      {hasIssues && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-yellow-800">Issues Detected</div>
              {delivery.condition_status !== 'good' && (
                <div className="text-sm text-yellow-700 mt-1">
                  Condition: {delivery.condition_status}
                </div>
              )}
              {(delivery.quantity_rejected || 0) > 0 && (
                <div className="text-sm text-yellow-700 mt-1">
                  {delivery.quantity_rejected} {delivery.unit_of_measure} rejected
                </div>
              )}
              {delivery.condition_notes && (
                <div className="text-sm text-yellow-700 mt-2 border-t border-yellow-200 pt-2">
                  {delivery.condition_notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Delivery Date</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(delivery.delivery_date), 'MMMM d, yyyy')}
                  </div>
                </div>
              </div>

              {delivery.delivery_time && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Delivery Time</div>
                    <div className="text-sm text-muted-foreground">
                      {delivery.delivery_time.slice(0, 5)}
                    </div>
                  </div>
                </div>
              )}

              {delivery.delivery_ticket_number && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Ticket Number</div>
                    <div className="text-sm text-muted-foreground">
                      {delivery.delivery_ticket_number}
                    </div>
                  </div>
                </div>
              )}

              {delivery.purchase_order_number && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Purchase Order</div>
                    <div className="text-sm text-muted-foreground">
                      {delivery.purchase_order_number}
                    </div>
                  </div>
                </div>
              )}

              {delivery.received_by_name && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Received By</div>
                    <div className="text-sm text-muted-foreground">
                      {delivery.received_by_name}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor Information */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Vendor Name</div>
                  <div className="text-sm text-muted-foreground">{delivery.vendor_name}</div>
                </div>
              </div>

              {(delivery.vendor_contact_name || delivery.vendor_contact_phone || delivery.vendor_contact_email) && (
                <div className="border-t pt-4 space-y-2">
                  {delivery.vendor_contact_name && (
                    <div className="text-sm">
                      <span className="font-medium">Contact: </span>
                      {delivery.vendor_contact_name}
                    </div>
                  )}
                  {delivery.vendor_contact_phone && (
                    <div className="text-sm">
                      <span className="font-medium">Phone: </span>
                      {delivery.vendor_contact_phone}
                    </div>
                  )}
                  {delivery.vendor_contact_email && (
                    <div className="text-sm">
                      <span className="font-medium">Email: </span>
                      <a href={`mailto:${delivery.vendor_contact_email}`} className="text-blue-600 hover:underline">
                        {delivery.vendor_contact_email}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material Details */}
          <Card>
            <CardHeader>
              <CardTitle>Material Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {delivery.material_description && (
                <div>
                  <div className="text-sm font-medium mb-1">Description</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {delivery.material_description}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Quantity Delivered</div>
                    <div className="text-sm text-muted-foreground">
                      {delivery.quantity_delivered} {delivery.unit_of_measure}
                    </div>
                  </div>
                </div>

                {delivery.quantity_ordered && (
                  <div>
                    <div className="text-sm font-medium">Quantity Ordered</div>
                    <div className="text-sm text-muted-foreground">
                      {delivery.quantity_ordered} {delivery.unit_of_measure}
                    </div>
                  </div>
                )}

                {(delivery.quantity_rejected || 0) > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-600">Quantity Rejected</div>
                    <div className="text-sm text-red-600">
                      {delivery.quantity_rejected} {delivery.unit_of_measure}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          {photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photos ({photos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedPhotoIndex(index)}
                    >
                      <img
                        src={photo.photo_url}
                        alt={photo.caption || 'Delivery photo'}
                        className="w-full h-full object-cover"
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2">
                          {photo.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Notes */}
          {delivery.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {delivery.notes}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cost Summary */}
          {(delivery.unit_cost || delivery.total_cost) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cost Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {delivery.unit_cost && (
                  <div>
                    <div className="text-sm font-medium">Unit Cost</div>
                    <div className="text-lg font-bold">
                      ${delivery.unit_cost.toFixed(2)} / {delivery.unit_of_measure}
                    </div>
                  </div>
                )}
                {delivery.total_cost && (
                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium">Total Cost</div>
                    <div className="text-2xl font-bold">${delivery.total_cost.toLocaleString()}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Storage Location */}
          {(delivery.storage_location || delivery.storage_bin_number) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Storage Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {delivery.storage_location && (
                  <div>
                    <div className="text-sm font-medium">Location</div>
                    <div className="text-sm text-muted-foreground">{delivery.storage_location}</div>
                  </div>
                )}
                {delivery.storage_bin_number && (
                  <div>
                    <div className="text-sm font-medium">Bin/Rack Number</div>
                    <div className="text-sm text-muted-foreground">{delivery.storage_bin_number}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Linked Items */}
          {(delivery.submittal_id || delivery.daily_report_id) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Linked Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {delivery.submittal_id && (
                  <div className="text-sm">
                    <Link
                      to={`/submittals/${delivery.submittal_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Submittal
                    </Link>
                  </div>
                )}
                {delivery.daily_report_id && (
                  <div className="text-sm">
                    <Link
                      to={`/daily-reports/${delivery.daily_report_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Daily Report
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Created: </span>
                <span className="text-muted-foreground">
                  {format(new Date(delivery.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
              {delivery.updated_at && (
                <div>
                  <span className="font-medium">Updated: </span>
                  <span className="text-muted-foreground">
                    {format(new Date(delivery.updated_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
          </DialogHeader>
          <DeliveryForm
            projectId={projectId}
            delivery={delivery}
            onSubmit={handleUpdateDelivery}
            onCancel={() => setIsEditDialogOpen(false)}
            isSubmitting={updateDeliveryMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery? This action cannot be undone and will also delete all associated photos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDelivery}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo Viewer Dialog */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
        <Dialog open onOpenChange={() => setSelectedPhotoIndex(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {photos[selectedPhotoIndex].caption || `Photo ${selectedPhotoIndex + 1} of ${photos.length}`}
              </DialogTitle>
            </DialogHeader>
            <div className="relative">
              <img
                src={photos[selectedPhotoIndex].photo_url}
                alt={photos[selectedPhotoIndex].caption || 'Delivery photo'}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedPhotoIndex(Math.max(0, selectedPhotoIndex - 1))}
                disabled={selectedPhotoIndex === 0}
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                {selectedPhotoIndex + 1} of {photos.length}
              </div>
              <Button
                variant="outline"
                onClick={() => setSelectedPhotoIndex(Math.min(photos.length - 1, selectedPhotoIndex + 1))}
                disabled={selectedPhotoIndex === photos.length - 1}
              >
                Next
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default MaterialReceivingDetailPage;
