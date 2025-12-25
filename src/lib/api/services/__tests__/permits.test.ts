import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { permitsApi } from '../permits'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

describe('permitsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPermits', () => {
    it('should fetch all permits with filters', async () => {
      const mockData = [
        { id: '1', permit_name: 'Building Permit', status: 'active' },
        { id: '2', permit_name: 'Electrical Permit', status: 'pending' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await permitsApi.getPermits()

      expect(result).toEqual(mockData)
      expect(supabase.from).toHaveBeenCalledWith('permits')
    })

    it('should apply project filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await permitsApi.getPermits({ project_id: 'proj-1' })

      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'proj-1')
    })

    it('should apply status filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await permitsApi.getPermits({ status: 'active' })

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('should handle fetch errors', async () => {
      const mockError = new Error('Fetch failed')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(permitsApi.getPermits()).rejects.toThrow('Fetch failed')
    })
  })

  describe('getPermitById', () => {
    it('should fetch a single permit by ID', async () => {
      const mockData = { id: '1', permit_name: 'Building Permit' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await permitsApi.getPermitById('1')

      expect(result).toEqual(mockData)
    })

    it('should handle fetch errors', async () => {
      const mockError = new Error('Not found')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(permitsApi.getPermitById('1')).rejects.toThrow('Not found')
    })
  })

  describe('createPermit', () => {
    it('should create a new permit', async () => {
      const mockInput = {
        project_id: 'proj-1',
        permit_name: 'Building Permit',
        permit_type: 'building',
      }
      const mockData = { ...mockInput, id: '1', status: 'pending' }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await permitsApi.createPermit(mockInput)

      expect(result).toEqual(mockData)
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          permit_name: 'Building Permit',
          status: 'pending',
          created_by: 'user-1',
        })
      )
    })

    it('should handle creation errors', async () => {
      const mockError = new Error('Create failed')

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(
        permitsApi.createPermit({
          project_id: 'proj-1',
          permit_name: 'Test',
          permit_type: 'building',
        })
      ).rejects.toThrow('Create failed')
    })
  })

  describe('updatePermit', () => {
    it('should update a permit', async () => {
      const mockData = { id: '1', permit_name: 'Updated Permit' }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await permitsApi.updatePermit('1', { permit_name: 'Updated Permit' })

      expect(result).toEqual(mockData)
    })
  })

  describe('deletePermit', () => {
    it('should soft delete a permit', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await permitsApi.deletePermit('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })
  })

  describe('getExpiringPermits', () => {
    it('should fetch expiring permits within days', async () => {
      const mockData = [{ id: '1', expiration_date: '2024-12-31' }]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await permitsApi.getExpiringPermits('proj-1', 30)

      expect(result).toEqual(mockData)
    })

    it('should work without project filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await permitsApi.getExpiringPermits(undefined, 30)

      expect(mockQuery.select).toHaveBeenCalled()
    })
  })

  describe('getCriticalPermits', () => {
    it('should fetch critical permits', async () => {
      const mockData = [{ id: '1', work_cannot_proceed_without: true }]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await permitsApi.getCriticalPermits('proj-1')

      expect(result).toEqual(mockData)
      expect(mockQuery.eq).toHaveBeenCalledWith('work_cannot_proceed_without', true)
    })
  })

  describe('getPermitStatistics', () => {
    it('should calculate permit statistics', async () => {
      const today = new Date()
      const future = new Date(today)
      future.setDate(future.getDate() + 20)

      const mockData = [
        {
          id: '1',
          status: 'active',
          permit_type: 'building',
          expiration_date: future.toISOString().split('T')[0],
          work_cannot_proceed_without: true,
        },
        {
          id: '2',
          status: 'pending',
          permit_type: 'electrical',
          expiration_date: '2020-01-01',
          work_cannot_proceed_without: false,
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await permitsApi.getPermitStatistics('proj-1')

      expect(result.total).toBe(2)
      expect(result.by_status).toHaveProperty('active', 1)
      expect(result.by_status).toHaveProperty('pending', 1)
      expect(result.by_type).toHaveProperty('building', 1)
      expect(result.by_type).toHaveProperty('electrical', 1)
      expect(result.expiring_soon).toBe(1)
      expect(result.critical_permits).toBe(1)
    })

    it('should handle empty permit list', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await permitsApi.getPermitStatistics('proj-1')

      expect(result.total).toBe(0)
      expect(result.expiring_soon).toBe(0)
    })
  })
})
