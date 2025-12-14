/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Define mock functions BEFORE vi.mock calls (hoisting requirement)
const mockCalculateProgressSummaries = vi.fn()
const mockGetSyncStatus = vi.fn()
const mockSyncActivityFromProgress = vi.fn()
const mockSyncAllActivitiesFromProgress = vi.fn()
const mockLinkProgressToActivity = vi.fn()
const mockUnlinkProgressFromActivity = vi.fn()
const mockAutoLinkProgressEntries = vi.fn()

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock the API service
vi.mock('@/lib/api/services/look-ahead-sync', () => ({
  lookAheadSyncApi: {
    calculateProgressSummaries: (...args: unknown[]) => mockCalculateProgressSummaries(...args),
    getSyncStatus: (...args: unknown[]) => mockGetSyncStatus(...args),
    syncActivityFromProgress: (...args: unknown[]) => mockSyncActivityFromProgress(...args),
    syncAllActivitiesFromProgress: (...args: unknown[]) => mockSyncAllActivitiesFromProgress(...args),
    linkProgressToActivity: (...args: unknown[]) => mockLinkProgressToActivity(...args),
    unlinkProgressFromActivity: (...args: unknown[]) => mockUnlinkProgressFromActivity(...args),
    autoLinkProgressEntries: (...args: unknown[]) => mockAutoLinkProgressEntries(...args),
  },
}))

import {
  lookAheadSyncKeys,
  useProgressSummaries,
  useSyncStatus,
  useSyncActivity,
  useBatchSync,
  useLinkProgress,
  useUnlinkProgress,
  useAutoLinkProgress,
} from './useLookAheadSync'

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
const mockProgressSummary = {
  activity_id: 'activity-1',
  activity_name: 'Foundation Work',
  total_reported_progress: 75,
  total_hours_logged: 40,
  entries_count: 5,
  last_report_date: '2025-01-10',
  needs_sync: true,
}

const mockSyncStatus = {
  project_id: 'project-1',
  last_sync_date: '2025-01-09T00:00:00Z',
  activities_needing_sync: 3,
  total_unlinked_entries: 5,
}

const mockSyncResult = {
  success: true,
  activity_id: 'activity-1',
  activity_name: 'Foundation Work',
  updates_applied: {
    percent_complete: 75,
    hours_logged: 40,
  },
  error: null,
}

const mockBatchSyncResult = {
  synced: 5,
  skipped: 2,
  failed: 0,
  results: [mockSyncResult],
}

const mockAutoLinkResult = {
  linked: 8,
  unmatched: 2,
  matches: [
    { progress_entry_id: 'entry-1', activity_id: 'activity-1', confidence: 0.95 },
  ],
}

