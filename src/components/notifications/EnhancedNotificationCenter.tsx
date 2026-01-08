/**
 * EnhancedNotificationCenter Component
 *
 * Full-featured notification center with tabs, search, grouping, and bulk actions
 */

import { useState, useMemo } from 'react'
import { Bell, Search, Check, Trash2, Filter, X, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { NotificationGroup, type NotificationGroupData } from './NotificationGroup'
import { type NotificationItemData } from './NotificationItem'
import { useNotificationGroups, type GroupByType } from '@/hooks/notifications/useNotificationGroups'
import { useNotificationActions } from '@/hooks/notifications/useNotificationActions'

interface EnhancedNotificationCenterProps {
  notifications: NotificationItemData[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onClearAll: () => void
  onClick: (notification: NotificationItemData) => void
  onApprove?: (id: string) => Promise<void>
  onReject?: (id: string) => Promise<void>
  isLoading?: boolean
}

type TabType = 'all' | 'unread' | 'mentions' | 'approvals'

export function EnhancedNotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onClick,
  onApprove,
  onReject,
  isLoading = false,
}: EnhancedNotificationCenterProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [groupBy, setGroupBy] = useState<GroupByType>('time')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  const { isActionPending } = useNotificationActions()

  // Filter notifications based on active tab and search
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications]

    // Tab filter
    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter(n => !n.is_read)
        break
      case 'mentions':
        filtered = filtered.filter(n => n.type === 'mention')
        break
      case 'approvals':
        filtered = filtered.filter(n =>
          n.type === 'approval_request' || n.type?.includes('approval')
        )
        break
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(n => n.type && selectedTypes.includes(n.type))
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query) ||
        n.project?.name?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [notifications, activeTab, searchQuery, selectedTypes])

  // Group filtered notifications - convert NotificationItemData to GroupedNotification format
  const { groups } = useNotificationGroups(
    filteredNotifications.map(n => ({
      id: n.id,
      user_id: '', // Not available in NotificationItemData, but required for GroupedNotification
      type: n.type || 'general',
      title: n.title,
      message: n.message,
      is_read: n.is_read ?? false,
      created_at: n.created_at || new Date().toISOString(),
      priority: n.priority || 'normal',
      project_id: n.project?.id || null,
      project_name: n.project?.name || null,
      sender_id: n.sender?.id || null,
      sender_name: n.sender?.name || null,
      sender_avatar_url: n.sender?.avatar_url || null,
    })),
    groupBy
  )

  const unreadCount = notifications.filter(n => !n.is_read).length
  const mentionsCount = notifications.filter(n => n.type === 'mention' && !n.is_read).length
  const approvalsCount = notifications.filter(n =>
    (n.type === 'approval_request' || n.type?.includes('approval')) && !n.is_read
  ).length

  const notificationTypes = useMemo(() => {
    const types = new Set(notifications.map(n => n.type).filter((t): t is string => t !== null))
    return Array.from(types)
  }, [notifications])

  const handleApprove = onApprove ? async (id: string) => {
    await onApprove(id)
  } : undefined

  const handleReject = onReject ? async (id: string) => {
    await onReject(id)
  } : undefined

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
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
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Group by</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setGroupBy('time')}>
                    Time
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy('type')}>
                    Type
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy('project')}>
                    Project
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy('priority')}>
                    Priority
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                disabled={unreadCount === 0}
                className="h-8 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="px-4 py-2 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Type Filter */}
          {notificationTypes.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Filter className="h-3 w-3 mr-1" />
                  Filter
                  {selectedTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1">
                      {selectedTypes.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Notification Types</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notificationTypes.map(type => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={selectedTypes.includes(type)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTypes([...selectedTypes, type])
                      } else {
                        setSelectedTypes(selectedTypes.filter(t => t !== type))
                      }
                    }}
                  >
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </DropdownMenuCheckboxItem>
                ))}
                {selectedTypes.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedTypes([])}>
                      Clear filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mb-2 grid w-auto grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentions" className="text-xs">
              Mentions
              {mentionsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {mentionsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs">
              Approvals
              {approvalsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  {approvalsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
                {searchQuery && (
                  <p className="text-xs">Try a different search term</p>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {groups.map(group => (
                  <NotificationGroup
                    key={group.key}
                    group={group as NotificationGroupData}
                    onMarkAsRead={onMarkAsRead}
                    onClick={onClick}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isActionPending={isActionPending}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {filteredNotifications.length} of {notifications.length} notifications
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="h-8 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default EnhancedNotificationCenter
