// Blueprint Dashboard Sample - Main landing page with stats and activity

import { Link } from 'react-router-dom'
import { Users, FileText, AlertCircle, ChevronRight, Building2, Calendar } from 'lucide-react'

export default function BlueprintDashboard() {
  const stats = [
    { label: 'Active Projects', value: '12', change: '+2', icon: Building2, color: '#1E40AF' },
    { label: 'Team Members', value: '48', change: '+5', icon: Users, color: '#10B981' },
    { label: 'Pending Reports', value: '8', change: '-3', icon: FileText, color: '#F59E0B' },
    { label: 'Open RFIs', value: '23', change: '+4', icon: AlertCircle, color: '#EF4444' }
  ]

  const recentActivity = [
    { type: 'report', user: 'John Smith', action: 'submitted Daily Report', project: 'Downtown Tower', time: '2 hours ago' },
    { type: 'rfi', user: 'Sarah Johnson', action: 'created RFI #142', project: 'Harbor Bridge', time: '4 hours ago' },
    { type: 'document', user: 'Mike Chen', action: 'uploaded 3 documents', project: 'Medical Center', time: '5 hours ago' }
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC', fontFamily: '"Helvetica Neue", Arial, sans-serif', padding: '2rem' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <span style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            fontSize: '0.75rem',
            fontWeight: '600',
            marginBottom: '1rem',
            border: '1px solid #BFDBFE'
          }}>
            BLUEPRINT SAMPLE
          </span>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '300',
            color: '#0F172A',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '1rem', color: '#64748B' }}>
            Welcome back, John • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} style={{
                backgroundColor: '#fff',
                padding: '1.5rem',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  opacity: 0.1
                }}>
                  <Icon className="w-16 h-16" style={{ color: stat.color }} />
                </div>

                <p style={{ fontSize: '0.875rem', color: '#64748B', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {stat.label}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: '300', color: '#0F172A' }}>
                    {stat.value}
                  </span>
                  <span style={{
                    fontSize: '0.875rem',
                    color: stat.change.startsWith('+') ? '#10B981' : '#EF4444',
                    fontWeight: '600'
                  }}>
                    {stat.change}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Recent Activity */}
          <div style={{
            backgroundColor: '#fff',
            padding: '2rem',
            border: '1px solid #E2E8F0'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#0F172A',
              marginBottom: '1.5rem'
            }}>
              Recent Activity
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentActivity.map((item, i) => (
                <div key={i} style={{
                  padding: '1rem',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '1rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#1E40AF',
                    borderRadius: '50%',
                    marginTop: '0.5rem',
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: '#0F172A', marginBottom: '0.25rem' }}>
                      <strong>{item.user}</strong> {item.action}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {item.project} • {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            backgroundColor: '#fff',
            padding: '2rem',
            border: '1px solid #E2E8F0'
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#0F172A',
              marginBottom: '1.5rem'
            }}>
              Quick Actions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'Create Daily Report', icon: FileText },
                { label: 'Upload Documents', icon: Building2 },
                { label: 'Schedule Meeting', icon: Calendar },
                { label: 'New RFI', icon: AlertCircle }
              ].map((action) => {
                const Icon = action.icon
                return (
                  <button key={action.label} style={{
                    padding: '0.875rem 1rem',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    color: '#0F172A',
                    fontWeight: '500',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#EFF6FF'
                    e.currentTarget.style.borderColor = '#1E40AF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FAFC'
                    e.currentTarget.style.borderColor = '#E2E8F0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Icon className="w-4 h-4" style={{ color: '#1E40AF' }} />
                      {action.label}
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: '#94A3B8' }} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid #E2E8F0'
        }}>
          <Link to="/blueprint-samples" style={{ color: '#64748B', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600' }}>
            ← Back to Samples
          </Link>
          <Link to="/blueprint-samples/project-detail" style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1E40AF',
            color: '#fff',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            Next: Project Detail <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
