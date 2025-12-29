// File: /src/features/submittals/components/CreateDedicatedSubmittalDialog.tsx
// Dialog for creating a new submittal using the dedicated submittals table
// with CSI MasterFormat spec section organization

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { CSISpecPicker, getSpecSectionTitle } from '@/components/ui/csi-spec-picker'
import { useAuth } from '@/lib/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  useCreateSubmittal,
  generateSubmittalNumber,
  SUBMITTAL_TYPES,
  BALL_IN_COURT_ENTITIES,
} from '../hooks/useDedicatedSubmittals'
import type { SubmittalType, BallInCourtEntity } from '@/types/database'
import { logger } from '../../../lib/utils/logger';


// Simple hook to fetch subcontractors for a project
function useProjectSubcontractors(projectId: string | undefined) {
  return useQuery({
    queryKey: ['subcontractors', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}
      const { data, error } = await supabase
        .from('subcontractors')
        .select('id, company_name, trade')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('company_name')
      if (error) {throw error}
      return data
    },
    enabled: !!projectId,
  })
}

interface CreateDedicatedSubmittalDialogProps {
  projectId: string | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateDedicatedSubmittalDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: CreateDedicatedSubmittalDialogProps) {
  const { userProfile: _userProfile } = useAuth()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [specSection, setSpecSection] = useState('')
  const [specSectionTitle, setSpecSectionTitle] = useState('')
  const [submittalType, setSubmittalType] = useState<SubmittalType>('product_data')
  const [subcontractorId, setSubcontractorId] = useState('')
  const [ballInCourtEntity, setBallInCourtEntity] = useState<BallInCourtEntity>('subcontractor')
  const [dateRequired, setDateRequired] = useState('')
  const [daysForReview, setDaysForReview] = useState('14')
  const [discipline, setDiscipline] = useState('')
  const [submittalNumber, setSubmittalNumber] = useState('')

  // Hooks
  const createSubmittal = useCreateSubmittal()
  const { data: subcontractors } = useProjectSubcontractors(projectId)

  // Generate submittal number when spec section changes
  useEffect(() => {
    async function updateSubmittalNumber() {
      if (projectId && specSection) {
        try {
          const number = await generateSubmittalNumber(projectId, specSection)
          setSubmittalNumber(number)
        } catch (error) {
          logger.error('Failed to generate submittal number:', error)
        }
      } else {
        setSubmittalNumber('')
      }
    }
    updateSubmittalNumber()
  }, [projectId, specSection])

  const handleSpecSectionChange = (code: string, title: string) => {
    setSpecSection(code)
    setSpecSectionTitle(title || getSpecSectionTitle(code))
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setSpecSection('')
    setSpecSectionTitle('')
    setSubmittalType('product_data')
    setSubcontractorId('')
    setBallInCourtEntity('subcontractor')
    setDateRequired('')
    setDaysForReview('14')
    setDiscipline('')
    setSubmittalNumber('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !projectId || !specSection || !submittalNumber) {
      return
    }

    try {
      // Calculate review due date if date_required is set
      let reviewDueDate: string | null = null
      if (dateRequired) {
        const required = new Date(dateRequired)
        const reviewDays = parseInt(daysForReview) || 14
        const dueDate = new Date(required)
        dueDate.setDate(dueDate.getDate() - reviewDays)
        reviewDueDate = dueDate.toISOString().split('T')[0]
      }

      await createSubmittal.mutateAsync({
        project_id: projectId,
        submittal_number: submittalNumber,
        title: title.trim(),
        description: description.trim() || null,
        spec_section: specSection,
        spec_section_title: specSectionTitle || null,
        submittal_type: submittalType,
        subcontractor_id: subcontractorId || null,
        ball_in_court_entity: ballInCourtEntity,
        date_required: dateRequired || null,
        days_for_review: parseInt(daysForReview) || 14,
        review_due_date: reviewDueDate,
        discipline: discipline.trim() || null,
        review_status: 'not_submitted',
        revision_number: 0,
      })

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('Failed to create submittal:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Submittal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Spec Section - Most Important Field */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
            <h3 className="font-semibold text-blue-900 heading-subsection">Specification Reference</h3>

            <CSISpecPicker
              value={specSection}
              onChange={handleSpecSectionChange}
              label="Spec Section (CSI MasterFormat)"
              required
              disabled={createSubmittal.isPending}
            />

            {submittalNumber && (
              <div className="flex items-center gap-2">
                <Label className="text-sm text-primary-hover">Submittal Number:</Label>
                <span className="font-mono font-bold text-blue-900">{submittalNumber}</span>
              </div>
            )}
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Submittal Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Reinforcing Steel Shop Drawings"
                required
                disabled={createSubmittal.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="submittal-type">Submittal Type *</Label>
              <Select
                id="submittal-type"
                value={submittalType}
                onChange={(e) => setSubmittalType(e.target.value as SubmittalType)}
                disabled={createSubmittal.isPending}
              >
                {SUBMITTAL_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted">
                {SUBMITTAL_TYPES.find((t) => t.value === submittalType)?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discipline">Discipline</Label>
              <Select
                id="discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                disabled={createSubmittal.isPending}
              >
                <option value="">Select discipline...</option>
                <option value="architectural">Architectural</option>
                <option value="structural">Structural</option>
                <option value="mechanical">Mechanical</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="fire_protection">Fire Protection</option>
                <option value="civil">Civil</option>
                <option value="landscape">Landscape</option>
                <option value="interiors">Interiors</option>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the submittal package..."
              rows={3}
              disabled={createSubmittal.isPending}
            />
          </div>

          {/* Assignment & Tracking */}
          <div className="p-4 bg-surface border rounded-lg space-y-4">
            <h3 className="font-semibold text-foreground heading-subsection">Assignment & Tracking</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subcontractor">Responsible Subcontractor</Label>
                <Select
                  id="subcontractor"
                  value={subcontractorId}
                  onChange={(e) => setSubcontractorId(e.target.value)}
                  disabled={createSubmittal.isPending}
                >
                  <option value="">Select subcontractor...</option>
                  {subcontractors?.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.company_name} ({sub.trade})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ball-in-court">Ball-in-Court</Label>
                <Select
                  id="ball-in-court"
                  value={ballInCourtEntity}
                  onChange={(e) => setBallInCourtEntity(e.target.value as BallInCourtEntity)}
                  disabled={createSubmittal.isPending}
                >
                  {BALL_IN_COURT_ENTITIES.map((entity) => (
                    <option key={entity.value} value={entity.value}>
                      {entity.label}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted">Who currently has responsibility for action</p>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="p-4 bg-surface border rounded-lg space-y-4">
            <h3 className="font-semibold text-foreground heading-subsection">Schedule</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-required">Date Required on Site</Label>
                <Input
                  id="date-required"
                  type="date"
                  value={dateRequired}
                  onChange={(e) => setDateRequired(e.target.value)}
                  disabled={createSubmittal.isPending}
                />
                <p className="text-xs text-muted">When material/equipment must be on site</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="days-review">Review Period (days)</Label>
                <Input
                  id="days-review"
                  type="number"
                  value={daysForReview}
                  onChange={(e) => setDaysForReview(e.target.value)}
                  min="1"
                  max="90"
                  disabled={createSubmittal.isPending}
                />
                <p className="text-xs text-muted">Standard: 14 days for Architect review</p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
              disabled={createSubmittal.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || !specSection || createSubmittal.isPending}
            >
              {createSubmittal.isPending ? 'Creating...' : 'Create Submittal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateDedicatedSubmittalDialog
