/**
 * Photo Progress Templates Types
 * Structured progress photo workflow with location templates and requirements tracking
 */

// ============================================================================
// PHOTO LOCATION TEMPLATES
// ============================================================================

export type PhotoFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'milestone' | 'on_demand';

export type PhotoCategory = 'progress' | 'safety' | 'quality' | 'weather' | 'milestone' | 'closeout' | 'other';

export type RequiredAngle = 'front' | 'side' | 'rear' | 'aerial' | 'detail' | 'panoramic' | 'interior' | 'exterior' | 'any';

export interface PhotoLocationTemplate {
  id: string;
  projectId: string;

  // Location identification
  name: string;
  description?: string;
  building?: string;
  floor?: string;
  area?: string;
  gridReference?: string;

  // GPS coordinates for exact spot
  latitude?: number;
  longitude?: number;
  gpsRadiusMeters?: number; // Acceptable distance from coordinates

  // Reference photo showing exact angle/framing
  referencePhotoId?: string;
  referencePhotoUrl?: string;

  // Requirements
  isRequired: boolean;
  frequency: PhotoFrequency;
  dayOfWeek?: number; // 0=Sunday, for weekly
  dayOfMonth?: number; // For monthly

  // Categorization
  category: PhotoCategory;
  tags?: string[];

  // Display
  sortOrder: number;
  isActive: boolean;
  color?: string; // Hex color for UI grouping
  icon?: string; // Icon name for UI

  // Instructions
  photoInstructions?: string;
  requiredAngle?: RequiredAngle;
  minPhotosRequired: number;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  deletedAt?: string;
}

export interface PhotoLocationTemplateInsert {
  projectId: string;
  name: string;
  description?: string;
  building?: string;
  floor?: string;
  area?: string;
  gridReference?: string;
  latitude?: number;
  longitude?: number;
  gpsRadiusMeters?: number;
  referencePhotoId?: string;
  referencePhotoUrl?: string;
  isRequired?: boolean;
  frequency?: PhotoFrequency;
  dayOfWeek?: number;
  dayOfMonth?: number;
  category?: PhotoCategory;
  tags?: string[];
  sortOrder?: number;
  isActive?: boolean;
  color?: string;
  icon?: string;
  photoInstructions?: string;
  requiredAngle?: RequiredAngle;
  minPhotosRequired?: number;
}

export interface PhotoLocationTemplateUpdate {
  name?: string;
  description?: string | null;
  building?: string | null;
  floor?: string | null;
  area?: string | null;
  gridReference?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  gpsRadiusMeters?: number | null;
  referencePhotoId?: string | null;
  referencePhotoUrl?: string | null;
  isRequired?: boolean;
  frequency?: PhotoFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  category?: PhotoCategory;
  tags?: string[] | null;
  sortOrder?: number;
  isActive?: boolean;
  color?: string | null;
  icon?: string | null;
  photoInstructions?: string | null;
  requiredAngle?: RequiredAngle | null;
  minPhotosRequired?: number;
}

// ============================================================================
// PHOTO REQUIREMENTS
// ============================================================================

export type RequirementStatus = 'pending' | 'completed' | 'missed' | 'skipped' | 'partial';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_retake';

export interface PhotoRequirement {
  id: string;
  projectId: string;
  templateId: string;

  // When photo is due
  dueDate: string;
  dueTime?: string;

  // Status tracking
  status: RequirementStatus;

  // Completion details
  completedPhotoIds: string[];
  photosCount: number;
  completedAt?: string;
  completedBy?: string;

  // For missed/skipped
  skipReason?: string;
  skippedBy?: string;

  // Quality check
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;

  // Notifications
  reminderSentAt?: string;
  overdueNotificationSentAt?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Joined data
  template?: PhotoLocationTemplate;
}

export interface PhotoRequirementWithTemplate extends PhotoRequirement {
  template: PhotoLocationTemplate;
}

// ============================================================================
// PHOTO PROGRESS SERIES
// ============================================================================

export interface PhotoProgressSeries {
  id: string;
  projectId: string;
  templateId?: string;

  // Series identification
  name: string;
  description?: string;

  // Location
  building?: string;
  floor?: string;
  area?: string;

  // Photos in series
  photoIds: string[];

  // Display settings
  isFeatured: boolean;
  thumbnailPhotoId?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  deletedAt?: string;
}

export interface PhotoProgressSeriesInsert {
  projectId: string;
  templateId?: string;
  name: string;
  description?: string;
  building?: string;
  floor?: string;
  area?: string;
  photoIds?: string[];
  isFeatured?: boolean;
  thumbnailPhotoId?: string;
}

// ============================================================================
// STATISTICS & FILTERS
// ============================================================================

export interface PhotoCompletionStats {
  totalRequired: number;
  completed: number;
  missed: number;
  pending: number;
  completionRate: number;
}

export interface PhotoRequirementFilters {
  projectId: string;
  status?: RequirementStatus | RequirementStatus[];
  templateId?: string;
  category?: PhotoCategory;
  startDate?: string;
  endDate?: string;
  includeTemplate?: boolean;
}

export interface PhotoTemplateFilters {
  projectId: string;
  isActive?: boolean;
  isRequired?: boolean;
  frequency?: PhotoFrequency;
  category?: PhotoCategory;
}

// ============================================================================
// DAILY CHECKLIST VIEW
// ============================================================================

export interface DailyPhotoChecklist {
  date: string;
  projectId: string;
  requirements: PhotoRequirementWithTemplate[];
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
}

// ============================================================================
// PROGRESS TIMELINE VIEW
// ============================================================================

export interface ProgressTimelineEntry {
  date: string;
  photoId: string;
  photoUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  templateName: string;
}

export interface LocationProgressTimeline {
  templateId: string;
  templateName: string;
  location: {
    building?: string;
    floor?: string;
    area?: string;
  };
  entries: ProgressTimelineEntry[];
  firstPhoto?: string;
  lastPhoto?: string;
  totalPhotos: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GenerateRequirementsResponse {
  generated: number;
  date: string;
}

export interface CompleteRequirementResponse {
  success: boolean;
  requirement: PhotoRequirement;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const PHOTO_FREQUENCIES: { value: PhotoFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'milestone', label: 'At Milestones' },
  { value: 'on_demand', label: 'On Demand' },
];

export const PHOTO_CATEGORIES: { value: PhotoCategory; label: string; icon: string }[] = [
  { value: 'progress', label: 'Progress', icon: 'TrendingUp' },
  { value: 'safety', label: 'Safety', icon: 'ShieldCheck' },
  { value: 'quality', label: 'Quality', icon: 'CheckCircle' },
  { value: 'weather', label: 'Weather', icon: 'Cloud' },
  { value: 'milestone', label: 'Milestone', icon: 'Flag' },
  { value: 'closeout', label: 'Closeout', icon: 'PackageCheck' },
  { value: 'other', label: 'Other', icon: 'Camera' },
];

export const REQUIRED_ANGLES: { value: RequiredAngle; label: string }[] = [
  { value: 'front', label: 'Front View' },
  { value: 'side', label: 'Side View' },
  { value: 'rear', label: 'Rear View' },
  { value: 'aerial', label: 'Aerial/Drone' },
  { value: 'detail', label: 'Detail/Close-up' },
  { value: 'panoramic', label: 'Panoramic' },
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'any', label: 'Any Angle' },
];

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];
