/**
 * Smart Summaries Hooks
 * React Query hooks for AI-generated summaries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { smartSummariesApi } from '@/lib/api/services/smart-summaries'
import { useAIFeatureEnabled } from '@/features/ai/hooks/useAIConfiguration'
import type {
  AISummary,
  DailyReportSummaryResponse,
  MeetingActionItemsResponse,
  WeeklyStatusResponse,
} from '@/types/ai'
import { toast } from 'sonner'

// Query keys
export const summaryQueryKeys = {
  all: ['summaries'] as const,
  dailyReport: (reportId: string) => [...summaryQueryKeys.all, 'daily-report', reportId] as const,
  meeting: (meetingId: string) => [...summaryQueryKeys.all, 'meeting', meetingId] as const,
  weekly: (projectId: string, weekOf: string) =>
    [...summaryQueryKeys.all, 'weekly', projectId, weekOf] as const,
  changeOrders: (projectId: string) =>
    [...summaryQueryKeys.all, 'change-orders', projectId] as const,
}

/**
 * Hook to get daily report summary
 */
export function useDailyReportSummary(reportId: string | undefined) {
  const { isEnabled } = useAIFeatureEnabled('smart_summaries')

  return useQuery({
    queryKey: summaryQueryKeys.dailyReport(reportId || ''),
    queryFn: () => smartSummariesApi.generateDailyReportSummary(reportId!),
    enabled: isEnabled && !!reportId,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  })
}

/**
 * Hook to generate/regenerate daily report summary
 */
export function useGenerateDailyReportSummary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ reportId, forceRegenerate }: { reportId: string; forceRegenerate?: boolean }) =>
      smartSummariesApi.generateDailyReportSummary(reportId, forceRegenerate),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        summaryQueryKeys.dailyReport(variables.reportId),
        data
      )
      toast.success('Summary generated successfully')
    },
    onError: (error) => {
      toast.error(`Failed to generate summary: ${error.message}`)
    },
  })
}

/**
 * Hook to get meeting action items
 */
export function useMeetingActionItems(meetingId: string | undefined) {
  const { isEnabled } = useAIFeatureEnabled('smart_summaries')

  return useQuery({
    queryKey: summaryQueryKeys.meeting(meetingId || ''),
    queryFn: () => smartSummariesApi.extractMeetingActionItems(meetingId!),
    enabled: isEnabled && !!meetingId,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  })
}

/**
 * Hook to extract/re-extract meeting action items
 */
export function useExtractMeetingActionItems() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ meetingId, forceRegenerate }: { meetingId: string; forceRegenerate?: boolean }) =>
      smartSummariesApi.extractMeetingActionItems(meetingId, forceRegenerate),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        summaryQueryKeys.meeting(variables.meetingId),
        data
      )
      toast.success(`Extracted ${data.actionItems.length} action items`)
    },
    onError: (error) => {
      toast.error(`Failed to extract action items: ${error.message}`)
    },
  })
}

/**
 * Hook to get weekly status summary
 */
export function useWeeklyStatus(projectId: string | undefined, weekOf: string) {
  const { isEnabled } = useAIFeatureEnabled('smart_summaries')

  return useQuery({
    queryKey: summaryQueryKeys.weekly(projectId || '', weekOf),
    queryFn: () => smartSummariesApi.generateWeeklyStatus(projectId!, weekOf),
    enabled: isEnabled && !!projectId && !!weekOf,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  })
}

/**
 * Hook to generate weekly status
 */
export function useGenerateWeeklyStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      weekOf,
      forceRegenerate,
    }: {
      projectId: string
      weekOf: string
      forceRegenerate?: boolean
    }) => smartSummariesApi.generateWeeklyStatus(projectId, weekOf, forceRegenerate),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        summaryQueryKeys.weekly(variables.projectId, variables.weekOf),
        data
      )
      toast.success('Weekly status generated')
    },
    onError: (error) => {
      toast.error(`Failed to generate weekly status: ${error.message}`)
    },
  })
}

/**
 * Hook to get change order impact summary
 */
export function useChangeOrderImpact(projectId: string | undefined) {
  const { isEnabled } = useAIFeatureEnabled('smart_summaries')

  return useQuery({
    queryKey: summaryQueryKeys.changeOrders(projectId || ''),
    queryFn: () => smartSummariesApi.generateCOImpactSummary(projectId!),
    enabled: isEnabled && !!projectId,
    staleTime: 60 * 60 * 1000, // 1 hour
    retry: 1,
  })
}

/**
 * Hook to update action item status
 */
export function useUpdateActionItemStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      actionItemId,
      status,
      assigneeId,
    }: {
      actionItemId: string
      status: 'extracted' | 'confirmed' | 'rejected' | 'completed'
      assigneeId?: string
    }) => smartSummariesApi.updateActionItemStatus(actionItemId, status, assigneeId),
    onSuccess: () => {
      // Invalidate all meeting summaries to refresh action items
      queryClient.invalidateQueries({
        queryKey: ['summaries', 'meeting'],
      })
      toast.success('Action item updated')
    },
    onError: (error) => {
      toast.error(`Failed to update action item: ${error.message}`)
    },
  })
}

/**
 * Combined hook for daily report summary workflow
 */
export function useDailyReportSummaryWorkflow(reportId: string | undefined) {
  const summary = useDailyReportSummary(reportId)
  const generateSummary = useGenerateDailyReportSummary()

  return {
    data: summary.data,
    isLoading: summary.isLoading,
    isGenerating: generateSummary.isPending,
    error: summary.error,
    generate: (forceRegenerate = false) => {
      if (!reportId) return
      generateSummary.mutate({ reportId, forceRegenerate })
    },
    regenerate: () => {
      if (!reportId) return
      generateSummary.mutate({ reportId, forceRegenerate: true })
    },
  }
}

/**
 * Combined hook for meeting action items workflow
 */
export function useMeetingActionItemsWorkflow(meetingId: string | undefined) {
  const actionItems = useMeetingActionItems(meetingId)
  const extractItems = useExtractMeetingActionItems()
  const updateStatus = useUpdateActionItemStatus()

  return {
    data: actionItems.data,
    isLoading: actionItems.isLoading,
    isExtracting: extractItems.isPending,
    error: actionItems.error,
    extract: (forceRegenerate = false) => {
      if (!meetingId) return
      extractItems.mutate({ meetingId, forceRegenerate })
    },
    reextract: () => {
      if (!meetingId) return
      extractItems.mutate({ meetingId, forceRegenerate: true })
    },
    confirmItem: (actionItemId: string, assigneeId?: string) => {
      updateStatus.mutate({ actionItemId, status: 'confirmed', assigneeId })
    },
    rejectItem: (actionItemId: string) => {
      updateStatus.mutate({ actionItemId, status: 'rejected' })
    },
    completeItem: (actionItemId: string) => {
      updateStatus.mutate({ actionItemId, status: 'completed' })
    },
  }
}
