// Animated Blueprint Lines Demo
// Shows various blueprint line animation effects on page load

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'

export default function AnimatedBlueprintDemo() {
  const [replay, setReplay] = useState(0)

  const triggerReplay = () => setReplay(prev => prev + 1)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A', fontFamily: '"Helvetica Neue", Arial, sans-serif' }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#1E293B',
        borderBottom: '1px solid #334155',
        padding: '1.5rem'
      }}>
        <div className="max-w-7xl mx-auto">
          <Link
            to="/blueprint-samples"
            style={{
              color: '#94A3B8',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Samples
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: '300',
                color: '#F1F5F9',
                marginBottom: '0.5rem'
              }}>
                Animated Blueprint Lines
              </h1>
              <p style={{ color: '#94A3B8', fontSize: '1rem' }}>
                Watch technical drawings come to life on page load
              </p>
            </div>

            <button
              onClick={triggerReplay}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3B82F6',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Play className="w-4 h-4" />
              Replay Animations
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Example 1: Drawing Grid Lines */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#F1F5F9',
            marginBottom: '1rem'
          }}>
            1. Grid Lines Drawing In
          </h2>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', maxWidth: '600px' }}>
            Technical blueprint grid that draws from left to right and top to bottom
          </p>

          <div style={{
            backgroundColor: '#1E40AF',
            padding: '3rem',
            position: 'relative',
            overflow: 'hidden',
            minHeight: '400px'
          }}>
            {/* Animated Grid */}
            <svg
              key={`grid-${replay}`}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%'
              }}
            >
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  {/* Vertical lines */}
                  <line
                    x1="0" y1="0" x2="0" y2="40"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1"
                    style={{
                      strokeDasharray: 40,
                      strokeDashoffset: 40,
                      animation: 'drawLine 0.8s ease-out forwards'
                    }}
                  />
                  {/* Horizontal lines */}
                  <line
                    x1="0" y1="0" x2="40" y2="0"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="1"
                    style={{
                      strokeDasharray: 40,
                      strokeDashoffset: 40,
                      animation: 'drawLine 0.8s ease-out 0.2s forwards'
                    }}
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            <div style={{
              position: 'relative',
              zIndex: 10,
              color: '#fff',
              textAlign: 'center',
              paddingTop: '8rem'
            }}>
              <h3 style={{ fontSize: '2rem', fontWeight: '300', marginBottom: '0.5rem' }}>
                Technical Grid
              </h3>
              <p style={{ fontSize: '1rem', opacity: 0.8 }}>
                Lines animate from edges inward
              </p>
            </div>
          </div>
        </div>

        {/* Example 2: Border Lines Drawing */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#F1F5F9',
            marginBottom: '1rem'
          }}>
            2. Card Border Drawing
          </h2>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', maxWidth: '600px' }}>
            Blueprint-style borders that trace around elements
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {[
              { title: 'Project Status', value: '68%', delay: '0s' },
              { title: 'Team Size', value: '24', delay: '0.3s' },
              { title: 'Days Left', value: '87', delay: '0.6s' }
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  backgroundColor: '#1E293B',
                  padding: '2rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Animated Border */}
                <svg
                  key={`border-${card.title}-${replay}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none'
                  }}
                >
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    style={{
                      strokeDasharray: 1000,
                      strokeDashoffset: 1000,
                      animation: `drawBorder 2s ease-out ${card.delay} forwards`
                    }}
                  />
                </svg>

                <div style={{ position: 'relative', zIndex: 10 }}>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#94A3B8',
                    marginBottom: '1rem',
                    letterSpacing: '0.05em'
                  }}>
                    {card.title}
                  </p>
                  <p style={{
                    fontSize: '3rem',
                    fontWeight: '300',
                    color: '#3B82F6'
                  }}>
                    {card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Example 3: Technical Drawing Lines */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#F1F5F9',
            marginBottom: '1rem'
          }}>
            3. Technical Drawing Animation
          </h2>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', maxWidth: '600px' }}>
            Architectural-style line drawings that trace out
          </p>

          <div style={{
            backgroundColor: '#1E293B',
            padding: '4rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <svg
              key={`drawing-${replay}`}
              width="600"
              height="300"
              viewBox="0 0 600 300"
              style={{ maxWidth: '100%', height: 'auto' }}
            >
              {/* Building outline */}
              <path
                d="M 100 250 L 100 100 L 200 50 L 500 50 L 500 250 Z"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                style={{
                  strokeDasharray: 1200,
                  strokeDashoffset: 1200,
                  animation: 'drawPath 3s ease-out forwards'
                }}
              />

              {/* Windows */}
              {[150, 250, 350, 450].map((x, i) => (
                <rect
                  key={x}
                  x={x}
                  y="120"
                  width="40"
                  height="50"
                  fill="none"
                  stroke="#60A5FA"
                  strokeWidth="1.5"
                  style={{
                    strokeDasharray: 180,
                    strokeDashoffset: 180,
                    animation: `drawPath 1s ease-out ${1.5 + i * 0.15}s forwards`
                  }}
                />
              ))}

              {/* Door */}
              <rect
                x="280"
                y="200"
                width="40"
                height="50"
                fill="none"
                stroke="#60A5FA"
                strokeWidth="2"
                style={{
                  strokeDasharray: 180,
                  strokeDashoffset: 180,
                  animation: 'drawPath 1s ease-out 2.2s forwards'
                }}
              />

              {/* Dimension lines */}
              <line
                x1="100"
                y1="270"
                x2="500"
                y2="270"
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="5,5"
                style={{
                  strokeDasharray: '5,5, 400',
                  strokeDashoffset: 400,
                  animation: 'drawPath 1.5s ease-out 2.5s forwards'
                }}
              />

              {/* Text */}
              <text
                x="300"
                y="290"
                fill="#94A3B8"
                fontSize="12"
                textAnchor="middle"
                style={{
                  opacity: 0,
                  animation: 'fadeIn 0.5s ease-out 3.5s forwards'
                }}
              >
                400 ft
              </text>
            </svg>
          </div>
        </div>

        {/* Example 4: Corner Accents */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#F1F5F9',
            marginBottom: '1rem'
          }}>
            4. Corner Accent Lines
          </h2>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', maxWidth: '600px' }}>
            Subtle corner brackets that draw in on focus
          </p>

          <div style={{
            backgroundColor: '#1E293B',
            padding: '3rem',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '500px',
              padding: '3rem',
              position: 'relative',
              backgroundColor: '#0F172A'
            }}>
              {/* Corner brackets */}
              {[
                { top: 0, left: 0, rotate: 0 },
                { top: 0, right: 0, rotate: 90 },
                { bottom: 0, right: 0, rotate: 180 },
                { bottom: 0, left: 0, rotate: 270 }
              ].map((pos, i) => (
                <svg
                  key={`corner-${i}-${replay}`}
                  style={{
                    position: 'absolute',
                    ...pos,
                    width: '40px',
                    height: '40px',
                    transform: `rotate(${pos.rotate}deg)`
                  }}
                >
                  <path
                    d="M 0 0 L 40 0 M 0 0 L 0 40"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    style={{
                      strokeDasharray: 80,
                      strokeDashoffset: 80,
                      animation: `drawPath 0.8s ease-out ${i * 0.15}s forwards`
                    }}
                  />
                </svg>
              ))}

              <div style={{ textAlign: 'center', color: '#F1F5F9' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '300', marginBottom: '1rem' }}>
                  Blueprint Frame
                </h3>
                <p style={{ color: '#94A3B8' }}>
                  Corner brackets animate from center outward
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Code Examples */}
        <div style={{
          backgroundColor: '#1E293B',
          padding: '2rem',
          borderLeft: '4px solid #3B82F6',
          marginTop: '4rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#F1F5F9',
            marginBottom: '1rem'
          }}>
            How It Works
          </h3>
          <p style={{ color: '#94A3B8', marginBottom: '1rem' }}>
            Uses CSS stroke-dasharray and stroke-dashoffset animation for SVG paths:
          </p>
          <pre style={{
            backgroundColor: '#0F172A',
            padding: '1.5rem',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '0.875rem',
            color: '#94A3B8',
            fontFamily: 'monospace'
          }}>
{`@keyframes drawLine {
  to {
    stroke-dashoffset: 0;
  }
}

line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 2s ease-out forwards;
}`}
          </pre>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes drawLine {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes drawBorder {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes drawPath {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
