// File: /src/features/punch-lists/components/BackChargeFormDialog.tsx
// Dialog for creating/editing punch item back-charges

import * as React from 'react'
import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/lib/notifications/ToastContext'
import { useCreateBackCharge, useUpdateBackCharge } from '../hooks/usePunchListBackCharges'
import {
  type PunchItemBackCharge,
  type CreateBackChargeDTO,
  type UpdateBackChargeDTO,
  BackChargeReason,
  BACK_CHARGE_REASONS,
} from '@/types/punch-list-back-charge'
import { DollarSign, AlertCircle, Calculator } from 'lucide-react'

interface BackChargeFormDialogProps {
  punchItemId: string
  projectId: string
  subcontractorId?: string | null
  subcontractorName?: string | null
  existingBackCharge?: PunchItemBackCharge | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function BackChargeFormDialog({
  punchItemId,
  projectId,
  subcontractorId,
  subcontractorName,
  existingBackCharge,
  open,
  onOpenChange,
  onSuccess,
}: BackChargeFormDialogProps) {
  const { showToast } = useToast()
  const createMutation = useCreateBackCharge()
  const updateMutation = useUpdateBackCharge()

  const isEditing = !!existingBackCharge

  // Form state
  const [reason, setReason] = useState<BackChargeReason>(BackChargeReason.SUBSTANDARD_WORK)
  const [reasonOther, setReasonOther] = useState('')
  const [description, setDescription] = useState('')
  const [laborHours, setLaborHours] = useState(0)
  const [laborRate, setLaborRate] = useState(75)
  const [materialAmount, setMaterialAmount] = useState(0)
  const [equipmentAmount, setEquipmentAmount] = useState(0)
  const [subcontractAmount, setSubcontractAmount] = useState(0)
  const [otherAmount, setOtherAmount] = useState(0)
  const [markupPercent, setMarkupPercent] = useState(15)

  // Calculated values
  const laborAmount = laborHours * laborRate
  const subtotal = laborAmount + materialAmount + equipmentAmount + subcontractAmount + otherAmount
  const markupAmount = subtotal * (markupPercent / 100)
  const totalAmount = subtotal + markupAmount

  // Load existing back-charge data when editing
  useEffect(() => {
    if (existingBackCharge && open) {
      setReason(existingBackCharge.reason as BackChargeReason)
      setReasonOther(existingBackCharge.reason_other || '')
      setDescription(existingBackCharge.description || '')
      setLaborHours(existingBackCharge.labor_hours || 0)
      setLaborRate(existingBackCharge.labor_rate || 75)
      setMaterialAmount(existingBackCharge.material_amount || 0)
      setEquipmentAmount(existingBackCharge.equipment_amount || 0)
      setSubcontractAmount(existingBackCharge.subcontract_amount || 0)
      setOtherAmount(existingBackCharge.other_amount || 0)
      setMarkupPercent(existingBackCharge.markup_percent || 15)
    } else if (!existingBackCharge && open) {
      // Reset form for new back-charge
      setReason(BackChargeReason.SUBSTANDARD_WORK)
      setReasonOther('')
      setDescription('')
      setLaborHours(0)
      setLaborRate(75)
      setMaterialAmount(0)
      setEquipmentAmount(0)
      setSubcontractAmount(0)
      setOtherAmount(0)
      setMarkupPercent(15)
    }
  }, [existingBackCharge, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      showToast('error', 'Description is required')
      return
    }

    if (reason === BackChargeReason.OTHER && !reasonOther.trim()) {
      showToast('error', 'Please specify the reason')
      return
    }

    if (totalAmount <= 0) {
      showToast('error', 'Total amount must be greater than zero')
      return
    }

    try {
      if (isEditing && existingBackCharge) {
        const updateData: UpdateBackChargeDTO = {
          reason,
          reason_other: reason === BackChargeReason.OTHER ? reasonOther : null,
          description,
          labor_hours: laborHours,
          labor_rate: laborRate,
          material_amount: materialAmount,
          equipment_amount: equipmentAmount,
          subcontract_amount: subcontractAmount,
          other_amount: otherAmount,
          markup_percent: markupPercent,
        }
        await updateMutation.mutateAsync({
          id: existingBackCharge.id,
          data: updateData,
        })
        showToast('success', 'Back-charge updated successfully')
      } else {
        const createData: CreateBackChargeDTO = {
          punch_item_id: punchItemId,
          project_id: projectId,
          subcontractor_id: subcontractorId || null,
          subcontractor_name: subcontractorName || null,
          reason,
          reason_other: reason === BackChargeReason.OTHER ? reasonOther : null,
          description,
          labor_hours: laborHours,
          labor_rate: laborRate,
          material_amount: materialAmount,
          equipment_amount: equipmentAmount,
          subcontract_amount: subcontractAmount,
          other_amount: otherAmount,
          markup_percent: markupPercent,
        }
        await createMutation.mutateAsync(createData)
        showToast('success', 'Back-charge created successfully')
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      showToast('error', `Failed to ${isEditing ? 'update' : 'create'} back-charge`)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-500" />
            {isEditing ? 'Edit Back-Charge' : 'Create Back-Charge'}
          </DialogTitle>
          <DialogDescription>
            Document costs to be charged back to the responsible party.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Responsible Party */}
          {subcontractorName && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <Label className="text-sm text-muted-foreground">Responsible Subcontractor</Label>
              <p className="text-lg font-medium">{subcontractorName}</p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Back-Charge *</Label>
            <Select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as BackChargeReason)}
            >
              {BACK_CHARGE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            {reason === BackChargeReason.OTHER && (
              <Input
                placeholder="Specify reason..."
                value={reasonOther}
                onChange={(e) => setReasonOther(e.target.value)}
                className="mt-2"
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue and work required..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Cost Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Cost Breakdown</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Labor */}
              <div className="space-y-2">
                <Label htmlFor="laborHours">Labor Hours</Label>
                <Input
                  id="laborHours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={laborHours}
                  onChange={(e) => setLaborHours(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="laborRate">Labor Rate ($/hr)</Label>
                <Input
                  id="laborRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={laborRate}
                  onChange={(e) => setLaborRate(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Material */}
              <div className="space-y-2">
                <Label htmlFor="materialAmount">Material ($)</Label>
                <Input
                  id="materialAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={materialAmount}
                  onChange={(e) => setMaterialAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              {/* Equipment */}
              <div className="space-y-2">
                <Label htmlFor="equipmentAmount">Equipment ($)</Label>
                <Input
                  id="equipmentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={equipmentAmount}
                  onChange={(e) => setEquipmentAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Subcontract */}
              <div className="space-y-2">
                <Label htmlFor="subcontractAmount">Subcontract ($)</Label>
                <Input
                  id="subcontractAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={subcontractAmount}
                  onChange={(e) => setSubcontractAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              {/* Other */}
              <div className="space-y-2">
                <Label htmlFor="otherAmount">Other ($)</Label>
                <Input
                  id="otherAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={otherAmount}
                  onChange={(e) => setOtherAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Markup */}
            <div className="space-y-2">
              <Label htmlFor="markupPercent">Markup (%)</Label>
              <Input
                id="markupPercent"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Labor ({laborHours} hrs × ${laborRate}/hr)</span>
              <span>${laborAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Markup ({markupPercent}%)</span>
              <span>+${markupAmount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-orange-600">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Warning */}
          {totalAmount > 5000 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Back-charges over $5,000 may require additional documentation and approval.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update Back-Charge' : 'Create Back-Charge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
