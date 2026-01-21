/**
 * Superintendent Dashboard
 * Field operations dashboard with daily reports, punch lists, safety, and weather
 */

import { SmartLayout } from '@/components/layout/SmartLayout'
import { RoleBasedQuickActions } from '@/components/layout/QuickActions'
import { useAuth } from '@/lib/auth/AuthContext'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import { LocalErrorBoundary } from '@/components/errors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  ListChecks,
  Shield,
  Cloud,
  Users,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function SuperintendentDashboard() {
  const { userProfile } = useAuth()
  const { data: projects } = useMyProjects()
  const { data: stats } = useDashboardStats()

  const activeProject = projects?.find(p => p.status === 'active')
  const today = new Date()

  return (
    <SmartLayout showHeaderStats={false}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 dark:from-background dark:to-muted/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {/* Header with Today's Date */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Good {getTimeOfDay()}, {userProfile?.first_name || 'Super'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {format(today, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
            {activeProject && (
              <Badge variant="outline" className="mt-2 md:mt-0">
                {activeProject.name}
              </Badge>
            )}
          </div>

          {/* Quick Actions - Field-focused */}
          <section className="mb-8">
            <RoleBasedQuickActions />
          </section>

          {/* Daily Report Status */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'p-3 rounded-lg',
                    stats?.dailyReportSubmitted
                      ? 'bg-success-light dark:bg-success/20'
                      : 'bg-warning-light dark:bg-warning/20'
                  )}>
                    {stats?.dailyReportSubmitted ? (
                      <CheckCircle2 className="h-6 w-6 text-success dark:text-success" />
                    ) : (
                      <ClipboardList className="h-6 w-6 text-warning dark:text-warning" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Today's Daily Report
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.dailyReportSubmitted
                        ? 'Submitted at ' + format(today, 'h:mm a')
                        : 'Not yet submitted'}
                    </p>
                  </div>
                </div>
                <Button asChild variant={stats?.dailyReportSubmitted ? 'outline' : 'default'}>
                  <Link to="/daily-reports/new">
                    <Plus className="h-4 w-4 mr-2" />
                    {stats?.dailyReportSubmitted ? 'Edit Report' : 'Create Report'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <LocalErrorBoundary title="Error loading stats">
              <StatCard
                title="Open Punch Items"
                value={stats?.openPunchItems || 0}
                icon={ListChecks}
                link="/punch-lists"
                alert={stats?.openPunchItems && stats.openPunchItems > 10}
              />
              <StatCard
                title="Safety Incidents"
                value={stats?.safetyIncidents || 0}
                icon={Shield}
                link="/safety"
                alert={stats?.safetyIncidents && stats.safetyIncidents > 0}
              />
              <StatCard
                title="Crew On-Site"
                value={stats?.crewOnSite || 0}
                icon={Users}
                link="/workforce"
              />
              <StatCard
                title="Photos Today"
                value={stats?.photosToday || 0}
                icon={Camera}
                link="/photo-progress"
              />
            </LocalErrorBoundary>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weather */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Weather
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-foreground">
                    72°F
                  </p>
                  <p className="text-muted-foreground mt-1">Partly Cloudy</p>
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">High</span>
                      <span className="font-medium">78°F</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Low</span>
                      <span className="font-medium">65°F</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-muted-foreground">Wind</span>
                      <span className="font-medium">8 mph</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Punch List Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Punch List Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-error-light dark:bg-error/10">
                    <span className="text-sm font-medium text-error-dark dark:text-error">
                      Critical
                    </span>
                    <Badge variant="destructive">{stats?.criticalPunchItems || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-warning-light dark:bg-warning/10">
                    <span className="text-sm font-medium text-warning-dark dark:text-warning">
                      High Priority
                    </span>
                    <Badge className="bg-warning">{stats?.highPriorityPunchItems || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted dark:bg-muted">
                    <span className="text-sm font-medium text-foreground">
                      Normal
                    </span>
                    <Badge variant="secondary">{stats?.normalPunchItems || 0}</Badge>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link to="/punch-lists">View All Punch Items</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Safety Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Safety Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.safetyAlerts?.length ? (
                    stats.safetyAlerts.map((alert, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-warning-light dark:bg-warning/10 border border-warning dark:border-warning/30"
                      >
                        <p className="text-sm font-medium text-warning-dark dark:text-warning">
                          {alert.title}
                        </p>
                        <p className="text-xs text-warning dark:text-warning mt-1">
                          {alert.description}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                      <p className="text-secondary text-sm">No active safety alerts</p>
                    </div>
                  )}
                </div>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link to="/safety">Safety Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SmartLayout>
  )
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour < 12) {return 'morning'}
  if (hour < 17) {return 'afternoon'}
  return 'evening'
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
            <p className="text-xs text-secondary">{title}</p>
            <p className="text-xl font-bold text-foreground mt-1">
              {value}
            </p>
          </div>
          <div className={cn(
            'p-2 rounded-lg',
            alert ? 'bg-warning-light dark:bg-warning/20' : 'bg-primary/10'
          )}>
            <Icon className={cn('h-5 w-5', alert ? 'text-warning' : 'text-primary')} />
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

export default SuperintendentDashboard
