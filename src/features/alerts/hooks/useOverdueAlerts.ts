// @ts-nocheck
// File: /src/features/alerts/hooks/useOverdueAlerts.ts
// Hook for fetching overdue RFIs, Submittals, and other time-sensitive items
// Used for dashboard alerts, notification badges, and email notifications

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Types for overdue items
export interface OverdueItem {
  id: string
  type: 'rfi' | 'submittal' | 'punch_item' | 'task' | 'inspection'
  title: string
  number: string
  project_id: string
  project_name?: string
  due_date: string
  days_overdue: number
  priority: 'critical' | 'high' | 'medium' | 'low'
  assigned_to?: string
  ball_in_court?: string
  status: string
  url: string
}

export interface OverdueStats {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  by_type: {
    rfis: number
    submittals: number
    punch_items: number
    tasks: number
    inspections: number
  }
}

// Calculate days overdue
function calculateDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  const diffTime = today.getTime() - due.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

// Determine priority based on days overdue
function getPriorityFromDaysOverdue(days: number): 'critical' | 'high' | 'medium' | 'low' {
  if (days > 14) {return 'critical'}
  if (days > 7) {return 'high'}
  if (days > 3) {return 'medium'}
  return 'low'
}

// Fetch overdue RFIs for a project or all projects
export function useOverdueRFIs(projectId?: string) {
  return useQuery({
    queryKey: ['overdue-rfis', projectId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('rfis')
        .select(`
          id,
          rfi_number,
          subject,
          project_id,
          date_required,
          priority,
          ball_in_court,
          status,
          projects!inner(name)
        `)
        .lt('date_required', today)
        .not('status', 'in', '("closed","answered")') as any

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        // Table may not exist yet, return empty array
        if (error.code === '42P01') {return []}
        throw error
      }

      return (data || []).map((rfi: any): OverdueItem => {
        const daysOverdue = calculateDaysOverdue(rfi.date_required)
        return {
          id: rfi.id,
          type: 'rfi',
          title: rfi.subject,
          number: `RFI-${String(rfi.rfi_number).padStart(3, '0')}`,
          project_id: rfi.project_id,
          project_name: rfi.projects?.name,
          due_date: rfi.date_required,
          days_overdue: daysOverdue,
          priority: rfi.priority === 'critical' ? 'critical' : getPriorityFromDaysOverdue(daysOverdue),
          ball_in_court: rfi.ball_in_court,
          status: rfi.status,
          url: `/rfis-v2?id=${rfi.id}`,
        }
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch overdue Submittals for a project or all projects
export function useOverdueSubmittals(projectId?: string) {
  return useQuery({
    queryKey: ['overdue-submittals', projectId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('submittals')
        .select(`
          id,
          submittal_number,
          title,
          project_id,
          required_date,
          priority,
          ball_in_court,
          status,
          projects!inner(name)
        `)
        .lt('required_date', today)
        .not('status', 'in', '("approved","approved_as_noted","closed")') as any

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        // Table may not exist yet, return empty array
        if (error.code === '42P01') {return []}
        throw error
      }

      return (data || []).map((submittal: any): OverdueItem => {
        const daysOverdue = calculateDaysOverdue(submittal.required_date)
        return {
          id: submittal.id,
          type: 'submittal',
          title: submittal.title,
          number: submittal.submittal_number || `SUB-${submittal.id.slice(0, 6)}`,
          project_id: submittal.project_id,
          project_name: submittal.projects?.name,
          due_date: submittal.required_date,
          days_overdue: daysOverdue,
          priority: submittal.priority === 'critical' ? 'critical' : getPriorityFromDaysOverdue(daysOverdue),
          ball_in_court: submittal.ball_in_court,
          status: submittal.status,
          url: `/submittals-v2?id=${submittal.id}`,
        }
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch overdue Punch List Items
export function useOverduePunchItems(projectId?: string) {
  return useQuery({
    queryKey: ['overdue-punch-items', projectId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('punch_list_items')
        .select(`
          id,
          title,
          project_id,
          due_date,
          priority,
          status,
          assigned_to,
          projects!inner(name)
        `)
        .lt('due_date', today)
        .not('status', 'in', '("completed","closed","verified")') as any

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        // Table may not exist yet, return empty array
        if (error.code === '42P01') {return []}
        throw error
      }

      return (data || []).map((item: any): OverdueItem => {
        const daysOverdue = calculateDaysOverdue(item.due_date)
        return {
          id: item.id,
          type: 'punch_item',
          title: item.title,
          number: `PL-${item.id.slice(0, 6)}`,
          project_id: item.project_id,
          project_name: item.projects?.name,
          due_date: item.due_date,
          days_overdue: daysOverdue,
          priority: item.priority === 'critical' ? 'critical' : getPriorityFromDaysOverdue(daysOverdue),
          assigned_to: item.assigned_to,
          status: item.status,
          url: `/punch-lists?id=${item.id}`,
        }
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Combined hook for all overdue items
export function useAllOverdueItems(projectId?: string) {
  const { data: rfis = [], isLoading: rfisLoading, error: rfisError } = useOverdueRFIs(projectId)
  const { data: submittals = [], isLoading: submittalsLoading, error: submittalsError } = useOverdueSubmittals(projectId)
  const { data: punchItems = [], isLoading: punchLoading, error: punchError } = useOverduePunchItems(projectId)

  const allItems = [...rfis, ...submittals, ...punchItems].sort((a, b) => {
    // Sort by days overdue (most overdue first), then by priority
    if (b.days_overdue !== a.days_overdue) {
      return b.days_overdue - a.days_overdue
    }
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    return priorityOrder[b.priority] - priorityOrder[a.priority]
  })

  const stats: OverdueStats = {
    total: allItems.length,
    critical: allItems.filter(i => i.priority === 'critical').length,
    high: allItems.filter(i => i.priority === 'high').length,
    medium: allItems.filter(i => i.priority === 'medium').length,
    low: allItems.filter(i => i.priority === 'low').length,
    by_type: {
      rfis: rfis.length,
      submittals: submittals.length,
      punch_items: punchItems.length,
      tasks: 0,
      inspections: 0,
    },
  }

  return {
    items: allItems,
    stats,
    isLoading: rfisLoading || submittalsLoading || punchLoading,
    error: rfisError || submittalsError || punchError,
  }
}

// Hook for getting items due soon (upcoming due dates within X days)
export function useItemsDueSoon(projectId?: string, daysAhead: number = 7) {
  return useQuery({
    queryKey: ['items-due-soon', projectId, daysAhead],
    queryFn: async () => {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + daysAhead)

      const todayStr = today.toISOString().split('T')[0]
      const futureDateStr = futureDate.toISOString().split('T')[0]

      // Fetch RFIs due soon
      let rfiQuery = supabase
        .from('rfis')
        .select('id, rfi_number, subject, project_id, date_required, priority, status')
        .gte('date_required', todayStr)
        .lte('date_required', futureDateStr)
        .not('status', 'in', '("closed","answered")') as any

      if (projectId) {
        rfiQuery = rfiQuery.eq('project_id', projectId)
      }

      // Fetch Submittals due soon
      let submittalQuery = supabase
        .from('submittals')
        .select('id, submittal_number, title, project_id, required_date, priority, status')
        .gte('required_date', todayStr)
        .lte('required_date', futureDateStr)
        .not('status', 'in', '("approved","approved_as_noted","closed")') as any

      if (projectId) {
        submittalQuery = submittalQuery.eq('project_id', projectId)
      }

      const [rfiResult, submittalResult] = await Promise.all([
        rfiQuery,
        submittalQuery,
      ])

      const items: Array<{
        id: string
        type: 'rfi' | 'submittal'
        title: string
        number: string
        due_date: string
        days_until_due: number
        priority: string
        status: string
      }> = []

      if (rfiResult.data) {
        rfiResult.data.forEach((rfi: any) => {
          const dueDate = new Date(rfi.date_required)
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          items.push({
            id: rfi.id,
            type: 'rfi',
            title: rfi.subject,
            number: `RFI-${String(rfi.rfi_number).padStart(3, '0')}`,
            due_date: rfi.date_required,
            days_until_due: daysUntil,
            priority: rfi.priority,
            status: rfi.status,
          })
        })
      }

      if (submittalResult.data) {
        submittalResult.data.forEach((sub: any) => {
          const dueDate = new Date(sub.required_date)
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          items.push({
            id: sub.id,
            type: 'submittal',
            title: sub.title,
            number: sub.submittal_number || `SUB-${sub.id.slice(0, 6)}`,
            due_date: sub.required_date,
            days_until_due: daysUntil,
            priority: sub.priority,
            status: sub.status,
          })
        })
      }

      // Sort by days until due (soonest first)
      items.sort((a, b) => a.days_until_due - b.days_until_due)

      return items
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Priority colors for UI
export const OVERDUE_PRIORITY_COLORS = {
  critical: { bg: 'bg-error-light', text: 'text-red-800', border: 'border-red-300' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  medium: { bg: 'bg-warning-light', text: 'text-yellow-800', border: 'border-yellow-300' },
  low: { bg: 'bg-muted', text: 'text-foreground', border: 'border-input' },
}

// Type colors for UI
export const OVERDUE_TYPE_COLORS = {
  rfi: { bg: 'bg-info-light', text: 'text-blue-800' },
  submittal: { bg: 'bg-purple-100', text: 'text-purple-800' },
  punch_item: { bg: 'bg-success-light', text: 'text-green-800' },
  task: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  inspection: { bg: 'bg-pink-100', text: 'text-pink-800' },
}
