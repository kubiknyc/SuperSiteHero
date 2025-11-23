// File: /src/features/rfis/components/CreateRFIDialog.tsx
// Dialog for creating a new RFI

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateRFIWithNotification } from '../hooks/useRFIMutations'

interface CreateRFIDialogProps {
  projectId: string | undefined
  workflowTypeId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateRFIDialog({
  projectId,
  workflowTypeId,
  open,
  onOpenChange,
  onSuccess,
}: CreateRFIDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [moreInformation, setMoreInformation] = useState('')

  const createRFI = useCreateRFIWithNotification()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !projectId || !workflowTypeId) {
      return
    }

    try {
      await createRFI.mutateAsync({
        project_id: projectId,
        workflow_type_id: workflowTypeId,
        title: title.trim(),
        description: description.trim() || undefined,
        more_information: moreInformation.trim() || undefined,
        assignees: [],
        priority: 'normal',
        due_date: undefined,
      })

      // Reset form
      setTitle('')
      setDescription('')
      setMoreInformation('')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create RFI:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create RFI (Request for Information)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">RFI Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the RFI"
              required
              disabled={createRFI.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what information is being requested..."
              rows={3}
              disabled={createRFI.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="more-info">Additional Information</Label>
            <Textarea
              id="more-info"
              value={moreInformation}
              onChange={(e) => setMoreInformation(e.target.value)}
              placeholder="Any additional details, context, or requirements..."
              rows={3}
              disabled={createRFI.isPending}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createRFI.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createRFI.isPending}>
              {createRFI.isPending ? 'Creating...' : 'Create RFI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
