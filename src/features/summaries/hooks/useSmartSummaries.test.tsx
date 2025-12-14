/**
 * Tests for Smart Summaries Hooks
 * AI-generated summaries for daily reports, meetings, weekly status
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Define mock functions before vi.mock calls
const mockGenerateDailyReportSummary = vi.fn()
const mockExtractMeetingActionItems = vi.fn()
const mockGenerateWeeklyStatus = vi.fn()
const mockGenerateCOImpactSummary = vi.fn()
const mockUpdateActionItemStatus = vi.fn()
const mockIsEnabled = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

// Mock API services
vi.mock('@/lib/api/services/smart-summaries', () => ({
  smartSummariesApi: {
    generateDailyReportSummary: (...args: unknown[]) => mockGenerateDailyReportSummary(...args),
    extractMeetingActionItems: (...args: unknown[]) => mockExtractMeetingActionItems(...args),
    generateWeeklyStatus: (...args: unknown[]) => mockGenerateWeeklyStatus(...args),
    generateCOImpactSummary: (...args: unknown[]) => mockGenerateCOImpactSummary(...args),
    updateActionItemStatus: (...args: unknown[]) => mockUpdateActionItemStatus(...args),
  },
}))

// Mock AI feature enabled hook
vi.mock('@/features/ai/hooks/useAIConfiguration', () => ({
  useAIFeatureEnabled: () => ({
    isEnabled: mockIsEnabled(),
  }),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import {
  summaryQueryKeys,
  useDailyReportSummary,
  useGenerateDailyReportSummary,
  useMeetingActionItems,
  useExtractMeetingActionItems,
  useWeeklyStatus,
  useGenerateWeeklyStatus,
  useChangeOrderImpact,
  useUpdateActionItemStatus,
  useDailyReportSummaryWorkflow,
  useMeetingActionItemsWorkflow,
} from './useSmartSummaries'

// =============================================
// Test Utilities
// =============================================

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>
    {children}
  </QueryClientProvider>
)

// =============================================
// Test Data
// =============================================

const mockDailyReportSummary = {
  id: 'summary-1',
  reportId: 'report-1',
  summary: 'Concrete pour completed on level 3. Weather conditions favorable.',
  keyHighlights: ['Concrete pour completed', '8 workers on site', 'No safety incidents'],
  safetyNotes: ['All PPE requirements met'],
  weatherImpact: 'No impact',
  generatedAt: '2024-01-15T17:00:00Z',
}

const mockMeetingActionItems = {
  meetingId: 'meeting-1',
  actionItems: [
    {
      id: 'action-1',
      description: 'Submit revised drawings by Friday',
      assignee: 'John Smith',
      dueDate: '2024-01-19',
      status: 'extracted',
      priority: 'high',
    },
    {
      id: 'action-2',
      description: 'Schedule concrete inspection',
      assignee: 'Jane Doe',
      dueDate: '2024-01-18',
      status: 'extracted',
      priority: 'medium',
    },
  ],
  extractedAt: '2024-01-15T14:00:00Z',
}

const mockWeeklyStatus = {
  projectId: 'project-1',
  weekOf: '2024-01-15',
  summary: 'Project on schedule. Main structure 75% complete.',
  progressHighlights: ['Level 3 concrete complete', 'MEP rough-in started'],
  upcomingTasks: ['Level 4 formwork', 'Elevator installation'],
  risks: ['Material delivery delay possible'],
  generatedAt: '2024-01-19T08:00:00Z',
}

const mockChangeOrderImpact = {
  projectId: 'project-1',
  totalCOs: 5,
  totalValue: 125000,
  budgetImpact: '+3.2%',
  scheduleImpact: '+5 days',
  summary: 'Change orders trending above average for project phase.',
}

// =============================================
// Query Keys Tests
// =============================================

describe('summaryQueryKeys', () => {
  it('should have correct base key', () => {
    expect(summaryQueryKeys.all).toEqual(['summaries'])
  })

  it('should generate daily report key', () => {
    expect(summaryQueryKeys.dailyReport('report-1')).toEqual(['summaries', 'daily-report', 'report-1'])
  })

  it('should generate meeting key', () => {
    expect(summaryQueryKeys.meeting('meeting-1')).toEqual(['summaries', 'meeting', 'meeting-1'])
  })

  it('should generate weekly key', () => {
    expect(summaryQueryKeys.weekly('project-1', '2024-01-15')).toEqual([
      'summaries', 'weekly', 'project-1', '2024-01-15'
    ])
  })

  it('should generate change orders key', () => {
    expect(summaryQueryKeys.changeOrders('project-1')).toEqual([
      'summaries', 'change-orders', 'project-1'
    ])
  })
})

// =============================================
// Daily Report Summary Tests
// =============================================

describe('useDailyReportSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsEnabled.mockReturnValue(true)
  })

  it('should fetch daily report summary when enabled', async () => {
    mockGenerateDailyReportSummary.mockResolvedValue(mockDailyReportSummary)

    const { result } = renderHook(() => useDailyReportSummary('report-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGenerateDailyReportSummary).toHaveBeenCalledWith('report-1')
    expect(result.current.data).toEqual(mockDailyReportSummary)
  })

  it('should not fetch when AI is disabled', async () => {
    mockIsEnabled.mockReturnValue(false)

    renderHook(() => useDailyReportSummary('report-1'), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockGenerateDailyReportSummary).not.toHaveBeenCalled()
  })

  it('should not fetch when reportId is undefined', async () => {
    renderHook(() => useDailyReportSummary(undefined), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockGenerateDailyReportSummary).not.toHaveBeenCalled()
  })
})

describe('useGenerateDailyReportSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate daily report summary', async () => {
    mockGenerateDailyReportSummary.mockResolvedValue(mockDailyReportSummary)

    const { result } = renderHook(() => useGenerateDailyReportSummary(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ reportId: 'report-1' })
    })

    expect(mockGenerateDailyReportSummary).toHaveBeenCalledWith('report-1', undefined)
    expect(mockToastSuccess).toHaveBeenCalledWith('Summary generated successfully')
  })

  it('should force regenerate when flag is set', async () => {
    mockGenerateDailyReportSummary.mockResolvedValue(mockDailyReportSummary)

    const { result } = renderHook(() => useGenerateDailyReportSummary(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ reportId: 'report-1', forceRegenerate: true })
    })

    expect(mockGenerateDailyReportSummary).toHaveBeenCalledWith('report-1', true)
  })

  it('should show error toast on failure', async () => {
    mockGenerateDailyReportSummary.mockRejectedValue(new Error('AI service unavailable'))

    const { result } = renderHook(() => useGenerateDailyReportSummary(), { wrapper })

    await expect(
      result.current.mutateAsync({ reportId: 'report-1' })
    ).rejects.toThrow('AI service unavailable')

    expect(mockToastError).toHaveBeenCalled()
  })
})

// =============================================
// Meeting Action Items Tests
// =============================================

describe('useMeetingActionItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsEnabled.mockReturnValue(true)
  })

  it('should fetch meeting action items', async () => {
    mockExtractMeetingActionItems.mockResolvedValue(mockMeetingActionItems)

    const { result } = renderHook(() => useMeetingActionItems('meeting-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockExtractMeetingActionItems).toHaveBeenCalledWith('meeting-1')
    expect(result.current.data?.actionItems).toHaveLength(2)
  })

  it('should not fetch when AI is disabled', async () => {
    mockIsEnabled.mockReturnValue(false)

    renderHook(() => useMeetingActionItems('meeting-1'), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockExtractMeetingActionItems).not.toHaveBeenCalled()
  })
})

describe('useExtractMeetingActionItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should extract meeting action items', async () => {
    mockExtractMeetingActionItems.mockResolvedValue(mockMeetingActionItems)

    const { result } = renderHook(() => useExtractMeetingActionItems(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ meetingId: 'meeting-1' })
    })

    expect(mockExtractMeetingActionItems).toHaveBeenCalledWith('meeting-1', undefined)
    expect(mockToastSuccess).toHaveBeenCalledWith('Extracted 2 action items')
  })

  it('should force re-extract when flag is set', async () => {
    mockExtractMeetingActionItems.mockResolvedValue(mockMeetingActionItems)

    const { result } = renderHook(() => useExtractMeetingActionItems(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ meetingId: 'meeting-1', forceRegenerate: true })
    })

    expect(mockExtractMeetingActionItems).toHaveBeenCalledWith('meeting-1', true)
  })
})

// =============================================
// Weekly Status Tests
// =============================================

describe('useWeeklyStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsEnabled.mockReturnValue(true)
  })

  it('should fetch weekly status', async () => {
    mockGenerateWeeklyStatus.mockResolvedValue(mockWeeklyStatus)

    const { result } = renderHook(
      () => useWeeklyStatus('project-1', '2024-01-15'),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGenerateWeeklyStatus).toHaveBeenCalledWith('project-1', '2024-01-15')
    expect(result.current.data).toEqual(mockWeeklyStatus)
  })

  it('should not fetch when projectId is undefined', async () => {
    renderHook(() => useWeeklyStatus(undefined, '2024-01-15'), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockGenerateWeeklyStatus).not.toHaveBeenCalled()
  })

  it('should not fetch when weekOf is empty', async () => {
    renderHook(() => useWeeklyStatus('project-1', ''), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockGenerateWeeklyStatus).not.toHaveBeenCalled()
  })
})

describe('useGenerateWeeklyStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate weekly status', async () => {
    mockGenerateWeeklyStatus.mockResolvedValue(mockWeeklyStatus)

    const { result } = renderHook(() => useGenerateWeeklyStatus(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        projectId: 'project-1',
        weekOf: '2024-01-15',
      })
    })

    expect(mockGenerateWeeklyStatus).toHaveBeenCalledWith('project-1', '2024-01-15', undefined)
    expect(mockToastSuccess).toHaveBeenCalledWith('Weekly status generated')
  })
})

// =============================================
// Change Order Impact Tests
// =============================================

describe('useChangeOrderImpact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsEnabled.mockReturnValue(true)
  })

  it('should fetch change order impact summary', async () => {
    mockGenerateCOImpactSummary.mockResolvedValue(mockChangeOrderImpact)

    const { result } = renderHook(() => useChangeOrderImpact('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGenerateCOImpactSummary).toHaveBeenCalledWith('project-1')
    expect(result.current.data?.totalCOs).toBe(5)
    expect(result.current.data?.totalValue).toBe(125000)
  })

  it('should not fetch when projectId is undefined', async () => {
    renderHook(() => useChangeOrderImpact(undefined), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockGenerateCOImpactSummary).not.toHaveBeenCalled()
  })
})

// =============================================
// Action Item Status Tests
// =============================================

describe('useUpdateActionItemStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update action item status to confirmed', async () => {
    mockUpdateActionItemStatus.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useUpdateActionItemStatus(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        actionItemId: 'action-1',
        status: 'confirmed',
        assigneeId: 'user-123',
      })
    })

    expect(mockUpdateActionItemStatus).toHaveBeenCalledWith('action-1', 'confirmed', 'user-123')
    expect(mockToastSuccess).toHaveBeenCalledWith('Action item updated')
  })

  it('should update action item status to rejected', async () => {
    mockUpdateActionItemStatus.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useUpdateActionItemStatus(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        actionItemId: 'action-1',
        status: 'rejected',
      })
    })

    expect(mockUpdateActionItemStatus).toHaveBeenCalledWith('action-1', 'rejected', undefined)
  })

  it('should update action item status to completed', async () => {
    mockUpdateActionItemStatus.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useUpdateActionItemStatus(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        actionItemId: 'action-1',
        status: 'completed',
      })
    })

    expect(mockUpdateActionItemStatus).toHaveBeenCalledWith('action-1', 'completed', undefined)
  })

  it('should show error toast on failure', async () => {
    mockUpdateActionItemStatus.mockRejectedValue(new Error('Update failed'))

    const { result } = renderHook(() => useUpdateActionItemStatus(), { wrapper })

    await expect(
      result.current.mutateAsync({
        actionItemId: 'action-1',
        status: 'confirmed',
      })
    ).rejects.toThrow('Update failed')

    expect(mockToastError).toHaveBeenCalled()
  })
})

// =============================================
// Workflow Hook Tests
// =============================================

describe('useDailyReportSummaryWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsEnabled.mockReturnValue(true)
  })

  it('should provide summary data', async () => {
    mockGenerateDailyReportSummary.mockResolvedValue(mockDailyReportSummary)

    const { result } = renderHook(() => useDailyReportSummaryWorkflow('report-1'), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())

    expect(result.current.data).toEqual(mockDailyReportSummary)
    expect(result.current.isLoading).toBe(false)
  })

  it('should have generate function', () => {
    const { result } = renderHook(() => useDailyReportSummaryWorkflow('report-1'), { wrapper })

    expect(typeof result.current.generate).toBe('function')
    expect(typeof result.current.regenerate).toBe('function')
  })

  it('should not generate when reportId is undefined', () => {
    mockGenerateDailyReportSummary.mockResolvedValue(mockDailyReportSummary)

    const { result } = renderHook(() => useDailyReportSummaryWorkflow(undefined), { wrapper })

    act(() => {
      result.current.generate()
    })

    // Should not call API when reportId is undefined
    expect(mockGenerateDailyReportSummary).not.toHaveBeenCalled()
  })
})

describe('useMeetingActionItemsWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsEnabled.mockReturnValue(true)
  })

  it('should provide action items data', async () => {
    mockExtractMeetingActionItems.mockResolvedValue(mockMeetingActionItems)

    const { result } = renderHook(() => useMeetingActionItemsWorkflow('meeting-1'), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())

    expect(result.current.data?.actionItems).toHaveLength(2)
  })

  it('should have workflow functions', () => {
    const { result } = renderHook(() => useMeetingActionItemsWorkflow('meeting-1'), { wrapper })

    expect(typeof result.current.extract).toBe('function')
    expect(typeof result.current.reextract).toBe('function')
    expect(typeof result.current.confirmItem).toBe('function')
    expect(typeof result.current.rejectItem).toBe('function')
    expect(typeof result.current.completeItem).toBe('function')
  })

  it('should not extract when meetingId is undefined', () => {
    const { result } = renderHook(() => useMeetingActionItemsWorkflow(undefined), { wrapper })

    act(() => {
      result.current.extract()
    })

    expect(mockExtractMeetingActionItems).not.toHaveBeenCalled()
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsEnabled.mockReturnValue(true)
  })

  it('should handle API error in query', async () => {
    mockGenerateDailyReportSummary.mockRejectedValue(new Error('Service unavailable'))

    const { result } = renderHook(() => useDailyReportSummary('report-1'), { wrapper })

    // Wait for query to fail (with retry: 1, it will retry once before failing)
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 })

    expect(result.current.error).toBeDefined()
  })

  it('should handle API error in mutation', async () => {
    mockGenerateWeeklyStatus.mockRejectedValue(new Error('Generation failed'))

    const { result } = renderHook(() => useGenerateWeeklyStatus(), { wrapper })

    await expect(
      result.current.mutateAsync({
        projectId: 'project-1',
        weekOf: '2024-01-15',
      })
    ).rejects.toThrow('Generation failed')

    expect(mockToastError).toHaveBeenCalled()
  })
})

// =============================================
// Caching Tests
// =============================================

describe('Caching Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsEnabled.mockReturnValue(true)
  })

  it('should cache daily report summary for 1 hour', async () => {
    mockGenerateDailyReportSummary.mockResolvedValue(mockDailyReportSummary)

    const { result, rerender } = renderHook(
      () => useDailyReportSummary('report-1'),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // First call
    expect(mockGenerateDailyReportSummary).toHaveBeenCalledTimes(1)

    // Rerender should use cached data
    rerender()
    expect(mockGenerateDailyReportSummary).toHaveBeenCalledTimes(1)
  })
})
