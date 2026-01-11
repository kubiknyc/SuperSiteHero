/**
 * useTrainingRecords Hook
 *
 * React Query hooks for Training Records functionality.
 * Manages training sessions, attendees, and certificate generation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  TrainingSession,
  TrainingSessionWithDetails,
  TrainingAttendee,
  CreateTrainingSessionDTO,
  UpdateTrainingSessionDTO,
  CreateTrainingAttendeeDTO,
  UpdateTrainingAttendeeDTO,
  TrainingStatistics,
} from '@/types/closeout-extended'

// =============================================
// Query Keys
// =============================================

export const trainingKeys = {
  all: ['training'] as const,
  sessions: (projectId: string) => [...trainingKeys.all, 'sessions', projectId] as const,
  session: (id: string) => [...trainingKeys.all, 'session', id] as const,
  attendees: (sessionId: string) => [...trainingKeys.all, 'attendees', sessionId] as const,
  statistics: (projectId: string) => [...trainingKeys.all, 'statistics', projectId] as const,
}

// =============================================
// Session Hooks
// =============================================

/**
 * Fetch training sessions for a project
 */
export function useTrainingSessions(projectId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.sessions(projectId || ''),
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data: sessions, error } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: false })

      if (error) {throw error}

      // Fetch attendee counts for each session
      const sessionsWithCounts = await Promise.all(
        (sessions || []).map(async (session) => {
          const { count: attendeeCount } = await supabase
            .from('training_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('training_session_id', session.id)

          const { count: signedInCount } = await supabase
            .from('training_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('training_session_id', session.id)
            .eq('signed_in', true)

          const { count: certificatesCount } = await supabase
            .from('training_attendees')
            .select('*', { count: 'exact', head: true })
            .eq('training_session_id', session.id)
            .eq('certificate_generated', true)

          return {
            ...session,
            attendee_count: attendeeCount || 0,
            signed_in_count: signedInCount || 0,
            certificates_generated: certificatesCount || 0,
          } as TrainingSessionWithDetails
        })
      )

      return sessionsWithCounts
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single training session with attendees
 */
export function useTrainingSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.session(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) {throw new Error('Session ID required')}

      const { data: session, error: sessionError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError) {throw sessionError}

      // Fetch attendees
      const { data: attendees, error: attendeesError } = await supabase
        .from('training_attendees')
        .select('*')
        .eq('training_session_id', sessionId)
        .order('attendee_name', { ascending: true })

      if (attendeesError) {throw attendeesError}

      return {
        ...session,
        attendees: attendees || [],
        attendee_count: attendees?.length || 0,
        signed_in_count: attendees?.filter((a) => a.signed_in).length || 0,
        certificates_generated: attendees?.filter((a) => a.certificate_generated).length || 0,
      } as TrainingSessionWithDetails
    },
    enabled: !!sessionId,
  })
}

/**
 * Create a new training session
 */
export function useCreateTrainingSession() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (input: CreateTrainingSessionDTO) => {
      const { data, error } = await supabase
        .from('training_sessions')
        .insert({
          company_id: userProfile?.company_id,
          project_id: input.project_id,
          title: input.title,
          description: input.description || null,
          session_type: input.session_type || null,
          equipment_systems: input.equipment_systems || [],
          spec_sections: input.spec_sections || [],
          scheduled_date: input.scheduled_date || null,
          scheduled_start_time: input.scheduled_start_time || null,
          scheduled_end_time: input.scheduled_end_time || null,
          location: input.location || null,
          status: 'scheduled',
          trainer_name: input.trainer_name || null,
          trainer_company: input.trainer_company || null,
          trainer_contact: input.trainer_contact || null,
          trainer_email: input.trainer_email || null,
          trainer_credentials: input.trainer_credentials || null,
          training_materials_urls: [],
          video_recording_urls: [],
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as TrainingSession
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.sessions(data.project_id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Update a training session
 */
export function useUpdateTrainingSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTrainingSessionDTO & { id: string }) => {
      const { data, error } = await supabase
        .from('training_sessions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as TrainingSession
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.session(data.id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.sessions(data.project_id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Delete a training session (soft delete)
 */
export function useDeleteTrainingSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('training_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select('project_id')
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.sessions(data.project_id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.statistics(data.project_id) })
    },
  })
}

/**
 * Mark a training session as completed
 */
export function useCompleteTrainingSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      actualDurationMinutes,
    }: {
      id: string
      actualDurationMinutes?: number
    }) => {
      const { data, error } = await supabase
        .from('training_sessions')
        .update({
          status: 'completed',
          actual_duration_minutes: actualDurationMinutes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as TrainingSession
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.session(data.id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.sessions(data.project_id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.statistics(data.project_id) })
    },
  })
}

