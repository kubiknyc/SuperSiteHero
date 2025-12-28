/**
 * Notification Center Component
 * Milestone 4.3: Real-time Notifications
 *
 * Mobile-optimized notification center with:
 * - Dropdown or drawer display
 * - Filter by type
 * - Mark as read functionality
 * - Click to navigate
 * - Real-time updates
 */

import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  AlertCircle,
  FileText,
  ClipboardList,
  Shield,
  DollarSign,
  Calendar,
  MessageSquare,
  CheckSquare,
  Loader2,
  Filter,
  Settings,
  ChevronRight,
  Clock,
  BellOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotificationsManager, type Notification } from '../hooks/useNotifications'
import { useMediaQuery } from '@/hooks/useMediaQuery'

// ============================================================================
// Types and Constants
// ============================================================================

type NotificationType =
  | 'all'
  | 'punch_item'
  | 'rfi'
  | 'submittal'
  | 'task'
  | 'payment'
  | 'safety'
  | 'document'

const notificationTypeConfig: Record<string, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}> = {
  punch_item_assigned: {
    label: 'Punch Item',
    icon: ClipboardList,
    color: 'text-orange-600 bg-orange-100',
  },
  punch_item_status_changed: {
    label: 'Punch Item',
    icon: ClipboardList,
    color: 'text-orange-600 bg-orange-100',
  },
  rfi_response: {
    label: 'RFI',
    icon: MessageSquare,
    color: 'text-primary bg-info-light',
  },
  rfi_assigned: {
    label: 'RFI',
    icon: MessageSquare,
    color: 'text-primary bg-info-light',
  },
  submittal_approved: {
    label: 'Submittal',
    icon: FileText,
    color: 'text-success bg-success-light',
  },
  submittal_rejected: {
    label: 'Submittal',
    icon: FileText,
    color: 'text-error bg-error-light',
  },
  task_assigned: {
    label: 'Task',
    icon: CheckSquare,
    color: 'text-purple-600 bg-purple-100',
  },
  task_due_reminder: {
    label: 'Task Due',
    icon: Clock,
    color: 'text-warning bg-warning-light',
  },
  payment_updated: {
    label: 'Payment',
    icon: DollarSign,
    color: 'text-emerald-600 bg-emerald-100',
  },
  safety_incident: {
    label: 'Safety',
    icon: Shield,
    color: 'text-error bg-error-light',
  },
  document_approved: {
    label: 'Document',
    icon: FileText,
    color: 'text-success bg-success-light',
  },
  document_rejected: {
    label: 'Document',
    icon: FileText,
    color: 'text-error bg-error-light',
  },
  bid_invited: {
    label: 'Bid',
    icon: FileText,
    color: 'text-indigo-600 bg-indigo-100',
  },
  compliance_expiring: {
    label: 'Compliance',
    icon: AlertCircle,
    color: 'text-warning bg-amber-100',
  },
  schedule_change: {
    label: 'Schedule',
    icon: Calendar,
    color: 'text-info bg-cyan-100',
  },
  action_item_due: {
    label: 'Action Item Due',
    icon: Clock,
    color: 'text-warning bg-warning-light',
  },
  action_item_overdue: {
    label: 'Action Item Overdue',
    icon: AlertCircle,
    color: 'text-error bg-error-light',
  },
  action_item_escalated: {
    label: 'Action Item Escalated',
    icon: AlertCircle,
    color: 'text-error bg-red-100',
  },
  meeting_scheduled: {
    label: 'Meeting',
    icon: Calendar,
    color: 'text-primary bg-info-light',
  },
  meeting_minutes: {
    label: 'Meeting Minutes',
    icon: FileText,
    color: 'text-indigo-600 bg-indigo-100',
  },
  default: {
    label: 'Notification',
    icon: Bell,
    color: 'text-secondary bg-muted',
  },
}

