/**
 * Material Deliveries React Query Hooks
 * Comprehensive hooks for material receiving tracker with caching and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';
import * as api from '@/lib/api/services/material-deliveries';
import type {
  MaterialDelivery,
  MaterialDeliveryPhoto,
  MaterialDeliveryWithPhotos,
  MaterialDeliveryWithRelations,
  CreateMaterialDeliveryDTO,
  UpdateMaterialDeliveryDTO,
  CreateMaterialDeliveryPhotoDTO,
  UpdateMaterialDeliveryPhotoDTO,
  DeliveryStatistics,
  DeliveryStatus,
  ConditionStatus,
  MaterialCategory,
} from '@/types/material-receiving';

// =====================================================
// QUERY HOOKS - Fetching Data
// =====================================================

/**
 * Fetch all deliveries for a project
 */
export function useDeliveries(
  projectId: string | undefined,
  filters?: {
    delivery_status?: DeliveryStatus | DeliveryStatus[];
    condition_status?: ConditionStatus | ConditionStatus[];
    material_category?: MaterialCategory | string;
    vendor_name?: string;
    storage_location?: string;
    date_from?: string;
    date_to?: string;
    has_issues?: boolean;
  }
) {
  return useQuery({
    queryKey: ['material-deliveries', projectId, filters],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const { data, error } = await api.getDeliveries(projectId, filters);
      if (error) throw error;
      return data as MaterialDelivery[];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a single delivery by ID
 */
export function useDelivery(deliveryId: string | undefined) {
  return useQuery({
    queryKey: ['material-deliveries', deliveryId],
    queryFn: async () => {
      if (!deliveryId) throw new Error('Delivery ID required');

      const { data, error } = await api.getDelivery(deliveryId);
      if (error) throw error;
      return data as MaterialDelivery;
    },
    enabled: !!deliveryId,
  });
}

/**
 * Fetch delivery with photos
 */
export function useDeliveryWithPhotos(deliveryId: string | undefined) {
  return useQuery({
    queryKey: ['material-deliveries', deliveryId, 'with-photos'],
    queryFn: async () => {
      if (!deliveryId) throw new Error('Delivery ID required');

      const { data, error } = await api.getDeliveryWithPhotos(deliveryId);
      if (error) throw error;
      return data as MaterialDeliveryWithPhotos;
    },
    enabled: !!deliveryId,
  });
}

/**
 * Fetch delivery with all relations
 */
export function useDeliveryWithRelations(deliveryId: string | undefined) {
  return useQuery({
    queryKey: ['material-deliveries', deliveryId, 'with-relations'],
    queryFn: async () => {
      if (!deliveryId) throw new Error('Delivery ID required');

      const { data, error } = await api.getDeliveryWithRelations(deliveryId);
      if (error) throw error;
      return data as MaterialDeliveryWithRelations;
    },
    enabled: !!deliveryId,
  });
}

/**
 * Search deliveries
 */
export function useSearchDeliveries(projectId: string | undefined, searchTerm: string) {
  return useQuery({
    queryKey: ['material-deliveries', projectId, 'search', searchTerm],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      if (!searchTerm) return [];

      const { data, error } = await api.searchDeliveries(projectId, searchTerm);
      if (error) throw error;
      return data as MaterialDelivery[];
    },
    enabled: !!projectId && !!searchTerm,
  });
}

/**
 * Fetch deliveries by vendor
 */
export function useDeliveriesByVendor(projectId: string | undefined, vendorName: string | undefined) {
  return useQuery({
    queryKey: ['material-deliveries', projectId, 'vendor', vendorName],
    queryFn: async () => {
      if (!projectId || !vendorName) throw new Error('Project ID and vendor name required');

      const { data, error } = await api.getDeliveriesByVendor(projectId, vendorName);
      if (error) throw error;
      return data as MaterialDelivery[];
    },
    enabled: !!projectId && !!vendorName,
  });
}

/**
 * Fetch deliveries with issues
 */
export function useDeliveriesWithIssues(projectId: string | undefined) {
  return useQuery({
    queryKey: ['material-deliveries', projectId, 'issues'],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const { data, error } = await api.getDeliveriesWithIssues(projectId);
      if (error) throw error;
      return data as MaterialDelivery[];
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch delivery statistics
 */
export function useDeliveryStatistics(projectId: string | undefined) {
  return useQuery({
    queryKey: ['material-deliveries', projectId, 'statistics'],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const { data, error } = await api.getDeliveryStatistics(projectId);
      if (error) throw error;
      return data as DeliveryStatistics;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Fetch unique vendors
 */
export function useUniqueVendors(projectId: string | undefined) {
  return useQuery({
    queryKey: ['material-deliveries', projectId, 'vendors'],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const { data, error } = await api.getUniqueVendors(projectId);
      if (error) throw error;
      return data as string[];
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch unique storage locations
 */
export function useUniqueStorageLocations(projectId: string | undefined) {
  return useQuery({
    queryKey: ['material-deliveries', projectId, 'storage-locations'],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const { data, error } = await api.getUniqueStorageLocations(projectId);
      if (error) throw error;
      return data as string[];
    },
    enabled: !!projectId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch delivery photos
 */
export function useDeliveryPhotos(deliveryId: string | undefined) {
  return useQuery({
    queryKey: ['material-delivery-photos', deliveryId],
    queryFn: async () => {
      if (!deliveryId) throw new Error('Delivery ID required');

      const { data, error } = await api.getDeliveryPhotos(deliveryId);
      if (error) throw error;
      return data as MaterialDeliveryPhoto[];
    },
    enabled: !!deliveryId,
  });
}

// =====================================================
// MUTATION HOOKS - Creating/Updating/Deleting
// =====================================================

/**
 * Create a new delivery
 */
export function useCreateDelivery() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (delivery: CreateMaterialDeliveryDTO) => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found');
      }

      const { data, error } = await api.createDelivery(delivery, userProfile.company_id);
      if (error) throw error;
      return data as MaterialDelivery;
    },
    onSuccess: (data) => {
      // Invalidate and refetch deliveries list
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id, 'statistics'] });

      toast.success('Delivery created', {
        description: `${data.material_name} from ${data.vendor_name}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to create delivery', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

/**
 * Update an existing delivery
 */
export function useUpdateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (delivery: UpdateMaterialDeliveryDTO) => {
      const { data, error } = await api.updateDelivery(delivery);
      if (error) throw error;
      return data as MaterialDelivery;
    },
    onSuccess: (data) => {
      // Invalidate specific delivery
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.id, 'with-photos'] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.id, 'with-relations'] });

      // Invalidate project deliveries list
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id, 'statistics'] });

      toast.success('Delivery updated', {
        description: `Updated ${data.material_name}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to update delivery', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

/**
 * Delete a delivery (soft delete)
 */
export function useDeleteDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deliveryId: string) => {
      const { data, error } = await api.deleteDelivery(deliveryId);
      if (error) throw error;
      return data as MaterialDelivery;
    },
    onSuccess: (data) => {
      // Invalidate project deliveries list
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id, 'statistics'] });

      // Remove from cache
      queryClient.removeQueries({ queryKey: ['material-deliveries', data.id] });

      toast.success('Delivery deleted', {
        description: `Removed ${data.material_name}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to delete delivery', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

/**
 * Create a delivery photo
 */
export function useCreateDeliveryPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: CreateMaterialDeliveryPhotoDTO) => {
      const { data, error } = await api.createDeliveryPhoto(photo);
      if (error) throw error;
      return data as MaterialDeliveryPhoto;
    },
    onSuccess: (data) => {
      // Invalidate photos list
      queryClient.invalidateQueries({ queryKey: ['material-delivery-photos', data.delivery_id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.delivery_id, 'with-photos'] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.delivery_id, 'with-relations'] });

      toast.success('Photo uploaded', {
        description: 'Photo added to delivery',
      });
    },
    onError: (error) => {
      toast.error('Failed to upload photo', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

/**
 * Update a delivery photo
 */
export function useUpdateDeliveryPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: UpdateMaterialDeliveryPhotoDTO) => {
      const { data, error } = await api.updateDeliveryPhoto(photo);
      if (error) throw error;
      return data as MaterialDeliveryPhoto;
    },
    onSuccess: (data) => {
      // Invalidate photos list
      queryClient.invalidateQueries({ queryKey: ['material-delivery-photos', data.delivery_id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.delivery_id, 'with-photos'] });

      toast.success('Photo updated', {
        description: 'Photo details updated',
      });
    },
    onError: (error) => {
      toast.error('Failed to update photo', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

/**
 * Delete a delivery photo
 */
export function useDeleteDeliveryPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photoId: string) => {
      const { data, error } = await api.deleteDeliveryPhoto(photoId);
      if (error) throw error;
      return data as MaterialDeliveryPhoto;
    },
    onSuccess: (data) => {
      // Invalidate photos list
      queryClient.invalidateQueries({ queryKey: ['material-delivery-photos', data.delivery_id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.delivery_id, 'with-photos'] });

      toast.success('Photo deleted', {
        description: 'Photo removed from delivery',
      });
    },
    onError: (error) => {
      toast.error('Failed to delete photo', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

/**
 * Upload a delivery photo file
 */
export function useUploadDeliveryPhoto() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async ({ file, deliveryId }: { file: File; deliveryId: string }) => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found');
      }

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await api.uploadDeliveryPhotoFile(
        file,
        userProfile.company_id,
        deliveryId
      );
      if (uploadError) throw uploadError;
      if (!uploadData) throw new Error('Failed to upload file');

      // Create photo record
      const { data: photoData, error: photoError } = await api.createDeliveryPhoto({
        delivery_id: deliveryId,
        photo_url: uploadData.url,
        photo_type: 'material_condition', // Default type
        file_name: file.name,
        file_size: file.size,
      });
      if (photoError) throw photoError;

      return photoData as MaterialDeliveryPhoto;
    },
    onSuccess: (data) => {
      // Invalidate photos list
      queryClient.invalidateQueries({ queryKey: ['material-delivery-photos', data.delivery_id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.delivery_id, 'with-photos'] });

      toast.success('Photo uploaded', {
        description: 'Photo added successfully',
      });
    },
    onError: (error) => {
      toast.error('Failed to upload photo', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });
}

// =====================================================
// NOTIFICATION VARIANTS (without toast)
// =====================================================

/**
 * Create delivery without toast notification
 */
export function useCreateDeliverySilent() {
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  return useMutation({
    mutationFn: async (delivery: CreateMaterialDeliveryDTO) => {
      if (!userProfile?.company_id) {
        throw new Error('No company ID found');
      }

      const { data, error } = await api.createDelivery(delivery, userProfile.company_id);
      if (error) throw error;
      return data as MaterialDelivery;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id, 'statistics'] });
    },
  });
}

/**
 * Update delivery without toast notification
 */
export function useUpdateDeliverySilent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (delivery: UpdateMaterialDeliveryDTO) => {
      const { data, error } = await api.updateDelivery(delivery);
      if (error) throw error;
      return data as MaterialDelivery;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['material-deliveries', data.project_id, 'statistics'] });
    },
  });
}
