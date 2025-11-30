/**
 * Camera & Photo Management Types
 *
 * Comprehensive type definitions for the photo management system including:
 * - Photo metadata and EXIF data
 * - Photo collections and albums
 * - Before/after comparisons
 * - Photo annotations
 * - GPS and location data
 */

// =============================================
// Photo Source and Device Types
// =============================================

export type PhotoSource = 'camera' | 'upload' | 'import' | 'scan'
export type DeviceType = 'mobile' | 'tablet' | 'desktop'
export type PhotoReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged'
export type CollectionType = 'album' | 'smart' | 'location' | 'date' | 'entity'
export type ComparisonType = 'before_after' | 'progress' | 'issue_resolution'
export type ComparisonStatus = 'pending' | 'completed' | 'approved'
export type AnnotationType = 'arrow' | 'circle' | 'rectangle' | 'text' | 'freehand' | 'measurement' | 'pin'
export type PhotoAccessAction = 'view' | 'download' | 'share' | 'print' | 'edit' | 'annotate'
export type LinkedEntityType = 'daily_report' | 'punch_item' | 'rfi' | 'safety_incident' | 'submittal' | 'change_order' | 'checklist'

// =============================================
// GPS and Location Types
// =============================================

export interface GPSCoordinates {
  latitude: number
  longitude: number
  altitude?: number
  accuracy?: number
  heading?: number
}

export interface PhotoLocation {
  building?: string
  floor?: string
  area?: string
  grid?: string
  notes?: string
}

// =============================================
// Camera and EXIF Metadata
// =============================================

export interface CameraMetadata {
  make?: string
  model?: string
  focalLength?: number
  aperture?: string
  iso?: number
  exposureTime?: string
  flashUsed?: boolean
  orientation?: number
}

export interface WeatherConditions {
  condition?: string // 'sunny', 'cloudy', 'rainy', 'snowy', etc.
  temperature?: number // Celsius
  humidity?: number // Percentage
}

export interface PhotoMetadata {
  // File info
  fileName: string
  fileSize: number
  mimeType: string
  width?: number
  height?: number

  // Timestamps
  capturedAt?: string
  uploadedAt: string

  // GPS
  gps?: GPSCoordinates

  // Camera
  camera?: CameraMetadata

  // Weather
  weather?: WeatherConditions

  // Device
  source: PhotoSource
  deviceType?: DeviceType
  deviceOs?: string
}

// =============================================
// AI and OCR Data
// =============================================

export interface PhotoAiData {
  ocrText?: string
  ocrConfidence?: number
  aiTags?: string[]
  aiDescription?: string
  objectsDetected?: DetectedObject[]
}

export interface DetectedObject {
  name: string
  confidence: number
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

// =============================================
// Photo Entity
// =============================================

export interface Photo {
  id: string
  projectId: string

  // File info
  fileUrl: string
  thumbnailUrl?: string
  fileName: string
  fileSize?: number
  width?: number
  height?: number
  is360?: boolean

  // Timestamps
  capturedAt?: string
  createdAt: string
  updatedAt: string

  // GPS
  latitude?: number
  longitude?: number
  altitude?: number
  gpsAccuracy?: number
  heading?: number

  // User metadata
  caption?: string
  description?: string

  // Location tagging
  building?: string
  floor?: string
  area?: string
  grid?: string
  locationNotes?: string

  // Categorization
  photoCategory?: string
  tags?: string[]
  projectPhase?: string

  // Camera metadata
  cameraMake?: string
  cameraModel?: string
  focalLength?: number
  aperture?: string
  iso?: number
  exposureTime?: string
  flashUsed?: boolean
  orientation?: number

  // Weather
  weatherCondition?: string
  temperature?: number
  humidity?: number

  // AI data
  ocrText?: string
  ocrConfidence?: number
  aiTags?: string[]
  aiDescription?: string
  aiObjectsDetected?: DetectedObject[]

  // Entity linking
  dailyReportId?: string
  punchItemId?: string
  safetyIncidentId?: string
  workflowItemId?: string
  checklistResponseId?: string
  linkedItems?: LinkedItem[]

  // Before/After pairing
  isBeforePhoto?: boolean
  isAfterPhoto?: boolean
  pairedPhotoId?: string

  // Source tracking
  source?: PhotoSource
  deviceType?: DeviceType
  deviceOs?: string

  // Review status
  reviewStatus?: PhotoReviewStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string

  // Visibility
  isPinned?: boolean

  // Audit
  createdBy?: string
  deletedAt?: string
}

export interface LinkedItem {
  type: LinkedEntityType
  id: string
  title?: string
}

// =============================================
// Photo Collection Types
// =============================================

export interface PhotoCollection {
  id: string
  projectId: string

