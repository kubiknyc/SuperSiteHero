// File: /src/features/rfis/hooks/useDedicatedRFIs.ts
// React Query hooks for the dedicated RFIs table with ball-in-court tracking
// Uses migration 049_dedicated_rfis.sql schema

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { notificationService, type NotificationRecipient } from '@/lib/notifications/notification-service'
import { logger } from '@/lib/utils/logger'
import type {
  RFI,
  RFIInsert,
  RFIUpdate,
  RFIStatus,
  RFIPriority,
  BallInCourtRole,
} from '@/types/database-extensions'

// Constants for RFI statuses
export const RFI_STATUSES: { value: RFIStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-muted text-foreground' },
  { value: 'open', label: 'Open', color: 'bg-info-light text-blue-800' },
  { value: 'pending_response', label: 'Pending Response', color: 'bg-amber-100 text-amber-800' },
  { value: 'responded', label: 'Responded', color: 'bg-success-light text-green-800' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-200 text-slate-800' },
  { value: 'void', label: 'Void', color: 'bg-error-light text-red-800' },
]

// Constants for priorities
export const RFI_PRIORITIES: { value: RFIPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-success-light text-green-800' },
  { value: 'normal', label: 'Normal', color: 'bg-info-light text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-amber-100 text-amber-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-error-light text-red-800' },
]

// Constants for ball-in-court roles
export const BALL_IN_COURT_ROLES: { value: BallInCourtRole; label: string; description: string }[] = [
  { value: 'gc', label: 'GC', description: 'General Contractor' },
  { value: 'architect', label: 'Architect', description: 'Architect/Designer' },
  { value: 'subcontractor', label: 'Subcontractor', description: 'Subcontractor' },
  { value: 'owner', label: 'Owner', description: 'Project Owner' },
  { value: 'engineer', label: 'Engineer', description: 'Engineer' },
  { value: 'consultant', label: 'Consultant', description: 'Consultant' },
]

// Extended RFI type with joined data
export interface RFIWithDetails extends RFI {
  project?: { id: string; name: string }
  submitted_by_user?: { id: string; full_name: string; email: string }
  assigned_to_user?: { id: string; full_name: string; email: string }
  responded_by_user?: { id: string; full_name: string; email: string }
  ball_in_court_user?: { id: string; full_name: string; email: string }
  drawing?: { id: string; name: string; file_url: string }
  attachment_count?: number
  comment_count?: number
  // Computed fields from rfi_summary view
  days_until_due?: number
  days_overdue?: number
  days_open?: number
  is_overdue?: boolean
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch RFIs for a specific project
 */
export function useProjectRFIs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-rfis', 'project', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('rfis')
        .select(`
          *,
          project:projects(id, name),
          submitted_by_user:users!rfis_submitted_by_fkey(id, full_name, email),
          assigned_to_user:users!rfis_assigned_to_fkey(id, full_name, email),
          ball_in_court_user:users!rfis_ball_in_court_fkey(id, full_name, email),
          drawing:documents(id, name, file_url)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('rfi_number', { ascending: false })

      if (error) {throw error}
      return data as RFIWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch all RFIs for the user's company
 */
export function useAllRFIs() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['dedicated-rfis', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfis')
        .select(`
          *,
          project:projects(id, name),
          submitted_by_user:users!rfis_submitted_by_fkey(id, full_name, email),
          assigned_to_user:users!rfis_assigned_to_fkey(id, full_name, email),
          ball_in_court_user:users!rfis_ball_in_court_fkey(id, full_name, email)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as RFIWithDetails[]
    },
    enabled: !!user,
  })
}

/**
 * Fetch a single RFI by ID
 */
export function useRFI(rfiId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-rfis', 'detail', rfiId],
    queryFn: async () => {
      if (!rfiId) {throw new Error('RFI ID required')}

      const { data, error } = await supabase
        .from('rfis')
        .select(`
          *,
          project:projects(id, name),
          submitted_by_user:users!rfis_submitted_by_fkey(id, full_name, email),
          assigned_to_user:users!rfis_assigned_to_fkey(id, full_name, email),
          responded_by_user:users!rfis_responded_by_fkey(id, full_name, email),
          ball_in_court_user:users!rfis_ball_in_court_fkey(id, full_name, email),
          drawing:documents(id, name, file_url)
        `)
        .eq('id', rfiId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {throw error}
      if (!data) {throw new Error('RFI not found')}
      return data as RFIWithDetails
    },
    enabled: !!rfiId,
  })
}

