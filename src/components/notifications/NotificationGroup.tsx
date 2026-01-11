/**
 * NotificationGroup Component
 *
 * Groups notifications by time, type, project, or sender with collapsible sections,
 * count badges, and "mark all as read" functionality
 */

import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, CheckCheck, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationItem, type NotificationItemData } from './NotificationItem'

export type GroupByType = 'project' | 'type' | 'date' | 'sender' | 'time' | 'priority'

export interface NotificationGroupData {
  key: string
  label: string
  notifications: NotificationItemData[]
  count: number
  unreadCount: number
  icon?: React.ComponentType<{ className?: string }>
  color?: string
  metadata?: {
    projectId?: string
    senderId?: string
    senderName?: string
    senderAvatar?: string
  }
}

interface NotificationGroupProps {
  group: NotificationGroupData
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead?: (notificationIds: string[]) => void
  onClick: (notification: NotificationItemData) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onSnooze?: (id: string, minutes: number) => void
  onDismiss?: (id: string) => void
  isActionPending?: (id: string) => boolean
  defaultExpanded?: boolean
  collapsible?: boolean
  showMarkAllAsRead?: boolean
  className?: string
}

export function NotificationGroup({
  group,
  onMarkAsRead,
  onMarkAllAsRead,
  onClick,
  onApprove,
  onReject,
  onSnooze,
  onDismiss,
  isActionPending,
  defaultExpanded = true,
  collapsible = true,
  showMarkAllAsRead = true,
  className,
}: NotificationGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleMarkAllAsRead = useCallback(() => {
    if (onMarkAllAsRead && group.unreadCount > 0) {
      const unreadIds = group.notifications
        .filter(n => !n.is_read)
        .map(n => n.id)
      onMarkAllAsRead(unreadIds)
    }
  }, [onMarkAllAsRead, group.notifications, group.unreadCount])

  const handleToggleExpanded = useCallback(() => {
    if (collapsible) {
      setIsExpanded(prev => !prev)
    }
  }, [collapsible])

  if (group.notifications.length === 0) {
    return null
  }

  const GroupIcon = group.icon
  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

  return (
    <div className={cn('border-b last:border-b-0', className)}>
      {/* Group Header */}
      <div
        className={cn(
          'px-4 py-3 bg-muted/50 sticky top-0 z-10 flex items-center justify-between gap-2',
          collapsible && 'cursor-pointer hover:bg-muted/70 transition-colors'
        )}
        onClick={handleToggleExpanded}
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            handleToggleExpanded()
          }
        }}
        aria-expanded={collapsible ? isExpanded : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          {collapsible && (
            <ChevronIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}

          {GroupIcon && (
            <div
              className={cn(
                'flex-shrink-0 p-1.5 rounded-md',
                group.color || 'bg-primary/10'
              )}
            >
              <GroupIcon className="h-3.5 w-3.5" />
            </div>
          )}

          <span className="text-sm font-medium truncate">{group.label}</span>

          {/* Count Badges */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant="secondary" className="text-xs h-5 min-w-[1.25rem] justify-center">
              {group.count}
            </Badge>
            {group.unreadCount > 0 && (
              <Badge variant="default" className="text-xs h-5 min-w-[1.25rem] justify-center bg-primary">
                {group.unreadCount} new
              </Badge>
            )}
          </div>
        </div>

        {/* Mark All as Read Button */}
        {showMarkAllAsRead && group.unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              handleMarkAllAsRead()
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Mark all read</span>
          </Button>
        )}
      </div>

      {/* Notification List */}
      {isExpanded && (
        <div className="divide-y divide-border">
          {group.notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onClick={onClick}
              onApprove={onApprove}
              onReject={onReject}
              onSnooze={onSnooze}
              onDismiss={onDismiss}
              isActionPending={isActionPending?.(notification.id)}
            />
          ))}
        </div>
      )}

      {/* Collapsed Preview */}
      {!isExpanded && group.unreadCount > 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30">
          Click to show {group.count} notification{group.count !== 1 ? 's' : ''}
          {group.unreadCount > 0 && ` (${group.unreadCount} unread)`}
        </div>
      )}
    </div>
  )
}

/**
 * NotificationGroupList - Renders multiple notification groups
 */
interface NotificationGroupListProps {
  groups: NotificationGroupData[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead?: (notificationIds: string[]) => void
  onClick: (notification: NotificationItemData) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onSnooze?: (id: string, minutes: number) => void
  onDismiss?: (id: string) => void
  isActionPending?: (id: string) => boolean
  emptyMessage?: string
  showCollapseAll?: boolean
  className?: string
}

export function NotificationGroupList({
  groups,
  onMarkAsRead,
  onMarkAllAsRead,
  onClick,
  onApprove,
  onReject,
  onSnooze,
  onDismiss,
  isActionPending,
  emptyMessage = 'No notifications',
  showCollapseAll = true,
  className,
}: NotificationGroupListProps) {
  const [allExpanded, setAllExpanded] = useState(true)

  const totalCount = groups.reduce((sum, g) => sum + g.count, 0)
  const totalUnread = groups.reduce((sum, g) => sum + g.unreadCount, 0)

  const handleMarkAllAsRead = useCallback(() => {
    if (onMarkAllAsRead && totalUnread > 0) {
      const allUnreadIds = groups.flatMap(g =>
        g.notifications.filter(n => !n.is_read).map(n => n.id)
      )
      onMarkAllAsRead(allUnreadIds)
    }
  }, [onMarkAllAsRead, groups, totalUnread])

  if (groups.length === 0 || totalCount === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <EyeOff className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('divide-y divide-border', className)}>
      {/* Global Actions Header */}
      {(showCollapseAll || totalUnread > 0) && (
        <div className="px-4 py-2 bg-background border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {totalCount} notification{totalCount !== 1 ? 's' : ''}
              {totalUnread > 0 && (
                <span className="font-medium text-foreground"> ({totalUnread} unread)</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showCollapseAll && groups.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setAllExpanded(prev => !prev)}
              >
                {allExpanded ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </Button>
            )}
            {totalUnread > 0 && onMarkAllAsRead && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Groups */}
      {groups.map(group => (
        <NotificationGroup
          key={group.key}
          group={group}
          onMarkAsRead={onMarkAsRead}
          onMarkAllAsRead={onMarkAllAsRead}
          onClick={onClick}
          onApprove={onApprove}
          onReject={onReject}
          onSnooze={onSnooze}
          onDismiss={onDismiss}
          isActionPending={isActionPending}
          defaultExpanded={allExpanded}
          collapsible={groups.length > 1}
          showMarkAllAsRead={groups.length > 1}
        />
      ))}
    </div>
  )
}

export default NotificationGroup
