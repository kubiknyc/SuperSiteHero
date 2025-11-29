// File: /src/lib/offline/indexeddb.test.ts
// Comprehensive tests for IndexedDB offline functionality
// Phase: Testing - Offline Infrastructure coverage

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the idb library
const mockTransaction = {
  store: {
    index: vi.fn(),
  },
  done: Promise.resolve(),
}

const mockIndex = {
  getAll: vi.fn(),
  count: vi.fn(),
  iterate: vi.fn(),
}

const mockDb = {
  getAll: vi.fn(),
  get: vi.fn(),
  add: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  count: vi.fn(),
  transaction: vi.fn(() => mockTransaction),
  close: vi.fn(),
  objectStoreNames: {
    contains: vi.fn(() => false),
  },
  createObjectStore: vi.fn(() => ({
    createIndex: vi.fn(),
  })),
}

vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDb)),
}))

// Import after mocking
import {
  initDatabase,
  getDatabase,
  closeDatabase,
  deleteDatabase,
  getAllFromStore,
  getFromStore,
  addToStore,
  putInStore,
  deleteFromStore,
  clearStore,
  getByIndex,
  countRecords,
  countByIndex,
  getStorageEstimate,
  isStoragePersisted,
  requestPersistentStorage,
  STORES,
} from './indexeddb'

