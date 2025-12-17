// File: /src/pages/DashboardPage.tsx
// Main dashboard page with INDUSTRIAL MODERN redesign
// Features: Hero section, glass morphism cards, orange accents, construction grid

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useAuth } from '@/lib/auth/AuthContext'
import { DashboardSelector, useDashboardView } from '@/features/dashboards'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import {
  ClipboardList,
  AlertCircle,
  ListChecks,
  Shield,
  Plus,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  HardHat,
} from 'lucide-react'
import { NoticesWidget } from '@/features/notices/components'
import { format } from 'date-fns'

export function DashboardPage() {
  const { data: projects } = useMyProjects()
  const { userProfile } = useAuth()
  const dashboardView = useDashboardView()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // Get the selected project or the first active project
  const selectedProject = selectedProjectId
    ? projects?.find((p) => p.id === selectedProjectId)
    : projects?.find((p) => p.status === 'active') || projects?.[0]

  // Check if user has a role-based dashboard
  const hasRoleDashboard = dashboardView !== 'default'

  // Mock metrics - enhanced with industrial styling
  const metrics = [
    {
      title: 'Tasks Pending',
      value: '12',
      change: '+3 today',
      icon: ClipboardList,
      gradient: 'from-blue-500 to-blue-600',
      glowColor: 'shadow-blue-500/20',
    },
    {
      title: 'Open RFIs',
      value: '5',
      change: '2 awaiting response',
      icon: AlertCircle,
      gradient: 'from-orange-500 to-orange-600',
      glowColor: 'shadow-orange-500/30',
    },
    {
      title: 'Punch Items',
      value: '23',
      change: '8 completed this week',
      icon: ListChecks,
      gradient: 'from-purple-500 to-purple-600',
      glowColor: 'shadow-purple-500/20',
    },
    {
      title: 'Days Since Incident',
      value: '127',
      change: 'Last: Minor cut',
      icon: Shield,
      gradient: 'from-green-500 to-green-600',
      glowColor: 'shadow-green-500/20',
    },
  ]

  // Mock recent activity
  const recentActivity = [
    {
      id: 1,
      type: 'daily_report',
      title: 'Daily Report submitted',
      project: 'Office Building - Phase 2',
      user: 'John Smith',
      time: '2 hours ago',
    },
    {
      id: 2,
      type: 'rfi',
      title: 'RFI #045 - HVAC routing clarification',
      project: 'Office Building - Phase 2',
      user: 'Sarah Johnson',
      time: '4 hours ago',
    },
    {
      id: 3,
      type: 'task',
      title: 'Task completed: Install drywall Level 3',
      project: 'Retail Center',
      user: 'Mike Davis',
      time: '5 hours ago',
    },
    {
      id: 4,
      type: 'punch',
      title: '3 punch items closed',
      project: 'Office Building - Phase 2',
      user: 'John Smith',
      time: 'Yesterday',
    },
  ]

  // Quick actions - enhanced with orange primary
  const quickActions = [
    {
      title: 'New Daily Report',
      description: 'Create today\'s daily report',
      icon: FileText,
      href: '/daily-reports/new',
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      title: 'Submit RFI',
      description: 'Request information from architect',
      icon: AlertCircle,
      href: '/rfis/new',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Add Task',
      description: 'Create a new task',
      icon: ClipboardList,
      href: '/tasks/new',
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Log Safety Incident',
      description: 'Report a safety incident',
      icon: Shield,
      href: '/safety/new',
      gradient: 'from-red-500 to-red-600',
    },
  ]

  return (
    <AppLayout>
      {/* Role-based Dashboard */}
      {hasRoleDashboard ? (
        <div className="p-6">
          <DashboardSelector
            project={selectedProject}
            projectId={selectedProject?.id}
            allowViewSwitch={true}
          />
        </div>
      ) : (
        <div className="space-y-0">
          {/* HERO SECTION - Industrial Modern */}
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            {/* Animated construction grid background */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(249, 115, 22, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(249, 115, 22, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                  animation: 'gridSlide 20s linear infinite',
                }}
              />
            </div>

            {/* Orange accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />

            <div className="relative max-w-7xl mx-auto px-6 py-12">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Welcome section */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-lg bg-orange-500/20 p-2 border border-orange-500/30">
                      <HardHat className="w-5 h-5 text-orange-400" />
                    </div>
                    <p className="text-orange-400 font-semibold uppercase tracking-wide text-sm">
                      Field Command Center
                    </p>
                  </div>
                  <h1 className="text-4xl font-bold mb-2">
                    Welcome back, {userProfile?.first_name || 'User'}
                  </h1>
                  <p className="text-gray-300 text-lg">
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>

                {/* Project selector */}
                {projects && projects.length > 0 && (
                  <div className="w-full lg:w-80">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Active Project
                    </label>
                    <Select
                      value={selectedProject?.id || ''}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-gray-800 border-gray-700 text-white"
                    >
                      <option value="">All Projects</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <style>{`
              @keyframes gridSlide {
                0% { transform: translate(0, 0); }
                100% { transform: translate(40px, 40px); }
              }
            `}</style>
          </div>

          {/* MAIN CONTENT */}
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
            {/* METRICS GRID - Glass Morphism Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metrics.map((metric, index) => {
                const Icon = metric.icon
                return (
                  <div
                    key={metric.title}
                    className="group relative"
                    style={{
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                    }}
                  >
                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-500 rounded-2xl`} />

                    {/* Card */}
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            {metric.title}
                          </p>
                        </div>
                        <div className={`rounded-xl bg-gradient-to-br ${metric.gradient} p-2.5 shadow-lg ${metric.glowColor}`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                          {metric.value}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {metric.change}
                        </p>
                      </div>

                      {/* Orange accent line */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* QUICK ACTIONS - Industrial Buttons */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-1 h-8 bg-orange-500 rounded-full" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.title}
                      to={action.href}
                      style={{
                        animation: `fadeInUp 0.5s ease-out ${0.4 + index * 0.1}s both`,
                      }}
                    >
                      <div className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full">
                        {/* Gradient icon */}
                        <div className={`inline-flex rounded-lg bg-gradient-to-br ${action.gradient} p-3 mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>

                        {/* Content */}
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center justify-between">
                          {action.title}
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {action.description}
                        </p>

                        {/* Bottom accent */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-xl" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* ACTIVE PROJECT INFO */}
            {selectedProject && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedProject.name}
                    </h3>
                    {selectedProject.address && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{selectedProject.address}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={selectedProject.status === 'active' ? 'success' : 'secondary'}>
                    {(selectedProject.status ?? 'unknown').replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                  {selectedProject.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <span>Started {format(new Date(selectedProject.start_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {selectedProject.end_date && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span>Est. completion {format(new Date(selectedProject.end_date), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTIVITY & UPCOMING EVENTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity - Timeline Style */}
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <div className="w-1 h-8 bg-orange-500 rounded-full" />
                  Recent Activity
                </h2>

                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="relative space-y-6">
                    {/* Orange timeline connector */}
                    <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-orange-500 via-orange-400 to-transparent" />

                    {recentActivity.map((activity, index) => (
                      <div key={activity.id} className="relative flex items-start gap-4 group">
                        {/* Timeline dot */}
                        <div className="relative z-10 flex-shrink-0">
                          <div className="rounded-full bg-gradient-to-br from-orange-500 to-orange-600 p-2.5 shadow-lg shadow-orange-500/30 group-hover:scale-110 transition-transform">
                            {activity.type === 'daily_report' && <FileText className="h-4 w-4 text-white" />}
                            {activity.type === 'rfi' && <AlertCircle className="h-4 w-4 text-white" />}
                            {activity.type === 'task' && <ClipboardList className="h-4 w-4 text-white" />}
                            {activity.type === 'punch' && <ListChecks className="h-4 w-4 text-white" />}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {activity.project}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            <span>{activity.user}</span>
                            <span>•</span>
                            <span>{activity.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Upcoming Events */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    Upcoming This Week
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2">
                        <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">Building Inspection</p>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Tomorrow, 10:00 AM</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2">
                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">Safety Meeting</p>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Friday, 8:00 AM</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
                        <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">Project Review</p>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">Friday, 2:00 PM</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notices Widget */}
                <NoticesWidget projectId={selectedProject?.id} />

                {/* Empty state for projects */}
                {(!projects || projects.length === 0) && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
                    <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-700 p-4 mb-4">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">No projects yet</p>
                    <Link to="/projects">
                      <Button className="industrial-button bg-orange-500 hover:bg-orange-600 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fade-in animation */}
          <style>{`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </AppLayout>
  )
}
