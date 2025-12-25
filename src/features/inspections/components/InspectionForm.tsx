/**
 * Inspection Form Component
 *
 * Form for creating and editing inspections.
 */

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { CreateInspectionInput, InspectionType } from '../types'
import { INSPECTION_TYPE_CONFIG } from '../types'

interface InspectionFormProps {
  initialData?: Partial<CreateInspectionInput>
  projectId: string
  onSubmit: (data: CreateInspectionInput) => void
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel?: string
  className?: string
}

interface FormErrors {
  inspection_name?: string
  inspection_type?: string
  scheduled_date?: string
  general?: string
}

export function InspectionForm({
  initialData,
  projectId,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Schedule Inspection',
  className,
}: InspectionFormProps) {
  const [formData, setFormData] = useState<Partial<CreateInspectionInput>>({
    project_id: projectId,
    inspection_name: '',
    inspection_type: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    inspector_name: '',
    inspector_company: '',
    inspector_phone: '',
    reminder_days_before: 1,
    ...initialData,
  })

  const [errors, setErrors] = useState<FormErrors>({})

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }))
    }
  }, [initialData])

  const updateField = <K extends keyof CreateInspectionInput>(
    field: K,
    value: CreateInspectionInput[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when field is updated
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.inspection_name?.trim()) {
      newErrors.inspection_name = 'Inspection name is required'
    }

    if (!formData.inspection_type) {
      newErrors.inspection_type = 'Inspection type is required'
    }

    // Validate scheduled date is not in the past if provided
    if (formData.scheduled_date) {
      const scheduledDate = new Date(formData.scheduled_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (scheduledDate < today) {
        newErrors.scheduled_date = 'Scheduled date cannot be in the past'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    onSubmit({
      ...formData,
      project_id: projectId,
      inspection_name: formData.inspection_name || '',
      inspection_type: formData.inspection_type || '',
    } as CreateInspectionInput)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground heading-subsection">Basic Information</h3>

        {/* Inspection Name */}
        <div className="space-y-2">
          <Label htmlFor="inspection_name">
            Inspection Name <span className="text-error">*</span>
          </Label>
          <Input
            id="inspection_name"
            value={formData.inspection_name || ''}
            onChange={(e) => updateField('inspection_name', e.target.value)}
            placeholder="e.g., Rough Framing Inspection"
            className={cn(errors.inspection_name && 'border-red-500')}
          />
          {errors.inspection_name && (
            <p className="text-sm text-error">{errors.inspection_name}</p>
          )}
        </div>

        {/* Inspection Type */}
        <div className="space-y-2">
          <Label htmlFor="inspection_type">
            Inspection Type <span className="text-error">*</span>
          </Label>
          <Select
            value={formData.inspection_type || ''}
            onValueChange={(value) => updateField('inspection_type', value)}
          >
            <SelectTrigger className={cn(errors.inspection_type && 'border-red-500')}>
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(INSPECTION_TYPE_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.inspection_type && (
            <p className="text-sm text-error">{errors.inspection_type}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Add any additional details about the inspection..."
            rows={3}
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground heading-subsection">Schedule</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scheduled Date */}
          <div className="space-y-2">
            <Label htmlFor="scheduled_date">Scheduled Date</Label>
            <Input
              id="scheduled_date"
              type="date"
              value={formData.scheduled_date || ''}
              onChange={(e) => updateField('scheduled_date', e.target.value)}
              className={cn(errors.scheduled_date && 'border-red-500')}
            />
            {errors.scheduled_date && (
              <p className="text-sm text-error">{errors.scheduled_date}</p>
            )}
          </div>

          {/* Scheduled Time */}
          <div className="space-y-2">
            <Label htmlFor="scheduled_time">Scheduled Time</Label>
            <Input
              id="scheduled_time"
              type="time"
              value={formData.scheduled_time || ''}
              onChange={(e) => updateField('scheduled_time', e.target.value)}
            />
          </div>
        </div>

        {/* Reminder */}
        <div className="space-y-2">
          <Label htmlFor="reminder_days_before">Reminder (days before)</Label>
          <Select
            value={String(formData.reminder_days_before || 1)}
            onValueChange={(value) =>
              updateField('reminder_days_before', parseInt(value, 10))
            }
          >
            <SelectTrigger className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No reminder</SelectItem>
              <SelectItem value="1">1 day before</SelectItem>
              <SelectItem value="2">2 days before</SelectItem>
              <SelectItem value="3">3 days before</SelectItem>
              <SelectItem value="7">1 week before</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inspector Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground heading-subsection">Inspector Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inspector Name */}
          <div className="space-y-2">
            <Label htmlFor="inspector_name">Inspector Name</Label>
            <Input
              id="inspector_name"
              value={formData.inspector_name || ''}
              onChange={(e) => updateField('inspector_name', e.target.value)}
              placeholder="Inspector name"
            />
          </div>

          {/* Inspector Company */}
          <div className="space-y-2">
            <Label htmlFor="inspector_company">Inspector Company</Label>
            <Input
              id="inspector_company"
              value={formData.inspector_company || ''}
              onChange={(e) => updateField('inspector_company', e.target.value)}
              placeholder="Company or agency"
            />
          </div>
        </div>

        {/* Inspector Phone */}
        <div className="space-y-2 md:w-1/2">
          <Label htmlFor="inspector_phone">Inspector Phone</Label>
          <Input
            id="inspector_phone"
            type="tel"
            value={formData.inspector_phone || ''}
            onChange={(e) => updateField('inspector_phone', e.target.value)}
            placeholder="(555) 555-5555"
          />
        </div>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="bg-error-light border border-red-200 rounded-md p-4">
          <p className="text-sm text-error">{errors.general}</p>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}

export default InspectionForm
