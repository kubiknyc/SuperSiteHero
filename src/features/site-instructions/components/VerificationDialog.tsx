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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface VerificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerify: (notes?: string) => Promise<void>
  isSubmitting?: boolean
}

export function VerificationDialog({
  open,
  onOpenChange,
  onVerify,
  isSubmitting = false,
}: VerificationDialogProps) {
  const [notes, setNotes] = useState('')

  const handleSubmit = async () => {
    await onVerify(notes.trim() || undefined)
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verify Completion</DialogTitle>
          <DialogDescription>
            Confirm that the work has been completed satisfactorily.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="verificationNotes">Verification Notes (optional)</Label>
            <Textarea
              id="verificationNotes"
              placeholder="Add any notes about the verification..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
