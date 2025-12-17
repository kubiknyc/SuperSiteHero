// Variant 6: Minimal Lines - Very clean, thin lines, maximum breathing room

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft } from 'lucide-react'

export default function BlueprintVariant6Minimal() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Building2 },
    { label: 'Team Members', value: '48', change: '+5', icon: Users },
    { label: 'Pending Reports', value: '8', change: '-3', icon: FileText },
    { label: 'Open RFIs', value: '23', change: '+4', icon: AlertCircle }
  ]

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#FAFAFA',
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      padding: '3rem'
    }}>
      <div className="max-w-5xl mx-auto">
        <Link
          to="/blueprint-samples/variants"
          style={{
            color: '#A3A3A3',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: '400',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '4rem'
          }}
        >
          <ArrowLeft className="w-3 h-3" />
          Variants
        </Link>

        <div style={{ marginBottom: '5rem' }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '300',
            color: '#171717',
            marginBottom: '0.5rem',
            letterSpacing: '-0.03em'
          }}>
            Minimal
          </h1>
          <div style={{
            width: '60px',
            height: '1px',
            backgroundColor: '#1E40AF'
          }} />
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '3rem 4rem'
        }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} style={{
                borderTop: index < 2 ? '1px solid #E5E5E5' : 'none',
                borderBottom: index >= 2 ? '1px solid #E5E5E5' : 'none',
                paddingTop: index < 2 ? '2rem' : '0',
                paddingBottom: index >= 2 ? '2rem' : '0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                  <Icon className="w-5 h-5" style={{ color: '#1E40AF', strokeWidth: 1.5 }} />
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#737373',
                    fontWeight: '400',
                    letterSpacing: '0.02em'
                  }}>
                    {stat.label}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.5rem' }}>
                  <p style={{
                    fontSize: '4rem',
                    fontWeight: '200',
                    color: '#171717',
                    lineHeight: '1',
                    letterSpacing: '-0.04em'
                  }}>
                    {stat.value}
                  </p>
                  <span style={{
                    fontSize: '1rem',
                    color: stat.change.startsWith('+') ? '#171717' : '#A3A3A3',
                    fontWeight: '300'
                  }}>
                    {stat.change}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
