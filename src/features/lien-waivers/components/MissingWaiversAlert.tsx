/**
 * Missing Waivers Alert Component
 * Dashboard alert for missing/overdue lien waivers
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  Clock,
  FileText,
  ChevronRight,
  DollarSign,
  Building2,
  FolderOpen,
} from 'lucide-react'
import { useMissingWaiversSummary, useMissingWaivers } from '../hooks/useMissingWaivers'
import type { MissingWaiver } from '../hooks/useMissingWaivers'
import { cn } from '@/lib/utils'

interface MissingWaiversAlertProps {
  onViewWaiver?: (waiver: MissingWaiver) => void
  onViewAll?: () => void
  onViewProject?: (projectId: string) => void
  compact?: boolean
  maxItems?: number
  className?: string
}

const WAIVER_TYPE_LABELS: Record<string, string> = {
  conditional_progress: 'Conditional Progress',
  unconditional_progress: 'Unconditional Progress',
  conditional_final: 'Conditional Final',
  unconditional_final: 'Unconditional Final',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Compact alert banner for dashboard header
 */
export function MissingWaiversAlertBanner({
  onViewAll,
  className,
}: {
  onViewAll?: () => void
  className?: string
}) {
  const { data: summary, isLoading } = useMissingWaiversSummary()

  if (isLoading) {
    return null
  }

  if (!summary || (summary.total_missing === 0 && summary.total_overdue === 0)) {
    return null
  }

  return (
    <Alert
      variant={summary.total_overdue > 0 ? 'destructive' : 'default'}
      className={cn('border-l-4', className)}
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Lien Waivers Need Attention</span>
        {onViewAll && (
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="flex items-center gap-4">
        {summary.total_overdue > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <Clock className="h-3 w-3" />
            {summary.total_overdue} overdue
          </span>
        )}
        {summary.total_pending > 0 && (
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {summary.total_pending} pending
          </span>
        )}
        <span className="flex items-center gap-1 text-muted-foreground">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(summary.total_amount_at_risk)} at risk
        </span>
      </AlertDescription>
    </Alert>
  )
}

/**
 * Full missing waivers panel for dashboard
 */
export function MissingWaiversAlert({
  onViewWaiver,
  onViewAll,
  onViewProject,
  compact = false,
  maxItems = 5,
  className,
}: MissingWaiversAlertProps) {
  const { data: summary, isLoading: summaryLoading } = useMissingWaiversSummary()
  const { data: waivers, isLoading: waiversLoading } = useMissingWaivers()

  if (summaryLoading || waiversLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.total_missing === 0) {
    return null // Don't show if no missing waivers
  }

  const displayWaivers = waivers?.slice(0, maxItems) || []
  const hasMore = (waivers?.length || 0) > maxItems

  if (compact) {
    return (
      <MissingWaiversAlertBanner onViewAll={onViewAll} className={className} />
    )
  }

  return (
    <Card className={cn('border-l-4', summary.total_overdue > 0 ? 'border-l-red-500' : 'border-l-yellow-500', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Missing Lien Waivers
            <Badge variant={summary.total_overdue > 0 ? 'destructive' : 'secondary'}>
              {summary.total_missing}
            </Badge>
          </CardTitle>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{summary.total_overdue}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{summary.total_pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{formatCurrency(summary.total_amount_at_risk)}</div>
            <div className="text-xs text-muted-foreground">At Risk</div>
          </div>
        </div>

        {/* Waiver List */}
        <ScrollArea className="max-h-[300px]">
          <div className="divide-y">
            {displayWaivers.map((waiver) => (
              <div
                key={waiver.id}
                className={cn(
                  'p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                  waiver.days_overdue > 0 && 'bg-red-50 hover:bg-red-100'
                )}
                onClick={() => onViewWaiver?.(waiver)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        waiver.days_overdue > 0 ? 'bg-red-100' : 'bg-yellow-100'
                      )}
                    >
                      <FileText
                        className={cn(
                          'h-4 w-4',
                          waiver.days_overdue > 0 ? 'text-red-600' : 'text-yellow-600'
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {WAIVER_TYPE_LABELS[waiver.waiver_type] || waiver.waiver_type}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {waiver.subcontractor_name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FolderOpen className="h-3 w-3" />
                        {waiver.project_name} - App #{waiver.application_number}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">{formatCurrency(waiver.amount)}</div>
                    {waiver.days_overdue > 0 ? (
                      <Badge variant="destructive" className="text-xs mt-1">
                        {waiver.days_overdue} days overdue
                      </Badge>
                    ) : (
                      <div className="text-xs text-muted-foreground mt-1">
                        Due: {formatDate(waiver.due_date)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Projects with Issues */}
        {summary.by_project.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">BY PROJECT</p>
            <div className="space-y-1">
              {summary.by_project.slice(0, 3).map((project) => (
                <div
                  key={project.project_id}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => onViewProject?.(project.project_id)}
                >
                  <span className="text-sm">{project.project_name}</span>
                  <div className="flex items-center gap-2">
                    {project.overdue_count > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {project.overdue_count} overdue
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {project.missing_count} total
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View More */}
        {hasMore && (
          <Button variant="outline" size="sm" className="w-full" onClick={onViewAll}>
            View {(waivers?.length || 0) - maxItems} more waivers
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default MissingWaiversAlert
