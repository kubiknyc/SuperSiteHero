/**
 * Closeout Document Form Dialog
 *
 * Dialog for creating and editing closeout documents
 */

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Loader2, FileText, Building, Calendar, Hash, X } from 'lucide-react'
import {
  CLOSEOUT_DOCUMENT_TYPES,
  type CloseoutDocumentWithDetails,
  type CreateCloseoutDocumentDTO,
  type UpdateCloseoutDocumentDTO,
  type CloseoutDocumentType,
} from '@/types/closeout'

// =============================================
// Form Schema
// =============================================

const closeoutDocumentSchema = z.object({
  document_type: z.string().min(1, 'Document type is required'),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().optional(),
  spec_section: z.string().optional(),
  spec_section_title: z.string().optional(),
  subcontractor_id: z.string().optional(),
  responsible_party: z.string().optional(),
  required: z.boolean(),
  required_copies: z.number().min(1).max(10),
  format_required: z.string().optional(),
  required_date: z.string().optional(),
  notes: z.string().optional(),
})

type CloseoutDocumentFormValues = z.infer<typeof closeoutDocumentSchema>

// =============================================
// Component Props
// =============================================

interface CloseoutDocumentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document?: CloseoutDocumentWithDetails | null
  projectId: string
  subcontractors?: Array<{ id: string; company_name: string }>
  onSubmit: (data: CreateCloseoutDocumentDTO | UpdateCloseoutDocumentDTO) => Promise<void>
  isLoading?: boolean
}

// =============================================
// Component
// =============================================

export function CloseoutDocumentFormDialog({
  open,
  onOpenChange,
  document,
  projectId,
  subcontractors = [],
  onSubmit,
  isLoading = false,
}: CloseoutDocumentFormDialogProps) {
  const isEditing = !!document

  const form = useForm<CloseoutDocumentFormValues>({
    resolver: zodResolver(closeoutDocumentSchema),
    defaultValues: {
      document_type: document?.document_type || '',
      title: document?.title || '',
      description: document?.description || '',
      spec_section: document?.spec_section || '',
      spec_section_title: document?.spec_section_title || '',
      subcontractor_id: document?.subcontractor_id || '',
      responsible_party: document?.responsible_party || '',
      required: document?.required ?? true,
      required_copies: document?.required_copies ?? 1,
      format_required: document?.format_required || '',
      required_date: document?.required_date?.split('T')[0] || '',
      notes: document?.notes || '',
    },
  })

  // Reset form when document changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        document_type: document?.document_type || '',
        title: document?.title || '',
        description: document?.description || '',
        spec_section: document?.spec_section || '',
        spec_section_title: document?.spec_section_title || '',
        subcontractor_id: document?.subcontractor_id || '',
        responsible_party: document?.responsible_party || '',
        required: document?.required ?? true,
        required_copies: document?.required_copies ?? 1,
        format_required: document?.format_required || '',
        required_date: document?.required_date?.split('T')[0] || '',
        notes: document?.notes || '',
      })
    }
  }, [open, document, form])

  const handleSubmit = async (values: CloseoutDocumentFormValues) => {
    if (isEditing) {
      const updateData: UpdateCloseoutDocumentDTO = {
        title: values.title,
        description: values.description || undefined,
        spec_section: values.spec_section || undefined,
        spec_section_title: values.spec_section_title || undefined,
        subcontractor_id: values.subcontractor_id || undefined,
        responsible_party: values.responsible_party || undefined,
        required: values.required,
        required_copies: values.required_copies,
        format_required: values.format_required || undefined,
        required_date: values.required_date || undefined,
        notes: values.notes || undefined,
      }
      await onSubmit(updateData)
    } else {
      const createData: CreateCloseoutDocumentDTO = {
        project_id: projectId,
        document_type: values.document_type as CloseoutDocumentType,
        title: values.title,
        description: values.description || undefined,
        spec_section: values.spec_section || undefined,
        spec_section_title: values.spec_section_title || undefined,
        subcontractor_id: values.subcontractor_id || undefined,
        responsible_party: values.responsible_party || undefined,
        required: values.required,
        required_copies: values.required_copies,
        format_required: values.format_required || undefined,
        required_date: values.required_date || undefined,
        notes: values.notes || undefined,
      }
      await onSubmit(createData)
    }
    onOpenChange(false)
  }

  // Group document types by category for the select
  const documentTypesByCategory = React.useMemo(() => {
    const categories: Record<string, typeof CLOSEOUT_DOCUMENT_TYPES> = {}
    for (const type of CLOSEOUT_DOCUMENT_TYPES) {
      if (!categories[type.category]) {
        categories[type.category] = []
      }
      categories[type.category].push(type)
    }
    return categories
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isEditing ? 'Edit Closeout Document' : 'Add Closeout Document'}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              disabled={form.formState.isSubmitting}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <DialogDescription>
            {isEditing
              ? 'Update the closeout document details below.'
              : 'Add a new document to the project closeout checklist.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Document Type - Only for new documents */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type *</Label>
              <Select
                value={form.watch('document_type')}
                onValueChange={(value) => form.setValue('document_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(documentTypesByCategory).map(([category, types]) => (
                    <React.Fragment key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted uppercase bg-surface">
                        {category}
                      </div>
                      {types.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.document_type && (
                <p className="text-sm text-error">
                  {form.formState.errors.document_type.message}
                </p>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="e.g., HVAC System O&M Manual"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-error">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Brief description of the document requirements..."
              rows={3}
            />
          </div>

          {/* Spec Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spec_section" className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                Spec Section
              </Label>
              <Input
                id="spec_section"
                {...form.register('spec_section')}
                placeholder="e.g., 23 05 00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="spec_section_title">Spec Section Title</Label>
              <Input
                id="spec_section_title"
                {...form.register('spec_section_title')}
                placeholder="e.g., Common Work Results for HVAC"
              />
            </div>
          </div>

          {/* Subcontractor / Responsible Party */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subcontractor_id" className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" />
                Subcontractor
              </Label>
              <Select
                value={form.watch('subcontractor_id') || '__none__'}
                onValueChange={(value) => form.setValue('subcontractor_id', value === '__none__' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- None --</SelectItem>
                  {subcontractors.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible_party">Responsible Party</Label>
              <Input
                id="responsible_party"
                {...form.register('responsible_party')}
                placeholder="e.g., Owner, Architect"
              />
            </div>
          </div>

          {/* Required Options */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="required"
                  checked={form.watch('required')}
                  onCheckedChange={(checked) => form.setValue('required', checked as boolean)}
                />
                <Label htmlFor="required" className="text-sm font-normal">
                  Required Document
                </Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="required_copies">Required Copies</Label>
              <Input
                id="required_copies"
                type="number"
                min={1}
                max={10}
                {...form.register('required_copies', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format_required">Format Required</Label>
              <Input
                id="format_required"
                {...form.register('format_required')}
                placeholder="e.g., PDF, Hard Copy"
              />
            </div>
          </div>

          {/* Required Date */}
          <div className="space-y-2">
            <Label htmlFor="required_date" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Required By Date
            </Label>
            <Input id="required_date" type="date" {...form.register('required_date')} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Additional notes or instructions..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Document' : 'Add Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
