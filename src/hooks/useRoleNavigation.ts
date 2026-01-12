/**
 * useRoleNavigation Hook
 * Provides role-based navigation configuration for the current user
 */

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getRoleNavigationConfig,
  getDefaultLandingPage,
  isPortalRole,
  getPortalBasePath,
  type RoleNavigationConfig,
  type QuickAction,
} from '@/config/role-navigation';
import { filterNavItemsByPermissions } from '@/config/navigation-permissions';
import type { DefaultRole } from '@/types/permissions';
import type { NavItem, NavGroup } from '@/types/navigation';

// =============================================
// Return Type
// =============================================

export interface UseRoleNavigationReturn {
  // Navigation configuration
  primaryItems: NavItem[];
  groups: NavGroup[];
  mobileBottomNav: NavItem[];
  quickActions: QuickAction[];

  // Landing page and routing
  defaultLandingPage: string;
  isPortalRole: boolean;
  portalBasePath: string | null;

  // Role info
  currentRole: DefaultRole;
  roleLabel: string;
  expandedGroupsByDefault: string[];

  // Helpers
  canAccessPath: (path: string) => boolean;
  config: RoleNavigationConfig;
}

// =============================================
// Role Labels
// =============================================

const ROLE_LABELS: Record<DefaultRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  project_manager: 'Project Manager',
  superintendent: 'Superintendent',
  foreman: 'Foreman',
  worker: 'Worker',
  subcontractor: 'Subcontractor',
  client: 'Client',
};

// =============================================
// Hook Implementation
// =============================================

export function useRoleNavigation(): UseRoleNavigationReturn {
  const { userProfile } = useAuth();

  // Get the user's role, defaulting to 'worker' (most restricted)
  const currentRole = (userProfile?.role as DefaultRole) || 'worker';

  // Memoize the navigation config
  const config = useMemo(() => {
    return getRoleNavigationConfig(currentRole);
  }, [currentRole]);

  // For now, we'll include all items from the config
  // In a full implementation, we'd filter based on user permissions
  const primaryItems = useMemo(() => {
    return config.primaryItems;
  }, [config]);

  // Filter groups (and their items) based on permissions
  const groups = useMemo(() => {
    return config.groups.map(group => ({
      ...group,
      // In full implementation, filter items by permission
      items: group.items,
    }));
  }, [config]);

  // Mobile bottom nav items
  const mobileBottomNav = useMemo(() => {
    return config.mobileBottomNav;
  }, [config]);

  // Quick actions
  const quickActions = useMemo(() => {
    return config.quickActions;
  }, [config]);

  // Landing page
  const defaultLandingPage = useMemo(() => {
    return getDefaultLandingPage(currentRole);
  }, [currentRole]);

  // Portal role check
  const isPortal = useMemo(() => {
    return isPortalRole(currentRole);
  }, [currentRole]);

  // Portal base path
  const portalBasePath = useMemo(() => {
    return getPortalBasePath(currentRole);
  }, [currentRole]);

  // Role label
  const roleLabel = ROLE_LABELS[currentRole] || 'User';

  // Expanded groups
  const expandedGroupsByDefault = config.expandedGroupsByDefault;

  // Path access checker
  const canAccessPath = useMemo(() => {
    return (_path: string): boolean => {
      // For now, return true for all paths in the config
      // In full implementation, check against user permissions
      return true;
    };
  }, []);

  return {
    primaryItems,
    groups,
    mobileBottomNav,
    quickActions,
    defaultLandingPage,
    isPortalRole: isPortal,
    portalBasePath,
    currentRole,
    roleLabel,
    expandedGroupsByDefault,
    canAccessPath,
    config,
  };
}

// =============================================
// Utility Hooks
// =============================================

/**
 * Get just the current role
 */
export function useCurrentRole(): DefaultRole {
  const { userProfile } = useAuth();
  return (userProfile?.role as DefaultRole) || 'worker';
}

/**
 * Get just the default landing page
 */
export function useDefaultLandingPage(): string {
  const role = useCurrentRole();
  return getDefaultLandingPage(role);
}

/**
 * Check if current user is a portal role
 */
export function useIsPortalRole(): boolean {
  const role = useCurrentRole();
  return isPortalRole(role);
}

/**
 * Get quick actions for current role
 */
export function useQuickActions(): QuickAction[] {
  const { quickActions } = useRoleNavigation();
  return quickActions;
}
