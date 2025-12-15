/**
 * Import History List Component
 *
 * Table showing past schedule imports with status, file info, and activity counts.
 * Click on a row to view detailed import results.
 */

import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Upload,
  FileText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Hash,
  ExternalLink,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { useScheduleImportLogs } from '../hooks/useScheduleActivities'
import type { ScheduleImportLog } from '@/types/schedule-activities'

// =============================================
// Helper Functions
// =============================================

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {return '—'}
  try {
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a')
  } catch {
    return dateString
  }
}

function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) {return '—'}
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch {
    return dateString
  }
}

function getSourceSystemLabel(source: string | null): string {
  switch (source) {
    case 'ms_project': return 'MS Project'
    case 'primavera_p6': return 'Primavera P6'
    case 'manual': return 'Manual'
    default: return source || 'Unknown'
  }
}

function getStatusBadge(log: ScheduleImportLog) {
  switch (log.status) {
    case 'completed':
      if (log.errors && log.errors.length > 0) {
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Completed with errors
          </Badge>
        )
      }
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      )
    case 'pending':
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      )
  }
}

// =============================================
// Import Log Detail Dialog
// =============================================

interface ImportLogDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: ScheduleImportLog | null
}

export function ImportLogDetailDialog({
  open,
  onOpenChange,
  log,
}: ImportLogDetailDialogProps) {
  if (!log) {return null}

  const hasErrors = log.errors && log.errors.length > 0
  const hasWarnings = log.warnings && log.warnings.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Details
          </DialogTitle>
          <DialogDescription>
            {log.file_name || 'Imported Schedule'} - {formatDate(log.import_date)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="mt-1">{getStatusBadge(log)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Source System</div>
                  <div className="font-medium mt-1">
                    {getSourceSystemLabel(log.source_system)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Counts */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Import Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {log.activities_imported}
                    </div>
                    <div className="text-xs text-muted-foreground">Activities</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {log.dependencies_imported}
                    </div>
                    <div className="text-xs text-muted-foreground">Dependencies</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {log.resources_imported}
                    </div>
                    <div className="text-xs text-muted-foreground">Resources</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Errors */}
            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errors ({log.errors!.length})</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="max-h-[150px] mt-2">
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {log.errors!.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {hasWarnings && (
              <Alert>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <AlertTitle>Warnings ({log.warnings!.length})</AlertTitle>
                <AlertDescription>
                  <ScrollArea className="max-h-[150px] mt-2">
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {log.warnings!.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}

            {/* File Info */}
            {log.file_url && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{log.file_name}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={log.file_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// =============================================
// Component Props
// =============================================

interface ImportHistoryListProps {
  projectId: string
  limit?: number
  onViewDetails?: (log: ScheduleImportLog) => void
  showCard?: boolean
  className?: string
}

// =============================================
// Component
// =============================================

export function ImportHistoryList({
  projectId,
  limit,
  onViewDetails,
  showCard = true,
  className,
}: ImportHistoryListProps) {
  const { data: logs, isLoading, isError, refetch } = useScheduleImportLogs(projectId)
  const [selectedLog, setSelectedLog] = React.useState<ScheduleImportLog | null>(null)

  // Limit logs if specified
  const displayLogs = React.useMemo(() => {
    if (!logs) {return []}
    return limit ? logs.slice(0, limit) : logs
  }, [logs, limit])

  const handleRowClick = (log: ScheduleImportLog) => {
    if (onViewDetails) {
      onViewDetails(log)
    } else {
      setSelectedLog(log)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <Skeleton className="h-8 w-32 mb-4" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load import history</AlertDescription>
      </Alert>
    )
  }

  const content = (
    <>
      {displayLogs.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead className="w-[100px]">Source</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[80px] text-center">Items</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayLogs.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(log)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate max-w-[180px]">
                      {log.file_name || 'Imported Schedule'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {getSourceSystemLabel(log.source_system)}
                </TableCell>
                <TableCell className="text-sm">
                  {formatShortDate(log.import_date)}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    {log.activities_imported}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(log)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Upload className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No import history yet</p>
          <p className="text-sm">Import a schedule to see history here</p>
        </div>
      )}

      {/* Detail Dialog */}
      <ImportLogDetailDialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
        log={selectedLog}
      />
    </>
  )

  if (!showCard) {
    return <div className={className}>{content}</div>
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import History
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
