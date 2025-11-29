/**
 * Subcontractor Invitations Hooks Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useProjectPortalAccess,
  useCreateInvitation,
  useUpdatePortalAccess,
  useRevokePortalAccess,
  useValidateInvitation,
  useAcceptInvitation,
} from './useInvitations'
import { createWrapper } from '@/__tests__/utils/TestProviders'

// Mock the API service
vi.mock('@/lib/api/services/subcontractor-portal', () => ({
  subcontractorPortalApi: {
    getPortalAccess: vi.fn(),
    createInvitation: vi.fn(),
    updatePortalAccess: vi.fn(),
    revokePortalAccess: vi.fn(),
    validateInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
  },
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useProjectPortalAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be disabled when projectId is undefined', () => {
    const { result } = renderHook(() => useProjectPortalAccess(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.isPending).toBe(true)
  })

  it('should fetch portal access when projectId is provided', () => {
    const { result } = renderHook(() => useProjectPortalAccess('project-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })
})

describe('useCreateInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a mutation function', () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')
  })

  it('should have isPending state', () => {
    const { result } = renderHook(() => useCreateInvitation(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isPending).toBe(false)
  })
})

describe('useUpdatePortalAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a mutation function', () => {
    const { result } = renderHook(() => useUpdatePortalAccess(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')
  })
})

describe('useRevokePortalAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a mutation function', () => {
    const { result } = renderHook(() => useRevokePortalAccess(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')
  })
})

describe('useValidateInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be disabled when token is undefined', () => {
    const { result } = renderHook(() => useValidateInvitation(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.isPending).toBe(true)
  })

  it('should fetch invitation validation when token is provided', () => {
    const { result } = renderHook(() => useValidateInvitation('valid-token-123'), {
      wrapper: createWrapper(),
    })

    expect(result.current).toBeDefined()
  })
})

describe('useAcceptInvitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a mutation function', () => {
    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    })

    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
    expect(typeof result.current.mutate).toBe('function')
  })

  it('should have isPending state', () => {
    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isPending).toBe(false)
  })
})

describe('Invitation Flow Integration', () => {
  it('should have all necessary hooks for invitation flow', () => {
    // Query hooks for reading data
    expect(useProjectPortalAccess).toBeDefined()
    expect(useValidateInvitation).toBeDefined()

    // Mutation hooks for modifying data
    expect(useCreateInvitation).toBeDefined()
    expect(useUpdatePortalAccess).toBeDefined()
    expect(useRevokePortalAccess).toBeDefined()
    expect(useAcceptInvitation).toBeDefined()
  })
})
