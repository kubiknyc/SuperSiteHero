/**
 * Toolbox Talks React Query Hooks
 *
 * Provides data fetching and mutation hooks for toolbox talk management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/lib/notifications/ToastContext'
import {
  toolboxTopicsApi,
  toolboxTalksApi,
  toolboxAttendeesApi,
  toolboxCertificationsApi,
  toolboxStatsApi,
} from '@/lib/api/services/toolbox-talks'
import type {
  CreateToolboxTopicDTO,
  UpdateToolboxTopicDTO,
  CreateToolboxTalkDTO,
  UpdateToolboxTalkDTO,
  StartToolboxTalkDTO,
  CompleteToolboxTalkDTO,
  CreateToolboxAttendeeDTO,
  SignInAttendeeDTO,
  BulkAddAttendeesDTO,
  ToolboxTalkFilters,
  ToolboxTopicFilters,
  CertificationFilters,
} from '@/types/toolbox-talks'

// ============================================================================
// Query Keys
// ============================================================================

export const toolboxKeys = {
  all: ['toolbox-talks'] as const,

  // Topics
  topics: () => [...toolboxKeys.all, 'topics'] as const,
  topicList: (filters: ToolboxTopicFilters) => [...toolboxKeys.topics(), 'list', filters] as const,
  topicDetail: (id: string) => [...toolboxKeys.topics(), 'detail', id] as const,
  topicsByCategory: (companyId: string | null) =>
    [...toolboxKeys.topics(), 'by-category', companyId] as const,

  // Talks
  talks: () => [...toolboxKeys.all, 'talks'] as const,
  talkList: (filters: ToolboxTalkFilters) => [...toolboxKeys.talks(), 'list', filters] as const,
  talkDetail: (id: string) => [...toolboxKeys.talks(), 'detail', id] as const,
  talkWithDetails: (id: string) => [...toolboxKeys.talks(), 'with-details', id] as const,
  upcomingTalks: (projectId: string, days?: number) =>
    [...toolboxKeys.talks(), 'upcoming', projectId, days] as const,
  recentTalks: (projectId: string, limit?: number) =>
    [...toolboxKeys.talks(), 'recent', projectId, limit] as const,

  // Attendees
  attendees: (talkId: string) => [...toolboxKeys.all, 'attendees', talkId] as const,

  // Certifications
  certifications: () => [...toolboxKeys.all, 'certifications'] as const,
  certificationList: (filters: CertificationFilters) =>
    [...toolboxKeys.certifications(), 'list', filters] as const,
  workerCertifications: (companyId: string, workerName: string) =>
    [...toolboxKeys.certifications(), 'worker', companyId, workerName] as const,
  expiringCertifications: (companyId: string, days?: number) =>
    [...toolboxKeys.certifications(), 'expiring', companyId, days] as const,

  // Stats
  stats: () => [...toolboxKeys.all, 'stats'] as const,
  projectStats: (projectId: string) => [...toolboxKeys.stats(), 'project', projectId] as const,
  compliance: (companyId: string) => [...toolboxKeys.stats(), 'compliance', companyId] as const,
  attendanceRate: (projectId: string, days?: number) =>
    [...toolboxKeys.stats(), 'attendance-rate', projectId, days] as const,
}

// ============================================================================
// Topic Query Hooks
// ============================================================================

/**
 * Fetch topics with optional filters
 */
export function useToolboxTopics(filters: ToolboxTopicFilters = {}) {
  return useQuery({
    queryKey: toolboxKeys.topicList(filters),
    queryFn: () => toolboxTopicsApi.getTopics(filters),
  })
}

/**
 * Fetch a single topic
 */
export function useToolboxTopic(id: string) {
  return useQuery({
    queryKey: toolboxKeys.topicDetail(id),
    queryFn: () => toolboxTopicsApi.getTopic(id),
    enabled: !!id,
  })
}

/**
 * Fetch topics grouped by category
 */
export function useToolboxTopicsByCategory(companyId: string | null) {
  return useQuery({
    queryKey: toolboxKeys.topicsByCategory(companyId),
    queryFn: () => toolboxTopicsApi.getTopicsByCategory(companyId),
  })
}

