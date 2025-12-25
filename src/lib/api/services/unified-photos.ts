/**
 * Unified Photos API Service
 * API service for the Photo Evidence Hub system
 * Aligned with migration 121_unified_photo_evidence_hub.sql
 */

import { supabase } from '@/lib/supabase';
import type {
  PhotoEntityLink,
  PhotoEntityLinkWithPhoto,
  PhotoUploadBatch,
  LinkPhotoToEntityDTO,
  BulkLinkPhotosDTO,
  CreateUploadBatchDTO,
  UpdateBatchProgressDTO,
  PhotoHubFilters,
  PhotoHubStats,
  PhotoWithEntities,
  PhotoEntityType,
  DuplicatePhotoResult,
} from '@/types/unified-photos';

// =============================================================================
// PHOTO ENTITY LINKS API
// =============================================================================

export const photoEntityLinksApi = {
  /**
   * Link a photo to an entity
   */
  async linkPhotoToEntity(dto: LinkPhotoToEntityDTO): Promise<PhotoEntityLink> {
    const { data: user } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.user?.id)
      .single();

    if (!userData?.company_id) {
      throw new Error('User company not found');
    }

    const { data, error } = await supabase
      .from('photo_entity_links')
      .insert({
        photo_id: dto.photo_id,
        entity_type: dto.entity_type,
        entity_id: dto.entity_id,
        is_primary: dto.is_primary || false,
        context_note: dto.context_note || null,
        linked_by: user?.user?.id,
        company_id: userData.company_id,
      })
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  /**
   * Unlink a photo from an entity
   */
  async unlinkPhotoFromEntity(linkId: string): Promise<void> {
    const { error } = await supabase
      .from('photo_entity_links')
      .delete()
      .eq('id', linkId);

    if (error) {throw error;}
  },

  /**
   * Get photos for a specific entity
   */
  async getPhotosForEntity(
    entityType: PhotoEntityType,
    entityId: string
  ): Promise<PhotoEntityLinkWithPhoto[]> {
    const { data, error } = await supabase
      .from('photo_entity_links')
      .select(`
        *,
        photo:photos(
          id,
          file_url,
          thumbnail_url,
          file_name,
          caption,
          captured_at,
          building,
          floor,
          area
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('is_primary', { ascending: false })
      .order('linked_at', { ascending: false });

    if (error) {throw error;}
    return (data || []) as PhotoEntityLinkWithPhoto[];
  },

  /**
   * Bulk link photos to an entity
   */
  async bulkLinkPhotos(dto: BulkLinkPhotosDTO): Promise<number> {
    const { data: user } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.user?.id)
      .single();

    if (!userData?.company_id) {
      throw new Error('User company not found');
    }

    const { data, error } = await supabase.rpc('bulk_link_photos', {
      p_photo_ids: dto.photo_ids,
      p_entity_type: dto.entity_type,
      p_entity_id: dto.entity_id,
      p_linked_by: user?.user?.id,
      p_company_id: userData.company_id,
    });

    if (error) {throw error;}
    return data as number;
  },

  /**
   * Set a photo as primary for an entity
   */
  async setPrimaryPhoto(
    entityType: PhotoEntityType,
    entityId: string,
    photoId: string
  ): Promise<void> {
    // First, unset all primary flags for this entity
    await supabase
      .from('photo_entity_links')
      .update({ is_primary: false })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId);

    // Then set the new primary
    const { error } = await supabase
      .from('photo_entity_links')
      .update({ is_primary: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('photo_id', photoId);

    if (error) {throw error;}
  },

  /**
   * Update context note for a link
   */
  async updateContextNote(linkId: string, contextNote: string): Promise<void> {
    const { error } = await supabase
      .from('photo_entity_links')
      .update({ context_note: contextNote })
      .eq('id', linkId);

    if (error) {throw error;}
  },

  /**
   * Get all entities linked to a photo
   */
  async getEntitiesForPhoto(photoId: string): Promise<PhotoEntityLink[]> {
    const { data, error } = await supabase
      .from('photo_entity_links')
      .select('*')
      .eq('photo_id', photoId)
      .order('linked_at', { ascending: false });

    if (error) {throw error;}
    return data || [];
  },
};

// =============================================================================
// PHOTO HUB API
// =============================================================================

export const photoHubApi = {
  /**
   * Get photos with entity information for the hub view
   */
  async getPhotosWithEntities(
    filters: PhotoHubFilters
  ): Promise<{ photos: PhotoWithEntities[]; total: number }> {
    let query = supabase
      .from('photos')
      .select(`
        id,
        file_url,
        thumbnail_url,
        file_name,
        caption,
        description,
        captured_at,
        created_at,
        building,
        floor,
        area,
        tags,
        photo_entity_links(
          id,
          entity_type,
          entity_id,
          is_primary,
          context_note
        )
      `, { count: 'exact' })
      .eq('project_id', filters.projectId)
      .is('deleted_at', null)
      .order('captured_at', { ascending: filters.sortOrder === 'asc', nullsFirst: false });

    if (filters.search) {
      query = query.or(`caption.ilike.%${filters.search}%,file_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.dateFrom) {
      query = query.gte('captured_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('captured_at', filters.dateTo);
    }

    if (filters.building) {
      query = query.eq('building', filters.building);
    }

    if (filters.floor) {
      query = query.eq('floor', filters.floor);
    }

    if (filters.area) {
      query = query.eq('area', filters.area);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error, count } = await query;

    if (error) {throw error;}

    // Transform the data to match PhotoWithEntities
    const photos: PhotoWithEntities[] = (data || []).map((photo: Record<string, unknown>) => ({
      id: photo.id as string,
      fileUrl: photo.file_url as string,
      thumbnailUrl: photo.thumbnail_url as string | null,
      fileName: photo.file_name as string,
      caption: photo.caption as string | null,
      description: photo.description as string | null,
      capturedAt: photo.captured_at as string | null,
      createdAt: photo.created_at as string,
      building: photo.building as string | null,
      floor: photo.floor as string | null,
      area: photo.area as string | null,
      tags: photo.tags as string[] | null,
      linkedEntities: (photo.photo_entity_links as Array<{
        id: string;
        entity_type: PhotoEntityType;
        entity_id: string;
        is_primary: boolean;
        context_note: string | null;
      }>).map(link => ({
        type: link.entity_type,
        id: link.entity_id,
        displayName: `${link.entity_type} ${link.entity_id.substring(0, 8)}`,
      })),
      linkCount: (photo.photo_entity_links as unknown[]).length,
    }));

    return { photos, total: count || 0 };
  },

  /**
   * Get photo hub statistics
   */
  async getStats(projectId: string): Promise<PhotoHubStats> {
    // Get total photos count
    const { count: totalPhotos } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('deleted_at', null);

    // Get linked photos count
    const { count: linkedPhotos } = await supabase
      .from('photo_entity_links')
      .select('photo_id', { count: 'exact', head: true })
      .eq('company_id', (await supabase.auth.getUser()).data.user?.id);

    // Get photos by entity type
    const { data: byEntityType } = await supabase
      .from('photo_entity_links')
      .select('entity_type')
      .eq('company_id', (await supabase.auth.getUser()).data.user?.id);

    const photosByEntityType: Record<PhotoEntityType, number> = {} as Record<PhotoEntityType, number>;
    if (byEntityType) {
      byEntityType.forEach((row: { entity_type: string }) => {
        const type = row.entity_type as PhotoEntityType;
        photosByEntityType[type] = (photosByEntityType[type] || 0) + 1;
      });
    }

    // Get recent uploads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: recentUploads } = await supabase
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .is('deleted_at', null);

    return {
      totalPhotos: totalPhotos || 0,
      linkedPhotos: linkedPhotos || 0,
      orphanPhotos: (totalPhotos || 0) - (linkedPhotos || 0),
      photosByEntityType,
      photosByLocation: [],
      recentUploads: recentUploads || 0,
      storageUsedMB: 0, // Would need separate calculation
    };
  },
};

// =============================================================================
// PHOTO UPLOAD BATCH API
// =============================================================================

export const photoUploadBatchApi = {
  /**
   * Create a new upload batch
   */
  async createBatch(dto: CreateUploadBatchDTO): Promise<PhotoUploadBatch> {
    const { data: user } = await supabase.auth.getUser();
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user?.user?.id)
      .single();

    if (!userData?.company_id) {
      throw new Error('User company not found');
    }

    const { data, error } = await supabase
      .from('photo_upload_batches')
      .insert({
        project_id: dto.project_id,
        company_id: userData.company_id,
        uploaded_by: user?.user?.id,
        batch_name: dto.batch_name || null,
        total_photos: dto.total_photos,
        default_entity_type: dto.default_entity_type || null,
        default_entity_id: dto.default_entity_id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  /**
   * Update batch progress
   */
  async updateProgress(
    batchId: string,
    dto: UpdateBatchProgressDTO
  ): Promise<PhotoUploadBatch> {
    const updateData: Record<string, unknown> = { ...dto };

    if (dto.status === 'processing' && !updateData.started_at) {
      updateData.started_at = new Date().toISOString();
    }

    if (dto.status === 'completed' || dto.status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('photo_upload_batches')
      .update(updateData)
      .eq('id', batchId)
      .select()
      .single();

    if (error) {throw error;}
    return data;
  },

  /**
   * Get batch by ID
   */
  async getBatch(batchId: string): Promise<PhotoUploadBatch> {
    const { data, error } = await supabase
      .from('photo_upload_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error) {throw error;}
    return data;
  },

  /**
   * Get batches for a project
   */
  async getBatches(projectId: string): Promise<PhotoUploadBatch[]> {
    const { data, error } = await supabase
      .from('photo_upload_batches')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {throw error;}
    return data || [];
  },
};

// =============================================================================
// PHOTO DEDUPLICATION API
// =============================================================================

export const photoDeduplicationApi = {
  /**
   * Store photo hash for deduplication
   */
  async storeHash(
    photoId: string,
    phash: string,
    dhash?: string,
    ahash?: string,
    fileHash?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('photo_hashes')
      .upsert({
        photo_id: photoId,
        phash,
        dhash: dhash || null,
        ahash: ahash || null,
        file_hash: fileHash || null,
      });

    if (error) {throw error;}
  },

  /**
   * Find potential duplicates by hash
   */
  async findDuplicates(
    projectId: string,
    phash: string,
    threshold: number = 5
  ): Promise<DuplicatePhotoResult[]> {
    const { data, error } = await supabase.rpc('find_duplicate_photos', {
      p_project_id: projectId,
      p_phash: phash,
      p_threshold: threshold,
    });

    if (error) {throw error;}
    return (data || []) as DuplicatePhotoResult[];
  },

  /**
   * Check if exact file hash already exists
   */
  async checkExactDuplicate(fileHash: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('photo_hashes')
      .select('photo_id')
      .eq('file_hash', fileHash)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {throw error;}
    return data?.photo_id || null;
  },
};

// =============================================================================
// COMBINED EXPORT
// =============================================================================

export const unifiedPhotosApi = {
  links: photoEntityLinksApi,
  hub: photoHubApi,
  batches: photoUploadBatchApi,
  deduplication: photoDeduplicationApi,
};
