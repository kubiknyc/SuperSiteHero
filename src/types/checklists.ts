// File: /src/types/checklists.ts
// TypeScript types for Inspection Checklists feature
// Generated: 2025-11-26
// Phase: 1.2 - TypeScript Types and Interfaces

import type { PhotoOcrData } from './ocr'

/**
 * Checklist item types
 */
export type ChecklistItemType = 'checkbox' | 'text' | 'number' | 'photo' | 'signature'

/**
 * Checklist status values
 */
export type ChecklistStatus = 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'

/**
 * Scoring values for checkbox items
 */
export type ScoreValue = 'pass' | 'fail' | 'na'

/**
 * Template level (system/company/project)
 */
export type TemplateLevel = 'system' | 'company' | 'project'

/**
 * Checklist Template
 */
export interface ChecklistTemplate {
  id: string
  company_id: string | null

  // Template Info
  name: string
  description: string | null
  category: string | null

  // Template Level
  template_level: TemplateLevel
  is_system_template: boolean
  tags: string[]
  instructions: string | null
  estimated_duration_minutes: number | null
  scoring_enabled: boolean

  // Legacy items field (JSONB) - kept for backward compatibility
  items: unknown[]

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Item type-specific configurations
 */
export interface CheckboxItemConfig {
  scoring?: boolean
  default_value?: ScoreValue | null
}

export interface TextItemConfig {
  placeholder?: string
  max_length?: number
  multiline?: boolean
}

export interface NumberItemConfig {
  min?: number
  max?: number
  units?: string
  decimal_places?: number
}

export interface PhotoItemConfig {
  min_photos?: number
  max_photos?: number
  required_if_fail?: boolean
}

export interface SignatureItemConfig {
  role?: string
  title?: string
}

export type ItemConfig =
  | CheckboxItemConfig
  | TextItemConfig
  | NumberItemConfig
  | PhotoItemConfig
  | SignatureItemConfig

/**
 * Conditional visibility logic for checklist items
 * Allows items to show/hide based on responses to other items
 */
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty'

export interface ItemConditionRule {
  // The item ID this condition depends on
  target_item_id: string
  // Comparison operator
  operator: ConditionOperator
  // Value to compare against (for checkbox: 'pass'|'fail'|'na', for number: numeric, etc)
  value?: string | number | boolean | null
}

export interface ItemConditions {
  // How to combine multiple rules: 'AND' requires all, 'OR' requires any
  logic: 'AND' | 'OR'
  // The rules that determine visibility
  rules: ItemConditionRule[]
  // Whether to show or hide when conditions are met
  action: 'show' | 'hide'
}

/**
 * Checklist Template Item
 */
export interface ChecklistTemplateItem {
  id: string
  checklist_template_id: string

  // Item Configuration
  item_type: ChecklistItemType
  label: string
  description: string | null

  // Ordering
  sort_order: number
  section: string | null

  // Validation Rules
  is_required: boolean
  config: ItemConfig

  // Conditional visibility (show/hide based on other item responses)
  // Optional field - may not be present in database until migration is run
  conditions?: ItemConditions | null

  // Scoring (for checkbox items)
  scoring_enabled: boolean
  pass_fail_na_scoring: boolean

  // Photo Requirements
  requires_photo: boolean
  min_photos: number
  max_photos: number

  // Metadata
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Checklist Execution (instance of a template being filled out)
 */
export interface ChecklistExecution {
  id: string
  project_id: string
  checklist_template_id: string | null

  // Checklist Info
  name: string
  description: string | null
  category: string | null

  // Inspector
  inspector_user_id: string | null
  inspector_name: string | null
  inspector_signature_url: string | null

  // Location & Weather
  location: string | null
  weather_conditions: string | null
  temperature: number | null

  // Status
  status: ChecklistStatus

  // Legacy items field (JSONB) - kept for backward compatibility
  items: unknown[]

  // Completion
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  submitted_at: string | null

  // Scoring
  score_pass: number
  score_fail: number
  score_na: number
  score_total: number
  score_percentage: number | null

  // Link to daily report
  daily_report_id: string | null

