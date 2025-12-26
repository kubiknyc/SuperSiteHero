/**
 * Save As Template Dialog
 *
 * Dialog for creating a new template from an existing project.
 * Allows users to select which components to include in the template.
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  FolderTree,
  Users,
  Workflow,
  CheckSquare,
  Settings2,
  Lock,
  Globe,
} from 'lucide-react'
import { useCreateTemplateFromProject } from '../hooks/useProjectTemplates'
import { toast } from 'sonner'
import type {
  TemplateCategory,
  CreateTemplateFromProjectInput,
} from '@/types/project-template'
import { TEMPLATE_CATEGORIES } from '@/types/project-template'
import { logger } from '../../../lib/utils/logger';


interface SaveAsTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  userId: string
  onSuccess?: () => void
}

export function SaveAsTemplateDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  userId,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  // Form state
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [category, setCategory] = React.useState<TemplateCategory>('commercial')
  const [visibility, setVisibility] = React.useState<'company' | 'private'>('company')

  // Include options
  const [includeFolderStructure, setIncludeFolderStructure] = React.useState(true)
  const [includeTeamRoles, setIncludeTeamRoles] = React.useState(false)
  const [includeWorkflows, setIncludeWorkflows] = React.useState(true)
  const [includeChecklists, setIncludeChecklists] = React.useState(true)
  const [includeSettings, setIncludeSettings] = React.useState(true)

  const createMutation = useCreateTemplateFromProject()

  // Initialize with project name
  React.useEffect(() => {
    if (open && projectName) {
      setName(`${projectName} Template`)
    }
  }, [open, projectName])

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Please enter a template name')
      return
    }

    const input: CreateTemplateFromProjectInput = {
      project_id: projectId,
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      visibility,
      include_folder_structure: includeFolderStructure,
      include_team_roles: includeTeamRoles,
      include_workflows: includeWorkflows,
      include_checklists: includeChecklists,
      include_settings: includeSettings,
    }

    try {
      await createMutation.mutateAsync({ input, userId })
      toast.success('Template created successfully')
      onOpenChange(false)
      onSuccess?.()
      resetForm()
    } catch (error) {
      toast.error('Failed to create template')
      logger.error('Failed to create template:', error)
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setCategory('commercial')
    setVisibility('company')
    setIncludeFolderStructure(true)
    setIncludeTeamRoles(false)
    setIncludeWorkflows(true)
    setIncludeChecklists(true)
    setIncludeSettings(true)
  }

  const handleCancel = () => {
    onOpenChange(false)
    resetForm()
  }

  const includeCount = [
    includeFolderStructure,
    includeTeamRoles,
    includeWorkflows,
    includeChecklists,
    includeSettings,
  ].filter(Boolean).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Create a reusable template from "{projectName}" for future projects
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Standard Commercial Office"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when to use this template..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Visibility</Label>
                <div className="flex items-center gap-4 pt-2">
                  <Button
                    type="button"
                    variant={visibility === 'company' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setVisibility('company')}
                    className="flex-1"
                  >
                    <Globe className="h-4 w-4 mr-1" />
                    Company
                  </Button>
                  <Button
                    type="button"
                    variant={visibility === 'private' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setVisibility('private')}
                    className="flex-1"
                  >
                    <Lock className="h-4 w-4 mr-1" />
                    Private
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Include Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Include in Template</Label>
              <Badge variant="outline">{includeCount} selected</Badge>
            </div>

            <div className="space-y-3">
              <IncludeOption
                id="include-folders"
                icon={FolderTree}
                label="Folder Structure"
                description="Document folders and organization"
                checked={includeFolderStructure}
                onCheckedChange={setIncludeFolderStructure}
              />

              <IncludeOption
                id="include-settings"
                icon={Settings2}
                label="Project Settings"
                description="Weather units, features, and preferences"
                checked={includeSettings}
                onCheckedChange={setIncludeSettings}
              />

              <IncludeOption
                id="include-workflows"
                icon={Workflow}
                label="Approval Workflows"
                description="RFI, submittal, and CO approval chains"
                checked={includeWorkflows}
                onCheckedChange={setIncludeWorkflows}
              />

              <IncludeOption
                id="include-checklists"
                icon={CheckSquare}
                label="Checklists"
                description="Safety, QC, and closeout checklists"
                checked={includeChecklists}
                onCheckedChange={setIncludeChecklists}
              />

              <IncludeOption
                id="include-roles"
                icon={Users}
                label="Team Role Structure"
                description="Standard roles and permissions"
                checked={includeTeamRoles}
                onCheckedChange={setIncludeTeamRoles}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Include option checkbox with icon and description
 */
function IncludeOption({
  id,
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start space-x-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <div className="flex-1">
        <label
          htmlFor={id}
          className="flex items-center gap-2 text-sm font-medium cursor-pointer"
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  )
}

export default SaveAsTemplateDialog