  // Collection info
  name: string
  description?: string
  coverPhotoId?: string
  coverPhoto?: Photo

  // Collection type
  collectionType: CollectionType

  // Smart collection criteria
  smartCriteria?: SmartCollectionCriteria

  // Location-based
  locationName?: string
  locationBuilding?: string
  locationFloor?: string
  locationArea?: string
  locationGrid?: string

  // Entity-based
  entityType?: LinkedEntityType
  entityId?: string

  // Display
  sortOrder?: number
  isPinned?: boolean
  isPublic?: boolean

  // Stats
  photoCount: number

  // Audit
  createdAt: string
  updatedAt: string
  createdBy?: string
  deletedAt?: string
}

export interface SmartCollectionCriteria {
  tags?: string[]
  categories?: string[]
  dateRange?: {
    start: string
    end: string
  }
  location?: PhotoLocation
  hasGps?: boolean
  reviewStatus?: PhotoReviewStatus
  source?: PhotoSource
}

export interface PhotoCollectionItem {
  id: string
  collectionId: string
  photoId: string
  photo?: Photo

  sortOrder?: number
  customCaption?: string

  addedAt: string
  addedBy?: string
}

// =============================================
// Photo Comparison Types
// =============================================

export interface PhotoComparison {
  id: string
  projectId: string

  // Comparison info
  title: string
  description?: string

  // Photo pair
  beforePhotoId: string
  afterPhotoId: string
  beforePhoto?: Photo
  afterPhoto?: Photo

  // Location
  building?: string
  floor?: string
  area?: string
  grid?: string

  // Entity linking
  punchItemId?: string
  dailyReportId?: string
  workflowItemId?: string

  // Type and status
  comparisonType: ComparisonType
  status: ComparisonStatus

  // Audit
  createdAt: string
  updatedAt: string
  createdBy?: string
  completedAt?: string
  deletedAt?: string
}

// =============================================
// Photo Annotation Types
// =============================================

export interface PhotoAnnotation {
  id: string
  photoId: string

  // Annotation type
  annotationType: AnnotationType

  // Annotation data
  annotationData: AnnotationData

  // Styling
  color?: string
  strokeWidth?: number
  fillColor?: string
  opacity?: number

  // Layer
  layer?: string
  isVisible?: boolean

  // Linked entity
  linkedEntityType?: LinkedEntityType
  linkedEntityId?: string

  // Audit
  createdAt: string
  updatedAt: string
  createdBy?: string
  deletedAt?: string
}

export type AnnotationData =
  | ArrowAnnotation
  | CircleAnnotation
  | RectangleAnnotation
  | TextAnnotation
  | FreehandAnnotation
  | MeasurementAnnotation
  | PinAnnotation

export interface ArrowAnnotation {
  type: 'arrow'
  start: { x: number; y: number }
  end: { x: number; y: number }
}

export interface CircleAnnotation {
  type: 'circle'
  center: { x: number; y: number }
  radius: number
}

export interface RectangleAnnotation {
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
}

export interface TextAnnotation {
  type: 'text'
  x: number
  y: number
  text: string
  fontSize?: number
  fontFamily?: string
}

export interface FreehandAnnotation {
  type: 'freehand'
  points: Array<{ x: number; y: number }>
}

export interface MeasurementAnnotation {
  type: 'measurement'
  start: { x: number; y: number }
  end: { x: number; y: number }
  value: string
  unit?: string
}

export interface PinAnnotation {
  type: 'pin'
  x: number
  y: number
  label?: string
}

// =============================================
// Photo Access Log Types
// =============================================

export interface PhotoAccessLog {
  id: string
  photoId: string
  userId: string

  action: PhotoAccessAction
  context?: string

  deviceType?: string
  ipAddress?: string
  userAgent?: string

