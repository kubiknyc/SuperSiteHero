/**
 * Pattern Insights Component
 *
 * Displays detected patterns, alerts, and recommendations
 * for proactive safety management.
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  PATTERN_TYPE_CONFIG,
  ALERT_SEVERITY_CONFIG,
  type NearMissPattern,
  type NearMissAlert,
  type PatternStatus,
  type AlertSeverity,
  type Recommendation,
} from '@/types/near-miss-analytics'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronRight,
  Eye,
  Lightbulb,
  TrendingUp,
  X,
  Clock,
  MapPin,
  GitBranch,
  Users,
  Cloud,
  Calendar,
  Wrench,
} from 'lucide-react'

// Icon mapping for pattern types
const PatternIcons: Record<string, typeof TrendingUp> = {
  MapPin,
  Clock,
  GitBranch,
  TrendingUp,
  Calendar,
  Users,
  Cloud,
  Wrench,
}

// ============================================================================
// Pattern Card Component
// ============================================================================

interface PatternCardProps {
  pattern: NearMissPattern
  onAcknowledge?: (id: string) => void
  onInvestigate?: (id: string) => void
  onDismiss?: (id: string, reason?: string) => void
  onResolve?: (id: string, notes?: string) => void
}

export function PatternCard({
  pattern,
  onAcknowledge,
  onInvestigate,
  onDismiss,
  onResolve,
}: PatternCardProps) {
  const [showDismissDialog, setShowDismissDialog] = useState(false)
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [notes, setNotes] = useState('')

  const config = PATTERN_TYPE_CONFIG[pattern.pattern_type]
  const IconComponent = PatternIcons[config?.icon || 'TrendingUp'] || TrendingUp

  const statusColors: Record<PatternStatus, string> = {
    new: 'bg-info-light text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    acknowledged: 'bg-warning-light text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    investigating: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    resolved: 'bg-success-light text-green-800 dark:bg-green-900/30 dark:text-green-400',
    dismissed: 'bg-muted text-foreground dark:bg-background/30 dark:text-disabled',
  }

  return (
    <>
      <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{config?.label || pattern.pattern_type}</span>
              <Badge className={cn('text-xs', statusColors[pattern.status])}>
                {pattern.status.replace('_', ' ')}
              </Badge>
              {pattern.confidence_score && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(pattern.confidence_score * 100)}% confidence
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-2">
              {pattern.pattern_data.description}
            </p>

            {/* Pattern details */}
            <div className="flex flex-wrap gap-2 mb-3">
              {pattern.pattern_data.location && (
                <Badge variant="outline" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {pattern.pattern_data.location}
                </Badge>
              )}
              {pattern.pattern_data.incident_count && (
                <Badge variant="outline" className="text-xs">
                  {pattern.pattern_data.incident_count} incidents
                </Badge>
              )}
              {pattern.pattern_data.hour_of_day !== undefined && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {pattern.pattern_data.hour_of_day}:00
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            {pattern.status !== 'resolved' && pattern.status !== 'dismissed' && (
              <div className="flex flex-wrap gap-2">
                {pattern.status === 'new' && onAcknowledge && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAcknowledge(pattern.id)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Acknowledge
                  </Button>
                )}
                {(pattern.status === 'new' || pattern.status === 'acknowledged') &&
                  onInvestigate && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onInvestigate(pattern.id)}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Investigate
                    </Button>
                  )}
                {onResolve && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-success hover:text-success-dark"
                    onClick={() => setShowResolveDialog(true)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => setShowDismissDialog(true)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </div>

          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(pattern.detection_date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Dismiss Dialog */}
      <Dialog open={showDismissDialog} onOpenChange={setShowDismissDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Pattern</DialogTitle>
            <DialogDescription>
              Provide a reason for dismissing this pattern (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for dismissal..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDismissDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onDismiss?.(pattern.id, notes)
                setShowDismissDialog(false)
                setNotes('')
              }}
            >
              Dismiss Pattern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Pattern</DialogTitle>
            <DialogDescription>
              Add notes about how this pattern was addressed.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Resolution notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onResolve?.(pattern.id, notes)
                setShowResolveDialog(false)
                setNotes('')
              }}
            >
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================================
// Alert Card Component
// ============================================================================

interface AlertCardProps {
  alert: NearMissAlert
  onMarkRead?: (id: string) => void
  onDismiss?: (id: string) => void
}

