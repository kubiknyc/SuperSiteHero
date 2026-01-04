/**
 * CreateSubmittalFromDrawingDialog Component
 *
 * Streamlined dialog for creating a Submittal directly from a drawing view.
 * Pre-populates drawing reference and pin location from the viewer context.
 *
 * This is a quick-create flow for when users click on a drawing to create a submittal.
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
  FileCheck,
} from 'lucide-react'
import {
  useCreateSubmittal,
  SUBMITTAL_TYPES,
  BALL_IN_COURT_ENTITIES,
} from '../hooks/useDedicatedSubmittals'
import { useAddSubmittalDrawingLink } from '../hooks/useSubmittalDrawingLinks'
import { logger } from '@/lib/utils/logger'
import type { SubmittalType, BallInCourtEntity } from '@/types/database-extensions'

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

interface CreateSubmittalFromDrawingDialogProps {
  projectId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Drawing context including pin location */
  drawingContext?: DrawingContext
  onSuccess?: (submittalId: string) => void
}

// =============================================
// Component
// =============================================

export function CreateSubmittalFromDrawingDialog({
  projectId,
  open,
  onOpenChange,
  drawingContext,
  onSuccess,
}: CreateSubmittalFromDrawingDialogProps) {
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [specSection, setSpecSection] = useState('')
  const [specSectionTitle, setSpecSectionTitle] = useState('')
  const [submittalType, setSubmittalType] = useState<SubmittalType>('shop_drawing')
  const [dateRequired, setDateRequired] = useState('')
  const [ballInCourt, setBallInCourt] = useState<BallInCourtEntity | ''>('contractor')
  const [pinLabel, setPinLabel] = useState('')

  const createSubmittal = useCreateSubmittal()
  const addDrawingLink = useAddSubmittalDrawingLink()

  // Memoize today's date to avoid calling format(new Date()) during render
  const minDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  // Reset and initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setTitle('')
      setDescription('')
      setSpecSection('')
      setSpecSectionTitle('')
      setSubmittalType('shop_drawing')
      setBallInCourt('contractor')
      setPinLabel('')

      // Set default due date to 14 days from now (typical submittal lead time)
      setTimeout(() => {
        const defaultDueDate = addDays(new Date(), 14)
        setDateRequired(format(defaultDueDate, 'yyyy-MM-dd'))
      }, 0)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !projectId || !drawingContext) {
      return
    }

    try {
      const createdSubmittal = await createSubmittal.mutateAsync({
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        spec_section: specSection.trim() || null,
        spec_section_title: specSectionTitle.trim() || null,
        submittal_type: submittalType,
        date_required: dateRequired || null,
        ball_in_court: ballInCourt || null,
        review_status: 'not_submitted',
        drawing_reference: drawingContext.drawingNumber || null,
      })

      // Create the drawing link with pin location
      if (createdSubmittal?.id) {
        try {
          await addDrawingLink.mutateAsync({
            submittal_id: createdSubmittal.id,
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
        onSuccess?.(createdSubmittal.id)
      }
    } catch (error) {
      logger.error('Failed to create submittal from drawing:', error)
    }
  }

  const handleClose = () => {
    if (!createSubmittal.isPending) {
      onOpenChange(false)
    }
  }

  const isPending = createSubmittal.isPending || addDrawingLink.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-purple-500" />
            Create Submittal from Drawing
          </DialogTitle>
          <DialogDescription>
            Create a submittal linked to this location on the drawing
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

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="submittal-title" className="flex items-center gap-1">
              Submittal Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="submittal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Steel Shop Drawings - Grid A to D"
              required
              disabled={isPending}
              maxLength={255}
              autoFocus
            />
          </div>

          {/* Spec Section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="spec-section">Spec Section</Label>
              <Input
                id="spec-section"
                value={specSection}
                onChange={(e) => setSpecSection(e.target.value)}
                placeholder="e.g., 05 12 00"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spec-section-title">Section Title</Label>
              <Input
                id="spec-section-title"
                value={specSectionTitle}
                onChange={(e) => setSpecSectionTitle(e.target.value)}
                placeholder="e.g., Structural Steel"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Type and Ball-in-Court */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="submittal-type">Submittal Type</Label>
              <Select
                id="submittal-type"
                value={submittalType}
                onChange={(e) => setSubmittalType(e.target.value as SubmittalType)}
                disabled={isPending}
              >
                {SUBMITTAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ball-in-court">Ball-in-Court</Label>
              <Select
                id="ball-in-court"
                value={ballInCourt}
                onChange={(e) => setBallInCourt(e.target.value as BallInCourtEntity)}
                disabled={isPending}
              >
                <option value="">Select...</option>
                {BALL_IN_COURT_ENTITIES.map((entity) => (
                  <option key={entity.value} value={entity.value}>
                    {entity.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Date Required */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="submittal-date" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Date Required
              </Label>
              <Input
                id="submittal-date"
                type="date"
                value={dateRequired}
                onChange={(e) => setDateRequired(e.target.value)}
                disabled={isPending}
                min={minDate}
              />
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
                placeholder="e.g., Detail 5/A-401"
                disabled={isPending}
                maxLength={50}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="submittal-description">Description</Label>
            <Textarea
              id="submittal-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of what's being submitted..."
              rows={3}
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
              disabled={!title.trim() || isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? 'Creating...' : 'Create Submittal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateSubmittalFromDrawingDialog
