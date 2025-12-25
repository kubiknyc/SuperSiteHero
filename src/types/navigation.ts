import type { LucideIcon } from 'lucide-react';
import type { UserRole } from './auth';

export type NavigationCategory = 'main' | 'field' | 'management' | 'admin' | 'reports';

export interface NavItem {
  /** Display label for the navigation item */
  label: string;

  /** Lucide icon component */
  icon: LucideIcon;

  /** Route path */
  path: string;

  /** Optional badge component to display (e.g., unread count) */
  badge?: React.ComponentType;

  /** Roles that can see this nav item (undefined = all roles) */
  roles?: UserRole[];

  /** Category for grouping */
  category: NavigationCategory;

  /** Whether this item should be shown in mobile bottom nav */
  isPrimaryMobileNav?: boolean;

  /** Keyboard shortcut hint (e.g., "⌘K") */
  shortcut?: string;
}

export interface NavGroup {
  /** Group identifier */
  id: string;

  /** Display label for the group */
  label: string;

  /** Lucide icon component for the group */
  icon: LucideIcon;

  /** Navigation items in this group */
  items: NavItem[];

  /** Whether group should be expanded by default */
  defaultExpanded?: boolean;

  /** Category identifier */
  category: NavigationCategory;
}

export interface NavigationAnalyticsEvent {
  /** Item path that was clicked */
  path: string;

  /** Item label */
  label: string;

  /** Source of the click (sidebar, mobile-nav, command-palette, etc.) */
  source: 'desktop-sidebar' | 'mobile-drawer' | 'mobile-bottom-nav' | 'command-palette' | 'breadcrumb';

  /** Timestamp */
  timestamp: number;
}
