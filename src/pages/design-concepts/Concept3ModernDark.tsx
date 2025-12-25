// Concept 3: Modern Dark - True blacks + purple accent
// Premium software-first aesthetic like Linear/Vercel

import { Zap, ArrowRight } from 'lucide-react'

export default function Concept3ModernDark() {
  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-card flex items-center justify-center">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight heading-page">JOBSIGHT</h1>
              <p className="text-xs text-muted tracking-wider">CONCEPT 3</p>
            </div>
          </div>
        </div>

        <h2 className="text-7xl font-bold mb-6" style={{ lineHeight: '1.1' }}>
          Modern<br/>Dark Mode
        </h2>
        <p className="text-xl text-disabled max-w-2xl mb-12 leading-relaxed">
          Premium software aesthetic. Pure blacks, subtle grays, and electric purple accents. Built for focus and efficiency.
        </p>

        {/* Color Grid */}
        <div className="grid grid-cols-6 gap-4 mb-16">
          {[
            { hex: '#000000', name: 'Pure Black' },
            { hex: '#18181B', name: 'Rich Black' },
            { hex: '#27272A', name: 'Dark Gray' },
            { hex: '#A855F7', name: 'Purple Accent' },
            { hex: '#FFFFFF', name: 'White' },
            { hex: '#71717A', name: 'Mid Gray' }
          ].map(c => (
            <div key={c.hex}>
              <div className="h-32 mb-2" style={{ backgroundColor: c.hex }} />
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted font-mono">{c.hex}</p>
            </div>
          ))}
        </div>

        {/* Components */}
        <div className="space-y-6 mb-16">
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition">
              Primary Action
            </button>
            <button className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition">
              Secondary
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-1 heading-subsection">Downtown Tower</h3>
                <p className="text-sm text-disabled">Construction Management</p>
              </div>
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-sm font-medium rounded-full border border-purple-500/20">
                Active
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-disabled">Progress</span>
                <span className="font-mono text-purple-400">68.5%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400" style={{ width: '68.5%' }} />
              </div>
            </div>
          </div>
        </div>

        <button className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition">
          Next Concept <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
