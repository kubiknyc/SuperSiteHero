/**
 * NotificationItem Component
 *
 * Individual notification item with inline actions, swipe to dismiss on mobile,
 * and type-specific action buttons (RFI, Task, Approval, etc.)
 */

import { useState, useRef, useCallback, memo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell, Check, MessageSquare, FileText, Shield, DollarSign,
  Calendar, ClipboardList, CheckSquare, ChevronRight, Loader2,
  Clock, X, Eye, ExternalLink, Send, ThumbsUp, ThumbsDown,
  AlertTriangle, Users, Folder
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface NotificationItemData {
  id: string
  type: string | null
  title: string
  message: string | null
  is_read: boolean | null
  created_at: string | null
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  related_to_id: string | null
  related_to_type: string | null
  // Extended properties for rich notifications
  sender?: {
    id: string
    name: string
    avatar_url?: string
  }
  project?: {
    id: string
    name: string
  }
  link?: string
  metadata?: Record<string, unknown>
}

interface NotificationItemProps {
  notification: NotificationItemData
  onMarkAsRead: (id: string) => void
  onClick: (notification: NotificationItemData) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onSnooze?: (id: string, minutes: number) => void
  onDismiss?: (id: string) => void
  isActionPending?: boolean
  showSwipeActions?: boolean
  compact?: boolean
}

// Icon mapping for notification types
const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rfi: MessageSquare,
  submittal: FileText,
  task: CheckSquare,
  daily_report: ClipboardList,
  punch_item: CheckSquare,
  safety: Shield,
  incident: AlertTriangle,
  payment: DollarSign,
  schedule: Calendar,
  approval: ThumbsUp,
  mention: Users,
  comment: MessageSquare,
  document: Folder,
  default: Bell,
}

// Priority colors
const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-l-red-500' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-l-orange-500' },
  normal: { bg: '', text: '', border: '' },
  low: { bg: 'bg-gray-50', text: 'text-gray-600', border: '' },
}

function getIcon(type: string | null) {
  if (!type) return Bell
  const category = type.split('_')[0]
  return TYPE_ICONS[category] || TYPE_ICONS.default
}

function getNotificationCategory(type: string | null): string {
  if (!type) return 'general'
  if (type.includes('rfi')) return 'rfi'
  if (type.includes('task')) return 'task'
  if (type.includes('approval')) return 'approval'
  if (type.includes('submittal')) return 'submittal'
  if (type.includes('safety') || type.includes('incident')) return 'safety'
  return 'general'
}

