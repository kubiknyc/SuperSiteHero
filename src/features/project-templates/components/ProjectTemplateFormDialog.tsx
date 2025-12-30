/**
 * Project Template Form Dialog
 *
 * Dialog for creating or editing project templates
 * Multi-step wizard for complex configuration
 */

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Plus,
  X,
  FolderTree,
  ListTodo,
  Settings2,
  FileText,
  GripVertical,
  Trash2,
} from 'lucide-react'
import {
  TEMPLATE_CATEGORIES,
  DEFAULT_FOLDER_STRUCTURES,
  DEFAULT_PHASES,
  DEFAULT_FEATURES,
  type ProjectTemplate,
  type CreateProjectTemplateInput,
  type UpdateProjectTemplateInput,
  type TemplateCategory,
  type TemplateEnabledFeatures,
  type TemplateFolderStructure,
  type CreateTemplatePhaseInput,
} from '@/types/project-template'

interface ProjectTemplateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: ProjectTemplate | null
  onSave: (input: CreateProjectTemplateInput | UpdateProjectTemplateInput) => Promise<void>
  isLoading?: boolean
  companyId: string
}

type Step = 'basics' | 'features' | 'folders' | 'phases'

export function ProjectTemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSave,
  isLoading,
  companyId,
}: ProjectTemplateFormDialogProps) {
  const isEditing = !!template

  // Form state
  const [currentStep, setCurrentStep] = React.useState<Step>('basics')
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [category, setCategory] = React.useState<TemplateCategory>('commercial')
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState('')
  const [visibility, setVisibility] = React.useState<'company' | 'private'>('company')
  const [enabledFeatures, setEnabledFeatures] = React.useState<TemplateEnabledFeatures>({})
  const [folderStructure, setFolderStructure] = React.useState<TemplateFolderStructure[]>([])
  const [phases, setPhases] = React.useState<CreateTemplatePhaseInput[]>([])

  // Reset form helper - moved before useEffect to fix React Compiler error
  const resetForm = React.useCallback(() => {
    setCurrentStep('basics')
    setName('')
    setDescription('')
    setCategory('commercial')
    setTags([])
    setTagInput('')
    setVisibility('company')
    setEnabledFeatures(DEFAULT_FEATURES.commercial)
    setFolderStructure(DEFAULT_FOLDER_STRUCTURES.commercial)
    setPhases(DEFAULT_PHASES.commercial)
  }, [])

  // Initialize form when template changes
  React.useEffect(() => {
    if (template) {
      setName(template.name)
      setDescription(template.description || '')
      setCategory(template.category || 'commercial')
      setTags(template.tags || [])
      setVisibility(template.visibility)
      setEnabledFeatures(template.enabled_features || {})
      setFolderStructure(template.folder_structure || [])
      // Note: phases would need to be loaded separately in a real implementation
    } else {
      resetForm()
    }
  }, [template, open, resetForm])

  // Apply category defaults
  const handleCategoryChange = (newCategory: TemplateCategory) => {
    setCategory(newCategory)
    if (!isEditing) {
      setEnabledFeatures(DEFAULT_FEATURES[newCategory])
      setFolderStructure(DEFAULT_FOLDER_STRUCTURES[newCategory])
      setPhases(DEFAULT_PHASES[newCategory])
    }
  }

  // Tags management
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  // Feature toggles
  const toggleFeature = (feature: keyof TemplateEnabledFeatures) => {
    setEnabledFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }))
  }

  // Phase management
  const addPhase = () => {
    setPhases([...phases, { name: '', estimated_duration_days: 7 }])
  }

  const updatePhase = (index: number, updates: Partial<CreateTemplatePhaseInput>) => {
    setPhases(phases.map((p, i) => (i === index ? { ...p, ...updates } : p)))
  }

  const removePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index))
  }

  // Submit handler
  const handleSubmit = async () => {
    const input: CreateProjectTemplateInput = {
      company_id: companyId,
      name: name.trim(),
      description: description.trim() || null,
      category,
      tags: tags.length > 0 ? tags : null,
      visibility,
      enabled_features: enabledFeatures,
      folder_structure: folderStructure,
      phases: phases.filter((p) => p.name.trim()),
    }

    await onSave(input)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 'basics':
        return name.trim().length > 0
      default:
        return true
    }
  }

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'basics', label: 'Basics', icon: <FileText className="h-4 w-4" /> },
    { key: 'features', label: 'Features', icon: <Settings2 className="h-4 w-4" /> },
    { key: 'folders', label: 'Folders', icon: <FolderTree className="h-4 w-4" /> },
    { key: 'phases', label: 'Phases', icon: <ListTodo className="h-4 w-4" /> },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Template' : 'Create Project Template'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the template configuration'
              : 'Create a reusable template for new projects'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentStep} onValueChange={(v) => setCurrentStep(v as Step)}>
          <TabsList className="grid w-full grid-cols-4">
            {steps.map((step) => (
              <TabsTrigger key={step.key} value={step.key} className="flex items-center gap-2">
                {step.icon}
                <span className="hidden sm:inline">{step.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[400px] mt-4 pr-4">
            {/* Basics Tab */}
            <TabsContent value="basics" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Commercial Office Building"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe when to use this template..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex flex-col">
                          <span>{cat.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {cat.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="private">Private Template</Label>
                  <p className="text-sm text-muted-foreground">
                    Only visible to you, not other company users
                  </p>
                </div>
                <Switch
                  id="private"
                  checked={visibility === 'private'}
                  onCheckedChange={(checked) =>
                    setVisibility(checked ? 'private' : 'company')
                  }
                />
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground mb-4">
                Select which features are enabled for projects using this template
              </p>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries({
                  daily_reports: 'Daily Reports',
                  documents: 'Document Management',
                  workflows: 'Workflows',
                  tasks: 'Tasks',
                  checklists: 'Checklists',
                  punch_lists: 'Punch Lists',
                  safety: 'Safety Tracking',
                  inspections: 'Inspections',
                  material_tracking: 'Material Tracking',
                  photos: 'Photo Management',
                  takeoff: 'Takeoff Tools',
                  cost_tracking: 'Cost Tracking',
                  equipment_tracking: 'Equipment Tracking',
                  time_tracking: 'Time Tracking',
                  transmittals: 'Transmittals',
                  meeting_minutes: 'Meeting Minutes',
                  permits: 'Permits',
                  closeout: 'Closeout Documents',
                  client_portal: 'Client Portal',
                  subcontractor_portal: 'Subcontractor Portal',
                }).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <Label htmlFor={key} className="cursor-pointer">
                      {label}
                    </Label>
                    <Switch
                      id={key}
                      checked={enabledFeatures[key as keyof TemplateEnabledFeatures] ?? false}
                      onCheckedChange={() =>
                        toggleFeature(key as keyof TemplateEnabledFeatures)
                      }
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Folders Tab */}
            <TabsContent value="folders" className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground mb-4">
                Define the folder structure that will be created for new projects
              </p>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Folder Structure Preview</CardTitle>
                  <CardDescription>
                    Based on {category} category defaults
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 font-mono text-sm">
                    {folderStructure.map((folder, index) => (
                      <FolderItem key={folder.id || index} folder={folder} depth={0} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <p className="text-xs text-muted-foreground">
                Advanced folder customization will be available in a future update
              </p>
            </TabsContent>

            {/* Phases Tab */}
            <TabsContent value="phases" className="space-y-4 mt-0">
              <p className="text-sm text-muted-foreground mb-4">
                Define project phases/milestones for scheduling
              </p>

              <div className="space-y-2">
                {phases.map((phase, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 border rounded-lg"
                  >
                    <GripVertical className="h-4 w-4 text-disabled" />
                    <Input
                      value={phase.name}
                      onChange={(e) => updatePhase(index, { name: e.target.value })}
                      placeholder="Phase name"
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={phase.estimated_duration_days || ''}
                      onChange={(e) =>
                        updatePhase(index, {
                          estimated_duration_days: parseInt(e.target.value) || undefined,
                        })
                      }
                      placeholder="Days"
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePhase(index)}
                    >
                      <Trash2 className="h-4 w-4 text-error" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={addPhase} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Phase
              </Button>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator />

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <div className="flex gap-2">
            {currentStep !== 'basics' && (
              <Button
                variant="outline"
                onClick={() => {
                  const stepIndex = steps.findIndex((s) => s.key === currentStep)
                  if (stepIndex > 0) {
                    setCurrentStep(steps[stepIndex - 1].key)
                  }
                }}
              >
                Previous
              </Button>
            )}

            {currentStep !== 'phases' ? (
              <Button
                onClick={() => {
                  const stepIndex = steps.findIndex((s) => s.key === currentStep)
                  if (stepIndex < steps.length - 1) {
                    setCurrentStep(steps[stepIndex + 1].key)
                  }
                }}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canProceed() || isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Save Changes' : 'Create Template'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ProjectTemplateFormDialog

// Helper component for folder tree display - moved outside to fix React Compiler "Cannot create components during render"
function FolderItem({
  folder,
  depth,
}: {
  folder: TemplateFolderStructure
  depth: number
}) {
  const indent = '  '.repeat(depth)
  return (
    <>
      <div className="text-secondary">
        {indent}
        {depth > 0 ? '└─ ' : ''}
        {folder.name}
      </div>
      {folder.children?.map((child, index) => (
        <FolderItem key={child.id || index} folder={child} depth={depth + 1} />
      ))}
    </>
  )
}
