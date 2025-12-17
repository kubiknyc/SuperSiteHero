// Variant 1: Classic Blueprint - Traditional dark blueprint style
// White lines on dark blue background, like actual blueprints

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft } from 'lucide-react'

export default function BlueprintVariant1Classic() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Building2 },
    { label: 'Team Members', value: '48', change: '+5', icon: Users },
    { label: 'Pending Reports', value: '8', change: '-3', icon: FileText },
    { label: 'Open RFIs', value: '23', change: '+4', icon: AlertCircle }
  ]

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#0A1628',
      backgroundImage: `
        linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      fontFamily: '"Courier New", monospace',
      padding: '2rem'
    }}>
      <div className="max-w-7xl mx-auto">
        <Link
          to="/blueprint-samples/variants"
          style={{
            color: '#60A5FA',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Variants
        </Link>

        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '300',
            color: '#F8FAFC',
            marginBottom: '0.5rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}>
            Classic Blueprint
          </h1>
          <p style={{ color: '#94A3B8', fontSize: '1rem', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
            Traditional dark blueprint with white lines and technical annotations
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} style={{
                backgroundColor: '#1E3A5F20',
                padding: '2rem',
                border: '2px solid #60A5FA',
                position: 'relative'
              }}>
                {/* Top-left corner mark */}
                <div style={{
                  position: 'absolute',
                  top: '-2px',
                  left: '-2px',
                  width: '20px',
                  height: '20px',
                  borderTop: '2px solid #F8FAFC',
                  borderLeft: '2px solid #F8FAFC'
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <Icon className="w-8 h-8" style={{ color: '#60A5FA' }} />
                  <span style={{
                    color: stat.change.startsWith('+') ? '#10B981' : '#EF4444',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}>
                    {stat.change}
                  </span>
                </div>

                <p style={{
                  fontSize: '0.75rem',
                  color: '#94A3B8',
                  marginBottom: '0.5rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  {stat.label}
                </p>

                <p style={{ fontSize: '3rem', fontWeight: '300', color: '#F8FAFC' }}>
                  {stat.value}
                </p>

                {/* Bottom-right corner mark */}
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '20px',
                  height: '20px',
                  borderBottom: '2px solid #F8FAFC',
                  borderRight: '2px solid #F8FAFC'
                }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
