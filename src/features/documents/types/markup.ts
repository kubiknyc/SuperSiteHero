// File: /src/features/documents/types/markup.ts
// Enhanced markup type definitions for drawing annotations, layers, measurements, and sharing

import type { AnnotationType } from '@/types/markup'

// ============================================================
// COLOR SYSTEM
// ============================================================

export interface ColorPreset {
  name: string
  hex: string
  description?: string
  trade?: string // e.g., "Electrical", "Plumbing", "HVAC"
}

export const TRADE_COLOR_PRESETS: ColorPreset[] = [
  { name: 'Red', hex: '#FF0000', description: 'General issues', trade: 'General' },
  { name: 'Blue', hex: '#0066FF', description: 'Plumbing', trade: 'Plumbing' },
  { name: 'Yellow', hex: '#FFCC00', description: 'Electrical', trade: 'Electrical' },
  { name: 'Green', hex: '#00CC66', description: 'HVAC/Mechanical', trade: 'HVAC' },
  { name: 'Orange', hex: '#FF6600', description: 'Fire Protection', trade: 'Fire Protection' },
  { name: 'Purple', hex: '#9933FF', description: 'Structural', trade: 'Structural' },
  { name: 'Pink', hex: '#FF66CC', description: 'Architectural', trade: 'Architectural' },
  { name: 'Cyan', hex: '#00CCFF', description: 'Low Voltage', trade: 'Low Voltage' },
  { name: 'Brown', hex: '#996633', description: 'Civil/Site', trade: 'Civil' },
  { name: 'Black', hex: '#000000', description: 'General notes' },
  { name: 'White', hex: '#FFFFFF', description: 'On dark backgrounds' },
  { name: 'Gray', hex: '#808080', description: 'Reference/inactive' },
]

export interface UserColorPreference {
  userId: string
  defaultColor: string
  tradeColors: Record<string, string>
  recentColors: string[]
}

// ============================================================
// LAYER SYSTEM
// ============================================================

export interface MarkupLayer {
  id: string
  documentId: string
  name: string
  color: string
  visible: boolean
  locked: boolean
  order: number
  createdBy: string
  createdAt: string
  updatedAt: string
  description?: string
  isDefault?: boolean
}

export interface LayerFilter {
  visibleLayers: string[]
  lockedLayers: string[]
}

export type LayerOrderAction = 'bring-to-front' | 'send-to-back' | 'move-up' | 'move-down'

// ============================================================
// MEASUREMENT TOOLS
// ============================================================

export type MeasurementType = 'distance' | 'area' | 'perimeter' | 'angle' | 'volume' | 'count'

export type MeasurementUnit = 'feet' | 'inches' | 'meters' | 'centimeters' | 'millimeters'

export type VolumeUnit = 'cubic_feet' | 'cubic_meters' | 'cubic_yards' | 'cubic_inches' | 'liters' | 'gallons'

// Point type for positions
export interface Point {
  x: number
  y: number
}

export interface ScaleCalibration {
  id: string
  documentId: string
  pageNumber: number
  pixelDistance: number
  realWorldDistance: number
  unit: MeasurementUnit
  calibratedBy: string
  calibratedAt: string
}

export interface MeasurementAnnotation {
  id: string
  type: MeasurementType
  points: number[] // [x1, y1, x2, y2, ...] for line or polygon points
  value: number
  unit: MeasurementUnit
  displayLabel: string
  layerId?: string
  color: string
  strokeWidth: number
  fontSize: number
  showLabel: boolean
  labelPosition: { x: number; y: number }
  // Volume-specific fields
  depth?: number
  depthUnit?: MeasurementUnit
  volumeValue?: number
  volumeUnit?: VolumeUnit
  // Angle-specific fields
  angleValue?: number
  isInteriorAngle?: boolean
}

export interface MeasurementState {
  isActive: boolean
  measurementType: MeasurementType | null
  unit: MeasurementUnit
  scale: ScaleCalibration | null
  currentMeasurement: MeasurementAnnotation | null
  measurements: MeasurementAnnotation[]
}

