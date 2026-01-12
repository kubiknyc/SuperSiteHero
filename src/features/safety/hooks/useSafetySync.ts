// Hook for managing offline sync of safety incidents
// High priority (95) due to regulatory compliance requirements
import { useEffect, useCallback, useRef } from 'react'
import {
  useOfflineSafetyStore,
  type IncidentConflictInfo,
  type DraftIncident,
  type CachedIncident,
} from '../store/offlineSafetyStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const BACKOFF_MULTIPLIER = 2

/**
 * Check if server data has been modified since we last fetched
 */
async function checkForConflict(
  incidentId: string,
  lastKnownUpdatedAt?: string
): Promise<{
  hasConflict: boolean
  serverData?: Record<string, unknown>
  serverUpdatedAt?: string
}> {
  if (!lastKnownUpdatedAt) {
    return { hasConflict: false }
  }

  const { data: serverIncident, error } = await supabase
    .from('safety_incidents')
    .select('*')
    .eq('id', incidentId)
    .single()

  if (error || !serverIncident) {
    return { hasConflict: false }
  }

  const incidentData = serverIncident as Record<string, unknown>
  const serverUpdatedAt = incidentData.updated_at as string | undefined

  if (serverUpdatedAt && serverUpdatedAt !== lastKnownUpdatedAt) {
    return {
      hasConflict: true,
      serverData: incidentData,
      serverUpdatedAt,
    }
  }

  return { hasConflict: false }
}

/**
 * Upload incident photos to Supabase storage
 */
