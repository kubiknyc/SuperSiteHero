// File: /src/features/punch-lists/components/CreatePunchItemDialog.tsx
// Modal dialog for creating a new punch item

import * as React from 'react'
import { useState } from 'react'
import { useCreatePunchItemWithNotification } from '../hooks/usePunchItemsMutations'
import type { PunchItemStatus, Priority } from '@/types/database'
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
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface CreatePunchItemDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePunchItemDialog({
  projectId,
  open,
  onOpenChange,
}: CreatePunchItemDialogProps) {
  const createMutation = useCreatePunchItemWithNotification()

  // Form state
  const [title, setTitle] = useState('')
  const [trade, setTrade] = useState('')
  const [description, setDescription] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [room, setRoom] = useState('')
  const [area, setArea] = useState('')
  const [locationNotes, setLocationNotes] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [status, setStatus] = useState<PunchItemStatus>('open')
  const [dueDate, setDueDate] = useState('')

  // Reset form when dialog closes
  React.useEffect(() => {
    if (!open) {
      setTitle('')
      setTrade('')
      setDescription('')
      setBuilding('')
      setFloor('')
      setRoom('')
      setArea('')
      setLocationNotes('')
      setPriority('normal')
      setStatus('open')
      setDueDate('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !trade.trim()) {
      return
    }

    createMutation.mutate(
      {
        project_id: projectId,
        title: title.trim(),
        trade: trade.trim(),
        description: description.trim() || null,
        building: building.trim() || null,
        floor: floor.trim() || null,
        room: room.trim() || null,
        area: area.trim() || null,
        location_notes: locationNotes.trim() || null,
        priority,
        status,
        due_date: dueDate || null,
        number: null,
        subcontractor_id: null,
        assigned_to: null,
        completed_date: null,
        verified_date: null,
        marked_complete_by: null,
        marked_complete_at: null,
        verified_by: null,
        verified_at: null,
        rejection_notes: null,
        created_by: null,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Punch Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title - Required */}
            <div className="md:col-span-2">
              <Label htmlFor="title">
                Title <span className="text-red-600">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                required
              />
            </div>

            {/* Trade - Required */}
            <div>
              <Label htmlFor="trade">
                Trade <span className="text-red-600">*</span>
              </Label>
              <Input
                id="trade"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                placeholder="e.g., Electrical, Plumbing"
                required
              />
            </div>

            {/* Priority */}
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PunchItemStatus)}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="ready_for_review">Ready for Review</option>
                <option value="completed">Completed</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Select>
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Building */}
            <div>
              <Label htmlFor="building">Building</Label>
              <Input
                id="building"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="Building name or number"
              />
            </div>

            {/* Floor */}
            <div>
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g., 1st Floor, Basement"
              />
            </div>

            {/* Room */}
            <div>
              <Label htmlFor="room">Room</Label>
              <Input
                id="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Room number or name"
              />
            </div>

            {/* Area */}
            <div>
              <Label htmlFor="area">Area</Label>
              <Input
                id="area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Specific area within location"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the punch item"
              rows={3}
            />
          </div>

          {/* Location Notes */}
          <div>
            <Label htmlFor="location_notes">Location Notes</Label>
            <Textarea
              id="location_notes"
              value={locationNotes}
              onChange={(e) => setLocationNotes(e.target.value)}
              placeholder="Additional location details"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
