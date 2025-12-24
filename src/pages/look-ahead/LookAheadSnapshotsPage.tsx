/**
 * Look-Ahead Snapshots Page
 * PPC history and trend analysis
 */

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Target,
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  RefreshCw,
  Download,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  useLookAheadSnapshots,
  useCreateSnapshot,
  usePPCMetrics,
  useActivitiesByWeek,
} from '@/features/look-ahead/hooks'
import { LookAheadStats, PPCBadge } from '@/features/look-ahead/components'
import {
  type LookAheadSnapshot,
  type VarianceReason,
  formatPPC,
  getPPCStatusColor,
  calculateWeekRanges,
} from '@/types/look-ahead'

export function LookAheadSnapshotsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  // State
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [snapshotNotes, setSnapshotNotes] = useState('')
  const [selectedSnapshot, setSelectedSnapshot] = useState<LookAheadSnapshot | null>(null)

  // Queries
  const { data: snapshots, isLoading, refetch } = useLookAheadSnapshots(projectId, 20)
  const { data: ppcMetrics } = usePPCMetrics(projectId)
  const { data: weekData } = useActivitiesByWeek(projectId)

  // Mutations
  const createSnapshot = useCreateSnapshot()

  // Get current week for creating snapshot
  const weeks = calculateWeekRanges()
  const currentWeek = weeks[0]

  const handleCreateSnapshot = async () => {
    try {
      await createSnapshot.mutateAsync({
        project_id: projectId!,
        week_start_date: currentWeek.weekStart.toISOString().split('T')[0],
        notes: snapshotNotes || undefined,
      })
      toast.success('Snapshot created successfully')
      setShowCreateDialog(false)
      setSnapshotNotes('')
      refetch()
    } catch (error) {
      toast.error('Failed to create snapshot')
    }
  }

  const getTrendIcon = (current: number, previous: number | undefined) => {
    if (previous === undefined) {return <Minus className="h-4 w-4 text-disabled" />}
    const diff = current - previous
    if (diff > 0) {return <TrendingUp className="h-4 w-4 text-success" />}
    if (diff < 0) {return <TrendingDown className="h-4 w-4 text-error" />}
    return <Minus className="h-4 w-4 text-disabled" />
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/projects/${projectId}/look-ahead`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" className="heading-page">
              <BarChart3 className="h-6 w-6" />
              PPC History
            </h1>
            <p className="text-muted-foreground text-sm">
              Percent Plan Complete tracking over time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ppcMetrics && (
            <PPCBadge
              ppc={ppcMetrics.currentWeekPPC}
              showTrend
              trend={ppcMetrics.trend}
            />
          )}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Snapshot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Weekly Snapshot</DialogTitle>
                <DialogDescription>
                  Capture the current state of activities for PPC tracking.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Week Starting</p>
                    <p className="text-sm text-muted-foreground">
                      {currentWeek.weekLabel}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Add any notes about this week's performance..."
                    value={snapshotNotes}
                    onChange={(e) => setSnapshotNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSnapshot}
                  disabled={createSnapshot.isPending}
                >
                  Create Snapshot
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Current Metrics */}
      {ppcMetrics && <LookAheadStats metrics={ppcMetrics} />}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average PPC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {ppcMetrics ? formatPPC(ppcMetrics.averagePPC) : '--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last {snapshots?.length || 0} weeks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Best Week</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshots && snapshots.length > 0 ? (
              <>
                <div className="text-3xl font-bold text-success">
                  {formatPPC(Math.max(...snapshots.map((s) => s.ppc_percentage)))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(
                    snapshots.find(
                      (s) =>
                        s.ppc_percentage === Math.max(...snapshots.map((ss) => ss.ppc_percentage))
                    )?.week_start_date || ''
                  ).toLocaleDateString()}
                </p>
              </>
            ) : (
              <div className="text-3xl font-bold text-muted-foreground">--</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {ppcMetrics && (
                <>
                  {ppcMetrics.trend === 'up' && (
                    <TrendingUp className="h-8 w-8 text-success" />
                  )}
                  {ppcMetrics.trend === 'down' && (
                    <TrendingDown className="h-8 w-8 text-error" />
                  )}
                  {ppcMetrics.trend === 'stable' && (
                    <Minus className="h-8 w-8 text-disabled" />
                  )}
                  <div>
                    <div className="text-lg font-bold capitalize">{ppcMetrics.trend}</div>
                    <p className="text-xs text-muted-foreground">
                      {ppcMetrics.ppcChange >= 0 ? '+' : ''}
                      {ppcMetrics.ppcChange.toFixed(1)}% change
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Snapshots Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Snapshots
            </span>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {snapshots && snapshots.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-center">PPC</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                  <TableHead className="text-center">Planned</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead className="text-center">Delayed</TableHead>
                  <TableHead className="text-center">Blocked</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snapshot, index) => {
                  const previousSnapshot = snapshots[index + 1]
                  const ppcStatus = getPPCStatusColor(snapshot.ppc_percentage)

                  return (
                    <TableRow key={snapshot.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {new Date(snapshot.week_start_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            -{' '}
                            {new Date(snapshot.week_end_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Captured{' '}
                            {new Date(snapshot.snapshot_date).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(ppcStatus.bgColor, ppcStatus.color)}>
                          {formatPPC(snapshot.ppc_percentage)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {getTrendIcon(
                          snapshot.ppc_percentage,
                          previousSnapshot?.ppc_percentage
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {snapshot.planned_activities}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-success font-medium">
                          {snapshot.completed_activities}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {snapshot.delayed_activities > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {snapshot.delayed_activities}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {snapshot.blocked_activities > 0 ? (
                          <span className="text-error font-medium">
                            {snapshot.blocked_activities}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {snapshot.notes ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setSelectedSnapshot(snapshot)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2" className="heading-subsection">No snapshots yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first weekly snapshot to start tracking PPC
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Snapshot
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Snapshot Detail Dialog */}
      <Dialog
        open={!!selectedSnapshot}
        onOpenChange={() => setSelectedSnapshot(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Week of{' '}
              {selectedSnapshot &&
                new Date(selectedSnapshot.week_start_date).toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>
          {selectedSnapshot && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">PPC</p>
                  <p className="text-2xl font-bold">
                    {formatPPC(selectedSnapshot.ppc_percentage)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-success">
                    {selectedSnapshot.completed_activities} /{' '}
                    {selectedSnapshot.planned_activities}
                  </p>
                </div>
              </div>
              {selectedSnapshot.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">
                    {selectedSnapshot.notes}
                  </p>
                </div>
              )}
              {selectedSnapshot.variance_reasons &&
                selectedSnapshot.variance_reasons.length > 0 && (
                  <div>
                    <Label>Variance Reasons</Label>
                    <ul className="mt-1 space-y-1">
                      {selectedSnapshot.variance_reasons.map((reason, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm p-2 bg-muted rounded"
                        >
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span>{reason.description}</span>
                          <Badge variant="outline" className="ml-auto">
                            {reason.activities_affected} activities
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default LookAheadSnapshotsPage
