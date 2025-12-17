// Blueprint Variants Index - Shows 8 different visual treatments of the blueprint design

import { Link } from 'react-router-dom'
import { ArrowLeft, Palette } from 'lucide-react'

export default function BlueprintVariantsIndex() {
  const variants = [
    {
      id: '1-classic',
      name: 'Classic Blueprint',
      description: 'Traditional dark blueprint style with white lines on deep blue',
      color: '#0A1628',
      textColor: '#FFFFFF',
      path: '/blueprint-samples/variants/1-classic'
    },
    {
      id: '2-light',
      name: 'Light & Airy',
      description: 'Minimal design with maximum white space and subtle accents',
      color: '#FFFFFF',
      textColor: '#0F172A',
      path: '/blueprint-samples/variants/2-light'
    },
    {
      id: '3-technical',
      name: 'Technical',
      description: 'Heavy on annotations, dimension lines, and measurements',
      color: '#F8FAFC',
      textColor: '#0F172A',
      path: '/blueprint-samples/variants/3-technical'
    },
    {
      id: '4-glass',
      name: 'Modern Glass',
      description: 'Glassmorphism with frosted glass cards and gradient backgrounds',
      color: '#1E40AF',
      textColor: '#FFFFFF',
      path: '/blueprint-samples/variants/4-glass'
    },
    {
      id: '5-industrial',
      name: 'Industrial Grid',
      description: 'Strong grid system, construction-focused, bold and rugged',
      color: '#18181B',
      textColor: '#FAFAFA',
      path: '/blueprint-samples/variants/5-industrial'
    },
    {
      id: '6-minimal',
      name: 'Minimal Lines',
      description: 'Ultra-clean with thin lines and maximum breathing room',
      color: '#FAFAFA',
      textColor: '#171717',
      path: '/blueprint-samples/variants/6-minimal'
    },
    {
      id: '7-corporate',
      name: 'Corporate Professional',
      description: 'Business-focused, polished, and trustworthy',
      color: '#F1F5F9',
      textColor: '#0F172A',
      path: '/blueprint-samples/variants/7-corporate'
    },
    {
      id: '8-architectural',
      name: 'Architectural Elegant',
      description: 'Sophisticated, refined, architect-style with ornamental details',
      color: '#F8FAFC',
      textColor: '#0F172A',
      path: '/blueprint-samples/variants/8-architectural'
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
          <Link
            to="/blueprint-samples"
            style={{
              color: '#DBEAFE',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '2rem'
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blueprint Samples
          </Link>

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
              <Palette className="w-8 h-8" style={{ color: '#1E40AF' }} />
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
                Blueprint Design Variants
              </h1>
              <p style={{ fontSize: '1.125rem', color: '#DBEAFE', fontWeight: '400' }}>
                8 Different Visual Approaches
              </p>
            </div>
          </div>

          <p style={{
            fontSize: '1.125rem',
            color: '#DBEAFE',
            maxWidth: '700px',
            lineHeight: '1.8',
            fontWeight: '300'
          }}>
            Each variant maintains the blueprint aesthetic while offering a distinct visual personality.
            Compare different approaches to typography, spacing, color intensity, and overall mood.
          </p>
        </div>

        <div style={{ height: '2px', backgroundColor: '#fff', opacity: 0.3 }} />
      </div>

      {/* Variants Grid */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '2rem'
        }}>
          {variants.map((variant, index) => (
            <Link
              key={variant.id}
              to={variant.path}
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
              {/* Color preview */}
              <div style={{
                height: '120px',
                backgroundColor: variant.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Pattern overlay based on variant */}
                {variant.id === '1-classic' && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                      linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }} />
                )}
                {variant.id === '5-industrial' && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                      linear-gradient(#27272A 2px, transparent 2px),
                      linear-gradient(90deg, #27272A 2px, transparent 2px)
                    `,
                    backgroundSize: '40px 40px'
                  }} />
                )}

                <div style={{
                  fontSize: '3rem',
                  fontWeight: '300',
                  color: variant.textColor,
                  opacity: 0.5,
                  fontFamily: '"Helvetica Neue", Arial, sans-serif',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {index + 1}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '2rem' }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#0F172A',
                  marginBottom: '0.75rem',
                  lineHeight: '1.3'
                }}>
                  {variant.name}
                </h3>

                <p style={{
                  fontSize: '1rem',
                  color: '#64748B',
                  lineHeight: '1.6'
                }}>
                  {variant.description}
                </p>

                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#1E40AF',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  View Variant →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Box */}
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          padding: '2rem',
          marginTop: '4rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1E40AF',
            marginBottom: '1rem'
          }}>
            Compare & Choose
          </h3>
          <p style={{
            color: '#334155',
            fontSize: '1rem',
            lineHeight: '1.8',
            marginBottom: '1rem'
          }}>
            Click any variant to see it in full detail. Each design demonstrates how the same content can be
            presented with different visual treatments while maintaining the blueprint aesthetic.
          </p>
          <p style={{
            color: '#334155',
            fontSize: '1rem',
            lineHeight: '1.8'
          }}>
            Notice the differences in typography, spacing, color intensity, border styles, and overall mood.
            Which approach resonates best with your vision for JobSight?
          </p>
        </div>
      </div>
    </div>
  )
}
