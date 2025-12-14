/**
 * DocuSign Request Dialog
 *
 * Dialog for sending documents to DocuSign for signature.
 * Supports payment applications, change orders, and lien waivers.
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  FileSignature,
  Send,
  Plus,
  Trash2,
  User,
  Mail,
  Building2,
  AlertTriangle,
  Loader2,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useDocuSignConnectionStatus,
  useCreatePaymentApplicationEnvelope,
  useCreateChangeOrderEnvelope,
  useCreateLienWaiverEnvelope,
} from '../hooks/useDocuSign'
import type {
  DSDocumentType,
  PaymentApplicationSigningConfig,
  ChangeOrderSigningConfig,
  LienWaiverSigningConfig,
} from '@/types/docusign'

// =============================================================================
// Types
// =============================================================================

export interface Signer {
  email: string
  name: string
  title?: string
  company?: string
  role: string
}

export interface DocuSignRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  // Document info
  documentType: DSDocumentType
  documentId: string
  documentName: string
  documentNumber?: string

  // Pre-configured signers (optional)
  defaultSigners?: Signer[]

  // Callbacks
  onSuccess?: (envelopeId: string) => void
}

// =============================================================================
// Component
// =============================================================================

export function DocuSignRequestDialog({
  open,
  onOpenChange,
  documentType,
  documentId,
  documentName,
  documentNumber,
  defaultSigners = [],
  onSuccess,
}: DocuSignRequestDialogProps) {
  // Connection status
  const { data: connectionStatus } = useDocuSignConnectionStatus()

  // Mutations for different document types
  const payAppMutation = useCreatePaymentApplicationEnvelope()
  const changeOrderMutation = useCreateChangeOrderEnvelope()
  const lienWaiverMutation = useCreateLienWaiverEnvelope()

  // Form state
  const [signers, setSigners] = useState<Signer[]>(defaultSigners)
  const [ccRecipients, setCcRecipients] = useState<{ email: string; name: string }[]>([])
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [enableSigningOrder, setEnableSigningOrder] = useState(true)
  const [enableReminders, setEnableReminders] = useState(true)

  // Initialize signers based on document type
  useEffect(() => {
    if (open) {
      if (defaultSigners.length > 0) {
        setSigners(defaultSigners)
      } else {
        // Set default signers based on document type
        const defaults = getDefaultSigners(documentType)
        setSigners(defaults)
      }

      // Set default subject
      const docTypeLabel = getDocumentTypeLabel(documentType)
      setSubject(`${docTypeLabel} ${documentNumber || ''} - Signature Request`.trim())
      setMessage(getDefaultMessage(documentType))
    }
  }, [open, documentType, documentNumber, defaultSigners])

  const isLoading = payAppMutation.isPending ||
    changeOrderMutation.isPending ||
    lienWaiverMutation.isPending

  // Add new signer
  const addSigner = () => {
    setSigners([
      ...signers,
      { email: '', name: '', role: 'Signer' },
    ])
  }

  // Remove signer
  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index))
  }

  // Update signer
  const updateSigner = (index: number, field: keyof Signer, value: string) => {
    const updated = [...signers]
    updated[index] = { ...updated[index], [field]: value }
    setSigners(updated)
  }

  // Move signer up/down
  const moveSigner = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === signers.length - 1) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const updated = [...signers]
    ;[updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
    setSigners(updated)
  }

  // Add CC recipient
  const addCCRecipient = () => {
    setCcRecipients([...ccRecipients, { email: '', name: '' }])
  }

  // Remove CC recipient
  const removeCCRecipient = (index: number) => {
    setCcRecipients(ccRecipients.filter((_, i) => i !== index))
  }

  // Validation
  const isValid = () => {
    return signers.length > 0 &&
      signers.every(s => s.email.trim() && s.name.trim()) &&
      subject.trim()
  }

  // Handle send
  const handleSend = async () => {
    if (!isValid()) return

    const validCCs = ccRecipients.filter(cc => cc.email.trim() && cc.name.trim())

    try {
      let envelopeId: string | undefined

      if (documentType === 'payment_application') {
        const config: PaymentApplicationSigningConfig = {
          payment_application_id: documentId,
          contractor_signer: {
            email: signers[0]?.email || '',
            name: signers[0]?.name || '',
            title: signers[0]?.title,
          },
          architect_signer: signers[1] ? {
            email: signers[1].email,
            name: signers[1].name,
            title: signers[1].title,
          } : undefined,
          owner_signer: signers[2] ? {
            email: signers[2].email,
            name: signers[2].name,
            title: signers[2].title,
          } : undefined,
          cc_recipients: validCCs,
        }
        const result = await payAppMutation.mutateAsync(config)
        envelopeId = result.id
      } else if (documentType === 'change_order') {
        const config: ChangeOrderSigningConfig = {
          change_order_id: documentId,
          contractor_signer: {
            email: signers[0]?.email || '',
            name: signers[0]?.name || '',
            title: signers[0]?.title,
          },
          owner_signer: {
            email: signers[1]?.email || '',
            name: signers[1]?.name || '',
            title: signers[1]?.title,
          },
          cc_recipients: validCCs,
        }
        const result = await changeOrderMutation.mutateAsync(config)
        envelopeId = result.id
      } else if (documentType === 'lien_waiver') {
        const config: LienWaiverSigningConfig = {
          lien_waiver_id: documentId,
          claimant_signer: {
            email: signers[0]?.email || '',
            name: signers[0]?.name || '',
            title: signers[0]?.title,
            company: signers[0]?.company,
          },
          notary_required: signers.length > 1,
          notary_signer: signers[1] ? {
            email: signers[1].email,
            name: signers[1].name,
          } : undefined,
          cc_recipients: validCCs,
        }
        const result = await lienWaiverMutation.mutateAsync(config)
        envelopeId = result.id
      }

      if (envelopeId && onSuccess) {
        onSuccess(envelopeId)
      }
      onOpenChange(false)
    } catch (error) {
      // Error handled by mutation
      console.error('Failed to create envelope:', error)
    }
  }

  // Check connection
  if (!connectionStatus?.isConnected) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              DocuSign Not Connected
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Please connect your DocuSign account in Settings before sending documents for signature.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-blue-600" />
            Send for Signature
          </DialogTitle>
          <DialogDescription>
            Send <strong>{documentName}</strong> to DocuSign for electronic signature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Subject & Message */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Signature request subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Email Message (Optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message to include in the email..."
                rows={3}
              />
            </div>
          </div>

          {/* Signers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Signers</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSigner}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Signer
              </Button>
            </div>

            {signers.length === 0 ? (
              <div className="text-center py-4 text-gray-500 border-2 border-dashed rounded-lg">
                <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No signers added</p>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={addSigner}
                >
                  Add a signer
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {signers.map((signer, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {enableSigningOrder && (
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={() => moveSigner(index, 'up')}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSigner(index, 'down')}
                              disabled={index === signers.length - 1}
                              className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        <Badge variant="secondary">
                          {enableSigningOrder ? `Signer ${index + 1}` : 'Signer'}
                        </Badge>
                        <span className="text-sm text-gray-500">{signer.role}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSigner(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            value={signer.name}
                            onChange={(e) => updateSigner(index, 'name', e.target.value)}
                            placeholder="John Smith"
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="email"
                            value={signer.email}
                            onChange={(e) => updateSigner(index, 'email', e.target.value)}
                            placeholder="john@example.com"
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Title</Label>
                        <Input
                          value={signer.title || ''}
                          onChange={(e) => updateSigner(index, 'title', e.target.value)}
                          placeholder="Project Manager"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Role</Label>
                        <Input
                          value={signer.role}
                          onChange={(e) => updateSigner(index, 'role', e.target.value)}
                          placeholder="Contractor"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CC Recipients (Accordion) */}
          <Accordion type="single" collapsible>
            <AccordionItem value="cc" className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  CC Recipients ({ccRecipients.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <p className="text-sm text-gray-500 mb-3">
                  These recipients will receive a copy of the signed document but don't need to sign.
                </p>
                {ccRecipients.map((cc, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <Input
                      value={cc.name}
                      onChange={(e) => {
                        const updated = [...ccRecipients]
                        updated[index].name = e.target.value
                        setCcRecipients(updated)
                      }}
                      placeholder="Name"
                      className="flex-1"
                    />
                    <Input
                      type="email"
                      value={cc.email}
                      onChange={(e) => {
                        const updated = [...ccRecipients]
                        updated[index].email = e.target.value
                        setCcRecipients(updated)
                      }}
                      placeholder="Email"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCCRecipient(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCCRecipient}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add CC
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Options */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-base font-semibold">Options</Label>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="signing-order">Enable Signing Order</Label>
                <p className="text-xs text-gray-500">
                  Signers must sign in the specified order
                </p>
              </div>
              <Switch
                id="signing-order"
                checked={enableSigningOrder}
                onCheckedChange={setEnableSigningOrder}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reminders">Send Reminders</Label>
                <p className="text-xs text-gray-500">
                  Automatically remind signers who haven't signed
                </p>
              </div>
              <Switch
                id="reminders"
                checked={enableReminders}
                onCheckedChange={setEnableReminders}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={!isValid() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send for Signature
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getDefaultSigners(documentType: DSDocumentType): Signer[] {
  switch (documentType) {
    case 'payment_application':
      return [
        { email: '', name: '', role: 'Contractor' },
        { email: '', name: '', role: 'Architect' },
        { email: '', name: '', role: 'Owner' },
      ]
    case 'change_order':
      return [
        { email: '', name: '', role: 'Contractor' },
        { email: '', name: '', role: 'Owner' },
      ]
    case 'lien_waiver':
      return [
        { email: '', name: '', role: 'Claimant' },
      ]
    default:
      return [{ email: '', name: '', role: 'Signer' }]
  }
}

function getDocumentTypeLabel(documentType: DSDocumentType): string {
  const labels: Record<DSDocumentType, string> = {
    payment_application: 'Payment Application',
    change_order: 'Change Order',
    lien_waiver: 'Lien Waiver',
    contract: 'Contract',
    subcontract: 'Subcontract',
    other: 'Document',
  }
  return labels[documentType] || 'Document'
}

function getDefaultMessage(documentType: DSDocumentType): string {
  switch (documentType) {
    case 'payment_application':
      return 'Please review and sign the attached payment application (AIA G702/G703). Your signature is required to process this payment request.'
    case 'change_order':
      return 'Please review and sign the attached change order. Your signature is required to approve this change to the contract.'
    case 'lien_waiver':
      return 'Please review and sign the attached lien waiver. Your signature is required to release lien rights for the payment received.'
    default:
      return 'Please review and sign the attached document.'
  }
}

export default DocuSignRequestDialog
