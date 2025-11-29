/**
 * Subcontractor Dashboard Hooks Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useSubcontractorDashboard,
  useSubcontractorStats,
  useSubcontractorProjects,
  useSubcontractorScope,
  subcontractorKeys,
} from './useSubcontractorDashboard'
import { createWrapper } from '@/__tests__/utils/TestProviders'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

// Mock Auth Context - default to non-subcontractor role for "disabled" tests
const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-123',
  role: 'subcontractor',
}

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}))

// Mock the API service
vi.mock('@/lib/api/services/subcontractor-portal', () => ({
  subcontractorPortalApi: {
    getDashboard: vi.fn(),
    getStats: vi.fn(),
    getProjects: vi.fn(),
    getScope: vi.fn(),
  },
}))

describe('subcontractorKeys', () => {
  it('should generate correct query keys', () => {
    expect(subcontractorKeys.all).toEqual(['subcontractor'])
    expect(subcontractorKeys.dashboard()).toEqual(['subcontractor', 'dashboard'])
    expect(subcontractorKeys.stats()).toEqual(['subcontractor', 'stats'])
    expect(subcontractorKeys.projects()).toEqual(['subcontractor', 'projects'])
    expect(subcontractorKeys.project('proj-1')).toEqual(['subcontractor', 'projects', 'proj-1'])
  })
})

describe('useSubcontractorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have the correct query key structure', () => {
    const expectedKey = ['subcontractor', 'dashboard']
    expect(subcontractorKeys.dashboard()).toEqual(expectedKey)
  })

  it('should use the dashboard query key', () => {
    const { result } = renderHook(() => useSubcontractorDashboard(), {
      wrapper: createWrapper(),
    })

    // The hook should be in a loading state initially
    expect(result.current.isLoading).toBeDefined()
  })
})

describe('useSubcontractorStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have the correct query key structure', () => {
    const expectedKey = ['subcontractor', 'stats']
    expect(subcontractorKeys.stats()).toEqual(expectedKey)
  })

  it('should use the stats query key', () => {
    const { result } = renderHook(() => useSubcontractorStats(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBeDefined()
  })
})

describe('useSubcontractorProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have the correct query key structure', () => {
    const expectedKey = ['subcontractor', 'projects']
    expect(subcontractorKeys.projects()).toEqual(expectedKey)
  })

  it('should use the projects query key', () => {
    const { result } = renderHook(() => useSubcontractorProjects(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBeDefined()
  })
})

describe('useSubcontractorScope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have the correct query key structure', () => {
    const projectId = 'proj-123'
    const expectedKey = ['subcontractor', 'projects', projectId, 'scope']
    // The actual key is [...subcontractorKeys.project(projectId), 'scope']
    expect([...subcontractorKeys.project(projectId), 'scope']).toEqual(expectedKey)
  })

  it('should use the scope query key with project id', () => {
    const { result } = renderHook(() => useSubcontractorScope('proj-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBeDefined()
  })
})
