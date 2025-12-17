// Concept 8: Navy Premium - Deep navy + gold + cream
// Corporate, sophisticated, trustworthy

import { Award, ArrowRight } from 'lucide-react'

export default function Concept8NavyPremium() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0F172A', fontFamily: '"Playfair Display", serif' }}>
      <div className="max-w-5xl mx-auto px-8 py-16">
        <div className="flex items-center gap-4 mb-16 pb-6" style={{ borderBottom: '1px solid #D4AF37' }}>
          <div className="w-16 h-16 flex items-center justify-center" style={{ backgroundColor: '#D4AF37' }}>
            <Award className="w-8 h-8" style={{ color: '#0F172A' }} />
          </div>
          <div>
            <h1 className="text-3xl font-serif" style={{ color: '#F8F4E8' }}>JobSight</h1>
            <p className="text-sm tracking-wider" style={{ color: '#D4AF37' }}>CONCEPT 8: NAVY PREMIUM</p>
          </div>
        </div>

        <h2 className="text-7xl font-serif mb-8 leading-tight" style={{ color: '#F8F4E8' }}>
          Refined<br/>Excellence
        </h2>
        <p className="text-xl mb-16 max-w-2xl leading-relaxed" style={{ color: '#CBD5E1', fontFamily: 'Georgia, serif' }}>
          Corporate sophistication meets construction expertise. Deep navy, gold accents, and cream tones create trust and authority.
        </p>

        <div className="grid grid-cols-5 gap-4 mb-16">
          {[
            { bg: '#0F172A', name: 'Navy Deep' },
            { bg: '#1E293B', name: 'Navy Mid' },
            { bg: '#D4AF37', name: 'Gold' },
            { bg: '#F8F4E8', name: 'Cream' },
            { bg: '#CBD5E1', name: 'Silver' }
          ].map(c => (
            <div key={c.bg}>
              <div className="h-32 mb-3 border" style={{ backgroundColor: c.bg, borderColor: '#D4AF37' }} />
              <p className="text-sm font-serif" style={{ color: '#F8F4E8' }}>{c.name}</p>
              <p className="text-xs font-mono" style={{ color: '#64748B' }}>{c.bg}</p>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <div className="flex gap-4">
            <button className="px-10 py-4 font-serif text-lg transition" style={{ backgroundColor: '#D4AF37', color: '#0F172A' }}>
              Get Started
            </button>
            <button className="px-10 py-4 font-serif text-lg border-2 transition" style={{ color: '#D4AF37', borderColor: '#D4AF37' }}>
              Schedule Demo
            </button>
          </div>

          <div className="p-10 relative" style={{ backgroundColor: '#1E293B', border: '2px solid #D4AF37' }}>
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: '#D4AF37' }} />
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-3xl font-serif mb-2" style={{ color: '#F8F4E8' }}>Downtown Tower Development</h3>
                <p className="text-lg" style={{ color: '#CBD5E1' }}>Premium Commercial Construction</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-serif" style={{ color: '#D4AF37' }}>82%</div>
                <p style={{ color: '#CBD5E1' }}>Completion</p>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
              <div className="h-full" style={{ backgroundColor: '#D4AF37', width: '82%' }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Total Value', value: '$45.2M' },
              { label: 'Team Size', value: '32' },
              { label: 'Days Remaining', value: '64' }
            ].map(stat => (
              <div key={stat.label} className="p-6 text-center" style={{ backgroundColor: '#1E293B', border: '1px solid #334155' }}>
                <p className="text-sm mb-2 tracking-wider" style={{ color: '#94A3B8' }}>{stat.label}</p>
                <p className="text-3xl font-serif" style={{ color: '#D4AF37' }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 pt-8" style={{ borderTop: '1px solid #D4AF37' }}>
          <button className="flex items-center gap-3 text-xl font-serif transition" style={{ color: '#D4AF37' }}>
            View All Concepts <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
