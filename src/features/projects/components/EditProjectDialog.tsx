// File: /src/features/projects/components/EditProjectDialog.tsx
// Dialog for editing an existing project

import { useEffect, useState } from 'react'
import { useUpdateProjectWithNotification } from '../hooks/useProjectsMutations'
import { useFormValidation, projectUpdateSchema } from '@/lib/validation'
import { useNotifications } from '@/lib/notifications/useNotifications'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InputWithError, TextareaWithError, SelectWithError } from '@/components/form/ValidationError'
import type { ProjectStatus } from '@/types/database'

interface EditProjectDialogProps {
  project: {
    id: string
    name: string
    project_number?: string | null
    description?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    zip?: string | null
    start_date?: string | null
    end_date?: string | null
    status: ProjectStatus
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProjectDialog({ project, open, onOpenChange }: EditProjectDialogProps) {
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

  // Use the three hooks for full-stack integration
  const updateProject = useUpdateProjectWithNotification()
  const { validate, getFieldError, clearErrors } = useFormValidation(projectUpdateSchema)

  // Initialize form with project data
  useEffect(() => {
    if (open && project) {
      setFormData({
        name: project.name || '',
        project_number: project.project_number || '',
        description: project.description || '',
        address: project.address || '',
        city: project.city || '',
        state: project.state || '',
        zip: project.zip || '',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
        status: project.status,
      })
      clearErrors()
    }
  }, [open, project, clearErrors])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Step 1: Validate client-side
    const validation = validate(formData)
    if (!validation.success) {
      return // Errors automatically shown in InputWithError components
    }

    // Step 2: Call API (with notifications handled by mutation hook)
    try {
      await updateProject.mutateAsync({
        id: project.id,
        updates: {
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
        },
      })

      // Step 3: Success! Toast shown automatically by mutation hook
      onOpenChange(false)
    } catch (error) {
      // Error toast shown automatically by mutation hook
      console.error('Failed to update project:', error)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !updateProject.isPending) {
      clearErrors()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details
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
                  placeholder="Project name"
                  error={getFieldError('name')}
                  disabled={updateProject.isPending}
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
                  disabled={updateProject.isPending}
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
                placeholder="Project description..."
                rows={3}
                error={getFieldError('description')}
                disabled={updateProject.isPending}
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
                placeholder="Street address"
                error={getFieldError('address')}
                disabled={updateProject.isPending}
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
                  placeholder="City"
                  error={getFieldError('city')}
                  disabled={updateProject.isPending}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="state">State</Label>
                <InputWithError
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  maxLength={2}
                  error={getFieldError('state')}
                  disabled={updateProject.isPending}
                />
              </div>

              <div className="col-span-1 space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <InputWithError
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="ZIP code"
                  maxLength={10}
                  error={getFieldError('zip')}
                  disabled={updateProject.isPending}
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
                  disabled={updateProject.isPending}
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
                  disabled={updateProject.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <SelectWithError
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                error={getFieldError('status')}
                disabled={updateProject.isPending}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </SelectWithError>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={updateProject.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateProject.isPending}>
              {updateProject.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
