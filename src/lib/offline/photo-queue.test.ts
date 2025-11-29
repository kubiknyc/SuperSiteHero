// File: /src/lib/offline/photo-queue.test.ts
// Comprehensive tests for Photo Queue
// Phase: Testing - Offline Infrastructure coverage

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  queuePhoto,
  getPendingPhotos,
  getPhotosByResponse,
  getPhotosByChecklist,
  getQueuedPhoto,
  updatePhotoStatus,
  markPhotoUploaded,
  markPhotoFailed,
  removeQueuedPhoto,
  getPendingPhotoCount,
  getAllQueuedPhotos,
  clearUploadedPhotos,
  retryFailedPhotos,
  getQueueStats,
  blobToFile,
} from './photo-queue'
import type { QueuedPhoto } from '@/types/offline'

// Mock dependencies
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123'),
}))

vi.mock('./indexeddb', () => ({
  STORES: {
    PHOTO_QUEUE: 'photoQueue',
  },
  getDatabase: vi.fn(),
  addToStore: vi.fn(),
  putInStore: vi.fn(),
  deleteFromStore: vi.fn(),
  getByIndex: vi.fn(),
  getAllFromStore: vi.fn(),
  getFromStore: vi.fn(),
}))

// Import mocked module
import * as indexeddb from './indexeddb'

// Helper to create mock QueuedPhoto
const createMockQueuedPhoto = (overrides: Partial<QueuedPhoto> = {}): QueuedPhoto => ({
  id: 'photo-123',
  checklistId: 'checklist-456',
  responseId: 'response-789',
  file: new Blob(['test'], { type: 'image/jpeg' }),
  fileName: 'test.jpg',
  fileSize: 1024,
  mimeType: 'image/jpeg',
  timestamp: Date.now(),
  retryCount: 0,
  status: 'pending',
  ...overrides,
})

