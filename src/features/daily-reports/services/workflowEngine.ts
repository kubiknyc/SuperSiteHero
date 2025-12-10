/**
 * Workflow Engine - Handles daily report approval routing and status transitions
 * Key features:
 * - Status transition validation
 * - Approval routing based on project settings
 * - Auto-lock after configurable period
 * - Notification triggers
 */

import type {
  ReportStatus,
  DailyReportV2,
} from '@/types/daily-reports-v2';

// Status transition rules - defines valid transitions
const STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  draft: ['submitted', 'voided'],
  submitted: ['in_review', 'changes_requested', 'approved', 'voided'],
  in_review: ['changes_requested', 'approved', 'voided'],
  changes_requested: ['submitted', 'draft', 'voided'],
  approved: ['locked', 'voided'],
  locked: [], // Terminal state, no transitions allowed
  voided: [], // Terminal state - cancelled reports with audit trail
};

// Roles that can perform transitions
type ApprovalRole = 'author' | 'reviewer' | 'approver' | 'admin';

const TRANSITION_PERMISSIONS: Record<string, ApprovalRole[]> = {
  'draft->submitted': ['author', 'admin'],
  'draft->voided': ['author', 'admin'], // Author can void their own draft
  'submitted->in_review': ['reviewer', 'approver', 'admin'],
  'submitted->changes_requested': ['reviewer', 'approver', 'admin'],
  'submitted->approved': ['approver', 'admin'],
  'submitted->voided': ['approver', 'admin'], // Only approvers can void submitted reports
  'in_review->changes_requested': ['reviewer', 'approver', 'admin'],
  'in_review->approved': ['approver', 'admin'],
  'in_review->voided': ['approver', 'admin'],
  'changes_requested->submitted': ['author', 'admin'],
  'changes_requested->draft': ['author', 'admin'],
  'changes_requested->voided': ['author', 'approver', 'admin'],
  'approved->locked': ['admin', 'approver'], // Auto-lock or manual lock
  'approved->voided': ['admin'], // Only admin can void approved reports
};

// Notification triggers
export type NotificationType =
  | 'report_submitted'
  | 'report_approved'
  | 'changes_requested'
  | 'report_locked'
  | 'report_voided'
  | 'pending_review_reminder'
  | 'overdue_draft_reminder';

interface NotificationConfig {
  type: NotificationType;
  recipients: ('author' | 'reviewer' | 'approver' | 'project_manager')[];
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

const NOTIFICATION_CONFIGS: Record<string, NotificationConfig> = {
  'draft->submitted': {
    type: 'report_submitted',
    recipients: ['reviewer', 'approver', 'project_manager'],
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
  },
  'submitted->approved': {
    type: 'report_approved',
    recipients: ['author'],
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
  },
  'in_review->approved': {
    type: 'report_approved',
    recipients: ['author'],
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
  },
  'submitted->changes_requested': {
    type: 'changes_requested',
    recipients: ['author'],
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
  },
  'in_review->changes_requested': {
    type: 'changes_requested',
    recipients: ['author'],
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
  },
  'approved->locked': {
    type: 'report_locked',
    recipients: ['author', 'project_manager'],
    emailEnabled: false,
    pushEnabled: false,
    inAppEnabled: true,
  },
  // Voided notifications - notify author and project manager
  'draft->voided': {
    type: 'report_voided',
    recipients: ['project_manager'],
    emailEnabled: false,
    pushEnabled: false,
    inAppEnabled: true,
  },
  'submitted->voided': {
    type: 'report_voided',
    recipients: ['author', 'project_manager'],
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
  },
  'in_review->voided': {
    type: 'report_voided',
    recipients: ['author', 'reviewer', 'project_manager'],
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
  },
  'changes_requested->voided': {
    type: 'report_voided',
    recipients: ['author', 'project_manager'],
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
  },
  'approved->voided': {
    type: 'report_voided',
    recipients: ['author', 'approver', 'project_manager'],
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
  },
};

// Workflow configuration per project (can be overridden)
interface WorkflowConfig {
  requiresSignature: boolean;
  autoLockDays: number; // Days after approval before auto-lock (0 = immediate)
  multiLevelApproval: boolean;
  requiredApprovers: number;
  escalationHours: number; // Hours before escalation
  reminderHours: number; // Hours before sending reminder
  allowSubmitterApproval: boolean; // Can submitter approve their own report?
}

const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  requiresSignature: true,
  autoLockDays: 3,
  multiLevelApproval: false,
  requiredApprovers: 1,
  escalationHours: 24,
  reminderHours: 8,
  allowSubmitterApproval: false,
};

