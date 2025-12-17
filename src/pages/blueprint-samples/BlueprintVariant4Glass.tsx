// Variant 4: Modern Glass - Glassmorphism with blueprint elements

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft } from 'lucide-react'

export default function BlueprintVariant4Glass() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Building2 },
    { label: 'Team Members', value: '48', change: '+5', icon: Users },
    { label: 'Pending Reports', value: '8', change: '-3', icon: FileText },
    { label: 'Open RFIs', value: '23', change: '+4', icon: AlertCircle }
  ]

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 50%, #60A5FA 100%)',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }} />

      <div className="max-w-7xl mx-auto" style={{ position: 'relative', zIndex: 1 }}>
        <Link
          to="/blueprint-samples/variants"
          style={{
            color: '#FFFFFF',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '2rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            padding: '0.5rem 1rem',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Variants
        </Link>

        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '300',
            color: '#FFFFFF',
            marginBottom: '0.5rem',
            letterSpacing: '-0.01em'
          }}>
            Modern Glass
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1rem' }}>
            Glassmorphism design with frosted glass cards
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
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                padding: '2rem',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Glass reflection */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
                  pointerEvents: 'none'
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon className="w-6 h-6" style={{ color: '#FFFFFF' }} />
                    </div>

                    <span style={{
                      color: stat.change.startsWith('+') ? '#A7F3D0' : 'rgba(255, 255, 255, 0.6)',
                      fontSize: '0.875rem',
                      fontWeight: '600'
                    }}>
                      {stat.change}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '0.5rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}>
                    {stat.label}
                  </p>

                  <p style={{ fontSize: '3rem', fontWeight: '300', color: '#FFFFFF' }}>
                    {stat.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
