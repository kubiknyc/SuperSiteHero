// File: /src/pages/DashboardPage.tsx
// Industrial Blueprint Dashboard - Refactored with design system classes

import { useState, useCallback, useMemo, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SmartLayout } from '@/components/layout/SmartLayout'
import { QuickActions } from '@/components/layout/QuickActions'
import { useLayoutVersion } from '@/hooks/useLayoutVersion'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useAuth } from '@/lib/auth/AuthContext'
import { DashboardSelector, useDashboardView } from '@/features/dashboards'
import { useDashboardStats, useActionItems } from '@/features/dashboard/hooks/useDashboardStats'
import { useProjectsProgress } from '@/features/dashboard/hooks/useProjectProgress'
import { Badge } from '@/components/ui/badge'
import { LocalErrorBoundary } from '@/components/errors'
import {
  ClipboardList,
  AlertCircle,
  ListChecks,
  Shield,
  TrendingUp,
  Calendar,
  Clock,
  Building2,
  TrendingDown,
  BarChart3,
  Loader2,
  Bell,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import { NoticesWidget } from '@/features/notices/components'
import { format } from 'date-fns'
import { colors as themeColors, chartColors, getStatusVariant } from '@/lib/theme/tokens'
import {
  MorningBriefingWidget,
  AlertSystemWidget,
  WeatherForecastWidget,
  StatDrilldownPanel,
  type DrilldownType
} from '@/features/dashboard'

export function DashboardPage() {
  const { data: projects } = useMyProjects()
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const dashboardView = useDashboardView()
  const [selectedProjectId, _setSelectedProjectId] = useState<string>('')
  const [focusedCard, setFocusedCard] = useState<string | null>(null)

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

  // Build stats from real data - Using design tokens
  // Generate filter query strings for clickable stats
  const buildFilteredLink = (basePath: string, filters: Record<string, string>) => {
    const params = new URLSearchParams(filters)
    return `${basePath}?${params.toString()}`
  }

  const stats = useMemo(() => {
    if (!dashboardStats) {
      // Loading state - show skeleton values
      return [
        {
          label: 'Tasks Pending',
          value: '-',
          target: 0,
          change: '-',
          trend: 'up' as const,
          icon: ClipboardList,
          color: themeColors.primary.DEFAULT,
          sparkline: [0, 0, 0, 0, 0],
          ariaLabel: 'Loading tasks...',
          link: '/tasks',
          filterLink: '/tasks?status=pending'
        },
        {
          label: 'Open RFIs',
          value: '-',
          target: 0,
          change: '-',
          trend: 'up' as const,
          icon: AlertCircle,
          color: chartColors.orange,
          sparkline: [0, 0, 0, 0, 0],
          ariaLabel: 'Loading RFIs...',
          link: '/rfis',
          filterLink: '/rfis?status=open'
        },
        {
          label: 'Punch Items',
          value: '-',
          target: 0,
          change: '-',
          trend: 'down' as const,
          icon: ListChecks,
          color: chartColors.purple,
          sparkline: [0, 0, 0, 0, 0],
          ariaLabel: 'Loading punch items...',
          link: '/punch-lists',
          filterLink: '/punch-lists?status=open'
        },
        {
          label: 'Days Since Incident',
          value: '-',
          target: 365,
          change: '-',
          trend: 'up' as const,
          icon: Shield,
          color: themeColors.semantic.success,
          sparkline: [0, 0, 0, 0, 0],
          ariaLabel: 'Loading safety stats...',
          link: '/safety',
          filterLink: '/safety'
        }
      ]
    }

    const { tasks, rfis, punchItems, safety } = dashboardStats

    // Calculate changes from trend
    const getChange = (trend: number[]) => {
      if (trend.length < 2) {return { value: '0', direction: 'up' as const }}
      const current = trend[trend.length - 1]
      const previous = trend[trend.length - 2]
      const diff = current - previous
      return {
        value: diff >= 0 ? `+${diff}` : `${diff}`,
        direction: diff >= 0 ? 'up' as const : 'down' as const
      }
    }

    const taskChange = getChange(tasks.trend)
    const rfiChange = getChange(rfis.trend)
    const punchChange = getChange(punchItems.trend)

    // Build filter links with project context
    const projectFilter = selectedProject?.id ? `&projectId=${selectedProject.id}` : ''

    return [
      {
        label: 'Tasks Pending',
        value: String(tasks.pending + tasks.inProgress),
        target: tasks.total || 1,
        change: taskChange.value,
        trend: taskChange.direction,
        icon: ClipboardList,
        color: themeColors.primary.DEFAULT,
        sparkline: tasks.trend.length > 0 ? tasks.trend : [0],
        ariaLabel: `${tasks.pending + tasks.inProgress} tasks pending out of ${tasks.total} total, ${taskChange.value} from last period`,
        link: '/tasks',
        filterLink: `/tasks?status=pending${projectFilter}`,
        overdueLink: tasks.overdue > 0 ? `/tasks?overdue=true${projectFilter}` : null,
        overdueCount: tasks.overdue,
        drilldownType: 'tasks' as DrilldownType,
        drilldownTitle: 'Tasks Pending'
      },
      {
        label: 'Open RFIs',
        value: String(rfis.open + rfis.pendingResponse),
        target: Math.max(rfis.total, 1),
        change: rfiChange.value,
        trend: rfiChange.direction,
        icon: AlertCircle,
        color: chartColors.orange,
        sparkline: rfis.trend.length > 0 ? rfis.trend : [0],
        ariaLabel: `${rfis.open + rfis.pendingResponse} open RFIs, ${rfis.overdue} overdue`,
        link: '/rfis',
        filterLink: `/rfis?status=open${projectFilter}`,
        overdueLink: rfis.overdue > 0 ? `/rfis?overdue=true${projectFilter}` : null,
        overdueCount: rfis.overdue,
        drilldownType: 'rfis' as DrilldownType,
        drilldownTitle: 'Open RFIs'
      },
      {
        label: 'Punch Items',
        value: String(punchItems.open + punchItems.inProgress),
        target: Math.max(punchItems.total, 1),
        change: punchChange.value,
        trend: punchChange.direction,
        icon: ListChecks,
        color: chartColors.purple,
        sparkline: punchItems.trend.length > 0 ? punchItems.trend : [0],
        ariaLabel: `${punchItems.open + punchItems.inProgress} punch items open, ${punchItems.verified} verified`,
        link: '/punch-lists',
        filterLink: `/punch-lists?status=open${projectFilter}`,
        overdueLink: null,
        overdueCount: 0,
        drilldownType: 'punch_items' as DrilldownType,
        drilldownTitle: 'Punch Items'
      },
      {
        label: 'Days Since Incident',
        value: String(safety.daysSinceIncident),
        target: 365,
        change: '+1',
        trend: 'up' as const,
        icon: Shield,
        color: themeColors.semantic.success,
        sparkline: safety.trend.length > 0 ? safety.trend : [safety.daysSinceIncident],
        ariaLabel: `${safety.daysSinceIncident} days since last incident`,
        link: '/safety',
        filterLink: `/safety${selectedProject?.id ? `?projectId=${selectedProject.id}` : ''}`,
        overdueLink: null,
        overdueCount: 0,
        drilldownType: 'safety' as DrilldownType,
        drilldownTitle: 'Safety Incidents'
      }
    ]
  }, [dashboardStats, selectedProject?.id])

  // Memoized sparkline component to prevent unnecessary re-renders
  const Sparkline = useMemo(() => {
    return memo(function SparklineComponent({ data, color }: { data: number[]; color: string }) {
      const max = Math.max(...data)
      const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100
        const y = 100 - (val / max) * 100
        return `${x},${y}`
      }).join(' ')

      return (
        <svg width="80" height="24" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: `drop-shadow(0 0 2px ${color}40)`
            }}
          />
        </svg>
      )
    })
  }, [])

  // Memoized event handlers to prevent child re-renders
  const handleCardFocus = useCallback((label: string) => {
    setFocusedCard(label)
  }, [])

  const handleCardBlur = useCallback(() => {
    setFocusedCard(null)
  }, [])

  // Helper function for health indicator - Using design tokens
  const getHealthColor = (status?: string) => {
    const statusColors = {
      'active': themeColors.semantic.success,
      'planning': themeColors.semantic.warning,
      'on_hold': themeColors.semantic.destructive,
      'completed': themeColors.primary.DEFAULT
    }
    return statusColors[status as keyof typeof statusColors] || statusColors.active
  }

  // Get layout version for conditional rendering
  const { isV2 } = useLayoutVersion()

  return (
    <SmartLayout showHeaderStats={false}>
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
        <div className="min-h-screen bg-concrete dark:bg-gray-950 bg-blueprint-grid-fine">
          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Quick Actions - Only show in V2 layout (V1 shows stats instead) */}
            {isV2 && (
              <div className="mb-8">
                <QuickActions projectId={selectedProject?.id} />
              </div>
            )}

            {/* Page Title - Only show in V1 layout (V2 has it in header) */}
            {!isV2 && (
              <div className="mb-12">
                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground mb-3">
                  Dashboard
                </h1>
                <div className="flex items-center gap-4">
                  <p className="font-body text-base text-steel-gray dark:text-gray-400">
                    Welcome back, {userProfile?.first_name || 'User'}
                  </p>
                  <span className="text-slate-300 dark:text-gray-600">•</span>
                  <p className="font-mono text-xs text-steel-gray dark:text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <LocalErrorBoundary
              title="Unable to load statistics"
              description="We couldn't load the dashboard statistics. Please try refreshing the page."
            >
              <div
                role="region"
                aria-label="Project statistics overview"
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12"
              >
                {stats.map((stat, index) => {
                const Icon = stat.icon
                const percentage = stat.target > 0 ? (parseInt(stat.value) / stat.target) * 100 : 0
                const isFocused = focusedCard === stat.label
                const hasOverdue = 'overdueCount' in stat && stat.overdueCount && stat.overdueCount > 0

                return (
                  <div
                    key={stat.label}
                    role="article"
                    aria-label={stat.ariaLabel}
                    tabIndex={0}
                    onFocus={() => handleCardFocus(stat.label)}
                    onBlur={handleCardBlur}
                    onClick={() => {
                      if ('drilldownType' in stat && stat.drilldownType) {
                        openDrilldown(stat.drilldownType, stat.drilldownTitle || stat.label)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && 'drilldownType' in stat && stat.drilldownType) {
                        openDrilldown(stat.drilldownType, stat.drilldownTitle || stat.label)
                      }
                    }}
                    className={`
                      group relative bg-white dark:bg-gray-900
                      border border-slate-200 dark:border-gray-800
                      rounded-xl p-6 cursor-pointer
                      transition-all duration-300 ease-out
                      hover:shadow-lg hover:-translate-y-1 hover:scale-[1.01]
                      ${isFocused ? 'shadow-lg -translate-y-1 scale-[1.01]' : 'shadow-sm'}
                    `}
                    style={{
                      boxShadow: isFocused
                        ? `0 8px 16px -4px ${stat.color}20, 0 4px 6px -2px ${stat.color}15`
                        : undefined,
                      borderColor: isFocused ? stat.color : undefined
                    }}
                    onMouseEnter={() => handleCardFocus(stat.label)}
                    onMouseLeave={handleCardBlur}
                  >
                    {/* Top accent bar */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-xl transition-opacity duration-300 ${isFocused ? 'opacity-100' : 'opacity-0'}`}
                      style={{
                        background: `linear-gradient(90deg, ${stat.color} 0%, ${stat.color}80 100%)`
                      }}
                    />

                    <div className="flex justify-between items-start mb-5">
                      <div
                        className={`
                          w-14 h-14 rounded-xl flex items-center justify-center
                          border transition-all duration-300
                          ${isFocused ? 'scale-105' : 'scale-100'}
                        `}
                        style={{
                          backgroundColor: `${stat.color}08`,
                          borderColor: `${stat.color}15`
                        }}
                      >
                        <Icon className="w-6 h-6" style={{ color: stat.color, strokeWidth: 2 }} />
                      </div>

                      <div
                        className={`
                          px-3.5 py-2 rounded-lg text-xs font-semibold
                          flex items-center gap-1.5 border
                          ${stat.trend === 'up'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
                          }
                        `}
                      >
                        {stat.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {stat.change}
                      </div>
                    </div>

                    <div className="mb-5">
                      <p className="label-blueprint text-steel-gray dark:text-gray-400 mb-2.5">
                        {stat.label}
                      </p>

                      <div className="flex items-baseline gap-3 mb-3">
                        <p className="stat-number text-4xl text-foreground">
                          {stat.value}
                        </p>
                        <p className="text-base text-muted font-medium">
                          / {stat.target}
                        </p>
                      </div>

                      {/* Sparkline */}
                      <div className="mb-3">
                        <Sparkline data={stat.sparkline} color={stat.color} />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between mb-2 text-xs text-muted font-medium">
                        <span>Progress to Target</span>
                        <span className="text-foreground font-semibold">{Math.round(percentage)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out relative"
                          style={{
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, ${stat.color} 0%, ${stat.color}CC 100%)`,
                            boxShadow: `0 0 8px ${stat.color}40`
                          }}
                        >
                          {/* Shimmer effect */}
                          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                            style={{
                              backgroundSize: '200% 100%',
                              animation: 'shimmer 2s infinite'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Overdue badge and View link */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-gray-800">
                      {hasOverdue ? (
                        <Link
                          to={'overdueLink' in stat && stat.overdueLink ? stat.overdueLink : stat.filterLink}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-100 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {stat.overdueCount} Overdue
                        </Link>
                      ) : (
                        <span />
                      )}
                      <Link
                        to={stat.filterLink || stat.link}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-600 transition-colors"
                      >
                        View All
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                )
              })}
              </div>
            </LocalErrorBoundary>

            {/* Morning Briefing Widget - Full Width */}
            <LocalErrorBoundary
              title="Unable to load morning briefing"
              description="We couldn't load your daily summary. Please try again."
            >
              <div className="mb-8">
                <MorningBriefingWidget projectId={selectedProject?.id} />
              </div>
            </LocalErrorBoundary>

            {/* Three Column Layout: Weather | Alerts | Notices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Weather Forecast Widget */}
              <LocalErrorBoundary
                title="Unable to load weather"
                description="We couldn't load weather data. Please try again."
              >
                <WeatherForecastWidget projectId={selectedProject?.id} />
              </LocalErrorBoundary>

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

            {/* Two Column Layout: Projects | Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Active Projects */}
              <LocalErrorBoundary
                title="Unable to load projects"
                description="We couldn't load the projects list. Please try again."
              >
                <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl p-8 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 className="heading-card mb-1">
                        Active Projects
                      </h2>
                      <p className="body-small text-muted">
                        {projects?.length || 0} projects in progress
                      </p>
                    </div>
                    <Link
                      to="/projects"
                      className="text-primary text-sm font-semibold bg-primary-50 border border-primary-200 hover:bg-primary-100 dark:bg-primary-950 dark:border-primary-800 dark:hover:bg-primary-900 cursor-pointer px-4 py-2 rounded-lg transition-all flex items-center gap-2 no-underline"
                    >
                      View All
                      <BarChart3 className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="flex flex-col gap-5">
                    {projects && projects.length > 0 ? (
                      projects.slice(0, 3).map((project) => {
                        const healthColor = getHealthColor(project.status)
                        // Get real progress from projectsProgress data
                        const projectProgress = projectsProgress?.find(p => p.projectId === project.id)
                        const progress = projectProgress?.progress ?? 0
                        const healthStatus = projectProgress?.healthStatus ?? 'fair'

                        return (
                          <Link
                            key={project.id}
                            to={`/projects/${project.id}`}
                            className="block p-5 bg-concrete dark:bg-gray-800/50 rounded-lg border border-slate-100 dark:border-gray-700 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 no-underline"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {project.name}
                                  </h3>
                                  {/* Health indicator */}
                                  <div
                                    className="w-2 h-2 rounded-full animate-pulse"
                                    style={{
                                      backgroundColor: healthColor,
                                      boxShadow: `0 0 0 3px ${healthColor}20`
                                    }}
                                    title={`Project health: ${project.status}`}
                                  />
                                </div>
                                <div className="flex items-center gap-5 text-label text-muted flex-wrap">
                                  {project.start_date && (
                                    <>
                                      <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Started {format(new Date(project.start_date), 'MMM d, yyyy')}
                                      </span>
                                      <span>•</span>
                                    </>
                                  )}
                                  <span className="text-caption">
                                    Updated recently
                                  </span>
                                </div>
                              </div>

                              <Badge variant={getStatusVariant(project.status || 'unknown')}>
                                {(project.status ?? 'unknown').replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>

                            {/* Progress Bar */}
                            <div>
                              <div className="flex justify-between mb-2 text-xs text-muted">
                                <span>Progress</span>
                                <span className="text-foreground font-semibold">{progress}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700 ease-out"
                                  style={{
                                    width: `${progress}%`,
                                    background: 'linear-gradient(90deg, #1E40AF 0%, #1E40AFCC 100%)'
                                  }}
                                />
                              </div>
                            </div>
                          </Link>
                        )
                      })
                    ) : (
                      <div className="p-12 text-center">
                        <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="body-small text-muted">No active projects</p>
                      </div>
                    )}
                  </div>
                </div>
              </LocalErrorBoundary>

              {/* Sidebar - Action Required Widget */}
              <div className="lg:col-span-1">
                <LocalErrorBoundary
                  title="Unable to load action items"
                  description="We couldn't load action items. Please try again."
                >
                  <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-primary" />
                        <h3 className="heading-card text-base font-semibold">Action Required</h3>
                      </div>
                      {actionItems && actionItems.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {actionItems.length}
                        </Badge>
                      )}
                    </div>

                    {actionsLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-muted" />
                      </div>
                    ) : actionItems && actionItems.length > 0 ? (
                      <div className="space-y-3">
                        {actionItems.slice(0, 5).map((item) => (
                          <Link
                            key={item.id}
                            to={item.link}
                            className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700 no-underline"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant={item.isOverdue ? 'destructive' : item.priority === 'urgent' ? 'destructive' : item.priority === 'high' ? 'secondary' : 'outline'}
                                    className="text-[10px] uppercase"
                                  >
                                    {item.isOverdue ? 'Overdue' : item.type.replace('_', ' ')}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium text-foreground truncate">
                                  {item.title}
                                </p>
                                <p className="text-xs text-muted truncate">
                                  {item.projectName}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted flex-shrink-0 mt-1" />
                            </div>
                          </Link>
                        ))}
                        {actionItems.length > 5 && (
                          <Link
                            to="/tasks"
                            className="block text-center text-sm text-primary font-medium py-2 hover:underline"
                          >
                            View all {actionItems.length} items
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Shield className="w-10 h-10 mx-auto mb-2 text-green-500" />
                        <p className="text-sm text-muted">All caught up!</p>
                        <p className="text-xs text-muted">No items need your attention</p>
                      </div>
                    )}
                  </div>
                </LocalErrorBoundary>
              </div>
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