describe('Photo Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =============================================
  // QUEUE PHOTO
  // =============================================

  describe('queuePhoto', () => {
    it('should add photo to queue with correct structure', async () => {
      vi.mocked(indexeddb.addToStore).mockResolvedValue('mock-uuid-123')

      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

      const result = await queuePhoto('checklist-123', 'response-456', mockFile)

      expect(indexeddb.addToStore).toHaveBeenCalledWith(
        'photoQueue',
        expect.objectContaining({
          id: 'mock-uuid-123',
          checklistId: 'checklist-123',
          responseId: 'response-456',
          fileName: 'photo.jpg',
          mimeType: 'image/jpeg',
          status: 'pending',
          retryCount: 0,
        })
      )
      expect(result.id).toBe('mock-uuid-123')
    })

    it('should include metadata when provided', async () => {
      vi.mocked(indexeddb.addToStore).mockResolvedValue('mock-uuid-123')

      const mockFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
      const metadata = { location: 'Building A', notes: 'Test photo' }

      const result = await queuePhoto('checklist-123', 'response-456', mockFile, metadata)

      expect(result.metadata).toEqual(metadata)
    })

    it('should convert File to Blob for storage', async () => {
      vi.mocked(indexeddb.addToStore).mockResolvedValue('mock-uuid-123')

      const mockFile = new File(['test content'], 'photo.jpg', { type: 'image/jpeg' })

      const result = await queuePhoto('checklist-123', 'response-456', mockFile)

      expect(result.file).toBeInstanceOf(Blob)
      expect(result.fileSize).toBe(mockFile.size)
    })
  })

  // =============================================
  // GET OPERATIONS
  // =============================================

  describe('getPendingPhotos', () => {
    it('should return pending photos', async () => {
      const mockPhotos = [
        createMockQueuedPhoto({ id: 'photo-1', status: 'pending' }),
        createMockQueuedPhoto({ id: 'photo-2', status: 'pending' }),
      ]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(mockPhotos)

      const result = await getPendingPhotos()

      expect(indexeddb.getByIndex).toHaveBeenCalledWith('photoQueue', 'status', 'pending')
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no pending photos', async () => {
      vi.mocked(indexeddb.getByIndex).mockResolvedValue([])

      const result = await getPendingPhotos()

      expect(result).toEqual([])
    })
  })

  describe('getPhotosByResponse', () => {
    it('should return photos for specific response', async () => {
      const mockPhotos = [createMockQueuedPhoto({ responseId: 'response-123' })]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(mockPhotos)

      const result = await getPhotosByResponse('response-123')

      expect(indexeddb.getByIndex).toHaveBeenCalledWith('photoQueue', 'responseId', 'response-123')
      expect(result).toHaveLength(1)
    })
  })

  describe('getPhotosByChecklist', () => {
    it('should return photos for specific checklist', async () => {
      const mockPhotos = [
        createMockQueuedPhoto({ checklistId: 'checklist-123' }),
        createMockQueuedPhoto({ checklistId: 'checklist-123' }),
      ]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(mockPhotos)

      const result = await getPhotosByChecklist('checklist-123')

      expect(indexeddb.getByIndex).toHaveBeenCalledWith('photoQueue', 'checklistId', 'checklist-123')
      expect(result).toHaveLength(2)
    })
  })

  describe('getQueuedPhoto', () => {
    it('should return photo by ID', async () => {
      const mockPhoto = createMockQueuedPhoto({ id: 'photo-123' })
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(mockPhoto)

      const result = await getQueuedPhoto('photo-123')

      expect(indexeddb.getFromStore).toHaveBeenCalledWith('photoQueue', 'photo-123')
      expect(result).toEqual(mockPhoto)
    })

    it('should return undefined for non-existent photo', async () => {
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(undefined)

      const result = await getQueuedPhoto('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('getAllQueuedPhotos', () => {
    it('should return all photos regardless of status', async () => {
      const mockPhotos = [
        createMockQueuedPhoto({ status: 'pending' }),
        createMockQueuedPhoto({ status: 'uploaded' }),
        createMockQueuedPhoto({ status: 'failed' }),
      ]
      vi.mocked(indexeddb.getAllFromStore).mockResolvedValue(mockPhotos)

      const result = await getAllQueuedPhotos()

      expect(indexeddb.getAllFromStore).toHaveBeenCalledWith('photoQueue')
      expect(result).toHaveLength(3)
    })
  })

  // =============================================
  // STATUS UPDATES
  // =============================================

  describe('updatePhotoStatus', () => {
    it('should update photo status', async () => {
      const mockPhoto = createMockQueuedPhoto({ id: 'photo-123', status: 'pending' })
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(mockPhoto)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('photo-123')

      await updatePhotoStatus('photo-123', 'uploading')

      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'photoQueue',
        expect.objectContaining({
          id: 'photo-123',
          status: 'uploading',
        })
      )
    })

    it('should increment retry count when status is uploading', async () => {
      const mockPhoto = createMockQueuedPhoto({ id: 'photo-123', retryCount: 1 })
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(mockPhoto)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('photo-123')

      await updatePhotoStatus('photo-123', 'uploading')

      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'photoQueue',
        expect.objectContaining({
          retryCount: 2,
        })
      )
    })

    it('should include error message when provided', async () => {
      const mockPhoto = createMockQueuedPhoto({ id: 'photo-123' })
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(mockPhoto)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('photo-123')

      await updatePhotoStatus('photo-123', 'failed', 'Upload failed')

      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'photoQueue',
        expect.objectContaining({
          status: 'failed',
          error: 'Upload failed',
        })
      )
    })

    it('should include uploaded URL when provided', async () => {
      const mockPhoto = createMockQueuedPhoto({ id: 'photo-123' })
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(mockPhoto)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('photo-123')

      await updatePhotoStatus('photo-123', 'uploaded', undefined, 'https://example.com/photo.jpg')

      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'photoQueue',
        expect.objectContaining({
          status: 'uploaded',
          uploadedUrl: 'https://example.com/photo.jpg',
        })
      )
    })

    it('should throw error when photo not found', async () => {
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(undefined)

      await expect(updatePhotoStatus('non-existent', 'uploaded')).rejects.toThrow(
        'Queued photo non-existent not found'
      )
    })
  })

  describe('markPhotoUploaded', () => {
    it('should mark photo as uploaded with URL', async () => {
      const mockPhoto = createMockQueuedPhoto({ id: 'photo-123' })
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(mockPhoto)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('photo-123')

      await markPhotoUploaded('photo-123', 'https://example.com/photo.jpg')

      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'photoQueue',
        expect.objectContaining({
          status: 'uploaded',
          uploadedUrl: 'https://example.com/photo.jpg',
        })
      )
    })
  })

  describe('markPhotoFailed', () => {
    it('should mark photo as failed with error', async () => {
      const mockPhoto = createMockQueuedPhoto({ id: 'photo-123' })
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(mockPhoto)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('photo-123')

      await markPhotoFailed('photo-123', 'Network error')

      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'photoQueue',
        expect.objectContaining({
          status: 'failed',
          error: 'Network error',
        })
      )
    })
  })

  // =============================================
  // REMOVE OPERATIONS
  // =============================================

  describe('removeQueuedPhoto', () => {
    it('should remove photo from queue', async () => {
      vi.mocked(indexeddb.deleteFromStore).mockResolvedValue(undefined)

      await removeQueuedPhoto('photo-123')

      expect(indexeddb.deleteFromStore).toHaveBeenCalledWith('photoQueue', 'photo-123')
    })
  })

  describe('clearUploadedPhotos', () => {
    it('should remove all uploaded photos', async () => {
      const uploadedPhotos = [
        createMockQueuedPhoto({ id: 'photo-1', status: 'uploaded' }),
        createMockQueuedPhoto({ id: 'photo-2', status: 'uploaded' }),
      ]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(uploadedPhotos)
      vi.mocked(indexeddb.deleteFromStore).mockResolvedValue(undefined)

      const result = await clearUploadedPhotos()

      expect(indexeddb.getByIndex).toHaveBeenCalledWith('photoQueue', 'status', 'uploaded')
      expect(indexeddb.deleteFromStore).toHaveBeenCalledTimes(2)
      expect(result).toBe(2)
    })

    it('should return 0 when no uploaded photos', async () => {
      vi.mocked(indexeddb.getByIndex).mockResolvedValue([])

      const result = await clearUploadedPhotos()

      expect(result).toBe(0)
    })
  })

  // =============================================
  // RETRY OPERATIONS
  // =============================================

  describe('retryFailedPhotos', () => {
    it('should reset failed photos to pending', async () => {
      const failedPhotos = [
        createMockQueuedPhoto({ id: 'photo-1', status: 'failed', retryCount: 1 }),
        createMockQueuedPhoto({ id: 'photo-2', status: 'failed', retryCount: 2 }),
      ]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(failedPhotos)
      vi.mocked(indexeddb.getFromStore)
        .mockResolvedValueOnce(failedPhotos[0])
        .mockResolvedValueOnce(failedPhotos[1])
      vi.mocked(indexeddb.putInStore).mockResolvedValue('ok')

      const result = await retryFailedPhotos()

      expect(indexeddb.getByIndex).toHaveBeenCalledWith('photoQueue', 'status', 'failed')
      expect(result).toHaveLength(2)
    })

    it('should not retry photos with 3+ retry attempts', async () => {
      const failedPhotos = [
        createMockQueuedPhoto({ id: 'photo-1', status: 'failed', retryCount: 3 }),
        createMockQueuedPhoto({ id: 'photo-2', status: 'failed', retryCount: 4 }),
      ]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(failedPhotos)

      await retryFailedPhotos()

      expect(indexeddb.putInStore).not.toHaveBeenCalled()
    })
  })

  // =============================================
  // STATISTICS
  // =============================================

  describe('getPendingPhotoCount', () => {
    it('should return count of pending photos', async () => {
      const pendingPhotos = [
        createMockQueuedPhoto({ status: 'pending' }),
        createMockQueuedPhoto({ status: 'pending' }),
        createMockQueuedPhoto({ status: 'pending' }),
      ]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(pendingPhotos)

      const result = await getPendingPhotoCount()

      expect(result).toBe(3)
    })
  })

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const allPhotos = [
        createMockQueuedPhoto({ status: 'pending', fileSize: 1000 }),
        createMockQueuedPhoto({ status: 'pending', fileSize: 2000 }),
        createMockQueuedPhoto({ status: 'uploading', fileSize: 1500 }),
        createMockQueuedPhoto({ status: 'failed', fileSize: 500 }),
        createMockQueuedPhoto({ status: 'uploaded', fileSize: 3000 }),
      ]
      vi.mocked(indexeddb.getAllFromStore).mockResolvedValue(allPhotos)

      const stats = await getQueueStats()

      expect(stats).toEqual({
        total: 5,
        pending: 2,
        uploading: 1,
        failed: 1,
        uploaded: 1,
        totalSize: 8000,
      })
    })

    it('should return zero stats for empty queue', async () => {
      vi.mocked(indexeddb.getAllFromStore).mockResolvedValue([])

      const stats = await getQueueStats()

      expect(stats).toEqual({
        total: 0,
        pending: 0,
        uploading: 0,
        failed: 0,
        uploaded: 0,
        totalSize: 0,
      })
    })
  })

  // =============================================
  // UTILITY FUNCTIONS
  // =============================================

  describe('blobToFile', () => {
    it('should convert blob to file with correct name and type', () => {
      const blob = new Blob(['test content'], { type: 'image/png' })

      const file = blobToFile(blob, 'test-image.png')

      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('test-image.png')
      expect(file.type).toBe('image/png')
    })

    it('should preserve blob content', () => {
      const content = 'test file content'
      const blob = new Blob([content], { type: 'text/plain' })

      const file = blobToFile(blob, 'test.txt')

      // Verify file was created with correct properties
      expect(file.size).toBe(blob.size)
      expect(file.type).toBe('text/plain')
    })
  })
})
