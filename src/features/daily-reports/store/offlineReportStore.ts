// Offline store for daily reports with local caching and sync queue
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DailyReport } from '@/types/database'
import type { DailyReportPhoto } from '../types/photo'

export interface DraftReport extends Partial<DailyReport> {
  id: string
  project_id: string
  report_date: string
  // Extended fields for form sections (stored locally, combined when saving)
  work_performed?: string
  work_planned?: string
  weather_condition?: string
  wind_conditions?: string
  weather_notes?: string
  safety_incidents?: string
  quality_issues?: string
  schedule_delays?: string
  general_notes?: string
}

export interface WorkforceEntry {
  id: string
  entry_type: 'team' | 'individual'
  team_name?: string
  worker_name?: string
  trade?: string
  worker_count?: number
  activity?: string
  hours_worked?: number
}

export interface EquipmentEntry {
  id: string
  equipment_type: string
  equipment_description?: string
  quantity: number
  owner?: string
  hours_used?: number
  notes?: string
}

export interface DeliveryEntry {
  id: string
  material_description: string
  quantity?: string
  vendor?: string
  delivery_ticket_number?: string
  delivery_time?: string
  notes?: string
}

export interface VisitorEntry {
  id: string
  visitor_name: string
  company?: string
  purpose?: string
  arrival_time?: string
  departure_time?: string
}

