// File: /src/features/change-orders/components/ChangeOrderItemsEditor.tsx
// Spreadsheet-like editor for change order line items

import { useState, useCallback } from 'react'
import {
  useChangeOrderItems,
  useAddChangeOrderItem,
  useUpdateChangeOrderItem,
  useDeleteChangeOrderItem,
} from '../hooks/useChangeOrdersV2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Trash2,
  Save,
  X,
  GripVertical,
  Package,
  DollarSign,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { calculateItemTotal, type ChangeOrderItem, type CreateChangeOrderItemDTO } from '@/types/change-order'
import { logger } from '../../../lib/utils/logger';


interface ChangeOrderItemsEditorProps {
  changeOrderId: string
  isEditable?: boolean
  onTotalChange?: (total: number) => void
}

interface ItemFormData {
  description: string
  cost_code: string
  quantity: string
  unit: string
  unit_cost: string
  labor_hours: string
  labor_rate: string
  labor_amount: string
  material_amount: string
  equipment_amount: string
  subcontract_amount: string
  other_amount: string
  markup_percent: string
  notes: string
}

const emptyFormData: ItemFormData = {
  description: '',
  cost_code: '',
  quantity: '',
  unit: '',
  unit_cost: '',
  labor_hours: '',
  labor_rate: '',
  labor_amount: '',
  material_amount: '',
  equipment_amount: '',
  subcontract_amount: '',
  other_amount: '',
  markup_percent: '',
  notes: '',
}

