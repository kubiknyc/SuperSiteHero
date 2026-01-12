// Offline store for safety incidents with local caching and sync queue
// High priority (95) due to regulatory compliance requirements
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Photo attached to an incident (for offline storage)
 */
export interface OfflineIncidentPhoto {
  id: string
  localUrl: string // blob: or data: URL for local display
  file?: File // Original file for upload
  caption?: string
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed'
  serverUrl?: string // URL after successful upload
}

/**
 * Draft incident for offline creation
 */
export interface DraftIncident {
  id: string
  project_id: string
  company_id?: string | null
  // Required fields
  incident_date: string
  incident_type: string
  description: string
  // Optional timing
  incident_time?: string | null
  // Location and people
  location?: string | null
  person_involved?: string | null
  witness_names?: string | null
  company?: string | null
  subcontractor_id?: string | null
  // Severity and injury details
  severity?: string | null
  injury_type?: string | null
  body_part?: string | null
  treatment?: string | null
  serious_incident?: boolean | null
  // Actions taken
  immediate_actions?: string | null
  corrective_actions?: string | null
  // Root cause analysis
  root_cause?: string | null
  root_cause_category?: string | null
  contributing_factors?: string | null
  // Reporting
  reported_by?: string | null
  reported_at?: string | null
  notified_users?: string[] | null
  // OSHA reporting (critical for compliance)
  reported_to_osha?: boolean | null
  osha_report_number?: string | null
  reported_to_owner?: boolean | null
  // Follow-up
  requires_followup?: boolean | null
  followup_notes?: string | null
  // Status
  status?: string | null
  incident_number?: string | null
  // Offline tracking
  offline_photos: OfflineIncidentPhoto[]
  synced: boolean
  sync_error?: string
  created_at: string
}

/**
 * Cached incident from server
 */
export interface CachedIncident {
  id: string
  project_id: string
  company_id?: string | null
  incident_date: string
  incident_type: string
  description: string
  incident_time?: string | null
  location?: string | null
  person_involved?: string | null
  witness_names?: string | null
  company?: string | null
  subcontractor_id?: string | null
  severity?: string | null
  injury_type?: string | null
  body_part?: string | null
  treatment?: string | null
  serious_incident?: boolean | null
  immediate_actions?: string | null
  corrective_actions?: string | null
  root_cause?: string | null
  root_cause_category?: string | null
  contributing_factors?: string | null
  reported_by?: string | null
  reported_at?: string | null
  notified_users?: string[] | null
  reported_to_osha?: boolean | null
  osha_report_number?: string | null
  reported_to_owner?: boolean | null
  requires_followup?: boolean | null
  followup_notes?: string | null
  status?: string | null
  incident_number?: string | null
  created_at?: string | null
  updated_at?: string | null
}

/**
 * Sync queue item for tracking pending operations
 */
export interface IncidentSyncQueueItem {
  id: string
  incidentId: string
  action: 'create' | 'update' | 'delete'
  timestamp: number
  retries: number
  lastError?: string
  lastKnownUpdatedAt?: string
  // Priority flag for critical incidents
  priority: 'high' | 'normal'
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

export interface IncidentConflictInfo {
  incidentId: string
  localUpdatedAt: number
  serverUpdatedAt: string
  serverData: Partial<CachedIncident>
}

interface OfflineSafetyStore {
  // Cached incidents from server
  cachedIncidents: CachedIncident[]
  // Draft incidents created offline
  draftIncidents: DraftIncident[]
  // Sync queue for pending operations
  syncQueue: IncidentSyncQueueItem[]
  // Sync status
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncAt: number | null
  // Conflict state
  conflict: IncidentConflictInfo | null

  // Cache actions
  cacheIncidents: (incidents: CachedIncident[]) => void
  updateCachedIncident: (id: string, updates: Partial<CachedIncident>) => void
  removeCachedIncident: (id: string) => void
  clearCache: () => void

  // Draft actions
  addDraftIncident: (
    incident: Omit<DraftIncident, 'id' | 'created_at' | 'synced' | 'offline_photos'>
  ) => string
  updateDraftIncident: (id: string, updates: Partial<DraftIncident>) => void
  removeDraftIncident: (id: string) => void
  markDraftSynced: (localId: string, serverId?: string) => void

  // Photo actions
  addIncidentPhoto: (incidentId: string, photo: Omit<OfflineIncidentPhoto, 'uploadStatus'>) => void
  updatePhotoStatus: (
    incidentId: string,
    photoId: string,
    status: OfflineIncidentPhoto['uploadStatus'],
    serverUrl?: string
  ) => void
  removeIncidentPhoto: (incidentId: string, photoId: string) => void

