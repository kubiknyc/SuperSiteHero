/**
 * Job Safety Analysis (JSA) Types
 * Types for pre-task job hazard analysis with hazard/control identification
 * Aligned with migration 087_job_safety_analysis.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type JSAStatus = 'draft' | 'pending_review' | 'approved' | 'in_progress' | 'completed' | 'cancelled';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type Probability = 'unlikely' | 'possible' | 'likely' | 'certain';

export type Severity = 'minor' | 'moderate' | 'serious' | 'catastrophic';

export type HazardType = 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'environmental';

export type AttachmentType = 'photo' | 'document' | 'diagram' | 'sds';

export const JSA_STATUSES: { value: JSAStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'pending_review', label: 'Pending Review', color: 'yellow' },
  { value: 'approved', label: 'Approved', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'purple' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
];

export const RISK_LEVELS: { value: RiskLevel; label: string; color: string; description: string }[] = [
  { value: 'low', label: 'Low', color: 'green', description: 'Minor risk, standard precautions' },
  { value: 'medium', label: 'Medium', color: 'yellow', description: 'Moderate risk, additional controls needed' },
  { value: 'high', label: 'High', color: 'orange', description: 'Significant risk, strict controls required' },
  { value: 'critical', label: 'Critical', color: 'red', description: 'Severe risk, senior approval required' },
];

export const HAZARD_TYPES: { value: HazardType; label: string }[] = [
  { value: 'physical', label: 'Physical' },
  { value: 'chemical', label: 'Chemical' },
  { value: 'biological', label: 'Biological' },
  { value: 'ergonomic', label: 'Ergonomic' },
  { value: 'environmental', label: 'Environmental' },
];

export const COMMON_PPE: string[] = [
  'Hard Hat',
  'Safety Glasses',
  'Safety Goggles',
  'Face Shield',
  'Hearing Protection',
  'High-Visibility Vest',
  'Steel-Toe Boots',
  'Work Gloves',
  'Cut-Resistant Gloves',
  'Chemical Gloves',
  'Respirator',
  'Dust Mask',
  'Fall Protection Harness',
  'Fire-Resistant Clothing',
  'Arc Flash Protection',
];

export const JSA_CATEGORIES: string[] = [
  'General Construction',
  'Excavation',
  'Electrical Work',
  'Confined Space',
  'Hot Work',
  'Working at Heights',
  'Heavy Equipment',
  'Concrete Work',
  'Steel Erection',
  'Roofing',
  'Demolition',
  'Hazardous Materials',
  'Crane Operations',
  'Scaffold Work',
  'Welding',
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * JSA Template
 */
export interface JSATemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: string | null;
  work_type: string | null;
  default_hazards: DefaultHazard[];
  required_training: string[] | null;
  osha_standards: string[] | null;
  other_references: string | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Default hazard in template
 */
export interface DefaultHazard {
  hazard: string;
  risk_level: RiskLevel;
  controls: string[];
  ppe: string[];
}

/**
 * Job Safety Analysis
 */
export interface JobSafetyAnalysis {
  id: string;
  company_id: string;
  project_id: string;
  jsa_number: string;
  revision_number: number;
  template_id: string | null;

  // Task info
  task_description: string;
  work_location: string | null;
  equipment_used: string[] | null;

  // Scheduling
  scheduled_date: string;
  start_time: string | null;
  estimated_duration: string | null;

  // Related documents
  work_permit_id: string | null;
  related_incident_id: string | null;

  // Responsible parties
  supervisor_id: string | null;
  supervisor_name: string | null;
  foreman_name: string | null;
  contractor_company: string | null;

  // Review
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;

  // Status
  status: JSAStatus;
  completed_date: string | null;
  completion_notes: string | null;

  // Conditions
  weather_conditions: string | null;
  temperature: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * JSA Hazard
 */
export interface JSAHazard {
  id: string;
  jsa_id: string;
  step_number: number;
  step_description: string;
  hazard_description: string;
  hazard_type: HazardType | null;
  risk_level: RiskLevel;
  probability: Probability | null;
  severity: Severity | null;

