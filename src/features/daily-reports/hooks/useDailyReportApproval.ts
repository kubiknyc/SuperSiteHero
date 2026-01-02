/**
 * Daily Report Approval Workflow Hook
 *
 * Manages the approval workflow for daily reports including:
 * - Submit for review
 * - PM review/approve/reject
 * - Superintendent sign-off
 * - Approval status tracking
 * - Email notifications
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { DailyReport } from '@/types/database';

// ============================================================================
// TYPES
// ============================================================================

export type DailyReportApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected';

export interface DailyReportApproval {
  id: string;
  daily_report_id: string;
  status: DailyReportApprovalStatus;
  submitted_at: string | null;
  submitted_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_role: 'project_manager' | 'superintendent' | null;
  review_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  superintendent_signoff_at: string | null;
  superintendent_signoff_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalAction {
  id: string;
  daily_report_id: string;
  action: 'submit' | 'review' | 'request_changes' | 'approve' | 'reject' | 'signoff' | 'comment';
  performed_by: string;
  performed_at: string;
  notes: string | null;
  previous_status: DailyReportApprovalStatus;
  new_status: DailyReportApprovalStatus;
}

export interface ApprovalActionWithUser extends ApprovalAction {
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface SubmitForReviewInput {
  dailyReportId: string;
  notes?: string;
}

export interface ReviewInput {
  dailyReportId: string;
  action: 'approve' | 'reject' | 'request_changes';
  notes?: string;
}

export interface SignoffInput {
  dailyReportId: string;
  notes?: string;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const dailyReportApprovalKeys = {
  all: ['daily-report-approvals'] as const,
  detail: (reportId: string) => [...dailyReportApprovalKeys.all, 'detail', reportId] as const,
  history: (reportId: string) => [...dailyReportApprovalKeys.all, 'history', reportId] as const,
  pending: (userId: string) => [...dailyReportApprovalKeys.all, 'pending', userId] as const,
  pendingCount: (userId: string) => [...dailyReportApprovalKeys.all, 'pending-count', userId] as const,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get status display info
 */
export function getApprovalStatusInfo(status: DailyReportApprovalStatus): {
  label: string;
  color: 'default' | 'secondary' | 'warning' | 'success' | 'destructive';
  description: string;
} {
  switch (status) {
    case 'draft':
      return { label: 'Draft', color: 'secondary', description: 'Report is being prepared' };
    case 'submitted':
      return { label: 'Submitted', color: 'default', description: 'Awaiting review' };
    case 'under_review':
      return { label: 'Under Review', color: 'warning', description: 'Being reviewed by PM' };
    case 'changes_requested':
      return { label: 'Changes Requested', color: 'warning', description: 'Revisions needed' };
    case 'approved':
      return { label: 'Approved', color: 'success', description: 'Report approved' };
    case 'rejected':
      return { label: 'Rejected', color: 'destructive', description: 'Report rejected' };
    default:
      return { label: 'Unknown', color: 'secondary', description: '' };
  }
}

/**
 * Check if user can perform action on report
 */