export const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
  onApprove,
  onReject,
  onSnooze,
  onDismiss,
  isActionPending,
  showSwipeActions = true,
  compact = false,
}: NotificationItemProps) {
  const Icon = getIcon(notification.type)
  const category = getNotificationCategory(notification.type)
  const isRead = notification.is_read ?? false
  const priority = notification.priority || 'normal'
  const priorityStyle = PRIORITY_STYLES[priority]

  // Swipe state for mobile
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const touchStartX = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!showSwipeActions) return
    touchStartX.current = e.touches[0].clientX
    setIsSwiping(true)
  }, [showSwipeActions])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping || !showSwipeActions) return
    const diff = e.touches[0].clientX - touchStartX.current
    // Only allow left swipe (negative values) with max of -100px
    setSwipeOffset(Math.max(-100, Math.min(0, diff)))
  }, [isSwiping, showSwipeActions])

  const handleTouchEnd = useCallback(() => {
    if (!showSwipeActions) return
    setIsSwiping(false)
    if (swipeOffset < -50 && onDismiss) {
      // Dismiss if swiped more than 50px
      onDismiss(notification.id)
    }
    setSwipeOffset(0)
  }, [swipeOffset, onDismiss, notification.id, showSwipeActions])

  const handleClick = useCallback(() => {
    if (!isRead) {
      onMarkAsRead(notification.id)
    }
    onClick(notification)
  }, [isRead, notification, onMarkAsRead, onClick])

  // Render inline action buttons based on notification type
  const renderInlineActions = () => {
    const actions: React.ReactNode[] = []

    switch (category) {
      case 'rfi':
        actions.push(
          <Button
            key="view-rfi"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onClick(notification) }}
          >
            <Eye className="h-3 w-3 mr-1" />
            View RFI
          </Button>,
          <Button
            key="respond"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onClick(notification) }}
          >
            <Send className="h-3 w-3 mr-1" />
            Respond
          </Button>
        )
        break

      case 'task':
        actions.push(
          <Button
            key="view-task"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); onClick(notification) }}
          >
            <Eye className="h-3 w-3 mr-1" />
            View Task
          </Button>,
          <Button
            key="complete"
            size="sm"
            variant="outline"
            className="h-7 text-xs text-green-600"
            onClick={(e) => {
              e.stopPropagation()
              onApprove?.(notification.id)
            }}
            disabled={isActionPending}
          >
            {isActionPending ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Mark Complete
          </Button>
        )
        break

      case 'approval':
        if (onApprove && onReject) {
          actions.push(
            <Button
              key="approve"
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={(e) => { e.stopPropagation(); onApprove(notification.id) }}
              disabled={isActionPending}
            >
              {isActionPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <ThumbsUp className="h-3 w-3 mr-1" />
              )}
              Approve
            </Button>,
            <Button
              key="reject"
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => { e.stopPropagation(); onReject(notification.id) }}
              disabled={isActionPending}
            >
              <ThumbsDown className="h-3 w-3 mr-1" />
              Reject
            </Button>
          )
        }
        break

      default:
        // Generic view action
        if (notification.link || notification.related_to_id) {
          actions.push(
            <Button
              key="view"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onClick(notification) }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Button>
          )
        }
    }

    // Add snooze dropdown for all types
    if (onSnooze) {
      actions.push(
        <DropdownMenu key="snooze">
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Clock className="h-3 w-3 mr-1" />
              Snooze
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => onSnooze(notification.id, 30)}>
              30 minutes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSnooze(notification.id, 60)}>
              1 hour
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSnooze(notification.id, 240)}>
              4 hours
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSnooze(notification.id, 1440)}>
              Tomorrow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return actions.length > 0 ? (
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {actions}
      </div>
    ) : null
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe action background */}
      {showSwipeActions && (
        <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center">
          <X className="h-5 w-5 text-white" />
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          'flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-all bg-background',
          !isRead && 'bg-blue-50/50 dark:bg-blue-950/20',
          priority !== 'normal' && `border-l-4 ${priorityStyle.border}`,
          compact && 'p-3 gap-2'
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') handleClick() }}
      >
        {/* Icon / Avatar */}
        <div className="flex-shrink-0">
          {notification.sender?.avatar_url ? (
            <Avatar className={cn('h-10 w-10', compact && 'h-8 w-8')}>
              <AvatarImage src={notification.sender.avatar_url} alt={notification.sender.name} />
              <AvatarFallback>
                {notification.sender.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={cn(
              'p-2 rounded-full',
              isRead ? 'bg-muted' : 'bg-primary/10',
              compact && 'p-1.5'
            )}>
              <Icon className={cn('h-4 w-4', compact && 'h-3.5 w-3.5')} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Title */}
              <p className={cn(
                'text-sm font-medium line-clamp-1',
                !isRead && 'text-primary',
                compact && 'text-xs'
              )}>
                {notification.title}
              </p>

              {/* Sender and Project */}
              {(notification.sender || notification.project) && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {notification.sender && (
                    <span>{notification.sender.name}</span>
                  )}
                  {notification.sender && notification.project && (
                    <span>in</span>
                  )}
                  {notification.project && (
                    <span className="font-medium">{notification.project.name}</span>
                  )}
                </div>
              )}
            </div>

            {/* Mark as read button */}
            {!isRead && (
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-6 w-6 flex-shrink-0', compact && 'h-5 w-5')}
                onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id) }}
              >
                <Check className={cn('h-3 w-3', compact && 'h-2.5 w-2.5')} />
              </Button>
            )}
          </div>

          {/* Message */}
          <p className={cn(
            'text-sm text-muted-foreground line-clamp-2 mt-0.5',
            compact && 'text-xs line-clamp-1'
          )}>
            {notification.message}
          </p>

          {/* Priority badge */}
          {priority !== 'normal' && (
            <Badge
              variant="outline"
              className={cn(
                'text-xs mt-1',
                priorityStyle.text,
                priorityStyle.bg
              )}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
            </Badge>
          )}

          {/* Timestamp */}
          <p className={cn('text-xs text-muted-foreground mt-1', compact && 'mt-0.5')}>
            {notification.created_at
              ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
              : 'Just now'}
          </p>

          {/* Inline Actions */}
          {!compact && renderInlineActions()}
        </div>

        {/* Chevron indicator */}
        <ChevronRight className={cn(
          'h-4 w-4 text-muted-foreground flex-shrink-0 self-center',
          compact && 'h-3.5 w-3.5'
        )} />
      </div>
    </div>
  )
})

export default NotificationItem
