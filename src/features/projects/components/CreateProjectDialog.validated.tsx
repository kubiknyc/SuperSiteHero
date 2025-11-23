// File: /src/features/projects/components/CreateProjectDialog.validated.tsx
// ENHANCED VERSION: CreateProjectDialog WITH validation & notifications
// Shows complete pattern: Zod validation + API abstraction + notifications

import { useState } from 'react'
import { useCreateProjectWithNotification } from '../hooks/useProjectsMutations'
import { useFormValidation } from '@/lib/validation/useFormValidation'
import { projectCreateSchema, type ProjectCreateInput } from '@/lib/validation/schemas'
import { InputWithError, TextareaWithError, SelectWithError } from '@/components/form/ValidationError'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface CreateProjectDialogValidatedProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateProjectDialogValidated({
  children,
  open,
  onOpenChange,
}: CreateProjectDialogValidatedProps) {
  const [formData, setFormData] = useState<Partial<ProjectCreateInput>>({
    name: '',
    project_number: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    start_date: '',
    end_date: '',
    status: 'planning',
  })

  // Validation hook
  const { errors, validate, getFieldError, clearFieldError } = useFormValidation(
    projectCreateSchema
  )

  // Mutation hook with notifications
  const createProject = useCreateProjectWithNotification()

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear field error when user corrects it
    clearFieldError(name)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate entire form
    const validation = validate(formData)

    if (!validation.success) {
      // Validation failed, errors are now in state
      return
    }

    try {
      // Validation passed, data is guaranteed to be correct type
      // Type guard: validation.data is guaranteed to exist when success is true
      if (!validation.data) return

      await createProject.mutateAsync({
        name: validation.data.name,
        project_number: validation.data.project_number,
        description: validation.data.description,
        address: validation.data.address,
        city: validation.data.city,
        state: validation.data.state,
        zip: validation.data.zip,
        start_date: validation.data.start_date,
        end_date: validation.data.end_date,
        status: validation.data.status,
        weather_units: 'imperial',
        features_enabled: {
          daily_reports: true,
          documents: true,
          workflows: true,
          tasks: true,
          checklists: true,
          punch_lists: true,
          safety: true,
          inspections: true,
          material_tracking: true,
          photos: true,
          takeoff: true,
        },
      } as any)

      // Reset form on success
      setFormData({
        name: '',
        project_number: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        start_date: '',
        end_date: '',
        status: 'planning',
      })

      onOpenChange?.(false)
    } catch (error) {
      // Error is handled by mutation hook's notification system
      console.error('Failed to create project:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Enter the details below to create a new construction project
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <fieldset className="space-y-4">
            <legend className="font-semibold text-sm text-gray-900">
              Basic Information
            </legend>

            <div className="grid grid-cols-2 gap-4">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Project Name <span className="text-red-600">*</span>
                </Label>
                <InputWithError
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder="e.g., Downtown Office Building"
                  error={getFieldError('name')}
                  required
                />
              </div>

              {/* Project Number */}
              <div className="space-y-2">
                <Label htmlFor="project_number">Project Number</Label>
                <InputWithError
                  id="project_number"
                  name="project_number"
                  value={formData.project_number || ''}
                  onChange={handleChange}
                  placeholder="e.g., P-2024-001"
                  error={getFieldError('project_number')}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <TextareaWithError
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="Project description..."
                rows={3}
                error={getFieldError('description')}
              />
            </div>
          </fieldset>

          {/* Location Section */}
          <fieldset className="space-y-4">
            <legend className="font-semibold text-sm text-gray-900">Location</legend>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <InputWithError
                id="address"
                name="address"
                value={formData.address || ''}
                onChange={handleChange}
                placeholder="Street address"
                error={getFieldError('address')}
              />
            </div>

            {/* City, State, ZIP */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <InputWithError
                  id="city"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  placeholder="City"
                  error={getFieldError('city')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <InputWithError
                  id="state"
                  name="state"
                  value={formData.state || ''}
                  onChange={handleChange}
                  placeholder="State"
                  maxLength={2}
                  error={getFieldError('state')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <InputWithError
                  id="zip"
                  name="zip"
                  value={formData.zip || ''}
                  onChange={handleChange}
                  placeholder="ZIP code"
                  error={getFieldError('zip')}
                />
              </div>
            </div>
          </fieldset>

          {/* Timeline Section */}
          <fieldset className="space-y-4">
            <legend className="font-semibold text-sm text-gray-900">Timeline</legend>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <InputWithError
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date || ''}
                  onChange={handleChange}
                  error={getFieldError('start_date')}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="end_date">Estimated End Date</Label>
                <InputWithError
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={handleChange}
                  error={getFieldError('end_date')}
                />
              </div>
            </div>
          </fieldset>

          {/* Status Section */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <SelectWithError
              id="status"
              name="status"
              value={formData.status || 'planning'}
              onChange={handleChange}
              error={getFieldError('status')}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </SelectWithError>
          </div>

          {/* Form Actions */}
          <DialogFooter className="pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={createProject.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProject.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createProject.isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
