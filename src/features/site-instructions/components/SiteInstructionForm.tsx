import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { SiteInstructionPriority } from '@/types/database'
import type { CreateSiteInstructionInput, UpdateSiteInstructionInput } from '../hooks/useSiteInstructions'

interface Contact {
  id: string
  company_name: string | null
  first_name: string | null
  last_name: string | null
}

interface SiteInstructionFormProps {
  projectId: string
  contacts: Contact[]
  initialData?: Partial<CreateSiteInstructionInput & { id: string }>
  onSubmit: (data: CreateSiteInstructionInput | UpdateSiteInstructionInput) => Promise<void>
  isSubmitting?: boolean
  mode?: 'create' | 'edit'
}

type FormData = {
  title: string
  description: string
  subcontractor_id: string
  priority: SiteInstructionPriority
  due_date: string
}

export function SiteInstructionForm({
  projectId,
  contacts,
  initialData,
  onSubmit,
  isSubmitting = false,
  mode = 'create',
}: SiteInstructionFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      subcontractor_id: initialData?.subcontractor_id || '',
      priority: (initialData?.priority as SiteInstructionPriority) || 'normal',
      due_date: initialData?.due_date || '',
    },
  })

  const selectedPriority = watch('priority')
  const selectedSubcontractor = watch('subcontractor_id')

  const handleFormSubmit = async (data: FormData) => {
    if (mode === 'edit' && initialData?.id) {
      await onSubmit({
        id: initialData.id,
        ...data,
      })
    } else {
      await onSubmit({
        project_id: projectId,
        ...data,
        requires_acknowledgment: true,
        requires_completion_tracking: true,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'New Site Instruction' : 'Edit Site Instruction'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief description of the instruction"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcontractor_id">Subcontractor *</Label>
            <Select
              value={selectedSubcontractor}
              onValueChange={(value) => setValue('subcontractor_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select subcontractor" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.company_name || 'Unknown Company'}
                    {(contact.first_name || contact.last_name) && ` - ${[contact.first_name, contact.last_name].filter(Boolean).join(' ')}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register('subcontractor_id', { required: 'Subcontractor is required' })} />
            {errors.subcontractor_id && (
              <p className="text-sm text-destructive">{errors.subcontractor_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Detailed instruction or directive..."
              rows={6}
              {...register('description', { required: 'Description is required' })}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={selectedPriority}
                onValueChange={(value) => setValue('priority', value as SiteInstructionPriority)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Instruction' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
