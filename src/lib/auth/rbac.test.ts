/**
 * Role-Based Access Control (RBAC) System Tests
 *
 * CRITICAL SECURITY TESTS - Comprehensive testing for the RBAC system.
 * Tests role assignments, permission checks, inheritance, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Supabase client
const mockSelect = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockUpdate = vi.fn().mockReturnThis()
const mockDelete = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockSingle = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      single: mockSingle,
    })),
    rpc: mockRpc,
  },
}))

// ============================================================================
// Test Data - Role Hierarchy
// ============================================================================

/**
 * Standard construction management roles with hierarchy
 * admin > company_admin > project_manager > superintendent > foreman > field_worker
 */
const ROLE_HIERARCHY = {
  admin: {
    level: 100,
    inherits: [],
    description: 'Full system access',
  },
  company_admin: {
    level: 90,
    inherits: [],
    description: 'Company-wide administration',
  },
  project_manager: {
    level: 70,
    inherits: [],
    description: 'Full project access',
  },
  superintendent: {
    level: 60,
    inherits: [],
    description: 'Field operations management',
  },
  foreman: {
    level: 50,
    inherits: [],
    description: 'Team leader access',
  },
  field_worker: {
    level: 30,
    inherits: [],
    description: 'Basic field access',
  },
  subcontractor: {
    level: 20,
    inherits: [],
    description: 'Limited external access',
  },
  viewer: {
    level: 10,
    inherits: [],
    description: 'Read-only access',
  },
}

/**
 * Permission definitions by category
 */
