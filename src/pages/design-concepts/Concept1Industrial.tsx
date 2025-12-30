// Concept 1: Industrial Precision
// Deep charcoal + steel blue + safety yellow
// Bold, technical, construction-focused aesthetic

import { HardHat, ArrowRight, Check, AlertTriangle, TrendingUp, Users, FileText, Calendar, ChevronRight } from 'lucide-react'

export default function Concept1Industrial() {

  return (
    <div className="min-h-screen" style={{
      backgroundColor: '#18181B',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Top Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #27272A 0%, #18181B 100%)',
        borderBottom: '2px solid #EAB308',
        padding: '0.5rem 0'
      }}>
        <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: '2px solid #fff'
            }}>
              <HardHat className="w-5 h-5" style={{ color: '#fff' }} />
            </div>
            <div>
              <h1 style={{
                fontSize: '1.5rem',
                fontWeight: '900',
                color: '#fff',
                letterSpacing: '-0.02em',
                lineHeight: '1',
                fontFamily: 'Arial Black, sans-serif'
              }}>
                JOBSIGHT
              </h1>
              <p style={{ fontSize: '0.7rem', color: '#71717A', fontWeight: '700', letterSpacing: '0.1em' }}>
                CONCEPT 1: INDUSTRIAL PRECISION
              </p>
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#A1A1AA', fontWeight: '600' }}>
            Downtown Tower • 68% Complete
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(180deg, #27272A 0%, #18181B 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Grid Pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(234, 179, 8, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(234, 179, 8, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: 0.3
        }} />

        <div className="max-w-7xl mx-auto px-6 py-16 relative">
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1.25rem',
            backgroundColor: '#EAB308',
            color: '#000',
            fontWeight: '900',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            marginBottom: '1.5rem',
            transform: 'skew(-5deg)',
            boxShadow: '4px 4px 0 rgba(234, 179, 8, 0.3)'
          }}>
            CONCEPT 01 / 08
          </div>

          <h2 style={{
            fontSize: '4rem',
            fontWeight: '900',
            color: '#fff',
            marginBottom: '1.5rem',
            lineHeight: '1',
            fontFamily: 'Arial Black, sans-serif',
            letterSpacing: '-0.03em'
          }}>
            INDUSTRIAL<br />
            PRECISION
          </h2>

          <p style={{
            fontSize: '1.25rem',
            color: '#A1A1AA',
            maxWidth: '600px',
            lineHeight: '1.6',
            marginBottom: '2rem',
            fontWeight: '500'
          }}>
            Raw materials. Bold typography. High contrast. Built for the construction site with technical brutalism at its core.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button style={{
              padding: '1rem 2rem',
              backgroundColor: '#EAB308',
              color: '#000',
              fontWeight: '900',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
              boxShadow: '0 8px 0 #CA8A04'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(4px)'
              e.currentTarget.style.boxShadow = '0 4px 0 #CA8A04'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 8px 0 #CA8A04'
            }}>
              VIEW FULL SYSTEM
              <ArrowRight className="w-4 h-4" />
            </button>
            <button style={{
              padding: '1rem 2rem',
              backgroundColor: 'transparent',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.875rem',
              border: '3px solid #fff',
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}>
              SKIP TO NEXT CONCEPT
            </button>
          </div>
        </div>
      </div>

      {/* Color Palette Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div style={{
          display: 'inline-block',
          padding: '0.25rem 1rem',
          backgroundColor: '#27272A',
          color: '#EAB308',
          fontWeight: '900',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          marginBottom: '1.5rem',
          border: '2px solid #3F3F46'
        }}>
          // COLOR SYSTEM
        </div>

        <h3 style={{
          fontSize: '2.5rem',
          fontWeight: '900',
          color: '#fff',
          marginBottom: '3rem',
          fontFamily: 'Arial Black, sans-serif',
          letterSpacing: '-0.02em'
        }}>
          INDUSTRIAL PALETTE
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          {[
            { name: 'CHARCOAL BASE', hex: '#18181B', desc: 'Primary background' },
            { name: 'STEEL GRAY', hex: '#27272A', desc: 'Secondary surface' },
            { name: 'SAFETY YELLOW', hex: '#EAB308', desc: 'Primary actions' },
            { name: 'STEEL BLUE', hex: '#0EA5E9', desc: 'Info & links' },
            { name: 'CAUTION RED', hex: '#EF4444', desc: 'Errors & alerts' },
            { name: 'APPROVED GREEN', hex: '#22C55E', desc: 'Success states' }
          ].map((color) => (
            <div key={color.hex} style={{
              backgroundColor: '#27272A',
              border: '2px solid #3F3F46',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '120px',
                backgroundColor: color.hex,
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  bottom: '0.5rem',
                  right: '0.5rem',
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  padding: '0.25rem 0.5rem',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace'
                }}>
                  {color.hex}
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                <p style={{
                  fontWeight: '900',
                  fontSize: '0.875rem',
                  color: '#fff',
                  marginBottom: '0.25rem',
                  letterSpacing: '0.05em'
                }}>
                  {color.name}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#71717A' }}>
                  {color.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Typography Section */}
      <div style={{ backgroundColor: '#27272A', padding: '4rem 0', borderTop: '2px solid #EAB308', borderBottom: '2px solid #EAB308' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div style={{
            display: 'inline-block',
            padding: '0.25rem 1rem',
            backgroundColor: '#18181B',
            color: '#EAB308',
            fontWeight: '900',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            marginBottom: '1.5rem',
            border: '2px solid #3F3F46'
          }}>
            // TYPOGRAPHY
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            <div>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '900',
                color: '#EAB308',
                marginBottom: '1rem',
                letterSpacing: '0.1em'
              }}>
                DISPLAY FONT
              </h4>
              <p style={{
                fontSize: '3rem',
                fontWeight: '900',
                color: '#fff',
                lineHeight: '1',
                fontFamily: 'Arial Black, sans-serif',
                marginBottom: '0.5rem'
              }}>
                CONSTRUCTION MANAGEMENT
              </p>
              <p style={{ fontSize: '0.875rem', color: '#71717A', fontFamily: 'monospace' }}>
                Arial Black • 900 weight • -0.02em tracking
              </p>
            </div>

            <div>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '900',
                color: '#0EA5E9',
                marginBottom: '1rem',
                letterSpacing: '0.1em'
              }}>
                BODY FONT
              </h4>
              <p style={{
                fontSize: '1.125rem',
                color: '#E4E4E7',
                lineHeight: '1.6',
                marginBottom: '1rem'
              }}>
                Clean, readable system fonts for interface text. Optimized for construction data and technical specifications.
              </p>
              <p style={{ fontSize: '0.875rem', color: '#71717A', fontFamily: 'monospace' }}>
                System Stack • 400-700 weight • 1.6 line height
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Component Examples */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div style={{
          display: 'inline-block',
          padding: '0.25rem 1rem',
          backgroundColor: '#27272A',
          color: '#EAB308',
          fontWeight: '900',
          fontSize: '0.7rem',
          letterSpacing: '0.1em',
          marginBottom: '1.5rem',
          border: '2px solid #3F3F46'
        }}>
          // COMPONENTS
        </div>

        <h3 style={{
          fontSize: '2.5rem',
          fontWeight: '900',
          color: '#fff',
          marginBottom: '3rem',
          fontFamily: 'Arial Black, sans-serif',
          letterSpacing: '-0.02em'
        }}>
          UI ELEMENTS
        </h3>

        {/* Buttons */}
        <div style={{ marginBottom: '3rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#A1A1AA', marginBottom: '1rem', letterSpacing: '0.1em' }}>
            BUTTONS
          </h4>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#EAB308',
              color: '#000',
              fontWeight: '900',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              boxShadow: '0 6px 0 #CA8A04'
            }}>
              PRIMARY ACTION
            </button>
            <button style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#0EA5E9',
              color: '#fff',
              fontWeight: '900',
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.05em',
              boxShadow: '0 6px 0 #0284C7'
            }}>
              SECONDARY
            </button>
            <button style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: '#fff',
              fontWeight: '700',
              fontSize: '0.875rem',
              border: '3px solid #fff',
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}>
              OUTLINE
            </button>
          </div>
        </div>

        {/* Status Badges */}
        <div style={{ marginBottom: '3rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#A1A1AA', marginBottom: '1rem', letterSpacing: '0.1em' }}>
            STATUS INDICATORS
          </h4>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#22C55E',
              color: '#000',
              fontWeight: '900',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '3px 3px 0 rgba(34, 197, 94, 0.3)'
            }}>
              <Check className="w-4 h-4" />
              APPROVED
            </span>
            <span style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#EAB308',
              color: '#000',
              fontWeight: '900',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '3px 3px 0 rgba(234, 179, 8, 0.3)'
            }}>
              <AlertTriangle className="w-4 h-4" />
              PENDING
            </span>
            <span style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#EF4444',
              color: '#fff',
              fontWeight: '900',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              boxShadow: '3px 3px 0 rgba(239, 68, 68, 0.3)'
            }}>
              REJECTED
            </span>
            <span style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#0EA5E9',
              color: '#fff',
              fontWeight: '900',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              boxShadow: '3px 3px 0 rgba(14, 165, 233, 0.3)'
            }}>
              IN REVIEW
            </span>
          </div>
        </div>

        {/* Project Cards */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: '700', color: '#A1A1AA', marginBottom: '1rem', letterSpacing: '0.1em' }}>
            PROJECT CARDS
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {[
              { title: 'Downtown Tower', progress: 68, status: 'ON SCHEDULE', color: '#22C55E' },
              { title: 'Harbor Bridge', progress: 45, status: 'DELAYED', color: '#EF4444' },
              { title: 'Medical Center', progress: 82, status: 'AHEAD', color: '#0EA5E9' }
            ].map((project) => (
              <div key={project.title} style={{
                backgroundColor: '#27272A',
                border: '3px solid #3F3F46',
                padding: '1.5rem',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  backgroundColor: project.color,
                  boxShadow: `0 0 20px ${project.color}`
                }} />

                <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'start', marginBottom: '1rem' }}>
                  <h5 style={{
                    fontSize: '1.25rem',
                    fontWeight: '900',
                    color: '#fff',
                    fontFamily: 'Arial Black, sans-serif'
                  }}>
                    {project.title}
                  </h5>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    backgroundColor: project.color,
                    color: project.color === '#EF4444' ? '#fff' : '#000',
                    fontWeight: '900',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em'
                  }}>
                    {project.status}
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#A1A1AA', fontWeight: '700' }}>
                      COMPLETION
                    </span>
                    <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', fontFamily: 'monospace' }}>
                      {project.progress}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '12px',
                    backgroundColor: '#18181B',
                    border: '2px solid #3F3F46',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${project.progress}%`,
                      height: '100%',
                      backgroundColor: project.color,
                      transition: 'width 1s ease'
                    }} />
                  </div>
                </div>

                <button style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#18181B',
                  color: '#EAB308',
                  fontWeight: '900',
                  fontSize: '0.75rem',
                  border: '2px solid #3F3F46',
                  cursor: 'pointer',
                  letterSpacing: '0.1em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                  VIEW PROJECT
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Preview */}
      <div style={{ backgroundColor: '#27272A', padding: '4rem 0', borderTop: '2px solid #EAB308' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div style={{
            display: 'inline-block',
            padding: '0.25rem 1rem',
            backgroundColor: '#18181B',
            color: '#EAB308',
            fontWeight: '900',
            fontSize: '0.7rem',
            letterSpacing: '0.1em',
            marginBottom: '1.5rem',
            border: '2px solid #3F3F46'
          }}>
            // DASHBOARD PREVIEW
          </div>

          <h3 style={{
            fontSize: '2.5rem',
            fontWeight: '900',
            color: '#fff',
            marginBottom: '3rem',
            fontFamily: 'Arial Black, sans-serif',
            letterSpacing: '-0.02em'
          }}>
            INTERFACE IN ACTION
          </h3>

          <div style={{
            backgroundColor: '#18181B',
            border: '3px solid #3F3F46',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* Mock Dashboard Header */}
            <div style={{
              backgroundColor: '#000',
              padding: '1rem 1.5rem',
              borderBottom: '2px solid #EAB308',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h4 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#fff', letterSpacing: '0.05em' }}>
                PROJECT DASHBOARD
              </h4>
              <div style={{ fontSize: '0.875rem', color: '#71717A', fontFamily: 'monospace' }}>
                LAST UPDATED: 2 MIN AGO
              </div>
            </div>

            {/* Mock Dashboard Content */}
            <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
              {[
                { icon: TrendingUp, label: 'PROGRESS', value: '68.5%', color: '#22C55E' },
                { icon: Users, label: 'TEAM', value: '24', color: '#0EA5E9' },
                { icon: FileText, label: 'REPORTS', value: '142', color: '#EAB308' },
                { icon: Calendar, label: 'DAYS LEFT', value: '87', color: '#EF4444' }
              ].map((stat) => {
                const Icon = stat.icon
                return (
                  <div key={stat.label} style={{
                    backgroundColor: '#27272A',
                    border: '2px solid #3F3F46',
                    padding: '1.5rem',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      width: '40px',
                      height: '40px',
                      backgroundColor: stat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.2
                    }}>
                      <Icon className="w-6 h-6" style={{ color: '#000' }} />
                    </div>
                    <p style={{
                      fontSize: '0.75rem',
                      fontWeight: '900',
                      color: '#71717A',
                      marginBottom: '0.5rem',
                      letterSpacing: '0.1em'
                    }}>
                      {stat.label}
                    </p>
                    <p style={{
                      fontSize: '2.5rem',
                      fontWeight: '900',
                      color: stat.color,
                      fontFamily: 'monospace',
                      lineHeight: '1'
                    }}>
                      {stat.value}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div style={{
        backgroundColor: '#18181B',
        borderTop: '2px solid #EAB308',
        padding: '2rem 0'
      }}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div>
            <p style={{ fontSize: '0.875rem', color: '#71717A', marginBottom: '0.5rem' }}>
              CONCEPT 1 OF 8
            </p>
            <h4 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff', fontFamily: 'Arial Black, sans-serif' }}>
              INDUSTRIAL PRECISION
            </h4>
          </div>
          <button style={{
            padding: '1rem 2rem',
            backgroundColor: '#EAB308',
            color: '#000',
            fontWeight: '900',
            fontSize: '0.875rem',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            letterSpacing: '0.05em'
          }}>
            NEXT CONCEPT
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
