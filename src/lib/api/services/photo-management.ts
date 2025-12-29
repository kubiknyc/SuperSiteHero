/**
 * Photo Management API Service
 *
 * Comprehensive API methods for photo management including:
 * - Photo CRUD operations
 * - Collection management
 * - Before/after comparisons
 * - Photo annotations
 * - GPS-based queries
 * - Statistics
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type {
  Photo,
  PhotoCollection,
  PhotoComparison,
  PhotoAnnotation,
  PhotoAccessLog,
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

// Use any for tables not in generated types
const db = supabase as any

// =============================================
// Photo CRUD Operations
// =============================================

/**
 * Get photos with filters
 */
export async function getPhotos(filters: PhotoFilters = {}): Promise<Photo[]> {
  let query = db.from('photos').select('*')

  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters.search) {
    query = query.or(`caption.ilike.%${filters.search}%,description.ilike.%${filters.search}%,file_name.ilike.%${filters.search}%`)
  }

  if (filters.category) {
    query = query.eq('photo_category', filters.category)
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags)
  }

  if (filters.dateFrom) {
    query = query.gte('captured_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('captured_at', filters.dateTo)
  }

  if (filters.hasGps !== undefined) {
    if (filters.hasGps) {
      query = query.not('latitude', 'is', null).not('longitude', 'is', null)
    } else {
      query = query.or('latitude.is.null,longitude.is.null')
    }
  }

  if (filters.building) {
    query = query.eq('building', filters.building)
  }

  if (filters.floor) {
    query = query.eq('floor', filters.floor)
  }

  if (filters.area) {
    query = query.eq('area', filters.area)
  }

  if (filters.grid) {
    query = query.eq('grid', filters.grid)
  }

  if (filters.source) {
    query = query.eq('source', filters.source)
  }

  if (filters.reviewStatus) {
    query = query.eq('review_status', filters.reviewStatus)
  }

  if (filters.isPinned !== undefined) {
    query = query.eq('is_pinned', filters.isPinned)
  }

  if (filters.isBeforePhoto !== undefined) {
    query = query.eq('is_before_photo', filters.isBeforePhoto)
  }

  if (filters.isAfterPhoto !== undefined) {
    query = query.eq('is_after_photo', filters.isAfterPhoto)
  }

  if (filters.dailyReportId) {
    query = query.eq('daily_report_id', filters.dailyReportId)
  }

  if (filters.punchItemId) {
    query = query.eq('punch_item_id', filters.punchItemId)
  }

  if (filters.safetyIncidentId) {
    query = query.eq('safety_incident_id', filters.safetyIncidentId)
  }

  if (filters.workflowItemId) {
    query = query.eq('workflow_item_id', filters.workflowItemId)
  }

  // Always filter out deleted
  query = query.is('deleted_at', null)

  // Sorting
  const sortBy = filters.sortBy || 'capturedAt'
  const sortOrder = filters.sortOrder || 'desc'
  const sortColumn = sortBy === 'capturedAt' ? 'captured_at' :
                     sortBy === 'createdAt' ? 'created_at' :
                     sortBy === 'fileName' ? 'file_name' : 'file_size'
  query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

  // Pagination
  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {throw error}
  return data?.map(mapPhotoFromDb) || []
}

/**
 * Get a single photo by ID
 */
export async function getPhoto(id: string): Promise<Photo | null> {
  const { data, error } = await db
    .from('photos')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {return null}
    throw error
  }

  return data ? mapPhotoFromDb(data) : null
}

/**
 * Create a new photo
 */