  // Sync queue actions
  addToSyncQueue: (
    item: Omit<IncidentSyncQueueItem, 'id' | 'timestamp' | 'retries' | 'priority'> & {
      priority?: 'high' | 'normal'
    }
  ) => void
  removeFromSyncQueue: (id: string) => void
  updateSyncQueueItem: (id: string, updates: Partial<IncidentSyncQueueItem>) => void

  // Sync status actions
  setSyncStatus: (status: SyncStatus, error?: string | null) => void
  setLastSyncAt: (timestamp: number) => void

  // Conflict resolution
  setConflict: (conflict: IncidentConflictInfo | null) => void
  resolveConflict: (strategy: 'keep_local' | 'keep_server' | 'merge') => void

  // Getters
  getIncidentById: (id: string) => CachedIncident | DraftIncident | undefined
  getAllIncidents: () => (CachedIncident | DraftIncident)[]
  getIncidentsByProject: (projectId: string) => (CachedIncident | DraftIncident)[]
  getPendingCount: () => number
  hasPendingChanges: () => boolean
  getHighPriorityCount: () => number
}

const generateId = () => crypto.randomUUID()

export const useOfflineSafetyStore = create<OfflineSafetyStore>()(
  persist(
    (set, get) => ({
      cachedIncidents: [],
      draftIncidents: [],
      syncQueue: [],
      syncStatus: 'idle',
      syncError: null,
      lastSyncAt: null,
      conflict: null,

      // Cache actions
      cacheIncidents: (incidents) => {
        set({ cachedIncidents: incidents, lastSyncAt: Date.now() })
      },

      updateCachedIncident: (id, updates) => {
        set((state) => ({
          cachedIncidents: state.cachedIncidents.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        }))
      },

      removeCachedIncident: (id) => {
        set((state) => ({
          cachedIncidents: state.cachedIncidents.filter((i) => i.id !== id),
        }))
      },

      clearCache: () => {
        set({ cachedIncidents: [], lastSyncAt: null })
      },

      // Draft actions
      addDraftIncident: (incident) => {
        const id = generateId()
        const newDraft: DraftIncident = {
          ...incident,
          id,
          status: incident.status || 'open',
          created_at: new Date().toISOString(),
          synced: false,
          offline_photos: [],
        }
        set((state) => ({
          draftIncidents: [...state.draftIncidents, newDraft],
        }))

        // Determine priority - serious incidents get high priority
        const isHighPriority = incident.serious_incident || incident.severity === 'critical'

        // Add to sync queue
        get().addToSyncQueue({
          incidentId: id,
          action: 'create',
          priority: isHighPriority ? 'high' : 'normal',
        })
        return id
      },

      updateDraftIncident: (id, updates) => {
        set((state) => ({
          draftIncidents: state.draftIncidents.map((i) =>
            i.id === id ? { ...i, ...updates, synced: false } : i
          ),
        }))

        // Check if already in sync queue
        const existingItem = get().syncQueue.find(
          (item) => item.incidentId === id && item.action !== 'delete'
        )
        if (!existingItem) {
          const incident = get().draftIncidents.find((i) => i.id === id)
          const isHighPriority =
            incident?.serious_incident || incident?.severity === 'critical'

          get().addToSyncQueue({
            incidentId: id,
            action: 'update',
            priority: isHighPriority ? 'high' : 'normal',
          })
        }
      },

      removeDraftIncident: (id) => {
        set((state) => ({
          draftIncidents: state.draftIncidents.filter((i) => i.id !== id),
          syncQueue: state.syncQueue.filter((item) => item.incidentId !== id),
        }))
      },

      markDraftSynced: (localId, serverId) => {
        set((state) => {
          const draft = state.draftIncidents.find((i) => i.id === localId)
          if (!draft) {return state}

          // Convert draft to cached incident (without offline-specific fields)
          const { offline_photos, synced, sync_error, ...incidentData } = draft
          const cachedIncident: CachedIncident = {
            ...incidentData,
            id: serverId || localId,
          }

          return {
            draftIncidents: state.draftIncidents.filter((i) => i.id !== localId),
            cachedIncidents: [...state.cachedIncidents, cachedIncident],
            syncQueue: state.syncQueue.filter((item) => item.incidentId !== localId),
          }
        })
      },

      // Photo actions
      addIncidentPhoto: (incidentId, photo) => {
        set((state) => ({
          draftIncidents: state.draftIncidents.map((i) =>
            i.id === incidentId
              ? {
                  ...i,
                  offline_photos: [
                    ...i.offline_photos,
                    { ...photo, uploadStatus: 'pending' as const },
                  ],
                }
              : i
          ),
        }))
      },

      updatePhotoStatus: (incidentId, photoId, status, serverUrl) => {
        set((state) => ({
          draftIncidents: state.draftIncidents.map((i) =>
            i.id === incidentId
              ? {
                  ...i,
                  offline_photos: i.offline_photos.map((p) =>
                    p.id === photoId
                      ? { ...p, uploadStatus: status, serverUrl: serverUrl || p.serverUrl }
                      : p
                  ),
                }
              : i
          ),
        }))
      },

      removeIncidentPhoto: (incidentId, photoId) => {
        set((state) => ({
          draftIncidents: state.draftIncidents.map((i) =>
            i.id === incidentId
              ? {
                  ...i,
                  offline_photos: i.offline_photos.filter((p) => p.id !== photoId),
                }
              : i
          ),
        }))
      },

      // Sync queue actions
      addToSyncQueue: (item) => {
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              ...item,
              id: generateId(),
              timestamp: Date.now(),
              retries: 0,
              priority: item.priority || 'normal',
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
            item.id === id ? { ...item, ...updates } : item
          ),
        }))
      },

