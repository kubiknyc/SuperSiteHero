// File: /src/features/projects/components/CreateProjectDialog.tsx
// Dialog for creating a new project

import { useState } from 'react'
import { useCreateProjectWithNotification } from '../hooks/useProjectsMutations'
import { useFormValidation, projectCreateSchema } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { InputWithError, TextareaWithError, SelectWithError } from '@/components/form/ValidationError'
import type { ProjectStatus } from '@/types/database'

interface CreateProjectDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateProjectDialog({ children, open, onOpenChange }: CreateProjectDialogProps) {
  console.log('🟡 DIALOG RENDER - CreateProjectDialog rendered, open:', open)

  const [formData, setFormData] = useState({
    name: '',
    project_number: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    start_date: '',
    end_date: '',
    status: 'planning' as ProjectStatus,
  })

  // Use the hooks for full-stack integration
  const createProject = useCreateProjectWithNotification()
  const { validate, getFieldError, clearErrors } = useFormValidation(projectCreateSchema)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🟢 FORM SUBMIT - Form onSubmit handler called!')
    console.log('Form submission started')

    // Step 1: Validate client-side
    const validation = validate(formData)
    console.log('Validation result:', validation)

    if (!validation.success) {
      console.log('Validation failed:', validation.errors)
      return // Errors automatically shown in InputWithError components
    }

    // Step 2: Call API (with notifications handled by mutation hook)
    try {
      console.log('Submitting project data...')

      // Type guard: validation.data is guaranteed to exist when success is true
      if (!validation.data) {return}

      await createProject.mutateAsync({
        name: validation.data.name,
        project_number: validation.data.project_number || null,
        description: validation.data.description || null,
        address: validation.data.address || null,
        city: validation.data.city || null,
        state: validation.data.state || null,
        zip: validation.data.zip || null,
        start_date: validation.data.start_date || null,
        end_date: validation.data.end_date || null,
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

      console.log('Project created successfully')
      // Step 3: Success! Toast shown automatically by mutation hook
      // Reset form and close dialog
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
      clearErrors()
      onOpenChange?.(false)
    } catch (error) {
      // Error toast shown automatically by mutation hook
      console.error('Failed to create project:', error)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Closing dialog - only reset if not submitting
      if (!createProject.isPending) {
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
        clearErrors()
      }
    }
    onOpenChange?.(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new construction project to your portfolio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label htmlFor="name">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <InputWithError
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="New Office Building"
                  error={getFieldError('name')}
                  disabled={createProject.isPending}
                />
              </div>

              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label htmlFor="project_number">Project Number</Label>
                <InputWithError
                  id="project_number"
                  name="project_number"
                  value={formData.project_number}
                  onChange={handleChange}
                  placeholder="2024-001"
                  error={getFieldError('project_number')}
                  disabled={createProject.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <TextareaWithError
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the project..."
                rows={3}
                error={getFieldError('description')}
                disabled={createProject.isPending}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <InputWithError
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main Street"
                error={getFieldError('address')}
                disabled={createProject.isPending}
              />
            </div>

            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="city">City</Label>
                <InputWithError
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Springfield"
                  error={getFieldError('city')}
                  disabled={createProject.isPending}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="state">State</Label>
                <InputWithError
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="IL"
                  maxLength={2}
                  error={getFieldError('state')}
                  disabled={createProject.isPending}
                />
              </div>

              <div className="col-span-1 space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <InputWithError
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="62701"
                  maxLength={10}
                  error={getFieldError('zip')}
                  disabled={createProject.isPending}
                />
              </div>
            </div>

            {/* Dates and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <InputWithError
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  error={getFieldError('start_date')}
                  disabled={createProject.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Estimated End Date</Label>
                <InputWithError
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                  error={getFieldError('end_date')}
                  disabled={createProject.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <SelectWithError
                id="status"
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
                error={getFieldError('status')}
                disabled={createProject.isPending}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </SelectWithError>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createProject.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProject.isPending}
              onClick={(e) => {
                console.log('🔵 BUTTON CLICKED - Submit button was clicked!')
              }}
            >
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
