// Hook for managing offline sync of daily reports
import { useEffect, useCallback } from 'react'
import { useOfflineReportStore, type ConflictInfo } from '@/features/daily-reports/store/offlineReportStore'
import { supabase } from '@/lib/supabase'
import { logger } from '../../../lib/utils/logger';


const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const BACKOFF_MULTIPLIER = 2

// Check if server data has been modified since we last fetched
async function checkForConflict(
  reportId: string,
  lastKnownUpdatedAt?: string
): Promise<{ hasConflict: boolean; serverData?: Record<string, unknown>; serverUpdatedAt?: string }> {
  if (!lastKnownUpdatedAt) {
    // No timestamp to compare - assume no conflict (new report)
    return { hasConflict: false }
  }

  const { data: serverReport, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (error || !serverReport) {
    // Report doesn't exist on server (deleted?) - no conflict
    return { hasConflict: false }
  }

  // Type assertion for the response data
  const reportData = serverReport as Record<string, unknown>
  const serverUpdatedAt = reportData.updated_at as string | undefined
  if (serverUpdatedAt && serverUpdatedAt !== lastKnownUpdatedAt) {
    // Server has newer data
    return {
      hasConflict: true,
      serverData: reportData,
      serverUpdatedAt,
    }
  }

  return { hasConflict: false }
}

export function useOfflineSync() {
  const store = useOfflineReportStore()

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      store.setOnlineStatus(true)
      // Trigger sync when coming back online
      processSyncQueue()
    }

    const handleOffline = () => {
      store.setOnlineStatus(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [store])

  // Process sync queue
  const processSyncQueue = useCallback(async () => {
    if (!store.isOnline || store.syncQueue.length === 0 || store.syncStatus === 'syncing') {
      return
    }

    store.setSyncStatus('syncing')

    for (const item of store.syncQueue) {
      if (item.retries >= MAX_RETRIES) {
        store.updateSyncQueueItem(item.id, {
          lastError: 'Max retries exceeded',
        })
        continue
      }

      try {
        const { draftReport, workforce, equipment, deliveries, visitors } = store

        if (!draftReport) {
          throw new Error('No draft report found')
        }

        // Get current user ID for reporter_id
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error('User not authenticated')
        }

        // Prepare report data
        // Note: weather_notes in DraftReport maps to weather_delay_notes in the database
        const reportData = {
          project_id: draftReport.project_id,
          report_date: draftReport.report_date,
          reporter_id: draftReport.reporter_id || user.id, // Use draft's reporter_id or current user
          weather_condition: draftReport.weather_condition,
          temperature_high: draftReport.temperature_high,
          temperature_low: draftReport.temperature_low,
          precipitation: draftReport.precipitation,
          wind_speed: draftReport.wind_speed,
          weather_delays: draftReport.weather_delays,
          weather_delay_notes: draftReport.weather_delay_notes || draftReport.weather_notes,
          work_completed: draftReport.work_completed,
          issues: draftReport.issues,
          observations: draftReport.observations,
          comments: draftReport.comments,
          status: draftReport.status || 'draft',
          total_workers: draftReport.total_workers || 0, // Auto-calculated from workforce entries
        }

        let reportId = draftReport.id

        // Create or update report
        if (item.action === 'create') {
          const { data: createdReport, error} = await supabase
            .from('daily_reports')
            .insert(reportData)
            .select()
            .single()

          if (error) {throw error}
          reportId = (createdReport as { id: string }).id
        } else {
          // Check for conflicts before updating
          const conflictResult = await checkForConflict(reportId, item.lastKnownUpdatedAt)

          if (conflictResult.hasConflict && conflictResult.serverData && conflictResult.serverUpdatedAt) {
            // Conflict detected - pause sync and notify user
            const conflictInfo: ConflictInfo = {
              reportId,
              localUpdatedAt: item.timestamp,
              serverUpdatedAt: conflictResult.serverUpdatedAt,
              serverData: conflictResult.serverData,
            }
            store.setConflict(conflictInfo)
            // Don't process further items until conflict is resolved
            return
          }

          const { error } = await supabase
            .from('daily_reports')
            .update(reportData as unknown as Record<string, unknown>)
            .eq('id', reportId)

          if (error) {throw error}
        }

        // Sync related data using transactional approach
        await syncRelatedDataTransactional(reportId, workforce, equipment, deliveries, visitors)

        // Remove from queue on success
        store.removeFromSyncQueue(item.id)
        store.setSyncStatus('success')

        // Clear draft after successful sync
        setTimeout(() => {
          store.clearDraft()
          store.setSyncStatus('idle')
        }, 1000)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Calculate backoff delay
        const delay = RETRY_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, item.retries)

        store.updateSyncQueueItem(item.id, {
          retries: item.retries + 1,
          lastError: errorMessage,
        })

        store.setSyncStatus('error', errorMessage)

        // Schedule retry
        if (item.retries < MAX_RETRIES) {
          setTimeout(() => {
            processSyncQueue()
          }, delay)
        }

        break // Stop processing queue, will retry this item
      }
    }
  }, [store])

  // Transactional sync - all related data synced together with rollback on failure
  const syncRelatedDataTransactional = async (
    reportId: string,
    workforce: typeof store.workforce,
    equipment: typeof store.equipment,
    deliveries: typeof store.deliveries,
    visitors: typeof store.visitors
  ) => {
    // Track inserted data for potential rollback
    const insertedIds: {
      workforce: string[]
      equipment: string[]
      deliveries: string[]
      visitors: string[]
    } = {
      workforce: [],
      equipment: [],
      deliveries: [],
      visitors: [],
    }

    try {
      // Phase 1: Insert all new entries (keeps old data intact until success)
      if (workforce.length > 0) {
        const workforceData = workforce.map((entry) => ({
          daily_report_id: reportId,
          entry_type: entry.entry_type,
          team_name: entry.team_name,
          worker_name: entry.worker_name,
          trade: entry.trade,
          worker_count: entry.worker_count,
          activity: entry.activity,
          hours_worked: entry.hours_worked,
        }))

        const { data, error } = await supabase
          .from('daily_report_workforce')
          .insert(workforceData)
          .select('id')

        if (error) {throw new Error(`Workforce sync failed: ${error.message}`)}
        insertedIds.workforce = (data as { id: string }[])?.map((d) => d.id) || []
      }

      if (equipment.length > 0) {
        const equipmentData = equipment.map((entry) => ({
          daily_report_id: reportId,
          equipment_type: entry.equipment_type,
          equipment_description: entry.equipment_description,
          quantity: entry.quantity,
          owner: entry.owner,
          hours_used: entry.hours_used,
          notes: entry.notes,
        }))

        const { data, error } = await supabase
          .from('daily_report_equipment')
          .insert(equipmentData)
          .select('id')

        if (error) {throw new Error(`Equipment sync failed: ${error.message}`)}
        insertedIds.equipment = (data as { id: string }[])?.map((d) => d.id) || []
      }

      if (deliveries.length > 0) {
        const deliveryData = deliveries.map((entry) => ({
          daily_report_id: reportId,
          material_description: entry.material_description,
          quantity: entry.quantity,
          vendor: entry.vendor,
          delivery_ticket_number: entry.delivery_ticket_number,
          delivery_time: entry.delivery_time,
          notes: entry.notes,
        }))

        const { data, error } = await supabase
          .from('daily_report_deliveries')
          .insert(deliveryData)
          .select('id')

        if (error) {throw new Error(`Deliveries sync failed: ${error.message}`)}
        insertedIds.deliveries = (data as { id: string }[])?.map((d) => d.id) || []
      }

      if (visitors.length > 0) {
        const visitorData = visitors.map((entry) => ({
          daily_report_id: reportId,
          visitor_name: entry.visitor_name,
          company: entry.company,
          purpose: entry.purpose,
          arrival_time: entry.arrival_time,
          departure_time: entry.departure_time,
        }))

        const { data, error } = await supabase
          .from('daily_report_visitors')
          .insert(visitorData)
          .select('id')

        if (error) {throw new Error(`Visitors sync failed: ${error.message}`)}
        insertedIds.visitors = (data as { id: string }[])?.map((d) => d.id) || []
      }

      // Phase 2: All inserts succeeded - now safely delete old entries
      // Delete entries that are NOT in the newly inserted set
      if (insertedIds.workforce.length > 0 || workforce.length === 0) {
        await supabase
          .from('daily_report_workforce')
          .delete()
          .eq('daily_report_id', reportId)
          .not('id', 'in', `(${insertedIds.workforce.join(',')})`)
      }

      if (insertedIds.equipment.length > 0 || equipment.length === 0) {
        await supabase
          .from('daily_report_equipment')
          .delete()
          .eq('daily_report_id', reportId)
          .not('id', 'in', `(${insertedIds.equipment.join(',')})`)
      }

      if (insertedIds.deliveries.length > 0 || deliveries.length === 0) {
        await supabase
          .from('daily_report_deliveries')
          .delete()
          .eq('daily_report_id', reportId)
          .not('id', 'in', `(${insertedIds.deliveries.join(',')})`)
      }

      if (insertedIds.visitors.length > 0 || visitors.length === 0) {
        await supabase
          .from('daily_report_visitors')
          .delete()
          .eq('daily_report_id', reportId)
          .not('id', 'in', `(${insertedIds.visitors.join(',')})`)
      }
    } catch (error) {
      // Rollback: Delete any entries we inserted during this failed sync
      logger.error('Sync failed, rolling back inserted entries:', error)

      if (insertedIds.workforce.length > 0) {
        await supabase
          .from('daily_report_workforce')
          .delete()
          .in('id', insertedIds.workforce)
      }

      if (insertedIds.equipment.length > 0) {
        await supabase
          .from('daily_report_equipment')
          .delete()
          .in('id', insertedIds.equipment)
      }

      if (insertedIds.deliveries.length > 0) {
        await supabase
          .from('daily_report_deliveries')
          .delete()
          .in('id', insertedIds.deliveries)
      }

      if (insertedIds.visitors.length > 0) {
        await supabase
          .from('daily_report_visitors')
          .delete()
          .in('id', insertedIds.visitors)
      }

      throw error // Re-throw to trigger retry logic
    }
  }

  // Auto-sync when queue changes and online (but not during conflicts)
  useEffect(() => {
    if (store.isOnline && store.syncQueue.length > 0 && !store.conflict) {
      const timer = setTimeout(() => {
        processSyncQueue()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [store.syncQueue.length, store.isOnline, store.conflict, processSyncQueue])

  // Handle conflict resolution - retry sync after resolution
  const handleResolveConflict = useCallback((strategy: 'keep_local' | 'keep_server' | 'merge') => {
    store.resolveConflict(strategy)
    // After resolving, trigger a sync if we kept local or merged
    if (strategy !== 'keep_server') {
      setTimeout(() => {
        processSyncQueue()
      }, 100)
    }
  }, [store, processSyncQueue])

  return {
    syncStatus: store.syncStatus,
    syncError: store.syncError,
    isOnline: store.isOnline,
    hasPendingSync: store.syncQueue.length > 0,
    pendingSyncCount: store.syncQueue.length,
    manualSync: processSyncQueue,
    // Conflict resolution
    hasConflict: !!store.conflict,
    conflict: store.conflict,
    resolveConflict: handleResolveConflict,
  }
}
