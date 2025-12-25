/**
 * Refined Palette Demo Page
 * Expanded color options with more variety
 */

import { HardHat, FileText, CheckCircle, ArrowRight, Users, Calendar, Shield, Zap, Star } from 'lucide-react';

// Define 6 distinct color palettes
const palettes = [
  {
    id: 'A',
    name: 'Steel Blue',
    tagline: 'Professional & Tech-Forward',
    description: 'Classic tech blue. Trustworthy, corporate, modern.',
    primary: '#2563EB',
    primaryLight: '#3B82F6',
    primaryDark: '#1D4ED8',
    accent: '#0EA5E9',
    dark: '#0F172A',
  },
  {
    id: 'B',
    name: 'Forest Green',
    tagline: 'Sustainable & Safety',
    description: 'Eco-friendly green. Associated with approval and go.',
    primary: '#059669',
    primaryLight: '#10B981',
    primaryDark: '#047857',
    accent: '#0D9488',
    dark: '#0F172A',
  },
  {
    id: 'C',
    name: 'Royal Purple',
    tagline: 'Premium & Distinctive',
    description: 'Stands out from competitors. Premium positioning.',
    primary: '#7C3AED',
    primaryLight: '#8B5CF6',
    primaryDark: '#6D28D9',
    accent: '#A855F7',
    dark: '#0F172A',
  },
  {
    id: 'D',
    name: 'Teal Cyan',
    tagline: 'Modern & Technical',
    description: 'Fresh, digital, precision-focused.',
    primary: '#0891B2',
    primaryLight: '#06B6D4',
    primaryDark: '#0E7490',
    accent: '#22D3EE',
    dark: '#0F172A',
  },
  {
    id: 'E',
    name: 'Warm Amber',
    tagline: 'Bold & Energetic',
    description: 'Attention-grabbing, action-oriented, warm.',
    primary: '#D97706',
    primaryLight: '#F59E0B',
    primaryDark: '#B45309',
    accent: '#FBBF24',
    dark: '#0F172A',
  },
  {
    id: 'F',
    name: 'Deep Navy',
    tagline: 'Authoritative & Classic',
    description: 'Traditional, established, trustworthy.',
    primary: '#1E40AF',
    primaryLight: '#3B82F6',
    primaryDark: '#1E3A8A',
    accent: '#60A5FA',
    dark: '#0F172A',
  },
];

