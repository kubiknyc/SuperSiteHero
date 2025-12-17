// Variant 3: Technical - Heavy on dimension lines, annotations, and measurements

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft } from 'lucide-react'

export default function BlueprintVariant3Technical() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Building2, unit: 'projects' },
    { label: 'Team Members', value: '48', change: '+5', icon: Users, unit: 'people' },
    { label: 'Pending Reports', value: '8', change: '-3', icon: FileText, unit: 'docs' },
    { label: 'Open RFIs', value: '23', change: '+4', icon: AlertCircle, unit: 'items' }
  ]

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#F8FAFC',
      fontFamily: '"Courier New", monospace',
      padding: '2rem'
    }}>
      <div className="max-w-7xl mx-auto">
        <Link
          to="/blueprint-samples/variants"
          style={{
            color: '#475569',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Variants
        </Link>

        <div style={{
          marginBottom: '3rem',
          padding: '1.5rem',
          border: '1px solid #CBD5E1',
          backgroundColor: '#FFFFFF',
          position: 'relative'
        }}>
          {/* Reference marks */}
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{
              position: 'absolute',
              top: i < 2 ? '-1px' : 'auto',
              bottom: i >= 2 ? '-1px' : 'auto',
              left: i % 2 === 0 ? '-1px' : 'auto',
              right: i % 2 === 1 ? '-1px' : 'auto',
              width: '12px',
              height: '12px',
              backgroundColor: '#1E40AF'
            }} />
          ))}

          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#0F172A',
            marginBottom: '0.5rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            DWG-001 / Technical
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.875rem', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
            REV A • SCALE 1:1 • {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem'
        }}>
          {stats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} style={{
                backgroundColor: '#FFFFFF',
                padding: '2rem',
                border: '2px solid #CBD5E1',
                position: 'relative'
              }}>
                {/* Drawing number */}
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '1rem',
                  backgroundColor: '#FFFFFF',
                  padding: '0 0.5rem',
                  fontSize: '0.75rem',
                  color: '#64748B',
                  fontWeight: '600'
                }}>
                  A.{index + 1}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '2px solid #1E40AF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon className="w-5 h-5" style={{ color: '#1E40AF' }} />
                  </div>

                  <div style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: stat.change.startsWith('+') ? '#ECFDF5' : '#FEF2F2',
                    color: stat.change.startsWith('+') ? '#059669' : '#DC2626',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    border: `1px solid ${stat.change.startsWith('+') ? '#A7F3D0' : '#FECACA'}`
                  }}>
                    Δ {stat.change}
                  </div>
                </div>

                <p style={{
                  fontSize: '0.75rem',
                  color: '#64748B',
                  marginBottom: '0.75rem',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}>
                  {stat.label}
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '3rem', fontWeight: '700', color: '#0F172A', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
                    {stat.value}
                  </p>
                  <span style={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                    {stat.unit}
                  </span>
                </div>

                {/* Dimension line */}
                <div style={{ position: 'relative', paddingTop: '1rem', borderTop: '1px dashed #CBD5E1' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.625rem',
                    color: '#94A3B8'
                  }}>
                    <span>└─</span>
                    <span>METRIC: {stat.value} {stat.unit.toUpperCase()}</span>
                    <span>─┘</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
