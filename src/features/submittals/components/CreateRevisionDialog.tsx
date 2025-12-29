// File: /src/features/submittals/components/CreateRevisionDialog.tsx
// Dialog for creating a new revision of a submittal

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { useCreateSubmittalRevision } from '../hooks/useDedicatedSubmittals'
import type { Submittal } from '@/types/database'

interface CreateRevisionDialogProps {
  submittal: Submittal
  onSuccess?: () => void
}

export function CreateRevisionDialog({
  submittal,
  onSuccess,
}: CreateRevisionDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copyAttachments, setCopyAttachments] = useState(true)

  const createRevision = useCreateSubmittalRevision()

  const handleCreate = async () => {
    try {
      await createRevision.mutateAsync({
        submittalId: submittal.id,
        copyAttachments,
      })

      setIsOpen(false)
      onSuccess?.()
    } catch (_error) {
      // Error handled by React Query
    }
  }

  const currentRevision = submittal.revision_number || 0
  const newRevision = currentRevision + 1

  // Only show for submittals that can be revised
  const canRevise = submittal.review_status === 'revise_resubmit'

  if (!canRevise) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600">
          <RefreshCw className="h-4 w-4 mr-2" />
          Create Revision
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-orange-500" />
            Create New Revision
          </DialogTitle>
          <DialogDescription>
            Create a new revision of this submittal for resubmission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Revision Info */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Current Revision</p>
              <p className="text-2xl font-bold">Rev. {currentRevision}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">New Revision</p>
              <p className="text-2xl font-bold text-orange-500">Rev. {newRevision}</p>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">What happens when you create a revision:</p>
              <ul className="mt-2 space-y-1 text-amber-700">
                <li>• Revision number will be incremented to Rev. {newRevision}</li>
                <li>• Status will be reset to "Not Submitted"</li>
                <li>• Previous review comments will be cleared</li>
                <li>• Ball-in-court will return to Subcontractor</li>
              </ul>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="copyAttachments">Keep existing attachments</Label>
                <p className="text-sm text-muted-foreground">
                  Retain all current attachments for the new revision
                </p>
              </div>
              <Switch
                id="copyAttachments"
                checked={copyAttachments}
                onCheckedChange={setCopyAttachments}
              />
            </div>
          </div>

          {/* Status Change Preview */}
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Badge className="bg-orange-500">Revise & Resubmit</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge className="bg-slate-500">Not Submitted</Badge>
            <span className="text-sm text-muted-foreground ml-auto">
              Ready for resubmission
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createRevision.isPending}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {createRevision.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Rev. {newRevision}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateRevisionDialog
