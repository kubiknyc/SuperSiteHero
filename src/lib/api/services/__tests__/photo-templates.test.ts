import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import * as photoTemplates from '../photo-templates'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}))

describe('Photo Templates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPhotoTemplates', () => {
    it('should fetch photo templates with filters', async () => {
      const mockTemplates = [
        { id: '1', name: 'Foundation Photos', is_active: true },
        { id: '2', name: 'Framing Photos', is_active: true },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await photoTemplates.getPhotoTemplates({ projectId: 'project-1' })

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Foundation Photos')
    })

    it('should filter by category', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await photoTemplates.getPhotoTemplates({
        projectId: 'project-1',
        category: 'progress',
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'progress')
    })
  })

  describe('getPhotoTemplate', () => {
    it('should fetch single template', async () => {
      const mockTemplate = { id: '1', name: 'Foundation Photos' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await photoTemplates.getPhotoTemplate('1')

      expect(result?.name).toBe('Foundation Photos')
    })

    it('should return null when template not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await photoTemplates.getPhotoTemplate('999')

      expect(result).toBeNull()
    })
  })

  describe('createPhotoTemplate', () => {
    it('should create new template', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await photoTemplates.createPhotoTemplate({
        projectId: 'project-1',
        name: 'New Template',
        frequency: 'daily',
      })

      expect(result.id).toBe('1')
    })
  })

  describe('updatePhotoTemplate', () => {
    it('should update template', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await photoTemplates.updatePhotoTemplate('1', { name: 'Updated' })

      expect(mockQuery.update).toHaveBeenCalled()
    })
  })

  describe('deletePhotoTemplate', () => {
    it('should soft delete template', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await photoTemplates.deletePhotoTemplate('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })
  })

  describe('getPhotoRequirements', () => {
    it('should fetch requirements with filters', async () => {
      const mockRequirements = [
        { id: '1', status: 'pending', due_date: '2024-01-15' },
        { id: '2', status: 'completed', due_date: '2024-01-16' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: mockRequirements, error: null })),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await photoTemplates.getPhotoRequirements({
        projectId: 'project-1',
        status: ['pending', 'completed'],
      })

      expect(result).toHaveLength(2)
    })
  })

  describe('generateDailyRequirements', () => {
    it('should generate requirements for date', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: 5, error: null } as any)

      const result = await photoTemplates.generateDailyRequirements('project-1', '2024-01-15')

      expect(result.generated).toBe(5)
      expect(supabase.rpc).toHaveBeenCalledWith('generate_photo_requirements', {
        p_project_id: 'project-1',
        p_date: '2024-01-15',
      })
    })
  })

  describe('completePhotoRequirement', () => {
    it('should complete requirement and link photo', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any)

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'req-1', status: 'completed' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await photoTemplates.completePhotoRequirement('req-1', 'photo-1')

      expect(result.status).toBe('completed')
    })
  })

  describe('skipPhotoRequirement', () => {
    it('should skip requirement with reason', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: 'skipped' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await photoTemplates.skipPhotoRequirement('req-1', 'Weather conditions')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'skipped',
          skip_reason: 'Weather conditions',
        })
      )
    })
  })

  describe('reviewPhotoRequirement', () => {
    it('should review and approve requirement', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { review_status: 'approved' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await photoTemplates.reviewPhotoRequirement('req-1', 'approved', 'Looks good')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          review_status: 'approved',
          review_notes: 'Looks good',
        })
      )
    })
  })

  describe('getPhotoCompletionStats', () => {
    it('should fetch completion statistics', async () => {
      const mockStats = [{
        total_required: 100,
        completed: 80,
        missed: 10,
        pending: 10,
        completion_rate: 80,
      }]

      vi.mocked(supabase.rpc).mockResolvedValue({ data: mockStats, error: null } as any)

      const result = await photoTemplates.getPhotoCompletionStats(
        'project-1',
        '2024-01-01',
        '2024-01-31'
      )

      expect(result.completionRate).toBe(80)
      expect(result.totalRequired).toBe(100)
    })
  })

  describe('getDailyPhotoChecklist', () => {
    it('should get daily checklist with stats', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: 5, error: null } as any)

      const mockRequirements = [
        { id: '1', status: 'pending', dueDate: '2024-01-15' },
        { id: '2', status: 'completed', dueDate: '2024-01-15' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: mockRequirements, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await photoTemplates.getDailyPhotoChecklist('project-1', '2024-01-15')

      expect(result.requirements).toHaveLength(2)
      expect(result.stats.total).toBe(2)
    })
  })

  describe('getProgressSeries', () => {
    it('should fetch progress series', async () => {
      const mockSeries = [
        { id: '1', name: 'Foundation Progress' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockSeries, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await photoTemplates.getProgressSeries('project-1')

      expect(result).toHaveLength(1)
    })
  })

  describe('createProgressSeries', () => {
    it('should create new progress series', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await photoTemplates.createProgressSeries({
        projectId: 'project-1',
        name: 'Foundation Progress',
      })

      expect(result.id).toBe('1')
    })
  })

  describe('addPhotoToSeries', () => {
    it('should add photo to series', async () => {
      const mockSeries = { photo_ids: ['photo-1', 'photo-2'] }

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSeries, error: null }),
      }

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        return (callCount === 1 ? mockSelectQuery : mockUpdateQuery) as any
      })

      await photoTemplates.addPhotoToSeries('series-1', 'photo-3')

      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        photo_ids: ['photo-1', 'photo-2', 'photo-3'],
      })
    })
  })

  describe('duplicateTemplate', () => {
    it('should duplicate existing template', async () => {
      const mockTemplate = {
        id: '1',
        name: 'Original',
        projectId: 'project-1',
        frequency: 'daily',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        createdBy: 'user-1',
        deletedAt: null,
      }

      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '2' }, error: null }),
      }

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        return (callCount === 1 ? mockSelectQuery : mockInsertQuery) as any
      })

      const result = await photoTemplates.duplicateTemplate('1', 'Duplicate')

      expect(result.id).toBe('2')
    })
  })

  describe('markOverdueRequirements', () => {
    it('should mark overdue requirements', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: 5, error: null } as any)

      const result = await photoTemplates.markOverdueRequirements()

      expect(result).toBe(5)
      expect(supabase.rpc).toHaveBeenCalledWith('mark_overdue_photo_requirements')
    })
  })
})
