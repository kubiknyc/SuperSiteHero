/**
 * ChangeOrderSignatureBlock Component
 *
 * Professional signature block for change order approvals following
 * construction industry standards (AIA G701 style).
 *
 * Features:
 * - Contractor signature with title/company
 * - Owner signature with title/company
 * - Canvas-based digital signature capture
 * - Date auto-population
 * - Signature upload to Supabase storage
 * - Approval amount display
 *
 * The signature block is typically placed at the bottom of a change order
 * document and captures legally binding signatures from both parties.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
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
  PenTool,
  Save,
  Loader2,
  FileSignature,
  CheckCircle,
  User,
  Building,
  Calendar,
  DollarSign,
  Clock,
  X,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { logger } from '@/lib/utils/logger'
import type { ChangeOrder } from '@/types/change-order'

// =============================================
// Types
// =============================================

export interface SignatureData {
  signatureUrl: string
  signerName: string
  signerTitle?: string
  signerCompany?: string
  signedAt: string
}

export interface ChangeOrderSignatures {
  contractor?: SignatureData
  owner?: SignatureData
}

interface ChangeOrderSignatureBlockProps {
  changeOrder: ChangeOrder
  /** Current signatures on the change order */
  signatures?: ChangeOrderSignatures
  /** Called when contractor signs */
  onContractorSign?: (data: SignatureData) => Promise<void>
  /** Called when owner signs */
  onOwnerSign?: (data: SignatureData) => Promise<void>
  /** Show only view mode (no signing capability) */
  readOnly?: boolean
  /** Which signature the current user can provide */
  canSign?: 'contractor' | 'owner' | 'both' | 'none'
  /** Show compact version for embedding in forms */
  compact?: boolean
}

type SignerType = 'contractor' | 'owner'

// =============================================
// Signature Capture Dialog
// =============================================

interface SignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  signerType: SignerType
  changeOrderId: string
  changeOrderNumber: string
  defaultName?: string
  defaultTitle?: string
  defaultCompany?: string
  onComplete: (data: SignatureData) => Promise<void>
}

