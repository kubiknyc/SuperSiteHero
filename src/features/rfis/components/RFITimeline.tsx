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
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  answered: 'bg-green-100 text-green-700',
  approved: 'bg-green-600 text-white',
  rejected: 'bg-red-100 text-red-700',
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
          <span key={index} className="text-blue-600 font-medium">
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
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {highlightMentions(event.data.comment || '')}
          </div>
        )

      case 'status_change':
        return (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">changed status from</span>
            {event.data.oldValue && (
              <Badge className={cn('text-xs capitalize', STATUS_COLORS[event.data.oldValue] || 'bg-gray-100')}>
                {event.data.oldValue}
              </Badge>
            )}
            <span className="text-gray-600">to</span>
            <Badge className={cn('text-xs capitalize', STATUS_COLORS[event.data.newValue || ''] || 'bg-gray-100')}>
              {event.data.newValue}
            </Badge>
          </div>
        )

      case 'created':
        return (
          <div className="text-sm text-gray-600">
            created this RFI
          </div>
        )

      case 'field_change':
        return (
          <div className="text-sm">
            <span className="text-gray-600">updated </span>
            <span className="font-medium text-gray-900">
              {formatFieldName(event.data.field || '')}
            </span>
            {event.data.oldValue && event.data.newValue && (
              <>
                <span className="text-gray-600"> from </span>
                <span className="text-gray-500 line-through">{event.data.oldValue}</span>
                <span className="text-gray-600"> to </span>
                <span className="text-gray-900">{event.data.newValue}</span>
              </>
            )}
          </div>
        )

      default:
        return (
          <div className="text-sm text-gray-600">
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
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
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
          <p className="text-gray-500">No activity recorded yet</p>
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
          <span className="text-sm font-normal text-gray-500">
            ({timelineEvents.length} events)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

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
                          : 'bg-gray-200 text-gray-600'
                        : event.type === 'status_change'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Event content */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isCurrentUser ? 'text-blue-600' : 'text-gray-900'
                          )}
                        >
                          {getDisplayName(event.userId)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {event.timestamp
                          ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })
                          : 'Unknown time'}
                      </span>
                    </div>

                    {renderEventContent(event)}

                    {/* Full timestamp on hover */}
                    {event.timestamp && (
                      <p className="text-xs text-gray-400 mt-2">
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
