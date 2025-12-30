// Blueprint Sample: Complete App Layout with Navigation
// Shows full sidebar, header, and app structure with Clean Blueprint aesthetic

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard, Building2, FileText, FolderOpen, Users, Settings,
  Bell, Search, Menu, ChevronRight, HardHat, MessageSquare,
  ClipboardList, AlertCircle, Shield, Calendar
} from 'lucide-react'

export default function BlueprintLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeNav, setActiveNav] = useState('dashboard')

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/blueprint-samples/dashboard' },
    { id: 'projects', name: 'Projects', icon: Building2, badge: '12' },
    { id: 'messages', name: 'Messages', icon: MessageSquare, badge: '3' },
    { id: 'documents', name: 'Documents', icon: FolderOpen },
    { id: 'daily-reports', name: 'Daily Reports', icon: FileText },
    { id: 'meetings', name: 'Meetings', icon: Calendar },
    { id: 'tasks', name: 'Tasks', icon: ClipboardList, badge: '8' },
    { id: 'rfis', name: 'RFIs', icon: AlertCircle },
    { id: 'safety', name: 'Safety', icon: Shield },
    { id: 'team', name: 'Team', icon: Users },
    { id: 'settings', name: 'Settings', icon: Settings }
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
      {/* Top Header */}
      <header style={{
        height: '64px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #E2E8F0',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem'
      }}>
        {/* Left Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#64748B'
            }}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <HardHat className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <span style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#0F172A',
              letterSpacing: '-0.01em'
            }}>
              JobSight
            </span>
          </div>

          {/* Project Selector */}
          <div style={{
            marginLeft: '2rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#F1F5F9',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer'
          }}>
            <Building2 className="w-4 h-4" style={{ color: '#1E40AF' }} />
            <span style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: '500' }}>
              Downtown Tower
            </span>
            <ChevronRight className="w-4 h-4" style={{ color: '#94A3B8' }} />
          </div>
        </div>

        {/* Right Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Search */}
          <div style={{
            position: 'relative',
            width: '300px'
          }}>
            <Search className="w-4 h-4" style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8'
            }} />
            <input
              type="text"
              placeholder="Search projects, documents..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: '#F8FAFC'
              }}
              onFocus={(e) => e.target.style.borderColor = '#1E40AF'}
              onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>

          {/* Notifications */}
          <button style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <Bell className="w-5 h-5" style={{ color: '#64748B' }} />
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '8px',
              height: '8px',
              backgroundColor: '#1E40AF',
              borderRadius: '50%',
              border: '2px solid #fff'
            }} />
          </button>

          {/* User Avatar */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#1E40AF',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            JD
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        top: '64px',
        left: 0,
        bottom: 0,
        width: sidebarOpen ? '260px' : '0',
        backgroundColor: '#fff',
        borderRight: '1px solid #E2E8F0',
        transition: 'width 0.3s',
        overflow: 'hidden',
        zIndex: 30
      }}>
        <nav style={{ padding: '1.5rem 0' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.id

            return (
              <Link
                key={item.id}
                to={item.path || '#'}
                onClick={() => setActiveNav(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1.5rem',
                  margin: '0.125rem 0.75rem',
                  textDecoration: 'none',
                  color: isActive ? '#1E40AF' : '#64748B',
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  borderRadius: '6px',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#F8FAFC'
                    e.currentTarget.style.color = '#0F172A'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#64748B'
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    backgroundColor: isActive ? '#1E40AF' : '#E2E8F0',
                    color: isActive ? '#fff' : '#64748B',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    borderRadius: '10px'
                  }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{
        marginTop: '64px',
        marginLeft: sidebarOpen ? '260px' : '0',
        padding: '2rem',
        transition: 'margin-left 0.3s'
      }}>
        {/* Page Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            fontSize: '0.75rem',
            fontWeight: '600',
            letterSpacing: '0.05em',
            marginBottom: '1rem',
            border: '1px solid #BFDBFE'
          }}>
            BLUEPRINT SAMPLE
          </div>

          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '300',
            color: '#0F172A',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em'
          }}>
            App Layout & Navigation
          </h1>

          <p style={{
            fontSize: '1.125rem',
            color: '#64748B',
            maxWidth: '800px',
            lineHeight: '1.6'
          }}>
            This demonstrates the complete application structure with the Clean Blueprint aesthetic.
            Notice the crisp navigation, measured spacing, and professional typography throughout.
          </p>
        </div>

        {/* Sample Content Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {[
            { title: 'Professional Sidebar', desc: 'Clean navigation with subtle hover states' },
            { title: 'Refined Header', desc: 'Search, notifications, and user menu' },
            { title: 'Blueprint Patterns', desc: 'Subtle technical grid backgrounds' },
            { title: 'Measured Spacing', desc: 'Consistent 8px grid system' }
          ].map((item, i) => (
            <div key={i} style={{
              backgroundColor: '#fff',
              padding: '1.5rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#0F172A',
                marginBottom: '0.5rem'
              }}>
                {item.title}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#64748B',
                lineHeight: '1.6'
              }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Features List */}
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          border: '1px solid #E2E8F0',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#0F172A',
            marginBottom: '1.5rem'
          }}>
            Layout Features
          </h2>

          <ul style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            listStyle: 'none',
            padding: 0
          }}>
            {[
              'Collapsible sidebar navigation',
              'Fixed header with search',
              'Project context switcher',
              'Real-time notifications',
              'Badge indicators for activity',
              'Responsive grid layout',
              'Consistent spacing system',
              'Professional color palette',
              'Blueprint grid patterns',
              'Smooth transitions',
              'Hover state refinements',
              'Clear visual hierarchy'
            ].map((feature, i) => (
              <li key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: '#F8FAFC',
                border: '1px solid #F1F5F9'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#1E40AF',
                  borderRadius: '50%',
                  flexShrink: 0
                }} />
                <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '2rem',
          borderTop: '1px solid #E2E8F0'
        }}>
          <Link
            to="/blueprint-samples"
            style={{
              color: '#64748B',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            ← Back to Samples
          </Link>

          <Link
            to="/blueprint-samples/dashboard"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1E40AF',
              color: '#fff',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            Next: Dashboard
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  )
}
