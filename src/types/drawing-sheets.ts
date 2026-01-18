// src/types/drawing-sheets.ts
// Types for AI-powered drawing management system

// =============================================
// ENUMS / LITERAL TYPES
// =============================================

export type DrawingDiscipline =
  | 'architectural'
  | 'structural'
  | 'mechanical'
  | 'electrical'
  | 'plumbing'
  | 'civil'
  | 'landscape'
  | 'fire_protection'
  | 'other'

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type CalloutType = 'detail' | 'section' | 'elevation' | 'plan' | 'reference' | 'other'

export type MaterialListStatus = 'draft' | 'finalized' | 'exported' | 'ordered'

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'email'

// =============================================
// SUPPORTING INTERFACES
// =============================================

/**
 * Bounding box for callouts and visual search matches
 * All values are percentages (0-100) of image dimensions
 */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Callout extracted by AI from a drawing sheet
 */
export interface ExtractedCallout {
  text: string
  type: CalloutType
  target_sheet?: string
  bounding_box?: BoundingBox
  confidence?: number
}

/**
 * AI-extracted metadata from a drawing sheet title block
 */
export interface AIExtractedMetadata {
  raw_title?: string
  raw_sheet_number?: string
  raw_scale?: string
  raw_revision?: string
  raw_discipline?: string
  callouts?: ExtractedCallout[]
  extraction_model?: string
  extraction_timestamp?: string
  [key: string]: unknown // Allow additional metadata fields
}

/**
 * Visual search match result from pattern matching
 */
export interface VisualSearchMatch {
  sheet_id: string
  sheet_number: string | null
  sheet_title: string | null
  bounding_box: BoundingBox
  confidence: number
  is_excluded: boolean
}

/**
 * Individual item in a material list
 */
export interface MaterialListItem {
  id: string
  name: string
  quantity: number
  unit: string
  waste_factor: number
  order_quantity: number
  category: string | null
  source_takeoff_items: string[]
}

/**
 * Calculated totals for a material list
 */
export interface MaterialListTotals {
  by_category: Record<string, number>
  total_items: number
  total_line_items: number
}

/**
 * Export history record for a material list
 */
export interface MaterialListExport {
  format: ExportFormat
  exported_at: string
  exported_by: string
  recipient?: string
}

// =============================================
// DRAWING SHEET
// =============================================

/**
 * Individual page extracted from a multipage PDF drawing set
 * AI processes each sheet to extract metadata from the title block
 */
export interface DrawingSheet {
  id: string
  project_id: string
  company_id: string
  document_id: string | null
  source_pdf_id: string | null

  // Page identification
  page_number: number
  sheet_number: string | null
  title: string | null

  // Classification
  discipline: DrawingDiscipline | null
  scale: string | null

  // Revision tracking
  revision: string | null
  revision_date: string | null

  // AI extraction
  ai_extracted_metadata: AIExtractedMetadata
  ai_confidence_score: number | null
  ai_processed_at: string | null
  processing_status: ProcessingStatus
  processing_error: string | null

  // Images
  thumbnail_url: string | null
  full_image_url: string | null

  // Timestamps
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type DrawingSheetInsert = Omit<
  DrawingSheet,
  'id' | 'created_at' | 'updated_at' | 'ai_extracted_metadata'
> & {
  ai_extracted_metadata?: AIExtractedMetadata
}

export type DrawingSheetUpdate = Partial<
  Omit<DrawingSheet, 'id' | 'created_at' | 'updated_at' | 'project_id' | 'company_id'>
>

// =============================================
// SHEET CALLOUT
// =============================================

/**
 * Cross-reference link between drawing sheets
 * Detected by AI from detail bubbles, section markers, etc.
 */
export interface SheetCallout {
  id: string
  source_sheet_id: string
  target_sheet_id: string | null

  // Callout details
  callout_text: string
  callout_type: CalloutType | null
  target_sheet_number: string | null

  // Location on source sheet
  bounding_box: BoundingBox | null

  // AI confidence
  ai_confidence: number | null
  is_verified: boolean

  // Timestamps
  created_at: string
  updated_at: string
}

export type SheetCalloutInsert = Omit<SheetCallout, 'id' | 'created_at' | 'updated_at'>

export type SheetCalloutUpdate = Partial<
  Omit<SheetCallout, 'id' | 'created_at' | 'updated_at' | 'source_sheet_id'>
>

// =============================================
// VISUAL SEARCH PATTERN
// =============================================

/**
 * Saved lasso selection pattern for AI visual search in takeoffs
 * Users can save patterns for reuse across projects (e.g., "duplex outlet symbol")
 */
export interface VisualSearchPattern {
  id: string
  project_id: string
  company_id: string

  // Pattern details
  name: string
  description: string | null
  pattern_image_url: string
  pattern_description: string | null
  pattern_hash: string | null

