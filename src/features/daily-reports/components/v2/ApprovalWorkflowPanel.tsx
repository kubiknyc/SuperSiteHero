/**
 * ApprovalWorkflowPanel - Manage report approval workflow
 * Handles status transitions, signatures, and approval history
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Clock,
  FileEdit,
  Lock,
  Send,
  XCircle,
  AlertTriangle,
  History,
  PenTool,
} from 'lucide-react';
import { SignatureCapture } from '../SignatureCapture';
import { workflowEngine, type ApprovalRole } from '../../services/workflowEngine';
import type { ReportStatus, DailyReportV2 } from '@/types/daily-reports-v2';

interface ApprovalWorkflowPanelProps {
  reportId: string;
  currentStatus: ReportStatus;
  submittedByName?: string;
  submittedAt?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  lockedAt?: string;
  onSubmit?: (signature: string, name: string) => Promise<void>;
  onApprove?: (signature: string, name: string, comments?: string) => Promise<void>;
  onRequestChanges?: (reason: string) => Promise<void>;
  onLock?: () => Promise<void>;
  // Legacy permission props (can be omitted if using role-based)
  canSubmit?: boolean;
  canApprove?: boolean;
  canRequestChanges?: boolean;
  canLock?: boolean;
  // Role-based permission (preferred)
  userRole?: ApprovalRole;
  isAuthor?: boolean;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'Draft',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: <FileEdit className="h-4 w-4" />,
  },
  submitted: {
    label: 'Submitted',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: <Send className="h-4 w-4" />,
  },
  in_review: {
    label: 'In Review',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: <Clock className="h-4 w-4" />,
  },
  changes_requested: {
    label: 'Changes Requested',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  approved: {
    label: 'Approved',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  locked: {
    label: 'Locked',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: <Lock className="h-4 w-4" />,
  },
  voided: {
    label: 'Voided',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: <XCircle className="h-4 w-4" />,
  },
};

export function ApprovalWorkflowPanel({
  reportId,
  currentStatus,
  submittedByName,
  submittedAt,
  approvedByName,
  approvedAt,
  rejectionReason,
  lockedAt,
  onSubmit,
  onApprove,
  onRequestChanges,
  onLock,
  canSubmit: canSubmitProp,
  canApprove: canApproveProp,
  canRequestChanges: canRequestChangesProp,
  canLock: canLockProp,
  userRole,
  isAuthor = false,
  isLoading = false,
}: ApprovalWorkflowPanelProps) {
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [processing, setProcessing] = useState(false);

  const statusConfig = STATUS_CONFIG[currentStatus];

  // Calculate permissions using workflow engine if userRole is provided
  const permissions = useMemo(() => {
    // If userRole is provided, use workflow engine for role-based permissions
    if (userRole) {
      const effectiveRole = isAuthor ? 'author' : userRole;
      const availableActions = workflowEngine.getAvailableActions(
        { status: currentStatus } as DailyReportV2,
        effectiveRole
      );

      const actionMap = availableActions.reduce(
        (acc, action) => {
          acc[action.action] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );

      return {
        canSubmit: Boolean(actionMap['submit']),
        canApprove: Boolean(actionMap['approve']),
        canRequestChanges: Boolean(actionMap['request_changes']),
        canLock: Boolean(actionMap['lock']),
      };
    }

    // Fall back to explicit permission props
    return {
      canSubmit: canSubmitProp ?? false,
      canApprove: canApproveProp ?? false,
      canRequestChanges: canRequestChangesProp ?? false,
      canLock: canLockProp ?? false,
    };
  }, [currentStatus, userRole, isAuthor, canSubmitProp, canApproveProp, canRequestChangesProp, canLockProp]);

  const { canSubmit, canApprove, canRequestChanges, canLock } = permissions;

  const handleSubmit = useCallback(async () => {
    if (!signature || !signerName.trim() || !onSubmit) return;

    setProcessing(true);
    try {
      await onSubmit(signature, signerName);
      setSubmitDialogOpen(false);
      setSignature(null);
      setSignerName('');
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setProcessing(false);
    }
  }, [signature, signerName, onSubmit]);

  const handleApprove = useCallback(async () => {
    if (!signature || !signerName.trim() || !onApprove) return;

    setProcessing(true);
    try {
      await onApprove(signature, signerName, approvalComments || undefined);
      setApproveDialogOpen(false);
      setSignature(null);
      setSignerName('');
      setApprovalComments('');
    } catch (error) {
      console.error('Approve failed:', error);
    } finally {
      setProcessing(false);
    }
  }, [signature, signerName, approvalComments, onApprove]);

  const handleRequestChanges = useCallback(async () => {
    if (!rejectionReasonInput.trim() || !onRequestChanges) return;

    setProcessing(true);
    try {
      await onRequestChanges(rejectionReasonInput);
      setRejectDialogOpen(false);
      setRejectionReasonInput('');
    } catch (error) {
      console.error('Request changes failed:', error);
    } finally {
      setProcessing(false);
    }
  }, [rejectionReasonInput, onRequestChanges]);

  const handleLock = useCallback(async () => {
    if (!onLock) return;

    if (!confirm('Are you sure you want to lock this report? This action cannot be undone.')) {
      return;
    }

    setProcessing(true);
    try {
      await onLock();
    } catch (error) {
      console.error('Lock failed:', error);
    } finally {
      setProcessing(false);
    }
  }, [onLock]);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Approval Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <Badge className={`${statusConfig.bgColor} ${statusConfig.color} gap-1`}>
              {statusConfig.icon}
              {statusConfig.label}
            </Badge>
          </div>

          {/* Status History */}
          <div className="space-y-2 text-sm">
            {submittedByName && submittedAt && (
              <div className="flex justify-between text-gray-600">
                <span>Submitted by {submittedByName}</span>
                <span>{new Date(submittedAt).toLocaleDateString()}</span>
              </div>
            )}

            {approvedByName && approvedAt && (
              <div className="flex justify-between text-gray-600">
                <span>Approved by {approvedByName}</span>
                <span>{new Date(approvedAt).toLocaleDateString()}</span>
              </div>
            )}

            {lockedAt && (
              <div className="flex justify-between text-gray-600">
                <span>Locked</span>
                <span>{new Date(lockedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {/* Rejection Reason */}
          {rejectionReason && currentStatus === 'changes_requested' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-700">Changes Requested</p>
                  <p className="text-sm text-orange-600">{rejectionReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            {canSubmit && currentStatus === 'draft' && (
              <Button
                size="sm"
                onClick={() => setSubmitDialogOpen(true)}
                disabled={isLoading || processing}
              >
                <Send className="h-4 w-4 mr-1" />
                Submit for Approval
              </Button>
            )}

            {canSubmit && currentStatus === 'changes_requested' && (
              <Button
                size="sm"
                onClick={() => setSubmitDialogOpen(true)}
                disabled={isLoading || processing}
              >
                <Send className="h-4 w-4 mr-1" />
                Resubmit
              </Button>
            )}

            {canApprove && (currentStatus === 'submitted' || currentStatus === 'in_review') && (
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setApproveDialogOpen(true)}
                disabled={isLoading || processing}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}

            {canRequestChanges && (currentStatus === 'submitted' || currentStatus === 'in_review') && (
              <Button
                size="sm"
                variant="outline"
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isLoading || processing}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Request Changes
              </Button>
            )}

            {canLock && currentStatus === 'approved' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLock}
                disabled={isLoading || processing}
              >
                <Lock className="h-4 w-4 mr-1" />
                Lock Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Submit Report
            </DialogTitle>
            <DialogDescription>
              Sign below to submit this report for approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <SignatureCapture
              label="Your Signature *"
              onSave={(sig) => setSignature(sig)}
              onClear={() => setSignature(null)}
              existingSignature={signature || undefined}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!signature || !signerName.trim() || processing}
            >
              {processing ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Approve Report
            </DialogTitle>
            <DialogDescription>
              Sign below to approve this daily report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label>Comments (optional)</Label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Add any approval comments..."
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <SignatureCapture
              label="Your Signature *"
              onSave={(sig) => setSignature(sig)}
              onClear={() => setSignature(null)}
              existingSignature={signature || undefined}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleApprove}
              disabled={!signature || !signerName.trim() || processing}
            >
              {processing ? 'Approving...' : 'Approve Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Changes Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Request Changes
            </DialogTitle>
            <DialogDescription>
              Explain what changes need to be made to this report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Changes *</Label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Describe what needs to be changed..."
                className="w-full px-3 py-2 border rounded-lg text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
              onClick={handleRequestChanges}
              disabled={!rejectionReasonInput.trim() || processing}
            >
              {processing ? 'Sending...' : 'Request Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ApprovalWorkflowPanel;
