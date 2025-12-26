// File: /src/pages/DashboardPage.tsx
// Professional Blueprint Dashboard - Polished, production-ready design

import { useState, useCallback, useMemo, memo } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { useMyProjects } from '@/features/projects/hooks/useProjects'
import { useAuth } from '@/lib/auth/AuthContext'
import { DashboardSelector, useDashboardView } from '@/features/dashboards'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  AlertCircle,
  ListChecks,
  Shield,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Building2,
  CheckCircle2,
  Activity,
  TrendingDown,
  BarChart3
} from 'lucide-react'
import { NoticesWidget } from '@/features/notices/components'
import { format } from 'date-fns'
import { colors as themeColors, chartColors, getStatusVariant } from '@/lib/theme/tokens'

export function DashboardPage() {
  const { data: projects } = useMyProjects()
  const { userProfile } = useAuth()
  const dashboardView = useDashboardView()
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [focusedCard, setFocusedCard] = useState<string | null>(null)

  // Get the selected project or the first active project
  const selectedProject = selectedProjectId
    ? projects?.find((p) => p.id === selectedProjectId)
    : projects?.find((p) => p.status === 'active') || projects?.[0]

  // Check if user has a role-based dashboard
  const hasRoleDashboard = dashboardView !== 'default'

  // Professional Blueprint stats with sparklines - Using design tokens
  const stats = [
    {
      label: 'Tasks Pending',
      value: '12',
      target: 15,
      change: '+3',
      trend: 'up' as const,
      icon: ClipboardList,
      color: themeColors.primary.DEFAULT,
      sparkline: [8, 10, 9, 11, 12],
      ariaLabel: '12 tasks pending out of 15 target, up 3 from last period'
    },
    {
      label: 'Open RFIs',
      value: '5',
      target: 3,
      change: '+2',
      trend: 'up' as const,
      icon: AlertCircle,
      color: chartColors.orange,
      sparkline: [2, 3, 4, 4, 5],
      ariaLabel: '5 open RFIs with target of 3, up 2 from last period'
    },
    {
      label: 'Punch Items',
      value: '23',
      target: 15,
      change: '-8',
      trend: 'down' as const,
      icon: ListChecks,
      color: chartColors.purple,
      sparkline: [35, 30, 28, 25, 23],
      ariaLabel: '23 punch items with target of 15, down 8 from last period'
    },
    {
      label: 'Days Since Incident',
      value: '127',
      target: 365,
      change: '+1',
      trend: 'up' as const,
      icon: Shield,
      color: themeColors.semantic.success,
      sparkline: [123, 124, 125, 126, 127],
      ariaLabel: '127 days since last incident with target of 365'
    }
  ]

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
                const percentage = (parseInt(stat.value) / stat.target) * 100
                const isFocused = focusedCard === stat.label

                return (
                  <div
                    key={stat.label}
                    role="article"
                    aria-label={stat.ariaLabel}
                    tabIndex={0}
                    onFocus={() => handleCardFocus(stat.label)}
                    onBlur={handleCardBlur}
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
                      transform: isFocused ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)'
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
                  </div>
                )
              })}
            </div>

            {/* Two Column Layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '2rem'
            }}>
              {/* Active Projects */}
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
                      const progress = 75 // Mock progress

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

              {/* Sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Notices Widget */}
                <NoticesWidget projectId={selectedProject?.id} />
              </div>
            </div>
          </div>

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
