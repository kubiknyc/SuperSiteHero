/**
 * Schedule Optimization Panel
 * Displays AI-powered schedule optimization recommendations and critical path analysis
 */

import { useState } from 'react'
import {
  Brain,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
  Clock,
  GitBranch,
  Target,
  Users,
  Check,
  X,
  TrendingUp,
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
import { useScheduleOptimization } from '../../hooks/useScheduleOptimization'
import { useAIFeatureEnabled } from '@/features/ai/hooks/useAIConfiguration'
import type { ScheduleOptimizationRecommendation, FloatOpportunity } from '@/types/ai'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface ScheduleOptimizationPanelProps {
  projectId: string
  className?: string
}

const RECOMMENDATION_TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  resequence_task: GitBranch,
  add_float: Clock,
  resource_level: Users,
  constraint_priority: Target,
  crew_optimization: Users,
  weather_adjustment: Calendar,
}

const RECOMMENDATION_TYPE_LABELS: Record<string, string> = {
  resequence_task: 'Resequence Task',
  add_float: 'Add Float',
  resource_level: 'Level Resources',
  constraint_priority: 'Prioritize Constraint',
  crew_optimization: 'Optimize Crew',
  weather_adjustment: 'Weather Adjustment',
}

export function ScheduleOptimizationPanel({
  projectId,
  className,
}: ScheduleOptimizationPanelProps) {
  const [showCriticalPath, setShowCriticalPath] = useState(false)
  const [showFloatOpportunities, setShowFloatOpportunities] = useState(false)
  const [showConstraints, setShowConstraints] = useState(false)

  const { isEnabled, isLoading: configLoading } = useAIFeatureEnabled('schedule_optimization')

  const {
    analysis,
    criticalPath,
    floatOpportunities,
    constraintPriorities,
    resourceConflicts,
    recommendations,
    criticalPathLength,
    projectDuration,
    projectEndDate,
    constraintCount,
    conflictCount,
    bottlenecks,
    isLoading,
    isAnalyzing,
    analyze,
    implementRecommendation,
    dismissRecommendation,
  } = useScheduleOptimization(projectId)

  if (configLoading || !isEnabled) {
    return null
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Schedule Optimization
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
            <Calendar className="w-5 h-5" />
            Schedule Optimization
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyze()}
            disabled={isAnalyzing}
          >
            <RefreshCw className={cn('w-4 h-4 mr-1', isAnalyzing && 'animate-spin')} />
            Analyze
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Critical Path</p>
            <p className="text-2xl font-bold">{criticalPathLength}</p>
            <p className="text-xs text-muted-foreground">activities</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Project Duration</p>
            <p className="text-2xl font-bold">{projectDuration}</p>
            <p className="text-xs text-muted-foreground">days</p>
          </div>
        </div>

        {/* Project End Date */}
        {projectEndDate && (
          <div className="flex items-center justify-between p-2 bg-primary/5 rounded-lg">
            <span className="text-sm text-muted-foreground">Projected End Date</span>
            <span className="font-medium">{format(new Date(projectEndDate), 'MMM d, yyyy')}</span>
          </div>
        )}

        {/* Warning Indicators */}
        {(constraintCount > 0 || conflictCount > 0 || bottlenecks.length > 0) && (
          <div className="flex gap-2 flex-wrap">
            {constraintCount > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {constraintCount} Constraints
              </Badge>
            )}
            {conflictCount > 0 && (
              <Badge variant="outline" className="text-red-600 border-red-200">
                <Users className="w-3 h-3 mr-1" />
                {conflictCount} Conflicts
              </Badge>
            )}
            {bottlenecks.length > 0 && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <Target className="w-3 h-3 mr-1" />
                {bottlenecks.length} Bottlenecks
              </Badge>
            )}
          </div>
        )}

        <Separator />

        {/* Recommendations */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Recommendations ({recommendations.length})
          </h4>

          {recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No optimization recommendations at this time
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {recommendations.slice(0, 10).map((rec, index) => (
                  <RecommendationCard
                    key={rec.id || index}
                    recommendation={rec}
                    onImplement={() => implementRecommendation(rec.id, 'Implemented via AI panel')}
                    onDismiss={() => dismissRecommendation(rec.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Critical Path */}
        <Collapsible open={showCriticalPath} onOpenChange={setShowCriticalPath}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <GitBranch className="w-4 h-4" />
                Critical Path Activities
              </span>
              {showCriticalPath ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {criticalPath?.activities?.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className="p-2 bg-red-50 border border-red-100 rounded text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{activity.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {activity.durationDays} days
                  </Badge>
                </div>
                {activity.trade && (
                  <span className="text-xs text-muted-foreground">{activity.trade}</span>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Float Opportunities */}
        {floatOpportunities.length > 0 && (
          <Collapsible open={showFloatOpportunities} onOpenChange={setShowFloatOpportunities}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Float Opportunities ({floatOpportunities.length})
                </span>
                {showFloatOpportunities ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {floatOpportunities.slice(0, 5).map((opp) => (
                <FloatOpportunityCard key={opp.activityId} opportunity={opp} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Constraint Priorities */}
        {constraintPriorities.length > 0 && (
          <Collapsible open={showConstraints} onOpenChange={setShowConstraints}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Priority Constraints ({constraintPriorities.length})
                </span>
                {showConstraints ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1">
              {constraintPriorities.slice(0, 5).map((constraint, i) => (
                <div
                  key={constraint.constraintId || i}
                  className={cn(
                    'p-2 rounded text-sm flex items-center gap-2',
                    constraint.priorityScore >= 80 && 'bg-red-50 border border-red-100',
                    constraint.priorityScore >= 50 && constraint.priorityScore < 80 && 'bg-amber-50 border border-amber-100',
                    constraint.priorityScore < 50 && 'bg-blue-50 border border-blue-100'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{constraint.constraintDescription}</p>
                    <p className="text-xs text-muted-foreground">
                      {constraint.activityName} - {constraint.daysUntilCritical} days until critical
                    </p>
                  </div>
                  <Badge
                    variant={constraint.priorityScore >= 80 ? 'destructive' : 'outline'}
                    className="shrink-0"
                  >
                    {constraint.priorityScore}%
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}

function RecommendationCard({
  recommendation,
  onImplement,
  onDismiss,
}: {
  recommendation: ScheduleOptimizationRecommendation
  onImplement: () => void
  onDismiss: () => void
}) {
  const Icon = RECOMMENDATION_TYPE_ICONS[recommendation.recommendation_type] || Brain

  return (
    <div className="p-3 border rounded-lg">
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {RECOMMENDATION_TYPE_LABELS[recommendation.recommendation_type] || recommendation.recommendation_type}
            </Badge>
            <Badge
              variant={recommendation.priority >= 80 ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {recommendation.priority}% priority
            </Badge>
          </div>
          <p className="text-sm">{recommendation.description}</p>
          {(recommendation.potential_days_saved || recommendation.potential_cost_savings) && (
            <div className="flex gap-3 mt-1 text-xs text-green-600">
              {recommendation.potential_days_saved && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {recommendation.potential_days_saved} days saved
                </span>
              )}
              {recommendation.potential_cost_savings && (
                <span>
                  ${recommendation.potential_cost_savings.toLocaleString()} saved
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-green-600"
                  onClick={onImplement}
                >
                  <Check className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mark as Implemented</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground"
                  onClick={onDismiss}
                >
                  <X className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dismiss</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}

function FloatOpportunityCard({ opportunity }: { opportunity: FloatOpportunity }) {
  return (
    <div className="p-2 bg-green-50 border border-green-100 rounded text-sm">
      <div className="flex items-center justify-between">
        <span className="truncate">{opportunity.activityName}</span>
        <Badge variant="outline" className="text-green-600 text-xs">
          {opportunity.potentialFloat} days float
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{opportunity.recommendation}</p>
    </div>
  )
}
