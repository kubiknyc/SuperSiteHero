// Concept 2: Clean Blueprint
// Blueprint blue + white + concrete gray
// Architectural drawings aesthetic, crisp and professional

import { Ruler, Box, ArrowRight, Check } from 'lucide-react'

export default function Concept2Blueprint() {
  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#F8FAFC',
      fontFamily: '"Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header with Blueprint Grid */}
      <div style={{
        backgroundColor: '#1E40AF',
        position: 'relative',
        overflow: 'hidden'
      }}>
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

        <div className="max-w-7xl mx-auto px-8 py-20 relative">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1.5rem',
            backgroundColor: '#fff',
            marginBottom: '2rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Ruler className="w-4 h-4" style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#0F172A',
                letterSpacing: '0.05em',
                lineHeight: '1'
              }}>
                JOBSIGHT
              </h1>
              <p style={{ fontSize: '0.625rem', color: '#64748B', fontWeight: '600', letterSpacing: '0.15em' }}>
                CONCEPT 2: CLEAN BLUEPRINT
              </p>
            </div>
          </div>

          <h2 style={{
            fontSize: '4.5rem',
            fontWeight: '300',
            color: '#fff',
            marginBottom: '1.5rem',
            lineHeight: '1.1',
            letterSpacing: '-0.02em'
          }}>
            Clean<br />
            Blueprint
          </h2>

          <p style={{
            fontSize: '1.25rem',
            color: '#DBEAFE',
            maxWidth: '600px',
            lineHeight: '1.8',
            marginBottom: '3rem',
            fontWeight: '400'
          }}>
            Architectural precision meets modern interface design. Every element measured, every line intentional.
          </p>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{
              padding: '1rem 2.5rem',
              backgroundColor: '#fff',
              color: '#1E40AF',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'all 0.2s'
            }}>
              Explore System
            </button>
            <button style={{
              padding: '1rem 2.5rem',
              backgroundColor: 'transparent',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: '2px solid #fff',
              cursor: 'pointer'
            }}>
              Next Concept
            </button>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <div className="max-w-7xl mx-auto px-8 py-20">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <div style={{ width: '4px', height: '48px', backgroundColor: '#1E40AF' }} />
          <div>
            <p style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
              COLOR SYSTEM
            </p>
            <h3 style={{
              fontSize: '2.5rem',
              fontWeight: '300',
              color: '#0F172A',
              letterSpacing: '-0.01em'
            }}>
              Architectural Palette
            </h3>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
          {[
            { name: 'Blueprint Blue', hex: '#1E40AF', desc: 'Primary brand' },
            { name: 'Sky Blue', hex: '#3B82F6', desc: 'Interactive elements' },
            { name: 'Concrete Gray', hex: '#64748B', desc: 'Secondary text' },
            { name: 'Slate', hex: '#0F172A', desc: 'Headings' },
            { name: 'Limestone', hex: '#F1F5F9', desc: 'Backgrounds' },
            { name: 'Pure White', hex: '#FFFFFF', desc: 'Cards & surfaces' }
          ].map((color) => (
            <div key={color.hex} style={{
              backgroundColor: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '140px',
                backgroundColor: color.hex,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{
                  color: color.hex === '#FFFFFF' || color.hex === '#F1F5F9' ? '#0F172A' : '#fff',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  fontFamily: 'monospace'
                }}>
                  {color.hex}
                </span>
              </div>
              <div style={{ padding: '1.25rem' }}>
                <p style={{
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: '#0F172A',
                  marginBottom: '0.25rem'
                }}>
                  {color.name}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#64748B' }}>
                  {color.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div style={{ backgroundColor: '#F8FAFC', padding: '5rem 0' }}>
        <div className="max-w-7xl mx-auto px-8">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
            <div style={{ width: '4px', height: '48px', backgroundColor: '#1E40AF' }} />
            <h3 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#0F172A', letterSpacing: '-0.01em' }}>
              Type System
            </h3>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '3rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '3rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                DISPLAY: HELVETICA NEUE LIGHT
              </p>
              <p style={{
                fontSize: '3.5rem',
                fontWeight: '300',
                color: '#0F172A',
                lineHeight: '1.2',
                marginBottom: '1rem'
              }}>
                Precision in Every Detail
              </p>
              <p style={{ fontSize: '0.875rem', color: '#64748B', fontFamily: 'monospace' }}>
                48-72px • 300 weight • -0.02em tracking
              </p>
            </div>

            <div>
              <p style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                BODY: HELVETICA NEUE REGULAR
              </p>
              <p style={{
                fontSize: '1.125rem',
                color: '#334155',
                lineHeight: '1.8',
                marginBottom: '1rem'
              }}>
                Clean, measured typography creates hierarchy through scale and weight, not decoration. Every measurement matters in construction—and in our interface design.
              </p>
              <p style={{ fontSize: '0.875rem', color: '#64748B', fontFamily: 'monospace' }}>
                16-18px • 400-600 weight • 1.8 line height
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Components */}
      <div className="max-w-7xl mx-auto px-8 py-20">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <div style={{ width: '4px', height: '48px', backgroundColor: '#1E40AF' }} />
          <h3 style={{ fontSize: '2.5rem', fontWeight: '300', color: '#0F172A', letterSpacing: '-0.01em' }}>
            Component Library
          </h3>
        </div>

        {/* Buttons */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: '600', marginBottom: '1rem' }}>
            Buttons & Actions
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button style={{
              padding: '0.875rem 2rem',
              backgroundColor: '#1E40AF',
              color: '#fff',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(30,64,175,0.2)'
            }}>
              Primary Action
            </button>
            <button style={{
              padding: '0.875rem 2rem',
              backgroundColor: '#fff',
              color: '#1E40AF',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: '2px solid #1E40AF',
              cursor: 'pointer'
            }}>
              Secondary
            </button>
            <button style={{
              padding: '0.875rem 2rem',
              backgroundColor: '#F1F5F9',
              color: '#64748B',
              fontWeight: '600',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer'
            }}>
              Tertiary
            </button>
          </div>
        </div>

        {/* Status Badges */}
        <div style={{ marginBottom: '3rem' }}>
          <p style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: '600', marginBottom: '1rem' }}>
            Status Indicators
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Approved', color: '#10B981', bg: '#ECFDF5' },
              { label: 'In Review', color: '#3B82F6', bg: '#EFF6FF' },
              { label: 'Pending', color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Rejected', color: '#EF4444', bg: '#FEF2F2' }
            ].map((status) => (
              <span key={status.label} style={{
                padding: '0.5rem 1rem',
                backgroundColor: status.bg,
                color: status.color,
                fontWeight: '600',
                fontSize: '0.875rem',
                border: `1px solid ${status.color}`,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: status.color, borderRadius: '50%' }} />
                {status.label}
              </span>
            ))}
          </div>
        </div>

        {/* Project Cards */}
        <div>
          <p style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: '600', marginBottom: '1rem' }}>
            Project Cards
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {[
              { title: 'Downtown Tower Construction', completion: 72, status: 'On Schedule' },
              { title: 'Harbor Bridge Renovation', completion: 45, status: 'Review Needed' }
            ].map((project) => (
              <div key={project.title} style={{
                backgroundColor: '#fff',
                border: '1px solid #E2E8F0',
                padding: '2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0F172A', lineHeight: '1.4', maxWidth: '70%' }}>
                    {project.title}
                  </h4>
                  <div style={{ width: '40px', height: '40px', backgroundColor: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box className="w-5 h-5" style={{ color: '#fff' }} />
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#64748B' }}>Completion</span>
                    <span style={{ fontSize: '1rem', fontWeight: '600', color: '#1E40AF' }}>{project.completion}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                    <div style={{
                      width: `${project.completion}%`,
                      height: '100%',
                      backgroundColor: '#1E40AF',
                      transition: 'width 1s ease'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#10B981', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Check className="w-4 h-4" />
                    {project.status}
                  </span>
                  <button style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: 'transparent',
                    color: '#1E40AF',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    border: '1px solid #1E40AF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: '#1E40AF', padding: '3rem 0' }}>
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <div>
            <p style={{ fontSize: '0.875rem', color: '#DBEAFE', marginBottom: '0.5rem' }}>
              Concept 2 of 8
            </p>
            <h4 style={{ fontSize: '1.75rem', fontWeight: '300', color: '#fff' }}>
              Clean Blueprint
            </h4>
          </div>
          <button style={{
            padding: '1rem 2rem',
            backgroundColor: '#fff',
            color: '#1E40AF',
            fontWeight: '600',
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            Next Concept
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
