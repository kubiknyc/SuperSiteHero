// File: /src/features/rfis/hooks/useRFIs.ts
// React Query hooks for RFI queries and mutations

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type { WorkflowItem, WorkflowItemComment, WorkflowItemHistory, WorkflowType } from '@/types/database'

// =============================================
// Type Definitions
// =============================================

export interface RFIFilters {
  status?: string
  priority?: 'low' | 'normal' | 'high'
  assignee?: string
  discipline?: string
}

export interface RFICreateInput {
  project_id: string
  workflow_type_id: string
  title: string
  description?: string
  more_information?: string
  discipline?: string
  priority?: 'low' | 'normal' | 'high'
  due_date?: string
  assignees?: string[]
}

export interface RFIUpdateInput {
  title?: string
  description?: string
  more_information?: string
  priority?: 'low' | 'normal' | 'high'
  due_date?: string
  assignees?: string[]
  resolution?: string
}

export interface RFIStatusChangeInput {
  rfiId: string
  newStatus: string
}

export interface RFICommentInput {
  rfiId: string
  comment: string
  mentioned_users?: string[]
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch RFI workflow type for the current company
 */
export function useRFIWorkflowType() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['rfi-workflow-type', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) {throw new Error('Company ID required')}

      const { data, error } = await supabase
        .from('workflow_types')
        .select('id, name_singular, name_plural, prefix, company_id')
        .eq('company_id', userProfile.company_id)
        .ilike('name_singular', 'RFI')
        .single()

      if (error) {throw error}
      return data as WorkflowType
    },
    enabled: !!userProfile?.company_id,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })
}

/**
 * Fetch all RFIs for a project with optional filtering
 * @param projectId - Project ID
 * @param filters - Optional filters (status, priority, assignee, discipline)
 * @returns Query result with RFI array
 *
 * Usage:
 * const { data: rfis, isLoading } = useRFIs(projectId, { status: 'pending', priority: 'high' })
 */
