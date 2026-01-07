// File: src/components/layout/sidebar/SidebarNavigation.tsx
// Main navigation section of the collapsible sidebar
// Contains primary nav items and grouped navigation
// Supports dynamic layout selection from settings

import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ChevronDown, Ruler } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { NavLinkItem } from './NavLinkItem'
import {
  getPrimaryNavItems,
  getNavGroups,
  getSelectedLayoutId,
  subscribeToLayoutChanges,
  RESTRICTED_TAKEOFF_ROLES,
  type NavItem,
  type NavGroup,
} from './navigation-config'

interface SidebarNavigationProps {
  isExpanded: boolean
  expandedGroups: Set<string>
  onToggleGroup: (groupId: string) => void
  onLayoutChange?: (groups: NavGroup[]) => void
  currentProjectId?: string | null
  userRole?: string
}

/**
 * Custom hook to manage navigation layout state
 * Reacts to layout changes from settings
 */
function useNavigationLayout(onLayoutChange?: (groups: NavGroup[]) => void) {
  const [layoutId, setLayoutId] = useState(getSelectedLayoutId)
  const [primaryItems, setPrimaryItems] = useState(getPrimaryNavItems)
  const [groups, setGroups] = useState(getNavGroups)

  useEffect(() => {
    // Subscribe to layout change events from settings
    const unsubscribe = subscribeToLayoutChanges((newLayoutId) => {
      setLayoutId(newLayoutId)
      const newPrimary = getPrimaryNavItems()
      const newGroups = getNavGroups()
      setPrimaryItems(newPrimary)
      setGroups(newGroups)
      onLayoutChange?.(newGroups)
    })

    return unsubscribe
  }, [onLayoutChange])

  return { layoutId, primaryItems, groups }
}

/**
 * Group header with expand/collapse button
 */
function GroupHeader({
  group,
  isExpanded,
  isGroupExpanded,
  onToggle,
}: {
  group: NavGroup
  isExpanded: boolean
  isGroupExpanded: boolean
  onToggle: () => void
}) {
  if (!isExpanded) {
    // Just a spacer when collapsed
    return <div className="h-2" />
  }

  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2',
        'text-xs font-semibold uppercase tracking-wider',
        'text-slate-500 hover:text-slate-400',
        'transition-colors duration-200'
      )}
    >
      <div className="flex items-center gap-2">
        {group.icon && <group.icon className="h-3.5 w-3.5" />}
        <span>{group.label}</span>
      </div>
      <ChevronDown
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          isGroupExpanded ? 'rotate-0' : '-rotate-90'
        )}
      />
    </button>
  )
}

/**
 * Takeoffs link - only shown in project context for authorized roles
 */
function TakeoffsLink({
  isExpanded,
  currentProjectId,
}: {
  isExpanded: boolean
  currentProjectId: string
}) {
  const location = useLocation()
  const takeoffsPath = `/projects/${currentProjectId}/takeoffs`
  const isActive = location.pathname.includes('/takeoffs')

  const linkContent = (
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
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          <p>Takeoffs</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

export function SidebarNavigation({
  isExpanded,
  expandedGroups,
  onToggleGroup,
  onLayoutChange,
  currentProjectId,
  userRole = 'user',
}: SidebarNavigationProps) {
  const { primaryItems, groups } = useNavigationLayout(onLayoutChange)

  const showTakeoffs =
    currentProjectId &&
    !RESTRICTED_TAKEOFF_ROLES.includes(userRole as 'client' | 'subcontractor')

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
      {/* Primary Navigation */}
      <div className="space-y-1">
        {primaryItems.map((item) => (
          <NavLinkItem key={item.path} item={item} isExpanded={isExpanded} />
        ))}
      </div>

      {/* Divider */}
      <div className="my-4 mx-2">
        <div className="h-px bg-slate-800" />
      </div>

      {/* Grouped Navigation */}
      {groups.map((group) => (
        <div key={group.id} className="space-y-1">
          <GroupHeader
            group={group}
            isExpanded={isExpanded}
            isGroupExpanded={expandedGroups.has(group.id)}
            onToggle={() => onToggleGroup(group.id)}
          />

          {/* Group items */}
          <div
            className={cn(
              'space-y-0.5 overflow-hidden transition-all duration-200',
              isExpanded && !expandedGroups.has(group.id) && 'h-0 opacity-0'
            )}
          >
            {group.items.map((item) => (
              <NavLinkItem
                key={item.path}
                item={item}
                isExpanded={isExpanded}
                isNested
              />
            ))}
          </div>
        </div>
      ))}

      {/* Takeoffs link - contextual */}
      {showTakeoffs && (
        <>
          <div className="my-4 mx-2">
            <div className="h-px bg-slate-800" />
          </div>
          <TakeoffsLink
            isExpanded={isExpanded}
            currentProjectId={currentProjectId}
          />
        </>
      )}
    </nav>
  )
}