// ============================================================
// COUNT TOOL TYPES
// ============================================================

export interface CountMarker {
  id: string
  position: { x: number; y: number }
  category: string
  categoryId: string
  number: number
  label?: string
  color: string
  pageNumber: number
  createdAt: string
  createdBy: string
}

export interface CountCategory {
  id: string
  name: string
  color: string
  icon?: string
  count: number
  description?: string
}

export const DEFAULT_COUNT_CATEGORIES: Omit<CountCategory, 'count'>[] = [
  { id: 'doors', name: 'Doors', color: '#FF6B6B', icon: 'door' },
  { id: 'windows', name: 'Windows', color: '#4ECDC4', icon: 'window' },
  { id: 'outlets', name: 'Electrical Outlets', color: '#FFE66D', icon: 'outlet' },
  { id: 'switches', name: 'Light Switches', color: '#95E1D3', icon: 'switch' },
  { id: 'fixtures', name: 'Light Fixtures', color: '#F38181', icon: 'light' },
  { id: 'plumbing', name: 'Plumbing Fixtures', color: '#3D5A80', icon: 'plumbing' },
  { id: 'hvac', name: 'HVAC Components', color: '#00CC66', icon: 'hvac' },
  { id: 'fire', name: 'Fire Safety', color: '#FF0000', icon: 'fire' },
  { id: 'custom', name: 'Custom', color: '#9B59B6', icon: 'custom' },
]

export interface CountState {
  isActive: boolean
  activeCategory: CountCategory | null
  markers: CountMarker[]
  categories: CountCategory[]
}

// Count measurement data structure (for unified measurement handling)
export interface CountMeasurement {
  id: string
  markers: CountMarker[]
  categories: CountCategory[]
  totalCount: number
}

// ============================================================
// ANGLE MEASUREMENT TYPES
// ============================================================

export interface AngleMeasurement {
  id: string
  vertex: Point
  point1: Point
  point2: Point
  angleDegrees: number
  isInteriorAngle: boolean
  color: string
  strokeWidth: number
  fontSize: number
  showLabel: boolean
  snapIncrement?: number // For snapping to angle increments (e.g., 15 degrees)
}

// Extended angle measurement with 3 points (start, vertex, end) for the task requirement
export interface AngleMeasurementPoints {
  id: string
  points: [Point, Point, Point] // Start, vertex, end
  angle: number // degrees
  isInterior: boolean
}

export const COMMON_ANGLES = [15, 30, 45, 60, 90, 120, 135, 150, 180] as const

// Default snap increments for angle measurement
export const ANGLE_SNAP_INCREMENTS = [5, 10, 15, 30, 45, 90] as const

// ============================================================
// RUNNING TOTALS TYPES
// ============================================================

export interface RunningTotal {
  type: MeasurementType
  value: number
  unit: MeasurementUnit
  count: number
}

export interface RunningTotalsState {
  distanceTotal: number
  areaTotal: number
  volumeTotal: number
  angleCount: number
  countsByCategory: Record<string, number>
  measurementCount: number
}

// Enhanced running totals with grouping and labels
export interface EnhancedRunningTotals extends RunningTotalsState {
  groups: RunningTotalsGroup[]
  lastUpdated: string
}

export interface RunningTotalsGroup {
  id: string
  label: string
  type: MeasurementType
  total: number
  unit: MeasurementUnit
  count: number
  measurements: string[] // measurement IDs
}

// ============================================================
// MEASUREMENT EXPORT TYPES
// ============================================================

export interface MeasurementExportData {
  id: string
  type: MeasurementType
  value: number
  unit: string
  displayValue: string
  pageNumber: number
  sheetName?: string
  timestamp: string
  createdBy?: string
  depth?: number
  volumeValue?: number
  volumeUnit?: string
  categoryName?: string
  label?: string
}

