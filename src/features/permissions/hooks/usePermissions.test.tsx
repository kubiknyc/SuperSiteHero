/**
 * Tests for Permission Hooks
 * CRITICAL for security - ensures permission queries and mutations work correctly
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import type {
  Permission,
  CustomRole,
  FeatureFlag,
} from '@/types/permissions'

// =============================================
// Mock Setup
// =============================================

// Mock user profile
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      company_id: 'company-456',
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}))

// Create mock functions that we can control
const mockRpcFn = vi.fn()
const mockFromFn = vi.fn()

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFromFn(...args),
    rpc: (...args: unknown[]) => mockRpcFn(...args),
  },
}))

// Import hooks after mocks
import {
  permissionKeys,
  usePermissionDefinitions,
  useUserPermissions,
  useHasPermission,
  usePermissionCheck,
  useCustomRoles,
  useCreateCustomRole,
  useUpdateCustomRole,
  useDeleteCustomRole,
  useUserPermissionOverrides,
  useFeatureFlagDefinitions,
} from './usePermissions'

// =============================================
// Test Data
// =============================================

const mockPermissions: Permission[] = [
  {
    id: 'perm-1',
    code: 'projects.view',
    name: 'View Projects',
    description: 'Can view project details',
    category: 'projects',
    subcategory: 'read',
    is_dangerous: false,
    requires_project_assignment: true,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'perm-2',
    code: 'projects.create',
    name: 'Create Projects',
    description: 'Can create new projects',
    category: 'projects',
    subcategory: 'write',
    is_dangerous: false,
    requires_project_assignment: false,
    display_order: 2,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'perm-3',
    code: 'admin.billing',
    name: 'Manage Billing',
    description: 'Can manage company billing',
    category: 'admin',
    subcategory: 'billing',
    is_dangerous: true,
    requires_project_assignment: false,
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
]

const mockCustomRoles: CustomRole[] = [
  {
    id: 'role-1',
    company_id: 'company-456',
    code: 'senior_pm',
    name: 'Senior Project Manager',
    description: 'Extended PM permissions',
    color: '#3B82F6',
    is_active: true,
    can_be_deleted: true,
    inherits_from: 'project_manager',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user-123',
  },
]

const mockFeatureFlags: FeatureFlag[] = [
  {
    id: 'ff-1',
    code: 'ai_agents',
    name: 'AI Agents',
    description: 'Enable AI-powered assistants',
    category: 'ai',
    default_enabled: false,
    is_beta: true,
    requires_subscription: 'premium',
    created_at: '2024-01-01T00:00:00Z',
  },
]

const mockResolvedPermissions = [
  { permission_code: 'projects.view', permission_name: 'View Projects', category: 'projects', granted: true, source: 'default_role' },
  { permission_code: 'projects.create', permission_name: 'Create Projects', category: 'projects', granted: true, source: 'default_role' },
  { permission_code: 'admin.billing', permission_name: 'Manage Billing', category: 'admin', granted: false, source: 'default_role' },
]

// =============================================
// Test Setup
// =============================================

const createChainMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation((onFulfilled) =>
    Promise.resolve({ data, error }).then(onFulfilled)
  ),
})

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  })

const createWrapper = () => {
  const queryClient = createQueryClient()
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  // Setup default mock responses
  mockRpcFn.mockResolvedValue({ data: mockResolvedPermissions, error: null })

  mockFromFn.mockImplementation((table: string) => {
    switch (table) {
      case 'permissions':
        return createChainMock(mockPermissions)
      case 'custom_roles':
        return createChainMock(mockCustomRoles)
      case 'role_permissions':
        return createChainMock([])
      case 'user_permission_overrides':
        return createChainMock([])
      case 'feature_flags':
        return createChainMock(mockFeatureFlags)
      default:
        return createChainMock([])
    }
  })
})

// =============================================
// Query Key Tests
// =============================================

describe('permissionKeys', () => {
  it('should generate correct base key', () => {
    expect(permissionKeys.all).toEqual(['permissions'])
  })

  it('should generate correct definitions key', () => {
    expect(permissionKeys.definitions()).toEqual(['permissions', 'definitions'])
  })

  it('should generate correct user permission key', () => {
    expect(permissionKeys.user('user-123')).toEqual([
      'permissions',
      'user',
      'user-123',
      undefined,
    ])
    expect(permissionKeys.user('user-123', 'project-456')).toEqual([
      'permissions',
      'user',
      'user-123',
      'project-456',
    ])
  })

  it('should generate correct custom roles keys', () => {
    expect(permissionKeys.roles.all).toEqual(['custom-roles'])
    expect(permissionKeys.roles.list('company-456')).toEqual([
      'custom-roles',
      'list',
      'company-456',
    ])
    expect(permissionKeys.roles.detail('role-123')).toEqual([
      'custom-roles',
      'detail',
      'role-123',
    ])
  })

  it('should generate correct overrides keys', () => {
    expect(permissionKeys.overrides.all).toEqual(['permission-overrides'])
    expect(permissionKeys.overrides.user('user-123')).toEqual([
      'permission-overrides',
      'user',
      'user-123',
    ])
  })

  it('should generate correct feature flags keys', () => {
    expect(permissionKeys.features.all).toEqual(['feature-flags'])
    expect(permissionKeys.features.definitions()).toEqual([
      'feature-flags',
      'definitions',
    ])
    expect(permissionKeys.features.company('company-456')).toEqual([
      'feature-flags',
      'company',
      'company-456',
    ])
  })
})

// =============================================
// usePermissionDefinitions Tests
// =============================================

describe('usePermissionDefinitions', () => {
  it('should fetch permission definitions', async () => {
    const { result } = renderHook(() => usePermissionDefinitions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockPermissions)
    expect(mockFromFn).toHaveBeenCalledWith('permissions')
  })

  it('should handle empty permissions', async () => {
    mockFromFn.mockReturnValue(createChainMock([]))

    const { result } = renderHook(() => usePermissionDefinitions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })
})

// =============================================
// useUserPermissions Tests
// =============================================

describe('useUserPermissions', () => {
  it('should fetch user permissions via RPC', async () => {
    const { result } = renderHook(
      () => useUserPermissions('user-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockRpcFn).toHaveBeenCalledWith('get_user_permissions', {
      p_user_id: 'user-123',
      p_project_id: null,
    })
  })

  it('should return Map of permissions', async () => {
    const { result } = renderHook(
      () => useUserPermissions('user-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const permissions = result.current.data
    expect(permissions).toBeInstanceOf(Map)
    expect(permissions?.get('projects.view')).toMatchObject({
      permission_code: 'projects.view',
      granted: true,
    })
    expect(permissions?.get('admin.billing')?.granted).toBe(false)
  })

  it('should include project_id in RPC call when provided', async () => {
    const { result } = renderHook(
      () => useUserPermissions('user-123', 'project-456'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockRpcFn).toHaveBeenCalledWith('get_user_permissions', {
      p_user_id: 'user-123',
      p_project_id: 'project-456',
    })
  })

  it('should not fetch when userId is undefined', async () => {
    const { result } = renderHook(
      () => useUserPermissions(undefined),
      { wrapper: createWrapper() }
    )

    // Query should not run
    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

// =============================================
// useHasPermission Tests
// =============================================

describe('useHasPermission', () => {
  it('should return true for granted permission', async () => {
    const { result } = renderHook(
      () => useHasPermission('projects.view'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current).toBe(true))
  })

  it('should return false for denied permission', async () => {
    const { result } = renderHook(
      () => useHasPermission('admin.billing'),
      { wrapper: createWrapper() }
    )

    // Initially false while loading, stays false after loading
    expect(result.current).toBe(false)
  })

  it('should return false for unknown permission', async () => {
    const { result } = renderHook(
      () => useHasPermission('unknown.permission'),
      { wrapper: createWrapper() }
    )

    expect(result.current).toBe(false)
  })
})

// =============================================
// usePermissionCheck Tests
// =============================================

describe('usePermissionCheck', () => {
  it('should provide hasPermission helper', async () => {
    const { result } = renderHook(
      () => usePermissionCheck(),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.hasPermission('projects.view')).toBe(true)
    expect(result.current.hasPermission('admin.billing')).toBe(false)
  })

  it('should provide hasAnyPermission helper', async () => {
    const { result } = renderHook(
      () => usePermissionCheck(),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(
      result.current.hasAnyPermission(['projects.view', 'admin.billing'])
    ).toBe(true)
    expect(
      result.current.hasAnyPermission(['admin.billing', 'unknown'])
    ).toBe(false)
  })

  it('should provide hasAllPermissions helper', async () => {
    const { result } = renderHook(
      () => usePermissionCheck(),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(
      result.current.hasAllPermissions(['projects.view', 'projects.create'])
    ).toBe(true)
    expect(
      result.current.hasAllPermissions(['projects.view', 'admin.billing'])
    ).toBe(false)
  })
})

// =============================================
// useCustomRoles Tests
// =============================================

describe('useCustomRoles', () => {
  it('should fetch custom roles for company', async () => {
    const { result } = renderHook(() => useCustomRoles(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockCustomRoles)
    expect(mockFromFn).toHaveBeenCalledWith('custom_roles')
  })
})

// =============================================
// useFeatureFlagDefinitions Tests
// =============================================

describe('useFeatureFlagDefinitions', () => {
  it('should fetch feature flag definitions', async () => {
    const { result } = renderHook(() => useFeatureFlagDefinitions(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockFeatureFlags)
    expect(mockFromFn).toHaveBeenCalledWith('feature_flags')
  })
})

// =============================================
// Security-Critical Hook Tests
// =============================================

describe('Security-Critical Permission Hook Tests', () => {
  it('should handle permission fetch errors gracefully', async () => {
    mockRpcFn.mockResolvedValueOnce({ data: null, error: { message: 'Access denied' } })

    const { result } = renderHook(
      () => useUserPermissions('user-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))

    // Should not expose any permissions on error
    expect(result.current.data).toBeUndefined()
  })

  it('should return false for all permissions when loading', () => {
    const { result } = renderHook(
      () => usePermissionCheck(),
      { wrapper: createWrapper() }
    )

    // While loading, all permission checks should return false
    expect(result.current.hasPermission('projects.view')).toBe(false)
    expect(result.current.hasPermission('admin.billing')).toBe(false)
    expect(result.current.hasAnyPermission(['projects.view'])).toBe(false)
    expect(result.current.hasAllPermissions(['projects.view'])).toBe(false)
  })
})

// =============================================
// Mutation Hook Tests
// =============================================

describe('useCreateCustomRole', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useCreateCustomRole(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useUpdateCustomRole', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useUpdateCustomRole(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useDeleteCustomRole', () => {
  it('should exist and be callable', () => {
    const { result } = renderHook(() => useDeleteCustomRole(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })
})

describe('useUserPermissionOverrides', () => {
  it('should fetch overrides for a user', async () => {
    const { result } = renderHook(
      () => useUserPermissionOverrides('user-123'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(mockFromFn).toHaveBeenCalledWith('user_permission_overrides')
  })

  it('should not fetch when userId is empty', () => {
    const { result } = renderHook(
      () => useUserPermissionOverrides(''),
      { wrapper: createWrapper() }
    )

    expect(result.current.isFetching).toBe(false)
  })
})
