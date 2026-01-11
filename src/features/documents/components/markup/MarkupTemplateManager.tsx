// File: /src/features/documents/components/markup/MarkupTemplateManager.tsx
// Component for saving, loading, and managing markup templates

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  FileBox,
  Save,
  FolderOpen,
  Trash2,
  Share2,
  Search,
  MoreVertical,
  FileUp,
  FileDown,
  Pencil,
  Copy,
  Users,
  Globe,
  Lock,
  CheckCircle2,
  ClipboardList,
  HardHat,
  AlertTriangle,
  Settings2,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMarkupTemplates } from '../../hooks/useMarkupTemplates'
import type {
  MarkupTemplate,
  MarkupTemplateCategory,
  CreateMarkupTemplateInput,
  EnhancedShape,
  MarkupAnnotationData,
} from '../../types/markup'

// Category configuration
const TEMPLATE_CATEGORIES: Record<MarkupTemplateCategory, { label: string; icon: React.ReactNode; color: string }> = {
  qc_review: {
    label: 'QC Review',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  site_walk: {
    label: 'Site Walk',
    icon: <HardHat className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  punch_list: {
    label: 'Punch List',
    icon: <ClipboardList className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  coordination: {
    label: 'Coordination',
    icon: <Users className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  safety_inspection: {
    label: 'Safety Inspection',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  custom: {
    label: 'Custom',
    icon: <Settings2 className="w-4 h-4" />,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
}

// ============================================================
// COMPONENT PROPS
// ============================================================

interface MarkupTemplateManagerProps {
  // Current markups on the canvas (for saving)
  currentMarkups: EnhancedShape[]
  // Canvas dimensions for relative positioning
  canvasWidth: number
  canvasHeight: number
  // Callback when template is loaded
  onLoadTemplate: (markups: MarkupAnnotationData[], canvasWidth: number, canvasHeight: number) => void
  // Current project context
  projectId?: string
  // State
  disabled?: boolean
  className?: string
}

export function MarkupTemplateManager({
  currentMarkups,
  canvasWidth,
  canvasHeight,
  onLoadTemplate,
  projectId,
  disabled = false,
  className,
}: MarkupTemplateManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<MarkupTemplateCategory | 'all'>('all')
  const [filterScope, setFilterScope] = useState<'all' | 'mine' | 'shared'>('all')

  // Template hooks
  const {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    isCreating,
    isDeleting,
  } = useMarkupTemplates({ projectId })

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = templates || []

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory)
    }

    // Scope filter
    if (filterScope === 'shared') {
      filtered = filtered.filter(t => t.is_shared)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [templates, filterCategory, filterScope, searchQuery])

  // Convert current markups to template format
  const convertMarkupsToTemplate = useCallback((markups: EnhancedShape[]): MarkupAnnotationData[] => {
    return markups.map(markup => ({
      type: markup.type,
      relativeX: markup.x / canvasWidth,
      relativeY: markup.y / canvasHeight,
      relativeWidth: markup.width ? markup.width / canvasWidth : undefined,
      relativeHeight: markup.height ? markup.height / canvasHeight : undefined,
      stroke: markup.stroke,
      strokeWidth: markup.strokeWidth,
      fill: markup.fill,
      opacity: markup.opacity,
      rotation: markup.rotation,
      text: markup.text,
      points: markup.points?.map((p, i) =>
        i % 2 === 0 ? p / canvasWidth : p / canvasHeight
      ),
      stampType: markup.stampType,
    }))
  }, [canvasWidth, canvasHeight])

  // Handle template load
  const handleLoadTemplate = useCallback((template: MarkupTemplate) => {
    onLoadTemplate(template.markups, canvasWidth, canvasHeight)
    setIsOpen(false)
  }, [canvasWidth, canvasHeight, onLoadTemplate])

  // Handle template delete
  const handleDeleteTemplate = useCallback((templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(templateId)
    }
  }, [deleteTemplate])

  // Handle template duplicate
  const handleDuplicateTemplate = useCallback((template: MarkupTemplate) => {
    duplicateTemplate({
      ...template,
      name: `${template.name} (Copy)`,
    })
  }, [duplicateTemplate])

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className={cn('flex items-center gap-2', className)}
          >
            <FileBox className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Templates</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex flex-col h-[450px]">
            {/* Header */}
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Markup Templates</Label>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => setIsSaveDialogOpen(true)}
                  disabled={currentMarkups.length === 0}
                  className="text-xs"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save Current
                </Button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <Select
                  value={filterCategory}
                  onValueChange={(v) => setFilterCategory(v as MarkupTemplateCategory | 'all')}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {(Object.keys(TEMPLATE_CATEGORIES) as MarkupTemplateCategory[]).map(cat => (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          {TEMPLATE_CATEGORIES[cat].icon}
                          <span>{TEMPLATE_CATEGORIES[cat].label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filterScope}
                  onValueChange={(v) => setFilterScope(v as 'all' | 'mine' | 'shared')}
                >
                  <SelectTrigger className="h-8 text-xs w-[100px]">
                    <SelectValue placeholder="Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="mine">My Templates</SelectItem>
                    <SelectItem value="shared">Shared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template list */}
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                    <p className="text-sm">Loading templates...</p>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileBox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No templates found</p>
                    <p className="text-xs">Save your current markups as a template to get started</p>
                  </div>
                ) : (
                  filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onLoad={handleLoadTemplate}
                      onDelete={handleDeleteTemplate}
                      onDuplicate={handleDuplicateTemplate}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        open={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        markups={currentMarkups}
        convertMarkups={convertMarkupsToTemplate}
        onSave={createTemplate}
        isSaving={isCreating}
        projectId={projectId}
      />
    </>
  )
}

// ============================================================
// TEMPLATE CARD COMPONENT
// ============================================================

interface TemplateCardProps {
  template: MarkupTemplate
  onLoad: (template: MarkupTemplate) => void
  onDelete: (templateId: string) => void
  onDuplicate: (template: MarkupTemplate) => void
}

function TemplateCard({ template, onLoad, onDelete, onDuplicate }: TemplateCardProps) {
  const categoryInfo = TEMPLATE_CATEGORIES[template.category]

  return (
    <div className="p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{template.name}</h4>
            {template.is_shared && (
              <Tooltip>
                <TooltipTrigger>
                  <Globe className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Shared with team</TooltipContent>
              </Tooltip>
            )}
          </div>

          {template.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {template.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn('text-xs py-0', categoryInfo.color)}
            >
              {categoryInfo.icon}
              <span className="ml-1">{categoryInfo.label}</span>
            </Badge>

            <span className="text-xs text-muted-foreground">
              {template.markups.length} annotations
            </span>

            {template.usage_count > 0 && (
              <span className="text-xs text-muted-foreground">
                Used {template.usage_count}x
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => onLoad(template)}
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Load Template</TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onLoad(template)}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Load Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(template.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SAVE TEMPLATE DIALOG
// ============================================================

interface SaveTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  markups: EnhancedShape[]
  convertMarkups: (markups: EnhancedShape[]) => MarkupAnnotationData[]
  onSave: (input: CreateMarkupTemplateInput) => void
  isSaving: boolean
  projectId?: string
}

function SaveTemplateDialog({
  open,
  onOpenChange,
  markups,
  convertMarkups,
  onSave,
  isSaving,
  projectId,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<MarkupTemplateCategory>('custom')
  const [isShared, setIsShared] = useState(false)
  const [isProjectOnly, setIsProjectOnly] = useState(true)
  const [tags, setTags] = useState('')

  const handleSave = useCallback(() => {
    if (!name.trim()) {return}

    const templateData: CreateMarkupTemplateInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      markups: convertMarkups(markups),
      is_shared: isShared,
      project_id: isProjectOnly ? projectId : null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    }

    onSave(templateData)

    // Reset form
    setName('')
    setDescription('')
    setCategory('custom')
    setIsShared(false)
    setTags('')
    onOpenChange(false)
  }, [name, description, category, markups, convertMarkups, isShared, isProjectOnly, projectId, tags, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save your current {markups.length} markup annotations as a reusable template.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard QC Review Markups"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template..."
              className="resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as MarkupTemplateCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TEMPLATE_CATEGORIES) as MarkupTemplateCategory[]).map(cat => (
                  <SelectItem key={cat} value={cat}>
                    <div className="flex items-center gap-2">
                      {TEMPLATE_CATEGORIES[cat].icon}
                      <span>{TEMPLATE_CATEGORIES[cat].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., review, standard, phase1"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Share with Team</Label>
                <p className="text-xs text-muted-foreground">
                  Allow team members to use this template
                </p>
              </div>
              <Switch
                checked={isShared}
                onCheckedChange={setIsShared}
              />
            </div>

            {projectId && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Project Only</Label>
                  <p className="text-xs text-muted-foreground">
                    Limit to current project
                  </p>
                </div>
                <Switch
                  checked={isProjectOnly}
                  onCheckedChange={setIsProjectOnly}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MarkupTemplateManager