export async function createPhoto(dto: CreatePhotoDTO): Promise<Photo> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await db
    .from('photos')
    .insert({
      project_id: dto.projectId,
      file_url: dto.fileUrl,
      thumbnail_url: dto.thumbnailUrl,
      file_name: dto.fileName,
      file_size: dto.fileSize,
      width: dto.width,
      height: dto.height,
      is_360: dto.is360,
      captured_at: dto.capturedAt || new Date().toISOString(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      altitude: dto.altitude,
      gps_accuracy: dto.gpsAccuracy,
      caption: dto.caption,
      description: dto.description,
      building: dto.building,
      floor: dto.floor,
      area: dto.area,
      grid: dto.grid,
      photo_category: dto.photoCategory,
      tags: dto.tags,
      project_phase: dto.projectPhase,
      camera_make: dto.cameraMake,
      camera_model: dto.cameraModel,
      focal_length: dto.focalLength,
      aperture: dto.aperture,
      iso: dto.iso,
      exposure_time: dto.exposureTime,
      flash_used: dto.flashUsed,
      orientation: dto.orientation,
      weather_condition: dto.weatherCondition,
      temperature: dto.temperature,
      humidity: dto.humidity,
      daily_report_id: dto.dailyReportId,
      punch_item_id: dto.punchItemId,
      safety_incident_id: dto.safetyIncidentId,
      workflow_item_id: dto.workflowItemId,
      source: dto.source || 'upload',
      device_type: dto.deviceType,
      device_os: dto.deviceOs,
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) {throw error}
  return mapPhotoFromDb(data)
}

/**
 * Update a photo
 */
export async function updatePhoto(id: string, dto: UpdatePhotoDTO): Promise<Photo> {
  const { data: { user } } = await supabase.auth.getUser()

  const updateData: Record<string, any> = {}

  if (dto.caption !== undefined) {updateData.caption = dto.caption}
  if (dto.description !== undefined) {updateData.description = dto.description}
  if (dto.building !== undefined) {updateData.building = dto.building}
  if (dto.floor !== undefined) {updateData.floor = dto.floor}
  if (dto.area !== undefined) {updateData.area = dto.area}
  if (dto.grid !== undefined) {updateData.grid = dto.grid}
  if (dto.locationNotes !== undefined) {updateData.location_notes = dto.locationNotes}
  if (dto.photoCategory !== undefined) {updateData.photo_category = dto.photoCategory}
  if (dto.tags !== undefined) {updateData.tags = dto.tags}
  if (dto.projectPhase !== undefined) {updateData.project_phase = dto.projectPhase}
  if (dto.isPinned !== undefined) {updateData.is_pinned = dto.isPinned}

  if (dto.reviewStatus !== undefined) {
    updateData.review_status = dto.reviewStatus
    updateData.reviewed_by = user?.id
    updateData.reviewed_at = new Date().toISOString()
  }

  if (dto.reviewNotes !== undefined) {updateData.review_notes = dto.reviewNotes}

  const { data, error } = await db
    .from('photos')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {throw error}
  return mapPhotoFromDb(data)
}

/**
 * Soft delete a photo
 */
export async function deletePhoto(id: string): Promise<void> {
  const { error } = await db
    .from('photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {throw error}
}

/**
 * Bulk delete photos
 */
export async function bulkDeletePhotos(ids: string[]): Promise<void> {
  const { error } = await db
    .from('photos')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)

  if (error) {throw error}
}

/**
 * Link photo to entity
 */
export async function linkPhotoToEntity(
  photoId: string,
  entityType: string,
  entityId: string
): Promise<Photo> {
  const columnMap: Record<string, string> = {
    daily_report: 'daily_report_id',
    punch_item: 'punch_item_id',
    safety_incident: 'safety_incident_id',
    workflow_item: 'workflow_item_id',
  }

  const column = columnMap[entityType]
  if (!column) {throw new Error(`Invalid entity type: ${entityType}`)}

  const { data, error } = await db
    .from('photos')
    .update({ [column]: entityId })
    .eq('id', photoId)
    .select()
    .single()

  if (error) {throw error}
  return mapPhotoFromDb(data)
}

/**
 * Unlink photo from entity
 */
export async function unlinkPhotoFromEntity(
  photoId: string,
  entityType: string
): Promise<Photo> {
  const columnMap: Record<string, string> = {
    daily_report: 'daily_report_id',
    punch_item: 'punch_item_id',
    safety_incident: 'safety_incident_id',
    workflow_item: 'workflow_item_id',
  }

  const column = columnMap[entityType]
  if (!column) {throw new Error(`Invalid entity type: ${entityType}`)}

  const { data, error } = await db
    .from('photos')
    .update({ [column]: null })
    .eq('id', photoId)
    .select()
    .single()

  if (error) {throw error}
  return mapPhotoFromDb(data)
}

// =============================================
// Photo Collections
// =============================================

/**
 * Get collections with filters
 */
export async function getCollections(filters: CollectionFilters = {}): Promise<PhotoCollection[]> {
  let query = db.from('photo_collections').select(`
    *,
    cover_photo:photos!photo_collections_cover_photo_id_fkey(*)
  `)

  if (filters.projectId) {
    query = query.eq('project_id', filters.projectId)
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  if (filters.collectionType) {
    query = query.eq('collection_type', filters.collectionType)
  }

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType)
  }

  if (filters.entityId) {
    query = query.eq('entity_id', filters.entityId)
  }

  if (filters.isPinned !== undefined) {
    query = query.eq('is_pinned', filters.isPinned)
  }

  if (filters.isPublic !== undefined) {
    query = query.eq('is_public', filters.isPublic)
  }

  query = query.is('deleted_at', null).order('sort_order').order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {throw error}
  return data?.map(mapCollectionFromDb) || []
}

