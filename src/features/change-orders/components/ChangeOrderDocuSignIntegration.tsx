/**
 * ChangeOrderDocuSignIntegration Component
 *
 * Integrates DocuSign e-signature capability with Change Order workflow.
 * Provides a complete signing experience with:
 * - DocuSign connection status check
 * - Envelope creation for contractor + owner signatures
 * - Status tracking and display
 * - Fallback to manual signature capture
 *
 * This component is designed to be used alongside or as a replacement
 * for the manual ChangeOrderSignatureBlock component.
 */

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  DollarSign,
  User,
  Building,
  Mail,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import {
  useDocuSignConnectionStatus,
  useCreateChangeOrderEnvelope,
  useDocuSignEnvelopeByDocument,
  useVoidDocuSignEnvelope,
  useResendDocuSignEnvelope,
} from '@/features/docusign/hooks/useDocuSign'
import { DocuSignEnvelopeStatusBadge } from '@/features/docusign/components/DocuSignEnvelopeStatusBadge'
import type { ChangeOrder } from '@/types/change-order'
import type { ChangeOrderSigningConfig, DSEnvelope } from '@/types/docusign'

// =============================================
// Types
// =============================================

interface SignerInfo {
  email: string
  name: string
  title?: string
}

interface ChangeOrderDocuSignIntegrationProps {
  changeOrder: ChangeOrder
  /** Pre-filled contractor signer info */
  contractorSigner?: SignerInfo
  /** Pre-filled owner signer info */
  ownerSigner?: SignerInfo
  /** Called when envelope is created successfully */
  onEnvelopeCreated?: (envelopeId: string) => void
  /** Called when signing is complete */
  onSigningComplete?: () => void
  /** Show compact version */
  compact?: boolean
  /** Disable all actions */
  disabled?: boolean
}

// =============================================
// Signer Input Dialog
// =============================================

interface SignerInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  changeOrder: ChangeOrder
  defaultContractor?: SignerInfo
  defaultOwner?: SignerInfo
  onSubmit: (config: ChangeOrderSigningConfig) => void
  isLoading: boolean
}

