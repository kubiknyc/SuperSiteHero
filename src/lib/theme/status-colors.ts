// File: /src/lib/theme/status-colors.ts
// Centralized status color definitions for consistent badge styling across all features
// This file consolidates the 64+ status badge implementations into a single source of truth

/**
 * Status style definition including colors, labels, and optional icon
 */
export interface StatusStyle {
  /** Tailwind classes for background, text, and border */
  className: string
  /** Human-readable label */
  label: string
  /** Optional icon name from lucide-react */
  icon?: string
}

/**
 * Priority style definition
 */
export interface PriorityStyle {
  className: string
  label: string
  icon?: string
}

// ============================================================================
// COMMON STATUS COLORS (used across multiple domains)
// ============================================================================

/**
 * Base status color classes using semantic tokens
 * These are the building blocks for domain-specific status configurations
 */
export const baseStatusColors = {
  // Neutral/Default states
  neutral: 'bg-muted text-foreground border-input',
  muted: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',

  // Information/Progress states
  info: 'bg-info-light text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  infoSolid: 'bg-info text-white border-blue-700',

  // Warning/Pending states
  warning: 'bg-warning-light text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700',
  warningSolid: 'bg-warning text-yellow-950 border-yellow-600',

  // Success/Approved states
  success: 'bg-success-light text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
  successSolid: 'bg-success text-white border-green-700',

  // Error/Rejected states
  error: 'bg-error-light text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
  errorSolid: 'bg-destructive text-white border-red-700',

  // Special states
  purple: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  orange: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
} as const

// ============================================================================
// DOMAIN-SPECIFIC STATUS CONFIGURATIONS
// ============================================================================

/**
 * General/Generic status styles (fallback for unknown domains)
 */
export const generalStatuses: Record<string, StatusStyle> = {
  // Draft/Initial states
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  new: { className: baseStatusColors.neutral, label: 'New' },

  // Open/Active states
  open: { className: baseStatusColors.neutral, label: 'Open' },
  active: { className: baseStatusColors.info, label: 'Active' },

  // Progress states
  pending: { className: baseStatusColors.warning, label: 'Pending' },
  in_progress: { className: baseStatusColors.info, label: 'In Progress' },
  under_review: { className: baseStatusColors.warning, label: 'Under Review' },
  pending_review: { className: baseStatusColors.purple, label: 'Pending Review' },
  ready_for_review: { className: baseStatusColors.warning, label: 'Ready for Review' },

  // Submitted states
  submitted: { className: baseStatusColors.info, label: 'Submitted' },

  // Approval states
  approved: { className: baseStatusColors.success, label: 'Approved' },
  completed: { className: baseStatusColors.success, label: 'Completed' },
  verified: { className: baseStatusColors.successSolid, label: 'Verified' },

  // Rejection states
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
  failed: { className: baseStatusColors.error, label: 'Failed' },

  // Closed/Inactive states
  closed: { className: baseStatusColors.muted, label: 'Closed' },
  inactive: { className: baseStatusColors.muted, label: 'Inactive' },
  cancelled: { className: baseStatusColors.muted, label: 'Cancelled' },

  // Special states
  on_hold: { className: baseStatusColors.orange, label: 'On Hold' },
  deferred: { className: baseStatusColors.orange, label: 'Deferred' },
  overdue: { className: baseStatusColors.errorSolid, label: 'Overdue' },
  scheduled: { className: baseStatusColors.info, label: 'Scheduled' },
  resubmit_required: { className: baseStatusColors.orange, label: 'Resubmit Required' },
}

/**
 * RFI-specific status styles
 */
