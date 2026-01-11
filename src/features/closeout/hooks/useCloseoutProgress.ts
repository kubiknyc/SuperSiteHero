/**
 * useCloseoutProgress Hook
 *
 * React Query hooks for Closeout Progress Dashboard functionality.
 * Aggregates data from all closeout modules for overall progress tracking.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  CloseoutMilestone,
  CloseoutMilestoneWithDetails,
  CreateCloseoutMilestoneDTO,
  UpdateCloseoutMilestoneDTO,
  CloseoutProgressSummary,
  CloseoutMilestoneType,
} from '@/types/closeout-extended'
import { useCloseoutStatistics, useWarrantyStatistics } from './useCloseout'
import { useOMManualStatistics } from './useOMManual'
import { useAtticStockStatistics } from './useAtticStock'
import { useTrainingStatistics } from './useTrainingRecords'
import { useWarrantyClaimStatistics } from './useWarrantyClaims'
import { usePunchListCloseout } from './usePunchListCloseout'

// =============================================
// Query Keys
// =============================================

export const closeoutProgressKeys = {
  all: ['closeout-progress'] as const,
  milestones: (projectId: string) => [...closeoutProgressKeys.all, 'milestones', projectId] as const,
  milestone: (id: string) => [...closeoutProgressKeys.all, 'milestone', id] as const,
  summary: (projectId: string) => [...closeoutProgressKeys.all, 'summary', projectId] as const,
}

// =============================================
// Milestone Hooks
// =============================================

/**
 * Fetch closeout milestones for a project
 */
