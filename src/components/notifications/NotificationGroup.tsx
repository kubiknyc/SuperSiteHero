/**
 * NotificationGroup Component
 * 
 * Groups notifications by time, type, or project
 */

import { cn } from '@/lib/utils'
import { NotificationItem, type NotificationItemData } from './NotificationItem'

export interface NotificationGroupData {
  key: string
  label: string
  notifications: NotificationItemData[]
  count: number
  unreadCount: number
}

interface NotificationGroupProps {
  group: NotificationGroupData
  onMarkAsRead: (id: string) => void
  onClick: (notification: NotificationItemData) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  isActionPending?: (id: string) => boolean
}

export function NotificationGroup({
  group,
  onMarkAsRead,
  onClick,
  onApprove,
  onReject,
  isActionPending,
}: NotificationGroupProps) {
  if (group.notifications.length === 0) return null

  return (
    <div>
      <div className="px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground sticky top-0 z-10 flex items-center justify-between">
        <span>{group.label}</span>
        <span className="text-muted-foreground/70">
          {group.count} {group.unreadCount > 0 && `(${group.unreadCount} unread)`}
        </span>
      </div>
      <div>
        {group.notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onClick={onClick}
            onApprove={onApprove}
            onReject={onReject}
            isActionPending={isActionPending?.(notification.id)}
          />
        ))}
      </div>
    </div>
  )
}

export default NotificationGroup
