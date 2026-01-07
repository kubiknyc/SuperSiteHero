// File: src/components/layout/sidebar/index.ts
// Barrel export for sidebar components

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