export interface SyncQueueItem {
  id: string
  reportId: string
  action: 'create' | 'update'
  timestamp: number
  retries: number
  lastError?: string
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface OfflineReportStore {
  // Draft report
  draftReport: DraftReport | null
  workforce: WorkforceEntry[]
  equipment: EquipmentEntry[]
  deliveries: DeliveryEntry[]
  visitors: VisitorEntry[]
  photos: DailyReportPhoto[]

  // Sync status
  syncStatus: SyncStatus
  syncError: string | null
  isOnline: boolean

  // Queue
  syncQueue: SyncQueueItem[]

  // Actions
  initializeDraft: (projectId: string, reportDate: string) => void
  updateDraft: (updates: Partial<DraftReport>) => void
  addWorkforceEntry: (entry: WorkforceEntry) => void
  updateWorkforceEntry: (id: string, updates: Partial<WorkforceEntry>) => void
  removeWorkforceEntry: (id: string) => void
  addEquipmentEntry: (entry: EquipmentEntry) => void
  updateEquipmentEntry: (id: string, updates: Partial<EquipmentEntry>) => void
  removeEquipmentEntry: (id: string) => void
  addDeliveryEntry: (entry: DeliveryEntry) => void
  updateDeliveryEntry: (id: string, updates: Partial<DeliveryEntry>) => void
  removeDeliveryEntry: (id: string) => void
  addVisitorEntry: (entry: VisitorEntry) => void
  updateVisitorEntry: (id: string, updates: Partial<VisitorEntry>) => void
  removeVisitorEntry: (id: string) => void
  addPhoto: (photo: DailyReportPhoto) => void
  updatePhoto: (id: string, updates: Partial<DailyReportPhoto>) => void
  removePhoto: (id: string) => void
  updatePhotoCaption: (id: string, caption: string) => void

  // Sync actions
  setSyncStatus: (status: SyncStatus, error?: string | null) => void
  setOnlineStatus: (isOnline: boolean) => void
  addToSyncQueue: (item: Omit<SyncQueueItem, 'timestamp' | 'retries' | 'lastError'>) => void
  removeFromSyncQueue: (id: string) => void
  updateSyncQueueItem: (id: string, updates: Partial<SyncQueueItem>) => void

  // Clear
  clearDraft: () => void
}

const generateId = () => crypto.randomUUID()

export const useOfflineReportStore = create<OfflineReportStore>()(
  persist(
    (set) => ({
      draftReport: null as DraftReport | null,
      workforce: [] as WorkforceEntry[],
      equipment: [] as EquipmentEntry[],
      deliveries: [] as DeliveryEntry[],
      visitors: [] as VisitorEntry[],
      photos: [] as DailyReportPhoto[],
      syncStatus: 'idle' as SyncStatus,
      syncError: null as string | null,
      isOnline: navigator.onLine,
      syncQueue: [] as SyncQueueItem[],

      initializeDraft: (projectId: string, reportDate: string) => {
        set({
          draftReport: {
            id: generateId(),
            project_id: projectId,
            report_date: reportDate,
            status: 'draft',
          },
          workforce: [],
          equipment: [],
          deliveries: [],
          visitors: [],
          photos: [],
        })
      },

      updateDraft: (updates) => {
        set((state) => ({
          draftReport: state.draftReport ? { ...state.draftReport, ...updates } : null,
        }))
      },

      addWorkforceEntry: (entry) => {
        set((state) => ({
          workforce: [...state.workforce, { ...entry, id: entry.id || generateId() }],
        }))
      },

      updateWorkforceEntry: (id, updates) => {
        set((state) => ({
          workforce: state.workforce.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }))
      },

      removeWorkforceEntry: (id) => {
        set((state) => ({
          workforce: state.workforce.filter((e) => e.id !== id),
        }))
      },

      addEquipmentEntry: (entry) => {
        set((state) => ({
          equipment: [...state.equipment, { ...entry, id: entry.id || generateId() }],
        }))
      },

      updateEquipmentEntry: (id, updates) => {
        set((state) => ({
          equipment: state.equipment.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }))
      },

      removeEquipmentEntry: (id) => {
        set((state) => ({
          equipment: state.equipment.filter((e) => e.id !== id),
        }))
      },

      addDeliveryEntry: (entry) => {
        set((state) => ({
          deliveries: [...state.deliveries, { ...entry, id: entry.id || generateId() }],
        }))
      },

      updateDeliveryEntry: (id, updates) => {
        set((state) => ({
          deliveries: state.deliveries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }))
      },

      removeDeliveryEntry: (id) => {
        set((state) => ({
          deliveries: state.deliveries.filter((e) => e.id !== id),
        }))
      },

      addVisitorEntry: (entry) => {
        set((state) => ({
          visitors: [...state.visitors, { ...entry, id: entry.id || generateId() }],
        }))
      },

      updateVisitorEntry: (id, updates) => {
        set((state) => ({
          visitors: state.visitors.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        }))
      },

      removeVisitorEntry: (id) => {
        set((state) => ({
          visitors: state.visitors.filter((e) => e.id !== id),
        }))
      },

      addPhoto: (photo) => {
        set((state) => ({
          photos: [...state.photos, photo],
        }))
      },

      updatePhoto: (id, updates) => {
        set((state) => ({
          photos: state.photos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }))
      },

      removePhoto: (id) => {
        set((state) => ({
          photos: state.photos.filter((p) => p.id !== id),
        }))
      },

      updatePhotoCaption: (id, caption) => {
        set((state) => ({
          photos: state.photos.map((p) => (p.id === id ? { ...p, caption } : p)),
        }))
      },

      setSyncStatus: (status, error = null) => {
        set({ syncStatus: status, syncError: error })
      },

      setOnlineStatus: (isOnline) => {
        set({ isOnline })
      },

      addToSyncQueue: (item) => {
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              ...item,
              timestamp: Date.now(),
              retries: 0,
            },
          ],
        }))
      },

      removeFromSyncQueue: (id) => {
        set((state) => ({
          syncQueue: state.syncQueue.filter((item) => item.id !== id),
        }))
      },

      updateSyncQueueItem: (id, updates) => {
        set((state) => ({
          syncQueue: state.syncQueue.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        }))
      },

      clearDraft: () => {
        set({
          draftReport: null,
          workforce: [],
          equipment: [],
          deliveries: [],
          visitors: [],
          photos: [],
          syncQueue: [],
          syncStatus: 'idle',
          syncError: null,
        })
      },
    }),
    {
      name: 'offline-report-store',
      version: 1,
    },
  ),
)
