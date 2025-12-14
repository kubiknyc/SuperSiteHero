/**
 * Analytics API Service Tests
 * Comprehensive tests for predictive analytics functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { analyticsApi } from './analytics'
import { supabase } from '@/lib/supabase'
import type {
  ProjectSnapshot,
  AnalyticsPrediction,
  AnalyticsRecommendation,
  ModelMetadata,
  RiskAssessment,
} from '@/types/analytics'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

describe('Analytics API Service', () => {
  const mockProjectId = 'test-project-123'
  const mockSnapshotId = 'snapshot-123'
  const mockRecommendationId = 'rec-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================================
  // SNAPSHOT OPERATIONS
  // ============================================================================

  describe('collectProjectSnapshot', () => {
    it('should collect a snapshot successfully', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: mockSnapshotId,
        error: null,
      })
      vi.mocked(supabase.rpc).mockReturnValue(mockRpc as any)

      const result = await analyticsApi.collectProjectSnapshot(mockProjectId)

      expect(supabase.rpc).toHaveBeenCalledWith('collect_project_snapshot', {
        p_project_id: mockProjectId,
      })
      expect(result).toBe(mockSnapshotId)
    })

    it('should handle snapshot collection error', async () => {
      const mockError = new Error('Database error')
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      } as any)

      await expect(analyticsApi.collectProjectSnapshot(mockProjectId)).rejects.toThrow()
    })
  })

  describe('getProjectSnapshots', () => {
    const mockSnapshots: ProjectSnapshot[] = [
      {
        id: 'snap-1',
        project_id: mockProjectId,
        snapshot_date: '2024-01-15',
        schedule_spi: 0.95,
        cost_cpi: 1.02,
        percent_complete: 45.5,
        days_to_completion: 120,
        total_budget: 1000000,
        actual_cost: 450000,
        open_rfis: 5,
        open_submittals: 8,
        open_change_orders: 3,
        safety_incidents: 1,
        quality_issues: 2,
        subcontractor_count: 12,
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: 'snap-2',
        project_id: mockProjectId,
        snapshot_date: '2024-01-14',
        schedule_spi: 0.93,
        cost_cpi: 1.01,
        percent_complete: 44.0,
        days_to_completion: 125,
        total_budget: 1000000,
        actual_cost: 440000,
        open_rfis: 6,
        open_submittals: 10,
        open_change_orders: 3,
        safety_incidents: 0,
        quality_issues: 1,
        subcontractor_count: 12,
        created_at: '2024-01-14T10:00:00Z',
      },
    ]

    it('should fetch project snapshots', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSnapshots, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getProjectSnapshots(mockProjectId)

      expect(supabase.from).toHaveBeenCalledWith('analytics_project_snapshots')
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', mockProjectId)
      expect(result).toEqual(mockSnapshots)
    })

    it('should filter snapshots by date range', async () => {
      const filters = {
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockSnapshots, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getProjectSnapshots(mockProjectId, filters)

      expect(mockQuery.gte).toHaveBeenCalledWith('snapshot_date', filters.date_from)
      expect(mockQuery.lte).toHaveBeenCalledWith('snapshot_date', filters.date_to)
      expect(result).toEqual(mockSnapshots)
    })

    it('should return empty array when no snapshots found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getProjectSnapshots(mockProjectId)

      expect(result).toEqual([])
    })
  })

  describe('getLatestSnapshot', () => {
    it('should fetch the latest snapshot', async () => {
      const mockSnapshot = {
        id: 'snap-latest',
        project_id: mockProjectId,
        snapshot_date: '2024-01-15',
        schedule_spi: 0.95,
        cost_cpi: 1.02,
        percent_complete: 45.5,
        days_to_completion: 120,
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSnapshot, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getLatestSnapshot(mockProjectId)

      expect(mockQuery.limit).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockSnapshot)
    })

    it('should return null when no snapshots exist', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getLatestSnapshot(mockProjectId)

      expect(result).toBeNull()
    })
  })

  // ============================================================================
  // PREDICTION OPERATIONS
  // ============================================================================

  describe('getLatestPrediction', () => {
    it('should fetch the latest prediction', async () => {
      const mockPrediction: AnalyticsPrediction = {
        id: 'pred-1',
        project_id: mockProjectId,
        prediction_date: '2024-01-15',
        model_version: 'v1.0',
        predicted_completion_date: '2024-06-15',
        predicted_final_cost: 1050000,
        confidence_score: 0.85,
        risk_factors: ['weather_delay', 'material_shortage'],
        created_at: '2024-01-15T10:00:00Z',
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPrediction, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getLatestPrediction(mockProjectId)

      expect(result).toEqual(mockPrediction)
    })
  })

  describe('storePrediction', () => {
    it('should store a new prediction', async () => {
      const newPrediction = {
        project_id: mockProjectId,
        prediction_date: '2024-01-15',
        model_version: 'v1.0',
        predicted_completion_date: '2024-06-15',
        predicted_final_cost: 1050000,
        confidence_score: 0.85,
        risk_factors: ['weather_delay'],
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'pred-new', ...newPrediction, created_at: '2024-01-15T10:00:00Z' },
          error: null,
        }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.storePrediction(newPrediction)

      expect(mockQuery.insert).toHaveBeenCalledWith(newPrediction)
      expect(result).toHaveProperty('id')
    })
  })

  // ============================================================================
  // RISK ASSESSMENT
  // ============================================================================

  describe('getRiskScores', () => {
    it('should fetch risk assessment for project', async () => {
      const mockRiskAssessment: RiskAssessment = {
        project_id: mockProjectId,
        overall_risk: 'medium',
        risk_scores: {
          schedule_risk: 0.65,
          cost_risk: 0.45,
          quality_risk: 0.30,
          safety_risk: 0.25,
        },
        assessed_at: '2024-01-15T10:00:00Z',
      }

      const mockRpc = vi.fn().mockResolvedValue({
        data: mockRiskAssessment,
        error: null,
      })
      vi.mocked(supabase.rpc).mockReturnValue(mockRpc as any)

      const result = await analyticsApi.getRiskScores(mockProjectId)

      expect(supabase.rpc).toHaveBeenCalledWith('calculate_risk_assessment', {
        p_project_id: mockProjectId,
      })
      expect(result).toEqual(mockRiskAssessment)
    })

    it('should handle risk calculation errors', async () => {
      const mockError = new Error('Risk calculation failed')
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: mockError,
      } as any)

      await expect(analyticsApi.getRiskScores(mockProjectId)).rejects.toThrow()
    })
  })

  // ============================================================================
  // RECOMMENDATION OPERATIONS
  // ============================================================================

  describe('getRecommendations', () => {
    const mockRecommendations: AnalyticsRecommendation[] = [
      {
        id: 'rec-1',
        project_id: mockProjectId,
        category: 'schedule',
        priority: 'high',
        title: 'Accelerate Critical Path Activities',
        description: 'Consider adding resources to critical path activities to mitigate schedule risk.',
        status: 'pending',
        impact_score: 0.75,
        created_at: '2024-01-15T10:00:00Z',
      },
      {
        id: 'rec-2',
        project_id: mockProjectId,
        category: 'cost',
        priority: 'medium',
        title: 'Review Material Pricing',
        description: 'Material costs are trending higher than budget. Consider bulk purchasing.',
        status: 'pending',
        impact_score: 0.60,
        created_at: '2024-01-15T09:00:00Z',
      },
    ]

    it('should fetch all recommendations for project', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRecommendations, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getRecommendations(mockProjectId)

      expect(result).toEqual(mockRecommendations)
    })

    it('should filter recommendations by category', async () => {
      const filters = { category: 'schedule' as const }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRecommendations.filter((r) => r.category === 'schedule'),
          error: null,
        }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getRecommendations(mockProjectId, filters)

      expect(result).toHaveLength(1)
      expect(result[0].category).toBe('schedule')
    })

    it('should filter recommendations by status', async () => {
      const filters = { status: 'pending' as const }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRecommendations, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getRecommendations(mockProjectId, filters)

      expect(result.every((r) => r.status === 'pending')).toBe(true)
    })
  })

  describe('acknowledgeRecommendation', () => {
    it('should acknowledge a recommendation', async () => {
      const notes = 'Reviewing with team'
      const updatedRec = {
        id: mockRecommendationId,
        status: 'acknowledged',
        acknowledged_at: '2024-01-15T11:00:00Z',
        acknowledged_notes: notes,
      }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedRec, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.acknowledgeRecommendation(mockRecommendationId, notes)

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'acknowledged',
          acknowledged_notes: notes,
        })
      )
      expect(result.status).toBe('acknowledged')
    })
  })

  describe('implementRecommendation', () => {
    it('should mark recommendation as implemented', async () => {
      const notes = 'Resources added to critical path'

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockRecommendationId, status: 'implemented' },
          error: null,
        }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.implementRecommendation(mockRecommendationId, notes)

      expect(result.status).toBe('implemented')
    })
  })

  describe('dismissRecommendation', () => {
    it('should dismiss a recommendation with reason', async () => {
      const reason = 'Not applicable to current phase'

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockRecommendationId, status: 'dismissed', dismissed_reason: reason },
          error: null,
        }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.dismissRecommendation(mockRecommendationId, reason)

      expect(result.status).toBe('dismissed')
      expect(result.dismissed_reason).toBe(reason)
    })
  })

  // ============================================================================
  // MODEL OPERATIONS
  // ============================================================================

  describe('getActiveModel', () => {
    it('should fetch active model by type', async () => {
      const mockModel: ModelMetadata = {
        id: 'model-1',
        model_type: 'schedule_prediction',
        version: 'v1.0',
        is_active: true,
        accuracy_metrics: {
          mae: 5.2,
          rmse: 7.8,
          r_squared: 0.92,
        },
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockModel, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getActiveModel('schedule_prediction')

      expect(result).toEqual(mockModel)
      expect(result?.is_active).toBe(true)
    })
  })

  describe('getModels', () => {
    it('should fetch all models', async () => {
      const mockModels: ModelMetadata[] = [
        {
          id: 'model-1',
          model_type: 'schedule_prediction',
          version: 'v1.0',
          is_active: true,
          accuracy_metrics: { mae: 5.2, rmse: 7.8, r_squared: 0.92 },
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'model-2',
          model_type: 'cost_prediction',
          version: 'v1.0',
          is_active: true,
          accuracy_metrics: { mae: 0.05, rmse: 0.08, r_squared: 0.89 },
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockModels, error: null }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await analyticsApi.getModels()

      expect(result).toEqual(mockModels)
      expect(result).toHaveLength(2)
    })
  })

  // ============================================================================
  // DASHBOARD DATA
  // ============================================================================

  describe('getDashboardData', () => {
    it('should fetch complete dashboard data', async () => {
      const mockDashboard = {
        project_id: mockProjectId,
        latest_snapshot: {
          id: 'snap-1',
          project_id: mockProjectId,
          snapshot_date: '2024-01-15',
          schedule_spi: 0.95,
          cost_cpi: 1.02,
          percent_complete: 45.5,
        },
        latest_prediction: {
          id: 'pred-1',
          predicted_completion_date: '2024-06-15',
          confidence_score: 0.85,
        },
        risk_assessment: {
          overall_risk: 'medium',
          risk_scores: {
            schedule_risk: 0.65,
            cost_risk: 0.45,
          },
        },
        pending_recommendations: [],
        trends: {
          schedule_trend: [],
          cost_trend: [],
        },
      }

      const mockRpc = vi.fn().mockResolvedValue({
        data: mockDashboard,
        error: null,
      })
      vi.mocked(supabase.rpc).mockReturnValue(mockRpc as any)

      const result = await analyticsApi.getDashboardData(mockProjectId)

      expect(supabase.rpc).toHaveBeenCalledWith('get_analytics_dashboard', {
        p_project_id: mockProjectId,
      })
      expect(result).toEqual(mockDashboard)
    })
  })

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  describe('Error Handling', () => {
    it('should wrap database errors in ApiErrorClass', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed'),
        }),
      }
      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(analyticsApi.getProjectSnapshots(mockProjectId)).rejects.toThrow()
    })

    it('should handle network errors', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Network error')
      })

      await expect(analyticsApi.getProjectSnapshots(mockProjectId)).rejects.toThrow('Network error')
    })
  })
})