// ============================================================================
// Sub-components
// ============================================================================

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onClick: (notification: Notification) => void
  isMarkingAsRead?: boolean
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
  isMarkingAsRead,
}: NotificationItemProps) {
  const config = notificationTypeConfig[notification.type] || notificationTypeConfig.default
  const Icon = config.icon

  const getPriorityIndicator = () => {
    if (notification.priority === 'high') {
      return <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
    }
    return null
  }

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 p-4 cursor-pointer transition-colors',
        'border-b border-border last:border-b-0',
        !notification.read && 'bg-blue-50/50',
        'hover:bg-surface active:bg-muted'
      )}
      onClick={() => onClick(notification)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(notification)
        }
      }}
    >
      {getPriorityIndicator()}

      {/* Icon */}
      <div className={cn('flex-shrink-0 p-2 rounded-full', config.color)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn(
              'text-sm font-medium line-clamp-1',
              !notification.read && 'text-foreground'
            )}>
              {notification.title}
            </p>
            <p className="text-sm text-muted line-clamp-2 mt-0.5">
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {config.label}
              </Badge>
              <span className="text-xs text-disabled">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Mark as read button */}
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                onMarkAsRead(notification.id)
              }}
              disabled={isMarkingAsRead}
            >
              {isMarkingAsRead ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Chevron for navigation hint */}
      {notification.link && (
        <ChevronRight className="h-4 w-4 text-disabled flex-shrink-0 self-center" />
      )}
    </div>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        {filtered ? (
          <Filter className="h-8 w-8 text-disabled" />
        ) : (
          <BellOff className="h-8 w-8 text-disabled" />
        )}
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1 heading-subsection">
        {filtered ? 'No matching notifications' : 'All caught up!'}
      </h3>
      <p className="text-xs text-muted">
        {filtered
          ? 'Try adjusting your filter'
          : "You don't have any notifications right now"}
      </p>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface NotificationCenterProps {
  className?: string
  /** Use drawer instead of popover on mobile */
  mobileDrawer?: boolean
}

export function NotificationCenter({
  className,
  mobileDrawer = true,
}: NotificationCenterProps) {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<NotificationType>('all')

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteAll,
    isMarkingAsRead,
    isMarkingAllAsRead,
    isDeletingAll,
  } = useNotificationsManager()

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications]

    // Tab filter
    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !n.read)
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(n => n.type.startsWith(typeFilter))
    }

    return filtered
  }, [notifications, activeTab, typeFilter])

  // Handle notification click
  const handleNotificationClick = useCallback((notification: Notification) => {
    // Mark as read if not already
    if (!notification.read) {
      markAsRead(notification.id)
    }

    // Navigate to link
    if (notification.link) {
      setIsOpen(false)
      navigate(notification.link)
    }
  }, [markAsRead, navigate])

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead()
  }, [markAllAsRead])

  // Handle clear all
  const handleClearAll = useCallback(async () => {
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      await deleteAll()
    }
  }, [deleteAll])

  // Content component
  const content = (
    <div className="flex flex-col h-full max-h-[80vh] md:max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-secondary" />
          <h3 className="font-semibold text-foreground heading-subsection">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                All Types
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('punch_item')}>
                Punch Items
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('rfi')}>
                RFIs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('task')}>
                Tasks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('payment')}>
                Payments
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTypeFilter('document')}>
                Documents
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAllAsRead}
              title="Mark all as read"
            >
              {isMarkingAllAsRead ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Clear all */}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClearAll}
              disabled={isDeletingAll}
              title="Clear all notifications"
            >
              {isDeletingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
        <TabsList className="w-full justify-start px-4 py-2 bg-transparent border-b">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="unread" className="text-xs">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active filter indicator */}
        {typeFilter !== 'all' && (
          <div className="px-4 py-2 bg-surface border-b flex items-center justify-between">
            <span className="text-xs text-secondary">
              Filtered by: <span className="font-medium">{typeFilter}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setTypeFilter('all')}
            >
              Clear
            </Button>
          </div>
        )}

        <TabsContent value="all" className="flex-1 m-0">
          <ScrollArea className="h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-disabled" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyState filtered={typeFilter !== 'all'} />
            ) : (
              <div>
                {filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onClick={handleNotificationClick}
                    isMarkingAsRead={isMarkingAsRead}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="unread" className="flex-1 m-0">
          <ScrollArea className="h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-disabled" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyState filtered={typeFilter !== 'all'} />
            ) : (
              <div>
                {filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onClick={handleNotificationClick}
                    isMarkingAsRead={isMarkingAsRead}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <Separator />
      <div className="p-2 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => {
            setIsOpen(false)
            navigate('/portal/notifications')
          }}
        >
          View All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-xs"
          onClick={() => {
            setIsOpen(false)
            navigate('/portal/notification-settings')
          }}
        >
          <Settings className="h-3 w-3 mr-1" />
          Settings
        </Button>
      </div>
    </div>
  )

  // Trigger button
  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px]"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  )

  // Use sheet on mobile, popover on desktop
  if (isMobile && mobileDrawer) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-xl">
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        align="end"
        sideOffset={8}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}

export default NotificationCenter
