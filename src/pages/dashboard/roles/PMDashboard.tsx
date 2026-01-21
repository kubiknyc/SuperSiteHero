/**
 * Project Manager Dashboard
 * Management-focused dashboard with RFIs, change orders, and project oversight
 */

import { SmartLayout } from '@/components/layout/SmartLayout'
import { RoleBasedQuickActions } from '@/components/layout/QuickActions'
import { useAuth } from '@/lib/auth/AuthContext'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useDashboardStats, useActionItems } from '@/features/dashboard/hooks/useDashboardStats'
import { LocalErrorBoundary } from '@/components/errors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileQuestion,
  FileSignature,
  UserCheck,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function PMDashboard() {
  const { userProfile } = useAuth()
  const { data: projects } = useMyProjects()
  const { data: stats } = useDashboardStats()
  const { data: actionItems } = useActionItems()

  const activeProjects = projects?.filter(p => p.status === 'active') || []

  return (
    <SmartLayout showHeaderStats={false}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 dark:from-background dark:to-muted/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-page">
              Project Manager Dashboard
            </h1>
            <p className="text-secondary mt-1">
              Welcome back, {userProfile?.first_name || 'PM'} - {activeProjects.length} active project{activeProjects.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Quick Actions */}
          <section className="mb-8">
            <RoleBasedQuickActions />
          </section>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <LocalErrorBoundary title="Error loading stats">
              <StatCard
                title="Open RFIs"
                value={stats?.openRfis || 0}
                icon={FileQuestion}
                link="/rfis"
                alert={stats?.openRfis && stats.openRfis > 5}
              />
              <StatCard
                title="Pending Change Orders"
                value={stats?.pendingChangeOrders || 0}
                icon={FileSignature}
                link="/change-orders"
              />
              <StatCard
                title="Awaiting Approval"
                value={stats?.pendingApprovals || 0}
                icon={UserCheck}
                link="/approvals"
                alert={stats?.pendingApprovals && stats.pendingApprovals > 0}
              />
              <StatCard
                title="Upcoming Meetings"
                value={stats?.upcomingMeetings || 0}
                icon={Calendar}
                link="/meetings"
              />
            </LocalErrorBoundary>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* My Projects */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  My Projects
                </CardTitle>
                <Link
                  to="/projects"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight className="h-4 w-4" />
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeProjects.slice(0, 5).map(project => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="block p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">
                            {project.name}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${((project.budget || 0) / 1000).toFixed(0)}K
                            </span>
                            {project.end_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(project.end_date), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {activeProjects.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">
                      No active projects assigned
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actionItems?.slice(0, 5).map((item, i) => (
                    <Link
                      key={i}
                      to={item.link || '#'}
                      className="block p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.subtitle}
                      </p>
                    </Link>
                  ))}
                  {(!actionItems || actionItems.length === 0) && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No pending action items
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SmartLayout>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  link?: string
  alert?: boolean
}

function StatCard({ title, value, icon: Icon, link, alert }: StatCardProps) {
  const content = (
    <Card className={cn(
      'transition-all hover:shadow-md',
      alert && 'border-warning dark:border-warning',
      link && 'cursor-pointer hover:border-primary'
    )}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-secondary">{title}</p>
            <p className="heading-section">
              {value}
            </p>
          </div>
          <div className={cn(
            'p-3 rounded-lg',
            alert ? 'bg-warning-light dark:bg-warning/20' : 'bg-primary/10'
          )}>
            <Icon className={cn('h-6 w-6', alert ? 'text-warning' : 'text-primary')} />
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

export default PMDashboard
