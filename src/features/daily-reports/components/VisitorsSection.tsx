import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { FormError } from '@/components/ui/form-error'
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2, UserPlus } from 'lucide-react'
import { VisitorEntry } from '@/features/daily-reports/store/offlineReportStore'
import { visitorEntrySchema } from '../validation/dailyReportSchema'
import toast from 'react-hot-toast'

interface VisitorsSectionProps {
  expanded: boolean
  onToggle: () => void
  entries: VisitorEntry[]
  onAdd: (entry: VisitorEntry) => void
  onUpdate: (id: string, updates: Partial<VisitorEntry>) => void
  onRemove: (id: string) => void
}

export function VisitorsSection({
  expanded,
  onToggle,
  entries,
  onAdd,
  onUpdate,
  onRemove,
}: VisitorsSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<VisitorEntry>>({})
  const [validationError, setValidationError] = useState<string>('')

  const handleEdit = (entry: VisitorEntry) => {
    setEditingId(entry.id)
    setEditForm({ ...entry })
    setValidationError('')
  }

  const handleSaveEdit = () => {
    if (!editingId) {return}

    // Validate the entry
    const result = visitorEntrySchema.safeParse(editForm)
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
    toast.success('Visitor entry updated')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({})
    setValidationError('')
  }

  const handleAddNew = () => {
    const newEntry: VisitorEntry = {
      id: crypto.randomUUID(),
      visitor_name: 'New Visitor',
    }

    // Validate before adding
    const result = visitorEntrySchema.safeParse(newEntry)
    if (!result.success) {
      toast.error('Failed to add visitor entry')
      return
    }

    onAdd(newEntry)
    toast.success('Visitor entry added')
  }

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <CardTitle className="text-base">
              Visitors
              {entries.length > 0 && ` (${entries.length})`}
            </CardTitle>
            <CardDescription>Inspectors and site visitors</CardDescription>
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
            <p className="text-sm text-gray-500">No visitors recorded</p>
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
                            Visitor Name <span className="text-red-600">*</span>
                          </label>
                          <Input
                            placeholder="e.g., John Smith"
                            value={editForm.visitor_name || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, visitor_name: e.target.value })
                              setValidationError('')
                            }}
                            maxLength={100}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Company
                          </label>
                          <Input
                            placeholder="e.g., City Inspector's Office"
                            value={editForm.company || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, company: e.target.value })
                              setValidationError('')
                            }}
                            maxLength={100}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Purpose of Visit
                          </label>
                          <Input
                            placeholder="e.g., Foundation inspection, Safety audit"
                            value={editForm.purpose || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, purpose: e.target.value })
                              setValidationError('')
                            }}
                            maxLength={200}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Arrival Time
                          </label>
                          <Input
                            type="time"
                            value={editForm.arrival_time || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, arrival_time: e.target.value })
                              setValidationError('')
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Departure Time
                          </label>
                          <Input
                            type="time"
                            value={editForm.departure_time || ''}
                            onChange={(e) => {
                              setEditForm({ ...editForm, departure_time: e.target.value })
                              setValidationError('')
                            }}
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
                        <p className="font-medium text-sm">{entry.visitor_name}</p>
                        <div className="flex flex-wrap gap-x-4 text-xs text-gray-600 mt-1">
                          {entry.company && <span>{entry.company}</span>}
                          {entry.purpose && <span>Purpose: {entry.purpose}</span>}
                          {(entry.arrival_time || entry.departure_time) && (
                            <span>
                              {entry.arrival_time && `In: ${entry.arrival_time}`}
                              {entry.arrival_time && entry.departure_time && ' - '}
                              {entry.departure_time && `Out: ${entry.departure_time}`}
                            </span>
                          )}
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
            Add Visitor
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
