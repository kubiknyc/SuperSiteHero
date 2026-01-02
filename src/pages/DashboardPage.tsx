// File: /src/pages/DashboardPage.tsx
// Professional Blueprint Dashboard - Polished, production-ready design

import { useState, useCallback, useMemo, memo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
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
      if (trend.length < 2) return { value: '0', direction: 'up' as const }
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
        <svg width="80" height="24" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
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
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#F8FAFC',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Page Title - Using typography utilities */}
            <div className="mb-12">
              <h1 className="heading-page mb-3">
                Dashboard
              </h1>
              <div className="flex items-center gap-4">
                <p className="body-base">
                  Welcome back, {userProfile?.first_name || 'User'}
                </p>
                <span className="text-muted">•</span>
                <p className="text-caption flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            {/* Stats Grid - Enhanced with sparklines, better interactions, accessibility */}
            <LocalErrorBoundary
              title="Unable to load statistics"
              description="We couldn't load the dashboard statistics. Please try refreshing the page."
            >
              <div
                role="region"
                aria-label="Project statistics overview"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1.5rem',
                  marginBottom: '3rem'
                }}
              >
                {stats.map((stat) => {
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
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${isFocused ? stat.color : '#E2E8F0'}`,
                      borderRadius: '12px',
                      padding: '1.75rem',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: isFocused
                        ? `0 8px 16px -4px ${stat.color}20, 0 4px 6px -2px ${stat.color}15`
                        : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                      transform: isFocused ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
                      textDecoration: 'none',
                      display: 'block'
                    }}
                    onMouseEnter={() => handleCardFocus(stat.label)}
                    onMouseLeave={handleCardBlur}
                  >
                    {/* Top accent bar */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: `linear-gradient(90deg, ${stat.color} 0%, ${stat.color}80 100%)`,
                      opacity: isFocused ? 1 : 0,
                      transition: 'opacity 0.25s'
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.25rem' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        backgroundColor: `${stat.color}08`,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${stat.color}15`,
                        transition: 'all 0.25s',
                        transform: isFocused ? 'scale(1.05)' : 'scale(1)'
                      }}>
                        <Icon className="w-6 h-6" style={{ color: stat.color, strokeWidth: 2 }} />
                      </div>

                      <div style={{
                        padding: '0.5rem 0.875rem',
                        backgroundColor: stat.trend === 'up' ? '#ECFDF5' : '#FEF2F2',
                        color: stat.trend === 'up' ? '#059669' : '#DC2626',
                        borderRadius: '8px',
                        fontSize: '0.8125rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        border: `1px solid ${stat.trend === 'up' ? '#A7F3D0' : '#FECACA'}`
                      }}>
                        {stat.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {stat.change}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                      <p className="text-uppercase-label mb-2.5">
                        {stat.label}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <p className="text-4xl font-bold text-foreground dark:text-gray-50 leading-none tracking-tight">
                          {stat.value}
                        </p>
                        <p className="text-base text-muted font-medium">
                          / {stat.target}
                        </p>
                      </div>

                      {/* Sparkline */}
                      <div style={{ marginBottom: '0.75rem' }}>
                        <Sparkline data={stat.sparkline} color={stat.color} />
                      </div>
                    </div>

                    {/* Enhanced Progress Bar */}
                    <div>
                      <div className="flex justify-between mb-2 text-xs text-muted font-medium">
                        <span>Progress to Target</span>
                        <span className="text-foreground dark:text-gray-50 font-semibold">{Math.round(percentage)}%</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#F1F5F9',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${stat.color} 0%, ${stat.color}CC 100%)`,
                          borderRadius: '4px',
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          boxShadow: `0 0 8px ${stat.color}40`
                        }}>
                          {/* Shimmer effect */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '-100%',
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                            animation: 'shimmer 2s infinite'
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Overdue badge and View link */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                      {hasOverdue ? (
                        <Link
                          to={'overdueLink' in stat && stat.overdueLink ? stat.overdueLink : stat.filterLink}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded-md border border-red-100"
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

            {/* Three Column Layout: Projects | Weather | Alerts */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>
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
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '2rem'
            }}>
              {/* Active Projects */}
              <LocalErrorBoundary
                title="Unable to load projects"
                description="We couldn't load the projects list. Please try again."
              >
                <div style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '2rem',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                }}>
                  <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="heading-card mb-1 heading-section">
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                          style={{
                            padding: '1.5rem',
                            backgroundColor: '#F8FAFC',
                            borderRadius: '10px',
                            border: '1px solid #F1F5F9',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            display: 'block'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                <h3 className="text-lg font-semibold text-foreground dark:text-gray-50 heading-subsection">
                                  {project.name}
                                </h3>
                                {/* Health indicator */}
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: healthColor,
                                  boxShadow: `0 0 0 3px ${healthColor}20`,
                                  animation: 'pulse 2s infinite'
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
                              <span className="text-foreground dark:text-gray-50 font-semibold">{progress}%</span>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '6px',
                              backgroundColor: '#F1F5F9',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${progress}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #1E40AF 0%, #1E40AFCC 100%)',
                                borderRadius: '3px',
                                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                              }} />
                            </div>
                          </div>
                        </Link>
                      )
                    })
                  ) : (
                    <div className="p-12 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-secondary" />
                      <p className="body-small text-muted">No active projects</p>
                    </div>
                  )}
                  </div>
                </div>
              </LocalErrorBoundary>

              {/* Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Action Required Widget */}
                <LocalErrorBoundary
                  title="Unable to load action items"
                  description="We couldn't load action items. Please try again."
                >
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
                  }}>
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
                            className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100"
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

          {/* Animations */}
          <style>{`
            @keyframes shimmer {
              0% { left: -100%; }
              100% { left: 100%; }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
      )}
    </AppLayout>
  )
}
