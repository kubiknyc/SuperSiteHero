/**
 * Missing Waivers Hook
 * Hook for tracking missing lien waivers across projects
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { LienWaiverStatus } from '@/types/lien-waiver'

// Query keys
export const missingWaiverKeys = {
  all: ['missing-waivers'] as const,
  list: () => [...missingWaiverKeys.all, 'list'] as const,
  project: (projectId: string) => [...missingWaiverKeys.all, 'project', projectId] as const,
  summary: () => [...missingWaiverKeys.all, 'summary'] as const,
}

/**
 * Missing waiver item with project and payment app context
 */
export interface MissingWaiver {
  id: string
  project_id: string
  project_name: string
  payment_application_id: string
  application_number: number
  subcontractor_id: string
  subcontractor_name: string
  waiver_type: 'conditional_progress' | 'unconditional_progress' | 'conditional_final' | 'unconditional_final'
  amount: number
  due_date: string
  days_overdue: number
  status: LienWaiverStatus
}

/**
 * Summary of missing waivers across all projects
 */
export interface MissingWaiversSummary {
  total_missing: number
  total_overdue: number
  total_pending: number
  total_amount_at_risk: number
  by_project: Array<{
    project_id: string
    project_name: string
    missing_count: number
    overdue_count: number
    amount_at_risk: number
  }>
  by_subcontractor: Array<{
    subcontractor_id: string
    subcontractor_name: string
    missing_count: number
    overdue_count: number
    amount_at_risk: number
  }>
}

/**
 * Get missing waivers for a project or all projects
 */
export function useMissingWaivers(projectId?: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: projectId ? missingWaiverKeys.project(projectId) : missingWaiverKeys.list(),
    queryFn: async (): Promise<MissingWaiver[]> => {
      // Get waivers that are overdue or pending past their due date
      const today = new Date().toISOString().split('T')[0]

      // Type assertion needed until Supabase types are regenerated
      let query = supabase
        .from('lien_waivers')
        .select(`
          id,
          project_id,
          project:projects(name),
          payment_application_id,
          payment_application:payment_applications(application_number),
          subcontractor_id,
          subcontractor:subcontractors(company_name),
          waiver_type,
          amount,
          due_date,
          status
        `)
        .is('deleted_at', null)
        .in('status', ['pending', 'requested', 'sent'])

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query.order('due_date', { ascending: true })

      if (error) {throw error}

      // Transform and calculate days overdue
      return (data || []).map((waiver: any) => {
        const dueDate = new Date(waiver.due_date)
        const todayDate = new Date(today)
        const daysOverdue = Math.floor(
          (todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          id: waiver.id,
          project_id: waiver.project_id,
          project_name: waiver.project?.name || 'Unknown Project',
          payment_application_id: waiver.payment_application_id,
          application_number: waiver.payment_application?.application_number || 0,
          subcontractor_id: waiver.subcontractor_id,
          subcontractor_name: waiver.subcontractor?.company_name || 'Unknown Subcontractor',
          waiver_type: waiver.waiver_type,
          amount: waiver.amount || 0,
          due_date: waiver.due_date,
          days_overdue: Math.max(0, daysOverdue),
          status: waiver.status,
        }
      })
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Get summary of missing waivers across all projects
 */
export function useMissingWaiversSummary() {
  const { user } = useAuth()

  return useQuery({
    queryKey: missingWaiverKeys.summary(),
    queryFn: async (): Promise<MissingWaiversSummary> => {
      const today = new Date().toISOString().split('T')[0]

      // Get all pending/missing waivers
      // Type assertion needed until Supabase types are regenerated
      const { data, error } = await supabase
        .from('lien_waivers')
        .select(`
          id,
          project_id,
          project:projects(name),
          subcontractor_id,
          subcontractor:subcontractors(company_name),
          amount,
          due_date,
          status
        `)
        .is('deleted_at', null)
        .in('status', ['pending', 'requested', 'sent'])

      if (error) {throw error}

      const waivers = data || []

      // Calculate summary
      let total_missing = 0
      let total_overdue = 0
      let total_pending = 0
      let total_amount_at_risk = 0

      const projectMap = new Map<
        string,
        { project_id: string; project_name: string; missing_count: number; overdue_count: number; amount_at_risk: number }
      >()
      const subcontractorMap = new Map<
        string,
        { subcontractor_id: string; subcontractor_name: string; missing_count: number; overdue_count: number; amount_at_risk: number }
      >()

      waivers.forEach((waiver: any) => {
        const dueDate = new Date(waiver.due_date)
        const todayDate = new Date(today)
        const isOverdue = dueDate < todayDate

        total_missing++
        total_amount_at_risk += waiver.amount || 0

        if (isOverdue) {
          total_overdue++
        } else {
          total_pending++
        }

        // Aggregate by project
        const projectId = waiver.project_id
        const projectName = waiver.project?.name || 'Unknown'
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            project_id: projectId,
            project_name: projectName,
            missing_count: 0,
            overdue_count: 0,
            amount_at_risk: 0,
          })
        }
        const project = projectMap.get(projectId)!
        project.missing_count++
        project.amount_at_risk += waiver.amount || 0
        if (isOverdue) {project.overdue_count++}

        // Aggregate by subcontractor
        const subId = waiver.subcontractor_id
        const subName = waiver.subcontractor?.company_name || 'Unknown'
        if (!subcontractorMap.has(subId)) {
          subcontractorMap.set(subId, {
            subcontractor_id: subId,
            subcontractor_name: subName,
            missing_count: 0,
            overdue_count: 0,
            amount_at_risk: 0,
          })
        }
        const sub = subcontractorMap.get(subId)!
        sub.missing_count++
        sub.amount_at_risk += waiver.amount || 0
        if (isOverdue) {sub.overdue_count++}
      })

      return {
        total_missing,
        total_overdue,
        total_pending,
        total_amount_at_risk,
        by_project: Array.from(projectMap.values()).sort((a, b) => b.overdue_count - a.overdue_count),
        by_subcontractor: Array.from(subcontractorMap.values()).sort(
          (a, b) => b.overdue_count - a.overdue_count
        ),
      }
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  })
}
