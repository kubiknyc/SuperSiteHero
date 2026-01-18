/**
 * Photo Progress Hooks Tests
 * Comprehensive tests for all photo progress React Query hooks
 *
 * Test Coverage:
 * - Location Hooks (6): usePhotoLocations, usePhotoLocation, useCreatePhotoLocation, etc.
 * - Photo Hooks (8): useProgressPhotos, usePhotosForLocation, useProgressPhoto, etc.
 * - Comparison Hooks (6): usePhotoComparisons, usePhotoComparison, etc.
 * - Report Hooks (9): usePhotoReports, usePhotoReport, CRUD operations, workflow actions
 * - Stats Hooks (2): usePhotoProgressStats, usePhotoProgressByMonth
 *
 * Total: 60+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Import hooks to test
import {
  photoProgressKeys,
  usePhotoLocations,
  usePhotoLocation,
  useCreatePhotoLocation,
  useUpdatePhotoLocation,
  useDeletePhotoLocation,
  useReorderPhotoLocations,
  useProgressPhotos,
  usePhotosForLocation,
  useProgressPhoto,
  useCreateProgressPhoto,
  useCreateProgressPhotos,
  useUpdateProgressPhoto,
  useTogglePhotoFeatured,
  useDeleteProgressPhoto,
  usePhotoComparisons,
  usePhotoComparison,
  usePhotoComparisonByToken,
  useCreatePhotoComparison,
  useUpdatePhotoComparison,
  useDeletePhotoComparison,
  usePhotoReports,
  usePhotoReport,
  useCreatePhotoReport,
  useUpdatePhotoReport,
  useDeletePhotoReport,
  useSubmitPhotoReportForReview,
  useApprovePhotoReport,
  useDistributePhotoReport,
  usePhotoProgressStats,
  usePhotoProgressByMonth,
} from '../usePhotoProgress';

// Import mocked API
import { photoProgressApi } from '@/lib/api/services/photo-progress';

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock API service
vi.mock('@/lib/api/services/photo-progress', () => ({
  photoProgressApi: {
    locations: {
      getLocations: vi.fn(),
      getLocation: vi.fn(),
      createLocation: vi.fn(),
      updateLocation: vi.fn(),
      deleteLocation: vi.fn(),
      reorderLocations: vi.fn(),
    },
    photos: {
      getPhotos: vi.fn(),
      getPhotosForLocation: vi.fn(),
      getPhoto: vi.fn(),
      createPhoto: vi.fn(),
      createPhotos: vi.fn(),
      updatePhoto: vi.fn(),
      toggleFeatured: vi.fn(),
      deletePhoto: vi.fn(),
    },
    comparisons: {
      getComparisons: vi.fn(),
      getComparison: vi.fn(),
      getComparisonByToken: vi.fn(),
      createComparison: vi.fn(),
      updateComparison: vi.fn(),
      deleteComparison: vi.fn(),
    },
    reports: {
      getReports: vi.fn(),
      getReport: vi.fn(),
      createReport: vi.fn(),
      updateReport: vi.fn(),
      deleteReport: vi.fn(),
      submitForReview: vi.fn(),
      approveReport: vi.fn(),
      markDistributed: vi.fn(),
    },
    stats: {
      getProjectStats: vi.fn(),
      getProgressByMonth: vi.fn(),
    },
  },
}));

// ============================================================================
// Test Data Factories
// ============================================================================

const createMockPhotoLocation = (overrides = {}) => ({
  id: 'location-1',
  project_id: 'project-1',
  company_id: 'company-1',
  name: 'Main Entrance',
  description: 'Front entrance view',
  location_code: 'LOC-001',
  building: 'Building A',
  floor: '1',
  area: 'Entrance',
  latitude: 37.7749,
  longitude: -122.4194,
  camera_direction: 'north',
  camera_height: 'eye_level',
  reference_image_url: 'https://example.com/ref.jpg',
  capture_instructions: 'Capture from same position daily',
  capture_frequency: 'daily',
  next_capture_date: '2024-01-15',
  is_active: true,
  sort_order: 1,
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...overrides,
});

const createMockProgressPhoto = (overrides = {}) => ({
  id: 'photo-1',
  project_id: 'project-1',
  company_id: 'company-1',
  location_id: 'location-1',
  photo_url: 'https://example.com/photo.jpg',
  thumbnail_url: 'https://example.com/thumb.jpg',
  original_filename: 'photo.jpg',
  file_size: 2048000,
  capture_date: '2024-01-15',
  capture_time: '10:00:00',
  captured_by: 'user-1',
  weather_condition: 'sunny',
  temperature: 72,
  caption: 'Progress photo',
  notes: 'Good progress',
  tags: ['progress', 'entrance'],
  camera_model: 'iPhone 14',
  lens_info: null,
  focal_length: null,
  aperture: null,
  shutter_speed: null,
  iso: 100,
  photo_latitude: 37.7749,
  photo_longitude: -122.4194,
  daily_report_id: null,
  milestone_id: null,
  is_featured: false,
  is_approved: true,
  created_by: 'user-1',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  deleted_at: null,
  ...overrides,
});

const createMockPhotoComparison = (overrides = {}) => ({
  id: 'comparison-1',
  project_id: 'project-1',
  company_id: 'company-1',
  location_id: 'location-1',
  title: 'January Progress',
  description: 'Before and after comparison',
  comparison_type: 'before_after',
  before_photo_id: 'photo-1',
  after_photo_id: 'photo-2',
  photo_ids: ['photo-1', 'photo-2'],
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  is_public: false,
  share_token: null,
  created_by: 'user-1',
  created_at: '2024-01-31T00:00:00Z',
  updated_at: '2024-01-31T00:00:00Z',
  deleted_at: null,
  ...overrides,
});

const createMockPhotoReport = (overrides = {}) => ({
  id: 'report-1',
  project_id: 'project-1',
  company_id: 'company-1',
  report_number: 1,
  title: 'January Progress Report',
  description: 'Monthly progress report',
  report_type: 'monthly',
  period_start: '2024-01-01',
  period_end: '2024-01-31',
  location_ids: ['location-1', 'location-2'],
  photo_ids: ['photo-1', 'photo-2', 'photo-3'],
  comparison_ids: ['comparison-1'],
  executive_summary: 'Good progress this month',
  progress_notes: 'All milestones on track',
  issues_noted: 'Minor delays due to weather',
  weather_summary: { sunny_days: 20, rainy_days: 5, work_days: 22 },
  status: 'draft',
  distributed_at: null,
  distributed_to: null,
  pdf_url: null,
  approved_by: null,
  approved_at: null,
  created_by: 'user-1',
  created_at: '2024-01-31T00:00:00Z',
  updated_at: '2024-01-31T00:00:00Z',
  deleted_at: null,
  ...overrides,
});

const createMockPhotoProgressStats = (overrides = {}) => ({
  project_id: 'project-1',
  total_locations: 10,
  active_locations: 8,
  total_photos: 150,
  featured_photos: 12,
  total_comparisons: 5,
  total_reports: 3,
  photos_this_month: 25,
  locations_due_for_capture: 3,
  ...overrides,
});

const createMockPhotoProgressByMonth = (overrides = {}) => ({
  project_id: 'project-1',
  month: '2024-01',
  photo_count: 25,
  locations_covered: 8,
  featured_count: 3,
  ...overrides,
});

// ============================================================================
// Test Setup
// ============================================================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.info,
      warn: console.warn,
      error: () => {},
    },
  });
};

interface WrapperProps {
  children: ReactNode;
}

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('Photo Progress Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ==========================================================================
  // Location Query Hooks
  // ==========================================================================

  describe('usePhotoLocations', () => {
    it('should fetch photo locations successfully', async () => {
      const mockLocations = [createMockPhotoLocation(), createMockPhotoLocation({ id: 'location-2', name: 'Back Entrance' })];
      const filters = { projectId: 'project-1' };
      vi.mocked(photoProgressApi.locations.getLocations).mockResolvedValue(mockLocations);

      const { result } = renderHook(() => usePhotoLocations(filters), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLocations);
      expect(photoProgressApi.locations.getLocations).toHaveBeenCalledWith(filters);
    });

    it('should fetch with filters', async () => {
      const mockLocations = [createMockPhotoLocation({ is_active: true })];
      const filters = { projectId: 'project-1', isActive: true, building: 'Building A' };
      vi.mocked(photoProgressApi.locations.getLocations).mockResolvedValue(mockLocations);

      const { result } = renderHook(() => usePhotoLocations(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(photoProgressApi.locations.getLocations).toHaveBeenCalledWith(filters);
    });

    it('should not fetch when projectId is missing', () => {
      vi.mocked(photoProgressApi.locations.getLocations).mockResolvedValue([]);

      const { result } = renderHook(() => usePhotoLocations({ projectId: '' }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.locations.getLocations).not.toHaveBeenCalled();
    });
  });

  describe('usePhotoLocation', () => {
    it('should fetch single photo location successfully', async () => {
      const mockLocation = createMockPhotoLocation();
      vi.mocked(photoProgressApi.locations.getLocation).mockResolvedValue(mockLocation);

      const { result } = renderHook(() => usePhotoLocation('location-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLocation);
      expect(photoProgressApi.locations.getLocation).toHaveBeenCalledWith('location-1');
    });

    it('should not fetch when id is undefined', () => {
      vi.mocked(photoProgressApi.locations.getLocation).mockResolvedValue(null);

      const { result } = renderHook(() => usePhotoLocation(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.locations.getLocation).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Location Mutation Hooks
  // ==========================================================================

  describe('useCreatePhotoLocation', () => {
    it('should create photo location successfully', async () => {
      const newLocation = createMockPhotoLocation();
      const createDTO = {
        project_id: 'project-1',
        company_id: 'company-1',
        name: 'Main Entrance',
      };
      vi.mocked(photoProgressApi.locations.createLocation).mockResolvedValue(newLocation);

      const { result } = renderHook(() => useCreatePhotoLocation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(createDTO);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newLocation);
      expect(photoProgressApi.locations.createLocation).toHaveBeenCalledWith(createDTO);
    });

    it('should invalidate queries after successful creation', async () => {
      const newLocation = createMockPhotoLocation();
      vi.mocked(photoProgressApi.locations.createLocation).mockResolvedValue(newLocation);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreatePhotoLocation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          project_id: 'project-1',
          company_id: 'company-1',
          name: 'Test Location',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.locationLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  describe('useUpdatePhotoLocation', () => {
    it('should update photo location successfully', async () => {
      const updatedLocation = createMockPhotoLocation({ name: 'Updated Entrance' });
      const updateDTO = { name: 'Updated Entrance' };
      vi.mocked(photoProgressApi.locations.updateLocation).mockResolvedValue(updatedLocation);

      const { result } = renderHook(() => useUpdatePhotoLocation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'location-1', dto: updateDTO });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedLocation);
      expect(photoProgressApi.locations.updateLocation).toHaveBeenCalledWith('location-1', updateDTO);
    });

    it('should invalidate queries after successful update', async () => {
      const updatedLocation = createMockPhotoLocation({ id: 'location-1' });
      vi.mocked(photoProgressApi.locations.updateLocation).mockResolvedValue(updatedLocation);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdatePhotoLocation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'location-1', dto: { name: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.locationLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.locationDetail('location-1') });
    });
  });

  describe('useDeletePhotoLocation', () => {
    it('should delete photo location successfully', async () => {
      vi.mocked(photoProgressApi.locations.deleteLocation).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePhotoLocation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('location-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(photoProgressApi.locations.deleteLocation).toHaveBeenCalledWith('location-1');
    });

    it('should invalidate all location queries after successful deletion', async () => {
      vi.mocked(photoProgressApi.locations.deleteLocation).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeletePhotoLocation(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('location-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.locations() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  describe('useReorderPhotoLocations', () => {
    it('should reorder photo locations successfully', async () => {
      vi.mocked(photoProgressApi.locations.reorderLocations).mockResolvedValue(undefined);

      const { result } = renderHook(() => useReorderPhotoLocations(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(['location-2', 'location-1', 'location-3']);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(photoProgressApi.locations.reorderLocations).toHaveBeenCalledWith(['location-2', 'location-1', 'location-3']);
    });

    it('should invalidate location lists after reordering', async () => {
      vi.mocked(photoProgressApi.locations.reorderLocations).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReorderPhotoLocations(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(['location-1', 'location-2']);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.locationLists() });
    });
  });

  // ==========================================================================
  // Photo Query Hooks
  // ==========================================================================

  describe('useProgressPhotos', () => {
    it('should fetch progress photos successfully', async () => {
      const mockPhotos = [createMockProgressPhoto(), createMockProgressPhoto({ id: 'photo-2' })];
      const filters = { projectId: 'project-1' };
      vi.mocked(photoProgressApi.photos.getPhotos).mockResolvedValue(mockPhotos);

      const { result } = renderHook(() => useProgressPhotos(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPhotos);
      expect(photoProgressApi.photos.getPhotos).toHaveBeenCalledWith(filters);
    });

    it('should fetch with multiple filters', async () => {
      const mockPhotos = [createMockProgressPhoto({ is_featured: true })];
      const filters = { projectId: 'project-1', locationId: 'location-1', isFeatured: true, startDate: '2024-01-01' };
      vi.mocked(photoProgressApi.photos.getPhotos).mockResolvedValue(mockPhotos);

      const { result } = renderHook(() => useProgressPhotos(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(photoProgressApi.photos.getPhotos).toHaveBeenCalledWith(filters);
    });

    it('should not fetch when projectId is missing', () => {
      vi.mocked(photoProgressApi.photos.getPhotos).mockResolvedValue([]);

      const { result } = renderHook(() => useProgressPhotos({ projectId: '' }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.photos.getPhotos).not.toHaveBeenCalled();
    });
  });

  describe('usePhotosForLocation', () => {
    it('should fetch photos for specific location successfully', async () => {
      const mockPhotos = [createMockProgressPhoto({ location_id: 'location-1' })];
      vi.mocked(photoProgressApi.photos.getPhotosForLocation).mockResolvedValue(mockPhotos);

      const { result } = renderHook(() => usePhotosForLocation('location-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPhotos);
      expect(photoProgressApi.photos.getPhotosForLocation).toHaveBeenCalledWith('location-1');
    });

    it('should not fetch when locationId is undefined', () => {
      vi.mocked(photoProgressApi.photos.getPhotosForLocation).mockResolvedValue([]);

      const { result } = renderHook(() => usePhotosForLocation(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.photos.getPhotosForLocation).not.toHaveBeenCalled();
    });
  });

  describe('useProgressPhoto', () => {
    it('should fetch single progress photo successfully', async () => {
      const mockPhoto = createMockProgressPhoto();
      vi.mocked(photoProgressApi.photos.getPhoto).mockResolvedValue(mockPhoto);

      const { result } = renderHook(() => useProgressPhoto('photo-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPhoto);
      expect(photoProgressApi.photos.getPhoto).toHaveBeenCalledWith('photo-1');
    });

    it('should not fetch when id is undefined', () => {
      vi.mocked(photoProgressApi.photos.getPhoto).mockResolvedValue(null);

      const { result } = renderHook(() => useProgressPhoto(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.photos.getPhoto).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Photo Mutation Hooks
  // ==========================================================================

  describe('useCreateProgressPhoto', () => {
    it('should create progress photo successfully', async () => {
      const newPhoto = createMockProgressPhoto();
      const createDTO = {
        project_id: 'project-1',
        company_id: 'company-1',
        photo_url: 'https://example.com/photo.jpg',
        capture_date: '2024-01-15',
      };
      vi.mocked(photoProgressApi.photos.createPhoto).mockResolvedValue(newPhoto);

      const { result } = renderHook(() => useCreateProgressPhoto(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(createDTO);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newPhoto);
      expect(photoProgressApi.photos.createPhoto).toHaveBeenCalledWith(createDTO);
    });

    it('should invalidate queries after successful creation', async () => {
      const newPhoto = createMockProgressPhoto();
      vi.mocked(photoProgressApi.photos.createPhoto).mockResolvedValue(newPhoto);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateProgressPhoto(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          project_id: 'project-1',
          company_id: 'company-1',
          photo_url: 'https://example.com/photo.jpg',
          capture_date: '2024-01-15',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.photoLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.locationLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  describe('useCreateProgressPhotos', () => {
    it('should create multiple progress photos successfully', async () => {
      const newPhotos = [createMockProgressPhoto(), createMockProgressPhoto({ id: 'photo-2' })];
      const createDTOs = [
        { project_id: 'project-1', company_id: 'company-1', photo_url: 'https://example.com/1.jpg', capture_date: '2024-01-15' },
        { project_id: 'project-1', company_id: 'company-1', photo_url: 'https://example.com/2.jpg', capture_date: '2024-01-15' },
      ];
      vi.mocked(photoProgressApi.photos.createPhotos).mockResolvedValue(newPhotos);

      const { result } = renderHook(() => useCreateProgressPhotos(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(createDTOs);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newPhotos);
      expect(photoProgressApi.photos.createPhotos).toHaveBeenCalledWith(createDTOs);
    });

    it('should invalidate queries after successful batch creation', async () => {
      const newPhotos = [createMockProgressPhoto()];
      vi.mocked(photoProgressApi.photos.createPhotos).mockResolvedValue(newPhotos);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateProgressPhotos(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate([{
          project_id: 'project-1',
          company_id: 'company-1',
          photo_url: 'https://example.com/photo.jpg',
          capture_date: '2024-01-15',
        }]);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.photoLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.locationLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  describe('useUpdateProgressPhoto', () => {
    it('should update progress photo successfully', async () => {
      const updatedPhoto = createMockProgressPhoto({ caption: 'Updated caption' });
      const updateDTO = { caption: 'Updated caption' };
      vi.mocked(photoProgressApi.photos.updatePhoto).mockResolvedValue(updatedPhoto);

      const { result } = renderHook(() => useUpdateProgressPhoto(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'photo-1', dto: updateDTO });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedPhoto);
      expect(photoProgressApi.photos.updatePhoto).toHaveBeenCalledWith('photo-1', updateDTO);
    });

    it('should invalidate queries after successful update', async () => {
      const updatedPhoto = createMockProgressPhoto({ id: 'photo-1' });
      vi.mocked(photoProgressApi.photos.updatePhoto).mockResolvedValue(updatedPhoto);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateProgressPhoto(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'photo-1', dto: { caption: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.photoLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.photoDetail('photo-1') });
    });
  });

  describe('useTogglePhotoFeatured', () => {
    it('should toggle photo featured status to true', async () => {
      const toggledPhoto = createMockProgressPhoto({ id: 'photo-1', is_featured: true });
      vi.mocked(photoProgressApi.photos.toggleFeatured).mockResolvedValue(toggledPhoto);

      const { result } = renderHook(() => useTogglePhotoFeatured(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('photo-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(toggledPhoto);
      expect(photoProgressApi.photos.toggleFeatured).toHaveBeenCalledWith('photo-1');
    });

    it('should toggle photo featured status to false', async () => {
      const toggledPhoto = createMockProgressPhoto({ id: 'photo-1', is_featured: false });
      vi.mocked(photoProgressApi.photos.toggleFeatured).mockResolvedValue(toggledPhoto);

      const { result } = renderHook(() => useTogglePhotoFeatured(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('photo-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(toggledPhoto);
    });

    it('should invalidate queries after toggling featured status', async () => {
      const toggledPhoto = createMockProgressPhoto({ is_featured: true });
      vi.mocked(photoProgressApi.photos.toggleFeatured).mockResolvedValue(toggledPhoto);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTogglePhotoFeatured(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('photo-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.photos() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  describe('useDeleteProgressPhoto', () => {
    it('should delete progress photo successfully', async () => {
      vi.mocked(photoProgressApi.photos.deletePhoto).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteProgressPhoto(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('photo-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(photoProgressApi.photos.deletePhoto).toHaveBeenCalledWith('photo-1');
    });

    it('should invalidate all photo queries after successful deletion', async () => {
      vi.mocked(photoProgressApi.photos.deletePhoto).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteProgressPhoto(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('photo-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.photos() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.locationLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  // ==========================================================================
  // Comparison Query Hooks
  // ==========================================================================

  describe('usePhotoComparisons', () => {
    it('should fetch photo comparisons successfully', async () => {
      const mockComparisons = [createMockPhotoComparison(), createMockPhotoComparison({ id: 'comparison-2', title: 'February Progress' })];
      const filters = { projectId: 'project-1' };
      vi.mocked(photoProgressApi.comparisons.getComparisons).mockResolvedValue(mockComparisons);

      const { result } = renderHook(() => usePhotoComparisons(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockComparisons);
      expect(photoProgressApi.comparisons.getComparisons).toHaveBeenCalledWith(filters);
    });

    it('should fetch with comparison type filter', async () => {
      const mockComparisons = [createMockPhotoComparison({ comparison_type: 'timelapse' })];
      const filters = { projectId: 'project-1', comparisonType: 'timelapse' };
      vi.mocked(photoProgressApi.comparisons.getComparisons).mockResolvedValue(mockComparisons);

      const { result } = renderHook(() => usePhotoComparisons(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(photoProgressApi.comparisons.getComparisons).toHaveBeenCalledWith(filters);
    });

    it('should not fetch when projectId is missing', () => {
      vi.mocked(photoProgressApi.comparisons.getComparisons).mockResolvedValue([]);

      const { result } = renderHook(() => usePhotoComparisons({ projectId: '' }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.comparisons.getComparisons).not.toHaveBeenCalled();
    });
  });

  describe('usePhotoComparison', () => {
    it('should fetch single photo comparison successfully', async () => {
      const mockComparison = createMockPhotoComparison();
      vi.mocked(photoProgressApi.comparisons.getComparison).mockResolvedValue(mockComparison);

      const { result } = renderHook(() => usePhotoComparison('comparison-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockComparison);
      expect(photoProgressApi.comparisons.getComparison).toHaveBeenCalledWith('comparison-1');
    });

    it('should not fetch when id is undefined', () => {
      vi.mocked(photoProgressApi.comparisons.getComparison).mockResolvedValue(null);

      const { result } = renderHook(() => usePhotoComparison(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.comparisons.getComparison).not.toHaveBeenCalled();
    });
  });

  describe('usePhotoComparisonByToken', () => {
    it('should fetch photo comparison by token successfully', async () => {
      const mockComparison = createMockPhotoComparison({ share_token: 'abc123', is_public: true });
      vi.mocked(photoProgressApi.comparisons.getComparisonByToken).mockResolvedValue(mockComparison);

      const { result } = renderHook(() => usePhotoComparisonByToken('abc123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockComparison);
      expect(photoProgressApi.comparisons.getComparisonByToken).toHaveBeenCalledWith('abc123');
    });

    it('should not fetch when token is undefined', () => {
      vi.mocked(photoProgressApi.comparisons.getComparisonByToken).mockResolvedValue(null);

      const { result } = renderHook(() => usePhotoComparisonByToken(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.comparisons.getComparisonByToken).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Comparison Mutation Hooks
  // ==========================================================================

  describe('useCreatePhotoComparison', () => {
    it('should create photo comparison successfully', async () => {
      const newComparison = createMockPhotoComparison();
      const createDTO = {
        project_id: 'project-1',
        company_id: 'company-1',
        title: 'January Progress',
        comparison_type: 'before_after',
      };
      vi.mocked(photoProgressApi.comparisons.createComparison).mockResolvedValue(newComparison);

      const { result } = renderHook(() => useCreatePhotoComparison(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(createDTO);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newComparison);
      expect(photoProgressApi.comparisons.createComparison).toHaveBeenCalledWith(createDTO);
    });

    it('should invalidate queries after successful creation', async () => {
      const newComparison = createMockPhotoComparison();
      vi.mocked(photoProgressApi.comparisons.createComparison).mockResolvedValue(newComparison);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreatePhotoComparison(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          project_id: 'project-1',
          company_id: 'company-1',
          title: 'Test Comparison',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.comparisonLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  describe('useUpdatePhotoComparison', () => {
    it('should update photo comparison successfully', async () => {
      const updatedComparison = createMockPhotoComparison({ title: 'Updated Title' });
      const updateDTO = { title: 'Updated Title' };
      vi.mocked(photoProgressApi.comparisons.updateComparison).mockResolvedValue(updatedComparison);

      const { result } = renderHook(() => useUpdatePhotoComparison(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'comparison-1', dto: updateDTO });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedComparison);
      expect(photoProgressApi.comparisons.updateComparison).toHaveBeenCalledWith('comparison-1', updateDTO);
    });

    it('should invalidate queries after successful update', async () => {
      const updatedComparison = createMockPhotoComparison({ id: 'comparison-1' });
      vi.mocked(photoProgressApi.comparisons.updateComparison).mockResolvedValue(updatedComparison);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdatePhotoComparison(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'comparison-1', dto: { title: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.comparisonLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.comparisonDetail('comparison-1') });
    });
  });

  describe('useDeletePhotoComparison', () => {
    it('should delete photo comparison successfully', async () => {
      vi.mocked(photoProgressApi.comparisons.deleteComparison).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePhotoComparison(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('comparison-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(photoProgressApi.comparisons.deleteComparison).toHaveBeenCalledWith('comparison-1');
    });

    it('should invalidate all comparison queries after successful deletion', async () => {
      vi.mocked(photoProgressApi.comparisons.deleteComparison).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeletePhotoComparison(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('comparison-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.comparisons() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  // ==========================================================================
  // Report Query Hooks
  // ==========================================================================

  describe('usePhotoReports', () => {
    it('should fetch photo reports successfully', async () => {
      const mockReports = [createMockPhotoReport(), createMockPhotoReport({ id: 'report-2', report_number: 2 })];
      const filters = { projectId: 'project-1' };
      vi.mocked(photoProgressApi.reports.getReports).mockResolvedValue(mockReports);

      const { result } = renderHook(() => usePhotoReports(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockReports);
      expect(photoProgressApi.reports.getReports).toHaveBeenCalledWith(filters);
    });

    it('should fetch with status filter', async () => {
      const mockReports = [createMockPhotoReport({ status: 'approved' })];
      const filters = { projectId: 'project-1', status: 'approved' };
      vi.mocked(photoProgressApi.reports.getReports).mockResolvedValue(mockReports);

      const { result } = renderHook(() => usePhotoReports(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(photoProgressApi.reports.getReports).toHaveBeenCalledWith(filters);
    });

    it('should not fetch when projectId is missing', () => {
      vi.mocked(photoProgressApi.reports.getReports).mockResolvedValue([]);

      const { result } = renderHook(() => usePhotoReports({ projectId: '' }), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.reports.getReports).not.toHaveBeenCalled();
    });
  });

  describe('usePhotoReport', () => {
    it('should fetch single photo report successfully', async () => {
      const mockReport = createMockPhotoReport();
      vi.mocked(photoProgressApi.reports.getReport).mockResolvedValue(mockReport);

      const { result } = renderHook(() => usePhotoReport('report-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockReport);
      expect(photoProgressApi.reports.getReport).toHaveBeenCalledWith('report-1');
    });

    it('should not fetch when id is undefined', () => {
      vi.mocked(photoProgressApi.reports.getReport).mockResolvedValue(null);

      const { result } = renderHook(() => usePhotoReport(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.reports.getReport).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Report Mutation Hooks - CRUD
  // ==========================================================================

  describe('useCreatePhotoReport', () => {
    it('should create photo report successfully', async () => {
      const newReport = createMockPhotoReport();
      const createDTO = {
        project_id: 'project-1',
        company_id: 'company-1',
        title: 'January Progress Report',
        period_start: '2024-01-01',
        period_end: '2024-01-31',
      };
      vi.mocked(photoProgressApi.reports.createReport).mockResolvedValue(newReport);

      const { result } = renderHook(() => useCreatePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(createDTO);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newReport);
      expect(photoProgressApi.reports.createReport).toHaveBeenCalledWith(createDTO);
    });

    it('should invalidate queries after successful creation', async () => {
      const newReport = createMockPhotoReport();
      vi.mocked(photoProgressApi.reports.createReport).mockResolvedValue(newReport);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreatePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({
          project_id: 'project-1',
          company_id: 'company-1',
          title: 'Test Report',
          period_start: '2024-01-01',
          period_end: '2024-01-31',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.reportLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  describe('useUpdatePhotoReport', () => {
    it('should update photo report successfully', async () => {
      const updatedReport = createMockPhotoReport({ title: 'Updated Report Title' });
      const updateDTO = { title: 'Updated Report Title' };
      vi.mocked(photoProgressApi.reports.updateReport).mockResolvedValue(updatedReport);

      const { result } = renderHook(() => useUpdatePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'report-1', dto: updateDTO });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedReport);
      expect(photoProgressApi.reports.updateReport).toHaveBeenCalledWith('report-1', updateDTO);
    });

    it('should invalidate queries after successful update', async () => {
      const updatedReport = createMockPhotoReport({ id: 'report-1' });
      vi.mocked(photoProgressApi.reports.updateReport).mockResolvedValue(updatedReport);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdatePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'report-1', dto: { title: 'Updated' } });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.reportLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.reportDetail('report-1') });
    });
  });

  describe('useDeletePhotoReport', () => {
    it('should delete photo report successfully', async () => {
      vi.mocked(photoProgressApi.reports.deleteReport).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeletePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('report-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(photoProgressApi.reports.deleteReport).toHaveBeenCalledWith('report-1');
    });

    it('should invalidate all report queries after successful deletion', async () => {
      vi.mocked(photoProgressApi.reports.deleteReport).mockResolvedValue(undefined);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeletePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('report-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.reports() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.stats() });
    });
  });

  // ==========================================================================
  // Report Mutation Hooks - Workflow
  // ==========================================================================

  describe('useSubmitPhotoReportForReview', () => {
    it('should submit report for review successfully', async () => {
      const submittedReport = createMockPhotoReport({ status: 'review', report_number: 1 });
      vi.mocked(photoProgressApi.reports.submitForReview).mockResolvedValue(submittedReport);

      const { result } = renderHook(() => useSubmitPhotoReportForReview(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('report-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(submittedReport);
      expect(photoProgressApi.reports.submitForReview).toHaveBeenCalledWith('report-1');
    });

    it('should invalidate report queries after submission', async () => {
      const submittedReport = createMockPhotoReport({ status: 'review' });
      vi.mocked(photoProgressApi.reports.submitForReview).mockResolvedValue(submittedReport);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useSubmitPhotoReportForReview(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('report-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.reports() });
    });
  });

  describe('useApprovePhotoReport', () => {
    it('should approve report successfully', async () => {
      const approvedReport = createMockPhotoReport({ status: 'approved', report_number: 1, approved_by: 'user-1', approved_at: '2024-01-31T12:00:00Z' });
      vi.mocked(photoProgressApi.reports.approveReport).mockResolvedValue(approvedReport);

      const { result } = renderHook(() => useApprovePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('report-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(approvedReport);
      expect(photoProgressApi.reports.approveReport).toHaveBeenCalledWith('report-1');
    });

    it('should invalidate report queries after approval', async () => {
      const approvedReport = createMockPhotoReport({ status: 'approved' });
      vi.mocked(photoProgressApi.reports.approveReport).mockResolvedValue(approvedReport);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useApprovePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('report-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.reports() });
    });
  });

  describe('useDistributePhotoReport', () => {
    it('should distribute report successfully', async () => {
      const distributedReport = createMockPhotoReport({
        status: 'distributed',
        report_number: 1,
        distributed_at: '2024-01-31T12:00:00Z',
        distributed_to: ['user-1', 'user-2']
      });
      vi.mocked(photoProgressApi.reports.markDistributed).mockResolvedValue(distributedReport);

      const { result } = renderHook(() => useDistributePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'report-1', userIds: ['user-1', 'user-2'] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(distributedReport);
      expect(photoProgressApi.reports.markDistributed).toHaveBeenCalledWith('report-1', ['user-1', 'user-2']);
    });

    it('should invalidate report queries after distribution', async () => {
      const distributedReport = createMockPhotoReport({ status: 'distributed' });
      vi.mocked(photoProgressApi.reports.markDistributed).mockResolvedValue(distributedReport);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDistributePhotoReport(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate({ id: 'report-1', userIds: ['user-1'] });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: photoProgressKeys.reports() });
    });
  });

  // ==========================================================================
  // Statistics Hooks
  // ==========================================================================

  describe('usePhotoProgressStats', () => {
    it('should fetch project statistics successfully', async () => {
      const mockStats = createMockPhotoProgressStats();
      vi.mocked(photoProgressApi.stats.getProjectStats).mockResolvedValue(mockStats);

      const { result } = renderHook(() => usePhotoProgressStats('project-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(photoProgressApi.stats.getProjectStats).toHaveBeenCalledWith('project-1');
    });

    it('should not fetch when projectId is undefined', () => {
      vi.mocked(photoProgressApi.stats.getProjectStats).mockResolvedValue(null);

      const { result } = renderHook(() => usePhotoProgressStats(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.stats.getProjectStats).not.toHaveBeenCalled();
    });
  });

  describe('usePhotoProgressByMonth', () => {
    it('should fetch monthly progress successfully', async () => {
      const mockMonthlyData = [
        createMockPhotoProgressByMonth({ month: '2024-01' }),
        createMockPhotoProgressByMonth({ month: '2024-02', photo_count: 30 }),
      ];
      vi.mocked(photoProgressApi.stats.getProgressByMonth).mockResolvedValue(mockMonthlyData);

      const { result } = renderHook(() => usePhotoProgressByMonth('project-1'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockMonthlyData);
      expect(photoProgressApi.stats.getProgressByMonth).toHaveBeenCalledWith('project-1');
    });

    it('should not fetch when projectId is undefined', () => {
      vi.mocked(photoProgressApi.stats.getProgressByMonth).mockResolvedValue([]);

      const { result } = renderHook(() => usePhotoProgressByMonth(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(photoProgressApi.stats.getProgressByMonth).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Query Keys Tests
  // ==========================================================================

  describe('photoProgressKeys', () => {
    it('should generate correct key for all', () => {
      expect(photoProgressKeys.all).toEqual(['photo-progress']);
    });

    it('should generate correct key for locations', () => {
      expect(photoProgressKeys.locations()).toEqual(['photo-progress', 'location']);
    });

    it('should generate correct key for locationLists', () => {
      expect(photoProgressKeys.locationLists()).toEqual(['photo-progress', 'location', 'list']);
    });

    it('should generate correct key for locationList with filters', () => {
      const filters = { projectId: 'project-1', isActive: true };
      expect(photoProgressKeys.locationList(filters)).toEqual(['photo-progress', 'location', 'list', filters]);
    });

    it('should generate correct key for locationDetail', () => {
      expect(photoProgressKeys.locationDetail('location-1')).toEqual(['photo-progress', 'location', 'detail', 'location-1']);
    });

    it('should generate correct key for photos', () => {
      expect(photoProgressKeys.photos()).toEqual(['photo-progress', 'photo']);
    });

    it('should generate correct key for photoList with filters', () => {
      const filters = { projectId: 'project-1', isFeatured: true };
      expect(photoProgressKeys.photoList(filters)).toEqual(['photo-progress', 'photo', 'list', filters]);
    });

    it('should generate correct key for photoDetail', () => {
      expect(photoProgressKeys.photoDetail('photo-1')).toEqual(['photo-progress', 'photo', 'detail', 'photo-1']);
    });

    it('should generate correct key for photosForLocation', () => {
      expect(photoProgressKeys.photosForLocation('location-1')).toEqual(['photo-progress', 'photo', 'location', 'location-1']);
    });

    it('should generate correct key for comparisons', () => {
      expect(photoProgressKeys.comparisons()).toEqual(['photo-progress', 'comparison']);
    });

    it('should generate correct key for comparisonList with filters', () => {
      const filters = { projectId: 'project-1', comparisonType: 'timelapse' };
      expect(photoProgressKeys.comparisonList(filters)).toEqual(['photo-progress', 'comparison', 'list', filters]);
    });

    it('should generate correct key for comparisonDetail', () => {
      expect(photoProgressKeys.comparisonDetail('comparison-1')).toEqual(['photo-progress', 'comparison', 'detail', 'comparison-1']);
    });

    it('should generate correct key for comparisonByToken', () => {
      expect(photoProgressKeys.comparisonByToken('abc123')).toEqual(['photo-progress', 'comparison', 'token', 'abc123']);
    });

    it('should generate correct key for reports', () => {
      expect(photoProgressKeys.reports()).toEqual(['photo-progress', 'report']);
    });

    it('should generate correct key for reportList with filters', () => {
      const filters = { projectId: 'project-1', status: 'approved' };
      expect(photoProgressKeys.reportList(filters)).toEqual(['photo-progress', 'report', 'list', filters]);
    });

    it('should generate correct key for reportDetail', () => {
      expect(photoProgressKeys.reportDetail('report-1')).toEqual(['photo-progress', 'report', 'detail', 'report-1']);
    });

    it('should generate correct key for stats', () => {
      expect(photoProgressKeys.stats()).toEqual(['photo-progress', 'stats']);
    });

    it('should generate correct key for projectStats', () => {
      expect(photoProgressKeys.projectStats('project-1')).toEqual(['photo-progress', 'stats', 'project', 'project-1']);
    });

    it('should generate correct key for progressByMonth', () => {
      expect(photoProgressKeys.progressByMonth('project-1')).toEqual(['photo-progress', 'stats', 'monthly', 'project-1']);
    });
  });
});
