// File: /src/features/rfis/components/RFIForm.tsx
// Form for creating and editing RFI workflow items

import React, { useState, FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { WorkflowItem } from '@/types/database'

export interface RFIFormData {
  title: string
  description?: string
  more_information?: string
  discipline?: string
  priority: 'low' | 'normal' | 'high'
  due_date?: string
  assignees?: string[]
}

export interface RFIFormProps {
  initialData?: WorkflowItem
  onSubmit: (data: RFIFormData) => Promise<void>
  isLoading: boolean
  onCancel?: () => void
}

/**
 * RFIForm Component
 *
 * Form for creating or editing RFI workflow items with validation
 *
 * @example
 * ```tsx
 * // Create mode
 * <RFIForm
 *   onSubmit={handleCreate}
 *   isLoading={isCreating}
 *   onCancel={() => navigate('/rfis')}
 * />
 *
 * // Edit mode
 * <RFIForm
 *   initialData={existingRFI}
 *   onSubmit={handleUpdate}
 *   isLoading={isUpdating}
 *   onCancel={() => navigate(`/rfis/${rfi.id}`)}
 * />
 * ```
 *
 * Accessibility:
 * - All form fields have associated labels
 * - Required fields marked with asterisk and aria-required
 * - Form validation with clear error messages
 * - Keyboard navigation support
 * - Loading state disables form during submission
 */
export function RFIForm({ initialData, onSubmit, isLoading, onCancel }: RFIFormProps) {
  const [formData, setFormData] = useState<RFIFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    more_information: initialData?.more_information || '',
    discipline: initialData?.discipline || '',
    priority: (initialData?.priority as 'low' | 'normal' | 'high') || 'normal',
    due_date: initialData?.due_date || '',
    assignees: initialData?.assignees || [],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleAssigneesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Parse comma-separated assignees into array
    const value = e.target.value
    const assignees = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    setFormData((prev) => ({ ...prev, assignees }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      // Error handling done in parent component via toast
      console.error('Form submission error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit RFI' : 'Create New RFI'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title - Required */}
          <div className="space-y-2">
            <Label htmlFor="title" className="required">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Brief description of the question or issue"
              disabled={isLoading}
              aria-required="true"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-red-600" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed description of the RFI"
              rows={4}
              disabled={isLoading}
            />
          </div>

          {/* More Information */}
          <div className="space-y-2">
            <Label htmlFor="more_information">More Information</Label>
            <Textarea
              id="more_information"
              name="more_information"
              value={formData.more_information}
              onChange={handleChange}
              placeholder="Additional context or background information"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Two column layout for Priority and Discipline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                disabled={isLoading}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </Select>
            </div>

            {/* Discipline */}
            <div className="space-y-2">
              <Label htmlFor="discipline">Discipline</Label>
              <Input
                id="discipline"
                name="discipline"
                value={formData.discipline}
                onChange={handleChange}
                placeholder="e.g., Structural, Mechanical, Electrical"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Two column layout for Due Date and Assignees */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={formData.due_date}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <Label htmlFor="assignees">Assignees</Label>
              <Input
                id="assignees"
                name="assignees"
                value={formData.assignees?.join(', ') || ''}
                onChange={handleAssigneesChange}
                placeholder="Comma-separated user IDs or names"
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">Separate multiple assignees with commas</p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? 'Update RFI' : 'Create RFI'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