      // Sync status actions
      setSyncStatus: (status, error = null) => {
        set({ syncStatus: status, syncError: error })
      },

      setLastSyncAt: (timestamp) => {
        set({ lastSyncAt: timestamp })
      },

      // Conflict resolution
      setConflict: (conflict) => {
        set({ conflict, syncStatus: conflict ? 'conflict' : 'idle' })
      },

      resolveConflict: (strategy) => {
        set((state) => {
          if (!state.conflict) {return state}

          const { incidentId, serverData } = state.conflict

          switch (strategy) {
            case 'keep_local':
              return {
                conflict: null,
                syncStatus: 'idle',
              }

            case 'keep_server':
              return {
                draftIncidents: state.draftIncidents.filter((i) => i.id !== incidentId),
                cachedIncidents: state.cachedIncidents.map((i) =>
                  i.id === incidentId ? { ...i, ...serverData } : i
                ),
                conflict: null,
                syncStatus: 'idle',
                syncQueue: state.syncQueue.filter((item) => item.incidentId !== incidentId),
              }

            case 'merge': {
              const localIncident =
                state.draftIncidents.find((i) => i.id === incidentId) ||
                state.cachedIncidents.find((i) => i.id === incidentId)

              if (!localIncident) {
                return { conflict: null, syncStatus: 'idle' }
              }

              const merged = { ...serverData }
              Object.keys(localIncident).forEach((key) => {
                const localValue = localIncident[key as keyof typeof localIncident]
                if (localValue !== null && localValue !== undefined) {
                  (merged as Record<string, unknown>)[key] = localValue
                }
              })

              const isDraft = state.draftIncidents.some((i) => i.id === incidentId)
              if (isDraft) {
                return {
                  draftIncidents: state.draftIncidents.map((i) =>
                    i.id === incidentId ? { ...i, ...(merged as Partial<DraftIncident>) } : i
                  ),
                  conflict: null,
                  syncStatus: 'idle',
                }
              } else {
                return {
                  cachedIncidents: state.cachedIncidents.map((i) =>
                    i.id === incidentId ? { ...i, ...merged } : i
                  ),
                  conflict: null,
                  syncStatus: 'idle',
                }
              }
            }

            default:
              return state
          }
        })
      },

      // Getters
      getIncidentById: (id) => {
        const state = get()
        return (
          state.draftIncidents.find((i) => i.id === id) ||
          state.cachedIncidents.find((i) => i.id === id)
        )
      },

      getAllIncidents: () => {
        const state = get()
        return [...state.draftIncidents, ...state.cachedIncidents]
      },

      getIncidentsByProject: (projectId) => {
        const state = get()
        return [
          ...state.draftIncidents.filter((i) => i.project_id === projectId),
          ...state.cachedIncidents.filter((i) => i.project_id === projectId),
        ]
      },

      getPendingCount: () => {
        return get().syncQueue.length
      },

      hasPendingChanges: () => {
        return get().syncQueue.length > 0 || get().draftIncidents.length > 0
      },

      getHighPriorityCount: () => {
        return get().syncQueue.filter((item) => item.priority === 'high').length
      },
    }),
    {
      name: 'offline-safety-store',
      version: 1,
    }
  )
)
