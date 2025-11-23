// Hook for managing offline sync of daily reports
import { useEffect, useCallback } from 'react'
import { useOfflineReportStore } from '@/features/daily-reports/store/offlineReportStore'
import { supabase } from '@/lib/supabase'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const BACKOFF_MULTIPLIER = 2

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

        // Prepare report data
        const reportData = {
          project_id: draftReport.project_id,
          report_date: draftReport.report_date,
          weather_condition: draftReport.weather_condition,
          temperature_high: draftReport.temperature_high,
          temperature_low: draftReport.temperature_low,
          precipitation: draftReport.precipitation,
          wind_speed: draftReport.wind_speed,
          weather_delays: draftReport.weather_delays,
          weather_delay_notes: draftReport.weather_delay_notes,
          work_completed: draftReport.work_completed,
          issues: draftReport.issues,
          observations: draftReport.observations,
          comments: draftReport.comments,
          status: draftReport.status || 'draft',
        }

        let reportId = draftReport.id

        // Create or update report
        if (item.action === 'create') {
          const { data: createdReport, error } = await supabase
            .from('daily_reports')
            .insert(reportData as any)
            .select()
            .single()

          if (error) throw error
          reportId = createdReport.id
        } else {
          const { error } = await supabase
            .from('daily_reports')
            .update(reportData as any)
            .eq('id', reportId)

          if (error) throw error
        }

        // Sync related data
        await syncWorkforceData(reportId, workforce)
        await syncEquipmentData(reportId, equipment)
        await syncDeliveryData(reportId, deliveries)
        await syncVisitorData(reportId, visitors)

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

  // Sync workforce data
  const syncWorkforceData = async (reportId: string, entries: typeof store.workforce) => {
    // Delete existing entries
    await supabase.from('daily_report_workforce').delete().eq('daily_report_id', reportId)

    // Insert new entries
    if (entries.length > 0) {
      const workforceData = entries.map((entry) => ({
        daily_report_id: reportId,
        entry_type: entry.entry_type,
        team_name: entry.team_name,
        worker_name: entry.worker_name,
        trade: entry.trade,
        worker_count: entry.worker_count,
        activity: entry.activity,
        hours_worked: entry.hours_worked,
      }))

      const { error } = await supabase.from('daily_report_workforce').insert(workforceData as any)

      if (error) throw error
    }
  }

  // Sync equipment data
  const syncEquipmentData = async (reportId: string, entries: typeof store.equipment) => {
    await supabase.from('daily_report_equipment').delete().eq('daily_report_id', reportId)

    if (entries.length > 0) {
      const equipmentData = entries.map((entry) => ({
        daily_report_id: reportId,
        equipment_type: entry.equipment_type,
        equipment_description: entry.equipment_description,
        quantity: entry.quantity,
        owner: entry.owner,
        hours_used: entry.hours_used,
        notes: entry.notes,
      }))

      const { error } = await supabase.from('daily_report_equipment').insert(equipmentData as any)

      if (error) throw error
    }
  }

  // Sync delivery data
  const syncDeliveryData = async (reportId: string, entries: typeof store.deliveries) => {
    await supabase.from('daily_report_deliveries').delete().eq('daily_report_id', reportId)

    if (entries.length > 0) {
      const deliveryData = entries.map((entry) => ({
        daily_report_id: reportId,
        material_description: entry.material_description,
        quantity: entry.quantity,
        vendor: entry.vendor,
        delivery_ticket_number: entry.delivery_ticket_number,
        delivery_time: entry.delivery_time,
        notes: entry.notes,
      }))

      const { error } = await supabase.from('daily_report_deliveries').insert(deliveryData as any)

      if (error) throw error
    }
  }

  // Sync visitor data
  const syncVisitorData = async (reportId: string, entries: typeof store.visitors) => {
    await supabase.from('daily_report_visitors').delete().eq('daily_report_id', reportId)

    if (entries.length > 0) {
      const visitorData = entries.map((entry) => ({
        daily_report_id: reportId,
        visitor_name: entry.visitor_name,
        company: entry.company,
        purpose: entry.purpose,
        arrival_time: entry.arrival_time,
        departure_time: entry.departure_time,
      }))

      const { error } = await supabase.from('daily_report_visitors').insert(visitorData as any)

      if (error) throw error
    }
  }

  // Auto-sync when queue changes and online
  useEffect(() => {
    if (store.isOnline && store.syncQueue.length > 0) {
      const timer = setTimeout(() => {
        processSyncQueue()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [store.syncQueue.length, store.isOnline, processSyncQueue])

  return {
    syncStatus: store.syncStatus,
    syncError: store.syncError,
    isOnline: store.isOnline,
    hasPendingSync: store.syncQueue.length > 0,
    pendingSyncCount: store.syncQueue.length,
    manualSync: processSyncQueue,
  }
}
