/**
 * UnreadMessagesBadge Component
 *
 * Displays unread message count badge for navigation
 */

import { Badge } from '@/components/ui'
import { useTotalUnreadCount } from '../hooks'

export function UnreadMessagesBadge() {
  const { data: unreadCount = 0 } = useTotalUnreadCount()

  if (unreadCount === 0) return null

  return (
    <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-xs">
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  )
}
