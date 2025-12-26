// File: /src/features/submittals/components/CreateSubmittalDialog.tsx
// Dialog for creating a new submittal

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSubmittalWorkflowType } from '../hooks/useSubmittals'
import { useCreateSubmittalWithNotification } from '../hooks/useSubmittalMutations'
import { DistributionListPicker } from '@/components/distribution/DistributionListPicker'
import type { DistributionSelection } from '@/types/distribution-list'
import { logger } from '../../../lib/utils/logger';


interface CreateSubmittalDialogProps {
  projectId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateSubmittalDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: CreateSubmittalDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [costImpact, setCostImpact] = useState('')
  const [scheduleImpact, setScheduleImpact] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [distribution, setDistribution] = useState<DistributionSelection>({
    listIds: [],
    userIds: [],
    externalContacts: [],
  })

  const { data: workflowType } = useSubmittalWorkflowType()
  const createSubmittal = useCreateSubmittalWithNotification()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !projectId || !workflowType?.id) {
      return
    }

    try {
      await createSubmittal.mutateAsync({
        project_id: projectId,
        workflow_type_id: workflowType.id,
        title: title.trim(),
        description: description.trim() || null,
        assignees: [],
        priority: 'normal',
        cost_impact: costImpact.trim() ? Number(costImpact) : null,
        schedule_impact: scheduleImpact.trim() ? Number(scheduleImpact) : null,
        due_date: dueDate || null,
        discipline: null,
        raised_by: null,
        status: 'draft',
        closed_date: null,
        deleted_at: null,
        opened_date: null,
        reference_number: null,
        resolution: null,
        more_information: null,
      } as any)

      // Reset form
      setTitle('')
      setDescription('')
      setCostImpact('')
      setScheduleImpact('')
      setDueDate('')
      setDistribution({ listIds: [], userIds: [], externalContacts: [] })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('Failed to create submittal:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Submittal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Submittal Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the submittal"
              required
              disabled={createSubmittal.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the submittal..."
              rows={3}
              disabled={createSubmittal.isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost-impact">Cost Impact</Label>
              <Input
                id="cost-impact"
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
                placeholder="e.g., $5,000 increase"
                disabled={createSubmittal.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-impact">Schedule Impact</Label>
              <Input
                id="schedule-impact"
                value={scheduleImpact}
                onChange={(e) => setScheduleImpact(e.target.value)}
                placeholder="e.g., 2 week delay"
                disabled={createSubmittal.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={createSubmittal.isPending}
            />
          </div>

          {/* Distribution List */}
          {projectId && (
            <DistributionListPicker
              projectId={projectId}
              listType="submittal"
              value={distribution}
              onChange={setDistribution}
              disabled={createSubmittal.isPending}
              label="CC Recipients"
              description="Select team members who should receive copies of this submittal."
            />
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createSubmittal.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createSubmittal.isPending}>
              {createSubmittal.isPending ? 'Creating...' : 'Create Submittal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
