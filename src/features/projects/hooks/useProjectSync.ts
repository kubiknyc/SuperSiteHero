// Hook for managing offline sync of projects
import { useEffect, useCallback, useRef } from 'react'
import {
  useOfflineProjectStore,
  type ProjectConflictInfo,
  type DraftProject,
} from '../store/offlineProjectStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const BACKOFF_MULTIPLIER = 2

/**
 * Check if server data has been modified since we last fetched
 */
async function checkForConflict(
  projectId: string,
  lastKnownUpdatedAt?: string
): Promise<{
  hasConflict: boolean
  serverData?: Record<string, unknown>
  serverUpdatedAt?: string
}> {
  if (!lastKnownUpdatedAt) {
    // No timestamp to compare - assume no conflict (new project)
    return { hasConflict: false }
  }

  const { data: serverProject, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error || !serverProject) {
    // Project doesn't exist on server (deleted?) - no conflict
    return { hasConflict: false }
  }

  const projectData = serverProject as Record<string, unknown>
  const serverUpdatedAt = projectData.updated_at as string | undefined

  if (serverUpdatedAt && serverUpdatedAt !== lastKnownUpdatedAt) {
    // Server has newer data
    return {
      hasConflict: true,
      serverData: projectData,
      serverUpdatedAt,
    }
  }

  return { hasConflict: false }
}

/**
 * Hook for syncing projects between local storage and server
 */
