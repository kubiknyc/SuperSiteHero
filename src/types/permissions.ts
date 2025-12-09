/**
 * Advanced Permissions Types
 * Types for granular role-based permissions with custom roles and feature flags
 * Aligned with migration 090_advanced_permissions.sql
 */

// =============================================
// Permission Categories
// =============================================

export type PermissionCategory =
  | 'projects'
  | 'daily_reports'
  | 'rfis'
  | 'submittals'
  | 'change_orders'
  | 'documents'
  | 'safety'
  | 'schedule'
  | 'financial'
  | 'team'
  | 'admin';

export type PermissionSubcategory =
  | 'read'
  | 'write'
  | 'approve'
  | 'admin'
  | 'settings'
  | 'users'
  | 'roles'
  | 'integrations'
  | 'billing';

// =============================================
// Default Roles
// =============================================

export type DefaultRole =
  | 'owner'
  | 'admin'
  | 'project_manager'
  | 'superintendent'
  | 'foreman'
  | 'worker'
  | 'subcontractor'
  | 'client';

export const DEFAULT_ROLES: { value: DefaultRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Owner', description: 'Full access to all features and billing' },
  { value: 'admin', label: 'Administrator', description: 'Full access except billing management' },
  { value: 'project_manager', label: 'Project Manager', description: 'Manage assigned projects and teams' },
  { value: 'superintendent', label: 'Superintendent', description: 'Field operations and daily oversight' },
  { value: 'foreman', label: 'Foreman', description: 'Team and task management' },
  { value: 'worker', label: 'Worker', description: 'View tasks and submit reports' },
  { value: 'subcontractor', label: 'Subcontractor', description: 'Subcontractor portal access' },
  { value: 'client', label: 'Client', description: 'Client portal access' },
];

// =============================================
// Permission Definition
// =============================================

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: PermissionCategory;
  subcategory: PermissionSubcategory | null;
  is_dangerous: boolean;
  requires_project_assignment: boolean;
  display_order: number;
  created_at: string;
}

// =============================================
// Custom Role
// =============================================

