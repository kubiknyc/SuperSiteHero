/**
 * RFI Escalation Panel Component
 *
 * Displays overdue RFIs and provides escalation controls
 * for automatic priority escalation and reminder notifications.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AlertTriangle,
  ArrowUp,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Users,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  useOverdueRFIs,
  useEscalationStats,
  useBatchEscalateRFIs,
  type OverdueRFI,
  DEFAULT_ESCALATION_CONFIG,
} from '../hooks/useRFIEscalation'

// ============================================================================
// Types
// ============================================================================

interface RFIEscalationPanelProps {
  projectId: string
  workflowTypeId: string
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatRFINumber(number: number | null): string {
  return `RFI-${String(number || 0).padStart(4, '0')}`
}

function getDaysOverdueLabel(days: number): string {
  if (days === 1) return '1 day overdue'
  return `${days} days overdue`
}

function getSeverityColor(daysOverdue: number): string {
  if (daysOverdue >= 7) return 'text-red-700 bg-red-100'
  if (daysOverdue >= 3) return 'text-orange-700 bg-orange-100'
  return 'text-yellow-700 bg-yellow-100'
}

// ============================================================================
// Sub-Components
// ============================================================================

interface RFIEscalationItemProps {
  rfi: OverdueRFI
  projectId: string
  selected: boolean
  onSelectChange: (checked: boolean) => void
}

function RFIEscalationItem({ rfi, projectId, selected, onSelectChange }: RFIEscalationItemProps) {
  const severityColor = getSeverityColor(rfi.daysOverdue)

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-colors',
      selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
    )}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelectChange}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={`/projects/${projectId}/rfis/${rfi.id}`}
              className="font-semibold text-foreground text-sm hover:text-primary"
            >
              {formatRFINumber(rfi.number)}
            </Link>
            <Badge variant="outline" className={cn('text-xs', severityColor)}>
              {getDaysOverdueLabel(rfi.daysOverdue)}
            </Badge>
            {rfi.priority !== 'high' && rfi.shouldEscalatePriority && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ArrowUp className="h-3 w-3" />
                      Needs Escalation
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Priority will be escalated to High</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {rfi.priority === 'high' && (
              <Badge variant="destructive" className="text-xs">
                High Priority
              </Badge>
            )}
          </div>
          <p className="text-sm text-secondary truncate mb-1">{rfi.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {rfi.due_date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Due: {format(new Date(rfi.due_date), 'MMM d, yyyy')}
              </span>
            )}
            {rfi.assignees && rfi.assignees.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {rfi.assignees.length} assignee{rfi.assignees.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <Link to={`/projects/${projectId}/rfis/${rfi.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function RFIEscalationPanel({
  projectId,
  workflowTypeId,
  className,
}: RFIEscalationPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  const { data: overdueRFIs, isLoading, error } = useOverdueRFIs(
    projectId,
    workflowTypeId,
    DEFAULT_ESCALATION_CONFIG
  )
  const stats = useEscalationStats(projectId, workflowTypeId)
  const batchEscalate = useBatchEscalateRFIs()

  // Filter to only show RFIs that need escalation
  const escalatableRFIs = overdueRFIs?.filter(r => r.shouldEscalatePriority) || []

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(escalatableRFIs.map(r => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (rfiId: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) {
      newSet.add(rfiId)
    } else {
      newSet.delete(rfiId)
    }
    setSelectedIds(newSet)
  }

  const handleEscalateSelected = async () => {
    if (selectedIds.size === 0) return

    try {
      const results = await batchEscalate.mutateAsync(Array.from(selectedIds))

      toast({
        title: 'RFIs Escalated',
        description: `${results.length} RFI${results.length !== 1 ? 's' : ''} escalated to high priority`,
      })

      setSelectedIds(new Set())
    } catch (error) {
      toast({
        title: 'Escalation Failed',
        description: 'Failed to escalate some RFIs. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-5 bg-muted rounded w-48 mb-2" />
            <div className="h-4 bg-muted rounded w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-error mx-auto mb-2" />
          <p className="text-sm text-secondary">Failed to load escalation data</p>
        </CardContent>
      </Card>
    )
  }

  const hasOverdueItems = overdueRFIs && overdueRFIs.length > 0
  const hasEscalatableItems = escalatableRFIs.length > 0
  const allSelected = escalatableRFIs.length > 0 && selectedIds.size === escalatableRFIs.length

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            <CardTitle className="text-lg">RFI Escalation</CardTitle>
          </div>
          {stats.total > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.total} Overdue
            </Badge>
          )}
        </div>
        <CardDescription>
          Automatically escalate overdue RFIs to high priority
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Stats Summary */}
        {hasOverdueItems && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-error">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Overdue</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{stats.needsPriorityEscalation}</p>
                <p className="text-xs text-muted-foreground">Need Escalation</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-foreground">{stats.averageDaysOverdue}</p>
                <p className="text-xs text-muted-foreground">Avg Days Overdue</p>
              </div>
            </div>

            <Separator className="my-4" />
          </>
        )}

        {/* Escalation Actions */}
        {hasEscalatableItems && (
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-muted-foreground">
                Select all ({escalatableRFIs.length})
              </span>
            </label>
            <Button
              size="sm"
              variant="destructive"
              disabled={selectedIds.size === 0 || batchEscalate.isPending}
              onClick={handleEscalateSelected}
              className="gap-2"
            >
              <ArrowUp className="h-4 w-4" />
              {batchEscalate.isPending
                ? 'Escalating...'
                : `Escalate Selected (${selectedIds.size})`}
            </Button>
          </div>
        )}

        {/* RFI List */}
        {hasOverdueItems ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {overdueRFIs.map(rfi => (
                <RFIEscalationItem
                  key={rfi.id}
                  rfi={rfi}
                  projectId={projectId}
                  selected={selectedIds.has(rfi.id)}
                  onSelectChange={(checked) => handleSelectOne(rfi.id, checked)}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <p className="text-secondary font-medium">All Clear!</p>
            <p className="text-sm text-muted-foreground">No overdue RFIs requiring escalation</p>
          </div>
        )}

        {/* Info Footer */}
        {hasEscalatableItems && (
          <div className="mt-4 p-3 bg-info-light rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <Bell className="h-4 w-4 text-info mt-0.5" />
              <div>
                <p className="font-medium text-info-dark">Escalation Policy</p>
                <p className="text-info-dark/80 text-xs mt-1">
                  RFIs overdue by {DEFAULT_ESCALATION_CONFIG.highPriorityThreshold}+ business days
                  are automatically flagged for priority escalation. Escalating to high priority
                  ensures immediate attention from the team.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RFIEscalationPanel
