// Variant 8: Architectural Elegant - Sophisticated, refined, architect-style

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft } from 'lucide-react'

export default function BlueprintVariant8Architectural() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Building2 },
    { label: 'Team Members', value: '48', change: '+5', icon: Users },
    { label: 'Pending Reports', value: '8', change: '-3', icon: FileText },
    { label: 'Open RFIs', value: '23', change: '+4', icon: AlertCircle }
  ]

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(to bottom, #F8FAFC 0%, #EFF6FF 100%)',
      fontFamily: '"Playfair Display", Georgia, serif',
      padding: '3rem 2rem'
    }}>
      <div className="max-w-6xl mx-auto">
        <Link
          to="/blueprint-samples/variants"
          style={{
            color: '#475569',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '400',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '3rem',
            fontFamily: '"Helvetica Neue", Arial, sans-serif'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Variants
        </Link>

        <div style={{
          textAlign: 'center',
          marginBottom: '4rem',
          paddingBottom: '2rem',
          borderBottom: '1px solid #CBD5E1'
        }}>
          <div style={{
            display: 'inline-block',
            marginBottom: '1.5rem'
          }}>
            <svg width="60" height="60" viewBox="0 0 60 60">
              <rect x="5" y="5" width="50" height="50" fill="none" stroke="#1E40AF" strokeWidth="1" />
              <line x1="5" y1="5" x2="55" y2="55" stroke="#1E40AF" strokeWidth="0.5" />
              <line x1="55" y1="5" x2="5" y2="55" stroke="#1E40AF" strokeWidth="0.5" />
            </svg>
          </div>

          <h1 style={{
            fontSize: '3rem',
            fontWeight: '400',
            color: '#0F172A',
            marginBottom: '0.75rem',
            letterSpacing: '0.02em'
          }}>
            Architectural Digest
          </h1>

          <p style={{
            color: '#64748B',
            fontSize: '1.125rem',
            fontFamily: '"Helvetica Neue", Arial, sans-serif',
            fontWeight: '300',
            fontStyle: 'italic'
          }}>
            A refined approach to project management
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '3rem',
          marginBottom: '3rem'
        }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} style={{
                backgroundColor: '#FFFFFF',
                padding: '2.5rem',
                position: 'relative',
                boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                border: '1px solid #E2E8F0'
              }}>
                {/* Ornamental corner */}
                <svg
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    width: '40px',
                    height: '40px'
                  }}
                  viewBox="0 0 40 40"
                >
                  <path
                    d="M 0 0 L 40 0 L 40 40 M 0 20 Q 20 20 20 0"
                    fill="none"
                    stroke="#CBD5E1"
                    strokeWidth="1"
                  />
                </svg>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  border: '1px solid #CBD5E1',
                  marginBottom: '2rem'
                }}>
                  <Icon className="w-8 h-8" style={{ color: '#1E40AF', strokeWidth: 1 }} />
                </div>

                <div style={{
                  borderLeft: '2px solid #1E40AF',
                  paddingLeft: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#64748B',
                    marginBottom: '0.5rem',
                    fontFamily: '"Helvetica Neue", Arial, sans-serif',
                    fontWeight: '500',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase'
                  }}>
                    {stat.label}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                    <p style={{
                      fontSize: '4rem',
                      fontWeight: '300',
                      color: '#0F172A',
                      lineHeight: '1'
                    }}>
                      {stat.value}
                    </p>
                    <span style={{
                      fontSize: '1.25rem',
                      color: stat.change.startsWith('+') ? '#059669' : '#94A3B8',
                      fontFamily: '"Helvetica Neue", Arial, sans-serif',
                      fontWeight: '300'
                    }}>
                      {stat.change}
                    </span>
                  </div>
                </div>

                {/* Subtle footer line */}
                <div style={{
                  borderTop: '1px solid #F1F5F9',
                  paddingTop: '1rem',
                  fontSize: '0.75rem',
                  color: '#CBD5E1',
                  fontFamily: '"Helvetica Neue", Arial, sans-serif',
                  letterSpacing: '0.05em'
                }}>
                  SECTION {String(index + 1).padStart(2, '0')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer ornament */}
        <div style={{
          textAlign: 'center',
          paddingTop: '2rem',
          borderTop: '1px solid #CBD5E1'
        }}>
          <svg width="120" height="20" viewBox="0 0 120 20">
            <line x1="0" y1="10" x2="40" y2="10" stroke="#CBD5E1" strokeWidth="1" />
            <circle cx="60" cy="10" r="3" fill="#1E40AF" />
            <line x1="80" y1="10" x2="120" y2="10" stroke="#CBD5E1" strokeWidth="1" />
          </svg>
        </div>
      </div>
    </div>
  )
}