export function useProjectSync() {
  const store = useOfflineProjectStore()
  const isProcessingRef = useRef(false)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      // Trigger sync when coming back online
      processSyncQueue()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', () => {
      // Just update local state, store tracks this
    })

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Process sync queue
  const processSyncQueue = useCallback(async () => {
    if (!navigator.onLine || store.syncQueue.length === 0 || isProcessingRef.current) {
      return
    }

    isProcessingRef.current = true
    store.setSyncStatus('syncing')

    try {
      for (const item of store.syncQueue) {
        if (item.retries >= MAX_RETRIES) {
          store.updateSyncQueueItem(item.id, {
            lastError: 'Max retries exceeded',
          })
          continue
        }

        try {
          // Get the project from draft or cached
          const project = store.getProjectById(item.projectId)

          if (!project && item.action !== 'delete') {
            logger.warn(`Project ${item.projectId} not found for sync`)
            store.removeFromSyncQueue(item.id)
            continue
          }

          // Get current user for company_id if needed
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (!user) {
            throw new Error('User not authenticated')
          }

          if (item.action === 'create') {
            const draftProject = project as DraftProject

            // Prepare project data for insert
            const projectData = {
              name: draftProject.name,
              company_id: draftProject.company_id,
              status: draftProject.status || 'active',
              description: draftProject.description,
              address: draftProject.address,
              city: draftProject.city,
              state: draftProject.state,
              zip: draftProject.zip,
              latitude: draftProject.latitude,
              longitude: draftProject.longitude,
              start_date: draftProject.start_date,
              end_date: draftProject.end_date,
              substantial_completion_date: draftProject.substantial_completion_date,
              final_completion_date: draftProject.final_completion_date,
              budget: draftProject.budget,
              contract_value: draftProject.contract_value,
              project_number: draftProject.project_number,
              weather_units: draftProject.weather_units,
              features_enabled: draftProject.features_enabled,
              created_by: user.id,
            }

            const { data: createdProject, error } = await supabase
              .from('projects')
              .insert(projectData)
              .select()
              .single()

            if (error) {throw error}

            // Mark as synced and move to cached projects
            store.markDraftSynced(item.projectId, (createdProject as { id: string }).id)
            logger.info(`Project ${item.projectId} synced successfully`)
          } else if (item.action === 'update') {
            // Check for conflicts before updating
            const conflictResult = await checkForConflict(
              item.projectId,
              item.lastKnownUpdatedAt
            )

            if (
              conflictResult.hasConflict &&
              conflictResult.serverData &&
              conflictResult.serverUpdatedAt
            ) {
              // Conflict detected - pause sync and notify user
              const conflictInfo: ProjectConflictInfo = {
                projectId: item.projectId,
                localUpdatedAt: item.timestamp,
                serverUpdatedAt: conflictResult.serverUpdatedAt,
                serverData: conflictResult.serverData,
              }
              store.setConflict(conflictInfo)
              // Don't process further items until conflict is resolved
              isProcessingRef.current = false
              return
            }

            // Prepare update data
            const updateData: Record<string, unknown> = {}
            if (project) {
              const fields = [
                'name',
                'description',
                'status',
                'address',
                'city',
                'state',
                'zip',
                'latitude',
                'longitude',
                'start_date',
                'end_date',
                'substantial_completion_date',
                'final_completion_date',
                'budget',
                'contract_value',
                'project_number',
                'weather_units',
                'features_enabled',
              ]

              fields.forEach((field) => {
                const value = project[field as keyof typeof project]
                if (value !== undefined) {
                  updateData[field] = value
                }
              })
            }

            const { error } = await supabase
              .from('projects')
              .update(updateData)
              .eq('id', item.projectId)

            if (error) {throw error}

            // Remove from sync queue
            store.removeFromSyncQueue(item.id)
            logger.info(`Project ${item.projectId} updated successfully`)
          } else if (item.action === 'delete') {
            // Soft delete by setting deleted_at
            const { error } = await supabase
              .from('projects')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', item.projectId)

            if (error) {throw error}

            store.removeCachedProject(item.projectId)
            store.removeFromSyncQueue(item.id)
            logger.info(`Project ${item.projectId} deleted successfully`)
          }
        } catch (error) {
          // Handle retry with exponential backoff
          const retries = item.retries + 1
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          store.updateSyncQueueItem(item.id, {
            retries,
            lastError: errorMessage,
          })

          if (retries < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, retries - 1)
            logger.warn(
              `Sync failed for project ${item.projectId}, retrying in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`
            )
            setTimeout(() => processSyncQueue(), delay)
          } else {
            logger.error(`Sync failed for project ${item.projectId} after ${MAX_RETRIES} retries`)
          }
        }
      }

      store.setSyncStatus('success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      store.setSyncStatus('error', errorMessage)
      logger.error('Project sync error:', error)
    } finally {
      isProcessingRef.current = false
    }
  }, [store])

  // Fetch and cache projects from server
  const fetchAndCacheProjects = useCallback(
    async (companyId?: string) => {
      if (!navigator.onLine) {
        logger.info('Offline - using cached projects')
        return store.getAllProjects()
      }

      try {
        let query = supabase
          .from('projects')
          .select('*')
          .is('deleted_at', null)
          .order('name')

        if (companyId) {
          query = query.eq('company_id', companyId)
        }

        const { data, error } = await query

        if (error) {throw error}

        // Cache the projects
        store.cacheProjects(data || [])
        return store.getAllProjects()
      } catch (error) {
        logger.error('Failed to fetch projects:', error)
        // Return cached data on error
        return store.getAllProjects()
      }
    },
    [store]
  )

  // Handle conflict resolution
  const handleResolveConflict = useCallback(
    (strategy: 'keep_local' | 'keep_server' | 'merge') => {
      store.resolveConflict(strategy)
      // Continue syncing after resolution
      processSyncQueue()
    },
    [store, processSyncQueue]
  )

  // Queue a project for deletion
  const queueProjectDeletion = useCallback(
    (projectId: string) => {
      store.addToSyncQueue({
        projectId,
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
    hasPendingChanges: store.hasPendingChanges(),
    lastSyncAt: store.lastSyncAt,
    conflict: store.conflict,
    isOnline: navigator.onLine,

    // Cached data
    cachedProjects: store.cachedProjects,
    draftProjects: store.draftProjects,
    allProjects: store.getAllProjects(),

    // Actions
    manualSync: processSyncQueue,
    fetchAndCache: fetchAndCacheProjects,
    resolveConflict: handleResolveConflict,
    queueDeletion: queueProjectDeletion,

    // Direct store access for creating drafts
    addDraftProject: store.addDraftProject,
    updateDraftProject: store.updateDraftProject,
    getProjectById: store.getProjectById,
  }
}
