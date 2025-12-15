/**
 * DocuSign Envelope Status Component
 *
 * Displays the current status of a DocuSign envelope for a document.
 * Shows recipient progress, signing status, and actions.
 */

import { useState } from 'react'
import {
  useDocuSignEnvelopeByDocument,
  useGetSigningUrl,
  useVoidDocuSignEnvelope,
  useResendDocuSignEnvelope,
} from '../hooks/useDocuSign'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  FileSignature,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  RefreshCw,
  Ban,
  ExternalLink,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'
import type { DSDocumentType, DSEnvelope, DSEnvelopeRecipient } from '@/types/docusign'
import { getEnvelopeStatusConfig, isEnvelopeTerminal, canVoidEnvelope } from '@/types/docusign'

// =============================================================================
// Types
// =============================================================================

export interface DocuSignEnvelopeStatusProps {
  documentType: DSDocumentType
  documentId: string
  compact?: boolean
  onSendNew?: () => void
}

// =============================================================================
// Component
// =============================================================================

export function DocuSignEnvelopeStatus({
  documentType,
  documentId,
  compact = false,
  onSendNew,
}: DocuSignEnvelopeStatusProps) {
  const [showVoidDialog, setShowVoidDialog] = useState(false)

  const { data: envelope, isLoading, refetch } = useDocuSignEnvelopeByDocument(
    documentType,
    documentId
  )

  const signingUrlMutation = useGetSigningUrl()
  const voidMutation = useVoidDocuSignEnvelope()
  const resendMutation = useResendDocuSignEnvelope()

  // No envelope found - show send button
  if (!isLoading && !envelope) {
    if (compact) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={onSendNew}
          className="gap-1"
        >
          <FileSignature className="h-4 w-4" />
          Send for Signature
        </Button>
      )
    }

    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center">
            <FileSignature className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 mb-3">
              This document hasn't been sent for signature yet.
            </p>
            {onSendNew && (
              <Button onClick={onSendNew}>
                <Send className="h-4 w-4 mr-2" />
                Send for Signature
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return compact ? (
      <Badge variant="secondary">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Loading...
      </Badge>
    ) : (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading envelope status...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!envelope) {return null}

  const statusConfig = getEnvelopeStatusConfig(envelope.status)
  const recipients = envelope.recipients || []
  const signers = recipients.filter(r => r.recipient_type === 'signer')
  const signedCount = signers.filter(s => s.status === 'signed' || s.status === 'completed').length
  const progress = signers.length > 0 ? (signedCount / signers.length) * 100 : 0

  // Handle void
  const handleVoid = () => {
    voidMutation.mutate(
      { envelope_id: envelope.envelope_id, reason: 'Voided by user' },
      { onSuccess: () => setShowVoidDialog(false) }
    )
  }

  // Handle resend
  const handleResend = () => {
    resendMutation.mutate({ envelope_id: envelope.envelope_id })
  }

  // Compact mode - just show badge
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={envelope.status === 'completed' ? 'default' : 'secondary'}
              className={cn(
                'gap-1 cursor-pointer',
                envelope.status === 'completed' && 'bg-green-100 text-green-700 hover:bg-green-200',
                envelope.status === 'declined' && 'bg-red-100 text-red-700'
              )}
            >
              {envelope.status === 'completed' ? (
                <CheckCircle className="h-3 w-3" />
              ) : envelope.status === 'declined' ? (
                <XCircle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {statusConfig.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{signedCount} of {signers.length} signed</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full card view
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-blue-600" />
                Signature Status
              </CardTitle>
              <CardDescription>
                Sent {formatDate(envelope.sent_at || envelope.created_at)}
              </CardDescription>
            </div>
            <Badge
              variant={envelope.status === 'completed' ? 'default' : 'secondary'}
              className={cn(
                envelope.status === 'completed' && 'bg-green-100 text-green-700',
                envelope.status === 'declined' && 'bg-red-100 text-red-700'
              )}
            >
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress bar */}
          {!isEnvelopeTerminal(envelope.status) && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Signing Progress</span>
                <span className="font-medium">{signedCount} / {signers.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Recipients list */}
          <div className="space-y-2">
            {signers.map((recipient, index) => (
              <RecipientRow key={recipient.id} recipient={recipient} index={index} />
            ))}
          </div>

          {/* Completed message */}
          {envelope.status === 'completed' && envelope.completed_at && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>
                Completed on {formatDate(envelope.completed_at)}
              </span>
            </div>
          )}

          {/* Declined message */}
          {envelope.status === 'declined' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <XCircle className="h-5 w-5" />
              <span>
                This envelope was declined by a recipient.
              </span>
            </div>
          )}

          {/* Voided message */}
          {envelope.status === 'voided' && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              <Ban className="h-5 w-5" />
              <span>
                This envelope was voided.
                {envelope.void_reason && ` Reason: ${envelope.void_reason}`}
              </span>
            </div>
          )}

          {/* Actions */}
          {!isEnvelopeTerminal(envelope.status) && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                disabled={resendMutation.isPending}
              >
                {resendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Resend
              </Button>

              {canVoidEnvelope(envelope.status) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVoidDialog(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Void
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Send new after terminal */}
          {isEnvelopeTerminal(envelope.status) && onSendNew && (
            <div className="pt-2 border-t">
              <Button onClick={onSendNew} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Send New Request
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Void confirmation dialog */}
      <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Envelope?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the signature request. Recipients will no longer
              be able to sign this document. You can send a new request afterward.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              className="bg-red-600 hover:bg-red-700"
              disabled={voidMutation.isPending}
            >
              {voidMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Void Envelope
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// =============================================================================
// Sub-components
// =============================================================================

function RecipientRow({
  recipient,
  index,
}: {
  recipient: DSEnvelopeRecipient
  index: number
}) {
  const isSigned = recipient.status === 'signed' || recipient.status === 'completed'
  const isDeclined = recipient.status === 'declined'
  const isPending = ['created', 'sent', 'delivered'].includes(recipient.status)

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
        isSigned && 'bg-green-100 text-green-700',
        isDeclined && 'bg-red-100 text-red-700',
        isPending && 'bg-gray-100 text-gray-700'
      )}>
        {isSigned ? (
          <CheckCircle className="h-4 w-4" />
        ) : isDeclined ? (
          <XCircle className="h-4 w-4" />
        ) : (
          index + 1
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {recipient.name}
          {recipient.role_name && (
            <span className="text-gray-500 font-normal ml-2">
              ({recipient.role_name})
            </span>
          )}
        </p>
        <p className="text-xs text-gray-500 truncate">{recipient.email}</p>
      </div>

      <div className="text-right">
        {isSigned && recipient.signed_at && (
          <p className="text-xs text-green-600">
            Signed {formatDate(recipient.signed_at)}
          </p>
        )}
        {isDeclined && (
          <p className="text-xs text-red-600">
            Declined
            {recipient.decline_reason && (
              <span className="block text-gray-500">{recipient.decline_reason}</span>
            )}
          </p>
        )}
        {isPending && (
          <Badge variant="secondary" className="text-xs">
            {recipient.status === 'delivered' ? 'Viewed' : 'Pending'}
          </Badge>
        )}
      </div>
    </div>
  )
}

export default DocuSignEnvelopeStatus
