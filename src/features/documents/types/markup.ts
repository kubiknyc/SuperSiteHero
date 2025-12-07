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

export type MeasurementType = 'distance' | 'area' | 'perimeter'

export type MeasurementUnit = 'feet' | 'inches' | 'meters' | 'centimeters' | 'millimeters'

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
