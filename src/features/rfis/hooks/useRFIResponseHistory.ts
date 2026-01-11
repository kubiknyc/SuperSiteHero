/**
 * Hook for managing RFI response history and revisions
 * Tracks "Official Response" vs "Discussion" types with version history
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'

// =============================================
// Types
// =============================================

export type ResponseType = 'official' | 'discussion'

export type ResponseActionType =
  | 'answered'
  | 'see_drawings'
  | 'see_specs'
  | 'deferred'
  | 'partial_response'
  | 'request_clarification'
  | 'no_change_required'

export interface RFIResponse {
  id: string
  rfi_id: string
  response_text: string
  response_type: ResponseType
  action_type: ResponseActionType | null
  version_number: number
  is_current_version: boolean
  supersedes_id: string | null
  superseded_by_id: string | null
  responder_company: string | null
  responder_title: string | null
  attachment_ids: string[]
  responded_at: string
  responded_by: string | null
  created_at: string
  updated_at: string
  // Joined data
  responded_by_user?: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    company?: { name: string } | null
  }
}

export interface CreateRFIResponseInput {
  rfi_id: string
  response_text: string
  response_type: ResponseType
  action_type?: ResponseActionType
  responder_company?: string
  responder_title?: string
  attachment_ids?: string[]
}

export interface UpdateRFIResponseInput {
  response_text: string
  action_type?: ResponseActionType
}

// =============================================
// Query Keys
// =============================================

export const rfiResponseKeys = {
  all: ['rfi-responses'] as const,
  byRFI: (rfiId: string) => [...rfiResponseKeys.all, 'rfi', rfiId] as const,
  history: (rfiId: string) => [...rfiResponseKeys.all, 'history', rfiId] as const,
  current: (rfiId: string) => [...rfiResponseKeys.all, 'current', rfiId] as const,
  detail: (responseId: string) => [...rfiResponseKeys.all, 'detail', responseId] as const,
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all responses for an RFI (current versions only)
 */
export function useRFIResponses(rfiId: string | undefined) {
  return useQuery({
    queryKey: rfiResponseKeys.byRFI(rfiId || ''),
    queryFn: async () => {
      if (!rfiId) {throw new Error('RFI ID required')}

      const { data, error } = await supabase
        .from('rfi_responses')
        .select(
          `
          *,
          responded_by_user:users!rfi_responses_responded_by_fkey(
            id,
            full_name,
            email,
            avatar_url,
            company:companies(name)
          )
        `
        )
        .eq('rfi_id', rfiId)
        .eq('is_current_version', true)
        .order('responded_at', { ascending: false })

      if (error) {throw error}
      return data as RFIResponse[]
    },
    enabled: !!rfiId,
  })
}

/**
 * Fetch complete response history for an RFI (including superseded versions)
 */
export function useRFIResponseHistory(rfiId: string | undefined) {
  return useQuery({
    queryKey: rfiResponseKeys.history(rfiId || ''),
    queryFn: async () => {
      if (!rfiId) {throw new Error('RFI ID required')}

      const { data, error } = await supabase
        .from('rfi_responses')
        .select(
          `
          *,
          responded_by_user:users!rfi_responses_responded_by_fkey(
            id,
            full_name,
            email,
            avatar_url,
            company:companies(name)
          )
        `
        )
        .eq('rfi_id', rfiId)
        .order('responded_at', { ascending: false })
        .order('version_number', { ascending: false })

      if (error) {throw error}
      return data as RFIResponse[]
    },
    enabled: !!rfiId,
  })
}

/**
 * Fetch the current official response for an RFI
 */
