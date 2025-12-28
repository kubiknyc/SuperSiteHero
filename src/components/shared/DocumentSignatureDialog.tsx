/**
 * DocumentSignatureDialog - Reusable signature capture dialog for financial documents
 *
 * Used for:
 * - Payment Applications (contractor, architect, owner signatures)
 * - Change Orders (owner signature)
 * - Lien Waivers (claimant signature)
 *
 * Supports both internal canvas signature and future DocuSign integration
 */

import { useState, useRef, useEffect, useCallback } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PenTool,
  Save,
  X,
  Loader2,
  FileSignature,
  Mail,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import {
  useDocuSignConnectionStatus,
  useCreatePaymentApplicationEnvelope,
  useCreateChangeOrderEnvelope,
  useCreateLienWaiverEnvelope,
} from '@/features/docusign/hooks/useDocuSign'
import type { DSDocumentType } from '@/types/docusign'
import { logger } from '../../lib/utils/logger';


// =============================================================================
// Types
// =============================================================================

export type SignatureRole =
  | 'contractor'
  | 'architect'
  | 'owner'
  | 'claimant'
  | 'internal_approver'
  | 'notary'

export interface SignatureData {
  signatureUrl: string
  signedBy: string
  signedAt: string
  title?: string
  company?: string
  role: SignatureRole
}

export interface DocumentSignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  // Document context
  documentType: 'payment_application' | 'change_order' | 'lien_waiver'
  documentId: string
  documentName: string

  // Signature role
  role: SignatureRole
  roleLabel?: string

  // Pre-fill signer info
  defaultSignerName?: string
  defaultSignerTitle?: string
  defaultSignerCompany?: string
  defaultSignerEmail?: string

  // Current signature (if already signed)
  existingSignature?: string | null

  // Callbacks
  onSignatureComplete: (data: SignatureData) => Promise<void>
  onSignatureRemove?: () => Promise<void>

  // Options
  requireSignerInfo?: boolean
  allowDocuSign?: boolean
  disabled?: boolean
}

// =============================================================================
// Component
// =============================================================================