  // Search settings
  match_tolerance: number
  default_assembly_id: string | null

  // Usage tracking
  usage_count: number
  last_used_at: string | null

  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type VisualSearchPatternInsert = Omit<
  VisualSearchPattern,
  'id' | 'created_at' | 'updated_at' | 'usage_count' | 'last_used_at'
>

export type VisualSearchPatternUpdate = Partial<
  Omit<VisualSearchPattern, 'id' | 'created_at' | 'updated_at' | 'project_id' | 'company_id'>
>

// =============================================
// MATERIAL LIST
// =============================================

/**
 * Procurement/material list generated from takeoffs with waste factors
 * Aggregates quantities, applies waste factors, and tracks exports
 */
export interface MaterialList {
  id: string
  project_id: string
  company_id: string

  // List details
  name: string
  description: string | null
  status: MaterialListStatus

  // Source
  takeoff_id: string | null

  // Content
  items: MaterialListItem[]
  waste_factors: Record<string, number>
  totals: MaterialListTotals

  // Export history
  export_history: MaterialListExport[]

  // Metadata
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type MaterialListInsert = Omit<
  MaterialList,
  'id' | 'created_at' | 'updated_at' | 'items' | 'waste_factors' | 'totals' | 'export_history'
> & {
  items?: MaterialListItem[]
  waste_factors?: Record<string, number>
  totals?: MaterialListTotals
  export_history?: MaterialListExport[]
}

export type MaterialListUpdate = Partial<
  Omit<MaterialList, 'id' | 'created_at' | 'updated_at' | 'project_id' | 'company_id'>
>

// =============================================
// CONSTANTS
// =============================================

export const DRAWING_DISCIPLINES: DrawingDiscipline[] = [
  'architectural',
  'structural',
  'mechanical',
  'electrical',
  'plumbing',
  'civil',
  'landscape',
  'fire_protection',
  'other',
]

export const PROCESSING_STATUSES: ProcessingStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
]

export const CALLOUT_TYPES: CalloutType[] = [
  'detail',
  'section',
  'elevation',
  'plan',
  'reference',
  'other',
]

export const MATERIAL_LIST_STATUSES: MaterialListStatus[] = [
  'draft',
  'finalized',
  'exported',
  'ordered',
]

export const EXPORT_FORMATS: ExportFormat[] = ['pdf', 'excel', 'csv', 'email']

// =============================================
// DISPLAY LABELS
// =============================================

export const DISCIPLINE_LABELS: Record<DrawingDiscipline, string> = {
  architectural: 'Architectural',
  structural: 'Structural',
  mechanical: 'Mechanical',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  civil: 'Civil',
  landscape: 'Landscape',
  fire_protection: 'Fire Protection',
  other: 'Other',
}

export const PROCESSING_STATUS_LABELS: Record<ProcessingStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

export const CALLOUT_TYPE_LABELS: Record<CalloutType, string> = {
  detail: 'Detail',
  section: 'Section',
  elevation: 'Elevation',
  plan: 'Plan',
  reference: 'Reference',
  other: 'Other',
}

export const MATERIAL_LIST_STATUS_LABELS: Record<MaterialListStatus, string> = {
  draft: 'Draft',
  finalized: 'Finalized',
  exported: 'Exported',
  ordered: 'Ordered',
}

// =============================================
// API REQUEST/RESPONSE TYPES
// =============================================

/**
 * Request to process a PDF drawing set
 */
export interface ProcessDrawingPdfRequest {
  document_id: string
  project_id: string
  company_id: string
}

/**
 * Response from PDF processing
 */
export interface ProcessDrawingPdfResponse {
  success: boolean
  message?: string
  sheets?: number
  error?: string
}

/**
 * Request to extract metadata from a sheet
 */
export interface ExtractSheetMetadataRequest {
  sheet_id: string
}

/**
 * Response from metadata extraction
 */
export interface ExtractSheetMetadataResponse {
  success: boolean
  sheet_id?: string
  extracted?: AIExtractedMetadata
  error?: string
}

/**
 * Request to find visual pattern matches
 */
export interface FindPatternMatchesRequest {
  pattern_id?: string
  pattern_image_base64?: string
  sheet_ids: string[]
  match_tolerance?: number
}

/**
 * Response from pattern matching
 */
export interface FindPatternMatchesResponse {
  success: boolean
  matches?: VisualSearchMatch[]
  total_sheets_searched?: number
  error?: string
}

/**
 * Request to export a material list
 */
export interface ExportMaterialListRequest {
  material_list_id: string
  format: ExportFormat
  recipient_email?: string
}

/**
 * Response from material list export
 */
export interface ExportMaterialListResponse {
  success: boolean
  download_url?: string
  error?: string
}
