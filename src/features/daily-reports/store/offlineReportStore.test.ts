/**
 * Comprehensive tests for Offline Daily Reports Store
 * Tests local caching, sync queue, and conflict resolution
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useOfflineReportStore } from './offlineReportStore'
import type { DraftReport, WorkforceEntry, EquipmentEntry, DeliveryEntry, VisitorEntry } from './offlineReportStore'

describe('Offline Report Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useOfflineReportStore.getState()
    store.clearDraft()
  })

  // =============================================
  // DRAFT INITIALIZATION
  // =============================================

  describe('initializeDraft', () => {
    it('should initialize a new draft report', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      const draft = store.draftReport

      expect(draft).toBeDefined()
      expect(draft?.project_id).toBe('project-123')
      expect(draft?.report_date).toBe('2024-01-15')
      expect(draft?.status).toBe('draft')
      expect(draft?.id).toBeTruthy()
    })

    it('should clear previous data when initializing new draft', () => {
      const store = useOfflineReportStore.getState()

      // Set up some existing data
      store.initializeDraft('project-1', '2024-01-01')
      store.addWorkforceEntry({
        id: 'w1',
        entry_type: 'individual',
        worker_name: 'John',
        trade: 'Carpenter',
      })

      // Initialize new draft
      store.initializeDraft('project-2', '2024-01-02')

      expect(store.workforce).toHaveLength(0)
      expect(store.draftReport?.project_id).toBe('project-2')
    })
  })

  describe('initializeFromPreviousReport', () => {
    it('should copy data from previous report', () => {
      const previousReport: Partial<DraftReport> = {
        weather_condition: 'sunny',
        temperature_high: 75,
        temperature_low: 55,
      }

      const store = useOfflineReportStore.getState()
      store.initializeFromPreviousReport('project-123', '2024-01-16', previousReport)

      const draft = store.draftReport

      expect(draft?.weather_condition).toBe('sunny')
      expect(draft?.temperature_high).toBe(75)
      expect(draft?.project_id).toBe('project-123')
      expect(draft?.report_date).toBe('2024-01-16')
    })

    it('should copy workforce with new IDs', () => {
      const previousWorkforce: WorkforceEntry[] = [
        { id: 'old-1', entry_type: 'team', team_name: 'Team A', worker_count: 5, trade: 'Framing' },
      ]

      const store = useOfflineReportStore.getState()
      store.initializeFromPreviousReport(
        'project-123',
        '2024-01-16',
        {},
        { workforce: previousWorkforce }
      )

      expect(store.workforce).toHaveLength(1)
      expect(store.workforce[0].id).not.toBe('old-1') // New ID
      expect(store.workforce[0].team_name).toBe('Team A')
    })

    it('should clear submission/approval fields', () => {
      const previousReport: Partial<DraftReport> = {
        submitted_at: '2024-01-15T10:00:00Z',
        approved_at: '2024-01-15T12:00:00Z',
        approved_by: 'user-123',
      }

      const store = useOfflineReportStore.getState()
      store.initializeFromPreviousReport('project-123', '2024-01-16', previousReport)

      const draft = store.draftReport

      expect(draft?.submitted_at).toBeUndefined()
      expect(draft?.approved_at).toBeUndefined()
      expect(draft?.approved_by).toBeUndefined()
    })
  })

  describe('initializeFromExistingReport', () => {
    it('should load existing report for editing', () => {
      const existingReport: DraftReport = {
        id: 'report-123',
        project_id: 'project-456',
        report_date: '2024-01-15',
        work_performed: 'Installed drywall',
        status: 'submitted',
      }

      const store = useOfflineReportStore.getState()
      store.initializeFromExistingReport(existingReport, {}, '2024-01-15T12:00:00Z')

      expect(store.draftReport?.id).toBe('report-123')
      expect(store.draftReport?.work_performed).toBe('Installed drywall')
    })

    it('should add to sync queue with server timestamp', () => {
      const existingReport: DraftReport = {
        id: 'report-123',
        project_id: 'project-456',
        report_date: '2024-01-15',
      }

      const store = useOfflineReportStore.getState()
      store.initializeFromExistingReport(existingReport, {}, '2024-01-15T12:00:00Z')

      expect(store.syncQueue).toHaveLength(1)
      expect(store.syncQueue[0].reportId).toBe('report-123')
      expect(store.syncQueue[0].action).toBe('update')
      expect(store.syncQueue[0].lastKnownUpdatedAt).toBe('2024-01-15T12:00:00Z')
    })

    it('should keep existing IDs for related data', () => {
      const existingReport: DraftReport = {
        id: 'report-123',
        project_id: 'project-456',
        report_date: '2024-01-15',
      }

      const workforce: WorkforceEntry[] = [
        { id: 'w-existing-1', entry_type: 'individual', worker_name: 'John', trade: 'Carpenter' },
      ]

      const store = useOfflineReportStore.getState()
      store.initializeFromExistingReport(existingReport, { workforce })

      expect(store.workforce[0].id).toBe('w-existing-1')
    })
  })

  // =============================================
  // DRAFT UPDATES
  // =============================================

  describe('updateDraft', () => {
    it('should update draft fields', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.updateDraft({
        weather_condition: 'cloudy',
        temperature_high: 68,
        work_performed: 'Framing work',
      })

      expect(store.draftReport?.weather_condition).toBe('cloudy')
      expect(store.draftReport?.temperature_high).toBe(68)
      expect(store.draftReport?.work_performed).toBe('Framing work')
    })

    it('should handle null draft gracefully', () => {
      const store = useOfflineReportStore.getState()
      store.clearDraft()

      store.updateDraft({ weather_condition: 'sunny' })

      expect(store.draftReport).toBeNull()
    })
  })

  // =============================================
  // WORKFORCE MANAGEMENT
  // =============================================

  describe('Workforce Entries', () => {
    it('should add workforce entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Framing Crew',
        worker_count: 5,
        trade: 'Framing',
      })

      expect(store.workforce).toHaveLength(1)
      expect(store.workforce[0].team_name).toBe('Framing Crew')
    })

    it('should update total workers when adding team entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Team A',
        worker_count: 5,
        trade: 'Framing',
      })

      expect(store.draftReport?.total_workers).toBe(5)
    })

    it('should update total workers when adding individual entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addWorkforceEntry({
        id: 'w1',
        entry_type: 'individual',
        worker_name: 'John Doe',
        trade: 'Electrician',
      })

      expect(store.draftReport?.total_workers).toBe(1)
    })

    it('should update workforce entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Team A',
        worker_count: 5,
        trade: 'Framing',
      })

      store.updateWorkforceEntry('w1', { worker_count: 8 })

      expect(store.workforce[0].worker_count).toBe(8)
      expect(store.draftReport?.total_workers).toBe(8)
    })

    it('should remove workforce entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Team A',
        worker_count: 5,
        trade: 'Framing',
      })

      store.removeWorkforceEntry('w1')

      expect(store.workforce).toHaveLength(0)
      expect(store.draftReport?.total_workers).toBe(0)
    })

    it('should calculate total workers correctly with mixed entries', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Team A',
        worker_count: 5,
        trade: 'Framing',
      })

      store.addWorkforceEntry({
        id: 'w2',
        entry_type: 'individual',
        worker_name: 'John',
        trade: 'Electrician',
      })

      store.addWorkforceEntry({
        id: 'w3',
        entry_type: 'team',
        team_name: 'Team B',
        worker_count: 3,
        trade: 'Plumbing',
      })

      expect(store.draftReport?.total_workers).toBe(9) // 5 + 1 + 3
    })
  })

  // =============================================
  // EQUIPMENT MANAGEMENT
  // =============================================

  describe('Equipment Entries', () => {
    it('should add equipment entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addEquipmentEntry({
        id: 'e1',
        equipment_type: 'Excavator',
        quantity: 2,
        owner: 'ABC Rentals',
        hours_used: 8,
      })

      expect(store.equipment).toHaveLength(1)
      expect(store.equipment[0].equipment_type).toBe('Excavator')
    })

    it('should update equipment entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addEquipmentEntry({
        id: 'e1',
        equipment_type: 'Crane',
        quantity: 1,
      })

      store.updateEquipmentEntry('e1', { hours_used: 10 })

      expect(store.equipment[0].hours_used).toBe(10)
    })

    it('should remove equipment entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addEquipmentEntry({ id: 'e1', equipment_type: 'Crane', quantity: 1 })
      store.removeEquipmentEntry('e1')

      expect(store.equipment).toHaveLength(0)
    })
  })

  // =============================================
  // DELIVERIES MANAGEMENT
  // =============================================

  describe('Delivery Entries', () => {
    it('should add delivery entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addDeliveryEntry({
        id: 'd1',
        material_description: 'Concrete',
        quantity: '20 yards',
        vendor: 'ABC Supply',
      })

      expect(store.deliveries).toHaveLength(1)
      expect(store.deliveries[0].material_description).toBe('Concrete')
    })

    it('should update delivery entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addDeliveryEntry({
        id: 'd1',
        material_description: 'Lumber',
        quantity: '100 boards',
      })

      store.updateDeliveryEntry('d1', { delivery_ticket_number: 'TKT-12345' })

      expect(store.deliveries[0].delivery_ticket_number).toBe('TKT-12345')
    })

    it('should remove delivery entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addDeliveryEntry({ id: 'd1', material_description: 'Steel', quantity: '10 tons' })
      store.removeDeliveryEntry('d1')

      expect(store.deliveries).toHaveLength(0)
    })
  })

  // =============================================
  // VISITORS MANAGEMENT
  // =============================================

  describe('Visitor Entries', () => {
    it('should add visitor entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addVisitorEntry({
        id: 'v1',
        visitor_name: 'John Smith',
        company: 'ABC Corp',
        purpose: 'Site inspection',
      })

      expect(store.visitors).toHaveLength(1)
      expect(store.visitors[0].visitor_name).toBe('John Smith')
    })

    it('should update visitor entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addVisitorEntry({
        id: 'v1',
        visitor_name: 'Jane Doe',
        company: 'XYZ Inc',
      })

      store.updateVisitorEntry('v1', { departure_time: '14:30' })

      expect(store.visitors[0].departure_time).toBe('14:30')
    })

    it('should remove visitor entry', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addVisitorEntry({ id: 'v1', visitor_name: 'Bob Johnson' })
      store.removeVisitorEntry('v1')

      expect(store.visitors).toHaveLength(0)
    })
  })

  // =============================================
  // PHOTOS MANAGEMENT
  // =============================================

  describe('Photos', () => {
    it('should add photo', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addPhoto({
        id: 'photo-1',
        url: 'blob:http://localhost/photo1',
        caption: 'Foundation work',
      } as any)

      expect(store.photos).toHaveLength(1)
      expect(store.photos[0].caption).toBe('Foundation work')
    })

    it('should update photo', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addPhoto({ id: 'photo-1', url: 'blob:http://localhost/photo1' } as any)
      store.updatePhoto('photo-1', { caption: 'Updated caption' })

      expect(store.photos[0].caption).toBe('Updated caption')
    })

    it('should update photo caption', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addPhoto({ id: 'photo-1', url: 'blob:http://localhost/photo1' } as any)
      store.updatePhotoCaption('photo-1', 'New caption')

      expect(store.photos[0].caption).toBe('New caption')
    })

    it('should remove photo', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')

      store.addPhoto({ id: 'photo-1', url: 'blob:http://localhost/photo1' } as any)
      store.removePhoto('photo-1')

      expect(store.photos).toHaveLength(0)
    })
  })

  // =============================================
  // SYNC STATUS
  // =============================================

  describe('Sync Status', () => {
    it('should set sync status', () => {
      const store = useOfflineReportStore.getState()
      store.setSyncStatus('syncing')

      expect(store.syncStatus).toBe('syncing')
      expect(store.syncError).toBeNull()
    })

    it('should set sync status with error', () => {
      const store = useOfflineReportStore.getState()
      store.setSyncStatus('error', 'Network timeout')

      expect(store.syncStatus).toBe('error')
      expect(store.syncError).toBe('Network timeout')
    })

    it('should set online status', () => {
      const store = useOfflineReportStore.getState()
      store.setOnlineStatus(false)

      expect(store.isOnline).toBe(false)
    })
  })

  // =============================================
  // SYNC QUEUE
  // =============================================

  describe('Sync Queue', () => {
    it('should add item to sync queue', () => {
      const store = useOfflineReportStore.getState()
      store.addToSyncQueue({
        id: 'sync-1',
        reportId: 'report-123',
        action: 'create',
      })

      expect(store.syncQueue).toHaveLength(1)
      expect(store.syncQueue[0].reportId).toBe('report-123')
      expect(store.syncQueue[0].retries).toBe(0)
    })

    it('should remove item from sync queue', () => {
      const store = useOfflineReportStore.getState()
      store.addToSyncQueue({
        id: 'sync-1',
        reportId: 'report-123',
        action: 'create',
      })

      store.removeFromSyncQueue('sync-1')

      expect(store.syncQueue).toHaveLength(0)
    })

    it('should update sync queue item', () => {
      const store = useOfflineReportStore.getState()
      store.addToSyncQueue({
        id: 'sync-1',
        reportId: 'report-123',
        action: 'create',
      })

      store.updateSyncQueueItem('sync-1', { retries: 3, lastError: 'Network error' })

      expect(store.syncQueue[0].retries).toBe(3)
      expect(store.syncQueue[0].lastError).toBe('Network error')
    })
  })

  // =============================================
  // CONFLICT RESOLUTION
  // =============================================

  describe('Conflict Resolution', () => {
    it('should set conflict', () => {
      const store = useOfflineReportStore.getState()
      const conflict = {
        reportId: 'report-123',
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2024-01-15T14:00:00Z',
        serverData: { work_performed: 'Server version' },
      }

      store.setConflict(conflict)

      expect(store.conflict).toEqual(conflict)
      expect(store.syncStatus).toBe('conflict')
    })

    it('should clear conflict when set to null', () => {
      const store = useOfflineReportStore.getState()
      store.setConflict({
        reportId: 'report-123',
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2024-01-15T14:00:00Z',
        serverData: {},
      })

      store.setConflict(null)

      expect(store.conflict).toBeNull()
      expect(store.syncStatus).toBe('idle')
    })

    it('should resolve conflict with keep_local strategy', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')
      store.updateDraft({ work_performed: 'Local version' })

      store.setConflict({
        reportId: store.draftReport!.id,
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2024-01-15T14:00:00Z',
        serverData: { work_performed: 'Server version' },
      })

      store.resolveConflict('keep_local')

      expect(store.conflict).toBeNull()
      expect(store.draftReport?.work_performed).toBe('Local version')
      expect(store.syncStatus).toBe('idle')
    })

    it('should resolve conflict with keep_server strategy', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')
      store.updateDraft({ work_performed: 'Local version' })

      const reportId = store.draftReport!.id

      store.setConflict({
        reportId,
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2024-01-15T14:00:00Z',
        serverData: {
          id: reportId,
          project_id: 'project-123',
          report_date: '2024-01-15',
          work_performed: 'Server version',
        },
      })

      store.resolveConflict('keep_server')

      expect(store.conflict).toBeNull()
      expect(store.draftReport?.work_performed).toBe('Server version')
      expect(store.syncQueue.some(item => item.reportId === reportId)).toBe(false)
    })

    it('should resolve conflict with merge strategy', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')
      store.updateDraft({
        work_performed: 'Local work',
        weather_condition: 'sunny',
      })

      store.setConflict({
        reportId: store.draftReport!.id,
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2024-01-15T14:00:00Z',
        serverData: {
          work_performed: 'Server work',
          weather_condition: 'cloudy',
          temperature_high: 75, // Only on server
        },
      })

      store.resolveConflict('merge')

      expect(store.conflict).toBeNull()
      // Local values take precedence for non-null fields
      expect(store.draftReport?.work_performed).toBe('Local work')
      expect(store.draftReport?.weather_condition).toBe('sunny')
      // Server value used for field not in local
      expect(store.draftReport?.temperature_high).toBe(75)
    })
  })

  // =============================================
  // CLEAR DRAFT
  // =============================================

  describe('clearDraft', () => {
    it('should clear all data', () => {
      const store = useOfflineReportStore.getState()
      store.initializeDraft('project-123', '2024-01-15')
      store.addWorkforceEntry({
        id: 'w1',
        entry_type: 'individual',
        worker_name: 'John',
        trade: 'Carpenter',
      })
      store.addEquipmentEntry({ id: 'e1', equipment_type: 'Crane', quantity: 1 })
      store.setSyncStatus('syncing')

      store.clearDraft()

      expect(store.draftReport).toBeNull()
      expect(store.workforce).toHaveLength(0)
      expect(store.equipment).toHaveLength(0)
      expect(store.deliveries).toHaveLength(0)
      expect(store.visitors).toHaveLength(0)
      expect(store.photos).toHaveLength(0)
      expect(store.syncQueue).toHaveLength(0)
      expect(store.syncStatus).toBe('idle')
      expect(store.syncError).toBeNull()
      expect(store.conflict).toBeNull()
    })
  })
})
