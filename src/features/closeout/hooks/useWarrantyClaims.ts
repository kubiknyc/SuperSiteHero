/**
 * useWarrantyClaims Hook
 *
 * React Query hooks for Warranty Claims functionality.
 * Manages warranty claim submission, tracking, and resolution.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  WarrantyClaim,
  WarrantyClaimWithDetails,
  WarrantyClaimActivity,
  CreateWarrantyClaimDTO,
  UpdateWarrantyClaimDTO,
  WarrantyClaimStatistics,
  WarrantyClaimStatus,
  WarrantyClaimPriority,
} from '@/types/closeout-extended'

// =============================================
// Query Keys
// =============================================

export const warrantyClaimKeys = {
  all: ['warranty-claims'] as const,
  claims: (projectId: string) => [...warrantyClaimKeys.all, 'claims', projectId] as const,
  claim: (id: string) => [...warrantyClaimKeys.all, 'claim', id] as const,
  activities: (claimId: string) => [...warrantyClaimKeys.all, 'activities', claimId] as const,
  byWarranty: (warrantyId: string) => [...warrantyClaimKeys.all, 'by-warranty', warrantyId] as const,
  statistics: (projectId: string) => [...warrantyClaimKeys.all, 'statistics', projectId] as const,
}

// =============================================
// Claim Hooks
// =============================================

/**
 * Fetch warranty claims for a project
 */
