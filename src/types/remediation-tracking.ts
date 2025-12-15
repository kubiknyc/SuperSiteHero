/**
 * Remediation Tracking Types
 * Types for tracking remediation of issues from inspections and checklists
 * Aligned with migration 123_inspection_punch_auto_link.sql
 */

// =============================================================================
// Source and Status Types
// =============================================================================

export type RemediationSourceType =
  | 'inspection'
  | 'checklist'
  | 'safety_observation'
  | 'equipment_inspection';

export type RemediationStatus =
  | 'pending'
  | 'in_progress'
  | 'resolved'
  | 'verified'
  | 'failed';

// =============================================================================
// Remediation Tracking
// =============================================================================

export interface RemediationTracking {
  id: string;
  company_id: string;
  project_id: string;
  source_type: RemediationSourceType;
  source_id: string;
  punch_item_id: string | null;
  status: RemediationStatus;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  auto_generated: boolean;
  generated_from_item_id: string | null;
  source_photo_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface RemediationTrackingWithPunchItem extends RemediationTracking {
  punch_item: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    assigned_to: string | null;
    trade: string | null;
    location_notes: string | null;
  } | null;
}

export interface RemediationTrackingWithSource extends RemediationTracking {
  source_details: {
    name: string;
    type: string;
    location: string | null;
    date: string;
    inspector_name: string | null;
  };
}

// =============================================================================
// Auto-Link Configuration
// =============================================================================

export interface AutoLinkConfiguration {
  id: string;
  company_id: string;
  source_type: RemediationSourceType;
  config_key: string;
  config_value: AutoLinkSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoLinkSettings {
  auto_create_punch: boolean;
  copy_photos: boolean;
  default_priority: 'low' | 'normal' | 'high' | 'critical';
  default_trade: string;
  notify_assignee: boolean;
  due_days_offset: number;
}

// =============================================================================
// Extended Punch Item (with source tracking)
// =============================================================================

export interface PunchItemWithSource {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  trade: string | null;
  location_notes: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  source_type: RemediationSourceType | null;
  source_id: string | null;
  auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// DTO Types
// =============================================================================

export interface CreatePunchFromInspectionDTO {
  inspection_id: string;
  override_title?: string;
  override_description?: string;
  override_priority?: string;
  override_trade?: string;
  override_due_date?: string;
  assigned_to?: string;
}

export interface CreatePunchFromChecklistDTO {
  execution_id: string;
  response_id: string;
  template_item_id: string;
  override_title?: string;
  override_description?: string;
  override_priority?: string;
  override_trade?: string;
  override_due_date?: string;
  assigned_to?: string;
}

export interface UpdateRemediationStatusDTO {
  status: RemediationStatus;
  verification_notes?: string;
}

export interface VerifyRemediationDTO {
  verification_notes?: string;
  passed: boolean;
}

export interface UpdateAutoLinkConfigDTO {
  auto_create_punch?: boolean;
  copy_photos?: boolean;
  default_priority?: 'low' | 'normal' | 'high' | 'critical';
  default_trade?: string;
  notify_assignee?: boolean;
  due_days_offset?: number;
  is_active?: boolean;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface RemediationFilters {
  project_id?: string;
  source_type?: RemediationSourceType;
  source_id?: string;
  punch_item_id?: string;
  status?: RemediationStatus | RemediationStatus[];
  auto_generated?: boolean;
  verified_by?: string;
  created_after?: string;
  created_before?: string;
}

// =============================================================================
// Statistics Types
// =============================================================================

export interface RemediationStats {
  total: number;
  by_status: Record<RemediationStatus, number>;
  by_source_type: Record<RemediationSourceType, number>;
  pending_verification: number;
  auto_generated_count: number;
  average_resolution_days: number | null;
}

export interface ProjectRemediationSummary {
  project_id: string;
  project_name: string;
  open_items: number;
  pending_verification: number;
  recently_verified: number;
  overdue_items: number;
}

// =============================================================================
// Utility Constants
// =============================================================================

export const REMEDIATION_STATUS_LABELS: Record<RemediationStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  verified: 'Verified',
  failed: 'Failed Verification',
};

export const REMEDIATION_STATUS_COLORS: Record<RemediationStatus, string> = {
  pending: 'yellow',
  in_progress: 'blue',
  resolved: 'green',
  verified: 'emerald',
  failed: 'red',
};

export const SOURCE_TYPE_LABELS: Record<RemediationSourceType, string> = {
  inspection: 'Inspection',
  checklist: 'Checklist',
  safety_observation: 'Safety Observation',
  equipment_inspection: 'Equipment Inspection',
};

export const SOURCE_TYPE_COLORS: Record<RemediationSourceType, string> = {
  inspection: 'purple',
  checklist: 'blue',
  safety_observation: 'orange',
  equipment_inspection: 'teal',
};

export const DEFAULT_AUTO_LINK_SETTINGS: AutoLinkSettings = {
  auto_create_punch: true,
  copy_photos: true,
  default_priority: 'high',
  default_trade: 'General',
  notify_assignee: true,
  due_days_offset: 3,
};
