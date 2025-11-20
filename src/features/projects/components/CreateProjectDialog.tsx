// File: /src/features/projects/components/CreateProjectDialog.tsx
// Dialog for creating a new project

import { useState } from 'react'
import { useCreateProject } from '../hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import type { ProjectStatus } from '@/types/database'

interface CreateProjectDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateProjectDialog({ children, open, onOpenChange }: CreateProjectDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    project_number: '',
    description: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    start_date: '',
    estimated_end_date: '',
    status: 'planning' as ProjectStatus,
  })

  const createProject = useCreateProject()
  const { addToast } = useToast()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createProject.mutateAsync({
        name: formData.name,
        project_number: formData.project_number || null,
        description: formData.description || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        start_date: formData.start_date || null,
        estimated_end_date: formData.estimated_end_date || null,
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
      })

      addToast({
        title: 'Success',
        description: 'Project created successfully',
        variant: 'success',
      })

      // Reset form and close dialog
      setFormData({
        name: '',
        project_number: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zip_code: '',
        start_date: '',
        estimated_end_date: '',
        status: 'planning',
      })
      onOpenChange?.(false)
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create project',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="New Office Building"
                  required
                />
              </div>

              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label htmlFor="project_number">Project Number</Label>
                <Input
                  id="project_number"
                  name="project_number"
                  value={formData.project_number}
                  onChange={handleChange}
                  placeholder="2024-001"
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
                placeholder="Brief description of the project..."
                rows={3}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-3 space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Springfield"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="IL"
                  maxLength={2}
                />
              </div>

              <div className="col-span-1 space-y-2">
                <Label htmlFor="zip_code">ZIP</Label>
                <Input
                  id="zip_code"
                  name="zip_code"
                  value={formData.zip_code}
                  onChange={handleChange}
                  placeholder="62701"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Dates and Status */}
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
                <Label htmlFor="estimated_end_date">Estimated End Date</Label>
                <Input
                  id="estimated_end_date"
                  name="estimated_end_date"
                  type="date"
                  value={formData.estimated_end_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={createProject.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
