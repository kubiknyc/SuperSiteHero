// File: src/config/color-palettes.ts
// Color palette definitions for sidebar theming
// Extracted from SidebarV2Demo for reusability

// ============================================================================
// TYPES
// ============================================================================

export interface ColorSwatch {
  name: string
  color: string
  hex: string
}

export interface ColorPalette {
  id: string
  name: string
  description: string
  // Background colors
  pageBg: string
  sidebarBg: string
  sidebarBorder: string
  surfaceBg: string
  divider: string
  // Text colors
  textPrimary: string
  textSecondary: string
  textMuted: string
  // Accent colors
  accent: string
  accentHover: string
  accentBg: string
  accentText: string
  // Logo
  logoBg: string
  logoShadow: string
  // Avatar
  avatarBg: string
  // Swatches for display
  swatches: ColorSwatch[]
}

// ============================================================================
// PALETTE DEFINITIONS
// ============================================================================

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'warm-stone',
    name: 'Warm Stone',
    description: 'Earthy neutrals with amber accents - professional and grounded',
    pageBg: 'bg-stone-950',
    sidebarBg: 'bg-stone-900',
    sidebarBorder: 'border-stone-800/50',
    surfaceBg: 'bg-stone-800',
    divider: 'bg-stone-800',
    textPrimary: 'text-white',
    textSecondary: 'text-stone-400',
    textMuted: 'text-stone-500',
    accent: 'bg-amber-500',
    accentHover: 'hover:bg-amber-500/20',
    accentBg: 'bg-amber-500/20',
    accentText: 'text-amber-400',
    logoBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    logoShadow: 'shadow-amber-500/20',
    avatarBg: 'bg-gradient-to-br from-stone-700 to-stone-800',
    swatches: [
      { name: 'Background', color: 'bg-stone-900', hex: '#1c1917' },
      { name: 'Surface', color: 'bg-stone-800', hex: '#292524' },
      { name: 'Border', color: 'bg-stone-700', hex: '#44403c' },
      { name: 'Text', color: 'bg-stone-400', hex: '#a8a29e' },
      { name: 'Accent', color: 'bg-amber-500', hex: '#f59e0b' },
    ],
  },
  {
    id: 'cool-slate',
    name: 'Cool Slate',
    description: 'Modern and professional with blue accents - tech-forward feel',
    pageBg: 'bg-slate-950',
    sidebarBg: 'bg-slate-900',
    sidebarBorder: 'border-slate-800/50',
    surfaceBg: 'bg-slate-800',
    divider: 'bg-slate-800',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
    accent: 'bg-blue-500',
    accentHover: 'hover:bg-blue-500/20',
    accentBg: 'bg-blue-500/20',
    accentText: 'text-blue-400',
    logoBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    logoShadow: 'shadow-blue-500/20',
    avatarBg: 'bg-gradient-to-br from-slate-700 to-slate-800',
    swatches: [
      { name: 'Background', color: 'bg-slate-900', hex: '#0f172a' },
      { name: 'Surface', color: 'bg-slate-800', hex: '#1e293b' },
      { name: 'Border', color: 'bg-slate-700', hex: '#334155' },
      { name: 'Text', color: 'bg-slate-400', hex: '#94a3b8' },
      { name: 'Accent', color: 'bg-blue-500', hex: '#3b82f6' },
    ],
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Natural and trustworthy with emerald accents - sustainable feel',
    pageBg: 'bg-neutral-950',
    sidebarBg: 'bg-neutral-900',
    sidebarBorder: 'border-neutral-800/50',
    surfaceBg: 'bg-neutral-800',
    divider: 'bg-neutral-800',
    textPrimary: 'text-white',
    textSecondary: 'text-neutral-400',
    textMuted: 'text-neutral-500',
    accent: 'bg-emerald-500',
    accentHover: 'hover:bg-emerald-500/20',
    accentBg: 'bg-emerald-500/20',
    accentText: 'text-emerald-400',
    logoBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    logoShadow: 'shadow-emerald-500/20',
    avatarBg: 'bg-gradient-to-br from-neutral-700 to-neutral-800',
    swatches: [
      { name: 'Background', color: 'bg-neutral-900', hex: '#171717' },
      { name: 'Surface', color: 'bg-neutral-800', hex: '#262626' },
      { name: 'Border', color: 'bg-neutral-700', hex: '#404040' },
      { name: 'Text', color: 'bg-neutral-400', hex: '#a3a3a3' },
      { name: 'Accent', color: 'bg-emerald-500', hex: '#10b981' },
    ],
  },
  {
    id: 'deep-navy',
    name: 'Deep Navy',
    description: 'Executive and premium with gold accents - high-end enterprise',
    pageBg: 'bg-[#0a0e1a]',
    sidebarBg: 'bg-[#0f1629]',
    sidebarBorder: 'border-[#1e2a4a]/50',
    surfaceBg: 'bg-[#1a2744]',
    divider: 'bg-[#1e2a4a]',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
    accent: 'bg-yellow-500',
    accentHover: 'hover:bg-yellow-500/20',
    accentBg: 'bg-yellow-500/20',
    accentText: 'text-yellow-400',
    logoBg: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
    logoShadow: 'shadow-yellow-500/20',
    avatarBg: 'bg-gradient-to-br from-[#1a2744] to-[#0f1629]',
    swatches: [
      { name: 'Background', color: 'bg-[#0f1629]', hex: '#0f1629' },
      { name: 'Surface', color: 'bg-[#1a2744]', hex: '#1a2744' },
      { name: 'Border', color: 'bg-[#1e2a4a]', hex: '#1e2a4a' },
      { name: 'Text', color: 'bg-slate-400', hex: '#94a3b8' },
      { name: 'Accent', color: 'bg-yellow-500', hex: '#eab308' },
    ],
  },
  {
    id: 'charcoal-orange',
    name: 'Charcoal & Orange',
    description: 'High contrast with safety orange - construction industry standard',
    pageBg: 'bg-zinc-950',
    sidebarBg: 'bg-zinc-900',
    sidebarBorder: 'border-zinc-800/50',
    surfaceBg: 'bg-zinc-800',
    divider: 'bg-zinc-800',
    textPrimary: 'text-white',
    textSecondary: 'text-zinc-400',
    textMuted: 'text-zinc-500',
    accent: 'bg-orange-500',
    accentHover: 'hover:bg-orange-500/20',
    accentBg: 'bg-orange-500/20',
    accentText: 'text-orange-400',
    logoBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    logoShadow: 'shadow-orange-500/20',
    avatarBg: 'bg-gradient-to-br from-zinc-700 to-zinc-800',
    swatches: [
      { name: 'Background', color: 'bg-zinc-900', hex: '#18181b' },
      { name: 'Surface', color: 'bg-zinc-800', hex: '#27272a' },
      { name: 'Border', color: 'bg-zinc-700', hex: '#3f3f46' },
      { name: 'Text', color: 'bg-zinc-400', hex: '#a1a1aa' },
      { name: 'Accent', color: 'bg-orange-500', hex: '#f97316' },
    ],
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    description: 'Modern and distinctive with violet accents - creative professional',
    pageBg: 'bg-gray-950',
    sidebarBg: 'bg-gray-900',
    sidebarBorder: 'border-gray-800/50',
    surfaceBg: 'bg-gray-800',
    divider: 'bg-gray-800',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-400',
    textMuted: 'text-gray-500',
    accent: 'bg-violet-500',
    accentHover: 'hover:bg-violet-500/20',
    accentBg: 'bg-violet-500/20',
    accentText: 'text-violet-400',
    logoBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
    logoShadow: 'shadow-violet-500/20',
    avatarBg: 'bg-gradient-to-br from-gray-700 to-gray-800',
    swatches: [
      { name: 'Background', color: 'bg-gray-900', hex: '#111827' },
      { name: 'Surface', color: 'bg-gray-800', hex: '#1f2937' },
      { name: 'Border', color: 'bg-gray-700', hex: '#374151' },
      { name: 'Text', color: 'bg-gray-400', hex: '#9ca3af' },
      { name: 'Accent', color: 'bg-violet-500', hex: '#8b5cf6' },
    ],
  },
]

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get palette by ID
 */
export function getPaletteById(id: string): ColorPalette | undefined {
  return COLOR_PALETTES.find((p) => p.id === id)
}

/**
 * Get default palette (Cool Slate)
 */
export function getDefaultPalette(): ColorPalette {
  return COLOR_PALETTES.find((p) => p.id === 'cool-slate') || COLOR_PALETTES[0]
}

/**
 * Get all palette IDs
 */
export function getPaletteIds(): string[] {
  return COLOR_PALETTES.map((p) => p.id)
}