export interface MeasurementExportOptions {
  format: 'csv' | 'xlsx' | 'json'
  includeScale: boolean
  groupByPage: boolean
  groupByType: boolean
  includeTimestamps: boolean
  includeUserInfo: boolean
}

// ============================================================
// SHARING & PERMISSIONS
// ============================================================

export type MarkupPermissionLevel = 'view' | 'edit' | 'admin'

export interface MarkupShareSettings {
  markupId: string
  isShared: boolean
  sharedWithTeam: boolean
  sharedWithSubcontractors: boolean
  sharedWithRoles: string[] // e.g., ['superintendent', 'project_manager']
  sharedWithUsers: string[] // specific user IDs
  permissionLevel: MarkupPermissionLevel
}

export interface MarkupVisibility {
  isPublic: boolean
  visibleToCreatorOnly: boolean
  visibleToRoles: string[]
  visibleToUsers: string[]
}

// ============================================================
// MARKUP HISTORY TRACKING
// ============================================================

export interface MarkupHistoryEntry {
  id: string
  markupId: string
  action: 'created' | 'updated' | 'deleted' | 'shared' | 'moved'
  userId: string
  userName: string
  timestamp: string
  previousData?: Record<string, unknown>
  newData?: Record<string, unknown>
  changeDescription?: string
}

export interface MarkupAuthor {
  id: string
  name: string
  email?: string
  avatarUrl?: string
}

// ============================================================
// EXTENDED DRAWING TOOLS
// ============================================================

export type ExtendedAnnotationType =
  | AnnotationType
  | 'dimension'
  | 'stamp'
  | 'photo-pin'
  | 'measurement-line'
  | 'measurement-area'
  | 'highlight'
  | 'callout'

export type StampType =
  | 'APPROVED'
  | 'REJECTED'
  | 'REVIEWED'
  | 'REVISED'
  | 'FOR_INFORMATION'
  | 'NOT_FOR_CONSTRUCTION'
  | 'VOID'
  | 'PRELIMINARY'
  | 'FINAL'
  | 'CUSTOM'

export interface StampAnnotation {
  id: string
  type: 'stamp'
  stampType: StampType
  customText?: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: string
  opacity: number
  signedBy?: string
  signedAt?: string
}

export interface DimensionAnnotation {
  id: string
  type: 'dimension'
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  offsetDistance: number
  value: number
  unit: MeasurementUnit
  color: string
  strokeWidth: number
  fontSize: number
  arrowSize: number
}

export interface PhotoPinAnnotation {
  id: string
  type: 'photo-pin'
  x: number
  y: number
  photoUrl: string
  thumbnailUrl?: string
  caption?: string
  takenAt?: string
  linkedPhotoId?: string
}

export interface CalloutAnnotation {
  id: string
  type: 'callout'
  x: number
  y: number
  width: number
  height: number
  text: string
  arrowPoints: number[]
  backgroundColor: string
  borderColor: string
  textColor: string
  fontSize: number
}

export interface HighlightAnnotation {
  id: string
  type: 'highlight'
  x: number
  y: number
  width: number
  height: number
  color: string
  opacity: number
}

// ============================================================
// ENHANCED SHAPE WITH LAYER AND METADATA
// ============================================================

export interface EnhancedShape {
  id: string
  type: ExtendedAnnotationType
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  points?: number[]
  text?: string
  fill?: string
  stroke: string
  strokeWidth: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  opacity?: number

  // Layer information
  layerId?: string
  layerName?: string

  // Author information
  createdBy: string
  createdByName?: string
  createdAt: string
  updatedAt?: string
  updatedBy?: string

  // Related items
  relatedToId?: string | null
  relatedToType?: string | null

  // Visibility
  visible: boolean
  locked?: boolean

  // Measurement data (for measurement tools)
  measurementValue?: number
  measurementUnit?: MeasurementUnit

  // Stamp data
  stampType?: StampType
  customStampText?: string

  // Photo pin data
  linkedPhotoUrl?: string
  linkedPhotoId?: string

  // Share settings
  isShared?: boolean
  sharedWithRoles?: string[]
  permissionLevel?: MarkupPermissionLevel
}

// ============================================================
// VERSION COMPARISON
// ============================================================

export interface ChangeRegion {
  id: string
  x: number
  y: number
  width: number
  height: number
  changeType: 'added' | 'removed' | 'modified'
  confidence: number // 0-1 confidence level
  description?: string
}

export interface VersionComparisonResult {
  version1Id: string
  version2Id: string
  changeRegions: ChangeRegion[]
  overallChangePercentage: number
  analyzedAt: string
  summary: string
}

export interface OverlaySettings {
  opacity1: number // 0-100
  opacity2: number // 0-100
  blendMode: 'normal' | 'difference' | 'multiply' | 'overlay'
  showChangeHighlights: boolean
  changeHighlightColor: string
}

// ============================================================
// TOOLBAR STATE
// ============================================================

export interface EnhancedToolbarState {
  selectedTool: ExtendedAnnotationType | 'select' | 'pan' | 'eraser' | 'measure-distance' | 'measure-area' | 'calibrate'
  selectedColor: string
  strokeWidth: number
  fontSize: number
  opacity: number
  selectedLayerId: string | null
  stampType: StampType
  measurementUnit: MeasurementUnit
  showGrid: boolean
  snapToGrid: boolean
}

// ============================================================
// FILTER STATE
// ============================================================

export interface EnhancedMarkupFilter {
  showMyMarkupsOnly: boolean
  creatorIds: string[]
  types: ExtendedAnnotationType[]
  layerIds: string[]
  dateRange: {
    start: Date | null
    end: Date | null
  }
  hiddenLayers: string[]
  searchText?: string
  showSharedOnly?: boolean
  permissionLevel?: MarkupPermissionLevel[]
}

// ============================================================
// DRAWING PHOTO PIN TYPES
// ============================================================

export interface DrawingPhotoPin {
  id: string
  documentId: string
  page: number
  position: { x: number; y: number }
  photoIds: string[]
  label?: string
  createdAt: string
  createdBy: string
  updatedAt?: string
}

export interface DrawingPhotoPinWithPhotos extends DrawingPhotoPin {
  photos: Array<{
    id: string
    url: string
    thumbnailUrl?: string
    caption?: string
    capturedAt?: string
  }>
}

// ============================================================
// VOICE NOTE TYPES
// ============================================================

export interface VoiceNote {
  id: string
  markupId: string
  audioUrl: string
  duration: number // seconds
  transcription?: string
  transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  createdBy: string
  fileName?: string
  fileSize?: number
  mimeType?: string
}

export interface VoiceNoteRecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
  error?: string
}

// ============================================================
// DRAWING QR CODE TYPES
// ============================================================

export interface DrawingQRCode {
  id: string
  documentId: string
  page: number
  viewport?: { x: number; y: number; zoom: number }
  label: string
  url: string
  createdAt: string
  createdBy?: string
  description?: string
  expiresAt?: string
}

export interface QRCodeGenerationOptions {
  size?: number // QR code size in pixels
  errorCorrection?: 'L' | 'M' | 'Q' | 'H'
  includeViewport?: boolean
  includeLabel?: boolean
  format?: 'svg' | 'png' | 'dataUrl'
}

// ============================================================
// GPS LOCATION OVERLAY TYPES
// ============================================================

export interface GeoReference {
  documentId: string
  page: number
  referencePoints: Array<{
    pixelX: number
    pixelY: number
    lat: number
    lng: number
  }>
  calibratedAt?: string
  calibratedBy?: string
  accuracy?: number // meters
}

export interface GPSOverlayState {
  isTracking: boolean
  currentPosition?: {
    lat: number
    lng: number
    accuracy: number
    heading?: number
    speed?: number
  }
  pixelPosition?: {
    x: number
    y: number
  }
  lastUpdated?: string
  error?: string
}

