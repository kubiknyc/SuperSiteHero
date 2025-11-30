/**
 * Material Receiving React Query Hooks
 *
 * Query and mutation hooks for material delivery tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { materialReceivingApi } from '@/lib/api/services/material-receiving'
import { useToast } from '@/components/ui/use-toast'
import type {
  MaterialReceivedFilters,
  CreateMaterialReceivedDTO,
  UpdateMaterialReceivedDTO,
  CreateMaterialPhotoDTO,
  UpdateMaterialPhotoDTO,
  MaterialStatus,
  MaterialCondition,
} from '@/types/material-receiving'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const materialReceivingKeys = {
  all: ['material-receiving'] as const,
  lists: () => [...materialReceivingKeys.all, 'list'] as const,
  list: (filters: MaterialReceivedFilters) => [...materialReceivingKeys.lists(), filters] as const,
  details: () => [...materialReceivingKeys.all, 'detail'] as const,
  detail: (id: string) => [...materialReceivingKeys.details(), id] as const,
  photos: (materialReceivedId: string) => [...materialReceivingKeys.all, 'photos', materialReceivedId] as const,
  stats: (projectId: string) => [...materialReceivingKeys.all, 'stats', projectId] as const,
  vendors: (projectId: string) => [...materialReceivingKeys.all, 'vendors', projectId] as const,
  storageLocations: (projectId: string) => [...materialReceivingKeys.all, 'storage-locations', projectId] as const,
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get all material receipts with optional filters
 */
export function useMaterialReceipts(filters: MaterialReceivedFilters) {
  return useQuery({
    queryKey: materialReceivingKeys.list(filters),
    queryFn: () => materialReceivingApi.getMaterialReceipts(filters),
    enabled: !!filters.projectId,
  })
}

/**
 * Get a single material receipt by ID
 */
export function useMaterialReceipt(id: string | undefined) {
  return useQuery({
    queryKey: materialReceivingKeys.detail(id || ''),
    queryFn: () => materialReceivingApi.getMaterialReceipt(id!),
    enabled: !!id,
  })
}

/**
 * Get photos for a material receipt
 */
export function useMaterialPhotos(materialReceivedId: string | undefined) {
  return useQuery({
    queryKey: materialReceivingKeys.photos(materialReceivedId || ''),
    queryFn: () => materialReceivingApi.getPhotos(materialReceivedId!),
    enabled: !!materialReceivedId,
  })
}

/**
 * Get statistics for a project
 */
export function useMaterialReceivingStats(projectId: string | undefined) {
  return useQuery({
    queryKey: materialReceivingKeys.stats(projectId || ''),
    queryFn: () => materialReceivingApi.getStats(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Get unique vendors for autocomplete
 */
export function useMaterialVendors(projectId: string | undefined) {
  return useQuery({
    queryKey: materialReceivingKeys.vendors(projectId || ''),
    queryFn: () => materialReceivingApi.getVendors(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Get unique storage locations for autocomplete
 */
export function useMaterialStorageLocations(projectId: string | undefined) {
  return useQuery({
    queryKey: materialReceivingKeys.storageLocations(projectId || ''),
    queryFn: () => materialReceivingApi.getStorageLocations(projectId!),
    enabled: !!projectId,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new material receipt
 */
export function useCreateMaterialReceipt() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateMaterialReceivedDTO) => materialReceivingApi.createMaterialReceipt(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.stats(data.project_id) })
      toast({
        title: 'Material received',
        description: 'Material delivery has been logged successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to log material delivery.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a material receipt
 */
export function useUpdateMaterialReceipt() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMaterialReceivedDTO }) =>
      materialReceivingApi.updateMaterialReceipt(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.stats(data.project_id) })
      toast({
        title: 'Updated',
        description: 'Material receipt has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update material receipt.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a material receipt
 */
export function useDeleteMaterialReceipt() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId: string }) =>
      materialReceivingApi.deleteMaterialReceipt(id).then(() => projectId),
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.stats(projectId) })
      toast({
        title: 'Deleted',
        description: 'Material receipt has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete material receipt.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update material status
 */
export function useUpdateMaterialStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      status,
      inspectedBy,
    }: {
      id: string
      status: MaterialStatus
      inspectedBy?: string
    }) => materialReceivingApi.updateStatus(id, status, inspectedBy),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.stats(data.project_id) })
      toast({
        title: 'Status updated',
        description: `Material status changed to ${data.status}.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update material condition
 */
export function useUpdateMaterialCondition() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      condition,
      notes,
    }: {
      id: string
      condition: MaterialCondition
      notes?: string
    }) => materialReceivingApi.updateCondition(id, condition, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.stats(data.project_id) })
      toast({
        title: 'Condition updated',
        description: `Material condition set to ${data.condition}.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update condition.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// PHOTO MUTATION HOOKS
// ============================================================================

/**
 * Add a photo to material receipt
 */
export function useAddMaterialPhoto() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateMaterialPhotoDTO) => materialReceivingApi.addPhoto(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: materialReceivingKeys.photos(data.material_received_id),
      })
      queryClient.invalidateQueries({
        queryKey: materialReceivingKeys.detail(data.material_received_id),
      })
      toast({
        title: 'Photo added',
        description: 'Photo has been added successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add photo.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Upload and add a photo
 */
export function useUploadMaterialPhoto() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      materialReceivedId,
      file,
      metadata,
    }: {
      materialReceivedId: string
      file: File
      metadata?: Partial<CreateMaterialPhotoDTO>
    }) => materialReceivingApi.uploadPhoto(materialReceivedId, file, metadata),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: materialReceivingKeys.photos(data.material_received_id),
      })
      queryClient.invalidateQueries({
        queryKey: materialReceivingKeys.detail(data.material_received_id),
      })
      toast({
        title: 'Photo uploaded',
        description: 'Photo has been uploaded successfully.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload photo.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a photo
 */
export function useUpdateMaterialPhoto() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      materialReceivedId,
      dto,
    }: {
      id: string
      materialReceivedId: string
      dto: UpdateMaterialPhotoDTO
    }) => materialReceivingApi.updatePhoto(id, dto).then((data) => ({ ...data, materialReceivedId })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: materialReceivingKeys.photos(data.materialReceivedId),
      })
      toast({
        title: 'Photo updated',
        description: 'Photo has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update photo.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a photo
 */
export function useDeleteMaterialPhoto() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, materialReceivedId }: { id: string; materialReceivedId: string }) =>
      materialReceivingApi.deletePhoto(id).then(() => materialReceivedId),
    onSuccess: (materialReceivedId) => {
      queryClient.invalidateQueries({
        queryKey: materialReceivingKeys.photos(materialReceivedId),
      })
      queryClient.invalidateQueries({
        queryKey: materialReceivingKeys.detail(materialReceivedId),
      })
      toast({
        title: 'Photo deleted',
        description: 'Photo has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete photo.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// LINKING HOOKS
// ============================================================================

/**
 * Link material to submittal
 */
export function useLinkToSubmittal() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, submittalProcurementId }: { id: string; submittalProcurementId: string }) =>
      materialReceivingApi.linkToSubmittal(id, submittalProcurementId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.lists() })
      toast({
        title: 'Linked',
        description: 'Material linked to submittal.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link material.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Unlink material from submittal
 */
export function useUnlinkFromSubmittal() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => materialReceivingApi.unlinkFromSubmittal(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: materialReceivingKeys.lists() })
      toast({
        title: 'Unlinked',
        description: 'Material unlinked from submittal.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlink material.',
        variant: 'destructive',
      })
    },
  })
}
