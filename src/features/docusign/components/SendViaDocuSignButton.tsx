/**
 * Send via DocuSign Button
 *
 * A button component that opens the DocuSign request dialog
 * for sending documents for electronic signature.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileSignature, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDocuSignConnectionStatus, useDocuSignEnvelopeByDocument } from '../hooks/useDocuSign'
import { DocuSignRequestDialog, type Signer } from './DocuSignRequestDialog'
import { DocuSignEnvelopeStatusBadge } from './DocuSignEnvelopeStatusBadge'
import type { DSDocumentType } from '@/types/docusign'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// =============================================================================
// Types
// =============================================================================

export interface SendViaDocuSignButtonProps {
  documentType: DSDocumentType
  documentId: string
  documentName: string
  documentNumber?: string
  defaultSigners?: Signer[]
  onSuccess?: (envelopeId: string) => void
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  showStatusBadge?: boolean
  disabled?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function SendViaDocuSignButton({
  documentType,
  documentId,
  documentName,
  documentNumber,
  defaultSigners = [],
  onSuccess,
  className,
  variant = 'outline',
  size = 'default',
  showStatusBadge = true,
  disabled = false,
}: SendViaDocuSignButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  // Check DocuSign connection status
  const { data: connectionStatus, isLoading: connectionLoading } = useDocuSignConnectionStatus()

  // Check if there's already an envelope for this document
  const { data: existingEnvelope, isLoading: envelopeLoading } = useDocuSignEnvelopeByDocument(
    documentType,
    documentId
  )

  const isLoading = connectionLoading || envelopeLoading
  const isConnected = connectionStatus?.isConnected

  // If there's already an envelope, show status badge
  if (existingEnvelope && showStatusBadge) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <DocuSignEnvelopeStatusBadge
          documentType={documentType}
          documentId={documentId}
          showActions={true}
        />
      </div>
    )
  }

  // Not connected - show disabled button with tooltip
  if (!isConnected && !isLoading) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn('inline-flex', className)}>
              <Button
                variant={variant}
                size={size}
                disabled
                className="gap-2 opacity-50"
              >
                <AlertTriangle className="h-4 w-4" />
                DocuSign
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>DocuSign not connected. Go to Settings to connect.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        disabled={disabled || isLoading}
        className={cn('gap-2', className)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSignature className="h-4 w-4" />
        )}
        Send via DocuSign
      </Button>

      <DocuSignRequestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        documentType={documentType}
        documentId={documentId}
        documentName={documentName}
        documentNumber={documentNumber}
        defaultSigners={defaultSigners}
        onSuccess={onSuccess}
      />
    </>
  )
}

export default SendViaDocuSignButton
