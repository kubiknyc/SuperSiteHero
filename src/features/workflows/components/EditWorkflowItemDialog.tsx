// File: /src/features/workflows/components/EditWorkflowItemDialog.tsx
// Modal dialog for editing a workflow item

import * as React from 'react'
import { useState, useEffect, useRef } from 'react'
import { useUpdateWorkflowItem } from '../hooks/useWorkflowItems'
import { useProjectUsers } from '../hooks/useWorkflowItemAssignees'
import type { WorkflowItem } from '@/types/database'
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
import { Loader2 } from 'lucide-react'

interface EditWorkflowItemDialogProps {
  workflowItem: WorkflowItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditWorkflowItemDialog({
  workflowItem,
  open,
  onOpenChange,
}: EditWorkflowItemDialogProps) {
  const updateMutation = useUpdateWorkflowItem()
  const { data: projectUsers, isLoading: usersLoading } = useProjectUsers(workflowItem.project_id)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [costImpact, setCostImpact] = useState('')
  const [scheduleImpact, setScheduleImpact] = useState('')
  const [resolution, setResolution] = useState('')
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])

  const prevOpenRef = useRef(open)

  // Initialize form when dialog opens
  useEffect(() => {
    const isOpening = open && !prevOpenRef.current
    prevOpenRef.current = open

    if (isOpening && workflowItem) {
      setTimeout(() => {
        setTitle(workflowItem.title || '')
        setDescription(workflowItem.description || '')
        setReferenceNumber(workflowItem.reference_number || '')
        setDiscipline(workflowItem.discipline || '')
        setPriority(workflowItem.priority || 'normal')
        setStatus(workflowItem.status || 'open')
        setDueDate(workflowItem.due_date ? workflowItem.due_date.split('T')[0] : '')
        setCostImpact(workflowItem.cost_impact?.toString() || '')
        setScheduleImpact(workflowItem.schedule_impact?.toString() || '')
        setResolution(workflowItem.resolution || '')
        setSelectedAssignees(workflowItem.assignees || [])
      }, 0)
    }
  }, [open, workflowItem])

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    updateMutation.mutate(
      {
        id: workflowItem.id,
        title: title.trim(),
        description: description.trim() || null,
        reference_number: referenceNumber.trim() || null,
        discipline: discipline.trim() || null,
        priority,
        status,
        due_date: dueDate || null,
        cost_impact: costImpact ? parseFloat(costImpact) : null,
        schedule_impact: scheduleImpact ? parseInt(scheduleImpact) : null,
        resolution: resolution.trim() || null,
        assignees: selectedAssignees.length > 0 ? selectedAssignees : null,
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
          <DialogTitle>Edit Workflow Item</DialogTitle>
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

          {/* Resolution */}
          <div className="space-y-2">
            <Label htmlFor="resolution">Resolution</Label>
            <Textarea
              id="resolution"
              placeholder="Resolution notes"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={2}
            />
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label>Assignees</Label>
            {usersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading users...
              </div>
            ) : projectUsers && projectUsers.length > 0 ? (
              <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                {projectUsers.map((pu) => (
                  <label
                    key={pu.user_id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-surface cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(pu.user_id)}
                      onChange={() => toggleAssignee(pu.user_id)}
                      className="h-4 w-4 rounded border-input text-primary"
                    />
                    <span className="text-sm">
                      {pu.user?.full_name || pu.user?.email || 'Unknown User'}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No users available for this project</p>
            )}
            {selectedAssignees.length > 0 && (
              <p className="text-xs text-muted">
                {selectedAssignees.length} user(s) selected
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !title.trim()}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
