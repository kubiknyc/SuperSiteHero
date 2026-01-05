// File: /src/components/layout/CollapsibleSidebar.tsx
// Collapsible sidebar with rail mode (68px collapsed, 264px expanded)
// Supports hover expand, pin toggle, and smooth transitions

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { LogoIconLight } from '@/components/brand'
import { NavigationGroup } from './NavigationGroup'
import { SyncStatusBar } from '@/components/sync/SyncStatusBar'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { ThemeToggle } from '@/components/ThemeToggle'
import { primaryNavItems, navigationGroups } from '@/config/navigation'
import {
  Settings,
  LogOut,
  Ruler,
  Pin,
  PinOff,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

// Constants
const SIDEBAR_COLLAPSED_WIDTH = 68
const SIDEBAR_EXPANDED_WIDTH = 264

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
            // Premium dark gradient background
            'bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950',
            // Border and shadow
            'border-r border-gray-800/50',
            // Smooth transition
            'transition-[width] duration-300 ease-out',
            // Hide on mobile
            'hidden md:flex',
            className
          )}
        >
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-concrete-texture" />

          {/* Header with logo */}
          <div className="relative border-b border-gray-800 p-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'rounded-lg transition-all duration-200 p-2 flex-shrink-0',
                  'hover:shadow-[0_0_12px_rgba(96,165,250,0.3)]'
                )}
              >
                <LogoIconLight className="h-6 w-6" />
              </div>

              {/* Logo text - only visible when expanded */}
              <div
                className={cn(
                  'overflow-hidden transition-all duration-300',
                  isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
                )}
              >
                <h1 className="font-bold text-lg text-white whitespace-nowrap">
                  JobSight
                </h1>
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  Field Management
                </p>
              </div>
            </div>

            {/* Pin toggle button - only visible when expanded */}
            {isExpanded && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={togglePin}
                    className={cn(
                      'absolute top-4 right-3 p-1.5 rounded-md transition-all duration-200',
                      'hover:bg-white/10',
                      isPinned ? 'text-primary' : 'text-gray-500'
                    )}
                  >
                    {isPinned ? (
                      <Pin className="h-4 w-4" />
                    ) : (
                      <PinOff className="h-4 w-4" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5}>
                  <p>{isPinned ? 'Unpin sidebar' : 'Pin sidebar'} <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-gray-700 rounded">{'['}</kbd></p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-1">
            {/* Primary Navigation Items */}
            <div className="space-y-1">
              {primaryNavItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + '/')
                const Icon = item.icon
                const Badge = item.badge

                const navLink = (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 rounded-lg font-medium transition-all duration-200',
                      // Sizing based on expanded state
                      isExpanded ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center',
                      // Active/hover states
                      isActive
                        ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-white border-l-[3px] border-primary shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.07] border-l-[3px] border-transparent'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 flex-shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-gray-500'
                      )}
                    />
                    {isExpanded && (
                      <>
                        <span className="flex-1 text-sm whitespace-nowrap">
                          {item.label}
                        </span>
                        {Badge && <Badge />}
                      </>
                    )}
                    {/* Badge dot when collapsed */}
                    {!isExpanded && Badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
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

            {/* Divider */}
            <div className="my-3 mx-2 relative">
              <div className="h-px bg-gray-700/40" />
              {isExpanded && (
                <>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-gray-600 rounded-full" />
                </>
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

          {/* Footer */}
          <div className="border-t border-gray-800/50 p-3 space-y-2 bg-gradient-to-t from-gray-950/50 to-transparent">
            {/* Sync and offline status - only when expanded */}
            {isExpanded && (
              <div className="pb-2 flex items-center justify-between gap-2 px-1">
                <SyncStatusBar />
                <OfflineIndicator />
              </div>
            )}

            {/* Theme toggle */}
            {isExpanded ? (
              <div className="pb-2 flex items-center justify-between gap-2 px-1">
                <span className="text-sm text-gray-500">Theme</span>
                <ThemeToggle compact />
              </div>
            ) : (
              <div className="flex justify-center pb-2">
                <ThemeToggle compact />
              </div>
            )}

            {/* User info - only when expanded */}
            {isExpanded && userProfile && (
              <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
                <p className="font-semibold text-white text-sm truncate">
                  {userProfile.first_name} {userProfile.last_name}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {userProfile.email}
                </p>
                <span className="inline-flex mt-1.5 px-2 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full capitalize">
                  {userProfile.role}
                </span>
              </div>
            )}

            {/* Settings link */}
            {isExpanded ? (
              <Link
                to="/settings"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.07] transition-all duration-200"
              >
                <Settings className="h-5 w-5 text-gray-500" />
                Settings
              </Link>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/settings"
                    className="flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.07] transition-all duration-200"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Sign out */}
            {isExpanded ? (
              <Button
                onClick={() => signOut()}
                variant="ghost"
                className="w-full justify-start gap-3 px-3 text-gray-400 hover:text-white hover:bg-white/[0.07] rounded-lg"
              >
                <LogOut className="h-5 w-5 text-gray-500" />
                Sign Out
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => signOut()}
                    variant="ghost"
                    size="icon"
                    className="w-full text-gray-400 hover:text-white hover:bg-white/[0.07] rounded-lg"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}

// Export width constants for layout calculations
export { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH }
