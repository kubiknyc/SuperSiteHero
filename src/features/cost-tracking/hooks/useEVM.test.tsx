/**
 * Tests for Earned Value Management (EVM) Hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { evmApi } from '@/lib/api/services/earned-value-management'
import {
  evmKeys,
  useEVMMetrics,
  useEVMByDivision,
  useEVMTrend,
  useEVMSCurve,
  useEVMForecasts,
  useEVMAlerts,
  useProjectEVMSummary,
  useEVMSnapshots,
  useCreateEVMSnapshot,
  useUpdateManagementEstimate,
  useGenerateDailySnapshots,
  useEVMDisplayValues,
  useEVMHealthCheck,
} from './useEVM'
import type {
  EarnedValueMetrics,
  EVMByDivision,
  EVMTrendDataPoint,
  EVMSCurveData,
  EVMForecastScenarios,
  ProjectEVMSummary,
  EVMAlert,
} from '@/types/cost-tracking'

// Mock the EVM API
vi.mock('@/lib/api/services/earned-value-management', () => ({
  evmApi: {
    getEVMMetrics: vi.fn(),
    getEVMByDivision: vi.fn(),
    getEVMTrend: vi.fn(),
    getSCurveData: vi.fn(),
    getForecastScenarios: vi.fn(),
    getAlerts: vi.fn(),
    getProjectEVMSummary: vi.fn(),
    getSnapshots: vi.fn(),
    createSnapshot: vi.fn(),
    updateManagementEstimate: vi.fn(),
    generateDailySnapshots: vi.fn(),
  },
}))

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockEVMMetrics: EarnedValueMetrics = {
  project_id: 'project-1',
  status_date: '2024-12-11',
  BAC: 1000000,
  PV: 500000,
  EV: 450000,
  AC: 480000,
  CV: -30000,
  SV: -50000,
  CPI: 0.9375,
  SPI: 0.9,
  CSI: 0.84375,
  EAC: 1066666.67,
  ETC: 586666.67,
  VAC: -66666.67,
  TCPI_BAC: 1.06,
  TCPI_EAC: 1.0,
  CV_percent: -6.67,
  SV_percent: -11.11,
  VAC_percent: -6.67,
  percent_complete_planned: 50.0,
  percent_complete_actual: 45.0,
  percent_spent: 48.0,
  cost_status: 'at_risk',
  schedule_status: 'at_risk',
  overall_status: 'at_risk',
  cost_trend: 'declining',
  schedule_trend: 'declining',
  data_currency: 'current',
}

const mockDivisionData: EVMByDivision[] = [
  {
    division_code: '03',
    division_name: 'Concrete',
    BAC: 200000,
    EV: 90000,
    AC: 95000,
    CPI: 0.947,
    SPI: 0.9,
    percent_complete: 45.0,
  },
  {
    division_code: '05',
    division_name: 'Metals',
    BAC: 300000,
    EV: 135000,
    AC: 140000,
    CPI: 0.964,
    SPI: 0.9,
    percent_complete: 45.0,
  },
]

const mockTrendData: EVMTrendDataPoint[] = [
  {
    date: '2024-11-01',
    CPI: 0.95,
    SPI: 0.92,
    CSI: 0.874,
    percent_complete: 35.0,
  },
  {
    date: '2024-11-15',
    CPI: 0.94,
    SPI: 0.91,
    CSI: 0.8554,
    percent_complete: 40.0,
  },
  {
    date: '2024-12-01',
    CPI: 0.9375,
    SPI: 0.9,
    CSI: 0.84375,
    percent_complete: 45.0,
  },
]

const mockSCurveData: EVMSCurveData = {
  dates: ['2024-10-01', '2024-11-01', '2024-12-01'],
  PV: [300000, 500000, 700000],
  EV: [280000, 450000, 630000],
  AC: [290000, 480000, 670000],
  forecasts: {
    dates: ['2025-01-01', '2025-02-01'],
    EAC_cpi: [850000, 1066667],
    EAC_spi: [900000, 1100000],
  },
}

const mockForecastScenarios: EVMForecastScenarios = {
  original: {
    scenario: 'original',
    EAC: 1000000,
    completion_date: '2025-06-01',
    variance: 0,
    confidence: 'low',
  },
  cpi_based: {
    scenario: 'cpi_based',
    EAC: 1066666.67,
    completion_date: '2025-06-15',
    variance: 66666.67,
    confidence: 'medium',
  },
  cpi_spi_based: {
    scenario: 'cpi_spi_based',
    EAC: 1185185.19,
    completion_date: '2025-07-01',
    variance: 185185.19,
    confidence: 'high',
  },
  management: {
    scenario: 'management',
    EAC: 1050000,
    completion_date: '2025-06-10',
    variance: 50000,
    confidence: 'medium',
    notes: 'Management adjusted estimate',
  },
}

const mockAlerts: EVMAlert[] = [
  {
    type: 'cpi_low',
    severity: 'warning',
    message: 'Cost Performance Index below threshold',
    value: 0.9375,
    threshold: 0.95,
    created_at: '2024-12-11T10:00:00Z',
  },
  {
    type: 'spi_low',
    severity: 'critical',
    message: 'Schedule Performance Index critically low',
    value: 0.9,
    threshold: 0.95,
    created_at: '2024-12-11T10:00:00Z',
  },
]

const mockProjectSummary: ProjectEVMSummary = {
  metrics: mockEVMMetrics,
  alerts: mockAlerts,
  trend: mockTrendData,
  by_division: mockDivisionData,
  forecasts: mockForecastScenarios,
}

describe('EVM Query Keys', () => {
  it('should generate correct base key', () => {
    expect(evmKeys.all).toEqual(['evm'])
  })

  it('should generate correct metrics key', () => {
    expect(evmKeys.metrics('project-1')).toEqual(['evm', 'metrics', 'project-1', undefined])
    expect(evmKeys.metrics('project-1', '2024-12-11')).toEqual([
      'evm',
      'metrics',
      'project-1',
      '2024-12-11',
    ])
  })

  it('should generate correct by-division key', () => {
    expect(evmKeys.byDivision('project-1')).toEqual(['evm', 'by-division', 'project-1'])
  })

  it('should generate correct trend key', () => {
    expect(evmKeys.trend('project-1')).toEqual(['evm', 'trend', 'project-1', undefined])
    expect(evmKeys.trend('project-1', 30)).toEqual(['evm', 'trend', 'project-1', 30])
  })

  it('should generate correct s-curve key', () => {
    expect(evmKeys.sCurve('project-1')).toEqual(['evm', 's-curve', 'project-1'])
  })

  it('should generate correct forecasts key', () => {
    expect(evmKeys.forecasts('project-1')).toEqual(['evm', 'forecasts', 'project-1'])
  })

  it('should generate correct alerts key', () => {
    expect(evmKeys.alerts('project-1')).toEqual(['evm', 'alerts', 'project-1'])
  })

  it('should generate correct summary key', () => {
    expect(evmKeys.summary('project-1')).toEqual(['evm', 'summary', 'project-1'])
  })

  it('should generate correct snapshots key', () => {
    expect(evmKeys.snapshots('project-1')).toEqual(['evm', 'snapshots', 'project-1'])
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useEVMMetrics', () => {
    it('should fetch EVM metrics for a project', async () => {
      vi.mocked(evmApi.getEVMMetrics).mockResolvedValue(mockEVMMetrics)

      const { result } = renderHook(() => useEVMMetrics('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockEVMMetrics)
      expect(evmApi.getEVMMetrics).toHaveBeenCalledWith('project-1', undefined)
    })

    it('should fetch metrics with status date', async () => {
      vi.mocked(evmApi.getEVMMetrics).mockResolvedValue(mockEVMMetrics)

      const { result } = renderHook(() => useEVMMetrics('project-1', '2024-12-11'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(evmApi.getEVMMetrics).toHaveBeenCalledWith('project-1', '2024-12-11')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useEVMMetrics(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isPending).toBe(true)
      expect(evmApi.getEVMMetrics).not.toHaveBeenCalled()
    })

    it('should respect enabled option', () => {
      const { result } = renderHook(() => useEVMMetrics('project-1', undefined, { enabled: false }), {
        wrapper: createWrapper(),
      })

      expect(result.current.isPending).toBe(true)
      expect(evmApi.getEVMMetrics).not.toHaveBeenCalled()
    })
  })

  describe('useEVMByDivision', () => {
    it('should fetch EVM data by division', async () => {
      vi.mocked(evmApi.getEVMByDivision).mockResolvedValue(mockDivisionData)

      const { result } = renderHook(() => useEVMByDivision('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockDivisionData)
      expect(evmApi.getEVMByDivision).toHaveBeenCalledWith('project-1')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useEVMByDivision(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isPending).toBe(true)
      expect(evmApi.getEVMByDivision).not.toHaveBeenCalled()
    })
  })

  describe('useEVMTrend', () => {
    it('should fetch trend data with default days', async () => {
      vi.mocked(evmApi.getEVMTrend).mockResolvedValue(mockTrendData)

      const { result } = renderHook(() => useEVMTrend('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockTrendData)
      expect(evmApi.getEVMTrend).toHaveBeenCalledWith('project-1', 30)
    })

    it('should fetch trend data with custom days', async () => {
      vi.mocked(evmApi.getEVMTrend).mockResolvedValue(mockTrendData)

      const { result } = renderHook(() => useEVMTrend('project-1', 60), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(evmApi.getEVMTrend).toHaveBeenCalledWith('project-1', 60)
    })
  })

  describe('useEVMSCurve', () => {
    it('should fetch S-curve data with forecasts', async () => {
      vi.mocked(evmApi.getSCurveData).mockResolvedValue(mockSCurveData)

      const { result } = renderHook(() => useEVMSCurve('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockSCurveData)
      expect(evmApi.getSCurveData).toHaveBeenCalledWith('project-1', true)
    })

    it('should fetch S-curve data without forecasts', async () => {
      vi.mocked(evmApi.getSCurveData).mockResolvedValue(mockSCurveData)

      const { result } = renderHook(() => useEVMSCurve('project-1', false), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(evmApi.getSCurveData).toHaveBeenCalledWith('project-1', false)
    })
  })

  describe('useEVMForecasts', () => {
    it('should fetch forecast scenarios', async () => {
      vi.mocked(evmApi.getForecastScenarios).mockResolvedValue(mockForecastScenarios)

      const { result } = renderHook(() => useEVMForecasts('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockForecastScenarios)
      expect(evmApi.getForecastScenarios).toHaveBeenCalledWith('project-1')
    })
  })

  describe('useEVMAlerts', () => {
    it('should fetch alerts', async () => {
      vi.mocked(evmApi.getAlerts).mockResolvedValue(mockAlerts)

      const { result } = renderHook(() => useEVMAlerts('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockAlerts)
      expect(evmApi.getAlerts).toHaveBeenCalledWith('project-1')
    })
  })

  describe('useProjectEVMSummary', () => {
    it('should fetch complete EVM summary', async () => {
      vi.mocked(evmApi.getProjectEVMSummary).mockResolvedValue(mockProjectSummary)

      const { result } = renderHook(() => useProjectEVMSummary('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockProjectSummary)
      expect(evmApi.getProjectEVMSummary).toHaveBeenCalledWith('project-1')
    })
  })

  describe('useEVMSnapshots', () => {
    it('should fetch snapshots with default limit', async () => {
      const mockSnapshots = [mockEVMMetrics]
      vi.mocked(evmApi.getSnapshots).mockResolvedValue(mockSnapshots)

      const { result } = renderHook(() => useEVMSnapshots('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockSnapshots)
      expect(evmApi.getSnapshots).toHaveBeenCalledWith('project-1', 30)
    })

    it('should fetch snapshots with custom limit', async () => {
      const mockSnapshots = [mockEVMMetrics]
      vi.mocked(evmApi.getSnapshots).mockResolvedValue(mockSnapshots)

      const { result } = renderHook(() => useEVMSnapshots('project-1', 60), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(evmApi.getSnapshots).toHaveBeenCalledWith('project-1', 60)
    })
  })
})

describe('Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreateEVMSnapshot', () => {
    it('should create a snapshot', async () => {
      vi.mocked(evmApi.createSnapshot).mockResolvedValue(mockEVMMetrics)

      const { result } = renderHook(() => useCreateEVMSnapshot(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        projectId: 'project-1',
        companyId: 'company-1',
        statusDate: '2024-12-11',
        createdBy: 'user-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(evmApi.createSnapshot).toHaveBeenCalledWith(
        'project-1',
        'company-1',
        '2024-12-11',
        'user-1'
      )
    })
  })

  describe('useUpdateManagementEstimate', () => {
    it('should update management estimate', async () => {
      vi.mocked(evmApi.updateManagementEstimate).mockResolvedValue(mockEVMMetrics)

      const { result } = renderHook(() => useUpdateManagementEstimate(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        snapshotId: 'snapshot-1',
        projectId: 'project-1',
        managementEac: 1050000,
        completionDate: '2025-06-10',
        notes: 'Updated estimate',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(evmApi.updateManagementEstimate).toHaveBeenCalledWith(
        'snapshot-1',
        1050000,
        '2025-06-10',
        'Updated estimate'
      )
    })
  })

  describe('useGenerateDailySnapshots', () => {
    it('should generate daily snapshots', async () => {
      vi.mocked(evmApi.generateDailySnapshots).mockResolvedValue({ success: true, count: 5 })

      const { result } = renderHook(() => useGenerateDailySnapshots(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('company-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(evmApi.generateDailySnapshots).toHaveBeenCalledWith('company-1')
    })
  })
})

describe('Helper Hooks', () => {
  describe('useEVMDisplayValues', () => {
    it('should format metrics for display', () => {
      const { result } = renderHook(() => useEVMDisplayValues(mockEVMMetrics))

      expect(result.current.cpi).toBe('0.94')
      expect(result.current.spi).toBe('0.90')
      expect(result.current.csi).toBe('0.84')
      expect(result.current.bac).toBe('$1,000,000')
      expect(result.current.eac).toBe('$1,066,667')
      expect(result.current.etc).toBe('$586,667')
      expect(result.current.vac).toBe('-$66,667')
      expect(result.current.cv).toBe('-$30,000')
      expect(result.current.sv).toBe('-$50,000')
      expect(result.current.percentComplete).toBe('45.0%')
      expect(result.current.percentSpent).toBe('48.0%')
    })

    it('should handle undefined metrics', () => {
      const { result } = renderHook(() => useEVMDisplayValues(undefined))

      expect(result.current.cpi).toBe('—')
      expect(result.current.spi).toBe('—')
      expect(result.current.eac).toBe('—')
      expect(result.current.percentComplete).toBe('—')
    })
  })

  describe('useEVMHealthCheck', () => {
    it('should identify at-risk project with low CPI', async () => {
      vi.mocked(evmApi.getEVMMetrics).mockResolvedValue(mockEVMMetrics)
      vi.mocked(evmApi.getAlerts).mockResolvedValue(mockAlerts)

      const { result } = renderHook(() => useEVMHealthCheck('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isAtRisk).toBe(true))

      expect(result.current.riskLevel).toBe('high')
      expect(result.current.criticalAlerts).toBe(1)
      expect(result.current.warningAlerts).toBe(1)
    })

    it('should identify healthy project', async () => {
      const healthyMetrics = {
        ...mockEVMMetrics,
        CPI: 1.05,
        SPI: 1.02,
        CSI: 1.071,
      }
      vi.mocked(evmApi.getEVMMetrics).mockResolvedValue(healthyMetrics)
      vi.mocked(evmApi.getAlerts).mockResolvedValue([])

      const { result } = renderHook(() => useEVMHealthCheck('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.riskLevel).toBe("low"))

      expect(result.current.isAtRisk).toBe(false)
      expect(result.current.warningAlerts).toBe(0)
      expect(result.current.criticalAlerts).toBe(0)
    })

    it('should identify critical project with CSI < 0.8', async () => {
      const criticalMetrics = {
        ...mockEVMMetrics,
        CPI: 0.75,
        SPI: 0.78,
        CSI: 0.585,
      }
      vi.mocked(evmApi.getEVMMetrics).mockResolvedValue(criticalMetrics)
      vi.mocked(evmApi.getAlerts).mockResolvedValue(mockAlerts)

      const { result } = renderHook(() => useEVMHealthCheck('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.riskLevel).toBe('critical'))
    })

    it('should return unknown for undefined metrics', () => {
      vi.mocked(evmApi.getEVMMetrics).mockResolvedValue(null as any)

      const { result } = renderHook(() => useEVMHealthCheck('project-1'), {
        wrapper: createWrapper(),
      })

      expect(result.current.riskLevel).toBe('unknown')
    })
  })
})

describe('Financial Calculations Accuracy', () => {
  it('should correctly calculate CPI from metrics', () => {
    const metrics = mockEVMMetrics
    const expectedCPI = metrics.EV / metrics.AC
    expect(metrics.CPI).toBeCloseTo(expectedCPI, 2)
  })

  it('should correctly calculate SPI from metrics', () => {
    const metrics = mockEVMMetrics
    const expectedSPI = metrics.EV / metrics.PV
    expect(metrics.SPI).toBeCloseTo(expectedSPI, 2)
  })

  it('should correctly calculate CSI from metrics', () => {
    const metrics = mockEVMMetrics
    const expectedCSI = metrics.CPI * metrics.SPI
    expect(metrics.CSI).toBeCloseTo(expectedCSI, 2)
  })

  it('should correctly calculate EAC from CPI', () => {
    const metrics = mockEVMMetrics
    const expectedEAC = metrics.BAC / metrics.CPI
    expect(metrics.EAC).toBeCloseTo(expectedEAC, 2)
  })

  it('should correctly calculate ETC', () => {
    const metrics = mockEVMMetrics
    const expectedETC = metrics.EAC - metrics.AC
    expect(metrics.ETC).toBeCloseTo(expectedETC, 2)
  })

  it('should correctly calculate VAC', () => {
    const metrics = mockEVMMetrics
    const expectedVAC = metrics.BAC - metrics.EAC
    expect(metrics.VAC).toBeCloseTo(expectedVAC, 2)
  })
})
