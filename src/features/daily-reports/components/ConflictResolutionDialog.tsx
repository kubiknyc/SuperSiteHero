// Dialog for resolving sync conflicts between local and server data
import { AlertTriangle, Cloud, Laptop, GitMerge, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ConflictInfo } from '../store/offlineReportStore'

interface ConflictResolutionDialogProps {
  conflict: ConflictInfo
  onResolve: (strategy: 'keep_local' | 'keep_server' | 'merge') => void
  onCancel?: () => void
}

export function ConflictResolutionDialog({
  conflict,
  onResolve,
  onCancel,
}: ConflictResolutionDialogProps) {
  const localTime = new Date(conflict.localUpdatedAt).toLocaleString()
  const serverTime = new Date(conflict.serverUpdatedAt).toLocaleString()

  // Extract key differences for display
  const serverData = conflict.serverData || {}
  const keyFields = ['weather_condition', 'work_completed', 'issues', 'observations', 'status']
  const differences = keyFields.filter(
    (field) => serverData[field as keyof typeof serverData] !== undefined
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg mx-4 shadow-xl">
        <CardHeader className="bg-warning-light border-b border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <CardTitle className="text-amber-900">Sync Conflict Detected</CardTitle>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-1 hover:bg-amber-100 rounded"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-amber-700" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-secondary">
            This report was modified on another device or by another user while you were offline.
            Choose how to resolve this conflict:
          </p>

          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
              <Laptop className="h-4 w-4 text-primary" />
              <span className="text-blue-800">
                <strong>Your changes:</strong> {localTime}
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-success-light rounded">
              <Cloud className="h-4 w-4 text-success" />
              <span className="text-green-800">
                <strong>Server version:</strong> {serverTime}
              </span>
            </div>
          </div>

          {differences.length > 0 && (
            <div className="p-3 bg-surface rounded border border-border">
              <p className="text-sm font-medium text-secondary mb-2">
                Server has updates to:
              </p>
              <ul className="text-sm text-secondary list-disc list-inside">
                {differences.map((field) => (
                  <li key={field}>{field.replace(/_/g, ' ')}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={() => onResolve('keep_local')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              <Laptop className="h-4 w-4" />
              Keep My Changes
              <span className="text-xs text-blue-200 ml-1">(overwrite server)</span>
            </button>

            <button
              onClick={() => onResolve('keep_server')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-success text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Cloud className="h-4 w-4" />
              Use Server Version
              <span className="text-xs text-green-200 ml-1">(discard my changes)</span>
            </button>

            <button
              onClick={() => onResolve('merge')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <GitMerge className="h-4 w-4" />
              Merge Changes
              <span className="text-xs text-purple-200 ml-1">(my changes + server additions)</span>
            </button>
          </div>

          <p className="text-xs text-muted text-center pt-2">
            &ldquo;Merge&rdquo; will combine both versions, prioritizing your local changes for fields you edited.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
