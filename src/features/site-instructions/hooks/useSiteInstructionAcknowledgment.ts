// File: /src/features/site-instructions/hooks/useSiteInstructionAcknowledgment.ts
// Hooks for site instruction acknowledgment workflow
// Milestone 1.2: Site Instructions QR Code Workflow

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { siteInstructionKeys } from './useSiteInstructions'
import {
  useOfflineAcknowledgmentStore,
  captureDeviceInfo,
} from '../store/offlineAcknowledgmentStore'
import type {
  SiteInstructionAcknowledgment,
  CreateAcknowledgmentInput,
  QRTokenResponse,
  SiteInstructionWithQR,
} from '@/types/site-instruction-acknowledgment'

// Query keys for acknowledgments
export const acknowledgmentKeys = {
  all: ['site-instruction-acknowledgments'] as const,
  byInstruction: (instructionId: string) =>
    [...acknowledgmentKeys.all, 'instruction', instructionId] as const,
  byUser: (userId: string) =>
    [...acknowledgmentKeys.all, 'user', userId] as const,
  pending: (userId: string) =>
    [...acknowledgmentKeys.all, 'pending', userId] as const,
  byQRToken: (token: string) =>
    [...siteInstructionKeys.all, 'qr-token', token] as const,
}

/**
 * Fetch all acknowledgments for a site instruction
 */
export function useAcknowledgmentsByInstruction(instructionId: string) {
  return useQuery({
    queryKey: acknowledgmentKeys.byInstruction(instructionId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('site_instruction_acknowledgments')
        .select('*')
        .eq('site_instruction_id', instructionId)
        .order('acknowledged_at', { ascending: false })

      if (error) {throw error}

      // Fetch user info for each acknowledgment
      const results = await Promise.all(
        (data || []).map(async (ack: SiteInstructionAcknowledgment) => {
          let acknowledged_by_user = null
          if (ack.acknowledged_by) {
            const { data: user } = await supabase
              .from('users')
              .select('id, full_name, email')
              .eq('id', ack.acknowledged_by)
              .single()
            acknowledged_by_user = user
          }
          return {
            ...ack,
            acknowledged_by_user,
          }
        })
      )

      return results as SiteInstructionAcknowledgment[]
    },
    enabled: !!instructionId,
  })
}

/**
 * Fetch acknowledgments by the current user
 */
export function useAcknowledgmentsByUser(userId: string) {
  return useQuery({
    queryKey: acknowledgmentKeys.byUser(userId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('site_instruction_acknowledgments')
        .select(`
          *,
          site_instruction:site_instructions(
            id,
            title,
            reference_number,
            status,
            priority,
            due_date,
            project:projects(id, name)
          )
        `)
        .eq('acknowledged_by', userId)
        .order('acknowledged_at', { ascending: false })

      if (error) {throw error}
      return data as (SiteInstructionAcknowledgment & {
        site_instruction: SiteInstructionWithQR
      })[]
    },
    enabled: !!userId,
  })
}

/**
 * Fetch instructions pending acknowledgment for a user
 */
export function usePendingAcknowledgments(userId: string) {
  return useQuery({
    queryKey: acknowledgmentKeys.pending(userId),
    queryFn: async () => {
      // Get all project IDs the user has access to
      const { data: projectUsers, error: puError } = await supabase
        .from('project_users')
        .select('project_id')
        .eq('user_id', userId)

      if (puError) {throw puError}

      const projectIds = (projectUsers || []).map((pu) => pu.project_id)

      if (projectIds.length === 0) {return []}

      // Get issued instructions that the user hasn't acknowledged
      const { data: instructions, error } = await supabase
        .from('site_instructions')
        .select(`
          *,
          project:projects(id, name),
          subcontractor:contacts(id, company_name, contact_name)
        `)
        .in('project_id', projectIds)
        .eq('status', 'issued')
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (error) {throw error}

      // Filter out instructions the user has already acknowledged
      const results = await Promise.all(
        (instructions || []).map(async (instruction) => {
          const { data: existingAck } = await (supabase as any)
            .from('site_instruction_acknowledgments')
            .select('id')
            .eq('site_instruction_id', instruction.id)
            .eq('acknowledged_by', userId)
            .single()

          if (existingAck) {return null}
          return instruction
        })
      )

      return results.filter(Boolean) as SiteInstructionWithQR[]
    },
    enabled: !!userId,
  })
}

/**
 * Create a new acknowledgment
 */
