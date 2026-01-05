// File: /src/pages/DashboardPageV2.tsx
// Dashboard with V2 layout - collapsible sidebar, sticky header, quick actions

import { useState, useCallback, useMemo, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayoutV2 } from '@/components/layout/AppLayoutV2'
import { QuickActions } from '@/components/layout/QuickActions'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useAuth } from '@/lib/auth/AuthContext'
import { DashboardSelector, useDashboardView } from '@/features/dashboards'
import { useDashboardStats, useActionItems } from '@/features/dashboard/hooks/useDashboardStats'
import { useProjectsProgress } from '@/features/dashboard/hooks/useProjectProgress'
import { Badge } from '@/components/ui/badge'
import { LocalErrorBoundary } from '@/components/errors'
import {
  Calendar,
  Clock,
  Building2,
  BarChart3,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { NoticesWidget } from '@/features/notices/components'
import { format } from 'date-fns'
import { getStatusVariant } from '@/lib/theme/tokens'
import {
  MorningBriefingWidget,
  AlertSystemWidget,
  WeatherForecastWidget,
  StatDrilldownPanel,
  type DrilldownType
} from '@/features/dashboard'

export function DashboardPageV2() {
  const { data: projects } = useMyProjects()
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const dashboardView = useDashboardView()
  const [selectedProjectId, _setSelectedProjectId] = useState<string>('')

  // Drilldown panel state
  const [drilldownOpen, setDrilldownOpen] = useState(false)
  const [drilldownType, setDrilldownType] = useState<DrilldownType>('tasks')
  const [drilldownTitle, setDrilldownTitle] = useState('')

  // Handler to open drilldown panel
  const openDrilldown = useCallback((type: DrilldownType, title: string) => {
    setDrilldownType(type)
    setDrilldownTitle(title)
    setDrilldownOpen(true)
  }, [])

  // Get the selected project or the first active project
  const selectedProject = selectedProjectId
    ? projects?.find((p) => p.id === selectedProjectId)
    : projects?.find((p) => p.status === 'active') || projects?.[0]

  // Check if user has a role-based dashboard
  const hasRoleDashboard = dashboardView !== 'default'

  // Fetch real dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats(selectedProject?.id)
  const { data: actionItems, isLoading: actionsLoading } = useActionItems(selectedProject?.id)

  // Fetch real project progress for all projects
  const projectIds = useMemo(() => projects?.map(p => p.id) || [], [projects])
  const { data: projectsProgress } = useProjectsProgress(projectIds)

  // Helper function for health indicator
  const getHealthColor = (status?: string) => {
    const statusColors: Record<string, string> = {
      'active': '#10b981',
      'planning': '#f59e0b',
      'on_hold': '#ef4444',
      'completed': '#2563eb'
    }
    return statusColors[status || 'active'] || statusColors.active
  }

  return (
    <AppLayoutV2 showHeaderStats={true}>
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-6">
            {/* Quick Actions - New in V2 */}
            <div className="mb-6">
              <QuickActions projectId={selectedProject?.id} />
            </div>

            {/* Morning Briefing Widget - Full Width */}
            <LocalErrorBoundary
              title="Unable to load morning briefing"
              description="We couldn't load your daily summary. Please try again."
            >
              <div className="mb-6">
                <MorningBriefingWidget projectId={selectedProject?.id} />
              </div>
            </LocalErrorBoundary>

            {/* Two Column Layout: Weather + Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Weather Widget */}
              <LocalErrorBoundary
                title="Unable to load weather"
                description="We couldn't load weather data. Please try again."
              >
                <WeatherForecastWidget projectId={selectedProject?.id} />
              </LocalErrorBoundary>

              {/* Active Projects - Takes 2 columns */}
              <LocalErrorBoundary
                title="Unable to load projects"
                description="We couldn't load the projects list. Please try again."
              >
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Active Projects
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {projects?.length || 0} projects in progress
                      </p>
                    </div>
                    <Link
                      to="/projects"
                      className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {projects && projects.length > 0 ? (
                      projects.slice(0, 3).map((project) => {
                        const healthColor = getHealthColor(project.status)
                        const projectProgress = projectsProgress?.find(p => p.projectId === project.id)
                        const progress = projectProgress?.progress ?? 0

                        return (
                          <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="block p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: healthColor,
                                      boxShadow: `0 0 0 3px ${healthColor}20`
                                    }}
                                  />
                                  <h3 className="font-medium text-gray-900 dark:text-white">
                                    {project.name}
                                  </h3>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                  {project.start_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {format(new Date(project.start_date), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge variant={getStatusVariant(project.status || 'unknown')}>
                                {(project.status ?? 'unknown').replace('_', ' ')}
                              </Badge>
                            </div>

                            {/* Progress Bar */}
                            <div>
                              <div className="flex justify-between mb-1.5 text-xs">
                                <span className="text-gray-500 dark:text-gray-400">Progress</span>
                                <span className="font-medium text-gray-700 dark:text-gray-300">{progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </Link>
                        )
                      })
                    ) : (
                      <div className="p-12 text-center">
                        <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No active projects</p>
                      </div>
                    )}
                  </div>
                </div>
              </LocalErrorBoundary>
            </div>

            {/* Three Column Layout: Alerts | Notices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Alert System Widget */}
              <LocalErrorBoundary
                title="Unable to load alerts"
                description="We couldn't load system alerts. Please try again."
              >
                <AlertSystemWidget projectId={selectedProject?.id} />
              </LocalErrorBoundary>

              {/* Notices Widget */}
              <LocalErrorBoundary
                title="Unable to load notices"
                description="We couldn't load notices. Please try again."
              >
                <NoticesWidget projectId={selectedProject?.id} />
              </LocalErrorBoundary>
            </div>
          </div>

          {/* Stat Drilldown Panel */}
          <StatDrilldownPanel
            open={drilldownOpen}
            onOpenChange={setDrilldownOpen}
            type={drilldownType}
            title={drilldownTitle}
            projectId={selectedProject?.id}
          />
        </div>
      )}
    </AppLayoutV2>
  )
}
