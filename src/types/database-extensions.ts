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
