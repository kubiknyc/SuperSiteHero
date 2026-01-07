// File: src/components/layout/sidebar/CollapsibleSidebarV2Refactored.tsx
// Refactored collapsible sidebar - Clean, modular architecture
// Original 700+ line component split into focused sub-components
//
// Architecture:
// - useSidebarState: State management hook with localStorage persistence
// - SidebarHeader: Logo and pin button
// - SidebarNavigation: Primary and grouped navigation items
// - SidebarFooter: Quick actions and user profile
// - NavLinkItem: Reusable navigation link component

import { useEffect, createContext, useContext, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSidebarState } from './useSidebarState'
import { SidebarHeader } from './SidebarHeader'
import { SidebarNavigation } from './SidebarNavigation'
import { SidebarFooter } from './SidebarFooter'
import { DEFAULT_EXPANDED_GROUPS } from './navigation-config'

// Constants
export const SIDEBAR_COLLAPSED_WIDTH_V2 = 72
export const SIDEBAR_EXPANDED_WIDTH_V2 = 280

// Context for sidebar state
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

export const useSidebarContextV2 = () => useContext(SidebarContext)

// Props interface
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

/**
 * Custom hook for keyboard shortcuts
 */
function useSidebarKeyboardShortcuts(
  isPinned: boolean,
  togglePin: () => void,
  setIsHovered: (hovered: boolean) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
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
  }, [isPinned, togglePin, setIsHovered])
}

/**
 * Refactored CollapsibleSidebarV2 component
 * Now ~100 lines instead of 700+ lines
 */
export function CollapsibleSidebarV2Refactored({
  className,
  userProfile,
  onSignOut,
  currentProjectId,
}: CollapsibleSidebarV2Props) {
  // State management via custom hook
  const {
    isPinned,
    isHovered,
    isExpanded,
    expandedGroups,
    togglePin,
    toggleGroup,
    setIsHovered,
    handleMouseEnter,
    handleMouseLeave,
  } = useSidebarState({
    defaultExpandedGroups: DEFAULT_EXPANDED_GROUPS,
  })

  // Keyboard shortcuts
  useSidebarKeyboardShortcuts(isPinned, togglePin, setIsHovered)

  // User role for conditional rendering
  const userRole = userProfile?.role || 'user'

  return (
    <SidebarContext.Provider value={{ isExpanded, isPinned, isHovered }}>
      <TooltipProvider delayDuration={0}>
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{
            width: isExpanded
              ? SIDEBAR_EXPANDED_WIDTH_V2
              : SIDEBAR_COLLAPSED_WIDTH_V2,
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
          <SidebarHeader
            isExpanded={isExpanded}
            isPinned={isPinned}
            onTogglePin={togglePin}
          />

          <SidebarNavigation
            isExpanded={isExpanded}
            expandedGroups={expandedGroups}
            onToggleGroup={toggleGroup}
            currentProjectId={currentProjectId}
            userRole={userRole}
          />

          <SidebarFooter
            isExpanded={isExpanded}
            userProfile={userProfile}
            onSignOut={onSignOut}
          />
        </aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}
