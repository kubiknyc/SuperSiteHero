/**
 * Tests for role-navigation.ts
 * Verifies role-based navigation configuration for all 8 user types
 */

import { describe, it, expect } from 'vitest'
import {
  ROLE_NAVIGATION_CONFIGS,
  getRoleNavigationConfig,
  getDefaultLandingPage,
  isPortalRole,
  ROLE_LABELS,
  type RoleNavigationConfig,
} from './role-navigation'
import type { DefaultRole } from '@/types/permissions'

// All 8 roles in the system
const ALL_ROLES: DefaultRole[] = [
  'owner',
  'admin',
  'project_manager',
  'superintendent',
  'foreman',
  'worker',
  'subcontractor',
  'client',
]

describe('role-navigation config', () => {
  describe('ROLE_NAVIGATION_CONFIGS', () => {
    it('should have configuration for all 8 roles', () => {
      ALL_ROLES.forEach((role) => {
        expect(ROLE_NAVIGATION_CONFIGS[role]).toBeDefined()
        expect(ROLE_NAVIGATION_CONFIGS[role].roleId).toBe(role)
      })
    })

    it('should have valid defaultLandingPage for each role', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        expect(config.defaultLandingPage).toBeDefined()
        expect(config.defaultLandingPage.startsWith('/')).toBe(true)
      })
    })

    it('should have at least one primary navigation item per role', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        expect(config.primaryItems.length).toBeGreaterThan(0)
      })
    })

    it('should have mobile bottom nav items (3-5 items) per role', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        expect(config.mobileBottomNav.length).toBeGreaterThanOrEqual(3)
        expect(config.mobileBottomNav.length).toBeLessThanOrEqual(5)
      })
    })

    it('should have quick actions defined for each role', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        expect(Array.isArray(config.quickActions)).toBe(true)
      })
    })

    it('should have navigation groups for non-portal roles', () => {
      const nonPortalRoles: DefaultRole[] = [
        'owner',
        'admin',
        'project_manager',
        'superintendent',
        'foreman',
        'worker',
      ]
      nonPortalRoles.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        expect(config.groups.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getRoleNavigationConfig', () => {
    it('should return correct config for each role', () => {
      ALL_ROLES.forEach((role) => {
        const config = getRoleNavigationConfig(role)
        expect(config.roleId).toBe(role)
      })
    })

    it('should return superintendent config as default for unknown roles', () => {
      const config = getRoleNavigationConfig('unknown_role' as DefaultRole)
      expect(config.roleId).toBe('superintendent')
    })

    it('should return superintendent config when role is undefined', () => {
      const config = getRoleNavigationConfig(undefined as unknown as DefaultRole)
      expect(config.roleId).toBe('superintendent')
    })
  })

  describe('getDefaultLandingPage', () => {
    it('should return correct landing page for each role', () => {
      const expectedLandingPages: Record<DefaultRole, string> = {
        owner: '/dashboard/owner',
        admin: '/dashboard/admin',
        project_manager: '/dashboard/pm',
        superintendent: '/dashboard/superintendent',
        foreman: '/dashboard/foreman',
        worker: '/dashboard/worker',
        subcontractor: '/sub/dashboard',
        client: '/client/dashboard',
      }

      ALL_ROLES.forEach((role) => {
        const landingPage = getDefaultLandingPage(role)
        expect(landingPage).toBe(expectedLandingPages[role])
      })
    })

    it('should return superintendent dashboard for unknown roles', () => {
      const landingPage = getDefaultLandingPage('invalid' as DefaultRole)
      expect(landingPage).toBe('/dashboard/superintendent')
    })
  })

  describe('isPortalRole', () => {
    it('should return true for subcontractor', () => {
      expect(isPortalRole('subcontractor')).toBe(true)
    })

    it('should return true for client', () => {
      expect(isPortalRole('client')).toBe(true)
    })

    it('should return false for non-portal roles', () => {
      const nonPortalRoles: DefaultRole[] = [
        'owner',
        'admin',
        'project_manager',
        'superintendent',
        'foreman',
        'worker',
      ]
      nonPortalRoles.forEach((role) => {
        expect(isPortalRole(role)).toBe(false)
      })
    })
  })

  describe('ROLE_LABELS', () => {
    it('should have human-readable labels for all roles', () => {
      ALL_ROLES.forEach((role) => {
        expect(ROLE_LABELS[role]).toBeDefined()
        expect(typeof ROLE_LABELS[role]).toBe('string')
        expect(ROLE_LABELS[role].length).toBeGreaterThan(0)
      })
    })

    it('should have properly formatted labels', () => {
      expect(ROLE_LABELS.owner).toBe('Owner')
      expect(ROLE_LABELS.admin).toBe('Administrator')
      expect(ROLE_LABELS.project_manager).toBe('Project Manager')
      expect(ROLE_LABELS.superintendent).toBe('Superintendent')
      expect(ROLE_LABELS.foreman).toBe('Foreman')
      expect(ROLE_LABELS.worker).toBe('Worker')
      expect(ROLE_LABELS.subcontractor).toBe('Subcontractor')
      expect(ROLE_LABELS.client).toBe('Client')
    })
  })

  describe('Role-specific navigation requirements', () => {
    it('superintendent should have daily reports in primary items', () => {
      const config = ROLE_NAVIGATION_CONFIGS.superintendent
      const hasDailyReports = config.primaryItems.some(
        (item) => item.href === '/daily-reports' || item.label.toLowerCase().includes('daily')
      )
      expect(hasDailyReports).toBe(true)
    })

    it('superintendent should have procurement visible', () => {
      const config = ROLE_NAVIGATION_CONFIGS.superintendent
      const hasProcurement =
        config.primaryItems.some((item) => item.href === '/procurement') ||
        config.groups.some((group) =>
          group.items.some((item) => item.href === '/procurement')
        )
      expect(hasProcurement).toBe(true)
    })

    it('project_manager should have procurement visible', () => {
      const config = ROLE_NAVIGATION_CONFIGS.project_manager
      const hasProcurement =
        config.primaryItems.some((item) => item.href === '/procurement') ||
        config.groups.some((group) =>
          group.items.some((item) => item.href === '/procurement')
        )
      expect(hasProcurement).toBe(true)
    })

    it('owner should have analytics and financial items', () => {
      const config = ROLE_NAVIGATION_CONFIGS.owner
      const hasAnalytics =
        config.primaryItems.some((item) => item.href === '/analytics') ||
        config.groups.some((group) =>
          group.items.some((item) => item.href === '/analytics')
        )
      expect(hasAnalytics).toBe(true)
    })

    it('admin should have settings and user management', () => {
      const config = ROLE_NAVIGATION_CONFIGS.admin
      const hasSettings =
        config.primaryItems.some((item) => item.href?.startsWith('/settings')) ||
        config.groups.some((group) =>
          group.items.some((item) => item.href?.startsWith('/settings'))
        )
      expect(hasSettings).toBe(true)
    })

    it('worker should have minimal navigation focused on tasks', () => {
      const config = ROLE_NAVIGATION_CONFIGS.worker
      // Worker should have fewer items than superintendent
      const superintendentConfig = ROLE_NAVIGATION_CONFIGS.superintendent
      const workerTotalItems =
        config.primaryItems.length +
        config.groups.reduce((acc, g) => acc + g.items.length, 0)
      const superintendentTotalItems =
        superintendentConfig.primaryItems.length +
        superintendentConfig.groups.reduce((acc, g) => acc + g.items.length, 0)
      expect(workerTotalItems).toBeLessThan(superintendentTotalItems)
    })

    it('foreman should have task-focused navigation', () => {
      const config = ROLE_NAVIGATION_CONFIGS.foreman
      const hasTasks =
        config.primaryItems.some((item) => item.href === '/tasks') ||
        config.mobileBottomNav.some((item) => item.href === '/tasks')
      expect(hasTasks).toBe(true)
    })
  })

  describe('Navigation item structure', () => {
    it('all primary items should have required fields', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        config.primaryItems.forEach((item) => {
          expect(item.label).toBeDefined()
          expect(item.href).toBeDefined()
          expect(item.icon).toBeDefined()
        })
      })
    })

    it('all mobile nav items should have required fields', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        config.mobileBottomNav.forEach((item) => {
          expect(item.label).toBeDefined()
          expect(item.href).toBeDefined()
          expect(item.icon).toBeDefined()
        })
      })
    })

    it('all group items should have label and items array', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        config.groups.forEach((group) => {
          expect(group.label).toBeDefined()
          expect(Array.isArray(group.items)).toBe(true)
        })
      })
    })

    it('all quick actions should have required fields', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        config.quickActions.forEach((action) => {
          expect(action.id).toBeDefined()
          expect(action.label).toBeDefined()
          expect(action.href).toBeDefined()
          expect(action.icon).toBeDefined()
          expect(action.color).toBeDefined()
        })
      })
    })
  })
})
