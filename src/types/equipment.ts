/**
 * Equipment Types
 * Types for the Equipment Tracking system
 * Aligned with migration 051_equipment_tracking.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type EquipmentType =
  | 'excavator'
  | 'loader'
  | 'backhoe'
  | 'crane'
  | 'forklift'
  | 'truck'
  | 'dump_truck'
  | 'concrete_mixer'
  | 'bulldozer'
  | 'grader'
  | 'roller'
  | 'paver'
  | 'generator'
  | 'compressor'
  | 'welder'
  | 'pump'
  | 'scaffolding'
  | 'lift'
  | 'trailer'
  | 'other';

export type EquipmentCategory =
  | 'earthmoving'
  | 'lifting'
  | 'transport'
  | 'power'
  | 'concrete'
  | 'compaction'
  | 'paving'
  | 'material_handling'
  | 'access'
  | 'other';

export type EquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service';

export type OwnershipType = 'owned' | 'rented' | 'leased';

export type RentalRateType = 'hourly' | 'daily' | 'weekly' | 'monthly';

export type FuelType = 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'propane' | 'natural_gas';

export type MaintenanceType = 'preventive' | 'repair' | 'inspection' | 'service';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type AssignmentStatus = 'active' | 'completed' | 'cancelled';

export type InspectionType = 'pre_operation' | 'daily' | 'weekly' | 'monthly' | 'annual';

export type InspectionStatus = 'pass' | 'fail' | 'needs_attention';

export const EQUIPMENT_TYPES: { value: EquipmentType; label: string; category: EquipmentCategory }[] = [
  { value: 'excavator', label: 'Excavator', category: 'earthmoving' },
  { value: 'loader', label: 'Loader', category: 'earthmoving' },
  { value: 'backhoe', label: 'Backhoe', category: 'earthmoving' },
  { value: 'bulldozer', label: 'Bulldozer', category: 'earthmoving' },
  { value: 'grader', label: 'Grader', category: 'earthmoving' },
  { value: 'crane', label: 'Crane', category: 'lifting' },
  { value: 'forklift', label: 'Forklift', category: 'material_handling' },
  { value: 'lift', label: 'Aerial Lift', category: 'access' },
  { value: 'truck', label: 'Truck', category: 'transport' },
  { value: 'dump_truck', label: 'Dump Truck', category: 'transport' },
  { value: 'trailer', label: 'Trailer', category: 'transport' },
  { value: 'concrete_mixer', label: 'Concrete Mixer', category: 'concrete' },
  { value: 'roller', label: 'Roller/Compactor', category: 'compaction' },
  { value: 'paver', label: 'Paver', category: 'paving' },
  { value: 'generator', label: 'Generator', category: 'power' },
  { value: 'compressor', label: 'Air Compressor', category: 'power' },
  { value: 'welder', label: 'Welder', category: 'power' },
  { value: 'pump', label: 'Pump', category: 'power' },
  { value: 'scaffolding', label: 'Scaffolding', category: 'access' },
  { value: 'other', label: 'Other', category: 'other' },
];

export const EQUIPMENT_CATEGORIES: { value: EquipmentCategory; label: string }[] = [
  { value: 'earthmoving', label: 'Earthmoving' },
  { value: 'lifting', label: 'Lifting' },
  { value: 'transport', label: 'Transport' },
  { value: 'power', label: 'Power Equipment' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'compaction', label: 'Compaction' },
  { value: 'paving', label: 'Paving' },
  { value: 'material_handling', label: 'Material Handling' },
  { value: 'access', label: 'Access Equipment' },
  { value: 'other', label: 'Other' },
];

export const EQUIPMENT_STATUSES: { value: EquipmentStatus; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: 'green' },
  { value: 'in_use', label: 'In Use', color: 'blue' },
  { value: 'maintenance', label: 'Maintenance', color: 'yellow' },
  { value: 'out_of_service', label: 'Out of Service', color: 'red' },
];

export const OWNERSHIP_TYPES: { value: OwnershipType; label: string }[] = [
  { value: 'owned', label: 'Owned' },
  { value: 'rented', label: 'Rented' },
  { value: 'leased', label: 'Leased' },
];

export const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'gasoline', label: 'Gasoline' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'propane', label: 'Propane' },
  { value: 'natural_gas', label: 'Natural Gas' },
];

export const MAINTENANCE_TYPES: { value: MaintenanceType; label: string }[] = [
  { value: 'preventive', label: 'Preventive Maintenance' },
  { value: 'repair', label: 'Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'service', label: 'Service' },
];

export const MAINTENANCE_STATUSES: { value: MaintenanceStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'yellow' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
];

export const INSPECTION_TYPES: { value: InspectionType; label: string }[] = [
  { value: 'pre_operation', label: 'Pre-Operation' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
];

export const INSPECTION_STATUSES: { value: InspectionStatus; label: string; color: string }[] = [
  { value: 'pass', label: 'Pass', color: 'green' },
  { value: 'fail', label: 'Fail', color: 'red' },
  { value: 'needs_attention', label: 'Needs Attention', color: 'yellow' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Equipment - Master equipment record
 */
