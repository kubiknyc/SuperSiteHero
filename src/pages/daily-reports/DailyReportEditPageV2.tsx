/**
 * DailyReportEditPageV2 - Edit daily report with V2 form
 * Uses the redesigned Quick/Detailed Mode form
 */

import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useDailyReportV2,
  useSubmitReportV2,
  useApproveReportV2,
  useRequestChangesV2,
  useLockReportV2,
} from '@/features/daily-reports/hooks/useDailyReportsV2';
import { DailyReportFormV2, ApprovalWorkflowPanel } from '@/features/daily-reports/components/v2';
import { AppLayout } from '@/components/layout/AppLayout';
import { AlertCircle, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/AuthContext';

export function DailyReportEditPageV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, error } = useDailyReportV2(id);
  const { user } = useAuth();

  // Workflow mutations
  const submitMutation = useSubmitReportV2();
  const approveMutation = useApproveReportV2();
  const requestChangesMutation = useRequestChangesV2();
  const lockMutation = useLockReportV2();

  const handleBack = () => {
    if (report) {
      navigate(`/daily-reports/${report.id}`);
    } else {
      navigate('/daily-reports');
    }
  };

  // Workflow callbacks for ApprovalWorkflowPanel
  const handleSubmitForApproval = useCallback(
    async (signature: string, name: string) => {
      if (!report?.id) return;
      await submitMutation.mutateAsync({
        report_id: report.id,
        submitted_by_signature: signature,
        submitted_by_name: name,
      });
    },
    [report?.id, submitMutation]
  );

  const handleApprove = useCallback(
    async (signature: string, name: string, comments?: string) => {
      if (!report?.id) return;
      await approveMutation.mutateAsync({
        report_id: report.id,
        approved_by_signature: signature,
        approved_by_name: name,
        approval_comments: comments,
      });
    },
    [report?.id, approveMutation]
  );

  const handleRequestChanges = useCallback(
    async (reason: string) => {
      if (!report?.id) return;
      await requestChangesMutation.mutateAsync({
        report_id: report.id,
        reason,
      });
    },
    [report?.id, requestChangesMutation]
  );

  const handleLock = useCallback(async () => {
    if (!report?.id) return;
    await lockMutation.mutateAsync(report.id);
  }, [report?.id, lockMutation]);

  if (!id) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Report ID not found</p>
            <Button variant="outline" onClick={() => navigate('/daily-reports')} className="mt-4">
              Back to Reports
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-500">Loading report...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !report) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Error loading report</p>
            <p className="text-gray-500 text-sm mt-1">{error?.message || 'Report not found'}</p>
            <Button variant="outline" onClick={() => navigate('/daily-reports')} className="mt-4">
              Back to Reports
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Only allow editing draft or changes_requested reports
  const canEdit = report.status === 'draft' || report.status === 'changes_requested';

  if (!canEdit) {
    const statusLabels: Record<string, string> = {
      submitted: 'submitted for approval',
      in_review: 'under review',
      approved: 'approved',
      locked: 'locked',
    };

    return (
      <AppLayout>
        <div className="p-6">
          <div className="max-w-md mx-auto text-center py-12">
            <div className="bg-gray-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Lock className="h-8 w-8 text-gray-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cannot Edit Report</h2>
            <p className="text-gray-600 mb-4">
              This report has been {statusLabels[report.status] || report.status} and cannot be
              edited.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate(`/daily-reports/${report.id}`)}>
                View Report
              </Button>
              <Button onClick={() => navigate('/daily-reports')}>Back to Reports</Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Determine user permissions based on role
  // For now, use a simple check - in production this would come from project team membership
  const isAuthor = report.created_by === user?.id;
  const isApprover = true; // TODO: Check project role for approval permissions
  const canSubmit = isAuthor && (report.status === 'draft' || report.status === 'changes_requested');
  const canApprove = isApprover && (report.status === 'submitted' || report.status === 'in_review');
  const canRequestChanges = isApprover && (report.status === 'submitted' || report.status === 'in_review');
  const canLock = isApprover && report.status === 'approved';

  return (
    <div className="min-h-screen bg-gray-50">
      <DailyReportFormV2
        projectId={report.project_id}
        reportDate={report.report_date}
        existingReport={report}
        onBack={handleBack}
      />

      {/* Approval Workflow Panel - Shown for non-draft reports or when user has approval permissions */}
      {report.status !== 'draft' || canApprove ? (
        <div className="fixed bottom-24 right-4 z-40 w-80">
          <ApprovalWorkflowPanel
            reportId={report.id}
            currentStatus={report.status}
            submittedByName={report.submitted_by_name}
            submittedAt={report.submitted_at}
            approvedByName={report.approved_by_name}
            approvedAt={report.approved_at}
            rejectionReason={report.rejection_reason}
            lockedAt={report.locked_at}
            onSubmit={handleSubmitForApproval}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
            onLock={handleLock}
            canSubmit={canSubmit}
            canApprove={canApprove}
            canRequestChanges={canRequestChanges}
            canLock={canLock}
            isLoading={
              submitMutation.isPending ||
              approveMutation.isPending ||
              requestChangesMutation.isPending ||
              lockMutation.isPending
            }
          />
        </div>
      ) : null}
    </div>
  );
}

export default DailyReportEditPageV2;
