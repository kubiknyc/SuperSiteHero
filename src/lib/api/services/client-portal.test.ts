/**
 * Client Portal API Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clientPortalApi } from './client-portal'

// Mock Supabase
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  then: vi.fn(function (this: any, onFulfilled: any) {
    return Promise.resolve({ data: [], error: null }).then(onFulfilled)
  }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}))

describe('clientPortalApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the chain mock
    Object.values(mockSupabaseChain).forEach((fn) => {
      if (typeof fn === 'function' && fn.mockReturnThis) {
        fn.mockReturnThis()
      }
    })
  })

  // ============================================
  // getClientProjects
  // ============================================

  describe('getClientProjects', () => {
    it('should fetch all client projects successfully', async () => {
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1', status: 'active' },
        { id: 'proj-2', name: 'Project 2', status: 'completed' },
      ]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockProjects, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientProjects()

      expect(result).toEqual(mockProjects)
    })

    it('should return empty array when no projects', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientProjects()

      expect(result).toEqual([])
    })

    it('should throw error when fetch fails', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(clientPortalApi.getClientProjects()).rejects.toThrow()
    })
  })

  // ============================================
  // getClientProject
  // ============================================

  describe('getClientProject', () => {
    it('should fetch a single project successfully', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project', status: 'active' }

      mockSupabaseChain.single.mockImplementationOnce(() => ({
        then: (onFulfilled: any) => Promise.resolve({ data: mockProject, error: null }).then(onFulfilled),
      }))

      const result = await clientPortalApi.getClientProject('proj-1')

      expect(result).toEqual(mockProject)
    })

    it('should return null when project not found', async () => {
      mockSupabaseChain.single.mockImplementationOnce(() => ({
        then: (onFulfilled: any) =>
          Promise.resolve({ data: null, error: { code: 'PGRST116' } }).then(onFulfilled),
      }))

      const result = await clientPortalApi.getClientProject('non-existent')

      expect(result).toBeNull()
    })

    it('should throw error on database failure', async () => {
      mockSupabaseChain.single.mockImplementationOnce(() => ({
        then: (onFulfilled: any) =>
          Promise.resolve({ data: null, error: { code: 'OTHER_ERROR', message: 'DB Error' } }).then(onFulfilled),
      }))

      await expect(clientPortalApi.getClientProject('proj-1')).rejects.toThrow()
    })
  })

  // ============================================
  // getClientDashboardStats
  // ============================================

  describe('getClientDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Mock projects response
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({
          data: [
            { id: 'proj-1', status: 'active' },
            { id: 'proj-2', status: 'completed' },
          ],
          error: null,
        }).then(onFulfilled)
      )

      // Mock RFIs count
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ count: 5, error: null }).then(onFulfilled)
      )

      // Mock COs count
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ count: 3, error: null }).then(onFulfilled)
      )

      // Mock milestones count
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ count: 2, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientDashboardStats()

      expect(result).toEqual({
        total_projects: 2,
        active_projects: 1,
        completed_projects: 1,
        open_rfis: 5,
        pending_change_orders: 3,
        upcoming_milestones: 2,
      })
    })

    it('should handle zero counts', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ count: 0, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ count: 0, error: null }).then(onFulfilled)
      )
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ count: 0, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientDashboardStats()

      expect(result.total_projects).toBe(0)
      expect(result.open_rfis).toBe(0)
    })
  })

  // ============================================
  // getPortalSettings
  // ============================================

  describe('getPortalSettings', () => {
    it('should fetch portal settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        project_id: 'proj-1',
        show_budget: false,
        show_schedule: true,
        show_documents: true,
      }

      mockSupabaseChain.single.mockImplementationOnce(() => ({
        then: (onFulfilled: any) => Promise.resolve({ data: mockSettings, error: null }).then(onFulfilled),
      }))

      const result = await clientPortalApi.getPortalSettings('proj-1')

      expect(result).toEqual(mockSettings)
    })

    it('should return null when settings not found', async () => {
      mockSupabaseChain.single.mockImplementationOnce(() => ({
        then: (onFulfilled: any) =>
          Promise.resolve({ data: null, error: { code: 'PGRST116' } }).then(onFulfilled),
      }))

      const result = await clientPortalApi.getPortalSettings('proj-1')

      expect(result).toBeNull()
    })
  })

  // ============================================
  // updatePortalSettings
  // ============================================

  describe('updatePortalSettings', () => {
    it('should update portal settings', async () => {
      const updatedSettings = {
        id: 'settings-1',
        project_id: 'proj-1',
        show_budget: true,
        show_schedule: true,
      }

      mockSupabaseChain.single.mockImplementationOnce(() => ({
        then: (onFulfilled: any) => Promise.resolve({ data: updatedSettings, error: null }).then(onFulfilled),
      }))

      const result = await clientPortalApi.updatePortalSettings('proj-1', { show_budget: true })

      expect(result).toEqual(updatedSettings)
    })

    it('should throw error on update failure', async () => {
      mockSupabaseChain.single.mockImplementationOnce(() => ({
        then: (onFulfilled: any) =>
          Promise.resolve({ data: null, error: { message: 'Update failed' } }).then(onFulfilled),
      }))

      await expect(
        clientPortalApi.updatePortalSettings('proj-1', { show_budget: true })
      ).rejects.toThrow()
    })
  })

  // ============================================
  // getClientRFIs
  // ============================================

  describe('getClientRFIs', () => {
    it('should fetch RFIs for a project', async () => {
      const mockRFIs = [
        { id: 'rfi-1', number: 1, title: 'RFI 1', status: 'open' },
        { id: 'rfi-2', number: 2, title: 'RFI 2', status: 'closed' },
      ]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockRFIs, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientRFIs('proj-1')

      expect(result.length).toBe(2)
      expect(result[0].title).toBe('RFI 1')
    })

    it('should return empty array when no RFIs', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientRFIs('proj-1')

      expect(result).toEqual([])
    })
  })

  // ============================================
  // getClientChangeOrders
  // ============================================

  describe('getClientChangeOrders', () => {
    it('should fetch change orders for a project', async () => {
      const mockCOs = [
        { id: 'co-1', number: 1, title: 'CO 1', status: 'approved' },
        { id: 'co-2', number: 2, title: 'CO 2', status: 'pending' },
      ]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockCOs, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientChangeOrders('proj-1')

      expect(result.length).toBe(2)
      expect(result[0].title).toBe('CO 1')
    })

    it('should throw error on fetch failure', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: null, error: { message: 'Fetch failed' } }).then(onFulfilled)
      )

      await expect(clientPortalApi.getClientChangeOrders('proj-1')).rejects.toThrow()
    })
  })

  // ============================================
  // getClientDocuments
  // ============================================

  describe('getClientDocuments', () => {
    it('should fetch documents for a project', async () => {
      const mockDocs = [
        { id: 'doc-1', name: 'Document 1', file_type: 'pdf', document_type: 'drawing' },
        { id: 'doc-2', name: 'Document 2', file_type: 'pdf', document_type: 'submittal' },
      ]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockDocs, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientDocuments('proj-1')

      expect(result.length).toBe(2)
      expect(result[0].name).toBe('Document 1')
    })

    it('should map document_type to category', async () => {
      const mockDocs = [{ id: 'doc-1', name: 'Document 1', document_type: 'specification' }]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockDocs, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientDocuments('proj-1')

      expect(result[0].category).toBe('specification')
    })
  })

  // ============================================
  // getClientPhotos
  // ============================================

  describe('getClientPhotos', () => {
    it('should fetch photos for a project', async () => {
      const mockPhotos = [
        { id: 'photo-1', file_url: 'url1', caption: 'Photo 1', photo_category: 'progress' },
        { id: 'photo-2', file_url: 'url2', caption: 'Photo 2', photo_category: 'safety' },
      ]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockPhotos, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientPhotos('proj-1')

      expect(result.length).toBe(2)
      expect(result[0].photo_url).toBe('url1')
    })

    it('should map GPS coordinates', async () => {
      const mockPhotos = [
        { id: 'photo-1', file_url: 'url1', latitude: 40.7128, longitude: -74.006 },
      ]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockPhotos, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientPhotos('proj-1')

      expect(result[0].latitude).toBe(40.7128)
      expect(result[0].longitude).toBe(-74.006)
    })
  })

  // ============================================
  // getClientSchedule
  // ============================================

  describe('getClientSchedule', () => {
    it('should fetch schedule items for a project', async () => {
      const mockItems = [
        { id: 'item-1', task_name: 'Foundation', start_date: '2025-01-01', finish_date: '2025-01-15' },
        { id: 'item-2', task_name: 'Framing', start_date: '2025-01-16', finish_date: '2025-02-15' },
      ]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockItems, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientSchedule('proj-1')

      expect(result.length).toBe(2)
      expect(result[0].task_name).toBe('Foundation')
    })

    it('should default percent_complete to 0', async () => {
      const mockItems = [
        { id: 'item-1', task_name: 'Task', percent_complete: null },
      ]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockItems, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientSchedule('proj-1')

      expect(result[0].percent_complete).toBe(0)
    })

    it('should default duration_days to 1', async () => {
      const mockItems = [
        { id: 'item-1', task_name: 'Task', duration_days: null },
      ]

      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: mockItems, error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.getClientSchedule('proj-1')

      expect(result[0].duration_days).toBe(1)
    })
  })

  // ============================================
  // inviteClient
  // ============================================

  describe('inviteClient', () => {
    it('should add existing user to projects', async () => {
      // Mock finding existing user
      mockSupabaseChain.single.mockImplementationOnce(() => ({
        then: (onFulfilled: any) =>
          Promise.resolve({ data: { id: 'user-123' }, error: null }).then(onFulfilled),
      }))

      // Mock upsert
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled: any) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await clientPortalApi.inviteClient('test@example.com', ['proj-1'], 'admin-1')

      expect(result.success).toBe(true)
      expect(result.message).toBe('Client added to projects')
    })

    it('should return failure message for non-existent user', async () => {
      mockSupabaseChain.single.mockImplementationOnce(() => ({
        then: (onFulfilled: any) =>
          Promise.resolve({ data: null, error: null }).then(onFulfilled),
      }))

      const result = await clientPortalApi.inviteClient('new@example.com', ['proj-1'], 'admin-1')

      expect(result.success).toBe(false)
      expect(result.message).toContain('not found')
    })
  })
})
