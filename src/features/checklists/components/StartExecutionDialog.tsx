// File: /src/features/checklists/components/StartExecutionDialog.tsx
// Dialog for creating new checklist execution from template
// Phase: 3.1 - Checklist Execution UI

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useTemplates } from '../hooks/useTemplates'
import { useCreateExecution } from '../hooks/useExecutions'
import { useBatchCreateResponses } from '../hooks/useResponses'
import { useTemplateItems } from '../hooks/useTemplateItems'
import type { CreateChecklistExecutionDTO, CreateChecklistResponseDTO } from '@/types/checklists'
import { logger } from '../../../lib/utils/logger';


interface StartExecutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId?: string | null
  projectId: string
}

export function StartExecutionDialog({
  open,
  onOpenChange,
  templateId: preSelectedTemplateId,
  projectId,
}: StartExecutionDialogProps) {
  const navigate = useNavigate()

  // Form state - use lazy initializers to avoid impure functions during render
  const [templateId, setTemplateId] = useState(() => preSelectedTemplateId || '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [weather, setWeather] = useState('')
  const [temperature, setTemperature] = useState('')

  // Data hooks
  const { data: templates = [] } = useTemplates()
  const { data: templateItems = [] } = useTemplateItems(templateId)
  const createExecution = useCreateExecution()
  const batchCreateResponses = useBatchCreateResponses()

  // Helper function to generate date string
  const getDateString = useMemo(() => {
    return () => new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }, [])

  // Handle template selection change
  const handleTemplateChange = (newTemplateId: string) => {
    setTemplateId(newTemplateId)

    const template = templates.find(t => t.id === newTemplateId)
    if (template) {
      setName(`${template.name} - ${getDateString()}`)
      setDescription(template.description || '')
      setCategory(template.category || '')
    }
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setTemplateId(preSelectedTemplateId || '')
        setName('')
        setDescription('')
        setCategory('')
        setLocation('')
        setWeather('')
        setTemperature('')
      }, 0)
    }
  }, [open, preSelectedTemplateId])

  // Initialize form when dialog opens with preselected template - only run once per open
  useEffect(() => {
    if (open && preSelectedTemplateId && !name) {
      const template = templates.find(t => t.id === preSelectedTemplateId)
      if (template) {
        setTimeout(() => {
          setTemplateId(preSelectedTemplateId)
          setName(`${template.name} - ${getDateString()}`)
          setDescription(template.description || '')
          setCategory(template.category || '')
        }, 0)
      }
    }
  }, [open, preSelectedTemplateId, name, templates, getDateString])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!templateId || !name) {return}

    try {
      // Step 1: Create execution
      const executionData: CreateChecklistExecutionDTO = {
        project_id: projectId,
        checklist_template_id: templateId,
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        location: location.trim() || undefined,
        weather_conditions: weather.trim() || undefined,
        temperature: temperature ? parseInt(temperature) : undefined,
      }

      const newExecution = await createExecution.mutateAsync(executionData)

      // Step 2: Batch create responses from template items
      if (templateItems.length > 0) {
        const responses: CreateChecklistResponseDTO[] = templateItems.map((item, index) => ({
          checklist_id: newExecution.id,
          checklist_template_item_id: item.id,
          item_type: item.item_type,
          item_label: item.label,
          sort_order: item.sort_order || index,
          // Initialize with empty response data based on item type
          response_data: item.item_type === 'checkbox'
            ? { value: 'unchecked' }
            : item.item_type === 'text'
            ? { value: '' }
            : item.item_type === 'number'
            ? { value: 0 }
            : item.item_type === 'photo'
            ? { photo_urls: [] }
            : { signature_url: '', signed_by: '', signed_at: '' },
          score_value: null,
          notes: null,
        }))

        await batchCreateResponses.mutateAsync(responses)
      }

      // Step 3: Navigate to active execution page
      navigate(`/checklists/executions/${newExecution.id}/fill`)
      onOpenChange(false)
    } catch (error) {
      logger.error('Failed to start checklist:', error)
    }
  }

  const isValid = templateId && name.trim().length > 0
  const isLoading = createExecution.isPending || batchCreateResponses.isPending

  const selectedTemplate = templates.find(t => t.id === templateId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start New Checklist</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selector */}
          <div>
            <Label htmlFor="template" className="block text-sm font-medium text-secondary mb-1">
              Template <span className="text-error">*</span>
            </Label>
            <select
              id="template"
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              required
              disabled={!!preSelectedTemplateId}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-muted disabled:cursor-not-allowed"
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.category ? `(${template.category})` : ''}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <p className="mt-1 text-sm text-secondary">
                {selectedTemplate.description}
              </p>
            )}
          </div>

          {/* Checklist Name */}
          <div>
            <Label htmlFor="name" className="block text-sm font-medium text-secondary mb-1">
              Checklist Name <span className="text-error">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pre-Pour Inspection - Jan 15, 2024"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="block text-sm font-medium text-secondary mb-1">
              Description
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes or context for this checklist..."
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category" className="block text-sm font-medium text-secondary mb-1">
              Category
            </Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Pre-Pour, Framing, Safety"
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="block text-sm font-medium text-secondary mb-1">
              Location
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Building A - Level 3, Area 5"
            />
          </div>

          {/* Weather & Temperature */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weather" className="block text-sm font-medium text-secondary mb-1">
                Weather Conditions
              </Label>
              <Input
                id="weather"
                value={weather}
                onChange={(e) => setWeather(e.target.value)}
                placeholder="e.g., Sunny, Cloudy, Rainy"
              />
            </div>
            <div>
              <Label htmlFor="temperature" className="block text-sm font-medium text-secondary mb-1">
                Temperature (°F)
              </Label>
              <Input
                id="temperature"
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="e.g., 72"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'Starting...' : 'Start Checklist'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
