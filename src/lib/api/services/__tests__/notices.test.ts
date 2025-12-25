import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { noticesApi } from '../notices'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}))

describe('noticesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getProjectNotices', () => {
    it('should fetch all notices for a project', async () => {
      const mockData = [
        { id: '1', project_id: 'proj-1', subject: 'Test Notice 1' },
        { id: '2', project_id: 'proj-1', subject: 'Test Notice 2' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await noticesApi.getProjectNotices('proj-1')

      expect(supabase.from).toHaveBeenCalledWith('notices')
      expect(result).toEqual(mockData)
    })

    it('should apply filters correctly', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await noticesApi.getProjectNotices('proj-1', {
        status: 'sent',
        notice_type: 'correspondence',
        is_critical: true,
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'proj-1')
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'sent')
      expect(mockQuery.eq).toHaveBeenCalledWith('notice_type', 'correspondence')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_critical', true)
    })

    it('should handle errors when fetching notices', async () => {
      const mockError = new Error('Database error')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(noticesApi.getProjectNotices('proj-1')).rejects.toThrow('Database error')
    })
  })

  describe('getNotice', () => {
    it('should fetch a single notice by ID', async () => {
      const mockData = { id: '1', subject: 'Test Notice' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await noticesApi.getNotice('1')

      expect(result).toEqual(mockData)
    })

    it('should handle errors when fetching single notice', async () => {
      const mockError = new Error('Not found')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(noticesApi.getNotice('1')).rejects.toThrow('Not found')
    })
  })

  describe('createNotice', () => {
    it('should create a new notice', async () => {
      const mockInput = {
        project_id: 'proj-1',
        notice_type: 'correspondence',
        subject: 'Test Subject',
        direction: 'outgoing' as const,
      }
      const mockData = { ...mockInput, id: '1' }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await noticesApi.createNotice(mockInput, 'user-1')

      expect(supabase.from).toHaveBeenCalledWith('notices')
      expect(result).toEqual(mockData)
    })

    it('should trim string inputs', async () => {
      const mockInput = {
        project_id: 'proj-1',
        notice_type: 'correspondence',
        subject: '  Test Subject  ',
        direction: 'outgoing' as const,
        from_party: '  Party A  ',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await noticesApi.createNotice(mockInput, 'user-1')

      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Test Subject',
          from_party: 'Party A',
        })
      )
    })

    it('should handle creation errors', async () => {
      const mockError = new Error('Creation failed')
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(
        noticesApi.createNotice(
          {
            project_id: 'proj-1',
            notice_type: 'correspondence',
            subject: 'Test',
            direction: 'outgoing',
          },
          'user-1'
        )
      ).rejects.toThrow('Creation failed')
    })
  })

  describe('updateNotice', () => {
    it('should update a notice', async () => {
      const mockUpdates = { subject: 'Updated Subject' }
      const mockData = { id: '1', ...mockUpdates }

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await noticesApi.updateNotice('1', mockUpdates)

      expect(result).toEqual(mockData)
    })

    it('should handle update errors', async () => {
      const mockError = new Error('Update failed')
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(noticesApi.updateNotice('1', { subject: 'Updated' })).rejects.toThrow(
        'Update failed'
      )
    })
  })

  describe('deleteNotice', () => {
    it('should soft delete a notice', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await noticesApi.deleteNotice('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })

    it('should handle delete errors', async () => {
      const mockError = new Error('Delete failed')
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(noticesApi.deleteNotice('1')).rejects.toThrow('Delete failed')
    })
  })

  describe('getOverdueNotices', () => {
    it('should fetch overdue notices', async () => {
      const mockData = [{ id: '1', response_due_date: '2023-01-01' }]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await noticesApi.getOverdueNotices()

      expect(result).toEqual(mockData)
      expect(mockQuery.eq).toHaveBeenCalledWith('response_required', true)
    })

    it('should filter by project ID if provided', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await noticesApi.getOverdueNotices('proj-1')

      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'proj-1')
    })
  })

  describe('getNoticeStats', () => {
    it('should calculate notice statistics', async () => {
      const mockData = [
        {
          id: '1',
          is_critical: true,
          response_required: true,
          response_date: null,
          response_due_date: '2020-01-01',
          direction: 'outgoing',
          notice_date: new Date().toISOString().split('T')[0],
        },
        {
          id: '2',
          is_critical: false,
          response_required: false,
          response_date: null,
          response_due_date: null,
          direction: 'incoming',
          notice_date: '2020-01-01',
        },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await noticesApi.getNoticeStats('proj-1')

      expect(result.total).toBe(2)
      expect(result.critical).toBe(1)
      expect(result.awaitingResponse).toBe(1)
      expect(result.overdue).toBe(1)
    })

    it('should handle errors when fetching stats', async () => {
      const mockError = new Error('Stats error')
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(noticesApi.getNoticeStats('proj-1')).rejects.toThrow('Stats error')
    })
  })

  describe('uploadDocument', () => {
    it('should upload document and return URL', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const mockPublicUrl = 'https://example.com/test.pdf'

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: mockPublicUrl } }),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)

      const result = await noticesApi.uploadDocument('proj-1', 'notice-1', mockFile, 'notice')

      expect(result).toBe(mockPublicUrl)
      expect(mockStorage.upload).toHaveBeenCalled()
    })

    it('should handle upload errors', async () => {
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })
      const mockError = new Error('Upload failed')

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ error: mockError }),
        getPublicUrl: vi.fn(),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)

      await expect(
        noticesApi.uploadDocument('proj-1', 'notice-1', mockFile, 'notice')
      ).rejects.toThrow('Upload failed')
    })
  })
})
