/**
 * NotificationItem Component
 * 
 * Individual notification item with inline actions
 */

import { formatDistanceToNow } from 'date-fns'
import {
  Bell, Check, MessageSquare, FileText, Shield, DollarSign, 
  Calendar, ClipboardList, CheckSquare, ChevronRight, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
}

interface NotificationItemProps {
  notification: NotificationItemData
  onMarkAsRead: (id: string) => void
  onClick: (notification: NotificationItemData) => void
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  isActionPending?: boolean
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rfi: MessageSquare,
  submittal: FileText,
  task: CheckSquare,
  daily_report: ClipboardList,
  punch_item: CheckSquare,
  safety: Shield,
  payment: DollarSign,
  schedule: Calendar,
  default: Bell,
}

function getIcon(type: string | null) {
  if (!type) return Bell
  const category = type.split('_')[0]
  return TYPE_ICONS[category] || TYPE_ICONS.default
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
  onApprove,
  onReject,
  isActionPending,
}: NotificationItemProps) {
  const Icon = getIcon(notification.type)
  const isApproval = notification.type?.includes('approval')
  const isRead = notification.is_read ?? false

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-b-0',
        !isRead && 'bg-blue-50/50'
      )}
      onClick={() => onClick(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(notification) }}
    >
      <div className={cn('flex-shrink-0 p-2 rounded-full', isRead ? 'bg-muted' : 'bg-primary/10')}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-medium line-clamp-1', !isRead && 'text-primary')}>
            {notification.title}
          </p>
          {!isRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id) }}
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>

        <p className="text-xs text-muted-foreground mt-1">
          {notification.created_at 
            ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
            : 'Just now'}
        </p>

        {isApproval && onApprove && onReject && notification.related_to_id && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onApprove(notification.id) }}
              disabled={isActionPending}
            >
              {isActionPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-destructive"
              onClick={(e) => { e.stopPropagation(); onReject(notification.id) }}
              disabled={isActionPending}
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 self-center" />
    </div>
  )
}

export default NotificationItem