export function useRFIs(projectId: string | undefined, workflowTypeId?: string) {
  return useQuery({
    queryKey: ['rfis', projectId, workflowTypeId],
    queryFn: async () => {
      if (!projectId || !workflowTypeId) {
        throw new Error('Project ID and workflow type ID required')
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .select('id, number, title, description, status, priority, due_date, raised_by, created_at, project_id, workflow_type_id, assignees')
        .eq('project_id', projectId)
        .eq('workflow_type_id', workflowTypeId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {throw error}
      return data as WorkflowItem[]
    },
    enabled: !!projectId && !!workflowTypeId,
  })
}

/**
 * Fetch single RFI by ID with all details
 * @param rfiId - RFI ID
 * @returns Query result with single RFI
 *
 * Usage:
 * const { data: rfi, isLoading } = useRFI(rfiId)
 */
export function useRFI(rfiId: string | undefined) {
  if (!rfiId) {
    throw new Error('RFI ID is required for useRFI')
  }

  return useQuery({
    queryKey: ['rfis', rfiId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_items')
        .select('*')
        .eq('id', rfiId)
        .is('deleted_at', null)
        .single()

      if (error) {throw error}
      return data as WorkflowItem
    },
    enabled: !!rfiId,
  })
}

/**
 * Fetch RFIs filtered by status
 * @param projectId - Project ID
 * @param status - Status value: 'pending', 'submitted', 'approved', 'rejected', 'closed'
 * @returns Query result with filtered RFI array
 *
 * Usage:
 * const { data: pendingRFIs } = useRFIsByStatus(projectId, 'pending')
 */
export function useRFIsByStatus(
  projectId: string | undefined,
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'closed'
) {
  if (!projectId) {
    throw new Error('Project ID is required for useRFIsByStatus')
  }

  return useQuery({
    queryKey: ['rfis', projectId, 'status', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_items')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', status)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as WorkflowItem[]
    },
    enabled: !!projectId && !!status,
  })
}

/**
 * Fetch RFIs assigned to current user
 * @param projectId - Optional project ID to filter by
 * @returns Query result with user's assigned RFIs
 *
 * Usage:
 * const { data: myRFIs } = useMyRFIs(projectId)
 * const { data: allMyRFIs } = useMyRFIs() // across all projects
 */
export function useMyRFIs(projectId?: string | undefined) {
  const { userProfile } = useAuth()

  if (!userProfile?.id) {
    throw new Error('User must be authenticated to use useMyRFIs')
  }

  return useQuery({
    queryKey: ['rfis', 'my', projectId, userProfile.id],
    queryFn: async () => {
      let query = supabase
        .from('workflow_items')
        .select('*')
        .contains('assignees', [userProfile.id])
        .is('deleted_at', null)

      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      query = query.order('due_date', { ascending: true, nullsFirst: false })
      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {throw error}
      return data as WorkflowItem[]
    },
    enabled: !!userProfile?.id,
  })
}

/**
 * Fetch all comments for an RFI
 * @param rfiId - RFI ID
 * @returns Query result with comments ordered by created_at ascending
 *
 * Usage:
 * const { data: comments } = useRFIComments(rfiId)
 */
export function useRFIComments(rfiId: string | undefined) {
  if (!rfiId) {
    throw new Error('RFI ID is required for useRFIComments')
  }

  return useQuery({
    queryKey: ['rfis', rfiId, 'comments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_item_comments')
        .select('*')
        .eq('workflow_item_id', rfiId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {throw error}
      return data as WorkflowItemComment[]
    },
    enabled: !!rfiId,
  })
}

/**
 * Fetch audit trail/activity log for an RFI
 * @param rfiId - RFI ID
 * @returns Query result with history ordered by changed_at descending
 *
 * Usage:
 * const { data: history } = useRFIHistory(rfiId)
 */
export function useRFIHistory(rfiId: string | undefined) {
  if (!rfiId) {
    throw new Error('RFI ID is required for useRFIHistory')
  }

  return useQuery({
    queryKey: ['rfis', rfiId, 'history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_item_history')
        .select('*')
        .eq('workflow_item_id', rfiId)
        .order('changed_at', { ascending: false })

      if (error) {throw error}
      return data as WorkflowItemHistory[]
    },
    enabled: !!rfiId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Create new RFI mutation
 * Auto-generates number from workflow_type prefix + auto-increment
 * Sets initial status to 'pending'
 * Tracks created_by from auth context
 *
 * Usage:
 * const createRFI = useCreateRFI()
 * await createRFI.mutateAsync({
 *   project_id: projectId,
 *   workflow_type_id: workflowTypeId,
 *   title: 'Foundation detail clarification',
 *   description: 'Need clarification on...',
 *   priority: 'high',
 *   due_date: '2025-12-15',
 *   assignees: [userId1, userId2]
 * })
 */
export function useCreateRFI() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: RFICreateInput) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated to create RFI')
      }

      if (!input.project_id) {
        throw new Error('Project ID is required')
      }

      if (!input.workflow_type_id) {
        throw new Error('Workflow type ID is required')
      }

      if (!input.title?.trim()) {
        throw new Error('RFI title is required')
      }

      // Get next number for this workflow type in this project
      const { data: lastItem } = await supabase
        .from('workflow_items')
        .select('number')
        .eq('project_id', input.project_id)
        .eq('workflow_type_id', input.workflow_type_id)
        .order('number', { ascending: false })
        .limit(1)
        .maybeSingle()

      const nextNumber = (lastItem?.number || 0) + 1

      // Create RFI with auto-generated number and initial status
      const { data, error } = await supabase
        .from('workflow_items')
        .insert({
          project_id: input.project_id,
          workflow_type_id: input.workflow_type_id,
          number: nextNumber,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          more_information: input.more_information?.trim() || null,
          discipline: input.discipline?.trim() || null,
          priority: input.priority || 'normal',
          due_date: input.due_date || null,
          assignees: input.assignees || [],
          status: 'pending',
          raised_by: userProfile.id,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as WorkflowItem
    },
    onSuccess: (data) => {
      // Invalidate all RFI-related queries
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.project_id] })
    },
  })
}

/**
 * Update RFI fields mutation
 * Can update: title, description, more_information, priority, due_date, assignees, resolution
 * Does NOT update status directly (use useChangeRFIStatus for that)
 *
 * Usage:
 * const updateRFI = useUpdateRFI()
 * await updateRFI.mutateAsync({
 *   id: rfiId,
 *   updates: {
 *     title: 'Updated title',
 *     priority: 'high',
 *     due_date: '2025-12-20'
 *   }
 * })
 */