function SignerInputDialog({
  open,
  onOpenChange,
  changeOrder,
  defaultContractor,
  defaultOwner,
  onSubmit,
  isLoading,
}: SignerInputDialogProps) {
  const [contractorEmail, setContractorEmail] = useState(defaultContractor?.email || '')
  const [contractorName, setContractorName] = useState(defaultContractor?.name || '')
  const [contractorTitle, setContractorTitle] = useState(defaultContractor?.title || '')

  const [ownerEmail, setOwnerEmail] = useState(defaultOwner?.email || '')
  const [ownerName, setOwnerName] = useState(defaultOwner?.name || '')
  const [ownerTitle, setOwnerTitle] = useState(defaultOwner?.title || '')

  const isValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return (
      emailRegex.test(contractorEmail) &&
      contractorName.trim().length > 0 &&
      emailRegex.test(ownerEmail) &&
      ownerName.trim().length > 0
    )
  }, [contractorEmail, contractorName, ownerEmail, ownerName])

  const handleSubmit = () => {
    if (!isValid) {return}

    onSubmit({
      change_order_id: changeOrder.id,
      contractor_signer: {
        email: contractorEmail.trim(),
        name: contractorName.trim(),
        title: contractorTitle.trim() || undefined,
      },
      owner_signer: {
        email: ownerEmail.trim(),
        name: ownerName.trim(),
        title: ownerTitle.trim() || undefined,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Send Change Order for Signature
          </DialogTitle>
          <DialogDescription>
            Enter the email addresses and names for the contractor and owner signers.
            They will receive a DocuSign email to sign the change order.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Change Order Summary */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono">{changeOrder.number}</Badge>
              <span className="text-muted-foreground">|</span>
              <span>{changeOrder.title}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                ${(changeOrder.proposed_amount || 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {changeOrder.proposed_days || 0} days
              </div>
            </div>
          </div>

          {/* Contractor Signer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <Label className="text-base font-semibold">Contractor Signer</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="contractor-name" className="text-xs text-muted-foreground">
                  Full Name *
                </Label>
                <Input
                  id="contractor-name"
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="contractor-title" className="text-xs text-muted-foreground">
                  Title
                </Label>
                <Input
                  id="contractor-title"
                  value={contractorTitle}
                  onChange={(e) => setContractorTitle(e.target.value)}
                  placeholder="Project Manager"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="contractor-email" className="text-xs text-muted-foreground">
                Email Address *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contractor-email"
                  type="email"
                  value={contractorEmail}
                  onChange={(e) => setContractorEmail(e.target.value)}
                  placeholder="contractor@company.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Owner Signer */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Building className="h-4 w-4 text-purple-600" />
              </div>
              <Label className="text-base font-semibold">Owner Signer</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="owner-name" className="text-xs text-muted-foreground">
                  Full Name *
                </Label>
                <Input
                  id="owner-name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Jane Owner"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="owner-title" className="text-xs text-muted-foreground">
                  Title
                </Label>
                <Input
                  id="owner-title"
                  value={ownerTitle}
                  onChange={(e) => setOwnerTitle(e.target.value)}
                  placeholder="Property Owner"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="owner-email" className="text-xs text-muted-foreground">
                Email Address *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="owner-email"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@company.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send for Signature
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// Envelope Status Display
// =============================================

interface EnvelopeStatusDisplayProps {
  envelope: DSEnvelope
  onVoid?: () => void
  onResend?: () => void
  isVoiding?: boolean
  isResending?: boolean
}

function EnvelopeStatusDisplay({
  envelope,
  onVoid,
  onResend,
  isVoiding,
  isResending,
}: EnvelopeStatusDisplayProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'sent':
        return { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Send, label: 'Sent' }
      case 'delivered':
        return { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'Delivered' }
      case 'signed':
        return { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Signed' }
      case 'completed':
        return { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Completed' }
      case 'declined':
        return { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Declined' }
      case 'voided':
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: XCircle, label: 'Voided' }
      default:
        return { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock, label: status }
    }
  }

  const config = getStatusConfig(envelope.status)
  const StatusIcon = config.icon
  const canVoid = ['sent', 'delivered'].includes(envelope.status)
  const canResend = ['sent', 'delivered'].includes(envelope.status)

  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className={cn(
        'flex items-center justify-between p-4 rounded-lg border',
        config.color
      )}>
        <div className="flex items-center gap-3">
          <StatusIcon className="h-5 w-5" />
          <div>
            <p className="font-medium">DocuSign: {config.label}</p>
            {envelope.sent_at && (
              <p className="text-sm opacity-80">
                Sent {format(new Date(envelope.sent_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        </div>
        {envelope.status === 'completed' && (
          <CheckCircle className="h-6 w-6 text-green-600" />
        )}
      </div>

      {/* Recipients */}
      {envelope.recipients && envelope.recipients.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Signers</Label>
          <div className="space-y-2">
            {envelope.recipients
              .filter(r => r.recipient_type === 'signer')
              .map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center',
                      recipient.status === 'completed' || recipient.status === 'signed'
                        ? 'bg-green-100'
                        : 'bg-gray-100'
                    )}>
                      <User className={cn(
                        'h-4 w-4',
                        recipient.status === 'completed' || recipient.status === 'signed'
                          ? 'text-green-600'
                          : 'text-gray-500'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{recipient.name}</p>
                      <p className="text-xs text-muted-foreground">{recipient.email}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      recipient.status === 'completed' || recipient.status === 'signed'
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-gray-300'
                    )}
                  >
                    {recipient.status === 'completed' || recipient.status === 'signed'
                      ? 'Signed'
                      : recipient.status}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {(canVoid || canResend) && (
        <div className="flex gap-2 pt-2">
          {canResend && onResend && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResend}
              disabled={isResending}
              className="gap-1"
            >
              {isResending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Resend
            </Button>
          )}
          {canVoid && onVoid && (
            <Button
              variant="outline"
              size="sm"
              onClick={onVoid}
              disabled={isVoiding}
              className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              {isVoiding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Void
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// Main Component
// =============================================

export function ChangeOrderDocuSignIntegration({
  changeOrder,
  contractorSigner,
  ownerSigner,
  onEnvelopeCreated,
  onSigningComplete,
  compact = false,
  disabled = false,
}: ChangeOrderDocuSignIntegrationProps) {
  const [showSignerDialog, setShowSignerDialog] = useState(false)
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)

  // DocuSign hooks
  const { data: connectionStatus, isLoading: connectionLoading } = useDocuSignConnectionStatus()
  const { data: existingEnvelope, isLoading: envelopeLoading, refetch: refetchEnvelope } =
    useDocuSignEnvelopeByDocument('change_order', changeOrder.id)
  const createEnvelope = useCreateChangeOrderEnvelope()
  const voidEnvelope = useVoidDocuSignEnvelope()
  const resendEnvelope = useResendDocuSignEnvelope()

  const isConnected = connectionStatus?.isConnected
  const isLoading = connectionLoading || envelopeLoading

  // Handle create envelope
  const handleCreateEnvelope = async (config: ChangeOrderSigningConfig) => {
    try {
      const result = await createEnvelope.mutateAsync(config)
      setShowSignerDialog(false)
      refetchEnvelope()
      onEnvelopeCreated?.(result.id)
    } catch (error) {
      logger.error('Failed to create DocuSign envelope:', error)
    }
  }

  // Handle void envelope
  const handleVoidEnvelope = async () => {
    if (!existingEnvelope) {return}

    try {
      await voidEnvelope.mutateAsync({
        envelope_id: existingEnvelope.id,
        reason: 'Voided by user',
      })
      setShowVoidConfirm(false)
      refetchEnvelope()
    } catch (error) {
      logger.error('Failed to void envelope:', error)
    }
  }

  // Handle resend envelope
  const handleResendEnvelope = async () => {
    if (!existingEnvelope) {return}

    try {
      await resendEnvelope.mutateAsync({
        envelope_id: existingEnvelope.id,
      })
      refetchEnvelope()
    } catch (error) {
      logger.error('Failed to resend envelope:', error)
    }
  }

  // Check if signing is complete
  if (existingEnvelope?.status === 'completed') {
    onSigningComplete?.()
  }

  // Compact mode - just show status or send button
  if (compact) {
    if (existingEnvelope) {
      return (
        <DocuSignEnvelopeStatusBadge
          documentType="change_order"
          documentId={changeOrder.id}
          showActions={true}
        />
      )
    }

    if (!isConnected) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <AlertTriangle className="h-3 w-3 mr-1" />
          DocuSign not connected
        </Badge>
      )
    }

    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowSignerDialog(true)}
        disabled={disabled || isLoading}
        className="gap-2"
      >
        <FileSignature className="h-4 w-4" />
        Send via DocuSign
      </Button>
    )
  }

  // Full card view
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              DocuSign E-Signature
            </CardTitle>
            <CardDescription>
              Send this change order for electronic signature via DocuSign
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isConnected ? (
          /* Not Connected State */
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">DocuSign Not Connected</p>
                <p className="text-sm text-amber-700 mt-1">
                  Connect your DocuSign account in Settings to send change orders for e-signature.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => {
                    // Navigate to settings - this would need a router
                    window.location.href = '/settings/integrations'
                  }}
                >
                  <Settings className="h-4 w-4" />
                  Go to Settings
                </Button>
              </div>
            </div>
          </div>
        ) : existingEnvelope ? (
          /* Existing Envelope State */
          <EnvelopeStatusDisplay
            envelope={existingEnvelope}
            onVoid={() => setShowVoidConfirm(true)}
            onResend={handleResendEnvelope}
            isVoiding={voidEnvelope.isPending}
            isResending={resendEnvelope.isPending}
          />
        ) : (
          /* Ready to Send State */
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileSignature className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Ready to Send</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Send this change order to the contractor and owner for electronic signatures.
                    Both parties will receive a DocuSign email with a link to sign.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowSignerDialog(true)}
              disabled={disabled}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              Send for Signature
            </Button>
          </div>
        )}
      </CardContent>

      {/* Signer Input Dialog */}
      <SignerInputDialog
        open={showSignerDialog}
        onOpenChange={setShowSignerDialog}
        changeOrder={changeOrder}
        defaultContractor={contractorSigner}
        defaultOwner={ownerSigner}
        onSubmit={handleCreateEnvelope}
        isLoading={createEnvelope.isPending}
      />

      {/* Void Confirmation Dialog */}
      <AlertDialog open={showVoidConfirm} onOpenChange={setShowVoidConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void DocuSign Envelope?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the signature request and notify all recipients.
              You can create a new signature request afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidEnvelope}
              className="bg-destructive hover:bg-destructive/90"
            >
              Void Envelope
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default ChangeOrderDocuSignIntegration