export interface Equipment {
  id: string;
  company_id: string;

  // Equipment Identification
  equipment_number: string;
  name: string;
  description: string | null;

  // Equipment Type
  equipment_type: EquipmentType;
  category: EquipmentCategory | null;

  // Specifications
  make: string | null;
  model: string | null;
  year: number | null;
  serial_number: string | null;
  vin: string | null;

  // Ownership
  ownership_type: OwnershipType;
  owner_company: string | null;
  rental_rate: number | null;
  rental_rate_type: RentalRateType | null;

  // Capacity/Specs
  capacity: string | null;
  operating_weight: string | null;
  dimensions: string | null;

  // Status
  status: EquipmentStatus;
  current_location: string | null;
  current_project_id: string | null;

  // Meter/Hours Tracking
  current_hours: number;
  current_miles: number;

  // Costs
  purchase_price: number | null;
  purchase_date: string | null;
  hourly_cost: number | null;
  fuel_type: FuelType | null;

  // Insurance & Registration
  insurance_policy: string | null;
  insurance_expiry: string | null;
  registration_number: string | null;
  registration_expiry: string | null;

  // Certifications Required
  requires_certified_operator: boolean;
  certification_type: string | null;

  // Image
  image_url: string | null;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * Equipment Assignment
 */
export interface EquipmentAssignment {
  id: string;
  equipment_id: string;
  project_id: string;

  // Assignment Period
  assigned_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;

  // Reason
  assignment_reason: string | null;

  // Rates
  daily_rate: number | null;
  hourly_rate: number | null;

  // Status
  status: AssignmentStatus;

  // Assigned By
  assigned_by: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  notes: string | null;
}

/**
 * Equipment Log - Daily usage log
 */
export interface EquipmentLog {
  id: string;
  equipment_id: string;
  project_id: string | null;

  // Log Date
  log_date: string;

  // Usage Metrics
  hours_used: number;
  miles_driven: number;
  fuel_used: number;
  fuel_cost: number | null;

  // Readings
  start_hours: number | null;
  end_hours: number | null;
  start_miles: number | null;
  end_miles: number | null;

  // Operator
  operator_id: string | null;
  operator_name: string | null;

  // Work Performed
  work_description: string | null;
  location: string | null;

  // Condition
  condition_notes: string | null;
  reported_issues: string | null;

  // Idle Time
  idle_hours: number;

  // Daily Report Reference
  daily_report_id: string | null;

  // Cost Code Integration
  cost_code_id: string | null;
  calculated_cost: number | null;
  cost_posted: boolean;
  cost_transaction_id: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Equipment Maintenance
 */
export interface EquipmentMaintenance {
  id: string;
  equipment_id: string;

  // Maintenance Type
  maintenance_type: MaintenanceType;

  // Schedule
  scheduled_date: string | null;
  due_hours: number | null;
  due_miles: number | null;

  // Completion
  completed_date: string | null;
  completed_hours: number | null;
  completed_miles: number | null;

  // Details
  description: string;
  work_performed: string | null;

  // Service Provider
  service_provider: string | null;
  technician_name: string | null;

  // Cost
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;

  // Parts Used
  parts_used: {
    part_name: string;
    part_number?: string;
    quantity: number;
    unit_cost?: number;
  }[];

  // Status
  status: MaintenanceStatus;

  // Downtime
  downtime_hours: number | null;

  // Documents
  invoice_number: string | null;
  attachments: {
    file_url: string;
    file_name: string;
    file_type?: string;
  }[];

  // Next Service
  next_service_date: string | null;
  next_service_hours: number | null;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Equipment Inspection
 */
export interface EquipmentInspection {
  id: string;
  equipment_id: string;
  project_id: string | null;

  // Inspection Info
  inspection_type: InspectionType;
  inspection_date: string;

  // Inspector
  inspector_id: string | null;
  inspector_name: string | null;

  // Results
  overall_status: InspectionStatus;
  checklist_items: {
    item: string;
    status: 'pass' | 'fail' | 'na';
    notes?: string;
  }[];

  // Meter Readings
  hours_reading: number | null;
  miles_reading: number | null;

  // Issues Found
  issues_found: string | null;
  corrective_actions: string | null;

  // Follow-up
  follow_up_required: boolean;
  follow_up_date: string | null;

  // Signature
  signature_url: string | null;

