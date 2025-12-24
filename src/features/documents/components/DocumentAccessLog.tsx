// File: /src/features/documents/components/DocumentAccessLog.tsx
// UI component for viewing document access history

import { useQuery } from '@tanstack/react-query'
import { documentAccessLogApi, type AccessLogEntry, type AccessAction } from '@/lib/api/services/document-access-log'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Eye, Download, Printer, Share2, Edit, RotateCcw, Activity, Users, Clock } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useState } from 'react'

interface DocumentAccessLogProps {
  documentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const actionIcons: Record<AccessAction, React.ReactNode> = {
  view: <Eye className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  print: <Printer className="h-4 w-4" />,
  share: <Share2 className="h-4 w-4" />,
  edit: <Edit className="h-4 w-4" />,
  revert: <RotateCcw className="h-4 w-4" />,
}

const actionColors: Record<AccessAction, string> = {
  view: 'bg-info-light text-blue-800',
  download: 'bg-success-light text-green-800',
  print: 'bg-purple-100 text-purple-800',
  share: 'bg-warning-light text-yellow-800',
  edit: 'bg-orange-100 text-orange-800',
  revert: 'bg-error-light text-red-800',
}

export function DocumentAccessLog({
  documentId,
  open,
  onOpenChange,
}: DocumentAccessLogProps) {
  const [actionFilter, setActionFilter] = useState<AccessAction | 'all'>('all')

  // Fetch access log
  const { data: accessLog, isLoading: logLoading } = useQuery({
    queryKey: ['document-access-log', documentId, actionFilter],
    queryFn: () =>
      documentAccessLogApi.getAccessLog(documentId, {
        limit: 100,
        action: actionFilter === 'all' ? undefined : actionFilter,
      }),
    enabled: open,
  })

  // Fetch access stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['document-access-stats', documentId],
    queryFn: () => documentAccessLogApi.getAccessStats(documentId),
    enabled: open,
  })

  const isLoading = logLoading || statsLoading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Document Access History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                icon={<Eye className="h-5 w-5 text-primary" />}
                label="Total Views"
                value={stats.totalViews}
              />
              <StatCard
                icon={<Download className="h-5 w-5 text-success" />}
                label="Downloads"
                value={stats.totalDownloads}
              />
              <StatCard
                icon={<Users className="h-5 w-5 text-purple-600" />}
                label="Unique Viewers"
                value={stats.uniqueViewers}
              />
              <StatCard
                icon={<Clock className="h-5 w-5 text-orange-600" />}
                label="Last Accessed"
                value={
                  stats.lastAccessed
                    ? formatDistanceToNow(new Date(stats.lastAccessed), { addSuffix: true })
                    : 'Never'
                }
                isText
              />
            </div>
          )}

          {/* Filter */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-secondary">Filter by action:</span>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as AccessAction | 'all')}
              className="w-[150px]"
            >
              <option value="all">All actions</option>
              <option value="view">Views</option>
              <option value="download">Downloads</option>
              <option value="print">Prints</option>
              <option value="share">Shares</option>
              <option value="edit">Edits</option>
              <option value="revert">Reverts</option>
            </Select>
          </div>

          {/* Access Log List */}
          <div className="border rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="text-center py-8 text-muted">
                Loading access history...
              </div>
            ) : !accessLog || accessLog.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No access history recorded</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-surface border-b">
                  <tr>
                    <th className="text-left py-2 px-4 text-sm font-medium text-secondary">
                      Action
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-secondary">
                      User
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-secondary">
                      Date & Time
                    </th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-secondary">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accessLog.map((entry) => (
                    <AccessLogRow key={entry.id} entry={entry} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  isText?: boolean
}

function StatCard({ icon, label, value, isText }: StatCardProps) {
  return (
    <div className="bg-surface rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-secondary">{label}</span>
      </div>
      <div className={isText ? 'text-sm font-medium' : 'text-2xl font-bold'}>
        {value}
      </div>
    </div>
  )
}

interface AccessLogRowProps {
  entry: AccessLogEntry
}

function AccessLogRow({ entry }: AccessLogRowProps) {
  const action = entry.action as AccessAction
  const icon = actionIcons[action] || <Activity className="h-4 w-4" />
  const colorClass = actionColors[action] || 'bg-muted text-foreground'

  const details = entry.details as Record<string, unknown> | null

  return (
    <tr className="hover:bg-surface">
      <td className="py-3 px-4">
        <Badge className={colorClass} variant="secondary">
          <span className="flex items-center gap-1">
            {icon}
            <span className="capitalize">{entry.action}</span>
          </span>
        </Badge>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm">
          {entry.user?.full_name || entry.user?.email || entry.user_id.slice(0, 8) + '...'}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="text-sm text-secondary">
          {format(new Date(entry.created_at), 'MMM d, yyyy')}
        </div>
        <div className="text-xs text-disabled">
          {format(new Date(entry.created_at), 'h:mm a')}
        </div>
      </td>
      <td className="py-3 px-4">
        {details && (
          <div className="text-xs text-muted">
            {(typeof details.versionNumber === 'string' || typeof details.versionNumber === 'number') && details.versionNumber && (
              <span className="mr-2">v{details.versionNumber}</span>
            )}
            {typeof details.versionId === 'string' && details.versionId && (
              <span className="text-disabled">
                ID: {details.versionId.slice(0, 8)}...
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

export default DocumentAccessLog
