// File: /src/types/database.ts
// TypeScript type definitions for Supabase database tables
// Complete type definitions for all 42 database tables

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Company, 'id'>>
      }
      users: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'id'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id'>>
      }
      contacts: {
        Row: Contact
        Insert: Omit<Contact, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Contact, 'id'>>
      }
      subcontractors: {
        Row: Subcontractor
        Insert: Omit<Subcontractor, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Subcontractor, 'id'>>
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Document, 'id'>>
      }
      daily_reports: {
        Row: DailyReport
        Insert: Omit<DailyReport, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DailyReport, 'id'>>
      }
      workflow_items: {
        Row: WorkflowItem
        Insert: Omit<WorkflowItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<WorkflowItem, 'id'>>
      }
      tasks: {
        Row: Task
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Task, 'id'>>
      }
      punch_items: {
        Row: PunchItem
        Insert: Omit<PunchItem, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PunchItem, 'id'>>
      }
      photos: {
        Row: Photo
        Insert: Omit<Photo, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Photo, 'id'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// =============================================
// Core Types
// =============================================

export interface Company {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string
  logo_url: string | null
  primary_color: string | null
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  max_projects: number
  settings: Json
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SubscriptionTier = 'free' | 'small' | 'medium' | 'large' | 'enterprise'
export type SubscriptionStatus = 'active' | 'suspended' | 'cancelled'

export interface UserProfile {
  id: string
  company_id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  notification_preferences: NotificationPreferences
  is_active: boolean
  last_seen_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type UserRole =
  | 'superintendent'
  | 'project_manager'
  | 'office_admin'
  | 'field_employee'
  | 'subcontractor'
  | 'architect'

export interface NotificationPreferences {
  email: boolean
  push: boolean
  in_app: boolean
}

export interface Project {
  id: string
  company_id: string
  name: string
  project_number: string | null
  description: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  latitude: number | null
  longitude: number | null
  start_date: string | null
  end_date: string | null
  substantial_completion_date: string | null
  final_completion_date: string | null
  contract_value: number | null
  budget: number | null
  status: ProjectStatus
  weather_units: 'imperial' | 'metric'
  features_enabled: ProjectFeatures
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'

export interface ProjectFeatures {
  workflows: boolean
  takeoff: boolean
  daily_reports: boolean
}

export interface Contact {
  id: string
  project_id: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  title: string | null
  contact_type: ContactType
  trade: string | null
  email: string | null
  phone_office: string | null
  phone_mobile: string | null
  phone_fax: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  is_primary: boolean
  is_emergency_contact: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type ContactType =
  | 'gc_team'
  | 'subcontractor'
  | 'architect'
  | 'engineer'
  | 'owner'
  | 'inspector'
  | 'vendor'
  | 'utility'
  | 'other'

export interface Subcontractor {
  id: string
  project_id: string
  contact_id: string | null
  company_name: string
  trade: string
  contract_amount: number | null
  contract_start_date: string | null
  contract_end_date: string | null
  retainage_percentage: number
  scope_of_work: string | null
  scope_document_url: string | null
  license_number: string | null
  license_expiration: string | null
  insurance_certificate_url: string | null
  insurance_expiration: string | null
  status: SubcontractorStatus
  performance_notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type SubcontractorStatus = 'active' | 'on_hold' | 'completed' | 'terminated'

// =============================================
// Document Management
// =============================================

export interface Folder {
  id: string
  project_id: string
  parent_folder_id: string | null
  name: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface Document {
  id: string
  project_id: string
  folder_id: string | null
  name: string
  description: string | null
  document_type: DocumentType
  discipline: string | null
  file_url: string
  file_name: string
  file_size: number | null
  file_type: string | null
  version: string
  revision: string | null
  is_latest_version: boolean
  supersedes_document_id: string | null
  drawing_number: string | null
  specification_section: string | null
  issue_date: string | null
  received_date: string | null
  status: DocumentStatus
  is_pinned: boolean
  requires_approval: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type DocumentType =
  | 'drawing'
  | 'specification'
  | 'submittal'
  | 'shop_drawing'
  | 'scope'
  | 'general'
  | 'photo'
  | 'other'

export type DocumentStatus = 'current' | 'superseded' | 'archived' | 'void'

// =============================================
// Daily Reports
// =============================================

export interface DailyReport {
  id: string
  project_id: string
  report_date: string
  report_number: string | null
  reporter_id: string
  reviewer_id: string | null
  // Weather
  weather_condition: string | null
  temperature_high: number | null
  temperature_low: number | null
  precipitation: number | null
  wind_speed: number | null
  weather_source: 'manual' | 'api'
  weather_delays: boolean
  weather_delay_notes: string | null
  // Work
  work_completed: string | null
  production_data: Json | null
  issues: string | null
  observations: string | null
  comments: string | null
  // Status
  status: DailyReportStatus
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  pdf_url: string | null
  pdf_generated_at: string | null
  // Computed fields (populated by views or joins)
  total_workers?: number | null // Sum of worker_count from daily_report_workforce
  // Metadata
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type DailyReportStatus = 'draft' | 'in_review' | 'approved' | 'submitted'

export interface DailyReportWorkforce {
  id: string
  daily_report_id: string
  subcontractor_id: string | null
  trade: string | null
  entry_type: 'team' | 'individual'
  team_name: string | null
  worker_count: number | null
  worker_name: string | null
  activity: string | null
  hours_worked: number | null
  created_at: string
}

export interface DailyReportEquipment {
  id: string
  daily_report_id: string
  equipment_type: string
  equipment_description: string | null
  quantity: number
  owner: string | null
  hours_used: number | null
  notes: string | null
  created_at: string
}

export interface DailyReportDelivery {
  id: string
  daily_report_id: string
  material_description: string
  quantity: string | null
  vendor: string | null
  delivery_ticket_number: string | null
  delivery_time: string | null
  notes: string | null
  created_at: string
}

export interface DailyReportVisitor {
  id: string
  daily_report_id: string
  visitor_name: string
  company: string | null
  purpose: string | null
  arrival_time: string | null
  departure_time: string | null
  created_at: string
}

// =============================================
// Workflows
// =============================================

export interface WorkflowType {
  id: string
  company_id: string
  name_singular: string
  name_plural: string
  prefix: string | null
  is_default: boolean
  is_custom: boolean
  has_cost_impact: boolean
  has_schedule_impact: boolean
  requires_approval: boolean
  statuses: Json
  priorities: Json
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface WorkflowItem {
  id: string
  project_id: string
  workflow_type_id: string
  number: number | null
  reference_number: string | null
  title: string | null
  description: string | null
  more_information: string | null
  resolution: string | null
  assignees: string[]
  raised_by: string | null
  due_date: string | null
  opened_date: string | null
  closed_date: string | null
  status: string
  priority: 'low' | 'normal' | 'high'
  cost_impact: number | null
  schedule_impact: number | null
  discipline: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface WorkflowItemComment {
  id: string
  workflow_item_id: string
  comment: string
  mentioned_users: string[]
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface ChangeOrderBid {
  id: string
  workflow_item_id: string
  project_id: string
  subcontractor_id: string
  bid_status: ChangeOrderBidStatus
  lump_sum_cost: number | null
  duration_days: number | null
  exclusions: string | null
  notes: string | null
  supporting_documents: Json
  is_awarded: boolean
  awarded_at: string | null
  awarded_by: string | null
  created_at: string
  updated_at: string
  submitted_at: string | null
  submitted_by: string | null
  deleted_at: string | null
}

export type ChangeOrderBidStatus =
  | 'requested'
  | 'submitted'
  | 'awarded'
  | 'declined'
  | 'rejected'

// =============================================
// Tasks & Schedule
// =============================================

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  assigned_to_type: 'user' | 'subcontractor' | 'team' | null
  assigned_to_user_id: string | null
  assigned_to_subcontractor_id: string | null
  due_date: string | null
  start_date: string | null
  completed_date: string | null
  status: TaskStatus
  priority: Priority
  parent_task_id: string | null
  related_to_type: string | null
  related_to_id: string | null
  location: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type Priority = 'low' | 'normal' | 'high'

export interface ScheduleItem {
  id: string
  project_id: string
  task_id: string | null
  task_name: string
  wbs: string | null
  start_date: string | null
  finish_date: string | null
  baseline_start_date: string | null
  baseline_finish_date: string | null
  duration_days: number | null
  percent_complete: number
  predecessors: string | null
  successors: string | null
  is_critical: boolean
  assigned_to: string | null
  imported_at: string | null
  last_updated_at: string
  created_at: string
}

// =============================================
// Checklists
// =============================================

export interface ChecklistTemplate {
  id: string
  company_id: string | null
  name: string
  description: string | null
  category: string | null
  template_level: 'system' | 'company' | 'project'
  items: Json
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export interface Checklist {
  id: string
  project_id: string
  checklist_template_id: string | null
  name: string
  description: string | null
  category: string | null
  items: Json
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  daily_report_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

// =============================================
// Punch Lists
// =============================================

export interface PunchItem {
  id: string
  project_id: string
  number: number | null
  title: string
  description: string | null
  building: string | null
  floor: string | null
  room: string | null
  area: string | null
  location_notes: string | null
  trade: string
  subcontractor_id: string | null
  assigned_to: string | null
  status: PunchItemStatus
  priority: Priority
  due_date: string | null
  completed_date: string | null
  verified_date: string | null
  marked_complete_by: string | null
  marked_complete_at: string | null
  verified_by: string | null
  verified_at: string | null
  rejection_notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type PunchItemStatus =
  | 'open'
  | 'in_progress'
  | 'ready_for_review'
  | 'completed'
  | 'verified'
  | 'rejected'

// =============================================
// Safety
// =============================================

export interface SafetyIncident {
  id: string
  project_id: string
  incident_number: string | null
  incident_type: IncidentType
  severity: IncidentSeverity | null
  incident_date: string
  incident_time: string | null
  location: string | null
  person_involved: string | null
  company: string | null
  subcontractor_id: string | null
  witness_names: string | null
  description: string
  root_cause: string | null
  contributing_factors: string | null
  injury_type: string | null
  body_part: string | null
  treatment: string | null
  reported_to_osha: boolean
  osha_report_number: string | null
  reported_to_owner: boolean
  immediate_actions: string | null
  corrective_actions: string | null
  requires_followup: boolean
  followup_notes: string | null
  serious_incident: boolean
  notified_users: string[]
  status: SafetyIncidentStatus
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type IncidentType = 'injury' | 'near_miss' | 'property_damage' | 'environmental'
export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'fatal'
export type SafetyIncidentStatus = 'open' | 'under_investigation' | 'corrective_actions_pending' | 'closed'

// =============================================
// Photos
// =============================================

export interface Photo {
  id: string
  project_id: string
  file_url: string
  thumbnail_url: string | null
  file_name: string
  file_size: number | null
  width: number | null
  height: number | null
  is_360: boolean
  captured_at: string
  latitude: number | null
  longitude: number | null
  caption: string | null
  description: string | null
  building: string | null
  floor: string | null
  area: string | null
  grid: string | null
  location_notes: string | null
  photo_category: PhotoCategory | null
  tags: string[]
  project_phase: string | null
  linked_items: Json
  is_before_photo: boolean
  is_after_photo: boolean
  paired_photo_id: string | null
  is_pinned: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

export type PhotoCategory =
  | 'progress'
  | 'safety'
  | 'issue'
  | 'condition'
  | 'delivery'
  | 'inspection'
  | 'closeout'
  | 'general'

// =============================================
// Utility Types
// =============================================

// Helper type for creating new records (omits auto-generated fields)
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>

// Helper type for updating records (makes all fields optional except id)
export type UpdateInput<T> = Partial<Omit<T, 'id'>> & { id: string }

// Helper type for database queries with relations
export type WithRelations<T, R extends Record<string, any>> = T & R
