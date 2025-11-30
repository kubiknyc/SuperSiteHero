import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Plus, Trash2, Package } from 'lucide-react'
import { DeliveryEntry } from '@/features/daily-reports/store/offlineReportStore'
import { deliveryEntrySchema } from '../validation/dailyReportSchema'
import toast from 'react-hot-toast'

interface DeliveriesSectionProps {
  expanded: boolean
  onToggle: () => void
  entries: DeliveryEntry[]
  onAdd: (entry: DeliveryEntry) => void
  onRemove: (id: string) => void
}

export function DeliveriesSection({
  expanded,
  onToggle,
  entries,
  onAdd,
  onRemove,
}: DeliveriesSectionProps) {
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
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div>
                    <p className="font-medium text-sm">{entry.material_description}</p>
                    {entry.vendor && <p className="text-xs text-gray-600">From: {entry.vendor}</p>}
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
            Add Delivery
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