describe('lookAheadSyncKeys', () => {
  it('should generate correct query keys', () => {
    expect(lookAheadSyncKeys.all).toEqual(['look-ahead-sync'])
    expect(lookAheadSyncKeys.progressSummaries('project-1')).toEqual([
      'look-ahead-sync',
      'summaries',
      'project-1',
      undefined,
      undefined,
    ])
    expect(lookAheadSyncKeys.progressSummaries('project-1', '2025-01-01', '2025-01-07')).toEqual([
      'look-ahead-sync',
      'summaries',
      'project-1',
      '2025-01-01',
      '2025-01-07',
    ])
    expect(lookAheadSyncKeys.syncStatus('project-1')).toEqual([
      'look-ahead-sync',
      'status',
      'project-1',
    ])
    expect(lookAheadSyncKeys.linkedEntries('project-1', '2025-01-01', '2025-01-07')).toEqual([
      'look-ahead-sync',
      'linked',
      'project-1',
      '2025-01-01',
      '2025-01-07',
    ])
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useProgressSummaries', () => {
    it('should fetch progress summaries for a project', async () => {
      mockCalculateProgressSummaries.mockResolvedValue([mockProgressSummary])

      const { result } = renderHook(() => useProgressSummaries('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual([mockProgressSummary])
      expect(mockCalculateProgressSummaries).toHaveBeenCalledWith('project-1', undefined, undefined)
    })

    it('should fetch progress summaries with date range', async () => {
      mockCalculateProgressSummaries.mockResolvedValue([mockProgressSummary])

      const { result } = renderHook(
        () => useProgressSummaries('project-1', '2025-01-01', '2025-01-07'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockCalculateProgressSummaries).toHaveBeenCalledWith('project-1', '2025-01-01', '2025-01-07')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useProgressSummaries(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockCalculateProgressSummaries).not.toHaveBeenCalled()
    })

    it('should not fetch when enabled is false', () => {
      const { result } = renderHook(() => useProgressSummaries('project-1', undefined, undefined, false), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockCalculateProgressSummaries).not.toHaveBeenCalled()
    })
  })

  describe('useSyncStatus', () => {
    it('should fetch sync status for a project', async () => {
      mockGetSyncStatus.mockResolvedValue(mockSyncStatus)

      const { result } = renderHook(() => useSyncStatus('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual(mockSyncStatus)
      expect(mockGetSyncStatus).toHaveBeenCalledWith('project-1')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useSyncStatus(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('should not fetch when enabled is false', () => {
      const { result } = renderHook(() => useSyncStatus('project-1', false), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })
})

describe('Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useSyncActivity', () => {
    it('should sync a single activity successfully', async () => {
      mockSyncActivityFromProgress.mockResolvedValue(mockSyncResult)

      const { result } = renderHook(() => useSyncActivity(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        activityId: 'activity-1',
        summary: mockProgressSummary,
        userId: 'user-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockSyncActivityFromProgress).toHaveBeenCalledWith(
        'activity-1',
        mockProgressSummary,
        'user-1'
      )
    })

    it('should handle sync with no updates needed', async () => {
      const noUpdatesResult = { ...mockSyncResult, updates_applied: {} }
      mockSyncActivityFromProgress.mockResolvedValue(noUpdatesResult)

      const { result } = renderHook(() => useSyncActivity(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        activityId: 'activity-1',
        summary: mockProgressSummary,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should handle sync failure', async () => {
      const failedResult = {
        ...mockSyncResult,
        success: false,
        error: 'Activity not found',
        updates_applied: {},
      }
      mockSyncActivityFromProgress.mockResolvedValue(failedResult)

      const { result } = renderHook(() => useSyncActivity(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        activityId: 'activity-1',
        summary: mockProgressSummary,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      // Note: The hook returns success=true from mutation but result.success=false
    })

    it('should handle API error', async () => {
      mockSyncActivityFromProgress.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useSyncActivity(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        activityId: 'activity-1',
        summary: mockProgressSummary,
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('Network error')
    })
  })

  describe('useBatchSync', () => {
    it('should batch sync all activities', async () => {
      mockSyncAllActivitiesFromProgress.mockResolvedValue(mockBatchSyncResult)

      const { result } = renderHook(() => useBatchSync(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        projectId: 'project-1',
        userId: 'user-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockSyncAllActivitiesFromProgress).toHaveBeenCalledWith(
        'project-1',
        undefined,
        undefined,
        'user-1',
        undefined
      )
    })

    it('should batch sync with date range and onlyNeedsSync', async () => {
      mockSyncAllActivitiesFromProgress.mockResolvedValue(mockBatchSyncResult)

      const { result } = renderHook(() => useBatchSync(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        projectId: 'project-1',
        dateFrom: '2025-01-01',
        dateTo: '2025-01-07',
        userId: 'user-1',
        onlyNeedsSync: true,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockSyncAllActivitiesFromProgress).toHaveBeenCalledWith(
        'project-1',
        '2025-01-01',
        '2025-01-07',
        'user-1',
        true
      )
    })

    it('should handle all activities already synced', async () => {
      const alreadySyncedResult = { synced: 0, skipped: 5, failed: 0, results: [] }
      mockSyncAllActivitiesFromProgress.mockResolvedValue(alreadySyncedResult)

      const { result } = renderHook(() => useBatchSync(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ projectId: 'project-1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should handle partial failures in batch sync', async () => {
      const partialFailResult = { synced: 3, skipped: 1, failed: 2, results: [] }
      mockSyncAllActivitiesFromProgress.mockResolvedValue(partialFailResult)

      const { result } = renderHook(() => useBatchSync(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ projectId: 'project-1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })

  describe('useLinkProgress', () => {
    it('should link a progress entry to an activity', async () => {
      mockLinkProgressToActivity.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useLinkProgress(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        progressEntryId: 'entry-1',
        activityId: 'activity-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockLinkProgressToActivity).toHaveBeenCalledWith('entry-1', 'activity-1')
    })

    it('should handle link error', async () => {
      mockLinkProgressToActivity.mockRejectedValue(new Error('Entry already linked'))

      const { result } = renderHook(() => useLinkProgress(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        progressEntryId: 'entry-1',
        activityId: 'activity-1',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('Entry already linked')
    })
  })

  describe('useUnlinkProgress', () => {
    it('should unlink a progress entry from an activity', async () => {
      mockUnlinkProgressFromActivity.mockResolvedValue({ success: true })

      const { result } = renderHook(() => useUnlinkProgress(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('entry-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockUnlinkProgressFromActivity).toHaveBeenCalledWith('entry-1')
    })

    it('should handle unlink error', async () => {
      mockUnlinkProgressFromActivity.mockRejectedValue(new Error('Entry not found'))

      const { result } = renderHook(() => useUnlinkProgress(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('entry-1')

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('Entry not found')
    })
  })

  describe('useAutoLinkProgress', () => {
    it('should auto-link progress entries', async () => {
      mockAutoLinkProgressEntries.mockResolvedValue(mockAutoLinkResult)

      const { result } = renderHook(() => useAutoLinkProgress(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ projectId: 'project-1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockAutoLinkProgressEntries).toHaveBeenCalledWith('project-1', undefined, undefined)
    })

    it('should auto-link with date range', async () => {
      mockAutoLinkProgressEntries.mockResolvedValue(mockAutoLinkResult)

      const { result } = renderHook(() => useAutoLinkProgress(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        projectId: 'project-1',
        dateFrom: '2025-01-01',
        dateTo: '2025-01-07',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockAutoLinkProgressEntries).toHaveBeenCalledWith('project-1', '2025-01-01', '2025-01-07')
    })

    it('should handle no matches found', async () => {
      const noMatchesResult = { linked: 0, unmatched: 5, matches: [] }
      mockAutoLinkProgressEntries.mockResolvedValue(noMatchesResult)

      const { result } = renderHook(() => useAutoLinkProgress(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ projectId: 'project-1' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('should handle auto-link error', async () => {
      mockAutoLinkProgressEntries.mockRejectedValue(new Error('Auto-link service unavailable'))

      const { result } = renderHook(() => useAutoLinkProgress(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ projectId: 'project-1' })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error?.message).toBe('Auto-link service unavailable')
    })
  })
})
