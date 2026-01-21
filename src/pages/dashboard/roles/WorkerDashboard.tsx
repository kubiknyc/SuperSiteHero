/**
 * Worker Dashboard
 * Simple, task-focused dashboard with minimal navigation
 */

import { SmartLayout } from '@/components/layout/SmartLayout'
import { useAuth } from '@/lib/auth/AuthContext'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import { LocalErrorBoundary } from '@/components/errors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function WorkerDashboard() {
  const { userProfile } = useAuth()
  const { data: stats } = useDashboardStats()

  const today = new Date()

  // Mock tasks for display - in real app these come from API
  const myTasks = stats?.myTasks ? [
    { id: '1', title: 'Install drywall panels - Room 201', completed: false, priority: 'high' as const },
    { id: '2', title: 'Finish framing - Section B', completed: false, priority: 'medium' as const },
    { id: '3', title: 'Clean up work area', completed: true, priority: 'low' as const },
  ] : []

  return (
    <SmartLayout showHeaderStats={false}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 dark:from-background dark:to-muted/30">
        <div className="max-w-lg mx-auto px-4 py-6">
          {/* Header - Simple greeting */}
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-foreground">
              Hi, {userProfile?.first_name || 'there'}!
            </h1>
            <p className="text-muted-foreground text-sm">
              {format(today, 'EEEE, MMMM d')}
            </p>
          </div>

          {/* Safety Announcement - Always visible if present */}
          {stats?.safetyAnnouncement && (
            <Card className="mb-6 border-warning dark:border-warning/30 bg-warning-light dark:bg-warning/10">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-dark dark:text-warning">
                      Safety Notice
                    </p>
                    <p className="text-sm text-warning-dark dark:text-warning mt-1">
                      {stats.safetyAnnouncement}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* My Tasks - Checklist Style */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  My Tasks Today
                </span>
                <Badge variant="secondary">
                  {myTasks.filter(t => !t.completed).length} remaining
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LocalErrorBoundary title="Error loading tasks">
                <div className="space-y-3">
                  {myTasks.length > 0 ? (
                    myTasks.map(task => (
                      <TaskChecklistItem key={task.id} task={task} />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckSquare className="h-10 w-10 text-success mx-auto mb-2" />
                      <p className="text-foreground font-medium">
                        All caught up!
                      </p>
                      <p className="text-secondary text-sm">
                        No tasks assigned for today
                      </p>
                    </div>
                  )}
                </div>
              </LocalErrorBoundary>
            </CardContent>
          </Card>

          {/* Messages Link */}
          <Link to="/messages">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-info-light dark:bg-info/20">
                      <MessageSquare className="h-5 w-5 text-info dark:text-info" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Messages
                      </p>
                      <p className="text-sm text-secondary">
                        {stats?.unreadMessages || 0} unread
                      </p>
                    </div>
                  </div>
                  {stats?.unreadMessages && stats.unreadMessages > 0 && (
                    <Badge className="bg-info">{stats.unreadMessages}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Time - Simple display */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card shadow-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {format(today, 'h:mm a')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SmartLayout>
  )
}

interface TaskChecklistItemProps {
  task: {
    id: string
    title: string
    completed: boolean
    priority: 'high' | 'medium' | 'low'
  }
}

function TaskChecklistItem({ task }: TaskChecklistItemProps) {
  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg',
      'bg-muted',
      task.completed && 'opacity-60'
    )}>
      <Checkbox
        checked={task.completed}
        className="mt-0.5"
        disabled // In real app, this would update task status
      />
      <div className="flex-1">
        <p className={cn(
          'font-medium text-foreground',
          task.completed && 'line-through'
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className={cn(
            'w-2 h-2 rounded-full',
            task.priority === 'high' ? 'bg-error' :
            task.priority === 'medium' ? 'bg-warning' : 'bg-success'
          )} />
          <span className="text-xs text-secondary capitalize">
            {task.priority} priority
          </span>
        </div>
      </div>
    </div>
  )
}

export default WorkerDashboard
