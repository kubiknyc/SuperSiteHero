/**
 * Bidding Module Types
 * Types for bid packages, invitations, submissions, and bid leveling
 * Aligned with migration 093_bidding_module.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type BidType = 'lump_sum' | 'unit_price' | 'cost_plus' | 'gmp' | 'time_and_material';
export type BidPackageStatus = 'draft' | 'published' | 'questions_period' | 'bids_due' | 'under_review' | 'awarded' | 'cancelled' | 'rebid';
export type InvitationResponseStatus = 'pending' | 'accepted' | 'declined' | 'no_response' | 'disqualified';
export type PrequalificationStatus = 'pending' | 'approved' | 'rejected' | 'conditional' | 'not_required';
export type InvitationMethod = 'email' | 'portal' | 'fax' | 'mail' | 'phone';
export type QuestionStatus = 'pending' | 'answered' | 'rejected' | 'withdrawn';
export type BidSubmissionStatus = 'received' | 'under_review' | 'qualified' | 'disqualified' | 'shortlisted' | 'awarded' | 'not_awarded' | 'withdrawn';
export type SubmissionMethod = 'portal' | 'email' | 'fax' | 'hand_delivered' | 'mail';
export type EvaluationCriteriaType = 'qualitative' | 'quantitative' | 'pass_fail';

export const BID_TYPES: { value: BidType; label: string; description: string }[] = [
  { value: 'lump_sum', label: 'Lump Sum', description: 'Fixed price for complete scope' },
  { value: 'unit_price', label: 'Unit Price', description: 'Per-unit pricing for measured quantities' },
  { value: 'cost_plus', label: 'Cost Plus', description: 'Actual costs plus markup percentage' },
  { value: 'gmp', label: 'GMP', description: 'Guaranteed Maximum Price' },
  { value: 'time_and_material', label: 'Time & Material', description: 'Hourly rates plus materials' },
];

export const BID_PACKAGE_STATUSES: { value: BidPackageStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'published', label: 'Published', color: 'blue' },
  { value: 'questions_period', label: 'Questions Period', color: 'yellow' },
  { value: 'bids_due', label: 'Bids Due', color: 'orange' },
  { value: 'under_review', label: 'Under Review', color: 'purple' },
  { value: 'awarded', label: 'Awarded', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'rebid', label: 'Rebid', color: 'amber' },
];

export const INVITATION_RESPONSE_STATUSES: { value: InvitationResponseStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'accepted', label: 'Accepted', color: 'green' },
  { value: 'declined', label: 'Declined', color: 'red' },
  { value: 'no_response', label: 'No Response', color: 'yellow' },
  { value: 'disqualified', label: 'Disqualified', color: 'red' },
];

export const BID_SUBMISSION_STATUSES: { value: BidSubmissionStatus; label: string; color: string }[] = [
  { value: 'received', label: 'Received', color: 'blue' },
  { value: 'under_review', label: 'Under Review', color: 'yellow' },
  { value: 'qualified', label: 'Qualified', color: 'green' },
  { value: 'disqualified', label: 'Disqualified', color: 'red' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'purple' },
  { value: 'awarded', label: 'Awarded', color: 'emerald' },
  { value: 'not_awarded', label: 'Not Awarded', color: 'gray' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'gray' },
];

// CSI Divisions for bid packages
export const CSI_DIVISIONS = [
  { code: '01', name: 'General Requirements' },
  { code: '02', name: 'Existing Conditions' },
  { code: '03', name: 'Concrete' },
  { code: '04', name: 'Masonry' },
  { code: '05', name: 'Metals' },
  { code: '06', name: 'Wood, Plastics, and Composites' },
  { code: '07', name: 'Thermal and Moisture Protection' },
  { code: '08', name: 'Openings' },
  { code: '09', name: 'Finishes' },
  { code: '10', name: 'Specialties' },
  { code: '11', name: 'Equipment' },
  { code: '12', name: 'Furnishings' },
  { code: '13', name: 'Special Construction' },
  { code: '14', name: 'Conveying Equipment' },
  { code: '21', name: 'Fire Suppression' },
  { code: '22', name: 'Plumbing' },
  { code: '23', name: 'HVAC' },
  { code: '26', name: 'Electrical' },
  { code: '27', name: 'Communications' },
  { code: '28', name: 'Electronic Safety and Security' },
  { code: '31', name: 'Earthwork' },
  { code: '32', name: 'Exterior Improvements' },
  { code: '33', name: 'Utilities' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Bid Package - The scope being bid
 */
