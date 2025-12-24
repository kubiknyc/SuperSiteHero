// File: /src/features/workflows/components/WorkflowItemHistoryPanel.tsx
// Panel component for displaying workflow item history/audit log

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, History, Edit2, PlayCircle, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useWorkflowItemHistory } from '@/features/workflows/hooks/useWorkflowItemHistory'
import type { WorkflowItemHistoryWithUser } from '@/lib/api/services/workflows'

interface WorkflowItemHistoryPanelProps {
  workflowItemId: string
}

// Get icon based on action type
function getActionIcon(action: string) {
  switch (action?.toLowerCase()) {
    case 'created':
      return <PlayCircle className="h-4 w-4 text-success" />
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-success" />
    case 'rejected':
      return <XCircle className="h-4 w-4 text-error" />
    case 'status_changed':
    case 'updated':
    default:
      return <Edit2 className="h-4 w-4 text-primary" />
  }
}

// Format the action description
function formatActionDescription(entry: WorkflowItemHistoryWithUser): string {
  const { action, field_changed, old_value, new_value } = entry

  if (action === 'created') {
    return 'Created this item'
  }

  if (field_changed) {
    const fieldName = field_changed.replace(/_/g, ' ')
    if (old_value && new_value) {
      return `Changed ${fieldName} from "${old_value}" to "${new_value}"`
    } else if (new_value) {
      return `Set ${fieldName} to "${new_value}"`
    } else if (old_value) {
      return `Cleared ${fieldName} (was "${old_value}")`
    }
    return `Updated ${fieldName}`
  }

  return action || 'Made a change'
}

// Get user display name
function getUserDisplayName(entry: WorkflowItemHistoryWithUser): string {
  if (entry.changed_by_user?.full_name) {
    return entry.changed_by_user.full_name
  }
  if (entry.changed_by_user?.email) {
    return entry.changed_by_user.email
  }
  return 'System'
}

export function WorkflowItemHistoryPanel({ workflowItemId }: WorkflowItemHistoryPanelProps) {
  const { data: history, isLoading, error } = useWorkflowItemHistory(workflowItemId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Activity History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-disabled" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Activity History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-error text-sm">Failed to load history</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />
          Activity History
          {history && history.length > 0 && (
            <span className="text-sm font-normal text-muted">
              ({history.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history && history.length > 0 ? (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex gap-3 ${
                  index < history.length - 1 ? 'pb-4 border-b border-border' : ''
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {getActionIcon(entry.action)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-secondary">
                    {formatActionDescription(entry)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-secondary">
                      {getUserDisplayName(entry)}
                    </span>
                    <span className="text-xs text-disabled">
                      {entry.changed_at
                        ? formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true })
                        : 'Just now'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity recorded yet</p>
            <p className="text-xs">Changes to this item will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
