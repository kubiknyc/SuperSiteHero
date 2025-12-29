/**
 * Client Approval Workflow Component
 *
 * Public-facing approval form for external clients to review and respond
 * to approval requests through secure shareable links.
 */

import * as React from 'react';
import { CheckCircle, XCircle, AlertCircle, FileText, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  PublicApprovalPageData,
  ClientDecision,
  SubmitClientApprovalInput,
} from '@/types/approval-workflow';

interface ClientApprovalWorkflowProps {
  data: PublicApprovalPageData;
  onSubmit: (input: SubmitClientApprovalInput) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

const DecisionIcon = ({ d }: { d: ClientDecision }) => {
  if (d === 'approved') {return <CheckCircle className="w-8 h-8" />;}
  if (d === 'rejected') {return <XCircle className="w-8 h-8" />;}
  return <AlertCircle className="w-8 h-8" />;
};

export function ClientApprovalWorkflow({
  data,
  onSubmit,
  isSubmitting = false,
  className,
}: ClientApprovalWorkflowProps) {
  const [decision, setDecision] = React.useState<ClientDecision | null>(null);
  const [clientName, setClientName] = React.useState(data.link.client_name || '');
  const [clientEmail, setClientEmail] = React.useState(data.link.client_email || '');
  const [clientCompany, setClientCompany] = React.useState('');
  const [clientTitle, setClientTitle] = React.useState('');
  const [comments, setComments] = React.useState('');
  const [conditions, setConditions] = React.useState('');
  const [signatureData, setSignatureData] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = React.useState(false);

  // Check if already responded
  const hasExistingResponse = !!data.existing_response;

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!decision) {
      newErrors.decision = 'Please select a decision';
    }

    if (!clientName.trim()) {
      newErrors.clientName = 'Name is required';
    }

    if (!clientEmail.trim()) {
      newErrors.clientEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address';
    }

    if (decision === 'changes_requested' && !comments.trim()) {
      newErrors.comments = 'Please describe the changes you are requesting';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !decision) {return;}

    const input: SubmitClientApprovalInput = {
      public_link_id: data.link.id,
      decision,
      client_name: clientName.trim(),
      client_email: clientEmail.trim().toLowerCase(),
      comments: comments.trim() || undefined,
      conditions: conditions.trim() || undefined,
      client_company: clientCompany.trim() || undefined,
      client_title: clientTitle.trim() || undefined,
      signature_data: signatureData || undefined,
    };

