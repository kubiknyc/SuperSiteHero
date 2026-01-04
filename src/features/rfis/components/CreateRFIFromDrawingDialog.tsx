/**
 * CreateRFIFromDrawingDialog Component
 *
 * Streamlined dialog for creating an RFI directly from a drawing view.
 * Pre-populates drawing reference and pin location from the viewer context.
 *
 * This is a quick-create flow for when users click on a drawing to create an RFI.
 * For the full RFI creation form, use CreateDedicatedRFIDialog.
 */

import { useState, useEffect, useMemo } from 'react'
import { addDays, format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Calendar,
  MapPin,
  FileImage,
  AlertCircle,
} from 'lucide-react'
import {
  useCreateRFI,
  RFI_PRIORITIES,
  BALL_IN_COURT_ROLES,
} from '../hooks/useDedicatedRFIs'
import { useAddRFIDrawingLink } from '../hooks/useRFIDrawingLinks'
import { logger } from '@/lib/utils/logger'
import type { RFIPriority, BallInCourtRole } from '@/types/database-extensions'

// =============================================
// Types
// =============================================

export interface DrawingContext {
  documentId: string
  documentTitle: string
  drawingNumber?: string
  discipline?: string
  pinX: number
  pinY: number
  fileUrl?: string
}

interface CreateRFIFromDrawingDialogProps {
  projectId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Drawing context including pin location */
  drawingContext?: DrawingContext
  onSuccess?: (rfiId: string) => void
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

// =============================================
// Component
// =============================================

export function CreateRFIFromDrawingDialog({
  projectId,
  open,
  onOpenChange,
  drawingContext,
  onSuccess,
}: CreateRFIFromDrawingDialogProps) {
  // Form state
  const [subject, setSubject] = useState('')
  const [question, setQuestion] = useState('')
  const [priority, setPriority] = useState<RFIPriority>('normal')
  const [discipline, setDiscipline] = useState('')
  const [dateRequired, setDateRequired] = useState('')
  const [ballInCourtRole, setBallInCourtRole] = useState<BallInCourtRole | ''>('architect')
  const [pinLabel, setPinLabel] = useState('')

  const createRFI = useCreateRFI()
  const addDrawingLink = useAddRFIDrawingLink()

  // Memoize today's date to avoid calling format(new Date()) during render
  const minDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // Reset and initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setSubject('')
      setQuestion('')
      setPriority('normal')
      setBallInCourtRole('architect')
      setPinLabel('')

      // Set default due date to 7 days from now
      setTimeout(() => {
        const defaultDueDate = addDays(new Date(), 7)
        setDateRequired(format(defaultDueDate, 'yyyy-MM-dd'))
      }, 0)

      // Pre-fill discipline from drawing if available
      if (drawingContext?.discipline) {
        setDiscipline(drawingContext.discipline)
      } else {
        setDiscipline('')
      }
    }
  }, [open, drawingContext])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !question.trim() || !projectId || !drawingContext) {
      return
    }

    try {
      const createdRFI = await createRFI.mutateAsync({
        project_id: projectId,
        subject: subject.trim(),
        question: question.trim(),
        drawing_reference: drawingContext.drawingNumber || null,
        spec_section: null,
        priority,
        discipline: discipline || null,
        date_required: dateRequired || null,
        ball_in_court_role: ballInCourtRole || null,
        cost_impact: null,
        schedule_impact_days: null,
        status: 'draft',
        distribution_list: [],
      })

      // Create the drawing link with pin location
      if (createdRFI?.rfi?.id) {
        try {
          await addDrawingLink.mutateAsync({
            rfi_id: createdRFI.rfi.id,
            document_id: drawingContext.documentId,
            drawing_number: drawingContext.drawingNumber,
            pin_x: drawingContext.pinX,
            pin_y: drawingContext.pinY,
            pin_label: pinLabel || undefined,
          })
        } catch (linkError) {
          logger.warn('Failed to create drawing link:', linkError)
        }

        onOpenChange(false)
        onSuccess?.(createdRFI.rfi.id)
      }
    } catch (error) {
      logger.error('Failed to create RFI from drawing:', error)
    }
  }

  const handleClose = () => {
    if (!createRFI.isPending) {
      onOpenChange(false)
    }
  }

  const isPending = createRFI.isPending || addDrawingLink.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Create RFI from Drawing
          </DialogTitle>
          <DialogDescription>
            Create a request for information about this location on the drawing
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drawing Context Display */}
          {drawingContext && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileImage className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-purple-900">
                      {drawingContext.drawingNumber || 'Drawing'}
                    </span>
                    {drawingContext.discipline && (
                      <Badge variant="outline" className="text-xs">
                        {drawingContext.discipline}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-purple-700 truncate">
                    {drawingContext.documentTitle}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-purple-600">
                    <MapPin className="h-3 w-3" />
                    <span>
                      Pin at ({(drawingContext.pinX * 100).toFixed(1)}%, {(drawingContext.pinY * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="rfi-subject" className="flex items-center gap-1">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rfi-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief, descriptive subject for the RFI"
              required
              disabled={isPending}
              maxLength={255}
              autoFocus
            />
          </div>

          {/* Priority and Discipline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rfi-priority">Priority</Label>
              <Select
                id="rfi-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as RFIPriority)}
                disabled={isPending}
              >
                {RFI_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfi-discipline">Discipline</Label>
              <Select
                id="rfi-discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                disabled={isPending}
              >
                <option value="">Select...</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Date Required and Ball-in-Court */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rfi-date" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due Date
              </Label>
              <Input
                id="rfi-date"
                type="date"
                value={dateRequired}
                onChange={(e) => setDateRequired(e.target.value)}
                disabled={isPending}
                min={minDate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfi-ball-in-court">Ball-in-Court</Label>
              <Select
                id="rfi-ball-in-court"
                value={ballInCourtRole}
                onChange={(e) => setBallInCourtRole(e.target.value as BallInCourtRole)}
                disabled={isPending}
              >
                <option value="">Select...</option>
                {BALL_IN_COURT_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Pin Label */}
          <div className="space-y-2">
            <Label htmlFor="pin-label" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Location Label
            </Label>
            <Input
              id="pin-label"
              value={pinLabel}
              onChange={(e) => setPinLabel(e.target.value)}
              placeholder="e.g., Grid B-5, Room 204, Detail 3"
              disabled={isPending}
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground">
              Optional label to identify this location on the drawing
            </p>
          </div>

          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="rfi-question" className="flex items-center gap-1">
              Question <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rfi-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Describe what clarification you need about this location..."
              rows={4}
              required
              disabled={isPending}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!subject.trim() || !question.trim() || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Creating...' : 'Create RFI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateRFIFromDrawingDialog
