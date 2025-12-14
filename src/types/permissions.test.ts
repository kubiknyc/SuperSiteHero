/**
 * Tests for Permission utility functions
 * CRITICAL for security - ensures permission checks work correctly
 */

import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  groupPermissionsByCategory,
  getCategoryLabel,
  getRoleInfo,
  formatRole,
  PERMISSION_CODES,
  DEFAULT_ROLES,
  type Permission,
  type ResolvedPermission,
  type PermissionCategory,
} from './permissions'

// =============================================
// Test Data
// =============================================

const createResolvedPermission = (
  code: string,
  granted: boolean
): ResolvedPermission => ({
  permission_code: code,
  permission_name: code.replace('.', ' ').replace(/_/g, ' '),
  category: code.split('.')[0] as PermissionCategory,
  granted,
  source: 'default_role',
})

const createPermission = (
  id: string,
  code: string,
  category: PermissionCategory,
  displayOrder: number = 0
): Permission => ({
  id,
  code,
  name: code.replace('.', ' ').replace(/_/g, ' '),
  description: null,
  category,
  subcategory: null,
  is_dangerous: false,
  requires_project_assignment: true,
  display_order: displayOrder,
  created_at: new Date().toISOString(),
})

// =============================================
// hasPermission Tests
// =============================================

describe('hasPermission', () => {
  it('should return true when permission is granted', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', true))

    expect(hasPermission(permissions, 'projects.view')).toBe(true)
  })

  it('should return false when permission is not granted', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', false))

    expect(hasPermission(permissions, 'projects.view')).toBe(false)
  })

  it('should return false when permission does not exist', () => {
    const permissions = new Map<string, ResolvedPermission>()

    expect(hasPermission(permissions, 'nonexistent.permission')).toBe(false)
  })

  it('should return false when permissions map is undefined', () => {
    expect(hasPermission(undefined, 'projects.view')).toBe(false)
  })

  it('should handle all PERMISSION_CODES', () => {
    const permissions = new Map<string, ResolvedPermission>()

    // Grant all permissions
    Object.values(PERMISSION_CODES).forEach(code => {
      permissions.set(code, createResolvedPermission(code, true))
    })

    // Verify all permissions are granted
    Object.values(PERMISSION_CODES).forEach(code => {
      expect(hasPermission(permissions, code)).toBe(true)
    })
  })
})

// =============================================
// hasAnyPermission Tests
// =============================================

describe('hasAnyPermission', () => {
  it('should return true when at least one permission is granted', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', true))
    permissions.set('projects.create', createResolvedPermission('projects.create', false))

    expect(
      hasAnyPermission(permissions, ['projects.view', 'projects.create'])
    ).toBe(true)
  })

  it('should return false when no permissions are granted', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', false))
    permissions.set('projects.create', createResolvedPermission('projects.create', false))

    expect(
      hasAnyPermission(permissions, ['projects.view', 'projects.create'])
    ).toBe(false)
  })

  it('should return false when permissions map is empty', () => {
    const permissions = new Map<string, ResolvedPermission>()

    expect(
      hasAnyPermission(permissions, ['projects.view', 'projects.create'])
    ).toBe(false)
  })

  it('should return false when permissions map is undefined', () => {
    expect(
      hasAnyPermission(undefined, ['projects.view', 'projects.create'])
    ).toBe(false)
  })

  it('should handle empty permission codes array', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', true))

    expect(hasAnyPermission(permissions, [])).toBe(false)
  })

  it('should return true when all permissions are granted', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', true))
    permissions.set('projects.create', createResolvedPermission('projects.create', true))

    expect(
      hasAnyPermission(permissions, ['projects.view', 'projects.create'])
    ).toBe(true)
  })
})

// =============================================
// hasAllPermissions Tests
// =============================================

