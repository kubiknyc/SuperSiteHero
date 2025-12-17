// Blueprint Variants Index - 4 polished, production-ready design variants

import { Link } from 'react-router-dom'
import { ArrowLeft, Palette } from 'lucide-react'

export default function BlueprintVariantsIndex() {
  const variants = [
    {
      id: '1-professional',
      name: 'Professional Blueprint',
      description: 'Clean, corporate-ready design with refined typography, smooth interactions, and polished components',
      color: '#F8FAFC',
      accentColor: '#1E40AF',
      textColor: '#0F172A',
      path: '/blueprint-samples/variants/1-professional',
      tags: ['Light Theme', 'Corporate', 'Refined']
    },
    {
      id: '2-technical-dark',
      name: 'Technical Dark',
      description: 'Modern dark theme with refined blueprint accents, glassmorphism, and technical precision',
      color: '#0A0F1E',
      accentColor: '#60A5FA',
      textColor: '#F8FAFC',
      path: '/blueprint-samples/variants/2-technical-dark',
      tags: ['Dark Theme', 'Modern', 'Technical']
    },
    {
      id: '3-minimal',
      name: 'Minimal Precision',
      description: 'Ultra-minimal design with perfect execution, generous white space, and elegant typography',
      color: '#FFFFFF',
      accentColor: '#000000',
      textColor: '#000000',
      path: '/blueprint-samples/variants/3-minimal',
      tags: ['Minimal', 'Elegant', 'Clean']
    },
    {
      id: '4-industrial',
      name: 'Modern Industrial',
      description: 'Contemporary construction aesthetic with bold typography, strong colors, and professional polish',
      color: '#FAFAF9',
      accentColor: '#F59E0B',
      textColor: '#0A0A0A',
      path: '/blueprint-samples/variants/4-industrial',
      tags: ['Industrial', 'Bold', 'Construction']
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
                Polished Design Variants
              </h1>
              <p style={{ fontSize: '1.125rem', color: '#DBEAFE', fontWeight: '400' }}>
                4 Production-Ready Approaches
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
            Each variant is production-ready with refined typography, polished components, and attention to detail.
            Choose the aesthetic that best fits your brand vision.
          </p>
        </div>

        <div style={{ height: '2px', backgroundColor: '#fff', opacity: 0.3 }} />
      </div>

      {/* Variants Grid */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
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
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                display: 'block'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = `0 12px 24px ${variant.accentColor}20`
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.borderColor = variant.accentColor
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.borderColor = '#E2E8F0'
              }}
            >
              {/* Color preview */}
              <div style={{
                height: '180px',
                backgroundColor: variant.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                borderBottom: `3px solid ${variant.accentColor}`
              }}>
                {/* Pattern overlay */}
                {variant.id === '2-technical-dark' && (
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

                <div style={{
                  fontSize: '4rem',
                  fontWeight: '200',
                  color: variant.accentColor,
                  opacity: 0.4,
                  fontFamily: '"Helvetica Neue", Arial, sans-serif',
                  position: 'relative',
                  zIndex: 1
                }}>
                  0{index + 1}
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '2rem' }}>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap'
                }}>
                  {variant.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: '0.25rem 0.75rem',
                        backgroundColor: `${variant.accentColor}10`,
                        color: variant.accentColor,
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '600'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

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
                  lineHeight: '1.6',
                  marginBottom: '1.5rem'
                }}>
                  {variant.description}
                </p>

                <div style={{
                  paddingTop: '1rem',
                  borderTop: '1px solid #F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: variant.accentColor,
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  View Full Design →
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Box */}
        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          padding: '2rem',
          marginTop: '4rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1E40AF',
            marginBottom: '1rem'
          }}>
            Production-Ready Designs
          </h3>
          <p style={{
            color: '#334155',
            fontSize: '1rem',
            lineHeight: '1.8',
            marginBottom: '1rem'
          }}>
            Each variant has been carefully crafted with refined typography hierarchies, consistent spacing systems,
            polished components, and attention to detail. These aren't mockups—they're production-ready implementations.
          </p>
          <p style={{
            color: '#334155',
            fontSize: '1rem',
            lineHeight: '1.8'
          }}>
            Click any variant to explore the full dashboard implementation and see how the same content can be
            presented with completely different visual treatments while maintaining professional quality.
          </p>
        </div>
      </div>
    </div>
  )
}
