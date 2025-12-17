// Polished Variant 3: Minimal Precision
// Ultra-minimal design with perfect execution and refined typography
// Inspired by Swiss Design principles with JobSight professional aesthetic

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft } from 'lucide-react'

export default function PolishedVariant3MinimalPrecision() {
  const stats = [
    { label: 'Projects', value: '12', change: '+2' },
    { label: 'Team', value: '48', change: '+5' },
    { label: 'Reports', value: '8', change: '-3' },
    { label: 'RFIs', value: '23', change: '+4' }
  ]

  const projects = [
    { name: 'Downtown Tower', value: 68, status: 'Active' },
    { name: 'Harbor Bridge', value: 45, status: 'Active' },
    { name: 'Medical Center', value: 82, status: 'Active' }
  ]

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#FFFFFF',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #000000',
        padding: '1.5rem 0'
      }}>
        <div className="max-w-5xl mx-auto px-6">
          <Link
            to="/blueprint-samples/variants"
            style={{
              color: '#000000',
              textDecoration: 'none',
              fontSize: '0.8125rem',
              fontWeight: '400',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              letterSpacing: '0.01em'
            }}
          >
            <ArrowLeft className="w-3.5 h-3.5" style={{ strokeWidth: 1.5 }} />
            Variants
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6">
        {/* Page Title */}
        <div style={{
          padding: '6rem 0 4rem',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '300',
            fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            color: '#000000',
            letterSpacing: '-0.04em',
            lineHeight: '1.1',
            marginBottom: '1rem'
          }}>
            Dashboard
          </h1>
          <p style={{
            fontSize: '1rem',
            color: '#737373',
            fontWeight: '400',
            letterSpacing: '0.01em'
          }}>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Stats */}
        <div style={{
          padding: '4rem 0',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '3rem'
          }}>
            {stats.map((stat, index) => (
              <div key={stat.label}>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#A3A3A3',
                  marginBottom: '1.5rem',
                  fontWeight: '500',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  {stat.label}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '1rem',
                  marginBottom: '0.75rem'
                }}>
                  <p style={{
                    fontSize: '4rem',
                    fontWeight: '200',
                    color: '#000000',
                    lineHeight: '1',
                    letterSpacing: '-0.04em',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    {stat.value}
                  </p>
                  <span style={{
                    fontSize: '1.125rem',
                    color: parseInt(stat.change) > 0 ? '#000000' : '#737373',
                    fontWeight: '400',
                    letterSpacing: '-0.01em'
                  }}>
                    {stat.change}
                  </span>
                </div>

                {index < stats.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    right: '-1.5rem',
                    top: '2rem',
                    width: '1px',
                    height: '4rem',
                    backgroundColor: '#F5F5F5'
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div style={{
          padding: '4rem 0',
          borderBottom: '1px solid #E5E5E5'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '400',
            fontFamily: '"DM Sans", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
            color: '#000000',
            marginBottom: '3rem',
            letterSpacing: '-0.02em'
          }}>
            Active Projects
          </h2>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2.5rem'
          }}>
            {projects.map((project, index) => (
              <div key={project.name}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '400',
                    color: '#000000',
                    letterSpacing: '-0.01em'
                  }}>
                    {project.name}
                  </h3>

                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '1rem'
                  }}>
                    <span style={{
                      fontSize: '0.875rem',
                      color: '#A3A3A3',
                      fontWeight: '400'
                    }}>
                      {project.status}
                    </span>
                    <span style={{
                      fontSize: '2rem',
                      fontWeight: '200',
                      color: '#000000',
                      letterSpacing: '-0.02em',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {project.value}%
                    </span>
                  </div>
                </div>

                <div style={{
                  width: '100%',
                  height: '1px',
                  backgroundColor: '#F5F5F5',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${project.value}%`,
                    height: '1px',
                    backgroundColor: '#000000',
                    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} />
                </div>

                {index < projects.length - 1 && (
                  <div style={{
                    marginTop: '2.5rem',
                    width: '100%',
                    height: '1px',
                    backgroundColor: '#F5F5F5'
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Signature */}
        <div style={{
          padding: '4rem 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: '#A3A3A3',
            fontWeight: '400',
            letterSpacing: '0.05em'
          }}>
            VARIANT 3 — MINIMAL PRECISION
          </p>

          <div style={{
            width: '48px',
            height: '1px',
            backgroundColor: '#000000'
          }} />
        </div>
      </div>
    </div>
  )
}
