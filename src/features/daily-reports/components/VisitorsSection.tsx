import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { VisitorEntry } from '@/features/daily-reports/store/offlineReportStore'

interface VisitorsSectionProps {
  expanded: boolean
  onToggle: () => void
  entries: VisitorEntry[]
  onAdd: (entry: VisitorEntry) => void
  onRemove: (id: string) => void
}

export function VisitorsSection({
  expanded,
  onToggle,
  entries,
  onAdd,
  onRemove,
}: VisitorsSectionProps) {
  const handleAddNew = () => {
    const newEntry = {
      id: crypto.randomUUID(),
      visitor_name: '',
    }
    onAdd(newEntry)
  }

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div>
          <CardTitle className="text-base">Visitors</CardTitle>
          <CardDescription>Inspectors and site visitors</CardDescription>
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
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div>
                    <p className="font-medium text-sm">{entry.visitor_name}</p>
                    {entry.company && <p className="text-xs text-gray-600">{entry.company}</p>}
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
            Add Visitor
          </Button>
        </CardContent>
      )}
    </Card>
  )
}
