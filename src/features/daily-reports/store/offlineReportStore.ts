// Offline store for daily reports with local caching and sync queue
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DailyReport } from '@/types/database'
import type { DailyReportPhoto } from '../types/photo'

export interface DraftReport extends Partial<DailyReport> {
  id: string
  project_id: string
  report_date: string
  // Fields from DailyReport that are explicitly used in forms
  report_number?: string
  status?: string
  // Weather fields
  weather_condition?: string
  temperature_high?: number
  temperature_low?: number
  precipitation?: number
  wind_speed?: number
  wind_conditions?: string
  weather_delays?: boolean
  weather_delay_notes?: string
  weather_notes?: string // Alias for weather_delay_notes (used in WeatherSection)
  // Work fields
  work_performed?: string
  work_completed?: string
  work_planned?: string
  // Issues and observations fields
  issues?: string
  observations?: string
  comments?: string
  safety_incidents?: string
  quality_issues?: string
  schedule_delays?: string
  general_notes?: string
  // Signature fields
  submitted_by_signature?: string // Base64 data URL
  approved_by_signature?: string // Base64 data URL
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
  lastKnownUpdatedAt?: string // Server timestamp when data was last fetched
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

export interface ConflictInfo {
  reportId: string
  localUpdatedAt: number
  serverUpdatedAt: string
  serverData: Partial<DraftReport>
}

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

  // Conflict detection
  conflict: ConflictInfo | null

  // Queue
  syncQueue: SyncQueueItem[]

  // Actions
  initializeDraft: (projectId: string, reportDate: string) => void
  initializeFromPreviousReport: (
    projectId: string,
    reportDate: string,
    previousReport: Record<string, unknown>,
    relatedData?: {
      workforce?: WorkforceEntry[]
      equipment?: EquipmentEntry[]
      deliveries?: DeliveryEntry[]
      visitors?: VisitorEntry[]
    }
  ) => void
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

  // Conflict resolution
  setConflict: (conflict: ConflictInfo | null) => void
  resolveConflict: (strategy: 'keep_local' | 'keep_server' | 'merge') => void

  // Initialize for editing existing report (tracks server timestamp)
  initializeFromExistingReport: (
    report: DraftReport,
    relatedData?: {
      workforce?: WorkforceEntry[]
      equipment?: EquipmentEntry[]
      deliveries?: DeliveryEntry[]
      visitors?: VisitorEntry[]
    },
    serverUpdatedAt?: string
  ) => void

  // Clear
  clearDraft: () => void
}

const generateId = () => crypto.randomUUID()

