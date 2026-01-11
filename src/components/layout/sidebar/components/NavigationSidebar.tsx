// File: src/components/layout/sidebar/components/NavigationSidebar.tsx
// Main navigation sidebar container - Modern Minimal redesign
// Combines CommandStrip, Navigation Canvas, and UserDock zones

import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'

// Components
import { CommandStrip } from './CommandStrip'
import { NavigationItem } from './NavigationItem'
import { NavigationGroup } from './NavigationGroup'
import { UserDock } from './UserDock'

// Config
import { SIDEBAR_CONFIG } from '@/config/navigation-sidebar'

// Animation hook
import { useSidebarAnimation, sidebarVariants } from '../hooks/useSidebarAnimation'

// Styles
import '../styles/sidebar.css'

// ============================================================================
// TYPES
// ============================================================================

export interface NavigationSidebarProps {
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  user?: {
    name: string
    email: string
    role: string
    avatarUrl?: string
  }
  isAdmin?: boolean
  isDarkMode?: boolean
  onThemeToggle?: () => void
  onLogout?: () => void
  onSearchTrigger?: () => void
  notificationCount?: number
  className?: string
}

// ============================================================================
// STORAGE KEY
// ============================================================================

const SIDEBAR_EXPANDED_KEY = 'jobsight-sidebar-expanded'
const SIDEBAR_GROUPS_KEY = 'jobsight-sidebar-groups'

// ============================================================================
// DIVIDER COMPONENT
// ============================================================================

const Divider = memo(function Divider({ className }: { className?: string }) {
  return (
    <div className={cn('mx-3 my-4', className)}>
      <div className="h-px bg-white/5" />
    </div>
  )
})

// ============================================================================
// COLLAPSE TOGGLE BUTTON
// ============================================================================

interface CollapseToggleProps {
  isExpanded: boolean
  onToggle: () => void
}

const CollapseToggle = memo(function CollapseToggle({
  isExpanded,
  onToggle,
}: CollapseToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className={cn(
            'absolute -right-3 top-20 z-50',
            'flex items-center justify-center',
            'w-6 h-6 rounded-full',
            'bg-slate-800 border border-slate-700',
            'text-slate-400 hover:text-slate-300',
            'shadow-lg',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
          )}
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </TooltipContent>
    </Tooltip>
  )
})

// ============================================================================
// LOGO COMPONENT
// ============================================================================

interface SidebarLogoProps {
  isExpanded: boolean
}

const SidebarLogo = memo(function SidebarLogo({ isExpanded }: SidebarLogoProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-4',
        !isExpanded && 'justify-center px-0'
      )}
    >
      {/* Logo mark */}
      <div
        className={cn(
          'flex items-center justify-center',
          'w-8 h-8 rounded-lg',
          'bg-gradient-to-br from-blue-500 to-blue-600',
          'text-white font-display font-bold text-sm'
        )}
      >
        JS
      </div>

      {/* Logo text */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.15 }}
          className="flex flex-col"
        >
          <span className="font-display font-semibold text-slate-100 text-sm tracking-tight">
            JobSight
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">
            Field Management
          </span>
        </motion.div>
      )}
    </div>
  )
})

// ============================================================================
// NAVIGATION SIDEBAR COMPONENT
// ============================================================================

