/**
 * Photo Progress Reports Types
 *
 * Types for tracking visual project progress with time-lapse photo comparisons.
 * Aligned with migration 156_photo_progress_reports.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum CaptureFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  MILESTONE = 'milestone',
}

export enum CameraDirection {
  NORTH = 'north',
  SOUTH = 'south',
  EAST = 'east',
  WEST = 'west',
  UP = 'up',
  DOWN = 'down',
}

export enum CameraHeight {
  GROUND = 'ground',
  EYE_LEVEL = 'eye_level',
  ELEVATED = 'elevated',
  AERIAL = 'aerial',
}

export enum WeatherCondition {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  OVERCAST = 'overcast',
  RAINY = 'rainy',
  SNOWY = 'snowy',
  FOGGY = 'foggy',
  WINDY = 'windy',
}

export enum ComparisonType {
  BEFORE_AFTER = 'before_after',
  TIMELAPSE = 'timelapse',
  MILESTONE = 'milestone',
}

export enum PhotoReportType {
  PROGRESS = 'progress',
  MILESTONE = 'milestone',
  MONTHLY = 'monthly',
  FINAL = 'final',
}

export enum PhotoReportStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  APPROVED = 'approved',
  DISTRIBUTED = 'distributed',
}

// ============================================================================
// PHOTO LOCATION TYPES
// ============================================================================

export interface PhotoLocation {
  id: string;
  project_id: string;
  company_id: string;
  name: string;
  description: string | null;
  location_code: string | null;
  building: string | null;
  floor: string | null;
  area: string | null;
  latitude: number | null;
  longitude: number | null;
  camera_direction: CameraDirection | string | null;
  camera_height: CameraHeight | string | null;
  reference_image_url: string | null;
  capture_instructions: string | null;
  capture_frequency: CaptureFrequency | string;
  next_capture_date: string | null;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PhotoLocationWithLatest extends PhotoLocation {
  latest_photo_id: string | null;
  latest_photo_url: string | null;
  latest_thumbnail_url: string | null;
  latest_capture_date: string | null;
  photo_count: number;
}

// ============================================================================
// PROGRESS PHOTO TYPES
// ============================================================================

export interface ProgressPhoto {
  id: string;
  project_id: string;
  company_id: string;
  location_id: string | null;
  photo_url: string;
  thumbnail_url: string | null;
  original_filename: string | null;
  file_size: number | null;
  capture_date: string;
  capture_time: string | null;
  captured_by: string | null;
  weather_condition: WeatherCondition | string | null;
  temperature: number | null;
  caption: string | null;
  notes: string | null;
  tags: string[] | null;
  camera_model: string | null;
  lens_info: string | null;
  focal_length: string | null;
  aperture: string | null;
  shutter_speed: string | null;
  iso: number | null;
  photo_latitude: number | null;
  photo_longitude: number | null;
  daily_report_id: string | null;
  milestone_id: string | null;
  is_featured: boolean;
  is_approved: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProgressPhotoWithDetails extends ProgressPhoto {
  location_name: string | null;
  location_code: string | null;
  captured_by_name: string | null;
  created_by_name: string | null;
}

// ============================================================================
// PHOTO COMPARISON TYPES
// ============================================================================

export interface PhotoComparison {
  id: string;
  project_id: string;
  company_id: string;
  location_id: string | null;
  title: string;
  description: string | null;
  comparison_type: ComparisonType | string;
  before_photo_id: string | null;
  after_photo_id: string | null;
  photo_ids: string[] | null;
  start_date: string | null;
  end_date: string | null;
  is_public: boolean;
  share_token: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PhotoComparisonWithDetails extends PhotoComparison {
  location_name: string | null;
  before_photo: ProgressPhoto | null;
  after_photo: ProgressPhoto | null;
  photos: ProgressPhoto[];
  created_by_name: string | null;
}

// ============================================================================
// PHOTO PROGRESS REPORT TYPES
// ============================================================================

export interface PhotoProgressReport {
  id: string;
  project_id: string;
  company_id: string;
  report_number: number;
  title: string;
  description: string | null;
  report_type: PhotoReportType | string;
  period_start: string;
  period_end: string;
  location_ids: string[] | null;
  photo_ids: string[] | null;
  comparison_ids: string[] | null;
  executive_summary: string | null;
  progress_notes: string | null;
  issues_noted: string | null;
  weather_summary: WeatherSummary | null;
  status: PhotoReportStatus | string;
  distributed_at: string | null;
  distributed_to: string[] | null;
  pdf_url: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WeatherSummary {
  sunny_days?: number;
  cloudy_days?: number;
  rainy_days?: number;
  work_days?: number;
  avg_temperature?: number;
}

export interface PhotoProgressReportWithDetails extends PhotoProgressReport {
  locations: PhotoLocation[];
  photos: ProgressPhoto[];
  comparisons: PhotoComparison[];
  approved_by_name: string | null;
  created_by_name: string | null;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface PhotoLocationFilters {
  projectId: string;
  isActive?: boolean;
  building?: string;
  floor?: string;
  captureFrequency?: CaptureFrequency | string;
  search?: string;
}

export interface ProgressPhotoFilters {
  projectId: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  capturedBy?: string;
  isFeatured?: boolean;
  tags?: string[];
  search?: string;
}

export interface PhotoComparisonFilters {
  projectId: string;
  locationId?: string;
  comparisonType?: ComparisonType | string;
  isPublic?: boolean;
  search?: string;
}

export interface PhotoReportFilters {
  projectId: string;
  reportType?: PhotoReportType | string;
  status?: PhotoReportStatus | string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// ============================================================================
// DTO TYPES
// ============================================================================

export interface CreatePhotoLocationDTO {
  project_id: string;
  company_id: string;
  name: string;
  description?: string;
  location_code?: string;
  building?: string;
  floor?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  camera_direction?: CameraDirection | string;
  camera_height?: CameraHeight | string;
  reference_image_url?: string;
  capture_instructions?: string;
  capture_frequency?: CaptureFrequency | string;
  next_capture_date?: string;
  sort_order?: number;
}

export interface UpdatePhotoLocationDTO {
  name?: string;
  description?: string;
  location_code?: string;
  building?: string;
  floor?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  camera_direction?: CameraDirection | string;
  camera_height?: CameraHeight | string;
  reference_image_url?: string;
  capture_instructions?: string;
  capture_frequency?: CaptureFrequency | string;
  next_capture_date?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateProgressPhotoDTO {
  project_id: string;
  company_id: string;
  location_id?: string;
  photo_url: string;
  thumbnail_url?: string;
  original_filename?: string;
  file_size?: number;
  capture_date: string;
  capture_time?: string;
  weather_condition?: WeatherCondition | string;
  temperature?: number;
  caption?: string;
  notes?: string;
  tags?: string[];
  camera_model?: string;
  photo_latitude?: number;
  photo_longitude?: number;
  daily_report_id?: string;
  milestone_id?: string;
  is_featured?: boolean;
}

export interface UpdateProgressPhotoDTO {
  location_id?: string;
  caption?: string;
  notes?: string;
  tags?: string[];
  weather_condition?: WeatherCondition | string;
  temperature?: number;
  is_featured?: boolean;
  is_approved?: boolean;
}

export interface CreatePhotoComparisonDTO {
  project_id: string;
  company_id: string;
  location_id?: string;
  title: string;
  description?: string;
  comparison_type?: ComparisonType | string;
  before_photo_id?: string;
  after_photo_id?: string;
  photo_ids?: string[];
  start_date?: string;
  end_date?: string;
  is_public?: boolean;
}

export interface UpdatePhotoComparisonDTO {
  title?: string;
  description?: string;
  comparison_type?: ComparisonType | string;
  before_photo_id?: string;
  after_photo_id?: string;
  photo_ids?: string[];
  start_date?: string;
  end_date?: string;
  is_public?: boolean;
}

export interface CreatePhotoReportDTO {
  project_id: string;
  company_id: string;
  title: string;
  description?: string;
  report_type?: PhotoReportType | string;
  period_start: string;
  period_end: string;
  location_ids?: string[];
  photo_ids?: string[];
  comparison_ids?: string[];
  executive_summary?: string;
  progress_notes?: string;
  issues_noted?: string;
}

export interface UpdatePhotoReportDTO {
  title?: string;
  description?: string;
  report_type?: PhotoReportType | string;
  period_start?: string;
  period_end?: string;
  location_ids?: string[];
  photo_ids?: string[];
  comparison_ids?: string[];
  executive_summary?: string;
  progress_notes?: string;
  issues_noted?: string;
  weather_summary?: WeatherSummary;
  status?: PhotoReportStatus | string;
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface PhotoProgressStats {
  project_id: string;
  total_locations: number;
  active_locations: number;
  total_photos: number;
  featured_photos: number;
  total_comparisons: number;
  total_reports: number;
  photos_this_month: number;
  locations_due_for_capture: number;
}

export interface PhotoProgressByMonth {
  project_id: string;
  month: string;
  photo_count: number;
  locations_covered: number;
  featured_count: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getCaptureFrequencyLabel(frequency: CaptureFrequency | string): string {
  const labels: Record<string, string> = {
    [CaptureFrequency.DAILY]: 'Daily',
    [CaptureFrequency.WEEKLY]: 'Weekly',
    [CaptureFrequency.BIWEEKLY]: 'Bi-Weekly',
    [CaptureFrequency.MONTHLY]: 'Monthly',
    [CaptureFrequency.MILESTONE]: 'At Milestones',
  };
  return labels[frequency] || frequency;
}

export function getWeatherConditionLabel(condition: WeatherCondition | string): string {
  const labels: Record<string, string> = {
    [WeatherCondition.SUNNY]: 'Sunny',
    [WeatherCondition.CLOUDY]: 'Cloudy',
    [WeatherCondition.OVERCAST]: 'Overcast',
    [WeatherCondition.RAINY]: 'Rainy',
    [WeatherCondition.SNOWY]: 'Snowy',
    [WeatherCondition.FOGGY]: 'Foggy',
    [WeatherCondition.WINDY]: 'Windy',
  };
  return labels[condition] || condition;
}

export function getComparisonTypeLabel(type: ComparisonType | string): string {
  const labels: Record<string, string> = {
    [ComparisonType.BEFORE_AFTER]: 'Before & After',
    [ComparisonType.TIMELAPSE]: 'Timelapse',
    [ComparisonType.MILESTONE]: 'Milestone',
  };
  return labels[type] || type;
}

export function getReportStatusLabel(status: PhotoReportStatus | string): string {
  const labels: Record<string, string> = {
    [PhotoReportStatus.DRAFT]: 'Draft',
    [PhotoReportStatus.REVIEW]: 'In Review',
    [PhotoReportStatus.APPROVED]: 'Approved',
    [PhotoReportStatus.DISTRIBUTED]: 'Distributed',
  };
  return labels[status] || status;
}
