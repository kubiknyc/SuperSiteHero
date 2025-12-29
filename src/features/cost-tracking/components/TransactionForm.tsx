/**
 * Transaction Form Component
 * Create/edit cost transactions
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Save, Loader2 } from 'lucide-react'
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
import {
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CostCodePicker } from './CostCodePicker'
import {
  TRANSACTION_TYPES,
  SOURCE_TYPES,
  type CostTransactionWithDetails,
  type CreateCostTransactionDTO,
  type UpdateCostTransactionDTO,
  type TransactionType,
  type SourceType,
  type CostCode,
} from '@/types/cost-tracking'

interface TransactionFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateCostTransactionDTO | UpdateCostTransactionDTO) => void
  transaction?: CostTransactionWithDetails | null
  projectId: string
  companyId: string
  isSubmitting?: boolean
}

export function TransactionForm({
  open,
  onClose,
  onSubmit,
  transaction,
  projectId,
  companyId,
  isSubmitting = false,
}: TransactionFormProps) {
  const [formData, setFormData] = useState({
    cost_code_id: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    transaction_type: 'actual' as TransactionType,
    source_type: '' as SourceType | '',
    amount: '',
    vendor_name: '',
    subcontractor_id: '',
    invoice_number: '',
    po_number: '',
    notes: '',
  })

  const isEditing = !!transaction

  // Initialize form with transaction data
  useEffect(() => {
    setTimeout(() => {
      if (transaction) {
        setFormData({
          cost_code_id: transaction.cost_code_id,
          transaction_date: transaction.transaction_date,
          description: transaction.description,
          transaction_type: transaction.transaction_type,
          source_type: transaction.source_type || '',
          amount: transaction.amount.toString(),
          vendor_name: transaction.vendor_name || '',
          subcontractor_id: transaction.subcontractor_id || '',
          invoice_number: transaction.invoice_number || '',
          po_number: transaction.po_number || '',
          notes: transaction.notes || '',
        })
      } else {
        setFormData({
          cost_code_id: '',
          transaction_date: format(new Date(), 'yyyy-MM-dd'),
          description: '',
          transaction_type: 'actual',
          source_type: '',
          amount: '',
          vendor_name: '',
          subcontractor_id: '',
          invoice_number: '',
          po_number: '',
          notes: '',
        })
      }
    }, 0);
  }, [transaction, open])

  const handleCostCodeChange = (costCodeId: string, _costCode: CostCode) => {
    setFormData(prev => ({ ...prev, cost_code_id: costCodeId }))
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
      const updateData: UpdateCostTransactionDTO = {
        transaction_date: formData.transaction_date,
        description: formData.description,
        transaction_type: formData.transaction_type,
        source_type: formData.source_type || undefined,
        amount: parseNumber(formData.amount),
        vendor_name: formData.vendor_name || undefined,
        invoice_number: formData.invoice_number || undefined,
        po_number: formData.po_number || undefined,
        notes: formData.notes || undefined,
      }
      onSubmit(updateData)
    } else {
      const createData: CreateCostTransactionDTO = {
        project_id: projectId,
        cost_code_id: formData.cost_code_id,
        transaction_date: formData.transaction_date,
        description: formData.description,
        transaction_type: formData.transaction_type,
        source_type: formData.source_type || undefined,
        amount: parseNumber(formData.amount),
        vendor_name: formData.vendor_name || undefined,
        invoice_number: formData.invoice_number || undefined,
        po_number: formData.po_number || undefined,
        notes: formData.notes || undefined,
      }
      onSubmit(createData)
    }
  }

  const isValid = isEditing
    ? formData.description && formData.amount
    : formData.cost_code_id && formData.description && formData.amount

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cost Code Picker */}
          <div className="space-y-2">
            <Label htmlFor="cost_code">Cost Code *</Label>
            {isEditing ? (
              <div className="p-3 bg-surface rounded-md">
                <span className="font-mono text-sm">{transaction?.cost_code?.code}</span>
                <span className="text-muted ml-2">{transaction?.cost_code?.name}</span>
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

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label htmlFor="transaction_date">Transaction Date *</Label>
            <Input
              id="transaction_date"
              type="date"
              value={formData.transaction_date}
              onChange={(e) => handleInputChange('transaction_date', e.target.value)}
            />
          </div>

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type *</Label>
            <RadixSelect
              value={formData.transaction_type}
              onValueChange={(value: string) => handleInputChange('transaction_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </RadixSelect>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
              <Input
                id="amount"
                type="text"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0"
                className="pl-7 font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the cost"
            />
          </div>

          {/* Source Type */}
          <div className="space-y-2">
            <Label>Source Type</Label>
            <RadixSelect
              value={formData.source_type || 'none'}
              onValueChange={(value: string) => handleInputChange('source_type', value === 'none' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {SOURCE_TYPES.map(source => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </RadixSelect>
          </div>

          {/* Vendor Name */}
          <div className="space-y-2">
            <Label htmlFor="vendor_name">Vendor / Supplier</Label>
            <Input
              id="vendor_name"
              type="text"
              value={formData.vendor_name}
              onChange={(e) => handleInputChange('vendor_name', e.target.value)}
              placeholder="Vendor name (optional)"
            />
          </div>

          {/* Invoice Number & PO Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice #</Label>
              <Input
                id="invoice_number"
                type="text"
                value={formData.invoice_number}
                onChange={(e) => handleInputChange('invoice_number', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po_number">PO #</Label>
              <Input
                id="po_number"
                type="text"
                value={formData.po_number}
                onChange={(e) => handleInputChange('po_number', e.target.value)}
                placeholder="Optional"
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
              placeholder="Additional notes..."
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
