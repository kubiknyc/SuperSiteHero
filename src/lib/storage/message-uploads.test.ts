/**
 * Message Attachment Upload Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  uploadMessageAttachment,
  uploadMessageAttachments,
  deleteMessageAttachment,
  deleteMessageAttachments
} from './message-uploads'
import { supabase } from '@/lib/supabase'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        remove: vi.fn(),
      })),
    },
  },
}))

describe('Message Attachment Uploads', () => {
  const mockConversationId = 'conv-123'
  const mockUserId = 'user-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadMessageAttachment', () => {
    it('should upload file to Supabase Storage', async () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'conv-123/user-456/123456-abc.jpg' },
        error: null,
      })

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/storage/conv-123/user-456/123456-abc.jpg' },
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any)

      const result = await uploadMessageAttachment(mockConversationId, mockUserId, mockFile)

      expect(supabase.storage.from).toHaveBeenCalledWith('message-attachments')
      expect(mockUpload).toHaveBeenCalled()
      expect(result).toMatchObject({
        name: 'test.jpg',
        type: 'image/jpeg',
        size: expect.any(Number),
      })
      expect(result.url).toContain('https://')
      expect(result.path).toContain(mockConversationId)
      expect(result.path).toContain(mockUserId)
    })

    it('should reject files larger than 50MB', async () => {
      // Create a mock file object with large size
      const largeFile = Object.create(File.prototype)
      Object.defineProperty(largeFile, 'size', { value: 51 * 1024 * 1024 })
      Object.defineProperty(largeFile, 'name', { value: 'large.pdf' })
      Object.defineProperty(largeFile, 'type', { value: 'application/pdf' })

      await expect(
        uploadMessageAttachment(mockConversationId, mockUserId, largeFile as File)
      ).rejects.toThrow('File size exceeds 50MB limit')
    })

    it('should handle upload errors gracefully', async () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
      } as any)

      await expect(
        uploadMessageAttachment(mockConversationId, mockUserId, mockFile)
      ).rejects.toThrow('Failed to upload file')
    })

    it('should generate unique file paths', async () => {
      const mockFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      const uploadCalls: string[] = []

      const mockUpload = vi.fn().mockImplementation((path: string) => {
        uploadCalls.push(path)
        return Promise.resolve({
          data: { path },
          error: null,
        })
      })

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/path' },
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any)

      await uploadMessageAttachment(mockConversationId, mockUserId, mockFile)
      await uploadMessageAttachment(mockConversationId, mockUserId, mockFile)

      // Paths should be different due to timestamp + random
      expect(uploadCalls[0]).not.toBe(uploadCalls[1])
    })

    it('should preserve original file metadata', async () => {
      const mockFile = new File(['test content'], 'document.pdf', {
        type: 'application/pdf'
      })

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'some-path' },
        error: null,
      })

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/path' },
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any)

      const result = await uploadMessageAttachment(mockConversationId, mockUserId, mockFile)

      expect(result.name).toBe('document.pdf')
      expect(result.type).toBe('application/pdf')
      expect(result.size).toBe(mockFile.size)
    })
  })

  describe('uploadMessageAttachments', () => {
    it('should upload multiple files', async () => {
      const files = [
        new File(['content1'], 'file1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
      ]

      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'some-path' },
        error: null,
      })

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/path' },
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any)

      const results = await uploadMessageAttachments(mockConversationId, mockUserId, files)

      expect(results).toHaveLength(2)
      expect(mockUpload).toHaveBeenCalledTimes(2)
      expect(results[0].name).toBe('file1.jpg')
      expect(results[1].name).toBe('file2.pdf')
    })

    it('should handle empty file array', async () => {
      const results = await uploadMessageAttachments(mockConversationId, mockUserId, [])

      expect(results).toHaveLength(0)
    })

    it('should fail entire batch if one file fails', async () => {
      const files = [
        new File(['content1'], 'file1.jpg', { type: 'image/jpeg' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
      ]

      let uploadCount = 0
      const mockUpload = vi.fn().mockImplementation(() => {
        uploadCount++
        if (uploadCount === 2) {
          return Promise.resolve({
            data: null,
            error: { message: 'Upload failed' },
          })
        }
        return Promise.resolve({
          data: { path: 'some-path' },
          error: null,
        })
      })

      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/path' },
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      } as any)

      await expect(
        uploadMessageAttachments(mockConversationId, mockUserId, files)
      ).rejects.toThrow('Failed to upload file')
    })
  })

  describe('deleteMessageAttachment', () => {
    it('should delete file from storage', async () => {
      const filePath = 'conv-123/user-456/file.jpg'

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any)

      await deleteMessageAttachment(filePath)

      expect(supabase.storage.from).toHaveBeenCalledWith('message-attachments')
      expect(mockRemove).toHaveBeenCalledWith([filePath])
    })

    it('should handle deletion errors', async () => {
      const filePath = 'conv-123/user-456/file.jpg'

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'File not found' },
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any)

      await expect(deleteMessageAttachment(filePath)).rejects.toThrow('Failed to delete file')
    })
  })

  describe('deleteMessageAttachments', () => {
    it('should delete multiple files', async () => {
      const filePaths = ['path1.jpg', 'path2.pdf']

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any)

      await deleteMessageAttachments(filePaths)

      expect(mockRemove).toHaveBeenCalledWith(filePaths)
    })

    it('should handle deletion errors for batch', async () => {
      const filePaths = ['path1.jpg', 'path2.pdf']

      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Deletion failed' },
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any)

      await expect(deleteMessageAttachments(filePaths)).rejects.toThrow('Failed to delete files')
    })

    it('should handle empty file paths array', async () => {
      const mockRemove = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any)

      await deleteMessageAttachments([])

      expect(mockRemove).toHaveBeenCalledWith([])
    })
  })
})
