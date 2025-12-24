/**
 * Maintenance Schedule Dialog Component
 * Phase 5.2: Equipment Maintenance Alerts
 *
 * Dialog for creating and editing maintenance schedules for equipment
 */

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Wrench,
  Clock,
  Calendar,
  AlertTriangle,
  Bell,
  Save,
  Loader2,
  Ban,
} from 'lucide-react'
import {
  useCreateMaintenanceSchedule,
  useUpdateMaintenanceSchedule,
} from '../hooks/useEquipmentMaintenanceSchedule'
import type {
  EquipmentMaintenanceSchedule,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
} from '@/types/workflow-automation'
import type { Equipment } from '@/types/equipment'
import { cn } from '@/lib/utils'

// =============================================================================
// CONSTANTS
// =============================================================================

const MAINTENANCE_TYPES = [
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'filter_replacement', label: 'Filter Replacement' },
  { value: 'tire_inspection', label: 'Tire/Track Inspection' },
  { value: 'brake_inspection', label: 'Brake Inspection' },
  { value: 'hydraulic_service', label: 'Hydraulic Service' },
  { value: 'engine_service', label: 'Engine Service' },
  { value: 'transmission_service', label: 'Transmission Service' },
  { value: 'safety_inspection', label: 'Safety Inspection' },
  { value: 'annual_inspection', label: 'Annual Inspection' },
  { value: 'certification_renewal', label: 'Certification Renewal' },
  { value: 'insurance_renewal', label: 'Insurance Renewal' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'custom', label: 'Custom' },
]

// =============================================================================
// FORM SCHEMA
// =============================================================================

const scheduleFormSchema = z
  .object({
    maintenance_type: z.string().min(1, 'Maintenance type is required'),
    custom_type: z.string().optional(),
    description: z.string().optional(),
    frequency_type: z.enum(['hours', 'days', 'both']),
    frequency_hours: z.coerce.number().positive().optional().nullable(),
    frequency_days: z.coerce.number().positive().optional().nullable(),
    warning_threshold_hours: z.coerce.number().min(0).default(50),
    warning_threshold_days: z.coerce.number().min(0).default(7),
    block_usage_when_overdue: z.boolean().default(false),
    service_provider: z.string().optional(),
    notify_on_due: z.boolean().default(true),
    notify_on_overdue: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.frequency_type === 'hours' || data.frequency_type === 'both') {
        return data.frequency_hours && data.frequency_hours > 0
      }
      return true
    },
    { message: 'Hours frequency is required', path: ['frequency_hours'] }
  )
  .refine(
    (data) => {
      if (data.frequency_type === 'days' || data.frequency_type === 'both') {
        return data.frequency_days && data.frequency_days > 0
      }
      return true
    },
    { message: 'Days frequency is required', path: ['frequency_days'] }
  )

type ScheduleFormData = z.infer<typeof scheduleFormSchema>

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface MaintenanceScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment: Equipment
  schedule?: EquipmentMaintenanceSchedule | null
  onSuccess?: () => void
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MaintenanceScheduleDialog({
  open,
  onOpenChange,
  equipment,
  schedule,
  onSuccess,
}: MaintenanceScheduleDialogProps) {
  const isEditing = !!schedule
  const createSchedule = useCreateMaintenanceSchedule()
  const updateSchedule = useUpdateMaintenanceSchedule()

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      maintenance_type: '',
      custom_type: '',
      description: '',
      frequency_type: 'hours',
      frequency_hours: null,
      frequency_days: null,
      warning_threshold_hours: 50,
      warning_threshold_days: 7,
      block_usage_when_overdue: false,
      service_provider: '',
      notify_on_due: true,
      notify_on_overdue: true,
    },
  })

  // Reset form when schedule changes
  useEffect(() => {
    if (schedule) {
      const maintenanceType = MAINTENANCE_TYPES.find(
        (t) => t.value === schedule.maintenance_type
      )
        ? schedule.maintenance_type
        : 'custom'

      let frequencyType: 'hours' | 'days' | 'both' = 'hours'
      if (schedule.frequency_hours && schedule.frequency_days) {
        frequencyType = 'both'
      } else if (schedule.frequency_days) {
        frequencyType = 'days'
      }

      form.reset({
        maintenance_type: maintenanceType,
        custom_type:
          maintenanceType === 'custom' ? schedule.maintenance_type : '',
        description: schedule.description || '',
        frequency_type: frequencyType,
        frequency_hours: schedule.frequency_hours,
        frequency_days: schedule.frequency_days,
        warning_threshold_hours: schedule.warning_threshold_hours,
        warning_threshold_days: schedule.warning_threshold_days,
        block_usage_when_overdue: schedule.block_usage_when_overdue,
        service_provider: schedule.service_provider || '',
        notify_on_due: schedule.notify_on_due,
        notify_on_overdue: schedule.notify_on_overdue,
      })
    } else {
      form.reset({
        maintenance_type: '',
        custom_type: '',
        description: '',
        frequency_type: 'hours',
        frequency_hours: null,
        frequency_days: null,
        warning_threshold_hours: 50,
        warning_threshold_days: 7,
        block_usage_when_overdue: false,
        service_provider: '',
        notify_on_due: true,
        notify_on_overdue: true,
      })
    }
  }, [schedule, form])

  const watchMaintenanceType = form.watch('maintenance_type')
  const watchFrequencyType = form.watch('frequency_type')
  const watchBlockUsage = form.watch('block_usage_when_overdue')

  const handleSubmit = async (data: ScheduleFormData) => {
    const maintenanceType =
      data.maintenance_type === 'custom' && data.custom_type
        ? data.custom_type
        : data.maintenance_type

    if (isEditing && schedule) {
      const updates: UpdateMaintenanceScheduleInput = {
        maintenance_type: maintenanceType,
        description: data.description || undefined,
        frequency_hours:
          data.frequency_type === 'hours' || data.frequency_type === 'both'
            ? data.frequency_hours ?? undefined
            : undefined,
        frequency_days:
          data.frequency_type === 'days' || data.frequency_type === 'both'
            ? data.frequency_days ?? undefined
            : undefined,
        warning_threshold_hours: data.warning_threshold_hours,
        warning_threshold_days: data.warning_threshold_days,
        block_usage_when_overdue: data.block_usage_when_overdue,
        service_provider: data.service_provider || undefined,
        notify_on_due: data.notify_on_due,
        notify_on_overdue: data.notify_on_overdue,
      }

      await updateSchedule.mutateAsync({ id: schedule.id, updates })
    } else {
      const input: CreateMaintenanceScheduleInput = {
        equipment_id: equipment.id,
        maintenance_type: maintenanceType,
        description: data.description || undefined,
        frequency_hours:
          data.frequency_type === 'hours' || data.frequency_type === 'both'
            ? data.frequency_hours ?? undefined
            : undefined,
        frequency_days:
          data.frequency_type === 'days' || data.frequency_type === 'both'
            ? data.frequency_days ?? undefined
            : undefined,
        warning_threshold_hours: data.warning_threshold_hours,
        warning_threshold_days: data.warning_threshold_days,
        block_usage_when_overdue: data.block_usage_when_overdue,
        service_provider: data.service_provider || undefined,
        notify_on_due: data.notify_on_due,
        notify_on_overdue: data.notify_on_overdue,
      }

      await createSchedule.mutateAsync(input)
    }

    onOpenChange(false)
    onSuccess?.()
  }

  const isSubmitting = createSchedule.isPending || updateSchedule.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {isEditing ? 'Edit Maintenance Schedule' : 'Create Maintenance Schedule'}
          </DialogTitle>
          <DialogDescription>
            {equipment.equipment_number} - {equipment.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Maintenance Type */}
            <FormField
              control={form.control}
              name="maintenance_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Type *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MAINTENANCE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Type Name */}
            {watchMaintenanceType === 'custom' && (
              <FormField
                control={form.control}
                name="custom_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Type Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Belt Replacement" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this maintenance..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequency Type */}
            <FormField
              control={form.control}
              name="frequency_type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Schedule Based On *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-wrap gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="hours" id="hours" />
                        <Label
                          htmlFor="hours"
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="h-4 w-4" />
                          Operating Hours
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="days" id="days" />
                        <Label
                          htmlFor="days"
                          className="flex items-center gap-1 cursor-pointer"
                        >
                          <Calendar className="h-4 w-4" />
                          Calendar Days
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="both" />
                        <Label htmlFor="both" className="cursor-pointer">
                          Both (whichever comes first)
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequency Inputs */}
            <div className="grid grid-cols-2 gap-4">
              {(watchFrequencyType === 'hours' ||
                watchFrequencyType === 'both') && (
                <FormField
                  control={form.control}
                  name="frequency_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Every (hours) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 250"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        Current: {equipment.current_hours?.toFixed(1) || 0} hrs
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(watchFrequencyType === 'days' ||
                watchFrequencyType === 'both') && (
                <FormField
                  control={form.control}
                  name="frequency_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Every (days) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 90"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        {watchFrequencyType === 'days'
                          ? 'Days between maintenance'
                          : 'Or days, whichever first'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Warning Thresholds */}
            <div className="p-4 bg-warning-light rounded-lg border border-yellow-200 space-y-4">
              <div className="flex items-center gap-2 text-yellow-800 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Warning Thresholds
              </div>

              <div className="grid grid-cols-2 gap-4">
                {(watchFrequencyType === 'hours' ||
                  watchFrequencyType === 'both') && (
                  <FormField
                    control={form.control}
                    name="warning_threshold_hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          Warn before (hours)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {(watchFrequencyType === 'days' ||
                  watchFrequencyType === 'both') && (
                  <FormField
                    control={form.control}
                    name="warning_threshold_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">
                          Warn before (days)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Block Usage Option */}
            <FormField
              control={form.control}
              name="block_usage_when_overdue"
              render={({ field }) => (
                <FormItem
                  className={cn(
                    'flex items-start space-x-3 space-y-0 rounded-lg border p-4',
                    field.value ? 'border-red-200 bg-error-light' : ''
                  )}
                >
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                      <Ban className="h-4 w-4" />
                      Block equipment usage when overdue
                    </FormLabel>
                    <FormDescription>
                      Prevents assignment of equipment until maintenance is
                      completed
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {watchBlockUsage && (
              <div className="p-3 bg-error-light border border-red-200 rounded-lg text-sm text-error-dark">
                <strong>Warning:</strong> When enabled, this equipment cannot be
                assigned to daily reports or scheduled work if this maintenance
                becomes overdue.
              </div>
            )}

            {/* Service Provider */}
            <FormField
              control={form.control}
              name="service_provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Service Provider</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Company or technician name"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Who typically performs this maintenance
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notification Settings */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </Label>

              <FormField
                control={form.control}
                name="notify_on_due"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Notify when maintenance is due
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notify_on_overdue"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Notify when maintenance is overdue
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update Schedule' : 'Create Schedule'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default MaintenanceScheduleDialog
