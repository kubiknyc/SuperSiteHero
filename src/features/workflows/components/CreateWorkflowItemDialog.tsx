// File: /src/features/workflows/components/CreateWorkflowItemDialog.tsx
// Modal dialog for creating a new workflow item

import * as React from 'react'
import { useState } from 'react'
import { useCreateWorkflowItem } from '../hooks/useWorkflowItems'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CreateWorkflowItemDialogProps {
  projectId: string
  workflowTypeId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkflowItemDialog({
  projectId,
  workflowTypeId,
  open,
  onOpenChange,
}: CreateWorkflowItemDialogProps) {
  const createMutation = useCreateWorkflowItem()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [priority, setPriority] = useState('normal')
  const [status, setStatus] = useState('open')
  const [dueDate, setDueDate] = useState('')
  const [costImpact, setCostImpact] = useState('')
  const [scheduleImpact, setScheduleImpact] = useState('')

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setTitle('')
      setDescription('')
      setReferenceNumber('')
      setDiscipline('')
      setPriority('normal')
      setStatus('open')
      setDueDate('')
      setCostImpact('')
      setScheduleImpact('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !workflowTypeId) {
      return
    }

    createMutation.mutate(
      {
        project_id: projectId,
        workflow_type_id: workflowTypeId,
        title: title.trim(),
        description: description.trim() || null,
        reference_number: referenceNumber.trim() || null,
        discipline: discipline.trim() || null,
        priority,
        status,
        due_date: dueDate || null,
        cost_impact: costImpact ? parseFloat(costImpact) : null,
        schedule_impact: scheduleImpact ? parseInt(scheduleImpact) : null,
        number: null,
        assignees: null,
        raised_by: null,
        created_by: null,
        opened_date: null,
        closed_date: null,
        resolution: null,
        more_information: null,
        deleted_at: null,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Workflow Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter workflow item title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              id="reference_number"
              placeholder="RFI-001, CO-001, etc."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of the workflow item"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Discipline */}
          <div className="space-y-2">
            <Label htmlFor="discipline">Discipline</Label>
            <Input
              id="discipline"
              placeholder="e.g., Electrical, HVAC, Plumbing"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Due Date</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Cost and Schedule Impact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_impact">Cost Impact ($)</Label>
              <Input
                id="cost_impact"
                type="number"
                placeholder="0.00"
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule_impact">Schedule Impact (days)</Label>
              <Input
                id="schedule_impact"
                type="number"
                placeholder="0"
                value={scheduleImpact}
                onChange={(e) => setScheduleImpact(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !title.trim()}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
