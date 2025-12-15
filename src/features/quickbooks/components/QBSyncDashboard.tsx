/**
 * QuickBooks Sync Dashboard
 *
 * Overview of sync status, stats, and recent activity
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  FileText,
  Receipt,
  Loader2,
} from 'lucide-react'
import { useQBDashboard, useBulkSync, useQBConnectionStatus } from '../hooks/useQuickBooks'
import { QBSyncStatusBadge } from './QBSyncStatusBadge'
import { QBSyncLogTable } from './QBSyncLogTable'
import { QBPendingSyncsList } from './QBPendingSyncsList'
import { formatDistanceToNow } from 'date-fns'
import type { QBEntityType } from '@/types/quickbooks'

const ENTITY_ICONS: Record<QBEntityType, React.ReactNode> = {
  vendor: <Users className="h-4 w-4" />,
  customer: <Users className="h-4 w-4" />,
  invoice: <FileText className="h-4 w-4" />,
  bill: <Receipt className="h-4 w-4" />,
  payment: <ArrowUpRight className="h-4 w-4" />,
  expense: <ArrowDownRight className="h-4 w-4" />,
  account: <FileText className="h-4 w-4" />,
  journal_entry: <FileText className="h-4 w-4" />,
}

const ENTITY_LABELS: Record<QBEntityType, string> = {
  vendor: 'Vendors',
  customer: 'Customers',
  invoice: 'Invoices',
  bill: 'Bills',
  payment: 'Payments',
  expense: 'Expenses',
  account: 'Accounts',
  journal_entry: 'Journal Entries',
}

export function QBSyncDashboard() {
  const { data: dashboard, isLoading, refetch } = useQBDashboard()
  const { data: connectionStatus } = useQBConnectionStatus()
  const bulkSync = useBulkSync()

  const handleSyncAll = async () => {
    if (!connectionStatus?.connectionId) {return}
    try {
      await bulkSync.mutateAsync({
        connectionId: connectionStatus.connectionId,
        dto: { entity_type: 'all' },
      })
      refetch()
    } catch (error) {
      console.error('Failed to sync all:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Unable to load dashboard data.
      </div>
    )
  }

  const { stats, recentLogs, pendingItems } = dashboard

  // Calculate overall sync progress
  const totalEntities = stats.totalMappedEntities
  const syncedCount = Object.values(stats.syncsByEntityType).reduce(
    (sum, entity) => sum + entity.synced,
    0
  )
  const syncProgress = totalEntities > 0 ? Math.round((syncedCount / totalEntities) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mapped</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMappedEntities}</div>
            <p className="text-xs text-muted-foreground">Entities linked to QuickBooks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Syncs</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingSyncs}</div>
            <p className="text-xs text-muted-foreground">Waiting to be synced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Syncs</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedSyncs}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastSyncAt
                ? formatDistanceToNow(new Date(stats.lastSyncAt), { addSuffix: true })
                : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">Completed sync</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Progress by Entity Type */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sync Status by Type</CardTitle>
            <CardDescription>
              Overall progress: {syncProgress}% synced
            </CardDescription>
          </div>
          <Button
            onClick={handleSyncAll}
            disabled={bulkSync.isPending || !connectionStatus?.isConnected}
          >
            {bulkSync.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync All
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(['vendor', 'invoice', 'bill', 'expense'] as QBEntityType[]).map((entityType) => {
              const entityStats = stats.syncsByEntityType[entityType]
              const progress =
                entityStats.total > 0
                  ? Math.round((entityStats.synced / entityStats.total) * 100)
                  : 0

              return (
                <div key={entityType} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {ENTITY_ICONS[entityType]}
                      <span className="font-medium">{ENTITY_LABELS[entityType]}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{entityStats.synced}/{entityStats.total} synced</span>
                      {entityStats.pending > 0 && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {entityStats.pending} pending
                        </Badge>
                      )}
                      {entityStats.failed > 0 && (
                        <Badge variant="destructive">
                          {entityStats.failed} failed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout: Recent Logs and Pending Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sync Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sync Activity</CardTitle>
            <CardDescription>Last 10 sync operations</CardDescription>
          </CardHeader>
          <CardContent>
            <QBSyncLogTable logs={recentLogs} compact />
          </CardContent>
        </Card>

        {/* Pending/Failed Syncs */}
        <Card>
          <CardHeader>
            <CardTitle>Pending & Failed</CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <QBPendingSyncsList items={pendingItems} compact />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
