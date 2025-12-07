// @ts-nocheck
// File: /src/features/rfis/components/CreateDedicatedRFIDialog.tsx
// Dialog for creating a new RFI using the dedicated rfis table with ball-in-court tracking

import { useState, useEffect } from 'react'
import { addDays, format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  Loader2,
  Calendar,
  AlertTriangle,
  DollarSign,
  Clock,
  FileText,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useCreateRFI,
  RFI_PRIORITIES,
  BALL_IN_COURT_ROLES,
} from '../hooks/useDedicatedRFIs'
import type { RFIPriority, BallInCourtRole } from '@/types/database-extensions'

interface CreateDedicatedRFIDialogProps {
  projectId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

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

export function CreateDedicatedRFIDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: CreateDedicatedRFIDialogProps) {
  // Form state
  const [subject, setSubject] = useState('')
  const [question, setQuestion] = useState('')
  const [drawingReference, setDrawingReference] = useState('')
  const [specSection, setSpecSection] = useState('')
  const [priority, setPriority] = useState<RFIPriority>('normal')
  const [discipline, setDiscipline] = useState('')
  const [dateRequired, setDateRequired] = useState('')
  const [ballInCourtRole, setBallInCourtRole] = useState<BallInCourtRole | ''>('')
  const [costImpact, setCostImpact] = useState<string>('')
  const [scheduleImpactDays, setScheduleImpactDays] = useState<string>('')

  const createRFI = useCreateRFI()

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Set default due date to 7 days from now (common contract requirement)
      const defaultDueDate = addDays(new Date(), 7)
      setDateRequired(format(defaultDueDate, 'yyyy-MM-dd'))
      // Default ball-in-court to Architect
      setBallInCourtRole('architect')
    }
  }, [open])

  const resetForm = () => {
    setSubject('')
    setQuestion('')
    setDrawingReference('')
    setSpecSection('')
    setPriority('normal')
    setDiscipline('')
    setDateRequired('')
    setBallInCourtRole('')
    setCostImpact('')
    setScheduleImpactDays('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !question.trim() || !projectId) {
      return
    }

    try {
      await createRFI.mutateAsync({
        project_id: projectId,
        subject: subject.trim(),
        question: question.trim(),
        drawing_reference: drawingReference.trim() || null,
        spec_section: specSection.trim() || null,
        priority,
        discipline: discipline || null,
        date_required: dateRequired || null,
        ball_in_court_role: ballInCourtRole || null,
        cost_impact: costImpact ? parseFloat(costImpact) : null,
        schedule_impact_days: scheduleImpactDays ? parseInt(scheduleImpactDays, 10) : null,
        status: 'draft',
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
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="flex items-center gap-1">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief, descriptive subject for the RFI"
              required
              disabled={createRFI.isPending}
              maxLength={255}
            />
            <p className="text-xs text-gray-500">
              Be specific: "Foundation detail at grid B-5" vs "Foundation question"
            </p>
          </div>

          {/* Priority and Discipline Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as RFIPriority)}
                disabled={createRFI.isPending}
              >
                {RFI_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
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

          {/* Drawing Reference and Spec Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="drawing-reference" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                Drawing Reference
              </Label>
              <Input
                id="drawing-reference"
                value={drawingReference}
                onChange={(e) => setDrawingReference(e.target.value)}
                placeholder="e.g., A-101, S-201, M-301"
                disabled={createRFI.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spec-section" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                Spec Section
              </Label>
              <Input
                id="spec-section"
                value={specSection}
                onChange={(e) => setSpecSection(e.target.value)}
                placeholder="e.g., 03 30 00"
                disabled={createRFI.isPending}
              />
              <p className="text-xs text-gray-500">CSI MasterFormat section</p>
            </div>
          </div>

          {/* Date Required and Ball-in-Court */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-required" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Response Required By
              </Label>
              <Input
                id="date-required"
                type="date"
                value={dateRequired}
                onChange={(e) => setDateRequired(e.target.value)}
                disabled={createRFI.isPending}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
              <p className="text-xs text-gray-500">
                Default is 7 days. Check your contract for required response times.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ball-in-court" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ball-in-Court
              </Label>
              <Select
                id="ball-in-court"
                value={ballInCourtRole}
                onChange={(e) => setBallInCourtRole(e.target.value as BallInCourtRole)}
                disabled={createRFI.isPending}
              >
                <option value="">Select responsible party...</option>
                {BALL_IN_COURT_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-gray-500">Who is responsible for responding?</p>
            </div>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question" className="flex items-center gap-1">
              Question <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Detailed description of what information is being requested. Include:&#10;- Specific location (grid lines, rooms, elevations)&#10;- What clarification is needed&#10;- Any proposed solution for consideration"
              rows={5}
              required
              disabled={createRFI.isPending}
            />
          </div>

          {/* Impact Assessment */}
          <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">Impact Assessment</span>
            </div>
            <p className="text-xs text-amber-700">
              Flag if this RFI may affect project cost or schedule. This helps prioritize responses.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost-impact" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Estimated Cost Impact
                </Label>
                <Input
                  id="cost-impact"
                  type="number"
                  min="0"
                  step="100"
                  value={costImpact}
                  onChange={(e) => setCostImpact(e.target.value)}
                  placeholder="0.00"
                  disabled={createRFI.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-impact" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  Schedule Impact (Days)
                </Label>
                <Input
                  id="schedule-impact"
                  type="number"
                  min="0"
                  value={scheduleImpactDays}
                  onChange={(e) => setScheduleImpactDays(e.target.value)}
                  placeholder="0"
                  disabled={createRFI.isPending}
                />
              </div>
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
            <Button
              type="submit"
              disabled={!subject.trim() || !question.trim() || createRFI.isPending}
            >
              {createRFI.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {createRFI.isPending ? 'Creating...' : 'Create RFI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDedicatedRFIDialog
