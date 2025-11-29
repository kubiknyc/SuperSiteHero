// File: /src/lib/offline/storage-manager.test.ts
// Comprehensive tests for Storage Manager
// Phase: Testing - Offline Infrastructure coverage

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageManager } from './storage-manager'
import * as indexeddb from './indexeddb'

// Mock indexeddb module
vi.mock('./indexeddb', () => ({
  STORES: {
    CACHED_DATA: 'cachedData',
    SYNC_QUEUE: 'syncQueue',
    DOWNLOADS: 'downloads',
    CONFLICTS: 'conflicts',
    PHOTO_QUEUE: 'photoQueue',
  },
  getDatabase: vi.fn(),
  getByIndex: vi.fn(),
  putInStore: vi.fn(),
  getFromStore: vi.fn(),
  deleteFromStore: vi.fn(),
  cleanupExpiredCache: vi.fn(),
  getStorageEstimate: vi.fn(),
}))

describe('StorageManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =============================================
  // CACHE STRATEGY
  // =============================================

  describe('getStrategy', () => {
    it('should return strategy for known table', () => {
      const strategy = StorageManager.getStrategy('projects')

      expect(strategy.table).toBe('projects')
      expect(strategy.ttl).toBe(7 * 24 * 60 * 60 * 1000) // 7 days
      expect(strategy.priority).toBe('high')
    })

    it('should return strategy for daily_reports', () => {
      const strategy = StorageManager.getStrategy('daily_reports')

      expect(strategy.table).toBe('daily_reports')
      expect(strategy.ttl).toBe(30 * 24 * 60 * 60 * 1000) // 30 days
      expect(strategy.priority).toBe('high')
    })

    it('should return strategy for documents with infinite TTL', () => {
      const strategy = StorageManager.getStrategy('documents')

      expect(strategy.table).toBe('documents')
      expect(strategy.ttl).toBe(Infinity)
      expect(strategy.priority).toBe('normal')
    })

    it('should return default strategy for unknown table', () => {
      const strategy = StorageManager.getStrategy('unknown_table')

      expect(strategy.table).toBe('default')
      expect(strategy.ttl).toBe(24 * 60 * 60 * 1000) // 24 hours
      expect(strategy.priority).toBe('low')
    })

    it('should return strategy for rfis', () => {
      const strategy = StorageManager.getStrategy('rfis')

      expect(strategy.table).toBe('rfis')
      expect(strategy.priority).toBe('normal')
    })

    it('should return strategy for tasks', () => {
      const strategy = StorageManager.getStrategy('tasks')

      expect(strategy.table).toBe('tasks')
      expect(strategy.ttl).toBe(14 * 24 * 60 * 60 * 1000) // 14 days
    })
  })

  // =============================================
  // CACHE KEY GENERATION
  // =============================================

  describe('generateCacheKey', () => {
    it('should generate key without filters', () => {
      const key = StorageManager.generateCacheKey('projects')

      expect(key).toBe('projects:list')
    })

    it('should generate key with empty filters', () => {
      const key = StorageManager.generateCacheKey('projects', {})

      expect(key).toBe('projects:list')
    })

    it('should generate key with filters', () => {
      const key = StorageManager.generateCacheKey('projects', { status: 'active' })

      expect(key).toMatch(/^projects:list:[a-z0-9]+$/)
    })

    it('should generate consistent key for same filters', () => {
      const key1 = StorageManager.generateCacheKey('tasks', { status: 'open' })
      const key2 = StorageManager.generateCacheKey('tasks', { status: 'open' })

      expect(key1).toBe(key2)
    })

    it('should generate different keys for different filters', () => {
      const key1 = StorageManager.generateCacheKey('tasks', { status: 'open' })
      const key2 = StorageManager.generateCacheKey('tasks', { status: 'closed' })

      expect(key1).not.toBe(key2)
    })
  })

  describe('generateRecordKey', () => {
    it('should generate key for single record', () => {
      const key = StorageManager.generateRecordKey('projects', 'proj-123')

      expect(key).toBe('projects:proj-123')
    })

    it('should handle UUID-style IDs', () => {
      const key = StorageManager.generateRecordKey('documents', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')

      expect(key).toBe('documents:a1b2c3d4-e5f6-7890-abcd-ef1234567890')
    })
  })

  // =============================================
  // CACHING OPERATIONS
  // =============================================

  describe('cacheData', () => {
    it('should cache data with correct structure', async () => {
      vi.mocked(indexeddb.putInStore).mockResolvedValue('test-key')

      const testData = { id: '123', name: 'Test' }
      await StorageManager.cacheData('test-key', 'projects', testData)

      expect(indexeddb.putInStore).toHaveBeenCalledWith(
        'cachedData',
        expect.objectContaining({
          key: 'test-key',
          table: 'projects',
          data: testData,
          version: 1,
        })
      )
    })

    it('should set expiration based on strategy', async () => {
      vi.mocked(indexeddb.putInStore).mockResolvedValue('test-key')
      const beforeTime = Date.now()

      await StorageManager.cacheData('test-key', 'projects', {})

      const call = vi.mocked(indexeddb.putInStore).mock.calls[0]
      const cachedData = call[1] as { expiresAt: number; timestamp: number }

      // 7 days TTL for projects
      const expectedExpiration = cachedData.timestamp + 7 * 24 * 60 * 60 * 1000
      expect(cachedData.expiresAt).toBe(expectedExpiration)
    })

    it('should set infinite expiration for documents', async () => {
      vi.mocked(indexeddb.putInStore).mockResolvedValue('test-key')

      await StorageManager.cacheData('test-key', 'documents', {})

      const call = vi.mocked(indexeddb.putInStore).mock.calls[0]
      const cachedData = call[1] as { expiresAt: number }
      expect(cachedData.expiresAt).toBe(Infinity)
    })
  })

  describe('getCachedData', () => {
    it('should return cached data', async () => {
      const testData = { id: '123', name: 'Test' }
      vi.mocked(indexeddb.getFromStore).mockResolvedValue({
        key: 'test-key',
        table: 'projects',
        data: testData,
        timestamp: Date.now(),
        expiresAt: Date.now() + 100000,
        version: 1,
      })

      const result = await StorageManager.getCachedData<typeof testData>('test-key')

      expect(result).toEqual(testData)
    })

    it('should return null for non-existent key', async () => {
      vi.mocked(indexeddb.getFromStore).mockResolvedValue(undefined)

      const result = await StorageManager.getCachedData('non-existent')

      expect(result).toBeNull()
    })

    it('should return null and delete for expired data', async () => {
      vi.mocked(indexeddb.getFromStore).mockResolvedValue({
        key: 'test-key',
        table: 'projects',
        data: { test: 'data' },
        timestamp: Date.now() - 100000,
        expiresAt: Date.now() - 1000, // Already expired
        version: 1,
      })
      vi.mocked(indexeddb.deleteFromStore).mockResolvedValue(undefined)

      const result = await StorageManager.getCachedData('test-key')

      expect(result).toBeNull()
      expect(indexeddb.deleteFromStore).toHaveBeenCalledWith('cachedData', 'test-key')
    })

    it('should not expire data with infinite TTL', async () => {
      const testData = { id: '123' }
      vi.mocked(indexeddb.getFromStore).mockResolvedValue({
        key: 'test-key',
        table: 'documents',
        data: testData,
        timestamp: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
        expiresAt: Infinity,
        version: 1,
      })

      const result = await StorageManager.getCachedData('test-key')

      expect(result).toEqual(testData)
      expect(indexeddb.deleteFromStore).not.toHaveBeenCalled()
    })
  })

  // =============================================
  // CACHE INVALIDATION
  // =============================================

  describe('invalidateTable', () => {
    it('should delete all entries for a table', async () => {
      const mockCursor = {
        delete: vi.fn(),
      }
      const mockIndex = {
        iterate: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockCursor
            yield mockCursor
          },
        }),
      }
      const mockTransaction = {
        store: {
          index: vi.fn().mockReturnValue(mockIndex),
        },
        done: Promise.resolve(),
      }
      const mockDb = {
        transaction: vi.fn().mockReturnValue(mockTransaction),
      }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as never)

      await StorageManager.invalidateTable('projects')

      expect(mockDb.transaction).toHaveBeenCalledWith('cachedData', 'readwrite')
      expect(mockCursor.delete).toHaveBeenCalledTimes(2)
    })
  })

  describe('invalidateKey', () => {
    it('should delete specific cache entry', async () => {
      vi.mocked(indexeddb.deleteFromStore).mockResolvedValue(undefined)

      await StorageManager.invalidateKey('test-key')

      expect(indexeddb.deleteFromStore).toHaveBeenCalledWith('cachedData', 'test-key')
    })
  })

  describe('cleanupExpired', () => {
    it('should call cleanupExpiredCache', async () => {
      vi.mocked(indexeddb.cleanupExpiredCache).mockResolvedValue(5)

      const result = await StorageManager.cleanupExpired()

      expect(indexeddb.cleanupExpiredCache).toHaveBeenCalled()
      expect(result).toBe(5)
    })
  })

  // =============================================
  // STORAGE QUOTA
  // =============================================

  describe('getQuota', () => {
    it('should return storage quota information', async () => {
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 50000000,
        quota: 100000000,
        percentage: 50,
      })

      const quota = await StorageManager.getQuota()

      expect(quota.total).toBe(100000000)
      expect(quota.used).toBe(50000000)
      expect(quota.available).toBe(50000000)
      expect(quota.warning).toBe(false)
      expect(quota.critical).toBe(false)
    })

    it('should set warning flag when usage > 90%', async () => {
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 92000000,
        quota: 100000000,
        percentage: 92,
      })

      const quota = await StorageManager.getQuota()

      expect(quota.warning).toBe(true)
      expect(quota.critical).toBe(false)
    })

    it('should set critical flag when usage > 95%', async () => {
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 97000000,
        quota: 100000000,
        percentage: 97,
      })

      const quota = await StorageManager.getQuota()

      expect(quota.warning).toBe(true)
      expect(quota.critical).toBe(true)
    })
  })

  describe('hasEnoughSpace', () => {
    it('should return true when enough space available', async () => {
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 50000000,
        quota: 100000000,
        percentage: 50,
      })

      const result = await StorageManager.hasEnoughSpace(10000000)

      expect(result).toBe(true)
    })

    it('should return false when not enough space', async () => {
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 95000000,
        quota: 100000000,
        percentage: 95,
      })

      const result = await StorageManager.hasEnoughSpace(10000000)

      expect(result).toBe(false)
    })
  })

  describe('freeSpace', () => {
    it('should return early if already enough space', async () => {
      vi.mocked(indexeddb.cleanupExpiredCache).mockResolvedValue(0)
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 10000000,
        quota: 100000000,
        percentage: 10,
      })

      const freedBytes = await StorageManager.freeSpace(5000000)

      expect(freedBytes).toBe(0)
    })

    it('should clean up old records to free space', async () => {
      const mockCursor = {
        value: { timestamp: Date.now() - 100 * 24 * 60 * 60 * 1000 },
        delete: vi.fn(),
      }
      const mockIndex = {
        iterate: vi.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield mockCursor
          },
        }),
      }
      const mockTransaction = {
        store: {
          index: vi.fn().mockReturnValue(mockIndex),
        },
        done: Promise.resolve(),
      }
      const mockDb = {
        transaction: vi.fn().mockReturnValue(mockTransaction),
      }
      vi.mocked(indexeddb.getDatabase).mockResolvedValue(mockDb as never)
      vi.mocked(indexeddb.cleanupExpiredCache).mockResolvedValue(5)

      // First call - high usage, second call - reduced usage
      vi.mocked(indexeddb.getStorageEstimate)
        .mockResolvedValueOnce({
          usage: 99000000,
          quota: 100000000,
          percentage: 99,
        })
        .mockResolvedValueOnce({
          usage: 90000000,
          quota: 100000000,
          percentage: 90,
        })

      const freedBytes = await StorageManager.freeSpace(50000000)

      expect(freedBytes).toBe(9000000)
    })
  })

  // =============================================
  // CACHE STATISTICS
  // =============================================

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const mockEntries = [
        { table: 'projects', timestamp: 1000 },
        { table: 'projects', timestamp: 2000 },
        { table: 'tasks', timestamp: 1500 },
      ]
      vi.mocked(indexeddb.getByIndex).mockResolvedValue(mockEntries)

      const stats = await StorageManager.getCacheStats()

      expect(stats.totalEntries).toBe(3)
      expect(stats.byTable).toEqual({
        projects: 2,
        tasks: 1,
      })
      expect(stats.oldestEntry).toBe(1000)
      expect(stats.newestEntry).toBe(2000)
    })

    it('should handle empty cache', async () => {
      vi.mocked(indexeddb.getByIndex).mockResolvedValue([])

      const stats = await StorageManager.getCacheStats()

      expect(stats.totalEntries).toBe(0)
      expect(stats.byTable).toEqual({})
    })
  })

  describe('getCacheHealth', () => {
    it('should return healthy status', async () => {
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 50000000,
        quota: 100000000,
        percentage: 50,
      })
      vi.mocked(indexeddb.getByIndex).mockResolvedValue([])

      const health = await StorageManager.getCacheHealth()

      expect(health.status).toBe('healthy')
      expect(health.message).toBe('Cache is healthy')
    })

    it('should return warning status', async () => {
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 92000000,
        quota: 100000000,
        percentage: 92,
      })
      vi.mocked(indexeddb.getByIndex).mockResolvedValue([])

      const health = await StorageManager.getCacheHealth()

      expect(health.status).toBe('warning')
      expect(health.message).toContain('running low')
    })

    it('should return critical status', async () => {
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 97000000,
        quota: 100000000,
        percentage: 97,
      })
      vi.mocked(indexeddb.getByIndex).mockResolvedValue([])

      const health = await StorageManager.getCacheHealth()

      expect(health.status).toBe('critical')
      expect(health.message).toContain('critically low')
    })

    it('should include quota and stats in response', async () => {
      vi.mocked(indexeddb.getStorageEstimate).mockResolvedValue({
        usage: 50000000,
        quota: 100000000,
        percentage: 50,
      })
      vi.mocked(indexeddb.getByIndex).mockResolvedValue([
        { table: 'projects', timestamp: 1000 },
      ])

      const health = await StorageManager.getCacheHealth()

      expect(health.quota).toBeDefined()
      expect(health.quota.total).toBe(100000000)
      expect(health.stats).toBeDefined()
      expect(health.stats.totalEntries).toBe(1)
    })
  })
})
