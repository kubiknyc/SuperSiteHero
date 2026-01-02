// Template selector and manager component
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  FileText,
  Plus,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
} from 'lucide-react'
import {
  getProjectTemplates,
  saveReportTemplate,
  deleteTemplate,
  applyTemplate,
  createTemplateFromReport,
  type ReportTemplate,
} from '../services/reportTemplates'
import type { DraftReport, WorkforceEntry, EquipmentEntry } from '../store/offlineReportStore'
import { toast } from 'sonner'

interface TemplateSelectorProps {
  projectId: string
  userId: string
  currentDraft?: DraftReport | null
  currentWorkforce?: WorkforceEntry[]
  currentEquipment?: EquipmentEntry[]
  onApplyTemplate: (
    draftUpdates: Partial<DraftReport>,
    workforce: WorkforceEntry[],
    equipment: EquipmentEntry[]
  ) => void
  expanded?: boolean
  onToggle?: () => void
}

export function TemplateSelector({
  projectId,
  userId,
  currentDraft,
  currentWorkforce = [],
  currentEquipment = [],
  onApplyTemplate,
  expanded = false,
  onToggle,
}: TemplateSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')

  const queryClient = useQueryClient()

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['report-templates', projectId],
    queryFn: () => getProjectTemplates(projectId),
    enabled: !!projectId,
  })

  const saveMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!currentDraft) {throw new Error('No draft to save as template')}

      const input = createTemplateFromReport(
        currentDraft,
        currentWorkforce,
        currentEquipment,
        name,
        description
      )

      return saveReportTemplate(input, userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates', projectId] })
      toast.success('Template saved successfully')
      setIsCreating(false)
      setNewTemplateName('')
      setNewTemplateDescription('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save template')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates', projectId] })
      toast.success('Template deleted')
    },
    onError: () => {
      toast.error('Failed to delete template')
    },
  })

  const handleApplyTemplate = (template: ReportTemplate) => {
    const { draftUpdates, workforce, equipment } = applyTemplate(template)
    onApplyTemplate(draftUpdates, workforce, equipment)
    toast.success(`Applied template: ${template.name}`)
  }

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name')
      return
    }
    saveMutation.mutate({
      name: newTemplateName.trim(),
      description: newTemplateDescription.trim() || undefined,
    })
  }

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-surface"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-secondary" />
          <div className="text-left">
            <p className="font-medium text-foreground">Report Templates</p>
            <p className="text-sm text-muted">
              {templates.length} template{templates.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-disabled" />
        ) : (
          <ChevronDown className="h-5 w-5 text-disabled" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {/* Save current as template */}
          {currentDraft && (
            <div className="pb-4 border-b">
              {isCreating ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Template name"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    autoFocus
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveTemplate}
                      disabled={saveMutation.isPending || !newTemplateName.trim()}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false)
                        setNewTemplateName('')
                        setNewTemplateDescription('')
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreating(true)}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Current as Template
                </Button>
              )}
            </div>
          )}

          {/* Template list */}
          {isLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">
              No templates saved yet. Create one from the current report configuration.
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg hover:bg-muted"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{template.name}</p>
                    {template.description && (
                      <p className="text-xs text-muted truncate">{template.description}</p>
                    )}
                    <div className="flex gap-2 mt-1 text-xs text-disabled">
                      {template.workforce_entries?.length ? (
                        <span>{template.workforce_entries.length} workers</span>
                      ) : null}
                      {template.equipment_entries?.length ? (
                        <span>{template.equipment_entries.length} equipment</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApplyTemplate(template)}
                      title="Apply template"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(template.id)}
                      disabled={deleteMutation.isPending}
                      className="text-error hover:text-error-dark hover:bg-error-light"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