export interface BidPackage {
  id: string;
  project_id: string;
  company_id: string;

  // Package identification
  package_number: string;
  name: string;
  description: string | null;

  // Scope
  scope_of_work: string | null;
  division: string | null;
  spec_sections: string[] | null;

  // Budget
  estimated_value: number | null;
  budget_low: number | null;
  budget_high: number | null;

  // Dates
  issue_date: string | null;
  pre_bid_meeting_date: string | null;
  pre_bid_meeting_location: string | null;
  questions_due_date: string | null;
  bid_due_date: string;
  bid_due_time: string;
  award_date: string | null;
  contract_start_date: string | null;

  // Bid type
  bid_type: BidType;
  is_public: boolean;

  // Status
  status: BidPackageStatus;

  // Pre-qualification
  requires_prequalification: boolean;
  prequalification_criteria: string | null;
  min_years_experience: number | null;
  min_similar_projects: number | null;
  min_bond_capacity: number | null;
  required_licenses: string[] | null;
  required_certifications: string[] | null;

  // Bid requirements
  requires_bid_bond: boolean;
  bid_bond_percent: number;
  requires_performance_bond: boolean;
  requires_payment_bond: boolean;
  requires_insurance_cert: boolean;
  min_insurance_limits: Record<string, number> | null;

  // Documents
  bid_form_url: string | null;
  plans_url: string | null;
  specs_url: string | null;
  addenda_urls: string[] | null;

  // Award info
  awarded_to_bid_id: string | null;
  award_amount: number | null;
  award_notes: string | null;

