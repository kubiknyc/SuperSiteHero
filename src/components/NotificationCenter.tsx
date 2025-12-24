/**
 * Notification Center Component
 *
 * Displays a list of user notifications with actions to mark as read,
 * clear all, and navigate to related items.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { notificationService } from '@/lib/notifications/notification-service'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  link?: string
  createdAt: string
  read: boolean
  readAt?: string
  priority?: 'low' | 'normal' | 'high'
  metadata?: Record<string, any>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: string): React.ReactNode {
  const iconClass = 'h-4 w-4'

  switch (type) {
    case 'rfi_response':
    case 'rfi_assigned':
      return <MessageSquare className={iconClass} />

    case 'submittal_approved':
    case 'submittal_rejected':
    case 'submittal_assigned':
      return <FileText className={iconClass} />

    case 'daily_report_submitted':
      return <ClipboardList className={iconClass} />

    case 'punch_item_assigned':
      return <CheckSquare className={iconClass} />

    case 'safety_incident':
    case 'incident_reported':
      return <Shield className={cn(iconClass, 'text-error')} />

    case 'payment_approved':
    case 'payment_application':
      return <DollarSign className={iconClass} />

    case 'schedule_change':
      return <Calendar className={iconClass} />

    case 'approval_request':
    case 'approval_completed':
      return <CheckCheck className={iconClass} />

    case 'task_assigned':
    case 'task_due':
      return <CheckSquare className={iconClass} />

    case 'notice_response_due':
    case 'notice_overdue':
      return <AlertCircle className={cn(iconClass, 'text-warning')} />

    default:
      return <Bell className={iconClass} />
  }
}

/**
 * Get background color based on notification type/priority
 */
function getNotificationBgColor(notification: Notification): string {
  if (notification.priority === 'high') {
    return 'bg-error-light hover:bg-error-light'
  }

  if (notification.type === 'safety_incident' || notification.type === 'incident_reported') {
    return 'bg-error-light hover:bg-error-light'
  }

  if (notification.type === 'notice_overdue') {
    return 'bg-warning-light hover:bg-warning-light'
  }

  return 'hover:bg-muted/50'
}

// ============================================================================
// Component
// ============================================================================

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user?.id) {return}

    try {
      setIsLoading(true)
      const data = await notificationService.getInAppNotifications(user.id)
      setNotifications(data)
      setUnreadCount(data.filter((n: Notification) => !n.read).length)
    } catch (error) {
      logger.error('[NotificationCenter] Failed to load notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Initial load and listen for new notifications
  useEffect(() => {
    loadNotifications()

    // Listen for new notifications
    const handleNewNotification = () => {
      loadNotifications()
    }

    window.addEventListener('newNotification', handleNewNotification)

    // Poll for updates every 30 seconds when open
    let pollInterval: NodeJS.Timeout | null = null
    if (isOpen) {
      pollInterval = setInterval(loadNotifications, 30000)
    }

    return () => {
      window.removeEventListener('newNotification', handleNewNotification)
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [loadNotifications, isOpen])

  // Update unread count from service
  useEffect(() => {
    const updateUnreadCount = async () => {
      if (!user?.id) {return}
      const count = await notificationService.getUnreadCount(user.id)
      setUnreadCount(count)
    }

    updateUnreadCount()
    const interval = setInterval(updateUnreadCount, 60000) // Every minute

    return () => clearInterval(interval)
  }, [user?.id])

  // Mark single notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      logger.error('[NotificationCenter] Failed to mark as read:', error)
    }
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user?.id) {return}

    try {
      // Mark all unread notifications as read
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
      for (const id of unreadIds) {
        await notificationService.markAsRead(id)
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      )
      setUnreadCount(0)
    } catch (error) {
      logger.error('[NotificationCenter] Failed to mark all as read:', error)
    }
  }

  // Clear all notifications
  const handleClearAll = async () => {
    if (!user?.id) {return}

    try {
      await notificationService.clearAll(user.id)
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      logger.error('[NotificationCenter] Failed to clear all:', error)
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      handleMarkAsRead(notification.id)
    }

    // Navigate to link if available
    if (notification.link) {
      setIsOpen(false)
      navigate(notification.link)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
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
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <h3 className="font-semibold heading-subsection">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                title="Clear all notifications"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                You&apos;ll see updates here when something happens
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 p-4 cursor-pointer transition-colors',
                    !notification.read && 'bg-blue-50/50',
                    getNotificationBgColor(notification)
                  )}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNotificationClick(notification)
                    }
                  }}
                >
                  {/* Icon */}
                  <div className={cn(
                    'flex-shrink-0 p-2 rounded-full',
                    notification.read ? 'bg-muted' : 'bg-primary/10'
                  )}>
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-sm font-medium line-clamp-1',
                        !notification.read && 'text-primary'
                      )}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          title="Mark as read"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  setIsOpen(false)
                  navigate('/notifications')
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default NotificationCenter
