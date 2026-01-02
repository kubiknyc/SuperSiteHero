/**
 * OSHA 300/300A Types
 *
 * Types for OSHA 300 Log and 300A Annual Summary forms
 * for tracking workplace injuries and illnesses.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Case classification for OSHA recordable injuries
 */
export type OSHACaseClassification =
  | 'death'
  | 'days_away'
  | 'job_transfer_restriction'
  | 'other_recordable';

/**
 * Injury/Illness type categories
 */
export type InjuryIllnessType =
  | 'injury'
  | 'skin_disorder'
  | 'respiratory_condition'
  | 'poisoning'
  | 'hearing_loss'
  | 'all_other_illnesses';

/**
 * Body part affected
 */
export type BodyPart =
  | 'head'
  | 'eye'
  | 'ear'
  | 'face'
  | 'neck'
  | 'shoulder'
  | 'arm'
  | 'elbow'
  | 'wrist'
  | 'hand'
  | 'finger'
  | 'chest'
  | 'back'
  | 'abdomen'
  | 'hip'
  | 'leg'
  | 'knee'
  | 'ankle'
  | 'foot'
  | 'toe'
  | 'multiple'
  | 'other';

/**
 * Privacy case reasons
 */
export type PrivacyCaseReason =
  | 'sexual_assault'
  | 'hiv_hepatitis'
  | 'needlestick'
  | 'mental_illness'
  | 'voluntary_request';

// Label mappings
export const CASE_CLASSIFICATION_LABELS: Record<OSHACaseClassification, string> = {
  death: 'Death',
  days_away: 'Days Away from Work',
  job_transfer_restriction: 'Job Transfer or Restriction',
  other_recordable: 'Other Recordable Cases',
};

export const INJURY_ILLNESS_TYPE_LABELS: Record<InjuryIllnessType, string> = {
  injury: 'Injury',
  skin_disorder: 'Skin Disorder',
  respiratory_condition: 'Respiratory Condition',
  poisoning: 'Poisoning',
  hearing_loss: 'Hearing Loss',
  all_other_illnesses: 'All Other Illnesses',
};

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  head: 'Head',
  eye: 'Eye',
  ear: 'Ear',
  face: 'Face',
  neck: 'Neck',
  shoulder: 'Shoulder',
  arm: 'Arm',
  elbow: 'Elbow',
  wrist: 'Wrist',
  hand: 'Hand',
  finger: 'Finger',
  chest: 'Chest',
  back: 'Back',
  abdomen: 'Abdomen',
  hip: 'Hip',
  leg: 'Leg',
  knee: 'Knee',
  ankle: 'Ankle',
  foot: 'Foot',
  toe: 'Toe',
  multiple: 'Multiple Body Parts',
  other: 'Other',
};

export const PRIVACY_CASE_LABELS: Record<PrivacyCaseReason, string> = {
  sexual_assault: 'Sexual Assault',
  hiv_hepatitis: 'HIV Infection, Hepatitis, or Tuberculosis',
  needlestick: 'Needlestick or Sharps Injury',
  mental_illness: 'Mental Illness',
  voluntary_request: 'Employee Request (Voluntary)',
};

// ============================================================================
// OSHA 300 Log Types
// ============================================================================

/**
 * OSHA 300 Log entry (individual case)
 */
export interface OSHA300Entry {
  id: string;
  company_id: string;
  establishment_id: string | null;
  year: number;

  // Case identification
  case_number: string;
  entry_date: string;

  // Employee information
  employee_name: string;
  employee_job_title: string;
  employee_department: string | null;

  // Privacy case handling
  is_privacy_case: boolean;
  privacy_case_reason: PrivacyCaseReason | null;

  // Incident details
  date_of_injury: string;
  location_description: string;
  injury_description: string;

  // Classification
  case_classification: OSHACaseClassification;

  // Days counts
  days_away_from_work: number;
  days_job_transfer_restriction: number;

  // Injury/Illness type
  injury_illness_type: InjuryIllnessType;
  body_part_affected: BodyPart | null;

  // Related records
  incident_report_id: string | null;
  osha_301_id: string | null;

  // Status
  is_active: boolean;

  // Notes
  notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * Establishment information for OSHA forms
 */
export interface OSHAEstablishment {
  id: string;
  company_id: string;

  // Establishment details
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;

  // Industry classification
  naics_code: string | null;
  industry_description: string | null;

  // Contact
  phone: string | null;
  email: string | null;

  // Is active
  is_active: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Employee hours worked for a year
 */
export interface OSHAEmployeeHours {
  id: string;
  company_id: string;
  establishment_id: string | null;
  year: number;

  // Employee counts (annual averages)
  average_employees: number;

