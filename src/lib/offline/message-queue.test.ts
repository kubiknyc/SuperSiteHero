/**
 * Comprehensive tests for Message Queue
 * Tests offline messaging functionality including queueing, retry logic, and sync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  queueMessage,
  getPendingMessages,
  getAllQueuedMessages,
  getQueuedMessagesForConversation,
  updateMessageStatus,
  removeFromQueue,
  incrementRetry,
  calculateRetryDelay,
  processMessageQueue,
  clearFailedMessages,
  retryFailedMessages,
  getQueueStats,
  type QueuedMessage,
} from './message-queue'

// Mock dependencies
vi.mock('./indexeddb', () => ({
  STORES: {
    SYNC_QUEUE: 'syncQueue',
  },
  getDatabase: vi.fn(() => ({
    getAll: vi.fn(),
    get: vi.fn(),
  })),
  getByIndex: vi.fn(),
  putInStore: vi.fn(),
  deleteFromStore: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
    })),
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import mocked modules
import * as indexeddb from './indexeddb'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

// Helper to create mock queued message
const createMockQueuedMessage = (overrides: Partial<QueuedMessage> = {}): QueuedMessage => ({
  id: 'msg-123',
  conversation_id: 'conv-456',
  sender_id: 'user-789',
  content: 'Test message',
  message_type: 'text',
  timestamp: Date.now(),
  status: 'pending',
  retryCount: 0,
  ...overrides,
})

describe('Message Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  // =============================================
  // QUEUE MESSAGE
  // =============================================

  describe('queueMessage', () => {
    it('should queue a text message', async () => {
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-id')

      const result = await queueMessage('user-123', {
        conversation_id: 'conv-456',
        content: 'Hello world',
        message_type: 'text',
      })

      expect(indexeddb.putInStore).toHaveBeenCalled()
      expect(result).toMatchObject({
        conversation_id: 'conv-456',
        sender_id: 'user-123',
        content: 'Hello world',
        message_type: 'text',
        status: 'pending',
        retryCount: 0,
      })
      expect(result.id).toBeTruthy()
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('queued'))
    })

    it('should queue a message with attachments', async () => {
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-id')

      const attachments = [{ url: 'https://example.com/file.pdf', name: 'file.pdf' }]
      const result = await queueMessage('user-123', {
        conversation_id: 'conv-456',
        content: 'Check this file',
        message_type: 'file',
        attachments,
      })

      expect(result.attachments).toEqual(attachments)
      expect(result.message_type).toBe('file')
    })

    it('should queue a message with mentioned users', async () => {
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-id')

      const mentionedUsers = ['user-1', 'user-2']
      const result = await queueMessage('user-123', {
        conversation_id: 'conv-456',
        content: '@user1 @user2 hello',
        mentioned_users: mentionedUsers,
      })

      expect(result.mentioned_users).toEqual(mentionedUsers)
    })

    it('should queue a reply message', async () => {
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-id')

      const result = await queueMessage('user-123', {
        conversation_id: 'conv-456',
        content: 'Reply to previous',
        parent_message_id: 'parent-msg-123',
      })

      expect(result.parent_message_id).toBe('parent-msg-123')
    })

    it('should default to text message type', async () => {
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-id')

      const result = await queueMessage('user-123', {
        conversation_id: 'conv-456',
        content: 'Default type',
      } as any)

      expect(result.message_type).toBe('text')
    })
  })

  // =============================================
  // GET OPERATIONS
  // =============================================

  describe('getPendingMessages', () => {
    it('should return pending messages', async () => {
      const mockMessages = [
        { table: 'messages', status: 'pending', data: createMockQueuedMessage() },
        { table: 'messages', status: 'pending', data: createMockQueuedMessage({ id: 'msg-2' }) },
      ]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(mockMessages as any)

      const result = await getPendingMessages()

      expect(indexeddb.getByIndex).toHaveBeenCalledWith('syncQueue', 'status', 'pending')
      expect(result).toHaveLength(2)
    })

    it('should filter out non-message items', async () => {
      const mockItems = [
        { table: 'messages', status: 'pending', data: createMockQueuedMessage() },
        { table: 'daily_reports', status: 'pending', data: {} },
        { table: 'messages', status: 'pending', data: createMockQueuedMessage({ id: 'msg-2' }) },
      ]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(mockItems as any)

      const result = await getPendingMessages()

      expect(result).toHaveLength(2)
      expect(result.every(m => m.conversation_id)).toBe(true)
    })
  })

  describe('getAllQueuedMessages', () => {
    it('should return all queued messages regardless of status', async () => {
      const mockDb = {
        getAll: vi.fn().mockResolvedValue([
          { table: 'messages', data: createMockQueuedMessage({ status: 'pending' }) },
          { table: 'messages', data: createMockQueuedMessage({ id: 'msg-2', status: 'failed' }) },
          { table: 'other', data: {} },
        ]),
      }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      const result = await getAllQueuedMessages()

      expect(result).toHaveLength(2)
    })
  })

  describe('getQueuedMessagesForConversation', () => {
    it('should return messages for specific conversation', async () => {
      const mockDb = {
        getAll: vi.fn().mockResolvedValue([
          { table: 'messages', data: createMockQueuedMessage({ conversation_id: 'conv-1' }) },
          { table: 'messages', data: createMockQueuedMessage({ id: 'msg-2', conversation_id: 'conv-2' }) },
          { table: 'messages', data: createMockQueuedMessage({ id: 'msg-3', conversation_id: 'conv-1' }) },
        ]),
      }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      const result = await getQueuedMessagesForConversation('conv-1')

      expect(result).toHaveLength(2)
      expect(result.every(m => m.conversation_id === 'conv-1')).toBe(true)
    })
  })

  // =============================================
  // STATUS UPDATES
  // =============================================

  describe('updateMessageStatus', () => {
    it('should update message status', async () => {
      const mockItem = {
        id: 'msg-123',
        status: 'pending',
        data: createMockQueuedMessage(),
      }
      const mockDb = { get: vi.fn().mockResolvedValue(mockItem) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-123')

      await updateMessageStatus('msg-123', 'processing')

      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'syncQueue',
        expect.objectContaining({
          status: 'processing',
          lastAttempt: expect.any(Number),
        })
      )
    })

    it('should include error message when provided', async () => {
      const mockItem = { id: 'msg-123', data: createMockQueuedMessage() }
      const mockDb = { get: vi.fn().mockResolvedValue(mockItem) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-123')

      await updateMessageStatus('msg-123', 'failed', 'Network error')

      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'syncQueue',
        expect.objectContaining({
          status: 'failed',
          error: 'Network error',
        })
      )
    })

    it('should handle non-existent message gracefully', async () => {
      const mockDb = { get: vi.fn().mockResolvedValue(undefined) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      await updateMessageStatus('non-existent', 'failed')

      expect(indexeddb.putInStore).not.toHaveBeenCalled()
    })
  })

  describe('removeFromQueue', () => {
    it('should remove message from queue', async () => {
      vi.mocked(indexeddb.deleteFromStore).mockResolvedValue(undefined)

      await removeFromQueue('msg-123')

      expect(indexeddb.deleteFromStore).toHaveBeenCalledWith('syncQueue', 'msg-123')
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('removed'))
    })
  })

  describe('incrementRetry', () => {
    it('should increment retry count', async () => {
      const mockItem = {
        id: 'msg-123',
        data: createMockQueuedMessage({ retryCount: 2 }),
      }
      const mockDb = { get: vi.fn().mockResolvedValue(mockItem) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-123')

      const newCount = await incrementRetry('msg-123')

      expect(newCount).toBe(3)
      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'syncQueue',
        expect.objectContaining({
          retryCount: 3,
        })
      )
    })

    it('should start from 0 if no retry count exists', async () => {
      const mockItem = { id: 'msg-123', data: {} }
      const mockDb = { get: vi.fn().mockResolvedValue(mockItem) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-123')

      const newCount = await incrementRetry('msg-123')

      expect(newCount).toBe(1)
    })

    it('should return 0 for non-existent message', async () => {
      const mockDb = { get: vi.fn().mockResolvedValue(undefined) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      const newCount = await incrementRetry('non-existent')

      expect(newCount).toBe(0)
    })
  })

  // =============================================
  // RETRY LOGIC
  // =============================================

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff', () => {
      const delay0 = calculateRetryDelay(0)
      const delay1 = calculateRetryDelay(1)
      const delay2 = calculateRetryDelay(2)

      // Base delay is 1000ms, with exponential growth
      expect(delay0).toBeGreaterThanOrEqual(1000)
      expect(delay0).toBeLessThan(2000) // With jitter
      expect(delay1).toBeGreaterThanOrEqual(2000)
      expect(delay2).toBeGreaterThanOrEqual(4000)
    })

    it('should cap at maximum delay', () => {
      const delay = calculateRetryDelay(10)
      // Max is 60000ms + jitter (25%)
      expect(delay).toBeLessThanOrEqual(75000)
    })

    it('should add jitter to prevent thundering herd', () => {
      const delays = Array.from({ length: 10 }, () => calculateRetryDelay(3))
      const uniqueDelays = new Set(delays)

      // With jitter, delays should be different
      expect(uniqueDelays.size).toBeGreaterThan(1)
    })
  })

  // =============================================
  // PROCESS QUEUE
  // =============================================

  describe('processMessageQueue', () => {
    it('should skip processing when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

      const result = await processMessageQueue()

      expect(result).toEqual({ sent: 0, failed: 0, pending: 0 })
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Offline'))
    })

    it('should process pending messages when online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })

      const mockMessages = [
        createMockQueuedMessage({ id: 'msg-1' }),
        createMockQueuedMessage({ id: 'msg-2' }),
      ]

      vi.mocked(indexeddb.getByIndex).mockResolvedValue(
        mockMessages.map(m => ({ table: 'messages', status: 'pending', data: m })) as any
      )

      const mockDb = { get: vi.fn().mockResolvedValue(null) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      // Mock successful insert
      const mockSupabase = supabase as any
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })

      vi.mocked(indexeddb.deleteFromStore).mockResolvedValue(undefined)

      const result = await processMessageQueue()

      expect(result.sent).toBe(2)
      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining('Processing 2 pending'))
    })

    it('should handle send failures with retry', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })

      const mockMessage = createMockQueuedMessage({ id: 'msg-1', retryCount: 0 })
      vi.mocked(indexeddb.getByIndex).mockResolvedValue([
        { table: 'messages', status: 'pending', data: mockMessage }
      ] as any)

      const mockItem = { id: 'msg-1', data: mockMessage }
      const mockDb = { get: vi.fn().mockResolvedValue(mockItem) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      // Mock failed insert
      const mockSupabase = supabase as any
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
      })

      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-1')

      const result = await processMessageQueue()

      expect(result.pending).toBe(1)
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should mark as failed after max retries', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })

      const mockMessage = createMockQueuedMessage({ id: 'msg-1', retryCount: 4 })
      vi.mocked(indexeddb.getByIndex).mockResolvedValue([
        { table: 'messages', status: 'pending', data: mockMessage }
      ] as any)

      const mockItem = { id: 'msg-1', data: mockMessage }
      const mockDb = { get: vi.fn().mockResolvedValue(mockItem) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      // Mock failed insert (will be 5th retry)
      const mockSupabase = supabase as any
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
      })

      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-1')

      await processMessageQueue()

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('failed after'))
    })

    it('should respect retry delay', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })

      const recentAttempt = Date.now() - 500 // 0.5 seconds ago
      const mockMessage = createMockQueuedMessage({
        id: 'msg-1',
        retryCount: 1,
        lastAttempt: recentAttempt,
      })

      vi.mocked(indexeddb.getByIndex).mockResolvedValue([
        { table: 'messages', status: 'pending', data: mockMessage }
      ] as any)

      const result = await processMessageQueue()

      // Should be pending (not attempted due to retry delay)
      expect(result.pending).toBe(1)
      expect(result.sent).toBe(0)
    })
  })

  // =============================================
  // MAINTENANCE OPERATIONS
  // =============================================

  describe('clearFailedMessages', () => {
    it('should clear all failed messages', async () => {
      const mockMessages = [
        createMockQueuedMessage({ id: 'msg-1', status: 'failed' }),
        createMockQueuedMessage({ id: 'msg-2', status: 'pending' }),
        createMockQueuedMessage({ id: 'msg-3', status: 'failed' }),
      ]

      const mockDb = {
        getAll: vi.fn().mockResolvedValue(
          mockMessages.map(m => ({ table: 'messages', data: m }))
        ),
      }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)
      vi.mocked(indexeddb.deleteFromStore).mockResolvedValue(undefined)

      const count = await clearFailedMessages()

      expect(count).toBe(2)
      expect(indexeddb.deleteFromStore).toHaveBeenCalledTimes(2)
    })

    it('should return 0 when no failed messages', async () => {
      const mockDb = { getAll: vi.fn().mockResolvedValue([]) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      const count = await clearFailedMessages()

      expect(count).toBe(0)
    })
  })

  describe('retryFailedMessages', () => {
    it('should reset failed messages to pending', async () => {
      const mockMessages = [
        createMockQueuedMessage({ id: 'msg-1', status: 'failed', retryCount: 5 }),
        createMockQueuedMessage({ id: 'msg-2', status: 'failed', retryCount: 3 }),
      ]

      const mockDb = {
        getAll: vi.fn().mockResolvedValue(
          mockMessages.map(m => ({ table: 'messages', data: m }))
        ),
        get: vi.fn().mockImplementation((store, id) => ({
          id,
          data: mockMessages.find(m => m.id === id),
        })),
      }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)
      vi.mocked(indexeddb.putInStore).mockResolvedValue('msg-id')

      await retryFailedMessages()

      expect(indexeddb.putInStore).toHaveBeenCalledTimes(4) // 2 status updates + 2 retry resets
    })
  })

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockMessages = [
        createMockQueuedMessage({ status: 'pending' }),
        createMockQueuedMessage({ id: 'msg-2', status: 'pending' }),
        createMockQueuedMessage({ id: 'msg-3', status: 'processing' }),
        createMockQueuedMessage({ id: 'msg-4', status: 'failed' }),
      ]

      const mockDb = {
        getAll: vi.fn().mockResolvedValue(
          mockMessages.map(m => ({ table: 'messages', data: m }))
        ),
      }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      const stats = await getQueueStats()

      expect(stats).toEqual({
        total: 4,
        pending: 2,
        processing: 1,
        failed: 1,
      })
    })

    it('should return zero stats for empty queue', async () => {
      const mockDb = { getAll: vi.fn().mockResolvedValue([]) }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as any)

      const stats = await getQueueStats()

      expect(stats).toEqual({
        total: 0,
        pending: 0,
        processing: 0,
        failed: 0,
      })
    })
  })
})
