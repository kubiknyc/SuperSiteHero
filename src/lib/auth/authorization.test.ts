/**
 * Authorization Utility Tests
 *
 * Tests for the service-level authorization system including:
 * - Permission checks
 * - Role hierarchy
 * - Authorization guards
 * - Service hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  hasPermission,
  getRolePermissions,
  hasEqualOrHigherAccess,
  getRoleLevel,
  isAdminRole,
  isManagementRole,
  createAuthContext,
  createAuthGuard,
  createServiceAuthHooks,
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  type UserRole,
  type Permission,
} from './authorization'
import type { UserProfile } from '@/types'

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  company_id: 'company-123',
  role: 'project_manager',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
} as UserProfile)

// ============================================================================
// Role Hierarchy Tests
// ============================================================================

describe('Role Hierarchy', () => {
  it('should define all standard roles', () => {
    const expectedRoles: UserRole[] = [
      'admin',
      'company_admin',
      'owner',
      'project_manager',
      'superintendent',
      'foreman',
      'field_worker',
      'subcontractor',
      'viewer',
      'client',
    ]

    expectedRoles.forEach((role) => {
      expect(ROLE_HIERARCHY[role]).toBeDefined()
      expect(ROLE_HIERARCHY[role].level).toBeGreaterThan(0)
      expect(ROLE_HIERARCHY[role].description).toBeTruthy()
    })
  })

  it('should have correct hierarchy levels', () => {
    expect(ROLE_HIERARCHY.admin.level).toBeGreaterThan(ROLE_HIERARCHY.company_admin.level)
    expect(ROLE_HIERARCHY.company_admin.level).toBeGreaterThan(ROLE_HIERARCHY.project_manager.level)
    expect(ROLE_HIERARCHY.project_manager.level).toBeGreaterThan(ROLE_HIERARCHY.superintendent.level)
    expect(ROLE_HIERARCHY.superintendent.level).toBeGreaterThan(ROLE_HIERARCHY.foreman.level)
    expect(ROLE_HIERARCHY.foreman.level).toBeGreaterThan(ROLE_HIERARCHY.field_worker.level)
    expect(ROLE_HIERARCHY.field_worker.level).toBeGreaterThan(ROLE_HIERARCHY.viewer.level)
  })

  it('should treat owner and company_admin as equal', () => {
    expect(ROLE_HIERARCHY.owner.level).toBe(ROLE_HIERARCHY.company_admin.level)
  })
})

// ============================================================================
// Permission Tests
// ============================================================================

describe('hasPermission', () => {
  it('should grant admin all permissions', () => {
    const adminPermissions: Permission[] = [
      'projects.view',
      'projects.create',
      'projects.edit',
      'projects.delete',
      'admin.system',
      'admin.audit_logs',
    ]

    adminPermissions.forEach((permission) => {
      expect(hasPermission('admin', permission)).toBe(true)
    })
  })

  it('should restrict viewer to read-only access', () => {
    expect(hasPermission('viewer', 'projects.view')).toBe(true)
    expect(hasPermission('viewer', 'daily_reports.view')).toBe(true)
    expect(hasPermission('viewer', 'projects.create')).toBe(false)
    expect(hasPermission('viewer', 'projects.edit')).toBe(false)
    expect(hasPermission('viewer', 'projects.delete')).toBe(false)
  })

  it('should allow field workers to create daily reports', () => {
    expect(hasPermission('field_worker', 'daily_reports.view')).toBe(true)
    expect(hasPermission('field_worker', 'daily_reports.create')).toBe(true)
    expect(hasPermission('field_worker', 'daily_reports.edit')).toBe(false)
    expect(hasPermission('field_worker', 'daily_reports.approve')).toBe(false)
  })

  it('should restrict change order approval to admin-level roles', () => {
    expect(hasPermission('company_admin', 'change_orders.approve')).toBe(true)
    expect(hasPermission('owner', 'change_orders.approve')).toBe(true)
    expect(hasPermission('admin', 'change_orders.approve')).toBe(true)
    expect(hasPermission('project_manager', 'change_orders.approve')).toBe(false)
    expect(hasPermission('superintendent', 'change_orders.approve')).toBe(false)
  })

  it('should return false for undefined permissions', () => {
    expect(hasPermission('admin', 'nonexistent.permission' as Permission)).toBe(false)
  })
})

describe('getRolePermissions', () => {
  it('should return all permissions for admin', () => {
    const adminPermissions = getRolePermissions('admin')
    expect(adminPermissions.length).toBeGreaterThan(0)
    expect(adminPermissions).toContain('admin.system')
    expect(adminPermissions).toContain('projects.delete')
  })

  it('should return limited permissions for viewer', () => {
    const viewerPermissions = getRolePermissions('viewer')
    const viewPermissions = viewerPermissions.filter((p) => p.includes('.view'))
    const createPermissions = viewerPermissions.filter((p) => p.includes('.create'))

    expect(viewPermissions.length).toBeGreaterThan(0)
    expect(createPermissions.length).toBe(0)
  })

  it('should return more permissions for higher roles', () => {
    const viewerPerms = getRolePermissions('viewer').length
    const workerPerms = getRolePermissions('field_worker').length
    const foremanPerms = getRolePermissions('foreman').length
    const pmPerms = getRolePermissions('project_manager').length

    expect(workerPerms).toBeGreaterThanOrEqual(viewerPerms)
    expect(foremanPerms).toBeGreaterThanOrEqual(workerPerms)
    expect(pmPerms).toBeGreaterThanOrEqual(foremanPerms)
  })
})

// ============================================================================
// Role Comparison Tests
// ============================================================================

describe('hasEqualOrHigherAccess', () => {
  it('should return true when roles are equal', () => {
    expect(hasEqualOrHigherAccess('admin', 'admin')).toBe(true)
    expect(hasEqualOrHigherAccess('foreman', 'foreman')).toBe(true)
  })

  it('should return true when first role is higher', () => {
    expect(hasEqualOrHigherAccess('admin', 'viewer')).toBe(true)
    expect(hasEqualOrHigherAccess('project_manager', 'foreman')).toBe(true)
    expect(hasEqualOrHigherAccess('superintendent', 'field_worker')).toBe(true)
  })

  it('should return false when first role is lower', () => {
    expect(hasEqualOrHigherAccess('viewer', 'admin')).toBe(false)
    expect(hasEqualOrHigherAccess('foreman', 'project_manager')).toBe(false)
    expect(hasEqualOrHigherAccess('field_worker', 'superintendent')).toBe(false)
  })
})

describe('getRoleLevel', () => {
  it('should return correct levels for each role', () => {
    expect(getRoleLevel('admin')).toBe(100)
    expect(getRoleLevel('company_admin')).toBe(90)
    expect(getRoleLevel('viewer')).toBe(10)
  })

  it('should return 0 for unknown roles', () => {
    expect(getRoleLevel('unknown' as UserRole)).toBe(0)
  })
})

describe('isAdminRole', () => {
  it('should return true for admin-level roles', () => {
    expect(isAdminRole('admin')).toBe(true)
    expect(isAdminRole('company_admin')).toBe(true)
    expect(isAdminRole('owner')).toBe(true)
  })

  it('should return false for non-admin roles', () => {
    expect(isAdminRole('project_manager')).toBe(false)
    expect(isAdminRole('superintendent')).toBe(false)
    expect(isAdminRole('viewer')).toBe(false)
  })
})

describe('isManagementRole', () => {
  it('should return true for management-level roles', () => {
    expect(isManagementRole('admin')).toBe(true)
    expect(isManagementRole('company_admin')).toBe(true)
    expect(isManagementRole('project_manager')).toBe(true)
    expect(isManagementRole('superintendent')).toBe(true)
  })

  it('should return false for non-management roles', () => {
    expect(isManagementRole('foreman')).toBe(false)
    expect(isManagementRole('field_worker')).toBe(false)
    expect(isManagementRole('viewer')).toBe(false)
  })
})

// ============================================================================
// Auth Context Tests
// ============================================================================

describe('createAuthContext', () => {
  it('should create context from user profile', () => {
    const profile = createMockUserProfile({ role: 'project_manager' })
    const context = createAuthContext(profile)

    expect(context).not.toBeNull()
    expect(context!.userId).toBe('user-123')
    expect(context!.companyId).toBe('company-123')
    expect(context!.role).toBe('project_manager')
    expect(context!.permissions.has('projects.edit')).toBe(true)
  })

  it('should return null for null profile', () => {
    expect(createAuthContext(null)).toBeNull()
  })

  it('should default to viewer role if role is undefined', () => {
    const profile = createMockUserProfile({ role: undefined })
    const context = createAuthContext(profile)

    expect(context!.role).toBe('viewer')
  })

  it('should populate permissions based on role', () => {
    const adminProfile = createMockUserProfile({ role: 'admin' })
    const viewerProfile = createMockUserProfile({ role: 'viewer' })

    const adminContext = createAuthContext(adminProfile)
    const viewerContext = createAuthContext(viewerProfile)

    expect(adminContext!.permissions.size).toBeGreaterThan(viewerContext!.permissions.size)
    expect(adminContext!.permissions.has('admin.system')).toBe(true)
    expect(viewerContext!.permissions.has('admin.system')).toBe(false)
  })
})

// ============================================================================
// Auth Guard Tests
// ============================================================================

describe('createAuthGuard', () => {
  describe('with valid user', () => {
    it('should check permissions with can()', () => {
      const profile = createMockUserProfile({ role: 'project_manager' })
      const guard = createAuthGuard(profile)

      expect(guard.can('projects.edit')).toBe(true)
      expect(guard.can('admin.system')).toBe(false)
    })

    it('should throw on requirePermission if not authorized', () => {
      const profile = createMockUserProfile({ role: 'viewer' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requirePermission('projects.edit')).toThrow()
    })

    it('should not throw on requirePermission if authorized', () => {
      const profile = createMockUserProfile({ role: 'project_manager' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requirePermission('projects.edit')).not.toThrow()
    })

    it('should check any permission with requireAnyPermission', () => {
      const profile = createMockUserProfile({ role: 'field_worker' })
      const guard = createAuthGuard(profile)

      // field_worker can view but not create projects
      expect(() =>
        guard.requireAnyPermission(['projects.view', 'projects.create'])
      ).not.toThrow()
    })

    it('should throw when no permissions match in requireAnyPermission', () => {
      const profile = createMockUserProfile({ role: 'viewer' })
      const guard = createAuthGuard(profile)

      expect(() =>
        guard.requireAnyPermission(['projects.create', 'projects.edit'])
      ).toThrow()
    })

    it('should check all permissions with requireAllPermissions', () => {
      const profile = createMockUserProfile({ role: 'project_manager' })
      const guard = createAuthGuard(profile)

      expect(() =>
        guard.requireAllPermissions(['projects.view', 'projects.edit'])
      ).not.toThrow()
    })

    it('should throw when not all permissions match', () => {
      const profile = createMockUserProfile({ role: 'project_manager' })
      const guard = createAuthGuard(profile)

      expect(() =>
        guard.requireAllPermissions(['projects.edit', 'admin.system'])
      ).toThrow()
    })
  })

  describe('ownership checks', () => {
    it('should allow owner to pass ownership check', () => {
      const profile = createMockUserProfile({ id: 'user-123', role: 'field_worker' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requireOwnershipOrAdmin('user-123')).not.toThrow()
    })

    it('should allow admin to pass ownership check for any resource', () => {
      const profile = createMockUserProfile({ id: 'admin-user', role: 'admin' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requireOwnershipOrAdmin('other-user-id')).not.toThrow()
    })

    it('should throw for non-owner non-admin', () => {
      const profile = createMockUserProfile({ id: 'user-123', role: 'field_worker' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requireOwnershipOrAdmin('other-user-id')).toThrow()
    })

    it('should correctly identify owner', () => {
      const profile = createMockUserProfile({ id: 'user-123' })
      const guard = createAuthGuard(profile)

      expect(guard.isOwner('user-123')).toBe(true)
      expect(guard.isOwner('other-user')).toBe(false)
    })
  })

  describe('company checks', () => {
    it('should allow user in same company', () => {
      const profile = createMockUserProfile({ company_id: 'company-123', role: 'field_worker' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requireSameCompany('company-123')).not.toThrow()
    })

    it('should throw for user in different company', () => {
      const profile = createMockUserProfile({ company_id: 'company-123', role: 'field_worker' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requireSameCompany('other-company')).toThrow()
    })

    it('should allow admin to access any company', () => {
      const profile = createMockUserProfile({ company_id: 'company-123', role: 'admin' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requireSameCompany('other-company')).not.toThrow()
    })

    it('should correctly identify same company', () => {
      const profile = createMockUserProfile({ company_id: 'company-123' })
      const guard = createAuthGuard(profile)

      expect(guard.isSameCompany('company-123')).toBe(true)
      expect(guard.isSameCompany('other-company')).toBe(false)
    })
  })

  describe('minimum role checks', () => {
    it('should pass for equal role', () => {
      const profile = createMockUserProfile({ role: 'project_manager' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requireMinimumRole('project_manager')).not.toThrow()
    })

    it('should pass for higher role', () => {
      const profile = createMockUserProfile({ role: 'admin' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requireMinimumRole('project_manager')).not.toThrow()
    })

    it('should throw for lower role', () => {
      const profile = createMockUserProfile({ role: 'field_worker' })
      const guard = createAuthGuard(profile)

      expect(() => guard.requireMinimumRole('project_manager')).toThrow()
    })
  })

  describe('with null user', () => {
    it('should return guard that always fails', () => {
      const guard = createAuthGuard(null)

      expect(guard.can('projects.view')).toBe(false)
      expect(() => guard.requirePermission('projects.view')).toThrow()
    })

    it('should throw 401 errors for null user', () => {
      const guard = createAuthGuard(null)

      try {
        guard.requirePermission('projects.view')
      } catch (error: unknown) {
        expect((error as { code: string }).code).toBe('AUTH_REQUIRED')
      }
    })
  })
})

// ============================================================================
// Service Auth Hooks Tests
// ============================================================================

describe('createServiceAuthHooks', () => {
  it('should create hooks with permission checks', async () => {
    const mockProfile = createMockUserProfile({ role: 'project_manager' })
    const getUserProfile = () => mockProfile

    const authHooks = createServiceAuthHooks({
      viewPermission: 'tasks.view',
      createPermission: 'tasks.create',
      editPermission: 'tasks.edit',
      deletePermission: 'tasks.delete',
    })

    const hooks = authHooks.getHooks(getUserProfile)

    // Project manager has tasks.create permission
    const result = await hooks.beforeCreate({ title: 'Test Task' })
    expect(result.created_by).toBe('user-123')
    expect(result.company_id).toBe('company-123')
  })

  it('should throw on beforeCreate without permission', async () => {
    const mockProfile = createMockUserProfile({ role: 'viewer' })
    const getUserProfile = () => mockProfile

    const authHooks = createServiceAuthHooks({
      viewPermission: 'tasks.view',
      createPermission: 'tasks.create',
      editPermission: 'tasks.edit',
      deletePermission: 'tasks.delete',
    })

    const hooks = authHooks.getHooks(getUserProfile)

    await expect(hooks.beforeCreate({ title: 'Test Task' })).rejects.toThrow()
  })

  it('should inject owner and company on create', async () => {
    const mockProfile = createMockUserProfile({
      id: 'user-456',
      company_id: 'company-789',
      role: 'project_manager',
    })
    const getUserProfile = () => mockProfile

    const authHooks = createServiceAuthHooks({
      viewPermission: 'tasks.view',
      createPermission: 'tasks.create',
      editPermission: 'tasks.edit',
      deletePermission: 'tasks.delete',
    })

    const hooks = authHooks.getHooks(getUserProfile)
    const result = await hooks.beforeCreate({ title: 'New Task' })

    expect(result.created_by).toBe('user-456')
    expect(result.company_id).toBe('company-789')
  })

  it('should not override existing owner/company', async () => {
    const mockProfile = createMockUserProfile({ role: 'project_manager' })
    const getUserProfile = () => mockProfile

    const authHooks = createServiceAuthHooks({
      viewPermission: 'tasks.view',
      createPermission: 'tasks.create',
      editPermission: 'tasks.edit',
      deletePermission: 'tasks.delete',
    })

    const hooks = authHooks.getHooks(getUserProfile)
    const result = await hooks.beforeCreate({
      title: 'New Task',
      created_by: 'existing-user',
      company_id: 'existing-company',
    })

    expect(result.created_by).toBe('existing-user')
    expect(result.company_id).toBe('existing-company')
  })

  it('should check edit permission on beforeUpdate', async () => {
    const mockProfile = createMockUserProfile({ role: 'viewer' })
    const getUserProfile = () => mockProfile

    const authHooks = createServiceAuthHooks({
      viewPermission: 'tasks.view',
      createPermission: 'tasks.create',
      editPermission: 'tasks.edit',
      deletePermission: 'tasks.delete',
    })

    const hooks = authHooks.getHooks(getUserProfile)

    await expect(hooks.beforeUpdate('task-1', { title: 'Updated' })).rejects.toThrow()
  })

  it('should check delete permission on beforeDelete', async () => {
    const mockProfile = createMockUserProfile({ role: 'field_worker' })
    const getUserProfile = () => mockProfile

    const authHooks = createServiceAuthHooks({
      viewPermission: 'tasks.view',
      createPermission: 'tasks.create',
      editPermission: 'tasks.edit',
      deletePermission: 'tasks.delete',
    })

    const hooks = authHooks.getHooks(getUserProfile)
    const entity = { id: 'task-1', created_by: 'other-user' }

    await expect(hooks.beforeDelete('task-1', entity)).rejects.toThrow()
  })

  it('should enforce ownership when configured', async () => {
    const mockProfile = createMockUserProfile({
      id: 'user-123',
      role: 'foreman', // Has edit permission but not admin
    })
    const getUserProfile = () => mockProfile

    const authHooks = createServiceAuthHooks({
      viewPermission: 'tasks.view',
      createPermission: 'tasks.create',
      editPermission: 'tasks.edit',
      deletePermission: 'tasks.delete',
      ownershipRequired: true,
    })

    const hooks = authHooks.getHooks(getUserProfile)

    // Should fail for non-owned entity
    const otherEntity = { id: 'task-1', created_by: 'other-user' }
    await expect(
      hooks.beforeUpdate('task-1', { title: 'Updated' }, otherEntity)
    ).rejects.toThrow()

    // Should succeed for owned entity
    const ownedEntity = { id: 'task-2', created_by: 'user-123' }
    await expect(
      hooks.beforeUpdate('task-2', { title: 'Updated' }, ownedEntity)
    ).resolves.not.toThrow()
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty permission matrix gracefully', () => {
    expect(hasPermission('admin', 'fake.permission' as Permission)).toBe(false)
  })

  it('should handle undefined company_id in profile', () => {
    const profile = createMockUserProfile({ company_id: undefined })
    const context = createAuthContext(profile)

    expect(context!.companyId).toBe('')
  })

  it('should handle role as owner correctly', () => {
    const profile = createMockUserProfile({ role: 'owner' })
    const guard = createAuthGuard(profile)

    expect(guard.can('company.settings')).toBe(true)
    expect(guard.can('change_orders.approve')).toBe(true)
  })

  it('should handle subcontractor permissions correctly', () => {
    const profile = createMockUserProfile({ role: 'subcontractor' })
    const guard = createAuthGuard(profile)

    expect(guard.can('rfis.view')).toBe(true)
    expect(guard.can('rfis.create')).toBe(true)
    expect(guard.can('projects.edit')).toBe(false)
    expect(guard.can('change_orders.view')).toBe(false)
  })

  it('should handle client role correctly', () => {
    const profile = createMockUserProfile({ role: 'client' })
    const guard = createAuthGuard(profile)

    expect(guard.can('projects.view')).toBe(true)
    expect(guard.can('submittals.view')).toBe(true)
    expect(guard.can('projects.edit')).toBe(false)
    expect(guard.can('daily_reports.create')).toBe(false)
  })
})
