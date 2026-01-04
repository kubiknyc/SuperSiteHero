/**
 * Authorization Utility
 *
 * Provides service-level authorization checks based on user roles and permissions.
 * This complements the database-level RLS policies with application-level controls.
 *
 * Features:
 * - Role hierarchy with inheritance
 * - Permission-based access control
 * - Resource ownership validation
 * - Service-level guards that can be used in API services
 *
 * @example
 * // Check if user can perform action
 * const auth = createAuthContext(userProfile)
 * auth.requirePermission('projects.edit')
 *
 * // In service hook
 * beforeCreate: (data) => {
 *   authGuard.requirePermission('tasks.create')
 *   return data
 * }
 */

import { ApiErrorClass } from '@/lib/api/errors'
import type { UserProfile } from '@/types'

// ============================================================================
// Types
// ============================================================================

export type UserRole =
  | 'admin'
  | 'company_admin'
  | 'owner'
  | 'project_manager'
  | 'superintendent'
  | 'foreman'
  | 'field_worker'
  | 'subcontractor'
  | 'viewer'
  | 'client'

export type Permission =
  // Projects
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  // Daily Reports
  | 'daily_reports.view'
  | 'daily_reports.create'
  | 'daily_reports.edit'
  | 'daily_reports.delete'
  | 'daily_reports.approve'
  // RFIs
  | 'rfis.view'
  | 'rfis.create'
  | 'rfis.edit'
  | 'rfis.respond'
  | 'rfis.close'
  // Submittals
  | 'submittals.view'
  | 'submittals.create'
  | 'submittals.edit'
  | 'submittals.approve'
  // Change Orders
  | 'change_orders.view'
  | 'change_orders.create'
  | 'change_orders.edit'
  | 'change_orders.approve'
  // Payment Applications
  | 'payment_apps.view'
  | 'payment_apps.create'
  | 'payment_apps.approve'
  // Documents
  | 'documents.view'
  | 'documents.upload'
  | 'documents.edit'
  | 'documents.delete'
  // Safety
  | 'safety.view'
  | 'safety.create'
  | 'safety.edit'
  | 'safety.investigate'
  // Tasks & Punch Lists
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'tasks.assign'
  // User Management
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'users.manage_roles'
  // Company Settings
  | 'company.settings'
  | 'company.billing'
  | 'company.integrations'
  // Admin
  | 'admin.system'
  | 'admin.audit_logs'

export interface RoleDefinition {
  level: number
  description: string
  inherits: UserRole[]
}

export interface AuthContext {
  userId: string
  companyId: string
  role: UserRole
  permissions: Set<Permission>
}

export interface ResourceOwnership {
  ownerId?: string
  companyId?: string
  projectId?: string
}

// ============================================================================
// Role Hierarchy
// ============================================================================

/**
 * Role hierarchy with inheritance levels
 * Higher level = more access
 */
export const ROLE_HIERARCHY: Record<UserRole, RoleDefinition> = {
  admin: {
    level: 100,
    description: 'Full system access',
    inherits: [],
  },
  company_admin: {
    level: 90,
    description: 'Company-wide administration',
    inherits: [],
  },
  owner: {
    level: 90,
    description: 'Company owner (same as company_admin)',
    inherits: [],
  },
  project_manager: {
    level: 70,
    description: 'Full project access',
    inherits: [],
  },
  superintendent: {
    level: 60,
    description: 'Field operations management',
    inherits: [],
  },
  foreman: {
    level: 50,
    description: 'Team leader access',
    inherits: [],
  },
  field_worker: {
    level: 30,
    description: 'Basic field access',
    inherits: [],
  },
  subcontractor: {
    level: 20,
    description: 'Limited external access',
    inherits: [],
  },
  viewer: {
    level: 10,
    description: 'Read-only access',
    inherits: [],
  },
  client: {
    level: 15,
    description: 'Client access (limited view)',
    inherits: [],
  },
}

// ============================================================================
// Permission Definitions
// ============================================================================

/**
 * Permission matrix - defines which roles have access to each permission
 */
