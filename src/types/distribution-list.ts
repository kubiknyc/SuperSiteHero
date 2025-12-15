/**
 * Distribution List Types
 * Types for reusable distribution lists across RFIs, Submittals, Transmittals, etc.
 * Aligned with migration 085_distribution_lists.sql
 */

// =============================================
// Enums and Constants
// =============================================

export type DistributionListType =
  | 'general'
  | 'rfi'
  | 'submittal'
  | 'transmittal'
  | 'safety'
  | 'daily_report'
  | 'change_order';

export type MemberRole = 'to' | 'cc' | 'bcc';

export const DISTRIBUTION_LIST_TYPES: { value: DistributionListType; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'rfi', label: 'RFIs' },
  { value: 'submittal', label: 'Submittals' },
  { value: 'transmittal', label: 'Transmittals' },
  { value: 'safety', label: 'Safety' },
  { value: 'daily_report', label: 'Daily Reports' },
  { value: 'change_order', label: 'Change Orders' },
];

export const MEMBER_ROLES: { value: MemberRole; label: string; description: string }[] = [
  { value: 'to', label: 'To', description: 'Primary recipient' },
  { value: 'cc', label: 'CC', description: 'Carbon copy' },
  { value: 'bcc', label: 'BCC', description: 'Blind carbon copy' },
];

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Distribution List
 */
export interface DistributionList {
  id: string;
  company_id: string;
  project_id: string | null; // NULL = company-wide list

  // List identification
  name: string;
  description: string | null;

  // Type categorization
  list_type: DistributionListType;

  // Defaults
  is_default: boolean;
  is_active: boolean;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/**
 * Distribution List Member
 */
export interface DistributionListMember {
  id: string;
  list_id: string;

  // Member identification (either internal user OR external contact)
  user_id: string | null;
  external_email: string | null;
  external_name: string | null;
  external_company: string | null;

  // Member role in distribution
  member_role: MemberRole;

  // Notification preferences
  notify_email: boolean;
  notify_in_app: boolean;

  // Metadata
  created_at: string;
  added_by: string | null;
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * Distribution List with member count
 */
export interface DistributionListWithCount extends DistributionList {
  member_count: number;
}

/**
 * Distribution List Member with user details
 */
export interface DistributionListMemberWithUser extends DistributionListMember {
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
}

/**
 * Distribution List with all relations
 */
export interface DistributionListWithMembers extends DistributionList {
  members: DistributionListMemberWithUser[];
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

/**
 * Expanded recipient (from distribution list or ad-hoc)
 */
export interface ExpandedRecipient {
  user_id: string | null;
  email: string;
  name: string;
  company?: string;
  source: 'list' | 'adhoc';
  member_role?: MemberRole;
  is_internal: boolean;
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create Distribution List input
 */
export interface CreateDistributionListDTO {
  name: string;
  description?: string;
  project_id?: string; // omit for company-wide list
  list_type?: DistributionListType;
  is_default?: boolean;
  // Members to add immediately
  members?: CreateDistributionListMemberDTO[];
}

/**
 * Update Distribution List input
 */
export interface UpdateDistributionListDTO {
  name?: string;
  description?: string;
  list_type?: DistributionListType;
  is_default?: boolean;
  is_active?: boolean;
}

/**
 * Create Distribution List Member input
 */
export interface CreateDistributionListMemberDTO {
  list_id?: string; // optional if creating with list
  user_id?: string;
  external_email?: string;
  external_name?: string;
  external_company?: string;
  member_role?: MemberRole;
  notify_email?: boolean;
  notify_in_app?: boolean;
}

/**
 * Update Distribution List Member input
 */
export interface UpdateDistributionListMemberDTO {
  member_role?: MemberRole;
  notify_email?: boolean;
  notify_in_app?: boolean;
}

// =============================================
// Filter Types
// =============================================

export interface DistributionListFilters {
  companyId?: string;
  projectId?: string | null; // null to get company-wide only
  listType?: DistributionListType;
  isDefault?: boolean;
  isActive?: boolean;
  search?: string;
}

// =============================================
// Selection Types (for UI components)
// =============================================

/**
 * Selection state for distribution list picker
 */
export interface DistributionSelection {
  // Selected saved lists
  listIds: string[];
  // Ad-hoc internal users
  userIds: string[];
  // Ad-hoc external contacts
  externalContacts: {
    email: string;
    name?: string;
    company?: string;
  }[];
}

/**
 * Resolved recipient from selection
 */
export interface ResolvedRecipient {
  id: string; // unique key for UI
  type: 'user' | 'external';
  user_id?: string;
  email: string;
  name: string;
  company?: string;
  avatar_url?: string | null;
  source: 'list' | 'adhoc';
  list_name?: string; // if from a list
}

// =============================================
// Utility Functions
// =============================================

/**
 * Check if a member is an internal user
 */
export function isInternalMember(member: DistributionListMember): boolean {
  return member.user_id !== null;
}

/**
 * Get display name for a member
 */
export function getMemberDisplayName(member: DistributionListMemberWithUser): string {
  if (member.user) {
    return member.user.full_name;
  }
  return member.external_name || member.external_email || 'Unknown';
}

/**
 * Get email for a member
 */
export function getMemberEmail(member: DistributionListMemberWithUser): string {
  if (member.user) {
    return member.user.email;
  }
  return member.external_email || '';
}

/**
 * Format member role for display
 */
export function formatMemberRole(role: MemberRole): string {
  const config = MEMBER_ROLES.find(r => r.value === role);
  return config?.label || role.toUpperCase();
}

/**
 * Get list type label
 */
export function getListTypeLabel(type: DistributionListType): string {
  const config = DISTRIBUTION_LIST_TYPES.find(t => t.value === type);
  return config?.label || type;
}

/**
 * Create a unique key for a recipient (for React lists)
 */
export function getRecipientKey(recipient: ResolvedRecipient): string {
  return recipient.user_id || recipient.email;
}

/**
 * Deduplicate recipients by email
 */
export function deduplicateRecipients(recipients: ResolvedRecipient[]): ResolvedRecipient[] {
  const seen = new Set<string>();
  return recipients.filter(r => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) {return false;}
    seen.add(key);
    return true;
  });
}

/**
 * Group recipients by role
 */
export function groupRecipientsByRole(
  recipients: (ResolvedRecipient & { role?: MemberRole })[]
): Record<MemberRole, ResolvedRecipient[]> {
  return {
    to: recipients.filter(r => r.role === 'to' || !r.role),
    cc: recipients.filter(r => r.role === 'cc'),
    bcc: recipients.filter(r => r.role === 'bcc'),
  };
}
