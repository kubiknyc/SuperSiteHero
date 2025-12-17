// Blueprint Daily Reports Sample

import { Link } from 'react-router-dom'
import { FileText, ChevronRight, Plus, Search, Filter } from 'lucide-react'

export default function BlueprintDailyReports() {
  const reports = [
    { date: '2024-01-15', project: 'Downtown Tower', weather: 'Sunny, 72°F', workers: 24, hours: 192, status: 'Approved' },
    { date: '2024-01-14', project: 'Downtown Tower', weather: 'Cloudy, 68°F', workers: 22, hours: 176, status: 'Pending' },
    { date: '2024-01-13', project: 'Harbor Bridge', weather: 'Rainy, 65°F', workers: 18, hours: 144, status: 'Approved' }
  ]

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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '2rem' }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '300',
              color: '#0F172A',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}>
              Daily Reports
            </h1>
            <p style={{ fontSize: '1rem', color: '#64748B' }}>
              Track daily field activities and progress
            </p>
          </div>
          <button style={{
            padding: '0.875rem 1.5rem',
            backgroundColor: '#1E40AF',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Plus className="w-4 h-4" />
            New Report
          </button>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: '#fff',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search className="w-4 h-4" style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8'
            }} />
            <input
              type="text"
              placeholder="Search reports..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                border: '1px solid #E2E8F0',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <button style={{
            padding: '0.5rem 1rem',
            border: '1px solid #E2E8F0',
            backgroundColor: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem'
          }}>
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Reports Table */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Date', 'Project', 'Weather', 'Workers', 'Hours', 'Status'].map((header) => (
                  <th key={header} style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: '#64748B',
                    letterSpacing: '0.05em'
                  }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report, i) => (
                <tr key={i} style={{
                  borderBottom: '1px solid #F1F5F9',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#0F172A', fontWeight: '500' }}>
                    {report.date}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#0F172A' }}>
                    {report.project}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748B' }}>
                    {report.weather}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#0F172A' }}>
                    {report.workers}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#0F172A' }}>
                    {report.hours}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: report.status === 'Approved' ? '#ECFDF5' : '#FEF3C7',
                      color: report.status === 'Approved' ? '#059669' : '#D97706',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      border: `1px solid ${report.status === 'Approved' ? '#A7F3D0' : '#FDE68A'}`
                    }}>
                      {report.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <Link to="/blueprint-samples/documents" style={{
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
            Next: Documents <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
