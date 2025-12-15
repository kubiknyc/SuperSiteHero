/**
 * Comprehensive tests for Offline Daily Reports Store
 * Tests local caching, sync queue, and conflict resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Unmock the store so we can test the real implementation
vi.unmock('@/features/daily-reports/store/offlineReportStore')

// Must import after unmocking
import { useOfflineReportStore } from './offlineReportStore'
import type { DraftReport, WorkforceEntry, EquipmentEntry, DeliveryEntry, VisitorEntry } from './offlineReportStore'

// Helper to get fresh state after an action
const getState = () => useOfflineReportStore.getState()

describe('Offline Report Store', () => {
  beforeEach(() => {
    // Reset store before each test
    getState().clearDraft()
  })

  // =============================================
  // DRAFT INITIALIZATION
  // =============================================

  describe('initializeDraft', () => {
    it('should initialize a new draft report', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      const draft = getState().draftReport

      expect(draft).toBeDefined()
      expect(draft?.project_id).toBe('project-123')
      expect(draft?.report_date).toBe('2024-01-15')
      expect(draft?.status).toBe('draft')
      expect(draft?.id).toBeTruthy()
    })

    it('should clear previous data when initializing new draft', () => {
      // Set up some existing data
      getState().initializeDraft('project-1', '2024-01-01')
      getState().addWorkforceEntry({
        id: 'w1',
        entry_type: 'individual',
        worker_name: 'John',
        trade: 'Carpenter',
      })

      // Initialize new draft
      getState().initializeDraft('project-2', '2024-01-02')

      expect(getState().workforce).toHaveLength(0)
      expect(getState().draftReport?.project_id).toBe('project-2')
    })
  })

  describe('initializeFromPreviousReport', () => {
    it('should copy data from previous report', () => {
      const previousReport: Partial<DraftReport> = {
        weather_condition: 'sunny',
        temperature_high: 75,
        temperature_low: 55,
      }

      getState().initializeFromPreviousReport('project-123', '2024-01-16', previousReport)

      const draft = getState().draftReport

      expect(draft?.weather_condition).toBe('sunny')
      expect(draft?.temperature_high).toBe(75)
      expect(draft?.project_id).toBe('project-123')
      expect(draft?.report_date).toBe('2024-01-16')
    })

    it('should copy workforce with new IDs', () => {
      const previousWorkforce: WorkforceEntry[] = [
        { id: 'old-1', entry_type: 'team', team_name: 'Team A', worker_count: 5, trade: 'Framing' },
      ]

      getState().initializeFromPreviousReport(
        'project-123',
        '2024-01-16',
        {},
        { workforce: previousWorkforce }
      )

      expect(getState().workforce).toHaveLength(1)
      expect(getState().workforce[0].id).not.toBe('old-1') // New ID
      expect(getState().workforce[0].team_name).toBe('Team A')
    })

    it('should clear submission/approval fields', () => {
      const previousReport: Partial<DraftReport> = {
        submitted_at: '2024-01-15T10:00:00Z',
        approved_at: '2024-01-15T12:00:00Z',
        approved_by: 'user-123',
      }

      getState().initializeFromPreviousReport('project-123', '2024-01-16', previousReport)

      const draft = getState().draftReport

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

      getState().initializeFromExistingReport(existingReport, {}, '2024-01-15T12:00:00Z')

      expect(getState().draftReport?.id).toBe('report-123')
      expect(getState().draftReport?.work_performed).toBe('Installed drywall')
    })

    it('should add to sync queue with server timestamp', () => {
      const existingReport: DraftReport = {
        id: 'report-123',
        project_id: 'project-456',
        report_date: '2024-01-15',
      }

      getState().initializeFromExistingReport(existingReport, {}, '2024-01-15T12:00:00Z')

      expect(getState().syncQueue).toHaveLength(1)
      expect(getState().syncQueue[0].reportId).toBe('report-123')
      expect(getState().syncQueue[0].action).toBe('update')
      expect(getState().syncQueue[0].lastKnownUpdatedAt).toBe('2024-01-15T12:00:00Z')
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

      getState().initializeFromExistingReport(existingReport, { workforce })

      expect(getState().workforce[0].id).toBe('w-existing-1')
    })
  })

  // =============================================
  // DRAFT UPDATES
  // =============================================

  describe('updateDraft', () => {
    it('should update draft fields', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().updateDraft({
        weather_condition: 'cloudy',
        temperature_high: 68,
        work_performed: 'Framing work',
      })

      expect(getState().draftReport?.weather_condition).toBe('cloudy')
      expect(getState().draftReport?.temperature_high).toBe(68)
      expect(getState().draftReport?.work_performed).toBe('Framing work')
    })

    it('should handle null draft gracefully', () => {
      getState().clearDraft()

      getState().updateDraft({ weather_condition: 'sunny' })

      expect(getState().draftReport).toBeNull()
    })
  })

  // =============================================
  // WORKFORCE MANAGEMENT
  // =============================================

  describe('Workforce Entries', () => {
    it('should add workforce entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Framing Crew',
        worker_count: 5,
        trade: 'Framing',
      })

      expect(getState().workforce).toHaveLength(1)
      expect(getState().workforce[0].team_name).toBe('Framing Crew')
    })

    it('should update total workers when adding team entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Team A',
        worker_count: 5,
        trade: 'Framing',
      })

      expect(getState().draftReport?.total_workers).toBe(5)
    })

    it('should update total workers when adding individual entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addWorkforceEntry({
        id: 'w1',
        entry_type: 'individual',
        worker_name: 'John Doe',
        trade: 'Electrician',
      })

      expect(getState().draftReport?.total_workers).toBe(1)
    })

    it('should update workforce entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Team A',
        worker_count: 5,
        trade: 'Framing',
      })

      getState().updateWorkforceEntry('w1', { worker_count: 8 })

      expect(getState().workforce[0].worker_count).toBe(8)
      expect(getState().draftReport?.total_workers).toBe(8)
    })

    it('should remove workforce entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Team A',
        worker_count: 5,
        trade: 'Framing',
      })

      getState().removeWorkforceEntry('w1')

      expect(getState().workforce).toHaveLength(0)
      expect(getState().draftReport?.total_workers).toBe(0)
    })

    it('should calculate total workers correctly with mixed entries', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addWorkforceEntry({
        id: 'w1',
        entry_type: 'team',
        team_name: 'Team A',
        worker_count: 5,
        trade: 'Framing',
      })

      getState().addWorkforceEntry({
        id: 'w2',
        entry_type: 'individual',
        worker_name: 'John',
        trade: 'Electrician',
      })

      getState().addWorkforceEntry({
        id: 'w3',
        entry_type: 'team',
        team_name: 'Team B',
        worker_count: 3,
        trade: 'Plumbing',
      })

      expect(getState().draftReport?.total_workers).toBe(9) // 5 + 1 + 3
    })
  })

  // =============================================
  // EQUIPMENT MANAGEMENT
  // =============================================

  describe('Equipment Entries', () => {
    it('should add equipment entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addEquipmentEntry({
        id: 'e1',
        equipment_type: 'Excavator',
        quantity: 2,
        owner: 'ABC Rentals',
        hours_used: 8,
      })

      expect(getState().equipment).toHaveLength(1)
      expect(getState().equipment[0].equipment_type).toBe('Excavator')
    })

    it('should update equipment entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addEquipmentEntry({
        id: 'e1',
        equipment_type: 'Crane',
        quantity: 1,
      })

      getState().updateEquipmentEntry('e1', { hours_used: 10 })

      expect(getState().equipment[0].hours_used).toBe(10)
    })

    it('should remove equipment entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addEquipmentEntry({ id: 'e1', equipment_type: 'Crane', quantity: 1 })
      getState().removeEquipmentEntry('e1')

      expect(getState().equipment).toHaveLength(0)
    })
  })

  // =============================================
  // DELIVERIES MANAGEMENT
  // =============================================

  describe('Delivery Entries', () => {
    it('should add delivery entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addDeliveryEntry({
        id: 'd1',
        material_description: 'Concrete',
        quantity: '20 yards',
        vendor: 'ABC Supply',
      })

      expect(getState().deliveries).toHaveLength(1)
      expect(getState().deliveries[0].material_description).toBe('Concrete')
    })

    it('should update delivery entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addDeliveryEntry({
        id: 'd1',
        material_description: 'Lumber',
        quantity: '100 boards',
      })

      getState().updateDeliveryEntry('d1', { delivery_ticket_number: 'TKT-12345' })

      expect(getState().deliveries[0].delivery_ticket_number).toBe('TKT-12345')
    })

    it('should remove delivery entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addDeliveryEntry({ id: 'd1', material_description: 'Steel', quantity: '10 tons' })
      getState().removeDeliveryEntry('d1')

      expect(getState().deliveries).toHaveLength(0)
    })
  })

  // =============================================
  // VISITORS MANAGEMENT
  // =============================================

  describe('Visitor Entries', () => {
    it('should add visitor entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addVisitorEntry({
        id: 'v1',
        visitor_name: 'John Smith',
        company: 'ABC Corp',
        purpose: 'Site inspection',
      })

      expect(getState().visitors).toHaveLength(1)
      expect(getState().visitors[0].visitor_name).toBe('John Smith')
    })

    it('should update visitor entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addVisitorEntry({
        id: 'v1',
        visitor_name: 'Jane Doe',
        company: 'XYZ Inc',
      })

      getState().updateVisitorEntry('v1', { departure_time: '14:30' })

      expect(getState().visitors[0].departure_time).toBe('14:30')
    })

    it('should remove visitor entry', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addVisitorEntry({ id: 'v1', visitor_name: 'Bob Johnson' })
      getState().removeVisitorEntry('v1')

      expect(getState().visitors).toHaveLength(0)
    })
  })

  // =============================================
  // PHOTOS MANAGEMENT
  // =============================================

  describe('Photos', () => {
    it('should add photo', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addPhoto({
        id: 'photo-1',
        url: 'blob:http://localhost/photo1',
        caption: 'Foundation work',
      } as any)

      expect(getState().photos).toHaveLength(1)
      expect(getState().photos[0].caption).toBe('Foundation work')
    })

    it('should update photo', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addPhoto({ id: 'photo-1', url: 'blob:http://localhost/photo1' } as any)
      getState().updatePhoto('photo-1', { caption: 'Updated caption' })

      expect(getState().photos[0].caption).toBe('Updated caption')
    })

    it('should update photo caption', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addPhoto({ id: 'photo-1', url: 'blob:http://localhost/photo1' } as any)
      getState().updatePhotoCaption('photo-1', 'New caption')

      expect(getState().photos[0].caption).toBe('New caption')
    })

    it('should remove photo', () => {
      getState().initializeDraft('project-123', '2024-01-15')

      getState().addPhoto({ id: 'photo-1', url: 'blob:http://localhost/photo1' } as any)
      getState().removePhoto('photo-1')

      expect(getState().photos).toHaveLength(0)
    })
  })

  // =============================================
  // SYNC STATUS
  // =============================================

  describe('Sync Status', () => {
    it('should set sync status', () => {
      getState().setSyncStatus('syncing')

      expect(getState().syncStatus).toBe('syncing')
      expect(getState().syncError).toBeNull()
    })

    it('should set sync status with error', () => {
      getState().setSyncStatus('error', 'Network timeout')

      expect(getState().syncStatus).toBe('error')
      expect(getState().syncError).toBe('Network timeout')
    })

    it('should set online status', () => {
      getState().setOnlineStatus(false)

      expect(getState().isOnline).toBe(false)
    })
  })

  // =============================================
  // SYNC QUEUE
  // =============================================

  describe('Sync Queue', () => {
    it('should add item to sync queue', () => {
      getState().addToSyncQueue({
        id: 'sync-1',
        reportId: 'report-123',
        action: 'create',
      })

      expect(getState().syncQueue).toHaveLength(1)
      expect(getState().syncQueue[0].reportId).toBe('report-123')
      expect(getState().syncQueue[0].retries).toBe(0)
    })

    it('should remove item from sync queue', () => {
      getState().addToSyncQueue({
        id: 'sync-1',
        reportId: 'report-123',
        action: 'create',
      })

      getState().removeFromSyncQueue('sync-1')

      expect(getState().syncQueue).toHaveLength(0)
    })

    it('should update sync queue item', () => {
      getState().addToSyncQueue({
        id: 'sync-1',
        reportId: 'report-123',
        action: 'create',
      })

      getState().updateSyncQueueItem('sync-1', { retries: 3, lastError: 'Network error' })

      expect(getState().syncQueue[0].retries).toBe(3)
      expect(getState().syncQueue[0].lastError).toBe('Network error')
    })
  })

  // =============================================
  // CONFLICT RESOLUTION
  // =============================================

  describe('Conflict Resolution', () => {
    it('should set conflict', () => {
      const conflict = {
        reportId: 'report-123',
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2024-01-15T14:00:00Z',
        serverData: { work_performed: 'Server version' },
      }

      getState().setConflict(conflict)

      expect(getState().conflict).toEqual(conflict)
      expect(getState().syncStatus).toBe('conflict')
    })

    it('should clear conflict when set to null', () => {
      getState().setConflict({
        reportId: 'report-123',
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2024-01-15T14:00:00Z',
        serverData: {},
      })

      getState().setConflict(null)

      expect(getState().conflict).toBeNull()
      expect(getState().syncStatus).toBe('idle')
    })

    it('should resolve conflict with keep_local strategy', () => {
      getState().initializeDraft('project-123', '2024-01-15')
      getState().updateDraft({ work_performed: 'Local version' })

      getState().setConflict({
        reportId: getState().draftReport!.id,
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2024-01-15T14:00:00Z',
        serverData: { work_performed: 'Server version' },
      })

      getState().resolveConflict('keep_local')

      expect(getState().conflict).toBeNull()
      expect(getState().draftReport?.work_performed).toBe('Local version')
      expect(getState().syncStatus).toBe('idle')
    })

    it('should resolve conflict with keep_server strategy', () => {
      getState().initializeDraft('project-123', '2024-01-15')
      getState().updateDraft({ work_performed: 'Local version' })

      const reportId = getState().draftReport!.id

      getState().setConflict({
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

      getState().resolveConflict('keep_server')

      expect(getState().conflict).toBeNull()
      expect(getState().draftReport?.work_performed).toBe('Server version')
      expect(getState().syncQueue.some(item => item.reportId === reportId)).toBe(false)
    })

    it('should resolve conflict with merge strategy', () => {
      getState().initializeDraft('project-123', '2024-01-15')
      getState().updateDraft({
        work_performed: 'Local work',
        weather_condition: 'sunny',
      })

      getState().setConflict({
        reportId: getState().draftReport!.id,
        localUpdatedAt: Date.now(),
        serverUpdatedAt: '2024-01-15T14:00:00Z',
        serverData: {
          work_performed: 'Server work',
          weather_condition: 'cloudy',
          temperature_high: 75, // Only on server
        },
      })

      getState().resolveConflict('merge')

      expect(getState().conflict).toBeNull()
      // Local values take precedence for non-null fields
      expect(getState().draftReport?.work_performed).toBe('Local work')
      expect(getState().draftReport?.weather_condition).toBe('sunny')
      // Server value used for field not in local
      expect(getState().draftReport?.temperature_high).toBe(75)
    })
  })

  // =============================================
  // CLEAR DRAFT
  // =============================================

  describe('clearDraft', () => {
    it('should clear all data', () => {
      getState().initializeDraft('project-123', '2024-01-15')
      getState().addWorkforceEntry({
        id: 'w1',
        entry_type: 'individual',
        worker_name: 'John',
        trade: 'Carpenter',
      })
      getState().addEquipmentEntry({ id: 'e1', equipment_type: 'Crane', quantity: 1 })
      getState().setSyncStatus('syncing')

      getState().clearDraft()

      expect(getState().draftReport).toBeNull()
      expect(getState().workforce).toHaveLength(0)
      expect(getState().equipment).toHaveLength(0)
      expect(getState().deliveries).toHaveLength(0)
      expect(getState().visitors).toHaveLength(0)
      expect(getState().photos).toHaveLength(0)
      expect(getState().syncQueue).toHaveLength(0)
      expect(getState().syncStatus).toBe('idle')
      expect(getState().syncError).toBeNull()
      expect(getState().conflict).toBeNull()
    })
  })
})
