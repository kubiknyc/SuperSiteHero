/**
 * JobSight UI Component Demo Page
 * Showcases the Professional Blueprint redesign with all new components
 */

import { useState } from 'react';
import {
  Logo,
  LogoIcon,
  LogoIconLight,
  SidebarLogo,
  AuthLogo,
  CompactLogo,
  LogoIconWithBadge,
} from '@/components/brand/Logo';
import {
  LoadingScreen,
  LoadingSpinner,
  LoadingOverlay,
  ButtonLoader,
} from '@/components/LoadingScreen';
import { HardHat, Zap, Shield, Wrench, Truck, CheckCircle } from 'lucide-react';

export function DemoPage() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showFullLoader, setShowFullLoader] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  const handleButtonClick = () => {
    setButtonLoading(true);
    setTimeout(() => setButtonLoading(false), 2000);
  };

  if (showFullLoader) {
    return (
      <div className="relative h-screen">
        <LoadingScreen message="Building Your Project..." />
        <button
          onClick={() => setShowFullLoader(false)}
          className="absolute top-4 right-4 z-50 px-4 py-2 bg-card text-foreground rounded-lg shadow-lg hover:bg-muted"
        >
          Close Demo
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Hero Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(249, 115, 22, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(249, 115, 22, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              animation: 'gridSlide 20s linear infinite',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Logo size="2xl" animated />
            </div>
            <h1 className="text-5xl font-bold mb-4 heading-page">
              Industrial Modern Design System
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              A comprehensive showcase of JobSight's redesigned UI components with bold orange branding,
              construction-inspired patterns, and professional animations.
            </p>
          </div>
        </div>

        <style>{`
          @keyframes gridSlide {
            0% { transform: translate(0, 0); }
            100% { transform: translate(40px, 40px); }
          }
        `}</style>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* Logo Variants Section */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3 heading-section">
            <div className="w-1 h-8 bg-primary dark:bg-primary" />
            Logo Components
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Auth Logo */}
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-subsection">
                Auth Logo
              </h3>
              <div className="flex items-center justify-center min-h-[300px] bg-surface rounded-xl">
                <AuthLogo />
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Dramatic presentation for login/signup pages with pulsing glow rings
              </p>
            </div>

            {/* Sidebar Logo */}
            <div className="bg-gray-900 rounded-2xl p-8 shadow-lg">
              <h3 className="text-sm font-semibold text-disabled uppercase tracking-wide mb-4 heading-subsection">
                Sidebar Logo
              </h3>
              <div className="flex items-center justify-center min-h-[300px]">
                <SidebarLogo />
              </div>
              <p className="text-sm text-disabled mt-4">
                Enhanced with orange glow effects for dark sidebar navigation
              </p>
            </div>

            {/* Compact Logo */}
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-subsection">
                Compact Logo
              </h3>
              <div className="flex items-center justify-center min-h-[300px] bg-surface rounded-xl">
                <CompactLogo />
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Navbar version with subtle hover animations and glow
              </p>
            </div>

            {/* Logo Sizes */}
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-subsection">
                Size Variants
              </h3>
              <div className="space-y-6 flex flex-col items-center">
                <div className="text-center">
                  <Logo size="sm" animated />
                  <p className="text-xs text-muted mt-2">Small</p>
                </div>
                <div className="text-center">
                  <Logo size="md" animated />
                  <p className="text-xs text-muted mt-2">Medium</p>
                </div>
                <div className="text-center">
                  <Logo size="lg" animated />
                  <p className="text-xs text-muted mt-2">Large</p>
                </div>
              </div>
            </div>

            {/* Icon Variants */}
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-subsection">
                Icon Variants
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <LogoIcon className="w-12 h-12" animated />
                  <span className="text-sm text-gray-600">Standard Icon</span>
                </div>
                <div className="flex items-center gap-4 bg-gray-900 rounded-lg p-4">
                  <LogoIconLight className="w-12 h-12" animated />
                  <span className="text-sm text-gray-300">Light Icon</span>
                </div>
                <div className="flex items-center gap-4">
                  <LogoIconWithBadge badge="9" />
                  <span className="text-sm text-gray-600">With Badge</span>
                </div>
              </div>
            </div>

            {/* Logo Icon Only */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-8 shadow-lg">
              <h3 className="text-sm font-semibold text-white dark:text-white uppercase tracking-wide mb-4 heading-subsection">
                Icon Only
              </h3>
              <div className="flex items-center justify-center min-h-[200px]">
                <Logo variant="icon-only" size="xl" />
              </div>
              <p className="text-sm text-white dark:text-white mt-4">
                Icon-only variant for compact spaces
              </p>
            </div>
          </div>
        </section>

        {/* Loading States Section */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3 heading-section">
            <div className="w-1 h-8 bg-primary dark:bg-primary" />
            Loading Components
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Full Screen Loader Demo */}
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-subsection">
                Full Screen Loader
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Dramatic loading screen with animated construction grid, pulsing glow, and your logo
                </p>
                <button
                  onClick={() => setShowFullLoader(true)}
                  className="w-full bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  View Full Screen Loader
                </button>
              </div>
            </div>

            {/* Loading Spinner */}
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-subsection">
                Loading Spinners
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600">Small</span>
                </div>
                <div className="flex items-center gap-4">
                  <LoadingSpinner size="md" />
                  <span className="text-sm text-gray-600">Medium</span>
                </div>
                <div className="flex items-center gap-4">
                  <LoadingSpinner size="lg" />
                  <span className="text-sm text-gray-600">Large</span>
                </div>
              </div>
            </div>

            {/* Loading Overlay */}
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-subsection">
                Loading Overlay
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Glass morphism modal overlay with backdrop blur
                </p>
                <button
                  onClick={() => setShowOverlay(true)}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Show Overlay
                </button>
              </div>
            </div>

            {/* Button Loader */}
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-subsection">
                Button Loader
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Inline 3-dot animation for loading buttons
                </p>
                <button
                  onClick={handleButtonClick}
                  disabled={buttonLoading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/60 dark:bg-primary dark:hover:bg-primary/80 dark:disabled:bg-primary/40 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {buttonLoading ? <ButtonLoader /> : 'Click to Load'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Background Patterns Section */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3 heading-section">
            <div className="w-1 h-8 bg-primary dark:bg-primary" />
            Background Patterns
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Blueprint Pattern */}
            <div className="rounded-2xl overflow-hidden shadow-lg h-48 relative group">
              <div className="absolute inset-0 bg-blueprint-pattern" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-semibold">Blueprint Pattern</span>
              </div>
            </div>

            {/* Construction Grid */}
            <div className="rounded-2xl overflow-hidden shadow-lg h-48 relative group">
              <div className="absolute inset-0 bg-construction-grid" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-semibold">Construction Grid</span>
              </div>
            </div>

            {/* Concrete Texture */}
            <div className="rounded-2xl overflow-hidden shadow-lg h-48 relative group">
              <div className="absolute inset-0 bg-concrete-texture" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-semibold">Concrete Texture</span>
              </div>
            </div>

            {/* Steel Mesh */}
            <div className="rounded-2xl overflow-hidden shadow-lg h-48 relative group">
              <div className="absolute inset-0 bg-steel-mesh" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-semibold">Steel Mesh</span>
              </div>
            </div>
          </div>
        </section>

        {/* Industrial UI Elements */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3 heading-section">
            <div className="w-1 h-8 bg-primary dark:bg-primary" />
            Industrial UI Elements
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Glass Cards */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-secondary heading-subsection">Glass Morphism Cards</h3>

              {/* Light Glass Card */}
              <div className="relative h-64 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500" />
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="glass-card p-6 rounded-xl max-w-xs">
                    <HardHat className="w-8 h-8 text-primary dark:text-primary-400 mb-3" />
                    <h4 className="font-bold text-foreground mb-2 heading-card">Light Glass Card</h4>
                    <p className="text-sm text-secondary">
                      Frosted glass effect with backdrop blur for modern depth
                    </p>
                  </div>
                </div>
              </div>

              {/* Dark Glass Card */}
              <div className="relative h-64 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-red-600 to-pink-600" />
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="glass-card-dark p-6 rounded-xl max-w-xs">
                    <Shield className="w-8 h-8 text-primary dark:text-primary-400 mb-3" />
                    <h4 className="font-bold text-white mb-2 heading-card">Dark Glass Card</h4>
                    <p className="text-sm text-gray-300">
                      Dark variant with subtle transparency and border glow
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Industrial Components */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-secondary heading-subsection">Industrial Components</h3>

              {/* Industrial Buttons */}
              <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-4">
                <button className="industrial-button w-full bg-primary hover:bg-primary/90 dark:bg-primary dark:hover:bg-primary/80 text-white px-6 py-3 rounded-lg">
                  Primary Action
                </button>
                <button className="industrial-button w-full bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg">
                  Secondary Action
                </button>
                <button className="industrial-button w-full border-2 border-primary text-primary hover:bg-primary-50 dark:border-primary-600 dark:text-primary-400 dark:hover:bg-primary-950 px-6 py-3 rounded-lg">
                  Outline Button
                </button>
              </div>

              {/* Safety Badge */}
              <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-card">
                  Safety Badge
                </h4>
                <div className="flex flex-wrap gap-3">
                  <div className="safety-badge">
                    <Shield className="w-4 h-4" />
                    Safety First
                  </div>
                  <div className="safety-badge">
                    <HardHat className="w-4 h-4" />
                    PPE Required
                  </div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="bg-card rounded-2xl p-6 shadow-lg border border-border space-y-3">
                <h4 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4 heading-card">
                  Status Indicators
                </h4>
                <div className="status-active text-sm font-medium text-secondary">
                  Project Active
                </div>
                <div className="status-active text-sm font-medium text-secondary">
                  Equipment Available
                </div>
                <div className="status-active text-sm font-medium text-secondary">
                  Team On-Site
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards with Icons */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3 heading-section">
            <div className="w-1 h-8 bg-primary dark:bg-primary" />
            Feature Cards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Zap, title: 'Fast Performance', desc: 'Optimized for field conditions', color: 'from-yellow-500 to-orange-500' },
              { icon: Shield, title: 'Safety First', desc: 'Compliance tracking built-in', color: 'from-green-500 to-teal-500' },
              { icon: Wrench, title: 'Customizable', desc: 'Adapt to your workflow', color: 'from-blue-500 to-indigo-500' },
              { icon: Truck, title: 'Mobile Ready', desc: 'Work anywhere, anytime', color: 'from-purple-500 to-pink-500' },
              { icon: CheckCircle, title: 'Quality Control', desc: 'Track every detail', color: 'from-orange-500 to-red-500' },
              { icon: HardHat, title: 'Field Tested', desc: 'Built for construction', color: 'from-gray-700 to-gray-900' },
            ].map((feature, i) => (
              <div
                key={i}
                className="group bg-card rounded-2xl p-6 shadow-lg border border-border hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-2 heading-subsection">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Color Palette */}
        <section>
          <h2 className="text-3xl font-bold text-foreground mb-8 flex items-center gap-3 heading-section">
            <div className="w-1 h-8 bg-primary dark:bg-primary" />
            Color Palette
          </h2>

          <div className="bg-card rounded-2xl p-8 shadow-lg border border-border">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Primary (Blueprint Blue) Scale */}
              <div className="space-y-2">
                <div className="h-20 bg-primary-400 dark:bg-primary-400 rounded-lg shadow-md" />
                <p className="text-xs font-mono text-gray-600 dark:text-disabled">#60A5FA</p>
                <p className="text-xs text-muted dark:text-disabled">Primary 400</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 bg-primary dark:bg-primary rounded-lg shadow-md" />
                <p className="text-xs font-mono text-gray-600 dark:text-disabled">#1E40AF</p>
                <p className="text-xs text-muted dark:text-disabled">Primary (Blueprint Blue)</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 bg-primary-700 dark:bg-primary-700 rounded-lg shadow-md" />
                <p className="text-xs font-mono text-gray-600 dark:text-disabled">#1E3A8A</p>
                <p className="text-xs text-muted dark:text-disabled">Primary 700</p>
              </div>

              {/* Gray Scale */}
              <div className="space-y-2">
                <div className="h-20 bg-muted rounded-lg shadow-md border border-input" />
                <p className="text-xs font-mono text-gray-600">#F3F4F6</p>
                <p className="text-xs text-muted">Gray 100</p>
              </div>
              <div className="space-y-2">
                <div className="h-20 bg-gray-900 rounded-lg shadow-md" />
                <p className="text-xs font-mono text-gray-100">#111827</p>
                <p className="text-xs text-muted">Gray 900</p>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <SidebarLogo />
            <div className="text-center md:text-right">
              <p className="text-disabled text-sm">
                Industrial Modern Design System
              </p>
              <p className="text-muted text-xs mt-1">
                Built for construction field management
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Loading Overlay Demo */}
      <LoadingOverlay show={showOverlay} message="Processing your request..." />
      {showOverlay && (
        <button
          onClick={() => setShowOverlay(false)}
          className="fixed bottom-8 right-8 z-[60] px-6 py-3 bg-card text-foreground rounded-lg shadow-2xl hover:bg-muted font-semibold"
        >
          Close Overlay
        </button>
      )}
    </div>
  );
}

export default DemoPage;