export function useCreateAcknowledgment() {
  const queryClient = useQueryClient()
  const offlineStore = useOfflineAcknowledgmentStore()

  return useMutation({
    mutationFn: async (input: CreateAcknowledgmentInput) => {
      // Check if online
      const isOnline = navigator.onLine

      // Capture device info
      const deviceInfo = input.device_info || captureDeviceInfo()

      if (!isOnline) {
        // Store offline
        const offlineId = offlineStore.addAcknowledgment({
          site_instruction_id: input.site_instruction_id,
          acknowledged_by: input.acknowledged_by,
          acknowledged_by_name: input.acknowledged_by_name || 'Unknown',
          acknowledged_at: new Date().toISOString(),
          signature_data: input.signature_data,
          location_lat: input.location_lat,
          location_lng: input.location_lng,
          location_accuracy: input.location_accuracy,
          photo_ids: input.photo_ids,
          notes: input.notes,
          device_info: deviceInfo,
        })

        return {
          id: offlineId,
          is_offline: true,
          site_instruction_id: input.site_instruction_id,
        }
      }

      // Online submission
      const { data, error } = await (supabase as any)
        .from('site_instruction_acknowledgments')
        .insert({
          site_instruction_id: input.site_instruction_id,
          acknowledged_by: input.acknowledged_by,
          acknowledged_by_name: input.acknowledged_by_name,
          signature_data: input.signature_data,
          location_lat: input.location_lat,
          location_lng: input.location_lng,
          location_accuracy: input.location_accuracy,
          photo_ids: input.photo_ids,
          notes: input.notes,
          device_info: deviceInfo,
          is_offline_submission: input.is_offline_submission || false,
          offline_submitted_at: input.offline_submitted_at,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as SiteInstructionAcknowledgment
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: acknowledgmentKeys.byInstruction(variables.site_instruction_id),
      })
      if (variables.acknowledged_by) {
        queryClient.invalidateQueries({
          queryKey: acknowledgmentKeys.byUser(variables.acknowledged_by),
        })
        queryClient.invalidateQueries({
          queryKey: acknowledgmentKeys.pending(variables.acknowledged_by),
        })
      }
      // Also invalidate the instruction detail to update acknowledgment count
      queryClient.invalidateQueries({
        queryKey: siteInstructionKeys.detail(variables.site_instruction_id),
      })
    },
  })
}

/**
 * Generate or refresh QR code token for an instruction
 */
export function useGenerateQRCodeToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      instructionId,
      expiresInDays = 30,
    }: {
      instructionId: string
      expiresInDays?: number
    }) => {
      // Call the database function to refresh the token
      const { data, error } = await supabase.rpc('refresh_site_instruction_qr_token', {
        instruction_id: instructionId,
        expires_in_days: expiresInDays,
      })

      if (error) {throw error}
      return data[0] as QRTokenResponse
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: siteInstructionKeys.detail(variables.instructionId),
      })
    },
  })
}

/**
 * Fetch instruction by QR token (for mobile acknowledgment page)
 */
export function useInstructionByQRToken(token: string) {
  return useQuery({
    queryKey: acknowledgmentKeys.byQRToken(token),
    queryFn: async () => {
      // Use the database function to get the instruction
      const { data, error } = await supabase.rpc('get_site_instruction_by_qr_token', {
        token,
      })

      if (error) {throw error}
      if (!data || data.length === 0) {
        throw new Error('Invalid or expired QR code')
      }

      const instruction = data[0]

      // Fetch related data
      let subcontractor = null
      let project = null

      if (instruction.subcontractor_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, company_name, contact_name')
          .eq('id', instruction.subcontractor_id)
          .single()
        subcontractor = contact
      }

      if (instruction.project_id) {
        const { data: proj } = await supabase
          .from('projects')
          .select('id, name')
          .eq('id', instruction.project_id)
          .single()
        project = proj
      }

      return {
        ...instruction,
        subcontractor,
        project,
      } as SiteInstructionWithQR
    },
    enabled: !!token && token.length > 0,
    retry: false, // Don't retry on invalid token
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Update QR code expiration
 */
export function useUpdateQRExpiration() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      instructionId,
      expiresAt,
    }: {
      instructionId: string
      expiresAt: string | null
    }) => {
      const { data, error } = await supabase
        .from('site_instructions')
        .update({ qr_code_expires_at: expiresAt } as any)
        .eq('id', instructionId)
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: siteInstructionKeys.detail(variables.instructionId),
      })
    },
  })
}

/**
 * Sync offline acknowledgments
 */
export function useSyncOfflineAcknowledgments() {
  const queryClient = useQueryClient()
  const offlineStore = useOfflineAcknowledgmentStore()

  return useMutation({
    mutationFn: async () => {
      const unsyncedAcknowledgments = offlineStore.getUnsyncedAcknowledgments()
      const results: { success: string[]; failed: string[] } = {
        success: [],
        failed: [],
      }

      for (const ack of unsyncedAcknowledgments) {
        try {
          const { data, error } = await (supabase as any)
            .from('site_instruction_acknowledgments')
            .insert({
              site_instruction_id: ack.site_instruction_id,
              acknowledged_by: ack.acknowledged_by,
              acknowledged_by_name: ack.acknowledged_by_name,
              signature_data: ack.signature_data,
              location_lat: ack.location_lat,
              location_lng: ack.location_lng,
              location_accuracy: ack.location_accuracy,
              photo_ids: ack.photo_ids,
              notes: ack.notes,
              device_info: ack.device_info,
              is_offline_submission: true,
              offline_submitted_at: ack.acknowledged_at,
              synced_at: new Date().toISOString(),
            })
            .select()
            .single()

          if (error) {throw error}

          offlineStore.markSynced(ack.id, data.id)
          results.success.push(ack.id)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          offlineStore.markSyncError(ack.id, errorMessage)
          results.failed.push(ack.id)
        }
      }

      return results
    },
    onSuccess: () => {
      // Invalidate all acknowledgment queries
      queryClient.invalidateQueries({ queryKey: acknowledgmentKeys.all })
    },
  })
}

/**
 * Get acknowledgment count for an instruction
 */
export function useAcknowledgmentCount(instructionId: string) {
  return useQuery({
    queryKey: [...acknowledgmentKeys.byInstruction(instructionId), 'count'],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from('site_instruction_acknowledgments')
        .select('*', { count: 'exact', head: true })
        .eq('site_instruction_id', instructionId)

      if (error) {throw error}
      return count || 0
    },
    enabled: !!instructionId,
  })
}
