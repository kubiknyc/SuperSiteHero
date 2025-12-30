import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { materialReceivingApi } from '../material-receiving'
import { ApiErrorClass } from '../../errors'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

vi.mock('../../errors', () => ({
  ApiErrorClass: class extends Error {
    constructor(config: { code: string; message: string; details?: unknown }) {
      super(config.message)
      this.name = 'ApiErrorClass'
    }
  },
}))

describe('Material Receiving API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMaterialReceipts', () => {
    it('should fetch material receipts with filters successfully', async () => {
      const mockReceipts = [
        {
          id: '1',
          material_description: 'Steel Beams',
          vendor: 'ABC Steel',
          status: 'received',
          received_by_user: { full_name: 'John Doe', email: 'john@example.com' },
          project: { name: 'Test Project', number: 'P001' },
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockReceipts, error: null })),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialReceivingApi.getMaterialReceipts({
        projectId: 'project-1',
        status: 'received',
      })

      expect(result).toHaveLength(1)
      expect(result[0].material_description).toBe('Steel Beams')
      expect(supabase.from).toHaveBeenCalledWith('material_received')
    })

    it('should throw error when fetch fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(
        materialReceivingApi.getMaterialReceipts({ projectId: 'project-1' })
      ).rejects.toThrow()
    })

    it('should apply vendor filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialReceivingApi.getMaterialReceipts({
        projectId: 'project-1',
        vendor: 'ABC',
      })

      expect(mockQuery.ilike).toHaveBeenCalledWith('vendor', '%ABC%')
    })

    it('should apply date range filters', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialReceivingApi.getMaterialReceipts({
        projectId: 'project-1',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      })

      expect(mockQuery.gte).toHaveBeenCalledWith('delivery_date', '2024-01-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('delivery_date', '2024-12-31')
    })
  })

  describe('getMaterialReceipt', () => {
    it('should fetch single material receipt', async () => {
      const mockReceipt = {
        id: '1',
        material_description: 'Steel Beams',
        received_by_user: { full_name: 'John Doe' },
      }

      const mockPhotoQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ count: 5 })),
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockReceipt, error: null }),
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'material_received_photos') {return mockPhotoQuery as any}
        return mockQuery as any
      })

      const result = await materialReceivingApi.getMaterialReceipt('1')

      expect(result.id).toBe('1')
      expect(result.photo_count).toBe(5)
    })

    it('should throw error when receipt not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(materialReceivingApi.getMaterialReceipt('999')).rejects.toThrow()
    })
  })

  describe('createMaterialReceipt', () => {
    it('should create new material receipt', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockData = { id: '1', material_description: 'Steel Beams' }
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialReceivingApi.createMaterialReceipt({
        project_id: 'project-1',
        material_description: 'Steel Beams',
        vendor: 'ABC Steel',
        delivery_date: '2024-01-15',
        quantity_received: 100,
      })

      expect(result.id).toBe('1')
      expect(mockQuery.insert).toHaveBeenCalled()
    })

    it('should throw error when user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null } } as any)

      await expect(
        materialReceivingApi.createMaterialReceipt({
          project_id: 'project-1',
          material_description: 'Steel',
          vendor: 'ABC',
          delivery_date: '2024-01-15',
          quantity_received: 100,
        })
      ).rejects.toThrow()
    })

    it('should set default values for condition and status', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialReceivingApi.createMaterialReceipt({
        project_id: 'project-1',
        material_description: 'Steel',
        vendor: 'ABC',
        delivery_date: '2024-01-15',
        quantity_received: 100,
      })

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          condition: 'good',
          status: 'received',
        })
      )
    })
  })

  describe('updateMaterialReceipt', () => {
    it('should update material receipt', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialReceivingApi.updateMaterialReceipt('1', {
        storage_location: 'Warehouse A',
      })

      expect(result.id).toBe('1')
      expect(mockQuery.update).toHaveBeenCalled()
    })
  })

  describe('deleteMaterialReceipt', () => {
    it('should soft delete material receipt', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialReceivingApi.deleteMaterialReceipt('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })
  })

  describe('updateStatus', () => {
    it('should update status to inspected with inspector info', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialReceivingApi.updateStatus('1', 'inspected', 'inspector-1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'inspected',
          inspected_by: 'inspector-1',
          inspected_at: expect.any(String),
        })
      )
    })
  })

  describe('updateCondition', () => {
    it('should update material condition with notes', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialReceivingApi.updateCondition('1', 'damaged', 'Box damaged during transport')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          condition: 'damaged',
          condition_notes: 'Box damaged during transport',
        })
      )
    })
  })

  describe('getPhotos', () => {
    it('should fetch photos for material receipt', async () => {
      const mockPhotos = [
        { id: '1', photo_url: 'http://example.com/photo1.jpg' },
        { id: '2', photo_url: 'http://example.com/photo2.jpg' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialReceivingApi.getPhotos('receipt-1')

      expect(result).toHaveLength(2)
      expect(result[0].photo_url).toBe('http://example.com/photo1.jpg')
    })
  })

  describe('addPhoto', () => {
    it('should add photo to material receipt', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialReceivingApi.addPhoto({
        material_received_id: 'receipt-1',
        photo_url: 'http://example.com/photo.jpg',
        taken_at: '2024-01-15T10:00:00Z',
      })

      expect(result.id).toBe('1')
      expect(mockQuery.insert).toHaveBeenCalled()
    })
  })

  describe('uploadPhoto', () => {
    it('should upload photo file and create record', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })

      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ data: { path: 'uploads/photo.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://example.com/photo.jpg' } }),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any)

      const mockPhotoQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockPhotoQuery as any)

      const result = await materialReceivingApi.uploadPhoto('receipt-1', mockFile)

      expect(result.id).toBe('1')
      expect(mockStorageBucket.upload).toHaveBeenCalled()
    })
  })

  describe('getStats', () => {
    it('should fetch statistics for project', async () => {
      const mockStats = {
        total_deliveries: 50,
        this_week: 5,
        this_month: 20,
        pending_inspection: 10,
        with_issues: 3,
      }

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockStats, error: null } as any)

      const result = await materialReceivingApi.getStats('project-1')

      expect(result.total_deliveries).toBe(50)
      expect(supabase.rpc).toHaveBeenCalledWith('get_material_receiving_stats', {
        p_project_id: 'project-1',
      })
    })

    it('should throw error when rpc fails', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: new Error('Failed') } as any)

      await expect(materialReceivingApi.getStats('project-1')).rejects.toThrow()
    })
  })

  describe('getVendors', () => {
    it('should fetch unique vendors for project', async () => {
      const mockData = [
        { vendor: 'ABC Steel' },
        { vendor: 'XYZ Supply' },
        { vendor: 'ABC Steel' }, // Duplicate
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialReceivingApi.getVendors('project-1')

      expect(result).toHaveLength(2)
      expect(result).toContain('ABC Steel')
      expect(result).toContain('XYZ Supply')
    })
  })

  describe('getStorageLocations', () => {
    it('should fetch unique storage locations', async () => {
      const mockData = [
        { storage_location: 'Warehouse A' },
        { storage_location: 'Warehouse B' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialReceivingApi.getStorageLocations('project-1')

      expect(result).toHaveLength(2)
      expect(result).toContain('Warehouse A')
    })
  })

  describe('linkToSubmittal', () => {
    it('should link material receipt to submittal', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialReceivingApi.linkToSubmittal('receipt-1', 'submittal-1')

      expect(mockQuery.update).toHaveBeenCalledWith({ submittal_procurement_id: 'submittal-1' })
    })
  })

  describe('unlinkFromSubmittal', () => {
    it('should unlink material receipt from submittal', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialReceivingApi.unlinkFromSubmittal('receipt-1')

      expect(mockQuery.update).toHaveBeenCalledWith({ submittal_procurement_id: null })
    })
  })
})
