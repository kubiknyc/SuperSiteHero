/**
 * Photo Management React Query Hooks
 *
 * Provides comprehensive hooks for photo management including:
 * - Photo CRUD operations
 * - Collection management
 * - Before/after comparisons
 * - Photo statistics
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as photoApi from '@/lib/api/services/photo-management'
import type {
  Photo,
  PhotoCollection,
  PhotoComparison,
  PhotoAnnotation,
  PhotoStats,
  LocationCluster,
  CreatePhotoDTO,
  UpdatePhotoDTO,
  CreateCollectionDTO,
  UpdateCollectionDTO,
  CreateComparisonDTO,
  CreateAnnotationDTO,
  PhotoFilters,
  CollectionFilters,
  PhotoAccessAction,
} from '@/types/photo-management'

// Query keys
export const photoKeys = {
  all: ['photos'] as const,
  lists: () => [...photoKeys.all, 'list'] as const,
  list: (filters: PhotoFilters) => [...photoKeys.lists(), filters] as const,
  detail: (id: string) => [...photoKeys.all, 'detail', id] as const,
  stats: (projectId: string) => [...photoKeys.all, 'stats', projectId] as const,
  filterOptions: (projectId: string) => [...photoKeys.all, 'filterOptions', projectId] as const,
  nearLocation: (projectId: string, lat: number, lng: number, radius: number) =>
    [...photoKeys.all, 'nearLocation', projectId, lat, lng, radius] as const,
  clusters: (projectId: string) => [...photoKeys.all, 'clusters', projectId] as const,
  annotations: (photoId: string) => [...photoKeys.all, 'annotations', photoId] as const,
  accessLogs: (photoId: string) => [...photoKeys.all, 'accessLogs', photoId] as const,
}

export const collectionKeys = {
  all: ['photoCollections'] as const,
  lists: () => [...collectionKeys.all, 'list'] as const,
  list: (filters: CollectionFilters) => [...collectionKeys.lists(), filters] as const,
  detail: (id: string) => [...collectionKeys.all, 'detail', id] as const,
  photos: (id: string) => [...collectionKeys.all, 'photos', id] as const,
}

export const comparisonKeys = {
  all: ['photoComparisons'] as const,
  list: (projectId: string) => [...comparisonKeys.all, 'list', projectId] as const,
  detail: (id: string) => [...comparisonKeys.all, 'detail', id] as const,
}

// =============================================
// Photo Query Hooks
// =============================================

/**
 * Get photos with filters
 */
export function usePhotos(filters: PhotoFilters = {}) {
  return useQuery({
    queryKey: photoKeys.list(filters),
    queryFn: () => photoApi.getPhotos(filters),
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Get a single photo
 */
export function usePhoto(id: string | undefined) {
  return useQuery({
    queryKey: photoKeys.detail(id || ''),
    queryFn: () => photoApi.getPhoto(id!),
    enabled: !!id,
  })
}

/**
 * Get photo statistics for a project
 */
export function usePhotoStats(projectId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.stats(projectId || ''),
    queryFn: () => photoApi.getPhotoStats(projectId!),
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Get filter options for a project
 */
export function usePhotoFilterOptions(projectId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.filterOptions(projectId || ''),
    queryFn: () => photoApi.getFilterOptions(projectId!),
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Get photos near a location
 */
export function usePhotosNearLocation(
  projectId: string | undefined,
  latitude: number | undefined,
  longitude: number | undefined,
  radiusMeters: number = 50
) {
  return useQuery({
    queryKey: photoKeys.nearLocation(projectId || '', latitude || 0, longitude || 0, radiusMeters),
    queryFn: () => photoApi.getPhotosNearLocation(projectId!, latitude!, longitude!, radiusMeters),
    enabled: !!projectId && latitude !== undefined && longitude !== undefined,
  })
}

/**
 * Get location clusters for map view
 */
export function useLocationClusters(projectId: string | undefined, clusterRadius: number = 50) {
  return useQuery({
    queryKey: photoKeys.clusters(projectId || ''),
    queryFn: () => photoApi.getLocationClusters(projectId!, clusterRadius),
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Get annotations for a photo
 */
export function usePhotoAnnotations(photoId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.annotations(photoId || ''),
    queryFn: () => photoApi.getPhotoAnnotations(photoId!),
    enabled: !!photoId,
  })
}

/**
 * Get access logs for a photo
 */
export function usePhotoAccessLogs(photoId: string | undefined) {
  return useQuery({
    queryKey: photoKeys.accessLogs(photoId || ''),
    queryFn: () => photoApi.getPhotoAccessLogs(photoId!),
    enabled: !!photoId,
  })
}

// =============================================
// Photo Mutation Hooks
// =============================================

/**
 * Create a new photo
 */
export function useCreatePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreatePhotoDTO) => photoApi.createPhoto(dto),
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() })
      queryClient.invalidateQueries({ queryKey: photoKeys.stats(photo.projectId) })
      toast.success('Photo uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload photo: ${error.message}`)
    },
  })
}

