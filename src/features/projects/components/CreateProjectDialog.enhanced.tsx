// File: /src/features/projects/components/CreateProjectDialog.enhanced.tsx
// ENHANCED VERSION: CreateProjectDialog WITH notifications
// This shows how to use the new notification system

import { useState } from 'react'
import { useCreateProjectWithNotification } from '../hooks/useProjectsMutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useNotifications } from '@/lib/notifications/useNotifications'
import type { ProjectStatus } from '@/types/database'

interface CreateProjectDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateProjectDialogEnhanced({
  children,
  open,
  onOpenChange,
}: CreateProjectDialogProps) {
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

  // Use the new mutation hook with notifications
  const createProject = useCreateProjectWithNotification()
  const { showError } = useNotifications()

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    if (!formData.name.trim()) {
      showError('Validation Error', 'Project name is required')
      return
    }

    try {
      // The mutation will automatically show success/error notifications
      await createProject.mutateAsync({
        name: formData.name,
        project_number: formData.project_number || null,
        description: formData.description || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status,
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

      // Reset form and close dialog on success
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
      // Error notification is handled automatically by the mutation hook
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Downtown Office Building"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_number">Project Number</Label>
                <Input
                  id="project_number"
                  name="project_number"
                  value={formData.project_number}
                  onChange={handleChange}
                  placeholder="e.g., P-2024-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Project description..."
                rows={3}
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Location</h3>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="ZIP code"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Timeline</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">Estimated End Date</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" value={formData.status} onChange={handleChange}>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </Select>
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