  accessedAt: string
}

// =============================================
// Photo Statistics Types
// =============================================

export interface PhotoStats {
  totalPhotos: number
  photosToday: number
  photosThisWeek: number
  photosWithGps: number
  photosPendingReview: number
  storageUsedBytes: number
  uniqueLocations: number
  photosByCategory: Record<string, number>
}

export interface LocationCluster {
  latitude: number
  longitude: number
  photoCount: number
  photos: Photo[]
  bounds?: {
    north: number
    south: number
    east: number
    west: number
  }
}

// =============================================
// DTO Types for API Operations
// =============================================

export interface CreatePhotoDTO {
  projectId: string
  fileUrl: string
  thumbnailUrl?: string
  fileName: string
  fileSize?: number
  width?: number
  height?: number
  is360?: boolean
  capturedAt?: string
  latitude?: number
  longitude?: number
  altitude?: number
  gpsAccuracy?: number
  caption?: string
  description?: string
  building?: string
  floor?: string
  area?: string
  grid?: string
  photoCategory?: string
  tags?: string[]
  projectPhase?: string
  cameraMake?: string
  cameraModel?: string
  focalLength?: number
  aperture?: string
  iso?: number
  exposureTime?: string
  flashUsed?: boolean
  orientation?: number
  weatherCondition?: string
  temperature?: number
  humidity?: number
  dailyReportId?: string
  punchItemId?: string
  safetyIncidentId?: string
  workflowItemId?: string
  source?: PhotoSource
  deviceType?: DeviceType
  deviceOs?: string
}

export interface UpdatePhotoDTO {
  caption?: string
  description?: string
  building?: string
  floor?: string
  area?: string
  grid?: string
  locationNotes?: string
  photoCategory?: string
  tags?: string[]
  projectPhase?: string
  isPinned?: boolean
  reviewStatus?: PhotoReviewStatus
  reviewNotes?: string
}

export interface CreateCollectionDTO {
  projectId: string
  name: string
  description?: string
  coverPhotoId?: string
  collectionType: CollectionType
  smartCriteria?: SmartCollectionCriteria
  locationName?: string
  locationBuilding?: string
  locationFloor?: string
  locationArea?: string
  locationGrid?: string
  entityType?: LinkedEntityType
  entityId?: string
  isPublic?: boolean
}

export interface UpdateCollectionDTO {
  name?: string
  description?: string
  coverPhotoId?: string
  smartCriteria?: SmartCollectionCriteria
  sortOrder?: number
  isPinned?: boolean
  isPublic?: boolean
}

export interface CreateComparisonDTO {
  projectId: string
  title: string
  description?: string
  beforePhotoId: string
  afterPhotoId: string
  building?: string
  floor?: string
  area?: string
  grid?: string
  punchItemId?: string
  dailyReportId?: string
  workflowItemId?: string
  comparisonType?: ComparisonType
}

export interface CreateAnnotationDTO {
  photoId: string
  annotationType: AnnotationType
  annotationData: AnnotationData
  color?: string
  strokeWidth?: number
  fillColor?: string
  opacity?: number
  layer?: string
  linkedEntityType?: LinkedEntityType
  linkedEntityId?: string
}

// =============================================
// Filter Types
// =============================================

export interface PhotoFilters {
  projectId?: string
  search?: string
  category?: string
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  hasGps?: boolean
  building?: string
  floor?: string
  area?: string
  grid?: string
  source?: PhotoSource
  reviewStatus?: PhotoReviewStatus
  isPinned?: boolean
  isBeforePhoto?: boolean
  isAfterPhoto?: boolean
  dailyReportId?: string
  punchItemId?: string
  safetyIncidentId?: string
  workflowItemId?: string
  limit?: number
  offset?: number
  sortBy?: 'capturedAt' | 'createdAt' | 'fileName' | 'fileSize'
  sortOrder?: 'asc' | 'desc'
}

export interface CollectionFilters {
  projectId?: string
  search?: string
  collectionType?: CollectionType
  entityType?: LinkedEntityType
  entityId?: string
  isPinned?: boolean
  isPublic?: boolean
}

// =============================================
// Camera Capture Types
// =============================================

export interface CameraCaptureOptions {
  facingMode?: 'user' | 'environment'
  resolution?: 'low' | 'medium' | 'high' | 'max'
  enableGps?: boolean
  enableWeather?: boolean
  maxPhotos?: number
  autoUpload?: boolean
  compressionQuality?: number // 0-100
  maxDimension?: number // Max width/height in pixels
}

export interface CapturedPhoto {
  id: string // Local ID before upload
  file: File | Blob
  previewUrl: string
  metadata: PhotoMetadata
  status: 'captured' | 'processing' | 'uploading' | 'uploaded' | 'failed'
  progress?: number
  error?: string
  uploadedPhoto?: Photo // After successful upload
}

// =============================================
// Photo Organizer View Types
// =============================================

export type PhotoViewMode = 'grid' | 'list' | 'map' | 'timeline' | 'location'

export interface PhotoGridConfig {
  columns: number
  gap: number
  showCaptions: boolean
  showMetadata: boolean
  aspectRatio: 'square' | 'original' | '4:3' | '16:9'
}

export interface PhotoMapConfig {
  showClusters: boolean
  clusterRadius: number
  showHeatmap: boolean
  centerLat?: number
  centerLng?: number
  zoom?: number
}

export interface PhotoTimelineConfig {
  groupBy: 'day' | 'week' | 'month' | 'year'
  showConnectors: boolean
  expandedDates: string[]
}

export interface PhotoLocationConfig {
  groupBy: 'building' | 'floor' | 'area' | 'grid'
  showEmpty: boolean
  sortBy: 'name' | 'photoCount' | 'recent'
}
