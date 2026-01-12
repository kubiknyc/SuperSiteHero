// Hook for managing offline sync of documents
import { useEffect, useCallback, useRef } from 'react'
import {
  useOfflineDocumentStore,
  type DocumentConflictInfo,
  type DraftDocument,
  type CachedDocument,
} from '../store/offlineDocumentStore'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const BACKOFF_MULTIPLIER = 2

/**
 * Check if server data has been modified since we last fetched
 */
async function checkForConflict(
  documentId: string,
  lastKnownUpdatedAt?: string
): Promise<{
  hasConflict: boolean
  serverData?: Record<string, unknown>
  serverUpdatedAt?: string
}> {
  if (!lastKnownUpdatedAt) {
    return { hasConflict: false }
  }

  const { data: serverDocument, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error || !serverDocument) {
    return { hasConflict: false }
  }

  const documentData = serverDocument as Record<string, unknown>
  const serverUpdatedAt = documentData.updated_at as string | undefined

  if (serverUpdatedAt && serverUpdatedAt !== lastKnownUpdatedAt) {
    return {
      hasConflict: true,
      serverData: documentData,
      serverUpdatedAt,
    }
  }

  return { hasConflict: false }
}

/**
 * Upload document file to Supabase storage
 */
async function uploadDocumentFile(
  document: DraftDocument,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  if (!document.offline_file) {
    return document.file_url
  }

  try {
    const fileExt = document.file_name.split('.').pop() || 'bin'
    const fileName = `${document.project_id}/${document.id}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, document.offline_file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {throw error}

    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(data.path)

    onProgress?.(100)
    return publicUrl
  } catch (error) {
    logger.error('Failed to upload document file:', error)
    return null
  }
}

/**
 * Hook for syncing documents between local storage and server
 */
export function useDocumentSync() {
  const store = useOfflineDocumentStore()
  const isProcessingRef = useRef(false)

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      processSyncQueue()
    }

    window.addEventListener('online', handleOnline)

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
      // Sort by timestamp for FIFO processing
      const sortedQueue = [...store.syncQueue].sort((a, b) => a.timestamp - b.timestamp)

      for (const item of sortedQueue) {
        if (item.retries >= MAX_RETRIES) {
          store.updateSyncQueueItem(item.id, {
            lastError: 'Max retries exceeded',
          })
          continue
        }

        try {
          const document = store.getDocumentById(item.documentId)

          if (!document && item.action !== 'delete') {
            logger.warn(`Document ${item.documentId} not found for sync`)
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
            const draftDocument = document as DraftDocument

            // Upload file first if it's stored locally
            let fileUrl = draftDocument.file_url
            if (draftDocument.offline_file) {
              const uploadedUrl = await uploadDocumentFile(draftDocument, (progress) => {
                store.updateSyncQueueItem(item.id, { uploadProgress: progress })
              })
              if (uploadedUrl) {
                fileUrl = uploadedUrl
              }
            }

            const documentData = {
              project_id: draftDocument.project_id,
              name: draftDocument.name,
              file_name: draftDocument.file_name,
              file_url: fileUrl,
              document_type: draftDocument.document_type,
              description: draftDocument.description,
              folder_id: draftDocument.folder_id,
              version: draftDocument.version,
              revision: draftDocument.revision,
              status: draftDocument.status || 'active',
              discipline: draftDocument.discipline,
              document_number: draftDocument.document_number,
              drawing_number: draftDocument.drawing_number,
              specification_section: draftDocument.specification_section,
              issue_date: draftDocument.issue_date,
              received_date: draftDocument.received_date,
              is_pinned: draftDocument.is_pinned,
              visible_to_subcontractors: draftDocument.visible_to_subcontractors,
              requires_approval: draftDocument.requires_approval,
              file_size: draftDocument.file_size,
              file_type: draftDocument.file_type,
              supersedes_document_id: draftDocument.supersedes_document_id,
              created_by: user.id,
            }

            const { data: createdDocument, error } = await supabase
              .from('documents')
              .insert(documentData)
              .select()
              .single()

            if (error) {throw error}

            store.markDraftSynced(item.documentId, (createdDocument as { id: string }).id)
            logger.info(`Document ${item.documentId} synced successfully`)
          } else if (item.action === 'update') {
            const conflictResult = await checkForConflict(
              item.documentId,
              item.lastKnownUpdatedAt
            )

            if (
              conflictResult.hasConflict &&
              conflictResult.serverData &&
              conflictResult.serverUpdatedAt
            ) {
              const conflictInfo: DocumentConflictInfo = {
                documentId: item.documentId,
                localUpdatedAt: item.timestamp,
                serverUpdatedAt: conflictResult.serverUpdatedAt,
                serverData: conflictResult.serverData,
              }
              store.setConflict(conflictInfo)
              isProcessingRef.current = false
              return
            }

            const updateData: Record<string, unknown> = {}
            if (document) {
              const fields = [
                'name',
                'description',
                'folder_id',
                'version',
                'revision',
                'status',
                'discipline',
                'document_number',
                'drawing_number',
                'specification_section',
                'issue_date',
                'received_date',
                'is_pinned',
                'visible_to_subcontractors',
                'requires_approval',
              ]

              fields.forEach((field) => {
                const value = document[field as keyof typeof document]
                if (value !== undefined) {
                  updateData[field] = value
                }
              })
            }

            const { error } = await supabase
              .from('documents')
              .update(updateData)
              .eq('id', item.documentId)

            if (error) {throw error}

            store.removeFromSyncQueue(item.id)
            logger.info(`Document ${item.documentId} updated successfully`)
          } else if (item.action === 'delete') {
            const { error } = await supabase
              .from('documents')
              .update({ deleted_at: new Date().toISOString() })
              .eq('id', item.documentId)

            if (error) {throw error}

            store.removeCachedDocument(item.documentId)
            store.removeFromSyncQueue(item.id)
            logger.info(`Document ${item.documentId} deleted successfully`)
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
              `Sync failed for document ${item.documentId}, retrying in ${delay}ms (attempt ${retries}/${MAX_RETRIES})`
            )
            setTimeout(() => processSyncQueue(), delay)
          } else {
            logger.error(`Sync failed for document ${item.documentId} after ${MAX_RETRIES} retries`)
          }
        }
      }

      store.setSyncStatus('success')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      store.setSyncStatus('error', errorMessage)
      logger.error('Document sync error:', error)
    } finally {
      isProcessingRef.current = false
    }
  }, [store])

  // Fetch and cache documents from server
  const fetchAndCacheDocuments = useCallback(
    async (projectId?: string, folderId?: string | null) => {
      if (!navigator.onLine) {
        logger.info('Offline - using cached documents')
        if (projectId) {return store.getDocumentsByProject(projectId)}
        return store.getAllDocuments()
      }

      try {
        let query = supabase
          .from('documents')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (projectId) {
          query = query.eq('project_id', projectId)
        }
        if (folderId !== undefined) {
          if (folderId === null) {
            query = query.is('folder_id', null)
          } else {
            query = query.eq('folder_id', folderId)
          }
        }

        const { data, error } = await query

        if (error) {throw error}

        store.cacheDocuments((data as CachedDocument[]) || [])
        if (projectId) {return store.getDocumentsByProject(projectId)}
        return store.getAllDocuments()
      } catch (error) {
        logger.error('Failed to fetch documents:', error)
        if (projectId) {return store.getDocumentsByProject(projectId)}
        return store.getAllDocuments()
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

  // Queue a document for deletion
  const queueDocumentDeletion = useCallback(
    (documentId: string) => {
      store.addToSyncQueue({
        documentId,
        action: 'delete',
      })

      if (navigator.onLine) {
        processSyncQueue()
      }
    },
    [store, processSyncQueue]
  )

  // Toggle pinned status
  const togglePinned = useCallback(
    (documentId: string) => {
      const document = store.getDocumentById(documentId)
      if (!document) {return}

      const isPinned = !document.is_pinned
      const isDraft = 'synced' in document

      if (isDraft) {
        store.updateDraftDocument(documentId, { is_pinned: isPinned })
      } else {
        store.updateCachedDocument(documentId, { is_pinned: isPinned })
        store.addToSyncQueue({
          documentId,
          action: 'update',
        })
      }

      if (navigator.onLine) {
        processSyncQueue()
      }
    },
    [store, processSyncQueue]
  )

  // Move document to folder
  const moveToFolder = useCallback(
    (documentId: string, folderId: string | null) => {
      const document = store.getDocumentById(documentId)
      if (!document) {return}

      const isDraft = 'synced' in document

      if (isDraft) {
        store.updateDraftDocument(documentId, { folder_id: folderId })
      } else {
        store.updateCachedDocument(documentId, { folder_id: folderId })
        store.addToSyncQueue({
          documentId,
          action: 'update',
        })
      }

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
    cachedDocuments: store.cachedDocuments,
    draftDocuments: store.draftDocuments,
    allDocuments: store.getAllDocuments(),

    // Actions
    manualSync: processSyncQueue,
    fetchAndCache: fetchAndCacheDocuments,
    resolveConflict: handleResolveConflict,
    queueDeletion: queueDocumentDeletion,
    togglePinned,
    moveToFolder,

    // Direct store access
    addDraftDocument: store.addDraftDocument,
    updateDraftDocument: store.updateDraftDocument,
    getDocumentById: store.getDocumentById,
    getDocumentsByProject: store.getDocumentsByProject,
    getDocumentsByFolder: store.getDocumentsByFolder,
    getDocumentsByType: store.getDocumentsByType,
    getPinnedDocuments: store.getPinnedDocuments,
  }
}
