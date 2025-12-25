import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { remediationTrackingApi, autoCreatePunchApi } from '../remediation-tracking'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

describe('Remediation Tracking API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBySource', () => {
    it('should fetch remediation by source', async () => {
      const mockTracking = [
        { id: '1', source_type: 'inspection', source_id: 'insp-1' },
        { id: '2', source_type: 'inspection', source_id: 'insp-1' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTracking, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await remediationTrackingApi.getBySource('inspection', 'insp-1')

      expect(result).toHaveLength(2)
      expect(mockQuery.eq).toHaveBeenCalledWith('source_type', 'inspection')
      expect(mockQuery.eq).toHaveBeenCalledWith('source_id', 'insp-1')
    })
  })

  describe('getByPunchItem', () => {
    it('should fetch remediation by punch item', async () => {
      const mockTracking = { id: '1', punch_item_id: 'punch-1' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTracking, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await remediationTrackingApi.getByPunchItem('punch-1')

      expect(result?.punch_item_id).toBe('punch-1')
    })

    it('should return null when not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await remediationTrackingApi.getByPunchItem('999')

      expect(result).toBeNull()
    })
  })

  describe('getRemediation', () => {
    it('should fetch remediation with filters', async () => {
      const mockData = [
        { id: '1', status: 'pending', source_type: 'inspection' },
        { id: '2', status: 'resolved', source_type: 'checklist' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await remediationTrackingApi.getRemediation({
        project_id: 'project-1',
        status: ['pending', 'resolved'],
      })

      expect(result).toHaveLength(2)
    })
  })

  describe('updateStatus', () => {
    it('should update remediation status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: 'resolved' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await remediationTrackingApi.updateStatus('1', {
        status: 'resolved',
        verification_notes: 'Fixed',
      })

      expect(result.status).toBe('resolved')
    })
  })

  describe('verify', () => {
    it('should verify remediation as passed', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: 'verified' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await remediationTrackingApi.verify('1', {
        passed: true,
        verification_notes: 'Looks good',
      })

      expect(result.status).toBe('verified')
    })

    it('should verify remediation as failed', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: 'failed' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await remediationTrackingApi.verify('1', {
        passed: false,
        verification_notes: 'Still needs work',
      })

      expect(result.status).toBe('failed')
    })
  })

  describe('getStats', () => {
    it('should calculate remediation statistics', async () => {
      const mockData = [
        { status: 'pending', source_type: 'inspection', auto_generated: true, created_at: '2024-01-01' },
        { status: 'resolved', source_type: 'inspection', auto_generated: false, created_at: '2024-01-02' },
        { status: 'verified', source_type: 'checklist', auto_generated: true, created_at: '2024-01-03' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await remediationTrackingApi.getStats('project-1')

      expect(result.total).toBe(3)
      expect(result.by_status.pending).toBe(1)
      expect(result.by_status.resolved).toBe(1)
      expect(result.by_status.verified).toBe(1)
      expect(result.by_source_type.inspection).toBe(2)
      expect(result.by_source_type.checklist).toBe(1)
      expect(result.auto_generated_count).toBe(2)
    })
  })
})

describe('Auto Create Punch API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createFromInspection', () => {
    it('should create punch from inspection', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      vi.mocked(supabase.rpc).mockResolvedValue({ data: 'punch-1', error: null } as any)

      const result = await autoCreatePunchApi.createFromInspection({
        inspection_id: 'inspection-1',
      })

      expect(result).toBe('punch-1')
      expect(supabase.rpc).toHaveBeenCalledWith('create_punch_from_inspection', {
        p_inspection_id: 'inspection-1',
        p_created_by: 'user-1',
      })
    })
  })

  describe('createFromChecklist', () => {
    it('should create punch from checklist', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      vi.mocked(supabase.rpc).mockResolvedValue({ data: 'punch-1', error: null } as any)

      const result = await autoCreatePunchApi.createFromChecklist({
        execution_id: 'exec-1',
        response_id: 'resp-1',
        template_item_id: 'item-1',
      })

      expect(result).toBe('punch-1')
    })
  })

  describe('batchCreateFromChecklist', () => {
    it('should create multiple punches from checklist items', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: 'punch-1', error: null } as any)
        .mockResolvedValueOnce({ data: 'punch-2', error: null } as any)

      const result = await autoCreatePunchApi.batchCreateFromChecklist('exec-1', [
        { responseId: 'resp-1', templateItemId: 'item-1' },
        { responseId: 'resp-2', templateItemId: 'item-2' },
      ])

      expect(result).toHaveLength(2)
      expect(result).toContain('punch-1')
      expect(result).toContain('punch-2')
    })

    it('should continue on individual failures', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({ data: 'punch-1', error: null } as any)
        .mockRejectedValueOnce(new Error('Failed'))

      const result = await autoCreatePunchApi.batchCreateFromChecklist('exec-1', [
        { responseId: 'resp-1', templateItemId: 'item-1' },
        { responseId: 'resp-2', templateItemId: 'item-2' },
      ])

      expect(result).toHaveLength(1)
      expect(result).toContain('punch-1')
    })
  })
})
