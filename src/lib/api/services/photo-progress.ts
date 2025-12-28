/**
 * Photo Progress API Service
 *
 * API service for managing photo progress reports, locations, and comparisons.
 * Provides CRUD operations and statistics functions.
 */

import { supabase } from '@/lib/supabase';
import { ApiErrorClass } from '../errors';

import type {
  PhotoLocation,
  PhotoLocationWithLatest,
  ProgressPhoto,
  ProgressPhotoWithDetails,
  PhotoComparison,
  PhotoComparisonWithDetails,
  PhotoProgressReport,
  PhotoProgressReportWithDetails,
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
  PhotoProgressStats,
  PhotoProgressByMonth,
  PhotoReportStatus,
} from '@/types/photo-progress';

const db: any = supabase;

// ============================================================================
// PHOTO LOCATIONS
// ============================================================================

export const photoProgressApi = {
  locations: {
    /**
     * Get all photo locations with filters
     */
    async getLocations(filters: PhotoLocationFilters): Promise<PhotoLocationWithLatest[]> {
      let query = db
        .from('photo_locations_with_latest')
        .select('*')
        .eq('project_id', filters.projectId)
        .order('sort_order', { ascending: true });

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters.building) {
        query = query.eq('building', filters.building);
      }
      if (filters.floor) {
        query = query.eq('floor', filters.floor);
      }
      if (filters.captureFrequency) {
        query = query.eq('capture_frequency', filters.captureFrequency);
      }
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,location_code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        // View might not exist, fall back to base table
        return this.getLocationsFromBase(filters);
      }

      return data || [];
    },

    /**
     * Fallback to base table
     */
    async getLocationsFromBase(filters: PhotoLocationFilters): Promise<PhotoLocationWithLatest[]> {
      let query = db
        .from('photo_locations')
        .select('*')
        .eq('project_id', filters.projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return (data || []).map((loc: PhotoLocation) => ({
        ...loc,
        latest_photo_id: null,
        latest_photo_url: null,
        latest_thumbnail_url: null,
        latest_capture_date: null,
        photo_count: 0,
      }));
    },

    /**
     * Get a single location by ID
     */
    async getLocation(id: string): Promise<PhotoLocationWithLatest> {
      const { data, error } = await db
        .from('photo_locations_with_latest')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // Try base table
        const { data: baseData, error: baseError } = await db
          .from('photo_locations')
          .select('*')
          .eq('id', id)
          .single();

        if (baseError) {
          throw new ApiErrorClass(baseError.message, 'FETCH_ERROR');
        }

        return {
          ...baseData,
          latest_photo_id: null,
          latest_photo_url: null,
          latest_thumbnail_url: null,
          latest_capture_date: null,
          photo_count: 0,
        };
      }

      return data;
    },

    /**
     * Create a new photo location
     */
    async createLocation(dto: CreatePhotoLocationDTO): Promise<PhotoLocation> {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await db
        .from('photo_locations')
        .insert({
          ...dto,
          created_by: user?.user?.id || null,
        })
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'CREATE_ERROR');
      }

      return data;
    },

    /**
     * Update a photo location
     */
    async updateLocation(id: string, dto: UpdatePhotoLocationDTO): Promise<PhotoLocation> {
      const { data, error } = await db
        .from('photo_locations')
        .update({ ...dto, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
      }

      return data;
    },

    /**
     * Soft delete a photo location
     */
    async deleteLocation(id: string): Promise<void> {
      const { error } = await db
        .from('photo_locations')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new ApiErrorClass(error.message, 'DELETE_ERROR');
      }
    },

    /**
     * Reorder locations
     */
    async reorderLocations(locationIds: string[]): Promise<void> {
      for (let i = 0; i < locationIds.length; i++) {
        await db
          .from('photo_locations')
          .update({ sort_order: i })
          .eq('id', locationIds[i]);
      }
    },
  },

  // ============================================================================
  // PROGRESS PHOTOS
  // ============================================================================

  photos: {
    /**
     * Get all progress photos with filters
     */
    async getPhotos(filters: ProgressPhotoFilters): Promise<ProgressPhotoWithDetails[]> {
      let query = db
        .from('progress_photos')
        .select(`
          *,
          location:photo_locations(name, location_code),
          captured_by_user:users!progress_photos_captured_by_fkey(full_name),
          created_by_user:users!progress_photos_created_by_fkey(full_name)
        `)
        .eq('project_id', filters.projectId)
        .is('deleted_at', null)
        .order('capture_date', { ascending: false });

      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters.startDate) {
        query = query.gte('capture_date', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('capture_date', filters.endDate);
      }
      if (filters.capturedBy) {
        query = query.eq('captured_by', filters.capturedBy);
      }
      if (filters.isFeatured !== undefined) {
        query = query.eq('is_featured', filters.isFeatured);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.search) {
        query = query.or(
          `caption.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return (data || []).map((photo: any) => ({
        ...photo,
        location_name: photo.location?.name,
        location_code: photo.location?.location_code,
        captured_by_name: photo.captured_by_user?.full_name,
        created_by_name: photo.created_by_user?.full_name,
      }));
    },

    /**
     * Get photos for a specific location
     */
    async getPhotosForLocation(locationId: string): Promise<ProgressPhotoWithDetails[]> {
      const { data: location } = await db
        .from('photo_locations')
        .select('project_id')
        .eq('id', locationId)
        .single();

      if (!location) {
        return [];
      }

      return this.getPhotos({
        projectId: location.project_id,
        locationId,
      });
    },

    /**
     * Get a single photo by ID
     */
    async getPhoto(id: string): Promise<ProgressPhotoWithDetails> {
      const { data, error } = await db
        .from('progress_photos')
        .select(`
          *,
          location:photo_locations(name, location_code),
          captured_by_user:users!progress_photos_captured_by_fkey(full_name),
          created_by_user:users!progress_photos_created_by_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return {
        ...data,
        location_name: data.location?.name,
        location_code: data.location?.location_code,
        captured_by_name: data.captured_by_user?.full_name,
        created_by_name: data.created_by_user?.full_name,
      };
    },

    /**
     * Create a new progress photo
     */
    async createPhoto(dto: CreateProgressPhotoDTO): Promise<ProgressPhoto> {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await db
        .from('progress_photos')
        .insert({
          ...dto,
          captured_by: dto.captured_by || user?.user?.id || null,
          created_by: user?.user?.id || null,
        })
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'CREATE_ERROR');
      }

      return data;
    },

    /**
     * Batch create photos
     */
    async createPhotos(dtos: CreateProgressPhotoDTO[]): Promise<ProgressPhoto[]> {
      const { data: user } = await supabase.auth.getUser();

      const photosToInsert = dtos.map((dto) => ({
        ...dto,
        captured_by: dto.captured_by || user?.user?.id || null,
        created_by: user?.user?.id || null,
      }));

      const { data, error } = await db
        .from('progress_photos')
        .insert(photosToInsert)
        .select();

      if (error) {
        throw new ApiErrorClass(error.message, 'CREATE_ERROR');
      }

      return data;
    },

    /**
     * Update a progress photo
     */
    async updatePhoto(id: string, dto: UpdateProgressPhotoDTO): Promise<ProgressPhoto> {
      const { data, error } = await db
        .from('progress_photos')
        .update({ ...dto, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
      }

      return data;
    },

    /**
     * Toggle featured status
     */
    async toggleFeatured(id: string): Promise<ProgressPhoto> {
      const { data: current } = await db
        .from('progress_photos')
        .select('is_featured')
        .eq('id', id)
        .single();

      return this.updatePhoto(id, { is_featured: !current?.is_featured });
    },

    /**
     * Soft delete a progress photo
     */
    async deletePhoto(id: string): Promise<void> {
      const { error } = await db
        .from('progress_photos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new ApiErrorClass(error.message, 'DELETE_ERROR');
      }
    },
  },

  // ============================================================================
  // PHOTO COMPARISONS
  // ============================================================================

  comparisons: {
    /**
     * Get all photo comparisons with filters
     */
    async getComparisons(filters: PhotoComparisonFilters): Promise<PhotoComparisonWithDetails[]> {
      let query = db
        .from('photo_comparisons')
        .select(`
          *,
          location:photo_locations(name),
          before_photo:progress_photos!photo_comparisons_before_photo_id_fkey(*),
          after_photo:progress_photos!photo_comparisons_after_photo_id_fkey(*),
          created_by_user:users!photo_comparisons_created_by_fkey(full_name)
        `)
        .eq('project_id', filters.projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters.comparisonType) {
        query = query.eq('comparison_type', filters.comparisonType);
      }
      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return (data || []).map((comp: any) => ({
        ...comp,
        location_name: comp.location?.name,
        photos: [],
        created_by_name: comp.created_by_user?.full_name,
      }));
    },

    /**
     * Get a single comparison by ID
     */
    async getComparison(id: string): Promise<PhotoComparisonWithDetails> {
      const { data, error } = await db
        .from('photo_comparisons')
        .select(`
          *,
          location:photo_locations(name),
          before_photo:progress_photos!photo_comparisons_before_photo_id_fkey(*),
          after_photo:progress_photos!photo_comparisons_after_photo_id_fkey(*),
          created_by_user:users!photo_comparisons_created_by_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      // Fetch timelapse photos if photo_ids exists
      let photos: ProgressPhoto[] = [];
      if (data.photo_ids && data.photo_ids.length > 0) {
        const { data: photoData } = await db
          .from('progress_photos')
          .select('*')
          .in('id', data.photo_ids)
          .order('capture_date', { ascending: true });
        photos = photoData || [];
      }

      return {
        ...data,
        location_name: data.location?.name,
        photos,
        created_by_name: data.created_by_user?.full_name,
      };
    },

    /**
     * Get comparison by share token (for public access)
     */
    async getComparisonByToken(token: string): Promise<PhotoComparisonWithDetails | null> {
      const { data, error } = await db
        .from('photo_comparisons')
        .select(`
          *,
          location:photo_locations(name),
          before_photo:progress_photos!photo_comparisons_before_photo_id_fkey(*),
          after_photo:progress_photos!photo_comparisons_after_photo_id_fkey(*)
        `)
        .eq('share_token', token)
        .eq('is_public', true)
        .single();

      if (error) {
        return null;
      }

      return {
        ...data,
        location_name: data.location?.name,
        photos: [],
        created_by_name: null,
      };
    },

    /**
     * Create a new comparison
     */
    async createComparison(dto: CreatePhotoComparisonDTO): Promise<PhotoComparison> {
      const { data: user } = await supabase.auth.getUser();

      // Generate share token if public
      const shareToken = dto.is_public
        ? `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`
        : null;

      const { data, error } = await db
        .from('photo_comparisons')
        .insert({
          ...dto,
          share_token: shareToken,
          created_by: user?.user?.id || null,
        })
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'CREATE_ERROR');
      }

      return data;
    },

    /**
     * Update a comparison
     */
    async updateComparison(id: string, dto: UpdatePhotoComparisonDTO): Promise<PhotoComparison> {
      const updateData: any = { ...dto, updated_at: new Date().toISOString() };

      // Generate or clear share token based on public status
      if (dto.is_public === true) {
        const { data: current } = await db
          .from('photo_comparisons')
          .select('share_token')
          .eq('id', id)
          .single();

        if (!current?.share_token) {
          updateData.share_token = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
        }
      } else if (dto.is_public === false) {
        updateData.share_token = null;
      }

      const { data, error } = await db
        .from('photo_comparisons')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
      }

      return data;
    },

    /**
     * Soft delete a comparison
     */
    async deleteComparison(id: string): Promise<void> {
      const { error } = await db
        .from('photo_comparisons')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new ApiErrorClass(error.message, 'DELETE_ERROR');
      }
    },
  },

  // ============================================================================
  // PHOTO PROGRESS REPORTS
  // ============================================================================

  reports: {
    /**
     * Get all photo reports with filters
     */
    async getReports(filters: PhotoReportFilters): Promise<PhotoProgressReport[]> {
      let query = db
        .from('photo_progress_reports')
        .select('*')
        .eq('project_id', filters.projectId)
        .is('deleted_at', null)
        .order('report_number', { ascending: false });

      if (filters.reportType) {
        query = query.eq('report_type', filters.reportType);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.startDate) {
        query = query.gte('period_start', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('period_end', filters.endDate);
      }
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      return data || [];
    },

    /**
     * Get a single report by ID
     */
    async getReport(id: string): Promise<PhotoProgressReportWithDetails> {
      const { data, error } = await db
        .from('photo_progress_reports')
        .select(`
          *,
          approved_by_user:users!photo_progress_reports_approved_by_fkey(full_name),
          created_by_user:users!photo_progress_reports_created_by_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'FETCH_ERROR');
      }

      // Fetch related entities
      let locations: PhotoLocation[] = [];
      let photos: ProgressPhoto[] = [];
      let comparisons: PhotoComparison[] = [];

      if (data.location_ids?.length > 0) {
        const { data: locData } = await db
          .from('photo_locations')
          .select('*')
          .in('id', data.location_ids);
        locations = locData || [];
      }

      if (data.photo_ids?.length > 0) {
        const { data: photoData } = await db
          .from('progress_photos')
          .select('*')
          .in('id', data.photo_ids);
        photos = photoData || [];
      }

      if (data.comparison_ids?.length > 0) {
        const { data: compData } = await db
          .from('photo_comparisons')
          .select('*')
          .in('id', data.comparison_ids);
        comparisons = compData || [];
      }

      return {
        ...data,
        locations,
        photos,
        comparisons,
        approved_by_name: data.approved_by_user?.full_name,
        created_by_name: data.created_by_user?.full_name,
      };
    },

    /**
     * Create a new report
     */
    async createReport(dto: CreatePhotoReportDTO): Promise<PhotoProgressReport> {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await db
        .from('photo_progress_reports')
        .insert({
          ...dto,
          created_by: user?.user?.id || null,
        })
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'CREATE_ERROR');
      }

      return data;
    },

    /**
     * Update a report
     */
    async updateReport(id: string, dto: UpdatePhotoReportDTO): Promise<PhotoProgressReport> {
      const { data, error } = await db
        .from('photo_progress_reports')
        .update({ ...dto, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
      }

      return data;
    },

    /**
     * Submit report for review
     */
    async submitForReview(id: string): Promise<PhotoProgressReport> {
      return this.updateReport(id, { status: 'review' as PhotoReportStatus });
    },

    /**
     * Approve report
     */
    async approveReport(id: string): Promise<PhotoProgressReport> {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await db
        .from('photo_progress_reports')
        .update({
          status: 'approved',
          approved_by: user?.user?.id || null,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
      }

      return data;
    },

    /**
     * Mark report as distributed
     */
    async markDistributed(id: string, userIds: string[]): Promise<PhotoProgressReport> {
      const { data, error } = await db
        .from('photo_progress_reports')
        .update({
          status: 'distributed',
          distributed_at: new Date().toISOString(),
          distributed_to: userIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new ApiErrorClass(error.message, 'UPDATE_ERROR');
      }

      return data;
    },

    /**
     * Soft delete a report
     */
    async deleteReport(id: string): Promise<void> {
      const { error } = await db
        .from('photo_progress_reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new ApiErrorClass(error.message, 'DELETE_ERROR');
      }
    },
  },

  // ============================================================================
  // STATISTICS
  // ============================================================================

  stats: {
    /**
     * Get project photo progress statistics
     */
    async getProjectStats(projectId: string): Promise<PhotoProgressStats> {
      const [
        { count: totalLocations },
        { count: activeLocations },
        { count: totalPhotos },
        { count: featuredPhotos },
        { count: totalComparisons },
        { count: totalReports },
      ] = await Promise.all([
        db.from('photo_locations').select('*', { count: 'exact', head: true }).eq('project_id', projectId).is('deleted_at', null),
        db.from('photo_locations').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_active', true).is('deleted_at', null),
        db.from('progress_photos').select('*', { count: 'exact', head: true }).eq('project_id', projectId).is('deleted_at', null),
        db.from('progress_photos').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_featured', true).is('deleted_at', null),
        db.from('photo_comparisons').select('*', { count: 'exact', head: true }).eq('project_id', projectId).is('deleted_at', null),
        db.from('photo_progress_reports').select('*', { count: 'exact', head: true }).eq('project_id', projectId).is('deleted_at', null),
      ]);

      // Photos this month
      const firstOfMonth = new Date();
      firstOfMonth.setDate(1);
      const { count: photosThisMonth } = await db
        .from('progress_photos')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .gte('capture_date', firstOfMonth.toISOString().split('T')[0])
        .is('deleted_at', null);

      // Locations due for capture
      const today = new Date().toISOString().split('T')[0];
      const { count: locationsDue } = await db
        .from('photo_locations')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('is_active', true)
        .lte('next_capture_date', today)
        .is('deleted_at', null);

      return {
        project_id: projectId,
        total_locations: totalLocations || 0,
        active_locations: activeLocations || 0,
        total_photos: totalPhotos || 0,
        featured_photos: featuredPhotos || 0,
        total_comparisons: totalComparisons || 0,
        total_reports: totalReports || 0,
        photos_this_month: photosThisMonth || 0,
        locations_due_for_capture: locationsDue || 0,
      };
    },

    /**
     * Get photo progress by month
     */
    async getProgressByMonth(projectId: string): Promise<PhotoProgressByMonth[]> {
      const { data, error } = await db
        .from('photo_progress_by_month')
        .select('*')
        .eq('project_id', projectId)
        .order('month', { ascending: false })
        .limit(12);

      if (error) {
        // Calculate manually if view doesn't exist
        return this.calculateProgressByMonth(projectId);
      }

      return data || [];
    },

    /**
     * Calculate progress by month (fallback)
     */
    async calculateProgressByMonth(projectId: string): Promise<PhotoProgressByMonth[]> {
      const { data, error } = await db
        .from('progress_photos')
        .select('capture_date, location_id, is_featured')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('capture_date', { ascending: false });

      if (error) {
        return [];
      }

      const monthMap = new Map<string, PhotoProgressByMonth>();

      (data || []).forEach((photo: any) => {
        const month = photo.capture_date.substring(0, 7) + '-01';
        const existing = monthMap.get(month) || {
          project_id: projectId,
          month,
          photo_count: 0,
          locations_covered: 0,
          featured_count: 0,
        };

        existing.photo_count++;
        if (photo.is_featured) {existing.featured_count++;}

        monthMap.set(month, existing);
      });

      return Array.from(monthMap.values()).slice(0, 12);
    },
  },
};

export default photoProgressApi;