  // PDF Export
  pdf_url: string | null

  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Response data by item type
 */
export interface CheckboxResponseData {
  value: ScoreValue | 'checked' | 'unchecked'
}

export interface TextResponseData {
  value: string
}

export interface NumberResponseData {
  value: number
  units?: string
}

export interface PhotoResponseData {
  photo_urls: string[]
  captions?: string[]
  ocr_data?: Record<string, PhotoOcrData> // Maps photo URL to OCR data
}

export interface SignatureResponseData {
  signature_url: string
  signed_by: string
  signed_at: string
}

export type ResponseData =
  | CheckboxResponseData
  | TextResponseData
  | NumberResponseData
  | PhotoResponseData
  | SignatureResponseData

/**
 * Checklist Response (individual item response)
 */
export interface ChecklistResponse {
  id: string
  checklist_id: string
  checklist_template_item_id: string | null

  // Item Info (denormalized for historical record)
  item_type: ChecklistItemType
  item_label: string
  sort_order: number

  // Response Data (typed by item_type)
  response_data: ResponseData

  // Scoring (for checkbox items)
  score_value: ScoreValue | null

  // Notes
  notes: string | null

  // Photos (array of URLs from Supabase Storage)
  photo_urls: string[]

  // Signature (URL from Supabase Storage)
  signature_url: string | null

  // Metadata
  created_at: string
  updated_at: string
  responded_by: string | null
}

/**
 * Create Checklist Template DTO
 */
export interface CreateChecklistTemplateDTO {
  company_id?: string | null
  name: string
  description?: string | null
  category?: string | null
  template_level: TemplateLevel
  is_system_template?: boolean
  tags?: string[]
  instructions?: string | null
  estimated_duration_minutes?: number | null
  scoring_enabled?: boolean
}

/**
 * Create Checklist Template Item DTO
 */
export interface CreateChecklistTemplateItemDTO {
  checklist_template_id: string
  item_type: ChecklistItemType
  label: string
  description?: string | null
  sort_order: number
  section?: string | null
  is_required?: boolean
  config?: ItemConfig
  conditions?: ItemConditions | null
  scoring_enabled?: boolean
  pass_fail_na_scoring?: boolean
  requires_photo?: boolean
  min_photos?: number
  max_photos?: number
}

/**
 * Create Checklist Execution DTO
 */
export interface CreateChecklistExecutionDTO {
  project_id: string
  checklist_template_id?: string | null
  name: string
  description?: string | null
  category?: string | null
  inspector_user_id?: string | null
  inspector_name?: string | null
  location?: string | null
  weather_conditions?: string | null
  temperature?: number | null
  daily_report_id?: string | null
}

/**
 * Create Checklist Response DTO
 */
export interface CreateChecklistResponseDTO {
  checklist_id: string
  checklist_template_item_id?: string | null
  item_type: ChecklistItemType
  item_label: string
  sort_order?: number
  response_data: ResponseData
  score_value?: ScoreValue | null
  notes?: string | null
  photo_urls?: string[]
  signature_url?: string | null
  responded_by?: string | null
}

/**
 * Checklist Score Summary
 */
export interface ChecklistScoreSummary {
  pass_count: number
  fail_count: number
  na_count: number
  total_count: number
  pass_percentage: number
}

/**
 * Checklist Template with Items (populated)
 */
export interface ChecklistTemplateWithItems extends ChecklistTemplate {
  template_items: ChecklistTemplateItem[]
}

/**
 * Checklist Execution with Responses (populated)
 */
export interface ChecklistExecutionWithResponses extends ChecklistExecution {
  responses: ChecklistResponse[]
}

/**
 * Checklist filter options
 */
export interface ChecklistFilters {
  project_id?: string
  status?: ChecklistStatus
  category?: string
  inspector_user_id?: string
  date_from?: string
  date_to?: string
  is_completed?: boolean
}

/**
 * Template filter options
 */
export interface TemplateFilters {
  company_id?: string
  category?: string
  template_level?: TemplateLevel
  is_system_template?: boolean
  tags?: string[]
  search?: string
}
