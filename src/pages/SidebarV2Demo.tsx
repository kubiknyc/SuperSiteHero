// File: /src/pages/SidebarV2Demo.tsx
// Standalone demo page for sidebar color palette exploration
// Renders the V2 sidebar with switchable color themes

import { useState, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  ClipboardList,
  CheckSquare,
  Settings,
  LogOut,
  Pin,
  PinOff,
  ChevronDown,
  Users,
  Shield,
  Truck,
  Calendar,
  HelpCircle,
  Bell,
  ArrowLeft,
  Check,
  Palette,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================================================
// COLOR PALETTES
// ============================================================================

interface ColorPalette {
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
  swatches: Array<{ name: string; color: string; hex: string }>
}

const colorPalettes: ColorPalette[] = [
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

// Constants
const SIDEBAR_COLLAPSED_WIDTH = 72
const SIDEBAR_EXPANDED_WIDTH = 280

// Mock navigation items
const mockNavItems = [
  { path: '/demo/sidebar-v2', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/demo/sidebar-v2/projects', label: 'Projects', icon: FolderKanban },
  { path: '/demo/sidebar-v2/reports', label: 'Daily Reports', icon: ClipboardList, badge: 3 },
]

const mockModuleGroups = [
  {
    id: 'workflows',
    label: 'Workflows',
    items: [
      { path: '/demo/sidebar-v2/rfis', label: 'RFIs', icon: FileText, badge: 5 },
      { path: '/demo/sidebar-v2/submittals', label: 'Submittals', icon: FileText },
      { path: '/demo/sidebar-v2/change-orders', label: 'Change Orders', icon: FileText },
    ],
  },
  {
    id: 'field',
    label: 'Field Operations',
    items: [
      { path: '/demo/sidebar-v2/punch-lists', label: 'Punch Lists', icon: CheckSquare },
      { path: '/demo/sidebar-v2/inspections', label: 'Inspections', icon: ClipboardList },
      { path: '/demo/sidebar-v2/safety', label: 'Safety', icon: Shield },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    items: [
      { path: '/demo/sidebar-v2/contacts', label: 'Team Members', icon: Users },
      { path: '/demo/sidebar-v2/schedule', label: 'Schedule', icon: Calendar },
      { path: '/demo/sidebar-v2/equipment', label: 'Equipment', icon: Truck },
    ],
  },
]

// Mock user profile
const mockUser = {
  full_name: 'Sarah Mitchell',
  email: 'sarah.mitchell@jobsight.io',
  role: 'superintendent',
}

export function SidebarV2Demo() {
  const location = useLocation()
  const [isPinned, setIsPinned] = useState(true) // Start pinned so palette is visible
  const [isHovered, setIsHovered] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['workflows', 'field'])
  )
  const [selectedPalette, setSelectedPalette] = useState<string>('warm-stone')

  const palette = colorPalettes.find((p) => p.id === selectedPalette) || colorPalettes[0]
  const isExpanded = isPinned || isHovered

  const userInitials = mockUser.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const togglePin = useCallback(() => {
    setIsPinned((prev) => !prev)
  }, [])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className={cn('min-h-screen', palette.pageBg)}>
      <TooltipProvider delayDuration={0}>
        {/* === THE SIDEBAR === */}
        <aside
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
          }}
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col',
            palette.sidebarBg,
            'shadow-xl shadow-black/20',
            'border-r',
            palette.sidebarBorder,
            'transition-[width] duration-300 ease-out',
            'overflow-hidden'
          )}
        >
          {/* HEADER */}
          <div className={cn('relative flex items-center h-16 px-4 border-b', palette.sidebarBorder)}>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg',
                  palette.logoBg,
                  'flex items-center justify-center',
                  'shadow-lg',
                  palette.logoShadow
                )}
              >
                <span className="text-white font-bold text-lg">JS</span>
              </div>

              <div
                className={cn(
                  'overflow-hidden transition-all duration-300',
                  isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
                )}
              >
                <h1 className={cn('font-semibold text-lg whitespace-nowrap', palette.textPrimary)}>
                  JobSight
                </h1>
                <p className={cn('text-xs whitespace-nowrap', palette.textSecondary)}>
                  Field Management
                </p>
              </div>
            </div>

            <div
              className={cn(
                'absolute right-3 transition-all duration-200',
                isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={togglePin}
                    className={cn(
                      'p-2 rounded-lg transition-colors duration-200',
                      isPinned
                        ? cn(palette.accentText, palette.accentBg, palette.accentHover)
                        : cn(palette.textMuted, 'hover:text-white', `hover:${palette.surfaceBg}`)
                    )}
                  >
                    {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <p>{isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
            <div className="space-y-1">
              {mockNavItems.map((item) => {
                const isActive =
                  isPathActive(item.path) ||
                  (item.path === '/demo/sidebar-v2' && location.pathname === '/demo/sidebar-v2')
                const Icon = item.icon

                const navLink = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg font-medium',
                      'transition-all duration-200',
                      isExpanded ? 'px-3 py-2.5' : 'px-3 py-2.5 justify-center',
                      isActive
                        ? cn(palette.surfaceBg, palette.textPrimary)
                        : cn(palette.textSecondary, 'hover:text-white', `hover:${palette.surfaceBg}/50`)
                    )}
                  >
                    {isActive && (
                      <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full', palette.accent)} />
                    )}

                    <Icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        isActive ? palette.accentText : palette.textMuted
                      )}
                    />

                    {isExpanded && (
                      <>
                        <span className="flex-1 text-sm whitespace-nowrap">{item.label}</span>
                        {item.badge && (
                          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', palette.accentBg, palette.accentText)}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}

                    {!isExpanded && item.badge && (
                      <span className={cn('absolute top-1.5 right-1.5 w-2 h-2 rounded-full', palette.accent)} />
                    )}
                  </Link>
                )

                if (!isExpanded) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12}>
                        <p className="flex items-center gap-2">
                          {item.label}
                          {item.badge && (
                            <span className={cn('px-1.5 py-0.5 text-xs rounded', palette.accentBg, palette.accentText)}>
                              {item.badge}
                            </span>
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return navLink
              })}
            </div>

            <div className="my-4 mx-2">
              <div className={cn('h-px', palette.divider)} />
            </div>

            {mockModuleGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                {isExpanded ? (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2',
                      'text-xs font-semibold uppercase tracking-wider',
                      palette.textMuted,
                      'hover:' + palette.textSecondary.replace('text-', ''),
                      'transition-colors duration-200'
                    )}
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        expandedGroups.has(group.id) ? 'rotate-0' : '-rotate-90'
                      )}
                    />
                  </button>
                ) : (
                  <div className="h-2" />
                )}

                <div
                  className={cn(
                    'space-y-0.5 overflow-hidden transition-all duration-200',
                    isExpanded && !expandedGroups.has(group.id) && 'h-0 opacity-0'
                  )}
                >
                  {group.items.map((item) => {
                    const isActive = isPathActive(item.path)
                    const Icon = item.icon

                    const navLink = (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'relative flex items-center gap-3 rounded-lg font-medium',
                          'transition-all duration-200',
                          isExpanded ? 'px-3 py-2 ml-2' : 'px-3 py-2 justify-center',
                          isActive
                            ? cn(palette.surfaceBg, palette.textPrimary)
                            : cn(palette.textSecondary, 'hover:text-white', `hover:${palette.surfaceBg}/50`)
                        )}
                      >
                        {isActive && (
                          <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full', palette.accent)} />
                        )}

                        <Icon
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            isActive ? palette.accentText : palette.textMuted
                          )}
                        />

                        {isExpanded && (
                          <>
                            <span className="flex-1 text-sm whitespace-nowrap">{item.label}</span>
                            {item.badge && (
                              <span className={cn('px-1.5 py-0.5 text-xs font-medium rounded-full', palette.accentBg, palette.accentText)}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}

                        {!isExpanded && item.badge && (
                          <span className={cn('absolute top-1 right-1 w-1.5 h-1.5 rounded-full', palette.accent)} />
                        )}
                      </Link>
                    )

                    if (!isExpanded) {
                      return (
                        <Tooltip key={item.path}>
                          <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                          <TooltipContent side="right" sideOffset={12}>
                            <p className="flex items-center gap-2">
                              {item.label}
                              {item.badge && (
                                <span className={cn('px-1.5 py-0.5 text-xs rounded', palette.accentBg, palette.accentText)}>
                                  {item.badge}
                                </span>
                              )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    }

                    return navLink
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* FOOTER */}
          <div className={cn('border-t', palette.sidebarBorder)}>
            <div className={cn('flex items-center px-3 py-2 gap-1', isExpanded ? 'justify-start' : 'justify-center')}>
              {[Bell, HelpCircle, Settings].map((Icon, i) => {
                const btn = (
                  <button
                    key={i}
                    className={cn(
                      'p-2 rounded-lg transition-colors duration-200',
                      palette.textMuted,
                      'hover:text-white',
                      `hover:${palette.surfaceBg}`
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                )

                if (!isExpanded) {
                  return (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12}>
                        <p>{['Notifications', 'Help', 'Settings'][i]}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return btn
              })}
            </div>

            <div className={cn('px-3 py-3 border-t', palette.sidebarBorder.replace('/50', '/30'), 'flex items-center gap-3')}>
              <div
                className={cn(
                  'flex-shrink-0 w-9 h-9 rounded-lg',
                  palette.avatarBg,
                  'flex items-center justify-center',
                  'text-sm font-semibold',
                  palette.textSecondary
                )}
              >
                {userInitials}
              </div>

              {isExpanded && (
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium truncate', palette.textPrimary)}>
                    {mockUser.full_name}
                  </p>
                  <p className={cn('text-xs truncate capitalize', palette.textMuted)}>
                    {mockUser.role}
                  </p>
                </div>
              )}

              {isExpanded && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        'p-2 rounded-lg transition-colors duration-200',
                        palette.textMuted,
                        'hover:text-red-400 hover:bg-red-500/10'
                      )}
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    <p>Sign out</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </aside>
      </TooltipProvider>

      {/* === MAIN CONTENT === */}
      <div
        className="transition-[margin-left] duration-300"
        style={{ marginLeft: isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
      >
        <div className="min-h-screen p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Palette className={cn('h-8 w-8', palette.accentText)} />
              <h1 className={cn('text-3xl font-semibold tracking-tight', palette.textPrimary)}>
                Color Palette Explorer
              </h1>
            </div>
            <p className={cn('text-sm max-w-2xl leading-relaxed', palette.textSecondary)}>
              Choose a color palette for your sidebar. Click on any option below to preview it live.
              The sidebar on the left will update instantly.
            </p>
          </div>

          {/* Palette Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {colorPalettes.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPalette(p.id)}
                className={cn(
                  'relative p-5 rounded-xl text-left transition-all duration-200',
                  'border-2',
                  selectedPalette === p.id
                    ? cn('border-white/30', p.sidebarBg)
                    : cn('border-transparent hover:border-white/10', p.sidebarBg, 'opacity-80 hover:opacity-100')
                )}
              >
                {/* Selected indicator */}
                {selectedPalette === p.id && (
                  <div className={cn(
                    'absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center',
                    p.accent
                  )}>
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}

                {/* Palette preview dots */}
                <div className="flex gap-1.5 mb-3">
                  {p.swatches.slice(0, 5).map((swatch, i) => (
                    <div
                      key={i}
                      className={cn('w-5 h-5 rounded-full border border-white/10', swatch.color)}
                    />
                  ))}
                </div>

                <h3 className="font-semibold text-white mb-1">{p.name}</h3>
                <p className="text-xs text-white/60 leading-relaxed">{p.description}</p>
              </button>
            ))}
          </div>

          {/* Current Palette Details */}
          <div className={cn('p-6 rounded-xl border mb-8', palette.sidebarBg, palette.sidebarBorder)}>
            <h2 className={cn('font-semibold text-lg mb-4', palette.textPrimary)}>
              {palette.name} - Color Swatches
            </h2>
            <div className="flex flex-wrap gap-4">
              {palette.swatches.map((swatch) => (
                <div key={swatch.name} className="text-center">
                  <div
                    className={cn(
                      'w-16 h-16 rounded-lg mb-2 border border-white/10',
                      swatch.color
                    )}
                  />
                  <p className={cn('text-xs', palette.textSecondary)}>{swatch.name}</p>
                  <p className={cn('text-[10px] font-mono', palette.textMuted)}>{swatch.hex}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Back Link */}
          <Link
            to="/"
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg',
              palette.surfaceBg,
              palette.textSecondary,
              'text-sm font-medium',
              'hover:text-white transition-colors'
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SidebarV2Demo
