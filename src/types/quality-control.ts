/**
 * Quality Control Module Types
 *
 * Types for Non-Conformance Reports (NCR) and QC Inspections
 * Aligned with migration 155_quality_control_module.sql
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum NCRCategory {
  WORKMANSHIP = 'workmanship',
  MATERIAL = 'material',
  DESIGN = 'design',
  DOCUMENTATION = 'documentation',
  PROCESS = 'process',
}

export enum NCRSeverity {
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical',
}

export enum NCRType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  SUPPLIER = 'supplier',
}

export enum NCRStatus {
  OPEN = 'open',
  UNDER_REVIEW = 'under_review',
  CORRECTIVE_ACTION = 'corrective_action',
  VERIFICATION = 'verification',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  VOIDED = 'voided',
}

export enum ResponsiblePartyType {
  SUBCONTRACTOR = 'subcontractor',
  SUPPLIER = 'supplier',
  DESIGNER = 'designer',
  OWNER = 'owner',
  GC = 'gc',
}

export enum RootCauseCategory {
  TRAINING = 'training',
  PROCESS = 'process',
  EQUIPMENT = 'equipment',
  MATERIAL = 'material',
  ENVIRONMENT = 'environment',
  HUMAN_ERROR = 'human_error',
}

export enum NCRDisposition {
  REWORK = 'rework',
  REPAIR = 'repair',
  USE_AS_IS = 'use_as_is',
  SCRAP = 'scrap',
  RETURN_TO_SUPPLIER = 'return_to_supplier',
}

export enum InspectionType {
  PRE_WORK = 'pre_work',
  IN_PROCESS = 'in_process',
  FINAL = 'final',
  MOCK_UP = 'mock_up',
  FIRST_ARTICLE = 'first_article',
  RECEIVING = 'receiving',
}

export enum InspectionCategory {
  STRUCTURAL = 'structural',
  MECHANICAL = 'mechanical',
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  ARCHITECTURAL = 'architectural',
  CIVIL = 'civil',
}

export enum InspectionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PASSED = 'passed',
  FAILED = 'failed',
  CONDITIONAL = 'conditional',
}

export enum ChecklistItemResult {
  PASS = 'pass',
  FAIL = 'fail',
  NA = 'na',
  PENDING = 'pending',
}

// ============================================================================
// NCR INTERFACES
// ============================================================================

export interface FiveWhysAnalysis {
  why1?: string;
  why2?: string;
  why3?: string;
  why4?: string;
  why5?: string;
  root_cause?: string;
}

export interface NonConformanceReport {
  id: string;
  project_id: string;
  company_id: string;

  // Identification
  ncr_number: number;
  title: string;
  description: string | null;

  // Classification
  category: NCRCategory | null;
  severity: NCRSeverity;
  ncr_type: NCRType;

  // Location & Reference
  location: string | null;
  spec_section: string | null;
  drawing_reference: string | null;
  cost_code_id: string | null;

  // Responsible Parties
  responsible_party_type: ResponsiblePartyType | null;
  responsible_subcontractor_id: string | null;
  responsible_user_id: string | null;

  // Status
  status: NCRStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // Root Cause
  root_cause_category: RootCauseCategory | null;
  root_cause_description: string | null;
  five_whys_analysis: FiveWhysAnalysis | null;

  // Corrective Action
  corrective_action: string | null;
  corrective_action_due_date: string | null;
  corrective_action_completed_date: string | null;
  corrective_action_by: string | null;

  // Preventive Action
  preventive_action: string | null;
  preventive_action_implemented: boolean;

  // Verification
  verification_required: boolean;
  verification_method: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;

  // Impact
  cost_impact: boolean;
  cost_impact_amount: number | null;
  schedule_impact: boolean;
  schedule_impact_days: number | null;
  safety_impact: boolean;

  // Disposition
  disposition: NCRDisposition | null;
  disposition_notes: string | null;
  disposition_approved_by: string | null;
  disposition_approved_at: string | null;

  // Attachments
  photo_urls: string[];
  document_urls: string[];

  // Dates
  date_identified: string;
  date_closed: string | null;

  // Audit
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NCRWithDetails extends NonConformanceReport {
  project?: {
    id: string;
    name: string;
    project_number: string | null;
  };
  responsible_subcontractor?: {
    id: string;
    company_name: string;
  };
  responsible_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  cost_code?: {
    id: string;
    code: string;
    name: string;
  };
  created_by_user?: {
    id: string;
    full_name: string;
  };
  history?: NCRHistory[];
  // Mapped fields from service layer
  responsible_party_name?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  created_by_name?: string;
  closed_by_name?: string;
  due_date?: string;
}

export interface NCRHistory {
  id: string;
  ncr_id: string;
  action: string;
  previous_status: NCRStatus | null;
  new_status: NCRStatus | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  notes: string | null;
  performed_by: string | null;
  performed_at: string;
  performed_by_user?: {
    id: string;
    full_name: string;
  };
}

// ============================================================================
// QC INSPECTION INTERFACES
// ============================================================================

export interface QCInspection {
  id: string;
  project_id: string;
  company_id: string;

  // Identification
  inspection_number: number;
  title: string;
  description: string | null;

  // Classification
  inspection_type: InspectionType;
  category: InspectionCategory | null;

  // Location & Reference
  location: string | null;
  spec_section: string | null;
  drawing_reference: string | null;
  cost_code_id: string | null;

  // Work Reference
  daily_report_id: string | null;
  work_order_id: string | null;

  // Inspection Details
  inspection_date: string;
  inspector_id: string | null;
  witness_required: boolean;
  witness_id: string | null;

  // Checklist
  checklist_template_id: string | null;
  checklist_response_id: string | null;

  // Results
  status: InspectionStatus;
  pass_fail_items: PassFailItem[] | null;
  overall_result: 'pass' | 'fail' | 'conditional' | null;

  // Follow-up
  ncr_required: boolean;
  ncr_id: string | null;
  reinspection_required: boolean;
  reinspection_date: string | null;
  reinspection_id: string | null;

  // Sign-off
  inspector_signature: string | null;
  inspector_signed_at: string | null;
  witness_signature: string | null;
  witness_signed_at: string | null;

  // Notes & Attachments
  notes: string | null;
  photo_urls: string[];
  document_urls: string[];

  // Audit
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PassFailItem {
  item: string;
  result: 'pass' | 'fail' | 'na';
  notes?: string;
}

export interface QCInspectionWithDetails extends QCInspection {
  project?: {
    id: string;
    name: string;
    project_number: string | null;
  };
  inspector?: {
    id: string;
    full_name: string;
    email: string;
  };
  witness?: {
    id: string;
    full_name: string;
  };
  cost_code?: {
    id: string;
    code: string;
    name: string;
  };
  ncr?: NonConformanceReport;
  checklist_items?: QCChecklistItem[];
  // Mapped fields from service layer
  inspector_name?: string;
  inspector_email?: string;
  subcontractor_name?: string;
  created_by_name?: string;
  scheduled_date?: string;
  result?: InspectionResult;
}

export interface QCChecklistItem {
  id: string;
  inspection_id: string;

  // Item Details
  item_number: number;
  description: string;
  spec_reference: string | null;
  acceptance_criteria: string | null;

  // Result
  result: ChecklistItemResult | null;
  deviation_noted: boolean;
  deviation_description: string | null;

  // Measurements
  required_value: string | null;
  actual_value: string | null;
  tolerance: string | null;
  within_tolerance: boolean | null;

  // Notes & Photos
  notes: string | null;
  photo_urls: string[];

  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SUMMARY / STATISTICS TYPES
// ============================================================================

export interface NCRSummaryByProject {
  project_id: string;
  total_ncrs: number;
  open_ncrs: number;
  under_review_ncrs: number;
  corrective_action_ncrs: number;
  verification_ncrs: number;
  closed_ncrs: number;
  critical_ncrs: number;
  major_ncrs: number;
  minor_ncrs: number;
  ncrs_with_cost_impact: number;
  total_cost_impact: number;
  ncrs_with_schedule_impact: number;
  total_schedule_impact_days: number;
}

export interface InspectionSummaryByProject {
  project_id: string;
  total_inspections: number;
  pending_inspections: number;
  in_progress_inspections: number;
  passed_inspections: number;
  failed_inspections: number;
  conditional_inspections: number;
  inspections_with_ncr: number;
  reinspections_required: number;
  pass_rate_percent: number | null;
}

export interface NCRByResponsibleParty {
  project_id: string;
  responsible_party_type: ResponsiblePartyType | null;
  responsible_subcontractor_id: string | null;
  total_ncrs: number;
  open_ncrs: number;
  critical_ncrs: number;
  total_cost_impact: number;
}

// Types needed by service layer for statistics
export interface NCRSummaryByStatus {
  project_id: string;
  status: NCRStatus;
  count: number;
}

export interface NCRSummaryBySeverity {
  project_id: string;
  severity: NCRSeverity;
  count: number;
}

export interface ProjectQCStats {
  project_id: string;
  total_ncrs: number;
  open_ncrs: number;
  critical_ncrs: number;
  closed_ncrs: number;
  avg_days_to_close: number;
  total_inspections: number;
  completed_inspections: number;
  passed_inspections: number;
  failed_inspections: number;
  inspection_pass_rate: number;
}

// Inspection result type for result badges
export type InspectionResult = 'pass' | 'fail' | 'conditional' | 'pending';

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface NCRFilters {
  projectId: string;
  status?: NCRStatus | NCRStatus[];
  severity?: NCRSeverity | NCRSeverity[];
  category?: NCRCategory | NCRCategory[];
  responsiblePartyType?: ResponsiblePartyType;
  responsibleSubcontractorId?: string;
  // Fields used by API service
  responsiblePartyId?: string;
  assignedToId?: string;
  specSection?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  // Alternative field names for compatibility
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  costImpact?: boolean;
  scheduleImpact?: boolean;
}

export interface InspectionFilters {
  projectId: string;
  status?: InspectionStatus | InspectionStatus[];
  inspectionType?: InspectionType | InspectionType[];
  category?: InspectionCategory;
  inspectorId?: string;
  // Fields used by API service
  subcontractorId?: string;
  result?: InspectionResult;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  // Alternative field names for compatibility
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  ncrRequired?: boolean;
  reinspectionRequired?: boolean;
}

// ============================================================================
// DTO TYPES
// ============================================================================

export interface CreateNCRDTO {
  project_id: string;
  company_id: string;
  title: string;
  description?: string;
  category?: NCRCategory;
  severity?: NCRSeverity;
  ncr_type?: NCRType;
  location?: string;
  spec_section?: string;
  drawing_reference?: string;
  cost_code_id?: string;
  responsible_party_type?: ResponsiblePartyType;
  responsible_subcontractor_id?: string;
  responsible_user_id?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  date_identified?: string;
  photo_urls?: string[];
}

export interface UpdateNCRDTO {
  title?: string;
  description?: string;
  category?: NCRCategory;
  severity?: NCRSeverity;
  location?: string;
  spec_section?: string;
  drawing_reference?: string;
  cost_code_id?: string;
  responsible_party_type?: ResponsiblePartyType;
  responsible_subcontractor_id?: string;
  responsible_user_id?: string;
  status?: NCRStatus;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  root_cause_category?: RootCauseCategory;
  root_cause_description?: string;
  five_whys_analysis?: FiveWhysAnalysis;
  corrective_action?: string;
  corrective_action_due_date?: string;
  preventive_action?: string;
  disposition?: NCRDisposition;
  disposition_notes?: string;
  cost_impact?: boolean;
  cost_impact_amount?: number;
  schedule_impact?: boolean;
  schedule_impact_days?: number;
  safety_impact?: boolean;
  photo_urls?: string[];
  document_urls?: string[];
}

export interface CreateInspectionDTO {
  project_id: string;
  company_id: string;
  title: string;
  description?: string;
  inspection_type: InspectionType;
  category?: InspectionCategory;
  location?: string;
  spec_section?: string;
  drawing_reference?: string;
  cost_code_id?: string;
  daily_report_id?: string;
  inspection_date?: string;
  inspector_id?: string;
  witness_required?: boolean;
  witness_id?: string;
  checklist_template_id?: string;
  photo_urls?: string[];
}

export interface UpdateInspectionDTO {
  title?: string;
  description?: string;
  inspection_type?: InspectionType;
  category?: InspectionCategory;
  location?: string;
  spec_section?: string;
  drawing_reference?: string;
  cost_code_id?: string;
  inspection_date?: string;
  inspector_id?: string;
  witness_required?: boolean;
  witness_id?: string;
  status?: InspectionStatus;
  pass_fail_items?: PassFailItem[];
  overall_result?: 'pass' | 'fail' | 'conditional';
  ncr_required?: boolean;
  ncr_id?: string;
  reinspection_required?: boolean;
  reinspection_date?: string;
  notes?: string;
  photo_urls?: string[];
  document_urls?: string[];
}

export interface CreateChecklistItemDTO {
  inspection_id: string;
  description: string;
  spec_reference?: string;
  acceptance_criteria?: string;
  required_value?: string;
  sort_order?: number;
}

export interface UpdateChecklistItemDTO {
  result?: ChecklistItemResult;
  deviation_noted?: boolean;
  deviation_description?: string;
  actual_value?: string;
  within_tolerance?: boolean;
  notes?: string;
  photo_urls?: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const NCR_STATUS_CONFIG: Record<NCRStatus, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  [NCRStatus.OPEN]: {
    label: 'Open',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    description: 'NCR has been identified and logged',
  },
  [NCRStatus.UNDER_REVIEW]: {
    label: 'Under Review',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description: 'NCR is being reviewed for root cause',
  },
  [NCRStatus.CORRECTIVE_ACTION]: {
    label: 'Corrective Action',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    description: 'Corrective action is being implemented',
  },
  [NCRStatus.VERIFICATION]: {
    label: 'Verification',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    description: 'Corrective action requires verification',
  },
  [NCRStatus.RESOLVED]: {
    label: 'Resolved',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    description: 'NCR has been successfully resolved',
  },
  [NCRStatus.CLOSED]: {
    label: 'Closed',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    description: 'NCR has been closed',
  },
  [NCRStatus.VOIDED]: {
    label: 'Voided',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    description: 'NCR was created in error and voided',
  },
};

export const SEVERITY_CONFIG: Record<NCRSeverity, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  [NCRSeverity.MINOR]: {
    label: 'Minor',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  [NCRSeverity.MAJOR]: {
    label: 'Major',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  [NCRSeverity.CRITICAL]: {
    label: 'Critical',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

export const INSPECTION_STATUS_CONFIG: Record<InspectionStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  [InspectionStatus.PENDING]: {
    label: 'Pending',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
  [InspectionStatus.IN_PROGRESS]: {
    label: 'In Progress',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  [InspectionStatus.PASSED]: {
    label: 'Passed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  [InspectionStatus.FAILED]: {
    label: 'Failed',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  [InspectionStatus.CONDITIONAL]: {
    label: 'Conditional',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
};

export function canTransitionNCRStatus(
  currentStatus: NCRStatus,
  newStatus: NCRStatus
): boolean {
  const transitions: Record<NCRStatus, NCRStatus[]> = {
    [NCRStatus.OPEN]: [NCRStatus.UNDER_REVIEW, NCRStatus.VOIDED],
    [NCRStatus.UNDER_REVIEW]: [NCRStatus.CORRECTIVE_ACTION, NCRStatus.OPEN, NCRStatus.VOIDED],
    [NCRStatus.CORRECTIVE_ACTION]: [NCRStatus.VERIFICATION, NCRStatus.RESOLVED, NCRStatus.UNDER_REVIEW],
    [NCRStatus.VERIFICATION]: [NCRStatus.RESOLVED, NCRStatus.CORRECTIVE_ACTION],
    [NCRStatus.RESOLVED]: [NCRStatus.CLOSED, NCRStatus.CORRECTIVE_ACTION],
    [NCRStatus.CLOSED]: [],
    [NCRStatus.VOIDED]: [],
  };

  return transitions[currentStatus]?.includes(newStatus) ?? false;
}

export function getNCRStatusLabel(status: NCRStatus): string {
  return NCR_STATUS_CONFIG[status]?.label ?? status;
}

export function getInspectionStatusLabel(status: InspectionStatus): string {
  return INSPECTION_STATUS_CONFIG[status]?.label ?? status;
}
