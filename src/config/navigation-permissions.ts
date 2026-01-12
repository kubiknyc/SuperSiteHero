/**
 * Navigation Path to Permission Mapping
 * Maps navigation paths to required permissions for access control
 */

import { PERMISSION_CODES, type PermissionCode } from '@/types/permissions';

// =============================================
// Path to Permission Mapping
// =============================================

/**
 * Maps navigation paths to required permission codes
 * If a path is not in this map, it's considered accessible to all authenticated users
 */
export const NAVIGATION_PERMISSIONS: Record<string, PermissionCode | PermissionCode[]> = {
  // Projects
  '/projects': PERMISSION_CODES.PROJECTS_VIEW,
  '/projects/new': PERMISSION_CODES.PROJECTS_CREATE,

  // Daily Reports
  '/daily-reports': PERMISSION_CODES.DAILY_REPORTS_VIEW,
  '/daily-reports/new': PERMISSION_CODES.DAILY_REPORTS_CREATE,

  // RFIs
  '/rfis': PERMISSION_CODES.RFIS_VIEW,
  '/rfis/new': PERMISSION_CODES.RFIS_CREATE,

  // Submittals
  '/submittals': PERMISSION_CODES.SUBMITTALS_VIEW,
  '/submittals/new': PERMISSION_CODES.SUBMITTALS_CREATE,

  // Change Orders
  '/change-orders': PERMISSION_CODES.CHANGE_ORDERS_VIEW,
  '/change-orders/new': PERMISSION_CODES.CHANGE_ORDERS_CREATE,

  // Documents
  '/documents': PERMISSION_CODES.DOCUMENTS_VIEW,

  // Safety
  '/safety': PERMISSION_CODES.SAFETY_VIEW,
  '/safety/new': PERMISSION_CODES.SAFETY_CREATE,

  // Financial
  '/budget': PERMISSION_CODES.FINANCIAL_VIEW,
  '/invoices': [PERMISSION_CODES.FINANCIAL_VIEW, PERMISSION_CODES.FINANCIAL_PAYMENT_APPS],

  // Schedule
  '/schedule': PERMISSION_CODES.SCHEDULE_VIEW,

  // Team & Admin
  '/settings/users': PERMISSION_CODES.ADMIN_USER_MANAGEMENT,
  '/settings/roles': PERMISSION_CODES.ADMIN_ROLES,
  '/settings/company': PERMISSION_CODES.ADMIN_COMPANY_SETTINGS,
  '/settings/integrations': PERMISSION_CODES.ADMIN_INTEGRATIONS,
  '/settings/billing': PERMISSION_CODES.ADMIN_BILLING,

  // Approvals (requires at least one approval permission)
  '/approvals': [
    PERMISSION_CODES.DAILY_REPORTS_APPROVE,
    PERMISSION_CODES.CHANGE_ORDERS_APPROVE,
    PERMISSION_CODES.SUBMITTALS_APPROVE,
    PERMISSION_CODES.FINANCIAL_APPROVE,
  ],

  // Analytics & Reports
  '/analytics': PERMISSION_CODES.PROJECTS_VIEW, // Basic access, detailed access controlled elsewhere
  '/reports': PERMISSION_CODES.PROJECTS_VIEW,
};

// =============================================
// Helper Functions
// =============================================

/**
 * Get required permission(s) for a navigation path
 * Returns null if no specific permission is required
 */
export function getPermissionForPath(path: string): PermissionCode | PermissionCode[] | null {
  // Check exact match first
  if (NAVIGATION_PERMISSIONS[path]) {
    return NAVIGATION_PERMISSIONS[path];
  }

  // Check for parent path match (e.g., /projects/123/edit matches /projects)
  const segments = path.split('/').filter(Boolean);
  while (segments.length > 0) {
    const parentPath = '/' + segments.join('/');
    if (NAVIGATION_PERMISSIONS[parentPath]) {
      return NAVIGATION_PERMISSIONS[parentPath];
    }
    segments.pop();
  }

  return null;
}

/**
 * Check if a path requires any of the specified permissions
 * @param path - The navigation path
 * @param userPermissions - Set of permission codes the user has
 * @returns true if the user has access, false otherwise
 */
export function hasPathAccess(
  path: string,
  userPermissions: Set<string> | Map<string, unknown>
): boolean {
  const required = getPermissionForPath(path);

  // No permission required
  if (!required) {
    return true;
  }

  // Convert Map to Set if needed
  const permissionSet = userPermissions instanceof Map
    ? new Set(userPermissions.keys())
    : userPermissions;

  // Single permission required
  if (typeof required === 'string') {
    return permissionSet.has(required);
  }

  // Multiple permissions - user needs at least one (OR logic)
  return required.some(perm => permissionSet.has(perm));
}

/**
 * Filter navigation items based on user permissions
 */
export function filterNavItemsByPermissions<T extends { path: string }>(
  items: T[],
  userPermissions: Set<string> | Map<string, unknown>
): T[] {
  return items.filter(item => hasPathAccess(item.path, userPermissions));
}
