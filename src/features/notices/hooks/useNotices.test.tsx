/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Define mock functions BEFORE vi.mock calls (hoisting requirement)
const mockGetProjectNotices = vi.fn()
const mockGetNotice = vi.fn()
const mockGetNoticeStats = vi.fn()
const mockGetOverdueNotices = vi.fn()
const mockGetNoticesDueSoon = vi.fn()
const mockGetCriticalNotices = vi.fn()

// Mock the API service
vi.mock('@/lib/api/services/notices', () => ({
  noticesApi: {
    getProjectNotices: (...args: unknown[]) => mockGetProjectNotices(...args),
    getNotice: (...args: unknown[]) => mockGetNotice(...args),
    getNoticeStats: (...args: unknown[]) => mockGetNoticeStats(...args),
    getOverdueNotices: (...args: unknown[]) => mockGetOverdueNotices(...args),
    getNoticesDueSoon: (...args: unknown[]) => mockGetNoticesDueSoon(...args),
    getCriticalNotices: (...args: unknown[]) => mockGetCriticalNotices(...args),
  },
}))

import {
  noticeKeys,
  useNotices,
  useNotice,
  useNoticeStats,
  useOverdueNotices,
  useNoticesDueSoon,
  useCriticalNotices,
  useNoticesByStatus,
  useNoticesByDirection,
} from './useNotices'

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
const mockNotice = {
  id: 'notice-1',
  project_id: 'project-1',
  company_id: 'company-1',
  notice_type: 'delay',
  subject: 'Weather Delay Notice',
  description: 'Work suspended due to heavy rain',
  direction: 'outgoing',
  status: 'sent',
  is_critical: false,
  notice_date: '2025-01-10',
  response_due_date: '2025-01-20',
  response_date: null,
  response_status: null,
  created_at: '2025-01-10T00:00:00Z',
  created_by: 'user-1',
}

const mockCriticalNotice = {
  ...mockNotice,
  id: 'notice-2',
  notice_type: 'safety_violation',
  subject: 'Critical Safety Issue',
  is_critical: true,
}

const mockOverdueNotice = {
  ...mockNotice,
  id: 'notice-3',
  status: 'pending_response',
  response_due_date: '2025-01-05',
}

const mockNoticeStats = {
  total: 15,
  critical: 2,
  awaitingResponse: 5,
  overdue: 1,
  sentThisMonth: 8,
}

