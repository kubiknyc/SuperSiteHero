// File: /src/features/notices/components/CreateNoticeDialog.tsx
// Dialog for creating a new notice

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useCreateNoticeWithNotification } from '../hooks'
import { NOTICE_TYPES, NOTICE_DIRECTIONS } from '../types'
import { Plus, CalendarPlus } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

interface CreateNoticeDialogProps {
  projectId: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function CreateNoticeDialog({
  projectId,
  trigger,
  onSuccess,
}: CreateNoticeDialogProps) {
  const [open, setOpen] = useState(false)

  // Form state
  const [noticeType, setNoticeType] = useState('general')
  const [direction, setDirection] = useState('outgoing')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [fromParty, setFromParty] = useState('')
  const [toParty, setToParty] = useState('')
  const [noticeDate, setNoticeDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [receivedDate, setReceivedDate] = useState('')
  const [responseDueDate, setResponseDueDate] = useState('')
  const [responseRequired, setResponseRequired] = useState(false)
  const [isCritical, setIsCritical] = useState(false)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')

  const createNotice = useCreateNoticeWithNotification()

  const resetForm = () => {
    setNoticeType('general')
    setDirection('outgoing')
    setSubject('')
    setDescription('')
    setFromParty('')
    setToParty('')
    setNoticeDate(new Date().toISOString().split('T')[0])
    setReceivedDate('')
    setResponseDueDate('')
    setResponseRequired(false)
    setIsCritical(false)
    setReferenceNumber('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim()) {
      return
    }

    try {
      await createNotice.mutateAsync({
        project_id: projectId,
        notice_type: noticeType,
        direction,
        subject: subject.trim(),
        description: description.trim() || null,
        from_party: fromParty.trim() || null,
        to_party: toParty.trim() || null,
        notice_date: noticeDate,
        received_date: receivedDate || null,
        response_due_date: responseDueDate || null,
        response_required: responseRequired,
        is_critical: isCritical,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
        status: direction === 'outgoing' ? 'sent' : 'received',
      })

      resetForm()
      setOpen(false)
      onSuccess?.()
    } catch (_error) {
      logger.error('Failed to create notice:', error)
    }
  }

  // Quick set response due date
  const setDueDateDaysFromNow = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    setResponseDueDate(date.toISOString().split('T')[0])
    setResponseRequired(true)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Notice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Notice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Direction and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="direction">Direction *</Label>
              <Select
                id="direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                {NOTICE_DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-type">Notice Type *</Label>
              <Select
                id="notice-type"
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value)}
              >
                {NOTICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the notice"
              required
            />
          </div>

          {/* From/To Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-party">From Party</Label>
              <Input
                id="from-party"
                value={fromParty}
                onChange={(e) => setFromParty(e.target.value)}
                placeholder="e.g., General Contractor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to-party">To Party</Label>
              <Input
                id="to-party"
                value={toParty}
                onChange={(e) => setToParty(e.target.value)}
                placeholder="e.g., Subcontractor Name"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notice-date">Notice Date *</Label>
              <Input
                id="notice-date"
                type="date"
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
                required
              />
            </div>

            {direction === 'incoming' && (
              <div className="space-y-2">
                <Label htmlFor="received-date">Received Date</Label>
                <Input
                  id="received-date"
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="response-due-date">Response Due Date</Label>
              <Input
                id="response-due-date"
                type="date"
                value={responseDueDate}
                onChange={(e) => {
                  setResponseDueDate(e.target.value)
                  if (e.target.value) {setResponseRequired(true)}
                }}
              />
              {/* Quick set buttons */}
              <div className="flex gap-1 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-0.5 h-auto"
                  onClick={() => setDueDateDaysFromNow(7)}
                >
                  +7 days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-0.5 h-auto"
                  onClick={() => setDueDateDaysFromNow(14)}
                >
                  +14 days
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-0.5 h-auto"
                  onClick={() => setDueDateDaysFromNow(30)}
                >
                  +30 days
                </Button>
              </div>
            </div>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference-number">Reference Number</Label>
            <Input
              id="reference-number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g., NOT-001"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the notice..."
              rows={4}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes (not visible externally)..."
              rows={2}
            />
          </div>

          {/* Flags */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="response-required"
                checked={responseRequired}
                onCheckedChange={(checked) =>
                  setResponseRequired(checked === true)
                }
              />
              <Label htmlFor="response-required" className="text-sm font-normal">
                Response Required
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="is-critical"
                checked={isCritical}
                onCheckedChange={(checked) => setIsCritical(checked === true)}
              />
              <Label htmlFor="is-critical" className="text-sm font-normal">
                Critical Notice
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createNotice.isPending}>
              {createNotice.isPending ? 'Creating...' : 'Create Notice'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
