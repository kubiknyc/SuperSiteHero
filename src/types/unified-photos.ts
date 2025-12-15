/**
 * Unified Photos Types
 * Types for the Photo Evidence Hub system
 * Aligned with migration 121_unified_photo_evidence_hub.sql
 */

// =============================================================================
// Entity Types
// =============================================================================

export type PhotoEntityType =
  | 'daily_report'
  | 'punch_item'
  | 'rfi'
  | 'submittal'
  | 'inspection'
  | 'checklist'
  | 'change_order'
  | 'safety_incident'
  | 'safety_observation'
  | 'equipment'
  | 'equipment_inspection'
  | 'task'
  | 'meeting'
  | 'workflow_item'
  | 'near_miss';

export type UploadBatchStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

// =============================================================================
// Photo Entity Link Types
// =============================================================================

export interface PhotoEntityLink {
  id: string;
  photo_id: string;
  entity_type: PhotoEntityType;
  entity_id: string;
  linked_at: string;
  linked_by: string | null;
  is_primary: boolean;
  context_note: string | null;
  company_id: string;
}

export interface PhotoEntityLinkWithPhoto extends PhotoEntityLink {
  photo: {
    id: string;
    file_url: string;
    thumbnail_url: string | null;
    file_name: string;
    caption: string | null;
    captured_at: string | null;
    building: string | null;
    floor: string | null;
    area: string | null;
  };
}

// =============================================================================
// Photo Hash Types (Deduplication)
// =============================================================================

export interface PhotoHash {
  id: string;
  photo_id: string;
  phash: string;
  dhash: string | null;
  ahash: string | null;
  file_hash: string | null;
  created_at: string;
}

export interface DuplicatePhotoResult {
  photo_id: string;
  similarity: number;
}

// =============================================================================
// Upload Batch Types
// =============================================================================

export interface PhotoUploadBatch {
  id: string;
  project_id: string;
  company_id: string;
  uploaded_by: string | null;
  batch_name: string | null;
  total_photos: number;
  processed_photos: number;
  failed_photos: number;
  status: UploadBatchStatus;
  default_entity_type: string | null;
  default_entity_id: string | null;
  error_message: string | null;
  errors: BatchError[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface BatchError {
  file_name: string;
  error: string;
  timestamp: string;
}

// =============================================================================
// DTO Types
// =============================================================================

export interface LinkPhotoToEntityDTO {
  photo_id: string;
  entity_type: PhotoEntityType;
  entity_id: string;
  is_primary?: boolean;
  context_note?: string;
}

export interface BulkLinkPhotosDTO {
  photo_ids: string[];
  entity_type: PhotoEntityType;
  entity_id: string;
}

export interface CreateUploadBatchDTO {
  project_id: string;
  batch_name?: string;
  total_photos: number;
  default_entity_type?: PhotoEntityType;
  default_entity_id?: string;
}

export interface UpdateBatchProgressDTO {
  processed_photos?: number;
  failed_photos?: number;
  status?: UploadBatchStatus;
  error_message?: string;
  errors?: BatchError[];
}

// =============================================================================
// Photo Upload Metadata
// =============================================================================

export interface PhotoUploadMetadata {
  projectId: string;
  caption?: string;
  description?: string;
  building?: string;
  floor?: string;
  area?: string;
  grid?: string;
  tags?: string[];
  photoCategory?: string;
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
  entityLinks?: Array<{
    entityType: PhotoEntityType;
    entityId: string;
    isPrimary?: boolean;
  }>;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface PhotoEntityFilters {
  entityType?: PhotoEntityType;
  entityId?: string;
  projectId?: string;
  isPrimary?: boolean;
  linkedBy?: string;
  linkedAfter?: string;
  linkedBefore?: string;
}

export interface PhotoHubFilters {
  projectId: string;
  search?: string;
  entityTypes?: PhotoEntityType[];
  dateFrom?: string;
  dateTo?: string;
  building?: string;
  floor?: string;
  area?: string;
  tags?: string[];
  hasLinks?: boolean;
  isOrphan?: boolean;
  sortBy?: 'capturedAt' | 'linkedAt' | 'fileName';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// =============================================================================
// Statistics Types
// =============================================================================

export interface PhotoHubStats {
  totalPhotos: number;
  linkedPhotos: number;
  orphanPhotos: number;
  photosByEntityType: Record<PhotoEntityType, number>;
  photosByLocation: {
    building: string | null;
    floor: string | null;
    count: number;
  }[];
  recentUploads: number;
  storageUsedMB: number;
}

// =============================================================================
// Entity Reference Types
// =============================================================================

export interface EntityReference {
  type: PhotoEntityType;
  id: string;
  displayName: string;
  displayNumber?: string;
  status?: string;
}

export interface PhotoWithEntities {
  id: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  caption: string | null;
  description: string | null;
  capturedAt: string | null;
  createdAt: string;
  building: string | null;
  floor: string | null;
  area: string | null;
  tags: string[] | null;
  linkedEntities: EntityReference[];
  linkCount: number;
}

// =============================================================================
// Compression Options
// =============================================================================

export interface PhotoCompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: 'jpeg' | 'webp' | 'png';
  preserveExif?: boolean;
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

// =============================================================================
// Utility Constants
// =============================================================================

export const ENTITY_TYPE_LABELS: Record<PhotoEntityType, string> = {
  daily_report: 'Daily Report',
  punch_item: 'Punch Item',
  rfi: 'RFI',
  submittal: 'Submittal',
  inspection: 'Inspection',
  checklist: 'Checklist',
  change_order: 'Change Order',
  safety_incident: 'Safety Incident',
  safety_observation: 'Safety Observation',
  equipment: 'Equipment',
  equipment_inspection: 'Equipment Inspection',
  task: 'Task',
  meeting: 'Meeting',
  workflow_item: 'Workflow Item',
  near_miss: 'Near Miss',
};

export const ENTITY_TYPE_COLORS: Record<PhotoEntityType, string> = {
  daily_report: 'blue',
  punch_item: 'orange',
  rfi: 'purple',
  submittal: 'indigo',
  inspection: 'yellow',
  checklist: 'green',
  change_order: 'red',
  safety_incident: 'red',
  safety_observation: 'amber',
  equipment: 'teal',
  equipment_inspection: 'cyan',
  task: 'slate',
  meeting: 'violet',
  workflow_item: 'pink',
  near_miss: 'rose',
};
