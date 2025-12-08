/**
 * QuickBooks Sync Log Table
 *
 * Display sync operation history
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, Eye, Clock } from 'lucide-react'
import { QBSyncStatusBadge } from './QBSyncStatusBadge'
import { format, formatDistanceToNow } from 'date-fns'
import type { QBSyncLog, QBSyncDirection } from '@/types/quickbooks'

interface QBSyncLogTableProps {
  logs: QBSyncLog[]
  compact?: boolean
}

const DIRECTION_ICONS: Record<QBSyncDirection, React.ReactNode> = {
  to_quickbooks: <ArrowUpRight className="h-4 w-4 text-blue-500" />,
  from_quickbooks: <ArrowDownRight className="h-4 w-4 text-green-500" />,
  bidirectional: <ArrowLeftRight className="h-4 w-4 text-purple-500" />,
}

const DIRECTION_LABELS: Record<QBSyncDirection, string> = {
  to_quickbooks: 'To QB',
  from_quickbooks: 'From QB',
  bidirectional: 'Two-way',
}

export function QBSyncLogTable({ logs, compact = false }: QBSyncLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No sync activity yet.
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {logs.slice(0, 5).map((log) => (
          <div
            key={log.id}
            className="flex items-center justify-between p-2 border rounded-md text-sm"
          >
            <div className="flex items-center gap-2">
              {DIRECTION_ICONS[log.direction]}
              <span className="font-medium capitalize">
                {log.entity_type || 'Multiple'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <QBSyncStatusBadge status={log.status} size="sm" />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Processed</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell>
              <div className="text-sm">
                {format(new Date(log.started_at), 'MMM d, h:mm a')}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(log.started_at), { addSuffix: true })}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {DIRECTION_ICONS[log.direction]}
                <span className="text-sm">{DIRECTION_LABELS[log.direction]}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary" className="capitalize">
                {log.entity_type || 'Multiple'}
              </Badge>
            </TableCell>
            <TableCell>
              <QBSyncStatusBadge status={log.status} />
            </TableCell>
            <TableCell className="text-right">
              <div className="text-sm">
                {log.records_processed} total
              </div>
              <div className="text-xs text-muted-foreground">
                {log.records_created > 0 && (
                  <span className="text-green-600">+{log.records_created}</span>
                )}
                {log.records_updated > 0 && (
                  <span className="text-blue-600 ml-1">~{log.records_updated}</span>
                )}
                {log.records_failed > 0 && (
                  <span className="text-red-600 ml-1">-{log.records_failed}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              {log.duration_ms ? (
                <span className="text-sm">
                  {log.duration_ms > 1000
                    ? `${(log.duration_ms / 1000).toFixed(1)}s`
                    : `${log.duration_ms}ms`}
                </span>
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
              )}
            </TableCell>
            <TableCell>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Sync Log Details</DialogTitle>
                    <DialogDescription>
                      {format(new Date(log.started_at), 'PPpp')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Type</label>
                        <p className="text-sm capitalize">{log.sync_type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Direction</label>
                        <p className="text-sm">{DIRECTION_LABELS[log.direction]}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Entity Type</label>
                        <p className="text-sm capitalize">{log.entity_type || 'Multiple'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <div className="mt-1">
                          <QBSyncStatusBadge status={log.status} />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <label className="text-sm font-medium">Records Summary</label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        <div className="p-2 bg-muted rounded text-center">
                          <div className="text-lg font-bold">{log.records_processed}</div>
                          <div className="text-xs text-muted-foreground">Processed</div>
                        </div>
                        <div className="p-2 bg-green-50 rounded text-center">
                          <div className="text-lg font-bold text-green-600">{log.records_created}</div>
                          <div className="text-xs text-muted-foreground">Created</div>
                        </div>
                        <div className="p-2 bg-blue-50 rounded text-center">
                          <div className="text-lg font-bold text-blue-600">{log.records_updated}</div>
                          <div className="text-xs text-muted-foreground">Updated</div>
                        </div>
                        <div className="p-2 bg-red-50 rounded text-center">
                          <div className="text-lg font-bold text-red-600">{log.records_failed}</div>
                          <div className="text-xs text-muted-foreground">Failed</div>
                        </div>
                      </div>
                    </div>

                    {log.error_message && (
                      <div className="border-t pt-4">
                        <label className="text-sm font-medium text-red-600">Error</label>
                        <p className="text-sm mt-1 p-2 bg-red-50 rounded text-red-800">
                          {log.error_message}
                        </p>
                      </div>
                    )}

                    {log.error_details && (
                      <div className="border-t pt-4">
                        <label className="text-sm font-medium">Error Details</label>
                        <pre className="text-xs mt-1 p-2 bg-muted rounded overflow-auto max-h-32">
                          {JSON.stringify(log.error_details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
