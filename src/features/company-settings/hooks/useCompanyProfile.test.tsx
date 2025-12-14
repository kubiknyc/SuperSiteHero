/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Define mock functions BEFORE vi.mock calls (hoisting requirement)
const mockGetCompany = vi.fn()
const mockUpdateCompany = vi.fn()
const mockUploadLogo = vi.fn()
const mockDeleteLogo = vi.fn()

const mockUser = { id: 'user-1', email: 'test@example.com' }
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
vi.mock('@/lib/api/services/company', () => ({
  companyApi: {
    getCompany: (...args: unknown[]) => mockGetCompany(...args),
    updateCompany: (...args: unknown[]) => mockUpdateCompany(...args),
    uploadLogo: (...args: unknown[]) => mockUploadLogo(...args),
    deleteLogo: (...args: unknown[]) => mockDeleteLogo(...args),
  },
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import {
  companyKeys,
  useCompanyProfile,
  useUpdateCompanyProfile,
  useUploadCompanyLogo,
  useDeleteCompanyLogo,
} from './useCompanyProfile'

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
const mockCompany = {
  id: 'company-1',
  name: 'Test Construction Co',
  email: 'info@testconstruction.com',
  phone: '555-123-4567',
  address: '123 Main St',
  city: 'New York',
  state: 'NY',
  zip_code: '10001',
  logo_url: 'https://storage.example.com/logos/company-1.png',
  website: 'https://testconstruction.com',
  license_number: 'CON-12345',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2025-01-10T00:00:00Z',
}

describe('companyKeys', () => {
  it('should generate correct query keys', () => {
    expect(companyKeys.all).toEqual(['company'])
    expect(companyKeys.detail('company-1')).toEqual(['company', 'company-1'])
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useCompanyProfile', () => {
    it('should fetch company profile', async () => {
      mockGetCompany.mockResolvedValue(mockCompany)

      const { result } = renderHook(() => useCompanyProfile(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockCompany)
      expect(mockGetCompany).toHaveBeenCalledWith('company-1')
    })

    it('should not fetch when user not authenticated', () => {
      mockUseAuth.mockReturnValue({ user: null, userProfile: null })

      const { result } = renderHook(() => useCompanyProfile(), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockGetCompany).not.toHaveBeenCalled()
    })

    it('should handle API error', async () => {
      mockGetCompany.mockRejectedValue(new Error('Company not found'))

      const { result } = renderHook(() => useCompanyProfile(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('Company not found')
    })
  })
})

describe('Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: mockUser, userProfile: mockUserProfile })
  })

  describe('useUpdateCompanyProfile', () => {
    it('should update company profile successfully', async () => {
      const updatedCompany = { ...mockCompany, name: 'Updated Company Name' }
      mockUpdateCompany.mockResolvedValue(updatedCompany)

      const { result } = renderHook(() => useUpdateCompanyProfile(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'Updated Company Name' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdateCompany).toHaveBeenCalledWith('company-1', { name: 'Updated Company Name' })
    })

    it('should update multiple fields', async () => {
      const updates = {
        name: 'New Name',
        phone: '555-999-8888',
        address: '456 New St',
      }
      mockUpdateCompany.mockResolvedValue({ ...mockCompany, ...updates })

      const { result } = renderHook(() => useUpdateCompanyProfile(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(updates)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUpdateCompany).toHaveBeenCalledWith('company-1', updates)
    })

    it('should throw error when company not found', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser, userProfile: null })

      const { result } = renderHook(() => useUpdateCompanyProfile(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'Test' })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toContain('Company not found')
    })

    it('should handle update error', async () => {
      mockUpdateCompany.mockRejectedValue(new Error('Update failed'))

      const { result } = renderHook(() => useUpdateCompanyProfile(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ name: 'Test' })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUploadCompanyLogo', () => {
    it('should upload logo successfully', async () => {
      mockUploadLogo.mockResolvedValue('https://storage.example.com/logos/new-logo.png')

      const file = new File(['logo'], 'logo.png', { type: 'image/png' })

      const { result } = renderHook(() => useUploadCompanyLogo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(file)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUploadLogo).toHaveBeenCalledWith('company-1', file)
    })

    it('should throw error when company not found', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser, userProfile: null })

      const file = new File(['logo'], 'logo.png', { type: 'image/png' })

      const { result } = renderHook(() => useUploadCompanyLogo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(file)

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toContain('Company not found')
    })

    it('should handle upload error', async () => {
      mockUploadLogo.mockRejectedValue(new Error('File too large'))

      const file = new File(['logo'], 'logo.png', { type: 'image/png' })

      const { result } = renderHook(() => useUploadCompanyLogo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(file)

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeleteCompanyLogo', () => {
    it('should delete logo successfully', async () => {
      mockDeleteLogo.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteCompanyLogo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockDeleteLogo).toHaveBeenCalledWith('company-1')
    })

    it('should throw error when company not found', async () => {
      mockUseAuth.mockReturnValue({ user: mockUser, userProfile: null })

      const { result } = renderHook(() => useDeleteCompanyLogo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate()

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toContain('Company not found')
    })

    it('should handle delete error', async () => {
      mockDeleteLogo.mockRejectedValue(new Error('Delete failed'))

      const { result } = renderHook(() => useDeleteCompanyLogo(), {
        wrapper: createWrapper(),
      })

      result.current.mutate()

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})
