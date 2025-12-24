// Concept 4: Scandinavian Light - Soft grays + sage green
// Friendly, minimal, warm

import { Heart, ArrowRight } from 'lucide-react'

export default function Concept4Scandinavian() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF9', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-medium" className="heading-page">JobSight</h1>
            <p className="text-sm text-stone-500">Concept 4: Scandinavian Light</p>
          </div>
        </div>

        <h2 className="text-6xl font-light text-stone-900 mb-6 leading-tight" className="heading-section">
          Warm, Friendly,<br/>Minimal
        </h2>
        <p className="text-lg text-stone-600 max-w-xl mb-12 leading-relaxed">
          Soft colors, generous space, and approachable design. Construction management with a human touch.
        </p>

        <div className="grid grid-cols-5 gap-6 mb-16">
          {[
            { bg: '#F5F5F4', name: 'Warm White' },
            { bg: '#E7E5E4', name: 'Soft Stone' },
            { bg: '#78716C', name: 'Warm Gray' },
            { bg: '#84CC16', name: 'Sage Green' },
            { bg: '#1C1917', name: 'Deep Brown' }
          ].map(c => (
            <div key={c.bg} className="rounded-2xl overflow-hidden shadow-sm">
              <div className="h-28" style={{ backgroundColor: c.bg }} />
              <div className="p-4 bg-card">
                <p className="text-sm font-medium text-stone-900">{c.name}</p>
                <p className="text-xs text-stone-500 font-mono">{c.bg}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="flex gap-3">
            <button className="px-8 py-4 bg-lime-500 hover:bg-lime-600 text-white rounded-full font-medium shadow-lg transition">
              Get Started
            </button>
            <button className="px-8 py-4 bg-card hover:bg-stone-50 text-stone-900 rounded-full font-medium shadow-sm transition">
              Learn More
            </button>
          </div>

          <div className="bg-card rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-medium text-stone-900 mb-2" className="heading-subsection">Harbor Bridge Project</h3>
                <p className="text-stone-600">Infrastructure renovation</p>
              </div>
              <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-lime-600">72%</span>
              </div>
            </div>
            <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-lime-500 rounded-full" style={{ width: '72%' }} />
            </div>
          </div>
        </div>

        <button className="mt-12 flex items-center gap-2 text-lime-600 hover:text-lime-700 font-medium">
          Next Concept <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
