// Polished Variant 2: Technical Dark
// Modern dark theme with refined blueprint accents and technical precision
// Fully aligned with JobSight Design System - Dark Mode variant

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft, Activity, Zap } from 'lucide-react'

export default function PolishedVariant2TechnicalDark() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+16.7%', icon: Building2, color: '#3B82F6' },
    { label: 'Team Members', value: '48', change: '+11.6%', icon: Users, color: '#10B981' },
    { label: 'Pending Reports', value: '8', change: '-27.3%', icon: FileText, color: '#FBBF24' },
    { label: 'Open RFIs', value: '23', change: '+21.1%', icon: AlertCircle, color: '#EF4444' }
  ]

  const metrics = [
    { label: 'Completion Rate', value: 94, unit: '%', target: 95, status: 'good' },
    { label: 'Budget Utilization', value: 87, unit: '%', target: 90, status: 'good' },
    { label: 'Safety Score', value: 98, unit: '%', target: 95, status: 'excellent' },
    { label: 'Schedule Variance', value: -2, unit: 'days', target: 0, status: 'warning' }
  ]

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#0A0F1E',
      backgroundImage: `
        linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#F8FAFC'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link
              to="/blueprint-samples/variants"
              style={{
                color: '#94A3B8',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#60A5FA'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Variants
            </Link>

            <div style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
              color: '#FFFFFF',
              fontSize: '0.75rem',
              fontWeight: '600',
              borderRadius: '6px',
              letterSpacing: '0.025em',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.2)'
            }}>
              VARIANT 2: TECHNICAL DARK
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '4px',
              height: '32px',
              background: 'linear-gradient(180deg, #3B82F6 0%, #60A5FA 100%)',
              borderRadius: '2px'
            }} />
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '600',
              fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              color: '#F8FAFC',
              letterSpacing: '-0.025em'
            }}>
              Command Center
            </h1>
          </div>
          <p style={{
            color: '#94A3B8',
            fontSize: '0.875rem',
            paddingLeft: '1rem'
          }}>
            Real-time project monitoring • Last updated {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {stats.map((stat) => {
            const Icon = stat.icon

            return (
              <div
                key={stat.label}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.6)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(59, 130, 246, 0.1)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${stat.color}50`
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.1)'
                  e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.6)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Glow effect */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100px',
                  height: '100px',
                  background: `radial-gradient(circle, ${stat.color}15 0%, transparent 70%)`,
                  pointerEvents: 'none'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: `${stat.color}15`,
                      border: `1px solid ${stat.color}30`,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>

                    <div style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: parseFloat(stat.change) > 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                      border: `1px solid ${parseFloat(stat.change) > 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`,
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: parseFloat(stat.change) > 0 ? '#34D399' : '#F87171',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <TrendingUp className="w-3 h-3" style={{
                        transform: parseFloat(stat.change) > 0 ? 'none' : 'rotate(180deg)'
                      }} />
                      {stat.change}
                    </div>
                  </div>

                  <div>
                    <p style={{
                      fontSize: '0.8125rem',
                      color: '#94A3B8',
                      marginBottom: '0.5rem',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {stat.label}
                    </p>

                    <p style={{
                      fontSize: '2.5rem',
                      fontWeight: '600',
                      color: '#F8FAFC',
                      lineHeight: '1',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Metrics Grid */}
        <div style={{
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(59, 130, 246, 0.1)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <Activity className="w-5 h-5" style={{ color: '#60A5FA' }} />
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              color: '#F8FAFC'
            }}>
              Performance Metrics
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem'
          }}>
            {metrics.map((metric) => (
              <div key={metric.label}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.75rem'
                }}>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: '#94A3B8',
                    fontWeight: '500'
                  }}>
                    {metric.label}
                  </p>
                  <p style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    color: metric.status === 'excellent' ? '#34D399' : metric.status === 'warning' ? '#FBBF24' : '#60A5FA',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {metric.value > 0 && metric.label !== 'Schedule Variance' ? '+' : ''}{metric.value}{metric.unit}
                  </p>
                </div>

                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: 'rgba(51, 65, 85, 0.5)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.abs(metric.value)}%`,
                    height: '100%',
                    background: metric.status === 'excellent'
                      ? 'linear-gradient(90deg, #059669 0%, #34D399 100%)'
                      : metric.status === 'warning'
                      ? 'linear-gradient(90deg, #D97706 0%, #FBBF24 100%)'
                      : 'linear-gradient(90deg, #1E40AF 0%, #60A5FA 100%)',
                    borderRadius: '2px',
                    boxShadow: metric.status === 'excellent'
                      ? '0 0 8px #34D39950'
                      : metric.status === 'warning'
                      ? '0 0 8px #FBBF2450'
                      : '0 0 8px #60A5FA50',
                    transition: 'width 0.5s ease'
                  }} />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  color: '#64748B'
                }}>
                  <span>Target: {metric.target}{metric.unit}</span>
                  <span style={{
                    color: metric.status === 'excellent' ? '#34D399' : metric.status === 'warning' ? '#FBBF24' : '#60A5FA',
                    fontWeight: '500'
                  }}>
                    {metric.status === 'excellent' ? 'Excellent' : metric.status === 'warning' ? 'Needs Attention' : 'Good'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem'
        }}>
          {[
            { label: 'Database', status: 'Operational', latency: '12ms', color: '#34D399' },
            { label: 'API Services', status: 'Operational', latency: '45ms', color: '#34D399' },
            { label: 'File Storage', status: 'Operational', latency: '8ms', color: '#34D399' }
          ].map((service) => (
            <div
              key={service.label}
              style={{
                backgroundColor: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: service.color,
                  borderRadius: '50%',
                  boxShadow: `0 0 8px ${service.color}`
                }} />
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#F8FAFC',
                    fontWeight: '500',
                    marginBottom: '0.125rem'
                  }}>
                    {service.label}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#64748B'
                  }}>
                    {service.latency}
                  </p>
                </div>
              </div>

              <Zap className="w-4 h-4" style={{ color: service.color }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
