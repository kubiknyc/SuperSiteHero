/**
 * SubmittalApprovalSignatureDialog Component
 *
 * Dialog for capturing reviewer signature when approving/rejecting submittals.
 * Uses construction industry standard A/B/C/D approval codes:
 * - A: Approved (no exceptions taken)
 * - B: Approved as Noted (proceed with noted changes)
 * - C: Revise and Resubmit (corrections required)
 * - D: Rejected (not approved)
 *
 * Features:
 * - Approval code selection with descriptions
 * - Signature canvas for digital signature
 * - Comments field for reviewer notes
 * - Auto-saves to submittal record
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  PenTool,
  Save,
  Loader2,
  FileSignature,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { logger } from '@/lib/utils/logger'

// =============================================
// Types
// =============================================

export type ApprovalCode = 'A' | 'B' | 'C' | 'D'

export interface ApprovalCodeConfig {
  code: ApprovalCode
  label: string
  description: string
  color: string
  bgColor: string
  status: string
  icon: React.ReactNode
}

export interface SubmittalApprovalData {
  approvalCode: ApprovalCode
  reviewStatus: string
  signatureUrl: string
  reviewerName: string
  reviewerTitle?: string
  reviewerCompany?: string
  comments?: string
  reviewedAt: string
}

interface SubmittalApprovalSignatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submittalId: string
  submittalNumber: string
  submittalTitle: string
  specSection?: string
  /** Pre-selected approval code */
  defaultApprovalCode?: ApprovalCode
  /** Callback on successful approval */
  onApprovalComplete: (data: SubmittalApprovalData) => Promise<void>
  /** Disable all inputs */
  disabled?: boolean
}

// =============================================
// Constants
// =============================================

export const APPROVAL_CODES: ApprovalCodeConfig[] = [
  {
    code: 'A',
    label: 'Approved',
    description: 'No exceptions taken. Proceed with work.',
    color: '#22c55e',
    bgColor: '#dcfce7',
    status: 'approved',
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
  },
  {
    code: 'B',
    label: 'Approved as Noted',
    description: 'Proceed with work incorporating noted changes.',
    color: '#84cc16',
    bgColor: '#ecfccb',
    status: 'approved_as_noted',
    icon: <CheckCircle className="h-5 w-5 text-lime-600" />,
  },
  {
    code: 'C',
    label: 'Revise and Resubmit',
    description: 'Make corrections and resubmit for approval.',
    color: '#f97316',
    bgColor: '#ffedd5',
    status: 'revise_resubmit',
    icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
  },
  {
    code: 'D',
    label: 'Rejected',
    description: 'Not approved. Submit a new submittal.',
    color: '#ef4444',
    bgColor: '#fee2e2',
    status: 'rejected',
    icon: <XCircle className="h-5 w-5 text-red-600" />,
  },
]

// =============================================
// Component
// =============================================

