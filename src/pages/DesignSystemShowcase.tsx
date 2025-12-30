// Design System Showcase - JobSight Premium Industrial Modern
// A comprehensive showcase of the refined color palette and aesthetic system

import { useState } from 'react'
import {
  HardHat, Copy, Check, Palette, Type, Grid3x3,
  Shapes, Sparkles, Component
} from 'lucide-react'

export default function DesignSystemShowcase() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedColor(text)
    setTimeout(() => setCopiedColor(null), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA]">
      {/* Hero Header */}
      <header className="relative bg-[#1C1C1E] text-white overflow-hidden">
        {/* Construction Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-8 py-20">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B2C] to-[#FF8F3D] rounded-2xl flex items-center justify-center shadow-2xl">
              <HardHat className="w-9 h-9 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
                JobSight
              </h1>
              <p className="text-[#FF8F3D] font-semibold text-lg">Premium Industrial Design System</p>
            </div>
          </div>
          <p className="text-xl text-gray-300 max-w-3xl leading-relaxed">
            A refined aesthetic system for construction professionals. Bold when it matters, refined where it counts.
          </p>
        </div>

        {/* Bottom accent stripe */}
        <div className="h-2 bg-gradient-to-r from-[#FF6B2C] via-[#FF8F3D] to-[#FFA759]" />
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Design Principles */}
        <section className="mb-24">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-6 h-6 text-[#FF6B2C]" />
            <h2 className="text-3xl font-bold text-[#1C1C1E]" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
              Design Principles
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: 'Bold & Functional',
                description: 'Strong visual hierarchy with purpose. Every element earns its place.',
                color: '#FF6B2C'
              },
              {
                title: 'Industrial Precision',
                description: 'Inspired by construction materials: concrete, steel, safety equipment.',
                color: '#2C2C2E'
              },
              {
                title: 'Premium Feel',
                description: 'Elevated execution. Professional tools deserve professional design.',
                color: '#8B7355'
              }
            ].map((principle, idx) => (
              <div
                key={idx}
                className="bg-card rounded-xl p-8 shadow-lg border border-border hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className="w-12 h-1 rounded-full mb-6"
                  style={{ backgroundColor: principle.color }}
                />
                <h3 className="text-xl font-bold text-[#1C1C1E] mb-3 heading-subsection">
                  {principle.title}
                </h3>
                <p className="text-secondary leading-relaxed">
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Color Palette */}
        <section className="mb-24">
          <div className="flex items-center gap-3 mb-8">
            <Palette className="w-6 h-6 text-[#FF6B2C]" />
            <h2 className="text-3xl font-bold text-[#1C1C1E]" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
              Color System
            </h2>
          </div>

          {/* Primary Colors */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-[#2C2C2E] mb-6 flex items-center gap-2 heading-subsection">
              <span className="w-8 h-8 bg-[#FF6B2C] rounded-lg" />
              Primary - Construction Orange
            </h3>
            <p className="text-secondary mb-6 max-w-3xl">
              Our signature color. Use boldly for CTAs, alerts, and key actions. Inspired by safety equipment and construction site visibility.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { name: 'Orange 50', hex: '#FFF4ED', usage: 'Subtle backgrounds' },
                { name: 'Orange 100', hex: '#FFE5D1', usage: 'Light backgrounds' },
                { name: 'Orange 400', hex: '#FF8F3D', usage: 'Hover states' },
                { name: 'Orange 500', hex: '#FF6B2C', usage: 'Primary actions' },
                { name: 'Orange 600', hex: '#E65100', usage: 'Active states' },
              ].map((color) => (
                <div
                  key={color.hex}
                  className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => copyToClipboard(color.hex)}
                >
                  <div
                    className="h-32 relative"
                    style={{ backgroundColor: color.hex }}
                  >
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity flex items-center justify-center">
                      {copiedColor === color.hex ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        <Copy className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm text-[#1C1C1E] mb-1">{color.name}</p>
                    <p className="text-xs font-mono text-muted mb-2">{color.hex}</p>
                    <p className="text-xs text-secondary">{color.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Neutral Colors */}
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-[#2C2C2E] mb-6 flex items-center gap-2 heading-subsection">
              <span className="w-8 h-8 bg-[#2C2C2E] rounded-lg" />
              Neutrals - Industrial Steel
            </h3>
            <p className="text-secondary mb-6 max-w-3xl">
              Deep charcoals and steel tones. Our primary surface colors for a premium, grounded feel.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {[
                { name: 'Concrete 50', hex: '#F5F1EA', usage: 'Page background' },
                { name: 'Concrete 100', hex: '#E8E3D8', usage: 'Card backgrounds' },
                { name: 'Steel 400', hex: '#8B8B8D', usage: 'Disabled states' },
                { name: 'Steel 600', hex: '#48484A', usage: 'Secondary text' },
                { name: 'Steel 800', hex: '#2C2C2E', usage: 'Primary text' },
                { name: 'Steel 900', hex: '#1C1C1E', usage: 'Headers, emphasis' },
              ].map((color) => (
                <div
                  key={color.hex}
                  className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => copyToClipboard(color.hex)}
                >
                  <div
                    className="h-32 relative"
                    style={{ backgroundColor: color.hex }}
                  >
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity flex items-center justify-center">
                      {copiedColor === color.hex ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        <Copy className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm text-[#1C1C1E] mb-1">{color.name}</p>
                    <p className="text-xs font-mono text-muted mb-2">{color.hex}</p>
                    <p className="text-xs text-secondary">{color.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Accent Colors */}
          <div>
            <h3 className="text-xl font-semibold text-[#2C2C2E] mb-6 flex items-center gap-2 heading-subsection">
              <span className="w-8 h-8 bg-gradient-to-br from-[#10B981] via-[#EAB308] to-[#EF4444] rounded-lg" />
              Semantic - Status Colors
            </h3>
            <p className="text-secondary mb-6 max-w-3xl">
              Construction-inspired status colors. High visibility for critical information.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Success', hex: '#10B981', usage: 'Approved, Complete', icon: '✓' },
                { name: 'Warning', hex: '#EAB308', usage: 'Pending, Caution', icon: '⚠' },
                { name: 'Error', hex: '#EF4444', usage: 'Failed, Critical', icon: '✕' },
                { name: 'Info', hex: '#3B82F6', usage: 'Blueprint, Info', icon: 'i' },
              ].map((color) => (
                <div
                  key={color.hex}
                  className="group bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => copyToClipboard(color.hex)}
                >
                  <div
                    className="h-32 relative flex items-center justify-center text-white text-4xl font-bold"
                    style={{ backgroundColor: color.hex }}
                  >
                    {color.icon}
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity flex items-center justify-center">
                      {copiedColor === color.hex ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        <Copy className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm text-[#1C1C1E] mb-1">{color.name}</p>
                    <p className="text-xs font-mono text-muted mb-2">{color.hex}</p>
                    <p className="text-xs text-secondary">{color.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-24">
          <div className="flex items-center gap-3 mb-8">
            <Type className="w-6 h-6 text-[#FF6B2C]" />
            <h2 className="text-3xl font-bold text-[#1C1C1E]" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
              Typography System
            </h2>
          </div>

          <div className="space-y-8">
            {/* Display Font */}
            <div className="bg-card rounded-xl p-8 shadow-lg">
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-[#FF6B2C] text-white text-xs font-bold rounded-full mb-3">
                  DISPLAY FONT
                </span>
                <h3 className="text-2xl font-bold text-[#1C1C1E] heading-subsection">Space Grotesk</h3>
                <p className="text-sm text-secondary mt-2">Geometric, bold, confident. Used for headings and emphasis.</p>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <div>
                  <p className="text-6xl font-bold text-[#1C1C1E] mb-2" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
                    The quick brown fox
                  </p>
                  <p className="text-sm text-muted font-mono">font-size: 3.75rem (60px) • font-weight: 700</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-[#1C1C1E] mb-2" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
                    The quick brown fox jumps over
                  </p>
                  <p className="text-sm text-muted font-mono">font-size: 2.25rem (36px) • font-weight: 700</p>
                </div>
              </div>
            </div>

            {/* Body Font */}
            <div className="bg-card rounded-xl p-8 shadow-lg">
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-[#2C2C2E] text-white text-xs font-bold rounded-full mb-3">
                  BODY FONT
                </span>
                <h3 className="text-2xl font-bold text-[#1C1C1E] heading-subsection">System Stack</h3>
                <p className="text-sm text-secondary mt-2">
                  -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
                </p>
                <p className="text-sm text-secondary">Clean, readable, performant. Optimized for interfaces.</p>
              </div>

              <div className="space-y-4 border-t border-border pt-6">
                <div>
                  <p className="text-xl text-[#1C1C1E] mb-2">
                    Construction management demands precision. Every detail matters when coordinating teams, tracking progress, and ensuring safety across complex projects.
                  </p>
                  <p className="text-sm text-muted font-mono">font-size: 1.25rem (20px) • font-weight: 400</p>
                </div>
                <div>
                  <p className="text-base text-[#48484A] mb-2 leading-relaxed">
                    JobSight combines powerful project management tools with an interface designed for the field. Whether you're reviewing daily reports, managing RFIs, or coordinating subcontractors, every feature is built with construction workflows in mind. Real-time collaboration, offline capabilities, and mobile-first design ensure your team stays connected and productive.
                  </p>
                  <p className="text-sm text-muted font-mono">font-size: 1rem (16px) • font-weight: 400 • line-height: 1.6</p>
                </div>
              </div>
            </div>

            {/* Monospace Font */}
            <div className="bg-card rounded-xl p-8 shadow-lg">
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-[#3B82F6] text-white text-xs font-bold rounded-full mb-3">
                  MONOSPACE
                </span>
                <h3 className="text-2xl font-bold text-[#1C1C1E] heading-subsection">JetBrains Mono</h3>
                <p className="text-sm text-secondary mt-2">Technical precision for data, codes, and measurements.</p>
              </div>

              <div className="bg-[#1C1C1E] rounded-lg p-6 font-mono text-[#10B981]">
                <p className="mb-2">Project: <span className="text-[#FF8F3D]">Downtown Tower Construction</span></p>
                <p className="mb-2">Contract Value: <span className="text-white font-bold">$45,230,000</span></p>
                <p className="mb-2">Completion: <span className="text-[#EAB308]">68.5%</span></p>
                <p>Status: <span className="text-[#10B981] font-bold">ON SCHEDULE</span></p>
              </div>
            </div>
          </div>
        </section>

        {/* Spacing & Grid */}
        <section className="mb-24">
          <div className="flex items-center gap-3 mb-8">
            <Grid3x3 className="w-6 h-6 text-[#FF6B2C]" />
            <h2 className="text-3xl font-bold text-[#1C1C1E]" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
              Construction Grid System
            </h2>
          </div>

          <div className="bg-card rounded-xl p-8 shadow-lg">
            <p className="text-secondary mb-8 max-w-3xl">
              8-point grid system inspired by construction measurements. Consistent, predictable spacing creates rhythm and hierarchy.
            </p>

            <div className="space-y-4">
              {[
                { size: 8, multiplier: '1x', usage: 'Tight spacing, icon padding' },
                { size: 16, multiplier: '2x', usage: 'Component padding, small gaps' },
                { size: 24, multiplier: '3x', usage: 'Standard spacing' },
                { size: 32, multiplier: '4x', usage: 'Section spacing' },
                { size: 48, multiplier: '6x', usage: 'Large gaps' },
                { size: 64, multiplier: '8x', usage: 'Major sections' },
              ].map((spacing) => (
                <div key={spacing.size} className="flex items-center gap-4">
                  <div
                    className="bg-[#FF6B2C] rounded"
                    style={{ width: spacing.size, height: spacing.size }}
                  />
                  <div className="flex-1">
                    <p className="font-bold text-[#1C1C1E]">{spacing.size}px ({spacing.multiplier})</p>
                    <p className="text-sm text-secondary">{spacing.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Material & Texture Patterns */}
        <section className="mb-24">
          <div className="flex items-center gap-3 mb-8">
            <Shapes className="w-6 h-6 text-[#FF6B2C]" />
            <h2 className="text-3xl font-bold text-[#1C1C1E]" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
              Material Patterns
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Concrete Texture */}
            <div className="bg-[#E8E3D8] rounded-xl p-8 shadow-lg relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
              />
              <div className="relative">
                <h3 className="text-xl font-bold text-[#1C1C1E] mb-2 heading-subsection">Concrete Texture</h3>
                <p className="text-sm text-secondary">Subtle background pattern for cards and surfaces</p>
              </div>
            </div>

            {/* Construction Grid */}
            <div className="bg-[#1C1C1E] rounded-xl p-8 shadow-lg relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255, 143, 61, 0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 143, 61, 0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px'
                }}
              />
              <div className="relative">
                <h3 className="text-xl font-bold text-white mb-2 heading-subsection">Construction Grid</h3>
                <p className="text-sm text-disabled">Technical precision for dark backgrounds</p>
              </div>
            </div>

            {/* Safety Stripes */}
            <div className="bg-card rounded-xl p-8 shadow-lg relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    #FF6B2C,
                    #FF6B2C 20px,
                    transparent 20px,
                    transparent 40px
                  )`
                }}
              />
              <div className="relative">
                <h3 className="text-xl font-bold text-[#1C1C1E] mb-2 heading-subsection">Safety Stripes</h3>
                <p className="text-sm text-secondary">High-visibility pattern for warnings and alerts</p>
              </div>
            </div>

            {/* Steel Mesh */}
            <div className="bg-[#2C2C2E] rounded-xl p-8 shadow-lg relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255, 143, 61, 0.1) 10px, rgba(255, 143, 61, 0.1) 20px),
                    repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(255, 143, 61, 0.1) 10px, rgba(255, 143, 61, 0.1) 20px)
                  `
                }}
              />
              <div className="relative">
                <h3 className="text-xl font-bold text-white mb-2 heading-subsection">Steel Mesh</h3>
                <p className="text-sm text-disabled">Industrial texture for emphasis areas</p>
              </div>
            </div>
          </div>
        </section>

        {/* Component Examples Preview */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <Component className="w-6 h-6 text-[#FF6B2C]" />
            <h2 className="text-3xl font-bold text-[#1C1C1E]" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
              Component Preview
            </h2>
          </div>

          <div className="bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] rounded-2xl p-12 shadow-2xl">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Buttons */}
              <div>
                <h3 className="text-white text-lg font-semibold mb-4 heading-subsection">Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <button className="px-6 py-3 bg-[#FF6B2C] hover:bg-[#FF8F3D] text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                    Primary Action
                  </button>
                  <button className="px-6 py-3 bg-card hover:bg-muted text-[#1C1C1E] font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                    Secondary
                  </button>
                  <button className="px-6 py-3 border-2 border-white hover:bg-card text-white hover:text-[#1C1C1E] font-bold rounded-lg transition-all duration-200">
                    Outline
                  </button>
                </div>
              </div>

              {/* Status Badges */}
              <div>
                <h3 className="text-white text-lg font-semibold mb-4 heading-subsection">Status Indicators</h3>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 bg-[#10B981] text-white font-bold text-sm rounded-full shadow-lg">
                    ✓ Approved
                  </span>
                  <span className="px-4 py-2 bg-[#EAB308] text-white font-bold text-sm rounded-full shadow-lg">
                    ⚠ Pending
                  </span>
                  <span className="px-4 py-2 bg-[#EF4444] text-white font-bold text-sm rounded-full shadow-lg">
                    ✕ Rejected
                  </span>
                  <span className="px-4 py-2 bg-[#3B82F6] text-white font-bold text-sm rounded-full shadow-lg">
                    i In Review
                  </span>
                </div>
              </div>

              {/* Cards */}
              <div>
                <h3 className="text-white text-lg font-semibold mb-4 heading-subsection">Cards</h3>
                <div className="bg-card rounded-xl p-6 shadow-2xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-bold text-[#1C1C1E]" style={{ fontFamily: 'Space Grotesk, system-ui, sans-serif' }}>
                        Project Status
                      </h4>
                      <p className="text-sm text-secondary mt-1">Updated 2 hours ago</p>
                    </div>
                    <span className="px-3 py-1 bg-[#10B981] text-white font-bold text-xs rounded-full">
                      ON TRACK
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-secondary">Completion</span>
                      <span className="font-mono font-bold text-[#1C1C1E]">68.5%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#FF6B2C] to-[#FF8F3D] h-full rounded-full transition-all duration-500" style={{ width: '68.5%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-[#1C1C1E] text-white py-12 mt-24">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-disabled">
            <span className="font-bold text-[#FF8F3D]">JobSight Design System</span> • Premium Industrial Modern
          </p>
          <p className="text-sm text-muted mt-2">
            Built for construction professionals who demand excellence
          </p>
        </div>
      </footer>
    </div>
  )
}
