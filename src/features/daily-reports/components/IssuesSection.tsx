import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { DraftReport } from '@/features/daily-reports/store/offlineReportStore'

interface IssuesSectionProps {
  expanded: boolean
  onToggle: () => void
  draft: DraftReport | null
  onUpdate: (updates: Partial<DraftReport>) => void
}

export function IssuesSection({ expanded, onToggle, draft, onUpdate }: IssuesSectionProps) {
  if (!draft) {return null}

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50"
      >
        <div>
          <CardTitle className="text-base">Issues & Observations</CardTitle>
          <CardDescription>Problems encountered and site notes</CardDescription>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Issues</label>
            <textarea
              placeholder="Describe any issues or problems encountered..."
              value={draft.issues || ''}
              onChange={(e) => onUpdate({ issues: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observations
            </label>
            <textarea
              placeholder="General observations about the site..."
              value={draft.observations || ''}
              onChange={(e) => onUpdate({ observations: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea
              placeholder="Additional comments..."
              value={draft.comments || ''}
              onChange={(e) => onUpdate({ comments: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            />
          </div>
        </CardContent>
      )}
    </Card>
  )
}