export function SubmittalApprovalSignatureDialog({
  open,
  onOpenChange,
  submittalId,
  submittalNumber,
  submittalTitle,
  specSection,
  defaultApprovalCode = 'A',
  onApprovalComplete,
  disabled = false,
}: SubmittalApprovalSignatureDialogProps) {
  const { userProfile } = useAuth()

  // Form state
  const [selectedCode, setSelectedCode] = useState<ApprovalCode>(defaultApprovalCode)
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerTitle, setReviewerTitle] = useState('')
  const [reviewerCompany, setReviewerCompany] = useState('')
  const [comments, setComments] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  // Pre-fill reviewer info from user profile
  useEffect(() => {
    if (open && userProfile) {
      const fullName = [userProfile.first_name, userProfile.last_name]
        .filter(Boolean)
        .join(' ')
      setReviewerName(fullName || '')
      setReviewerTitle(userProfile.title || '')
      setReviewerCompany(userProfile.company?.name || '')
      setSelectedCode(defaultApprovalCode)
      setComments('')
      setHasDrawn(false)
    }
  }, [open, userProfile, defaultApprovalCode])

  // Initialize canvas
  useEffect(() => {
    if (!open) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Wait for dialog to render, then set canvas size
    const initCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0) {
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

        // Set drawing styles
        ctx.strokeStyle = '#1f2937'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }

    // Small delay to ensure dialog is rendered
    const timer = setTimeout(initCanvas, 100)
    return () => clearTimeout(timer)
  }, [open])

  // Get coordinates from mouse/touch event
  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null

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
    if (disabled) return

    const coords = getCoordinates(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    ctx.beginPath()
    ctx.moveTo(coords.x, coords.y)
  }, [disabled, getCoordinates])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return

    const coords = getCoordinates(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

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
    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }, [])

  // Upload signature to Supabase storage
  const uploadSignature = async (dataUrl: string): Promise<string> => {
    const blob = await fetch(dataUrl).then(r => r.blob())
    const fileName = `signatures/submittals/${submittalId}/review_${Date.now()}.png`

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true,
      })

    if (error) throw error

    // Get public URL
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

    if (!reviewerName.trim()) {
      toast.error('Please enter your name')
      return
    }

    setIsLoading(true)

    try {
      // Capture canvas as data URL
      const dataUrl = canvas.toDataURL('image/png')

      // Upload to storage
      const signatureUrl = await uploadSignature(dataUrl)

      // Get the selected approval code config
      const codeConfig = APPROVAL_CODES.find(c => c.code === selectedCode)!

      // Call completion handler
      await onApprovalComplete({
        approvalCode: selectedCode,
        reviewStatus: codeConfig.status,
        signatureUrl,
        reviewerName: reviewerName.trim(),
        reviewerTitle: reviewerTitle.trim() || undefined,
        reviewerCompany: reviewerCompany.trim() || undefined,
        comments: comments.trim() || undefined,
        reviewedAt: new Date().toISOString(),
      })

      toast.success(`Submittal ${selectedCode === 'A' || selectedCode === 'B' ? 'approved' : 'returned'}`)
      onOpenChange(false)
    } catch (error) {
      logger.error('Failed to save approval signature:', error)
      toast.error('Failed to save signature. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Prevent scrolling while drawing on touch devices
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

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

  const selectedCodeConfig = APPROVAL_CODES.find(c => c.code === selectedCode)
  const isApproval = selectedCode === 'A' || selectedCode === 'B'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Review Submittal
          </DialogTitle>
          <DialogDescription>
            Review and sign submittal {submittalNumber}
            {specSection && ` (${specSection})`}
          </DialogDescription>
        </DialogHeader>

        {/* Submittal Info */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">
              {submittalNumber}
            </Badge>
            {specSection && (
              <Badge variant="secondary" className="text-xs">
                {specSection}
              </Badge>
            )}
          </div>
          <p className="text-sm mt-1 text-foreground">{submittalTitle}</p>
        </div>

        {/* Approval Code Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1">
            Approval Code <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={selectedCode}
            onValueChange={(v) => setSelectedCode(v as ApprovalCode)}
            className="space-y-2"
          >
            {APPROVAL_CODES.map((config) => (
              <label
                key={config.code}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors',
                  selectedCode === config.code
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
                style={{
                  borderColor: selectedCode === config.code ? config.color : undefined,
                  backgroundColor: selectedCode === config.code ? config.bgColor : undefined,
                }}
              >
                <RadioGroupItem value={config.code} className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <span className="font-semibold" style={{ color: config.color }}>
                      Code {config.code}: {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {config.description}
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Reviewer Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="reviewer-name">
              Reviewer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reviewer-name"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Enter your full name"
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewer-title">Title</Label>
            <Input
              id="reviewer-title"
              value={reviewerTitle}
              onChange={(e) => setReviewerTitle(e.target.value)}
              placeholder="e.g., Project Architect"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label htmlFor="review-comments">
            Comments
            {!isApproval && <span className="text-muted-foreground ml-1">(recommended)</span>}
          </Label>
          <Textarea
            id="review-comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder={
              isApproval
                ? 'Optional notes or conditions...'
                : 'Describe the issues or required changes...'
            }
            rows={3}
            disabled={disabled}
          />
        </div>

        {/* Signature Canvas */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Signature <span className="text-red-500">*</span>
          </Label>
          <div
            className={cn(
              'relative border-2 rounded-lg bg-white',
              disabled ? 'bg-muted border-border' : 'border-input'
            )}
          >
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
            {!hasDrawn && !disabled && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground">
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
              className="text-destructive hover:text-destructive/80"
            >
              Clear signature
            </Button>
          )}
        </div>

        {/* Legal Notice */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-amber-800">
            By signing, I certify that I have reviewed this submittal and the approval
            code selected accurately reflects my professional opinion.
          </p>
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
            disabled={!hasDrawn || !reviewerName.trim() || isLoading || disabled}
            style={{
              backgroundColor: selectedCodeConfig?.color,
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isApproval ? 'Approve Submittal' : 'Return Submittal'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SubmittalApprovalSignatureDialog