function SignatureDialog({
  open,
  onOpenChange,
  signerType,
  changeOrderId,
  changeOrderNumber,
  defaultName = '',
  defaultTitle = '',
  defaultCompany = '',
  onComplete,
}: SignatureDialogProps) {
  // Form state
  const [signerName, setSignerName] = useState(defaultName)
  const [signerTitle, setSignerTitle] = useState(defaultTitle)
  const [signerCompany, setSignerCompany] = useState(defaultCompany)
  const [isLoading, setIsLoading] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSignerName(defaultName)
      setSignerTitle(defaultTitle)
      setSignerCompany(defaultCompany)
      setHasDrawn(false)
    }
  }, [open, defaultName, defaultTitle, defaultCompany])

  // Initialize canvas
  useEffect(() => {
    if (!open) { return }

    const canvas = canvasRef.current
    if (!canvas) { return }

    const ctx = canvas.getContext('2d')
    if (!ctx) { return }

    const initCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0) {
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

        // Set drawing styles - professional blue-black ink
        ctx.strokeStyle = '#1a365d'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }

    const timer = setTimeout(initCanvas, 100)
    return () => clearTimeout(timer)
  }, [open])

  // Get coordinates from mouse/touch event
  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) { return null }

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
    const coords = getCoordinates(e)
    if (!coords) { return }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) { return }

    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }, [getCoordinates])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) { return }

    const coords = getCoordinates(e)
    if (!coords) { return }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) { return }

    ctx.lineTo(coords.x, coords.y)
    ctx.stroke()
    setHasDrawn(true)
  }, [isDrawing, getCoordinates])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) { return }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }, [])

  // Upload signature to Supabase storage
  const uploadSignature = async (dataUrl: string): Promise<string> => {
    const blob = await fetch(dataUrl).then(r => r.blob())
    const fileName = `signatures/change-orders/${changeOrderId}/${signerType}_${Date.now()}.png`

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true,
      })

    if (error) { throw error }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  // Handle submit
  const handleSubmit = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) {
      toast.error('Please draw your signature')
      return
    }

    if (!signerName.trim()) {
      toast.error('Please enter your name')
      return
    }

    setIsLoading(true)

    try {
      const dataUrl = canvas.toDataURL('image/png')
      const signatureUrl = await uploadSignature(dataUrl)

      await onComplete({
        signatureUrl,
        signerName: signerName.trim(),
        signerTitle: signerTitle.trim() || undefined,
        signerCompany: signerCompany.trim() || undefined,
        signedAt: new Date().toISOString(),
      })

      toast.success(`${signerType === 'contractor' ? 'Contractor' : 'Owner'} signature captured`)
      onOpenChange(false)
    } catch (error) {
      logger.error('Failed to save signature:', error)
      toast.error('Failed to save signature. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Prevent scrolling while drawing on touch devices
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) { return }

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

  const isContractor = signerType === 'contractor'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className={cn(
              'h-5 w-5',
              isContractor ? 'text-primary' : 'text-purple-600'
            )} />
            {isContractor ? 'Contractor Signature' : 'Owner Signature'}
          </DialogTitle>
          <DialogDescription>
            Sign Change Order {changeOrderNumber} as the {isContractor ? 'contractor' : 'owner'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="signer-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signer-title">Title</Label>
              <Input
                id="signer-title"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                placeholder={isContractor ? 'e.g., Project Manager' : 'e.g., Property Owner'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signer-company">Company / Organization</Label>
            <Input
              id="signer-company"
              value={signerCompany}
              onChange={(e) => setSignerCompany(e.target.value)}
              placeholder={isContractor ? 'Construction company name' : 'Owner company or LLC'}
            />
          </div>

          {/* Signature Canvas */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Signature <span className="text-destructive">*</span>
            </Label>
            <div className="relative border-2 border-input rounded-lg bg-white">
              <canvas
                ref={canvasRef}
                className="w-full h-32 cursor-crosshair touch-none"
                style={{ display: 'block' }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground">
                  <PenTool className="h-5 w-5 mr-2" />
                  Sign here
                </div>
              )}
              {/* Signature line */}
              <div className="absolute bottom-4 left-4 right-4 border-b border-muted-foreground/50" />
            </div>
            {hasDrawn && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear signature
              </Button>
            )}
          </div>

          {/* Date display */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Date: {format(new Date(), 'MMMM d, yyyy')}
          </div>

          {/* Legal Notice */}
          <div className="flex items-start gap-2 p-3 bg-warning-50 border border-warning-200 rounded text-sm dark:bg-warning-950/30 dark:border-warning-800">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-warning-800 dark:text-warning-200">
              By signing, I confirm that I am authorized to sign this change order on behalf of
              the {isContractor ? 'contractor' : 'owner'} and agree to the terms and conditions stated herein.
            </p>
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
            onClick={handleSubmit}
            disabled={!hasDrawn || !signerName.trim() || isLoading}
            className={isContractor ? 'bg-primary hover:bg-primary/90' : 'bg-purple-600 hover:bg-purple-700'}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Apply Signature
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// Signature Display Component
// =============================================

interface SignatureDisplayProps {
  label: string
  signature?: SignatureData
  type: SignerType
  canSign: boolean
  onSign: () => void
}

function SignatureDisplay({ label, signature, type, canSign, onSign }: SignatureDisplayProps) {
  const isContractor = type === 'contractor'

  const borderClass = isContractor
    ? 'border-primary-200 dark:border-primary-800'
    : 'border-purple-200 dark:border-purple-800'

  const bgClass = isContractor
    ? 'bg-primary-50/50 dark:bg-primary-950/20'
    : 'bg-purple-50/50 dark:bg-purple-950/20'

  return (
    <div className={cn(
      'p-4 rounded-lg border-2',
      signature
        ? `${borderClass} ${bgClass}`
        : 'border-dashed border-border bg-muted/50 dark:border-border dark:bg-muted/20'
    )}>
      <div className="flex items-center justify-between mb-3">
        <Label className={cn(
          'text-sm font-semibold uppercase tracking-wide',
          isContractor ? 'text-primary' : 'text-purple-700 dark:text-purple-300'
        )}>
          {label}
        </Label>
        {signature && (
          <Badge variant="outline" className={cn(
            'text-xs',
            isContractor
              ? 'border-primary-300 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
              : 'border-purple-300 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200'
          )}>
            <CheckCircle className="h-3 w-3 mr-1" />
            Signed
          </Badge>
        )}
      </div>

      {signature ? (
        <div className="space-y-3">
          {/* Signature Image */}
          <div className="bg-white rounded border p-2">
            <img
              src={signature.signatureUrl}
              alt={`${label} signature`}
              className="h-16 object-contain mx-auto"
            />
            <div className="border-t border-border mt-2" />
          </div>

          {/* Signer Details */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1 text-foreground">
              <User className="h-3 w-3 text-muted-foreground" />
              {signature.signerName}
            </div>
            {signature.signerTitle && (
              <div className="flex items-center gap-1 text-muted-foreground">
                {signature.signerTitle}
              </div>
            )}
            {signature.signerCompany && (
              <div className="flex items-center gap-1 text-muted-foreground col-span-2">
                <Building className="h-3 w-3" />
                {signature.signerCompany}
              </div>
            )}
            <div className="flex items-center gap-1 text-muted-foreground col-span-2">
              <Calendar className="h-3 w-3" />
              {format(new Date(signature.signedAt), 'MMMM d, yyyy')}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          {canSign ? (
            <Button
              variant="outline"
              onClick={onSign}
              className={cn(
                'border-dashed',
                isContractor
                  ? 'border-primary-400 text-primary hover:bg-primary-50 dark:hover:bg-primary-900/20'
                  : 'border-purple-400 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              )}
            >
              <PenTool className="h-4 w-4 mr-2" />
              Click to Sign
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Awaiting signature</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================
// Main Component
// =============================================

export function ChangeOrderSignatureBlock({
  changeOrder,
  signatures = {},
  onContractorSign,
  onOwnerSign,
  readOnly = false,
  canSign = 'none',
  compact = false,
}: ChangeOrderSignatureBlockProps) {
  const { userProfile } = useAuth()
  const [showContractorDialog, setShowContractorDialog] = useState(false)
  const [showOwnerDialog, setShowOwnerDialog] = useState(false)

  const canSignContractor = !readOnly && (canSign === 'contractor' || canSign === 'both') && !signatures.contractor
  const canSignOwner = !readOnly && (canSign === 'owner' || canSign === 'both') && !signatures.owner

  // Default values from user profile
  const defaultName = userProfile
    ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ')
    : ''
  const defaultTitle = userProfile?.title || ''
  const defaultCompany = userProfile?.company?.name || ''

  // Handle contractor signature
  const handleContractorSign = async (data: SignatureData) => {
    if (onContractorSign) {
      await onContractorSign(data)
    }
  }

  // Handle owner signature
  const handleOwnerSign = async (data: SignatureData) => {
    if (onOwnerSign) {
      await onOwnerSign(data)
    }
  }

  if (compact) {
    // Compact version for embedding in forms
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SignatureDisplay
            label="Contractor"
            signature={signatures.contractor}
            type="contractor"
            canSign={canSignContractor}
            onSign={() => setShowContractorDialog(true)}
          />
          <SignatureDisplay
            label="Owner"
            signature={signatures.owner}
            type="owner"
            canSign={canSignOwner}
            onSign={() => setShowOwnerDialog(true)}
          />
        </div>

        {/* Signature Dialogs */}
        <SignatureDialog
          open={showContractorDialog}
          onOpenChange={setShowContractorDialog}
          signerType="contractor"
          changeOrderId={changeOrder.id}
          changeOrderNumber={changeOrder.number}
          defaultName={defaultName}
          defaultTitle={defaultTitle}
          defaultCompany={defaultCompany}
          onComplete={handleContractorSign}
        />

        <SignatureDialog
          open={showOwnerDialog}
          onOpenChange={setShowOwnerDialog}
          signerType="owner"
          changeOrderId={changeOrder.id}
          changeOrderNumber={changeOrder.number}
          onComplete={handleOwnerSign}
        />
      </div>
    )
  }

  // Full version with card wrapper
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-primary" />
          Signature Block
        </CardTitle>
        <CardDescription>
          Change Order #{changeOrder.number} requires signatures from both contractor and owner
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Change Order Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">CO Number:</span>
              <span className="ml-2 font-medium">{changeOrder.number}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Title:</span>
              <span className="ml-2 font-medium truncate">{changeOrder.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Amount:</span>
              <span className="ml-1 font-medium text-success">
                ${(changeOrder.approved_amount || changeOrder.proposed_amount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Days:</span>
              <span className="ml-1 font-medium">
                {changeOrder.approved_days ?? changeOrder.proposed_days ?? 0}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Signature Areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SignatureDisplay
            label="Contractor"
            signature={signatures.contractor}
            type="contractor"
            canSign={canSignContractor}
            onSign={() => setShowContractorDialog(true)}
          />
          <SignatureDisplay
            label="Owner"
            signature={signatures.owner}
            type="owner"
            canSign={canSignOwner}
            onSign={() => setShowOwnerDialog(true)}
          />
        </div>

        {/* Status Indicator */}
        {signatures.contractor && signatures.owner ? (
          <div className="flex items-center justify-center gap-2 p-3 bg-success-50 border border-success-200 rounded-lg text-success-700 dark:bg-success-950/30 dark:border-success-800 dark:text-success-300">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">All signatures collected - Change Order is fully executed</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 p-3 bg-warning-50 border border-warning-200 rounded-lg text-warning-700 dark:bg-warning-950/30 dark:border-warning-800 dark:text-warning-300">
            <AlertTriangle className="h-5 w-5" />
            <span>
              {!signatures.contractor && !signatures.owner
                ? 'Awaiting both contractor and owner signatures'
                : !signatures.contractor
                  ? 'Awaiting contractor signature'
                  : 'Awaiting owner signature'}
            </span>
          </div>
        )}
      </CardContent>

      {/* Signature Dialogs */}
      <SignatureDialog
        open={showContractorDialog}
        onOpenChange={setShowContractorDialog}
        signerType="contractor"
        changeOrderId={changeOrder.id}
        changeOrderNumber={changeOrder.number}
        defaultName={defaultName}
        defaultTitle={defaultTitle}
        defaultCompany={defaultCompany}
        onComplete={handleContractorSign}
      />

      <SignatureDialog
        open={showOwnerDialog}
        onOpenChange={setShowOwnerDialog}
        signerType="owner"
        changeOrderId={changeOrder.id}
        changeOrderNumber={changeOrder.number}
        onComplete={handleOwnerSign}
      />
    </Card>
  )
}

export default ChangeOrderSignatureBlock