export class DailyReportWorkflowEngine {
  private config: WorkflowConfig;

  constructor(config: Partial<WorkflowConfig> = {}) {
    this.config = { ...DEFAULT_WORKFLOW_CONFIG, ...config };
  }

  /**
   * Check if a status transition is valid
   */
  canTransition(fromStatus: ReportStatus, toStatus: ReportStatus): boolean {
    const validTransitions = STATUS_TRANSITIONS[fromStatus];
    return validTransitions.includes(toStatus);
  }

  /**
   * Check if a user role can perform a specific transition
   */
  canPerformTransition(
    fromStatus: ReportStatus,
    toStatus: ReportStatus,
    userRole: ApprovalRole
  ): boolean {
    if (!this.canTransition(fromStatus, toStatus)) {
      return false;
    }

    const transitionKey = `${fromStatus}->${toStatus}`;
    const allowedRoles = TRANSITION_PERMISSIONS[transitionKey];

    if (!allowedRoles) {
      return false;
    }

    return allowedRoles.includes(userRole);
  }

  /**
   * Get available transitions for current status and user role
   */
  getAvailableTransitions(currentStatus: ReportStatus, userRole: ApprovalRole): ReportStatus[] {
    const possibleTransitions = STATUS_TRANSITIONS[currentStatus];

    return possibleTransitions.filter((toStatus) =>
      this.canPerformTransition(currentStatus, toStatus, userRole)
    );
  }

  /**
   * Validate report is ready for submission
   */
  validateForSubmission(report: Partial<DailyReportV2>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!report.work_summary?.trim()) {
      errors.push('Work summary is required');
    }

    if (!report.project_id) {
      errors.push('Project ID is required');
    }

    if (!report.report_date) {
      errors.push('Report date is required');
    }

