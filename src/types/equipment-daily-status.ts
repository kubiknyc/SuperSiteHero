/**
 * Equipment Daily Status Types
 * Types for equipment status tracking within daily reports
 * Aligned with migration 122_equipment_daily_status.sql
 */

// =============================================================================
// Status Types
// =============================================================================

export type EquipmentDailyStatusType =
  | 'ready'
  | 'maintenance_required'
  | 'down'
  | 'not_used'
  | 'not_checked';

export type IssueSeverity = 'minor' | 'moderate' | 'critical';

// =============================================================================
// Checklist Item Types
// =============================================================================

export interface EquipmentChecklistItem {
  id: string;
  label: string;
  required: boolean;
  category: string;
}

export interface EquipmentChecklistResponse {
  itemId: string;
  status: 'pass' | 'fail' | 'na';
  notes?: string;
}

// =============================================================================
// Equipment Daily Status
// =============================================================================

export interface EquipmentDailyStatus {
  id: string;
  equipment_id: string;
  daily_report_id: string;
  project_id: string;
  company_id: string;

  // Checklist status
  checklist_completed: boolean;
  checklist_completed_at: string | null;
  checklist_completed_by: string | null;

  // Equipment status for the day
  status: EquipmentDailyStatusType;

  // Usage tracking
  hours_used: number;
  hours_start: number | null;
  hours_end: number | null;

  // Operator info
  operator_id: string | null;
  operator_name: string | null;

  // Work performed
  work_area: string | null;
  work_description: string | null;

  // Pre-use inspection items
  inspection_items: EquipmentChecklistResponse[];

  // Maintenance alerts
  maintenance_alerts: string[];

  // Issues found
  issues_found: string | null;
  issue_severity: IssueSeverity | null;

  // Follow-up
  requires_maintenance: boolean;
  maintenance_notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface EquipmentDailyStatusWithEquipment extends EquipmentDailyStatus {
  equipment: {
    id: string;
    equipment_number: string;
    name: string;
    equipment_type: string;
    make: string | null;
    model: string | null;
    status: string;
    current_hours: number;
    hourly_cost: number | null;
    image_url: string | null;
  };
}

// =============================================================================
// Checklist Template Types
// =============================================================================

export interface EquipmentChecklistTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  equipment_type: string | null;
  items: EquipmentChecklistItem[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// =============================================================================
// Maintenance Alert Types
// =============================================================================

export interface EquipmentMaintenanceAlert {
  equipment_id: string;
  equipment_name: string;
  equipment_number: string;
  alert_type: 'status' | 'overdue_maintenance' | 'upcoming_maintenance' | 'expired_insurance' | 'expired_registration' | 'info';
  alert_message: string;
  alert_severity: 'critical' | 'warning' | 'info';
}

// =============================================================================
// Summary Types
// =============================================================================

export interface EquipmentDailyStatusSummary {
  total_equipment: number;
  ready_count: number;
  maintenance_required_count: number;
  down_count: number;
  not_used_count: number;
  not_checked_count: number;
  total_hours: number;
}

// =============================================================================
// DTO Types
// =============================================================================

export interface CreateEquipmentDailyStatusDTO {
  equipment_id: string;
  daily_report_id: string;
  project_id: string;
  status?: EquipmentDailyStatusType;
  hours_used?: number;
  hours_start?: number;
  hours_end?: number;
  operator_id?: string;
  operator_name?: string;
  work_area?: string;
  work_description?: string;
}

export interface UpdateEquipmentDailyStatusDTO {
  status?: EquipmentDailyStatusType;
  hours_used?: number;
  hours_start?: number;
  hours_end?: number;
  operator_id?: string;
  operator_name?: string;
  work_area?: string;
  work_description?: string;
  inspection_items?: EquipmentChecklistResponse[];
  issues_found?: string;
  issue_severity?: IssueSeverity;
  requires_maintenance?: boolean;
  maintenance_notes?: string;
}

export interface CompleteChecklistDTO {
  inspection_items: EquipmentChecklistResponse[];
  status: EquipmentDailyStatusType;
  issues_found?: string;
  issue_severity?: IssueSeverity;
  requires_maintenance?: boolean;
  maintenance_notes?: string;
}

export interface CreateChecklistTemplateDTO {
  name: string;
  description?: string;
  equipment_type?: string;
  items: EquipmentChecklistItem[];
  is_default?: boolean;
}

export interface UpdateChecklistTemplateDTO {
  name?: string;
  description?: string;
  equipment_type?: string;
  items?: EquipmentChecklistItem[];
  is_active?: boolean;
  is_default?: boolean;
}

// =============================================================================
// Filter Types
// =============================================================================

export interface EquipmentDailyStatusFilters {
  daily_report_id?: string;
  project_id?: string;
  equipment_id?: string;
  status?: EquipmentDailyStatusType | EquipmentDailyStatusType[];
  checklist_completed?: boolean;
  requires_maintenance?: boolean;
}

// =============================================================================
// Utility Constants
// =============================================================================

export const EQUIPMENT_DAILY_STATUS_LABELS: Record<EquipmentDailyStatusType, string> = {
  ready: 'Ready',
  maintenance_required: 'Maintenance Required',
  down: 'Down',
  not_used: 'Not Used',
  not_checked: 'Not Checked',
};

export const EQUIPMENT_DAILY_STATUS_COLORS: Record<EquipmentDailyStatusType, string> = {
  ready: 'green',
  maintenance_required: 'yellow',
  down: 'red',
  not_used: 'gray',
  not_checked: 'slate',
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  minor: 'Minor',
  moderate: 'Moderate',
  critical: 'Critical',
};

export const ISSUE_SEVERITY_COLORS: Record<IssueSeverity, string> = {
  minor: 'yellow',
  moderate: 'orange',
  critical: 'red',
};

// Default checklist items for equipment types
export const DEFAULT_EQUIPMENT_CHECKLIST_ITEMS: EquipmentChecklistItem[] = [
  { id: '1', label: 'Check engine oil level', required: true, category: 'Fluids' },
  { id: '2', label: 'Check hydraulic fluid level', required: true, category: 'Fluids' },
  { id: '3', label: 'Check coolant level', required: true, category: 'Fluids' },
  { id: '4', label: 'Check fuel level', required: false, category: 'Fluids' },
  { id: '5', label: 'Inspect tires/tracks for damage', required: true, category: 'Undercarriage' },
  { id: '6', label: 'Check backup alarm operation', required: true, category: 'Safety' },
  { id: '7', label: 'Check horn operation', required: true, category: 'Safety' },
  { id: '8', label: 'Check all lights', required: true, category: 'Safety' },
  { id: '9', label: 'Check mirrors and visibility', required: true, category: 'Safety' },
  { id: '10', label: 'Check seatbelt condition', required: true, category: 'Safety' },
  { id: '11', label: 'Check fire extinguisher present', required: true, category: 'Safety' },
  { id: '12', label: 'Inspect for fluid leaks', required: true, category: 'General' },
  { id: '13', label: 'Check controls respond properly', required: true, category: 'Operation' },
  { id: '14', label: 'Check parking brake operation', required: true, category: 'Operation' },
];
