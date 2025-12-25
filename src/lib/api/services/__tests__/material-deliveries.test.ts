import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import * as materialDeliveries from '../material-deliveries'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}))

describe('Material Deliveries API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDeliveries', () => {
    it('should fetch deliveries with filters', async () => {
      const mockDeliveries = [
        { id: '1', delivery_status: 'received', material_description: 'Steel' },
        { id: '2', delivery_status: 'pending', material_description: 'Concrete' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        neq: vi.fn().mockResolvedValue({ data: mockDeliveries, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialDeliveries.getDeliveries('project-1')

      expect(result.data).toHaveLength(2)
    })
  })

  describe('getDelivery', () => {
    it('should fetch single delivery', async () => {
      const mockDelivery = { id: '1', material_description: 'Steel Beams' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDelivery, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialDeliveries.getDelivery('1')

      expect(result.data?.material_description).toBe('Steel Beams')
    })
  })

  describe('getDeliveryWithPhotos', () => {
    it('should fetch delivery with photos', async () => {
      const mockDelivery = { id: '1', material_description: 'Steel' }
      const mockPhotos = [{ id: 'p1', photo_url: 'photo1.jpg' }]

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockDelivery, error: null }),
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
        } as any
      })

      const result = await materialDeliveries.getDeliveryWithPhotos('1')

      expect(result.data?.photos).toHaveLength(1)
    })
  })

  describe('createDelivery', () => {
    it('should create new delivery', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialDeliveries.createDelivery(
        {
          project_id: 'project-1',
          material_description: 'Steel Beams',
          vendor_name: 'ABC Steel',
          delivery_date: '2024-01-15',
          quantity_ordered: 100,
        },
        'company-1'
      )

      expect(result.data?.id).toBe('1')
    })
  })

  describe('updateDelivery', () => {
    it('should update delivery', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialDeliveries.updateDelivery({
        id: '1',
        storage_location: 'Warehouse A',
      })

      expect(mockQuery.update).toHaveBeenCalled()
    })
  })

  describe('deleteDelivery', () => {
    it('should soft delete delivery', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialDeliveries.deleteDelivery('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })
  })

  describe('searchDeliveries', () => {
    it('should search deliveries', async () => {
      vi.mocked(supabase).rpc = vi.fn().mockResolvedValue({ data: [], error: null }) as any

      await materialDeliveries.searchDeliveries('project-1', 'steel')

      expect(supabase.rpc).toHaveBeenCalledWith('search_material_deliveries', {
        p_project_id: 'project-1',
        p_search_term: 'steel',
      })
    })
  })

  describe('getDeliveriesWithIssues', () => {
    it('should fetch deliveries with issues', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await materialDeliveries.getDeliveriesWithIssues('project-1')

      expect(mockQuery.neq).toHaveBeenCalledWith('condition_status', 'good')
    })
  })

  describe('getDeliveryStatistics', () => {
    it('should fetch delivery statistics', async () => {
      const mockStats = {
        total_deliveries: 50,
        pending_count: 5,
        received_count: 40,
      }

      vi.mocked(supabase).rpc = vi.fn().mockResolvedValue({
        data: mockStats,
        error: null,
      }) as any

      const result = await materialDeliveries.getDeliveryStatistics('project-1')

      expect(result.data?.total_deliveries).toBe(50)
    })
  })

  describe('getUniqueVendors', () => {
    it('should fetch unique vendors', async () => {
      const mockData = [
        { vendor_name: 'ABC Steel' },
        { vendor_name: 'XYZ Supply' },
        { vendor_name: 'ABC Steel' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await materialDeliveries.getUniqueVendors('project-1')

      expect(result.data).toHaveLength(2)
      expect(result.data).toContain('ABC Steel')
      expect(result.data).toContain('XYZ Supply')
    })
  })

  describe('uploadDeliveryPhotoFile', () => {
    it('should upload photo file', async () => {
      const mockFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' })

      const mockStorageBucket = {
        upload: vi.fn().mockResolvedValue({ data: { path: 'path/photo.jpg' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'http://example.com/photo.jpg' } }),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any)

      const result = await materialDeliveries.uploadDeliveryPhotoFile(
        mockFile,
        'company-1',
        'delivery-1'
      )

      expect(result.data?.url).toBe('http://example.com/photo.jpg')
    })
  })
})