    // Signature requirement
    if (this.config.requiresSignature && !report.submitted_by_signature) {
      errors.push('Signature is required for submission');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get notification config for a transition
   */
  getNotificationConfig(
    fromStatus: ReportStatus,
    toStatus: ReportStatus
  ): NotificationConfig | null {
    const transitionKey = `${fromStatus}->${toStatus}`;
    return NOTIFICATION_CONFIGS[transitionKey] || null;
  }

  /**
   * Check if a report should be auto-locked
   */
  shouldAutoLock(report: DailyReportV2): boolean {
    if (report.status !== 'approved') {
      return false;
    }

    if (this.config.autoLockDays === 0) {
      return true; // Immediate lock
    }

    if (!report.approved_at) {
      return false;
    }

    const approvedDate = new Date(report.approved_at);
    const lockDate = new Date(approvedDate);
    lockDate.setDate(lockDate.getDate() + this.config.autoLockDays);

    return new Date() >= lockDate;
  }

  /**
   * Check if a report needs a review reminder
   */
  needsReviewReminder(report: DailyReportV2): boolean {
    if (report.status !== 'submitted') {
      return false;
    }

    if (!report.submitted_at) {
      return false;
    }

    const submittedDate = new Date(report.submitted_at);
    const reminderDate = new Date(submittedDate);
    reminderDate.setHours(reminderDate.getHours() + this.config.reminderHours);

    return new Date() >= reminderDate;
  }

  /**
   * Check if a report needs escalation
   */
  needsEscalation(report: DailyReportV2): boolean {
    if (report.status !== 'submitted' && report.status !== 'in_review') {
      return false;
    }

    if (!report.submitted_at) {
      return false;
    }

    const submittedDate = new Date(report.submitted_at);
    const escalationDate = new Date(submittedDate);
    escalationDate.setHours(escalationDate.getHours() + this.config.escalationHours);

    return new Date() >= escalationDate;
  }

  /**
   * Get status display info
   */
  getStatusInfo(status: ReportStatus): {
    label: string;
    color: string;
    icon: string;
    description: string;
  } {
    const statusInfo: Record<ReportStatus, { label: string; color: string; icon: string; description: string }> = {
      draft: {
        label: 'Draft',
        color: 'gray',
        icon: 'edit',
        description: 'Report is being prepared',
      },
      submitted: {
        label: 'Submitted',
        color: 'blue',
        icon: 'send',
        description: 'Awaiting review and approval',
      },
      in_review: {
        label: 'In Review',
        color: 'yellow',
        icon: 'eye',
        description: 'Currently being reviewed',
      },
      changes_requested: {
        label: 'Changes Requested',
        color: 'orange',
        icon: 'alert-circle',
        description: 'Revisions needed before approval',
      },
      approved: {
        label: 'Approved',
        color: 'green',
        icon: 'check-circle',
        description: 'Report has been approved',
      },
      locked: {
        label: 'Locked',
        color: 'purple',
        icon: 'lock',
        description: 'Report is finalized and cannot be modified',
      },
      voided: {
        label: 'Voided',
        color: 'red',
        icon: 'x-circle',
        description: 'Report has been cancelled with audit trail preserved',
      },
    };

    return statusInfo[status];
  }

  /**
   * Get actions available for a status
   */
  getAvailableActions(
    report: DailyReportV2,
    userRole: ApprovalRole
  ): Array<{
    action: string;
    toStatus: ReportStatus;
    label: string;
    variant: 'default' | 'destructive' | 'outline';
    requiresSignature: boolean;
    requiresComment: boolean;
  }> {
    const transitions = this.getAvailableTransitions(report.status, userRole);

    return transitions.map((toStatus) => {
      switch (toStatus) {
        case 'submitted':
          return {
            action: 'submit',
            toStatus,
            label: 'Submit for Approval',
            variant: 'default' as const,
            requiresSignature: this.config.requiresSignature,
            requiresComment: false,
          };
        case 'in_review':
          return {
            action: 'start_review',
            toStatus,
            label: 'Start Review',
            variant: 'outline' as const,
            requiresSignature: false,
            requiresComment: false,
          };
        case 'changes_requested':
          return {
            action: 'request_changes',
            toStatus,
            label: 'Request Changes',
            variant: 'destructive' as const,
            requiresSignature: false,
            requiresComment: true,
          };
        case 'approved':
          return {
            action: 'approve',
            toStatus,
            label: 'Approve Report',
            variant: 'default' as const,
            requiresSignature: this.config.requiresSignature,
            requiresComment: false,
          };
        case 'locked':
          return {
            action: 'lock',
            toStatus,
            label: 'Lock Report',
            variant: 'outline' as const,
            requiresSignature: false,
            requiresComment: false,
          };
        case 'draft':
          return {
            action: 'revert_to_draft',
            toStatus,
            label: 'Revert to Draft',
            variant: 'outline' as const,
            requiresSignature: false,
            requiresComment: false,
          };
        case 'voided':
          return {
            action: 'void',
            toStatus,
            label: 'Void Report',
            variant: 'destructive' as const,
            requiresSignature: false,
            requiresComment: true, // Always require reason for voiding
          };
        default:
          return {
            action: 'unknown',
            toStatus,
            label: 'Unknown Action',
            variant: 'outline' as const,
            requiresSignature: false,
            requiresComment: false,
          };
      }
    });
  }
}

// Export singleton instance with default config
export const workflowEngine = new DailyReportWorkflowEngine();

// Export for creating custom instances
export { DailyReportWorkflowEngine as WorkflowEngine };
export type { WorkflowConfig, ApprovalRole, NotificationConfig };
