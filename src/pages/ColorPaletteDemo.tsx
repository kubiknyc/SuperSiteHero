/**
 * Color Palette Demo Page
 * Visual comparison of all 6 color palette options for JobSight rebrand
 * User will select their preferred palette from this page
 */

import { HardHat, FileText, Shield, CheckCircle, ArrowRight, Star, Zap, Users, Calendar } from 'lucide-react';

// Define all 6 color palettes
const palettes = [
  {
    id: 1,
    name: 'Industrial Steel Blue',
    tag: 'RECOMMENDED',
    description: 'Professional, trustworthy, tech-forward',
    vibe: 'Corporate, reliable, modern tech',
    primary: '#2563EB',
    primaryLight: '#3B82F6',
    primaryDark: '#1D4ED8',
    accent: '#64748B',
    dark: '#0F172A',
    tailwindClass: 'blue',
  },
  {
    id: 2,
    name: 'Deep Forest Green',
    tag: 'ECO-FRIENDLY',
    description: 'Sustainable construction, environmental focus',
    vibe: 'Sustainable, progressive, safety-focused',
    primary: '#059669',
    primaryLight: '#10B981',
    primaryDark: '#047857',
    accent: '#0D9488',
    dark: '#0F172A',
    tailwindClass: 'emerald',
  },
  {
    id: 3,
    name: 'Professional Purple',
    tag: 'DISTINCTIVE',
    description: 'Premium, innovative, stands out from competitors',
    vibe: 'Premium, innovative, modern',
    primary: '#7C3AED',
    primaryLight: '#8B5CF6',
    primaryDark: '#6D28D9',
    accent: '#4F46E5',
    dark: '#0F172A',
    tailwindClass: 'violet',
  },
  {
    id: 4,
    name: 'Charcoal + Cyan',
    tag: 'HIGH-TECH',
    description: 'Industrial minimalist, precision engineering',
    vibe: 'Futuristic, technical, precision-focused',
    primary: '#06B6D4',
    primaryLight: '#22D3EE',
    primaryDark: '#0891B2',
    accent: '#334155',
    dark: '#0F172A',
    tailwindClass: 'cyan',
  },
  {
    id: 5,
    name: 'Navy + Gold',
    tag: 'PREMIUM',
    description: 'Luxury projects, established authority',
    vibe: 'Premium, established, authoritative',
    primary: '#1E40AF',
    primaryLight: '#2563EB',
    primaryDark: '#1E3A8A',
    accent: '#F59E0B',
    dark: '#0F172A',
    tailwindClass: 'blue',
    hasGoldAccent: true,
  },
  {
    id: 6,
    name: 'Slate Monochrome',
    tag: 'MINIMALIST',
    description: 'Content-first, clean, professional',
    vibe: 'Minimalist, professional, content-first',
    primary: '#475569',
    primaryLight: '#64748B',
    primaryDark: '#334155',
    accent: '#059669',
    dark: '#0F172A',
    tailwindClass: 'slate',
    hasEmeraldAccent: true,
  },
];

export function ColorPaletteDemo() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Your Color Palette
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Select a color scheme for JobSight. Each palette is designed for construction field management with professional, accessible colors.
            </p>
          </div>
        </div>
      </header>

      {/* Palette Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {palettes.map((palette) => (
            <PaletteCard key={palette.id} palette={palette} />
          ))}
        </div>
      </div>

      {/* Footer Instructions */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            Tell me which palette number (1-6) you prefer!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            I'll update the entire design system with your chosen colors.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PaletteCard({ palette }: { palette: typeof palettes[0] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header with gradient */}
      <div
        className="relative h-32 flex items-center justify-between px-6"
        style={{ backgroundColor: palette.primary }}
      >
        {/* Animated grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative z-10">
          <span className="inline-block px-2 py-1 text-xs font-bold uppercase tracking-wider bg-white/20 text-white rounded mb-2">
            {palette.tag}
          </span>
          <h2 className="text-2xl font-bold text-white">
            {palette.id}. {palette.name}
          </h2>
        </div>

        <div className="relative z-10 rounded-xl bg-white/20 p-3">
          <HardHat className="w-8 h-8 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Description */}
        <div>
          <p className="text-gray-600 dark:text-gray-400">{palette.description}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Vibe: {palette.vibe}
          </p>
        </div>

        {/* Color Swatches */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Color Swatches
          </h3>
          <div className="flex gap-3">
            <ColorSwatch color={palette.primary} label="Primary" />
            <ColorSwatch color={palette.primaryLight} label="Light" />
            <ColorSwatch color={palette.primaryDark} label="Dark" />
            <ColorSwatch color={palette.accent} label="Accent" />
            <ColorSwatch color={palette.dark} label="Dark UI" />
          </div>
        </div>

        {/* Sample Buttons */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Button Styles
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              className="px-4 py-2 rounded-lg font-semibold text-white shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: palette.primary }}
            >
              Primary Button
            </button>
            <button
              className="px-4 py-2 rounded-lg font-semibold border-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
              style={{ borderColor: palette.primary, color: palette.primary }}
            >
              Outline Button
            </button>
            {palette.hasGoldAccent && (
              <button
                className="px-4 py-2 rounded-lg font-semibold text-gray-900 shadow-lg"
                style={{ backgroundColor: palette.accent }}
              >
                Gold Accent
              </button>
            )}
          </div>
        </div>

        {/* Sample Card */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Sample Card
          </h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow relative overflow-hidden group">
            {/* Accent line on hover */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: palette.primary }}
            />

            <div className="flex items-start gap-4">
              <div
                className="rounded-lg p-2.5 shadow-lg"
                style={{ backgroundColor: palette.primary }}
              >
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 dark:text-white">Daily Report</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Create today's field report
                </p>
              </div>
              <ArrowRight
                className="w-5 h-5 transition-colors"
                style={{ color: palette.primary }}
              />
            </div>
          </div>
        </div>

        {/* Sample Stats */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Sample Stats
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: CheckCircle, label: 'Tasks', value: '12' },
              { icon: Users, label: 'Team', value: '8' },
              { icon: Calendar, label: 'Days', value: '45' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <stat.icon
                  className="w-6 h-6 mx-auto mb-1"
                  style={{ color: palette.primary }}
                />
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Hero Preview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Hero Section Preview
          </h3>
          <div
            className="relative rounded-xl h-24 flex items-center px-4 overflow-hidden"
            style={{ backgroundColor: palette.dark }}
          >
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `
                  linear-gradient(${palette.primary}40 1px, transparent 1px),
                  linear-gradient(90deg, ${palette.primary}40 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px',
              }}
            />

            {/* Accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: palette.primary }}
            />

            <div className="relative z-10 flex items-center gap-3">
              <div
                className="rounded-lg p-2"
                style={{ backgroundColor: `${palette.primary}30`, border: `1px solid ${palette.primary}50` }}
              >
                <HardHat className="w-4 h-4" style={{ color: palette.primaryLight }} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Field Command Center</p>
                <p className="text-gray-400 text-xs">Welcome back, User</p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Preview */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Timeline Connector
          </h3>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: palette.primary }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div
              className="flex-1 h-1 rounded-full"
              style={{
                background: `linear-gradient(to right, ${palette.primary}, ${palette.primaryLight}, transparent)`,
              }}
            />
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: palette.primaryLight }}
            >
              <Star className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-12 h-12 rounded-lg shadow-md border border-gray-200 dark:border-gray-600"
        style={{ backgroundColor: color }}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
      <p className="text-xs font-mono text-gray-400">{color}</p>
    </div>
  );
}

export default ColorPaletteDemo;