/**
 * Fetch RFIs by ball-in-court role
 */
export function useRFIsByBallInCourt(projectId: string | undefined, role: BallInCourtRole | 'all') {
  return useQuery({
    queryKey: ['dedicated-rfis', 'ball-in-court', projectId, role],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      let query = supabase
        .from('rfis')
        .select(`
          *,
          project:projects(id, name),
          ball_in_court_user:users!rfis_ball_in_court_fkey(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (role !== 'all') {
        query = query.eq('ball_in_court_role', role)
      }

      const { data, error } = await query.order('date_required', { ascending: true, nullsFirst: false })

      if (error) {throw error}
      return data as RFIWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch RFIs by status
 */
export function useRFIsByStatus(projectId: string | undefined, status: RFIStatus | 'all') {
  return useQuery({
    queryKey: ['dedicated-rfis', 'status', projectId, status],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      let query = supabase
        .from('rfis')
        .select(`
          *,
          project:projects(id, name),
          assigned_to_user:users!rfis_assigned_to_fkey(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (status !== 'all') {
        query = query.eq('status', status)
      }

      const { data, error } = await query.order('rfi_number', { ascending: false })

      if (error) {throw error}
      return data as RFIWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch overdue RFIs
 */
export function useOverdueRFIs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-rfis', 'overdue', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('rfis')
        .select(`
          *,
          project:projects(id, name),
          assigned_to_user:users!rfis_assigned_to_fkey(id, full_name, email),
          ball_in_court_user:users!rfis_ball_in_court_fkey(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .lt('date_required', new Date().toISOString())
        .not('status', 'in', '("closed","void")')
        .order('date_required', { ascending: true })

      if (error) {throw error}
      return data as RFIWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch RFI attachments
 */
export function useRFIAttachments(rfiId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-rfis', 'attachments', rfiId],
    queryFn: async () => {
      if (!rfiId) {throw new Error('RFI ID required')}

      const { data, error } = await supabase
        .from('rfi_attachments')
        .select(`
          *,
          document:documents(id, name, file_url, file_type),
          uploaded_by_user:users(id, full_name, email)
        `)
        .eq('rfi_id', rfiId)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data
    },
    enabled: !!rfiId,
  })
}

/**
 * Fetch RFI comments
 */
export function useRFIComments(rfiId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-rfis', 'comments', rfiId],
    queryFn: async () => {
      if (!rfiId) {throw new Error('RFI ID required')}

      const { data, error } = await supabase
        .from('rfi_comments')
        .select(`
          *,
          created_by_user:users(id, full_name, email, avatar_url)
        `)
        .eq('rfi_id', rfiId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {throw error}
      return data
    },
    enabled: !!rfiId,
  })
}

/**
 * Fetch RFI history
 */
export function useRFIHistory(rfiId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-rfis', 'history', rfiId],
    queryFn: async () => {
      if (!rfiId) {throw new Error('RFI ID required')}

      const { data, error } = await supabase
        .from('rfi_history')
        .select(`
          *,
          changed_by_user:users(id, full_name, email)
        `)
        .eq('rfi_id', rfiId)
        .order('changed_at', { ascending: false })

      if (error) {throw error}
      return data
    },
    enabled: !!rfiId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Generate the next RFI number for a project
 */
export async function generateRFINumber(projectId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_next_rfi_number', {
    p_project_id: projectId,
  })

  if (error) {
    // Fallback: manually calculate
    const { data: existingRFIs, error: fetchError } = await supabase
      .from('rfis')
      .select('rfi_number')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('rfi_number', { ascending: false })
      .limit(1)

    if (fetchError) {throw fetchError}
    return (existingRFIs?.[0]?.rfi_number || 0) + 1
  }

  return data
}

/**
 * Create a new RFI
 */
export function useCreateRFI() {
  const queryClient = useQueryClient()
  const { user, userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: Omit<RFIInsert, 'company_id' | 'created_by' | 'rfi_number'> & { distribution_list?: string[] }) => {
      if (!user?.company_id) {throw new Error('User company not found')}

      // Generate RFI number
      const rfiNumber = await generateRFINumber(input.project_id)

      // Extract distribution_list before inserting (not a DB column)
      const { distribution_list, ...dbInput } = input

      const { data, error } = await supabase
        .from('rfis')
        .insert({
          ...dbInput,
          rfi_number: rfiNumber,
          company_id: user.company_id,
          created_by: user.id,
          submitted_by: user.id,
        })
        .select()
        .single()

      if (error) {throw error}

      // Return both the RFI and the distribution list for notification
      return { rfi: data as RFI, distribution_list }
    },
    onSuccess: async ({ rfi, distribution_list }) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })

      // Send notifications to distribution list users (non-blocking)
      if (distribution_list && distribution_list.length > 0) {
        try {
          // Fetch user details for recipients
          const { data: users } = await supabase
            .from('users')
            .select('id, email, full_name')
            .in('id', distribution_list)

          if (users && users.length > 0) {
            // Fetch project name
            const { data: project } = await supabase
              .from('projects')
              .select('name')
              .eq('id', rfi.project_id)
              .single()

            const recipients: NotificationRecipient[] = users.map(u => ({
              userId: u.id,
              email: u.email,
              name: u.full_name || undefined,
            }))

            const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'

            // Notify each recipient
            for (const recipient of recipients) {
              notificationService.notifyRfiAssigned(recipient, {
                rfiNumber: formatRFINumber(rfi.rfi_number),
                subject: rfi.subject,
                question: rfi.question.substring(0, 200) + (rfi.question.length > 200 ? '...' : ''),
                projectName: project?.name || 'Unknown Project',
                assignedBy: userProfile?.full_name || user?.email || 'Team Member',
                dateRequired: rfi.date_required || undefined,
                priority: rfi.priority || 'normal',
                viewUrl: `${appUrl}/projects/${rfi.project_id}/rfis/${rfi.id}`,
              }).catch(err => {
                logger.warn('[RFI] Failed to send notification:', err)
              })
            }
          }
        } catch (err) {
          logger.warn('[RFI] Failed to send RFI notifications:', err)
        }
      }
    },
  })
}

/**
 * Update an existing RFI
 */
export function useUpdateRFI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: RFIUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('rfis')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as RFI
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })
    },
  })
}

/**
 * Submit an RFI (change status to open)
 */
export function useSubmitRFI() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (rfiId: string) => {
      const { data, error } = await supabase
        .from('rfis')
        .update({
          status: 'open',
          date_submitted: new Date().toISOString(),
          submitted_by: user?.id,
        })
        .eq('id', rfiId)
        .select()
        .single()

      if (error) {throw error}
      return data as RFI
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })
    },
  })
}

/**
 * Respond to an RFI
 */
export function useRespondToRFI() {
  const queryClient = useQueryClient()
  const { user, userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ rfiId, response }: { rfiId: string; response: string }) => {
      const { data, error } = await supabase
        .from('rfis')
        .update({
          response,
          status: 'responded',
          date_responded: new Date().toISOString(),
          responded_by: user?.id,
        })
        .eq('id', rfiId)
        .select(`
          *,
          project:projects(id, name),
          submitted_by_user:users!rfis_submitted_by_fkey(id, full_name, email)
        `)
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: async (rfi) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })

      // Notify the RFI submitter that their RFI has been responded to
      if (rfi.submitted_by_user && rfi.submitted_by_user.id !== user?.id) {
        try {
          const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
          const recipient: NotificationRecipient = {
            userId: rfi.submitted_by_user.id,
            email: rfi.submitted_by_user.email,
            name: rfi.submitted_by_user.full_name || undefined,
          }

          // Create in-app notification for RFI response
          await notificationService._createInAppNotification({
            userId: recipient.userId,
            type: 'rfi_responded',
            title: 'RFI Response Received',
            message: `${formatRFINumber(rfi.rfi_number)}: "${rfi.subject}" has been responded to by ${userProfile?.full_name || 'team member'}`,
            link: `${appUrl}/projects/${rfi.project_id}/rfis/${rfi.id}`,
            metadata: {
              rfiNumber: formatRFINumber(rfi.rfi_number),
              subject: rfi.subject,
              projectName: rfi.project?.name,
            },
          })
        } catch (err) {
          logger.warn('[RFI] Failed to send response notification:', err)
        }
      }
    },
  })
}

/**
 * Update ball-in-court assignment
 */
export function useUpdateBallInCourt() {
  const queryClient = useQueryClient()
  const { user, userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      rfiId,
      userId,
      role,
      previousUserId,
    }: {
      rfiId: string
      userId: string | null
      role: BallInCourtRole
      previousUserId?: string | null
    }) => {
      const { data, error } = await supabase
        .from('rfis')
        .update({
          ball_in_court: userId,
          ball_in_court_role: role,
        })
        .eq('id', rfiId)
        .select(`
          *,
          project:projects(id, name),
          ball_in_court_user:users!rfis_ball_in_court_fkey(id, full_name, email)
        `)
        .single()

      if (error) {throw error}
      return { rfi: data, previousUserId }
    },
    onSuccess: async ({ rfi, previousUserId }) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })

      // Notify new ball-in-court user if changed
      if (rfi.ball_in_court_user && rfi.ball_in_court !== previousUserId && rfi.ball_in_court !== user?.id) {
        try {
          const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
          const roleLabel = getBallInCourtLabel(rfi.ball_in_court_role)

          await notificationService._createInAppNotification({
            userId: rfi.ball_in_court_user.id,
            type: 'rfi_ball_in_court',
            title: 'RFI Action Required',
            message: `${formatRFINumber(rfi.rfi_number)} "${rfi.subject}" is now in your court (${roleLabel}). Assigned by ${userProfile?.full_name || 'team member'}.`,
            link: `${appUrl}/projects/${rfi.project_id}/rfis/${rfi.id}`,
            priority: rfi.priority === 'urgent' || rfi.priority === 'high' ? 'high' : 'normal',
            metadata: {
              rfiNumber: formatRFINumber(rfi.rfi_number),
              subject: rfi.subject,
              projectName: rfi.project?.name,
              role: rfi.ball_in_court_role,
              assignedBy: userProfile?.full_name,
            },
          })

          // Also send email notification
          notificationService.notifyRfiAssigned(
            {
              userId: rfi.ball_in_court_user.id,
              email: rfi.ball_in_court_user.email,
              name: rfi.ball_in_court_user.full_name || undefined,
            },
            {
              rfiNumber: formatRFINumber(rfi.rfi_number),
              subject: rfi.subject,
              question: `This RFI has been assigned to you as ${roleLabel}. Your action is required.`,
              projectName: rfi.project?.name || 'Unknown Project',
              assignedBy: userProfile?.full_name || 'Team Member',
              dateRequired: rfi.date_required || undefined,
              priority: rfi.priority || 'normal',
              viewUrl: `${appUrl}/projects/${rfi.project_id}/rfis/${rfi.id}`,
            }
          ).catch(err => {
            logger.warn('[RFI] Failed to send ball-in-court email:', err)
          })
        } catch (err) {
          logger.warn('[RFI] Failed to send ball-in-court notification:', err)
        }
      }
    },
  })
}

/**
 * Close an RFI
 */
export function useCloseRFI() {
  const queryClient = useQueryClient()
  const { user, userProfile } = useAuth()

  return useMutation({
    mutationFn: async (rfiId: string) => {
      const { data, error } = await supabase
        .from('rfis')
        .update({
          status: 'closed',
          date_closed: new Date().toISOString(),
        })
        .eq('id', rfiId)
        .select(`
          *,
          project:projects(id, name),
          submitted_by_user:users!rfis_submitted_by_fkey(id, full_name, email),
          assigned_to_user:users!rfis_assigned_to_fkey(id, full_name, email)
        `)
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: async (rfi) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })

      // Notify RFI submitter and assignee that RFI has been closed
      try {
        const appUrl = import.meta.env.VITE_APP_URL || 'https://JobSight.com'
        const notifyUsers: Array<{ id: string; email: string; full_name: string }> = []

        // Add submitter if not current user
        if (rfi.submitted_by_user && rfi.submitted_by_user.id !== user?.id) {
          notifyUsers.push(rfi.submitted_by_user)
        }

        // Add assignee if different from submitter and not current user
        if (rfi.assigned_to_user && rfi.assigned_to_user.id !== user?.id && rfi.assigned_to_user.id !== rfi.submitted_by_user?.id) {
          notifyUsers.push(rfi.assigned_to_user)
        }

        for (const notifyUser of notifyUsers) {
          await notificationService._createInAppNotification({
            userId: notifyUser.id,
            type: 'rfi_closed',
            title: 'RFI Closed',
            message: `${formatRFINumber(rfi.rfi_number)} "${rfi.subject}" has been closed by ${userProfile?.full_name || 'team member'}.`,
            link: `${appUrl}/projects/${rfi.project_id}/rfis/${rfi.id}`,
            metadata: {
              rfiNumber: formatRFINumber(rfi.rfi_number),
              subject: rfi.subject,
              projectName: rfi.project?.name,
              closedBy: userProfile?.full_name,
            },
          })
        }
      } catch (err) {
        logger.warn('[RFI] Failed to send close notification:', err)
      }
    },
  })
}

/**
 * Soft delete an RFI
 */
export function useDeleteRFI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (rfiId: string) => {
      const { error } = await supabase
        .from('rfis')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', rfiId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })
    },
  })
}

/**
 * Add a comment to an RFI
 */
export function useAddRFIComment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      rfiId,
      comment,
      commentType = 'comment',
      mentionedUsers = [],
    }: {
      rfiId: string
      comment: string
      commentType?: 'comment' | 'response' | 'internal_note' | 'question_clarification'
      mentionedUsers?: string[]
    }) => {
      const { data, error } = await supabase
        .from('rfi_comments')
        .insert({
          rfi_id: rfiId,
          comment,
          comment_type: commentType,
          mentioned_users: mentionedUsers,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis', 'comments', variables.rfiId] })
    },
  })
}

// =============================================
// Statistics Hook
// =============================================

/**
 * Get RFI statistics for a project
 */
export function useRFIStats(projectId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-rfis', 'stats', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data: rfis, error } = await supabase
        .from('rfis')
        .select('status, priority, ball_in_court_role, date_required')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (error) {throw error}

      const now = new Date()
      const stats = {
        total: rfis.length,
        byStatus: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        byBallInCourt: {} as Record<string, number>,
        open: 0,
        overdue: 0,
        responded: 0,
        closed: 0,
      }

      rfis.forEach((rfi) => {
        // Count by status
        stats.byStatus[rfi.status] = (stats.byStatus[rfi.status] || 0) + 1

        // Count by priority
        if (rfi.priority) {
          stats.byPriority[rfi.priority] = (stats.byPriority[rfi.priority] || 0) + 1
        }

        // Count by ball-in-court role
        if (rfi.ball_in_court_role) {
          stats.byBallInCourt[rfi.ball_in_court_role] = (stats.byBallInCourt[rfi.ball_in_court_role] || 0) + 1
        }

        // Count open
        if (['draft', 'open', 'pending_response'].includes(rfi.status)) {
          stats.open++
        }

        // Count overdue
        if (rfi.date_required && new Date(rfi.date_required) < now && !['closed', 'void'].includes(rfi.status)) {
          stats.overdue++
        }

        // Count responded
        if (rfi.status === 'responded') {
          stats.responded++
        }

        // Count closed
        if (rfi.status === 'closed') {
          stats.closed++
        }
      })

      return stats
    },
    enabled: !!projectId,
  })
}

// Helper function to format RFI number
export function formatRFINumber(rfiNumber: number): string {
  return `RFI-${String(rfiNumber).padStart(3, '0')}`
}

// Helper function to get status color
export function getRFIStatusColor(status: RFIStatus): string {
  return RFI_STATUSES.find((s) => s.value === status)?.color || 'bg-muted text-foreground'
}

// Helper function to get priority color
export function getRFIPriorityColor(priority: RFIPriority): string {
  return RFI_PRIORITIES.find((p) => p.value === priority)?.color || 'bg-muted text-foreground'
}

// Helper function to get ball-in-court role label
export function getBallInCourtLabel(role: BallInCourtRole): string {
  return BALL_IN_COURT_ROLES.find((r) => r.value === role)?.label || role
}

// =============================================
// Enhanced Attachment Hooks
// =============================================

/**
 * Upload an attachment to an RFI
 */
export function useUploadRFIAttachment() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      rfiId,
      file,
      attachmentType = 'general',
    }: {
      rfiId: string
      file: File
      attachmentType?: 'question' | 'response' | 'general' | 'sketch' | 'photo'
    }) => {
      if (!user?.company_id) {throw new Error('User company not found')}

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `rfi-attachments/${rfiId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {throw uploadError}

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Create attachment record
      const { data, error } = await supabase
        .from('rfi_attachments')
        .insert({
          rfi_id: rfiId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          attachment_type: attachmentType,
          uploaded_by: user.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis', 'attachments', variables.rfiId] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis', 'detail', variables.rfiId] })
    },
  })
}

/**
 * Delete an RFI attachment
 */
export function useDeleteRFIAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ attachmentId, rfiId: _rfiId }: { attachmentId: string; rfiId: string }) => {
      // Get attachment to find file path
      const { data: attachment, error: fetchError } = await supabase
        .from('rfi_attachments')
        .select('file_url')
        .eq('id', attachmentId)
        .single()

      if (fetchError) {throw fetchError}

      // Extract file path from URL and delete from storage
      if (attachment?.file_url) {
        const url = new URL(attachment.file_url)
        const pathMatch = url.pathname.match(/\/documents\/(.+)$/)
        if (pathMatch) {
          await supabase.storage.from('documents').remove([pathMatch[1]])
        }
      }

      // Delete attachment record
      const { error } = await supabase
        .from('rfi_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) {throw error}
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis', 'attachments', variables.rfiId] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis', 'detail', variables.rfiId] })
    },
  })
}

