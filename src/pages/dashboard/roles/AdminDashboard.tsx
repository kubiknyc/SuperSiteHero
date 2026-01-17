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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="heading-page">
              Admin Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
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
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-center">
                    <p className="text-gray-500 text-sm">
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
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Authentication
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                      Secure
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Data Encryption
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
                      Enabled
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Backup Status
                    </p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400 mt-1">
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
      alert && 'border-amber-500 dark:border-amber-400',
      link && 'cursor-pointer hover:border-primary'
    )}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="heading-section">
              {value}
            </p>
          </div>
          <div className={cn(
            'p-3 rounded-lg',
            alert ? 'bg-amber-100 dark:bg-amber-900' : 'bg-primary/10'
          )}>
            <Icon className={cn('h-6 w-6', alert ? 'text-amber-600' : 'text-primary')} />
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
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{action}</p>
        <p className="text-xs text-gray-500">{user}</p>
      </div>
      <Badge variant="secondary" className="text-xs">{time}</Badge>
    </div>
  )
}

export default AdminDashboard
