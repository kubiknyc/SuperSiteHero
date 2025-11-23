import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DraftReport } from '@/features/daily-reports/store/offlineReportStore'

interface WorkSectionProps {
  expanded: boolean
  onToggle: () => void
  draft: DraftReport | null
  onUpdate: (updates: Partial<DraftReport>) => void
}

export function WorkSection({ expanded, onToggle, draft, onUpdate }: WorkSectionProps) {
  if (!draft) return null

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div>
          <CardTitle className="text-base">Work Completed</CardTitle>
          <CardDescription>Daily work summary and accomplishments</CardDescription>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Completed
            </label>
            <textarea
              placeholder="Describe the work completed today..."
              value={draft.work_completed || ''}
              onChange={(e) => onUpdate({ work_completed: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}