describe('IndexedDB Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.store.index.mockReturnValue(mockIndex)
  })

  afterEach(() => {
    // Clean up database instance between tests
    closeDatabase()
  })

  // =============================================
  // DATABASE INITIALIZATION
  // =============================================

  describe('initDatabase', () => {
    it('should initialize database successfully', async () => {
      const db = await initDatabase()

      expect(db).toBeDefined()
    })

    it('should return existing instance if already initialized', async () => {
      const db1 = await initDatabase()
      const db2 = await initDatabase()

      expect(db1).toBe(db2)
    })

    it('should handle initialization error', async () => {
      const { openDB } = await import('idb')
      vi.mocked(openDB).mockRejectedValueOnce(new Error('Init failed'))
      closeDatabase() // Reset instance

      await expect(initDatabase()).rejects.toThrow('Failed to initialize offline database')
    })
  })

  describe('getDatabase', () => {
    it('should return existing database instance', async () => {
      await initDatabase()
      const db = await getDatabase()

      expect(db).toBeDefined()
    })

    it('should initialize database if not already done', async () => {
      closeDatabase()
      const db = await getDatabase()

      expect(db).toBeDefined()
    })
  })

  describe('closeDatabase', () => {
    it('should close database connection', async () => {
      await initDatabase()
      closeDatabase()

      expect(mockDb.close).toHaveBeenCalled()
    })

    it('should handle already closed database gracefully', () => {
      closeDatabase()
      closeDatabase() // Should not throw

      expect(true).toBe(true) // No error thrown
    })
  })

  describe('deleteDatabase', () => {
    it('should delete the entire database', async () => {
      // Mock indexedDB.deleteDatabase
      const mockDeleteDatabase = vi.fn(() => Promise.resolve())
      Object.defineProperty(globalThis, 'indexedDB', {
        value: { deleteDatabase: mockDeleteDatabase },
        writable: true,
        configurable: true,
      })

      await initDatabase()
      await deleteDatabase()

      expect(mockDeleteDatabase).toHaveBeenCalledWith('supersitehero-offline')
    })

    it('should close database before deleting', async () => {
      const mockDeleteDatabase = vi.fn(() => Promise.resolve())
      Object.defineProperty(globalThis, 'indexedDB', {
        value: { deleteDatabase: mockDeleteDatabase },
        writable: true,
        configurable: true,
      })

      await initDatabase()
      await deleteDatabase()

      expect(mockDb.close).toHaveBeenCalled()
    })
  })

  // =============================================
  // CRUD OPERATIONS
  // =============================================

  describe('getAllFromStore', () => {
    it('should get all records from store', async () => {
      const mockRecords = [{ id: '1', data: 'test1' }, { id: '2', data: 'test2' }]
      mockDb.getAll.mockResolvedValue(mockRecords)

      const result = await getAllFromStore(STORES.CACHED_DATA)

      expect(mockDb.getAll).toHaveBeenCalledWith(STORES.CACHED_DATA)
      expect(result).toEqual(mockRecords)
    })

    it('should return empty array when store is empty', async () => {
      mockDb.getAll.mockResolvedValue([])

      const result = await getAllFromStore(STORES.SYNC_QUEUE)

      expect(result).toEqual([])
    })
  })

  describe('getFromStore', () => {
    it('should get a single record by key', async () => {
      const mockRecord = { key: 'test-key', data: 'test-data' }
      mockDb.get.mockResolvedValue(mockRecord)

      const result = await getFromStore(STORES.CACHED_DATA, 'test-key')

      expect(mockDb.get).toHaveBeenCalledWith(STORES.CACHED_DATA, 'test-key')
      expect(result).toEqual(mockRecord)
    })

    it('should return undefined for non-existent key', async () => {
      mockDb.get.mockResolvedValue(undefined)

      const result = await getFromStore(STORES.CACHED_DATA, 'non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('addToStore', () => {
    it('should add a record to store', async () => {
      mockDb.add.mockResolvedValue('new-key')
      const newRecord = { key: 'new-key', data: 'new-data' }

      const result = await addToStore(STORES.CACHED_DATA, newRecord)

      expect(mockDb.add).toHaveBeenCalledWith(STORES.CACHED_DATA, newRecord)
      expect(result).toBe('new-key')
    })

    it('should convert key to string', async () => {
      mockDb.add.mockResolvedValue(123)

      const result = await addToStore(STORES.SYNC_QUEUE, { id: 123 })

      expect(result).toBe('123')
    })
  })

  describe('putInStore', () => {
    it('should update/put a record in store', async () => {
      mockDb.put.mockResolvedValue('updated-key')
      const updatedRecord = { key: 'updated-key', data: 'updated-data' }

      const result = await putInStore(STORES.CACHED_DATA, updatedRecord)

      expect(mockDb.put).toHaveBeenCalledWith(STORES.CACHED_DATA, updatedRecord)
      expect(result).toBe('updated-key')
    })

    it('should create new record if key does not exist', async () => {
      mockDb.put.mockResolvedValue('new-key')
      const newRecord = { key: 'new-key', data: 'new-data' }

      const result = await putInStore(STORES.CACHED_DATA, newRecord)

      expect(result).toBe('new-key')
    })
  })

  describe('deleteFromStore', () => {
    it('should delete a record from store', async () => {
      mockDb.delete.mockResolvedValue(undefined)

      await deleteFromStore(STORES.CACHED_DATA, 'delete-key')

      expect(mockDb.delete).toHaveBeenCalledWith(STORES.CACHED_DATA, 'delete-key')
    })
  })

  describe('clearStore', () => {
    it('should clear all records from store', async () => {
      mockDb.clear.mockResolvedValue(undefined)

      await clearStore(STORES.SYNC_QUEUE)

      expect(mockDb.clear).toHaveBeenCalledWith(STORES.SYNC_QUEUE)
    })
  })

  // =============================================
  // INDEX OPERATIONS
  // =============================================

  describe('getByIndex', () => {
    it('should get records by index value', async () => {
      const mockRecords = [{ table: 'projects', data: 'test' }]
      mockIndex.getAll.mockResolvedValue(mockRecords)

      const result = await getByIndex(STORES.CACHED_DATA, 'table', 'projects')

      expect(mockTransaction.store.index).toHaveBeenCalledWith('table')
      expect(mockIndex.getAll).toHaveBeenCalledWith('projects')
      expect(result).toEqual(mockRecords)
    })

    it('should return empty array when no matches', async () => {
      mockIndex.getAll.mockResolvedValue([])

      const result = await getByIndex(STORES.CACHED_DATA, 'table', 'non-existent')

      expect(result).toEqual([])
    })
  })

  describe('countRecords', () => {
    it('should count all records in store', async () => {
      mockDb.count.mockResolvedValue(42)

      const result = await countRecords(STORES.SYNC_QUEUE)

      expect(mockDb.count).toHaveBeenCalledWith(STORES.SYNC_QUEUE)
      expect(result).toBe(42)
    })

    it('should return 0 for empty store', async () => {
      mockDb.count.mockResolvedValue(0)

      const result = await countRecords(STORES.CONFLICTS)

      expect(result).toBe(0)
    })
  })

  describe('countByIndex', () => {
    it('should count records by index value', async () => {
      mockIndex.count.mockResolvedValue(15)

      const result = await countByIndex(STORES.SYNC_QUEUE, 'status', 'pending')

      expect(mockTransaction.store.index).toHaveBeenCalledWith('status')
      expect(mockIndex.count).toHaveBeenCalledWith('pending')
      expect(result).toBe(15)
    })

    it('should return 0 when no matches', async () => {
      mockIndex.count.mockResolvedValue(0)

      const result = await countByIndex(STORES.SYNC_QUEUE, 'status', 'non-existent')

      expect(result).toBe(0)
    })
  })

  // =============================================
  // STORAGE ESTIMATION
  // =============================================
  // Note: These tests verify the fallback behavior since navigator.storage
  // may not be available or mockable in the Node.js test environment

  describe('getStorageEstimate', () => {
    it('should return storage estimation object with correct shape', async () => {
      // In Node.js test environment, navigator.storage may not be available
      // The function returns fallback values in this case
      const result = await getStorageEstimate()

      expect(result).toHaveProperty('usage')
      expect(result).toHaveProperty('quota')
      expect(result).toHaveProperty('percentage')
      expect(typeof result.usage).toBe('number')
      expect(typeof result.quota).toBe('number')
      expect(typeof result.percentage).toBe('number')
    })
  })

  describe('isStoragePersisted', () => {
    it('should return boolean indicating persistence status', async () => {
      // In Node.js test environment, navigator.storage may not be available
      // The function returns false as fallback
      const result = await isStoragePersisted()

      expect(typeof result).toBe('boolean')
    })
  })

  describe('requestPersistentStorage', () => {
    it('should return boolean indicating persistence request result', async () => {
      // In Node.js test environment, navigator.storage may not be available
      // The function returns false as fallback
      const result = await requestPersistentStorage()

      expect(typeof result).toBe('boolean')
    })
  })

  // =============================================
  // STORE NAMES
  // =============================================

  describe('STORES constant', () => {
    it('should define all store names', () => {
      expect(STORES.CACHED_DATA).toBe('cachedData')
      expect(STORES.SYNC_QUEUE).toBe('syncQueue')
      expect(STORES.DOWNLOADS).toBe('downloads')
      expect(STORES.CONFLICTS).toBe('conflicts')
      expect(STORES.PHOTO_QUEUE).toBe('photoQueue')
    })
  })
})
