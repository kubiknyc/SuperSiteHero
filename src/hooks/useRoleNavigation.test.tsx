/**
 * Tests for useRoleNavigation hook
 * Verifies role-based navigation hook behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  useRoleNavigation,
  useDefaultLandingPage,
  useQuickActions,
  useMobileBottomNav,
} from './useRoleNavigation'
import type { DefaultRole } from '@/types/permissions'

// Mock the auth context
const mockUserProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'superintendent' as DefaultRole,
  company_id: 'test-company-id',
}

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    userProfile: mockUserProfile,
    loading: false,
    session: { user: { id: 'test-user-id' } },
  })),
}))

// Wrapper for hooks that need router context
const wrapper = ({ children }: { children: ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
)

describe('useRoleNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('with superintendent role', () => {
    it('should return navigation config for superintendent', () => {
      const { result } = renderHook(() => useRoleNavigation(), { wrapper })

      expect(result.current.currentRole).toBe('superintendent')
      expect(result.current.roleLabel).toBe('Superintendent')
      expect(result.current.isPortalRole).toBe(false)
    })

    it('should return primary items', () => {
      const { result } = renderHook(() => useRoleNavigation(), { wrapper })

      expect(result.current.primaryItems).toBeDefined()
      expect(Array.isArray(result.current.primaryItems)).toBe(true)
      expect(result.current.primaryItems.length).toBeGreaterThan(0)
    })

    it('should return navigation groups', () => {
      const { result } = renderHook(() => useRoleNavigation(), { wrapper })

      expect(result.current.groups).toBeDefined()
      expect(Array.isArray(result.current.groups)).toBe(true)
    })

    it('should return mobile bottom nav items', () => {
      const { result } = renderHook(() => useRoleNavigation(), { wrapper })

      expect(result.current.mobileBottomNav).toBeDefined()
      expect(Array.isArray(result.current.mobileBottomNav)).toBe(true)
      expect(result.current.mobileBottomNav.length).toBeGreaterThanOrEqual(3)
      expect(result.current.mobileBottomNav.length).toBeLessThanOrEqual(5)
    })

    it('should return quick actions', () => {
      const { result } = renderHook(() => useRoleNavigation(), { wrapper })

      expect(result.current.quickActions).toBeDefined()
      expect(Array.isArray(result.current.quickActions)).toBe(true)
    })

    it('should return default landing page', () => {
      const { result } = renderHook(() => useRoleNavigation(), { wrapper })

      expect(result.current.defaultLandingPage).toBe('/dashboard/superintendent')
    })

    it('should return expanded groups by default', () => {
      const { result } = renderHook(() => useRoleNavigation(), { wrapper })

      expect(result.current.expandedGroupsByDefault).toBeDefined()
      expect(Array.isArray(result.current.expandedGroupsByDefault)).toBe(true)
    })

    it('should provide canAccessPath function', () => {
      const { result } = renderHook(() => useRoleNavigation(), { wrapper })

      expect(typeof result.current.canAccessPath).toBe('function')
    })

    it('should return full config object', () => {
      const { result } = renderHook(() => useRoleNavigation(), { wrapper })

      expect(result.current.config).toBeDefined()
      expect(result.current.config.roleId).toBe('superintendent')
    })
  })
})

describe('useDefaultLandingPage', () => {
  it('should return the default landing page for current role', () => {
    const { result } = renderHook(() => useDefaultLandingPage(), { wrapper })

    expect(result.current).toBe('/dashboard/superintendent')
  })
})

describe('useQuickActions', () => {
  it('should return quick actions for current role', () => {
    const { result } = renderHook(() => useQuickActions(), { wrapper })

    expect(Array.isArray(result.current)).toBe(true)
  })

  it('quick actions should have required properties', () => {
    const { result } = renderHook(() => useQuickActions(), { wrapper })

    result.current.forEach((action) => {
      expect(action.id).toBeDefined()
      expect(action.label).toBeDefined()
      expect(action.href).toBeDefined()
      expect(action.icon).toBeDefined()
      expect(action.color).toBeDefined()
    })
  })
})

describe('useMobileBottomNav', () => {
  it('should return mobile bottom nav items for current role', () => {
    const { result } = renderHook(() => useMobileBottomNav(), { wrapper })

    expect(Array.isArray(result.current)).toBe(true)
    expect(result.current.length).toBeGreaterThanOrEqual(3)
    expect(result.current.length).toBeLessThanOrEqual(5)
  })

  it('mobile nav items should have required properties', () => {
    const { result } = renderHook(() => useMobileBottomNav(), { wrapper })

    result.current.forEach((item) => {
      expect(item.label).toBeDefined()
      expect(item.href).toBeDefined()
      expect(item.icon).toBeDefined()
    })
  })
})

describe('role switching behavior', () => {
  it('should use superintendent as fallback for undefined role', async () => {
    // Temporarily mock with undefined role
    const { useAuth } = await import('@/lib/auth/AuthContext')
    vi.mocked(useAuth).mockReturnValueOnce({
      userProfile: null,
      loading: false,
      session: null,
    } as ReturnType<typeof useAuth>)

    const { result } = renderHook(() => useRoleNavigation(), { wrapper })

    // Should fallback to superintendent
    expect(result.current.currentRole).toBe('superintendent')
  })
})
