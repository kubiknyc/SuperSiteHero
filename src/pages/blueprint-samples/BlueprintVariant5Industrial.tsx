// Variant 5: Industrial Grid - Strong grid system, construction-focused, rugged

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft } from 'lucide-react'

export default function BlueprintVariant5Industrial() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Building2, color: '#F59E0B' },
    { label: 'Team Members', value: '48', change: '+5', icon: Users, color: '#10B981' },
    { label: 'Pending Reports', value: '8', change: '-3', icon: FileText, color: '#EF4444' },
    { label: 'Open RFIs', value: '23', change: '+4', icon: AlertCircle, color: '#3B82F6' }
  ]

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#18181B',
      backgroundImage: `
        linear-gradient(#27272A 2px, transparent 2px),
        linear-gradient(90deg, #27272A 2px, transparent 2px)
      `,
      backgroundSize: '60px 60px',
      fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
      padding: '2rem'
    }}>
      <div className="max-w-7xl mx-auto">
        <Link
          to="/blueprint-samples/variants"
          style={{
            color: '#A1A1AA',
            textDecoration: 'none',
            fontSize: '0.75rem',
            fontWeight: '900',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div style={{
          marginBottom: '3rem',
          padding: '1.5rem',
          backgroundColor: '#27272A',
          border: '3px solid #F59E0B',
          borderLeft: '8px solid #F59E0B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10B981',
              boxShadow: '0 0 10px #10B981'
            }} />
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '900',
              color: '#FAFAFA',
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              Industrial Grid
            </h1>
          </div>
          <p style={{ color: '#A1A1AA', fontSize: '0.875rem', fontFamily: '"Helvetica Neue", Arial, sans-serif', paddingLeft: '1.5rem' }}>
            Heavy-duty construction monitoring system
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem'
        }}>
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} style={{
                backgroundColor: '#27272A',
                padding: '0',
                border: '2px solid #3F3F46',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Color stripe */}
                <div style={{
                  height: '4px',
                  backgroundColor: stat.color,
                  boxShadow: `0 0 10px ${stat.color}`
                }} />

                <div style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      backgroundColor: '#18181B',
                      border: `3px solid ${stat.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon className="w-7 h-7" style={{ color: stat.color }} />
                    </div>

                    <div style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#18181B',
                      border: `2px solid ${stat.change.startsWith('+') ? '#10B981' : '#EF4444'}`,
                      color: stat.change.startsWith('+') ? '#10B981' : '#EF4444',
                      fontSize: '0.75rem',
                      fontWeight: '900',
                      letterSpacing: '0.05em'
                    }}>
                      {stat.change}
                    </div>
                  </div>

                  <p style={{
                    fontSize: '0.75rem',
                    color: '#71717A',
                    marginBottom: '0.75rem',
                    fontWeight: '900',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                  }}>
                    {stat.label}
                  </p>

                  <p style={{
                    fontSize: '3.5rem',
                    fontWeight: '900',
                    color: '#FAFAFA',
                    lineHeight: '1',
                    textShadow: `2px 2px 0 ${stat.color}20`
                  }}>
                    {stat.value}
                  </p>
                </div>

                {/* Bottom stripe */}
                <div style={{
                  height: '2px',
                  backgroundColor: '#3F3F46'
                }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
