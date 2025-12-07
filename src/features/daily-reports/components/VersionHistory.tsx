// Version history and audit trail display component
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { History, ChevronDown, ChevronUp, User, Clock, FileText } from 'lucide-react'
import { useState } from 'react'
import { getReportVersionHistory, formatAuditTrail, type AuditEntry } from '../services/reportVersioning'

interface VersionHistoryProps {
  reportId: string
}

export function VersionHistory({ reportId }: VersionHistoryProps) {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set())

  const { data: versions, isLoading } = useQuery({
    queryKey: ['report-versions', reportId],
    queryFn: () => getReportVersionHistory(reportId),
    enabled: !!reportId,
  })

  const auditEntries = versions ? formatAuditTrail(versions) : []

  const toggleExpand = (id: string) => {
    setExpandedVersions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!auditEntries.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No version history available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Version History
          <span className="text-sm font-normal text-gray-500">
            ({auditEntries.length} changes)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {auditEntries.map((entry) => (
          <VersionEntryCard
            key={entry.id}
            entry={entry}
            isExpanded={expandedVersions.has(entry.id)}
            onToggle={() => toggleExpand(entry.id)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface VersionEntryCardProps {
  entry: AuditEntry
  isExpanded: boolean
  onToggle: () => void
}

function VersionEntryCard({ entry, isExpanded, onToggle }: VersionEntryCardProps) {
  const formattedDate = format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')
  const hasDetails = entry.field_changes && entry.field_changes.length > 0

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-left"
        disabled={!hasDetails}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-full ${getActionColor(entry.action)}`}>
            <FileText className="h-3 w-3" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{entry.action}</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {entry.user_name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>
        {hasDetails && (
          isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )
        )}
      </button>

      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pt-0 border-t bg-gray-50">
          <p className="text-xs font-medium text-gray-600 mb-2 pt-2">Changes:</p>
          <div className="space-y-1">
            {entry.field_changes!.map((change, idx) => (
              <div key={idx} className="text-xs">
                <span className="font-medium text-gray-700">{change.field}:</span>{' '}
                <span className="text-red-600 line-through">
                  {formatValue(change.old_value)}
                </span>{' '}
                <span className="text-green-600">
                  {formatValue(change.new_value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getActionColor(action: string): string {
  if (action.includes('Created')) return 'bg-green-100 text-green-600'
  if (action.includes('Approved')) return 'bg-blue-100 text-blue-600'
  if (action.includes('Rejected')) return 'bg-red-100 text-red-600'
  if (action.includes('Submitted')) return 'bg-yellow-100 text-yellow-600'
  return 'bg-gray-100 text-gray-600'
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value).slice(0, 50) + (String(value).length > 50 ? '...' : '')
}
