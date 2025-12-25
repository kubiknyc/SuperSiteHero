// File: /src/lib/api/services/document-access-log.test.ts
// Tests for document access log API service

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { documentAccessLogApi, type AccessLogEntry } from './document-access-log'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

describe('documentAccessLogApi', () => {
  const mockDocumentId = 'doc-123'
  const mockProjectId = 'proj-456'
  const mockUserId = 'user-789'

  const mockAccessLog: AccessLogEntry[] = [
    {
      id: 'log-1',
      document_id: mockDocumentId,
      project_id: mockProjectId,
      user_id: mockUserId,
      action: 'view',
      details: { versionId: 'v-1' },
      created_at: '2025-11-25T10:00:00Z',
      user: {
        id: mockUserId,
        full_name: 'Test User',
        email: 'test@example.com',
      },
    },
    {
      id: 'log-2',
      document_id: mockDocumentId,
      project_id: mockProjectId,
      user_id: mockUserId,
      action: 'download',
      details: null,
      created_at: '2025-11-25T11:00:00Z',
      user: {
        id: mockUserId,
        full_name: 'Test User',
        email: 'test@example.com',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logAccess', () => {
    it('should log access when user is authenticated', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      })

      // Mock insert
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockAccessLog[0],
            error: null,
          }),
        }),
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any)

      const result = await documentAccessLogApi.logAccess({
        documentId: mockDocumentId,
        projectId: mockProjectId,
        action: 'view',
        details: { versionId: 'v-1' },
      })

      expect(supabase.from).toHaveBeenCalledWith('document_access_log')
      expect(mockInsert).toHaveBeenCalledWith({
        document_id: mockDocumentId,
        project_id: mockProjectId,
        user_id: mockUserId,
        action: 'view',
        details: { versionId: 'v-1' },
      })
      expect(result).toEqual(mockAccessLog[0])
    })

    it('should return null when user is not authenticated', async () => {
      // Mock no user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any)

      const result = await documentAccessLogApi.logAccess({
        documentId: mockDocumentId,
        projectId: mockProjectId,
        action: 'view',
      })

      expect(result).toBeNull()
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should return null on error without throwing', async () => {
      // Mock authenticated user
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: mockUserId } as any },
        error: null,
      })

      // Mock error
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          }),
        }),
      } as any)

      const result = await documentAccessLogApi.logAccess({
        documentId: mockDocumentId,
        projectId: mockProjectId,
        action: 'view',
      })

      expect(result).toBeNull()
    })
  })

  describe('getAccessLog', () => {
    it('should fetch access log for a document', async () => {
      // The query chain ends with order() which returns the promise
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockAccessLog,
          error: null,
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await documentAccessLogApi.getAccessLog(mockDocumentId)

      expect(supabase.from).toHaveBeenCalledWith('document_access_log')
      expect(mockQuery.eq).toHaveBeenCalledWith('document_id', mockDocumentId)
      expect(result).toEqual(mockAccessLog)
    })

    it('should apply filters when provided', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({
          data: [mockAccessLog[0]],
          error: null,
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await documentAccessLogApi.getAccessLog(mockDocumentId, {
        action: 'view',
        userId: mockUserId,
        limit: 10,
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('action', 'view')
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', mockUserId)
      expect(mockQuery.limit).toHaveBeenCalledWith(10)
    })

    it('should throw on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error'),
        }),
      } as any)

      await expect(
        documentAccessLogApi.getAccessLog(mockDocumentId)
      ).rejects.toThrow('Database error')
    })
  })

  describe('getAccessStats', () => {
    it('should return correct statistics', async () => {
      const mockLogs = [
        { action: 'view', user_id: 'user-1', created_at: '2025-11-25T12:00:00Z' },
        { action: 'view', user_id: 'user-1', created_at: '2025-11-25T11:00:00Z' },
        { action: 'view', user_id: 'user-2', created_at: '2025-11-25T10:00:00Z' },
        { action: 'download', user_id: 'user-1', created_at: '2025-11-25T09:00:00Z' },
        { action: 'download', user_id: 'user-3', created_at: '2025-11-25T08:00:00Z' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockLogs,
          error: null,
        }),
      } as any)

      const stats = await documentAccessLogApi.getAccessStats(mockDocumentId)

      expect(stats.totalViews).toBe(3)
      expect(stats.totalDownloads).toBe(2)
      expect(stats.uniqueViewers).toBe(3)
      expect(stats.lastAccessed).toBe('2025-11-25T12:00:00Z')
      expect(stats.accessByAction).toEqual({
        view: 3,
        download: 2,
      })
    })

    it('should handle empty access log', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      } as any)

      const stats = await documentAccessLogApi.getAccessStats(mockDocumentId)

      expect(stats.totalViews).toBe(0)
      expect(stats.totalDownloads).toBe(0)
      expect(stats.uniqueViewers).toBe(0)
      expect(stats.lastAccessed).toBeNull()
    })
  })

  describe('getProjectActivity', () => {
    it('should fetch recent activity for a project', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockAccessLog,
          error: null,
        }),
      } as any)

      const result = await documentAccessLogApi.getProjectActivity(mockProjectId, 25)

      expect(supabase.from).toHaveBeenCalledWith('document_access_log')
      expect(result).toEqual(mockAccessLog)
    })

    it('should use default limit of 50', async () => {
      const mockLimit = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: mockLimit,
      } as any)

      await documentAccessLogApi.getProjectActivity(mockProjectId)

      expect(mockLimit).toHaveBeenCalledWith(50)
    })
  })
})
