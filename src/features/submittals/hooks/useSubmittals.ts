// File: /src/features/submittals/hooks/useSubmittals.ts
// React Query hooks for Submittals

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { submittalsApi } from '@/lib/api/services/submittals'
import type { WorkflowItem, WorkflowType, SubmittalProcurement } from '@/types/database'

/**
 * Fetch Submittal workflow type for the current company
 */
export function useSubmittalWorkflowType() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['submittal-workflow-type', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) throw new Error('Company ID required')
      return submittalsApi.getSubmittalWorkflowType(userProfile.company_id)
    },
    enabled: !!userProfile?.company_id,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })
}

/**
 * Fetch all submittals for a project
 */
export function useSubmittals(projectId: string | undefined, workflowTypeId: string | undefined) {
  return useQuery({
    queryKey: ['submittals', projectId, workflowTypeId],
    queryFn: async () => {
      if (!projectId || !workflowTypeId) throw new Error('Project ID and workflow type ID required')

      const { data, error } = await supabase
        .from('workflow_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as WorkflowItem[]
    },
    enabled: !!projectId && !!workflowTypeId,
  })
}

/**
 * Fetch a single submittal by ID
 */
export function useSubmittal(submittalId: string | undefined) {
  return useQuery({
    queryKey: ['submittals', submittalId],
    queryFn: async () => {
      if (!submittalId) throw new Error('Submittal ID required')

      const { data, error } = await supabase
        .from('workflow_items')
        .select('*')
        .eq('id', submittalId)
        .single()

      if (error) throw error
      return data as WorkflowItem
    },
    enabled: !!submittalId,
  })
}

/**
 * Fetch submittals assigned to current user
 */
export function useMySubmittals(projectId?: string | undefined) {
  const { userProfile } = useAuth()
  const { data: workflowType } = useSubmittalWorkflowType()

  return useQuery({
    queryKey: ['submittals', 'my', projectId, userProfile?.id, workflowType?.id],
    queryFn: async () => {
      if (!userProfile?.id || !workflowType?.id) {
        throw new Error('User ID and workflow type ID required')
      }

      let query = supabase
        .from('workflow_items')
        .select('*')
        .eq('workflow_type_id', workflowType.id)
        .contains('assignees', [userProfile.id])
        .is('deleted_at', null)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data as WorkflowItem[]
    },
    enabled: !!userProfile?.id && !!workflowType?.id,
  })
}

/**
 * Fetch submittals filtered by status
 */
export function useSubmittalsByStatus(
  projectId: string | undefined,
  workflowTypeId: string | undefined,
  status: string | undefined
) {
  return useQuery({
    queryKey: ['submittals', projectId, workflowTypeId, 'status', status],
    queryFn: async () => {
      if (!projectId || !workflowTypeId) throw new Error('Project ID and workflow type ID required')

      let query = supabase
        .from('workflow_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .is('deleted_at', null)

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data as WorkflowItem[]
    },
    enabled: !!projectId && !!workflowTypeId,
  })
}

/**
 * Fetch submittal comments
 */
export function useSubmittalComments(submittalId: string | undefined) {
  return useQuery({
    queryKey: ['submittals', submittalId, 'comments'],
    queryFn: async () => {
      if (!submittalId) throw new Error('Submittal ID required')

      const { data, error } = await supabase
        .from('workflow_item_comments')
        .select('*')
        .eq('workflow_item_id', submittalId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data
    },
    enabled: !!submittalId,
  })
}

/**
 * Fetch procurement records for a submittal
 */
export function useSubmittalProcurement(submittalId: string | undefined) {
  return useQuery({
    queryKey: ['submittals', submittalId, 'procurement'],
    queryFn: async () => {
      if (!submittalId) throw new Error('Submittal ID required')

      const { data, error } = await supabase
        .from('submittal_procurement')
        .select('*')
        .eq('workflow_item_id', submittalId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as SubmittalProcurement[]
    },
    enabled: !!submittalId,
  })
}
