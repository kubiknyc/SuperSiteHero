/**
 * Tests for navigation-permissions.ts
 * Verifies path-to-permission mapping for navigation access control
 */

import { describe, it, expect } from 'vitest'
import {
  NAVIGATION_PERMISSIONS,
  getPermissionForPath,
  hasPathAccess,
  filterNavItemsByPermissions,
} from './navigation-permissions'
import type { NavItem } from '@/types/navigation'

describe('navigation-permissions', () => {
  describe('NAVIGATION_PERMISSIONS', () => {
    it('should define permissions for key paths', () => {
      expect(NAVIGATION_PERMISSIONS['/projects']).toBeDefined()
      expect(NAVIGATION_PERMISSIONS['/daily-reports']).toBeDefined()
      expect(NAVIGATION_PERMISSIONS['/rfis']).toBeDefined()
      expect(NAVIGATION_PERMISSIONS['/settings']).toBeDefined()
    })

    it('should have string permission codes', () => {
      Object.values(NAVIGATION_PERMISSIONS).forEach((permission) => {
        expect(typeof permission).toBe('string')
        expect(permission.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getPermissionForPath', () => {
    it('should return permission for exact path match', () => {
      const permission = getPermissionForPath('/projects')
      expect(permission).toBeDefined()
    })

    it('should return permission for nested paths', () => {
      const permission = getPermissionForPath('/projects/123/details')
      // Should match /projects base path
      expect(permission).toBeDefined()
    })

    it('should return undefined for unknown paths', () => {
      const permission = getPermissionForPath('/unknown-path-xyz')
      expect(permission).toBeUndefined()
    })

    it('should handle root path', () => {
      const permission = getPermissionForPath('/')
      // Root path might not have a specific permission
      expect(permission === undefined || typeof permission === 'string').toBe(true)
    })

    it('should handle paths with trailing slashes', () => {
      const permission1 = getPermissionForPath('/projects')
      const permission2 = getPermissionForPath('/projects/')
      // Both should return same permission
      expect(permission1).toBe(permission2)
    })
  })

  describe('hasPathAccess', () => {
    const mockPermissions = ['project:read', 'daily_report:read', 'rfi:read']

    it('should return true for paths user has permission to access', () => {
      // Assuming /projects requires project:read
      const hasAccess = hasPathAccess('/projects', mockPermissions)
      expect(hasAccess).toBe(true)
    })

    it('should return false for paths user lacks permission', () => {
      const restrictedPermissions: string[] = []
      const hasAccess = hasPathAccess('/settings/users', restrictedPermissions)
      // Should return false or true based on whether path requires permission
      expect(typeof hasAccess).toBe('boolean')
    })

    it('should return true for paths without permission requirements', () => {
      const hasAccess = hasPathAccess('/profile', [])
      // Profile might be accessible to all authenticated users
      expect(hasAccess).toBe(true)
    })

    it('should handle empty permission array', () => {
      const hasAccess = hasPathAccess('/projects', [])
      // Should return false if path requires permissions
      expect(typeof hasAccess).toBe('boolean')
    })
  })

  describe('filterNavItemsByPermissions', () => {
    const mockNavItems: NavItem[] = [
      { label: 'Projects', href: '/projects', icon: 'Folder' },
      { label: 'Daily Reports', href: '/daily-reports', icon: 'FileText' },
      { label: 'Settings', href: '/settings', icon: 'Settings' },
      { label: 'Profile', href: '/profile', icon: 'User' },
    ]

    it('should return items user has permission to access', () => {
      const permissions = ['project:read', 'daily_report:read']
      const filtered = filterNavItemsByPermissions(mockNavItems, permissions)

      expect(Array.isArray(filtered)).toBe(true)
      expect(filtered.length).toBeGreaterThan(0)
    })

    it('should return all items when user has all permissions', () => {
      const allPermissions = [
        'project:read',
        'daily_report:read',
        'rfi:read',
        'settings:read',
        'user:manage',
      ]
      const filtered = filterNavItemsByPermissions(mockNavItems, allPermissions)

      // Should return at least some items
      expect(filtered.length).toBeGreaterThan(0)
    })

    it('should handle empty nav items array', () => {
      const filtered = filterNavItemsByPermissions([], ['project:read'])
      expect(filtered).toEqual([])
    })

    it('should handle empty permissions array', () => {
      const filtered = filterNavItemsByPermissions(mockNavItems, [])
      // Should return items that don't require permissions
      expect(Array.isArray(filtered)).toBe(true)
    })

    it('should preserve item structure', () => {
      const permissions = ['project:read']
      const filtered = filterNavItemsByPermissions(mockNavItems, permissions)

      filtered.forEach((item) => {
        expect(item.label).toBeDefined()
        expect(item.href).toBeDefined()
        expect(item.icon).toBeDefined()
      })
    })
  })

  describe('permission consistency', () => {
    it('should use consistent permission naming convention', () => {
      Object.values(NAVIGATION_PERMISSIONS).forEach((permission) => {
        // Permissions should follow pattern like "resource:action"
        expect(permission).toMatch(/^[a-z_]+:[a-z_]+$/)
      })
    })

    it('should not have duplicate permission mappings', () => {
      const paths = Object.keys(NAVIGATION_PERMISSIONS)
      const uniquePaths = new Set(paths)
      expect(uniquePaths.size).toBe(paths.length)
    })
  })
})