export const rfiStatuses: Record<string, StatusStyle> = {
  pending: { className: baseStatusColors.neutral, label: 'Pending' },
  submitted: { className: baseStatusColors.info, label: 'Submitted' },
  answered: { className: baseStatusColors.info, label: 'Answered' },
  approved: { className: baseStatusColors.success, label: 'Approved' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
  closed: { className: baseStatusColors.muted, label: 'Closed' },
  overdue: { className: baseStatusColors.errorSolid, label: 'Overdue' },
}

/**
 * Punch list item status styles
 */
export const punchStatuses: Record<string, StatusStyle> = {
  open: { className: baseStatusColors.neutral, label: 'Open' },
  in_progress: { className: baseStatusColors.info, label: 'In Progress' },
  ready_for_review: { className: baseStatusColors.warning, label: 'Ready for Review' },
  completed: { className: baseStatusColors.success, label: 'Completed' },
  verified: { className: baseStatusColors.successSolid, label: 'Verified' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
}

/**
 * Submittal status styles
 */
export const submittalStatuses: Record<string, StatusStyle> = {
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  submitted: { className: baseStatusColors.info, label: 'Submitted' },
  under_review: { className: baseStatusColors.warning, label: 'Under Review' },
  approved: { className: baseStatusColors.successSolid, label: 'Approved' },
  approved_as_noted: { className: baseStatusColors.success, label: 'Approved as Noted' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
  resubmit_required: { className: baseStatusColors.orange, label: 'Resubmit Required' },
}

/**
 * Workflow item status styles (Change Orders, etc.)
 */
export const workflowStatuses: Record<string, StatusStyle> = {
  open: { className: baseStatusColors.info, label: 'Open' },
  in_progress: { className: baseStatusColors.warning, label: 'In Progress' },
  pending_review: { className: baseStatusColors.purple, label: 'Pending Review' },
  approved: { className: baseStatusColors.success, label: 'Approved' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
  closed: { className: baseStatusColors.muted, label: 'Closed' },
}

/**
 * Task status styles
 */
export const taskStatuses: Record<string, StatusStyle> = {
  todo: { className: baseStatusColors.neutral, label: 'To Do' },
  not_started: { className: baseStatusColors.neutral, label: 'Not Started' },
  in_progress: { className: baseStatusColors.info, label: 'In Progress' },
  blocked: { className: baseStatusColors.error, label: 'Blocked' },
  review: { className: baseStatusColors.warning, label: 'In Review' },
  done: { className: baseStatusColors.success, label: 'Done' },
  completed: { className: baseStatusColors.success, label: 'Completed' },
  cancelled: { className: baseStatusColors.muted, label: 'Cancelled' },
}

/**
 * Daily report status styles
 */
export const dailyReportStatuses: Record<string, StatusStyle> = {
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  submitted: { className: baseStatusColors.info, label: 'Submitted' },
  approved: { className: baseStatusColors.success, label: 'Approved' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
  revision_requested: { className: baseStatusColors.orange, label: 'Revision Requested' },
}

/**
 * Safety incident severity styles
 */
export const safetyStatuses: Record<string, StatusStyle> = {
  reported: { className: baseStatusColors.info, label: 'Reported' },
  investigating: { className: baseStatusColors.warning, label: 'Investigating' },
  resolved: { className: baseStatusColors.success, label: 'Resolved' },
  closed: { className: baseStatusColors.muted, label: 'Closed' },
}

/**
 * Inspection status styles
 */
export const inspectionStatuses: Record<string, StatusStyle> = {
  scheduled: { className: baseStatusColors.info, label: 'Scheduled' },
  in_progress: { className: baseStatusColors.warning, label: 'In Progress' },
  passed: { className: baseStatusColors.success, label: 'Passed' },
  failed: { className: baseStatusColors.error, label: 'Failed' },
  conditional: { className: baseStatusColors.orange, label: 'Conditional' },
  cancelled: { className: baseStatusColors.muted, label: 'Cancelled' },
}

/**
 * Change order status styles
 */
export const changeOrderStatuses: Record<string, StatusStyle> = {
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  pending: { className: baseStatusColors.warning, label: 'Pending' },
  submitted: { className: baseStatusColors.info, label: 'Submitted' },
  approved: { className: baseStatusColors.success, label: 'Approved' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
  executed: { className: baseStatusColors.successSolid, label: 'Executed' },
  void: { className: baseStatusColors.muted, label: 'Void' },
}

/**
 * Document status styles
 */
export const documentStatuses: Record<string, StatusStyle> = {
  current: { className: baseStatusColors.success, label: 'Current' },
  superseded: { className: baseStatusColors.warning, label: 'Superseded' },
  archived: { className: baseStatusColors.muted, label: 'Archived' },
  void: { className: baseStatusColors.error, label: 'Void' },
}

/**
 * Site instruction status styles
 */
export const siteInstructionStatuses: Record<string, StatusStyle> = {
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  issued: { className: baseStatusColors.info, label: 'Issued' },
  acknowledged: { className: baseStatusColors.warning, label: 'Acknowledged' },
  in_progress: { className: baseStatusColors.info, label: 'In Progress' },
  completed: { className: baseStatusColors.success, label: 'Completed' },
  verified: { className: baseStatusColors.successSolid, label: 'Verified' },
  void: { className: baseStatusColors.error, label: 'Void' },
}

/**
 * Delivery status styles (material receiving)
 */
export const deliveryStatuses: Record<string, StatusStyle> = {
  scheduled: { className: baseStatusColors.neutral, label: 'Scheduled' },
  received: { className: baseStatusColors.success, label: 'Received' },
  partially_received: { className: baseStatusColors.warning, label: 'Partial' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
  back_ordered: { className: baseStatusColors.orange, label: 'Back Ordered' },
}

/**
 * NCR (Non-Conformance Report) status styles
 */
export const ncrStatuses: Record<string, StatusStyle> = {
  open: { className: baseStatusColors.info, label: 'Open' },
  under_review: { className: baseStatusColors.purple, label: 'Under Review' },
  corrective_action: { className: baseStatusColors.warning, label: 'Corrective Action' },
  verification: { className: baseStatusColors.orange, label: 'Verification' },
  resolved: { className: baseStatusColors.success, label: 'Resolved' },
  closed: { className: baseStatusColors.muted, label: 'Closed' },
  voided: { className: baseStatusColors.error, label: 'Voided' },
  // Legacy values for backwards compatibility
  under_investigation: { className: baseStatusColors.purple, label: 'Under Investigation' },
  pending_verification: { className: baseStatusColors.orange, label: 'Pending Verification' },
  verified: { className: baseStatusColors.success, label: 'Verified' },
}

/**
 * Purchase order status styles
 */
export const purchaseOrderStatuses: Record<string, StatusStyle> = {
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  pending_approval: { className: baseStatusColors.warning, label: 'Pending Approval' },
  approved: { className: baseStatusColors.success, label: 'Approved' },
  sent: { className: baseStatusColors.info, label: 'Sent' },
  partially_received: { className: baseStatusColors.warning, label: 'Partially Received' },
  received: { className: baseStatusColors.successSolid, label: 'Received' },
  cancelled: { className: baseStatusColors.muted, label: 'Cancelled' },
  closed: { className: baseStatusColors.muted, label: 'Closed' },
}

/**
 * Lien waiver status styles
 */
export const lienWaiverStatuses: Record<string, StatusStyle> = {
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  pending: { className: baseStatusColors.neutral, label: 'Pending' },
  sent: { className: baseStatusColors.info, label: 'Sent' },
  received: { className: baseStatusColors.warning, label: 'Received' },
  under_review: { className: baseStatusColors.warning, label: 'Under Review' },
  approved: { className: baseStatusColors.success, label: 'Approved' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
  expired: { className: baseStatusColors.orange, label: 'Expired' },
  void: { className: baseStatusColors.muted, label: 'Void' },
}

/**
 * Bid package status styles
 * Includes statuses for bid packages, bid submissions, and invitations
 */
export const bidPackageStatuses: Record<string, StatusStyle> = {
  // Bid package statuses
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  published: { className: baseStatusColors.info, label: 'Published' },
  questions_period: { className: baseStatusColors.warning, label: 'Questions Period' },
  bids_due: { className: baseStatusColors.orange, label: 'Bids Due' },
  under_review: { className: baseStatusColors.purple, label: 'Under Review' },
  awarded: { className: baseStatusColors.success, label: 'Awarded' },
  cancelled: { className: baseStatusColors.error, label: 'Cancelled' },
  rebid: { className: baseStatusColors.orange, label: 'Rebid' },
  open: { className: baseStatusColors.info, label: 'Open' },
  closed: { className: baseStatusColors.muted, label: 'Closed' },
  // Invitation response statuses
  pending: { className: baseStatusColors.neutral, label: 'Pending' },
  accepted: { className: baseStatusColors.success, label: 'Accepted' },
  declined: { className: baseStatusColors.error, label: 'Declined' },
  no_response: { className: baseStatusColors.warning, label: 'No Response' },
  disqualified: { className: baseStatusColors.error, label: 'Disqualified' },
  // Bid submission statuses
  received: { className: baseStatusColors.info, label: 'Received' },
  qualified: { className: baseStatusColors.success, label: 'Qualified' },
  shortlisted: { className: baseStatusColors.purple, label: 'Shortlisted' },
  not_awarded: { className: baseStatusColors.muted, label: 'Not Awarded' },
  withdrawn: { className: baseStatusColors.muted, label: 'Withdrawn' },
}

/**
 * Photo report status styles
 */
export const photoReportStatuses: Record<string, StatusStyle> = {
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  review: { className: baseStatusColors.info, label: 'In Review' },
  approved: { className: baseStatusColors.success, label: 'Approved' },
  distributed: { className: baseStatusColors.purple, label: 'Distributed' },
}

/**
 * Approval workflow status styles
 */
export const approvalStatuses: Record<string, StatusStyle> = {
  pending: { className: baseStatusColors.warning, label: 'Pending' },
  approved: { className: baseStatusColors.success, label: 'Approved' },
  approved_with_conditions: { className: baseStatusColors.info, label: 'Approved with Conditions' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
  cancelled: { className: baseStatusColors.muted, label: 'Cancelled' },
}

/**
 * Toolbox talk status styles
 */
export const toolboxTalkStatuses: Record<string, StatusStyle> = {
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  scheduled: { className: baseStatusColors.info, label: 'Scheduled' },
  in_progress: { className: baseStatusColors.warning, label: 'In Progress' },
  completed: { className: baseStatusColors.success, label: 'Completed' },
}

/**
 * Shop drawing status styles
 */
export const shopDrawingStatuses: Record<string, StatusStyle> = {
  draft: { className: baseStatusColors.neutral, label: 'Draft' },
  submitted: { className: baseStatusColors.info, label: 'Submitted' },
  under_review: { className: baseStatusColors.warning, label: 'Under Review' },
  approved: { className: baseStatusColors.successSolid, label: 'Approved' },
  approved_as_noted: { className: baseStatusColors.success, label: 'Approved as Noted' },
  revise_and_resubmit: { className: baseStatusColors.orange, label: 'Revise and Resubmit' },
  rejected: { className: baseStatusColors.error, label: 'Rejected' },
}

// ============================================================================
// PRIORITY CONFIGURATIONS
// ============================================================================

/**
 * General priority styles
 */
export const priorityStyles: Record<string, PriorityStyle> = {
  low: { className: baseStatusColors.success, label: 'Low' },
  normal: { className: baseStatusColors.neutral, label: 'Normal' },
  medium: { className: baseStatusColors.warning, label: 'Medium' },
  high: { className: baseStatusColors.orange, label: 'High' },
  critical: { className: baseStatusColors.error, label: 'Critical' },
  urgent: { className: baseStatusColors.errorSolid, label: 'Urgent' },
}

// ============================================================================
// STATUS DOMAIN REGISTRY
// ============================================================================

/**
 * All domain-specific status configurations
 */
export const statusDomains = {
  general: generalStatuses,
  rfi: rfiStatuses,
  punch: punchStatuses,
  submittal: submittalStatuses,
  workflow: workflowStatuses,
  task: taskStatuses,
  daily_report: dailyReportStatuses,
  safety: safetyStatuses,
  inspection: inspectionStatuses,
  change_order: changeOrderStatuses,
  document: documentStatuses,
  site_instruction: siteInstructionStatuses,
  delivery: deliveryStatuses,
  ncr: ncrStatuses,
  purchase_order: purchaseOrderStatuses,
  lien_waiver: lienWaiverStatuses,
  bid_package: bidPackageStatuses,
  photo_report: photoReportStatuses,
  approval: approvalStatuses,
  toolbox_talk: toolboxTalkStatuses,
  shop_drawing: shopDrawingStatuses,
} as const

export type StatusDomain = keyof typeof statusDomains

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get status style for a given status and domain
 * Falls back to general statuses if domain-specific status not found
 */
export function getStatusStyle(
  status: string,
  domain: StatusDomain = 'general'
): StatusStyle {
  const normalizedStatus = status.toLowerCase().replace(/[\s-]+/g, '_')

  // Try domain-specific first
  // eslint-disable-next-line security/detect-object-injection
  const domainStatuses = statusDomains[domain]
  // eslint-disable-next-line security/detect-object-injection
  if (domainStatuses[normalizedStatus]) {
    // eslint-disable-next-line security/detect-object-injection
    return domainStatuses[normalizedStatus]
  }

  // Fall back to general
  // eslint-disable-next-line security/detect-object-injection
  if (generalStatuses[normalizedStatus]) {
    // eslint-disable-next-line security/detect-object-injection
    return generalStatuses[normalizedStatus]
  }

  // Ultimate fallback
  return {
    className: baseStatusColors.neutral,
    label: formatStatusLabel(status),
  }
}

/**
 * Get priority style
 */
export function getPriorityStyle(priority: string): PriorityStyle {
  const normalizedPriority = priority.toLowerCase().replace(/[\s-]+/g, '_')

  // eslint-disable-next-line security/detect-object-injection
  return priorityStyles[normalizedPriority] || {
    className: baseStatusColors.neutral,
    label: formatStatusLabel(priority),
  }
}

/**
 * Format a status string into a human-readable label
 * e.g., "in_progress" -> "In Progress"
 */
export function formatStatusLabel(status: string): string {
  return status
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
