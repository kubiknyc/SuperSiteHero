// File: /src/features/cost-estimates/components/CostEstimateForm.tsx
// Form for creating and editing cost estimates

import { useState } from 'react'
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import type { CostEstimate, CostEstimateInsert, CostEstimateUpdate } from '@/types/database-extensions'

interface CostEstimateFormProps {
  projectId: string
  estimate?: CostEstimate
  onSubmit: (data: CostEstimateInsert | CostEstimateUpdate) => void
  onCancel: () => void
  isSubmitting?: boolean
}

interface FormData {
  name: string
  description: string
  labor_rate: number
  markup_percentage: number
  status: 'draft' | 'approved' | 'invoiced' | 'archived'
}

export function CostEstimateForm({
  projectId,
  estimate,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CostEstimateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    defaultValues: {
      name: estimate?.name || '',
      description: estimate?.description || '',
      labor_rate: estimate?.labor_rate ? Number(estimate.labor_rate) : 0,
      markup_percentage: estimate?.markup_percentage ? Number(estimate.markup_percentage) : 0,
      status: estimate?.status || 'draft',
    },
  })

  const status = watch('status')

  const onFormSubmit = (data: FormData) => {
    if (estimate) {
      // Update existing estimate
      onSubmit({
        name: data.name,
        description: data.description || null,
        labor_rate: data.labor_rate,
        markup_percentage: data.markup_percentage,
        status: data.status,
      })
    } else {
      // Create new estimate
      onSubmit({
        project_id: projectId,
        name: data.name,
        description: data.description || null,
        labor_rate: data.labor_rate,
        markup_percentage: data.markup_percentage,
        status: data.status,
        created_by: '', // Will be set by the calling component with auth.uid()
        unit_costs: {}, // Empty by default, can be set later
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* Basic Information */}
        <div className="space-y-2">
          <Label htmlFor="name">Estimate Name *</Label>
          <Input
            id="name"
            {...register('name', { required: 'Name is required' })}
            placeholder="e.g., Q1 2024 Estimate"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Optional description of this estimate"
            rows={3}
          />
        </div>

        {/* Cost Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                  <p className="text-sm text-red-500">{errors.labor_rate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="markup_percentage">Markup (%)</Label>
                <Input
                  id="markup_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  {...register('markup_percentage', {
                    valueAsNumber: true,
                    min: { value: 0, message: 'Markup must be between 0 and 100' },
                    max: { value: 100, message: 'Markup must be between 0 and 100' },
                  })}
                  placeholder="0.00"
                />
                {errors.markup_percentage && (
                  <p className="text-sm text-red-500">{errors.markup_percentage.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={status}
            onValueChange={(value: string) => {
              const field = register('status')
              field.onChange({ target: { value, name: 'status' } })
            }}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="invoiced">Invoiced</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : estimate ? 'Update Estimate' : 'Create Estimate'}
        </Button>
      </div>
    </form>
  )
}
