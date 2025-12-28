/**
 * Photo Progress React Query Hooks
 *
 * Query and mutation hooks for managing photo progress tracking,
 * locations, comparisons, and reports.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { photoProgressApi } from '@/lib/api/services/photo-progress';
import { useToast } from '@/components/ui/use-toast';

import type {
  PhotoLocationFilters,
  ProgressPhotoFilters,
  PhotoComparisonFilters,
  PhotoReportFilters,
  CreatePhotoLocationDTO,
  UpdatePhotoLocationDTO,
  CreateProgressPhotoDTO,
  UpdateProgressPhotoDTO,
  CreatePhotoComparisonDTO,
  UpdatePhotoComparisonDTO,
  CreatePhotoReportDTO,
  UpdatePhotoReportDTO,
} from '@/types/photo-progress';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const photoProgressKeys = {
  all: ['photo-progress'] as const,

  // Locations
  locations: () => [...photoProgressKeys.all, 'location'] as const,
  locationLists: () => [...photoProgressKeys.locations(), 'list'] as const,
  locationList: (filters: PhotoLocationFilters) => [...photoProgressKeys.locationLists(), filters] as const,
  locationDetails: () => [...photoProgressKeys.locations(), 'detail'] as const,
  locationDetail: (id: string) => [...photoProgressKeys.locationDetails(), id] as const,

  // Photos
  photos: () => [...photoProgressKeys.all, 'photo'] as const,
  photoLists: () => [...photoProgressKeys.photos(), 'list'] as const,
  photoList: (filters: ProgressPhotoFilters) => [...photoProgressKeys.photoLists(), filters] as const,
  photoDetails: () => [...photoProgressKeys.photos(), 'detail'] as const,
  photoDetail: (id: string) => [...photoProgressKeys.photoDetails(), id] as const,
  photosForLocation: (locationId: string) => [...photoProgressKeys.photos(), 'location', locationId] as const,

  // Comparisons
  comparisons: () => [...photoProgressKeys.all, 'comparison'] as const,
  comparisonLists: () => [...photoProgressKeys.comparisons(), 'list'] as const,
  comparisonList: (filters: PhotoComparisonFilters) => [...photoProgressKeys.comparisonLists(), filters] as const,
  comparisonDetails: () => [...photoProgressKeys.comparisons(), 'detail'] as const,
  comparisonDetail: (id: string) => [...photoProgressKeys.comparisonDetails(), id] as const,
  comparisonByToken: (token: string) => [...photoProgressKeys.comparisons(), 'token', token] as const,

  // Reports
  reports: () => [...photoProgressKeys.all, 'report'] as const,
  reportLists: () => [...photoProgressKeys.reports(), 'list'] as const,
  reportList: (filters: PhotoReportFilters) => [...photoProgressKeys.reportLists(), filters] as const,
  reportDetails: () => [...photoProgressKeys.reports(), 'detail'] as const,
  reportDetail: (id: string) => [...photoProgressKeys.reportDetails(), id] as const,

  // Stats
  stats: () => [...photoProgressKeys.all, 'stats'] as const,
  projectStats: (projectId: string) => [...photoProgressKeys.stats(), 'project', projectId] as const,
  progressByMonth: (projectId: string) => [...photoProgressKeys.stats(), 'monthly', projectId] as const,
};

// ============================================================================
// LOCATION QUERY HOOKS
// ============================================================================

/**
 * Get all photo locations with filters
 */
