// File: /src/components/layout/CollapsibleSidebarV2.tsx
// "Cool Slate" Sidebar Design
// Modern and professional with blue accents - tech-forward feel
//
// DESIGN PHILOSOPHY:
// - Cool slate/gray palette with blue accent highlights
// - Clean, modern typography with clear hierarchy
// - Professional tech-forward aesthetic
// - Built for field superintendents who need clarity and speed

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  FileText,
  AlertTriangle,
  Users,
  Settings,
  ChevronDown,
  Pin,
  PinOff,
  Ruler,
  LogOut,
  HelpCircle,
  Bell,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ============================================================================
// CONTEXT & TYPES
// ============================================================================

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

export const useSidebarStateV2 = () => useContext(SidebarContext)

// Constants
export const SIDEBAR_COLLAPSED_WIDTH_V2 = 72
export const SIDEBAR_EXPANDED_WIDTH_V2 = 280

// ============================================================================
// NAVIGATION CONFIGURATION
// ============================================================================

interface NavItem {
  path: string
  label: string
  icon: typeof LayoutDashboard
  badge?: number
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const primaryNavItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/projects', label: 'Projects', icon: FolderKanban },
  { path: '/daily-reports', label: 'Daily Reports', icon: ClipboardList, badge: 3 },
]

const navGroups: NavGroup[] = [
  {
    id: 'workflows',
    label: 'Workflows',
    items: [
      { path: '/rfis', label: 'RFIs', icon: FileText, badge: 5 },
      { path: '/submittals', label: 'Submittals', icon: FileText },
      { path: '/change-orders', label: 'Change Orders', icon: FileText },
    ],
  },
  {
    id: 'field',
    label: 'Field Operations',
    items: [
      { path: '/punch-lists', label: 'Punch Lists', icon: ClipboardList },
      { path: '/safety', label: 'Safety', icon: AlertTriangle },
      { path: '/inspections', label: 'Inspections', icon: ClipboardList },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    items: [
      { path: '/team', label: 'Team Members', icon: Users },
      { path: '/subcontractors', label: 'Subcontractors', icon: Users },
    ],
  },
]

// ============================================================================
// PROPS
// ============================================================================

interface CollapsibleSidebarV2Props {
  className?: string
  userProfile?: {
    full_name?: string
    first_name?: string
    last_name?: string
    email?: string
    avatar_url?: string
    role?: string
  }
  onSignOut?: () => void
  currentProjectId?: string | null
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CollapsibleSidebarV2({
  className,
  userProfile,
  onSignOut,
  currentProjectId,
}: CollapsibleSidebarV2Props) {
  const location = useLocation()

  // Sidebar state
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebar-v2-pinned')
    return saved === 'true'
  })
  const [isHovered, setIsHovered] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('sidebar-v2-expanded-groups')
    return saved ? new Set(JSON.parse(saved)) : new Set(['workflows', 'field'])
  })

  // Computed expanded state
  const isExpanded = isPinned || isHovered

  // Get user role
  const userRole = userProfile?.role || 'user'
  const userName = userProfile?.full_name ||
    (userProfile?.first_name && userProfile?.last_name
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : 'User')
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Persist states
  useEffect(() => {
    localStorage.setItem('sidebar-v2-pinned', String(isPinned))
  }, [isPinned])

  useEffect(() => {
    localStorage.setItem('sidebar-v2-expanded-groups', JSON.stringify([...expandedGroups]))
  }, [expandedGroups])

  // Toggle pin
  const togglePin = useCallback(() => {
    setIsPinned((prev) => !prev)
  }, [])

  // Toggle group expansion
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      if (e.key === '[') {
        e.preventDefault()
        togglePin()
      }

      if (e.key === ']') {
        e.preventDefault()
        setIsHovered(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
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

  // Mouse handlers
  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])

  // Check if path is active
  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <SidebarContext.Provider value={{ isExpanded, isPinned, isHovered }}>
      <TooltipProvider delayDuration={0}>
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            width: isExpanded ? SIDEBAR_EXPANDED_WIDTH_V2 : SIDEBAR_COLLAPSED_WIDTH_V2,
          }}
          className={cn(
            // Base layout
            'fixed inset-y-0 left-0 z-50 flex flex-col',
            // Cool slate background
            'bg-slate-900',
            // Subtle shadow for depth
            'shadow-xl shadow-black/20',
            // Right border for definition
            'border-r border-slate-800/50',
            // Smooth transition
            'transition-[width] duration-300 ease-out',
            // Hide on mobile
            'hidden md:flex',
            className
          )}
        >
          {/* ============================================================== */}
          {/* HEADER */}
          {/* ============================================================== */}
          <div className="relative flex items-center h-16 px-4 border-b border-slate-800/50">
            {/* Logo */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg',
                  'bg-gradient-to-br from-blue-500 to-blue-600',
                  'flex items-center justify-center',
                  'shadow-lg shadow-blue-500/20'
                )}
              >
                <span className="text-white font-bold text-lg">JS</span>
              </div>

              {/* Brand text - visible when expanded */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300',
                  isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
                )}
              >
                <h1 className="font-semibold text-white text-lg whitespace-nowrap">
                  JobSight
                </h1>
                <p className="text-xs text-slate-400 whitespace-nowrap">
                  Field Management
                </p>
              </div>
            </div>

            {/* Pin button - visible when expanded */}
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
                        ? 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <p className="flex items-center gap-2">
                    {isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-700 rounded">
                      [
                    </kbd>
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ============================================================== */}
          {/* NAVIGATION */}
          {/* ============================================================== */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
            {/* Primary Navigation */}
            <div className="space-y-1">
              {primaryNavItems.map((item) => {
                const isActive = isPathActive(item.path)
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
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full" />
                    )}

                    <Icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0',
                        isActive ? 'text-blue-400' : 'text-slate-500'
                      )}
                    />

                    {isExpanded && (
                      <>
                        <span className="flex-1 text-sm whitespace-nowrap">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}

                    {/* Badge dot when collapsed */}
                    {!isExpanded && item.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
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
                            <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
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

            {/* Divider */}
            <div className="my-4 mx-2">
              <div className="h-px bg-slate-800" />
            </div>

            {/* Grouped Navigation */}
            {navGroups.map((group) => (
              <div key={group.id} className="space-y-1">
                {/* Group header - only show when expanded */}
                {isExpanded ? (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2',
                      'text-xs font-semibold uppercase tracking-wider',
                      'text-slate-500 hover:text-slate-400',
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
                  <div className="h-2" /> // Spacer when collapsed
                )}

                {/* Group items */}
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
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r-full" />
                        )}

                        <Icon
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            isActive ? 'text-blue-400' : 'text-slate-500'
                          )}
                        />

                        {isExpanded && (
                          <>
                            <span className="flex-1 text-sm whitespace-nowrap">{item.label}</span>
                            {item.badge && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}

                        {!isExpanded && item.badge && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
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
                                <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
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

            {/* Takeoffs link - contextual */}
            {currentProjectId && userRole !== 'client' && userRole !== 'subcontractor' && (
              <>
                <div className="my-4 mx-2">
                  <div className="h-px bg-slate-800" />
                </div>

                {(() => {
                  const takeoffsPath = `/projects/${currentProjectId}/takeoffs`
                  const isActive = location.pathname.includes('/takeoffs')

                  const navLink = (
                    <Link
                      to={takeoffsPath}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg font-medium',
                        'transition-all duration-200',
                        isExpanded ? 'px-3 py-2.5' : 'px-3 py-2.5 justify-center',
                        isActive
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full" />
                      )}
                      <Ruler
                        className={cn(
                          'h-5 w-5 flex-shrink-0',
                          isActive ? 'text-blue-400' : 'text-slate-500'
                        )}
                      />
                      {isExpanded && (
                        <span className="flex-1 text-sm whitespace-nowrap">Takeoffs</span>
                      )}
                    </Link>
                  )

                  if (!isExpanded) {
                    return (
                      <Tooltip>
                        <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12}>
                          <p>Takeoffs</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  }

                  return navLink
                })()}
              </>
            )}
          </nav>

          {/* ============================================================== */}
          {/* FOOTER - USER & ACTIONS */}
          {/* ============================================================== */}
          <div className="border-t border-slate-800/50">
            {/* Quick actions */}
            <div className={cn(
              'flex items-center px-3 py-2 gap-1',
              isExpanded ? 'justify-start' : 'justify-center'
            )}>
              {/* Notifications */}
              {(() => {
                const btn = (
                  <button
                    className={cn(
                      'p-2 rounded-lg transition-colors duration-200',
                      'text-slate-500 hover:text-white hover:bg-slate-800'
                    )}
                  >
                    <Bell className="h-5 w-5" />
                  </button>
                )

                if (!isExpanded) {
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12}>
                        <p>Notifications</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return btn
              })()}

              {/* Help */}
              {(() => {
                const btn = (
                  <button
                    className={cn(
                      'p-2 rounded-lg transition-colors duration-200',
                      'text-slate-500 hover:text-white hover:bg-slate-800'
                    )}
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                )

                if (!isExpanded) {
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>{btn}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12}>
                        <p>Help & Support</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return btn
              })()}

              {/* Settings */}
              {(() => {
                const link = (
                  <Link
                    to="/settings"
                    className={cn(
                      'p-2 rounded-lg transition-colors duration-200',
                      'text-slate-500 hover:text-white hover:bg-slate-800'
                    )}
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                )

                if (!isExpanded) {
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12}>
                        <p>Settings</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return link
              })()}
            </div>

            {/* User profile */}
            <div className={cn(
              'px-3 py-3 border-t border-slate-800/30',
              'flex items-center gap-3'
            )}>
              {/* Avatar */}
              <div
                className={cn(
                  'flex-shrink-0 w-9 h-9 rounded-lg',
                  'bg-gradient-to-br from-slate-700 to-slate-800',
                  'flex items-center justify-center',
                  'text-sm font-semibold text-slate-300'
                )}
              >
                {userInitials}
              </div>

              {/* User info - visible when expanded */}
              {isExpanded && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{userName}</p>
                  <p className="text-xs text-slate-500 truncate capitalize">{userRole}</p>
                </div>
              )}

              {/* Sign out button */}
              {isExpanded && onSignOut && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onSignOut}
                      className={cn(
                        'p-2 rounded-lg transition-colors duration-200',
                        'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
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
    </SidebarContext.Provider>
  )
}
