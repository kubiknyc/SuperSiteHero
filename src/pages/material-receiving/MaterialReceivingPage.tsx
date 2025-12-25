/**
 * Material Receiving Page
 * Main page for managing material deliveries with filtering, search, and CRUD operations
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Filter, Download, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DeliveryCard } from '@/features/material-receiving/components/DeliveryCard';
import { DeliveryForm } from '@/features/material-receiving/components/DeliveryForm';
import {
  useDeliveries,
  useDeliveryStatistics,
  useCreateDelivery,
  useUpdateDelivery,
  useDeleteDelivery,
  useDelivery,
} from '@/features/material-receiving/hooks/useMaterialDeliveries';
import type {
  DeliveryStatus,
  ConditionStatus,
  MaterialCategory,
  CreateMaterialDeliveryDTO,
} from '@/types/material-receiving';
import {
  DELIVERY_STATUSES,
  CONDITION_STATUSES,
  MATERIAL_CATEGORIES,
} from '@/types/material-receiving';

export function MaterialReceivingPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeliveryStatus, setSelectedDeliveryStatus] = useState<DeliveryStatus | 'all'>('all');
  const [selectedConditionStatus, setSelectedConditionStatus] = useState<ConditionStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [deletingDeliveryId, setDeletingDeliveryId] = useState<string | null>(null);

  // Fetch deliveries with filters
  const filters = {
    delivery_status: selectedDeliveryStatus !== 'all' ? selectedDeliveryStatus : undefined,
    condition_status: selectedConditionStatus !== 'all' ? selectedConditionStatus : undefined,
    material_category: selectedCategory !== 'all' ? selectedCategory : undefined,
  };

  const { data: deliveries = [], isLoading, error } = useDeliveries(projectId, filters);
  const { data: statistics } = useDeliveryStatistics(projectId);
  const { data: editingDelivery } = useDelivery(editingDeliveryId || undefined);

  // Mutations
  const createDeliveryMutation = useCreateDelivery();
  const updateDeliveryMutation = useUpdateDelivery();
  const deleteDeliveryMutation = useDeleteDelivery();

  // Search filter (client-side)
  const filteredDeliveries = deliveries.filter((delivery) => {
    if (!searchTerm) {return true;}
    const search = searchTerm.toLowerCase();
    return (
      delivery.material_name.toLowerCase().includes(search) ||
      delivery.vendor_name.toLowerCase().includes(search) ||
      delivery.delivery_ticket_number?.toLowerCase().includes(search) ||
      delivery.material_description?.toLowerCase().includes(search)
    );
  });

  const handleCreateDelivery = async (data: CreateMaterialDeliveryDTO) => {
    await createDeliveryMutation.mutateAsync(data);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateDelivery = async (data: CreateMaterialDeliveryDTO) => {
    if (!editingDeliveryId) {return;}
    await updateDeliveryMutation.mutateAsync({ id: editingDeliveryId, ...data });
    setEditingDeliveryId(null);
  };

  const handleDeleteDelivery = async () => {
    if (!deletingDeliveryId) {return;}
    await deleteDeliveryMutation.mutateAsync(deletingDeliveryId);
    setDeletingDeliveryId(null);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedDeliveryStatus('all');
    setSelectedConditionStatus('all');
    setSelectedCategory('all');
  };

  const hasActiveFilters =
    searchTerm ||
    selectedDeliveryStatus !== 'all' ||
    selectedConditionStatus !== 'all' ||
    selectedCategory !== 'all';

  if (!projectId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">Project not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold heading-page">Material Receiving</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage material deliveries for your project
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Delivery
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_deliveries}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.deliveries_this_week}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unique Vendors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.unique_vendors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Items Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Number(statistics.total_items_received).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Damaged/Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-error">
                {statistics.damaged_deliveries}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by material, vendor, or ticket number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                Active
              </Badge>
            )}
          </Button>

          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filters</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Status</label>
              <Select
                value={selectedDeliveryStatus}
                onValueChange={(value) => setSelectedDeliveryStatus(value as DeliveryStatus | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {DELIVERY_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Condition Status</label>
              <Select
                value={selectedConditionStatus}
                onValueChange={(value) =>
                  setSelectedConditionStatus(value as ConditionStatus | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All conditions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  {CONDITION_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Material Category</label>
              <Select
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value as MaterialCategory | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {MATERIAL_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Count */}
      {!isLoading && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Showing {filteredDeliveries.length} of {deliveries.length} deliveries
          </div>
        </div>
      )}

      {/* Delivery List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Error loading deliveries</p>
            <p className="text-sm mt-2">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </CardContent>
        </Card>
      ) : filteredDeliveries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-muted-foreground space-y-2">
              <p className="text-lg font-medium">No deliveries found</p>
              {hasActiveFilters ? (
                <p className="text-sm">Try adjusting your filters or search terms</p>
              ) : (
                <p className="text-sm">Get started by creating your first delivery</p>
              )}
            </div>
            {!hasActiveFilters && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                New Delivery
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDeliveries.map((delivery) => (
            <DeliveryCard
              key={delivery.id}
              delivery={delivery}
              projectId={projectId}
              onEdit={setEditingDeliveryId}
              onDelete={setDeletingDeliveryId}
            />
          ))}
        </div>
      )}

      {/* Create Delivery Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Delivery</DialogTitle>
            <DialogDescription>
              Record a new material delivery for this project
            </DialogDescription>
          </DialogHeader>
          <DeliveryForm
            projectId={projectId}
            onSubmit={handleCreateDelivery}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={createDeliveryMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Delivery Dialog */}
      <Dialog open={!!editingDeliveryId} onOpenChange={(open) => !open && setEditingDeliveryId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Delivery</DialogTitle>
            <DialogDescription>Update delivery information</DialogDescription>
          </DialogHeader>
          {editingDelivery && (
            <DeliveryForm
              projectId={projectId}
              delivery={editingDelivery}
              onSubmit={handleUpdateDelivery}
              onCancel={() => setEditingDeliveryId(null)}
              isSubmitting={updateDeliveryMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingDeliveryId} onOpenChange={(open) => !open && setDeletingDeliveryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDelivery}
              className="bg-error hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MaterialReceivingPage;