// =============================================
// Attendee Hooks
// =============================================

/**
 * Fetch attendees for a training session
 */
export function useTrainingAttendees(sessionId: string | undefined) {
  return useQuery({
    queryKey: trainingKeys.attendees(sessionId || ''),
    queryFn: async () => {
      if (!sessionId) {throw new Error('Session ID required')}

      const { data, error } = await supabase
        .from('training_attendees')
        .select('*')
        .eq('training_session_id', sessionId)
        .order('attendee_name', { ascending: true })

      if (error) {throw error}
      return data as TrainingAttendee[]
    },
    enabled: !!sessionId,
  })
}

/**
 * Add an attendee to a training session
 */
export function useAddTrainingAttendee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTrainingAttendeeDTO) => {
      const { data, error } = await supabase
        .from('training_attendees')
        .insert({
          training_session_id: input.training_session_id,
          attendee_name: input.attendee_name,
          attendee_email: input.attendee_email || null,
          attendee_phone: input.attendee_phone || null,
          attendee_company: input.attendee_company || null,
          attendee_title: input.attendee_title || null,
          signed_in: false,
          certificate_generated: false,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as TrainingAttendee
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.attendees(data.training_session_id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.session(data.training_session_id) })
    },
  })
}

/**
 * Update an attendee
 */
export function useUpdateTrainingAttendee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTrainingAttendeeDTO & { id: string }) => {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      // Set sign-in time if signing in
      if (updates.signed_in === true) {
        updateData.sign_in_time = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('training_attendees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as TrainingAttendee
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.attendees(data.training_session_id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.session(data.training_session_id) })
    },
  })
}

/**
 * Sign in an attendee
 */
export function useSignInAttendee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      signatureUrl,
    }: {
      id: string
      signatureUrl?: string
    }) => {
      const { data, error } = await supabase
        .from('training_attendees')
        .update({
          signed_in: true,
          sign_in_time: new Date().toISOString(),
          signature_url: signatureUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as TrainingAttendee
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.attendees(data.training_session_id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.session(data.training_session_id) })
    },
  })
}

/**
 * Generate certificate for an attendee
 */
export function useGenerateCertificate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      certificateUrl,
      certificateNumber,
    }: {
      id: string
      certificateUrl: string
      certificateNumber: string
    }) => {
      const { data, error } = await supabase
        .from('training_attendees')
        .update({
          certificate_generated: true,
          certificate_url: certificateUrl,
          certificate_number: certificateNumber,
          certificate_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as TrainingAttendee
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.attendees(data.training_session_id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.session(data.training_session_id) })
    },
  })
}

/**
 * Remove an attendee from a training session
 */
export function useRemoveTrainingAttendee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('training_attendees')
        .delete()
        .eq('id', id)
        .select('training_session_id')
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: trainingKeys.attendees(data.training_session_id) })
      queryClient.invalidateQueries({ queryKey: trainingKeys.session(data.training_session_id) })
    },
  })
}

// =============================================
// Statistics Hook
// =============================================

/**
 * Get training statistics for a project
 */
export function useTrainingStatistics(projectId: string | undefined) {
  const { data: sessions } = useTrainingSessions(projectId)

  return useQuery({
    queryKey: trainingKeys.statistics(projectId || ''),
    queryFn: async (): Promise<TrainingStatistics> => {
      if (!sessions) {
        return {
          total_sessions: 0,
          completed_sessions: 0,
          scheduled_sessions: 0,
          total_attendees: 0,
          certificates_generated: 0,
        }
      }

      const completedSessions = sessions.filter((s) => s.status === 'completed').length
      const scheduledSessions = sessions.filter((s) => s.status === 'scheduled').length
      const totalAttendees = sessions.reduce((sum, s) => sum + (s.attendee_count || 0), 0)
      const certificatesGenerated = sessions.reduce(
        (sum, s) => sum + (s.certificates_generated || 0),
        0
      )

      return {
        total_sessions: sessions.length,
        completed_sessions: completedSessions,
        scheduled_sessions: scheduledSessions,
        total_attendees: totalAttendees,
        certificates_generated: certificatesGenerated,
      }
    },
    enabled: !!projectId && !!sessions,
  })
}
