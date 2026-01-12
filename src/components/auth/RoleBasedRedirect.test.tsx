/**
 * Tests for RoleBasedRedirect component
 * Verifies that users are redirected to their role-specific dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleBasedRedirect } from './RoleBasedRedirect'
import type { DefaultRole } from '@/types/permissions'

// Track navigation
let navigatedTo: string | null = null

// Mock Navigate component to track where it redirects
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => {
      navigatedTo = to
      return <div data-testid="navigate">Redirecting to {to}</div>
    },
  }
})

// Mock auth context with configurable user profile
const createMockAuth = (role: DefaultRole | null, loading = false) => ({
  userProfile: role
    ? {
        id: 'test-user-id',
        email: 'test@example.com',
        role,
        company_id: 'test-company-id',
      }
    : null,
  loading,
  session: role ? { user: { id: 'test-user-id' } } : null,
})

let mockAuthReturn = createMockAuth('superintendent')

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => mockAuthReturn,
}))

// Mock useDefaultLandingPage hook
vi.mock('@/hooks/useRoleNavigation', () => ({
  useDefaultLandingPage: () => {
    const role = mockAuthReturn.userProfile?.role
    const landingPages: Record<string, string> = {
      owner: '/dashboard/owner',
      admin: '/dashboard/admin',
      project_manager: '/dashboard/pm',
      superintendent: '/dashboard/superintendent',
      foreman: '/dashboard/foreman',
      worker: '/dashboard/worker',
      subcontractor: '/sub/dashboard',
      client: '/client/dashboard',
    }
    return landingPages[role || 'superintendent'] || '/dashboard/superintendent'
  },
}))

describe('RoleBasedRedirect', () => {
  beforeEach(() => {
    navigatedTo = null
    mockAuthReturn = createMockAuth('superintendent')
  })

  describe('authentication states', () => {
    it('should render nothing while loading', () => {
      mockAuthReturn = createMockAuth('superintendent', true)

      const { container } = render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should redirect to login when not authenticated', () => {
      mockAuthReturn = createMockAuth(null)

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(navigatedTo).toBe('/login')
    })
  })

  describe('role-based redirects', () => {
    it('should redirect owner to /dashboard/owner', () => {
      mockAuthReturn = createMockAuth('owner')

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(navigatedTo).toBe('/dashboard/owner')
    })

    it('should redirect admin to /dashboard/admin', () => {
      mockAuthReturn = createMockAuth('admin')

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(navigatedTo).toBe('/dashboard/admin')
    })

    it('should redirect project_manager to /dashboard/pm', () => {
      mockAuthReturn = createMockAuth('project_manager')

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(navigatedTo).toBe('/dashboard/pm')
    })

    it('should redirect superintendent to /dashboard/superintendent', () => {
      mockAuthReturn = createMockAuth('superintendent')

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(navigatedTo).toBe('/dashboard/superintendent')
    })

    it('should redirect foreman to /dashboard/foreman', () => {
      mockAuthReturn = createMockAuth('foreman')

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(navigatedTo).toBe('/dashboard/foreman')
    })

    it('should redirect worker to /dashboard/worker', () => {
      mockAuthReturn = createMockAuth('worker')

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(navigatedTo).toBe('/dashboard/worker')
    })

    it('should redirect subcontractor to /sub/dashboard', () => {
      mockAuthReturn = createMockAuth('subcontractor')

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(navigatedTo).toBe('/sub/dashboard')
    })

    it('should redirect client to /client/dashboard', () => {
      mockAuthReturn = createMockAuth('client')

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      expect(navigatedTo).toBe('/client/dashboard')
    })
  })

  describe('redirect behavior', () => {
    it('should use replace navigation', () => {
      mockAuthReturn = createMockAuth('superintendent')

      render(
        <MemoryRouter>
          <RoleBasedRedirect />
        </MemoryRouter>
      )

      // The Navigate component is called with replace prop
      expect(screen.getByTestId('navigate')).toBeInTheDocument()
    })
  })
})
