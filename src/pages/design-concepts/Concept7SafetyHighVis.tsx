// Concept 7: Safety High-Vis - Safety yellow + black + red
// Worksite-inspired, high visibility, bold

import { AlertTriangle, ArrowRight } from 'lucide-react'

export default function Concept7SafetyHighVis() {
  return (
    <div className="min-h-screen bg-black" style={{ fontFamily: 'Impact, sans-serif' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Warning Stripe Header */}
        <div style={{
          background: 'repeating-linear-gradient(45deg, #EAB308, #EAB308 20px, #000 20px, #000 40px)',
          height: '40px',
          marginBottom: '3rem'
        }} />

        <div className="flex items-center gap-4 mb-12">
          <div className="w-20 h-20 bg-yellow-400 flex items-center justify-center transform rotate-45">
            <AlertTriangle className="w-10 h-10 text-black transform -rotate-45" />
          </div>
          <div>
            <h1 className="text-4xl text-yellow-400 tracking-wider heading-page">JOBSIGHT</h1>
            <p className="text-yellow-400/60 text-sm tracking-widest">CONCEPT 7: SAFETY HIGH-VIS</p>
          </div>
        </div>

        <h2 className="text-8xl text-yellow-400 mb-8 leading-none tracking-tight heading-section">
          SAFETY<br/>FIRST
        </h2>
        <p className="text-2xl text-white mb-16 max-w-2xl leading-relaxed" style={{ fontFamily: 'Arial, sans-serif' }}>
          Maximum visibility. Bold warnings. Inspired by safety equipment and construction site signage.
        </p>

        <div className="grid grid-cols-4 gap-6 mb-16">
          {[
            { bg: '#EAB308', text: 'black', name: 'SAFETY YELLOW' },
            { bg: '#000000', text: '#EAB308', name: 'BLACK', border: true },
            { bg: '#DC2626', text: 'white', name: 'WARNING RED' },
            { bg: '#FFFFFF', text: 'black', name: 'WHITE' }
          ].map(c => (
            <div key={c.name}>
              <div className={`h-40 flex items-center justify-center text-2xl font-bold ${c.border ? 'border-4 border-yellow-400' : ''}`} style={{ backgroundColor: c.bg, color: c.text }}>
                {c.name}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <div className="flex gap-4">
            <button className="px-12 py-6 bg-yellow-400 text-black text-xl font-bold hover:bg-yellow-300 transition transform hover:scale-105">
              START PROJECT
            </button>
            <button className="px-12 py-6 bg-error text-white text-xl font-bold hover:bg-red-700 transition transform hover:scale-105">
              ALERT
            </button>
          </div>

          <div className="bg-yellow-400 text-black p-8 relative overflow-hidden">
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '200px',
              height: '200px',
              background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)'
            }} />
            <div className="relative">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-4xl font-bold mb-2 heading-subsection">DOWNTOWN TOWER</h3>
                  <p className="text-xl">HIGH-PRIORITY PROJECT</p>
                </div>
                <div className="bg-black text-yellow-400 px-6 py-3 text-3xl font-bold">
                  68%
                </div>
              </div>
              <div className="h-10 bg-black relative overflow-hidden">
                <div className="h-full bg-error absolute" style={{ width: '68%' }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'repeating-linear-gradient(45deg, #EAB308, #EAB308 20px, #000 20px, #000 40px)',
          height: '40px',
          marginTop: '3rem',
          marginBottom: '2rem'
        }} />

        <button className="flex items-center gap-3 text-yellow-400 text-2xl font-bold hover:text-yellow-300 transition">
          NEXT CONCEPT <ArrowRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  )
}
