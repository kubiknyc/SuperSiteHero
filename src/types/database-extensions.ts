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

// Extended Database type that includes approval tables
export type Database = {
  public: {
    Tables: GeneratedDatabase['public']['Tables'] & {
      approval_workflows: ApprovalWorkflowsTable
      approval_steps: ApprovalStepsTable
      approval_requests: ApprovalRequestsTable
      approval_actions: ApprovalActionsTable
    }
    Views: GeneratedDatabase['public']['Views']
    Functions: GeneratedDatabase['public']['Functions']
    Enums: GeneratedDatabase['public']['Enums']
    CompositeTypes: GeneratedDatabase['public']['CompositeTypes']
  }
}

// Re-export all table row types for convenience
export type Document = Database['public']['Tables']['documents']['Row']
export type Folder = Database['public']['Tables']['folders']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type PunchItem = Database['public']['Tables']['punch_items']['Row']
export type WorkflowItem = Database['public']['Tables']['workflow_items']['Row']
export type WorkflowType = Database['public']['Tables']['workflow_types']['Row']
export type DailyReport = Database['public']['Tables']['daily_reports']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Company = Database['public']['Tables']['companies']['Row']

// Export other commonly used types
export type DocumentType = Document['document_type']
export type PunchItemStatus = PunchItem['status']
export type WorkflowItemStatus = WorkflowItem['status']

// Legacy type alias for backwards compatibility (documents don't have status)
export type DocumentStatus = string

// Re-export utility types from generated database
export type { Json, Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes } from './database'

// Additional type exports needed by the codebase
export type Task = Database['public']['Tables']['tasks']['Row']
export type UserProfile = User // Alias for backwards compatibility
export type Priority = Task['priority']
export type TaskStatus = Task['status']
export type ProjectStatus = Project['status']
export type WorkflowItemComment = Database['public']['Tables']['workflow_item_comments']['Row']
export type WorkflowItemHistory = Database['public']['Tables']['workflow_item_history']['Row']
export type SubmittalProcurement = Database['public']['Tables']['submittal_procurement']['Row']

// Generic CreateInput type for insert operations
export type CreateInput<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

// Takeoff types
export type TakeoffItem = Database['public']['Tables']['takeoff_items']['Row']
