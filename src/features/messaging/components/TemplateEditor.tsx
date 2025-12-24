/**
 * TemplateEditor Component
 * Form for creating and editing message templates
 */

import { useState, useEffect } from 'react'
import { Save, X, Code, Globe, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useMessageTemplates } from '../hooks/useMessageTemplates'
import { extractTemplateVariables } from '../services/messageTemplates'
import type { MessageTemplate, CreateTemplateInput } from '../services/messageTemplates'

// ============================================================================
// Types
// ============================================================================

export interface TemplateEditorProps {
  /** Existing template to edit (undefined for create) */
  template?: MessageTemplate
  /** Open state */
  open: boolean
  /** Close callback */
  onClose: () => void
  /** Success callback */
  onSuccess?: (template: MessageTemplate) => void
}

// ============================================================================
// Main Component
// ============================================================================

export function TemplateEditor({
  template,
  open,
  onClose,
  onSuccess,
}: TemplateEditorProps) {
  const { createTemplate, updateTemplate, categories, isLoading } =
    useMessageTemplates()

  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<string>('')
  const [isShared, setIsShared] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detected variables
  const detectedVariables = extractTemplateVariables(content)

  // Initialize form when template prop changes
  useEffect(() => {
    if (template) {
      setName(template.name)
      setContent(template.content)
      setCategory(template.category || '')
      setIsShared(template.is_shared)
    } else {
      // Reset form for new template
      setName('')
      setContent('')
      setCategory('')
      setIsShared(false)
    }
    setError(null)
  }, [template, open])

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      setError('Please enter a template name')
      return
    }

    if (!content.trim()) {
      setError('Please enter template content')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      let savedTemplate: MessageTemplate

      if (template) {
        // Update existing
        savedTemplate = await updateTemplate(template.id, {
          name: name.trim(),
          content: content.trim(),
          category: category.trim() || null,
          is_shared: isShared,
          variables: detectedVariables,
        })
      } else {
        // Create new
        const input: CreateTemplateInput = {
          name: name.trim(),
          content: content.trim(),
          category: category.trim() || undefined,
          is_shared: isShared,
          variables: detectedVariables,
        }
        savedTemplate = await createTemplate(input)
      }

      onSuccess?.(savedTemplate)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Update the template details below'
              : 'Create a reusable message template with optional variable placeholders'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              type="text"
              placeholder="e.g., Daily Safety Briefing"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isSaving}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="template-category">Category</Label>
            {categories.length > 0 ? (
              <Select value={category} onValueChange={setCategory} disabled={isSaving}>
                <SelectTrigger id="template-category">
                  <SelectValue placeholder="Select or enter category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No category</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="template-category"
                type="text"
                placeholder="e.g., Safety, Progress, Issues"
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={isSaving}
              />
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="template-content">Template Content *</Label>
            <Textarea
              id="template-content"
              placeholder="Enter your message template. Use {variable_name} for placeholders."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              disabled={isSaving}
            />
            <p className="text-xs text-muted">
              Use <code className="bg-muted dark:bg-surface px-1 rounded">{'{variable_name}'}</code>{' '}
              syntax for placeholders that can be filled in later
            </p>
          </div>

          {/* Detected Variables */}
          {detectedVariables.length > 0 && (
            <Alert>
              <Code className="w-4 h-4" />
              <AlertDescription>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium">Detected variables:</span>
                  <div className="flex flex-wrap gap-1">
                    {detectedVariables.map(v => (
                      <Badge key={v} variant="secondary" className="font-mono text-xs">
                        {`{${v}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Sharing */}
          <div className="flex items-center justify-between p-4 border border-border dark:border-border rounded-lg">
            <div className="flex items-start gap-3">
              {isShared ? (
                <Globe className="w-5 h-5 text-primary mt-0.5" />
              ) : (
                <Lock className="w-5 h-5 text-disabled mt-0.5" />
              )}
              <div>
                <Label htmlFor="template-shared" className="cursor-pointer">
                  Share with company
                </Label>
                <p className="text-sm text-muted">
                  {isShared
                    ? 'All team members can use this template'
                    : 'Only you can see and use this template'}
                </p>
              </div>
            </div>
            <Switch
              id="template-shared"
              checked={isShared}
              onCheckedChange={setIsShared}
              disabled={isSaving}
            />
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : template ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
