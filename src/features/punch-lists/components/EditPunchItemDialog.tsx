// File: /src/features/punch-lists/components/EditPunchItemDialog.tsx
// Modal dialog for editing an existing punch item

import * as React from 'react'
import { useState, useEffect } from 'react'
import { useUpdatePunchItemWithNotification } from '../hooks/usePunchItemsMutations'
import type { PunchItem, PunchItemStatus, Priority } from '@/types/database'
import { AssigneeSelector, type Assignee } from '@/components/AssigneeSelector'
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
import { VoiceInputButton } from '@/components/ui/voice-input'
import { LazyFloorPlanPinDrop, type PinLocation } from './LazyFloorPlanPinDrop'

interface EditPunchItemDialogProps {
  punchItem: PunchItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPunchItemDialog({
  punchItem,
  open,
  onOpenChange,
}: EditPunchItemDialogProps) {
  const updateMutation = useUpdatePunchItemWithNotification()

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
  const [assignee, setAssignee] = useState<Assignee | null>(null)
  const [floorPlanLocation, setFloorPlanLocation] = useState<PinLocation | null>(null)

  // Load punch item data when dialog opens
  useEffect(() => {
    if (punchItem && open) {
      setTitle(punchItem.title || '')
      setTrade(punchItem.trade || '')
      setDescription(punchItem.description || '')
      setBuilding(punchItem.building || '')
      setFloor(punchItem.floor || '')
      setRoom(punchItem.room || '')
      setArea(punchItem.area || '')
      setLocationNotes(punchItem.location_notes || '')
      setPriority(punchItem.priority || 'medium')
      setStatus(punchItem.status || 'open')
      setDueDate(punchItem.due_date || '')
      // Initialize assignee from existing data
      if (punchItem.subcontractor_id) {
        setAssignee({
          type: 'subcontractor',
          id: punchItem.subcontractor_id,
        })
      } else if (punchItem.assigned_to) {
        setAssignee({
          type: 'user',
          id: punchItem.assigned_to,
        })
      } else {
        setAssignee(null)
      }
      // Load floor plan location if exists
      const existingLocation = (punchItem as any).floor_plan_location
      if (existingLocation) {
        setFloorPlanLocation(existingLocation as PinLocation)
      } else {
        setFloorPlanLocation(null)
      }
    }
  }, [punchItem, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!punchItem || !title.trim() || !trade.trim()) {
      return
    }

    updateMutation.mutate(
      {
        id: punchItem.id,
        updates: {
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
          subcontractor_id: assignee?.type === 'subcontractor' ? assignee.id : null,
          assigned_to: assignee?.type === 'user' ? assignee.id : null,
          // Floor plan location
          floor_plan_location: floorPlanLocation || null,
          floor_plan_document_id: floorPlanLocation?.documentId || null,
        } as any,  // Type assertion needed until database types regenerated
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
          <DialogTitle>Edit Punch Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title - Required */}
            <div className="md:col-span-2">
              <Label htmlFor="title">
                Title <span className="text-error">*</span>
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
                Trade <span className="text-error">*</span>
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
                value={priority || ''}
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
                value={status || ''}
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

            {/* Assignee */}
            {punchItem && (
              <div className="md:col-span-2">
                <AssigneeSelector
                  projectId={punchItem.project_id}
                  value={assignee}
                  onChange={setAssignee}
                  label="Assign To"
                  placeholder="Select assignee..."
                  showUnassigned={true}
                />
              </div>
            )}

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

          {/* Floor Plan Pin Drop */}
          {punchItem && (
            <LazyFloorPlanPinDrop
              projectId={punchItem.project_id}
              value={floorPlanLocation}
              onChange={setFloorPlanLocation}
            />
          )}

          {/* Description with Voice Input */}
          <div>
            <Label htmlFor="description">Description</Label>
            <div className="relative">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the punch item (tap mic to dictate)"
                rows={3}
                className="pr-12"
              />
              <div className="absolute right-2 top-2">
                <VoiceInputButton
                  onTranscript={setDescription}
                  currentValue={description}
                  mode="append"
                />
              </div>
            </div>
          </div>

          {/* Location Notes with Voice Input */}
          <div>
            <Label htmlFor="location_notes">Location Notes</Label>
            <div className="relative">
              <Textarea
                id="location_notes"
                value={locationNotes}
                onChange={(e) => setLocationNotes(e.target.value)}
                placeholder="Additional location details (tap mic to dictate)"
                rows={2}
                className="pr-12"
              />
              <div className="absolute right-2 top-2">
                <VoiceInputButton
                  onTranscript={setLocationNotes}
                  currentValue={locationNotes}
                  mode="append"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