// ============================================================================
// Topic Mutation Hooks
// ============================================================================

/**
 * Create a new topic
 */
export function useCreateTopic() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateToolboxTopicDTO) => toolboxTopicsApi.createTopic(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.topics() })
      showToast({
        type: 'success',
        title: 'Topic Created',
        message: 'The toolbox talk topic has been created successfully.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create topic',
      })
    },
  })
}

/**
 * Update a topic
 */
export function useUpdateTopic() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateToolboxTopicDTO }) =>
      toolboxTopicsApi.updateTopic(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.topics() })
      queryClient.setQueryData(toolboxKeys.topicDetail(data.id), data)
      showToast({
        type: 'success',
        title: 'Topic Updated',
        message: 'The topic has been updated successfully.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update topic',
      })
    },
  })
}

/**
 * Delete a topic
 */
export function useDeleteTopic() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => toolboxTopicsApi.deleteTopic(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.topics() })
      showToast({
        type: 'success',
        title: 'Topic Deleted',
        message: 'The topic has been deleted.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete topic',
      })
    },
  })
}

// ============================================================================
// Talk Query Hooks
// ============================================================================

/**
 * Fetch toolbox talks with optional filters
 */
export function useToolboxTalks(filters: ToolboxTalkFilters = {}) {
  return useQuery({
    queryKey: toolboxKeys.talkList(filters),
    queryFn: () => toolboxTalksApi.getTalks(filters),
  })
}

/**
 * Fetch a single toolbox talk
 */
export function useToolboxTalk(id: string) {
  return useQuery({
    queryKey: toolboxKeys.talkDetail(id),
    queryFn: () => toolboxTalksApi.getTalk(id),
    enabled: !!id,
  })
}

/**
 * Fetch toolbox talk with all details
 */
export function useToolboxTalkWithDetails(id: string) {
  return useQuery({
    queryKey: toolboxKeys.talkWithDetails(id),
    queryFn: () => toolboxTalksApi.getTalkWithDetails(id),
    enabled: !!id,
  })
}

/**
 * Fetch upcoming scheduled talks
 */
export function useUpcomingToolboxTalks(projectId: string, days = 7) {
  return useQuery({
    queryKey: toolboxKeys.upcomingTalks(projectId, days),
    queryFn: () => toolboxTalksApi.getUpcomingTalks(projectId, days),
    enabled: !!projectId,
  })
}

/**
 * Fetch recent completed talks
 */
export function useRecentToolboxTalks(projectId: string, limit = 10) {
  return useQuery({
    queryKey: toolboxKeys.recentTalks(projectId, limit),
    queryFn: () => toolboxTalksApi.getRecentTalks(projectId, limit),
    enabled: !!projectId,
  })
}

// ============================================================================
// Talk Mutation Hooks
// ============================================================================

/**
 * Create a new toolbox talk
 */
