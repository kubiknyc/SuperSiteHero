// Blueprint Samples - Navigation hub for viewing all Clean Blueprint design samples
// Shows Concept 2 applied to real JobSight pages

import { Link } from 'react-router-dom'
import { LayoutGrid, BarChart3, FolderOpen, FileText, Building2, Ruler, ArrowRight, Sparkles } from 'lucide-react'

export default function BlueprintSamplesIndex() {
  const samples = [
    {
      id: 'layout',
      name: 'App Layout & Navigation',
      description: 'Complete application structure with sidebar, header, and navigation system',
      icon: LayoutGrid,
      path: '/blueprint-samples/layout',
      preview: 'Full navigation experience with all menu items'
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Main landing page with stats, charts, recent activity, and project overview',
      icon: BarChart3,
      path: '/blueprint-samples/dashboard',
      preview: 'Real-time project metrics and team activity'
    },
    {
      id: 'project-detail',
      name: 'Project Detail',
      description: 'Complete project overview with team, progress, documents, and timeline',
      icon: Building2,
      path: '/blueprint-samples/project-detail',
      preview: 'Comprehensive project management interface'
    },
    {
      id: 'daily-reports',
      name: 'Daily Reports',
      description: 'Daily report list view and creation form for field documentation',
      icon: FileText,
      path: '/blueprint-samples/daily-reports',
      preview: 'Field reporting and documentation workflow'
    },
    {
      id: 'documents',
      name: 'Document Library',
      description: 'File browser with folders, search, and document management',
      icon: FolderOpen,
      path: '/blueprint-samples/documents',
      preview: 'Project document organization system'
    },
    {
      id: 'animated-demo',
      name: 'Animated Blueprint Lines',
      description: 'Technical drawing animations that bring blueprints to life on page load',
      icon: Sparkles,
      path: '/blueprint-samples/animated-demo',
      preview: 'SVG path animations and drawing effects'
    }
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#1E40AF', position: 'relative', overflow: 'hidden' }}>
        {/* Blueprint Grid Pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          opacity: 0.5
        }} />

        <div className="max-w-7xl mx-auto px-8 py-16 relative">
          <div className="flex items-center gap-4 mb-6">
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <Ruler className="w-8 h-8" style={{ color: '#1E40AF' }} />
            </div>
            <div>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: '300',
                color: '#fff',
                letterSpacing: '-0.01em',
                lineHeight: '1',
                marginBottom: '0.5rem'
              }}>
                Clean Blueprint
              </h1>
              <p style={{ fontSize: '1.125rem', color: '#DBEAFE', fontWeight: '400' }}>
                Visual Samples • Concept 2 Applied to JobSight
              </p>
            </div>
          </div>

          <p style={{
            fontSize: '1.25rem',
            color: '#DBEAFE',
            maxWidth: '700px',
            lineHeight: '1.8',
            fontWeight: '300'
          }}>
            Explore how the Clean Blueprint aesthetic transforms every aspect of the JobSight platform.
            Professional, precise, and built for construction excellence.
          </p>
        </div>

        <div style={{ height: '2px', backgroundColor: '#fff', opacity: 0.3 }} />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Introduction */}
        <div style={{
          backgroundColor: '#fff',
          padding: '2rem',
          marginBottom: '3rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #1E40AF'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#0F172A',
            marginBottom: '1rem'
          }}>
            What You're Viewing
          </h2>
          <p style={{
            fontSize: '1.125rem',
            color: '#64748B',
            lineHeight: '1.8',
            marginBottom: '1rem'
          }}>
            These are <strong>live, interactive samples</strong> showing the Clean Blueprint design system applied to JobSight's core pages.
            Each sample demonstrates real functionality with the refined aesthetic you selected.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #E2E8F0'
          }}>
            {[
              { label: 'Primary Color', value: '#1E40AF', color: '#1E40AF' },
              { label: 'Typography', value: 'Helvetica Neue', color: '#0F172A' },
              { label: 'Background', value: '#F8FAFC', color: '#64748B' },
              { label: 'Accent', value: '#3B82F6', color: '#3B82F6' }
            ].map((item) => (
              <div key={item.label}>
                <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.25rem', fontWeight: '600' }}>
                  {item.label}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: item.color,
                    border: '1px solid #E2E8F0'
                  }} />
                  <p style={{ fontSize: '0.875rem', color: '#0F172A', fontWeight: '500' }}>
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Variants Callout */}
        <Link
          to="/blueprint-samples/variants"
          style={{
            textDecoration: 'none',
            display: 'block',
            backgroundColor: '#1E40AF',
            padding: '2rem',
            marginBottom: '3rem',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1E3A8A'
            e.currentTarget.style.transform = 'scale(1.01)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1E40AF'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{
                fontSize: '1.75rem',
                fontWeight: '600',
                color: '#FFFFFF',
                marginBottom: '0.75rem'
              }}>
                ✨ View 8 Different Variants
              </h3>
              <p style={{
                fontSize: '1.125rem',
                color: '#DBEAFE',
                maxWidth: '600px'
              }}>
                See the blueprint aesthetic reimagined in 8 distinct visual styles - from classic to modern, minimal to industrial
              </p>
            </div>

            <div style={{
              fontSize: '3rem',
              color: 'rgba(255, 255, 255, 0.2)',
              fontWeight: '300'
            }}>
              →
            </div>
          </div>
        </Link>

        {/* Samples Grid */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '300',
            color: '#0F172A',
            marginBottom: '1.5rem',
            letterSpacing: '-0.01em'
          }}>
            Interactive Samples
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '2rem'
          }}>
            {samples.map((sample, index) => {
              const Icon = sample.icon
              return (
                <Link
                  key={sample.id}
                  to={sample.path}
                  style={{
                    textDecoration: 'none',
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s',
                    display: 'block'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(30,64,175,0.15)'
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.borderColor = '#1E40AF'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = '#E2E8F0'
                  }}
                >
                  {/* Number Badge */}
                  <div style={{
                    height: '4px',
                    backgroundColor: '#1E40AF',
                    opacity: 0.3 + (index * 0.15)
                  }} />

                  <div style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: '#EFF6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Icon className="w-6 h-6" style={{ color: '#1E40AF' }} />
                      </div>
                      <span style={{
                        fontSize: '2rem',
                        fontWeight: '300',
                        color: '#E2E8F0'
                      }}>
                        0{index + 1}
                      </span>
                    </div>

                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '600',
                      color: '#0F172A',
                      marginBottom: '0.75rem',
                      lineHeight: '1.3'
                    }}>
                      {sample.name}
                    </h3>

                    <p style={{
                      fontSize: '1rem',
                      color: '#64748B',
                      lineHeight: '1.6',
                      marginBottom: '1rem'
                    }}>
                      {sample.description}
                    </p>

                    <div style={{
                      paddingTop: '1rem',
                      borderTop: '1px solid #F1F5F9'
                    }}>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#94A3B8',
                        marginBottom: '1rem'
                      }}>
                        {sample.preview}
                      </p>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#1E40AF',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}>
                        View Sample
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          padding: '2rem',
          marginTop: '3rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1E40AF',
            marginBottom: '1rem'
          }}>
            How to Review
          </h3>
          <ol style={{
            listStyleType: 'decimal',
            paddingLeft: '1.5rem',
            color: '#334155',
            fontSize: '1rem',
            lineHeight: '1.8'
          }}>
            <li style={{ marginBottom: '0.75rem' }}>
              Click each sample above to see the full design applied to that page
            </li>
            <li style={{ marginBottom: '0.75rem' }}>
              Interact with the components (buttons, forms, navigation) to feel the experience
            </li>
            <li style={{ marginBottom: '0.75rem' }}>
              Note how the blueprint aesthetic works across different page types
            </li>
            <li style={{ marginBottom: '0.75rem' }}>
              Pay attention to spacing, typography, and the overall professional feel
            </li>
            <li>
              Provide feedback on what you'd like adjusted before full implementation
            </li>
          </ol>
        </div>

        {/* Back Link */}
        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #E2E8F0' }}>
          <Link
            to="/design-concepts"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#64748B',
              fontSize: '0.875rem',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            ← Back to All Concepts
          </Link>
        </div>
      </div>
    </div>
  )
}
