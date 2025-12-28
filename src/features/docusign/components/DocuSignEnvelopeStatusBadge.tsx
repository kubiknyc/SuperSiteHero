/**
 * DocuSign Envelope Status Badge
 *
 * Shows the signature status of a document with DocuSign.
 * Displays pending, completed, declined, or voided status.
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  FileSignature,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  RefreshCw,
  ExternalLink,
  Loader2,
  User,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  useDocuSignEnvelopeByDocument,
  useResendDocuSignEnvelope,
  useVoidDocuSignEnvelope,
} from '../hooks/useDocuSign'
import type { DSDocumentType, DSEnvelopeStatus, DSRecipientStatus } from '@/types/docusign'

// =============================================================================
// Types
// =============================================================================

export interface DocuSignEnvelopeStatusBadgeProps {
  documentType: DSDocumentType
  documentId: string
  className?: string
  showActions?: boolean
  compact?: boolean
}

interface StatusConfig {
  label: string
  icon: typeof Clock
  color: string
  bgColor: string
}

// =============================================================================
// Component
// =============================================================================

export function DocuSignEnvelopeStatusBadge({
  documentType,
  documentId,
  className,
  showActions = true,
  compact = false,
}: DocuSignEnvelopeStatusBadgeProps) {
  const { data: envelope, isLoading, refetch } = useDocuSignEnvelopeByDocument(
    documentType,
    documentId
  )
  const resendMutation = useResendDocuSignEnvelope()
  const voidMutation = useVoidDocuSignEnvelope()

  const [isRefreshing, setIsRefreshing] = useState(false)

  // No envelope = no DocuSign request yet
  if (!envelope && !isLoading) {
    return null
  }

  if (isLoading) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && 'Loading...'}
      </Badge>
    )
  }

  const statusConfig = getStatusConfig(envelope!.status)
  const StatusIcon = statusConfig.icon

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  const handleResend = async () => {
    if (!envelope) {return}
    await resendMutation.mutateAsync({
      envelope_db_id: envelope.id,
    })
  }

  const handleVoid = async () => {
    if (!envelope) {return}
    if (!confirm('Are you sure you want to void this signature request?')) {return}
    await voidMutation.mutateAsync({
      envelope_db_id: envelope.id,
      void_reason: 'Voided by user',
    })
  }

  // Compact badge (no popover)
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              className={cn(
                'gap-1 cursor-default',
                statusConfig.bgColor,
                statusConfig.color,
                className
              )}
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>DocuSign: {statusConfig.label}</p>
            {envelope?.sent_at && (
              <p className="text-xs text-muted">
                Sent {format(new Date(envelope.sent_at), 'MMM d, yyyy')}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full badge with popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          className={cn(
            'gap-1 cursor-pointer hover:opacity-80 transition-opacity',
            statusConfig.bgColor,
            statusConfig.color,
            className
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {statusConfig.label}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              <span className="font-medium">DocuSign Status</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>

          {/* Status */}
          <div className="p-3 rounded-lg bg-surface border">
            <div className="flex items-center gap-2">
              <StatusIcon className={cn('h-5 w-5', statusConfig.color)} />
              <div>
                <p className="font-medium">{statusConfig.label}</p>
                {envelope?.sent_at && (
                  <p className="text-xs text-muted">
                    Sent {format(new Date(envelope.sent_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
                {envelope?.completed_at && (
                  <p className="text-xs text-success">
                    Completed {format(new Date(envelope.completed_at), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recipients */}
          {envelope?.recipients && envelope.recipients.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-secondary">Recipients</p>
              <div className="space-y-2">
                {envelope.recipients.map((recipient) => {
                  const recipientStatus = getRecipientStatusConfig(recipient.status)
                  const RecipientIcon = recipientStatus.icon
                  return (
                    <div
                      key={recipient.id}
                      className="flex items-center justify-between p-2 rounded bg-surface"
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-disabled" />
                        <div>
                          <p className="text-sm font-medium">{recipient.name}</p>
                          <p className="text-xs text-muted">{recipient.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', recipientStatus.color)}
                      >
                        <RecipientIcon className="h-3 w-3 mr-1" />
                        {recipientStatus.label}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          {showActions && envelope?.status === 'sent' && (
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={resendMutation.isPending}
                className="flex-1"
              >
                {resendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Resend
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVoid}
                disabled={voidMutation.isPending}
                className="flex-1 text-error hover:text-error hover:bg-error-light"
              >
                {voidMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    Void
                  </>
                )}
              </Button>
            </div>
          )}

          {/* DocuSign link */}
          {envelope?.docusign_envelope_id && (
            <div className="pt-2 border-t">
              <a
                href={`https://app.docusign.com/documents/details/${envelope.docusign_envelope_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover"
              >
                View in DocuSign
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStatusConfig(status: DSEnvelopeStatus): StatusConfig {
  const configs: Record<DSEnvelopeStatus, StatusConfig> = {
    created: {
      label: 'Draft',
      icon: Clock,
      color: 'text-secondary',
      bgColor: 'bg-muted',
    },
    sent: {
      label: 'Awaiting Signature',
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning-light',
    },
    delivered: {
      label: 'Delivered',
      icon: Clock,
      color: 'text-info',
      bgColor: 'bg-info-light',
    },
    completed: {
      label: 'Signed',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-light',
    },
    declined: {
      label: 'Declined',
      icon: XCircle,
      color: 'text-error',
      bgColor: 'bg-error-light',
    },
    voided: {
      label: 'Voided',
      icon: AlertTriangle,
      color: 'text-secondary',
      bgColor: 'bg-muted',
    },
  }

  return configs[status] || configs.created
}

function getRecipientStatusConfig(status: DSRecipientStatus): StatusConfig {
  const configs: Record<DSRecipientStatus, StatusConfig> = {
    created: {
      label: 'Pending',
      icon: Clock,
      color: 'text-secondary',
      bgColor: 'bg-muted',
    },
    sent: {
      label: 'Sent',
      icon: Send,
      color: 'text-info',
      bgColor: 'bg-info-light',
    },
    delivered: {
      label: 'Delivered',
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning-light',
    },
    signed: {
      label: 'Signed',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-light',
    },
    completed: {
      label: 'Complete',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-light',
    },
    declined: {
      label: 'Declined',
      icon: XCircle,
      color: 'text-error',
      bgColor: 'bg-error-light',
    },
    authentication_failed: {
      label: 'Auth Failed',
      icon: AlertTriangle,
      color: 'text-error',
      bgColor: 'bg-error-light',
    },
    auto_responded: {
      label: 'Auto Responded',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-light',
    },
  }

  return configs[status] || configs.created
}

export default DocuSignEnvelopeStatusBadge
