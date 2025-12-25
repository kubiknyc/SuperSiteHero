/**
 * Warranty Form Dialog
 *
 * Dialog for creating and editing warranty records
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
import {
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Shield,
  Building,
  Calendar,
  Phone,
  Mail,
  User,
  Hash,
} from 'lucide-react'
import type {
  WarrantyWithDetails,
  CreateWarrantyDTO,
  UpdateWarrantyDTO,
  WarrantyType,
} from '@/types/closeout'
import { WARRANTY_TYPES } from '@/types/closeout'

// =============================================
// Form Schema
// =============================================

const warrantySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
  description: z.string().optional(),
  spec_section: z.string().optional(),
  subcontractor_id: z.string().optional(),
  manufacturer_name: z.string().optional(),
  manufacturer_contact: z.string().optional(),
  manufacturer_phone: z.string().optional(),
  manufacturer_email: z.string().email('Invalid email').optional().or(z.literal('')),
  warranty_type: z.string().optional(),
  coverage_description: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  duration_years: z.number().min(0).max(100).optional(),
  notification_days: z.string().optional(), // Comma-separated list of days
  notes: z.string().optional(),
})

type WarrantyFormValues = z.infer<typeof warrantySchema>

// =============================================
// Component Props
// =============================================

interface WarrantyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  warranty?: WarrantyWithDetails | null
  projectId: string
  subcontractors?: Array<{ id: string; company_name: string }>
  onSubmit: (data: CreateWarrantyDTO | UpdateWarrantyDTO) => Promise<void>
  isLoading?: boolean
}

// =============================================
// Component
// =============================================

export function WarrantyFormDialog({
  open,
  onOpenChange,
  warranty,
  projectId,
  subcontractors = [],
  onSubmit,
  isLoading = false,
}: WarrantyFormDialogProps) {
  const isEditing = !!warranty

  // Parse notification days from array to comma-separated string
  const notificationDaysToString = (days: number[] | undefined): string => {
    if (!days || days.length === 0) {return '30, 60, 90'}
    return days.join(', ')
  }

  // Parse comma-separated string to array of numbers
  const stringToNotificationDays = (str: string | undefined): number[] => {
    if (!str) {return [30, 60, 90]}
    return str
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0)
  }

  // Calculate duration in years between dates
  const calculateDurationYears = (start: string, end: string): number | undefined => {
    if (!start || !end) {return undefined}
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25)
    return Math.round(diffYears * 10) / 10 // Round to 1 decimal
  }

  const form = useForm<WarrantyFormValues>({
    resolver: zodResolver(warrantySchema),
    defaultValues: {
      title: warranty?.title || '',
      description: warranty?.description || '',
      spec_section: warranty?.spec_section || '',
      subcontractor_id: warranty?.subcontractor_id || '',
      manufacturer_name: warranty?.manufacturer_name || '',
      manufacturer_contact: warranty?.manufacturer_contact || '',
      manufacturer_phone: warranty?.manufacturer_phone || '',
      manufacturer_email: warranty?.manufacturer_email || '',
      warranty_type: warranty?.warranty_type || '',
      coverage_description: warranty?.coverage_description || '',
      start_date: warranty?.start_date?.split('T')[0] || '',
      end_date: warranty?.end_date?.split('T')[0] || '',
      duration_years: warranty?.duration_years || undefined,
      notification_days: notificationDaysToString(warranty?.notification_days),
      notes: warranty?.notes || '',
    },
  })

  // Reset form when warranty changes
  React.useEffect(() => {
    if (open) {
      form.reset({
        title: warranty?.title || '',
        description: warranty?.description || '',
        spec_section: warranty?.spec_section || '',
        subcontractor_id: warranty?.subcontractor_id || '',
        manufacturer_name: warranty?.manufacturer_name || '',
        manufacturer_contact: warranty?.manufacturer_contact || '',
        manufacturer_phone: warranty?.manufacturer_phone || '',
        manufacturer_email: warranty?.manufacturer_email || '',
        warranty_type: warranty?.warranty_type || '',
        coverage_description: warranty?.coverage_description || '',
        start_date: warranty?.start_date?.split('T')[0] || '',
        end_date: warranty?.end_date?.split('T')[0] || '',
        duration_years: warranty?.duration_years || undefined,
        notification_days: notificationDaysToString(warranty?.notification_days),
        notes: warranty?.notes || '',
      })
    }
  }, [open, warranty, form])

  // Auto-calculate duration when dates change
  const startDate = form.watch('start_date')
  const endDate = form.watch('end_date')

  React.useEffect(() => {
    if (startDate && endDate) {
      const years = calculateDurationYears(startDate, endDate)
      if (years !== undefined && years > 0) {
        form.setValue('duration_years', years)
      }
    }
  }, [startDate, endDate, form])

  const handleSubmit = async (values: WarrantyFormValues) => {
    const notificationDays = stringToNotificationDays(values.notification_days)

    if (isEditing) {
      const updateData: UpdateWarrantyDTO = {
        title: values.title,
        description: values.description || undefined,
        manufacturer_name: values.manufacturer_name || undefined,
        manufacturer_contact: values.manufacturer_contact || undefined,
        manufacturer_phone: values.manufacturer_phone || undefined,
        manufacturer_email: values.manufacturer_email || undefined,
        warranty_type: (values.warranty_type as WarrantyType) || undefined,
        coverage_description: values.coverage_description || undefined,
        start_date: values.start_date,
        end_date: values.end_date,
        notification_days: notificationDays.length > 0 ? notificationDays : undefined,
        notes: values.notes || undefined,
      }
      await onSubmit(updateData)
    } else {
      const createData: CreateWarrantyDTO = {
        project_id: projectId,
        title: values.title,
        description: values.description || undefined,
        spec_section: values.spec_section || undefined,
        subcontractor_id: values.subcontractor_id || undefined,
        manufacturer_name: values.manufacturer_name || undefined,
        manufacturer_contact: values.manufacturer_contact || undefined,
        manufacturer_phone: values.manufacturer_phone || undefined,
        manufacturer_email: values.manufacturer_email || undefined,
        warranty_type: (values.warranty_type as WarrantyType) || undefined,
        coverage_description: values.coverage_description || undefined,
        start_date: values.start_date,
        end_date: values.end_date,
        duration_years: values.duration_years,
        notification_days: notificationDays.length > 0 ? notificationDays : undefined,
        notes: values.notes || undefined,
      }
      await onSubmit(createData)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditing ? 'Edit Warranty' : 'Add Warranty'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the warranty details below.'
              : 'Add a new warranty to track for this project.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...form.register('title')}
              placeholder="e.g., HVAC Rooftop Unit Warranty"
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
              placeholder="Brief description of what this warranty covers..."
              rows={2}
            />
          </div>

          {/* Warranty Type & Spec Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="warranty_type">Warranty Type</Label>
              <Select
                value={form.watch('warranty_type') || ''}
                onValueChange={(value) => form.setValue('warranty_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- None --</SelectItem>
                  {WARRANTY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spec_section" className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                Spec Section
              </Label>
              <Input
                id="spec_section"
                {...form.register('spec_section')}
                placeholder="e.g., 23 74 00"
              />
            </div>
          </div>

          {/* Subcontractor */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="subcontractor_id" className="flex items-center gap-1">
                <Building className="h-3.5 w-3.5" />
                Subcontractor
              </Label>
              <Select
                value={form.watch('subcontractor_id') || ''}
                onValueChange={(value) => form.setValue('subcontractor_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcontractor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- None --</SelectItem>
                  {subcontractors.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Manufacturer Information */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-secondary heading-card">Manufacturer Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer_name" className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5" />
                  Company Name
                </Label>
                <Input
                  id="manufacturer_name"
                  {...form.register('manufacturer_name')}
                  placeholder="e.g., Carrier Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer_contact" className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Contact Name
                </Label>
                <Input
                  id="manufacturer_contact"
                  {...form.register('manufacturer_contact')}
                  placeholder="e.g., John Smith"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manufacturer_phone" className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </Label>
                <Input
                  id="manufacturer_phone"
                  {...form.register('manufacturer_phone')}
                  placeholder="e.g., (800) 555-1234"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer_email" className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </Label>
                <Input
                  id="manufacturer_email"
                  type="email"
                  {...form.register('manufacturer_email')}
                  placeholder="e.g., support@carrier.com"
                />
                {form.formState.errors.manufacturer_email && (
                  <p className="text-sm text-error">
                    {form.formState.errors.manufacturer_email.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Coverage Description */}
          <div className="space-y-2">
            <Label htmlFor="coverage_description">Coverage Description</Label>
            <Textarea
              id="coverage_description"
              {...form.register('coverage_description')}
              placeholder="Describe what is covered under this warranty..."
              rows={3}
            />
          </div>

          {/* Warranty Period */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-secondary flex items-center gap-1 heading-card">
              <Calendar className="h-4 w-4" />
              Warranty Period *
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input id="start_date" type="date" {...form.register('start_date')} />
                {form.formState.errors.start_date && (
                  <p className="text-sm text-error">
                    {form.formState.errors.start_date.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input id="end_date" type="date" {...form.register('end_date')} />
                {form.formState.errors.end_date && (
                  <p className="text-sm text-error">{form.formState.errors.end_date.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_years">Duration (Years)</Label>
                <Input
                  id="duration_years"
                  type="number"
                  step="0.1"
                  {...form.register('duration_years', { valueAsNumber: true })}
                  placeholder="Auto-calculated"
                  className="bg-surface"
                />
              </div>
            </div>
          </div>

          {/* Notification Days */}
          <div className="space-y-2">
            <Label htmlFor="notification_days">Expiration Notification Days</Label>
            <Input
              id="notification_days"
              {...form.register('notification_days')}
              placeholder="30, 60, 90"
            />
            <p className="text-xs text-muted">
              Comma-separated list of days before expiration to send notifications
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...form.register('notes')}
              placeholder="Additional notes or special conditions..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Warranty' : 'Add Warranty'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
