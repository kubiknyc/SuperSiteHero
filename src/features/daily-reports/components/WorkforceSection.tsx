import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Plus, Trash2, Edit2 } from 'lucide-react'
import { WorkforceEntry } from '@/features/daily-reports/store/offlineReportStore'

interface WorkforceSectionProps {
  expanded: boolean
  onToggle: () => void
  entries: WorkforceEntry[]
  onAdd: (entry: WorkforceEntry) => void
  onUpdate: (id: string, updates: Partial<WorkforceEntry>) => void
  onRemove: (id: string) => void
}

export function WorkforceSection({
  expanded,
  onToggle,
  entries,
  onAdd,
  onUpdate,
  onRemove,
}: WorkforceSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<WorkforceEntry>>({})

  const handleEdit = (entry: WorkforceEntry) => {
    setEditingId(entry.id)
    setEditForm({ ...entry })
  }

  const handleSaveEdit = () => {
    if (editingId) {
      onUpdate(editingId, editForm)
      setEditingId(null)
      setEditForm({})
    }
  }

  const handleAddNew = () => {
    const newEntry: Partial<WorkforceEntry> = {
      id: crypto.randomUUID(),
      entry_type: 'team' as const,
    }
    onAdd(newEntry as WorkforceEntry)
  }

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div>
          <CardTitle className="text-base">Workforce</CardTitle>
          <CardDescription>Workers and subcontractors on site</CardDescription>
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
            <p className="text-sm text-gray-500">No workforce entries yet</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                  {editingId === entry.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Type
                          </label>
                          <select
                            value={editForm.entry_type || 'team'}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                entry_type: e.target.value as 'team' | 'individual',
                              })
                            }
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="team">Team</option>
                            <option value="individual">Individual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Trade
                          </label>
                          <Input
                            placeholder="e.g., Electrical"
                            value={editForm.trade || ''}
                            onChange={(e) => setEditForm({ ...editForm, trade: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null)
                            setEditForm({})
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {entry.trade || 'Workforce Entry'}
                        </p>
                        {entry.hours_worked && (
                          <p className="text-xs text-gray-600">{entry.hours_worked} hours</p>
                        )}
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

          <Button
            type="button"
            variant="outline"
            onClick={handleAddNew}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Workforce Entry
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
