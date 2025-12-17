// Concept 5: Bold Contrast - Pure black/white + electric cyan
// High contrast, striking, accessible

import { Zap, ArrowRight } from 'lucide-react'

export default function Concept5BoldContrast() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: '"Courier New", monospace' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="border-8 border-black p-12 mb-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-black border-4 border-cyan-400 flex items-center justify-center">
              <Zap className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">JOBSIGHT</h1>
              <p className="text-sm">CONCEPT 5: BOLD CONTRAST</p>
            </div>
          </div>

          <h2 className="text-7xl font-bold mb-6 leading-none">
            MAXIMUM<br/>CONTRAST
          </h2>
          <p className="text-xl mb-12 max-w-2xl leading-relaxed">
            No gray areas. Pure black, pure white, electric cyan. Brutally simple and powerfully effective.
          </p>

          <div className="grid grid-cols-3 gap-6 mb-12">
            {[
              { bg: '#000000', text: 'white', label: 'BLACK' },
              { bg: '#FFFFFF', text: 'black', label: 'WHITE', border: true },
              { bg: '#06B6D4', text: 'black', label: 'CYAN' }
            ].map(c => (
              <div key={c.bg} className={`h-40 flex items-center justify-center font-bold text-2xl ${c.border ? 'border-4 border-black' : ''}`} style={{ backgroundColor: c.bg, color: c.text }}>
                {c.label}
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <button className="px-10 py-5 bg-black text-cyan-400 font-bold text-lg border-4 border-cyan-400 hover:bg-cyan-400 hover:text-black transition">
                PRIMARY
              </button>
              <button className="px-10 py-5 bg-white text-black font-bold text-lg border-4 border-black hover:bg-black hover:text-white transition">
                SECONDARY
              </button>
            </div>

            <div className="bg-black text-white p-8 border-4 border-cyan-400">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-3xl font-bold mb-2">DOWNTOWN TOWER</h3>
                  <p className="text-cyan-400 font-bold">CONSTRUCTION PROJECT</p>
                </div>
                <div className="bg-cyan-400 text-black px-4 py-2 font-bold text-2xl">
                  68%
                </div>
              </div>
              <div className="h-8 bg-white">
                <div className="h-full bg-cyan-400" style={{ width: '68%' }} />
              </div>
            </div>
          </div>
        </div>

        <button className="flex items-center gap-3 text-2xl font-bold hover:underline">
          NEXT CONCEPT <ArrowRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