export function useCreateToolboxTalk() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateToolboxTalkDTO) => toolboxTalksApi.createTalk(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talks() })
      showToast({
        type: 'success',
        title: 'Toolbox Talk Scheduled',
        message: `${data.talk_number} has been scheduled.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to create toolbox talk',
      })
    },
  })
}

/**
 * Update a toolbox talk
 */
export function useUpdateToolboxTalk() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateToolboxTalkDTO }) =>
      toolboxTalksApi.updateTalk(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talks() })
      queryClient.setQueryData(toolboxKeys.talkDetail(data.id), data)
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talkWithDetails(data.id) })
      showToast({
        type: 'success',
        title: 'Toolbox Talk Updated',
        message: 'The toolbox talk has been updated.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update toolbox talk',
      })
    },
  })
}

/**
 * Start a toolbox talk
 */
export function useStartToolboxTalk() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: StartToolboxTalkDTO }) =>
      toolboxTalksApi.startTalk(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talks() })
      queryClient.setQueryData(toolboxKeys.talkDetail(data.id), data)
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talkWithDetails(data.id) })
      showToast({
        type: 'success',
        title: 'Toolbox Talk Started',
        message: 'The toolbox talk is now in progress.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to start toolbox talk',
      })
    },
  })
}

/**
 * Complete a toolbox talk
 */
export function useCompleteToolboxTalk() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: CompleteToolboxTalkDTO }) =>
      toolboxTalksApi.completeTalk(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talks() })
      queryClient.invalidateQueries({ queryKey: toolboxKeys.stats() })
      queryClient.invalidateQueries({ queryKey: toolboxKeys.certifications() })
      queryClient.setQueryData(toolboxKeys.talkDetail(data.id), data)
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talkWithDetails(data.id) })
      showToast({
        type: 'success',
        title: 'Toolbox Talk Completed',
        message: 'The toolbox talk has been completed and attendance recorded.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to complete toolbox talk',
      })
    },
  })
}

/**
 * Cancel a toolbox talk
 */
export function useCancelToolboxTalk() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => toolboxTalksApi.cancelTalk(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talks() })
      queryClient.setQueryData(toolboxKeys.talkDetail(data.id), data)
      showToast({
        type: 'success',
        title: 'Toolbox Talk Cancelled',
        message: 'The toolbox talk has been cancelled.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to cancel toolbox talk',
      })
    },
  })
}

/**
 * Delete a toolbox talk
 */
export function useDeleteToolboxTalk() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (id: string) => toolboxTalksApi.deleteTalk(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talks() })
      showToast({
        type: 'success',
        title: 'Toolbox Talk Deleted',
        message: 'The toolbox talk has been deleted.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to delete toolbox talk',
      })
    },
  })
}

// ============================================================================
// Attendee Query Hooks
// ============================================================================

/**
 * Fetch attendees for a toolbox talk
 */
export function useToolboxAttendees(talkId: string) {
  return useQuery({
    queryKey: toolboxKeys.attendees(talkId),
    queryFn: () => toolboxAttendeesApi.getAttendees(talkId),
    enabled: !!talkId,
  })
}

// ============================================================================
// Attendee Mutation Hooks
// ============================================================================

/**
 * Add an attendee
 */
export function useAddAttendee() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateToolboxAttendeeDTO) => toolboxAttendeesApi.addAttendee(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.attendees(data.toolbox_talk_id) })
      queryClient.invalidateQueries({
        queryKey: toolboxKeys.talkWithDetails(data.toolbox_talk_id),
      })
      showToast({
        type: 'success',
        title: 'Attendee Added',
        message: `${data.worker_name} has been added to the attendance list.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to add attendee',
      })
    },
  })
}

/**
 * Bulk add attendees
 */
export function useBulkAddAttendees() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (dto: BulkAddAttendeesDTO) => toolboxAttendeesApi.bulkAddAttendees(dto),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.attendees(variables.toolbox_talk_id) })
      queryClient.invalidateQueries({
        queryKey: toolboxKeys.talkWithDetails(variables.toolbox_talk_id),
      })
      showToast({
        type: 'success',
        title: 'Attendees Added',
        message: `${data.length} attendees have been added.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to add attendees',
      })
    },
  })
}

/**
 * Sign in an attendee
 */
export function useSignInAttendee() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({
      attendeeId,
      dto,
    }: {
      attendeeId: string
      dto?: SignInAttendeeDTO
      talkId: string
    }) => toolboxAttendeesApi.signInAttendee(attendeeId, dto),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.attendees(variables.talkId) })
      queryClient.invalidateQueries({
        queryKey: toolboxKeys.talkWithDetails(variables.talkId),
      })
      showToast({
        type: 'success',
        title: 'Signed In',
        message: `${data.worker_name} has been signed in.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to sign in attendee',
      })
    },
  })
}

/**
 * Quick sign in (mark present without signature)
 */
export function useQuickSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ attendeeId, talkId: _talkId }: { attendeeId: string; talkId: string }) =>
      toolboxAttendeesApi.quickSignIn(attendeeId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.attendees(variables.talkId) })
      queryClient.invalidateQueries({
        queryKey: toolboxKeys.talkWithDetails(variables.talkId),
      })
    },
  })
}

/**
 * Mark attendee as absent
 */