/**
 * Get a single collection by ID with photos
 */
export async function getCollection(id: string): Promise<PhotoCollection | null> {
  const { data, error } = await db
    .from('photo_collections')
    .select(`
      *,
      cover_photo:photos!photo_collections_cover_photo_id_fkey(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {return null}
    throw error
  }

  return data ? mapCollectionFromDb(data) : null
}

/**
 * Get photos in a collection
 */
export async function getCollectionPhotos(collectionId: string): Promise<Photo[]> {
  const { data, error } = await db
    .from('photo_collection_items')
    .select(`
      *,
      photo:photos(*)
    `)
    .eq('collection_id', collectionId)
    .order('sort_order')

  if (error) {throw error}

  return data?.map((item: any) => ({
    ...mapPhotoFromDb(item.photo),
    customCaption: item.custom_caption,
  })) || []
}

/**
 * Create a new collection
 */
export async function createCollection(dto: CreateCollectionDTO): Promise<PhotoCollection> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await db
    .from('photo_collections')
    .insert({
      project_id: dto.projectId,
      name: dto.name,
      description: dto.description,
      cover_photo_id: dto.coverPhotoId,
      collection_type: dto.collectionType,
      smart_criteria: dto.smartCriteria,
      location_name: dto.locationName,
      location_building: dto.locationBuilding,
      location_floor: dto.locationFloor,
      location_area: dto.locationArea,
      location_grid: dto.locationGrid,
      entity_type: dto.entityType,
      entity_id: dto.entityId,
      is_public: dto.isPublic,
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) {throw error}
  return mapCollectionFromDb(data)
}

/**
 * Update a collection
 */
export async function updateCollection(id: string, dto: UpdateCollectionDTO): Promise<PhotoCollection> {
  const updateData: Record<string, any> = {}

  if (dto.name !== undefined) {updateData.name = dto.name}
  if (dto.description !== undefined) {updateData.description = dto.description}
  if (dto.coverPhotoId !== undefined) {updateData.cover_photo_id = dto.coverPhotoId}
  if (dto.smartCriteria !== undefined) {updateData.smart_criteria = dto.smartCriteria}
  if (dto.sortOrder !== undefined) {updateData.sort_order = dto.sortOrder}
  if (dto.isPinned !== undefined) {updateData.is_pinned = dto.isPinned}
  if (dto.isPublic !== undefined) {updateData.is_public = dto.isPublic}

  const { data, error } = await db
    .from('photo_collections')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {throw error}
  return mapCollectionFromDb(data)
}

/**
 * Delete a collection
 */
export async function deleteCollection(id: string): Promise<void> {
  const { error } = await db
    .from('photo_collections')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {throw error}
}

/**
 * Add photo to collection
 */
export async function addPhotoToCollection(
  collectionId: string,
  photoId: string,
  customCaption?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  // Get max sort order
  const { data: existing } = await db
    .from('photo_collection_items')
    .select('sort_order')
    .eq('collection_id', collectionId)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

  const { error } = await db
    .from('photo_collection_items')
    .insert({
      collection_id: collectionId,
      photo_id: photoId,
      sort_order: nextOrder,
      custom_caption: customCaption,
      added_by: user?.id,
    })

  if (error) {throw error}
}

/**
 * Remove photo from collection
 */
export async function removePhotoFromCollection(
  collectionId: string,
  photoId: string
): Promise<void> {
  const { error } = await db
    .from('photo_collection_items')
    .delete()
    .eq('collection_id', collectionId)
    .eq('photo_id', photoId)

  if (error) {throw error}
}

/**
 * Reorder photos in collection
 */
export async function reorderCollectionPhotos(
  collectionId: string,
  photoIds: string[]
): Promise<void> {
  // Update each photo's sort order
  const updates = photoIds.map((photoId, index) =>
    db
      .from('photo_collection_items')
      .update({ sort_order: index })
      .eq('collection_id', collectionId)
      .eq('photo_id', photoId)
  )

  await Promise.all(updates)
}

// =============================================
// Photo Comparisons
// =============================================

/**
 * Get comparisons for a project
 */
export async function getComparisons(projectId: string): Promise<PhotoComparison[]> {
  const { data, error } = await db
    .from('photo_comparisons')
    .select(`
      *,
      before_photo:photos!photo_comparisons_before_photo_id_fkey(*),
      after_photo:photos!photo_comparisons_after_photo_id_fkey(*)
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {throw error}
  return data?.map(mapComparisonFromDb) || []
}

/**
 * Get a single comparison
 */
export async function getComparison(id: string): Promise<PhotoComparison | null> {
  const { data, error } = await db
    .from('photo_comparisons')
    .select(`
      *,
      before_photo:photos!photo_comparisons_before_photo_id_fkey(*),
      after_photo:photos!photo_comparisons_after_photo_id_fkey(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {return null}
    throw error
  }

  return data ? mapComparisonFromDb(data) : null
}

/**
 * Create a comparison
 */
export async function createComparison(dto: CreateComparisonDTO): Promise<PhotoComparison> {
  const { data: { user } } = await supabase.auth.getUser()

  // Update the photos to mark them as before/after
  await db
    .from('photos')
    .update({ is_before_photo: true, paired_photo_id: dto.afterPhotoId })
    .eq('id', dto.beforePhotoId)

  await db
    .from('photos')
    .update({ is_after_photo: true, paired_photo_id: dto.beforePhotoId })
    .eq('id', dto.afterPhotoId)

  const { data, error } = await db
    .from('photo_comparisons')
    .insert({
      project_id: dto.projectId,
      title: dto.title,
      description: dto.description,
      before_photo_id: dto.beforePhotoId,
      after_photo_id: dto.afterPhotoId,
      building: dto.building,
      floor: dto.floor,
      area: dto.area,
      grid: dto.grid,
      punch_item_id: dto.punchItemId,
      daily_report_id: dto.dailyReportId,
      workflow_item_id: dto.workflowItemId,
      comparison_type: dto.comparisonType || 'before_after',
      created_by: user?.id,
    })
    .select(`
      *,
      before_photo:photos!photo_comparisons_before_photo_id_fkey(*),
      after_photo:photos!photo_comparisons_after_photo_id_fkey(*)
    `)
    .single()

  if (error) {throw error}
  return mapComparisonFromDb(data)
}

/**
 * Complete a comparison (add after photo)
 */
export async function completeComparison(
  id: string,
  afterPhotoId: string
): Promise<PhotoComparison> {
  const { data, error } = await db
    .from('photo_comparisons')
    .update({
      after_photo_id: afterPhotoId,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      before_photo:photos!photo_comparisons_before_photo_id_fkey(*),
      after_photo:photos!photo_comparisons_after_photo_id_fkey(*)
    `)
    .single()

  if (error) {throw error}
  return mapComparisonFromDb(data)
}

/**
 * Delete a comparison
 */
export async function deleteComparison(id: string): Promise<void> {
  const { error } = await db
    .from('photo_comparisons')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {throw error}
}

// =============================================
// Photo Annotations
// =============================================

/**
 * Get annotations for a photo
 */
export async function getPhotoAnnotations(photoId: string): Promise<PhotoAnnotation[]> {
  const { data, error } = await db
    .from('photo_annotations')
    .select('*')
    .eq('photo_id', photoId)
    .is('deleted_at', null)
    .order('created_at')

  if (error) {throw error}
  return data?.map(mapAnnotationFromDb) || []
}

/**
 * Create an annotation
 */
export async function createAnnotation(dto: CreateAnnotationDTO): Promise<PhotoAnnotation> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await db
    .from('photo_annotations')
    .insert({
      photo_id: dto.photoId,
      annotation_type: dto.annotationType,
      annotation_data: dto.annotationData,
      color: dto.color || '#FF0000',
      stroke_width: dto.strokeWidth || 2,
      fill_color: dto.fillColor,
      opacity: dto.opacity || 1.0,
      layer: dto.layer || 'default',
      linked_entity_type: dto.linkedEntityType,
      linked_entity_id: dto.linkedEntityId,
      created_by: user?.id,
    })
    .select()
    .single()

  if (error) {throw error}
  return mapAnnotationFromDb(data)
}