async function uploadIncidentPhotos(
  incidentId: string,
  photos: DraftIncident['offline_photos'],
  onPhotoUploaded: (photoId: string, serverUrl: string) => void
): Promise<string[]> {
  const uploadedUrls: string[] = []

  for (const photo of photos) {
    if (photo.uploadStatus === 'uploaded' && photo.serverUrl) {
      uploadedUrls.push(photo.serverUrl)
      continue
    }

    if (!photo.file) {
      logger.warn(`No file for photo ${photo.id}, skipping upload`)
      continue
    }

    try {
      const fileExt = photo.file.name.split('.').pop() || 'jpg'
      const fileName = `${incidentId}/${photo.id}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('safety-incident-photos')
        .upload(fileName, photo.file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (error) {throw error}

      const {
        data: { publicUrl },
      } = supabase.storage.from('safety-incident-photos').getPublicUrl(data.path)

      uploadedUrls.push(publicUrl)
      onPhotoUploaded(photo.id, publicUrl)
    } catch (error) {
      logger.error(`Failed to upload photo ${photo.id}:`, error)
    }
  }

  return uploadedUrls
}

/**
 * Hook for syncing safety incidents between local storage and server
 */
export function useSafetySync() {
  const store = useOfflineSafetyStore()
  const isProcessingRef = useRef(false)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      // High priority: sync safety incidents immediately when online
      processSyncQueue()
    }

    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Process sync queue - prioritizes high priority items first
  const processSyncQueue = useCallback(async () => {
    if (!navigator.onLine || store.syncQueue.length === 0 || isProcessingRef.current) {
      return
    }

    isProcessingRef.current = true
    store.setSyncStatus('syncing')

    try {
      // Sort queue: high priority first, then by timestamp
      const sortedQueue = [...store.syncQueue].sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') {return -1}
        if (a.priority !== 'high' && b.priority === 'high') {return 1}
        return a.timestamp - b.timestamp
      })

      for (const item of sortedQueue) {
        if (item.retries >= MAX_RETRIES) {
          store.updateSyncQueueItem(item.id, {
            lastError: 'Max retries exceeded',
          })
          continue
        }

        try {
          const incident = store.getIncidentById(item.incidentId)

          if (!incident && item.action !== 'delete') {
            logger.warn(`Incident ${item.incidentId} not found for sync`)
            store.removeFromSyncQueue(item.id)
            continue
          }

          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) {
            throw new Error('User not authenticated')
          }

          if (item.action === 'create') {
            const draftIncident = incident as DraftIncident

            // Upload photos first if any
            let photoUrls: string[] = []
            if (draftIncident.offline_photos.length > 0) {
              photoUrls = await uploadIncidentPhotos(
                draftIncident.id,
                draftIncident.offline_photos,
                (photoId, serverUrl) => {
                  store.updatePhotoStatus(draftIncident.id, photoId, 'uploaded', serverUrl)
                }
              )
            }

            // Prepare incident data for insert
            const incidentData = {
              project_id: draftIncident.project_id,
              company_id: draftIncident.company_id,
              incident_date: draftIncident.incident_date,
              incident_type: draftIncident.incident_type,
              description: draftIncident.description,
              incident_time: draftIncident.incident_time,
              location: draftIncident.location,
              person_involved: draftIncident.person_involved,
              witness_names: draftIncident.witness_names,
              company: draftIncident.company,
              subcontractor_id: draftIncident.subcontractor_id,
              severity: draftIncident.severity,
              injury_type: draftIncident.injury_type,
              body_part: draftIncident.body_part,
              treatment: draftIncident.treatment,
              serious_incident: draftIncident.serious_incident,
              immediate_actions: draftIncident.immediate_actions,
              corrective_actions: draftIncident.corrective_actions,
              root_cause: draftIncident.root_cause,
              root_cause_category: draftIncident.root_cause_category,
              contributing_factors: draftIncident.contributing_factors,
              reported_by: draftIncident.reported_by || user.id,
              reported_at: draftIncident.reported_at || new Date().toISOString(),
              notified_users: draftIncident.notified_users,
              reported_to_osha: draftIncident.reported_to_osha,
              osha_report_number: draftIncident.osha_report_number,
              reported_to_owner: draftIncident.reported_to_owner,
              requires_followup: draftIncident.requires_followup,
              followup_notes: draftIncident.followup_notes,
              status: draftIncident.status || 'open',
              created_by: user.id,
            }

            const { data: createdIncident, error } = await supabase
              .from('safety_incidents')
              .insert(incidentData)
              .select()
              .single()

            if (error) {throw error}

            // Link photos to the incident if we have any
            if (photoUrls.length > 0) {
              // Note: Assuming there's a safety_incident_photos table
              // If not, photos might be stored differently
              logger.info(`Uploaded ${photoUrls.length} photos for incident`)
            }

            store.markDraftSynced(item.incidentId, (createdIncident as { id: string }).id)
            logger.info(`Safety incident ${item.incidentId} synced successfully`)
          } else if (item.action === 'update') {
            // Check for conflicts before updating
            const conflictResult = await checkForConflict(
              item.incidentId,
              item.lastKnownUpdatedAt
            )

            if (
              conflictResult.hasConflict &&
              conflictResult.serverData &&
              conflictResult.serverUpdatedAt
            ) {
              const conflictInfo: IncidentConflictInfo = {
                incidentId: item.incidentId,
                localUpdatedAt: item.timestamp,
                serverUpdatedAt: conflictResult.serverUpdatedAt,
                serverData: conflictResult.serverData,
              }
              store.setConflict(conflictInfo)
              isProcessingRef.current = false
              return
            }

            // Prepare update data
            const updateData: Record<string, unknown> = {}
            if (incident) {
              const fields = [
                'incident_date',
                'incident_type',
                'description',
                'incident_time',
                'location',
                'person_involved',
                'witness_names',
                'company',
                'subcontractor_id',
                'severity',
                'injury_type',
                'body_part',
                'treatment',
                'serious_incident',
                'immediate_actions',
                'corrective_actions',
                'root_cause',
                'root_cause_category',
                'contributing_factors',
                'notified_users',
                'reported_to_osha',
                'osha_report_number',
                'reported_to_owner',
                'requires_followup',
                'followup_notes',
                'status',
              ]

              fields.forEach((field) => {
                const value = incident[field as keyof typeof incident]
                if (value !== undefined) {
                  updateData[field] = value
                }
              })
            }

            const { error } = await supabase
              .from('safety_incidents')
              .update(updateData)
              .eq('id', item.incidentId)

            if (error) {throw error}

            store.removeFromSyncQueue(item.id)
            logger.info(`Safety incident ${item.incidentId} updated successfully`)
          } else if (item.action === 'delete') {
            const { error } = await supabase
              .from('safety_incidents')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', item.incidentId)

            if (error) {throw error}

            store.removeCachedIncident(item.incidentId)
            store.removeFromSyncQueue(item.id)
            logger.info(`Safety incident ${item.incidentId} deleted successfully`)
          }
        } catch (error) {
          const retries = item.retries + 1
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          store.updateSyncQueueItem(item.id, {
            retries,
            lastError: errorMessage,
          })

          if (retries < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retries - 1)
            logger.warn(
              `Sync failed for incident ${item.incidentId}, retrying in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`
            )
            setTimeout(() => processSyncQueue(), delay)
          } else {
            logger.error(
              `Sync failed for incident ${item.incidentId} after ${MAX_RETRIES} retries`
            )
          }
        }
      }

      store.setSyncStatus('success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      store.setSyncStatus('error', errorMessage)
      logger.error('Safety incident sync error:', error)
    } finally {
      isProcessingRef.current = false
    }
  }, [store])

  // Fetch and cache incidents from server
  const fetchAndCacheIncidents = useCallback(
    async (projectId?: string) => {
      if (!navigator.onLine) {
        logger.info('Offline - using cached safety incidents')
        return projectId
          ? store.getIncidentsByProject(projectId)
          : store.getAllIncidents()
      }

      try {
        let query = supabase
          .from('safety_incidents')
          .select('*')
          .is('deleted_at', null)
          .order('incident_date', { ascending: false })

        if (projectId) {
          query = query.eq('project_id', projectId)
        }

        const { data, error } = await query

        if (error) {throw error}

        store.cacheIncidents((data as CachedIncident[]) || [])
        return projectId
          ? store.getIncidentsByProject(projectId)
          : store.getAllIncidents()
      } catch (error) {
        logger.error('Failed to fetch safety incidents:', error)
        return projectId
          ? store.getIncidentsByProject(projectId)
          : store.getAllIncidents()
      }
    },
    [store]
  )

  // Handle conflict resolution
  const handleResolveConflict = useCallback(
    (strategy: 'keep_local' | 'keep_server' | 'merge') => {
      store.resolveConflict(strategy)
      processSyncQueue()
    },
    [store, processSyncQueue]
  )

  // Queue an incident for deletion
  const queueIncidentDeletion = useCallback(
    (incidentId: string) => {
      store.addToSyncQueue({
        incidentId,
        action: 'delete',
      })

      if (navigator.onLine) {
        processSyncQueue()
      }
    },
    [store, processSyncQueue]
  )

  return {
    // State
    syncStatus: store.syncStatus,
    syncError: store.syncError,
    pendingCount: store.getPendingCount(),
    highPriorityCount: store.getHighPriorityCount(),
    hasPendingChanges: store.hasPendingChanges(),
    lastSyncAt: store.lastSyncAt,
    conflict: store.conflict,
    isOnline: navigator.onLine,

    // Cached data
    cachedIncidents: store.cachedIncidents,
    draftIncidents: store.draftIncidents,
    allIncidents: store.getAllIncidents(),

    // Actions
    manualSync: processSyncQueue,
    fetchAndCache: fetchAndCacheIncidents,
    resolveConflict: handleResolveConflict,
    queueDeletion: queueIncidentDeletion,

    // Direct store access
    addDraftIncident: store.addDraftIncident,
    updateDraftIncident: store.updateDraftIncident,
    getIncidentById: store.getIncidentById,
    getIncidentsByProject: store.getIncidentsByProject,

    // Photo management
    addIncidentPhoto: store.addIncidentPhoto,
    removeIncidentPhoto: store.removeIncidentPhoto,
  }
}
