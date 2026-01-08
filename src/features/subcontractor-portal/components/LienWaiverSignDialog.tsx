/**
 * Lien Waiver Sign Dialog
 * Dialog for signing lien waivers with electronic signature capture
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Pen,
  AlertTriangle,
  DollarSign,
  Calendar,
  Building2,
  FileText,
  Info,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  useSignLienWaiver,
  getWaiverTypeLabel,
  getWaiverTypeDescription,
  isConditionalWaiver,
  isFinalWaiver,
  formatWaiverAmount,
} from '../hooks/useSubcontractorLienWaivers'
import type { SubcontractorLienWaiver } from '@/types/subcontractor-portal'

interface LienWaiverSignDialogProps {
  waiver: SubcontractorLienWaiver
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function LienWaiverSignDialog({
  waiver,
  open,
  onOpenChange,
  onSuccess,
}: LienWaiverSignDialogProps) {
  const [formData, setFormData] = useState({
    signed_by_name: '',
    signed_by_title: '',
  })
  const [acknowledged, setAcknowledged] = useState(false)
  const [finalAcknowledged, setFinalAcknowledged] = useState(false)

  const signMutation = useSignLienWaiver()

  const isConditional = isConditionalWaiver(waiver.waiver_type)
  const isFinal = isFinalWaiver(waiver.waiver_type)

  const canSubmit =
    formData.signed_by_name.trim() !== '' &&
    formData.signed_by_title.trim() !== '' &&
    acknowledged &&
    (!isFinal || finalAcknowledged)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canSubmit) return

    await signMutation.mutateAsync({
      waiverId: waiver.id,
      data: {
        signed_by_name: formData.signed_by_name.trim(),
        signed_by_title: formData.signed_by_title.trim(),
      },
    })

    // Reset form
    setFormData({ signed_by_name: '', signed_by_title: '' })
    setAcknowledged(false)
    setFinalAcknowledged(false)
    onSuccess?.()
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setFormData({ signed_by_name: '', signed_by_title: '' })
      setAcknowledged(false)
      setFinalAcknowledged(false)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pen className="h-5 w-5" />
            Sign Lien Waiver
          </DialogTitle>
          <DialogDescription>
            Review and sign the lien waiver below. By signing, you certify the information is accurate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Waiver Details */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Waiver #</span>
              <span className="font-semibold">{waiver.waiver_number}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="font-medium">{getWaiverTypeLabel(waiver.waiver_type)}</span>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{waiver.project_name}</span>
            </div>

            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Amount: <span className="font-semibold">{formatWaiverAmount(waiver.payment_amount)}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Through: {format(new Date(waiver.through_date), 'MMMM d, yyyy')}
              </span>
            </div>

            {waiver.payment_application_number && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Pay App #{waiver.payment_application_number}</span>
              </div>
            )}
          </div>

          {/* Waiver Type Explanation */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {getWaiverTypeDescription(waiver.waiver_type)}
            </AlertDescription>
          </Alert>

          {/* Warning for Final Waivers */}
          {isFinal && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Final Waiver Warning:</strong> This is a final lien waiver. By signing, you
                are releasing all claims and lien rights for work performed through the date shown
                above. This action cannot be undone.
              </AlertDescription>
            </Alert>
          )}

          {/* Signature Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signed_by_name">Full Legal Name *</Label>
              <Input
                id="signed_by_name"
                placeholder="Enter your full legal name"
                value={formData.signed_by_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, signed_by_name: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signed_by_title">Title / Position *</Label>
              <Input
                id="signed_by_title"
                placeholder="e.g., Owner, Project Manager, CFO"
                value={formData.signed_by_title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, signed_by_title: e.target.value }))
                }
                required
              />
            </div>
          </div>

          {/* Acknowledgment Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
              />
              <Label htmlFor="acknowledge" className="text-sm leading-relaxed cursor-pointer">
                I certify that I am authorized to sign this lien waiver on behalf of the
                subcontractor and that the information provided is accurate.
                {isConditional
                  ? ' I understand this waiver is conditional upon receipt of payment.'
                  : ' I understand this waiver is unconditional and immediately effective.'}
              </Label>
            </div>

            {isFinal && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="final-acknowledge"
                  checked={finalAcknowledged}
                  onCheckedChange={(checked) => setFinalAcknowledged(checked === true)}
                />
                <Label htmlFor="final-acknowledge" className="text-sm leading-relaxed cursor-pointer">
                  I understand that by signing this <strong>final</strong> lien waiver, I am
                  releasing all claims and lien rights for work performed through{' '}
                  {format(new Date(waiver.through_date), 'MMMM d, yyyy')}, and this release is{' '}
                  {isConditional ? 'effective upon receipt of payment' : 'immediately effective'}.
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={signMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || signMutation.isPending}>
              {signMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <Pen className="h-4 w-4 mr-2" />
                  Sign Waiver
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default LienWaiverSignDialog
