/**
 * Tests for role-navigation.ts
 * Verifies role-based navigation configuration for all 8 user types
 */

import { describe, it, expect, vi, beforeAll } from 'vitest'
import type { DefaultRole } from '@/types/permissions'

// Mock React and related components before any imports
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    createElement: vi.fn(),
  }
})

vi.mock('@/features/messaging/components/UnreadMessagesBadge', () => ({
  UnreadMessagesBadge: () => null,
}))

vi.mock('@/features/approvals/components', () => ({
  PendingApprovalsBadge: () => null,
}))

vi.mock('lucide-react', () => ({
  LayoutDashboard: 'LayoutDashboard',
  FolderKanban: 'FolderKanban',
  MessageSquare: 'MessageSquare',
  FileText: 'FileText',
  ClipboardList: 'ClipboardList',
  CheckSquare: 'CheckSquare',
  FileCheck: 'FileCheck',
  UserCheck: 'UserCheck',
  FileQuestion: 'FileQuestion',
  ListChecks: 'ListChecks',
  Calendar: 'Calendar',
  Cloud: 'Cloud',
  Repeat: 'Repeat',
  Bell: 'Bell',
  FileSignature: 'FileSignature',
  Shield: 'Shield',
  HardHat: 'HardHat',
  DollarSign: 'DollarSign',
  Users: 'Users',
  BarChart3: 'BarChart3',
  Settings: 'Settings',
  Hammer: 'Hammer',
  Briefcase: 'Briefcase',
  TrendingUp: 'TrendingUp',
  ClipboardCheck: 'ClipboardCheck',
  Camera: 'Camera',
  Receipt: 'Receipt',
  ShoppingCart: 'ShoppingCart',
  Plus: 'Plus',
  FolderPlus: 'FolderPlus',
  UserPlus: 'UserPlus',
  AlertTriangle: 'AlertTriangle',
  Clock: 'Clock',
}))

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
  let ROLE_NAVIGATION_CONFIGS: any
  let getRoleNavigationConfig: any
  let getDefaultLandingPage: any
  let isPortalRole: any
  let ROLE_LABELS: any

  beforeAll(async () => {
    const module = await import('./role-navigation')
    ROLE_NAVIGATION_CONFIGS = module.ROLE_NAVIGATION_CONFIGS
    getRoleNavigationConfig = module.getRoleNavigationConfig
    getDefaultLandingPage = module.getDefaultLandingPage
    isPortalRole = module.isPortalRole
    ROLE_LABELS = module.ROLE_LABELS
  })

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
  })

  describe('Role-specific navigation requirements', () => {
    it('superintendent should have daily reports in primary items', () => {
      const config = ROLE_NAVIGATION_CONFIGS.superintendent
      const hasDailyReports = config.primaryItems.some(
        (item: any) => item.href === '/daily-reports' || item.label.toLowerCase().includes('daily')
      )
      expect(hasDailyReports).toBe(true)
    })

    it('superintendent should have procurement visible', () => {
      const config = ROLE_NAVIGATION_CONFIGS.superintendent
      const hasProcurement =
        config.primaryItems.some((item: any) => item.href === '/procurement') ||
        config.groups.some((group: any) =>
          group.items.some((item: any) => item.href === '/procurement')
        )
      expect(hasProcurement).toBe(true)
    })

    it('project_manager should have procurement visible', () => {
      const config = ROLE_NAVIGATION_CONFIGS.project_manager
      const hasProcurement =
        config.primaryItems.some((item: any) => item.href === '/procurement') ||
        config.groups.some((group: any) =>
          group.items.some((item: any) => item.href === '/procurement')
        )
      expect(hasProcurement).toBe(true)
    })
  })

  describe('Navigation item structure', () => {
    it('all primary items should have required fields', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        config.primaryItems.forEach((item: any) => {
          expect(item.label).toBeDefined()
          expect(item.href).toBeDefined()
          expect(item.icon).toBeDefined()
        })
      })
    })

    it('all mobile nav items should have required fields', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        config.mobileBottomNav.forEach((item: any) => {
          expect(item.label).toBeDefined()
          expect(item.href).toBeDefined()
          expect(item.icon).toBeDefined()
        })
      })
    })

    it('all quick actions should have required fields', () => {
      ALL_ROLES.forEach((role) => {
        const config = ROLE_NAVIGATION_CONFIGS[role]
        config.quickActions.forEach((action: any) => {
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
