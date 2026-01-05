// File: /src/components/layout/index.ts
// Layout components barrel export

// Original layout components
export { AppLayout } from './AppLayout'
export { PageHeader, PageHeaderCompact } from './PageHeader'
export { NavigationGroup } from './NavigationGroup'
export { MobileBottomNav } from './MobileBottomNav'
export { MobileLayout } from './MobileLayout'
export { MobileHeader } from './MobileHeader'
export { MobileNavDrawer } from './MobileNavDrawer'
export { ClientPortalLayout } from './ClientPortalLayout'
export { ListDetailView } from './ListDetailView'

// V2 Layout components (Desktop redesign)
export {
  CollapsibleSidebar,
  useSidebarState,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
} from './CollapsibleSidebar'
export { StickyHeader } from './StickyHeader'
export { ActionPanel } from './ActionPanel'
export { QuickActions, projectQuickActions } from './QuickActions'
export { AppLayoutV2 } from './AppLayoutV2'
export { LayoutVersionToggle, FloatingLayoutToggle } from './LayoutVersionToggle'
export { SmartLayout, useSmartLayout } from './SmartLayout'