export function useUpdateRFI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: RFIUpdateInput }) => {
      if (!id) {
        throw new Error('RFI ID is required')
      }

      // Filter out undefined values and trim strings
      const cleanedUpdates: Partial<WorkflowItem> = {}

      if (updates.title !== undefined) {
        cleanedUpdates.title = updates.title.trim() || 'Untitled'
      }
      if (updates.description !== undefined) {
        cleanedUpdates.description = updates.description.trim() || null
      }
      if (updates.more_information !== undefined) {
        cleanedUpdates.more_information = updates.more_information.trim() || null
      }
      if (updates.priority !== undefined) {
        cleanedUpdates.priority = updates.priority
      }
      if (updates.due_date !== undefined) {
        cleanedUpdates.due_date = updates.due_date || null
      }
      if (updates.assignees !== undefined) {
        cleanedUpdates.assignees = updates.assignees
      }
      if (updates.resolution !== undefined) {
        cleanedUpdates.resolution = updates.resolution.trim() || null
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .update(cleanedUpdates as any)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as WorkflowItem
    },
    onSuccess: (data) => {
      // Invalidate specific RFI and list queries
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.id] })
    },
  })
}

/**
 * Change RFI status mutation
 * Updates status and sets appropriate dates:
 * - 'submitted': set opened_date if null
 * - 'approved', 'rejected': no date change
 * - 'closed': set closed_date
 *
 * Usage:
 * const changeStatus = useChangeRFIStatus()
 * await changeStatus.mutateAsync({ rfiId, newStatus: 'submitted' })
 */
export function useChangeRFIStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rfiId, newStatus }: RFIStatusChangeInput) => {
      if (!rfiId) {
        throw new Error('RFI ID is required')
      }

      if (!newStatus) {
        throw new Error('New status is required')
      }

      // Validate status value
      const validStatuses = ['pending', 'submitted', 'approved', 'rejected', 'closed']
      if (!validStatuses.includes(newStatus)) {
        throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`)
      }

      // Prepare update with status-specific date logic
      const updates: Partial<WorkflowItem> = {
        status: newStatus,
      }

      // Set appropriate dates based on new status
      if (newStatus === 'submitted') {
        // Get current RFI to check if opened_date is already set
        const { data: currentRFI } = await supabase
          .from('workflow_items')
          .select('opened_date')
          .eq('id', rfiId)
          .single()

        if (currentRFI && !currentRFI.opened_date) {
          updates.opened_date = new Date().toISOString()
        }
      } else if (newStatus === 'closed') {
        updates.closed_date = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('workflow_items')
        .update(updates as any)
        .eq('id', rfiId)
        .select()
        .single()

      if (error) {throw error}
      return data as WorkflowItem
    },
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.project_id] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.id] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.id, 'history'] })
    },
  })
}

/**
 * Add comment to RFI mutation
 * Tracks created_by from auth context
 * Supports @ mentions
 *
 * Usage:
 * const addComment = useAddRFIComment()
 * await addComment.mutateAsync({
 *   rfiId,
 *   comment: 'This is resolved. @userId1 please verify.',
 *   mentioned_users: [userId1]
 * })
 */
export function useAddRFIComment() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ rfiId, comment, mentioned_users = [] }: RFICommentInput) => {
      if (!userProfile?.id) {
        throw new Error('User must be authenticated to add comment')
      }

      if (!rfiId) {
        throw new Error('RFI ID is required')
      }

      if (!comment?.trim()) {
        throw new Error('Comment text is required')
      }

      const { data, error } = await supabase
        .from('workflow_item_comments')
        .insert({
          workflow_item_id: rfiId,
          comment: comment.trim(),
          mentioned_users: mentioned_users || [],
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as WorkflowItemComment
    },
    onSuccess: (data) => {
      // Invalidate comments query for this RFI
      queryClient.invalidateQueries({ queryKey: ['rfis', data.workflow_item_id, 'comments'] })
      queryClient.invalidateQueries({ queryKey: ['rfis', data.workflow_item_id] })
    },
  })
}

/**
 * Soft delete RFI mutation
 * Sets deleted_at timestamp
 *
 * Usage:
 * const deleteRFI = useDeleteRFI()
 * await deleteRFI.mutateAsync(rfiId)
 */
export function useDeleteRFI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rfiId: string) => {
      if (!rfiId) {
        throw new Error('RFI ID is required')
      }

      const { error } = await supabase
        .from('workflow_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', rfiId)

      if (error) {throw error}
    },
    onSuccess: () => {
      // Invalidate all RFI queries to remove deleted item
      queryClient.invalidateQueries({ queryKey: ['rfis'] })
    },
  })
}