  // Controls (hierarchy)
  elimination_controls: string | null;
  substitution_controls: string | null;
  engineering_controls: string | null;
  administrative_controls: string | null;
  ppe_required: string[] | null;

  // Responsibility
  responsible_party: string | null;
  responsible_party_id: string | null;

  // Verification
  controls_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;

  // Metadata
  created_at: string;
  notes: string | null;
}

/**
 * JSA Acknowledgment
 */
export interface JSAAcknowledgment {
  id: string;
  jsa_id: string;
  user_id: string | null;
  worker_name: string;
  worker_company: string | null;
  worker_trade: string | null;
  worker_badge_number: string | null;
  acknowledged_at: string;
  signature_data: string | null;
  understands_hazards: boolean;
  has_questions: boolean;
  questions_notes: string | null;
  created_at: string;
}

/**
 * JSA Attachment
 */
export interface JSAAttachment {
  id: string;
  jsa_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  attachment_type: AttachmentType | null;
  uploaded_at: string;
  uploaded_by: string | null;
  description: string | null;
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * JSA with project details
 */
export interface JSAWithProject extends JobSafetyAnalysis {
  project?: {
    id: string;
    name: string;
    project_number?: string;
  };
}

/**
 * JSA with all relations
 */
export interface JSAWithDetails extends JobSafetyAnalysis {
  project?: {
    id: string;
    name: string;
    project_number?: string;
  };
  template?: {
    id: string;
    name: string;
  };
  hazards: JSAHazard[];
  acknowledgments: JSAAcknowledgment[];
  attachments: JSAAttachment[];
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  supervisor_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  reviewed_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

/**
 * JSA Template with details
 */
export interface JSATemplateWithDetails extends JSATemplate {
  created_by_user?: {
    id: string;
    full_name: string;
  };
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create JSA input
 */
export interface CreateJSADTO {
  project_id: string;
  template_id?: string;
  task_description: string;
  work_location?: string;
  equipment_used?: string[];
  scheduled_date: string;
  start_time?: string;
  estimated_duration?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  foreman_name?: string;
  contractor_company?: string;
  weather_conditions?: string;
  temperature?: string;
  hazards?: CreateJSAHazardDTO[];
}

/**
 * Update JSA input
 */
export interface UpdateJSADTO {
  task_description?: string;
  work_location?: string;
  equipment_used?: string[];
  scheduled_date?: string;
  start_time?: string;
  estimated_duration?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  foreman_name?: string;
  contractor_company?: string;
  weather_conditions?: string;
  temperature?: string;
  status?: JSAStatus;
  review_notes?: string;
  completion_notes?: string;
}

/**
 * Create JSA Hazard input
 */
export interface CreateJSAHazardDTO {
  jsa_id?: string;
  step_number?: number;
  step_description: string;
  hazard_description: string;
  hazard_type?: HazardType;
  risk_level?: RiskLevel;
  probability?: Probability;
  severity?: Severity;
  elimination_controls?: string;
  substitution_controls?: string;
  engineering_controls?: string;
  administrative_controls?: string;
  ppe_required?: string[];
  responsible_party?: string;
  responsible_party_id?: string;
  notes?: string;
}

/**
 * Update JSA Hazard input
 */
export interface UpdateJSAHazardDTO {
  step_description?: string;
  hazard_description?: string;
  hazard_type?: HazardType;
  risk_level?: RiskLevel;
  probability?: Probability;
  severity?: Severity;
  elimination_controls?: string;
  substitution_controls?: string;
  engineering_controls?: string;
  administrative_controls?: string;
  ppe_required?: string[];
  responsible_party?: string;
  responsible_party_id?: string;
  controls_verified?: boolean;
  notes?: string;
}

/**
 * Create JSA Acknowledgment input
 */
export interface CreateJSAAcknowledgmentDTO {
  jsa_id: string;
  user_id?: string;
  worker_name: string;
  worker_company?: string;
  worker_trade?: string;
  worker_badge_number?: string;
  signature_data?: string;
  understands_hazards?: boolean;
  has_questions?: boolean;
  questions_notes?: string;
}

/**
 * Create JSA Template input
 */
export interface CreateJSATemplateDTO {
  name: string;
  description?: string;
  category?: string;
  work_type?: string;
  default_hazards?: DefaultHazard[];
  required_training?: string[];
  osha_standards?: string[];
  other_references?: string;
}

// =============================================
// Filter Types
// =============================================

export interface JSAFilters {
  projectId?: string;
  status?: JSAStatus;
  scheduledFrom?: string;
  scheduledTo?: string;
  supervisorId?: string;
  riskLevel?: RiskLevel;
  search?: string;
}

export interface JSATemplateFilters {
  category?: string;
  search?: string;
  isActive?: boolean;
}

// =============================================
// Statistics Types
// =============================================

export interface JSAStatistics {
  total_jsas: number;
  pending_review: number;
  approved: number;
  completed: number;
  high_risk_count: number;
  avg_hazards_per_jsa: number;
  total_acknowledgments: number;
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get status badge color
 */
export function getJSAStatusColor(status: JSAStatus): string {
  const config = JSA_STATUSES.find(s => s.value === status);
  return config?.color || 'gray';
}

/**
 * Get status label
 */
export function getJSAStatusLabel(status: JSAStatus): string {
  const config = JSA_STATUSES.find(s => s.value === status);
  return config?.label || status;
}

/**
 * Get risk level color
 */
export function getRiskLevelColor(level: RiskLevel): string {
  const config = RISK_LEVELS.find(r => r.value === level);
  return config?.color || 'gray';
}

/**
 * Get risk level label
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  const config = RISK_LEVELS.find(r => r.value === level);
  return config?.label || level;
}

/**
 * Check if JSA can be edited
 */
export function canEditJSA(jsa: JobSafetyAnalysis): boolean {
  return jsa.status === 'draft' || jsa.status === 'pending_review';
}

/**
 * Check if JSA can be approved
 */
export function canApproveJSA(jsa: JobSafetyAnalysis): boolean {
  return jsa.status === 'pending_review';
}

/**
 * Check if JSA can start work
 */
export function canStartWork(jsa: JobSafetyAnalysis): boolean {
  return jsa.status === 'approved';
}

/**
 * Check if JSA can be completed
 */
export function canCompleteJSA(jsa: JobSafetyAnalysis): boolean {
  return jsa.status === 'in_progress';
}

/**
 * Calculate overall risk level from hazards
 */
export function calculateOverallRisk(hazards: JSAHazard[]): RiskLevel {
  if (hazards.length === 0) {return 'low';}

  const riskOrder: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  let maxRisk: RiskLevel = 'low';

  hazards.forEach(hazard => {
    const currentIndex = riskOrder.indexOf(hazard.risk_level);
    const maxIndex = riskOrder.indexOf(maxRisk);
    if (currentIndex > maxIndex) {
      maxRisk = hazard.risk_level;
    }
  });

  return maxRisk;
}

/**
 * Count hazards by risk level
 */
export function countHazardsByRisk(hazards: JSAHazard[]): Record<RiskLevel, number> {
  const counts: Record<RiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  hazards.forEach(hazard => {
    counts[hazard.risk_level]++;
  });

  return counts;
}

/**
 * Get all unique PPE from hazards
 */
export function getRequiredPPE(hazards: JSAHazard[]): string[] {
  const ppeSet = new Set<string>();

  hazards.forEach(hazard => {
    hazard.ppe_required?.forEach(ppe => ppeSet.add(ppe));
  });

  return Array.from(ppeSet).sort();
}

/**
 * Check if all controls are verified
 */
export function allControlsVerified(hazards: JSAHazard[]): boolean {
  return hazards.every(hazard => hazard.controls_verified);
}