  // Hours worked
  total_hours_worked: number;

  // Monthly breakdown (optional for detailed tracking)
  monthly_data: MonthlyHoursData[] | null;

  // Notes
  notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Monthly hours data
 */
export interface MonthlyHoursData {
  month: number; // 1-12
  employee_count: number;
  hours_worked: number;
}

// ============================================================================
// OSHA 300A Summary Types
// ============================================================================

/**
 * OSHA 300A Annual Summary
 */
export interface OSHA300ASummary {
  id: string;
  company_id: string;
  establishment_id: string | null;
  year: number;

  // Establishment info
  establishment_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  naics_code: string | null;
  industry_description: string | null;

  // Employee and hours data
  average_annual_employees: number;
  total_hours_worked: number;

  // Injury and Illness totals
  total_deaths: number;
  total_days_away: number;
  total_job_transfer_restriction: number;
  total_other_recordable: number;

  // Total cases
  total_cases: number;

  // Days counts
  total_days_away_from_work: number;
  total_days_job_transfer_restriction: number;

  // Injury types
  total_injuries: number;
  total_skin_disorders: number;
  total_respiratory_conditions: number;
  total_poisonings: number;
  total_hearing_loss: number;
  total_other_illnesses: number;

  // Calculated rates
  trir: number | null; // Total Recordable Incident Rate
  dart_rate: number | null; // Days Away, Restricted, or Transfer Rate
  ltir: number | null; // Lost Time Incident Rate
  severity_rate: number | null;

  // Certification
  certified: boolean;
  certifier_name: string | null;
  certifier_title: string | null;
  certifier_phone: string | null;
  certification_date: string | null;
  certifier_signature: string | null;

  // Posted dates
  posting_start_date: string | null; // Must post Feb 1
  posting_end_date: string | null; // Must post until April 30

  // Status
  status: 'draft' | 'certified' | 'posted' | 'archived';

