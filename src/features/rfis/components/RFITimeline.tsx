// File: /src/features/rfis/components/RFITimeline.tsx
// Timeline view of RFI activity including status changes, comments, and history

import { useMemo } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  History,
  MessageSquare,
  Edit3,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  FileText,
  AlertCircle,
  User,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowItemComment, WorkflowItemHistory } from '@/types/database'

export interface RFITimelineProps {
  comments: WorkflowItemComment[]
  history: WorkflowItemHistory[]
  isLoading?: boolean
  currentUserId?: string
}

// Combine comments and history into unified timeline
interface TimelineEvent {
  id: string
  type: 'comment' | 'status_change' | 'field_change' | 'created'
  timestamp: string
  userId?: string | null
  data: {
    comment?: string
    action?: string
    field?: string
    oldValue?: string | null
    newValue?: string | null
    mentionedUsers?: string[]
  }
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  created: FileText,
  status_change: CheckCircle,
  submitted: Send,
  approved: CheckCircle,
  rejected: XCircle,
  closed: Clock,
  answered: MessageSquare,
  field_change: Edit3,
  comment: MessageSquare,
  default: History,
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-secondary',
  submitted: 'bg-info-light text-primary-hover',
  answered: 'bg-success-light text-success-dark',
  approved: 'bg-success text-white',
  rejected: 'bg-error-light text-error-dark',
  closed: 'bg-slate-200 text-slate-700',
}

/**
 * RFITimeline Component
 *
 * Displays a chronological timeline of all RFI activity including:
 * - Status changes
 * - Field modifications
 * - Comments
 *
 * @example
 * ```tsx
 * <RFITimeline
 *   comments={comments}
 *   history={history}
 *   isLoading={isLoadingHistory}
 *   currentUserId={userProfile.id}
 * />
 * ```
 */
export function RFITimeline({
  comments,
  history,
  isLoading = false,
  currentUserId,
}: RFITimelineProps) {
  // Combine and sort all events chronologically
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = []

    // Add comments to timeline
    comments.forEach((comment) => {
      events.push({
        id: `comment-${comment.id}`,
        type: 'comment',
        timestamp: comment.created_at || '',
        userId: comment.created_by,
        data: {
          comment: comment.comment,
          mentionedUsers: comment.mentioned_users || [],
        },
      })
    })

    // Add history items to timeline
    history.forEach((item) => {
      const isStatusChange = item.field_changed === 'status'
      events.push({
        id: `history-${item.id}`,
        type: isStatusChange ? 'status_change' : item.action === 'created' ? 'created' : 'field_change',
        timestamp: item.changed_at || '',
        userId: item.changed_by,
        data: {
          action: item.action,
          field: item.field_changed || undefined,
          oldValue: item.old_value,
          newValue: item.new_value,
        },
      })
    })

    // Sort by timestamp, newest first
    return events.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) {return 0}
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })
  }, [comments, history])

  // Get display name for user
  const getDisplayName = (userId: string | null | undefined) => {
    if (!userId) {return 'System'}
    if (userId === currentUserId) {return 'You'}
    // In production, fetch user profile and return full name
    return userId.substring(0, 8)
  }

  // Get icon for event type
  const getEventIcon = (event: TimelineEvent) => {
    if (event.type === 'status_change' && event.data.newValue) {
      const Icon = ACTION_ICONS[event.data.newValue] || ACTION_ICONS.status_change
      return Icon
    }
    if (event.type === 'created') {
      return ACTION_ICONS.created
    }
    return ACTION_ICONS[event.type] || ACTION_ICONS.default
  }

  // Format field name for display
  const formatFieldName = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  // Highlight @mentions in comment text
  const highlightMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="text-primary font-medium">
            {part}
          </span>
        )
      }
      return part
    })
  }

  // Render event content based on type
  const renderEventContent = (event: TimelineEvent) => {
    switch (event.type) {
      case 'comment':
        return (
          <div className="text-sm text-secondary whitespace-pre-wrap">
            {highlightMentions(event.data.comment || '')}
          </div>
        )

      case 'status_change':
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-secondary">changed status from</span>
            {event.data.oldValue && (
              <Badge className={cn('text-xs capitalize', STATUS_COLORS[event.data.oldValue] || 'bg-muted')}>
                {event.data.oldValue}
              </Badge>
            )}
            <span className="text-secondary">to</span>
            <Badge className={cn('text-xs capitalize', STATUS_COLORS[event.data.newValue || ''] || 'bg-muted')}>
              {event.data.newValue}
            </Badge>
          </div>
        )

      case 'created':
        return (
          <div className="text-sm text-secondary">
            created this RFI
          </div>
        )

      case 'field_change':
        return (
          <div className="text-sm">
            <span className="text-secondary">updated </span>
            <span className="font-medium text-foreground">
              {formatFieldName(event.data.field || '')}
            </span>
            {event.data.oldValue && event.data.newValue && (
              <>
                <span className="text-secondary"> from </span>
                <span className="text-muted line-through">{event.data.oldValue}</span>
                <span className="text-secondary"> to </span>
                <span className="text-foreground">{event.data.newValue}</span>
              </>
            )}
          </div>
        )

      default:
        return (
          <div className="text-sm text-secondary">
            {event.data.action || 'Activity'}
          </div>
        )
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-disabled animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (timelineEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-muted">No activity recorded yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Activity Timeline
          <span className="text-sm font-normal text-muted">
            ({timelineEvents.length} events)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />

          {/* Timeline events */}
          <div className="space-y-6">
            {timelineEvents.map((event) => {
              const Icon = getEventIcon(event)
              const isCurrentUser = event.userId === currentUserId

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Event icon */}
                  <div
                    className={cn(
                      'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                      event.type === 'comment'
                        ? isCurrentUser
                          ? 'bg-blue-500 text-white'
                          : 'bg-muted text-secondary'
                        : event.type === 'status_change'
                        ? 'bg-success-light text-success'
                        : 'bg-muted text-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Event content */}
                  <div className="bg-surface rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-disabled" />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isCurrentUser ? 'text-primary' : 'text-foreground'
                          )}
                        >
                          {getDisplayName(event.userId)}
                        </span>
                      </div>
                      <span className="text-xs text-muted">
                        {event.timestamp
                          ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })
                          : 'Unknown time'}
                      </span>
                    </div>

                    {renderEventContent(event)}

                    {/* Full timestamp on hover */}
                    {event.timestamp && (
                      <p className="text-xs text-disabled mt-2">
                        {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