export interface GPSTrackPoint {
  lat: number
  lng: number
  timestamp: string
  accuracy: number
  pixelX?: number
  pixelY?: number
}

// ============================================================
// OFFLINE MARKUP SYNC TYPES
// ============================================================

export interface OfflineMarkup {
  id: string
  localId: string
  documentId: string
  page: number
  data: EnhancedShape
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'
  createdAt: string
  updatedAt: string
  lastSyncAttempt?: string
  syncError?: string
  version: number
  serverVersion?: number
}

export interface MarkupSyncConflict {
  id: string
  localMarkup: OfflineMarkup
  serverMarkup: EnhancedShape
  conflictType: 'modified' | 'deleted' | 'concurrent'
  detectedAt: string
  resolution?: 'local' | 'server' | 'merged' | 'pending'
}

export interface OfflineMarkupQueue {
  markups: OfflineMarkup[]
  conflicts: MarkupSyncConflict[]
  lastSyncTime?: string
  isOnline: boolean
  isSyncing: boolean
}

// ============================================================
// AUTO-NUMBERING SYSTEM
// ============================================================

export interface NumberedAnnotation {
  autoNumber?: number
  numberPrefix?: string // e.g., "RFI-", "PC-", "SI-"
  showNumber?: boolean
}

export interface AutoNumberingState {
  documentId: string
  pageNumber?: number
  currentNumber: number
  prefix: string
  enabled: boolean
  resetOnNewPage: boolean
}

export interface AutoNumberingConfig {
  prefix: string
  startNumber: number
  enabled: boolean
  resetOnNewPage: boolean
  applicableTypes: ExtendedAnnotationType[] // Which annotation types get auto-numbered
}

// ============================================================
// SYMBOL LIBRARY
// ============================================================

export type SymbolCategory = 'general' | 'architectural' | 'mep' | 'structural' | 'civil'

export interface ConstructionSymbol {
  id: string
  name: string
  category: SymbolCategory
  svgPath: string // SVG path data for the symbol
  viewBox: string // SVG viewBox attribute
  defaultWidth: number
  defaultHeight: number
  defaultColor?: string
  description?: string
  tags?: string[]
}

export interface SymbolAnnotation {
  id: string
  type: 'symbol'
  symbolId: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: string
  opacity: number
  text?: string // For symbols that have text labels (e.g., section markers)
  label?: string // Additional label beneath symbol
}

// ============================================================
// MARKUP TEMPLATES
// ============================================================

export type MarkupTemplateCategory =
  | 'qc_review'
  | 'site_walk'
  | 'punch_list'
  | 'coordination'
  | 'safety_inspection'
  | 'custom'

export interface MarkupTemplate {
  id: string
  name: string
  description?: string
  category: MarkupTemplateCategory
  markups: MarkupAnnotationData[]
  created_by: string
  created_at: string
  updated_at: string
  is_shared: boolean
  project_id?: string | null // If null, template is available across all projects
  thumbnail_url?: string
  usage_count: number
  tags?: string[]
}

export interface MarkupAnnotationData {
  type: ExtendedAnnotationType
  // Position is relative (0-1) so templates can be applied to any size document
  relativeX: number
  relativeY: number
  relativeWidth?: number
  relativeHeight?: number
  // Visual properties
  stroke: string
  strokeWidth: number
  fill?: string
  opacity?: number
  rotation?: number
  // Type-specific data
  text?: string
  points?: number[] // Relative points for freehand/arrows
  stampType?: StampType
  symbolId?: string
  autoNumber?: number
  numberPrefix?: string
}

export interface CreateMarkupTemplateInput {
  name: string
  description?: string
  category: MarkupTemplateCategory
  markups: MarkupAnnotationData[]
  is_shared: boolean
  project_id?: string | null
  tags?: string[]
}

export interface UpdateMarkupTemplateInput {
  name?: string
  description?: string
  category?: MarkupTemplateCategory
  markups?: MarkupAnnotationData[]
  is_shared?: boolean
  tags?: string[]
}