  // Notes
  notes: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ============================================================================
// DTO Types
// ============================================================================

/**
 * Create OSHA 300 entry input
 */
export interface CreateOSHA300EntryDTO {
  company_id: string;
  establishment_id?: string | null;
  year: number;
  employee_name: string;
  employee_job_title: string;
  employee_department?: string | null;
  is_privacy_case?: boolean;
  privacy_case_reason?: PrivacyCaseReason | null;
  date_of_injury: string;
  location_description: string;
  injury_description: string;
  case_classification: OSHACaseClassification;
  days_away_from_work?: number;
  days_job_transfer_restriction?: number;
  injury_illness_type: InjuryIllnessType;
  body_part_affected?: BodyPart | null;
  incident_report_id?: string | null;
  notes?: string | null;
}

/**
 * Update OSHA 300 entry input
 */
export interface UpdateOSHA300EntryDTO {
  employee_name?: string;
  employee_job_title?: string;
  employee_department?: string | null;
  is_privacy_case?: boolean;
  privacy_case_reason?: PrivacyCaseReason | null;
  date_of_injury?: string;
  location_description?: string;
  injury_description?: string;
  case_classification?: OSHACaseClassification;
  days_away_from_work?: number;
  days_job_transfer_restriction?: number;
  injury_illness_type?: InjuryIllnessType;
  body_part_affected?: BodyPart | null;
  is_active?: boolean;
  notes?: string | null;
}

/**
 * Create OSHA 300A summary input
 */
export interface CreateOSHA300ASummaryDTO {
  company_id: string;
  establishment_id?: string | null;
  year: number;
  establishment_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  naics_code?: string | null;
  industry_description?: string | null;
  average_annual_employees: number;
  total_hours_worked: number;
  notes?: string | null;
}

/**
 * Certify OSHA 300A summary input
 */
export interface CertifyOSHA300ASummaryDTO {
  certifier_name: string;
  certifier_title: string;
  certifier_phone?: string | null;
  certifier_signature?: string | null;
}

/**
 * Update employee hours input
 */
export interface UpdateEmployeeHoursDTO {
  year: number;
  average_employees: number;
  total_hours_worked: number;
  monthly_data?: MonthlyHoursData[] | null;
  notes?: string | null;
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Filters for OSHA 300 entries
 */
export interface OSHA300Filters {
  company_id?: string;
  establishment_id?: string;
  year?: number;
  case_classification?: OSHACaseClassification;
  injury_illness_type?: InjuryIllnessType;
  date_from?: string;
  date_to?: string;
  is_active?: boolean;
  search?: string;
}

/**
 * Filters for OSHA 300A summaries
 */
export interface OSHA300AFilters {
  company_id?: string;
  establishment_id?: string;
  year?: number;
  status?: 'draft' | 'certified' | 'posted' | 'archived';
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * OSHA statistics for a year
 */
export interface OSHAYearlyStats {
  year: number;
  total_cases: number;
  deaths: number;
  days_away_cases: number;
  job_transfer_restriction_cases: number;
  other_recordable_cases: number;
  total_days_away: number;
  total_days_restricted: number;
  injuries: number;
  illnesses: number;
  trir: number | null;
  dart_rate: number | null;
  ltir: number | null;
}

/**
 * Monthly trend data
 */
export interface MonthlyTrend {
  month: number;
  year: number;
  cases: number;
  days_away: number;
  days_restricted: number;
}

/**
 * OSHA dashboard data
 */
export interface OSHADashboardData {
  current_year_stats: OSHAYearlyStats;
  previous_year_stats: OSHAYearlyStats | null;
  monthly_trends: MonthlyTrend[];
  cases_by_classification: Record<OSHACaseClassification, number>;
  cases_by_injury_type: Record<InjuryIllnessType, number>;
  cases_by_body_part: Record<BodyPart, number>;
  recent_cases: OSHA300Entry[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate Total Recordable Incident Rate (TRIR)
 * Formula: (Number of OSHA recordable cases * 200,000) / Total hours worked
 */
export function calculateTRIR(totalCases: number, totalHoursWorked: number): number | null {
  if (totalHoursWorked <= 0) return null;
  return Number(((totalCases * 200000) / totalHoursWorked).toFixed(2));
}

/**
 * Calculate DART Rate (Days Away, Restricted, or Transfer)
 * Formula: (Number of DART cases * 200,000) / Total hours worked
 */
export function calculateDARTRate(
  daysAwayCases: number,
  jobTransferRestrictionCases: number,
  totalHoursWorked: number
): number | null {
  if (totalHoursWorked <= 0) return null;
  const dartCases = daysAwayCases + jobTransferRestrictionCases;
  return Number(((dartCases * 200000) / totalHoursWorked).toFixed(2));
}

/**
 * Calculate Lost Time Incident Rate (LTIR)
 * Formula: (Lost time cases * 200,000) / Total hours worked
 */
export function calculateLTIR(
  deathCases: number,
  daysAwayCases: number,
  totalHoursWorked: number
): number | null {
  if (totalHoursWorked <= 0) return null;
  const lostTimeCases = deathCases + daysAwayCases;
  return Number(((lostTimeCases * 200000) / totalHoursWorked).toFixed(2));
}

/**
 * Calculate Severity Rate
 * Formula: (Total days away + days restricted) * 200,000 / Total hours worked
 */
export function calculateSeverityRate(
  totalDaysAway: number,
  totalDaysRestricted: number,
  totalHoursWorked: number
): number | null {
  if (totalHoursWorked <= 0) return null;
  const totalDays = totalDaysAway + totalDaysRestricted;
  return Number(((totalDays * 200000) / totalHoursWorked).toFixed(2));
}

/**
 * Generate case number for a year
 */
export function generateCaseNumber(year: number, sequence: number): string {
  return `${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Check if 300A needs to be posted (Feb 1 - April 30)
 */
export function isPostingPeriod(date: Date = new Date()): boolean {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  return (
    (month === 2 && day >= 1) ||
    month === 3 ||
    (month === 4 && day <= 30)
  );
}

/**
 * Get posting deadline for a year
 */
export function getPostingDeadline(year: number): { start: Date; end: Date } {
  return {
    start: new Date(year + 1, 1, 1), // Feb 1 of following year
    end: new Date(year + 1, 3, 30), // April 30 of following year
  };
}

/**
 * Calculate average employees from monthly data
 */
export function calculateAverageEmployees(monthlyData: MonthlyHoursData[]): number {
  if (monthlyData.length === 0) return 0;
  const total = monthlyData.reduce((sum, month) => sum + month.employee_count, 0);
  return Math.round(total / monthlyData.length);
}

/**
 * Calculate total hours from monthly data
 */
export function calculateTotalHours(monthlyData: MonthlyHoursData[]): number {
  return monthlyData.reduce((sum, month) => sum + month.hours_worked, 0);
}

/**
 * Get classification label
 */
export function getCaseClassificationLabel(classification: OSHACaseClassification): string {
  return CASE_CLASSIFICATION_LABELS[classification] || classification;
}

/**
 * Get injury/illness type label
 */
export function getInjuryIllnessTypeLabel(type: InjuryIllnessType): string {
  return INJURY_ILLNESS_TYPE_LABELS[type] || type;
}

/**
 * Get body part label
 */
export function getBodyPartLabel(part: BodyPart): string {
  return BODY_PART_LABELS[part] || part;
}
