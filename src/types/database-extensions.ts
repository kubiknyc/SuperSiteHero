/**
 * Database Type Extensions
 *
 * This file extends the generated Supabase types with tables that exist in the database
 * but haven't been included in the generated types yet (usually due to pending migrations).
 *
 * IMPORTANT: This is a temporary workaround. Once migrations are applied to the remote database,
 * regenerate types with: npx supabase gen types typescript --project-id <project-id> > src/types/database.ts
 * Then remove this file and update imports.
 */

import type { Database as GeneratedDatabase } from './database'

// Approval Workflows Tables (Migration 023)
export interface ApprovalWorkflowsTable {
  Row: {
    id: string
    name: string
    description: string | null
    company_id: string
    workflow_type: 'document' | 'submittal' | 'rfi' | 'change_order'
    is_active: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    name: string
    description?: string | null
    company_id: string
    workflow_type: 'document' | 'submittal' | 'rfi' | 'change_order'
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    name?: string
    description?: string | null
    company_id?: string
    workflow_type?: 'document' | 'submittal' | 'rfi' | 'change_order'
    is_active?: boolean
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "approval_workflows_company_id_fkey"
      columns: ["company_id"]
      isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
  ]
}

export interface ApprovalStepsTable {
  Row: {
    id: string
    workflow_id: string
    step_order: number
    name: string
    approver_type: 'user'
    approver_ids: string[]
    required_approvals: number
    allow_delegation: boolean
    auto_approve_after_days: number | null
    created_at: string
  }
  Insert: {
    id?: string
    workflow_id: string
    step_order: number
    name: string
    approver_type?: 'user'
    approver_ids: string[]
    required_approvals?: number
    allow_delegation?: boolean
    auto_approve_after_days?: number | null
    created_at?: string
  }
  Update: {
    id?: string
    workflow_id?: string
    step_order?: number
    name?: string
    approver_type?: 'user'
    approver_ids?: string[]
    required_approvals?: number
    allow_delegation?: boolean
    auto_approve_after_days?: number | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "approval_steps_workflow_id_fkey"
      columns: ["workflow_id"]
      isOneToOne: false
      referencedRelation: "approval_workflows"
      referencedColumns: ["id"]
    }
  ]
}

