// Polished Variant 1: Professional Blueprint - IMPROVED VERSION
// All 12 enhancement categories implemented with functioning code

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft, Calendar, CheckCircle2, Clock, BarChart3, Activity, TrendingDown } from 'lucide-react'
import { useState } from 'react'

export default function PolishedVariant1ProfessionalImproved() {
  const [loadingStates, setLoadingStates] = useState({ stats: false, projects: false })
  const [focusedCard, setFocusedCard] = useState<string | null>(null)

  const stats = [
    { label: 'Active Projects', value: '12', target: 15, change: '+2', trend: 'up', icon: Building2, color: '#1E40AF', sparkline: [8, 10, 9, 11, 12], ariaLabel: '12 active projects out of 15 target, up 2 from last period' },
    { label: 'Team Members', value: '48', target: 50, change: '+5', trend: 'up', icon: Users, color: '#059669', sparkline: [40, 42, 45, 46, 48], ariaLabel: '48 team members out of 50 target, up 5 from last period' },
    { label: 'Pending Reports', value: '8', target: 0, change: '-3', trend: 'down', icon: FileText, color: '#D97706', sparkline: [15, 12, 11, 10, 8], ariaLabel: '8 pending reports with target of 0, down 3 from last period' },
    { label: 'Open RFIs', value: '23', target: 15, change: '+4', trend: 'up', icon: AlertCircle, color: '#DC2626', sparkline: [18, 19, 20, 22, 23], ariaLabel: '23 open RFIs with target of 15, up 4 from last period' }
  ]

  const projects = [
    { name: 'Downtown Tower', progress: 68, status: 'On Track', dueDate: 'Mar 15, 2024', budget: 92, health: 'healthy', lastUpdate: '2h ago' },
    { name: 'Harbor Bridge', progress: 45, status: 'At Risk', dueDate: 'Apr 22, 2024', budget: 88, health: 'warning', lastUpdate: '5h ago' },
    { name: 'Medical Center', progress: 82, status: 'Ahead', dueDate: 'Feb 28, 2024', budget: 96, health: 'excellent', lastUpdate: '30m ago' }
  ]

  const activities = [
    { user: 'Sarah Johnson', action: 'completed daily report', project: 'Downtown Tower', time: '2h ago', type: 'report', priority: 'normal' },
    { user: 'Mike Chen', action: 'uploaded 12 photos', project: 'Harbor Bridge', time: '4h ago', type: 'photos', priority: 'normal' },
    { user: 'Alex Rivera', action: 'submitted RFI #156', project: 'Medical Center', time: '5h ago', type: 'rfi', priority: 'high' }
  ]

  // Helper function to render sparkline
  const renderSparkline = (data: number[], color: string) => {
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
  }

  // Helper function for status badge
  const getStatusStyle = (status: string) => {
    const styles = {
      'On Track': { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', icon: CheckCircle2 },
      'Ahead': { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', icon: TrendingUp },
      'At Risk': { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: AlertCircle }
    }
    return styles[status as keyof typeof styles] || styles['On Track']
  }

  // Helper function for health indicator
  const getHealthColor = (health: string) => {
    const colors = {
      'excellent': '#059669',
      'healthy': '#059669',
      'warning': '#D97706',
      'critical': '#DC2626'
    }
    return colors[health as keyof typeof colors] || colors.healthy
  }

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#F8FAFC',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header - Enhanced with better shadows and spacing */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link
              to="/blueprint-samples/variants"
              style={{
                color: '#64748B',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                marginLeft: '-0.75rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#1E40AF'
                e.currentTarget.style.backgroundColor = '#F1F5F9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#64748B'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Variants
            </Link>

            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#EFF6FF',
              color: '#1E40AF',
              fontSize: '0.75rem',
              fontWeight: '600',
              borderRadius: '8px',
              letterSpacing: '0.025em',
              border: '1px solid #BFDBFE',
              boxShadow: '0 1px 2px 0 rgba(30, 64, 175, 0.05)'
            }}>
              VARIANT 1: PROFESSIONAL (IMPROVED)
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Title - Enhanced typography scale */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.25rem',
            fontWeight: '700',
            color: '#0F172A',
            marginBottom: '0.75rem',
            letterSpacing: '-0.025em',
            lineHeight: '1.2'
          }}>
            Dashboard
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <p style={{
              color: '#64748B',
              fontSize: '0.9375rem',
              fontWeight: '400'
            }}>
              Welcome back, John
            </p>
            <span style={{ color: '#CBD5E1' }}>•</span>
            <p style={{
              color: '#94A3B8',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}>
              <Clock className="w-3.5 h-3.5" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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
                onFocus={() => setFocusedCard(stat.label)}
                onBlur={() => setFocusedCard(null)}
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
                onMouseEnter={(e) => {
                  setFocusedCard(stat.label)
                }}
                onMouseLeave={(e) => {
                  setFocusedCard(null)
                }}
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
                    backgroundColor: stat.trend === 'up' ? '#ECFDF5' : stat.trend === 'down' ? '#FEF2F2' : '#F1F5F9',
                    color: stat.trend === 'up' ? '#059669' : stat.trend === 'down' ? '#DC2626' : '#64748B',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    border: `1px solid ${stat.trend === 'up' ? '#A7F3D0' : stat.trend === 'down' ? '#FECACA' : '#E2E8F0'}`
                  }}>
                    {stat.trend === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {stat.change}
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: '#64748B',
                    marginBottom: '0.625rem',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {stat.label}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <p style={{
                      fontSize: '2.5rem',
                      fontWeight: '700',
                      color: '#0F172A',
                      lineHeight: '1',
                      letterSpacing: '-0.02em'
                    }}>
                      {stat.value}
                    </p>
                    <p style={{
                      fontSize: '1rem',
                      color: '#94A3B8',
                      fontWeight: '500'
                    }}>
                      / {stat.target}
                    </p>
                  </div>

                  {/* Sparkline */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    {renderSparkline(stat.sparkline, stat.color)}
                  </div>
                </div>

                {/* Enhanced Progress Bar */}
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#64748B',
                    fontWeight: '500'
                  }}>
                    <span>Progress to Target</span>
                    <span style={{ color: '#0F172A', fontWeight: '600' }}>{Math.round(percentage)}%</span>
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
          {/* Active Projects - Enhanced visualization and status indicators */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <div>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#0F172A',
                  marginBottom: '0.25rem',
                  letterSpacing: '-0.01em'
                }}>
                  Active Projects
                </h2>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#64748B'
                }}>
                  {projects.length} projects in progress
                </p>
              </div>
              <button style={{
                color: '#1E40AF',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                cursor: 'pointer',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#DBEAFE'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#EFF6FF'
              }}
              >
                View All
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {projects.map((project) => {
                const statusStyle = getStatusStyle(project.status)
                const StatusIcon = statusStyle.icon
                const healthColor = getHealthColor(project.health)

                return (
                  <div
                    key={project.name}
                    tabIndex={0}
                    role="article"
                    aria-label={`${project.name} project: ${project.progress}% complete, status ${project.status}`}
                    style={{
                      padding: '1.5rem',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      border: '1px solid #F1F5F9',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF'
                      e.currentTarget.style.borderColor = statusStyle.border
                      e.currentTarget.style.boxShadow = `0 4px 6px -1px ${statusStyle.color}10`
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC'
                      e.currentTarget.style.borderColor = '#F1F5F9'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                          <h3 style={{
                            fontSize: '1.0625rem',
                            fontWeight: '600',
                            color: '#0F172A'
                          }}>
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
                          title={`Project health: ${project.health}`}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8125rem', color: '#64748B', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Calendar className="w-3.5 h-3.5" />
                            Due {project.dueDate}
                          </span>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Activity className="w-3.5 h-3.5" />
                            Budget: {project.budget}%
                          </span>
                          <span>•</span>
                          <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>
                            Updated {project.lastUpdate}
                          </span>
                        </div>
                      </div>

                      <span style={{
                        padding: '0.375rem 0.875rem',
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        border: `1px solid ${statusStyle.border}`
                      }}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {project.status}
                      </span>
                    </div>

                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.625rem',
                        fontSize: '0.8125rem'
                      }}>
                        <span style={{ color: '#64748B', fontWeight: '500' }}>Project Progress</span>
                        <span style={{ color: '#0F172A', fontWeight: '600', fontVariantNumeric: 'tabular-nums' }}>{project.progress}%</span>
                      </div>
                      <div style={{
                        width: '100%',
                        height: '8px',
                        backgroundColor: '#E2E8F0',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${project.progress}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${statusStyle.color} 0%, ${statusStyle.color}CC 100%)`,
                          borderRadius: '4px',
                          transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: `0 0 8px ${statusStyle.color}40`
                        }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Empty state example (hidden by default) */}
            {projects.length === 0 && (
              <div style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                color: '#94A3B8'
              }}>
                <Building2 className="w-12 h-12" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem', fontWeight: '500' }}>No active projects</p>
                <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Create a new project to get started</p>
              </div>
            )}
          </div>

          {/* Recent Activity - Enhanced with priority indicators */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#0F172A',
              marginBottom: '1.75rem',
              letterSpacing: '-0.01em'
            }}>
              Recent Activity
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {activities.map((activity, i) => {
                const getActivityIcon = () => {
                  switch(activity.type) {
                    case 'report': return FileText
                    case 'photos': return Building2
                    case 'rfi': return AlertCircle
                    default: return Activity
                  }
                }
                const ActivityIcon = getActivityIcon()

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      position: 'relative',
                      paddingBottom: i < activities.length - 1 ? '1.25rem' : '0',
                      borderBottom: i < activities.length - 1 ? '1px solid #F1F5F9' : 'none'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid #BFDBFE',
                      position: 'relative'
                    }}>
                      <ActivityIcon className="w-4 h-4" style={{ color: '#1E40AF' }} />
                      {activity.priority === 'high' && (
                        <div style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '12px',
                          height: '12px',
                          backgroundColor: '#DC2626',
                          borderRadius: '50%',
                          border: '2px solid #FFFFFF',
                          boxShadow: '0 2px 4px rgba(220, 38, 38, 0.3)'
                        }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#0F172A',
                        marginBottom: '0.375rem',
                        lineHeight: '1.5',
                        fontWeight: '500'
                      }}>
                        <strong style={{ fontWeight: '600' }}>{activity.user}</strong>{' '}
                        <span style={{ color: '#64748B', fontWeight: '400' }}>{activity.action}</span>
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.8125rem',
                        color: '#94A3B8'
                      }}>
                        <span>{activity.project}</span>
                        <span style={{ fontSize: '0.5rem' }}>●</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock className="w-3 h-3" />
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* View all link */}
            <button style={{
              width: '100%',
              marginTop: '1.5rem',
              padding: '0.75rem',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#1E40AF',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#EFF6FF'
              e.currentTarget.style.borderColor = '#BFDBFE'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC'
              e.currentTarget.style.borderColor = '#E2E8F0'
            }}
            >
              View All Activity
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
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
  )
}