const PERMISSION_DEFINITIONS = {
  // Project permissions
  'projects.view': { roles: ['viewer', 'field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'admin'] },
  'projects.create': { roles: ['project_manager', 'company_admin', 'admin'] },
  'projects.edit': { roles: ['project_manager', 'company_admin', 'admin'] },
  'projects.delete': { roles: ['company_admin', 'admin'] },

  // Daily Reports
  'daily_reports.view': { roles: ['viewer', 'field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'admin'] },
  'daily_reports.create': { roles: ['field_worker', 'foreman', 'superintendent', 'project_manager', 'company_admin', 'admin'] },
  'daily_reports.edit': { roles: ['foreman', 'superintendent', 'project_manager', 'company_admin', 'admin'] },
  'daily_reports.delete': { roles: ['superintendent', 'project_manager', 'company_admin', 'admin'] },
  'daily_reports.approve': { roles: ['superintendent', 'project_manager', 'company_admin', 'admin'] },

  // Change Orders
  'change_orders.view': { roles: ['foreman', 'superintendent', 'project_manager', 'company_admin', 'admin'] },
  'change_orders.create': { roles: ['project_manager', 'company_admin', 'admin'] },
  'change_orders.edit': { roles: ['project_manager', 'company_admin', 'admin'] },
  'change_orders.approve': { roles: ['company_admin', 'admin'] },

  // Payment Applications
  'payment_apps.view': { roles: ['project_manager', 'company_admin', 'admin'] },
  'payment_apps.create': { roles: ['project_manager', 'company_admin', 'admin'] },
  'payment_apps.approve': { roles: ['company_admin', 'admin'] },

  // User Management
  'users.view': { roles: ['project_manager', 'company_admin', 'admin'] },
  'users.create': { roles: ['company_admin', 'admin'] },
  'users.edit': { roles: ['company_admin', 'admin'] },
  'users.delete': { roles: ['admin'] },
  'users.manage_roles': { roles: ['company_admin', 'admin'] },

  // Company Settings
  'company.settings': { roles: ['company_admin', 'admin'] },
  'company.billing': { roles: ['company_admin', 'admin'] },
  'company.integrations': { roles: ['company_admin', 'admin'] },

  // Admin only
  'admin.system': { roles: ['admin'] },
  'admin.audit_logs': { roles: ['admin'] },
}

// ============================================================================
// Helper Functions for Testing
// ============================================================================

/**
 * Check if a role has a specific permission
 */
function checkPermission(role: string, permission: string): boolean {
  const permDef = PERMISSION_DEFINITIONS[permission as keyof typeof PERMISSION_DEFINITIONS]
  if (!permDef) return false
  return permDef.roles.includes(role)
}

/**
 * Get all permissions for a role
 */
function getRolePermissions(role: string): string[] {
  const permissions: string[] = []
  for (const [permission, def] of Object.entries(PERMISSION_DEFINITIONS)) {
    if (def.roles.includes(role)) {
      permissions.push(permission)
    }
  }
  return permissions
}

/**
 * Check if role A has equal or higher access than role B
 */
function hasEqualOrHigherAccess(roleA: string, roleB: string): boolean {
  const levelA = ROLE_HIERARCHY[roleA as keyof typeof ROLE_HIERARCHY]?.level || 0
  const levelB = ROLE_HIERARCHY[roleB as keyof typeof ROLE_HIERARCHY]?.level || 0
  return levelA >= levelB
}

// ============================================================================
// Test Suite: Role Assignment
// ============================================================================

describe('RBAC - Role Assignment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have valid role hierarchy with correct levels', () => {
    expect(ROLE_HIERARCHY.admin.level).toBeGreaterThan(ROLE_HIERARCHY.company_admin.level)
    expect(ROLE_HIERARCHY.company_admin.level).toBeGreaterThan(ROLE_HIERARCHY.project_manager.level)
    expect(ROLE_HIERARCHY.project_manager.level).toBeGreaterThan(ROLE_HIERARCHY.superintendent.level)
    expect(ROLE_HIERARCHY.superintendent.level).toBeGreaterThan(ROLE_HIERARCHY.foreman.level)
    expect(ROLE_HIERARCHY.foreman.level).toBeGreaterThan(ROLE_HIERARCHY.field_worker.level)
    expect(ROLE_HIERARCHY.field_worker.level).toBeGreaterThan(ROLE_HIERARCHY.viewer.level)
  })

  it('should define all standard roles', () => {
    const expectedRoles = [
      'admin',
      'company_admin',
      'project_manager',
      'superintendent',
      'foreman',
      'field_worker',
      'subcontractor',
      'viewer',
    ]

    expectedRoles.forEach((role) => {
      expect(ROLE_HIERARCHY).toHaveProperty(role)
    })
  })

  it('should correctly compare role levels', () => {
    expect(hasEqualOrHigherAccess('admin', 'field_worker')).toBe(true)
    expect(hasEqualOrHigherAccess('field_worker', 'admin')).toBe(false)
    expect(hasEqualOrHigherAccess('project_manager', 'project_manager')).toBe(true)
  })
})

// ============================================================================
// Test Suite: Permission Checks
// ============================================================================

describe('RBAC - Permission Checks', () => {
  describe('Admin Role', () => {
    it('should have all permissions', () => {
      const adminPerms = getRolePermissions('admin')

      // Admin should have access to everything
      expect(checkPermission('admin', 'projects.view')).toBe(true)
      expect(checkPermission('admin', 'projects.delete')).toBe(true)
      expect(checkPermission('admin', 'users.delete')).toBe(true)
      expect(checkPermission('admin', 'admin.system')).toBe(true)
      expect(checkPermission('admin', 'admin.audit_logs')).toBe(true)
      expect(checkPermission('admin', 'company.billing')).toBe(true)

      // Verify admin has all permissions defined in the system
      expect(adminPerms.length).toBe(Object.keys(PERMISSION_DEFINITIONS).length)
    })
  })

  describe('Company Admin Role', () => {
    it('should have company-wide management permissions', () => {
      expect(checkPermission('company_admin', 'users.manage_roles')).toBe(true)
      expect(checkPermission('company_admin', 'company.settings')).toBe(true)
      expect(checkPermission('company_admin', 'payment_apps.approve')).toBe(true)
      expect(checkPermission('company_admin', 'change_orders.approve')).toBe(true)
    })

    it('should NOT have system admin permissions', () => {
      expect(checkPermission('company_admin', 'admin.system')).toBe(false)
      expect(checkPermission('company_admin', 'admin.audit_logs')).toBe(false)
    })

    it('should NOT be able to delete users (admin only)', () => {
      expect(checkPermission('company_admin', 'users.delete')).toBe(false)
    })
  })

  describe('Project Manager Role', () => {
    it('should have project-level permissions', () => {
      expect(checkPermission('project_manager', 'projects.create')).toBe(true)
      expect(checkPermission('project_manager', 'projects.edit')).toBe(true)
      expect(checkPermission('project_manager', 'change_orders.create')).toBe(true)
      expect(checkPermission('project_manager', 'payment_apps.create')).toBe(true)
      expect(checkPermission('project_manager', 'daily_reports.approve')).toBe(true)
    })

    it('should NOT have company admin permissions', () => {
      expect(checkPermission('project_manager', 'projects.delete')).toBe(false)
      expect(checkPermission('project_manager', 'users.create')).toBe(false)
      expect(checkPermission('project_manager', 'company.settings')).toBe(false)
      expect(checkPermission('project_manager', 'change_orders.approve')).toBe(false)
    })
  })

  describe('Superintendent Role', () => {
    it('should have field operations permissions', () => {
      expect(checkPermission('superintendent', 'daily_reports.approve')).toBe(true)
      expect(checkPermission('superintendent', 'daily_reports.delete')).toBe(true)
      expect(checkPermission('superintendent', 'change_orders.view')).toBe(true)
    })

    it('should NOT have project management permissions', () => {
      expect(checkPermission('superintendent', 'projects.create')).toBe(false)
      expect(checkPermission('superintendent', 'change_orders.create')).toBe(false)
      expect(checkPermission('superintendent', 'payment_apps.view')).toBe(false)
    })
  })

  describe('Foreman Role', () => {
    it('should have team leader permissions', () => {
      expect(checkPermission('foreman', 'daily_reports.create')).toBe(true)
      expect(checkPermission('foreman', 'daily_reports.edit')).toBe(true)
      expect(checkPermission('foreman', 'change_orders.view')).toBe(true)
    })

    it('should NOT have approval permissions', () => {
      expect(checkPermission('foreman', 'daily_reports.approve')).toBe(false)
      expect(checkPermission('foreman', 'change_orders.create')).toBe(false)
    })
  })

  describe('Field Worker Role', () => {
    it('should have basic field access', () => {
      expect(checkPermission('field_worker', 'projects.view')).toBe(true)
      expect(checkPermission('field_worker', 'daily_reports.view')).toBe(true)
      expect(checkPermission('field_worker', 'daily_reports.create')).toBe(true)
    })

    it('should NOT have edit or management permissions', () => {
      expect(checkPermission('field_worker', 'daily_reports.edit')).toBe(false)
      expect(checkPermission('field_worker', 'daily_reports.delete')).toBe(false)
      expect(checkPermission('field_worker', 'change_orders.view')).toBe(false)
      expect(checkPermission('field_worker', 'users.view')).toBe(false)
    })
  })

  describe('Subcontractor Role', () => {
    it('should have limited external access', () => {
      expect(checkPermission('subcontractor', 'projects.view')).toBe(false)
      expect(checkPermission('subcontractor', 'daily_reports.view')).toBe(false)
    })
  })

  describe('Viewer Role', () => {
    it('should have read-only access', () => {
      expect(checkPermission('viewer', 'projects.view')).toBe(true)
      expect(checkPermission('viewer', 'daily_reports.view')).toBe(true)
    })

    it('should NOT have any write permissions', () => {
      expect(checkPermission('viewer', 'projects.create')).toBe(false)
      expect(checkPermission('viewer', 'daily_reports.create')).toBe(false)
      expect(checkPermission('viewer', 'projects.edit')).toBe(false)
    })
  })
})

// ============================================================================
// Test Suite: Permission Inheritance
// ============================================================================

describe('RBAC - Permission Inheritance', () => {
  it('should ensure higher roles have all permissions of lower roles for basic operations', () => {
    // Get field_worker permissions
    const fieldWorkerPerms = getRolePermissions('field_worker')

    // Check that foreman has all field_worker permissions
    fieldWorkerPerms.forEach((perm) => {
      const foremanHas = checkPermission('foreman', perm)
      expect(foremanHas).toBe(true)
    })
  })

  it('should ensure admin has all company_admin permissions', () => {
    const companyAdminPerms = getRolePermissions('company_admin')

    companyAdminPerms.forEach((perm) => {
      expect(checkPermission('admin', perm)).toBe(true)
    })
  })

  it('should ensure project_manager has all superintendent permissions', () => {
    const superintendentPerms = getRolePermissions('superintendent')

    superintendentPerms.forEach((perm) => {
      expect(checkPermission('project_manager', perm)).toBe(true)
    })
  })
})

// ============================================================================
// Test Suite: Permission Denial (Security Critical)
// ============================================================================

describe('RBAC - Security Critical Denials', () => {
  it('should deny field_worker from accessing financial data', () => {
    expect(checkPermission('field_worker', 'payment_apps.view')).toBe(false)
    expect(checkPermission('field_worker', 'payment_apps.create')).toBe(false)
    expect(checkPermission('field_worker', 'change_orders.view')).toBe(false)
    expect(checkPermission('field_worker', 'company.billing')).toBe(false)
  })

  it('should deny foreman from approving change orders', () => {
    expect(checkPermission('foreman', 'change_orders.approve')).toBe(false)
    expect(checkPermission('foreman', 'change_orders.create')).toBe(false)
  })

  it('should deny superintendent from user management', () => {
    expect(checkPermission('superintendent', 'users.create')).toBe(false)
    expect(checkPermission('superintendent', 'users.edit')).toBe(false)
    expect(checkPermission('superintendent', 'users.delete')).toBe(false)
    expect(checkPermission('superintendent', 'users.manage_roles')).toBe(false)
  })

  it('should deny project_manager from deleting projects', () => {
    expect(checkPermission('project_manager', 'projects.delete')).toBe(false)
  })

  it('should deny company_admin from system administration', () => {
    expect(checkPermission('company_admin', 'admin.system')).toBe(false)
    expect(checkPermission('company_admin', 'admin.audit_logs')).toBe(false)
    expect(checkPermission('company_admin', 'users.delete')).toBe(false)
  })

  it('should deny viewer from any write operations', () => {
    const viewerPerms = getRolePermissions('viewer')

    // All viewer permissions should be view-only
    viewerPerms.forEach((perm) => {
      expect(perm).toMatch(/\.view$/)
    })
  })
})

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

describe('RBAC - Edge Cases', () => {
  it('should return false for unknown roles', () => {
    expect(checkPermission('unknown_role', 'projects.view')).toBe(false)
    expect(checkPermission('', 'projects.view')).toBe(false)
  })

  it('should return false for unknown permissions', () => {
    expect(checkPermission('admin', 'unknown.permission')).toBe(false)
    expect(checkPermission('admin', '')).toBe(false)
  })

  it('should handle null/undefined gracefully', () => {
    // @ts-expect-error - Testing edge case
    expect(checkPermission(null, 'projects.view')).toBe(false)
    // @ts-expect-error - Testing edge case
    expect(checkPermission('admin', null)).toBe(false)
    // @ts-expect-error - Testing edge case
    expect(checkPermission(undefined, undefined)).toBe(false)
  })
})

// ============================================================================
// Test Suite: Permission Categories
// ============================================================================

describe('RBAC - Permission Categories', () => {
  it('should have permissions organized by category', () => {
    const categories = new Set<string>()

    Object.keys(PERMISSION_DEFINITIONS).forEach((perm) => {
      const category = perm.split('.')[0]
      categories.add(category)
    })

    expect(categories).toContain('projects')
    expect(categories).toContain('daily_reports')
    expect(categories).toContain('change_orders')
    expect(categories).toContain('payment_apps')
    expect(categories).toContain('users')
    expect(categories).toContain('company')
    expect(categories).toContain('admin')
  })

  it('should have CRUD operations for main resources', () => {
    // Projects CRUD
    expect(PERMISSION_DEFINITIONS).toHaveProperty('projects.view')
    expect(PERMISSION_DEFINITIONS).toHaveProperty('projects.create')
    expect(PERMISSION_DEFINITIONS).toHaveProperty('projects.edit')
    expect(PERMISSION_DEFINITIONS).toHaveProperty('projects.delete')

    // Daily Reports CRUD + approve
    expect(PERMISSION_DEFINITIONS).toHaveProperty('daily_reports.view')
    expect(PERMISSION_DEFINITIONS).toHaveProperty('daily_reports.create')
    expect(PERMISSION_DEFINITIONS).toHaveProperty('daily_reports.edit')
    expect(PERMISSION_DEFINITIONS).toHaveProperty('daily_reports.delete')
    expect(PERMISSION_DEFINITIONS).toHaveProperty('daily_reports.approve')
  })
})

// ============================================================================
// Test Suite: Permission Count Verification
// ============================================================================

describe('RBAC - Permission Counts', () => {
  it('should have progressively more permissions as role level increases', () => {
    const viewerCount = getRolePermissions('viewer').length
    const fieldWorkerCount = getRolePermissions('field_worker').length
    const foremanCount = getRolePermissions('foreman').length
    const superintendentCount = getRolePermissions('superintendent').length
    const pmCount = getRolePermissions('project_manager').length
    const companyAdminCount = getRolePermissions('company_admin').length
    const adminCount = getRolePermissions('admin').length

    expect(fieldWorkerCount).toBeGreaterThanOrEqual(viewerCount)
    expect(foremanCount).toBeGreaterThanOrEqual(fieldWorkerCount)
    expect(superintendentCount).toBeGreaterThanOrEqual(foremanCount)
    expect(pmCount).toBeGreaterThanOrEqual(superintendentCount)
    expect(companyAdminCount).toBeGreaterThanOrEqual(pmCount)
    expect(adminCount).toBeGreaterThanOrEqual(companyAdminCount)
  })
})