describe('hasAllPermissions', () => {
  it('should return true when all permissions are granted', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', true))
    permissions.set('projects.create', createResolvedPermission('projects.create', true))

    expect(
      hasAllPermissions(permissions, ['projects.view', 'projects.create'])
    ).toBe(true)
  })

  it('should return false when not all permissions are granted', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', true))
    permissions.set('projects.create', createResolvedPermission('projects.create', false))

    expect(
      hasAllPermissions(permissions, ['projects.view', 'projects.create'])
    ).toBe(false)
  })

  it('should return false when any permission is missing', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', true))

    expect(
      hasAllPermissions(permissions, ['projects.view', 'projects.create'])
    ).toBe(false)
  })

  it('should return false when permissions map is undefined', () => {
    expect(
      hasAllPermissions(undefined, ['projects.view', 'projects.create'])
    ).toBe(false)
  })

  it('should return true when checking empty permissions array', () => {
    const permissions = new Map<string, ResolvedPermission>()

    // Empty array means "all zero permissions" which is vacuously true
    expect(hasAllPermissions(permissions, [])).toBe(true)
  })

  it('should handle single permission check', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set('projects.view', createResolvedPermission('projects.view', true))

    expect(hasAllPermissions(permissions, ['projects.view'])).toBe(true)
  })
})

// =============================================
// groupPermissionsByCategory Tests
// =============================================

describe('groupPermissionsByCategory', () => {
  it('should group permissions by category', () => {
    const permissions: Permission[] = [
      createPermission('1', 'projects.view', 'projects', 1),
      createPermission('2', 'projects.create', 'projects', 2),
      createPermission('3', 'rfis.view', 'rfis', 1),
      createPermission('4', 'safety.create', 'safety', 1),
    ]

    const grouped = groupPermissionsByCategory(permissions)

    expect(Object.keys(grouped)).toHaveLength(3)
    expect(grouped.projects).toHaveLength(2)
    expect(grouped.rfis).toHaveLength(1)
    expect(grouped.safety).toHaveLength(1)
  })

  it('should handle empty permissions array', () => {
    const grouped = groupPermissionsByCategory([])

    expect(Object.keys(grouped)).toHaveLength(0)
  })

  it('should handle single permission', () => {
    const permissions: Permission[] = [
      createPermission('1', 'projects.view', 'projects', 1),
    ]

    const grouped = groupPermissionsByCategory(permissions)

    expect(Object.keys(grouped)).toHaveLength(1)
    expect(grouped.projects).toHaveLength(1)
  })

  it('should maintain original permission objects', () => {
    const permission = createPermission('1', 'projects.view', 'projects', 1)
    const grouped = groupPermissionsByCategory([permission])

    expect(grouped.projects[0]).toBe(permission)
  })
})

// =============================================
// getCategoryLabel Tests
// =============================================

describe('getCategoryLabel', () => {
  it('should return correct labels for all categories', () => {
    const expectedLabels: Record<PermissionCategory, string> = {
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
    }

    Object.entries(expectedLabels).forEach(([category, label]) => {
      expect(getCategoryLabel(category as PermissionCategory)).toBe(label)
    })
  })

  it('should return the category itself for unknown categories', () => {
    // Type assertion to test edge case
    const unknownCategory = 'unknown_category' as PermissionCategory
    expect(getCategoryLabel(unknownCategory)).toBe('unknown_category')
  })
})

// =============================================
// getRoleInfo Tests
// =============================================

describe('getRoleInfo', () => {
  it('should return role info for all default roles', () => {
    DEFAULT_ROLES.forEach(role => {
      const info = getRoleInfo(role.value)
      expect(info).toBeDefined()
      expect(info?.label).toBe(role.label)
      expect(info?.description).toBe(role.description)
    })
  })

  it('should return owner role info', () => {
    const info = getRoleInfo('owner')
    expect(info).toMatchObject({
      label: 'Owner',
      description: 'Full access to all features and billing',
    })
  })

  it('should return admin role info', () => {
    const info = getRoleInfo('admin')
    expect(info).toMatchObject({
      label: 'Administrator',
      description: 'Full access except billing management',
    })
  })

  it('should return project_manager role info', () => {
    const info = getRoleInfo('project_manager')
    expect(info).toMatchObject({
      label: 'Project Manager',
      description: 'Manage assigned projects and teams',
    })
  })

  it('should return undefined for unknown roles', () => {
    // Type assertion to test edge case
    const unknownRole = 'unknown_role' as any
    expect(getRoleInfo(unknownRole)).toBeUndefined()
  })
})

// =============================================
// formatRole Tests
// =============================================