export function usePhotoLocations(filters: PhotoLocationFilters) {
  return useQuery({
    queryKey: photoProgressKeys.locationList(filters),
    queryFn: () => photoProgressApi.locations.getLocations(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * Get a single photo location by ID
 */
export function usePhotoLocation(id: string | undefined) {
  return useQuery({
    queryKey: photoProgressKeys.locationDetail(id || ''),
    queryFn: () => photoProgressApi.locations.getLocation(id!),
    enabled: !!id,
  });
}

// ============================================================================
// LOCATION MUTATION HOOKS
// ============================================================================

/**
 * Create a new photo location
 */
export function useCreatePhotoLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreatePhotoLocationDTO) => photoProgressApi.locations.createLocation(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.locationLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: 'Location created',
        description: `${data.name} has been added.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create location.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a photo location
 */
export function useUpdatePhotoLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePhotoLocationDTO }) =>
      photoProgressApi.locations.updateLocation(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.locationLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.locationDetail(data.id) });

      toast({
        title: 'Location updated',
        description: 'Photo location has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update location.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a photo location
 */
export function useDeletePhotoLocation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => photoProgressApi.locations.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.locations() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: 'Location deleted',
        description: 'Photo location has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete location.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Reorder photo locations
 */
export function useReorderPhotoLocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationIds: string[]) => photoProgressApi.locations.reorderLocations(locationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.locationLists() });
    },
  });
}

// ============================================================================
// PHOTO QUERY HOOKS
// ============================================================================

/**
 * Get all progress photos with filters
 */
export function useProgressPhotos(filters: ProgressPhotoFilters) {
  return useQuery({
    queryKey: photoProgressKeys.photoList(filters),
    queryFn: () => photoProgressApi.photos.getPhotos(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * Get photos for a specific location
 */
export function usePhotosForLocation(locationId: string | undefined) {
  return useQuery({
    queryKey: photoProgressKeys.photosForLocation(locationId || ''),
    queryFn: () => photoProgressApi.photos.getPhotosForLocation(locationId!),
    enabled: !!locationId,
  });
}

/**
 * Get a single progress photo by ID
 */
export function useProgressPhoto(id: string | undefined) {
  return useQuery({
    queryKey: photoProgressKeys.photoDetail(id || ''),
    queryFn: () => photoProgressApi.photos.getPhoto(id!),
    enabled: !!id,
  });
}

// ============================================================================
// PHOTO MUTATION HOOKS
// ============================================================================

/**
 * Create a new progress photo
 */
export function useCreateProgressPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateProgressPhotoDTO) => photoProgressApi.photos.createPhoto(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.photoLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.locationLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: 'Photo added',
        description: 'Progress photo has been uploaded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload photo.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Batch create progress photos
 */
export function useCreateProgressPhotos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dtos: CreateProgressPhotoDTO[]) => photoProgressApi.photos.createPhotos(dtos),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.photoLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.locationLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: 'Photos added',
        description: `${data.length} progress photos have been uploaded.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload photos.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a progress photo
 */
export function useUpdateProgressPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProgressPhotoDTO }) =>
      photoProgressApi.photos.updatePhoto(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.photoLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.photoDetail(data.id) });

      toast({
        title: 'Photo updated',
        description: 'Progress photo has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update photo.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Toggle photo featured status
 */
export function useTogglePhotoFeatured() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => photoProgressApi.photos.toggleFeatured(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.photos() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: data.is_featured ? 'Photo featured' : 'Photo unfeatured',
        description: data.is_featured
          ? 'Photo is now marked as featured.'
          : 'Photo is no longer featured.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update featured status.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a progress photo
 */
export function useDeleteProgressPhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => photoProgressApi.photos.deletePhoto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.photos() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.locationLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: 'Photo deleted',
        description: 'Progress photo has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete photo.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// COMPARISON QUERY HOOKS
// ============================================================================

/**
 * Get all photo comparisons with filters
 */
export function usePhotoComparisons(filters: PhotoComparisonFilters) {
  return useQuery({
    queryKey: photoProgressKeys.comparisonList(filters),
    queryFn: () => photoProgressApi.comparisons.getComparisons(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * Get a single comparison by ID
 */
export function usePhotoComparison(id: string | undefined) {
  return useQuery({
    queryKey: photoProgressKeys.comparisonDetail(id || ''),
    queryFn: () => photoProgressApi.comparisons.getComparison(id!),
    enabled: !!id,
  });
}

/**
 * Get comparison by share token (for public access)
 */
export function usePhotoComparisonByToken(token: string | undefined) {
  return useQuery({
    queryKey: photoProgressKeys.comparisonByToken(token || ''),
    queryFn: () => photoProgressApi.comparisons.getComparisonByToken(token!),
    enabled: !!token,
  });
}

// ============================================================================
// COMPARISON MUTATION HOOKS
// ============================================================================

/**
 * Create a new photo comparison
 */
export function useCreatePhotoComparison() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreatePhotoComparisonDTO) => photoProgressApi.comparisons.createComparison(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.comparisonLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: 'Comparison created',
        description: `${data.title} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create comparison.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a photo comparison
 */
export function useUpdatePhotoComparison() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePhotoComparisonDTO }) =>
      photoProgressApi.comparisons.updateComparison(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.comparisonLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.comparisonDetail(data.id) });

      toast({
        title: 'Comparison updated',
        description: 'Photo comparison has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update comparison.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a photo comparison
 */
export function useDeletePhotoComparison() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => photoProgressApi.comparisons.deleteComparison(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.comparisons() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: 'Comparison deleted',
        description: 'Photo comparison has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete comparison.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// REPORT QUERY HOOKS
// ============================================================================

/**
 * Get all photo reports with filters
 */
export function usePhotoReports(filters: PhotoReportFilters) {
  return useQuery({
    queryKey: photoProgressKeys.reportList(filters),
    queryFn: () => photoProgressApi.reports.getReports(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * Get a single report by ID
 */
export function usePhotoReport(id: string | undefined) {
  return useQuery({
    queryKey: photoProgressKeys.reportDetail(id || ''),
    queryFn: () => photoProgressApi.reports.getReport(id!),
    enabled: !!id,
  });
}

// ============================================================================
// REPORT MUTATION HOOKS - CRUD
// ============================================================================

/**
 * Create a new photo report
 */
export function useCreatePhotoReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreatePhotoReportDTO) => photoProgressApi.reports.createReport(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.reportLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: 'Report created',
        description: `Report #${data.report_number} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create report.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a photo report
 */
export function useUpdatePhotoReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePhotoReportDTO }) =>
      photoProgressApi.reports.updateReport(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.reportLists() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.reportDetail(data.id) });

      toast({
        title: 'Report updated',
        description: 'Photo progress report has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update report.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a photo report
 */
export function useDeletePhotoReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => photoProgressApi.reports.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.reports() });
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.stats() });

      toast({
        title: 'Report deleted',
        description: 'Photo progress report has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete report.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// REPORT MUTATION HOOKS - WORKFLOW
// ============================================================================

/**
 * Submit report for review
 */
export function useSubmitPhotoReportForReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => photoProgressApi.reports.submitForReview(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.reports() });

      toast({
        title: 'Report submitted',
        description: `Report #${data.report_number} has been submitted for review.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Approve report
 */
export function useApprovePhotoReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => photoProgressApi.reports.approveReport(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.reports() });

      toast({
        title: 'Report approved',
        description: `Report #${data.report_number} has been approved.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve report.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mark report as distributed
 */
export function useDistributePhotoReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, userIds }: { id: string; userIds: string[] }) =>
      photoProgressApi.reports.markDistributed(id, userIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: photoProgressKeys.reports() });

      toast({
        title: 'Report distributed',
        description: `Report #${data.report_number} has been distributed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to distribute report.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// STATISTICS HOOKS
// ============================================================================

/**
 * Get project photo progress statistics
 */
export function usePhotoProgressStats(projectId: string | undefined) {
  return useQuery({
    queryKey: photoProgressKeys.projectStats(projectId || ''),
    queryFn: () => photoProgressApi.stats.getProjectStats(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get photo progress by month
 */
export function usePhotoProgressByMonth(projectId: string | undefined) {
  return useQuery({
    queryKey: photoProgressKeys.progressByMonth(projectId || ''),
    queryFn: () => photoProgressApi.stats.getProgressByMonth(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}