/**
 * Delete an annotation
 */
export async function deleteAnnotation(id: string): Promise<void> {
  const { error } = await db
    .from('photo_annotations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {throw error}
}

// =============================================
// Photo Access Logging
// =============================================

/**
 * Log photo access
 */
export async function logPhotoAccess(
  photoId: string,
  action: PhotoAccessAction,
  context?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {return}

  const { error } = await db
    .from('photo_access_log')
    .insert({
      photo_id: photoId,
      user_id: user.id,
      action,
      context,
    })

  if (error) {logger.error('Failed to log photo access:', error)}
}

/**
 * Get access logs for a photo
 */
export async function getPhotoAccessLogs(photoId: string): Promise<PhotoAccessLog[]> {
  const { data, error } = await db
    .from('photo_access_log')
    .select('*')
    .eq('photo_id', photoId)
    .order('accessed_at', { ascending: false })

  if (error) {throw error}
  return data?.map(mapAccessLogFromDb) || []
}

// =============================================
// GPS and Location Queries
// =============================================

/**
 * Get photos near a location
 */
export async function getPhotosNearLocation(
  projectId: string,
  latitude: number,
  longitude: number,
  radiusMeters: number = 50
): Promise<Photo[]> {
  const { data, error } = await db.rpc('get_photos_by_location', {
    p_project_id: projectId,
    p_latitude: latitude,
    p_longitude: longitude,
    p_radius_meters: radiusMeters,
  })

  if (error) {throw error}
  return data?.map(mapPhotoFromDb) || []
}

/**
 * Get location clusters for map view
 */
export async function getLocationClusters(
  projectId: string,
  clusterRadius: number = 50
): Promise<LocationCluster[]> {
  // Get all photos with GPS
  const photos = await getPhotos({
    projectId,
    hasGps: true,
    limit: 1000,
  })

  // Simple clustering algorithm
  const clusters: LocationCluster[] = []
  const clustered = new Set<string>()

  for (const photo of photos) {
    if (clustered.has(photo.id) || !photo.latitude || !photo.longitude) {continue}

    // Find nearby photos
    const clusterPhotos = photos.filter(p => {
      if (clustered.has(p.id) || !p.latitude || !p.longitude) {return false}
      const distance = calculateDistance(
        photo.latitude!,
        photo.longitude!,
        p.latitude!,
        p.longitude!
      )
      return distance <= clusterRadius
    })

    // Add to cluster
    clusterPhotos.forEach(p => clustered.add(p.id))

    // Calculate cluster center
    const avgLat = clusterPhotos.reduce((sum, p) => sum + p.latitude!, 0) / clusterPhotos.length
    const avgLng = clusterPhotos.reduce((sum, p) => sum + p.longitude!, 0) / clusterPhotos.length

    clusters.push({
      latitude: avgLat,
      longitude: avgLng,
      photoCount: clusterPhotos.length,
      photos: clusterPhotos,
    })
  }

  return clusters
}

// =============================================
// Statistics
// =============================================

/**
 * Get photo statistics for a project
 */
export async function getPhotoStats(projectId: string): Promise<PhotoStats> {
  const { data, error } = await db.rpc('get_project_photo_stats', {
    p_project_id: projectId,
  })

  if (error) {throw error}

  const stats = data?.[0] || {}

  return {
    totalPhotos: stats.total_photos || 0,
    photosToday: stats.photos_today || 0,
    photosThisWeek: stats.photos_this_week || 0,
    photosWithGps: stats.photos_with_gps || 0,
    photosPendingReview: stats.photos_pending_review || 0,
    storageUsedBytes: stats.storage_used_bytes || 0,
    uniqueLocations: stats.unique_locations || 0,
    photosByCategory: stats.photos_by_category || {},
  }
}

/**
 * Get unique values for filters
 */
export async function getFilterOptions(projectId: string): Promise<{
  categories: string[]
  tags: string[]
  buildings: string[]
  floors: string[]
  areas: string[]
  projectPhases: string[]
}> {
  const { data, error } = await db
    .from('photos')
    .select('photo_category, tags, building, floor, area, project_phase')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (error) {throw error}

  const categories = new Set<string>()
  const tags = new Set<string>()
  const buildings = new Set<string>()
  const floors = new Set<string>()
  const areas = new Set<string>()
  const projectPhases = new Set<string>()

  data?.forEach((photo: any) => {
    if (photo.photo_category) {categories.add(photo.photo_category)}
    if (photo.tags) {photo.tags.forEach((t: string) => tags.add(t))}
    if (photo.building) {buildings.add(photo.building)}
    if (photo.floor) {floors.add(photo.floor)}
    if (photo.area) {areas.add(photo.area)}
    if (photo.project_phase) {projectPhases.add(photo.project_phase)}
  })

  return {
    categories: Array.from(categories).sort(),
    tags: Array.from(tags).sort(),
    buildings: Array.from(buildings).sort(),
    floors: Array.from(floors).sort(),
    areas: Array.from(areas).sort(),
    projectPhases: Array.from(projectPhases).sort(),
  }
}

// =============================================
// Helper Functions
// =============================================

function mapPhotoFromDb(row: any): Photo {
  return {
    id: row.id,
    projectId: row.project_id,
    fileUrl: row.file_url,
    thumbnailUrl: row.thumbnail_url,
    fileName: row.file_name,
    fileSize: row.file_size,
    width: row.width,
    height: row.height,
    is360: row.is_360,
    capturedAt: row.captured_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latitude: row.latitude ? parseFloat(row.latitude) : undefined,
    longitude: row.longitude ? parseFloat(row.longitude) : undefined,
    altitude: row.altitude ? parseFloat(row.altitude) : undefined,
    gpsAccuracy: row.gps_accuracy ? parseFloat(row.gps_accuracy) : undefined,
    heading: row.heading ? parseFloat(row.heading) : undefined,
    caption: row.caption,
    description: row.description,
    building: row.building,
    floor: row.floor,
    area: row.area,
    grid: row.grid,
    locationNotes: row.location_notes,
    photoCategory: row.photo_category,
    tags: row.tags,
    projectPhase: row.project_phase,
    cameraMake: row.camera_make,
    cameraModel: row.camera_model,
    focalLength: row.focal_length ? parseFloat(row.focal_length) : undefined,
    aperture: row.aperture,
    iso: row.iso,
    exposureTime: row.exposure_time,
    flashUsed: row.flash_used,
    orientation: row.orientation,
    weatherCondition: row.weather_condition,
    temperature: row.temperature ? parseFloat(row.temperature) : undefined,
    humidity: row.humidity,
    ocrText: row.ocr_text,
    ocrConfidence: row.ocr_confidence ? parseFloat(row.ocr_confidence) : undefined,
    aiTags: row.ai_tags,
    aiDescription: row.ai_description,
    aiObjectsDetected: row.ai_objects_detected,
    dailyReportId: row.daily_report_id,
    punchItemId: row.punch_item_id,
    safetyIncidentId: row.safety_incident_id,
    workflowItemId: row.workflow_item_id,
    checklistResponseId: row.checklist_response_id,
    linkedItems: row.linked_items,
    isBeforePhoto: row.is_before_photo,
    isAfterPhoto: row.is_after_photo,
    pairedPhotoId: row.paired_photo_id,
    source: row.source,
    deviceType: row.device_type,
    deviceOs: row.device_os,
    reviewStatus: row.review_status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
    isPinned: row.is_pinned,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
  }
}

function mapCollectionFromDb(row: any): PhotoCollection {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    coverPhotoId: row.cover_photo_id,
    coverPhoto: row.cover_photo ? mapPhotoFromDb(row.cover_photo) : undefined,
    collectionType: row.collection_type,
    smartCriteria: row.smart_criteria,
    locationName: row.location_name,
    locationBuilding: row.location_building,
    locationFloor: row.location_floor,
    locationArea: row.location_area,
    locationGrid: row.location_grid,
    entityType: row.entity_type,
    entityId: row.entity_id,
    sortOrder: row.sort_order,
    isPinned: row.is_pinned,
    isPublic: row.is_public,
    photoCount: row.photo_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
  }
}

