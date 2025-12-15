/**
 * Unified Photos Hooks
 * React Query hooks for the Photo Evidence Hub system
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { unifiedPhotosApi } from '@/lib/api/services/unified-photos';
import type {
  PhotoEntityType,
  LinkPhotoToEntityDTO,
  BulkLinkPhotosDTO,
  PhotoHubFilters,
  CreateUploadBatchDTO,
  UpdateBatchProgressDTO,
} from '@/types/unified-photos';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const unifiedPhotosKeys = {
  all: ['unified-photos'] as const,
  links: () => [...unifiedPhotosKeys.all, 'links'] as const,
  linksByEntity: (entityType: PhotoEntityType, entityId: string) =>
    [...unifiedPhotosKeys.links(), entityType, entityId] as const,
  linksByPhoto: (photoId: string) =>
    [...unifiedPhotosKeys.links(), 'photo', photoId] as const,
  hub: () => [...unifiedPhotosKeys.all, 'hub'] as const,
  hubPhotos: (filters: PhotoHubFilters) =>
    [...unifiedPhotosKeys.hub(), 'photos', filters] as const,
  hubStats: (projectId: string) =>
    [...unifiedPhotosKeys.hub(), 'stats', projectId] as const,
  batches: () => [...unifiedPhotosKeys.all, 'batches'] as const,
  batchesByProject: (projectId: string) =>
    [...unifiedPhotosKeys.batches(), projectId] as const,
  batch: (batchId: string) =>
    [...unifiedPhotosKeys.batches(), batchId] as const,
};

// =============================================================================
// PHOTO ENTITY LINKS HOOKS
// =============================================================================

/**
 * Get photos linked to a specific entity
 */
export function usePhotosForEntity(entityType: PhotoEntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: unifiedPhotosKeys.linksByEntity(entityType, entityId || ''),
    queryFn: () => unifiedPhotosApi.links.getPhotosForEntity(entityType, entityId!),
    enabled: !!entityId,
  });
}

/**
 * Get all entities linked to a photo
 */
export function useEntitiesForPhoto(photoId: string | undefined) {
  return useQuery({
    queryKey: unifiedPhotosKeys.linksByPhoto(photoId || ''),
    queryFn: () => unifiedPhotosApi.links.getEntitiesForPhoto(photoId!),
    enabled: !!photoId,
  });
}

/**
 * Link a photo to an entity
 */
export function useLinkPhotoToEntity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: LinkPhotoToEntityDTO) =>
      unifiedPhotosApi.links.linkPhotoToEntity(dto),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.linksByEntity(variables.entity_type, variables.entity_id),
      });
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.linksByPhoto(variables.photo_id),
      });
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.hub(),
      });
      toast({
        title: 'Photo linked',
        description: 'Photo has been linked to the entity.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link photo.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Unlink a photo from an entity
 */
export function useUnlinkPhotoFromEntity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (linkId: string) =>
      unifiedPhotosApi.links.unlinkPhotoFromEntity(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.links(),
      });
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.hub(),
      });
      toast({
        title: 'Photo unlinked',
        description: 'Photo has been unlinked from the entity.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unlink photo.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Bulk link photos to an entity
 */
export function useBulkLinkPhotos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: BulkLinkPhotosDTO) =>
      unifiedPhotosApi.links.bulkLinkPhotos(dto),
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.linksByEntity(variables.entity_type, variables.entity_id),
      });
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.hub(),
      });
      toast({
        title: 'Photos linked',
        description: `${count} photo(s) have been linked.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to link photos.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Set a photo as primary for an entity
 */
export function useSetPrimaryPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      entityType,
      entityId,
      photoId,
    }: {
      entityType: PhotoEntityType;
      entityId: string;
      photoId: string;
    }) => unifiedPhotosApi.links.setPrimaryPhoto(entityType, entityId, photoId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.linksByEntity(variables.entityType, variables.entityId),
      });
      toast({
        title: 'Primary photo set',
        description: 'The primary photo has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to set primary photo.',
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// PHOTO HUB HOOKS
// =============================================================================

/**
 * Get photos with entity information for the hub view
 */
export function usePhotoHubPhotos(filters: PhotoHubFilters) {
  return useQuery({
    queryKey: unifiedPhotosKeys.hubPhotos(filters),
    queryFn: () => unifiedPhotosApi.hub.getPhotosWithEntities(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * Get photo hub statistics
 */
export function usePhotoHubStats(projectId: string | undefined) {
  return useQuery({
    queryKey: unifiedPhotosKeys.hubStats(projectId || ''),
    queryFn: () => unifiedPhotosApi.hub.getStats(projectId!),
    enabled: !!projectId,
  });
}

// =============================================================================
// UPLOAD BATCH HOOKS
// =============================================================================

/**
 * Get upload batches for a project
 */
export function useUploadBatches(projectId: string | undefined) {
  return useQuery({
    queryKey: unifiedPhotosKeys.batchesByProject(projectId || ''),
    queryFn: () => unifiedPhotosApi.batches.getBatches(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Get a specific upload batch
 */
export function useUploadBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: unifiedPhotosKeys.batch(batchId || ''),
    queryFn: () => unifiedPhotosApi.batches.getBatch(batchId!),
    enabled: !!batchId,
    refetchInterval: (data) => {
      // Auto-refetch while batch is processing
      if (data?.status === 'processing') return 2000;
      return false;
    },
  });
}

/**
 * Create an upload batch
 */
export function useCreateUploadBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateUploadBatchDTO) =>
      unifiedPhotosApi.batches.createBatch(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.batchesByProject(data.project_id),
      });
    },
  });
}

/**
 * Update upload batch progress
 */
export function useUpdateBatchProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      batchId,
      dto,
    }: {
      batchId: string;
      dto: UpdateBatchProgressDTO;
    }) => unifiedPhotosApi.batches.updateProgress(batchId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: unifiedPhotosKeys.batch(data.id),
      });
    },
  });
}

// =============================================================================
// DEDUPLICATION HOOKS
// =============================================================================

/**
 * Find duplicate photos
 */
export function useFindDuplicates() {
  return useMutation({
    mutationFn: ({
      projectId,
      phash,
      threshold,
    }: {
      projectId: string;
      phash: string;
      threshold?: number;
    }) => unifiedPhotosApi.deduplication.findDuplicates(projectId, phash, threshold),
  });
}

/**
 * Check for exact file duplicate
 */
export function useCheckExactDuplicate() {
  return useMutation({
    mutationFn: (fileHash: string) =>
      unifiedPhotosApi.deduplication.checkExactDuplicate(fileHash),
  });
}

/**
 * Store photo hash
 */
export function useStorePhotoHash() {
  return useMutation({
    mutationFn: ({
      photoId,
      phash,
      dhash,
      ahash,
      fileHash,
    }: {
      photoId: string;
      phash: string;
      dhash?: string;
      ahash?: string;
      fileHash?: string;
    }) => unifiedPhotosApi.deduplication.storeHash(photoId, phash, dhash, ahash, fileHash),
  });
}
