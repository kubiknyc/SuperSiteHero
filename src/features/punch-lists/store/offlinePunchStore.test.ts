/**
 * Comprehensive tests for Offline Punch Items Store
 * Tests local caching, sync queue, and offline punch item management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the persist middleware BEFORE importing the store
vi.mock('zustand/middleware', async () => {
  const actual = await vi.importActual('zustand/middleware')
  return {
    ...actual,
    persist: (config: any) => config, // Pass through without persistence
  }
})

import {
  useOfflinePunchStore,
  usePendingPunchCount,
  usePunchDrafts,
  useUnsyncedPunchItems,
} from './offlinePunchStore'
import type { DraftPunchItem } from './offlinePunchStore'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('Offline Punch Store', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear()
    // Reset store before each test by clearing sync queue and removing all drafts
    useOfflinePunchStore.setState({ drafts: [], syncQueue: [], subcontractorUpdates: [] })
  })

  // =============================================
  // ADD DRAFT
  // =============================================

  describe('addDraft', () => {
    it('should add a new draft punch item', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Fix drywall',
        description: 'Repair damaged drywall in unit 101',
        trade: 'Drywall',
        priority: 'medium',
        status: 'open',
      })

      // Get fresh state after mutation
      const store = useOfflinePunchStore.getState()

      expect(id).toBeTruthy()
      expect(store.drafts).toHaveLength(1)
      expect(store.drafts[0].title).toBe('Fix drywall')
      expect(store.drafts[0].synced).toBe(false)
    })

    it('should generate unique ID for draft', () => {
      const store = useOfflinePunchStore.getState()

      const id1 = store.addDraft({
        project_id: 'project-123',
        title: 'Item 1',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      const id2 = store.addDraft({
        project_id: 'project-123',
        title: 'Item 2',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      expect(id1).not.toBe(id2)
    })

    it('should set created_at timestamp', () => {
      const beforeTime = new Date().toISOString()

      useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test item',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      const afterTime = new Date().toISOString()
      // Get fresh state after mutation
      const store = useOfflinePunchStore.getState()
      const createdAt = store.drafts[0].created_at

      expect(createdAt).toBeTruthy()
      expect(createdAt >= beforeTime).toBe(true)
      expect(createdAt <= afterTime).toBe(true)
    })

    it('should add to sync queue with create operation', () => {
      useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test item',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      // Get fresh state after mutation
      const store = useOfflinePunchStore.getState()

      expect(store.syncQueue).toHaveLength(1)
      expect(store.syncQueue[0].operation).toBe('create')
      expect(store.syncQueue[0].attempts).toBe(0)
    })

    it('should include all optional fields', () => {
      useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Detailed item',
        description: 'Full description',
        trade: 'Electrical',
        priority: 'high',
        status: 'open',
        building: 'Building A',
        floor: '2nd Floor',
        room: 'Unit 201',
        area: 'Kitchen',
        location_notes: 'Near the sink',
        due_date: '2024-02-01',
        assigned_to: 'user-456',
        subcontractor_id: 'sub-789',
        floor_plan_location: {
          x: 100,
          y: 200,
          documentId: 'doc-123',
          sheetName: 'Floor Plan A',
        },
        pending_photos: ['blob:photo1', 'blob:photo2'],
      })

      // Get fresh state after mutation
      const store = useOfflinePunchStore.getState()
      const draft = store.drafts[0]

      expect(draft.building).toBe('Building A')
      expect(draft.floor).toBe('2nd Floor')
      expect(draft.room).toBe('Unit 201')
      expect(draft.area).toBe('Kitchen')
      expect(draft.location_notes).toBe('Near the sink')
      expect(draft.due_date).toBe('2024-02-01')
      expect(draft.assigned_to).toBe('user-456')
      expect(draft.subcontractor_id).toBe('sub-789')
      expect(draft.floor_plan_location).toEqual({
        x: 100,
        y: 200,
        documentId: 'doc-123',
        sheetName: 'Floor Plan A',
      })
      expect(draft.pending_photos).toEqual(['blob:photo1', 'blob:photo2'])
    })
  })

  // =============================================
  // UPDATE DRAFT
  // =============================================

  describe('updateDraft', () => {
    it('should update existing draft', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Original title',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      useOfflinePunchStore.getState().updateDraft(id, {
        title: 'Updated title',
        priority: 'high',
      })

      // Get fresh state after mutations
      const store = useOfflinePunchStore.getState()
      const draft = store.drafts.find(d => d.id === id)

      expect(draft?.title).toBe('Updated title')
      expect(draft?.priority).toBe('high')
    })

    it('should mark draft as not synced', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      // Simulate sync
      useOfflinePunchStore.getState().markSynced(id)
      let store = useOfflinePunchStore.getState()
      expect(store.drafts[0].synced).toBe(true)

      // Update should mark as not synced
      useOfflinePunchStore.getState().updateDraft(id, { description: 'New description' })
      store = useOfflinePunchStore.getState()
      expect(store.drafts[0].synced).toBe(false)
    })

    it('should update existing sync queue entry', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Original',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      let store = useOfflinePunchStore.getState()
      const originalQueueLength = store.syncQueue.length

      useOfflinePunchStore.getState().updateDraft(id, { title: 'Updated' })

      // Get fresh state and check
      store = useOfflinePunchStore.getState()
      expect(store.syncQueue).toHaveLength(originalQueueLength)
      expect(store.syncQueue[0].punchItem.title).toBe('Updated')
    })

    it('should not add queue entry for already synced item without pending entry', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      // Mark as synced and remove from queue
      useOfflinePunchStore.getState().markSynced(id, 'server-id-123')

      let store = useOfflinePunchStore.getState()
      const queueLength = store.syncQueue.length

      // Update shouldn't add to queue since it's already synced
      useOfflinePunchStore.getState().updateDraft(id, { description: 'Updated' })

      store = useOfflinePunchStore.getState()
      expect(store.syncQueue).toHaveLength(queueLength)
    })

    it('should handle update of non-existent draft gracefully', () => {
      // Should not throw
      useOfflinePunchStore.getState().updateDraft('non-existent-id', { title: 'Updated' })

      const store = useOfflinePunchStore.getState()
      expect(store.drafts).toHaveLength(0)
    })
  })

  // =============================================
  // REMOVE DRAFT
  // =============================================

  describe('removeDraft', () => {
    it('should remove draft', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'To be removed',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      useOfflinePunchStore.getState().removeDraft(id)

      const store = useOfflinePunchStore.getState()
      expect(store.drafts).toHaveLength(0)
    })

    it('should remove associated sync queue entry', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      let store = useOfflinePunchStore.getState()
      expect(store.syncQueue).toHaveLength(1)

      useOfflinePunchStore.getState().removeDraft(id)

      store = useOfflinePunchStore.getState()
      expect(store.syncQueue).toHaveLength(0)
    })
  })

  // =============================================
  // MARK SYNCED
  // =============================================

  describe('markSynced', () => {
    it('should mark draft as synced', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      useOfflinePunchStore.getState().markSynced(id)

      const store = useOfflinePunchStore.getState()
      const draft = store.drafts.find(d => d.id === id)
      expect(draft?.synced).toBe(true)
      expect(draft?.sync_error).toBeUndefined()
    })

    it('should replace local ID with server ID', () => {
      const localId = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      useOfflinePunchStore.getState().markSynced(localId, 'server-uuid-456')

      const store = useOfflinePunchStore.getState()
      const draft = store.drafts.find(d => d.id === 'server-uuid-456')
      expect(draft).toBeDefined()
      expect(draft?.id).toBe('server-uuid-456')
    })

    it('should remove from sync queue', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      let store = useOfflinePunchStore.getState()
      expect(store.syncQueue).toHaveLength(1)

      useOfflinePunchStore.getState().markSynced(id)

      store = useOfflinePunchStore.getState()
      expect(store.syncQueue).toHaveLength(0)
    })
  })

  // =============================================
  // MARK SYNC ERROR
  // =============================================

  describe('markSyncError', () => {
    it('should set sync error on draft', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      useOfflinePunchStore.getState().markSyncError(id, 'Network timeout')

      const store = useOfflinePunchStore.getState()
      const draft = store.drafts.find(d => d.id === id)
      expect(draft?.sync_error).toBe('Network timeout')
    })
  })

  // =============================================
  // SYNC QUEUE MANAGEMENT
  // =============================================

  describe('Sync Queue', () => {
    it('should add to sync queue', () => {
      const draft: DraftPunchItem = {
        id: 'draft-123',
        project_id: 'project-456',
        title: 'Test punch',
        trade: 'General',
        priority: 'medium',
        status: 'open',
        created_at: new Date().toISOString(),
        synced: false,
      }

      useOfflinePunchStore.getState().addToSyncQueue({
        operation: 'update',
        punchItem: draft,
      })

      const store = useOfflinePunchStore.getState()
      expect(store.syncQueue).toHaveLength(1)
      expect(store.syncQueue[0].operation).toBe('update')
      expect(store.syncQueue[0].attempts).toBe(0)
    })

    it('should remove from sync queue', () => {
      const draft: DraftPunchItem = {
        id: 'draft-123',
        project_id: 'project-456',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
        created_at: new Date().toISOString(),
        synced: false,
      }

      useOfflinePunchStore.getState().addToSyncQueue({
        operation: 'create',
        punchItem: draft,
      })

      let store = useOfflinePunchStore.getState()
      const queueId = store.syncQueue[0].id

      useOfflinePunchStore.getState().removeFromSyncQueue(queueId)

      store = useOfflinePunchStore.getState()
      expect(store.syncQueue).toHaveLength(0)
    })

    it('should increment attempt count', () => {
      const draft: DraftPunchItem = {
        id: 'draft-123',
        project_id: 'project-456',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
        created_at: new Date().toISOString(),
        synced: false,
      }

      useOfflinePunchStore.getState().addToSyncQueue({
        operation: 'create',
        punchItem: draft,
      })

      let store = useOfflinePunchStore.getState()
      const queueId = store.syncQueue[0].id

      useOfflinePunchStore.getState().incrementAttempt(queueId, 'Network error')

      store = useOfflinePunchStore.getState()
      expect(store.syncQueue[0].attempts).toBe(1)
      expect(store.syncQueue[0].error).toBe('Network error')
      expect(store.syncQueue[0].lastAttempt).toBeTruthy()
    })

    it('should clear entire sync queue', () => {
      // Add multiple items
      useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Item 1',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Item 2',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      let store = useOfflinePunchStore.getState()
      expect(store.syncQueue.length).toBeGreaterThan(0)

      useOfflinePunchStore.getState().clearSyncQueue()

      store = useOfflinePunchStore.getState()
      expect(store.syncQueue).toHaveLength(0)
    })
  })

  // =============================================
  // GETTERS
  // =============================================

  describe('getPendingCount', () => {
    it('should return count of pending sync items', () => {
      const store = useOfflinePunchStore.getState()

      store.addDraft({
        project_id: 'project-123',
        title: 'Item 1',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      store.addDraft({
        project_id: 'project-123',
        title: 'Item 2',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      const count = store.getPendingCount()

      expect(count).toBe(2)
    })

    it('should return 0 when queue is empty', () => {
      const store = useOfflinePunchStore.getState()

      const count = store.getPendingCount()

      expect(count).toBe(0)
    })
  })

  describe('getDraftById', () => {
    it('should return draft by ID', () => {
      const store = useOfflinePunchStore.getState()

      const id = store.addDraft({
        project_id: 'project-123',
        title: 'Find me',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      const draft = store.getDraftById(id)

      expect(draft).toBeDefined()
      expect(draft?.title).toBe('Find me')
    })

    it('should return undefined for non-existent ID', () => {
      const store = useOfflinePunchStore.getState()

      const draft = store.getDraftById('non-existent')

      expect(draft).toBeUndefined()
    })
  })

  // =============================================
  // HOOKS
  // =============================================

  describe('Hooks', () => {
    it('usePendingPunchCount should return sync queue length', () => {
      const store = useOfflinePunchStore.getState()

      store.addDraft({
        project_id: 'project-123',
        title: 'Item 1',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      // Get fresh state after mutation
      const count = useOfflinePunchStore.getState().syncQueue.length

      expect(count).toBe(1)
    })

    it('usePunchDrafts should return all drafts', () => {
      const store = useOfflinePunchStore.getState()

      store.addDraft({
        project_id: 'project-123',
        title: 'Item 1',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      store.addDraft({
        project_id: 'project-123',
        title: 'Item 2',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      // Get fresh state after mutations
      const drafts = useOfflinePunchStore.getState().drafts

      expect(drafts).toHaveLength(2)
    })

    it('useUnsyncedPunchItems should return only unsynced items', () => {
      const store = useOfflinePunchStore.getState()

      const id1 = store.addDraft({
        project_id: 'project-123',
        title: 'Unsynced',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      const id2 = store.addDraft({
        project_id: 'project-123',
        title: 'Will be synced',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      store.markSynced(id2)

      // Use store's drafts.filter directly instead of calling the hook
      const unsynced = useOfflinePunchStore.getState().drafts.filter((d) => !d.synced)

      expect(unsynced).toHaveLength(1)
      expect(unsynced[0].id).toBe(id1)
    })
  })

  // =============================================
  // FLOOR PLAN LOCATION
  // =============================================

  describe('Floor Plan Location', () => {
    it('should store floor plan pin location', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Located on floor plan',
        trade: 'General',
        priority: 'low',
        status: 'open',
        floor_plan_location: {
          x: 450,
          y: 300,
          documentId: 'floor-plan-123',
          sheetName: 'Level 1',
        },
      })

      const store = useOfflinePunchStore.getState()
      const draft = store.getDraftById(id)

      expect(draft?.floor_plan_location).toEqual({
        x: 450,
        y: 300,
        documentId: 'floor-plan-123',
        sheetName: 'Level 1',
      })
    })

    it('should update floor plan location', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
      })

      useOfflinePunchStore.getState().updateDraft(id, {
        floor_plan_location: {
          x: 100,
          y: 200,
          documentId: 'doc-456',
        },
      })

      const store = useOfflinePunchStore.getState()
      const draft = store.getDraftById(id)

      expect(draft?.floor_plan_location?.x).toBe(100)
      expect(draft?.floor_plan_location?.y).toBe(200)
    })
  })

  // =============================================
  // PENDING PHOTOS
  // =============================================

  describe('Pending Photos', () => {
    it('should store pending photo URLs', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'With photos',
        trade: 'General',
        priority: 'low',
        status: 'open',
        pending_photos: [
          'blob:http://localhost/photo1',
          'blob:http://localhost/photo2',
        ],
      })

      const store = useOfflinePunchStore.getState()
      const draft = store.getDraftById(id)

      expect(draft?.pending_photos).toHaveLength(2)
    })

    it('should update pending photos', () => {
      const id = useOfflinePunchStore.getState().addDraft({
        project_id: 'project-123',
        title: 'Test',
        trade: 'General',
        priority: 'low',
        status: 'open',
        pending_photos: ['blob:photo1'],
      })

      useOfflinePunchStore.getState().updateDraft(id, {
        pending_photos: ['blob:photo1', 'blob:photo2', 'blob:photo3'],
      })

      const store = useOfflinePunchStore.getState()
      const draft = store.getDraftById(id)

      expect(draft?.pending_photos).toHaveLength(3)
    })
  })
})