export function ChangeOrderItemsEditor({
  changeOrderId,
  isEditable = true,
  onTotalChange: _onTotalChange,
}: ChangeOrderItemsEditorProps) {
  const { data: items, isLoading, error } = useChangeOrderItems(changeOrderId)
  const addItem = useAddChangeOrderItem()
  const updateItem = useUpdateChangeOrderItem()
  const deleteItem = useDeleteChangeOrderItem()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<ItemFormData>(emptyFormData)

  // Calculate total
  const total = items?.reduce((sum, item) => sum + (item.total_amount || 0), 0) || 0

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) {return '-'}
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate labor amount from hours and rate
  const calculateLaborAmount = useCallback((hours: string, rate: string): string => {
    const h = parseFloat(hours) || 0
    const r = parseFloat(rate) || 0
    return h > 0 && r > 0 ? String(h * r) : ''
  }, [])

  // Calculate preview total for form
  const calculateFormTotal = useCallback((data: ItemFormData): number => {
    return calculateItemTotal({
      labor_amount: parseFloat(data.labor_amount) || 0,
      material_amount: parseFloat(data.material_amount) || 0,
      equipment_amount: parseFloat(data.equipment_amount) || 0,
      subcontract_amount: parseFloat(data.subcontract_amount) || 0,
      other_amount: parseFloat(data.other_amount) || 0,
      quantity: parseFloat(data.quantity) || 0,
      unit_cost: parseFloat(data.unit_cost) || 0,
      markup_percent: parseFloat(data.markup_percent) || 0,
    })
  }, [])

  // Handle form change
  const handleFormChange = (field: keyof ItemFormData, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }

      // Auto-calculate labor amount when hours or rate change
      if (field === 'labor_hours' || field === 'labor_rate') {
        updated.labor_amount = calculateLaborAmount(
          field === 'labor_hours' ? value : prev.labor_hours,
          field === 'labor_rate' ? value : prev.labor_rate
        )
      }

      return updated
    })
  }

  // Start editing an item
  const startEditing = (item: ChangeOrderItem) => {
    setEditingId(item.id)
    setFormData({
      description: item.description || '',
      cost_code: item.cost_code || '',
      quantity: item.quantity?.toString() || '',
      unit: item.unit || '',
      unit_cost: item.unit_cost?.toString() || '',
      labor_hours: item.labor_hours?.toString() || '',
      labor_rate: item.labor_rate?.toString() || '',
      labor_amount: item.labor_amount?.toString() || '',
      material_amount: item.material_amount?.toString() || '',
      equipment_amount: item.equipment_amount?.toString() || '',
      subcontract_amount: item.subcontract_amount?.toString() || '',
      other_amount: item.other_amount?.toString() || '',
      markup_percent: item.markup_percent?.toString() || '',
      notes: item.notes || '',
    })
  }

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null)
    setShowAddForm(false)
    setFormData(emptyFormData)
  }

  // Save item (add or update)
  const handleSave = async () => {
    if (!formData.description.trim()) {return}

    const itemData: CreateChangeOrderItemDTO = {
      description: formData.description,
      cost_code: formData.cost_code || undefined,
      quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
      unit: formData.unit || undefined,
      unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : undefined,
      labor_hours: formData.labor_hours ? parseFloat(formData.labor_hours) : undefined,
      labor_rate: formData.labor_rate ? parseFloat(formData.labor_rate) : undefined,
      labor_amount: formData.labor_amount ? parseFloat(formData.labor_amount) : undefined,
      material_amount: formData.material_amount ? parseFloat(formData.material_amount) : undefined,
      equipment_amount: formData.equipment_amount ? parseFloat(formData.equipment_amount) : undefined,
      subcontract_amount: formData.subcontract_amount ? parseFloat(formData.subcontract_amount) : undefined,
      other_amount: formData.other_amount ? parseFloat(formData.other_amount) : undefined,
      markup_percent: formData.markup_percent ? parseFloat(formData.markup_percent) : undefined,
      notes: formData.notes || undefined,
    }

    try {
      if (editingId) {
        await updateItem.mutateAsync({ id: editingId, ...itemData })
      } else {
        await addItem.mutateAsync({ changeOrderId, ...itemData })
      }
      cancelEditing()
    } catch (e) {
      logger.error('Failed to save item:', e)
    }
  }

  // Delete item
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {return}
    try {
      await deleteItem.mutateAsync({ id, changeOrderId })
    } catch (e) {
      logger.error('Failed to delete item:', e)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-disabled mb-4" />
          <p className="text-muted">Loading items...</p>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200 bg-error-light">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-error mb-4" />
          <p className="text-error">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  // Item form component
  const renderItemForm = () => (
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Description *</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="Item description..."
            rows={2}
          />
        </div>

        <div>
          <Label>Cost Code</Label>
          <Input
            value={formData.cost_code}
            onChange={(e) => handleFormChange('cost_code', e.target.value)}
            placeholder="e.g., 03-2100"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Qty</Label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => handleFormChange('quantity', e.target.value)}
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Input
              value={formData.unit}
              onChange={(e) => handleFormChange('unit', e.target.value)}
              placeholder="SF, LF, EA"
            />
          </div>
          <div>
            <Label>$/Unit</Label>
            <Input
              type="number"
              value={formData.unit_cost}
              onChange={(e) => handleFormChange('unit_cost', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium text-secondary mb-3 heading-card">Cost Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Labor Hours</Label>
            <Input
              type="number"
              value={formData.labor_hours}
              onChange={(e) => handleFormChange('labor_hours', e.target.value)}
            />
          </div>
          <div>
            <Label>Labor Rate ($/hr)</Label>
            <Input
              type="number"
              value={formData.labor_rate}
              onChange={(e) => handleFormChange('labor_rate', e.target.value)}
            />
          </div>
          <div>
            <Label>Labor Amount</Label>
            <Input
              type="number"
              value={formData.labor_amount}
              onChange={(e) => handleFormChange('labor_amount', e.target.value)}
            />
          </div>
          <div>
            <Label>Material</Label>
            <Input
              type="number"
              value={formData.material_amount}
              onChange={(e) => handleFormChange('material_amount', e.target.value)}
            />
          </div>
          <div>
            <Label>Equipment</Label>
            <Input
              type="number"
              value={formData.equipment_amount}
              onChange={(e) => handleFormChange('equipment_amount', e.target.value)}
            />
          </div>
          <div>
            <Label>Subcontract</Label>
            <Input
              type="number"
              value={formData.subcontract_amount}
              onChange={(e) => handleFormChange('subcontract_amount', e.target.value)}
            />
          </div>
          <div>
            <Label>Other</Label>
            <Input
              type="number"
              value={formData.other_amount}
              onChange={(e) => handleFormChange('other_amount', e.target.value)}
            />
          </div>
          <div>
            <Label>Markup %</Label>
            <Input
              type="number"
              value={formData.markup_percent}
              onChange={(e) => handleFormChange('markup_percent', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleFormChange('notes', e.target.value)}
          placeholder="Optional notes..."
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-lg font-medium">
          Line Total: <span className="text-primary">{formatCurrency(calculateFormTotal(formData))}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cancelEditing}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.description.trim() || addItem.isPending || updateItem.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {addItem.isPending || updateItem.isPending ? 'Saving...' : 'Save Item'}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Line Items
          </CardTitle>
          {isEditable && !showAddForm && !editingId && (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add form */}
        {showAddForm && !editingId && renderItemForm()}

        {/* Items list */}
        {items && items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id}>
                {editingId === item.id ? (
                  renderItemForm()
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-surface rounded-lg hover:bg-muted transition-colors">
                    {isEditable && (
                      <div className="text-disabled cursor-grab">
                        <GripVertical className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted">#{item.item_number}</span>
                            {item.cost_code && (
                              <Badge variant="outline" className="text-xs">
                                {item.cost_code}
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium mt-1">{item.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(item.total_amount)}
                          </p>
                          {item.markup_percent && (
                            <p className="text-xs text-muted">+{item.markup_percent}% markup</p>
                          )}
                        </div>
                      </div>

                      {/* Cost breakdown summary */}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-secondary">
                        {item.labor_amount && item.labor_amount > 0 && (
                          <span>Labor: {formatCurrency(item.labor_amount)}</span>
                        )}
                        {item.material_amount && item.material_amount > 0 && (
                          <span>Material: {formatCurrency(item.material_amount)}</span>
                        )}
                        {item.equipment_amount && item.equipment_amount > 0 && (
                          <span>Equipment: {formatCurrency(item.equipment_amount)}</span>
                        )}
                        {item.subcontract_amount && item.subcontract_amount > 0 && (
                          <span>Sub: {formatCurrency(item.subcontract_amount)}</span>
                        )}
                        {item.quantity && item.unit && (
                          <span>
                            {item.quantity} {item.unit} @ {formatCurrency(item.unit_cost)}/{item.unit}
                          </span>
                        )}
                      </div>

                      {item.notes && <p className="text-sm text-muted mt-2 italic">{item.notes}</p>}
                    </div>

                    {isEditable && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => startEditing(item)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:text-error-dark hover:bg-error-light"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteItem.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Total row */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg font-medium">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-secondary" />
                <span>Total ({items.length} items)</span>
              </div>
              <span className="text-xl font-bold text-primary-hover">{formatCurrency(total)}</span>
            </div>
          </div>
        ) : !showAddForm ? (
          <div className="text-center py-8">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-muted mb-4">No line items yet</p>
            {isEditable && (
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default ChangeOrderItemsEditor
