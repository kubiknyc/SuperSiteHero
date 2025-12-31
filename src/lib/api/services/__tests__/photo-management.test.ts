import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import * as photoApi from '../photo-management'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    storage: { from: vi.fn() },
  },
}))

const db = supabase as any

describe('Photo Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    } as any)
  })

  describe('getPhotos', () => {
    it('should fetch photos with filters', async () => {
      const mockPhotos = [
        { id: '1', file_name: 'photo1.jpg', project_id: 'proj1' },
        { id: '2', file_name: 'photo2.jpg', project_id: 'proj1' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockPhotos, error: null })),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      const result = await photoApi.getPhotos({ projectId: 'proj1' })

      expect(result).toHaveLength(2)
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'proj1')
    })

    it('should filter by category', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      await photoApi.getPhotos({ category: 'safety' })

      expect(mockQuery.eq).toHaveBeenCalledWith('photo_category', 'safety')
    })

    it('should filter by GPS presence', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      await photoApi.getPhotos({ hasGps: true })

      expect(mockQuery.not).toHaveBeenCalledWith('latitude', 'is', null)
    })

    it('should apply date range filter', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      await photoApi.getPhotos({
        dateFrom: '2024-12-01',
        dateTo: '2024-12-31',
      })

      expect(mockQuery.gte).toHaveBeenCalledWith('captured_at', '2024-12-01')
      expect(mockQuery.lte).toHaveBeenCalledWith('captured_at', '2024-12-31')
    })
  })

  describe('createPhoto', () => {
    it('should create photo with metadata', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'photo1',
            file_name: 'construction.jpg',
            created_by: 'user123',
          },
          error: null
        }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      const result = await photoApi.createPhoto({
        projectId: 'proj1',
        fileUrl: 'https://example.com/photo.jpg',
        fileName: 'construction.jpg',
        fileSize: 1024000,
        width: 1920,
        height: 1080,
      })

      expect(result.id).toBe('photo1')
    })
  })

  describe('updatePhoto', () => {
    it('should update photo metadata', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'photo1', caption: 'Updated caption' },
          error: null
        }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      const result = await photoApi.updatePhoto('photo1', {
        caption: 'Updated caption',
        tags: ['safety', 'progress'],
      })

      expect(result.caption).toBe('Updated caption')
    })
  })

  describe('deletePhoto', () => {
    it('should soft delete photo', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      await photoApi.deletePhoto('photo1')

      expect(mockQuery.update).toHaveBeenCalledWith({
        deleted_at: expect.any(String),
      })
    })
  })

  describe('getCollections', () => {
    it('should fetch photo collections', async () => {
      const mockCollections = [
        { id: 'col1', name: 'Progress Photos', project_id: 'proj1' },
        { id: 'col2', name: 'Safety Inspections', project_id: 'proj1' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ data: mockCollections, error: null }),
      }

      mockQuery.order.mockReturnValue({
        ...mockQuery,
        order: vi.fn().mockResolvedValue({ data: mockCollections, error: null }),
      })

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      const result = await photoApi.getCollections({ projectId: 'proj1' })

      expect(result).toHaveLength(2)
    })
  })

  describe('createCollection', () => {
    it('should create photo collection', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'col1', name: 'New Collection', created_by: 'user123' },
          error: null
        }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      const result = await photoApi.createCollection({
        projectId: 'proj1',
        name: 'New Collection',
        collectionType: 'manual',
      })

      expect(result.name).toBe('New Collection')
    })
  })

  describe('addPhotoToCollection', () => {
    it('should add photo to collection', async () => {
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [{ sort_order: 5 }], error: null }),
      }

      const mockInsertQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(db.from)
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockInsertQuery as any)

      await photoApi.addPhotoToCollection('col1', 'photo1', 'Custom caption')

      expect(mockInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_id: 'col1',
          photo_id: 'photo1',
          sort_order: 6,
        })
      )
    })
  })

  describe('createComparison', () => {
    it('should create before/after comparison', async () => {
      const mockUpdateQuery1 = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      const mockUpdateQuery2 = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'comp1',
            before_photo_id: 'photo1',
            after_photo_id: 'photo2',
          },
          error: null
        }),
      }

      vi.mocked(db.from)
        .mockReturnValueOnce(mockUpdateQuery1 as any)
        .mockReturnValueOnce(mockUpdateQuery2 as any)
        .mockReturnValueOnce(mockInsertQuery as any)

      const result = await photoApi.createComparison({
        projectId: 'proj1',
        title: 'Room Renovation',
        beforePhotoId: 'photo1',
        afterPhotoId: 'photo2',
      })

      expect(result.id).toBe('comp1')
    })
  })

  describe('getPhotoAnnotations', () => {
    it('should fetch annotations for photo', async () => {
      const mockAnnotations = [
        { id: 'ann1', annotation_type: 'arrow', photo_id: 'photo1' },
        { id: 'ann2', annotation_type: 'rectangle', photo_id: 'photo1' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAnnotations, error: null }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      const result = await photoApi.getPhotoAnnotations('photo1')

      expect(result).toHaveLength(2)
    })
  })

  describe('createAnnotation', () => {
    it('should create photo annotation', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'ann1',
            annotation_type: 'arrow',
            annotation_data: { x1: 10, y1: 20, x2: 100, y2: 200 },
          },
          error: null
        }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      const result = await photoApi.createAnnotation({
        photoId: 'photo1',
        annotationType: 'arrow',
        annotationData: { x1: 10, y1: 20, x2: 100, y2: 200 },
        color: '#FF0000',
      })

      // Note: the API maps annotation_type to annotationType
      expect(result.annotationType).toBe('arrow')
    })
  })

  describe('getPhotosNearLocation', () => {
    it('should get photos near GPS location', async () => {
      const mockPhotos = [
        { id: 'photo1', latitude: 40.7128, longitude: -74.0060 },
      ]

      vi.mocked(db.rpc).mockResolvedValue({ data: mockPhotos, error: null })

      const result = await photoApi.getPhotosNearLocation('proj1', 40.7128, -74.0060, 50)

      expect(result).toHaveLength(1)
      expect(db.rpc).toHaveBeenCalledWith('get_photos_by_location', {
        p_project_id: 'proj1',
        p_latitude: 40.7128,
        p_longitude: -74.0060,
        p_radius_meters: 50,
      })
    })
  })

  describe('getPhotoStats', () => {
    it('should get photo statistics', async () => {
      const mockStats = {
        total_photos: 150,
        photos_today: 10,
        photos_this_week: 45,
        photos_with_gps: 120,
      }

      vi.mocked(db.rpc).mockResolvedValue({ data: [mockStats], error: null })

      const result = await photoApi.getPhotoStats('proj1')

      expect(result.totalPhotos).toBe(150)
      expect(result.photosWithGps).toBe(120)
    })
  })

  describe('linkPhotoToEntity', () => {
    it('should link photo to daily report', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'photo1', daily_report_id: 'report1' },
          error: null
        }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      const result = await photoApi.linkPhotoToEntity('photo1', 'daily_report', 'report1')

      // Note: the API maps daily_report_id to dailyReportId
      expect(result.dailyReportId).toBe('report1')
    })

    it('should throw error for invalid entity type', async () => {
      await expect(
        photoApi.linkPhotoToEntity('photo1', 'invalid_type', 'entity1')
      ).rejects.toThrow('Invalid entity type')
    })
  })

  describe('logPhotoAccess', () => {
    it('should log photo access', async () => {
      const mockQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      await photoApi.logPhotoAccess('photo1', 'view', 'mobile_app')

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          photo_id: 'photo1',
          action: 'view',
          context: 'mobile_app',
        })
      )
    })
  })

  describe('getFilterOptions', () => {
    it('should get unique filter values', async () => {
      const mockPhotos = [
        { photo_category: 'safety', building: 'A', floor: '1', tags: ['inspection', 'hazard'] },
        { photo_category: 'progress', building: 'B', floor: '2', tags: ['foundation'] },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      }

      vi.mocked(db.from).mockReturnValue(mockQuery as any)

      const result = await photoApi.getFilterOptions('proj1')

      expect(result.categories).toContain('safety')
      expect(result.categories).toContain('progress')
      expect(result.buildings).toContain('A')
      expect(result.tags).toContain('inspection')
    })
  })
})
