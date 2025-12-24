// File: /src/features/checklists/components/TemplateBuilderDialog.tsx
// Dialog for creating and editing checklist templates
// Phase: 2.2 - Template Builder Dialog

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { X, Plus } from 'lucide-react'
import type { ChecklistTemplate, TemplateLevel, CreateChecklistTemplateDTO } from '@/types/checklists'

interface TemplateBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: ChecklistTemplate | null
  onSave: (data: CreateChecklistTemplateDTO) => Promise<void>
  isLoading?: boolean
}

const TEMPLATE_LEVELS: { value: TemplateLevel; label: string }[] = [
  { value: 'system', label: 'System Template' },
  { value: 'company', label: 'Company Template' },
  { value: 'project', label: 'Project Template' },
]

const COMMON_CATEGORIES = [
  'Pre-Pour',
  'Framing',
  'MEP',
  'Finishes',
  'Safety',
  'QA/QC',
  'Concrete',
  'Structural',
  'Foundation',
  'Electrical',
  'Plumbing',
  'HVAC',
]

export function TemplateBuilderDialog({
  open,
  onOpenChange,
  template,
  onSave,
  isLoading = false,
}: TemplateBuilderDialogProps) {
  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [templateLevel, setTemplateLevel] = useState<TemplateLevel>('company')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [instructions, setInstructions] = useState('')
  const [estimatedDuration, setEstimatedDuration] = useState('')
  const [scoringEnabled, setScoringEnabled] = useState(true)

  // Initialize form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description || '')
      setCategory(template.category || '')
      setTemplateLevel(template.template_level)
      setTags(template.tags || [])
      setInstructions(template.instructions || '')
      setEstimatedDuration(template.estimated_duration_minutes?.toString() || '')
      setScoringEnabled(template.scoring_enabled)
    } else {
      // Reset form for new template
      setName('')
      setDescription('')
      setCategory('')
      setTemplateLevel('company')
      setTags([])
      setTagInput('')
      setInstructions('')
      setEstimatedDuration('')
      setScoringEnabled(true)
    }
  }, [template, open])

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data: CreateChecklistTemplateDTO = {
      name,
      description: description || null,
      category: category || null,
      template_level: templateLevel,
      is_system_template: templateLevel === 'system',
      tags: tags.length > 0 ? tags : undefined,
      instructions: instructions || null,
      estimated_duration_minutes: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
      scoring_enabled: scoringEnabled,
    }

    await onSave(data)
  }

  const isValid = name.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="template-name" className="block text-sm font-medium text-secondary mb-1">
              Template Name <span className="text-error">*</span>
            </label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pre-Pour Concrete Inspection"
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="template-description" className="block text-sm font-medium text-secondary mb-1">
              Description
            </label>
            <textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this checklist is used for..."
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* Category and Template Level (side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label htmlFor="template-category" className="block text-sm font-medium text-secondary mb-1">
                Category
              </label>
              <select
                id="template-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="">Select category...</option>
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Level */}
            <div>
              <label htmlFor="template-level" className="block text-sm font-medium text-secondary mb-1">
                Template Level
              </label>
              <select
                id="template-level"
                value={templateLevel}
                onChange={(e) => setTemplateLevel(e.target.value as TemplateLevel)}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                {TEMPLATE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="template-tags" className="block text-sm font-medium text-secondary mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                id="template-tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag and press Enter..."
              />
              <Button
                type="button"
                onClick={handleAddTag}
                variant="outline"
                size="sm"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-error"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div>
            <label htmlFor="template-instructions" className="block text-sm font-medium text-secondary mb-1">
              Instructions for Inspector
            </label>
            <textarea
              id="template-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Detailed instructions on how to complete this checklist..."
              rows={4}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
          </div>

          {/* Estimated Duration and Scoring (side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estimated Duration */}
            <div>
              <label htmlFor="template-duration" className="block text-sm font-medium text-secondary mb-1">
                Estimated Duration (minutes)
              </label>
              <Input
                id="template-duration"
                type="number"
                min="0"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="e.g., 30"
              />
            </div>

            {/* Scoring Enabled */}
            <div className="flex items-center">
              <label htmlFor="template-scoring" className="flex items-center gap-2 cursor-pointer">
                <input
                  id="template-scoring"
                  type="checkbox"
                  checked={scoringEnabled}
                  onChange={(e) => setScoringEnabled(e.target.checked)}
                  className="w-4 h-4 text-primary border-input rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-secondary">
                  Enable Pass/Fail/NA Scoring
                </span>
              </label>
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
              {isLoading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default TemplateBuilderDialog
