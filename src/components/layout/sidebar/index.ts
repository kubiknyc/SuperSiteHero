// File: src/components/layout/sidebar/index.ts
// Barrel export for sidebar components

// ============================================================================
// NEW NAVIGATION SIDEBAR (Modern Minimal Redesign)
// ============================================================================

export { NavigationSidebar } from './components/NavigationSidebar'
export type { NavigationSidebarProps } from './components/NavigationSidebar'

export { NavigationGroup } from './components/NavigationGroup'
export type { NavigationGroupProps, NavGroupItem } from './components/NavigationGroup'

export { NavigationItem } from './components/NavigationItem'
export type { NavigationItemProps } from './components/NavigationItem'

export { CommandStrip } from './components/CommandStrip'
export type { CommandStripProps } from './components/CommandStrip'

export { UserDock } from './components/UserDock'
export type { UserDockProps } from './components/UserDock'

// Animation hooks
export {
  useSidebarAnimation,
  sidebarVariants,
  groupContainerVariants,
  groupItemVariants,
  springConfig,
} from './hooks/useSidebarAnimation'

// ============================================================================
// LEGACY SIDEBAR (kept for backward compatibility)
// ============================================================================

export { CollapsibleSidebarV2Refactored } from './CollapsibleSidebarV2Refactored'
export { useSidebarState } from './useSidebarState'
export { NavLinkItem, QuickActionButton } from './NavLinkItem'
export { SidebarHeader } from './SidebarHeader'
export { SidebarFooter } from './SidebarFooter'
export { SidebarNavigation } from './SidebarNavigation'
export {
  primaryNavItems,
  navGroups,
  DEFAULT_EXPANDED_GROUPS,
  RESTRICTED_TAKEOFF_ROLES,
  type NavItem,
  type NavGroup,
} from './navigation-config'

// Constants
export const SIDEBAR_COLLAPSED_WIDTH_V2 = 72
export const SIDEBAR_EXPANDED_WIDTH_V2 = 280