describe('noticeKeys', () => {
  it('should generate correct query keys', () => {
    expect(noticeKeys.all).toEqual(['notices'])
    expect(noticeKeys.lists()).toEqual(['notices', 'list'])
    expect(noticeKeys.list('project-1')).toEqual(['notices', 'list', 'project-1', undefined])
    expect(noticeKeys.list('project-1', { status: 'pending_response' })).toEqual([
      'notices',
      'list',
      'project-1',
      { status: 'pending_response' },
    ])
    expect(noticeKeys.details()).toEqual(['notices', 'detail'])
    expect(noticeKeys.detail('notice-1')).toEqual(['notices', 'detail', 'notice-1'])
    expect(noticeKeys.stats('project-1')).toEqual(['notices', 'stats', 'project-1'])
    expect(noticeKeys.overdue('project-1')).toEqual(['notices', 'overdue', 'project-1'])
    expect(noticeKeys.dueSoon('project-1', 7)).toEqual(['notices', 'dueSoon', 'project-1', 7])
    expect(noticeKeys.critical('project-1')).toEqual(['notices', 'critical', 'project-1'])
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useNotices', () => {
    it('should fetch notices for a project', async () => {
      mockGetProjectNotices.mockResolvedValue([mockNotice])

      const { result } = renderHook(() => useNotices('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockNotice])
      expect(mockGetProjectNotices).toHaveBeenCalledWith('project-1', undefined)
    })

    it('should fetch notices with filters', async () => {
      mockGetProjectNotices.mockResolvedValue([mockNotice])
      const filters = { status: 'sent', notice_type: 'delay' }

      const { result } = renderHook(() => useNotices('project-1', filters as any), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetProjectNotices).toHaveBeenCalledWith('project-1', filters)
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useNotices(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockGetProjectNotices).not.toHaveBeenCalled()
    })

    it('should handle API error', async () => {
      mockGetProjectNotices.mockRejectedValue(new Error('Failed to fetch notices'))

      const { result } = renderHook(() => useNotices('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('Failed to fetch notices')
    })
  })

  describe('useNotice', () => {
    it('should fetch a single notice', async () => {
      mockGetNotice.mockResolvedValue(mockNotice)

      const { result } = renderHook(() => useNotice('notice-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockNotice)
      expect(mockGetNotice).toHaveBeenCalledWith('notice-1')
    })

    it('should not fetch when noticeId is undefined', () => {
      const { result } = renderHook(() => useNotice(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useNoticeStats', () => {
    it('should fetch notice stats for a project', async () => {
      mockGetNoticeStats.mockResolvedValue(mockNoticeStats)

      const { result } = renderHook(() => useNoticeStats('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockNoticeStats)
      expect(mockGetNoticeStats).toHaveBeenCalledWith('project-1')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useNoticeStats(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useOverdueNotices', () => {
    it('should fetch overdue notices', async () => {
      mockGetOverdueNotices.mockResolvedValue([mockOverdueNotice])

      const { result } = renderHook(() => useOverdueNotices(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockOverdueNotice])
      expect(mockGetOverdueNotices).toHaveBeenCalledWith(undefined)
    })

    it('should fetch overdue notices for a specific project', async () => {
      mockGetOverdueNotices.mockResolvedValue([mockOverdueNotice])

      const { result } = renderHook(() => useOverdueNotices('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetOverdueNotices).toHaveBeenCalledWith('project-1')
    })
  })

  describe('useNoticesDueSoon', () => {
    it('should fetch notices due soon with default 7 days', async () => {
      mockGetNoticesDueSoon.mockResolvedValue([mockNotice])

      const { result } = renderHook(() => useNoticesDueSoon('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockNotice])
      expect(mockGetNoticesDueSoon).toHaveBeenCalledWith('project-1', 7)
    })

    it('should fetch notices due soon with custom days', async () => {
      mockGetNoticesDueSoon.mockResolvedValue([mockNotice])

      const { result } = renderHook(() => useNoticesDueSoon('project-1', 14), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetNoticesDueSoon).toHaveBeenCalledWith('project-1', 14)
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useNoticesDueSoon(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useCriticalNotices', () => {
    it('should fetch critical notices for a project', async () => {
      mockGetCriticalNotices.mockResolvedValue([mockCriticalNotice])

      const { result } = renderHook(() => useCriticalNotices('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockCriticalNotice])
      expect(mockGetCriticalNotices).toHaveBeenCalledWith('project-1')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useCriticalNotices(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useNoticesByStatus', () => {
    it('should fetch notices by status', async () => {
      mockGetProjectNotices.mockResolvedValue([mockNotice])

      const { result } = renderHook(() => useNoticesByStatus('project-1', 'sent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockNotice])
      expect(mockGetProjectNotices).toHaveBeenCalledWith('project-1', { status: 'sent' })
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useNoticesByStatus(undefined, 'sent'), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should not fetch when status is empty', () => {
      const { result } = renderHook(() => useNoticesByStatus('project-1', ''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useNoticesByDirection', () => {
    it('should fetch outgoing notices', async () => {
      mockGetProjectNotices.mockResolvedValue([mockNotice])

      const { result } = renderHook(() => useNoticesByDirection('project-1', 'outgoing'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockNotice])
      expect(mockGetProjectNotices).toHaveBeenCalledWith('project-1', { direction: 'outgoing' })
    })

    it('should fetch incoming notices', async () => {
      const incomingNotice = { ...mockNotice, direction: 'incoming' }
      mockGetProjectNotices.mockResolvedValue([incomingNotice])

      const { result } = renderHook(() => useNoticesByDirection('project-1', 'incoming'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetProjectNotices).toHaveBeenCalledWith('project-1', { direction: 'incoming' })
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useNoticesByDirection(undefined, 'outgoing'), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })
})

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle network errors in useNotices', async () => {
    mockGetProjectNotices.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useNotices('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Network error')
  })

  it('should handle network errors in useNotice', async () => {
    mockGetNotice.mockRejectedValue(new Error('Notice not found'))

    const { result } = renderHook(() => useNotice('invalid-id'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Notice not found')
  })

  it('should handle network errors in useNoticeStats', async () => {
    mockGetNoticeStats.mockRejectedValue(new Error('Failed to calculate stats'))

    const { result } = renderHook(() => useNoticeStats('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Failed to calculate stats')
  })
})