export const PERMISSION_MATRIX: Record<Permission, UserRole[]> = {
  // Projects
  'projects.view': ['viewer', 'client', 'field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'projects.create': ['project_manager', 'company_admin', 'owner', 'admin'],
  'projects.edit': ['project_manager', 'company_admin', 'owner', 'admin'],
  'projects.delete': ['company_admin', 'owner', 'admin'],

  // Daily Reports
  'daily_reports.view': ['viewer', 'field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'daily_reports.create': ['field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'daily_reports.edit': ['foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'daily_reports.delete': ['superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'daily_reports.approve': ['superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],

  // RFIs
  'rfis.view': ['viewer', 'client', 'subcontractor', 'field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'rfis.create': ['subcontractor', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'rfis.edit': ['foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'rfis.respond': ['superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'rfis.close': ['project_manager', 'company_admin', 'owner', 'admin'],

  // Submittals
  'submittals.view': ['viewer', 'client', 'subcontractor', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'submittals.create': ['subcontractor', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'submittals.edit': ['foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'submittals.approve': ['superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],

  // Change Orders
  'change_orders.view': ['foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'change_orders.create': ['project_manager', 'company_admin', 'owner', 'admin'],
  'change_orders.edit': ['project_manager', 'company_admin', 'owner', 'admin'],
  'change_orders.approve': ['company_admin', 'owner', 'admin'],

  // Payment Applications
  'payment_apps.view': ['project_manager', 'company_admin', 'owner', 'admin'],
  'payment_apps.create': ['project_manager', 'company_admin', 'owner', 'admin'],
  'payment_apps.approve': ['company_admin', 'owner', 'admin'],

  // Documents
  'documents.view': ['viewer', 'client', 'subcontractor', 'field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'documents.upload': ['field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'documents.edit': ['foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'documents.delete': ['superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],

  // Safety
  'safety.view': ['viewer', 'field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'safety.create': ['field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'safety.edit': ['foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'safety.investigate': ['superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],

  // Tasks & Punch Lists
  'tasks.view': ['viewer', 'subcontractor', 'field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'tasks.create': ['foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'tasks.edit': ['foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'tasks.delete': ['superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],
  'tasks.assign': ['foreman', 'superintendent', 'project_manager', 'company_admin', 'owner', 'admin'],

  // User Management
  'users.view': ['project_manager', 'company_admin', 'owner', 'admin'],
  'users.create': ['company_admin', 'owner', 'admin'],
  'users.edit': ['company_admin', 'owner', 'admin'],
  'users.delete': ['admin'],
  'users.manage_roles': ['company_admin', 'owner', 'admin'],

  // Company Settings
  'company.settings': ['company_admin', 'owner', 'admin'],
  'company.billing': ['company_admin', 'owner', 'admin'],
  'company.integrations': ['company_admin', 'owner', 'admin'],

  // Admin Only
  'admin.system': ['admin'],
  'admin.audit_logs': ['admin'],
}

// ============================================================================
// Authorization Functions
// ============================================================================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSION_MATRIX[permission]
  if (!allowedRoles) return false
  return allowedRoles.includes(role)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  const permissions: Permission[] = []
  for (const [permission, roles] of Object.entries(PERMISSION_MATRIX)) {
    if (roles.includes(role)) {
      permissions.push(permission as Permission)
    }
  }
  return permissions
}

/**
 * Check if role A has equal or higher access than role B
 */
export function hasEqualOrHigherAccess(roleA: UserRole, roleB: UserRole): boolean {
  const levelA = ROLE_HIERARCHY[roleA]?.level || 0
  const levelB = ROLE_HIERARCHY[roleB]?.level || 0
  return levelA >= levelB
}

/**
 * Get the access level for a role
 */
export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role]?.level || 0
}

/**
 * Check if user is an admin-level role
 */
export function isAdminRole(role: UserRole): boolean {
  return ['admin', 'company_admin', 'owner'].includes(role)
}

/**
 * Check if user is a management-level role
 */
export function isManagementRole(role: UserRole): boolean {
  return ['admin', 'company_admin', 'owner', 'project_manager', 'superintendent'].includes(role)
}

// ============================================================================
// Authorization Context
// ============================================================================

/**
 * Create an authorization context from a user profile
 */
export function createAuthContext(userProfile: UserProfile | null): AuthContext | null {
  if (!userProfile) return null

  const role = (userProfile.role || 'viewer') as UserRole
  const permissions = new Set(getRolePermissions(role))

  return {
    userId: userProfile.id,
    companyId: userProfile.company_id || '',
    role,
    permissions,
  }
}

// ============================================================================
// Authorization Guards
// ============================================================================

export interface AuthorizationGuard {
  /** Get the current auth context */
  context: AuthContext

  /** Check if user has a permission (returns boolean) */
  can(permission: Permission): boolean

  /** Require a permission (throws if not authorized) */
  requirePermission(permission: Permission): void

  /** Require any of the given permissions */
  requireAnyPermission(permissions: Permission[]): void

  /** Require all of the given permissions */
  requireAllPermissions(permissions: Permission[]): void

  /** Require user to be resource owner or have admin access */
  requireOwnershipOrAdmin(ownerId: string): void

  /** Require user to be in the same company */
  requireSameCompany(companyId: string): void

  /** Require minimum role level */
  requireMinimumRole(role: UserRole): void

  /** Check if user owns a resource */
  isOwner(ownerId: string): boolean

  /** Check if user is in the same company */
  isSameCompany(companyId: string): boolean
}

/**
 * Create an authorization guard for service-level checks
 *
 * @example
 * const guard = createAuthGuard(userProfile)
 * guard.requirePermission('projects.edit')
 * guard.requireSameCompany(project.company_id)
 */
export function createAuthGuard(userProfile: UserProfile | null): AuthorizationGuard {
  const context = createAuthContext(userProfile)

  if (!context) {
    // Return a guard that throws on all checks if no user
    return {
      context: {
        userId: '',
        companyId: '',
        role: 'viewer',
        permissions: new Set(),
      },
      can: () => false,
      requirePermission: (permission) => {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          status: 401,
        })
      },
      requireAnyPermission: () => {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          status: 401,
        })
      },
      requireAllPermissions: () => {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          status: 401,
        })
      },
      requireOwnershipOrAdmin: () => {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          status: 401,
        })
      },
      requireSameCompany: () => {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          status: 401,
        })
      },
      requireMinimumRole: () => {
        throw new ApiErrorClass({
          code: 'AUTH_REQUIRED',
          message: 'Authentication required',
          status: 401,
        })
      },
      isOwner: () => false,
      isSameCompany: () => false,
    }
  }

  return {
    context,

    can(permission: Permission): boolean {
      return context.permissions.has(permission)
    },

    requirePermission(permission: Permission): void {
      if (!context.permissions.has(permission)) {
        throw new ApiErrorClass({
          code: 'FORBIDDEN',
          message: `You do not have permission to perform this action (${permission})`,
          status: 403,
        })
      }
    },

    requireAnyPermission(permissions: Permission[]): void {
      const hasAny = permissions.some((p) => context.permissions.has(p))
      if (!hasAny) {
        throw new ApiErrorClass({
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action',
          status: 403,
        })
      }
    },

    requireAllPermissions(permissions: Permission[]): void {
      const hasAll = permissions.every((p) => context.permissions.has(p))
      if (!hasAll) {
        throw new ApiErrorClass({
          code: 'FORBIDDEN',
          message: 'You do not have all required permissions for this action',
          status: 403,
        })
      }
    },

    requireOwnershipOrAdmin(ownerId: string): void {
      const isOwnerOrCreator = context.userId === ownerId
      const hasAdminAccess = isAdminRole(context.role)

      if (!isOwnerOrCreator && !hasAdminAccess) {
        throw new ApiErrorClass({
          code: 'FORBIDDEN',
          message: 'You can only modify your own resources',
          status: 403,
        })
      }
    },

    requireSameCompany(companyId: string): void {
      // Admin can access any company
      if (context.role === 'admin') return

      if (context.companyId !== companyId) {
        throw new ApiErrorClass({
          code: 'FORBIDDEN',
          message: 'You cannot access resources from another company',
          status: 403,
        })
      }
    },

    requireMinimumRole(role: UserRole): void {
      if (!hasEqualOrHigherAccess(context.role, role)) {
        throw new ApiErrorClass({
          code: 'FORBIDDEN',
          message: `This action requires ${role} access or higher`,
          status: 403,
        })
      }
    },

    isOwner(ownerId: string): boolean {
      return context.userId === ownerId
    },

    isSameCompany(companyId: string): boolean {
      return context.companyId === companyId
    },
  }
}