export function useCurrentOfficialResponse(rfiId: string | undefined) {
  return useQuery({
    queryKey: rfiResponseKeys.current(rfiId || ''),
    queryFn: async () => {
      if (!rfiId) {throw new Error('RFI ID required')}

      const { data, error } = await supabase
        .from('rfi_responses')
        .select(
          `
          *,
          responded_by_user:users!rfi_responses_responded_by_fkey(
            id,
            full_name,
            email,
            avatar_url,
            company:companies(name)
          )
        `
        )
        .eq('rfi_id', rfiId)
        .eq('response_type', 'official')
        .eq('is_current_version', true)
        .order('responded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {throw error}
      return data as RFIResponse | null
    },
    enabled: !!rfiId,
  })
}

/**
 * Fetch revision history for a specific response
 */
export function useResponseRevisionHistory(responseId: string | undefined) {
  return useQuery({
    queryKey: rfiResponseKeys.detail(responseId || ''),
    queryFn: async () => {
      if (!responseId) {throw new Error('Response ID required')}

      // Get the response to find its chain
      const { data: response, error: responseError } = await supabase
        .from('rfi_responses')
        .select('rfi_id, response_type')
        .eq('id', responseId)
        .single()

      if (responseError) {throw responseError}

      // Get all versions of this response type for the RFI
      const { data, error } = await supabase
        .from('rfi_responses')
        .select(
          `
          *,
          responded_by_user:users!rfi_responses_responded_by_fkey(
            id,
            full_name,
            email,
            avatar_url
          )
        `
        )
        .eq('rfi_id', response.rfi_id)
        .eq('response_type', response.response_type)
        .order('version_number', { ascending: false })

      if (error) {throw error}
      return data as RFIResponse[]
    },
    enabled: !!responseId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Add a new response to an RFI
 */
export function useAddRFIResponse() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateRFIResponseInput) => {
      const { data, error } = await supabase
        .from('rfi_responses')
        .insert({
          rfi_id: input.rfi_id,
          response_text: input.response_text,
          response_type: input.response_type,
          action_type: input.action_type || null,
          responder_company: input.responder_company || userProfile?.company?.name || null,
          responder_title: input.responder_title || null,
          attachment_ids: input.attachment_ids || [],
          responded_by: userProfile?.id,
          version_number: 1,
          is_current_version: true,
        })
        .select(
          `
          *,
          responded_by_user:users!rfi_responses_responded_by_fkey(
            id,
            full_name,
            email,
            avatar_url,
            company:companies(name)
          )
        `
        )
        .single()

      if (error) {throw error}

      // If this is an official response, update the RFI status
      if (input.response_type === 'official') {
        await supabase
          .from('rfis')
          .update({
            status: 'responded',
            date_responded: new Date().toISOString(),
            responded_by: userProfile?.id,
            official_response_id: data.id,
            response: input.response_text,
          })
          .eq('id', input.rfi_id)
      }

      return data as RFIResponse
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiResponseKeys.byRFI(data.rfi_id) })
      queryClient.invalidateQueries({ queryKey: rfiResponseKeys.history(data.rfi_id) })
      queryClient.invalidateQueries({ queryKey: rfiResponseKeys.current(data.rfi_id) })
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })
    },
  })
}

/**
 * Create a revision of an existing response (supersedes previous version)
 */
export function useReviseRFIResponse() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      responseId,
      rfiId,
      ...updates
    }: UpdateRFIResponseInput & { responseId: string; rfiId: string }) => {
      // Use the database function to create revision
      const { data: newResponseId, error } = await supabase.rpc('create_response_revision', {
        p_original_response_id: responseId,
        p_new_response_text: updates.response_text,
        p_user_id: userProfile?.id,
      })

      if (error) {throw error}

      // Fetch the new response
      const { data: newResponse, error: fetchError } = await supabase
        .from('rfi_responses')
        .select(
          `
          *,
          responded_by_user:users!rfi_responses_responded_by_fkey(
            id,
            full_name,
            email,
            avatar_url,
            company:companies(name)
          )
        `
        )
        .eq('id', newResponseId)
        .single()

      if (fetchError) {throw fetchError}

      // Update action type if provided
      if (updates.action_type) {
        await supabase
          .from('rfi_responses')
          .update({ action_type: updates.action_type })
          .eq('id', newResponseId)
      }

      return { ...newResponse, rfiId } as RFIResponse & { rfiId: string }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiResponseKeys.byRFI(data.rfiId) })
      queryClient.invalidateQueries({ queryKey: rfiResponseKeys.history(data.rfiId) })
      queryClient.invalidateQueries({ queryKey: rfiResponseKeys.current(data.rfiId) })
      queryClient.invalidateQueries({ queryKey: ['dedicated-rfis'] })
    },
  })
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get label for response type
 */
export function getResponseTypeLabel(type: ResponseType): string {
  return type === 'official' ? 'Official Response' : 'Discussion'
}

/**
 * Get color class for response type badge
 */
export function getResponseTypeColor(type: ResponseType): string {
  return type === 'official' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
}

/**
 * Get label for response action type
 */
export function getActionTypeLabel(actionType: ResponseActionType | null): string {
  if (!actionType) {return ''}

  const labels: Record<ResponseActionType, string> = {
    answered: 'Answered',
    see_drawings: 'See Drawings',
    see_specs: 'See Specifications',
    deferred: 'Deferred',
    partial_response: 'Partial Response',
    request_clarification: 'Request Clarification',
    no_change_required: 'No Change Required',
  }

  return labels[actionType] || actionType
}

/**
 * Get color for action type badge
 */
export function getActionTypeColor(actionType: ResponseActionType | null): string {
  if (!actionType) {return 'bg-gray-100 text-gray-800'}

  const colors: Record<ResponseActionType, string> = {
    answered: 'bg-green-100 text-green-800',
    see_drawings: 'bg-purple-100 text-purple-800',
    see_specs: 'bg-indigo-100 text-indigo-800',
    deferred: 'bg-yellow-100 text-yellow-800',
    partial_response: 'bg-orange-100 text-orange-800',
    request_clarification: 'bg-amber-100 text-amber-800',
    no_change_required: 'bg-gray-100 text-gray-800',
  }

  return colors[actionType] || 'bg-gray-100 text-gray-800'
}

/**
 * Check if a response has been superseded
 */
export function isSuperseded(response: RFIResponse): boolean {
  return !response.is_current_version || response.superseded_by_id !== null
}

/**
 * Get version label (e.g., "v1", "v2 (Current)")
 */
export function getVersionLabel(response: RFIResponse): string {
  const base = `v${response.version_number}`
  return response.is_current_version ? `${base} (Current)` : base
}
