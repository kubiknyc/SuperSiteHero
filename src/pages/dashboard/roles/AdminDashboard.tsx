/**
 * Admin Dashboard
 * Administrative dashboard for user management, approvals, and system oversight
 */

import { SmartLayout } from '@/components/layout/SmartLayout'
import { RoleBasedQuickActions } from '@/components/layout/QuickActions'
import { useAuth } from '@/lib/auth/AuthContext'
import { useDashboardStats } from '@/features/dashboard/hooks/useDashboardStats'
import { LocalErrorBoundary } from '@/components/errors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  UserCheck,
  Settings,
  Activity,
  Shield,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export function AdminDashboard() {
  const { userProfile } = useAuth()
  const { data: stats } = useDashboardStats()

  return (
    <SmartLayout showHeaderStats={false}>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/50 dark:from-background dark:to-muted/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-page">
              Admin Dashboard
            </h1>
            <p className="text-secondary mt-1">
              System administration and user management
            </p>
          </div>

          {/* Quick Actions */}
          <section className="mb-8">
            <RoleBasedQuickActions />
          </section>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <LocalErrorBoundary title="Error loading stats">
              <StatCard
                title="Active Users"
                value={stats?.activeTeamMembers || 0}
                icon={Users}
                link="/settings/users"
              />
              <StatCard
                title="Pending Approvals"
                value={stats?.pendingApprovals || 0}
                icon={UserCheck}
                link="/approvals"
                alert={stats?.pendingApprovals && stats.pendingApprovals > 0}
              />
              <StatCard
                title="System Health"
                value="Good"
                icon={Activity}
                link="/settings/system"
              />
              <StatCard
                title="Integrations"
                value="3 Active"
                icon={Settings}
                link="/settings/integrations"
              />
            </LocalErrorBoundary>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending User Approvals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Pending User Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Placeholder for pending users */}
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-muted-foreground text-sm">
                      No pending user approvals
                    </p>
                    <Link
                      to="/settings/users"
                      className="text-primary text-sm font-medium hover:underline mt-2 inline-block"
                    >
                      Manage Users
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <ActivityItem
                    action="User login"
                    user={userProfile?.full_name || 'Admin'}
                    time="Just now"
                  />
                  <ActivityItem
                    action="Settings updated"
                    user="System"
                    time="1 hour ago"
                  />
                  <ActivityItem
                    action="New user registered"
                    user="John Smith"
                    time="2 hours ago"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-success-light dark:bg-success/10">
                    <p className="text-sm font-medium text-success-dark dark:text-success">
                      Authentication
                    </p>
                    <p className="text-lg font-bold text-success dark:text-success mt-1">
                      Secure
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-success-light dark:bg-success/10">
                    <p className="text-sm font-medium text-success-dark dark:text-success">
                      Data Encryption
                    </p>
                    <p className="text-lg font-bold text-success dark:text-success mt-1">
                      Enabled
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-success-light dark:bg-success/10">
                    <p className="text-sm font-medium text-success-dark dark:text-success">
                      Backup Status
                    </p>
                    <p className="text-lg font-bold text-success dark:text-success mt-1">
                      Up to date
                    </p>
                  </div>
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

interface ActivityItemProps {
  action: string
  user: string
  time: string
}

function ActivityItem({ action, user, time }: ActivityItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
      <div>
        <p className="text-sm font-medium text-foreground">{action}</p>
        <p className="text-xs text-muted-foreground">{user}</p>
      </div>
      <Badge variant="secondary" className="text-xs">{time}</Badge>
    </div>
  )
}

export default AdminDashboard