describe('formatRole', () => {
  it('should format default roles with their labels', () => {
    expect(formatRole('owner')).toBe('Owner')
    expect(formatRole('admin')).toBe('Administrator')
    expect(formatRole('project_manager')).toBe('Project Manager')
    expect(formatRole('superintendent')).toBe('Superintendent')
    expect(formatRole('foreman')).toBe('Foreman')
    expect(formatRole('worker')).toBe('Worker')
    expect(formatRole('subcontractor')).toBe('Subcontractor')
    expect(formatRole('client')).toBe('Client')
  })

  it('should convert snake_case custom roles to Title Case', () => {
    expect(formatRole('custom_role')).toBe('Custom Role')
    expect(formatRole('senior_project_manager')).toBe('Senior Project Manager')
    expect(formatRole('assistant_superintendent')).toBe('Assistant Superintendent')
  })

  it('should handle single word roles', () => {
    expect(formatRole('supervisor')).toBe('Supervisor')
  })
})

// =============================================
// PERMISSION_CODES Tests
// =============================================

describe('PERMISSION_CODES', () => {
  it('should have all expected project permissions', () => {
    expect(PERMISSION_CODES.PROJECTS_VIEW).toBe('projects.view')
    expect(PERMISSION_CODES.PROJECTS_CREATE).toBe('projects.create')
    expect(PERMISSION_CODES.PROJECTS_EDIT).toBe('projects.edit')
    expect(PERMISSION_CODES.PROJECTS_DELETE).toBe('projects.delete')
    expect(PERMISSION_CODES.PROJECTS_ARCHIVE).toBe('projects.archive')
  })

  it('should have all expected daily report permissions', () => {
    expect(PERMISSION_CODES.DAILY_REPORTS_VIEW).toBe('daily_reports.view')
    expect(PERMISSION_CODES.DAILY_REPORTS_CREATE).toBe('daily_reports.create')
    expect(PERMISSION_CODES.DAILY_REPORTS_EDIT).toBe('daily_reports.edit')
    expect(PERMISSION_CODES.DAILY_REPORTS_DELETE).toBe('daily_reports.delete')
    expect(PERMISSION_CODES.DAILY_REPORTS_APPROVE).toBe('daily_reports.approve')
  })

  it('should have all expected financial permissions', () => {
    expect(PERMISSION_CODES.FINANCIAL_VIEW).toBe('financial.view')
    expect(PERMISSION_CODES.FINANCIAL_EDIT).toBe('financial.edit')
    expect(PERMISSION_CODES.FINANCIAL_PAYMENT_APPS).toBe('financial.payment_apps')
    expect(PERMISSION_CODES.FINANCIAL_LIEN_WAIVERS).toBe('financial.lien_waivers')
    expect(PERMISSION_CODES.FINANCIAL_APPROVE).toBe('financial.approve')
  })

  it('should have all expected admin permissions', () => {
    expect(PERMISSION_CODES.ADMIN_COMPANY_SETTINGS).toBe('admin.company_settings')
    expect(PERMISSION_CODES.ADMIN_USER_MANAGEMENT).toBe('admin.user_management')
    expect(PERMISSION_CODES.ADMIN_ROLES).toBe('admin.roles')
    expect(PERMISSION_CODES.ADMIN_INTEGRATIONS).toBe('admin.integrations')
    expect(PERMISSION_CODES.ADMIN_BILLING).toBe('admin.billing')
  })

  it('should use consistent naming pattern (category.action)', () => {
    Object.values(PERMISSION_CODES).forEach(code => {
      expect(code).toMatch(/^[a-z_]+\.[a-z_]+$/)
    })
  })
})

// =============================================
// DEFAULT_ROLES Tests
// =============================================

