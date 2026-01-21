/**
 * Foreman Dashboard
 * Team and task management focused dashboard
 */

import { SmartLayout } from '@/components/layout/SmartLayout'
import { RoleBasedQuickActions } from '@/components/layout/QuickActions'
import { useAuth } from '@/lib/auth/AuthContext'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import { LocalErrorBoundary } from '@/components/errors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckSquare,
  Users,
  Camera,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function ForemanDashboard() {
  const { userProfile } = useAuth()
  const { data: stats } = useDashboardStats()

  const today = new Date()

  return (
    <SmartLayout showHeaderStats={false}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 dark:from-background dark:to-muted/30">
        <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">
              Hey, {userProfile?.first_name || 'Foreman'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {format(today, 'EEEE, MMMM d')}
            </p>
          </div>

          {/* Quick Actions */}
          <section className="mb-6">
            <RoleBasedQuickActions compact />
          </section>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <LocalErrorBoundary title="Error loading stats">
              <StatCard
                title="My Tasks"
                value={stats?.myTasks || 0}
                subtitle="For today"
                icon={CheckSquare}
                link="/tasks"
              />
              <StatCard
                title="Crew"
                value={stats?.crewMembers || 0}
                subtitle="On my team"
                icon={Users}
                link="/workforce"
              />
            </LocalErrorBoundary>
          </div>

          {/* Today's Tasks */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Today's Tasks
                </CardTitle>
                <Link
                  to="/tasks"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.todaysTasks?.length ? (
                  stats.todaysTasks.map((task, i) => (
                    <TaskItem key={i} task={task} />
                  ))
                ) : (
                  <div className="text-center py-6">
                    <CheckSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No tasks for today</p>
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link to="/tasks">View All Tasks</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Photo Button */}
          <Card className="mb-6">
            <CardContent className="py-4">
              <Link
                to="/photo-progress/capture"
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info-light dark:bg-info/20">
                    <Camera className="h-5 w-5 text-info dark:text-info" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Take Progress Photo
                    </p>
                    <p className="text-sm text-secondary">
                      {stats?.photosToday || 0} photos today
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </CardContent>
          </Card>

          {/* Safety Reminder */}
          {stats?.safetyReminder && (
            <Card className="border-warning dark:border-warning/30 bg-warning-light dark:bg-warning/10">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-dark dark:text-warning">
                      Safety Reminder
                    </p>
                    <p className="text-sm text-warning-dark dark:text-warning mt-1">
                      {stats.safetyReminder}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SmartLayout>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  link?: string
}

function StatCard({ title, value, subtitle, icon: Icon, link }: StatCardProps) {
  const content = (
    <Card className="transition-all hover:shadow-md cursor-pointer">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (link) {
    return <Link to={link}>{content}</Link>
  }
  return content
}

interface TaskItemProps {
  task: {
    title: string
    status: 'pending' | 'in_progress' | 'completed'
    priority?: 'high' | 'medium' | 'low'
    dueTime?: string
  }
}

function TaskItem({ task }: TaskItemProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg',
      'bg-muted',
      task.status === 'completed' && 'opacity-60'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-2 h-2 rounded-full',
          task.priority === 'high' ? 'bg-error' :
          task.priority === 'medium' ? 'bg-warning' : 'bg-success'
        )} />
        <div>
          <p className={cn(
            'text-sm font-medium text-foreground',
            task.status === 'completed' && 'line-through'
          )}>
            {task.title}
          </p>
          {task.dueTime && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {task.dueTime}
            </p>
          )}
        </div>
      </div>
      <Badge
        variant={
          task.status === 'completed' ? 'default' :
          task.status === 'in_progress' ? 'secondary' : 'outline'
        }
        className="text-xs"
      >
        {task.status === 'in_progress' ? 'In Progress' :
         task.status === 'completed' ? 'Done' : 'Pending'}
      </Badge>
    </div>
  )
}

export default ForemanDashboard
