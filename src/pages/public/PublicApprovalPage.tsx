/**
 * Public Approval Page
 *
 * Public-facing page for external clients to review and respond to approval requests.
 * This page does NOT require authentication.
 */

import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, Shield, XCircle } from 'lucide-react';
import { usePublicApprovalPage } from '@/features/approvals/hooks';
import { ClientApprovalWorkflow } from '@/features/client-portal/components/ClientApprovalWorkflow';
import type { SubmitClientApprovalInput } from '@/types/approval-workflow';

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-muted py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-lg shadow-sm border animate-pulse">
          <div className="p-6 border-b">
            <div className="h-4 w-24 bg-muted rounded mb-2" />
            <div className="h-6 w-64 bg-muted rounded mb-2" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
          <div className="p-6 bg-surface">
            <div className="h-4 w-20 bg-muted rounded mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded" />
            </div>
          </div>
          <div className="p-6">
            <div className="h-4 w-32 bg-muted rounded mb-4" />
            <div className="flex gap-4">
              <div className="flex-1 h-24 bg-muted rounded" />
              <div className="flex-1 h-24 bg-muted rounded" />
              <div className="flex-1 h-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Error page component
function ErrorPage({
  title,
  message,
  icon: Icon = AlertTriangle,
}: {
  title: string;
  message: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="min-h-screen bg-muted flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-sm border p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-error-light flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-error" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2" className="heading-page">{title}</h1>
        <p className="text-secondary">{message}</p>
      </div>
    </div>
  );
}

// Success page component
function SuccessPage({
  decision,
  projectName,
  entityName,
}: {
  decision: string;
  projectName: string;
  entityName: string;
}) {
  const getIcon = () => {
    if (decision === 'approved') return CheckCircle;
    if (decision === 'rejected') return XCircle;
    return Clock;
  };

  const getColor = () => {
    if (decision === 'approved') return 'bg-success-light text-success';
    if (decision === 'rejected') return 'bg-error-light text-error';
    return 'bg-warning-light text-warning';
  };

  const getMessage = () => {
    if (decision === 'approved') return 'Your approval has been recorded.';
    if (decision === 'rejected') return 'Your rejection has been recorded.';
    return 'Your change request has been submitted.';
  };

  const Icon = getIcon();

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-sm border p-8 text-center">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${getColor()}`}>
          <Icon className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2" className="heading-page">
          Response Submitted
        </h1>
        <p className="text-secondary mb-4">{getMessage()}</p>
        <div className="bg-surface rounded-lg p-4 text-left text-sm">
          <p className="text-muted">Project:</p>
          <p className="font-medium text-foreground">{projectName}</p>
          <p className="text-muted mt-2">Item:</p>
          <p className="font-medium text-foreground">{entityName}</p>
        </div>
        <p className="text-xs text-muted mt-6">
          You may close this window. The project team has been notified of your response.
        </p>
      </div>
    </div>
  );
}

export function PublicApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const {
    data,
    isLoading,
    error,
    isValid,
    submitResponse,
    isSubmitting,
    submitError,
    submitSuccess,
    submittedResponse,
  } = usePublicApprovalPage(token);

  // Handle submission
  const handleSubmit = async (input: Omit<SubmitClientApprovalInput, 'public_link_id'>) => {
    try {
      await submitResponse(input);
    } catch (err) {
      // Error is handled by the hook
      console.error('Submit error:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // No token
  if (!token) {
    return (
      <ErrorPage
        title="Invalid Link"
        message="This approval link is missing the required token. Please check the link and try again."
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorPage
        title="Link Error"
        message="There was an error loading this approval link. Please try again or contact the sender."
      />
    );
  }

  // Invalid or expired link
  if (!isValid || !data) {
    return (
      <ErrorPage
        title="Link Unavailable"
        message="This approval link is invalid, expired, or has already been used. Please contact the sender for a new link."
        icon={Clock}
      />
    );
  }

  // Check if request is no longer pending
  if (data.request.status !== 'pending') {
    return (
      <ErrorPage
        title="Approval Completed"
        message={`This approval request has already been ${data.request.status}. No further action is required.`}
        icon={data.request.status === 'approved' ? CheckCircle : XCircle}
      />
    );
  }

  // Show success page after submission
  if (submitSuccess && submittedResponse) {
    return (
      <SuccessPage
        decision={submittedResponse.decision}
        projectName={data.project.name}
        entityName={data.entity_details.name}
      />
    );
  }

  // Main approval form
  return (
    <div className="min-h-screen bg-muted py-12 px-4">
      {/* Security badge */}
      <div className="max-w-2xl mx-auto mb-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted">
          <Shield className="w-4 h-4" />
          <span>Secure approval page</span>
        </div>
      </div>

      {/* Approval form */}
      <ClientApprovalWorkflow
        data={data}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Error message */}
      {submitError && (
        <div className="max-w-2xl mx-auto mt-4">
          <div className="bg-error-light border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Submission Failed</p>
              <p className="text-sm text-error-dark mt-1">
                {submitError instanceof Error
                  ? submitError.message
                  : 'An error occurred while submitting your response. Please try again.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-2xl mx-auto mt-8 text-center">
        <p className="text-xs text-disabled">
          Powered by JobSight - Construction Management Software
        </p>
      </div>
    </div>
  );
}

export default PublicApprovalPage;
