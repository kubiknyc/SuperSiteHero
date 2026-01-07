// File: src/components/layout/sidebar/navigation-config.ts
// Centralized navigation configuration for the sidebar
// Supports dynamic layout selection from settings

import { LucideIcon } from 'lucide-react'
import {
  NAVIGATION_LAYOUTS,
  DEFAULT_LAYOUT_ID,
  getLayoutById,
  type NavigationLayout,
  type NavItem as LayoutNavItem,
  type NavGroup as LayoutNavGroup,
} from '@/config/navigation-layouts'
import { getStorageItem, STORAGE_KEYS } from '@/lib/utils/storage'

// Re-export types for backward compatibility
export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  badge?: number
  description?: string
}

export interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
  defaultExpanded?: boolean
}

/**
 * Get the currently selected navigation layout from storage
 */
export function getSelectedLayoutId(): string {
  return getStorageItem(STORAGE_KEYS.NAVIGATION_LAYOUT, DEFAULT_LAYOUT_ID)
}

/**
 * Get the active navigation layout configuration
 * Returns the user-selected layout or the default
 */
export function getActiveNavigationLayout(): NavigationLayout {
  const selectedId = getSelectedLayoutId()
  return getLayoutById(selectedId) || NAVIGATION_LAYOUTS[0]
}

/**
 * Primary navigation items from the active layout
 */
export function getPrimaryNavItems(): NavItem[] {
  return getActiveNavigationLayout().primary
}

/**
 * Grouped navigation items from the active layout
 */
export function getNavGroups(): NavGroup[] {
  return getActiveNavigationLayout().groups
}

// Legacy exports for backward compatibility
// These will use the default layout (workflow-type) for components
// that haven't been updated to use the dynamic functions
export const primaryNavItems: NavItem[] = NAVIGATION_LAYOUTS[0].primary
export const navGroups: NavGroup[] = NAVIGATION_LAYOUTS[0].groups

/**
 * Roles that should NOT see the takeoffs link
 */
export const RESTRICTED_TAKEOFF_ROLES = ['client', 'subcontractor'] as const

/**
 * Default groups to expand on first sidebar load
 */
export const DEFAULT_EXPANDED_GROUPS = ['workflows', 'field', 'daily', 'superintendent']

/**
 * Hook helper to subscribe to layout changes
 * Returns the current layout and updates when it changes
 */
export function subscribeToLayoutChanges(callback: (layoutId: string) => void): () => void {
  const handler = (event: CustomEvent<string>) => {
    callback(event.detail)
  }

  window.addEventListener('navigation-layout-changed', handler as EventListener)

  return () => {
    window.removeEventListener('navigation-layout-changed', handler as EventListener)
  }
}