export function useWarrantyClaims(projectId: string | undefined) {
  return useQuery({
    queryKey: warrantyClaimKeys.claims(projectId || ''),
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('warranty_claims')
        .select(`
          *,
          warranty:warranties!warranty_claims_warranty_id_fkey(
            id, title, warranty_type, end_date, manufacturer_name, subcontractor_id
          ),
          project:projects!warranty_claims_project_id_fkey(id, name)
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as WarrantyClaimWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch warranty claims for a specific warranty
 */
export function useWarrantyClaimsByWarranty(warrantyId: string | undefined) {
  return useQuery({
    queryKey: warrantyClaimKeys.byWarranty(warrantyId || ''),
    queryFn: async () => {
      if (!warrantyId) {throw new Error('Warranty ID required')}

      const { data, error } = await supabase
        .from('warranty_claims')
        .select(`
          *,
          warranty:warranties!warranty_claims_warranty_id_fkey(
            id, title, warranty_type, end_date, manufacturer_name
          )
        `)
        .eq('warranty_id', warrantyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as WarrantyClaimWithDetails[]
    },
    enabled: !!warrantyId,
  })
}

/**
 * Fetch a single warranty claim with activities
 */
export function useWarrantyClaim(claimId: string | undefined) {
  return useQuery({
    queryKey: warrantyClaimKeys.claim(claimId || ''),
    queryFn: async () => {
      if (!claimId) {throw new Error('Claim ID required')}

      const { data: claim, error: claimError } = await supabase
        .from('warranty_claims')
        .select(`
          *,
          warranty:warranties!warranty_claims_warranty_id_fkey(
            id, title, warranty_type, end_date, manufacturer_name, subcontractor_id
          ),
          project:projects!warranty_claims_project_id_fkey(id, name)
        `)
        .eq('id', claimId)
        .single()

      if (claimError) {throw claimError}

      // Fetch activities
      const { data: activities, error: activitiesError } = await supabase
        .from('warranty_claim_activities')
        .select('*')
        .eq('warranty_claim_id', claimId)
        .order('created_at', { ascending: false })

      if (activitiesError) {throw activitiesError}

      return {
        ...claim,
        activities: activities || [],
      } as WarrantyClaimWithDetails
    },
    enabled: !!claimId,
  })
}

/**
 * Create a new warranty claim
 */
export function useCreateWarrantyClaim() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateWarrantyClaimDTO) => {
      const { data, error } = await supabase
        .from('warranty_claims')
        .insert({
          company_id: userProfile?.company_id,
          project_id: input.project_id,
          warranty_id: input.warranty_id,
          title: input.title,
          description: input.description,
          issue_date: input.issue_date,
          issue_discovered_by: input.issue_discovered_by || null,
          issue_location: input.issue_location || null,
          status: 'open',
          priority: input.priority || 'medium',
          photo_urls: input.photo_urls || [],
          document_urls: [],
          resolution_photos: [],
          owner_signed_off: false,
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) {throw error}

      // Create initial activity
      await supabase.from('warranty_claim_activities').insert({
        warranty_claim_id: data.id,
        activity_type: 'status_change',
        new_status: 'open',
        description: 'Warranty claim created',
        created_by: userProfile?.id,
        created_by_name: userProfile?.full_name,
      })

      return data as WarrantyClaim
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claims(data.project_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.byWarranty(data.warranty_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Update a warranty claim
 */
export function useUpdateWarrantyClaim() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateWarrantyClaimDTO & { id: string }) => {
      // Get current claim to check for status change
      const { data: currentClaim } = await supabase
        .from('warranty_claims')
        .select('status, project_id, warranty_id')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('warranty_claims')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      // Create activity for status change
      if (updates.status && updates.status !== currentClaim?.status) {
        await supabase.from('warranty_claim_activities').insert({
          warranty_claim_id: id,
          activity_type: 'status_change',
          previous_status: currentClaim?.status,
          new_status: updates.status,
          description: `Status changed from ${currentClaim?.status} to ${updates.status}`,
          created_by: userProfile?.id,
          created_by_name: userProfile?.full_name,
        })
      }

      return data as WarrantyClaim
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claim(data.id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claims(data.project_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.byWarranty(data.warranty_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Delete a warranty claim (soft delete)
 */
export function useDeleteWarrantyClaim() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('warranty_claims')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('project_id, warranty_id')
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claims(data.project_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.byWarranty(data.warranty_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.statistics(data.project_id) })
    },
  })
}

// =============================================
// Claim Status Actions
// =============================================

/**
 * Submit a claim to the contractor
 */
export function useSubmitWarrantyClaim() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      contactName,
      contactPhone,
      contactEmail,
    }: {
      id: string
      contactName?: string
      contactPhone?: string
      contactEmail?: string
    }) => {
      const { data, error } = await supabase
        .from('warranty_claims')
        .update({
          status: 'submitted',
          contractor_contacted_date: new Date().toISOString().split('T')[0],
          contractor_contact_name: contactName || null,
          contractor_contact_phone: contactPhone || null,
          contractor_contact_email: contactEmail || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      // Create activity
      await supabase.from('warranty_claim_activities').insert({
        warranty_claim_id: id,
        activity_type: 'status_change',
        previous_status: 'open',
        new_status: 'submitted',
        description: `Claim submitted to contractor${contactName ? ` (${contactName})` : ''}`,
        created_by: userProfile?.id,
        created_by_name: userProfile?.full_name,
      })

      return data as WarrantyClaim
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claim(data.id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claims(data.project_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Record contractor response
 */
export function useRecordContractorResponse() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      response,
      estimatedResolutionDate,
    }: {
      id: string
      response: string
      estimatedResolutionDate?: string
    }) => {
      const { data, error } = await supabase
        .from('warranty_claims')
        .update({
          status: 'in_progress',
          contractor_response_date: new Date().toISOString().split('T')[0],
          contractor_response: response,
          estimated_resolution_date: estimatedResolutionDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      // Create activity
      await supabase.from('warranty_claim_activities').insert({
        warranty_claim_id: id,
        activity_type: 'contractor_response',
        new_status: 'in_progress',
        description: response,
        created_by: userProfile?.id,
        created_by_name: userProfile?.full_name,
      })

      return data as WarrantyClaim
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claim(data.id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claims(data.project_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Resolve a warranty claim
 */
export function useResolveWarrantyClaim() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      resolutionDescription,
      resolutionSatisfactory,
      resolutionPhotos,
      actualCost,
    }: {
      id: string
      resolutionDescription: string
      resolutionSatisfactory: boolean
      resolutionPhotos?: string[]
      actualCost?: number
    }) => {
      const { data, error } = await supabase
        .from('warranty_claims')
        .update({
          status: 'resolved',
          resolution_date: new Date().toISOString().split('T')[0],
          resolution_description: resolutionDescription,
          resolution_satisfactory: resolutionSatisfactory,
          resolution_photos: resolutionPhotos || [],
          actual_cost: actualCost || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      // Create activity
      await supabase.from('warranty_claim_activities').insert({
        warranty_claim_id: id,
        activity_type: 'resolution_update',
        new_status: 'resolved',
        description: resolutionDescription,
        created_by: userProfile?.id,
        created_by_name: userProfile?.full_name,
      })

      return data as WarrantyClaim
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claim(data.id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claims(data.project_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Deny a warranty claim
 */
export function useDenyWarrantyClaim() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      denialReason,
    }: {
      id: string
      denialReason: string
    }) => {
      const { data, error } = await supabase
        .from('warranty_claims')
        .update({
          status: 'denied',
          denial_date: new Date().toISOString().split('T')[0],
          denial_reason: denialReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      // Create activity
      await supabase.from('warranty_claim_activities').insert({
        warranty_claim_id: id,
        activity_type: 'status_change',
        new_status: 'denied',
        description: `Claim denied: ${denialReason}`,
        created_by: userProfile?.id,
        created_by_name: userProfile?.full_name,
      })

      return data as WarrantyClaim
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claim(data.id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claims(data.project_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Owner sign-off on resolved claim
 */
export function useOwnerSignOffClaim() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('warranty_claims')
        .update({
          status: 'closed',
          owner_signed_off: true,
          owner_sign_off_date: new Date().toISOString(),
          owner_sign_off_by: userProfile?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      // Create activity
      await supabase.from('warranty_claim_activities').insert({
        warranty_claim_id: id,
        activity_type: 'status_change',
        new_status: 'closed',
        description: 'Owner signed off on resolution',
        created_by: userProfile?.id,
        created_by_name: userProfile?.full_name,
      })

      return data as WarrantyClaim
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claim(data.id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claims(data.project_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.statistics(data.project_id) })
    },
  })
}

// =============================================
// Activity Hooks
// =============================================

/**
 * Fetch activities for a warranty claim
 */
export function useWarrantyClaimActivities(claimId: string | undefined) {
  return useQuery({
    queryKey: warrantyClaimKeys.activities(claimId || ''),
    queryFn: async () => {
      if (!claimId) {throw new Error('Claim ID required')}

      const { data, error } = await supabase
        .from('warranty_claim_activities')
        .select('*')
        .eq('warranty_claim_id', claimId)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as WarrantyClaimActivity[]
    },
    enabled: !!claimId,
  })
}

/**
 * Add a note/activity to a claim
 */
export function useAddClaimActivity() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      claimId,
      activityType,
      description,
    }: {
      claimId: string
      activityType: 'note_added' | 'call_logged' | 'email_sent' | 'other'
      description: string
    }) => {
      const { data, error } = await supabase
        .from('warranty_claim_activities')
        .insert({
          warranty_claim_id: claimId,
          activity_type: activityType,
          description,
          created_by: userProfile?.id,
          created_by_name: userProfile?.full_name,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as WarrantyClaimActivity
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.activities(data.warranty_claim_id) })
      queryClient.invalidateQueries({ queryKey: warrantyClaimKeys.claim(data.warranty_claim_id) })
    },
  })
}

// =============================================
// Statistics Hook
// =============================================

/**
 * Get warranty claim statistics for a project
 */
export function useWarrantyClaimStatistics(projectId: string | undefined) {
  const { data: claims } = useWarrantyClaims(projectId)

  return useQuery({
    queryKey: warrantyClaimKeys.statistics(projectId || ''),
    queryFn: async (): Promise<WarrantyClaimStatistics> => {
      if (!claims) {
        return {
          total_claims: 0,
          open_claims: 0,
          in_progress_claims: 0,
          resolved_claims: 0,
          denied_claims: 0,
          by_priority: {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
          },
        }
      }

      const openClaims = claims.filter(
        (c) => c.status === 'open' || c.status === 'submitted'
      ).length

      const inProgressClaims = claims.filter(
        (c) => c.status === 'in_progress' || c.status === 'pending_parts' || c.status === 'scheduled'
      ).length

      const resolvedClaims = claims.filter(
        (c) => c.status === 'resolved' || c.status === 'closed'
      ).length

      const deniedClaims = claims.filter((c) => c.status === 'denied').length

      const byPriority: Record<WarrantyClaimPriority, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      }

      claims.forEach((c) => {
        if (c.priority && byPriority[c.priority] !== undefined) {
          byPriority[c.priority]++
        }
      })

      return {
        total_claims: claims.length,
        open_claims: openClaims,
        in_progress_claims: inProgressClaims,
        resolved_claims: resolvedClaims,
        denied_claims: deniedClaims,
        by_priority: byPriority,
      }
    },
    enabled: !!projectId && !!claims,
  })
}
