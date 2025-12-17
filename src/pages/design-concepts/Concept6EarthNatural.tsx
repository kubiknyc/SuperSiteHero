// Concept 6: Earth & Natural - Browns + olive + terracotta
// Organic, grounded, construction materials

import { Leaf, ArrowRight } from 'lucide-react'

export default function Concept6EarthNatural() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FEF8F3', fontFamily: 'Georgia, serif' }}>
      <div className="max-w-5xl mx-auto px-8 py-20">
        <div className="flex items-center gap-4 mb-16">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#78350F' }}>
            <Leaf className="w-7 h-7 text-amber-100" />
          </div>
          <div>
            <h1 className="text-2xl font-serif" style={{ color: '#78350F' }}>JobSight</h1>
            <p className="text-sm" style={{ color: '#92400E' }}>Concept 6: Earth & Natural</p>
          </div>
        </div>

        <h2 className="text-6xl font-serif mb-8 leading-tight" style={{ color: '#451A03' }}>
          Grounded in<br/>Natural Materials
        </h2>
        <p className="text-xl mb-16 max-w-2xl leading-relaxed" style={{ color: '#92400E' }}>
          Warm earth tones inspired by construction materials—clay, wood, stone, and olive. Organic and inviting.
        </p>

        <div className="grid grid-cols-5 gap-4 mb-16">
          {[
            { bg: '#78350F', name: 'Clay Brown' },
            { bg: '#92400E', name: 'Earth' },
            { bg: '#D97706', name: 'Terracotta' },
            { bg: '#65A30D', name: 'Olive Green' },
            { bg: '#FEF3C7', name: 'Sand' }
          ].map(c => (
            <div key={c.bg} className="rounded-lg overflow-hidden shadow-md">
              <div className="h-32" style={{ backgroundColor: c.bg }} />
              <div className="p-3 bg-white">
                <p className="text-sm font-medium" style={{ color: '#78350F' }}>{c.name}</p>
                <p className="text-xs font-mono" style={{ color: '#92400E' }}>{c.bg}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <div className="flex gap-4">
            <button className="px-8 py-4 text-white font-serif text-lg rounded-lg shadow-lg hover:shadow-xl transition" style={{ backgroundColor: '#78350F' }}>
              Get Started
            </button>
            <button className="px-8 py-4 bg-white font-serif text-lg rounded-lg shadow-md hover:shadow-lg transition" style={{ color: '#78350F', border: '2px solid #78350F' }}>
              Learn More
            </button>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-serif mb-2" style={{ color: '#451A03' }}>Harbor Bridge Renovation</h3>
                <p style={{ color: '#92400E' }}>Infrastructure Project</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-serif font-bold" style={{ color: '#65A30D' }}>75%</div>
                <p className="text-sm" style={{ color: '#92400E' }}>Complete</p>
              </div>
            </div>
            <div className="h-4 bg-amber-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ backgroundColor: '#65A30D', width: '75%' }} />
            </div>
          </div>
        </div>

        <button className="mt-12 flex items-center gap-2 font-serif text-lg hover:underline" style={{ color: '#78350F' }}>
          Next Concept <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
