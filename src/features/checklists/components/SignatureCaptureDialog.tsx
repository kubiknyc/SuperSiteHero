// File: /src/features/checklists/components/SignatureCaptureDialog.tsx
// Modal dialog for signature capture with save/cancel actions
// Phase: 3.2 - Photo & Signature Capture

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SignaturePad } from './SignaturePad'
import { uploadSignature, deleteSignature } from '../utils/storageUtils'
import { PenTool, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface SignatureCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  checklistId: string
  responseId: string
  currentSignature: string | null
  role?: string
  title?: string
  onSignatureUpdated: (signatureUrl: string | null) => void
  disabled?: boolean
}

export function SignatureCaptureDialog({
  open,
  onOpenChange,
  checklistId,
  responseId,
  currentSignature,
  role,
  title,
  onSignatureUpdated,
  disabled = false,
}: SignatureCaptureDialogProps) {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleSignatureCapture = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl)
  }

  const handleClear = () => {
    setSignatureDataUrl(null)
  }

  const handleSave = async () => {
    if (!signatureDataUrl) {
      toast.error('Please capture a signature first')
      return
    }

    setIsUploading(true)

    try {
      // Delete old signature if exists
      if (currentSignature) {
        try {
          await deleteSignature(currentSignature)
        } catch (error) {
          console.warn('Failed to delete old signature:', error)
          // Continue anyway - old signature may already be deleted
        }
      }

      // Upload new signature
      const signatureUrl = await uploadSignature(signatureDataUrl, checklistId, responseId)

      // Update response
      onSignatureUpdated(signatureUrl)

      toast.success('Signature saved successfully')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save signature:', error)
      toast.error('Failed to save signature. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!currentSignature) return

    if (!confirm('Are you sure you want to remove this signature?')) {
      return
    }

    setIsUploading(true)

    try {
      await deleteSignature(currentSignature)
      onSignatureUpdated(null)
      toast.success('Signature removed successfully')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to remove signature:', error)
      toast.error('Failed to remove signature. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setSignatureDataUrl(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5" />
            Capture Signature
          </DialogTitle>
          {(role || title) && (
            <div className="text-sm text-gray-600 mt-2">
              {role && <div>Role: {role}</div>}
              {title && <div>Title: {title}</div>}
            </div>
          )}
        </DialogHeader>

        <div className="py-4">
          <SignaturePad
            onSignatureCapture={handleSignatureCapture}
            onClear={handleClear}
            width={600}
            height={200}
            disabled={disabled || isUploading}
            existingSignature={currentSignature}
          />

          {currentSignature && !signatureDataUrl && (
            <p className="text-sm text-gray-600 mt-2">
              You can draw a new signature to replace the existing one, or remove it entirely.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          {currentSignature && !signatureDataUrl && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={disabled || isUploading}
            >
              <X className="w-4 h-4 mr-2" />
              Remove Signature
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUploading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={!signatureDataUrl || disabled || isUploading}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Signature
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
