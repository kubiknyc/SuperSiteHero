// File: /src/pages/DashboardPageV2.tsx
// Dashboard with V2 layout - glass morphism, improved spacing, premium design

import { useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
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
  Building2,
  ChevronRight,
  TrendingUp,
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
import { cn } from '@/lib/utils'

export function DashboardPageV2() {
  const { data: projects } = useMyProjects()
  const { userProfile } = useAuth()
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
    <SmartLayout showHeaderStats={false}>
      {/* Role-based Dashboard */}
      {hasRoleDashboard ? (
        <div className="p-6 lg:p-8">
          <DashboardSelector
            project={selectedProject}
            projectId={selectedProject?.id}
            allowViewSwitch={true}
          />
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
          {/* Main Content Container with max width */}
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            {/* Quick Actions - New in V2 */}
            <section className="mb-8 animate-fade-in">
              <QuickActions projectId={selectedProject?.id} />
            </section>

            {/* Morning Briefing Widget - Full Width with glass */}
            <LocalErrorBoundary
              title="Unable to load morning briefing"
              description="We couldn't load your daily summary. Please try again."
            >
              <section className="mb-8 animate-fade-in-up stagger-1">
                <MorningBriefingWidget projectId={selectedProject?.id} />
              </section>
            </LocalErrorBoundary>

            {/* Two Column Layout: Weather + Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Weather Widget */}
              <LocalErrorBoundary
                title="Unable to load weather"
                description="We couldn't load weather data. Please try again."
              >
                <div className="animate-fade-in-up stagger-2">
                  <WeatherForecastWidget projectId={selectedProject?.id} />
                </div>
              </LocalErrorBoundary>

              {/* Active Projects - Takes 2 columns with glass effect */}
              <LocalErrorBoundary
                title="Unable to load projects"
                description="We couldn't load the projects list. Please try again."
              >
                <div className={cn(
                  'lg:col-span-2',
                  'glass-card',
                  'rounded-2xl overflow-hidden',
                  'animate-fade-in-up stagger-3'
                )}>
                  {/* Header */}
                  <div className="flex justify-between items-center p-6 border-b border-gray-200/50 dark:border-white/5">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                        Active Projects
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {projects?.length || 0} projects in progress
                      </p>
                    </div>
                    <Link
                      to="/projects"
                      className={cn(
                        'text-sm font-semibold',
                        'text-gray-600 dark:text-gray-400',
                        'hover:text-primary dark:hover:text-primary',
                        'flex items-center gap-1',
                        'transition-colors duration-200'
                      )}
                    >
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Projects List */}
                  <div className="divide-y divide-gray-200/50 dark:divide-white/5">
                    {projects && projects.length > 0 ? (
                      projects.slice(0, 3).map((project, index) => {
                        const healthColor = getHealthColor(project.status)
                        const projectProgress = projectsProgress?.find(p => p.projectId === project.id)
                        const progress = projectProgress?.progress ?? 0

                        return (
                          <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className={cn(
                              'block p-6',
                              'hover:bg-white/50 dark:hover:bg-white/5',
                              'transition-all duration-200',
                              'group'
                            )}
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2.5 mb-1.5">
                                  {/* Health indicator with glow */}
                                  <div
                                    className="w-2.5 h-2.5 rounded-full transition-all duration-200 group-hover:scale-125"
                                    style={{
                                      backgroundColor: healthColor,
                                      boxShadow: `0 0 8px ${healthColor}60`
                                    }}
                                  />
                                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
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

                            {/* Progress Bar with refined styling */}
                            <div>
                              <div className="flex justify-between mb-2 text-xs">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">Progress</span>
                                <span className="font-bold text-gray-700 dark:text-gray-300 tabular-nums">{progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{
                                    width: `${progress}%`,
                                    background: `linear-gradient(90deg, ${healthColor} 0%, ${healthColor}CC 100%)`,
                                    boxShadow: `0 0 8px ${healthColor}40`
                                  }}
                                />
                              </div>
                            </div>
                          </Link>
                        )
                      })
                    ) : (
                      <div className="p-16 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Building2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No active projects</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Create a project to get started</p>
                      </div>
                    )}
                  </div>
                </div>
              </LocalErrorBoundary>
            </div>

            {/* Two Column Layout: Alerts | Notices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Alert System Widget */}
              <LocalErrorBoundary
                title="Unable to load alerts"
                description="We couldn't load system alerts. Please try again."
              >
                <div className="animate-fade-in-up stagger-4">
                  <AlertSystemWidget projectId={selectedProject?.id} />
                </div>
              </LocalErrorBoundary>

              {/* Notices Widget */}
              <LocalErrorBoundary
                title="Unable to load notices"
                description="We couldn't load notices. Please try again."
              >
                <div className="animate-fade-in-up stagger-4">
                  <NoticesWidget projectId={selectedProject?.id} />
                </div>
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
    </SmartLayout>
  )
}
