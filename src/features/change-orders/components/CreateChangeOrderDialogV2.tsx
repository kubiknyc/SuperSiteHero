// File: /src/features/change-orders/components/CreateChangeOrderDialogV2.tsx
// Dialog for creating a new change order - V2 (uses dedicated change_orders table)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useCreateChangeOrderV2 } from '../hooks/useChangeOrdersV2'
import { Plus, FileEdit, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CreateChangeOrderDTO, ChangeType, PricingMethod } from '@/types/change-order'

// Change type options
const CHANGE_TYPES: Array<{ value: ChangeType | string; label: string; description: string }> = [
  { value: 'scope_change', label: 'Scope Change', description: 'Addition or modification to contract scope' },
  { value: 'design_clarification', label: 'Design Clarification', description: 'Clarification of unclear design intent' },
  { value: 'unforeseen_condition', label: 'Unforeseen Condition', description: 'Discovery of site conditions not in contract' },
  { value: 'owner_request', label: 'Owner Request', description: 'Change requested by the owner' },
  { value: 'value_engineering', label: 'Value Engineering', description: 'Cost-saving alternative approach' },
  { value: 'error_omission', label: 'Error/Omission', description: 'Correction of design error or omission' },
]

// Pricing method options
const PRICING_METHODS: Array<{ value: PricingMethod | string; label: string }> = [
  { value: 'lump_sum', label: 'Lump Sum' },
  { value: 'time_materials', label: 'Time & Materials' },
  { value: 'unit_price', label: 'Unit Price' },
]

interface CreateChangeOrderDialogV2Props {
  projectId: string
  onSuccess?: (id: string) => void
  trigger?: React.ReactNode
}

export function CreateChangeOrderDialogV2({
  projectId,
  onSuccess,
  trigger,
}: CreateChangeOrderDialogV2Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [changeType, setChangeType] = useState<ChangeType | string>('scope_change')
  const [pricingMethod, setPricingMethod] = useState<PricingMethod | string>('lump_sum')
  const [proposedAmount, setProposedAmount] = useState('')
  const [proposedDays, setProposedDays] = useState('')
  const [justification, setJustification] = useState('')

  // Mutation
  const createChangeOrder = useCreateChangeOrderV2()

  // Reset form
  const resetForm = () => {
    setTitle('')
    setDescription('')
    setChangeType('scope_change')
    setPricingMethod('lump_sum')
    setProposedAmount('')
    setProposedDays('')
    setJustification('')
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {return}

    const dto: CreateChangeOrderDTO = {
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || undefined,
      change_type: changeType,
      pricing_method: pricingMethod,
      proposed_amount: proposedAmount ? parseFloat(proposedAmount) : 0,
      proposed_days: proposedDays ? parseInt(proposedDays) : 0,
      justification: justification.trim() || undefined,
    }

    try {
      const result = await createChangeOrder.mutateAsync(dto)
      resetForm()
      setOpen(false)

      if (onSuccess) {
        onSuccess(result.id)
      } else {
        // Navigate to the new change order detail page
        navigate(`/change-orders/${result.id}`)
      }
    } catch (error) {
      console.error('Failed to create change order:', error)
    }
  }

  // Get change type description
  const getChangeTypeDescription = (type: string) => {
    return CHANGE_TYPES.find((t) => t.value === type)?.description || ''
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Change Order
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-blue-600" />
            Create Potential Change Order (PCO)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the proposed change"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the change..."
              rows={3}
            />
          </div>

          {/* Change Type */}
          <div className="space-y-2">
            <Label htmlFor="change-type">Change Type *</Label>
            <Select
              id="change-type"
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
            >
              {CHANGE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500">{getChangeTypeDescription(changeType)}</p>
          </div>

          {/* Pricing Method */}
          <div className="space-y-2">
            <Label htmlFor="pricing-method">Pricing Method</Label>
            <Select
              id="pricing-method"
              value={pricingMethod}
              onChange={(e) => setPricingMethod(e.target.value)}
            >
              {PRICING_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Cost and Time Impact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="proposed-amount">Proposed Amount ($)</Label>
              <Input
                id="proposed-amount"
                type="number"
                step="0.01"
                min="0"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">Initial estimate (can be updated later)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposed-days">Time Impact (days)</Label>
              <Input
                id="proposed-days"
                type="number"
                min="0"
                value={proposedDays}
                onChange={(e) => setProposedDays(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-gray-500">Schedule impact in calendar days</p>
            </div>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label htmlFor="justification">Justification / Reason</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Why is this change necessary? Reference contract clauses, RFIs, etc."
              rows={3}
            />
          </div>

          {/* Info banner */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Creating a PCO</p>
                <p className="text-sm text-orange-700 mt-1">
                  This will create a Potential Change Order (PCO) in draft status. You can add
                  line items, attachments, and submit for approval from the detail page.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || createChangeOrder.isPending}>
              {createChangeOrder.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create PCO
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreateChangeOrderDialogV2
