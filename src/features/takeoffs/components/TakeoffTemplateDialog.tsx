// File: /src/features/takeoffs/components/TakeoffTemplateDialog.tsx
// Multi-mode dialog for creating, editing, and browsing takeoff templates

import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Search, Filter } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
  useProjectTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSearchTemplates,
} from '../hooks/useTakeoffTemplates'
import { TemplateCard } from './TemplateCard'
import type { TakeoffTemplate, TakeoffTemplateInsert, MeasurementType } from '@/types/database-extensions'

interface TakeoffTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit' | 'browse'
  projectId: string
  companyId: string
  currentUserId: string
  currentMeasurementType?: MeasurementType
  existingTemplate?: TakeoffTemplate
  templateData?: Record<string, any>
  onApplyTemplate?: (template: TakeoffTemplate) => void
}

const MEASUREMENT_TYPES: { value: MeasurementType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'area', label: 'Area' },
  { value: 'count', label: 'Count' },
  { value: 'linear_with_drop', label: 'Linear with Drop' },
  { value: 'pitched_area', label: 'Pitched Area' },
  { value: 'pitched_linear', label: 'Pitched Linear' },
  { value: 'surface_area', label: 'Surface Area' },
  { value: 'volume_2d', label: 'Volume 2D' },
  { value: 'volume_3d', label: 'Volume 3D' },
]

/**
 * TakeoffTemplateDialog Component
 *
 * Multi-mode dialog for template management:
 * - CREATE mode: Save current measurement as new template
 * - EDIT mode: Edit existing template details
 * - BROWSE mode: Browse, search, and apply templates
 */
