/**
 * Inspections Feature Types
 *
 * TypeScript types for the Inspections module including
 * domain types, configs, and utility types.
 */

import type { Database } from '@/types/database'

// Base types from database
export type Inspection = Database['public']['Tables']['inspections']['Row']
export type InspectionInsert = Database['public']['Tables']['inspections']['Insert']
export type InspectionUpdate = Database['public']['Tables']['inspections']['Update']

// Create input type - omits auto-generated fields
export type CreateInspectionInput = Omit<
  InspectionInsert,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>

// Update input type
export type UpdateInspectionInput = Partial<CreateInspectionInput>

// Inspection type enum
export type InspectionType =
  | 'building_dept'
  | 'fire_marshal'
  | 'structural'
  | 'special'
  | 'other'

// Inspection result enum
export type InspectionResult = 'pass' | 'fail' | 'conditional' | 'pending'

// Inspection status enum
export type InspectionStatus = 'scheduled' | 'completed' | 'failed' | 'cancelled'

// Configuration for inspection types
export const INSPECTION_TYPE_CONFIG: Record<
  InspectionType,
  { label: string; description: string; color: string }
> = {
  building_dept: {
    label: 'Building Department',
    description: 'City/county building inspector',
    color: 'blue',
  },
  fire_marshal: {
    label: 'Fire Marshal',
    description: 'Fire and life safety inspection',
    color: 'red',
  },
  structural: {
    label: 'Structural',
    description: 'Structural engineer inspection',
    color: 'purple',
  },
  special: {
    label: 'Special',
    description: 'Third-party special inspection',
    color: 'orange',
  },
  other: {
    label: 'Other',
    description: 'Other inspection type',
    color: 'gray',
  },
}

// Configuration for inspection results
export const INSPECTION_RESULT_CONFIG: Record<
  InspectionResult,
  { label: string; description: string; color: string }
> = {
  pass: {
    label: 'Pass',
    description: 'Inspection passed successfully',
    color: 'green',
  },
  fail: {
    label: 'Fail',
    description: 'Inspection failed - corrections required',
    color: 'red',
  },
  conditional: {
    label: 'Conditional',
    description: 'Conditional approval with corrections',
    color: 'yellow',
  },
  pending: {
    label: 'Pending',
    description: 'Result not yet recorded',
    color: 'gray',
  },
}

// Configuration for inspection statuses
export const INSPECTION_STATUS_CONFIG: Record<
  InspectionStatus,
  { label: string; description: string; color: string }
> = {
  scheduled: {
    label: 'Scheduled',
    description: 'Inspection scheduled for future date',
    color: 'blue',
  },
  completed: {
    label: 'Completed',
    description: 'Inspection has been completed',
    color: 'green',
  },
  failed: {
    label: 'Failed',
    description: 'Inspection failed - reinspection needed',
    color: 'red',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'Inspection was cancelled',
    color: 'gray',
  },
}

// Filter interface for inspection queries
export interface InspectionFilters {
  status?: InspectionStatus
  result?: InspectionResult
  inspection_type?: InspectionType
  search?: string
  dateRange?: {
    start: string
    end: string
  }
}

// Input for recording inspection result
export interface RecordInspectionResultInput {
  id: string
  result: InspectionResult
  result_date: string
  inspector_notes: string
  failure_reasons?: string
  corrective_actions_required?: string
  reinspection_scheduled_date?: string
}

// Inspection with related data
export interface InspectionWithRelations extends Inspection {
  project?: {
    id: string
    name: string
  }
  related_checklist?: {
    id: string
    name: string
  }
  related_permit?: {
    id: string
    permit_name: string
  }
  created_by_user?: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  }
}

// Statistics type for dashboard
export interface InspectionStats {
  total_inspections: number
  scheduled_count: number
  completed_count: number
  passed_count: number
  failed_count: number
  upcoming_this_week: number
  overdue_count: number
}
