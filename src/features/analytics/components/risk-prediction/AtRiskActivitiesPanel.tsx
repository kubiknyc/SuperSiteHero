/**
 * At Risk Activities Panel
 * Displays activities with high risk scores and allows management of alerts
 */

import { useState } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
  X,
  Cloud,
  Users,
  FileQuestion,
  Calendar,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useRiskManagement } from '../../hooks/useRiskPrediction'
import { useAIFeatureEnabled } from '@/features/ai/hooks/useAIConfiguration'
import type { ActivityRiskPrediction, RiskAlert, RiskFactor } from '@/types/ai'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface AtRiskActivitiesPanelProps {
  projectId: string
  className?: string
}

const SEVERITY_STYLES = {
  critical: {
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-800',
    icon: 'text-red-500',
  },
  high: {
    bg: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    icon: 'text-orange-500',
  },
  medium: {
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-800',
    icon: 'text-amber-500',
  },
  low: {
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    icon: 'text-blue-500',
  },
}

const FACTOR_ICONS: Record<string, typeof AlertTriangle> = {
  'Open Constraints': FileQuestion,
  'Trade Performance': Users,
  'Weather': Cloud,
  'Resource Allocation': Users,
  'Critical Path': Activity,
  'Predecessor Status': Calendar,
}

export function AtRiskActivitiesPanel({
  projectId,
  className,
}: AtRiskActivitiesPanelProps) {
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null)
  const { isEnabled, isLoading: configLoading } = useAIFeatureEnabled('risk_prediction')

  const {
    analysis,
    alerts,
    criticalAlerts,
    highAlerts,
    unacknowledgedCount,
    overallRiskScore,
    atRiskActivities,
    isLoading,
    isAnalyzing,
    runAnalysis,
    acknowledge,
    resolve,
  } = useRiskManagement(projectId)

  if (configLoading || !isEnabled) {
    return null
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Risk Analysis
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unacknowledgedCount} new
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runAnalysis()}
            disabled={isAnalyzing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isAnalyzing && 'animate-spin')} />
            Analyze
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Risk Score */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">Overall Project Risk</p>
            <Progress
              value={overallRiskScore}
              className={cn(
                'h-3',
                overallRiskScore > 70 && '[&>div]:bg-red-500',
                overallRiskScore > 50 && overallRiskScore <= 70 && '[&>div]:bg-amber-500',
                overallRiskScore <= 50 && '[&>div]:bg-green-500'
              )}
            />
          </div>
          <div className="text-right">
            <p className={cn(
              'text-2xl font-bold',
              overallRiskScore > 70 && 'text-red-600',
              overallRiskScore > 50 && overallRiskScore <= 70 && 'text-amber-600',
              overallRiskScore <= 50 && 'text-green-600'
            )}>
              {overallRiskScore}%
            </p>
          </div>
        </div>

        {/* Alert Summary */}
        {(criticalAlerts.length > 0 || highAlerts.length > 0) && (
          <div className="flex gap-2">
            {criticalAlerts.length > 0 && (
              <Badge className="bg-red-100 text-red-800">
                {criticalAlerts.length} Critical
              </Badge>
            )}
            {highAlerts.length > 0 && (
              <Badge className="bg-orange-100 text-orange-800">
                {highAlerts.length} High
              </Badge>
            )}
          </div>
        )}

        <Separator />

        {/* At Risk Activities */}
        <div>
          <h4 className="text-sm font-medium mb-2">
            At-Risk Activities ({atRiskActivities.length})
          </h4>

          {atRiskActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No high-risk activities detected
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {atRiskActivities.map((prediction) => (
                  <ActivityRiskCard
                    key={prediction.activity_id}
                    prediction={prediction}
                    isExpanded={expandedActivity === prediction.activity_id}
                    onToggle={() =>
                      setExpandedActivity(
                        expandedActivity === prediction.activity_id
                          ? null
                          : prediction.activity_id
                      )
                    }
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">
                Active Alerts ({alerts.length})
              </h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {alerts.slice(0, 10).map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onAcknowledge={(userId) => acknowledge(alert.id, userId)}
                      onResolve={(notes) => resolve(alert.id, notes)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityRiskCard({
  prediction,
  isExpanded,
  onToggle,
}: {
  prediction: ActivityRiskPrediction
  isExpanded: boolean
  onToggle: () => void
}) {
  const severity = prediction.slip_risk_score >= 90 ? 'critical'
    : prediction.slip_risk_score >= 70 ? 'high'
    : prediction.slip_risk_score >= 50 ? 'medium'
    : 'low'

  const styles = SEVERITY_STYLES[severity]

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={cn('border rounded-lg', styles.bg)}>
        <CollapsibleTrigger className="w-full p-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className={cn('w-5 h-5 shrink-0', styles.icon)} />
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">Activity #{prediction.activity_id.slice(0, 8)}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={styles.badge}>
                  {prediction.slip_risk_score}% Risk
                </Badge>
                {prediction.is_on_critical_path && (
                  <Badge variant="outline" className="text-xs">
                    Critical Path
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Slip Probability</p>
              <p className="font-bold">{prediction.slip_probability}%</p>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3">
            <Separator />

            {/* Risk Factors */}
            <div>
              <p className="text-xs font-medium mb-2">Risk Factors</p>
              <div className="space-y-2">
                {prediction.risk_factors.map((factor, i) => (
                  <RiskFactorRow key={i} factor={factor} />
                ))}
              </div>
            </div>

            {/* Delay Projection */}
            <div className="p-2 bg-white/50 rounded">
              <p className="text-xs font-medium mb-1">Projected Delay</p>
              <div className="flex items-center gap-4 text-sm">
                <span>
                  <span className="text-muted-foreground">Low: </span>
                  {prediction.projected_delay_days_low} days
                </span>
                <span>
                  <span className="text-muted-foreground">Mid: </span>
                  {prediction.projected_delay_days_mid} days
                </span>
                <span>
                  <span className="text-muted-foreground">High: </span>
                  {prediction.projected_delay_days_high} days
                </span>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

function RiskFactorRow({ factor }: { factor: RiskFactor }) {
  const Icon = FACTOR_ICONS[factor.factor] || AlertCircle

  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">{factor.factor}</span>
          <span className="text-muted-foreground">{Math.round(factor.impact)}% impact</span>
        </div>
        <p className="text-xs text-muted-foreground">{factor.description}</p>
        {factor.mitigationSuggestion && (
          <p className="text-xs text-blue-600 mt-1">
            → {factor.mitigationSuggestion}
          </p>
        )}
      </div>
    </div>
  )
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: RiskAlert
  onAcknowledge: (userId: string) => void
  onResolve: (notes?: string) => void
}) {
  const styles = SEVERITY_STYLES[alert.severity]

  return (
    <div className={cn('p-3 border rounded-lg', styles.bg)}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0', styles.icon)} />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{alert.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
          {alert.recommended_actions.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger className="text-xs text-blue-600 mt-1 cursor-help">
                  {alert.recommended_actions.length} recommended action(s)
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <ul className="list-disc list-inside text-sm">
                    {alert.recommended_actions.map((action, i) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {!alert.is_acknowledged && (
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onAcknowledge('current-user')} // Would use actual user ID
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => onResolve()}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
