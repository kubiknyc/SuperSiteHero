// Blueprint Project Detail Sample

import { Link } from 'react-router-dom'
import { Building2, Users, Calendar, DollarSign, TrendingUp, ChevronRight, CheckCircle2 } from 'lucide-react'

export default function BlueprintProjectDetail() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC', fontFamily: '"Helvetica Neue", Arial, sans-serif', padding: '2rem' }}>
      <div className="max-w-7xl mx-auto">
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

        {/* Project Header */}
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          border: '1px solid #E2E8F0',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
            <div>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: '300',
                color: '#0F172A',
                marginBottom: '0.5rem',
                letterSpacing: '-0.02em'
              }}>
                Downtown Tower Construction
              </h1>
              <p style={{ fontSize: '1rem', color: '#64748B' }}>
                High-rise commercial development • Project #2024-001
              </p>
            </div>
            <span style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              fontSize: '0.875rem',
              fontWeight: '600',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 className="w-4 h-4" />
              On Schedule
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Overall Progress</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1E40AF' }}>68.5%</span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#F1F5F9',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '68.5%',
                height: '100%',
                backgroundColor: '#1E40AF',
                transition: 'width 1s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {[
            { label: 'Contract Value', value: '$45.2M', icon: DollarSign },
            { label: 'Team Size', value: '32', icon: Users },
            { label: 'Days Remaining', value: '87', icon: Calendar },
            { label: 'Completion', value: '68.5%', icon: TrendingUp }
          ].map((metric) => {
            const Icon = metric.icon
            return (
              <div key={metric.label} style={{
                backgroundColor: '#fff',
                padding: '1.5rem',
                border: '1px solid #E2E8F0',
                textAlign: 'center'
              }}>
                <Icon className="w-6 h-6" style={{ color: '#1E40AF', margin: '0 auto 0.75rem' }} />
                <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem', fontWeight: '600', letterSpacing: '0.05em' }}>
                  {metric.label}
                </p>
                <p style={{ fontSize: '1.75rem', fontWeight: '300', color: '#0F172A' }}>
                  {metric.value}
                </p>
              </div>
            )
          })}
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '2rem',
          borderTop: '1px solid #E2E8F0'
        }}>
          <Link to="/blueprint-samples" style={{ color: '#64748B', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600' }}>
            ← Back to Samples
          </Link>
          <Link to="/blueprint-samples/daily-reports" style={{
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
            Next: Daily Reports <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
