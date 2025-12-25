// Design Concepts Index - Navigation hub for all 8 concepts

import { Link } from 'react-router-dom'
import { ArrowRight, Palette } from 'lucide-react'

const concepts = [
  {
    id: 1,
    name: 'Industrial Precision',
    tagline: 'Raw materials, bold typography, high contrast',
    colors: ['#18181B', '#EAB308', '#0EA5E9'],
    path: '/design-concepts/1-industrial'
  },
  {
    id: 2,
    name: 'Clean Blueprint',
    tagline: 'Architectural precision, crisp and professional',
    colors: ['#1E40AF', '#FFFFFF', '#64748B'],
    path: '/design-concepts/2-blueprint'
  },
  {
    id: 3,
    name: 'Modern Dark',
    tagline: 'Premium software aesthetic, pure blacks',
    colors: ['#000000', '#A855F7', '#FFFFFF'],
    path: '/design-concepts/3-modern-dark'
  },
  {
    id: 4,
    name: 'Scandinavian Light',
    tagline: 'Warm, friendly, minimal approach',
    colors: ['#FAFAF9', '#84CC16', '#78716C'],
    path: '/design-concepts/4-scandinavian'
  },
  {
    id: 5,
    name: 'Bold Contrast',
    tagline: 'Maximum contrast, brutally simple',
    colors: ['#000000', '#FFFFFF', '#06B6D4'],
    path: '/design-concepts/5-bold-contrast'
  },
  {
    id: 6,
    name: 'Earth & Natural',
    tagline: 'Organic, grounded, natural materials',
    colors: ['#78350F', '#D97706', '#65A30D'],
    path: '/design-concepts/6-earth-natural'
  },
  {
    id: 7,
    name: 'Safety High-Vis',
    tagline: 'Worksite-inspired, maximum visibility',
    colors: ['#000000', '#EAB308', '#DC2626'],
    path: '/design-concepts/7-safety-highvis'
  },
  {
    id: 8,
    name: 'Navy Premium',
    tagline: 'Corporate sophistication, refined excellence',
    colors: ['#0F172A', '#D4AF37', '#F8F4E8'],
    path: '/design-concepts/8-navy-premium'
  }
]

export default function ConceptsIndex() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-black flex items-center justify-center rounded-lg">
              <Palette className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground heading-page">JobSight Design Concepts</h1>
              <p className="text-secondary">8 distinct visual directions for your construction management platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>All concepts feature monochrome black/white logo • No orange</span>
          </div>
        </div>
      </div>

      {/* Concepts Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2 heading-section">Choose Your Aesthetic</h2>
          <p className="text-secondary">
            Each concept showcases complete color palettes, typography systems, and UI components. Click any concept to explore in detail.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {concepts.map((concept) => (
            <Link
              key={concept.id}
              to={concept.path}
              className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              {/* Color Preview Bar */}
              <div className="h-4 flex">
                {concept.colors.map((color, idx) => (
                  <div
                    key={idx}
                    className="flex-1 transition-all duration-300 group-hover:h-6"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-sm font-semibold text-muted mb-2">
                      CONCEPT {concept.id} / 8
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-secondary transition heading-subsection">
                      {concept.name}
                    </h3>
                    <p className="text-secondary leading-relaxed">
                      {concept.tagline}
                    </p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-disabled group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>

                {/* Color Swatches */}
                <div className="flex gap-2 mt-6">
                  {concept.colors.map((color, idx) => (
                    <div key={idx} className="flex-1">
                      <div
                        className="h-12 rounded-lg shadow-sm border border-border"
                        style={{ backgroundColor: color }}
                      />
                      <div className="mt-2 text-xs text-muted font-mono text-center">
                        {color}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <button className="text-sm font-semibold text-foreground group-hover:text-secondary flex items-center gap-2">
                    View Full Concept
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Compare */}
        <div className="mt-16 bg-card rounded-2xl p-8 shadow-md">
          <h3 className="text-xl font-bold text-foreground mb-6 heading-subsection">Quick Comparison</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Most Bold', concept: 'Industrial Precision' },
              { label: 'Most Professional', concept: 'Clean Blueprint' },
              { label: 'Most Modern', concept: 'Modern Dark' },
              { label: 'Most Friendly', concept: 'Scandinavian Light' },
              { label: 'Highest Contrast', concept: 'Bold Contrast' },
              { label: 'Most Organic', concept: 'Earth & Natural' },
              { label: 'Most Visible', concept: 'Safety High-Vis' },
              { label: 'Most Refined', concept: 'Navy Premium' }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="text-sm font-semibold text-muted mb-1">{item.label}</div>
                <div className="text-base text-foreground">{item.concept}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
          <h3 className="text-lg font-bold text-foreground mb-4 heading-subsection">Next Steps</h3>
          <ol className="space-y-2 text-secondary">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span>Browse through each concept to see complete color palettes, typography, and UI components</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span>Choose your preferred aesthetic direction (or combination of elements)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span>We'll refine the chosen concept and apply it to your core pages (layout, dashboard, project detail)</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
