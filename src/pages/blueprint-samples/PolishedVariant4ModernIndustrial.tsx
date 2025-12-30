// Polished Variant 4: Modern Industrial
// Contemporary construction aesthetic with refined polish
// Fully aligned with JobSight Design System - Industrial theme variant

import { Link } from 'react-router-dom'
import { AlertCircle, Building2, ArrowLeft, HardHat, Ruler, Wrench } from 'lucide-react'

export default function PolishedVariant4ModernIndustrial() {
  const stats = [
    { label: 'Active Sites', value: '12', unit: 'projects', icon: Building2, color: '#1E40AF', bgColor: '#DBEAFE' },
    { label: 'Crew Members', value: '48', unit: 'workers', icon: HardHat, color: '#10B981', bgColor: '#D1FAE5' },
    { label: 'Safety Reports', value: '8', unit: 'pending', icon: AlertCircle, color: '#EF4444', bgColor: '#FEE2E2' },
    { label: 'Work Orders', value: '23', unit: 'active', icon: Wrench, color: '#FBBF24', bgColor: '#FEF3C7' }
  ]

  const sites = [
    {
      name: 'Downtown Tower',
      location: 'Manhattan, NY',
      crew: 24,
      progress: 68,
      phase: 'Foundation',
      safety: 98,
      priority: 'high'
    },
    {
      name: 'Harbor Bridge',
      location: 'Brooklyn, NY',
      crew: 18,
      progress: 45,
      phase: 'Structural',
      safety: 96,
      priority: 'medium'
    },
    {
      name: 'Medical Center',
      location: 'Queens, NY',
      crew: 32,
      progress: 82,
      phase: 'Finishing',
      safety: 100,
      priority: 'low'
    }
  ]

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#FAFAF9',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '3px solid #0A0A0A',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link
              to="/blueprint-samples/variants"
              style={{
                color: '#57534E',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              <ArrowLeft className="w-4 h-4" style={{ strokeWidth: 2.5 }} />
              Back
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '32px',
                height: '3px',
                backgroundColor: '#1E40AF'
              }} />
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#0A0A0A',
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}>
                Variant 4: Modern Industrial
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div style={{
          marginBottom: '2.5rem',
          padding: '2rem',
          backgroundColor: '#0A0A0A',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Diagonal stripes */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '100%',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(30, 64, 175, 0.1) 10px, rgba(30, 64, 175, 0.1) 20px)',
            pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <Ruler className="w-6 h-6" style={{ color: '#1E40AF' }} />
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '700',
                fontFamily: '"DM Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
                letterSpacing: '-0.01em',
                textTransform: 'uppercase'
              }}>
                Site Operations
              </h1>
            </div>
            <p style={{
              color: '#A8A29E',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              Live monitoring • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          {stats.map((stat) => {
            const Icon = stat.icon

            return (
              <div
                key={stat.label}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '2px solid #E7E5E4',
                  padding: '1.5rem',
                  position: 'relative',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = stat.color
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = `0 8px 16px ${stat.color}20`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E7E5E4'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {/* Top stripe */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  backgroundColor: stat.color
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: stat.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${stat.color}`
                  }}>
                    <Icon className="w-6 h-6" style={{ color: stat.color, strokeWidth: 2.5 }} />
                  </div>
                </div>

                <div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#78716C',
                    marginBottom: '0.5rem',
                    fontWeight: '700',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}>
                    {stat.label}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <p style={{
                      fontSize: '3rem',
                      fontWeight: '800',
                      color: '#0A0A0A',
                      lineHeight: '1',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {stat.value}
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#78716C',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {stat.unit}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Sites List */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '2px solid #E7E5E4',
          padding: '0'
        }}>
          {/* Header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '2px solid #E7E5E4',
            backgroundColor: '#FAFAF9'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              fontFamily: '"DM Sans", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
              color: '#0A0A0A',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Active Job Sites
            </h2>
          </div>

          {/* Sites */}
          <div>
            {sites.map((site, index) => (
              <div
                key={site.name}
                style={{
                  padding: '1.5rem',
                  borderBottom: index < sites.length - 1 ? '1px solid #F5F5F4' : 'none',
                  transition: 'all 0.15s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FAFAF9'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#0A0A0A'
                      }}>
                        {site.name}
                      </h3>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: site.priority === 'high' ? '#FEE2E2' : site.priority === 'medium' ? '#FEF3C7' : '#DBEAFE',
                        color: site.priority === 'high' ? '#DC2626' : site.priority === 'medium' ? '#D97706' : '#2563EB',
                        fontSize: '0.625rem',
                        fontWeight: '700',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        border: `1px solid ${site.priority === 'high' ? '#FCA5A5' : site.priority === 'medium' ? '#FCD34D' : '#93C5FD'}`
                      }}>
                        {site.priority}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '2rem',
                      fontSize: '0.8125rem',
                      color: '#57534E',
                      fontWeight: '500'
                    }}>
                      <span>{site.location}</span>
                      <span>•</span>
                      <span>{site.crew} workers</span>
                      <span>•</span>
                      <span>Phase: {site.phase}</span>
                      <span>•</span>
                      <span>Safety: {site.safety}%</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{
                      fontSize: '2rem',
                      fontWeight: '800',
                      color: '#0A0A0A',
                      lineHeight: '1',
                      marginBottom: '0.25rem',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {site.progress}%
                    </p>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#78716C',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      Complete
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#F5F5F4',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '100%',
                    width: `${site.progress}%`,
                    background: 'repeating-linear-gradient(45deg, #1E40AF, #1E40AF 10px, #3B82F6 10px, #3B82F6 20px)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
