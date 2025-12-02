// File: /src/features/rfis/components/CreateRFIDialog.tsx
// Enhanced dialog for creating a new RFI with all workflow fields

import { useState, useEffect } from 'react'
import { addDays, format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Calendar, AlertTriangle, DollarSign, Clock } from 'lucide-react'
import { useCreateRFIWithNotification } from '../hooks/useRFIMutations'
import { cn } from '@/lib/utils'

interface CreateRFIDialogProps {
  projectId: string | undefined
  workflowTypeId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type Priority = 'low' | 'normal' | 'high'

// Common disciplines in construction
const DISCIPLINES = [
  'Architectural',
  'Structural',
  'Mechanical',
  'Electrical',
  'Plumbing',
  'Civil',
  'Landscape',
  'Interior Design',
  'Fire Protection',
  'General',
  'Other',
]

export function CreateRFIDialog({
  projectId,
  workflowTypeId,
  open,
  onOpenChange,
  onSuccess,
}: CreateRFIDialogProps) {
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [moreInformation, setMoreInformation] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [discipline, setDiscipline] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [hasCostImpact, setHasCostImpact] = useState(false)
  const [hasScheduleImpact, setHasScheduleImpact] = useState(false)

  const createRFI = useCreateRFIWithNotification()

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Set default due date to 7 days from now (common contract requirement)
      const defaultDueDate = addDays(new Date(), 7)
      setDueDate(format(defaultDueDate, 'yyyy-MM-dd'))
    }
  }, [open])

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setMoreInformation('')
    setPriority('normal')
    setDiscipline('')
    setDueDate('')
    setHasCostImpact(false)
    setHasScheduleImpact(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !projectId || !workflowTypeId) {
      return
    }

    try {
      // Build more_information with impact flags if set
      let additionalInfo = moreInformation.trim()
      const impactNotes: string[] = []
      if (hasCostImpact) {
        impactNotes.push('COST IMPACT: Yes')
      }
      if (hasScheduleImpact) {
        impactNotes.push('SCHEDULE IMPACT: Yes')
      }
      if (impactNotes.length > 0) {
        additionalInfo = additionalInfo
          ? `${additionalInfo}\n\n--- Impact Assessment ---\n${impactNotes.join('\n')}`
          : `--- Impact Assessment ---\n${impactNotes.join('\n')}`
      }

      await createRFI.mutateAsync({
        project_id: projectId,
        workflow_type_id: workflowTypeId,
        title: title.trim(),
        description: description.trim() || undefined,
        more_information: additionalInfo || undefined,
        discipline: discipline || undefined,
        priority,
        due_date: dueDate || undefined,
        assignees: [],
      })

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create RFI:', error)
    }
  }

  const handleClose = () => {
    if (!createRFI.isPending) {
      resetForm()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create RFI (Request for Information)</DialogTitle>
          <DialogDescription>
            Submit a request for clarification from the design team or owner
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-1">
              RFI Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief, descriptive title for the RFI"
              required
              disabled={createRFI.isPending}
              maxLength={255}
            />
            <p className="text-xs text-gray-500">Be specific: "Foundation detail at grid B-5" vs "Foundation question"</p>
          </div>

          {/* Priority and Discipline Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                disabled={createRFI.isPending}
              >
                <option value="low">Low - Routine clarification</option>
                <option value="normal">Normal - Standard timeline</option>
                <option value="high">High - Urgent response needed</option>
              </Select>
            </div>

            {/* Discipline */}
            <div className="space-y-2">
              <Label htmlFor="discipline">Discipline</Label>
              <Select
                id="discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                disabled={createRFI.isPending}
              >
                <option value="">Select discipline...</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label htmlFor="due-date" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Due Date
            </Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={createRFI.isPending}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            <p className="text-xs text-gray-500">
              Default is 7 days. Check your contract for required response times.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what information is being requested. Include:&#10;- Specific location (grid lines, rooms, elevations)&#10;- Drawing/spec references&#10;- What clarification is needed"
              rows={4}
              disabled={createRFI.isPending}
            />
          </div>

          {/* Additional Information */}
          <div className="space-y-2">
            <Label htmlFor="more-info">Additional Information / Supporting Details</Label>
            <Textarea
              id="more-info"
              value={moreInformation}
              onChange={(e) => setMoreInformation(e.target.value)}
              placeholder="Any additional context, background, or proposed solutions..."
              rows={3}
              disabled={createRFI.isPending}
            />
          </div>

          {/* Impact Flags */}
          <div className="space-y-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">Impact Assessment</span>
            </div>
            <p className="text-xs text-amber-700">
              Flag if this RFI may affect project cost or schedule. This helps prioritize responses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <label
                className={cn(
                  'flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors',
                  hasCostImpact
                    ? 'bg-red-50 border-red-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                )}
              >
                <Checkbox
                  checked={hasCostImpact}
                  onCheckedChange={(checked) => setHasCostImpact(checked === true)}
                  disabled={createRFI.isPending}
                />
                <DollarSign className={cn('h-4 w-4', hasCostImpact ? 'text-red-600' : 'text-gray-400')} />
                <span className={cn('text-sm', hasCostImpact ? 'text-red-700 font-medium' : 'text-gray-700')}>
                  Potential Cost Impact
                </span>
              </label>

              <label
                className={cn(
                  'flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors',
                  hasScheduleImpact
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                )}
              >
                <Checkbox
                  checked={hasScheduleImpact}
                  onCheckedChange={(checked) => setHasScheduleImpact(checked === true)}
                  disabled={createRFI.isPending}
                />
                <Clock className={cn('h-4 w-4', hasScheduleImpact ? 'text-orange-600' : 'text-gray-400')} />
                <span className={cn('text-sm', hasScheduleImpact ? 'text-orange-700 font-medium' : 'text-gray-700')}>
                  Potential Schedule Impact
                </span>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createRFI.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createRFI.isPending}>
              {createRFI.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createRFI.isPending ? 'Creating...' : 'Create RFI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
