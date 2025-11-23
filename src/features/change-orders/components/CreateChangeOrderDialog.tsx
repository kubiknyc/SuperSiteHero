// File: /src/features/change-orders/components/CreateChangeOrderDialog.tsx
// Dialog for creating a new change order

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useCreateChangeOrderWithNotification } from '../hooks/useChangeOrderMutations'
import { Plus } from 'lucide-react'

interface CreateChangeOrderDialogProps {
  projectId: string
  workflowTypeId: string
}

export function CreateChangeOrderDialog({ projectId, workflowTypeId }: CreateChangeOrderDialogProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [costImpact, setCostImpact] = useState('')
  const [scheduleImpact, setScheduleImpact] = useState('')

  const createChangeOrder = useCreateChangeOrderWithNotification()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      return
    }

    try {
      await createChangeOrder.mutateAsync({
        project_id: projectId,
        workflow_type_id: workflowTypeId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        cost_impact: costImpact ? parseFloat(costImpact) : null,
        schedule_impact: scheduleImpact ? parseInt(scheduleImpact) : null,
        assignees: [],
      })

      // Reset form and close dialog
      setTitle('')
      setDescription('')
      setPriority('normal')
      setCostImpact('')
      setScheduleImpact('')
      setOpen(false)
    } catch (error) {
      console.error('Failed to create change order:', error)
      // Error toast is shown automatically by the mutation hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Change Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Change Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the change"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the change and reason..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-impact">Cost Impact ($)</Label>
              <Input
                id="cost-impact"
                type="number"
                step="0.01"
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule-impact">Schedule Impact (days)</Label>
              <Input
                id="schedule-impact"
                type="number"
                value={scheduleImpact}
                onChange={(e) => setScheduleImpact(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createChangeOrder.isPending}>
              {createChangeOrder.isPending ? 'Creating...' : 'Create Change Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}