export function RefinedPaletteDemo() {
  return (
    <div className="min-h-screen bg-muted dark:bg-background">
      {/* Header */}
      <header className="bg-card dark:bg-surface shadow-sm border-b border-border dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground dark:text-white mb-4 heading-page">
              Choose Your Brand Color
            </h1>
            <p className="text-xl text-secondary dark:text-disabled max-w-3xl mx-auto">
              Pick a primary color for JobSight. Each option shows how the color appears across UI elements.
            </p>
          </div>
        </div>
      </header>

      {/* Palette Grid - 3x2 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {palettes.map((palette) => (
            <PaletteCard key={palette.id} palette={palette} />
          ))}
        </div>
      </div>

      {/* Footer Instructions */}
      <footer className="bg-card dark:bg-surface border-t border-border dark:border-gray-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-secondary dark:text-gray-300 mb-4">
            Tell me which option you prefer: <strong>A, B, C, D, E, or F</strong>
          </p>
          <p className="text-sm text-muted dark:text-disabled">
            I'll apply your chosen color across the entire design system and logo.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PaletteCard({ palette }: { palette: typeof palettes[0] }) {
  return (
    <div className="bg-card dark:bg-surface rounded-2xl shadow-lg overflow-hidden border border-border dark:border-gray-700 hover:shadow-xl transition-shadow">
      {/* Header with palette color */}
      <div
        className="relative h-20 flex items-center px-5"
        style={{ backgroundColor: palette.primary }}
      >
        {/* Accent line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: palette.primaryLight }}
        />

        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <HardHat className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-white/80 text-xs font-bold uppercase tracking-wider">
              Option {palette.id}
            </span>
            <h2 className="text-lg font-bold text-white heading-section">{palette.name}</h2>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Tagline & Description */}
        <div>
          <p className="font-semibold text-foreground dark:text-gray-200">{palette.tagline}</p>
          <p className="text-sm text-secondary dark:text-disabled">{palette.description}</p>
        </div>

        {/* Color Swatches */}
        <div className="flex gap-2">
          <div
            className="w-10 h-10 rounded-lg shadow-sm"
            style={{ backgroundColor: palette.primary }}
            title="Primary"
          />
          <div
            className="w-10 h-10 rounded-lg shadow-sm"
            style={{ backgroundColor: palette.primaryLight }}
            title="Light"
          />
          <div
            className="w-10 h-10 rounded-lg shadow-sm"
            style={{ backgroundColor: palette.primaryDark }}
            title="Dark"
          />
          <div
            className="w-10 h-10 rounded-lg shadow-sm"
            style={{ backgroundColor: palette.accent }}
            title="Accent"
          />
          <div
            className="w-10 h-10 rounded-lg shadow-sm"
            style={{ backgroundColor: palette.dark }}
            title="Dark UI"
          />
        </div>

        {/* Button Samples */}
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white shadow transition-transform hover:scale-105"
            style={{ backgroundColor: palette.primary }}
          >
            Primary
          </button>
          <button
            className="px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-colors"
            style={{ borderColor: palette.primary, color: palette.primary }}
          >
            Outline
          </button>
          <button
            className="px-3 py-1.5 rounded-lg text-sm font-semibold text-white shadow"
            style={{ backgroundColor: palette.primaryDark }}
          >
            Dark
          </button>
        </div>

        {/* Mini Dashboard Preview */}
        <div
          className="rounded-xl p-3 relative overflow-hidden"
          style={{ backgroundColor: palette.dark }}
        >
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(${palette.primary}50 1px, transparent 1px),
                linear-gradient(90deg, ${palette.primary}50 1px, transparent 1px)
              `,
              backgroundSize: '15px 15px',
            }}
          />

          {/* Accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{ backgroundColor: palette.primary }}
          />

          <div className="relative z-10 flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${palette.primary}30`, border: `1px solid ${palette.primary}50` }}
            >
              <HardHat className="w-4 h-4" style={{ color: palette.primaryLight }} />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">Dashboard</p>
              <p className="text-disabled text-xs">Welcome back</p>
            </div>
            <button
              className="px-2 py-1 rounded text-xs font-semibold text-white"
              style={{ backgroundColor: palette.primary }}
            >
              New
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: CheckCircle, value: '12' },
            { icon: Users, value: '8' },
            { icon: Calendar, value: '45' },
          ].map((stat, i) => (
            <div key={i} className="text-center p-2 rounded-lg bg-surface dark:bg-muted/50">
              <stat.icon className="w-5 h-5 mx-auto" style={{ color: palette.primary }} />
              <p className="text-lg font-bold text-foreground dark:text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Card Sample */}
        <div className="rounded-lg border border-border dark:border-gray-700 p-3 group hover:shadow-md transition-shadow relative overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: palette.primary }}
          />
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: palette.primary }}
            >
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground dark:text-white text-sm">Daily Report</p>
              <p className="text-xs text-muted">Create new</p>
            </div>
            <ArrowRight className="w-4 h-4" style={{ color: palette.primary }} />
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: palette.primary }}
          >
            <Zap className="w-3 h-3 text-white" />
          </div>
          <div
            className="flex-1 h-0.5 rounded-full"
            style={{
              background: `linear-gradient(to right, ${palette.primary}, ${palette.primaryLight}, transparent)`,
            }}
          />
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: palette.primaryLight }}
          >
            <Star className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RefinedPaletteDemo;