export function useMarkAbsent() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({
      attendeeId,
      notes,
      talkId: _talkId,
    }: {
      attendeeId: string
      notes?: string
      talkId: string
    }) => toolboxAttendeesApi.markAbsent(attendeeId, notes),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.attendees(variables.talkId) })
      queryClient.invalidateQueries({
        queryKey: toolboxKeys.talkWithDetails(variables.talkId),
      })
      showToast({
        type: 'info',
        title: 'Marked Absent',
        message: `${data.worker_name} has been marked as absent.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update attendance',
      })
    },
  })
}

/**
 * Mark attendee as excused
 */
export function useMarkExcused() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({
      attendeeId,
      notes,
      talkId: _talkId,
    }: {
      attendeeId: string
      notes?: string
      talkId: string
    }) => toolboxAttendeesApi.markExcused(attendeeId, notes),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.attendees(variables.talkId) })
      queryClient.invalidateQueries({
        queryKey: toolboxKeys.talkWithDetails(variables.talkId),
      })
      showToast({
        type: 'info',
        title: 'Marked Excused',
        message: `${data.worker_name} has been marked as excused.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update attendance',
      })
    },
  })
}

/**
 * Remove an attendee
 */
export function useRemoveAttendee() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: ({ attendeeId, talkId: _talkId }: { attendeeId: string; talkId: string }) =>
      toolboxAttendeesApi.removeAttendee(attendeeId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.attendees(variables.talkId) })
      queryClient.invalidateQueries({
        queryKey: toolboxKeys.talkWithDetails(variables.talkId),
      })
      showToast({
        type: 'success',
        title: 'Attendee Removed',
        message: 'The attendee has been removed from the list.',
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to remove attendee',
      })
    },
  })
}

/**
 * Bulk sign in all expected attendees
 */
export function useBulkSignIn() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  return useMutation({
    mutationFn: (talkId: string) => toolboxAttendeesApi.bulkSignIn(talkId),
    onSuccess: (count, talkId) => {
      queryClient.invalidateQueries({ queryKey: toolboxKeys.attendees(talkId) })
      queryClient.invalidateQueries({ queryKey: toolboxKeys.talkWithDetails(talkId) })
      showToast({
        type: 'success',
        title: 'All Signed In',
        message: `${count} attendees have been signed in.`,
      })
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to bulk sign in',
      })
    },
  })
}

// ============================================================================
// Certification Query Hooks
// ============================================================================

/**
 * Fetch certifications with filters
 */
export function useToolboxCertifications(filters: CertificationFilters = {}) {
  return useQuery({
    queryKey: toolboxKeys.certificationList(filters),
    queryFn: () => toolboxCertificationsApi.getCertifications(filters),
  })
}

/**
 * Fetch certifications for a specific worker
 */
export function useWorkerCertifications(companyId: string, workerName: string) {
  return useQuery({
    queryKey: toolboxKeys.workerCertifications(companyId, workerName),
    queryFn: () => toolboxCertificationsApi.getWorkerCertifications(companyId, workerName),
    enabled: !!companyId && !!workerName,
  })
}

/**
 * Fetch expiring certifications
 */
export function useExpiringCertifications(companyId: string, days = 30) {
  return useQuery({
    queryKey: toolboxKeys.expiringCertifications(companyId, days),
    queryFn: () => toolboxCertificationsApi.getExpiringCertifications(companyId, days),
    enabled: !!companyId,
  })
}

// ============================================================================
// Stats Query Hooks
// ============================================================================

/**
 * Fetch project statistics
 */
export function useToolboxTalkStats(projectId: string) {
  return useQuery({
    queryKey: toolboxKeys.projectStats(projectId),
    queryFn: () => toolboxStatsApi.getProjectStats(projectId),
    enabled: !!projectId,
  })
}

/**
 * Fetch compliance summary for a company
 */
export function useComplianceSummary(companyId: string) {
  return useQuery({
    queryKey: toolboxKeys.compliance(companyId),
    queryFn: () => toolboxStatsApi.getComplianceSummary(companyId),
    enabled: !!companyId,
  })
}

/**
 * Fetch attendance rate for a project
 */
export function useAttendanceRate(projectId: string, days = 30) {
  return useQuery({
    queryKey: toolboxKeys.attendanceRate(projectId, days),
    queryFn: () => toolboxStatsApi.getAttendanceRate(projectId, days),
    enabled: !!projectId,
  })
}
