/**
 * Daily Report Summary Card
 * Displays AI-generated summary for daily construction reports
 */

import { useState } from 'react'
import {
  Brain,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useDailyReportSummaryWorkflow } from '../hooks/useSmartSummaries'
import { useAIFeatureEnabled } from '@/features/ai/hooks/useAIConfiguration'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface DailyReportSummaryCardProps {
  reportId: string
  className?: string
}

export function DailyReportSummaryCard({
  reportId,
  className,
}: DailyReportSummaryCardProps) {
  const [expanded, setExpanded] = useState(true)
  const { isEnabled, isLoading: configLoading } = useAIFeatureEnabled('smart_summaries')

  const {
    data,
    isLoading,
    isGenerating,
    error: _error,
    generate,
    regenerate,
  } = useDailyReportSummaryWorkflow(reportId)

  // Don't render if AI not enabled
  if (configLoading || !isEnabled) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  // No summary yet
  if (!data) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="pt-6 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            Generate an AI summary of this daily report
          </p>
          <Button
            onClick={() => generate()}
            disabled={isGenerating}
            size="sm"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-primary/20', className)}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI Summary
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => regenerate()}
                disabled={isGenerating}
                className="h-7 px-2"
              >
                <RefreshCw className={cn('w-3 h-3', isGenerating && 'animate-spin')} />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  {expanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          {data.summary.generated_at && (
            <p className="text-xs text-muted-foreground">
              Generated {formatDistanceToNow(new Date(data.summary.generated_at), { addSuffix: true })}
            </p>
          )}
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Executive Summary */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{data.summary.summary_content}</p>
            </div>

            {/* Highlights */}
            {data.highlights.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium">Highlights</span>
                </div>
                <ul className="space-y-1">
                  {data.highlights.map((highlight, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {data.concerns.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium">Concerns</span>
                </div>
                <ul className="space-y-1">
                  {data.concerns.map((concern, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-warning mt-1">•</span>
                      {concern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tomorrow's Focus */}
            {data.tomorrowFocus.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Tomorrow's Focus</span>
                </div>
                <ul className="space-y-1">
                  {data.tomorrowFocus.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metrics */}
            {data.summary.metrics && (
              <div className="flex gap-4 pt-2 border-t">
                {data.summary.metrics.workersOnSite !== undefined && (
                  <div className="text-center">
                    <p className="text-lg font-bold">{data.summary.metrics.workersOnSite}</p>
                    <p className="text-xs text-muted-foreground">Workers</p>
                  </div>
                )}
                {data.summary.metrics.hoursWorked !== undefined && (
                  <div className="text-center">
                    <p className="text-lg font-bold">{data.summary.metrics.hoursWorked}</p>
                    <p className="text-xs text-muted-foreground">Hours</p>
                  </div>
                )}
                {data.summary.metrics.safetyIncidents !== undefined && (
                  <div className="text-center">
                    <p className={cn(
                      'text-lg font-bold',
                      data.summary.metrics.safetyIncidents > 0 ? 'text-error' : 'text-success'
                    )}>
                      {data.summary.metrics.safetyIncidents}
                    </p>
                    <p className="text-xs text-muted-foreground">Safety Incidents</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
