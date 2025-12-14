/**
 * Tests for Weather Logs Hooks
 * Construction site weather tracking and impact assessment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Define mock functions before vi.mock calls
const mockFrom = vi.fn()

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

// Mock useAuth
const mockUserProfile = {
  id: 'user-123',
  company_id: 'company-456',
  full_name: 'Test User',
}

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: mockUserProfile,
  }),
}))

import {
  useWeatherLogs,
  useAllWeatherLogs,
  useWeatherLog,
  useWeatherLogByDate,
  useCreateWeatherLog,
  useUpdateWeatherLog,
  useDeleteWeatherLog,
  useWeatherStatistics,
} from './useWeatherLogs'

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

const createChainMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation((onFulfilled) =>
    Promise.resolve({ data, error }).then(onFulfilled)
  ),
})

// =============================================
// Test Data
// =============================================

const mockWeatherLog = {
  id: 'weather-1',
  project_id: 'project-1',
  company_id: 'company-456',
  log_date: '2024-01-15',
  conditions: 'clear',
  temperature_high: 75,
  temperature_low: 55,
  precipitation_amount: 0,
  work_impact: 'none',
  work_stopped: false,
  hours_lost: 0,
  notes: 'Good weather for concrete work',
  recorded_by: 'user-123',
  created_at: '2024-01-15T08:00:00Z',
}

const mockWeatherLogWithProject = {
  ...mockWeatherLog,
  project: { id: 'project-1', name: 'Main Street Tower' },
}

// =============================================
// Query Hooks Tests
// =============================================

describe('useWeatherLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch weather logs for project', async () => {
    mockFrom.mockReturnValue(createChainMock([mockWeatherLogWithProject]))

    const { result } = renderHook(() => useWeatherLogs('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('weather_logs')
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data![0].conditions).toBe('clear')
  })

  it('should not fetch when projectId is undefined', async () => {
    renderHook(() => useWeatherLogs(undefined), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('should apply date filters', async () => {
    const chainMock = createChainMock([mockWeatherLogWithProject])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useWeatherLogs('project-1', {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.gte).toHaveBeenCalledWith('log_date', '2024-01-01')
    expect(chainMock.lte).toHaveBeenCalledWith('log_date', '2024-01-31')
  })

  it('should apply conditions filter', async () => {
    const chainMock = createChainMock([mockWeatherLogWithProject])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useWeatherLogs('project-1', { conditions: ['rain', 'snow'] }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.in).toHaveBeenCalledWith('conditions', ['rain', 'snow'])
  })

  it('should apply work impact filter', async () => {
    const chainMock = createChainMock([mockWeatherLogWithProject])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useWeatherLogs('project-1', { workImpact: ['moderate', 'severe'] }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.in).toHaveBeenCalledWith('work_impact', ['moderate', 'severe'])
  })

  it('should apply work stopped filter', async () => {
    const chainMock = createChainMock([mockWeatherLogWithProject])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useWeatherLogs('project-1', { workStopped: true }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.eq).toHaveBeenCalledWith('work_stopped', true)
  })
})

describe('useAllWeatherLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch all weather logs for company', async () => {
    mockFrom.mockReturnValue(createChainMock([mockWeatherLogWithProject]))

    const { result } = renderHook(() => useAllWeatherLogs(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('weather_logs')
    expect(result.current.data).toBeDefined()
  })

  it('should apply filters to all logs query', async () => {
    const chainMock = createChainMock([mockWeatherLogWithProject])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useAllWeatherLogs({
        dateFrom: '2024-01-01',
        conditions: ['rain'],
        workStopped: true,
      }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.gte).toHaveBeenCalledWith('log_date', '2024-01-01')
    expect(chainMock.in).toHaveBeenCalledWith('conditions', ['rain'])
    expect(chainMock.eq).toHaveBeenCalledWith('work_stopped', true)
  })
})

describe('useWeatherLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch single weather log', async () => {
    const logWithDetails = {
      ...mockWeatherLog,
      project: { id: 'project-1', name: 'Main Street Tower', address: '123 Main St' },
      recorded_by_user: { id: 'user-123', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    }
    mockFrom.mockReturnValue(createChainMock(logWithDetails))

    const { result } = renderHook(() => useWeatherLog('weather-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('weather_logs')
    expect(result.current.data?.id).toBe('weather-1')
  })

  it('should not fetch when logId is undefined', async () => {
    renderHook(() => useWeatherLog(undefined), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('useWeatherLogByDate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch weather log by project and date', async () => {
    mockFrom.mockReturnValue(createChainMock(mockWeatherLog))

    const { result } = renderHook(
      () => useWeatherLogByDate('project-1', '2024-01-15'),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFrom).toHaveBeenCalledWith('weather_logs')
    expect(result.current.data?.log_date).toBe('2024-01-15')
  })

  it('should return null when no log exists for date', async () => {
    mockFrom.mockReturnValue(createChainMock(null))

    const { result } = renderHook(
      () => useWeatherLogByDate('project-1', '2024-02-01'),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })

  it('should not fetch when params are missing', async () => {
    renderHook(() => useWeatherLogByDate(undefined, undefined), { wrapper })

    await new Promise((r) => setTimeout(r, 100))
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

// =============================================
// Mutation Hooks Tests
// =============================================

describe('useCreateWeatherLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create weather log', async () => {
    mockFrom.mockReturnValue(createChainMock(mockWeatherLog))

    const { result } = renderHook(() => useCreateWeatherLog(), { wrapper })

    await result.current.mutateAsync({
      project_id: 'project-1',
      log_date: '2024-01-15',
      conditions: 'clear',
      temperature_high: 75,
      temperature_low: 55,
      work_impact: 'none',
    })

    expect(mockFrom).toHaveBeenCalledWith('weather_logs')
  })

  it('should include company_id and recorded_by from user profile', async () => {
    const chainMock = createChainMock(mockWeatherLog)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useCreateWeatherLog(), { wrapper })

    await result.current.mutateAsync({
      project_id: 'project-1',
      log_date: '2024-01-15',
      conditions: 'rain',
    })

    expect(chainMock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        company_id: 'company-456',
        recorded_by: 'user-123',
      })
    )
  })
})

describe('useUpdateWeatherLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update weather log', async () => {
    const chainMock = createChainMock({ ...mockWeatherLog, notes: 'Updated notes' })
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useUpdateWeatherLog(), { wrapper })

    await result.current.mutateAsync({
      id: 'weather-1',
      notes: 'Updated notes',
      work_impact: 'moderate',
    })

    expect(chainMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: 'Updated notes',
        work_impact: 'moderate',
      })
    )
    expect(chainMock.eq).toHaveBeenCalledWith('id', 'weather-1')
  })
})

describe('useDeleteWeatherLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete weather log', async () => {
    const chainMock = createChainMock(null)
    mockFrom.mockReturnValue(chainMock)

    const { result } = renderHook(() => useDeleteWeatherLog(), { wrapper })

    await result.current.mutateAsync('weather-1')

    expect(chainMock.delete).toHaveBeenCalled()
    expect(chainMock.eq).toHaveBeenCalledWith('id', 'weather-1')
  })
})

// =============================================
// Statistics Tests
// =============================================

describe('useWeatherStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate statistics from weather logs', async () => {
    const logs = [
      { ...mockWeatherLog, id: 'w1', temperature_high: 80, temperature_low: 60, hours_lost: 0, work_impact: 'none', precipitation_amount: 0, conditions: 'clear' },
      { ...mockWeatherLog, id: 'w2', temperature_high: 70, temperature_low: 50, hours_lost: 4, work_impact: 'moderate', precipitation_amount: 0.5, conditions: 'rain' },
      { ...mockWeatherLog, id: 'w3', temperature_high: 60, temperature_low: 40, hours_lost: 8, work_impact: 'severe', precipitation_amount: 2.0, conditions: 'rain' },
    ]
    mockFrom.mockReturnValue(createChainMock(logs))

    const { result } = renderHook(() => useWeatherStatistics('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.totalLogs).toBe(3)
    expect(result.current.data?.averageHighTemp).toBe(70) // (80+70+60)/3 = 70
    expect(result.current.data?.averageLowTemp).toBe(50) // (60+50+40)/3 = 50
    expect(result.current.data?.totalHoursLost).toBe(12) // 0+4+8 = 12
    expect(result.current.data?.daysWithImpact).toBe(2) // moderate + severe
    expect(result.current.data?.daysWithSevereImpact).toBe(1)
    expect(result.current.data?.totalPrecipitation).toBe(2.5) // 0+0.5+2.0 = 2.5
    expect(result.current.data?.mostCommonCondition).toBe('rain') // rain appears twice
  })

  it('should return zeros when no logs exist', async () => {
    mockFrom.mockReturnValue(createChainMock([]))

    const { result } = renderHook(() => useWeatherStatistics('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual({
      totalLogs: 0,
      averageHighTemp: null,
      averageLowTemp: null,
      totalHoursLost: 0,
      daysWithImpact: 0,
      daysWithSevereImpact: 0,
      mostCommonCondition: null,
      totalPrecipitation: 0,
    })
  })

  it('should apply date filters to statistics', async () => {
    const chainMock = createChainMock([mockWeatherLog])
    mockFrom.mockReturnValue(chainMock)

    renderHook(
      () => useWeatherStatistics('project-1', {
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
      }),
      { wrapper }
    )

    await waitFor(() => expect(mockFrom).toHaveBeenCalled())
    expect(chainMock.gte).toHaveBeenCalledWith('log_date', '2024-01-01')
    expect(chainMock.lte).toHaveBeenCalledWith('log_date', '2024-01-31')
  })

  it('should handle null temperature values', async () => {
    const logsWithNulls = [
      { ...mockWeatherLog, id: 'w1', temperature_high: null, temperature_low: null, hours_lost: 0, work_impact: 'none', precipitation_amount: 0, conditions: 'cloudy' },
      { ...mockWeatherLog, id: 'w2', temperature_high: 70, temperature_low: 50, hours_lost: 0, work_impact: 'none', precipitation_amount: 0, conditions: 'clear' },
    ]
    mockFrom.mockReturnValue(createChainMock(logsWithNulls))

    const { result } = renderHook(() => useWeatherStatistics('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Should calculate averages only from non-null values
    expect(result.current.data?.averageHighTemp).toBe(70)
    expect(result.current.data?.averageLowTemp).toBe(50)
  })
})

// =============================================
// Error Handling Tests
// =============================================

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle query error', async () => {
    mockFrom.mockReturnValue(createChainMock(null, { message: 'Network error' }))

    const { result } = renderHook(() => useWeatherLogs('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeDefined()
  })

  it('should handle mutation error', async () => {
    mockFrom.mockReturnValue(createChainMock(null, { message: 'Validation failed' }))

    const { result } = renderHook(() => useCreateWeatherLog(), { wrapper })

    await expect(
      result.current.mutateAsync({
        project_id: 'project-1',
        log_date: '2024-01-15',
      })
    ).rejects.toEqual({ message: 'Validation failed' })
  })
})

// =============================================
// Weather Conditions Tests
// =============================================

describe('Weather Conditions', () => {
  it('should handle various weather conditions', async () => {
    const variousConditions = [
      { ...mockWeatherLog, id: 'w1', conditions: 'clear' },
      { ...mockWeatherLog, id: 'w2', conditions: 'cloudy' },
      { ...mockWeatherLog, id: 'w3', conditions: 'rain' },
      { ...mockWeatherLog, id: 'w4', conditions: 'snow' },
      { ...mockWeatherLog, id: 'w5', conditions: 'windy' },
    ]
    mockFrom.mockReturnValue(createChainMock(variousConditions))

    const { result } = renderHook(() => useWeatherLogs('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(5)
    const conditions = result.current.data!.map((l) => l.conditions)
    expect(conditions).toContain('clear')
    expect(conditions).toContain('rain')
    expect(conditions).toContain('snow')
  })
})

// =============================================
// Work Impact Tests
// =============================================

describe('Work Impact', () => {
  it('should handle various work impact levels', async () => {
    const variousImpacts = [
      { ...mockWeatherLog, id: 'w1', work_impact: 'none', hours_lost: 0 },
      { ...mockWeatherLog, id: 'w2', work_impact: 'minor', hours_lost: 1 },
      { ...mockWeatherLog, id: 'w3', work_impact: 'moderate', hours_lost: 4 },
      { ...mockWeatherLog, id: 'w4', work_impact: 'severe', hours_lost: 8 },
    ]
    mockFrom.mockReturnValue(createChainMock(variousImpacts))

    const { result } = renderHook(() => useWeatherLogs('project-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(4)
    const impacts = result.current.data!.map((l) => l.work_impact)
    expect(impacts).toContain('none')
    expect(impacts).toContain('moderate')
    expect(impacts).toContain('severe')
  })
})