export function AlertCard({ alert, onMarkRead, onDismiss }: AlertCardProps) {
  const severityIcons: Record<AlertSeverity, typeof AlertTriangle> = {
    info: Bell,
    warning: AlertTriangle,
    critical: AlertTriangle,
  }
  const Icon = severityIcons[alert.severity]

  return (
    <div
      className={cn(
        'p-3 rounded-lg border flex items-start gap-3',
        !alert.is_read && 'bg-muted/50',
        alert.severity === 'critical' && 'border-red-200 dark:border-red-800'
      )}
    >
      <div
        className={cn(
          'p-1.5 rounded-full',
          ALERT_SEVERITY_CONFIG[alert.severity].bgColor
        )}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: ALERT_SEVERITY_CONFIG[alert.severity].color }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{alert.title}</span>
          <Badge
            className={cn('text-xs', ALERT_SEVERITY_CONFIG[alert.severity].bgColor)}
            style={{ color: ALERT_SEVERITY_CONFIG[alert.severity].color }}
          >
            {alert.severity}
          </Badge>
        </div>
        {alert.description && (
          <p className="text-sm text-muted-foreground">{alert.description}</p>
        )}
        <span className="text-xs text-muted-foreground">
          {new Date(alert.created_at).toLocaleString()}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {!alert.is_read && onMarkRead && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMarkRead(alert.id)}
          >
            <Eye className="h-3 w-3" />
          </Button>
        )}
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDismiss(alert.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Patterns List Component
// ============================================================================

interface PatternsListProps {
  patterns: NearMissPattern[] | undefined
  isLoading?: boolean
  onUpdatePattern?: (id: string, status: PatternStatus, notes?: string) => void
  emptyMessage?: string
  className?: string
}

export function PatternsList({
  patterns,
  isLoading,
  onUpdatePattern,
  emptyMessage = 'No patterns detected.',
  className,
}: PatternsListProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Detected Patterns
        </CardTitle>
        <CardDescription>
          Patterns identified from near-miss incident analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!patterns || patterns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{emptyMessage}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {patterns.map(pattern => (
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  onAcknowledge={
                    onUpdatePattern
                      ? id => onUpdatePattern(id, 'acknowledged')
                      : undefined
                  }
                  onInvestigate={
                    onUpdatePattern
                      ? id => onUpdatePattern(id, 'investigating')
                      : undefined
                  }
                  onResolve={
                    onUpdatePattern
                      ? (id, notes) => onUpdatePattern(id, 'resolved', notes)
                      : undefined
                  }
                  onDismiss={
                    onUpdatePattern
                      ? (id, reason) => onUpdatePattern(id, 'dismissed', reason)
                      : undefined
                  }
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Alerts List Component
// ============================================================================

interface AlertsListProps {
  alerts: NearMissAlert[] | undefined
  isLoading?: boolean
  onMarkRead?: (id: string) => void
  onDismiss?: (id: string) => void
  maxItems?: number
  className?: string
}

export function AlertsList({
  alerts,
  isLoading,
  onMarkRead,
  onDismiss,
  maxItems = 5,
  className,
}: AlertsListProps) {
  const visibleAlerts = alerts?.slice(0, maxItems) || []
  const hasMore = (alerts?.length || 0) > maxItems

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Active Alerts
          {alerts && alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!alerts || alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-sm">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onMarkRead={onMarkRead}
                onDismiss={onDismiss}
              />
            ))}
            {hasMore && (
              <Button variant="ghost" className="w-full text-sm">
                View all {alerts.length} alerts
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Recommendations Component
// ============================================================================

interface RecommendationsProps {
  recommendations: Recommendation[]
  isLoading?: boolean
  onActionClick?: (recommendation: Recommendation, action: string) => void
  className?: string
}

export function RecommendationsList({
  recommendations,
  isLoading,
  onActionClick,
  className,
}: RecommendationsProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const priorityColors = {
    high: 'border-l-red-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-green-500',
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Recommendations
        </CardTitle>
        <CardDescription>
          Suggested actions based on pattern analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recommendations available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={cn(
                  'p-4 border rounded-lg border-l-4',
                  priorityColors[rec.priority]
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {rec.category}
                  </Badge>
                  <Badge
                    variant={rec.priority === 'high' ? 'destructive' : 'secondary'}
                    className="text-xs capitalize"
                  >
                    {rec.priority} Priority
                  </Badge>
                </div>

                <h4 className="font-medium text-sm mb-1" className="heading-card">{rec.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Suggested Actions:
                  </span>
                  <ul className="text-sm space-y-1">
                    {rec.suggested_actions.map((action: string, actionIndex: number) => (
                      <li
                        key={actionIndex}
                        className={cn(
                          'flex items-center gap-2',
                          onActionClick && 'cursor-pointer hover:text-primary'
                        )}
                        onClick={() => onActionClick?.(rec, action)}
                      >
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PatternsList
