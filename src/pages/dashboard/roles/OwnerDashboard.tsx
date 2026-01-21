/**
 * Owner Dashboard
 * Executive-level dashboard with company-wide KPIs, financials, and strategic metrics
 */

import { SmartLayout } from '@/components/layout/SmartLayout'
import { RoleBasedQuickActions } from '@/components/layout/QuickActions'
import { useAuth } from '@/lib/auth/AuthContext'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import { LocalErrorBoundary } from '@/components/errors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Building2,
  Users,
  FileCheck,
  BarChart3,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function OwnerDashboard() {
  const { userProfile } = useAuth()
  const { data: projects } = useMyProjects()
  const { data: stats } = useDashboardStats()

  const activeProjects = projects?.filter(p => p.status === 'active') || []
  const totalBudget = activeProjects.reduce((sum, p) => sum + (p.budget || 0), 0)

  return (
    <SmartLayout showHeaderStats={false}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 dark:from-background dark:to-muted/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back, {userProfile?.first_name || 'Owner'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Executive Dashboard - Company Overview
            </p>
          </div>

          {/* Quick Actions */}
          <section className="mb-8">
            <RoleBasedQuickActions />
          </section>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <LocalErrorBoundary title="Error loading stats">
              <StatCard
                title="Active Projects"
                value={activeProjects.length}
                icon={Building2}
                trend="+2 this month"
                trendUp={true}
              />
              <StatCard
                title="Total Budget"
                value={`$${(totalBudget / 1000000).toFixed(1)}M`}
                icon={DollarSign}
                trend="On track"
                trendUp={true}
              />
              <StatCard
                title="Pending Approvals"
                value={stats?.pendingApprovals || 0}
                icon={FileCheck}
                trend="Requires attention"
                trendUp={false}
                alert={stats?.pendingApprovals && stats.pendingApprovals > 5}
              />
              <StatCard
                title="Active Team"
                value={stats?.activeTeamMembers || 0}
                icon={Users}
                trend="Across all projects"
              />
            </LocalErrorBoundary>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Financial Summary */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Financial Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeProjects.slice(0, 5).map(project => (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="block p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-foreground">
                            {project.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Budget: ${((project.budget || 0) / 1000).toFixed(0)}K
                          </p>
                        </div>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Critical Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.criticalAlerts?.length ? (
                    stats.criticalAlerts.map((alert, i) => (
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
                    <p className="text-secondary text-sm">No critical alerts</p>
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
  trend?: string
  trendUp?: boolean
  alert?: boolean
}

function StatCard({ title, value, icon: Icon, trend, trendUp, alert }: StatCardProps) {
  return (
    <Card className={cn(alert && 'border-warning dark:border-warning')}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-secondary">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {value}
            </p>
            {trend && (
              <p className={cn(
                'text-xs mt-1',
                trendUp ? 'text-success' : trendUp === false ? 'text-warning' : 'text-secondary'
              )}>
                {trendUp !== undefined && (
                  <TrendingUp className={cn('inline h-3 w-3 mr-1', !trendUp && 'rotate-180')} />
                )}
                {trend}
              </p>
            )}
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
}

export default OwnerDashboard