/**
 * Update a photo
 */
export function useUpdatePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePhotoDTO }) =>
      photoApi.updatePhoto(id, dto),
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.detail(photo.id) })
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() })
      toast.success('Photo updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update photo: ${error.message}`)
    },
  })
}

/**
 * Delete a photo
 */
export function useDeletePhoto() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => photoApi.deletePhoto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() })
      toast.success('Photo deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete photo: ${error.message}`)
    },
  })
}

/**
 * Bulk delete photos
 */
export function useBulkDeletePhotos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => photoApi.bulkDeletePhotos(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() })
      toast.success(`${ids.length} photos deleted`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete photos: ${error.message}`)
    },
  })
}

/**
 * Link photo to entity
 */
export function useLinkPhotoToEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      photoId,
      entityType,
      entityId,
    }: {
      photoId: string
      entityType: string
      entityId: string
    }) => photoApi.linkPhotoToEntity(photoId, entityType, entityId),
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.detail(photo.id) })
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() })
      toast.success('Photo linked')
    },
    onError: (error: Error) => {
      toast.error(`Failed to link photo: ${error.message}`)
    },
  })
}

/**
 * Unlink photo from entity
 */
export function useUnlinkPhotoFromEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ photoId, entityType }: { photoId: string; entityType: string }) =>
      photoApi.unlinkPhotoFromEntity(photoId, entityType),
    onSuccess: (photo) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.detail(photo.id) })
      queryClient.invalidateQueries({ queryKey: photoKeys.lists() })
      toast.success('Photo unlinked')
    },
    onError: (error: Error) => {
      toast.error(`Failed to unlink photo: ${error.message}`)
    },
  })
}

/**
 * Create annotation
 */
export function useCreateAnnotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateAnnotationDTO) => photoApi.createAnnotation(dto),
    onSuccess: (annotation) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.annotations(annotation.photoId) })
      toast.success('Annotation added')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add annotation: ${error.message}`)
    },
  })
}

/**
 * Delete annotation
 */
export function useDeleteAnnotation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, photoId }: { id: string; photoId: string }) =>
      photoApi.deleteAnnotation(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: photoKeys.annotations(variables.photoId) })
      toast.success('Annotation deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete annotation: ${error.message}`)
    },
  })
}

/**
 * Log photo access (silent, no toast)
 */
export function useLogPhotoAccess() {
  return useMutation({
    mutationFn: ({
      photoId,
      action,
      context,
    }: {
      photoId: string
      action: PhotoAccessAction
      context?: string
    }) => photoApi.logPhotoAccess(photoId, action, context),
  })
}

// =============================================
// Collection Query Hooks
// =============================================

/**
 * Get collections with filters
 */
export function useCollections(filters: CollectionFilters = {}) {
  return useQuery({
    queryKey: collectionKeys.list(filters),
    queryFn: () => photoApi.getCollections(filters),
    staleTime: 30000,
  })
}

/**
 * Get a single collection
 */
export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: collectionKeys.detail(id || ''),
    queryFn: () => photoApi.getCollection(id!),
    enabled: !!id,
  })
}

/**
 * Get photos in a collection
 */
