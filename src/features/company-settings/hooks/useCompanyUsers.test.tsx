/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Define mock functions BEFORE vi.mock calls (hoisting requirement)
const mockGetCompanyUsers = vi.fn()
const mockInviteUser = vi.fn()
const mockUpdateUserRole = vi.fn()
const mockSetUserActive = vi.fn()
const mockDeleteUser = vi.fn()

const mockUser = { id: 'user-1', email: 'admin@example.com' }
const mockUserProfile = { id: 'profile-1', company_id: 'company-1' }
const mockUseAuth = vi.fn(() => ({ user: mockUser, userProfile: mockUserProfile }))

// Mock toast and logger
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock the API service
vi.mock('@/lib/api/services/company-users', () => ({
  companyUsersApi: {
    getCompanyUsers: (...args: unknown[]) => mockGetCompanyUsers(...args),
    inviteUser: (...args: unknown[]) => mockInviteUser(...args),
    updateUserRole: (...args: unknown[]) => mockUpdateUserRole(...args),
    setUserActive: (...args: unknown[]) => mockSetUserActive(...args),
    deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import {
  companyUsersKeys,
  useCompanyUsers,
  useInviteUser,
  useUpdateUserRole,
  useToggleUserActive,
  useDeleteUser,
} from './useCompanyUsers'

// Test wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Sample test data
const mockCompanyUser = {
  id: 'user-2',
  email: 'john@example.com',
  full_name: 'John Doe',
  role: 'project_manager',
  is_active: true,
  avatar_url: null,
  phone: '555-123-4567',
  created_at: '2024-06-01T00:00:00Z',
  last_login: '2025-01-10T00:00:00Z',
}

const mockCompanyUsers = [
  mockCompanyUser,
  {
    id: 'user-3',
    email: 'jane@example.com',
    full_name: 'Jane Smith',
    role: 'field_worker',
    is_active: true,
    avatar_url: null,
    phone: '555-987-6543',
    created_at: '2024-08-15T00:00:00Z',
    last_login: '2025-01-09T00:00:00Z',
  },
]

describe('companyUsersKeys', () => {
  it('should generate correct query keys', () => {
    expect(companyUsersKeys.all).toEqual(['company-users'])
    expect(companyUsersKeys.list('company-1')).toEqual(['company-users', 'list', 'company-1'])
    expect(companyUsersKeys.detail('user-1')).toEqual(['company-users', 'detail', 'user-1'])
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useCompanyUsers', () => {
    it('should fetch company users', async () => {
      mockGetCompanyUsers.mockResolvedValue(mockCompanyUsers)

      const { result } = renderHook(() => useCompanyUsers(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockCompanyUsers)
      expect(mockGetCompanyUsers).toHaveBeenCalledWith('company-1')
    })

    it('should not fetch when user not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null, userProfile: null })

      const { result } = renderHook(() => useCompanyUsers(), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockGetCompanyUsers).not.toHaveBeenCalled()
    })

    it('should handle API error', async () => {
      mockGetCompanyUsers.mockRejectedValue(new Error('Failed to fetch users'))

      const { result } = renderHook(() => useCompanyUsers(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('Failed to fetch users')
    })
  })
})

describe('Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useInviteUser', () => {
    it('should invite user successfully', async () => {
      const inviteData = {
        email: 'newuser@example.com',
        full_name: 'New User',
        role: 'field_worker' as const,
      }
      mockInviteUser.mockResolvedValue({ ...mockCompanyUser, ...inviteData })

      const { result } = renderHook(() => useInviteUser(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(inviteData)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockInviteUser).toHaveBeenCalledWith('company-1', 'profile-1', inviteData)
    })

    it('should throw error when company not found', async () => {
      mockUseAuth.mockReturnValue({ user: null, userProfile: null })

      const { result } = renderHook(() => useInviteUser(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        email: 'test@example.com',
        full_name: 'Test',
        role: 'field_worker',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toContain('Company not found')
    })

    it('should handle invite error', async () => {
      mockInviteUser.mockRejectedValue(new Error('Email already exists'))

      const { result } = renderHook(() => useInviteUser(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        email: 'existing@example.com',
        full_name: 'Existing User',
        role: 'field_worker',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUpdateUserRole', () => {
    it('should update user role successfully', async () => {
      const updatedUser = { ...mockCompanyUser, role: 'admin' }
      mockUpdateUserRole.mockResolvedValue(updatedUser)

      const { result } = renderHook(() => useUpdateUserRole(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ userId: 'user-2', role: 'admin' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdateUserRole).toHaveBeenCalledWith('user-2', 'admin')
    })

    it('should update to project manager role', async () => {
      const updatedUser = { ...mockCompanyUser, role: 'project_manager' }
      mockUpdateUserRole.mockResolvedValue(updatedUser)

      const { result } = renderHook(() => useUpdateUserRole(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ userId: 'user-2', role: 'project_manager' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should handle update error', async () => {
      mockUpdateUserRole.mockRejectedValue(new Error('Cannot change own role'))

      const { result } = renderHook(() => useUpdateUserRole(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ userId: 'user-1', role: 'field_worker' })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useToggleUserActive', () => {
    it('should deactivate user successfully', async () => {
      const deactivatedUser = { ...mockCompanyUser, is_active: false }
      mockSetUserActive.mockResolvedValue(deactivatedUser)

      const { result } = renderHook(() => useToggleUserActive(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ userId: 'user-2', isActive: false })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockSetUserActive).toHaveBeenCalledWith('user-2', false)
    })

    it('should activate user successfully', async () => {
      const activatedUser = { ...mockCompanyUser, is_active: true }
      mockSetUserActive.mockResolvedValue(activatedUser)

      const { result } = renderHook(() => useToggleUserActive(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ userId: 'user-2', isActive: true })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockSetUserActive).toHaveBeenCalledWith('user-2', true)
    })

    it('should handle toggle error', async () => {
      mockSetUserActive.mockRejectedValue(new Error('Cannot deactivate self'))

      const { result } = renderHook(() => useToggleUserActive(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ userId: 'user-1', isActive: false })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeleteUser', () => {
    it('should delete user successfully', async () => {
      mockDeleteUser.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteUser(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('user-2')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockDeleteUser).toHaveBeenCalledWith('user-2')
    })

    it('should handle delete error', async () => {
      mockDeleteUser.mockRejectedValue(new Error('Cannot delete self'))

      const { result } = renderHook(() => useDeleteUser(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('user-1')

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})
