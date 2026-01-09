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
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, AlertTriangle, DollarSign, Clock, FileText, X } from 'lucide-react'
import { useCreateRFIWithNotification } from '../hooks/useRFIMutations'
import { cn } from '@/lib/utils'
import { DistributionListPicker } from '@/components/distribution/DistributionListPicker'
import { RFITemplateSelector } from './RFITemplateSelector'
import type { DistributionSelection } from '@/types/distribution-list'
import type { RFITemplate } from '../utils/rfiTemplates'
import { logger } from '../../../lib/utils/logger';


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
  const [distribution, setDistribution] = useState<DistributionSelection>({
    listIds: [],
    userIds: [],
    externalContacts: [],
  })

  // Template state
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<RFITemplate | null>(null)

  const createRFI = useCreateRFIWithNotification()

  // Handle template selection
  const handleSelectTemplate = (template: RFITemplate) => {
    setSelectedTemplate(template)
    setTitle(template.titleTemplate)
    setDescription(template.descriptionTemplate)
    setPriority(template.priority)
    setDiscipline(template.discipline)
    setHasCostImpact(template.hasCostImpact)
    setHasScheduleImpact(template.hasScheduleImpact)
    // Add prompts to additional info if any
    if (template.additionalInfoPrompts.length > 0) {
      const prompts = template.additionalInfoPrompts.map(p => `- ${p}`).join('\n')
      setMoreInformation(`Consider including:\n${prompts}`)
    }
  }

  // Clear template
  const handleClearTemplate = () => {
    setSelectedTemplate(null)
  }

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Set default due date to 7 days from now (common contract requirement)
      const defaultDueDate = addDays(new Date(), 7)
      const formattedDate = format(defaultDueDate, 'yyyy-MM-dd')
      // Use setTimeout to avoid synchronous state update in effect
      setTimeout(() => setDueDate(formattedDate), 0)
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
    setDistribution({ listIds: [], userIds: [], externalContacts: [] })
    setSelectedTemplate(null)
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
      logger.error('Failed to create RFI:', error)
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
          <div className="flex items-center justify-between">
            <DialogTitle>Create RFI (Request for Information)</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateSelector(true)}
                disabled={createRFI.isPending}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Use Template
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClose}
                disabled={createRFI.isPending}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
          <DialogDescription>
            Submit a request for clarification from the design team or owner
          </DialogDescription>

          {/* Template indicator */}
          {selectedTemplate && (
            <div className="mt-2 p-2 bg-primary/10 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  Using template: {selectedTemplate.name}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClearTemplate}
                disabled={createRFI.isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Template Selector Dialog */}
        <RFITemplateSelector
          open={showTemplateSelector}
          onOpenChange={setShowTemplateSelector}
          onSelectTemplate={handleSelectTemplate}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-1">
              RFI Title <span className="text-error">*</span>
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
            <p className="text-xs text-muted">Be specific: "Foundation detail at grid B-5" vs "Foundation question"</p>
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
            <p className="text-xs text-muted">
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
          <div className="space-y-3 p-4 bg-warning-light border border-amber-200 rounded-lg">
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
                    ? 'bg-error-light border-red-300'
                    : 'bg-card border-border hover:border-input'
                )}
              >
                <Checkbox
                  checked={hasCostImpact}
                  onCheckedChange={(checked) => setHasCostImpact(checked === true)}
                  disabled={createRFI.isPending}
                />
                <DollarSign className={cn('h-4 w-4', hasCostImpact ? 'text-error' : 'text-disabled')} />
                <span className={cn('text-sm', hasCostImpact ? 'text-error-dark font-medium' : 'text-secondary')}>
                  Potential Cost Impact
                </span>
              </label>

              <label
                className={cn(
                  'flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors',
                  hasScheduleImpact
                    ? 'bg-orange-50 border-orange-300'
                    : 'bg-card border-border hover:border-input'
                )}
              >
                <Checkbox
                  checked={hasScheduleImpact}
                  onCheckedChange={(checked) => setHasScheduleImpact(checked === true)}
                  disabled={createRFI.isPending}
                />
                <Clock className={cn('h-4 w-4', hasScheduleImpact ? 'text-orange-600' : 'text-disabled')} />
                <span className={cn('text-sm', hasScheduleImpact ? 'text-orange-700 font-medium' : 'text-secondary')}>
                  Potential Schedule Impact
                </span>
              </label>
            </div>
          </div>

          {/* Distribution List */}
          {projectId && (
            <DistributionListPicker
              projectId={projectId}
              listType="rfi"
              value={distribution}
              onChange={setDistribution}
              disabled={createRFI.isPending}
              label="CC Recipients"
              description="Select team members who should receive copies of this RFI."
            />
          )}

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
