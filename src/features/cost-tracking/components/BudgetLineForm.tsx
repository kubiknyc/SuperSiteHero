/**
 * Budget Line Form Component
 * Create/edit project budget entries
 */

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CostCodePicker } from './CostCodePicker'
import type { ProjectBudgetWithDetails, CreateProjectBudgetDTO, UpdateProjectBudgetDTO, CostCode } from '@/types/cost-tracking'

interface BudgetLineFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateProjectBudgetDTO | UpdateProjectBudgetDTO) => void
  budget?: ProjectBudgetWithDetails | null
  projectId: string
  companyId: string
  isSubmitting?: boolean
}

export function BudgetLineForm({
  open,
  onClose,
  onSubmit,
  budget,
  projectId,
  companyId,
  isSubmitting = false,
}: BudgetLineFormProps) {
  const [formData, setFormData] = useState({
    cost_code_id: '',
    original_budget: '',
    approved_changes: '',
    committed_cost: '',
    actual_cost: '',
    estimated_cost_at_completion: '',
    notes: '',
  })
  const [selectedCostCode, setSelectedCostCode] = useState<CostCode | null>(null)

  const isEditing = !!budget

  // Initialize form with budget data
  useEffect(() => {
    if (budget) {
      setFormData({
        cost_code_id: budget.cost_code_id,
        original_budget: budget.original_budget.toString(),
        approved_changes: budget.approved_changes.toString(),
        committed_cost: budget.committed_cost.toString(),
        actual_cost: budget.actual_cost.toString(),
        estimated_cost_at_completion: budget.estimated_cost_at_completion?.toString() || '',
        notes: budget.notes || '',
      })
    } else {
      setFormData({
        cost_code_id: '',
        original_budget: '',
        approved_changes: '0',
        committed_cost: '0',
        actual_cost: '0',
        estimated_cost_at_completion: '',
        notes: '',
      })
      setSelectedCostCode(null)
    }
  }, [budget, open])

  const handleCostCodeChange = (costCodeId: string, costCode: CostCode) => {
    setFormData(prev => ({ ...prev, cost_code_id: costCodeId }))
    setSelectedCostCode(costCode)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const parseNumber = (val: string) => {
      const num = parseFloat(val.replace(/[^0-9.-]/g, ''))
      return isNaN(num) ? 0 : num
    }

    if (isEditing) {
      const updateData: UpdateProjectBudgetDTO = {
        original_budget: parseNumber(formData.original_budget),
        approved_changes: parseNumber(formData.approved_changes),
        committed_cost: parseNumber(formData.committed_cost),
        actual_cost: parseNumber(formData.actual_cost),
        estimated_cost_at_completion: formData.estimated_cost_at_completion
          ? parseNumber(formData.estimated_cost_at_completion)
          : undefined,
        notes: formData.notes || undefined,
      }
      onSubmit(updateData)
    } else {
      const createData: CreateProjectBudgetDTO = {
        project_id: projectId,
        cost_code_id: formData.cost_code_id,
        original_budget: parseNumber(formData.original_budget),
        approved_changes: parseNumber(formData.approved_changes),
        committed_cost: parseNumber(formData.committed_cost),
        actual_cost: parseNumber(formData.actual_cost),
        estimated_cost_at_completion: formData.estimated_cost_at_completion
          ? parseNumber(formData.estimated_cost_at_completion)
          : undefined,
        notes: formData.notes || undefined,
      }
      onSubmit(createData)
    }
  }

  const isValid = isEditing
    ? formData.original_budget !== ''
    : formData.cost_code_id && formData.original_budget !== ''

  // Calculate derived values
  const originalBudget = parseFloat(formData.original_budget.replace(/[^0-9.-]/g, '')) || 0
  const approvedChanges = parseFloat(formData.approved_changes.replace(/[^0-9.-]/g, '')) || 0
  const revisedBudget = originalBudget + approvedChanges
  const actualCost = parseFloat(formData.actual_cost.replace(/[^0-9.-]/g, '')) || 0
  const variance = revisedBudget - actualCost

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Budget Line' : 'Add Budget Line'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cost Code Picker */}
          <div className="space-y-2">
            <Label htmlFor="cost_code">Cost Code *</Label>
            {isEditing ? (
              <div className="p-3 bg-gray-50 rounded-md">
                <span className="font-mono text-sm">{budget?.cost_code}</span>
                <span className="text-gray-500 ml-2">{budget?.cost_code_name}</span>
              </div>
            ) : (
              <CostCodePicker
                companyId={companyId}
                value={formData.cost_code_id}
                onChange={handleCostCodeChange}
                placeholder="Select a cost code..."
              />
            )}
          </div>

          {/* Original Budget */}
          <div className="space-y-2">
            <Label htmlFor="original_budget">Original Budget *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="original_budget"
                type="text"
                value={formData.original_budget}
                onChange={(e) => handleInputChange('original_budget', e.target.value)}
                placeholder="0"
                className="pl-7 font-mono"
              />
            </div>
          </div>

          {/* Approved Changes */}
          <div className="space-y-2">
            <Label htmlFor="approved_changes">Approved Changes (COs)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="approved_changes"
                type="text"
                value={formData.approved_changes}
                onChange={(e) => handleInputChange('approved_changes', e.target.value)}
                placeholder="0"
                className="pl-7 font-mono"
              />
            </div>
            <p className="text-xs text-gray-500">Positive for additions, negative for deductions</p>
          </div>

          {/* Revised Budget (Calculated) */}
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Revised Budget</span>
              <span className="font-mono font-medium">
                ${revisedBudget.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Committed Cost */}
          <div className="space-y-2">
            <Label htmlFor="committed_cost">Committed Cost</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="committed_cost"
                type="text"
                value={formData.committed_cost}
                onChange={(e) => handleInputChange('committed_cost', e.target.value)}
                placeholder="0"
                className="pl-7 font-mono"
              />
            </div>
            <p className="text-xs text-gray-500">Contracts and POs issued</p>
          </div>

          {/* Actual Cost */}
          <div className="space-y-2">
            <Label htmlFor="actual_cost">Actual Cost</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="actual_cost"
                type="text"
                value={formData.actual_cost}
                onChange={(e) => handleInputChange('actual_cost', e.target.value)}
                placeholder="0"
                className="pl-7 font-mono"
              />
            </div>
          </div>

          {/* Variance (Calculated) */}
          <div className={`p-3 rounded-md ${variance < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Variance</span>
              <span className={`font-mono font-medium ${variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {variance < 0 ? '-' : '+'}${Math.abs(variance).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Estimated Cost at Completion */}
          <div className="space-y-2">
            <Label htmlFor="estimated_cost_at_completion">Estimated Cost at Completion</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="estimated_cost_at_completion"
                type="text"
                value={formData.estimated_cost_at_completion}
                onChange={(e) => handleInputChange('estimated_cost_at_completion', e.target.value)}
                placeholder="Optional"
                className="pl-7 font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
