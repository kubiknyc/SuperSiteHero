import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Plus, Trash2, Truck } from 'lucide-react'
import { EquipmentEntry } from '@/features/daily-reports/store/offlineReportStore'
import { equipmentEntrySchema } from '../validation/dailyReportSchema'
import toast from 'react-hot-toast'

interface EquipmentSectionProps {
  expanded: boolean
  onToggle: () => void
  entries: EquipmentEntry[]
  onAdd: (entry: EquipmentEntry) => void
  onRemove: (id: string) => void
}

export function EquipmentSection({
  expanded,
  onToggle,
  entries,
  onAdd,
  onRemove,
}: EquipmentSectionProps) {
  const handleAddNew = () => {
    const newEntry: EquipmentEntry = {
      id: crypto.randomUUID(),
      equipment_type: 'New Equipment',
      quantity: 1,
    }

    // Validate before adding
    const result = equipmentEntrySchema.safeParse(newEntry)
    if (!result.success) {
      toast.error('Failed to add equipment entry')
      return
    }

    onAdd(newEntry)
    toast.success('Equipment entry added')
  }

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-gray-600" />
          <div className="text-left">
            <CardTitle className="text-base">
              Equipment
              {entries.length > 0 && ` (${entries.length})`}
            </CardTitle>
            <CardDescription>Equipment used on site</CardDescription>
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
            <p className="text-sm text-gray-500">No equipment entries yet</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div>
                    <p className="font-medium text-sm">{entry.equipment_type}</p>
                    {entry.hours_used && <p className="text-xs text-gray-600">{entry.hours_used}h</p>}
                  </div>
                  <button onClick={() => onRemove(entry.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button type="button" variant="outline" onClick={handleAddNew} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Equipment
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
