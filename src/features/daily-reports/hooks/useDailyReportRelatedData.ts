/**
 * Hooks for fetching daily report related data (workforce, equipment, deliveries, visitors, photos)
 * Used primarily for PDF export and detailed report views
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface DailyReportWorkforce {
  id: string
  daily_report_id: string
  subcontractor_id: string | null
  trade: string | null
  entry_type: string | null
  team_name: string | null
  worker_count: number | null
  worker_name: string | null
  activity: string | null
  hours_worked: number | null
  created_at: string | null
}

export interface DailyReportEquipment {
  id: string
  daily_report_id: string
  equipment_type: string
  equipment_description: string | null
  quantity: number | null
  owner: string | null
  hours_used: number | null
  notes: string | null
  created_at: string | null
}

export interface DailyReportDelivery {
  id: string
  daily_report_id: string
  material_description: string
  quantity: string | null
  vendor: string | null
  delivery_ticket_number: string | null
  delivery_time: string | null
  notes: string | null
  created_at: string | null
}

export interface DailyReportVisitor {
  id: string
  daily_report_id: string
  visitor_name: string
  company: string | null
  purpose: string | null
  arrival_time: string | null
  departure_time: string | null
  created_at: string | null
}

export interface DailyReportPhoto {
  id: string
  daily_report_id: string
  photo_url: string
  caption: string | null
  photo_type: string | null
  taken_at: string | null
  created_at: string | null
}

// =====================================================
// INDIVIDUAL HOOKS
// =====================================================

/**
 * Fetch workforce entries for a daily report
 */
export function useDailyReportWorkforce(reportId: string | undefined) {
  return useQuery({
    queryKey: ['daily-report-workforce', reportId],
    queryFn: async () => {
      if (!reportId) throw new Error('Report ID required')

      const { data, error } = await supabase
        .from('daily_report_workforce')
        .select('*')
        .eq('daily_report_id', reportId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as DailyReportWorkforce[]
    },
    enabled: !!reportId,
  })
}

/**
 * Fetch equipment entries for a daily report
 */
export function useDailyReportEquipment(reportId: string | undefined) {
  return useQuery({
    queryKey: ['daily-report-equipment', reportId],
    queryFn: async () => {
      if (!reportId) throw new Error('Report ID required')

      const { data, error } = await supabase
        .from('daily_report_equipment')
        .select('*')
        .eq('daily_report_id', reportId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as DailyReportEquipment[]
    },
    enabled: !!reportId,
  })
}

/**
 * Fetch delivery entries for a daily report
 */
export function useDailyReportDeliveries(reportId: string | undefined) {
  return useQuery({
    queryKey: ['daily-report-deliveries', reportId],
    queryFn: async () => {
      if (!reportId) throw new Error('Report ID required')

      const { data, error } = await supabase
        .from('daily_report_deliveries')
        .select('*')
        .eq('daily_report_id', reportId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as DailyReportDelivery[]
    },
    enabled: !!reportId,
  })
}

/**
 * Fetch visitor entries for a daily report
 */
export function useDailyReportVisitors(reportId: string | undefined) {
  return useQuery({
    queryKey: ['daily-report-visitors', reportId],
    queryFn: async () => {
      if (!reportId) throw new Error('Report ID required')

      const { data, error } = await supabase
        .from('daily_report_visitors')
        .select('*')
        .eq('daily_report_id', reportId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as DailyReportVisitor[]
    },
    enabled: !!reportId,
  })
}

/**
 * Fetch photos for a daily report
 * Note: daily_report_photos table may not exist in all deployments
 * Photos are typically stored inline in the daily_reports.photos JSON field
 */
export function useDailyReportPhotos(reportId: string | undefined) {
  return useQuery({
    queryKey: ['daily-report-photos', reportId],
    queryFn: async (): Promise<DailyReportPhoto[]> => {
      if (!reportId) throw new Error('Report ID required')

      // Photos are stored inline in daily_reports.photos JSON field
      // Return empty array as photos are handled directly in the report
      return [] as DailyReportPhoto[]
    },
    enabled: !!reportId,
  })
}

// =====================================================
// COMBINED HOOK FOR PDF EXPORT
// =====================================================

export interface DailyReportFullData {
  workforce: DailyReportWorkforce[]
  equipment: DailyReportEquipment[]
  deliveries: DailyReportDelivery[]
  visitors: DailyReportVisitor[]
  photos: DailyReportPhoto[]
  isLoading: boolean
  error: Error | null
}

/**
 * Fetch all related data for a daily report (for PDF export)
 */
export function useDailyReportFullData(reportId: string | undefined): DailyReportFullData {
  const workforce = useDailyReportWorkforce(reportId)
  const equipment = useDailyReportEquipment(reportId)
  const deliveries = useDailyReportDeliveries(reportId)
  const visitors = useDailyReportVisitors(reportId)
  const photos = useDailyReportPhotos(reportId)

  const isLoading =
    workforce.isLoading ||
    equipment.isLoading ||
    deliveries.isLoading ||
    visitors.isLoading ||
    photos.isLoading

  const error =
    workforce.error ||
    equipment.error ||
    deliveries.error ||
    visitors.error ||
    photos.error

  return {
    workforce: workforce.data || [],
    equipment: equipment.data || [],
    deliveries: deliveries.data || [],
    visitors: visitors.data || [],
    photos: photos.data || [],
    isLoading,
    error: error as Error | null,
  }
}
