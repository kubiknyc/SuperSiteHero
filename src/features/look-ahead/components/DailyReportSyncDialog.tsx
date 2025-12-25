/**
 * Daily Report Sync Dialog
 * Syncs progress from Daily Reports to Look-Ahead Activities
 */

import { useState } from 'react'
import { format, subDays, startOfWeek } from 'date-fns'
import {
  RefreshCw,
  Link2,
  Unlink,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Loader2,
  FileText,
  Activity,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  useProgressSummaries,
  useSyncStatus,
  useBatchSync,
  useSyncActivity,
  useAutoLinkProgress,
} from '../hooks/useLookAheadSync'
import { useAuth } from '@/lib/auth/AuthContext'
import type { ActivityProgressSummary } from '@/lib/api/services/look-ahead-sync'

interface DailyReportSyncDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
}

export function DailyReportSyncDialog({
  open,
  onClose,
  projectId,
}: DailyReportSyncDialogProps) {
  const { user } = useAuth()
  const [dateFrom, setDateFrom] = useState(
    format(startOfWeek(subDays(new Date(), 14)), 'yyyy-MM-dd')
  )
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Queries
  const { data: summaries, isLoading: loadingSummaries, refetch } = useProgressSummaries(
    projectId,
    dateFrom,
    dateTo,
    open
  )
  const { data: syncStatus, isLoading: loadingStatus } = useSyncStatus(projectId, open)

  // Mutations
  const batchSync = useBatchSync()
  const syncActivity = useSyncActivity()
  const autoLink = useAutoLinkProgress()

  const needsSyncCount = summaries?.filter(s => s.needs_sync).length || 0
  const totalCount = summaries?.length || 0

  const handleBatchSync = () => {
    batchSync.mutate({
      projectId,
      dateFrom,
      dateTo,
      userId: user?.id,
      onlyNeedsSync: true,
    })
  }

  const handleAutoLink = () => {
    autoLink.mutate({ projectId, dateFrom, dateTo })
  }

  const handleSyncSingle = (summary: ActivityProgressSummary) => {
    syncActivity.mutate({
      activityId: summary.activity_id,
      summary,
      userId: user?.id,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync from Daily Reports
          </DialogTitle>
          <DialogDescription>
            Update look-ahead activities with progress tracked in daily reports
          </DialogDescription>
        </DialogHeader>

        {/* Date Range Filter */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-surface rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="dateFrom">From Date</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateTo">To Date</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted">Total Activities</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {loadingStatus ? '...' : syncStatus?.total_activities || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-success" />
                <span className="text-sm text-muted">With Progress Data</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {loadingSummaries ? '...' : totalCount}
              </p>
            </CardContent>
          </Card>
          <Card className={needsSyncCount > 0 ? 'border-orange-200 bg-orange-50' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-4 w-4 ${needsSyncCount > 0 ? 'text-orange-600' : 'text-disabled'}`} />
                <span className="text-sm text-muted">Needs Sync</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${needsSyncCount > 0 ? 'text-orange-600' : ''}`}>
                {loadingSummaries ? '...' : needsSyncCount}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleBatchSync}
            disabled={batchSync.isPending || needsSyncCount === 0}
          >
            {batchSync.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All ({needsSyncCount})
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleAutoLink}
            disabled={autoLink.isPending}
          >
            {autoLink.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Auto-Link Unlinked
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Activities List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          <h3 className="font-medium text-sm text-muted heading-subsection">Activities with Progress Data</h3>

          {loadingSummaries ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-disabled" />
            </div>
          ) : summaries && summaries.length > 0 ? (
            summaries.map((summary) => (
              <ActivitySyncCard
                key={summary.activity_id}
                summary={summary}
                onSync={() => handleSyncSingle(summary)}
                isSyncing={syncActivity.isPending}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No linked progress entries found</p>
              <p className="text-sm mt-1">
                Link daily report progress entries to look-ahead activities first
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Individual activity sync card
 */
function ActivitySyncCard({
  summary,
  onSync,
  isSyncing,
}: {
  summary: ActivityProgressSummary
  onSync: () => void
  isSyncing: boolean
}) {
  const currentPercent = summary.look_ahead_activity?.percent_complete || 0
  const newPercent = summary.cumulative_percentage

  return (
    <Card className={`${summary.needs_sync ? 'border-orange-200' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate heading-card">{summary.activity_name}</h4>
              {summary.needs_sync && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                  Needs Sync
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {summary.total_entries} report(s)
              </span>
              {summary.first_report_date && summary.last_report_date && (
                <span>
                  {summary.first_report_date === summary.last_report_date
                    ? format(new Date(summary.first_report_date), 'MMM d')
                    : `${format(new Date(summary.first_report_date), 'MMM d')} - ${format(new Date(summary.last_report_date), 'MMM d')}`}
                </span>
              )}
            </div>

            {/* Progress comparison */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-24 text-muted">Look-Ahead:</span>
                <Progress value={currentPercent} className="flex-1 h-2" />
                <span className="w-12 text-right font-mono">{currentPercent}%</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-24 text-muted">Daily Reports:</span>
                <Progress value={newPercent} className="flex-1 h-2 [&>div]:bg-green-500" />
                <span className="w-12 text-right font-mono text-success">{newPercent}%</span>
              </div>
            </div>

            {/* Status change preview */}
            {summary.needs_sync && summary.look_ahead_activity && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Badge variant="outline">{summary.look_ahead_activity.status}</Badge>
                <ArrowRight className="h-4 w-4 text-disabled" />
                <Badge className="bg-success-light text-success-dark border-green-200">
                  {summary.suggested_status}
                </Badge>
              </div>
            )}

            {/* Variance reasons */}
            {summary.variance_reasons.length > 0 && (
              <div className="mt-2 text-xs text-orange-600">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                {summary.variance_reasons.slice(0, 2).join('; ')}
                {summary.variance_reasons.length > 2 && ` +${summary.variance_reasons.length - 2} more`}
              </div>
            )}
          </div>

          {/* Sync button */}
          <Button
            size="sm"
            variant={summary.needs_sync ? 'default' : 'outline'}
            onClick={onSync}
            disabled={isSyncing || !summary.needs_sync}
          >
            {summary.needs_sync ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Sync
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Synced
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