export function useCloseoutMilestones(projectId: string | undefined) {
  return useQuery({
    queryKey: closeoutProgressKeys.milestones(projectId || ''),
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('closeout_milestones')
        .select(`
          *,
          completed_by_user:profiles!closeout_milestones_completed_by_fkey(id, full_name),
          owner_sign_off_by_user:profiles!closeout_milestones_owner_sign_off_by_fkey(id, full_name)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) {throw error}
      return data as CloseoutMilestoneWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single closeout milestone
 */
export function useCloseoutMilestone(milestoneId: string | undefined) {
  return useQuery({
    queryKey: closeoutProgressKeys.milestone(milestoneId || ''),
    queryFn: async () => {
      if (!milestoneId) {throw new Error('Milestone ID required')}

      const { data, error } = await supabase
        .from('closeout_milestones')
        .select(`
          *,
          completed_by_user:profiles!closeout_milestones_completed_by_fkey(id, full_name),
          owner_sign_off_by_user:profiles!closeout_milestones_owner_sign_off_by_fkey(id, full_name)
        `)
        .eq('id', milestoneId)
        .single()

      if (error) {throw error}
      return data as CloseoutMilestoneWithDetails
    },
    enabled: !!milestoneId,
  })
}

/**
 * Create a new closeout milestone
 */
export function useCreateCloseoutMilestone() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateCloseoutMilestoneDTO) => {
      const { data, error } = await supabase
        .from('closeout_milestones')
        .insert({
          company_id: userProfile?.company_id,
          project_id: input.project_id,
          milestone_type: input.milestone_type,
          title: input.title,
          description: input.description || null,
          target_date: input.target_date || null,
          is_complete: false,
          requires_owner_signoff: input.requires_owner_signoff ?? false,
          owner_signed_off: false,
          document_urls: [],
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as CloseoutMilestone
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.milestones(data.project_id) })
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.summary(data.project_id) })
    },
  })
}

/**
 * Update a closeout milestone
 */
export function useUpdateCloseoutMilestone() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCloseoutMilestoneDTO & { id: string }) => {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Set completion data if marking complete
      if (updates.is_complete === true) {
        updateData.actual_date = updates.actual_date || new Date().toISOString().split('T')[0]
        updateData.completed_by = userProfile?.id
      }

      const { data, error } = await supabase
        .from('closeout_milestones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as CloseoutMilestone
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.milestone(data.id) })
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.milestones(data.project_id) })
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.summary(data.project_id) })
    },
  })
}

/**
 * Complete a closeout milestone
 */
export function useCompleteMilestone() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      notes,
      documentUrls,
    }: {
      id: string
      notes?: string
      documentUrls?: string[]
    }) => {
      const { data, error } = await supabase
        .from('closeout_milestones')
        .update({
          is_complete: true,
          actual_date: new Date().toISOString().split('T')[0],
          completed_by: userProfile?.id,
          notes: notes || null,
          document_urls: documentUrls || [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as CloseoutMilestone
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.milestone(data.id) })
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.milestones(data.project_id) })
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.summary(data.project_id) })
    },
  })
}

/**
 * Owner sign-off on a milestone
 */
export function useOwnerSignOffMilestone() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      notes,
    }: {
      id: string
      notes?: string
    }) => {
      const { data, error } = await supabase
        .from('closeout_milestones')
        .update({
          owner_signed_off: true,
          owner_sign_off_date: new Date().toISOString(),
          owner_sign_off_by: userProfile?.id,
          owner_sign_off_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as CloseoutMilestone
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.milestone(data.id) })
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.milestones(data.project_id) })
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.summary(data.project_id) })
    },
  })
}

/**
 * Delete a closeout milestone (soft delete)
 */
export function useDeleteCloseoutMilestone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('closeout_milestones')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('project_id')
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.milestones(data.project_id) })
      queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.summary(data.project_id) })
    },
  })
}

/**
 * Initialize default milestones for a project
 */
export function useInitializeCloseoutMilestones() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (projectId: string) => {
      const defaultMilestones: { milestone_type: CloseoutMilestoneType; title: string; requires_owner_signoff: boolean }[] = [
        { milestone_type: 'substantial_completion', title: 'Substantial Completion', requires_owner_signoff: true },
        { milestone_type: 'punch_list_complete', title: 'Punch List Complete', requires_owner_signoff: false },
        { milestone_type: 'training_complete', title: 'Training Complete', requires_owner_signoff: true },
        { milestone_type: 'om_manuals_delivered', title: 'O&M Manuals Delivered', requires_owner_signoff: true },
        { milestone_type: 'warranties_collected', title: 'Warranties Collected', requires_owner_signoff: false },
        { milestone_type: 'attic_stock_delivered', title: 'Attic Stock Delivered', requires_owner_signoff: true },
        { milestone_type: 'final_inspection', title: 'Final Inspection', requires_owner_signoff: false },
        { milestone_type: 'certificate_of_occupancy', title: 'Certificate of Occupancy', requires_owner_signoff: false },
        { milestone_type: 'final_payment_released', title: 'Final Payment Released', requires_owner_signoff: true },
        { milestone_type: 'project_closed', title: 'Project Closed', requires_owner_signoff: true },
      ]

      const milestonesToInsert = defaultMilestones.map((m) => ({
        company_id: userProfile?.company_id,
        project_id: projectId,
        milestone_type: m.milestone_type,
        title: m.title,
        requires_owner_signoff: m.requires_owner_signoff,
        is_complete: false,
        owner_signed_off: false,
        document_urls: [],
        created_by: userProfile?.id,
      }))

      const { data, error } = await supabase
        .from('closeout_milestones')
        .insert(milestonesToInsert)
        .select()

      if (error) {throw error}
      return data as CloseoutMilestone[]
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: closeoutProgressKeys.milestones(data[0].project_id) })
      }
    },
  })
}

// =============================================
// Progress Summary Hook
// =============================================

/**
 * Get comprehensive closeout progress summary for a project
 */
export function useCloseoutProgressSummary(projectId: string | undefined) {
  const { data: milestones } = useCloseoutMilestones(projectId)
  const { data: documentStats } = useCloseoutStatistics(projectId)
  const { data: warrantyStats } = useWarrantyStatistics(projectId)
  const { data: omManualStats } = useOMManualStatistics(projectId)
  const { data: atticStockStats } = useAtticStockStatistics(projectId)
  const { data: trainingStats } = useTrainingStatistics(projectId)
  const { data: punchListStatus } = usePunchListCloseout(projectId)

  return useQuery({
    queryKey: closeoutProgressKeys.summary(projectId || ''),
    queryFn: async (): Promise<CloseoutProgressSummary> => {
      // Calculate milestone progress
      const milestonesTotal = milestones?.length || 0
      const milestonesCompleted = milestones?.filter((m) => m.is_complete).length || 0

      // Calculate documents progress
      const documentsTotal = documentStats?.total_documents || 0
      const documentsApproved = documentStats?.approved_count || 0

      // Check training completion
      const trainingComplete = (trainingStats?.scheduled_sessions || 0) === 0 &&
        (trainingStats?.completed_sessions || 0) > 0

      // Check warranties collected
      const warrantiesCollected = (warrantyStats?.active_count || 0) > 0

      // Check attic stock delivered
      const atticStockDelivered = (atticStockStats?.total_items || 0) > 0 &&
        (atticStockStats?.not_delivered || 0) === 0

      // Punch list status
      const punchListTotal = punchListStatus?.total || 0
      const punchListCompleted = punchListStatus?.completed || 0
      const punchListVerified = punchListStatus?.verified || 0

      // Check for Certificate of Occupancy milestone
      const coMilestone = milestones?.find((m) => m.milestone_type === 'certificate_of_occupancy')
      const certificateOfOccupancy = coMilestone?.is_complete || false

      // Calculate owner sign-offs
      const signoffsRequired = milestones?.filter((m) => m.requires_owner_signoff).length || 0
      const signoffsComplete = milestones?.filter((m) => m.requires_owner_signoff && m.owner_signed_off).length || 0

      // Determine outstanding items
      const outstandingItems: string[] = []

      if (punchListTotal > 0 && punchListVerified < punchListTotal) {
        outstandingItems.push(`${punchListTotal - punchListVerified} punch list items pending verification`)
      }

      if (documentsTotal > 0 && documentsApproved < documentsTotal) {
        outstandingItems.push(`${documentsTotal - documentsApproved} closeout documents pending`)
      }

      if (!trainingComplete && (trainingStats?.scheduled_sessions || 0) > 0) {
        outstandingItems.push(`${trainingStats?.scheduled_sessions} training sessions scheduled`)
      }

      if ((atticStockStats?.pending_verification || 0) > 0) {
        outstandingItems.push(`${atticStockStats?.pending_verification} attic stock items pending verification`)
      }

      if (signoffsRequired > signoffsComplete) {
        outstandingItems.push(`${signoffsRequired - signoffsComplete} owner sign-offs pending`)
      }

      // Final payment criteria - check if all key milestones are complete
      const keyMilestones = ['substantial_completion', 'punch_list_complete', 'training_complete', 'om_manuals_delivered', 'warranties_collected']
      const keyMilestonesComplete = keyMilestones.every((type) => {
        const m = milestones?.find((m) => m.milestone_type === type)
        return m?.is_complete
      })

      const finalPaymentCriteriaMet = keyMilestonesComplete &&
        documentsApproved === documentsTotal &&
        punchListVerified === punchListTotal

      // Calculate overall percentage
      const weights = {
        milestones: 30,
        documents: 25,
        punchList: 20,
        training: 10,
        atticStock: 10,
        warranties: 5,
      }

      const milestonePercent = milestonesTotal > 0 ? (milestonesCompleted / milestonesTotal) * 100 : 100
      const documentPercent = documentsTotal > 0 ? (documentsApproved / documentsTotal) * 100 : 100
      const punchListPercent = punchListTotal > 0 ? (punchListVerified / punchListTotal) * 100 : 100
      const trainingPercent = trainingComplete ? 100 : ((trainingStats?.completed_sessions || 0) / Math.max(trainingStats?.total_sessions || 1, 1)) * 100
      const atticStockPercent = (atticStockStats?.total_items || 0) > 0
        ? ((atticStockStats?.owner_verified || 0) / (atticStockStats?.total_items || 1)) * 100
        : 100
      const warrantyPercent = warrantiesCollected ? 100 : 0

      const overallPercentage = Math.round(
        (milestonePercent * weights.milestones +
          documentPercent * weights.documents +
          punchListPercent * weights.punchList +
          trainingPercent * weights.training +
          atticStockPercent * weights.atticStock +
          warrantyPercent * weights.warranties) /
        Object.values(weights).reduce((a, b) => a + b, 0)
      )

      return {
        project_id: projectId || '',
        overall_percentage: overallPercentage,
        milestones_completed: milestonesCompleted,
        milestones_total: milestonesTotal,
        documents_approved: documentsApproved,
        documents_total: documentsTotal,
        training_complete: trainingComplete,
        warranties_collected: warrantiesCollected,
        attic_stock_delivered: atticStockDelivered,
        punch_list_status: {
          total: punchListTotal,
          completed: punchListCompleted,
          verified: punchListVerified,
        },
        outstanding_items: outstandingItems,
        owner_signoffs_required: signoffsRequired,
        owner_signoffs_complete: signoffsComplete,
        certificate_of_occupancy: certificateOfOccupancy,
        final_payment_criteria_met: finalPaymentCriteriaMet,
      }
    },
    enabled: !!projectId && !!milestones,
  })
}