export function useCollectionPhotos(collectionId: string | undefined) {
  return useQuery({
    queryKey: collectionKeys.photos(collectionId || ''),
    queryFn: () => photoApi.getCollectionPhotos(collectionId!),
    enabled: !!collectionId,
  })
}

// =============================================
// Collection Mutation Hooks
// =============================================

/**
 * Create a collection
 */
export function useCreateCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateCollectionDTO) => photoApi.createCollection(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.lists() })
      toast.success('Collection created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create collection: ${error.message}`)
    },
  })
}

/**
 * Update a collection
 */
export function useUpdateCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCollectionDTO }) =>
      photoApi.updateCollection(id, dto),
    onSuccess: (collection) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(collection.id) })
      queryClient.invalidateQueries({ queryKey: collectionKeys.lists() })
      toast.success('Collection updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update collection: ${error.message}`)
    },
  })
}

/**
 * Delete a collection
 */
export function useDeleteCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => photoApi.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.lists() })
      toast.success('Collection deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete collection: ${error.message}`)
    },
  })
}

/**
 * Add photo to collection
 */
export function useAddPhotoToCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      collectionId,
      photoId,
      customCaption,
    }: {
      collectionId: string
      photoId: string
      customCaption?: string
    }) => photoApi.addPhotoToCollection(collectionId, photoId, customCaption),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.photos(variables.collectionId) })
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(variables.collectionId) })
      toast.success('Photo added to collection')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add photo: ${error.message}`)
    },
  })
}

/**
 * Remove photo from collection
 */
export function useRemovePhotoFromCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ collectionId, photoId }: { collectionId: string; photoId: string }) =>
      photoApi.removePhotoFromCollection(collectionId, photoId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.photos(variables.collectionId) })
      queryClient.invalidateQueries({ queryKey: collectionKeys.detail(variables.collectionId) })
      toast.success('Photo removed from collection')
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove photo: ${error.message}`)
    },
  })
}

/**
 * Reorder photos in collection
 */
export function useReorderCollectionPhotos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ collectionId, photoIds }: { collectionId: string; photoIds: string[] }) =>
      photoApi.reorderCollectionPhotos(collectionId, photoIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: collectionKeys.photos(variables.collectionId) })
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder photos: ${error.message}`)
    },
  })
}

// =============================================
// Comparison Query Hooks
// =============================================

/**
 * Get comparisons for a project
 */
export function useComparisons(projectId: string | undefined) {
  return useQuery({
    queryKey: comparisonKeys.list(projectId || ''),
    queryFn: () => photoApi.getComparisons(projectId!),
    enabled: !!projectId,
    staleTime: 30000,
  })
}

/**
 * Get a single comparison
 */
export function useComparison(id: string | undefined) {
  return useQuery({
    queryKey: comparisonKeys.detail(id || ''),
    queryFn: () => photoApi.getComparison(id!),
    enabled: !!id,
  })
}

// =============================================
// Comparison Mutation Hooks
// =============================================

/**
 * Create a comparison
 */
export function useCreateComparison() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: CreateComparisonDTO) => photoApi.createComparison(dto),
    onSuccess: (comparison) => {
      queryClient.invalidateQueries({ queryKey: comparisonKeys.list(comparison.projectId) })
      toast.success('Comparison created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create comparison: ${error.message}`)
    },
  })
}

/**
 * Complete a comparison (add after photo)
 */
export function useCompleteComparison() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, afterPhotoId }: { id: string; afterPhotoId: string }) =>
      photoApi.completeComparison(id, afterPhotoId),
    onSuccess: (comparison) => {
      queryClient.invalidateQueries({ queryKey: comparisonKeys.detail(comparison.id) })
      queryClient.invalidateQueries({ queryKey: comparisonKeys.list(comparison.projectId) })
      toast.success('Comparison completed')
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete comparison: ${error.message}`)
    },
  })
}

/**
 * Delete a comparison
 */
export function useDeleteComparison() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => photoApi.deleteComparison(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comparisonKeys.all })
      toast.success('Comparison deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete comparison: ${error.message}`)
    },
  })
}