export function canPerformAction(
  report: DailyReport,
  action: 'submit' | 'review' | 'approve' | 'reject' | 'signoff',
  userRole: string,
  userId: string
): boolean {
  const status = (report.status as DailyReportApprovalStatus) || 'draft';

  switch (action) {
    case 'submit':
      // Reporter or creator can submit draft reports
      return status === 'draft' && (report.reporter_id === userId || report.created_by === userId);

    case 'review':
      // PM can review submitted reports
      return (
        (status === 'submitted' || status === 'under_review') &&
        (userRole === 'project_manager' || userRole === 'admin' || userRole === 'owner')
      );

    case 'approve':
      // PM can approve reviewed reports
      return (
        (status === 'submitted' || status === 'under_review') &&
        (userRole === 'project_manager' || userRole === 'admin' || userRole === 'owner')
      );

    case 'reject':
      // PM can reject reports
      return (
        (status === 'submitted' || status === 'under_review') &&
        (userRole === 'project_manager' || userRole === 'admin' || userRole === 'owner')
      );

    case 'signoff':
      // Superintendent can sign off approved reports
      return (
        status === 'approved' &&
        (userRole === 'superintendent' || userRole === 'admin' || userRole === 'owner')
      );

    default:
      return false;
  }
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Fetch approval status for a daily report
 */
export function useDailyReportApproval(reportId: string | undefined) {
  return useQuery({
    queryKey: dailyReportApprovalKeys.detail(reportId || ''),
    queryFn: async () => {
      if (!reportId) throw new Error('Report ID required');

      const { data, error } = await supabase
        .from('daily_report_approvals')
        .select('*')
        .eq('daily_report_id', reportId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as DailyReportApproval | null;
    },
    enabled: !!reportId,
  });
}

/**
 * Fetch approval action history for a daily report
 */
export function useDailyReportApprovalHistory(reportId: string | undefined) {
  return useQuery({
    queryKey: dailyReportApprovalKeys.history(reportId || ''),
    queryFn: async () => {
      if (!reportId) throw new Error('Report ID required');

      const { data, error } = await supabase
        .from('daily_report_approval_actions')
        .select(`
          *,
          user:users!performed_by(id, full_name, email)
        `)
        .eq('daily_report_id', reportId)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      return data as ApprovalActionWithUser[];
    },
    enabled: !!reportId,
  });
}

/**
 * Fetch pending approvals for a user
 */
export function usePendingApprovals(userId: string | undefined, userRole: string) {
  return useQuery({
    queryKey: dailyReportApprovalKeys.pending(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');

      // Get reports that need approval based on role
      let query = supabase
        .from('daily_reports')
        .select(`
          *,
          project:projects(id, name),
          reporter:users!reporter_id(id, full_name, email)
        `)
        .is('deleted_at', null);

      if (userRole === 'project_manager' || userRole === 'admin' || userRole === 'owner') {
        query = query.in('status', ['submitted', 'under_review']);
      } else if (userRole === 'superintendent') {
        query = query.eq('status', 'approved');
      } else {
        // Workers see their own reports needing changes
        query = query.eq('reporter_id', userId).eq('status', 'changes_requested');
      }

      const { data, error } = await query.order('submitted_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Get count of pending approvals for badge display
 */
export function usePendingApprovalsCount(userId: string | undefined, userRole: string) {
  return useQuery({
    queryKey: dailyReportApprovalKeys.pendingCount(userId || ''),
    queryFn: async () => {
      if (!userId) return 0;

      let query = supabase
        .from('daily_reports')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null);

      if (userRole === 'project_manager' || userRole === 'admin' || userRole === 'owner') {
        query = query.in('status', ['submitted', 'under_review']);
      } else if (userRole === 'superintendent') {
        query = query.eq('status', 'approved');
      } else {
        query = query.eq('reporter_id', userId).eq('status', 'changes_requested');
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refresh every minute
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Submit a daily report for review
 */
export function useSubmitForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dailyReportId, notes }: SubmitForReviewInput & { userId: string }) => {
      // Update report status
      const { data: report, error: reportError } = await supabase
        .from('daily_reports')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', dailyReportId)
        .select()
        .single();

      if (reportError) throw reportError;

      // Create or update approval record
      const { error: approvalError } = await supabase
        .from('daily_report_approvals')
        .upsert({
          daily_report_id: dailyReportId,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: report.reporter_id,
        }, {
          onConflict: 'daily_report_id',
        });

      if (approvalError) throw approvalError;

      // Log action
      await supabase.from('daily_report_approval_actions').insert({
        daily_report_id: dailyReportId,
        action: 'submit',
        performed_by: report.reporter_id,
        notes,
        previous_status: 'draft',
        new_status: 'submitted',
      });

      // Send notification (handled by database trigger or edge function)
      await supabase.functions.invoke('send-approval-notification', {
        body: {
          type: 'daily_report_submitted',
          dailyReportId,
          projectId: report.project_id,
        },
      }).catch(() => {
        // Notification failure shouldn't fail the submission
        console.warn('Failed to send notification');
      });

      return report;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      queryClient.invalidateQueries({ queryKey: dailyReportApprovalKeys.all });
    },
  });
}

/**
 * Review a daily report (approve, reject, or request changes)
 */
export function useReviewDailyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dailyReportId, action, notes, userId }: ReviewInput & { userId: string }) => {
      const now = new Date().toISOString();
      let newStatus: DailyReportApprovalStatus;
      let updateData: Record<string, unknown> = {};

      switch (action) {
        case 'approve':
          newStatus = 'approved';
          updateData = {
            status: 'approved',
            approved_at: now,
            approved_by: userId,
          };
          break;
        case 'reject':
          newStatus = 'rejected';
          updateData = {
            status: 'rejected',
            // Note: approved_at is used for rejection time as well in the existing schema
          };
          break;
        case 'request_changes':
          newStatus = 'changes_requested';
          updateData = {
            status: 'changes_requested',
          };
          break;
        default:
          throw new Error('Invalid action');
      }

      // Get current status
      const { data: currentReport } = await supabase
        .from('daily_reports')
        .select('status, project_id')
        .eq('id', dailyReportId)
        .single();

      const previousStatus = (currentReport?.status as DailyReportApprovalStatus) || 'submitted';

      // Update report
      const { data: report, error: reportError } = await supabase
        .from('daily_reports')
        .update(updateData)
        .eq('id', dailyReportId)
        .select()
        .single();

      if (reportError) throw reportError;

      // Update approval record
      const { error: approvalError } = await supabase
        .from('daily_report_approvals')
        .upsert({
          daily_report_id: dailyReportId,
          status: newStatus,
          reviewed_at: now,
          reviewed_by: userId,
          review_notes: notes,
          ...(action === 'approve' ? { approved_at: now, approved_by: userId } : {}),
          ...(action === 'reject' ? { rejected_at: now, rejected_by: userId, rejection_reason: notes } : {}),
        }, {
          onConflict: 'daily_report_id',
        });

      if (approvalError) throw approvalError;

      // Log action
      await supabase.from('daily_report_approval_actions').insert({
        daily_report_id: dailyReportId,
        action: action === 'request_changes' ? 'request_changes' : action,
        performed_by: userId,
        notes,
        previous_status: previousStatus,
        new_status: newStatus,
      });

      // Send notification
      await supabase.functions.invoke('send-approval-notification', {
        body: {
          type: `daily_report_${action}d`,
          dailyReportId,
          projectId: currentReport?.project_id,
          notes,
        },
      }).catch(() => {
        console.warn('Failed to send notification');
      });

      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-reports'] });
      queryClient.invalidateQueries({ queryKey: dailyReportApprovalKeys.all });
    },
  });
}

/**
 * Superintendent sign-off on approved report
 */
export function useSuperintendentSignoff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dailyReportId, notes, userId }: SignoffInput & { userId: string }) => {
      const now = new Date().toISOString();

      // Update approval record
      const { error: approvalError } = await supabase
        .from('daily_report_approvals')
        .update({
          superintendent_signoff_at: now,
          superintendent_signoff_by: userId,
        })
        .eq('daily_report_id', dailyReportId);

      if (approvalError) throw approvalError;

      // Log action
      await supabase.from('daily_report_approval_actions').insert({
        daily_report_id: dailyReportId,
        action: 'signoff',
        performed_by: userId,
        notes,
        previous_status: 'approved',
        new_status: 'approved', // Status doesn't change, just adds signoff
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyReportApprovalKeys.all });
    },
  });
}

/**
 * Add a comment to the approval workflow
 */
export function useAddApprovalComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dailyReportId,
      comment,
      userId,
    }: {
      dailyReportId: string;
      comment: string;
      userId: string;
    }) => {
      // Get current status
      const { data: report } = await supabase
        .from('daily_reports')
        .select('status')
        .eq('id', dailyReportId)
        .single();

      const status = (report?.status as DailyReportApprovalStatus) || 'draft';

      // Log comment
      const { data, error } = await supabase
        .from('daily_report_approval_actions')
        .insert({
          daily_report_id: dailyReportId,
          action: 'comment',
          performed_by: userId,
          notes: comment,
          previous_status: status,
          new_status: status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dailyReportApprovalKeys.history(variables.dailyReportId),
      });
    },
  });
}

export default useDailyReportApproval;
