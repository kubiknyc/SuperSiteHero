// Blueprint Documents Sample

import { Link } from 'react-router-dom'
import { FolderOpen, FileText, ChevronRight, Upload, Search } from 'lucide-react'

export default function BlueprintDocuments() {
  const folders = [
    { name: 'Drawings', count: 42, updated: '2 days ago' },
    { name: 'Specifications', count: 18, updated: '1 week ago' },
    { name: 'Photos', count: 156, updated: 'Today' },
    { name: 'RFIs', count: 23, updated: '3 days ago' }
  ]

  const recentFiles = [
    { name: 'Site Plan Rev 4.pdf', size: '2.4 MB', type: 'pdf', date: '2024-01-15' },
    { name: 'Foundation Details.dwg', size: '5.1 MB', type: 'cad', date: '2024-01-14' },
    { name: 'Progress Photo 1-12.jpg', size: '1.8 MB', type: 'image', date: '2024-01-12' }
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
              Document Library
            </h1>
            <p style={{ fontSize: '1rem', color: '#64748B' }}>
              Downtown Tower • 239 files
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
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
        </div>

        {/* Search */}
        <div style={{
          backgroundColor: '#fff',
          padding: '1rem',
          border: '1px solid #E2E8F0',
          marginBottom: '2rem'
        }}>
          <div style={{ position: 'relative' }}>
            <Search className="w-4 h-4" style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8'
            }} />
            <input
              type="text"
              placeholder="Search documents..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                border: '1px solid #E2E8F0',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        {/* Folders */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#0F172A',
            marginBottom: '1rem'
          }}>
            Folders
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            {folders.map((folder) => (
              <div key={folder.name} style={{
                backgroundColor: '#fff',
                padding: '1.5rem',
                border: '1px solid #E2E8F0',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1E40AF'
                e.currentTarget.style.backgroundColor = '#F8FAFC'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0'
                e.currentTarget.style.backgroundColor = '#fff'
              }}>
                <FolderOpen className="w-10 h-10" style={{ color: '#1E40AF', marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#0F172A', marginBottom: '0.5rem' }}>
                  {folder.name}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748B' }}>
                  {folder.count} files • {folder.updated}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Files */}
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          border: '1px solid #E2E8F0'
        }}>
          <h2 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#0F172A',
            marginBottom: '1.5rem'
          }}>
            Recent Files
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentFiles.map((file, i) => (
              <div key={i} style={{
                padding: '1rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <FileText className="w-5 h-5" style={{ color: '#1E40AF' }} />
                  <div>
                    <p style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: '500' }}>
                      {file.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {file.size} • {file.date}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: '#94A3B8' }} />
              </div>
            ))}
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
          <div style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            fontSize: '0.875rem',
            fontWeight: '600',
            border: '1px solid #BFDBFE'
          }}>
            ✓ All Samples Complete
          </div>
        </div>
      </div>
    </div>
  )
}