const NavigationSidebar = memo(function NavigationSidebar({
  defaultExpanded = true,
  onExpandedChange,
  user,
  isAdmin = false,
  isDarkMode = true,
  onThemeToggle,
  onLogout,
  onSearchTrigger,
  notificationCount = 0,
  className,
}: NavigationSidebarProps) {
  // State
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultExpanded
    }
    const stored = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
    return stored !== null ? stored === 'true' : defaultExpanded
  })

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') {
      return new Set(['core-operations', 'workflows'])
    }
    const stored = localStorage.getItem(SIDEBAR_GROUPS_KEY)
    if (stored) {
      try {
        return new Set(JSON.parse(stored))
      } catch {
        return new Set(['core-operations', 'workflows'])
      }
    }
    // Default expanded groups
    return new Set(
      SIDEBAR_CONFIG.groups
        .filter((g) => g.defaultExpanded)
        .map((g) => g.id)
    )
  })

  // Refs
  const navCanvasRef = useRef<HTMLDivElement>(null)

  // Animation hook
  const { animationState } = useSidebarAnimation({ isExpanded })

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(isExpanded))
    onExpandedChange?.(isExpanded)
  }, [isExpanded, onExpandedChange])

  // Persist expanded groups
  useEffect(() => {
    localStorage.setItem(
      SIDEBAR_GROUPS_KEY,
      JSON.stringify(Array.from(expandedGroups))
    )
  }, [expandedGroups])

  // Handlers
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleToggleGroup = useCallback((groupId: string, isOpen: boolean) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (isOpen) {
        next.add(groupId)
      } else {
        next.delete(groupId)
      }
      return next
    })
  }, [])

  // Keyboard shortcut for collapse/expand
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        handleToggleExpanded()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleToggleExpanded])

  return (
    <TooltipProvider delayDuration={300}>
      <motion.aside
        variants={sidebarVariants}
        initial={false}
        animate={animationState}
        className={cn(
          'relative flex flex-col h-full',
          'bg-gradient-to-b from-slate-900 to-slate-950',
          'border-r border-white/5',
          className
        )}
        data-expanded={isExpanded}
      >
        {/* Collapse Toggle */}
        <CollapseToggle isExpanded={isExpanded} onToggle={handleToggleExpanded} />

        {/* Logo */}
        <SidebarLogo isExpanded={isExpanded} />

        {/* Command Strip */}
        <CommandStrip
          isExpanded={isExpanded}
          onSearchTrigger={onSearchTrigger}
          notificationCount={notificationCount}
        />

        {/* Navigation Canvas */}
        <nav
          ref={navCanvasRef}
          className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            'px-2 py-4',
            'scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent'
          )}
        >
          {/* Primary Navigation */}
          <div className="space-y-1 mb-4">
            {SIDEBAR_CONFIG.primary.map((item) => (
              <NavigationItem
                key={item.id}
                id={item.id}
                path={item.path}
                label={item.label}
                icon={item.icon}
                badge={item.badge}
                description={item.description}
                isExpanded={isExpanded}
              />
            ))}
          </div>

          <Divider />

          {/* Navigation Groups */}
          <div className="space-y-2">
            {SIDEBAR_CONFIG.groups.map((group) => (
              <NavigationGroup
                key={group.id}
                id={group.id}
                label={group.label}
                icon={group.icon}
                items={group.items}
                isExpanded={isExpanded}
                defaultOpen={expandedGroups.has(group.id)}
                onToggle={handleToggleGroup}
              />
            ))}
          </div>

          {/* Footer Settings Link */}
          <Divider className="mt-6" />

          <NavigationItem
            id={SIDEBAR_CONFIG.footer.settings.id}
            path={SIDEBAR_CONFIG.footer.settings.path}
            label={SIDEBAR_CONFIG.footer.settings.label}
            icon={SIDEBAR_CONFIG.footer.settings.icon}
            isExpanded={isExpanded}
          />

          {isAdmin && SIDEBAR_CONFIG.footer.admin && (
            <NavigationItem
              id={SIDEBAR_CONFIG.footer.admin.id}
              path={SIDEBAR_CONFIG.footer.admin.path}
              label={SIDEBAR_CONFIG.footer.admin.label}
              icon={SIDEBAR_CONFIG.footer.admin.icon}
              isExpanded={isExpanded}
            />
          )}
        </nav>

        {/* User Dock */}
        <UserDock
          isExpanded={isExpanded}
          user={user}
          isAdmin={isAdmin}
          isDarkMode={isDarkMode}
          onThemeToggle={onThemeToggle}
          onLogout={onLogout}
        />
      </motion.aside>
    </TooltipProvider>
  )
})

NavigationSidebar.displayName = 'NavigationSidebar'

export { NavigationSidebar }
export default NavigationSidebar
