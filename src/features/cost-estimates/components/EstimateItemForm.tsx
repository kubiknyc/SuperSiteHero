// File: /src/features/cost-estimates/components/EstimateItemForm.tsx
// Form for adding and editing estimate line items

import { useForm } from 'react-hook-form'
import {
  Button,
  Input,
  Label,
  Textarea,
  RadixSelect as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui'
import type { CostEstimateItem, CostEstimateItemInsert, CostEstimateItemUpdate } from '@/types/database-extensions'

interface EstimateItemFormProps {
  estimateId: string
  item?: CostEstimateItem
  onSubmit: (data: CostEstimateItemInsert | CostEstimateItemUpdate) => void
  onCancel: () => void
  isOpen: boolean
  isSubmitting?: boolean
  defaultLaborRate?: number
}

interface FormData {
  name: string
  measurement_type: string
  quantity: number
  unit_cost: number
  labor_hours: number
  labor_rate: number
  notes: string
}

const MEASUREMENT_TYPES = [
  'linear_feet',
  'square_feet',
  'cubic_yards',
  'each',
  'ton',
  'pound',
  'gallon',
  'hour',
  'day',
  'other',
]

export function EstimateItemForm({
  estimateId,
  item,
  onSubmit,
  onCancel,
  isOpen,
  isSubmitting = false,
  defaultLaborRate = 0,
}: EstimateItemFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: {
      name: item?.name || '',
      measurement_type: item?.measurement_type || 'square_feet',
      quantity: item?.quantity ? Number(item.quantity) : 0,
      unit_cost: item?.unit_cost ? Number(item.unit_cost) : 0,
      labor_hours: item?.labor_hours ? Number(item.labor_hours) : 0,
      labor_rate: item?.labor_rate ? Number(item.labor_rate) : defaultLaborRate,
      notes: item?.notes || '',
    },
  })

  const quantity = watch('quantity')
  const unitCost = watch('unit_cost')
  const laborHours = watch('labor_hours')
  const laborRate = watch('labor_rate')
  const measurementType = watch('measurement_type')

  // Calculate costs in real-time
  const materialCost = quantity * unitCost
  const laborCost = laborHours * laborRate
  const totalCost = materialCost + laborCost

  const onFormSubmit = (data: FormData) => {
    const materialCost = data.quantity * data.unit_cost
    const laborCost = data.labor_hours * data.labor_rate
    const totalCost = materialCost + laborCost

    if (item) {
      // Update existing item
      onSubmit({
        name: data.name,
        measurement_type: data.measurement_type,
        quantity: data.quantity,
        unit_cost: data.unit_cost,
        labor_hours: data.labor_hours,
        labor_rate: data.labor_rate,
        material_cost: materialCost,
        labor_cost: laborCost,
        total_cost: totalCost,
        notes: data.notes || null,
      })
    } else {
      // Create new item - need takeoff_item_id, will be set by calling component
      onSubmit({
        estimate_id: estimateId,
        takeoff_item_id: '', // Must be provided by calling component
        name: data.name,
        measurement_type: data.measurement_type,
        quantity: data.quantity,
        unit_cost: data.unit_cost,
        labor_hours: data.labor_hours,
        labor_rate: data.labor_rate,
        material_cost: materialCost,
        labor_cost: laborCost,
        total_cost: totalCost,
        notes: data.notes || null,
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Line Item' : 'Add Line Item'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Item Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              {...register('name', { required: 'Item name is required' })}
              placeholder="e.g., Concrete Flooring"
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          {/* Measurement Type */}
          <div className="space-y-2">
            <Label htmlFor="measurement_type">Measurement Type *</Label>
            <Select
              value={measurementType}
              onValueChange={(value: string) => setValue('measurement_type', value)}
            >
              <SelectTrigger id="measurement_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEASUREMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity and Unit Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                {...register('quantity', {
                  valueAsNumber: true,
                  required: 'Quantity is required',
                  min: { value: 0, message: 'Quantity must be positive' },
                })}
                placeholder="0.00"
              />
              {errors.quantity && (
                <p className="text-sm text-error">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost ($) *</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                {...register('unit_cost', {
                  valueAsNumber: true,
                  required: 'Unit cost is required',
                  min: { value: 0, message: 'Unit cost must be positive' },
                })}
                placeholder="0.00"
              />
              {errors.unit_cost && (
                <p className="text-sm text-error">{errors.unit_cost.message}</p>
              )}
            </div>
          </div>

          {/* Labor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labor_hours">Labor Hours</Label>
              <Input
                id="labor_hours"
                type="number"
                step="0.01"
                min="0"
                {...register('labor_hours', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Labor hours must be positive' },
                })}
                placeholder="0.00"
              />
              {errors.labor_hours && (
                <p className="text-sm text-error">{errors.labor_hours.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="labor_rate">Labor Rate ($/hour)</Label>
              <Input
                id="labor_rate"
                type="number"
                step="0.01"
                min="0"
                {...register('labor_rate', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Labor rate must be positive' },
                })}
                placeholder="0.00"
              />
              {errors.labor_rate && (
                <p className="text-sm text-error">{errors.labor_rate.message}</p>
              )}
            </div>
          </div>

          {/* Cost Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Material Cost:</span>
              <span className="font-semibold">
                ${materialCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Labor Cost:</span>
              <span className="font-semibold">
                ${laborCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Total Cost:</span>
              <span>${totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Optional notes about this item"
              rows={3}
            />
          </div>

          {/* Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