// =============================================
// Enhanced Response Hook
// =============================================

/**
 * Submit an RFI response with response type
 */
export function useSubmitRFIResponse() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      rfiId,
      response,
      responseType = 'answered',
      costImpact,
      scheduleImpactDays,
      drawingId,
    }: {
      rfiId: string
      response: string
      responseType?: 'answered' | 'see_drawings' | 'see_specs' | 'deferred' | 'partial_response' | 'request_clarification' | 'no_change_required'
      costImpact?: number
      scheduleImpactDays?: number
      drawingId?: string
    }) => {
      const updates: Record<string, any> = {
        response,
        response_type: responseType,
        status: responseType === 'request_clarification' ? 'pending_response' : 'responded',
        date_responded: new Date().toISOString(),
        responded_by: user?.id,
      }

      if (costImpact !== undefined) {
        updates.cost_impact = costImpact
      }

      if (scheduleImpactDays !== undefined) {
        updates.schedule_impact_days = scheduleImpactDays
      }

      if (drawingId) {
        updates.drawing_id = drawingId
      }

      const { data, error } = await supabase
        .from('rfis')
        .update(updates)
        .eq('id', rfiId)
        .select()
        .single()

      if (error) {throw error}
      return data as RFI
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })
    },
  })
}

/**
 * Link a drawing to an RFI
 */
export function useLinkDrawingToRFI() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      rfiId,
      drawingId,
      drawingReference,
    }: {
      rfiId: string
      drawingId: string | null
      drawingReference?: string
    }) => {
      const { data, error } = await supabase
        .from('rfis')
        .update({
          drawing_id: drawingId,
          drawing_reference: drawingReference || null,
        })
        .eq('id', rfiId)
        .select()
        .single()

      if (error) {throw error}
      return data as RFI
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis', 'detail', variables.rfiId] })
    },
  })
}
