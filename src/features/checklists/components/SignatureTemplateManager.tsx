// File: /src/features/checklists/components/SignatureTemplateManager.tsx
// UI for managing saved signature templates

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Save, Trash2, Check, X, Edit2, Clock } from 'lucide-react'
import {
  getSignatureTemplates,
  saveSignatureTemplate,
  deleteSignatureTemplate,
  updateTemplateUsage,
  renameSignatureTemplate,
  isTemplateNameAvailable,
  type SignatureTemplate,
} from '../utils/signatureTemplates'
import { toast } from 'sonner'
import { logger } from '../../../lib/utils/logger'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'


interface SignatureTemplateManagerProps {
  currentSignature: string | null
  onTemplateSelect: (dataUrl: string) => void
  onSaveAsTemplate?: (name: string) => void
}

export function SignatureTemplateManager({
  currentSignature,
  onTemplateSelect,
  onSaveAsTemplate,
}: SignatureTemplateManagerProps) {
  const [templates, setTemplates] = useState<SignatureTemplate[]>(getSignatureTemplates())
  const [newTemplateName, setNewTemplateName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [overwriteConfirm, setOverwriteConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)

  const refreshTemplates = () => {
    setTemplates(getSignatureTemplates())
  }

  const handleSaveTemplate = () => {
    if (!currentSignature) {
      toast.error('No signature to save')
      return
    }

    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name')
      return
    }

    if (!isTemplateNameAvailable(newTemplateName.trim())) {
      // Show overwrite confirmation dialog
      setOverwriteConfirm(true)
      return
    }

    doSaveTemplate()
  }

  const doSaveTemplate = () => {
    if (!currentSignature) {return}

    try {
      saveSignatureTemplate(newTemplateName.trim(), currentSignature)
      refreshTemplates()
      setNewTemplateName('')
      toast.success('Signature template saved')
      onSaveAsTemplate?.(newTemplateName.trim())
    } catch (error) {
      toast.error('Failed to save template')
      logger.error(error)
    }
    setOverwriteConfirm(false)
  }

  const handleSelectTemplate = (template: SignatureTemplate) => {
    updateTemplateUsage(template.id)
    onTemplateSelect(template.dataUrl)
    refreshTemplates()
    toast.success(`Loaded template: ${template.name}`)
  }

  const handleDeleteTemplate = (id: string, name: string) => {
    setDeleteConfirm({ id, name })
  }

  const doDeleteTemplate = () => {
    if (!deleteConfirm) {return}

    try {
      deleteSignatureTemplate(deleteConfirm.id)
      refreshTemplates()
      toast.success('Template deleted')
    } catch (error) {
      toast.error('Failed to delete template')
      logger.error(error)
    }
    setDeleteConfirm(null)
  }

  const handleStartEdit = (template: SignatureTemplate) => {
    setEditingId(template.id)
    setEditName(template.name)
  }

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) {
      toast.error('Template name cannot be empty')
      return
    }

    if (!isTemplateNameAvailable(editName.trim(), id)) {
      toast.error('Template name already exists')
      return
    }

    try {
      renameSignatureTemplate(id, editName.trim())
      refreshTemplates()
      setEditingId(null)
      toast.success('Template renamed')
    } catch (error) {
      toast.error('Failed to rename template')
      logger.error(error)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      {/* Save current signature as template */}
      {currentSignature && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <Label className="text-sm font-medium text-blue-900 mb-2 block">
            Save Current Signature as Template
          </Label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Template name (e.g., John Doe)"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveTemplate()
                }
              }}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleSaveTemplate}
              disabled={!newTemplateName.trim()}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </Card>
      )}

      {/* Template list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium text-secondary">
            Saved Templates ({templates.length})
          </Label>
          {templates.length >= 10 && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
              Max templates reached
            </Badge>
          )}
        </div>

        {templates.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-secondary">No saved templates</p>
            <p className="text-xs text-muted mt-1">
              Draw a signature and save it as a template for quick reuse
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="p-3 hover:bg-surface transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Signature preview */}
                  <div className="w-24 h-12 border rounded bg-card flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img
                      src={template.dataUrl}
                      alt={template.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  {/* Template info */}
                  <div className="flex-1 min-w-0">
                    {editingId === template.id ? (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(template.id)
                            } else if (e.key === 'Escape') {
                              handleCancelEdit()
                            }
                          }}
                          className="text-sm h-8"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSaveEdit(template.id)}
                          className="h-8 px-2"
                        >
                          <Check className="w-4 h-4 text-success" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-8 px-2"
                        >
                          <X className="w-4 h-4 text-secondary" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-sm text-foreground truncate">
                          {template.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                          <Clock className="w-3 h-3" />
                          <span>
                            {template.lastUsedAt
                              ? `Used ${formatDate(template.lastUsedAt)}`
                              : `Created ${formatDate(template.createdAt)}`}
                          </span>
                          {template.useCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {template.useCount} uses
                            </Badge>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {editingId !== template.id && (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectTemplate(template)}
                        className="h-8"
                      >
                        Use
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStartEdit(template)}
                        className="h-8 px-2"
                      >
                        <Edit2 className="w-4 h-4 text-secondary" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                        className="h-8 px-2"
                      >
                        <Trash2 className="w-4 h-4 text-error" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Overwrite confirmation dialog */}
      <AlertDialog open={overwriteConfirm} onOpenChange={setOverwriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite Template</AlertDialogTitle>
            <AlertDialogDescription>
              Template "{newTemplateName}" already exists. Do you want to overwrite it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doSaveTemplate}>
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete template "{deleteConfirm?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDeleteTemplate}
              className="bg-error hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
