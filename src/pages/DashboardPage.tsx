// File: /src/pages/DashboardPage.tsx
// Main dashboard page showing project overview and quick actions

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
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
} from 'lucide-react'
import { format } from 'date-fns'

export function DashboardPage() {
  const { data: projects } = useMyProjects()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // Get the selected project or the first active project
  const selectedProject = selectedProjectId
    ? projects?.find((p) => p.id === selectedProjectId)
    : projects?.find((p) => p.status === 'active') || projects?.[0]

  // Mock metrics - these would come from actual queries in production
  const metrics = [
    {
      title: 'Tasks Pending',
      value: '12',
      change: '+3 today',
      icon: ClipboardList,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Open RFIs',
      value: '5',
      change: '2 awaiting response',
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Punch Items',
      value: '23',
      change: '8 completed this week',
      icon: ListChecks,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Days Since Incident',
      value: '127',
      change: 'Last: Minor cut',
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
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

  // Quick actions
  const quickActions = [
    {
      title: 'New Daily Report',
      description: 'Create today\'s daily report',
      icon: FileText,
      href: '/daily-reports/new',
      color: 'bg-blue-600',
    },
    {
      title: 'Submit RFI',
      description: 'Request information from architect',
      icon: AlertCircle,
      href: '/rfis/new',
      color: 'bg-orange-600',
    },
    {
      title: 'Add Task',
      description: 'Create a new task',
      icon: ClipboardList,
      href: '/tasks/new',
      color: 'bg-purple-600',
    },
    {
      title: 'Log Safety Incident',
      description: 'Report a safety incident',
      icon: Shield,
      href: '/safety/new',
      color: 'bg-red-600',
    },
  ]

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header with project selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Project selector */}
          {projects && projects.length > 0 && (
            <div className="w-full sm:w-64">
              <Select
                value={selectedProject?.id || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
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

        {/* Active Project Info */}
        {selectedProject && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl">{selectedProject.name}</CardTitle>
                  {selectedProject.address && (
                    <CardDescription className="flex items-center gap-2 mt-2">
                      <MapPin className="h-4 w-4" />
                      {selectedProject.address}
                    </CardDescription>
                  )}
                </div>
                <Badge variant={selectedProject.status === 'active' ? 'success' : 'secondary'}>
                  {selectedProject.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                {selectedProject.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Started {selectedProject.start_date ? format(new Date(selectedProject.start_date), 'MMM d, yyyy') : 'N/A'}</span>
                  </div>
                )}
                {selectedProject.end_date && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Est. completion {selectedProject.end_date ? format(new Date(selectedProject.end_date), 'MMM d, yyyy') : 'N/A'}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <Card key={metric.title}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                      <p className="text-3xl font-bold mt-2">{metric.value}</p>
                      <p className="text-xs text-gray-500 mt-1">{metric.change}</p>
                    </div>
                    <div className={`rounded-full p-3 ${metric.bgColor}`}>
                      <Icon className={`h-6 w-6 ${metric.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.title} to={action.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`rounded-lg p-2 ${action.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{action.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates across all projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                    >
                      <div className="rounded-full bg-gray-100 p-2 mt-1">
                        {activity.type === 'daily_report' && <FileText className="h-4 w-4 text-gray-600" />}
                        {activity.type === 'rfi' && <AlertCircle className="h-4 w-4 text-orange-600" />}
                        {activity.type === 'task' && <ClipboardList className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'punch' && <ListChecks className="h-4 w-4 text-purple-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{activity.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{activity.project}</p>
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
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Events / Weather */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Building Inspection</p>
                      <p className="text-gray-600 text-xs">Tomorrow, 10:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Safety Meeting</p>
                      <p className="text-gray-600 text-xs">Friday, 8:00 AM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Project Review</p>
                      <p className="text-gray-600 text-xs">Friday, 2:00 PM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Empty state for projects */}
            {(!projects || projects.length === 0) && (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-gray-600 mb-4">No projects yet</p>
                  <Link to="/projects">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
