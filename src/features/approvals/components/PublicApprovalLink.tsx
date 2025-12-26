/**
 * Public Approval Link Component
 *
 * UI for generating, managing, and sharing public approval links
 * for external client access.
 */

import * as React from 'react';
import {
  Link2,
  Copy,
  Mail,
  Clock,
  Check,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  ApprovalRequest,
  PublicApprovalLink as PublicLinkType,
  CreatePublicLinkInput,
  PublicLinkType as LinkType,
} from '@/types/approval-workflow';
import { logger } from '../../../lib/utils/logger';


interface PublicApprovalLinkProps {
  approvalRequest: ApprovalRequest;
  existingLinks?: PublicLinkType[];
  onCreateLink: (input: CreatePublicLinkInput) => Promise<PublicLinkType>;
  onRevokeLink: (linkId: string) => Promise<void>;
  onSendEmail?: (link: PublicLinkType, email: string) => Promise<void>;
  baseUrl?: string;
  className?: string;
}

export function PublicApprovalLink({
  approvalRequest,
  existingLinks = [],
  onCreateLink,
  onRevokeLink,
  onSendEmail,
  baseUrl = window.location.origin,
  className,
}: PublicApprovalLinkProps) {
  const [isCreating, setIsCreating] = React.useState(false);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [copiedLinkId, setCopiedLinkId] = React.useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = React.useState<string | null>(null);

  // Form state
  const [clientEmail, setClientEmail] = React.useState('');
  const [clientName, setClientName] = React.useState('');
  const [linkType, setLinkType] = React.useState<LinkType>('single_use');
  const [expiresInDays, setExpiresInDays] = React.useState(30);
  const [maxUses, setMaxUses] = React.useState(1);

  // Active (non-revoked, non-expired) links
  const activeLinks = existingLinks.filter(
    (link) => !link.revoked_at && new Date(link.expires_at) > new Date()
  );

  // Handle link creation
  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      const input: CreatePublicLinkInput = {
        approval_request_id: approvalRequest.id,
        client_email: clientEmail.trim() || undefined,
        client_name: clientName.trim() || undefined,
        link_type: linkType,
        expires_in_days: expiresInDays,
        max_uses: linkType === 'single_use' ? 1 : maxUses,
      };

      await onCreateLink(input);
      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      logger.error('Failed to create link:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setClientEmail('');
    setClientName('');
    setLinkType('single_use');
    setExpiresInDays(30);
    setMaxUses(1);
  };

  // Copy link to clipboard
  const copyLink = async (link: PublicLinkType) => {
    const url = `${baseUrl}/approve/${link.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLinkId(link.id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // Send email with link
  const handleSendEmail = async (link: PublicLinkType) => {
    if (!onSendEmail || !link.client_email) {return;}

    setSendingEmail(link.id);
    try {
      await onSendEmail(link, link.client_email);
    } catch (error) {
      logger.error('Failed to send email:', error);
    } finally {
      setSendingEmail(null);
    }
  };

  // Format expiration
  const formatExpiration = (date: string) => {
    const expires = new Date(date);
    const now = new Date();
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {return 'Expired';}
    if (daysLeft === 0) {return 'Expires today';}
    if (daysLeft === 1) {return 'Expires tomorrow';}
    return `Expires in ${daysLeft} days`;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-muted" />
          <h3 className="font-medium text-foreground heading-subsection">Client Approval Links</h3>
        </div>
        {!showCreateForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(true)}
          >
            Generate Link
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-surface rounded-lg p-4 border">
          <h4 className="text-sm font-medium text-secondary mb-3 heading-card">
            Generate New Approval Link
          </h4>

          <div className="space-y-3">
            {/* Client Info (Optional) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Client Email (Optional)
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Client Name (Optional)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Smith"
                />
              </div>
            </div>

            {/* Link Type */}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1">
                Link Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={linkType === 'single_use'}
                    onChange={() => setLinkType('single_use')}
                    className="text-primary"
                  />
                  <span className="text-sm">Single Use</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={linkType === 'multi_use'}
                    onChange={() => setLinkType('multi_use')}
                    className="text-primary"
                  />
                  <span className="text-sm">Multi-Use</span>
                </label>
              </div>
            </div>

            {/* Expiration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">
                  Expires In
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>
              {linkType === 'multi_use' && (
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={maxUses}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateLink}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Generate Link'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Links */}
      {activeLinks.length > 0 ? (
        <div className="space-y-2">
          {activeLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-3 bg-card border rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {link.client_name || link.client_email ? (
                    <>
                      <Users className="w-4 h-4 text-disabled" />
                      <span className="text-sm font-medium text-foreground truncate">
                        {link.client_name || link.client_email}
                      </span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 text-disabled" />
                      <span className="text-sm text-secondary">
                        General approval link
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatExpiration(link.expires_at)}
                  </span>
                  <span>
                    {link.link_type === 'single_use'
                      ? 'Single use'
                      : `${link.current_uses}/${link.max_uses} uses`}
                  </span>
                  {link.last_accessed_at && (
                    <span>
                      Last accessed: {new Date(link.last_accessed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-3">
                {/* Copy Link */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyLink(link)}
                  title="Copy link"
                >
                  {copiedLinkId === link.id ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>

                {/* Open in new tab */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`${baseUrl}/approve/${link.token}`, '_blank')}
                  title="Open link"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>

                {/* Send Email (if client email provided) */}
                {link.client_email && onSendEmail && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSendEmail(link)}
                    disabled={sendingEmail === link.id}
                    title="Send email"
                  >
                    {sendingEmail === link.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </Button>
                )}

                {/* Revoke Link */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevokeLink(link.id)}
                  title="Revoke link"
                  className="text-error hover:text-error-dark hover:bg-error-light"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showCreateForm && (
          <div className="text-center py-6 text-muted">
            <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active approval links</p>
            <p className="text-xs">Generate a link to share with clients</p>
          </div>
        )
      )}

      {/* Security Notice */}
      <div className="flex items-start gap-2 p-3 bg-warning-light border border-yellow-200 rounded-lg">
        <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
        <div className="text-xs text-yellow-800">
          <p className="font-medium">Security Notice</p>
          <p>
            Approval links provide access without authentication. Only share links with
            trusted parties. Links can be revoked at any time.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicApprovalLink;
