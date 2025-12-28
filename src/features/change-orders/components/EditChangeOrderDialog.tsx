// File: /src/features/change-orders/components/EditChangeOrderDialog.tsx
// Dialog for editing an existing change order

import { useEffect, useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { useUpdateChangeOrderWithNotification } from '../hooks/useChangeOrderMutations'
import type { Database } from '@/types/database'
import { logger } from '../../../lib/utils/logger';


type WorkflowItem = Database['public']['Tables']['workflow_items']['Row']

interface EditChangeOrderDialogProps {
  changeOrder: WorkflowItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditChangeOrderDialog({
  changeOrder,
  open,
  onOpenChange,
}: EditChangeOrderDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [costImpact, setCostImpact] = useState('')
  const [scheduleImpact, setScheduleImpact] = useState('')
  const [status, setStatus] = useState('draft')

  const updateChangeOrder = useUpdateChangeOrderWithNotification()
  const prevOpenRef = useRef(open)

  // Initialize form with change order data
  useEffect(() => {
    const isOpening = open && !prevOpenRef.current
    prevOpenRef.current = open

    if (isOpening && changeOrder) {
      setTimeout(() => {
        setTitle(changeOrder.title || '')
        setDescription(changeOrder.description || '')
        setPriority((changeOrder.priority as 'low' | 'normal' | 'high') || 'normal')
        setCostImpact(changeOrder.cost_impact?.toString() || '')
        setScheduleImpact(changeOrder.schedule_impact?.toString() || '')
        setStatus(changeOrder.status || 'draft')
      }, 0)
    }
  }, [open, changeOrder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !changeOrder?.id) {
      return
    }

    try {
      await updateChangeOrder.mutateAsync({
        id: changeOrder.id,
        updates: {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          cost_impact: costImpact ? parseFloat(costImpact) : null,
          schedule_impact: scheduleImpact ? parseInt(scheduleImpact) : null,
          status,
        },
      })

      onOpenChange(false)
    } catch (error) {
      logger.error('Failed to update change order:', error)
    }
  }

  if (!changeOrder) {return null}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Change Order #{changeOrder.number}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the change"
              required
              disabled={updateChangeOrder.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the change and reason..."
              rows={4}
              disabled={updateChangeOrder.isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={updateChangeOrder.isPending}
              >
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                id="edit-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'normal' | 'high')}
                disabled={updateChangeOrder.isPending}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cost-impact">Cost Impact ($)</Label>
              <Input
                id="edit-cost-impact"
                type="number"
                step="0.01"
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
                placeholder="0.00"
                disabled={updateChangeOrder.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-schedule-impact">Schedule Impact (days)</Label>
              <Input
                id="edit-schedule-impact"
                type="number"
                value={scheduleImpact}
                onChange={(e) => setScheduleImpact(e.target.value)}
                placeholder="0"
                disabled={updateChangeOrder.isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateChangeOrder.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateChangeOrder.isPending}>
              {updateChangeOrder.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