export interface CustomRole {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  can_be_deleted: boolean;
  inherits_from: DefaultRole | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CustomRoleWithPermissions extends CustomRole {
  permissions: RolePermission[];
}

// =============================================
// Role Permission Mapping
// =============================================

export interface RolePermission {
  id: string;
  default_role: DefaultRole | null;
  custom_role_id: string | null;
  permission_id: string;
  granted: boolean;
  // Expanded relation
  permission?: Permission;
}

// =============================================
// User Permission Override
// =============================================

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  permission_id: string;
  override_type: 'grant' | 'revoke';
  project_id: string | null;
  reason: string | null;
  granted_by: string | null;
  granted_at: string;
  expires_at: string | null;
  // Expanded relations
  permission?: Permission;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

// =============================================
// User Custom Role Assignment
// =============================================

export interface UserCustomRole {
  id: string;
  user_id: string;
  custom_role_id: string;
  project_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  // Expanded relations
  custom_role?: CustomRole;
  project?: {
    id: string;
    name: string;
  };
}

// =============================================
// Feature Flags
// =============================================

export interface FeatureFlag {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  default_enabled: boolean;
  is_beta: boolean;
  requires_subscription: string | null;
  created_at: string;
}

export interface CompanyFeatureFlag {
  id: string;
  company_id: string;
  feature_flag_id: string;
  enabled: boolean;
  enabled_by: string | null;
  enabled_at: string;
  expires_at: string | null;
  notes: string | null;
  // Expanded relation
  feature_flag?: FeatureFlag;
}

// =============================================
// Computed/Resolved Types
// =============================================

export interface ResolvedPermission {
  permission_code: string;
  permission_name: string;
  category: PermissionCategory;
  granted: boolean;
  source: 'default_role' | 'custom_role' | 'override';
}

export interface UserPermissions {
  userId: string;
  defaultRole: DefaultRole;
  customRoles: CustomRole[];
  permissions: Map<string, ResolvedPermission>;
  overrides: UserPermissionOverride[];
}

// =============================================
// DTOs (Data Transfer Objects)
// =============================================

export interface CreateCustomRoleDTO {
  code: string;
  name: string;
  description?: string;
  color?: string;
  inherits_from?: DefaultRole;
  permissions?: string[]; // Permission codes to grant
}

export interface UpdateCustomRoleDTO {
  name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface CreateUserPermissionOverrideDTO {
  user_id: string;
  permission_code: string;
  override_type: 'grant' | 'revoke';
  project_id?: string;
  reason?: string;
  expires_at?: string;
}

export interface AssignCustomRoleDTO {
  user_id: string;
  custom_role_id: string;
  project_id?: string;
}

export interface UpdateCompanyFeatureFlagDTO {
  feature_code: string;
  enabled: boolean;
  notes?: string;
  expires_at?: string;
}

// =============================================
// Permission Matrix Types (for UI)
// =============================================

export interface PermissionMatrixRow {
  permission: Permission;
  roles: Record<string, boolean>; // role code -> granted
}

export interface PermissionMatrixCategory {
  category: PermissionCategory;
  categoryLabel: string;
  permissions: PermissionMatrixRow[];
}

// =============================================
// Utility Functions
// =============================================

/**
 * Check if a permission code is in a set of granted permissions
 */
export function hasPermission(
  permissions: Map<string, ResolvedPermission> | undefined,
  permissionCode: string
): boolean {
  if (!permissions) return false;
  const perm = permissions.get(permissionCode);
  return perm?.granted ?? false;
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  permissions: Map<string, ResolvedPermission> | undefined,
  permissionCodes: string[]
): boolean {
  if (!permissions) return false;
  return permissionCodes.some(code => hasPermission(permissions, code));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  permissions: Map<string, ResolvedPermission> | undefined,
  permissionCodes: string[]
): boolean {
  if (!permissions) return false;
  return permissionCodes.every(code => hasPermission(permissions, code));
}

/**
 * Get permissions grouped by category
 */
export function groupPermissionsByCategory(
  permissions: Permission[]
): Record<PermissionCategory, Permission[]> {
  return permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<PermissionCategory, Permission[]>);
}

/**
 * Get human-readable category label
 */
export function getCategoryLabel(category: PermissionCategory): string {
  const labels: Record<PermissionCategory, string> = {
    projects: 'Projects',
    daily_reports: 'Daily Reports',
    rfis: 'RFIs',
    submittals: 'Submittals',
    change_orders: 'Change Orders',
    documents: 'Documents',
    safety: 'Safety',
    schedule: 'Schedule',
    financial: 'Financial',
    team: 'Team',
    admin: 'Administration',
  };
  return labels[category] || category;
}

/**
 * Get role display info
 */
export function getRoleInfo(role: DefaultRole): { label: string; description: string } | undefined {
  return DEFAULT_ROLES.find(r => r.value === role);
}

/**
 * Format role for display
 */
export function formatRole(role: DefaultRole | string): string {
  const info = DEFAULT_ROLES.find(r => r.value === role);
  if (info) return info.label;
  // Convert snake_case to Title Case for custom roles
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================
// Permission Code Constants
// =============================================

export const PERMISSION_CODES = {
  // Projects
  PROJECTS_VIEW: 'projects.view',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_EDIT: 'projects.edit',
  PROJECTS_DELETE: 'projects.delete',
  PROJECTS_ARCHIVE: 'projects.archive',

  // Daily Reports
  DAILY_REPORTS_VIEW: 'daily_reports.view',
  DAILY_REPORTS_CREATE: 'daily_reports.create',
  DAILY_REPORTS_EDIT: 'daily_reports.edit',
  DAILY_REPORTS_DELETE: 'daily_reports.delete',
  DAILY_REPORTS_APPROVE: 'daily_reports.approve',

  // RFIs
  RFIS_VIEW: 'rfis.view',
  RFIS_CREATE: 'rfis.create',
  RFIS_EDIT: 'rfis.edit',
  RFIS_RESPOND: 'rfis.respond',
  RFIS_CLOSE: 'rfis.close',
  RFIS_DELETE: 'rfis.delete',

  // Submittals
  SUBMITTALS_VIEW: 'submittals.view',
  SUBMITTALS_CREATE: 'submittals.create',
  SUBMITTALS_EDIT: 'submittals.edit',
  SUBMITTALS_REVIEW: 'submittals.review',
  SUBMITTALS_APPROVE: 'submittals.approve',
  SUBMITTALS_DELETE: 'submittals.delete',

  // Change Orders
  CHANGE_ORDERS_VIEW: 'change_orders.view',
  CHANGE_ORDERS_CREATE: 'change_orders.create',
  CHANGE_ORDERS_EDIT: 'change_orders.edit',
  CHANGE_ORDERS_APPROVE: 'change_orders.approve',
  CHANGE_ORDERS_DELETE: 'change_orders.delete',

  // Documents
  DOCUMENTS_VIEW: 'documents.view',
  DOCUMENTS_UPLOAD: 'documents.upload',
  DOCUMENTS_EDIT: 'documents.edit',
  DOCUMENTS_MARKUP: 'documents.markup',
  DOCUMENTS_DELETE: 'documents.delete',

  // Safety
  SAFETY_VIEW: 'safety.view',
  SAFETY_CREATE: 'safety.create',
  SAFETY_EDIT: 'safety.edit',
  SAFETY_INVESTIGATE: 'safety.investigate',
  SAFETY_OSHA: 'safety.osha',

  // Schedule
  SCHEDULE_VIEW: 'schedule.view',
  SCHEDULE_EDIT: 'schedule.edit',
  SCHEDULE_BASELINE: 'schedule.baseline',

  // Financial
  FINANCIAL_VIEW: 'financial.view',
  FINANCIAL_EDIT: 'financial.edit',
  FINANCIAL_PAYMENT_APPS: 'financial.payment_apps',
  FINANCIAL_LIEN_WAIVERS: 'financial.lien_waivers',
  FINANCIAL_APPROVE: 'financial.approve',

  // Team
  TEAM_VIEW: 'team.view',
  TEAM_ASSIGN: 'team.assign',
  TEAM_MANAGE_ROLES: 'team.manage_roles',

  // Admin
  ADMIN_COMPANY_SETTINGS: 'admin.company_settings',
  ADMIN_USER_MANAGEMENT: 'admin.user_management',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_INTEGRATIONS: 'admin.integrations',
  ADMIN_BILLING: 'admin.billing',
} as const;

export type PermissionCode = typeof PERMISSION_CODES[keyof typeof PERMISSION_CODES];

// =============================================
// Feature Flag Code Constants
// =============================================

export const FEATURE_FLAG_CODES = {
  BIM_VIEWER: 'bim_viewer',
  AI_AGENTS: 'ai_agents',
  AR_WALKTHROUGH: 'ar_walkthrough',
  IOT_SENSORS: 'iot_sensors',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  QUICKBOOKS_SYNC: 'quickbooks_sync',
  NATIVE_MOBILE: 'native_mobile',
  CUSTOM_REPORTS: 'custom_reports',
  REALTIME_COLLAB: 'realtime_collab',
  OFFLINE_MODE: 'offline_mode',
} as const;

export type FeatureFlagCode = typeof FEATURE_FLAG_CODES[keyof typeof FEATURE_FLAG_CODES];
