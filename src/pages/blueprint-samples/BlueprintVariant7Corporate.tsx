// Variant 7: Corporate Professional - Business-focused, polished, trustworthy

import { Link } from 'react-router-dom'
import { TrendingUp, Users, FileText, AlertCircle, Building2, ArrowLeft } from 'lucide-react'

export default function BlueprintVariant7Corporate() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Building2 },
    { label: 'Team Members', value: '48', change: '+5', icon: Users },
    { label: 'Pending Reports', value: '8', change: '-3', icon: FileText },
    { label: 'Open RFIs', value: '23', change: '+4', icon: AlertCircle }
  ]

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#F1F5F9',
      fontFamily: '"Georgia", "Times New Roman", serif',
      padding: '2rem'
    }}>
      <div className="max-w-7xl mx-auto">
        <div style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '3px solid #1E40AF',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <Link
            to="/blueprint-samples/variants"
            style={{
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              fontFamily: '"Helvetica Neue", Arial, sans-serif'
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Variants
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
            <div>
              <h1 style={{
                fontSize: '2.25rem',
                fontWeight: '400',
                color: '#0F172A',
                marginBottom: '0.5rem',
                letterSpacing: '0.01em'
              }}>
                Corporate Dashboard
              </h1>
              <p style={{ color: '#64748B', fontSize: '1rem', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
                Executive Overview • Q4 2024
              </p>
            </div>

            <div style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1E40AF',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: '600',
              fontFamily: '"Helvetica Neue", Arial, sans-serif'
            }}>
              CONFIDENTIAL
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem'
        }}>
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} style={{
                backgroundColor: '#FFFFFF',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderTop: '4px solid #1E40AF'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  marginBottom: '1.5rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid #E2E8F0'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon className="w-7 h-7" style={{ color: '#1E40AF' }} />
                  </div>

                  <div style={{
                    textAlign: 'right'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#64748B',
                      marginBottom: '0.25rem',
                      fontFamily: '"Helvetica Neue", Arial, sans-serif',
                      fontWeight: '600',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase'
                    }}>
                      Change
                    </div>
                    <div style={{
                      fontSize: '1.25rem',
                      color: stat.change.startsWith('+') ? '#059669' : '#DC2626',
                      fontWeight: '600',
                      fontFamily: '"Helvetica Neue", Arial, sans-serif'
                    }}>
                      {stat.change}
                    </div>
                  </div>
                </div>

                <p style={{
                  fontSize: '0.875rem',
                  color: '#64748B',
                  marginBottom: '1rem',
                  fontFamily: '"Helvetica Neue", Arial, sans-serif',
                  fontWeight: '600',
                  letterSpacing: '0.025em',
                  textTransform: 'uppercase'
                }}>
                  {stat.label}
                </p>

                <p style={{
                  fontSize: '3rem',
                  fontWeight: '400',
                  color: '#0F172A',
                  lineHeight: '1'
                }}>
                  {stat.value}
                </p>

                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #F1F5F9',
                  fontSize: '0.75rem',
                  color: '#94A3B8',
                  fontFamily: '"Helvetica Neue", Arial, sans-serif'
                }}>
                  Updated {new Date().toLocaleTimeString()}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