export function DocumentSignatureDialog({
  open,
  onOpenChange,
  documentType,
  documentId,
  documentName,
  role,
  roleLabel,
  defaultSignerName = '',
  defaultSignerTitle = '',
  defaultSignerCompany = '',
  defaultSignerEmail = '',
  existingSignature,
  onSignatureComplete,
  onSignatureRemove,
  requireSignerInfo = true,
  allowDocuSign = true,
  disabled = false,
}: DocumentSignatureDialogProps) {
  // State
  const [activeTab, setActiveTab] = useState<'draw' | 'docusign'>('draw')
  const [isLoading, setIsLoading] = useState(false)
  const [signerName, setSignerName] = useState(defaultSignerName)
  const [signerTitle, setSignerTitle] = useState(defaultSignerTitle)
  const [signerCompany, setSignerCompany] = useState(defaultSignerCompany)
  const [signerEmail, setSignerEmail] = useState(defaultSignerEmail)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setSignerName(defaultSignerName)
      setSignerTitle(defaultSignerTitle)
      setSignerCompany(defaultSignerCompany)
      setSignerEmail(defaultSignerEmail)
      setHasDrawn(false)
      setActiveTab('draw')
    }
  }, [open, defaultSignerName, defaultSignerTitle, defaultSignerCompany, defaultSignerEmail])

  // Initialize canvas
  useEffect(() => {
    if (!open || activeTab !== 'draw') {return}

    const canvas = canvasRef.current
    if (!canvas) {return}

    const ctx = canvas.getContext('2d')
    if (!ctx) {return}

    // Set canvas size based on container
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Set drawing styles
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [open, activeTab])

  // Get coordinates from mouse/touch event
  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) {return null}

    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) {return}

    const coords = getCoordinates(e)
    if (!coords) {return}

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) {return}

    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }, [disabled, getCoordinates])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) {return}

    const coords = getCoordinates(e)
    if (!coords) {return}

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) {return}

    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    setHasDrawn(true)
  }, [isDrawing, disabled, getCoordinates])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) {return}

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }, [])

  // Upload signature to Supabase storage
  const uploadSignature = async (dataUrl: string): Promise<string> => {
    const blob = await fetch(dataUrl).then(r => r.blob())
    const fileName = `signatures/${documentType}/${documentId}/${role}_${Date.now()}.png`

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true,
      })

    if (error) {throw error}

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  // Handle save signature (draw mode)
  const handleSaveDrawnSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) {return}

    // Validate signer info
    if (requireSignerInfo && !signerName.trim()) {
      toast.error('Please enter your name')
      return
    }

    setIsLoading(true)

    try {
      // Capture canvas as data URL
      const dataUrl = canvas.toDataURL('image/png')

      // Upload to storage
      const signatureUrl = await uploadSignature(dataUrl)

      // Call completion handler
      await onSignatureComplete({
        signatureUrl,
        signedBy: signerName,
        signedAt: new Date().toISOString(),
        title: signerTitle || undefined,
        company: signerCompany || undefined,
        role,
      })

      toast.success('Signature saved successfully')
      onOpenChange(false)
    } catch (_error) {
      logger.error('Failed to save signature:', _error)
      toast.error('Failed to save signature. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // DocuSign hooks and connection status
  const { data: docuSignStatus } = useDocuSignConnectionStatus()
  const payAppMutation = useCreatePaymentApplicationEnvelope()
  const changeOrderMutation = useCreateChangeOrderEnvelope()
  const lienWaiverMutation = useCreateLienWaiverEnvelope()

  const isDocuSignConnected = docuSignStatus?.isConnected

  // Handle DocuSign request
  const handleSendDocuSign = async () => {
    if (!signerEmail.trim()) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!signerName.trim()) {
      toast.error('Please enter the signer name')
      return
    }

    if (!isDocuSignConnected) {
      toast.error('DocuSign is not connected. Please connect in Settings.')
      return
    }

    setIsLoading(true)

    try {
      // Map document type to DocuSign document type
      const dsDocType: DSDocumentType = documentType

      // Create envelope based on document type
      if (dsDocType === 'payment_application') {
        await payAppMutation.mutateAsync({
          payment_application_id: documentId,
          contractor_signer: {
            email: signerEmail,
            name: signerName,
            title: signerTitle || undefined,
          },
        })
      } else if (dsDocType === 'change_order') {
        await changeOrderMutation.mutateAsync({
          change_order_id: documentId,
          contractor_signer: {
            email: signerEmail,
            name: signerName,
            title: signerTitle || undefined,
          },
          owner_signer: {
            email: signerEmail, // Same signer for now, full flow uses DocuSignRequestDialog
            name: signerName,
          },
        })
      } else if (dsDocType === 'lien_waiver') {
        await lienWaiverMutation.mutateAsync({
          lien_waiver_id: documentId,
          claimant_signer: {
            email: signerEmail,
            name: signerName,
            title: signerTitle || undefined,
            company: signerCompany || undefined,
          },
        })
      }

      toast.success(`Signature request sent to ${signerEmail}`)
      onOpenChange(false)
    } catch (_error) {
      logger.error('Failed to send DocuSign request:', _error)
      toast.error('Failed to send for signature')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle remove existing signature
  const handleRemoveSignature = async () => {
    if (!existingSignature || !onSignatureRemove) {return}

    setIsLoading(true)

    try {
      await onSignatureRemove()
      toast.success('Signature removed')
      onOpenChange(false)
      setShowRemoveDialog(false)
    } catch (_error) {
      logger.error('Failed to remove signature:', _error)
      toast.error('Failed to remove signature')
    } finally {
      setIsLoading(false)
    }
  }

  // Prevent scrolling while drawing on touch devices
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {return}

    const preventScroll = (e: TouchEvent) => {
      if (isDrawing) {
        e.preventDefault()
      }
    }

    canvas.addEventListener('touchmove', preventScroll, { passive: false })
    return () => {
      canvas.removeEventListener('touchmove', preventScroll)
    }
  }, [isDrawing])

  const displayRole = roleLabel || getRoleLabel(role)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            {displayRole} Signature
          </DialogTitle>
          <DialogDescription>
            Sign {documentName}
          </DialogDescription>
        </DialogHeader>

        {/* Existing signature display */}
        {existingSignature && (
          <div className="border rounded-lg p-4 bg-success-light border-green-200">
            <div className="flex items-center gap-2 text-success-dark mb-3">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Already Signed</span>
            </div>
            <img
              src={existingSignature}
              alt="Current signature"
              className="max-h-24 border rounded bg-card p-2"
            />
            {onSignatureRemove && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-error border-red-200 hover:bg-error-light"
                onClick={() => setShowRemoveDialog(true)}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Remove Signature
              </Button>
            )}
          </div>
        )}

        {/* Signature tabs */}
        {!existingSignature && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draw' | 'docusign')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw" className="gap-2">
                <PenTool className="h-4 w-4" />
                Draw Signature
              </TabsTrigger>
              {allowDocuSign && (
                <TabsTrigger value="docusign" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Send for Signature
                </TabsTrigger>
              )}
            </TabsList>

            {/* Draw signature tab */}
            <TabsContent value="draw" className="space-y-4">
              {/* Signer info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signer-name">
                    Full Name {requireSignerInfo && <span className="text-error">*</span>}
                  </Label>
                  <Input
                    id="signer-name"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signer-title">Title</Label>
                  <Input
                    id="signer-title"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    placeholder="e.g., Project Manager"
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Signature canvas */}
              <div className="space-y-2">
                <Label>Signature</Label>
                <div
                  className={cn(
                    'relative border-2 rounded-lg bg-card',
                    disabled ? 'bg-muted border-border' : 'border-input'
                  )}
                >
                  <canvas
                    ref={canvasRef}
                    className="w-full h-40 cursor-crosshair touch-none"
                    style={{ display: 'block' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasDrawn && !disabled && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-disabled">
                      <PenTool className="h-5 w-5 mr-2" />
                      Sign here
                    </div>
                  )}
                </div>
                {hasDrawn && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSignature}
                    className="text-error hover:text-error-dark"
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* Legal notice */}
              <div className="flex items-start gap-2 p-3 bg-warning-light border border-amber-200 rounded text-sm">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                <p className="text-amber-800">
                  By signing, I certify that I am authorized to sign this document and that
                  the information provided is accurate to the best of my knowledge.
                </p>
              </div>
            </TabsContent>

            {/* DocuSign tab */}
            {allowDocuSign && (
              <TabsContent value="docusign" className="space-y-4">
                {isDocuSignConnected ? (
                  <>
                    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2 heading-card">
                        <CheckCircle className="h-4 w-4" />
                        DocuSign Connected
                      </h4>
                      <p className="text-sm text-primary-hover">
                        The signer will receive an email with a secure link to review and sign the document.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="docusign-name">
                          Signer Name <span className="text-error">*</span>
                        </Label>
                        <Input
                          id="docusign-name"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          placeholder="Full name"
                          disabled={disabled}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="docusign-email">
                          Signer Email <span className="text-error">*</span>
                        </Label>
                        <Input
                          id="docusign-email"
                          type="email"
                          value={signerEmail}
                          onChange={(e) => setSignerEmail(e.target.value)}
                          placeholder="email@example.com"
                          disabled={disabled}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="docusign-company">Company</Label>
                      <Input
                        id="docusign-company"
                        value={signerCompany}
                        onChange={(e) => setSignerCompany(e.target.value)}
                        placeholder="Company name"
                        disabled={disabled}
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-6 border rounded-lg bg-surface text-center">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-warning" />
                    <h4 className="font-medium text-foreground mb-2 heading-card">
                      DocuSign Not Connected
                    </h4>
                    <p className="text-sm text-secondary mb-4">
                      Connect your DocuSign account in Company Settings to send documents for electronic signature.
                    </p>
                    <a
                      href="/settings?tab=integrations"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover"
                    >
                      Go to Settings
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>

          {!existingSignature && activeTab === 'draw' && (
            <Button
              type="button"
              onClick={handleSaveDrawnSignature}
              disabled={!hasDrawn || isLoading || disabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Signature
                </>
              )}
            </Button>
          )}

          {!existingSignature && activeTab === 'docusign' && allowDocuSign && isDocuSignConnected && (
            <Button
              type="button"
              onClick={handleSendDocuSign}
              disabled={!signerEmail.trim() || !signerName.trim() || isLoading || disabled}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send for Signature
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Remove Signature Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Signature?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this signature? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveSignature}
              className="bg-error hover:bg-error/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

// =============================================================================
// Helper Functions
// =============================================================================

function getRoleLabel(role: SignatureRole): string {
  const labels: Record<SignatureRole, string> = {
    contractor: 'Contractor',
    architect: 'Architect',
    owner: 'Owner',
    claimant: 'Claimant',
    internal_approver: 'Internal Approver',
    notary: 'Notary',
  }
  return labels[role] || role
}

export default DocumentSignatureDialog