export interface ApprovalRequestsTable {
  Row: {
    id: string
    workflow_id: string
    entity_type: 'document' | 'submittal' | 'rfi' | 'change_order'
    entity_id: string
    current_step: number
    status: 'pending' | 'approved' | 'approved_with_conditions' | 'rejected' | 'cancelled'
    conditions: string | null
    initiated_by: string
    initiated_at: string
    completed_at: string | null
    project_id: string
  }
  Insert: {
    id?: string
    workflow_id: string
    entity_type: 'document' | 'submittal' | 'rfi' | 'change_order'
    entity_id: string
    current_step?: number
    status?: 'pending' | 'approved' | 'approved_with_conditions' | 'rejected' | 'cancelled'
    conditions?: string | null
    initiated_by: string
    initiated_at?: string
    completed_at?: string | null
    project_id: string
  }
  Update: {
    id?: string
    workflow_id?: string
    entity_type?: 'document' | 'submittal' | 'rfi' | 'change_order'
    entity_id?: string
    current_step?: number
    status?: 'pending' | 'approved' | 'approved_with_conditions' | 'rejected' | 'cancelled'
    conditions?: string | null
    initiated_by?: string
    initiated_at?: string
    completed_at?: string | null
    project_id?: string
  }
  Relationships: [
    {
      foreignKeyName: "approval_requests_workflow_id_fkey"
      columns: ["workflow_id"]
      isOneToOne: false
      referencedRelation: "approval_workflows"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "approval_requests_initiated_by_fkey"
      columns: ["initiated_by"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "approval_requests_project_id_fkey"
      columns: ["project_id"]
      isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    }
  ]
}

export interface ApprovalActionsTable {
  Row: {
    id: string
    request_id: string
    step_id: string
    user_id: string
    action: 'approve' | 'approve_with_conditions' | 'reject' | 'delegate' | 'comment'
    comment: string | null
    conditions: string | null
    delegated_to: string | null
    created_at: string
  }
  Insert: {
    id?: string
    request_id: string
    step_id: string
    user_id: string
    action: 'approve' | 'approve_with_conditions' | 'reject' | 'delegate' | 'comment'
    comment?: string | null
    conditions?: string | null
    delegated_to?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    request_id?: string
    step_id?: string
    user_id?: string
    action?: 'approve' | 'approve_with_conditions' | 'reject' | 'delegate' | 'comment'
    comment?: string | null
    conditions?: string | null
    delegated_to?: string | null
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "approval_actions_request_id_fkey"
      columns: ["request_id"]
      isOneToOne: false
      referencedRelation: "approval_requests"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "approval_actions_step_id_fkey"
      columns: ["step_id"]
      isOneToOne: false
      referencedRelation: "approval_steps"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "approval_actions_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "approval_actions_delegated_to_fkey"
      columns: ["delegated_to"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
  ]
}

// Weather Logs Table (Migration 015)
export interface WeatherLogsTable {
  Row: {
    id: string
    company_id: string
    project_id: string
    log_date: string // Date as ISO string
    recorded_by: string
    temperature_high: number | null
    temperature_low: number | null
    conditions: 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rain' | 'heavy_rain' | 'drizzle' | 'snow' | 'heavy_snow' | 'sleet' | 'hail' | 'fog' | 'wind' | 'storm' | 'thunderstorm'
    precipitation_amount: number
    precipitation_type: 'none' | 'rain' | 'snow' | 'sleet' | 'hail' | 'mixed'
    wind_speed: number | null
    wind_direction: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'variable' | null
    humidity_percent: number | null
    work_impact: 'none' | 'minor' | 'moderate' | 'severe'
    impact_notes: string | null
    work_stopped: boolean
    hours_lost: number
    affected_activities: string[]
    safety_concerns: string | null
    photo_urls: string[]
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    company_id: string
    project_id: string
    log_date: string
    recorded_by: string
    temperature_high?: number | null
    temperature_low?: number | null
    conditions: 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rain' | 'heavy_rain' | 'drizzle' | 'snow' | 'heavy_snow' | 'sleet' | 'hail' | 'fog' | 'wind' | 'storm' | 'thunderstorm'
    precipitation_amount?: number
    precipitation_type?: 'none' | 'rain' | 'snow' | 'sleet' | 'hail' | 'mixed'
    wind_speed?: number | null
    wind_direction?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'variable' | null
    humidity_percent?: number | null
    work_impact?: 'none' | 'minor' | 'moderate' | 'severe'
    impact_notes?: string | null
    work_stopped?: boolean
    hours_lost?: number
    affected_activities?: string[]
    safety_concerns?: string | null
    photo_urls?: string[]
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: string
    company_id?: string
    project_id?: string
    log_date?: string
    recorded_by?: string
    temperature_high?: number | null
    temperature_low?: number | null
    conditions?: 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rain' | 'heavy_rain' | 'drizzle' | 'snow' | 'heavy_snow' | 'sleet' | 'hail' | 'fog' | 'wind' | 'storm' | 'thunderstorm'
    precipitation_amount?: number
    precipitation_type?: 'none' | 'rain' | 'snow' | 'sleet' | 'hail' | 'mixed'
    wind_speed?: number | null
    wind_direction?: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'variable' | null
    humidity_percent?: number | null
    work_impact?: 'none' | 'minor' | 'moderate' | 'severe'
    impact_notes?: string | null
    work_stopped?: boolean
    hours_lost?: number
    affected_activities?: string[]
    safety_concerns?: string | null
    photo_urls?: string[]
    created_at?: string
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "weather_logs_company_id_fkey"
      columns: ["company_id"]
      isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "weather_logs_project_id_fkey"
      columns: ["project_id"]
      isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "weather_logs_recorded_by_fkey"
      columns: ["recorded_by"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
  ]
}

// Takeoff Templates Table (Migration 059)
// Note: TakeoffTemplatesTable interface commented out to avoid circular reference
// The TakeoffTemplate, TakeoffTemplateInsert, TakeoffTemplateUpdate interfaces are defined below
// and can be used directly for type annotations

// Cost Estimates Tables (Migration 060)
// Note: CostEstimatesTable interfaces commented out - use the interfaces below directly

// ============================================================================
// EXTENDED DATABASE TYPE - DO NOT REPLACE WITH RE-EXPORT
// IMPORTANT: Re-export the original Database type directly for Supabase client compatibility
// Extended tables should use type casts like: (supabase as unknown as { from: ... })
// This ensures proper TypeScript inference for all standard Supabase operations
// ============================================================================
export type Database = GeneratedDatabase

// ============================================================================
// EXTENDED TABLES NOT IN GENERATED DATABASE
// ============================================================================
// The following tables exist in the database but are not in the generated types.
// When using these tables, use type assertions:
//
// Example:
//   const { data } = await (supabase as any)
//     .from('weather_logs')
//     .select('*')
//
// Extended tables:
// - weather_logs (use WeatherLog type)
// - takeoff_templates (use TakeoffTemplate type)
// - cost_estimates (use CostEstimate type)
// - cost_estimate_items (use CostEstimateItem type)
// - daily_report_templates (use DailyReportTemplate type)
// - daily_report_versions (use DailyReportVersion type)
// ============================================================================

// Extended table types are defined above and can be used directly when needed
// Use helper types below for type-safe access to extended tables

// Re-export all table row types for convenience using generated Database
export type Document = GeneratedDatabase['public']['Tables']['documents']['Row']
export type Folder = GeneratedDatabase['public']['Tables']['folders']['Row']
export type Project = GeneratedDatabase['public']['Tables']['projects']['Row']
export type PunchItem = GeneratedDatabase['public']['Tables']['punch_items']['Row']
export type WorkflowItem = GeneratedDatabase['public']['Tables']['workflow_items']['Row']
export type WorkflowType = GeneratedDatabase['public']['Tables']['workflow_types']['Row']
export type DailyReport = GeneratedDatabase['public']['Tables']['daily_reports']['Row']
export type User = GeneratedDatabase['public']['Tables']['users']['Row']
export type Company = GeneratedDatabase['public']['Tables']['companies']['Row']

// Export other commonly used types
export type DocumentType = Document['document_type']
export type PunchItemStatus = PunchItem['status']
export type WorkflowItemStatus = WorkflowItem['status']

// Legacy type alias for backwards compatibility (documents don't have status)
export type DocumentStatus = string

// Re-export utility types from generated database
export type { Json, Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from './database'

// Extended table type aliases for tables defined in the interface definitions above
// These can be used for manual type annotations where needed
export type ApprovalWorkflow = ApprovalWorkflowsTable['Row']
export type ApprovalStep = ApprovalStepsTable['Row']
export type ApprovalRequest = ApprovalRequestsTable['Row']
export type ApprovalAction = ApprovalActionsTable['Row']
export type WeatherLog = WeatherLogsTable['Row']
// Note: TakeoffTemplate is defined as an interface below (line 498), not derived from TakeoffTemplatesTable

// Daily Report Templates and Versions (not in generated types)
export interface DailyReportTemplate {
  id: string
  company_id: string
  name: string
  description: string | null
  template_data: Record<string, unknown>
  is_default: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface DailyReportTemplateInsert {
  id?: string
  company_id: string
  name: string
  description?: string | null
  template_data: Record<string, unknown>
  is_default?: boolean
  created_by: string
  created_at?: string
  updated_at?: string
}

export interface DailyReportTemplateUpdate {
  name?: string
  description?: string | null
  template_data?: Record<string, unknown>
  is_default?: boolean
  updated_at?: string
}

export interface DailyReportVersion {
  id: string
  report_id: string
  version_number: number
  changed_by: string
  changed_at: string
  change_type: 'created' | 'updated' | 'approved' | 'rejected'
  change_summary: string | null
  previous_data: Record<string, unknown> | null
  new_data: Record<string, unknown>
}

export interface DailyReportVersionInsert {
  id?: string
  report_id: string
  version_number: number
  changed_by: string
  changed_at?: string
  change_type: 'created' | 'updated' | 'approved' | 'rejected'
  change_summary?: string | null
  previous_data?: Record<string, unknown> | null
  new_data: Record<string, unknown>
}

export interface DailyReportVersionUpdate {
  change_summary?: string | null
  previous_data?: Record<string, unknown> | null
  new_data?: Record<string, unknown>
}

// Additional type exports needed by the codebase
export type Task = GeneratedDatabase['public']['Tables']['tasks']['Row']
export type UserProfile = User // Alias for backwards compatibility
export type Priority = Task['priority']
export type TaskStatus = Task['status']
export type ProjectStatus = Project['status']
export type WorkflowItemComment = GeneratedDatabase['public']['Tables']['workflow_item_comments']['Row']
export type WorkflowItemHistory = GeneratedDatabase['public']['Tables']['workflow_item_history']['Row']
export type SubmittalProcurement = GeneratedDatabase['public']['Tables']['submittal_procurement']['Row']

// Generic CreateInput type for insert operations
export type CreateInput<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

// Takeoff types (takeoff_items exists in generated types)
export type TakeoffItem = GeneratedDatabase['public']['Tables']['takeoff_items']['Row']
export type TakeoffItemInsert = GeneratedDatabase['public']['Tables']['takeoff_items']['Insert']
export type TakeoffItemUpdate = GeneratedDatabase['public']['Tables']['takeoff_items']['Update']

// Site Instructions types (exists in generated types)
export type SiteInstruction = GeneratedDatabase['public']['Tables']['site_instructions']['Row']
export type SiteInstructionStatus = 'draft' | 'issued' | 'acknowledged' | 'in_progress' | 'completed' | 'verified' | 'void'
export type SiteInstructionPriority = 'low' | 'normal' | 'high' | 'urgent'

// Weather Logs types (use interface definition - table not in generated types yet)
// export type WeatherLog = WeatherLogsTable['Row'] - already exported above
export type WeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rain' | 'heavy_rain' | 'drizzle' | 'snow' | 'heavy_snow' | 'sleet' | 'hail' | 'fog' | 'wind' | 'storm' | 'thunderstorm'
export type PrecipitationType = 'none' | 'rain' | 'snow' | 'sleet' | 'hail' | 'mixed'
export type WindDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'variable'
export type WorkImpact = 'none' | 'minor' | 'moderate' | 'severe'

// =============================================
// Dedicated RFI Types (Construction Industry Standard)
// =============================================
export type RFI = GeneratedDatabase['public']['Tables']['rfis']['Row']
export type RFIInsert = GeneratedDatabase['public']['Tables']['rfis']['Insert']
export type RFIUpdate = GeneratedDatabase['public']['Tables']['rfis']['Update']
export type RFIAttachment = GeneratedDatabase['public']['Tables']['rfi_attachments']['Row']
export type RFIComment = GeneratedDatabase['public']['Tables']['rfi_comments']['Row']
export type RFIHistory = GeneratedDatabase['public']['Tables']['rfi_history']['Row']

// RFI Status types
export type RFIStatus = 'draft' | 'open' | 'pending_response' | 'responded' | 'closed' | 'void'
export type RFIPriority = 'low' | 'normal' | 'high' | 'urgent'
export type BallInCourtRole = 'gc' | 'architect' | 'subcontractor' | 'owner' | 'engineer' | 'consultant'

// =============================================
// Dedicated Submittal Types (Construction Industry Standard)
// =============================================
export type Submittal = GeneratedDatabase['public']['Tables']['submittals']['Row']
export type SubmittalInsert = GeneratedDatabase['public']['Tables']['submittals']['Insert']
export type SubmittalUpdate = GeneratedDatabase['public']['Tables']['submittals']['Update']
export type SubmittalItem = GeneratedDatabase['public']['Tables']['submittal_items']['Row']
export type SubmittalAttachment = GeneratedDatabase['public']['Tables']['submittal_attachments']['Row']
export type SubmittalReview = GeneratedDatabase['public']['Tables']['submittal_reviews']['Row']
export type SubmittalHistory = GeneratedDatabase['public']['Tables']['submittal_history']['Row']

// Submittal Status types
export type SubmittalReviewStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'approved_as_noted'
  | 'revise_resubmit'
  | 'rejected'
  | 'void'

export type SubmittalType =
  | 'product_data'
  | 'shop_drawing'
  | 'sample'
  | 'mix_design'
  | 'mock_up'
  | 'test_report'
  | 'certificate'
  | 'warranty'
  | 'operation_manual'
  | 'maintenance_manual'
  | 'as_built'
  | 'closeout'
  | 'other'

export type BallInCourtEntity = 'subcontractor' | 'gc' | 'architect' | 'owner' | 'engineer'

// Takeoff Templates (Migration 059)
export type MeasurementType =
  | 'linear'
  | 'area'
  | 'count'
  | 'linear_with_drop'
  | 'pitched_area'
  | 'pitched_linear'
  | 'surface_area'
  | 'volume_2d'
  | 'volume_3d'

export interface TakeoffTemplateData {
  color?: string
  defaultName?: string
  dropHeight?: number
  pitch?: number
  height?: number
  depth?: number
  notes?: string
}

export interface TakeoffTemplate {
  id: string
  name: string
  description: string | null
  company_id: string
  project_id: string | null // NULL = company-wide template
  created_by: string
  measurement_type: MeasurementType
  template_data: TakeoffTemplateData
  tags: string[] | null
  is_public: boolean
  usage_count: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface TakeoffTemplateInsert {
  id?: string
  name: string
  description?: string | null
  company_id: string
  project_id?: string | null
  created_by: string
  measurement_type: MeasurementType
  template_data: TakeoffTemplateData
  tags?: string[] | null
  is_public?: boolean
  usage_count?: number
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface TakeoffTemplateUpdate {
  name?: string
  description?: string | null
  project_id?: string | null
  measurement_type?: MeasurementType
  template_data?: TakeoffTemplateData
  tags?: string[] | null
  is_public?: boolean
  updated_at?: string
}

// Cost Estimates (Migration 060)
export type CostEstimateStatus = 'draft' | 'approved' | 'invoiced' | 'archived'

export interface UnitCosts {
  [measurementType: string]: number // measurement type -> cost per unit
}

export interface CostEstimate {
  id: string
  name: string
  description: string | null
  project_id: string
  created_by: string
  unit_costs: UnitCosts
  labor_rate: number
  markup_percentage: number
  total_material_cost: number
  total_labor_cost: number
  subtotal: number
  markup_amount: number
  total_cost: number
  status: CostEstimateStatus
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface CostEstimateInsert {
  id?: string
  name: string
  description?: string | null
  project_id: string
  created_by: string
  unit_costs: UnitCosts
  labor_rate?: number
  markup_percentage?: number
  total_material_cost?: number
  total_labor_cost?: number
  subtotal?: number
  markup_amount?: number
  total_cost?: number
  status?: CostEstimateStatus
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface CostEstimateUpdate {
  name?: string
  description?: string | null
  unit_costs?: UnitCosts
  labor_rate?: number
  markup_percentage?: number
  status?: CostEstimateStatus
  updated_at?: string
}

export interface CostEstimateItem {
  id: string
  estimate_id: string
  takeoff_item_id: string
  name: string
  measurement_type: string
  quantity: number
  unit_cost: number
  labor_hours: number
  labor_rate: number
  material_cost: number
  labor_cost: number
  total_cost: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CostEstimateItemInsert {
  id?: string
  estimate_id: string
  takeoff_item_id: string
  name: string
  measurement_type: string
  quantity: number
  unit_cost: number
  labor_hours?: number
  labor_rate?: number
  material_cost: number
  labor_cost?: number
  total_cost: number
  notes?: string | null
  created_at?: string
  updated_at?: string
}

export interface CostEstimateItemUpdate {
  name?: string
  quantity?: number
  unit_cost?: number
  labor_hours?: number
  labor_rate?: number
  material_cost?: number
  labor_cost?: number
  total_cost?: number
  notes?: string | null
  updated_at?: string
}

// =============================================
// DocuSign Integration Tables (Migration pending)
// =============================================

/** DocuSign OAuth state for CSRF protection */
export interface DocuSignOAuthStateRow {
  state: string
  company_id: string
  is_demo: boolean
  return_url: string | null
  expires_at: string
  created_at: string
}

export interface DocuSignOAuthStateInsert {
  state: string
  company_id: string
  is_demo?: boolean
  return_url?: string | null
  expires_at: string
  created_at?: string
}

/** DocuSign connection/integration record */
export interface DocuSignConnectionRow {
  id: string
  company_id: string
  account_id: string
  account_name: string | null
  base_uri: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
  is_demo: boolean
  is_active: boolean
  last_connected_at: string | null
  connection_error: string | null
  webhook_uri: string | null
  webhook_secret: string | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface DocuSignConnectionInsert {
  id?: string
  company_id: string
  account_id: string
  account_name?: string | null
  base_uri?: string | null
  access_token?: string | null
  refresh_token?: string | null
  token_expires_at?: string | null
  is_demo?: boolean
  is_active?: boolean
  last_connected_at?: string | null
  connection_error?: string | null
  webhook_uri?: string | null
  webhook_secret?: string | null
  created_at?: string
  updated_at?: string
  created_by?: string | null
}

export interface DocuSignConnectionUpdate {
  account_id?: string
  account_name?: string | null
  base_uri?: string | null
  access_token?: string | null
  refresh_token?: string | null
  token_expires_at?: string | null
  is_demo?: boolean
  is_active?: boolean
  last_connected_at?: string | null
  connection_error?: string | null
  webhook_uri?: string | null
  webhook_secret?: string | null
  updated_at?: string
}

/** DocuSign envelope status */
export type DocuSignEnvelopeStatus =
  | 'created'
  | 'sent'
  | 'delivered'
  | 'signed'
  | 'completed'
  | 'declined'
  | 'voided'
  | 'deleted'

/** DocuSign recipient status */
export type DocuSignRecipientStatus =
  | 'created'
  | 'sent'
  | 'delivered'
  | 'signed'
  | 'completed'
  | 'declined'
  | 'autoresponded'
  | 'voided'

/** DocuSign document type */
export type DocuSignDocumentType =
  | 'payment_application'
  | 'change_order'
  | 'lien_waiver'
  | 'contract'
  | 'subcontract'
  | 'other'

/** DocuSign recipient type */
export type DocuSignRecipientType =
  | 'signer'
  | 'cc'
  | 'certifiedDelivery'
  | 'inPersonSigner'
  | 'notary'
  | 'witness'

/** DocuSign envelope record */
export interface DocuSignEnvelopeRow {
  id: string
  company_id: string
  connection_id: string
  envelope_id: string
  document_type: DocuSignDocumentType
  local_document_id: string
  local_document_number: string | null
  status: DocuSignEnvelopeStatus
  subject: string | null
  message: string | null
  sent_at: string | null
  completed_at: string | null
  voided_at: string | null
  void_reason: string | null
  expires_at: string | null
  signing_order_enabled: boolean
  reminder_enabled: boolean
  reminder_delay_days: number | null
  reminder_frequency_days: number | null
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface DocuSignEnvelopeInsert {
  id?: string
  company_id: string
  connection_id: string
  envelope_id: string
  document_type: DocuSignDocumentType
  local_document_id: string
  local_document_number?: string | null
  status?: DocuSignEnvelopeStatus
  subject?: string | null
  message?: string | null
  sent_at?: string | null
  completed_at?: string | null
  voided_at?: string | null
  void_reason?: string | null
  expires_at?: string | null
  signing_order_enabled?: boolean
  reminder_enabled?: boolean
  reminder_delay_days?: number | null
  reminder_frequency_days?: number | null
  created_at?: string
  updated_at?: string
  created_by?: string | null
}

export interface DocuSignEnvelopeUpdate {
  status?: DocuSignEnvelopeStatus
  subject?: string | null
  message?: string | null
  sent_at?: string | null
  completed_at?: string | null
  voided_at?: string | null
  void_reason?: string | null
  expires_at?: string | null
  signing_order_enabled?: boolean
  reminder_enabled?: boolean
  reminder_delay_days?: number | null
  reminder_frequency_days?: number | null
  updated_at?: string
}

/** DocuSign envelope recipient */
export interface DocuSignEnvelopeRecipientRow {
  id: string
  envelope_db_id: string
  recipient_id: string
  recipient_type: DocuSignRecipientType
  email: string
  name: string
  role_name: string | null
  routing_order: number
  status: DocuSignRecipientStatus
  signed_at: string | null
  declined_at: string | null
  decline_reason: string | null
  delivered_at: string | null
  client_user_id: string | null
  user_id: string | null
  authentication_method: string | null
  created_at: string
  updated_at: string
}

export interface DocuSignEnvelopeRecipientInsert {
  id?: string
  envelope_db_id: string
  recipient_id: string
  recipient_type: DocuSignRecipientType
  email: string
  name: string
  role_name?: string | null
  routing_order: number
  status?: DocuSignRecipientStatus
  signed_at?: string | null
  declined_at?: string | null
  decline_reason?: string | null
  delivered_at?: string | null
  client_user_id?: string | null
  user_id?: string | null
  authentication_method?: string | null
  created_at?: string
  updated_at?: string
}

export interface DocuSignEnvelopeRecipientUpdate {
  status?: DocuSignRecipientStatus
  signed_at?: string | null
  declined_at?: string | null
  decline_reason?: string | null
  delivered_at?: string | null
  updated_at?: string
}

/** DocuSign envelope document */
export interface DocuSignEnvelopeDocumentRow {
  id: string
  envelope_db_id: string
  document_id: string
  name: string
  file_extension: string | null
  uri: string | null
  order: number
  pages: number | null
  created_at: string
}

/** DocuSign envelope event (audit log) */
export interface DocuSignEnvelopeEventRow {
  id: string
  envelope_db_id: string
  event_type: string
  event_time: string
  recipient_email: string | null
  recipient_name: string | null
  ip_address: string | null
  user_agent: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface DocuSignEnvelopeEventInsert {
  id?: string
  envelope_db_id: string
  event_type: string
  event_time: string
  recipient_email?: string | null
  recipient_name?: string | null
  ip_address?: string | null
  user_agent?: string | null
  details?: Record<string, unknown> | null
  created_at?: string
}

// =============================================
// Lien Waiver Tables (Migration 069)
// =============================================

import type {
  LienWaiverType,
  LienWaiverStatus,
  LienWaiver as LienWaiverEntity,
  LienWaiverTemplate as LienWaiverTemplateEntity,
  LienWaiverRequirement as LienWaiverRequirementEntity,
  LienWaiverHistory as LienWaiverHistoryEntity,
} from './lien-waiver'

export interface LienWaiversTable {
  Row: LienWaiverEntity
  Insert: {
    id?: string
    company_id: string
    project_id: string
    waiver_number?: string
    waiver_type: LienWaiverType
    status?: LienWaiverStatus
    payment_application_id?: string | null
    subcontractor_id?: string | null
    vendor_name?: string | null
    template_id?: string | null
    through_date: string
    payment_amount: number
    check_number?: string | null
    check_date?: string | null
    exceptions?: string | null
    rendered_content?: string | null
    claimant_name?: string | null
    claimant_title?: string | null
    claimant_company?: string | null
    signature_url?: string | null
    signature_date?: string | null
    signed_at?: string | null
    notarization_required?: boolean
    notary_name?: string | null
    notary_commission_number?: string | null
    notary_commission_expiration?: string | null
    notarized_at?: string | null
    notarized_document_url?: string | null
    document_url?: string | null
    sent_at?: string | null
    sent_to_email?: string | null
    received_at?: string | null
    reviewed_by?: string | null
    reviewed_at?: string | null
    review_notes?: string | null
    approved_by?: string | null
    approved_at?: string | null
    rejection_reason?: string | null
    due_date?: string | null
    reminder_sent_at?: string | null
    notes?: string | null
    created_at?: string
    updated_at?: string
    created_by?: string | null
    deleted_at?: string | null
  }
  Update: {
    waiver_type?: LienWaiverType
    status?: LienWaiverStatus
    payment_application_id?: string | null
    subcontractor_id?: string | null
    vendor_name?: string | null
    template_id?: string | null
    through_date?: string
    payment_amount?: number
    check_number?: string | null
    check_date?: string | null
    exceptions?: string | null
    rendered_content?: string | null
    claimant_name?: string | null
    claimant_title?: string | null
    claimant_company?: string | null
    signature_url?: string | null
    signature_date?: string | null
    signed_at?: string | null
    notarization_required?: boolean
    notary_name?: string | null
    notary_commission_number?: string | null
    notary_commission_expiration?: string | null
    notarized_at?: string | null
    notarized_document_url?: string | null
    document_url?: string | null
    sent_at?: string | null
    sent_to_email?: string | null
    received_at?: string | null
    reviewed_by?: string | null
    reviewed_at?: string | null
    review_notes?: string | null
    approved_by?: string | null
    approved_at?: string | null
    rejection_reason?: string | null
    due_date?: string | null
    reminder_sent_at?: string | null
    notes?: string | null
    updated_at?: string
    deleted_at?: string | null
  }
  Relationships: []
}

export interface LienWaiverTemplatesTable {
  Row: LienWaiverTemplateEntity
  Insert: {
    id?: string
    company_id?: string | null
    name: string
    state_code: string
    waiver_type: LienWaiverType
    template_content: string
    legal_language?: string | null
    notarization_required?: boolean
    placeholders?: string[]
    is_default?: boolean
    is_active?: boolean
    version?: number
    effective_date?: string | null
    expiration_date?: string | null
    statute_reference?: string | null
    notes?: string | null
    created_at?: string
    updated_at?: string
    created_by?: string | null
  }
  Update: {
    name?: string
    template_content?: string
    legal_language?: string | null
    notarization_required?: boolean
    placeholders?: string[]
    is_default?: boolean
    is_active?: boolean
    version?: number
    effective_date?: string | null
    expiration_date?: string | null
    statute_reference?: string | null
    notes?: string | null
    updated_at?: string
  }
  Relationships: []
}

export interface LienWaiverRequirementsTable {
  Row: LienWaiverRequirementEntity
  Insert: {
    id?: string
    company_id: string
    project_id?: string | null
    name: string
    description?: string | null
    required_for_progress_payments?: boolean
    required_for_final_payment?: boolean
    min_payment_threshold?: number
    requires_contractor_waiver?: boolean
    requires_sub_waivers?: boolean
    requires_supplier_waivers?: boolean
    days_before_payment_due?: number
    block_payment_without_waiver?: boolean
    allow_conditional_for_progress?: boolean
    require_unconditional_for_final?: boolean
    is_active?: boolean
    created_at?: string
    updated_at?: string
    created_by?: string | null
  }
  Update: {
    name?: string
    description?: string | null
    required_for_progress_payments?: boolean
    required_for_final_payment?: boolean
    min_payment_threshold?: number
    requires_contractor_waiver?: boolean
    requires_sub_waivers?: boolean
    requires_supplier_waivers?: boolean
    days_before_payment_due?: number
    block_payment_without_waiver?: boolean
    allow_conditional_for_progress?: boolean
    require_unconditional_for_final?: boolean
    is_active?: boolean
    updated_at?: string
  }
  Relationships: []
}

export interface LienWaiverHistoryTable {
  Row: LienWaiverHistoryEntity
  Insert: {
    id?: string
    lien_waiver_id: string
    action: string
    field_changed?: string | null
    old_value?: string | null
    new_value?: string | null
    notes?: string | null
    changed_at?: string
    changed_by?: string | null
  }
  Update: {
    action?: string
    field_changed?: string | null
    old_value?: string | null
    new_value?: string | null
    notes?: string | null
  }
  Relationships: []
}

// Extended table types for lien waivers
export type LienWaiverRow = LienWaiversTable['Row']
export type LienWaiverInsert = LienWaiversTable['Insert']
export type LienWaiverDbUpdate = LienWaiversTable['Update']

export type LienWaiverTemplateRow = LienWaiverTemplatesTable['Row']
export type LienWaiverTemplateDbInsert = LienWaiverTemplatesTable['Insert']
export type LienWaiverTemplateDbUpdate = LienWaiverTemplatesTable['Update']

export type LienWaiverRequirementRow = LienWaiverRequirementsTable['Row']
export type LienWaiverRequirementDbInsert = LienWaiverRequirementsTable['Insert']
export type LienWaiverRequirementDbUpdate = LienWaiverRequirementsTable['Update']

export type LienWaiverHistoryRow = LienWaiverHistoryTable['Row']
export type LienWaiverHistoryDbInsert = LienWaiverHistoryTable['Insert']
export type LienWaiverHistoryDbUpdate = LienWaiverHistoryTable['Update']

// Drawing Bookmarks (Migration 169)
export interface DrawingBookmarksTable {
  Row: {
    id: string
    project_id: string
    user_id: string
    document_id: string
    page_number: number
    viewport: {
      x: number
      y: number
      zoom: number
    }
    name: string
    folder: string | null
    shared: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    project_id: string
    user_id?: string
    document_id: string
    page_number?: number
    viewport?: {
      x: number
      y: number
      zoom: number
    }
    name: string
    folder?: string | null
    shared?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    name?: string
    folder?: string | null
    shared?: boolean
    viewport?: {
      x: number
      y: number
      zoom: number
    }
    updated_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "drawing_bookmarks_project_id_fkey"
      columns: ["project_id"]
      isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "drawing_bookmarks_user_id_fkey"
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "drawing_bookmarks_document_id_fkey"
      columns: ["document_id"]
      isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    }
  ]
}

export type DrawingBookmarkRow = DrawingBookmarksTable['Row']
export type DrawingBookmarkInsert = DrawingBookmarksTable['Insert']
export type DrawingBookmarkUpdate = DrawingBookmarksTable['Update']

// =============================================
// Extended Tables Interface for Type-Safe Access
// =============================================

/**
 * ActionItemWithContext view row type
 * This is a database view combining action items with related context
 */
export interface ActionItemWithContext {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  due_date: string | null
  assigned_to: string | null
  assigned_to_name: string | null
  created_by: string
  created_by_name: string | null
  entity_type: string | null
  entity_id: string | null
  entity_title: string | null
  project_name: string | null
  company_id: string
  created_at: string
  updated_at: string
}

/**
 * ClientProjectSummary view row type
 * This is a database view for client portal project summaries
 */
export interface ClientProjectSummary {
  id: string
  name: string
  status: string
  start_date: string | null
  end_date: string | null
  company_id: string
  address: string | null
  city: string | null
  state: string | null
  progress_percent: number | null
  budget: number | null
  spent: number | null
  open_rfis: number | null
  open_submittals: number | null
  open_punch_items: number | null
}

/**
 * ClientPortalSettings table row type
 */
export interface ClientPortalSettingsRow {
  id: string
  project_id: string
  show_budget: boolean
  show_contract_value: boolean
  show_schedule: boolean
  show_daily_reports: boolean
  show_documents: boolean
  show_photos: boolean
  show_rfis: boolean
  show_change_orders: boolean
  show_punch_lists: boolean
  welcome_message: string | null
  custom_logo_url: string | null
  created_at: string
  updated_at: string
}

export interface ClientPortalSettingsInsert {
  id?: string
  project_id: string
  show_budget?: boolean
  show_contract_value?: boolean
  show_schedule?: boolean
  show_daily_reports?: boolean
  show_documents?: boolean
  show_photos?: boolean
  show_rfis?: boolean
  show_change_orders?: boolean
  show_punch_lists?: boolean
  welcome_message?: string | null
  custom_logo_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface ClientPortalSettingsUpdate {
  show_budget?: boolean
  show_contract_value?: boolean
  show_schedule?: boolean
  show_daily_reports?: boolean
  show_documents?: boolean
  show_photos?: boolean
  show_rfis?: boolean
  show_change_orders?: boolean
  show_punch_lists?: boolean
  welcome_message?: string | null
  custom_logo_url?: string | null
  updated_at?: string
}

/**
 * ActionItemProjectSummary view row type
 */
export interface ActionItemProjectSummary {
  project_id: string
  total_items: number
  open_items: number
  in_progress_items: number
  completed_items: number
  overdue_items: number
  escalated_items: number
  chronic_items: number
  completion_rate: number
}

/**
 * ActionItemsByAssignee view row type
 */
export interface ActionItemsByAssignee {
  project_id: string
  assignee: string
  assigned_company: string | null
  total_items: number
  open_items: number
  overdue_items: number
  nearest_due_date: string | null
}

/**
 * Centralized interface for all extended tables not in generated types.
 * Use with the fromExtended() helper for type-safe database access.
 */
export interface ExtendedTables {
  // Database Views (read-only)
  action_items_with_context: {
    Row: ActionItemWithContext
    Insert: never
    Update: never
  }
  action_item_summary_by_project: {
    Row: ActionItemProjectSummary
    Insert: never
    Update: never
  }
  action_items_by_assignee: {
    Row: ActionItemsByAssignee
    Insert: never
    Update: never
  }
  client_project_summary: {
    Row: ClientProjectSummary
    Insert: never
    Update: never
  }

  // Client portal settings table
  client_portal_settings: {
    Row: ClientPortalSettingsRow
    Insert: ClientPortalSettingsInsert
    Update: ClientPortalSettingsUpdate
  }

  // DocuSign tables
  docusign_connections: {
    Row: DocuSignConnectionRow
    Insert: DocuSignConnectionInsert
    Update: DocuSignConnectionUpdate
  }
  docusign_envelopes: {
    Row: DocuSignEnvelopeRow
    Insert: DocuSignEnvelopeInsert
    Update: DocuSignEnvelopeUpdate
  }
  docusign_envelope_recipients: {
    Row: DocuSignEnvelopeRecipientRow
    Insert: DocuSignEnvelopeRecipientInsert
    Update: DocuSignEnvelopeRecipientUpdate
  }
  docusign_envelope_events: {
    Row: DocuSignEnvelopeEventRow
    Insert: DocuSignEnvelopeEventInsert
    Update: never
  }
  docusign_oauth_states: {
    Row: DocuSignOAuthStateRow
    Insert: DocuSignOAuthStateInsert
    Update: never
  }

  // Lien waiver tables
  lien_waivers: {
    Row: LienWaiversTable['Row']
    Insert: LienWaiversTable['Insert']
    Update: LienWaiversTable['Update']
  }
  lien_waiver_templates: {
    Row: LienWaiverTemplatesTable['Row']
    Insert: LienWaiverTemplatesTable['Insert']
    Update: LienWaiverTemplatesTable['Update']
  }
  lien_waiver_requirements: {
    Row: LienWaiverRequirementsTable['Row']
    Insert: LienWaiverRequirementsTable['Insert']
    Update: LienWaiverRequirementsTable['Update']
  }
  lien_waiver_history: {
    Row: LienWaiverHistoryTable['Row']
    Insert: LienWaiverHistoryTable['Insert']
    Update: LienWaiverHistoryTable['Update']
  }

  // Drawing bookmarks
  drawing_bookmarks: {
    Row: DrawingBookmarksTable['Row']
    Insert: DrawingBookmarksTable['Insert']
    Update: DrawingBookmarksTable['Update']
  }

  // Approval workflow tables
  approval_workflows: {
    Row: ApprovalWorkflowsTable['Row']
    Insert: ApprovalWorkflowsTable['Insert']
    Update: ApprovalWorkflowsTable['Update']
  }
  approval_steps: {
    Row: ApprovalStepsTable['Row']
    Insert: ApprovalStepsTable['Insert']
    Update: ApprovalStepsTable['Update']
  }
  approval_requests: {
    Row: ApprovalRequestsTable['Row']
    Insert: ApprovalRequestsTable['Insert']
    Update: ApprovalRequestsTable['Update']
  }
  approval_actions: {
    Row: ApprovalActionsTable['Row']
    Insert: ApprovalActionsTable['Insert']
    Update: ApprovalActionsTable['Update']
  }

  // Weather logs
  weather_logs: {
    Row: WeatherLogsTable['Row']
    Insert: WeatherLogsTable['Insert']
    Update: WeatherLogsTable['Update']
  }

  // Daily report templates and versions
  daily_report_templates: {
    Row: DailyReportTemplate
    Insert: DailyReportTemplateInsert
    Update: DailyReportTemplateUpdate
  }
  daily_report_versions: {
    Row: DailyReportVersion
    Insert: DailyReportVersionInsert
    Update: DailyReportVersionUpdate
  }

  // Cost estimates
  cost_estimates: {
    Row: CostEstimate
    Insert: CostEstimateInsert
    Update: CostEstimateUpdate
  }
  cost_estimate_items: {
    Row: CostEstimateItem
    Insert: CostEstimateItemInsert
    Update: CostEstimateItemUpdate
  }

  // Takeoff templates
  takeoff_templates: {
    Row: TakeoffTemplate
    Insert: TakeoffTemplateInsert
    Update: TakeoffTemplateUpdate
  }
}

/**
 * Union type of all extended table names
 */
export type ExtendedTableName = keyof ExtendedTables
