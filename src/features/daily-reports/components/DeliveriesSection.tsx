import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { FormError } from '@/components/ui/form-error'
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2, Package } from 'lucide-react'
import { DeliveryEntry } from '@/features/daily-reports/store/offlineReportStore'
import { deliveryEntrySchema } from '../validation/dailyReportSchema'
import toast from 'react-hot-toast'

interface DeliveriesSectionProps {
  expanded: boolean
  onToggle: () => void
  entries: DeliveryEntry[]
  onAdd: (entry: DeliveryEntry) => void
  onUpdate: (id: string, updates: Partial<DeliveryEntry>) => void
  onRemove: (id: string) => void
}

export function DeliveriesSection({
  expanded,
  onToggle,
  entries,
  onAdd,
  onUpdate,
  onRemove,
}: DeliveriesSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<DeliveryEntry>>({})
  const [validationError, setValidationError] = useState<string>('')

  const handleEdit = (entry: DeliveryEntry) => {
    setEditingId(entry.id)
    setEditForm({ ...entry })
    setValidationError('')
  }

  const handleSaveEdit = () => {
    if (!editingId) {return}

    // Validate the entry
    const result = deliveryEntrySchema.safeParse(editForm)
    if (!result.success) {
      const errorMessage = result.error.issues[0]?.message || 'Invalid entry'
      setValidationError(errorMessage)
      toast.error(errorMessage)
      return
    }

    onUpdate(editingId, editForm)
    setEditingId(null)
    setEditForm({})
    setValidationError('')
    toast.success('Delivery entry updated')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
    setValidationError('')
  }

  const handleAddNew = () => {
    const newEntry: DeliveryEntry = {
      id: crypto.randomUUID(),
      material_description: 'New Delivery',
    }

    // Validate before adding
    const result = deliveryEntrySchema.safeParse(newEntry)
    if (!result.success) {
      toast.error('Failed to add delivery entry')
      return
    }

    onAdd(newEntry)
    toast.success('Delivery entry added')
  }

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <CardTitle className="text-base">
              Deliveries
              {entries.length > 0 && ` (${entries.length})`}
            </CardTitle>
            <CardDescription>Materials delivered to site</CardDescription>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-500">No deliveries yet</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                  {editingId === entry.id ? (
                    <div className="space-y-3">
                      {validationError && <FormError message={validationError} />}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Material <span className="text-red-600">*</span>
                          </label>
                          <Input
                            placeholder="e.g., Concrete, Steel beams"
                            value={editForm.material_description || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, material_description: e.target.value })
                              setValidationError('')
                            }}
                            maxLength={200}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Vendor
                          </label>
                          <Input
                            placeholder="e.g., ABC Suppliers"
                            value={editForm.vendor || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, vendor: e.target.value })
                              setValidationError('')
                            }}
                            maxLength={100}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <Input
                            placeholder="e.g., 50 yards, 100 units"
                            value={editForm.quantity || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, quantity: e.target.value })
                              setValidationError('')
                            }}
                            maxLength={100}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Ticket #
                          </label>
                          <Input
                            placeholder="Delivery ticket number"
                            value={editForm.delivery_ticket_number || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, delivery_ticket_number: e.target.value })
                              setValidationError('')
                            }}
                            maxLength={50}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{entry.material_description}</p>
                        <div className="flex flex-wrap gap-x-4 text-xs text-gray-600 mt-1">
                          {entry.vendor && <span>From: {entry.vendor}</span>}
                          {entry.quantity && <span>Qty: {entry.quantity}</span>}
                          {entry.delivery_ticket_number && <span>Ticket: {entry.delivery_ticket_number}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(entry)}
                          className="p-1 hover:bg-white rounded"
                        >
                          <Edit2 className="h-4 w-4 text-gray-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove(entry.id)}
                          className="p-1 hover:bg-white rounded"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" onClick={handleAddNew} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Delivery
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
