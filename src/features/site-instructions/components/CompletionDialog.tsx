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
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface CompletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (data: { completedBy: string; notes?: string }) => Promise<void>
  isSubmitting?: boolean
}

export function CompletionDialog({
  open,
  onOpenChange,
  onComplete,
  isSubmitting = false,
}: CompletionDialogProps) {
  const [completedBy, setCompletedBy] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async () => {
    if (!completedBy.trim()) return
    await onComplete({
      completedBy: completedBy.trim(),
      notes: notes.trim() || undefined,
    })
    setCompletedBy('')
    setNotes('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as Complete</DialogTitle>
          <DialogDescription>
            Confirm that the instructed work has been completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="completedBy">Completed By *</Label>
            <Input
              id="completedBy"
              placeholder="Enter your full name"
              value={completedBy}
              onChange={(e) => setCompletedBy(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="completionNotes">Completion Notes (optional)</Label>
            <Textarea
              id="completionNotes"
              placeholder="Describe the work completed..."
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
          <Button
            onClick={handleSubmit}
            disabled={!completedBy.trim() || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark Complete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