export function TakeoffTemplateDialog({
  open,
  onOpenChange,
  mode,
  projectId,
  companyId,
  currentUserId,
  currentMeasurementType,
  existingTemplate,
  templateData,
  onApplyTemplate,
}: TakeoffTemplateDialogProps) {
  const { toast } = useToast()

  // State for create/edit form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [measurementType, setMeasurementType] = useState<MeasurementType>(
    currentMeasurementType || 'linear'
  )
  const [scope, setScope] = useState<'project' | 'company'>('project')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  // State for browse mode
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<MeasurementType | 'all'>('all')
  const [favoriteTemplates, setFavoriteTemplates] = useState<Set<string>>(new Set())

  // Queries
  const { data: templates = [] } = useProjectTemplates(projectId, companyId)
  const { data: searchResults = [] } = useSearchTemplates(
    searchQuery,
    companyId,
    projectId
  )

  // Mutations
  const createTemplateMutation = useCreateTemplate()
  const updateTemplateMutation = useUpdateTemplate()
  const deleteTemplateMutation = useDeleteTemplate()

  // Initialize form for edit mode
  useEffect(() => {
    setTimeout(() => {
      if (mode === 'edit' && existingTemplate) {
        setName(existingTemplate.name)
        setDescription(existingTemplate.description || '')
        setMeasurementType(existingTemplate.measurement_type)
        setScope(existingTemplate.project_id ? 'project' : 'company')
        setTags(existingTemplate.tags || [])
      } else if (mode === 'create') {
        setName('')
        setDescription('')
        setMeasurementType(currentMeasurementType || 'linear')
        setScope('project')
        setTags([])
      }
    }, 0)
  }, [mode, existingTemplate, currentMeasurementType])

  // Handle tag addition
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  // Handle create/edit submission
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Template name is required',
        variant: 'destructive',
      })
      return
    }

    try {
      if (mode === 'create') {
        const templateInsert: TakeoffTemplateInsert = {
          name: name.trim(),
          description: description.trim() || null,
          measurement_type: measurementType,
          project_id: scope === 'project' ? projectId : null,
          company_id: companyId,
          created_by: currentUserId,
          template_data: templateData || {},
          tags: tags.length > 0 ? tags : null,
        }

        await createTemplateMutation.mutateAsync(templateInsert)

        toast({
          title: 'Template Created',
          description: `"${name}" has been saved as a template`,
        })
      } else if (mode === 'edit' && existingTemplate) {
        await updateTemplateMutation.mutateAsync({
          id: existingTemplate.id,
          name: name.trim(),
          description: description.trim() || null,
          measurement_type: measurementType,
          project_id: scope === 'project' ? projectId : null,
          tags: tags.length > 0 ? tags : null,
        })

        toast({
          title: 'Template Updated',
          description: `"${name}" has been updated`,
        })
      }

      onOpenChange(false)
    } catch (_error) {
      toast({
        title: 'Error',
        description: mode === 'create' ? 'Failed to create template' : 'Failed to update template',
        variant: 'destructive',
      })
    }
  }

  // Handle template deletion
  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplateMutation.mutateAsync(templateId)
      toast({
        title: 'Template Deleted',
        description: 'Template has been removed',
      })
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      })
    }
  }

  // Handle template application
  const handleApply = (template: TakeoffTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template)
      onOpenChange(false)
      toast({
        title: 'Template Applied',
        description: `"${template.name}" has been applied`,
      })
    }
  }

  // Handle favorite toggle
  const handleToggleFavorite = (templateId: string, isFavorite: boolean) => {
    const newFavorites = new Set(favoriteTemplates)
    if (isFavorite) {
      newFavorites.add(templateId)
    } else {
      newFavorites.delete(templateId)
    }
    setFavoriteTemplates(newFavorites)
  }

  // Filter templates for browse mode
  const filteredTemplates = useMemo(() => {
    let filtered = searchQuery ? searchResults : templates

    if (filterType !== 'all') {
      filtered = filtered.filter((t) => t.measurement_type === filterType)
    }

    return filtered
  }, [templates, searchResults, searchQuery, filterType])

  // Separate favorites and regular templates
  const favoritesList = useMemo(
    () => filteredTemplates.filter((t) => favoriteTemplates.has(t.id)),
    [filteredTemplates, favoriteTemplates]
  )

  const _regularList = useMemo(
    () => filteredTemplates.filter((t) => !favoriteTemplates.has(t.id)),
    [filteredTemplates, favoriteTemplates]
  )

  // Dialog title
  const dialogTitle = mode === 'create'
    ? 'Save as Template'
    : mode === 'edit'
    ? 'Edit Template'
    : 'Browse Templates'

  // Dialog description
  const dialogDescription = mode === 'create'
    ? 'Save this measurement configuration as a reusable template'
    : mode === 'edit'
    ? 'Update template details'
    : 'Browse and apply saved templates'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {/* CREATE / EDIT MODE */}
        {(mode === 'create' || mode === 'edit') && (
          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                placeholder="e.g., Roofing Linear Measurement"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                placeholder="Describe what this template is used for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Measurement Type */}
            <div className="space-y-2">
              <Label htmlFor="measurement-type">Measurement Type *</Label>
              <Select
                value={measurementType}
                onValueChange={(v) => setMeasurementType(v as MeasurementType)}
              >
                <SelectTrigger id="measurement-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEASUREMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scope */}
            <div className="space-y-2">
              <Label htmlFor="template-scope">Template Scope *</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as 'project' | 'company')}>
                <SelectTrigger id="template-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">This Project Only</SelectItem>
                  <SelectItem value="company">Company-wide (All Projects)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {scope === 'project'
                  ? 'Only visible in this project'
                  : 'Available to all projects in your company'}
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="template-tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="template-tags"
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BROWSE MODE */}
        {mode === 'browse' && (
          <div className="space-y-4 py-4">
            {/* Search and Filter */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {MEASUREMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Templates Grid with Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">
                  All Templates ({filteredTemplates.length})
                </TabsTrigger>
                <TabsTrigger value="favorites">
                  Favorites ({favoritesList.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                  {filteredTemplates.length > 0 ? (
                    filteredTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onApply={handleApply}
                        onEdit={
                          template.created_by === currentUserId
                            ? () => {
                                // Switch to edit mode with this template
                                // This would need to be handled by parent component
                              }
                            : undefined
                        }
                        onDelete={
                          template.created_by === currentUserId
                            ? handleDelete
                            : undefined
                        }
                        onToggleFavorite={handleToggleFavorite}
                        currentUserId={currentUserId}
                        isFavorite={favoriteTemplates.has(template.id)}
                      />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      {searchQuery || filterType !== 'all'
                        ? 'No templates match your search'
                        : 'No templates available'}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="favorites" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto">
                  {favoritesList.length > 0 ? (
                    favoritesList.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onApply={handleApply}
                        onEdit={
                          template.created_by === currentUserId
                            ? () => {
                                // Switch to edit mode
                              }
                            : undefined
                        }
                        onDelete={
                          template.created_by === currentUserId
                            ? handleDelete
                            : undefined
                        }
                        onToggleFavorite={handleToggleFavorite}
                        currentUserId={currentUserId}
                        isFavorite={true}
                      />
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      No favorite templates yet
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Footer Actions */}
        {(mode === 'create' || mode === 'edit') && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              {mode === 'create' ? 'Create Template' : 'Update Template'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
