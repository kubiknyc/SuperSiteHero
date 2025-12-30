/**
 * Meeting Action Item Extractor
 * Extracts and displays AI-identified action items from meeting notes
 */

import { useState } from 'react'
import {
  Brain,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  ListChecks,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
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
import { useMeetingActionItemsWorkflow } from '../hooks/useSmartSummaries'
import { useAIFeatureEnabled } from '@/features/ai/hooks/useAIConfiguration'
import type { AIExtractedActionItem } from '@/types/ai'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface MeetingActionItemExtractorProps {
  meetingId: string
  onActionItemConfirmed?: (item: AIExtractedActionItem) => void
  className?: string
}

const PRIORITY_COLORS = {
  high: 'bg-error-light text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-success-light text-green-800 border-green-200',
}

const STATUS_COLORS = {
  extracted: 'bg-info-light text-blue-800',
  confirmed: 'bg-success-light text-green-800',
  rejected: 'bg-muted text-muted line-through',
  completed: 'bg-purple-100 text-purple-800',
}

export function MeetingActionItemExtractor({
  meetingId,
  onActionItemConfirmed,
  className,
}: MeetingActionItemExtractorProps) {
  const [expanded, setExpanded] = useState(true)
  const [showDecisions, setShowDecisions] = useState(false)
  const { isEnabled, isLoading: configLoading } = useAIFeatureEnabled('smart_summaries')

  const {
    data,
    isLoading,
    isExtracting,
    error: _error,
    extract,
    reextract,
    confirmItem,
    rejectItem,
    completeItem,
  } = useMeetingActionItemsWorkflow(meetingId)

  if (configLoading || !isEnabled) {
    return null
  }

  if (isLoading) {
    return (
      <Card className={cn('border-primary/20', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="pt-6 text-center">
          <ListChecks className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            Extract action items from meeting notes using AI
          </p>
          <Button
            onClick={() => extract()}
            disabled={isExtracting}
            size="sm"
          >
            {isExtracting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Extract Action Items
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const pendingItems = data.actionItems.filter(i => i.status === 'extracted')
  const confirmedItems = data.actionItems.filter(i => i.status === 'confirmed')
  const completedItems = data.actionItems.filter(i => i.status === 'completed')

  return (
    <Card className={cn('border-primary/20', className)}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Action Items
              <Badge variant="secondary" className="ml-1">
                {data.actionItems.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => reextract()}
                disabled={isExtracting}
                className="h-7 px-2"
              >
                <RefreshCw className={cn('w-3 h-3', isExtracting && 'animate-spin')} />
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
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Summary */}
            {data.summary.summary_content && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">{data.summary.summary_content}</p>
              </div>
            )}

            {/* Status tabs */}
            <div className="flex gap-2 text-xs">
              <Badge variant={pendingItems.length > 0 ? 'default' : 'secondary'}>
                {pendingItems.length} pending review
              </Badge>
              <Badge variant="outline" className="text-success">
                {confirmedItems.length} confirmed
              </Badge>
              <Badge variant="outline" className="text-purple-600">
                {completedItems.length} completed
              </Badge>
            </div>

            {/* Action Items List */}
            <div className="space-y-2">
              {data.actionItems.map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onConfirm={() => {
                    confirmItem(item.id)
                    onActionItemConfirmed?.(item)
                  }}
                  onReject={() => rejectItem(item.id)}
                  onComplete={() => completeItem(item.id)}
                />
              ))}
            </div>

            {/* Decisions */}
            {data.decisions.length > 0 && (
              <Collapsible open={showDecisions} onOpenChange={setShowDecisions}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Decisions Made ({data.decisions.length})
                    </span>
                    {showDecisions ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {data.decisions.map((decision, i) => (
                    <div key={i} className="p-2 bg-success-light rounded text-sm flex items-start gap-2">
                      <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      {decision}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Next Meeting Topics */}
            {data.nextMeetingTopics.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Topics for Next Meeting</p>
                <div className="flex flex-wrap gap-1">
                  {data.nextMeetingTopics.map((topic, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function ActionItemCard({
  item,
  onConfirm,
  onReject,
  onComplete,
}: {
  item: AIExtractedActionItem
  onConfirm: () => void
  onReject: () => void
  onComplete: () => void
}) {
  const isActionable = item.status === 'extracted'
  const isConfirmed = item.status === 'confirmed'

  return (
    <div
      className={cn(
        'p-3 border rounded-lg',
        item.status === 'rejected' && 'opacity-50',
        PRIORITY_COLORS[item.priority]
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox for confirmed items */}
        {isConfirmed && (
          <Checkbox
            checked={item.status === 'completed'}
            onCheckedChange={(checked) => {
              if (checked) {onComplete()}
            }}
            className="mt-1"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Description */}
          <p className={cn(
            'text-sm',
            item.status === 'completed' && 'line-through text-muted-foreground'
          )}>
            {item.action_description}
          </p>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {item.assignee_name && (
              <Badge variant="outline" className="text-xs gap-1">
                <User className="w-3 h-3" />
                {item.assignee_name}
              </Badge>
            )}
            {item.due_date && (
              <Badge variant="outline" className="text-xs gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(item.due_date), 'MMM d')}
              </Badge>
            )}
            <Badge className={cn('text-xs', STATUS_COLORS[item.status])}>
              {item.status}
            </Badge>
          </div>

          {/* Source text */}
          {item.source_text && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-muted-foreground mt-2 truncate cursor-help">
                    Source: "{item.source_text}"
                  </p>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-sm">"{item.source_text}"</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Actions */}
        {isActionable && (
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-success hover:text-success-dark hover:bg-success-light"
              onClick={onConfirm}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-error hover:text-error-dark hover:bg-error-light"
              onClick={onReject}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