  // Contact
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

/**
 * Bid Package Item - Line item within a bid package
 */
export interface BidPackageItem {
  id: string;
  bid_package_id: string;
  item_number: string;
  description: string;
  unit: string | null;
  quantity: number | null;
  is_required: boolean;
  is_alternate: boolean;
  alternate_number: string | null;
  alternate_description: string | null;
  estimated_unit_price: number | null;
  estimated_total: number | null;
  sort_order: number;
  category: string | null;
  created_at: string;
}

/**
 * Bid Invitation - Invite sent to subcontractor
 */
export interface BidInvitation {
  id: string;
  bid_package_id: string;
  subcontractor_id: string | null;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  invited_at: string;
  invited_by: string | null;
  invitation_method: InvitationMethod;
  response_status: InvitationResponseStatus;
  responded_at: string | null;
  decline_reason: string | null;
  portal_access_token: string | null;
  portal_token_expires_at: string | null;
  last_portal_access: string | null;
  documents_downloaded_at: string | null;
  prequalification_status: PrequalificationStatus;
  prequalification_notes: string | null;
  prequalification_reviewed_by: string | null;
  prequalification_reviewed_at: string | null;
  internal_notes: string | null;
}

/**
 * Bid Question - RFI during bidding
 */
export interface BidQuestion {
  id: string;
  bid_package_id: string;
  invitation_id: string | null;
  question_number: number;
  question: string;
  reference_document: string | null;
  reference_page: string | null;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  submitted_by_company: string | null;
  submitted_at: string;
  answer: string | null;
  answered_by: string | null;
  answered_at: string | null;
  is_published: boolean;
  question_attachments: string[] | null;
  answer_attachments: string[] | null;
  status: QuestionStatus;
}

/**
 * Bid Addendum - Change/clarification issued
 */
export interface BidAddendum {
  id: string;
  bid_package_id: string;
  addendum_number: number;
  title: string;
  description: string | null;
  issue_date: string;
  changes_summary: string | null;
  affected_documents: string[] | null;
  extends_bid_date: boolean;
  new_bid_due_date: string | null;
  document_url: string | null;
  attachment_urls: string[] | null;
  issued_by: string | null;
  acknowledgment_required: boolean;
}

/**
 * Bid Submission - Actual bid received
 */
export interface BidSubmission {
  id: string;
  bid_package_id: string;
  invitation_id: string | null;
  subcontractor_id: string | null;
  bidder_company_name: string;
  bidder_contact_name: string | null;
  bidder_email: string | null;
  bidder_phone: string | null;
  bidder_address: string | null;
  base_bid_amount: number;
  alternates_total: number;
  total_bid_amount: number | null;
  unit_prices: Record<string, { unit_price: number; total: number }> | null;
  submitted_at: string;
  submission_method: SubmissionMethod;
  is_late: boolean;
  bid_bond_included: boolean;
  bid_bond_amount: number | null;
  bid_bond_company: string | null;
  bid_bond_number: string | null;
  insurance_cert_included: boolean;
  years_in_business: number | null;
  similar_projects_completed: number | null;
  current_workload_percent: number | null;
  proposed_start_date: string | null;
  proposed_duration_days: number | null;
  key_personnel: { name: string; role: string; experience: string }[] | null;
  exclusions: string | null;
  clarifications: string | null;
  assumptions: string | null;
  value_engineering_suggestions: string | null;
  bid_form_url: string | null;
  attachment_urls: string[] | null;
  status: BidSubmissionStatus;
  disqualification_reason: string | null;
  technical_score: number | null;
  price_score: number | null;
  overall_score: number | null;
  evaluation_notes: string | null;
  evaluated_by: string | null;
  evaluated_at: string | null;
  is_awarded: boolean;
  award_amount: number | null;
  award_date: string | null;
  contract_sent_at: string | null;
  contract_signed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Bid Submission Item - Line item pricing
 */
export interface BidSubmissionItem {
  id: string;
  submission_id: string;
  package_item_id: string;
  unit_price: number | null;
  quantity: number | null;
  total_price: number | null;
  is_included: boolean;
  notes: string | null;
}

/**
 * Bid Comparison - Bid leveling/analysis
 */
export interface BidComparison {
  id: string;
  bid_package_id: string;
  name: string;
  description: string | null;
  comparison_date: string;
  submission_ids: string[];
  low_bid_id: string | null;
  low_bid_amount: number | null;
  high_bid_amount: number | null;
  average_bid_amount: number | null;
  bid_spread_percent: number | null;
  recommended_bid_id: string | null;
  recommendation_notes: string | null;
  created_by: string | null;
  created_at: string;
}

/**
 * Bid Evaluation Criteria
 */
export interface BidEvaluationCriteria {
  id: string;
  bid_package_id: string;
  name: string;
  description: string | null;
  weight: number;
  max_score: number;
  sort_order: number;
  criteria_type: EvaluationCriteriaType;
}

// =============================================
// Extended Types with Relations
// =============================================

export interface BidPackageWithDetails extends BidPackage {
  project?: {
    id: string;
    name: string;
    project_number: string | null;
  };
  invitations_count?: number;
  accepted_count?: number;
  declined_count?: number;
  submissions_count?: number;
  low_bid?: number;
  high_bid?: number;
  average_bid?: number;
  pending_questions?: number;
  addenda_count?: number;
  awarded_bidder?: {
    company_name: string;
  };
}

export interface BidInvitationWithDetails extends BidInvitation {
  subcontractor?: {
    id: string;
    company_name: string;
    contact_name: string | null;
  };
  submission?: BidSubmission | null;
  addenda_acknowledged?: number;
  total_addenda?: number;
}

export interface BidSubmissionWithDetails extends BidSubmission {
  invitation?: BidInvitation;
  package?: BidPackage;
  items?: BidSubmissionItem[];
  variance_from_estimate_percent?: number;
  price_rank?: number;
}

// =============================================
// DTO Types
// =============================================

export interface CreateBidPackageDTO {
  project_id: string;
  package_number: string;
  name: string;
  description?: string;
  scope_of_work?: string;
  division?: string;
  spec_sections?: string[];
  estimated_value?: number;
  bid_due_date: string;
  bid_due_time?: string;
  bid_type?: BidType;
  is_public?: boolean;
  requires_prequalification?: boolean;
  requires_bid_bond?: boolean;
  bid_bond_percent?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface UpdateBidPackageDTO {
  name?: string;
  description?: string;
  scope_of_work?: string;
  division?: string;
  spec_sections?: string[];
  estimated_value?: number;
  budget_low?: number;
  budget_high?: number;
  issue_date?: string;
  pre_bid_meeting_date?: string;
  pre_bid_meeting_location?: string;
  questions_due_date?: string;
  bid_due_date?: string;
  bid_due_time?: string;
  status?: BidPackageStatus;
  bid_type?: BidType;
  requires_prequalification?: boolean;
  prequalification_criteria?: string;
  min_years_experience?: number;
  requires_bid_bond?: boolean;
  bid_bond_percent?: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface CreateBidInvitationDTO {
  bid_package_id: string;
  subcontractor_id?: string;
  company_name?: string;
  contact_name?: string;
  contact_email: string;
  contact_phone?: string;
  invitation_method?: InvitationMethod;
}

export interface CreateBidSubmissionDTO {
  bid_package_id: string;
  invitation_id?: string;
  bidder_company_name: string;
  bidder_contact_name?: string;
  bidder_email?: string;
  bidder_phone?: string;
  base_bid_amount: number;
  alternates_total?: number;
  submission_method?: SubmissionMethod;
  bid_bond_included?: boolean;
  bid_bond_amount?: number;
  exclusions?: string;
  clarifications?: string;
}

export interface AnswerBidQuestionDTO {
  answer: string;
  is_published?: boolean;
  answer_attachments?: string[];
}

export interface AwardBidDTO {
  submission_id: string;
  award_amount: number;
  award_notes?: string;
}

// =============================================
// Filter Types
// =============================================

export interface BidPackageFilters {
  projectId?: string;
  status?: BidPackageStatus | BidPackageStatus[];
  bidType?: BidType;
  division?: string;
  search?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface BidSubmissionFilters {
  packageId: string;
  status?: BidSubmissionStatus | BidSubmissionStatus[];
  isLate?: boolean;
  search?: string;
}

// =============================================
// Statistics Types
// =============================================

export interface BidPackageStatistics {
  total_invitations: number;
  responses_received: number;
  bids_received: number;
  low_bid: number | null;
  high_bid: number | null;
  average_bid: number | null;
  spread_percent: number | null;
  days_until_due: number;
  pending_questions: number;
}

export interface BidComparisonResult {
  bidder_name: string;
  base_bid: number;
  alternates: number;
  total_bid: number;
  variance_from_low: number;
  variance_percent: number;
  rank: number;
  status: BidSubmissionStatus;
  prequalified: boolean;
}

// =============================================
// Utility Functions
// =============================================

export function getBidPackageStatusColor(status: BidPackageStatus): string {
  const config = BID_PACKAGE_STATUSES.find((s) => s.value === status);
  return config?.color || 'gray';
}

export function getBidPackageStatusLabel(status: BidPackageStatus): string {
  const config = BID_PACKAGE_STATUSES.find((s) => s.value === status);
  return config?.label || status;
}

export function getBidSubmissionStatusColor(status: BidSubmissionStatus): string {
  const config = BID_SUBMISSION_STATUSES.find((s) => s.value === status);
  return config?.color || 'gray';
}

export function getBidSubmissionStatusLabel(status: BidSubmissionStatus): string {
  const config = BID_SUBMISSION_STATUSES.find((s) => s.value === status);
  return config?.label || status;
}

export function getBidTypeLabel(type: BidType): string {
  const config = BID_TYPES.find((t) => t.value === type);
  return config?.label || type;
}

export function getDivisionName(code: string): string {
  const division = CSI_DIVISIONS.find((d) => d.code === code);
  return division?.name || code;
}

export function formatBidAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateBidSpread(low: number, high: number): number {
  if (low === 0) return 0;
  return ((high - low) / low) * 100;
}

export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isBidDueSoon(dueDate: string, thresholdDays: number = 3): boolean {
  return getDaysUntilDue(dueDate) <= thresholdDays;
}

export function canEditBidPackage(status: BidPackageStatus): boolean {
  return ['draft', 'published'].includes(status);
}

export function canSubmitBid(packageStatus: BidPackageStatus, dueDate: string): boolean {
  if (!['published', 'questions_period', 'bids_due'].includes(packageStatus)) return false;
  return getDaysUntilDue(dueDate) >= 0;
}
