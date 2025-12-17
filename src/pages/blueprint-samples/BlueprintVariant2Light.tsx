// Variant 2: Light & Airy - Lots of white space, minimal blueprint accents

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft } from 'lucide-react'

export default function BlueprintVariant2Light() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Building2 },
    { label: 'Team Members', value: '48', change: '+5', icon: Users },
    { label: 'Pending Reports', value: '8', change: '-3', icon: FileText },
    { label: 'Open RFIs', value: '23', change: '+4', icon: AlertCircle }
  ]

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#FFFFFF',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      padding: '4rem 2rem'
    }}>
      <div className="max-w-6xl mx-auto">
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
            marginBottom: '3rem'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Variants
        </Link>

        <div style={{ marginBottom: '4rem', maxWidth: '600px' }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '200',
            color: '#0F172A',
            marginBottom: '1rem',
            letterSpacing: '-0.02em'
          }}>
            Light & Airy
          </h1>
          <p style={{ color: '#64748B', fontSize: '1.125rem', lineHeight: '1.8' }}>
            Minimal blueprint design with maximum breathing room
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '4rem',
          marginBottom: '4rem'
        }}>
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} style={{
                position: 'relative',
                padding: '2rem 0'
              }}>
                {/* Subtle top line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '40px',
                  height: '1px',
                  backgroundColor: '#1E40AF'
                }} />

                <Icon className="w-10 h-10" style={{ color: '#1E40AF', marginBottom: '2rem' }} />

                <p style={{
                  fontSize: '0.75rem',
                  color: '#94A3B8',
                  marginBottom: '0.75rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: '500'
                }}>
                  {stat.label}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '4rem', fontWeight: '200', color: '#0F172A', lineHeight: '1' }}>
                    {stat.value}
                  </p>
                  <span style={{
                    color: stat.change.startsWith('+') ? '#10B981' : '#64748B',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>
                    {stat.change}
                  </span>
                </div>

                {/* Subtle bottom line */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: '100%',
                  height: '1px',
                  backgroundColor: '#E2E8F0'
                }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
