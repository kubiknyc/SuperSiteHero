// File: /src/components/layout/CollapsibleSidebar.tsx
// Collapsible sidebar with rail mode (68px collapsed, 264px expanded)
// Supports hover expand, pin toggle, and smooth transitions
// Enhanced with Industrial Precision design system
//
// DESIGN NOTE: Color Palette Split
// --------------------------------
// The sidebar intentionally uses `slate-*` colors (slate-900, slate-950, slate-400, etc.)
// while the main content area uses `gray-*` colors. This creates visual hierarchy:
// - Sidebar: Darker, cooler slate tones for navigation chrome
// - Content: Neutral gray tones for data and content focus
// This is a deliberate design choice, not inconsistency.

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { LogoIconLight } from '@/components/brand'
import { NavigationGroup } from './NavigationGroup'
import {
  getPrimaryNavItems,
  getNavGroups,
  subscribeToLayoutChanges,
  type NavItem,
  type NavGroup,
} from './sidebar/navigation-config'
import {
  Ruler,
  Pin,
  PinOff,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// Sidebar context for sharing state
interface SidebarContextType {
  isExpanded: boolean
  isPinned: boolean
  isHovered: boolean
}

const SidebarContext = createContext<SidebarContextType>({
  isExpanded: false,
  isPinned: false,
  isHovered: false,
})

export const useSidebarState = () => useContext(SidebarContext)

// Sidebar width constants
const SIDEBAR_WIDTHS = {
  collapsed: 72,
  expanded: 280,
} as const

// Destructure for backwards compatibility with existing exports
const SIDEBAR_COLLAPSED_WIDTH = SIDEBAR_WIDTHS.collapsed
const SIDEBAR_EXPANDED_WIDTH = SIDEBAR_WIDTHS.expanded

interface CollapsibleSidebarProps {
  className?: string
}

export function CollapsibleSidebar({ className }: CollapsibleSidebarProps) {
  const { signOut, userProfile } = useAuth()
  const location = useLocation()

  // Sidebar state
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebar-pinned')
    return saved === 'true'
  })
  const [isHovered, setIsHovered] = useState(false)

  // Dynamic navigation layout state
  const [primaryNavItems, setPrimaryNavItems] = useState<NavItem[]>(getPrimaryNavItems)
  const [navigationGroups, setNavigationGroups] = useState<NavGroup[]>(getNavGroups)

  // Subscribe to layout changes from settings
  useEffect(() => {
    const unsubscribe = subscribeToLayoutChanges(() => {
      setPrimaryNavItems(getPrimaryNavItems())
      setNavigationGroups(getNavGroups())
    })
    return unsubscribe
  }, [])

  // Computed expanded state
  const isExpanded = isPinned || isHovered

  // Extract project ID from current route
  const projectIdMatch = location.pathname.match(/\/projects\/([^/]+)/)
  const currentProjectId = projectIdMatch ? projectIdMatch[1] : null

  // Get user role
  const userRole = userProfile?.role || 'user'

  // Persist pin state
  useEffect(() => {
    localStorage.setItem('sidebar-pinned', String(isPinned))
  }, [isPinned])

  // Toggle pin
  const togglePin = useCallback(() => {
    setIsPinned((prev) => !prev)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // [ key - toggle sidebar pin
      if (e.key === '[') {
        e.preventDefault()
        togglePin()
      }

      // ] key - expand sidebar temporarily (hold)
      if (e.key === ']') {
        e.preventDefault()
        setIsHovered(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Release ] to collapse sidebar
      if (e.key === ']' && !isPinned) {
        setIsHovered(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [isPinned, togglePin])

  // Mouse handlers with debounce for smoother interaction
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
  }, [])

  return (
    <SidebarContext.Provider value={{ isExpanded, isPinned, isHovered }}>
      <TooltipProvider delayDuration={0}>
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            width: isExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
          }}
          className={cn(
            // Base styles
            'fixed inset-y-0 left-0 z-50 flex flex-col',
            // Premium dark gradient background with depth
            'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950',
            // Layered shadow for depth
            'shadow-[4px_0_24px_-4px_rgba(0,0,0,0.3),1px_0_0_rgba(255,255,255,0.03)]',
            // Smooth spring-like transition
            'transition-[width,box-shadow] duration-300',
            // Custom easing for premium feel
            '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
            // Enhanced shadow on hover/expanded
            isExpanded && 'shadow-[8px_0_32px_-4px_rgba(0,0,0,0.4),1px_0_0_rgba(255,255,255,0.05)]',
            // Hide on mobile
            'hidden md:flex',
            className
          )}
        >
          {/* Subtle noise texture overlay - uses .texture-noise CSS utility */}
          <div className="texture-noise absolute inset-0 pointer-events-none" />

          {/* Top highlight line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          {/* Header with logo */}
          <div className="relative border-b border-white/[0.06] p-5">
            <div className="flex items-center gap-3.5">
              {/* Logo container with glow effect */}
              <div
                className={cn(
                  'relative rounded-xl p-2.5 flex-shrink-0',
                  'bg-gradient-to-br from-primary/20 to-primary/5',
                  'ring-1 ring-white/10',
                  'transition-all duration-300',
                  'group-hover:ring-primary/30',
                  isExpanded && 'shadow-[0_0_20px_rgba(30,64,175,0.15)]'
                )}
              >
                <LogoIconLight className="h-6 w-6" />
                {/* Subtle inner highlight */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              </div>

              {/* Logo text - only visible when expanded */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300',
                  '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
                  isExpanded ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-2'
                )}
              >
                <h1 className="font-display font-bold text-lg text-white whitespace-nowrap tracking-tight">
                  JobSight
                </h1>
                <p className="text-[11px] text-slate-400 whitespace-nowrap font-medium tracking-wide uppercase">
                  Field Management
                </p>
              </div>
            </div>

            {/* Pin toggle button - only visible when expanded */}
            <div
              className={cn(
                'absolute top-5 right-4 transition-all duration-200',
                isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={togglePin}
                    className={cn(
                      'p-2 rounded-lg transition-all duration-200',
                      'hover:bg-white/10 active:scale-95',
                      isPinned
                        ? 'text-primary bg-primary/10 ring-1 ring-primary/20'
                        : 'text-slate-500 hover:text-slate-300'
                    )}
                  >
                    {isPinned ? (
                      <Pin className="h-4 w-4" />
                    ) : (
                      <PinOff className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="bg-slate-800 border-slate-700">
                  <p className="flex items-center gap-2">
                    {isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-700 rounded border border-slate-600">{'['}</kbd>
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {/* Primary Navigation Items */}
            <div className="space-y-1">
              {primaryNavItems.map((item, index) => {
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + '/')
                const Icon = item.icon

                const navLink = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'relative flex items-center gap-3 rounded-xl font-medium',
                      'transition-all duration-200',
                      '[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]',
                      // Sizing based on expanded state
                      isExpanded ? 'px-3.5 py-3' : 'px-3 py-3 justify-center',
                      // Active state with premium styling
                      isActive
                        ? [
                            'bg-gradient-to-r from-primary/25 via-primary/15 to-primary/5',
                            'text-white',
                            'shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.2)]',
                            'ring-1 ring-primary/30',
                          ]
                        : [
                            'text-slate-400',
                            'hover:text-white hover:bg-white/[0.08]',
                            'active:scale-[0.98]',
                          ]
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_8px_rgba(30,64,175,0.5)]" />
                    )}

                    <Icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0 transition-all duration-200',
                        isActive
                          ? 'text-primary drop-shadow-[0_0_6px_rgba(30,64,175,0.4)]'
                          : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    />
                    {isExpanded && (
                      <>
                        <span className="flex-1 text-sm whitespace-nowrap font-medium">
                          {item.label}
                        </span>
                        {/* Handle badge as number or component */}
                        {typeof item.badge === 'number' && item.badge > 0 && (
                          <span className="px-1.5 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full min-w-[20px] text-center">
                            {item.badge}
                          </span>
                        )}
                        {typeof item.badge === 'function' && <item.badge />}
                      </>
                    )}
                    {/* Badge dot when collapsed */}
                    {!isExpanded && item.badge && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-slate-900 animate-pulse" />
                    )}
                  </Link>
                )

                // Wrap in tooltip when collapsed
                if (!isExpanded) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        <div className="relative">{navLink}</div>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return navLink
              })}
            </div>

            {/* Divider with industrial styling */}
            <div className="my-4 mx-1 relative">
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              {isExpanded && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <div className="px-3 py-0.5 bg-slate-900">
                    <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-600">
                      Modules
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Grouped Navigation - only show when expanded */}
            {isExpanded ? (
              <div className="space-y-1">
                {navigationGroups.map((group) => (
                  <NavigationGroup
                    key={group.id}
                    id={group.id}
                    label={group.label}
                    icon={group.icon}
                    items={group.items}
                    defaultExpanded={group.defaultExpanded}
                  />
                ))}
              </div>
            ) : (
              // Collapsed view - show group icons only
              <div className="space-y-1">
                {navigationGroups.map((group) => {
                  const Icon = group.icon
                  const firstItem = group.items[0]

                  return (
                    <Tooltip key={group.id}>
                      <TooltipTrigger asChild>
                        <Link
                          to={firstItem?.path || '/'}
                          className={cn(
                            'flex items-center justify-center p-2.5 rounded-lg',
                            'text-gray-400 hover:text-white hover:bg-white/[0.07]',
                            'transition-all duration-200'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>
                        <p>{group.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            )}

            {/* Conditional Takeoffs navigation */}
            {currentProjectId &&
              userRole !== 'client' &&
              userRole !== 'subcontractor' && (
                <>
                  <div className="my-3 mx-2 relative">
                    <div className="h-px bg-gray-700/40" />
                  </div>
                  {isExpanded ? (
                    <Link
                      to={`/projects/${currentProjectId}/takeoffs`}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200',
                        location.pathname.includes('/takeoffs')
                          ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-white border-l-[3px] border-primary'
                          : 'text-gray-400 hover:text-white hover:bg-white/[0.07] border-l-[3px] border-transparent'
                      )}
                    >
                      <Ruler
                        className={cn(
                          'h-5 w-5 transition-colors',
                          location.pathname.includes('/takeoffs')
                            ? 'text-primary'
                            : 'text-gray-500'
                        )}
                      />
                      <span className="flex-1 text-sm">Takeoffs</span>
                    </Link>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to={`/projects/${currentProjectId}/takeoffs`}
                          className={cn(
                            'flex items-center justify-center p-2.5 rounded-lg',
                            'text-gray-400 hover:text-white hover:bg-white/[0.07]',
                            'transition-all duration-200'
                          )}
                        >
                          <Ruler className="h-5 w-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={10}>
                        <p>Takeoffs</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
          </nav>

        </aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

// Export width constants for layout calculations
export { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH }
