/**
 * Subcontractor Schedule Page
 * View assigned schedule activities and notifications (P1-3 Feature)
 */

import { useState } from 'react'
import { Calendar, Clock, AlertTriangle, CheckCircle2, Bell, ChevronDown, ChevronUp, MapPin, Building2, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useSubcontractorScheduleActivities,
  useScheduleChangeNotifications,
  useScheduleSummary,
  useMarkScheduleNotificationRead,
  getActivityStatusVariant,
  getActivityStatusLabel,
  getActivityStatusColor,
  formatVariance,
  getVarianceColor,
  getChangeTypeLabel,
  getChangeTypeColor,
  filterActivitiesByStatus,
  formatScheduleDate,
  getDaysUntil,
  type SubcontractorScheduleActivity,
  type ScheduleChangeNotification,
} from '@/features/subcontractor-portal/hooks'
import { cn } from '@/lib/utils'

// =============================================
// SUB-COMPONENTS
// =============================================

function ScheduleSummaryCards() {
  const { data: summary, isLoading } = useScheduleSummary()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary?.total_activities || 0}</div>
          <p className="text-xs text-muted-foreground">
            {summary?.in_progress_count || 0} in progress
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          <Clock className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{summary?.upcoming_count || 0}</div>
          <p className="text-xs text-muted-foreground">
            Starting within 7 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{summary?.overdue_count || 0}</div>
          <p className="text-xs text-muted-foreground">
            Need attention
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{summary?.completed_count || 0}</div>
          <p className="text-xs text-muted-foreground">
            On time: {summary?.on_time_percent || 0}%
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationItem({
  notification,
  onMarkRead
}: {
  notification: ScheduleChangeNotification
  onMarkRead: (id: string) => void
}) {
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      notification.is_read ? "bg-background" : "bg-blue-50 border-blue-200"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-sm font-medium", getChangeTypeColor(notification.change_type))}>
              {getChangeTypeLabel(notification.change_type)}
            </span>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-blue-600" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{notification.project_name}</span>
            <span>•</span>
            <span>{formatScheduleDate(notification.created_at)}</span>
          </div>
        </div>
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkRead(notification.id)}
            className="shrink-0"
          >
            Mark read
          </Button>
        )}
      </div>
    </div>
  )
}

function NotificationsPanel() {
  const { data: notifications = [], isLoading } = useScheduleChangeNotifications()
  const markRead = useMarkScheduleNotificationRead()

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleMarkRead = (id: string) => {
    markRead.mutate(id)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse p-3 rounded-lg border">
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} new</Badge>
            )}
          </CardTitle>
        </div>
        <CardDescription>
          Schedule changes and updates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No notifications yet
          </p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3 pr-4">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function ActivityCard({ activity }: { activity: SubcontractorScheduleActivity }) {
  const [isOpen, setIsOpen] = useState(false)
  const daysUntilStart = getDaysUntil(activity.planned_start)
  const daysUntilEnd = getDaysUntil(activity.planned_finish)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        activity.is_on_critical_path && "border-red-300 bg-red-50/50",
        activity.is_overdue && "border-orange-300 bg-orange-50/50"
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-base">{activity.activity_name}</CardTitle>
                  {activity.is_on_critical_path && (
                    <Badge variant="destructive" className="text-xs">Critical Path</Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {activity.project_name}
                  </span>
                  {activity.area_location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {activity.area_location}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={getActivityStatusVariant(activity.status)}>
                  {getActivityStatusLabel(activity.status)}
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 border-t">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
              {/* Schedule Dates */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule Dates
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Planned Start:</span>
                    <span>{formatScheduleDate(activity.planned_start)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Planned Finish:</span>
                    <span>{formatScheduleDate(activity.planned_finish)}</span>
                  </div>
                  {activity.actual_start && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Actual Start:</span>
                      <span>{formatScheduleDate(activity.actual_start)}</span>
                    </div>
                  )}
                  {activity.actual_finish && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Actual Finish:</span>
                      <span>{formatScheduleDate(activity.actual_finish)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Duration & Progress */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Progress
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{activity.duration_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress:</span>
                    <span>{activity.percent_complete}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variance:</span>
                    <span className={getVarianceColor(activity.variance_days)}>
                      {formatVariance(activity.variance_days)}
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, activity.percent_complete)}%` }}
                  />
                </div>
              </div>

              {/* Status Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Status
                </h4>
                <div className="space-y-2 text-sm">
                  {daysUntilStart !== null && daysUntilStart > 0 && activity.status === 'not_started' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Starts in:</span>
                      <span className="text-blue-600">{daysUntilStart} days</span>
                    </div>
                  )}
                  {daysUntilEnd !== null && activity.status === 'in_progress' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due in:</span>
                      <span className={daysUntilEnd < 0 ? 'text-red-600' : daysUntilEnd <= 3 ? 'text-yellow-600' : ''}>
                        {daysUntilEnd < 0 ? `${Math.abs(daysUntilEnd)} days overdue` : `${daysUntilEnd} days`}
                      </span>
                    </div>
                  )}
                  {activity.is_upcoming && (
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      Upcoming
                    </Badge>
                  )}
                  {activity.is_overdue && (
                    <Badge variant="outline" className="text-red-600 border-red-300">
                      Overdue
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            {activity.notes && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground">{activity.notes}</p>
              </div>
            )}

            {/* Predecessor/Successor Info */}
            {(activity.predecessor_ids?.length > 0 || activity.successor_ids?.length > 0) && (
              <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                {activity.predecessor_ids?.length > 0 && (
                  <span>{activity.predecessor_ids.length} predecessor(s)</span>
                )}
                {activity.successor_ids?.length > 0 && (
                  <span>{activity.successor_ids.length} successor(s)</span>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function ActivitiesList({ filter }: { filter: 'all' | 'upcoming' | 'overdue' | 'delayed' | 'critical' }) {
  const { data: activities = [], isLoading } = useSubcontractorScheduleActivities()

  const filteredActivities = filterActivitiesByStatus(activities, filter)

  // Sort by planned start date
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    if (!a.planned_start) {return 1}
    if (!b.planned_start) {return -1}
    return new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime()
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-48 mb-2" />
              <div className="h-4 bg-muted rounded w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (sortedActivities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {filter === 'all'
              ? "No schedule activities assigned to you"
              : `No ${filter} activities`}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {sortedActivities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  )
}

// =============================================
// MAIN PAGE COMPONENT
// =============================================

export default function SubcontractorSchedulePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">
          View your assigned schedule activities and notifications
        </p>
      </div>

      {/* Summary Cards */}
      <ScheduleSummaryCards />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activities Section */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="overdue">Overdue</TabsTrigger>
              <TabsTrigger value="delayed">Delayed</TabsTrigger>
              <TabsTrigger value="critical">Critical Path</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <ActivitiesList filter="all" />
            </TabsContent>
            <TabsContent value="upcoming">
              <ActivitiesList filter="upcoming" />
            </TabsContent>
            <TabsContent value="overdue">
              <ActivitiesList filter="overdue" />
            </TabsContent>
            <TabsContent value="delayed">
              <ActivitiesList filter="delayed" />
            </TabsContent>
            <TabsContent value="critical">
              <ActivitiesList filter="critical" />
            </TabsContent>
          </Tabs>
        </div>

        {/* Notifications Panel */}
        <div>
          <NotificationsPanel />
        </div>
      </div>
    </div>
  )
}