// ============================================================================
// Service Authorization Helpers
// ============================================================================

/**
 * Authorization config for CRUD services
 */
export interface ServiceAuthConfig {
  /** Permission required to view entities */
  viewPermission: Permission
  /** Permission required to create entities */
  createPermission: Permission
  /** Permission required to edit entities */
  editPermission: Permission
  /** Permission required to delete entities */
  deletePermission: Permission
  /** If true, users can only edit their own entities */
  ownershipRequired?: boolean
  /** Field name for owner ID (default: 'created_by') */
  ownerField?: string
  /** Field name for company ID (default: 'company_id') */
  companyField?: string
}

/**
 * Create authorization hooks for a CRUD service
 *
 * @example
 * const authHooks = createServiceAuthHooks({
 *   viewPermission: 'tasks.view',
 *   createPermission: 'tasks.create',
 *   editPermission: 'tasks.edit',
 *   deletePermission: 'tasks.delete',
 *   ownershipRequired: false,
 * })
 *
 * const taskService = createCrudService({
 *   ...authHooks.getHooks(getUserProfile),
 * })
 */
export function createServiceAuthHooks<T extends { id: string }>(
  config: ServiceAuthConfig
) {
  const {
    createPermission,
    editPermission,
    deletePermission,
    ownershipRequired = false,
    ownerField = 'created_by',
    companyField = 'company_id',
  } = config

  return {
    /**
     * Get hook functions for the service
     * @param getUserProfile Function to get current user profile
     */
    getHooks(getUserProfile: () => UserProfile | null) {
      return {
        beforeCreate: async (data: Record<string, unknown>) => {
          const guard = createAuthGuard(getUserProfile())
          guard.requirePermission(createPermission)

          // Inject owner and company if not set
          const userProfile = getUserProfile()
          if (userProfile) {
            if (!data[ownerField]) {
              data[ownerField] = userProfile.id
            }
            if (!data[companyField] && userProfile.company_id) {
              data[companyField] = userProfile.company_id
            }
          }

          return data
        },

        beforeUpdate: async (id: string, data: Record<string, unknown>, entity?: T) => {
          const guard = createAuthGuard(getUserProfile())
          guard.requirePermission(editPermission)

          // Check ownership if required and entity is provided
          if (ownershipRequired && entity && !isAdminRole(guard.context.role)) {
            const entityOwnerId = (entity as Record<string, unknown>)[ownerField] as string
            if (entityOwnerId) {
              guard.requireOwnershipOrAdmin(entityOwnerId)
            }
          }

          return data
        },

        beforeDelete: async (id: string, entity: T) => {
          const guard = createAuthGuard(getUserProfile())
          guard.requirePermission(deletePermission)

          // Check ownership if required
          if (ownershipRequired && !isAdminRole(guard.context.role)) {
            const entityOwnerId = (entity as Record<string, unknown>)[ownerField] as string
            if (entityOwnerId) {
              guard.requireOwnershipOrAdmin(entityOwnerId)
            }
          }
        },
      }
    },
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Types re-exported for convenience
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,

  // Functions
  hasPermission,
  getRolePermissions,
  hasEqualOrHigherAccess,
  getRoleLevel,
  isAdminRole,
  isManagementRole,
  createAuthContext,
  createAuthGuard,
  createServiceAuthHooks,
}