describe('DEFAULT_ROLES', () => {
  it('should have all 8 default roles', () => {
    expect(DEFAULT_ROLES).toHaveLength(8)
  })

  it('should have owner as highest privilege role', () => {
    const owner = DEFAULT_ROLES.find(r => r.value === 'owner')
    expect(owner).toBeDefined()
    expect(owner?.description).toContain('Full access')
    expect(owner?.description).toContain('billing')
  })

  it('should have admin without billing access', () => {
    const admin = DEFAULT_ROLES.find(r => r.value === 'admin')
    expect(admin).toBeDefined()
    expect(admin?.description).toContain('except billing')
  })

  it('should have worker with minimal permissions', () => {
    const worker = DEFAULT_ROLES.find(r => r.value === 'worker')
    expect(worker).toBeDefined()
    expect(worker?.description).toContain('View')
    expect(worker?.description).toContain('submit')
  })

  it('should have subcontractor and client portal roles', () => {
    const subcontractor = DEFAULT_ROLES.find(r => r.value === 'subcontractor')
    const client = DEFAULT_ROLES.find(r => r.value === 'client')

    expect(subcontractor).toBeDefined()
    expect(subcontractor?.description).toContain('portal')

    expect(client).toBeDefined()
    expect(client?.description).toContain('portal')
  })

  it('should have all required properties for each role', () => {
    DEFAULT_ROLES.forEach(role => {
      expect(role).toHaveProperty('value')
      expect(role).toHaveProperty('label')
      expect(role).toHaveProperty('description')
      expect(typeof role.value).toBe('string')
      expect(typeof role.label).toBe('string')
      expect(typeof role.description).toBe('string')
    })
  })
})

// =============================================
// Security-Critical Tests
// =============================================

describe('Security-Critical Permission Checks', () => {
  it('should not grant access when permission is explicitly false', () => {
    const permissions = new Map<string, ResolvedPermission>()
    permissions.set(
      PERMISSION_CODES.ADMIN_BILLING,
      createResolvedPermission(PERMISSION_CODES.ADMIN_BILLING, false)
    )

    // Even with permission in map, if not granted, should return false
    expect(hasPermission(permissions, PERMISSION_CODES.ADMIN_BILLING)).toBe(false)
  })

  it('should handle dangerous permission checks correctly', () => {
    const dangerousPermissions = [
      PERMISSION_CODES.PROJECTS_DELETE,
      PERMISSION_CODES.DAILY_REPORTS_DELETE,
      PERMISSION_CODES.RFIS_DELETE,
      PERMISSION_CODES.SUBMITTALS_DELETE,
      PERMISSION_CODES.CHANGE_ORDERS_DELETE,
      PERMISSION_CODES.DOCUMENTS_DELETE,
      PERMISSION_CODES.ADMIN_BILLING,
    ]

    const permissions = new Map<string, ResolvedPermission>()

    // None of these should be granted without explicit grant
    dangerousPermissions.forEach(code => {
      expect(hasPermission(permissions, code)).toBe(false)
    })
  })

  it('should require all permissions for admin operations', () => {
    const adminPermissions = [
      PERMISSION_CODES.ADMIN_COMPANY_SETTINGS,
      PERMISSION_CODES.ADMIN_USER_MANAGEMENT,
      PERMISSION_CODES.ADMIN_ROLES,
    ]

    const permissions = new Map<string, ResolvedPermission>()
    // Grant only some admin permissions
    permissions.set(
      PERMISSION_CODES.ADMIN_COMPANY_SETTINGS,
      createResolvedPermission(PERMISSION_CODES.ADMIN_COMPANY_SETTINGS, true)
    )

    // hasAllPermissions should return false when not all are granted
    expect(hasAllPermissions(permissions, adminPermissions)).toBe(false)
  })

  it('should correctly check financial permissions hierarchy', () => {
    const permissions = new Map<string, ResolvedPermission>()

    // User can view but not approve
    permissions.set(
      PERMISSION_CODES.FINANCIAL_VIEW,
      createResolvedPermission(PERMISSION_CODES.FINANCIAL_VIEW, true)
    )
    permissions.set(
      PERMISSION_CODES.FINANCIAL_APPROVE,
      createResolvedPermission(PERMISSION_CODES.FINANCIAL_APPROVE, false)
    )

    expect(hasPermission(permissions, PERMISSION_CODES.FINANCIAL_VIEW)).toBe(true)
    expect(hasPermission(permissions, PERMISSION_CODES.FINANCIAL_APPROVE)).toBe(false)

    // Should have view OR approve
    expect(
      hasAnyPermission(permissions, [
        PERMISSION_CODES.FINANCIAL_VIEW,
        PERMISSION_CODES.FINANCIAL_APPROVE,
      ])
    ).toBe(true)

    // Should NOT have view AND approve
    expect(
      hasAllPermissions(permissions, [
        PERMISSION_CODES.FINANCIAL_VIEW,
        PERMISSION_CODES.FINANCIAL_APPROVE,
      ])
    ).toBe(false)
  })
})