// Helper to calculate total workers from workforce entries
const calculateTotalWorkers = (workforce: WorkforceEntry[]): number => {
  return workforce.reduce((total, entry) => {
    if (entry.entry_type === 'team' && entry.worker_count) {
      return total + entry.worker_count
    } else if (entry.entry_type === 'individual') {
      return total + 1
    }
    return total
  }, 0)
}

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
      conflict: null as ConflictInfo | null,
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

      initializeFromPreviousReport: (
        projectId: string,
        reportDate: string,
        previousReport: Record<string, unknown>,
        relatedData?: {
          workforce?: WorkforceEntry[]
          equipment?: EquipmentEntry[]
          deliveries?: DeliveryEntry[]
          visitors?: VisitorEntry[]
        }
      ) => {
        // Copy relevant fields from previous report, but create new ID and date
        // Also copy related data (workforce, equipment, etc.) with new IDs
        const copyWithNewIds = <T extends { id: string }>(items: T[] = []): T[] =>
          items.map((item) => ({ ...item, id: generateId() }))

        set({
          draftReport: {
            ...previousReport,
            id: generateId(),
            project_id: projectId,
            report_date: reportDate,
            status: 'draft',
            // Clear submission/approval fields
            submitted_at: undefined,
            approved_at: undefined,
            approved_by: undefined,
          },
          // Copy related data with new IDs if provided, otherwise start fresh
          workforce: copyWithNewIds(relatedData?.workforce),
          equipment: copyWithNewIds(relatedData?.equipment),
          deliveries: copyWithNewIds(relatedData?.deliveries),
          visitors: copyWithNewIds(relatedData?.visitors),
          photos: [],
        })
      },

      updateDraft: (updates) => {
        set((state) => ({
          draftReport: state.draftReport ? { ...state.draftReport, ...updates } : null,
        }))
      },

      addWorkforceEntry: (entry) => {
        set((state) => {
          const newWorkforce = [...state.workforce, { ...entry, id: entry.id || generateId() }]
          const totalWorkers = calculateTotalWorkers(newWorkforce)
          return {
            workforce: newWorkforce,
            draftReport: state.draftReport
              ? { ...state.draftReport, total_workers: totalWorkers }
              : null,
          }
        })
      },

      updateWorkforceEntry: (id, updates) => {
        set((state) => {
          const newWorkforce = state.workforce.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          )
          const totalWorkers = calculateTotalWorkers(newWorkforce)
          return {
            workforce: newWorkforce,
            draftReport: state.draftReport
              ? { ...state.draftReport, total_workers: totalWorkers }
              : null,
          }
        })
      },

      removeWorkforceEntry: (id) => {
        set((state) => {
          const newWorkforce = state.workforce.filter((e) => e.id !== id)
          const totalWorkers = calculateTotalWorkers(newWorkforce)
          return {
            workforce: newWorkforce,
            draftReport: state.draftReport
              ? { ...state.draftReport, total_workers: totalWorkers }
              : null,
          }
        })
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

      setConflict: (conflict) => {
        set({ conflict, syncStatus: conflict ? 'conflict' : 'idle' })
      },

      resolveConflict: (strategy) => {
        set((state) => {
          if (!state.conflict) {return state}

          switch (strategy) {
            case 'keep_local':
              // Keep local changes, force push to server
              // The sync will proceed with local data
              return {
                conflict: null,
                syncStatus: 'idle',
              }
            case 'keep_server':
              // Discard local changes, use server data
              return {
                draftReport: state.conflict.serverData as DraftReport,
                conflict: null,
                syncStatus: 'idle',
                syncQueue: state.syncQueue.filter(
                  (item) => item.reportId !== state.conflict?.reportId
                ),
              }
            case 'merge': {
              // Merge: local values take precedence for non-null fields
              // Server values used for fields that are null/undefined locally
              const merged = { ...state.conflict.serverData }
              if (state.draftReport) {
                Object.keys(state.draftReport).forEach((key) => {
                  const localValue = state.draftReport?.[key as keyof DraftReport]
                  if (localValue !== null && localValue !== undefined) {
                    (merged as Record<string, unknown>)[key] = localValue
                  }
                })
              }
              return {
                draftReport: merged as DraftReport,
                conflict: null,
                syncStatus: 'idle',
              }
            }
            default:
              return state
          }
        })
      },

      initializeFromExistingReport: (report, relatedData, serverUpdatedAt) => {
        // For editing existing reports - tracks server timestamp for conflict detection
        const copyWithNewIds = <T extends { id: string }>(items: T[] = []): T[] =>
          items.map((item) => ({ ...item })) // Keep existing IDs for updates

        set((state) => ({
          draftReport: {
            ...report,
          },
          workforce: copyWithNewIds(relatedData?.workforce),
          equipment: copyWithNewIds(relatedData?.equipment),
          deliveries: copyWithNewIds(relatedData?.deliveries),
          visitors: copyWithNewIds(relatedData?.visitors),
          photos: [],
          // Add to sync queue with server timestamp for conflict detection
          syncQueue: [
            ...state.syncQueue.filter((item) => item.reportId !== report.id),
            {
              id: generateId(),
              reportId: report.id,
              action: 'update',
              timestamp: Date.now(),
              retries: 0,
              lastKnownUpdatedAt: serverUpdatedAt,
            },
          ],
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
          conflict: null,
        })
      },
    }),
    {
      name: 'offline-report-store',
      version: 1,
    },
  ),
)