function mapComparisonFromDb(row: any): PhotoComparison {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    beforePhotoId: row.before_photo_id,
    afterPhotoId: row.after_photo_id,
    beforePhoto: row.before_photo ? mapPhotoFromDb(row.before_photo) : undefined,
    afterPhoto: row.after_photo ? mapPhotoFromDb(row.after_photo) : undefined,
    building: row.building,
    floor: row.floor,
    area: row.area,
    grid: row.grid,
    punchItemId: row.punch_item_id,
    dailyReportId: row.daily_report_id,
    workflowItemId: row.workflow_item_id,
    comparisonType: row.comparison_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    completedAt: row.completed_at,
    deletedAt: row.deleted_at,
  }
}

function mapAnnotationFromDb(row: any): PhotoAnnotation {
  return {
    id: row.id,
    photoId: row.photo_id,
    annotationType: row.annotation_type,
    annotationData: row.annotation_data,
    color: row.color,
    strokeWidth: row.stroke_width,
    fillColor: row.fill_color,
    opacity: row.opacity ? parseFloat(row.opacity) : undefined,
    layer: row.layer,
    isVisible: row.is_visible,
    linkedEntityType: row.linked_entity_type,
    linkedEntityId: row.linked_entity_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    deletedAt: row.deleted_at,
  }
}

function mapAccessLogFromDb(row: any): PhotoAccessLog {
  return {
    id: row.id,
    photoId: row.photo_id,
    userId: row.user_id,
    action: row.action,
    context: row.context,
    deviceType: row.device_type,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    accessedAt: row.accessed_at,
  }
}

/**
 * Calculate distance between two GPS coordinates in meters
 * Using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}