  // Metadata
  created_at: string;
  created_by: string | null;
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * Equipment with computed fields from view
 */
export interface EquipmentWithStats extends Equipment {
  hours_this_month: number;
  hours_this_year: number;
  days_since_maintenance: number | null;
  next_maintenance_date: string | null;
  active_assignment_project_id: string | null;
}

/**
 * Equipment with all relations
 */
export interface EquipmentWithDetails extends Equipment {
  // Computed fields
  hours_this_month?: number;
  hours_this_year?: number;
  days_since_maintenance?: number | null;
  next_maintenance_date?: string | null;

  // Relations
  current_project?: {
    id: string;
    name: string;
    number: string | null;
  };
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  active_assignments?: EquipmentAssignmentWithProject[];
  recent_logs?: EquipmentLog[];
  upcoming_maintenance?: EquipmentMaintenance[];
}

/**
 * Equipment Assignment with relations
 */
export interface EquipmentAssignmentWithProject extends EquipmentAssignment {
  project?: {
    id: string;
    name: string;
    number: string | null;
  };
  equipment?: {
    id: string;
    equipment_number: string;
    name: string;
  };
  assigned_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

/**
 * Equipment Log with relations
 */
export interface EquipmentLogWithDetails extends EquipmentLog {
  equipment?: {
    id: string;
    equipment_number: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
    number: string | null;
  };
  operator?: {
    id: string;
    full_name: string;
    email: string;
  };
}

/**
 * Equipment Log with cost details from equipment_logs_with_costs view
 * Used for cost posting to job costing
 */
export interface EquipmentLogWithCostDetails extends EquipmentLog {
  equipment?: {
    id: string;
    equipment_number: string;
    name: string;
    hourly_cost: number | null;
  };
  project?: {
    id: string;
    name: string;
    number: string | null;
  };
  operator?: {
    id: string;
    full_name: string;
    email: string;
  };
  cost_code?: {
    id: string;
    code: string;
    name: string;
  };
  cost_transaction?: {
    id: string;
  };
}

/**
 * Equipment Maintenance with relations
 */
export interface EquipmentMaintenanceWithDetails extends EquipmentMaintenance {
  equipment?: {
    id: string;
    equipment_number: string;
    name: string;
  };
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create Equipment input
 */
export interface CreateEquipmentDTO {
  equipment_number: string;
  name: string;
  description?: string;
  equipment_type: EquipmentType;
  category?: EquipmentCategory;
  make?: string;
  model?: string;
  year?: number;
  serial_number?: string;
  vin?: string;
  ownership_type?: OwnershipType;
  owner_company?: string;
  rental_rate?: number;
  rental_rate_type?: RentalRateType;
  capacity?: string;
  operating_weight?: string;
  dimensions?: string;
  status?: EquipmentStatus;
  current_location?: string;
  current_hours?: number;
  current_miles?: number;
  purchase_price?: number;
  purchase_date?: string;
  hourly_cost?: number;
  fuel_type?: FuelType;
  insurance_policy?: string;
  insurance_expiry?: string;
  registration_number?: string;
  registration_expiry?: string;
  requires_certified_operator?: boolean;
  certification_type?: string;
  image_url?: string;
  notes?: string;
}

/**
 * Update Equipment input
 */
export interface UpdateEquipmentDTO extends Partial<CreateEquipmentDTO> {
  current_project_id?: string | null;
}

/**
 * Create Equipment Assignment input
 */
export interface CreateEquipmentAssignmentDTO {
  equipment_id: string;
  project_id: string;
  assigned_date: string;
  expected_return_date?: string;
  assignment_reason?: string;
  daily_rate?: number;
  hourly_rate?: number;
  notes?: string;
}

/**
 * Update Equipment Assignment input
 */
export interface UpdateEquipmentAssignmentDTO {
  expected_return_date?: string;
  actual_return_date?: string;
  assignment_reason?: string;
  daily_rate?: number;
  hourly_rate?: number;
  status?: AssignmentStatus;
  notes?: string;
}

/**
 * Create Equipment Log input
 */
export interface CreateEquipmentLogDTO {
  equipment_id: string;
  project_id?: string;
  log_date: string;
  hours_used?: number;
  miles_driven?: number;
  fuel_used?: number;
  fuel_cost?: number;
  start_hours?: number;
  end_hours?: number;
  start_miles?: number;
  end_miles?: number;
  operator_id?: string;
  operator_name?: string;
  work_description?: string;
  location?: string;
  condition_notes?: string;
  reported_issues?: string;
  idle_hours?: number;
  daily_report_id?: string;
  cost_code_id?: string;
}

/**
 * Update Equipment Log input
 */
export interface UpdateEquipmentLogDTO extends Partial<CreateEquipmentLogDTO> {}

/**
 * Create Equipment Maintenance input
 */
export interface CreateEquipmentMaintenanceDTO {
  equipment_id: string;
  maintenance_type: MaintenanceType;
  scheduled_date?: string;
  due_hours?: number;
  due_miles?: number;
  description: string;
  service_provider?: string;
  technician_name?: string;
  notes?: string;
}

/**
 * Update Equipment Maintenance input
 */
export interface UpdateEquipmentMaintenanceDTO {
  scheduled_date?: string;
  due_hours?: number;
  due_miles?: number;
  completed_date?: string;
  completed_hours?: number;
  completed_miles?: number;
  description?: string;
  work_performed?: string;
  service_provider?: string;
  technician_name?: string;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  parts_used?: EquipmentMaintenance['parts_used'];
  status?: MaintenanceStatus;
  downtime_hours?: number;
  invoice_number?: string;
  attachments?: EquipmentMaintenance['attachments'];
  next_service_date?: string;
  next_service_hours?: number;
  notes?: string;
}

/**
 * Create Equipment Inspection input
 */
export interface CreateEquipmentInspectionDTO {
  equipment_id: string;
  project_id?: string;
  inspection_type: InspectionType;
  inspection_date: string;
  inspector_id?: string;
  inspector_name?: string;
  overall_status: InspectionStatus;
  checklist_items?: EquipmentInspection['checklist_items'];
  hours_reading?: number;
  miles_reading?: number;
  issues_found?: string;
  corrective_actions?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  signature_url?: string;
}

// =============================================
// Filter Types
// =============================================

export interface EquipmentFilters {
  companyId: string;
  equipmentType?: EquipmentType | EquipmentType[];
  category?: EquipmentCategory | EquipmentCategory[];
  status?: EquipmentStatus | EquipmentStatus[];
  ownershipType?: OwnershipType;
  currentProjectId?: string;
  search?: string;
}

export interface EquipmentLogFilters {
  equipmentId?: string;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  operatorId?: string;
}

export interface EquipmentMaintenanceFilters {
  equipmentId?: string;
  maintenanceType?: MaintenanceType | MaintenanceType[];
  status?: MaintenanceStatus | MaintenanceStatus[];
  dateFrom?: string;
  dateTo?: string;
}

// =============================================
// Statistics Types
// =============================================

/**
 * Equipment statistics for a company
 */
export interface EquipmentStatistics {
  total: number;
  by_status: Record<EquipmentStatus, number>;
  by_type: Record<EquipmentType, number>;
  by_ownership: Record<OwnershipType, number>;
  total_hours_this_month: number;
  equipment_needing_maintenance: number;
  rented_equipment_count: number;
  utilization_rate: number;  // Percentage of in_use vs available
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get equipment type label
 */
export function getEquipmentTypeLabel(type: EquipmentType): string {
  const typeConfig = EQUIPMENT_TYPES.find((t) => t.value === type);
  return typeConfig?.label || type;
}

/**
 * Get equipment status color
 */
export function getEquipmentStatusColor(status: EquipmentStatus): string {
  const statusConfig = EQUIPMENT_STATUSES.find((s) => s.value === status);
  return statusConfig?.color || 'gray';
}

/**
 * Get equipment status label
 */
export function getEquipmentStatusLabel(status: EquipmentStatus): string {
  const statusConfig = EQUIPMENT_STATUSES.find((s) => s.value === status);
  return statusConfig?.label || status;
}

/**
 * Get maintenance status color
 */
export function getMaintenanceStatusColor(status: MaintenanceStatus): string {
  const statusConfig = MAINTENANCE_STATUSES.find((s) => s.value === status);
  return statusConfig?.color || 'gray';
}

/**
 * Get inspection status color
 */
export function getInspectionStatusColor(status: InspectionStatus): string {
  const statusConfig = INSPECTION_STATUSES.find((s) => s.value === status);
  return statusConfig?.color || 'gray';
}

/**
 * Format equipment display name
 */
export function formatEquipmentName(equipment: { equipment_number: string; name: string }): string {
  return `${equipment.equipment_number} - ${equipment.name}`;
}

/**
 * Check if maintenance is overdue
 */
export function isMaintenanceOverdue(maintenance: EquipmentMaintenance, equipment: Equipment): boolean {
  if (maintenance.status !== 'scheduled') return false;

  if (maintenance.scheduled_date && new Date(maintenance.scheduled_date) < new Date()) {
    return true;
  }

  if (maintenance.due_hours && equipment.current_hours >= maintenance.due_hours) {
    return true;
  }

  if (maintenance.due_miles && equipment.current_miles >= maintenance.due_miles) {
    return true;
  }

  return false;
}