    await onSubmit(input);
  };

  // Signature canvas handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e
      ? e.touches[0].clientX - rect.left
      : e.clientX - rect.left;
    const y = 'touches' in e
      ? e.touches[0].clientY - rect.top
      : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {return;}

    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e
      ? e.touches[0].clientX - rect.left
      : e.clientX - rect.left;
    const y = 'touches' in e
      ? e.touches[0].clientY - rect.top
      : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) {return;}

    const ctx = canvas.getContext('2d');
    if (!ctx) {return;}

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  // Decision button styles
  const getDecisionButtonStyle = (d: ClientDecision) => {
    const isSelected = decision === d;
    const baseStyle = 'flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all';

    if (d === 'approved') {
      return cn(baseStyle, isSelected
        ? 'border-green-500 bg-success-light text-success-dark'
        : 'border-border hover:border-green-300 hover:bg-success-light/50'
      );
    }
    if (d === 'rejected') {
      return cn(baseStyle, isSelected
        ? 'border-red-500 bg-error-light text-error-dark'
        : 'border-border hover:border-red-300 hover:bg-error-light/50'
      );
    }
    return cn(baseStyle, isSelected
      ? 'border-warning bg-warning-light text-yellow-700'
      : 'border-border hover:border-yellow-300 hover:bg-warning-light/50'
    );
  };

  // If already responded, show the response
  if (hasExistingResponse) {
    const response = data.existing_response!;
    return (
      <div className={cn('max-w-2xl mx-auto p-6', className)}>
        <div className="bg-card rounded-lg shadow-sm border p-8 text-center">
          <div className={cn(
            'w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4',
            response.decision === 'approved' ? 'bg-success-light' :
            response.decision === 'rejected' ? 'bg-error-light' : 'bg-warning-light'
          )}>
            <DecisionIcon d={response.decision} />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2 heading-section">
            Response Already Submitted
          </h2>
          <p className="text-secondary mb-4">
            You have already submitted your decision for this approval request.
          </p>
          <div className="bg-surface rounded-lg p-4 text-left">
            <p className="text-sm text-muted">Your Decision:</p>
            <p className="font-medium text-foreground capitalize">{response.decision.replace('_', ' ')}</p>
            {response.comments && (
              <>
                <p className="text-sm text-muted mt-3">Comments:</p>
                <p className="text-foreground">{response.comments}</p>
              </>
            )}
            <p className="text-sm text-muted mt-3">Submitted:</p>
            <p className="text-foreground">
              {new Date(response.submitted_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      {/* Header */}
      <div className="bg-card rounded-t-lg border border-b-0 p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted mb-1">{data.project.company_name}</p>
            <h1 className="text-xl font-semibold text-foreground mb-2 heading-page">
              {data.entity_details.name}
            </h1>
            <p className="text-sm text-secondary">
              Project: {data.project.name}
            </p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-warning-light text-yellow-800">
            Pending Approval
          </span>
        </div>
      </div>

      {/* Entity Details */}
      <div className="bg-surface border-x px-6 py-4">
        <h2 className="text-sm font-medium text-secondary mb-2 heading-section">Details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted">Type</dt>
            <dd className="font-medium text-foreground capitalize">
              {data.entity_details.type.replace('_', ' ')}
            </dd>
          </div>
          {data.entity_details.reference_number && (
            <div>
              <dt className="text-muted">Reference</dt>
              <dd className="font-medium text-foreground">
                {data.entity_details.reference_number}
              </dd>
            </div>
          )}
          {data.entity_details.amount !== undefined && (
            <div>
              <dt className="text-muted">Amount</dt>
              <dd className="font-medium text-foreground">
                ${data.entity_details.amount.toLocaleString()}
              </dd>
            </div>
          )}
        </dl>
        {data.entity_details.description && (
          <div className="mt-4">
            <dt className="text-sm text-muted">Description</dt>
            <dd className="mt-1 text-sm text-foreground">
              {data.entity_details.description}
            </dd>
          </div>
        )}

        {/* Attachments */}
        {data.entity_details.attachments && data.entity_details.attachments.length > 0 && (
          <div className="mt-4">
            <dt className="text-sm text-muted mb-2">Attachments</dt>
            <dd className="space-y-2">
              {data.entity_details.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:text-blue-800"
                >
                  <FileText className="w-4 h-4" />
                  {attachment.name}
                </a>
              ))}
            </dd>
          </div>
        )}
      </div>

      {/* Approval Form */}
      <form onSubmit={handleSubmit} className="bg-card rounded-b-lg border p-6">
        {/* Decision Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary mb-3">
            Your Decision <span className="text-error">*</span>
          </label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setDecision('approved')}
              className={getDecisionButtonStyle('approved')}
            >
              <CheckCircle className="w-8 h-8" />
              <span className="font-medium">Approve</span>
            </button>
            <button
              type="button"
              onClick={() => setDecision('changes_requested')}
              className={getDecisionButtonStyle('changes_requested')}
            >
              <AlertCircle className="w-8 h-8" />
              <span className="font-medium text-center">Request Changes</span>
            </button>
            <button
              type="button"
              onClick={() => setDecision('rejected')}
              className={getDecisionButtonStyle('rejected')}
            >
              <XCircle className="w-8 h-8" />
              <span className="font-medium">Reject</span>
            </button>
          </div>
          {errors.decision && (
            <p className="mt-2 text-sm text-error">{errors.decision}</p>
          )}
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Your Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.clientName ? 'border-red-300' : 'border-input'
              )}
              placeholder="John Smith"
              disabled={isSubmitting}
            />
            {errors.clientName && (
              <p className="mt-1 text-sm text-error">{errors.clientName}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Email Address <span className="text-error">*</span>
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className={cn(
                'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.clientEmail ? 'border-red-300' : 'border-input'
              )}
              placeholder="john@example.com"
              disabled={isSubmitting}
            />
            {errors.clientEmail && (
              <p className="mt-1 text-sm text-error">{errors.clientEmail}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Company
            </label>
            <input
              type="text"
              value={clientCompany}
              onChange={(e) => setClientCompany(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Company Name"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-1">
              Title
            </label>
            <input
              type="text"
              value={clientTitle}
              onChange={(e) => setClientTitle(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Project Manager"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Conditions (for conditional approval) */}
        {decision === 'approved' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-secondary mb-1">
              Conditions (Optional)
            </label>
            <textarea
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Add any conditions for your approval..."
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* Comments */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary mb-1">
            Comments {decision === 'changes_requested' && <span className="text-error">*</span>}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            className={cn(
              'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none',
              errors.comments ? 'border-red-300' : 'border-input'
            )}
            placeholder={
              decision === 'changes_requested'
                ? 'Please describe the changes you are requesting...'
                : 'Add any additional comments...'
            }
            disabled={isSubmitting}
          />
          {errors.comments && (
            <p className="mt-1 text-sm text-error">{errors.comments}</p>
          )}
        </div>

        {/* Signature */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-secondary mb-1">
            Signature (Optional)
          </label>
          <div className="border border-input rounded-md p-2 bg-surface">
            <canvas
              ref={canvasRef}
              width={500}
              height={150}
              className="w-full bg-card rounded cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={clearSignature}
                className="text-sm text-secondary hover:text-foreground"
                disabled={isSubmitting}
              >
                Clear Signature
              </button>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !decision}
            className={cn(
              'px-6',
              decision === 'approved' && 'bg-success hover:bg-green-700',
              decision === 'rejected' && 'bg-error hover:bg-red-700',
              decision === 'changes_requested' && 'bg-yellow-600 hover:bg-yellow-700'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Response
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Footer */}
      <p className="text-center text-xs text-muted mt-4">
        This approval link expires on {new Date(data.link.expires_at).toLocaleDateString()}.
        {data.link.link_type === 'single_use' && ' This is a single-use link.'}
      </p>
    </div>
  );
}

export default ClientApprovalWorkflow;
