/**
 * RFI Routing Hooks
 * React Query hooks for AI-powered RFI routing suggestions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rfiRoutingAiApi } from '@/lib/api/services/rfi-routing-ai'
import type {
  GenerateRoutingSuggestionDTO,
  SubmitRoutingFeedbackDTO,
  RFIRoutingSuggestion,
  RoutingSuggestionResponse,
  BallInCourtRole,
} from '@/types/ai'
import { toast } from 'sonner'

// Query keys
export const rfiRoutingQueryKeys = {
  all: ['rfi-routing'] as const,
  suggestions: (rfiId: string) => [...rfiRoutingQueryKeys.all, 'suggestions', rfiId] as const,
  relatedItems: (projectId: string, subject: string) =>
    [...rfiRoutingQueryKeys.all, 'related', projectId, subject] as const,
}

/**
 * Hook to get existing routing suggestions for an RFI
 */
export function useRFISuggestions(rfiId: string | undefined) {
  return useQuery({
    queryKey: rfiRoutingQueryKeys.suggestions(rfiId || ''),
    queryFn: () => rfiRoutingAiApi.getSuggestions(rfiId!),
    enabled: !!rfiId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to generate a new routing suggestion
 */
export function useGenerateRoutingSuggestion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: GenerateRoutingSuggestionDTO) =>
      rfiRoutingAiApi.generateSuggestion(dto),
    onSuccess: (data, variables) => {
      // Invalidate suggestions for this RFI
      queryClient.invalidateQueries({
        queryKey: rfiRoutingQueryKeys.suggestions(variables.rfi_id),
      })
      toast.success('Routing suggestion generated')
    },
    onError: (error) => {
      toast.error(`Failed to generate suggestion: ${error.message}`)
    },
  })
}

/**
 * Hook to submit feedback on a routing suggestion
 */
export function useSubmitRoutingFeedback() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (dto: SubmitRoutingFeedbackDTO) =>
      rfiRoutingAiApi.submitFeedback(dto),
    onSuccess: () => {
      // Invalidate all routing suggestions
      queryClient.invalidateQueries({
        queryKey: rfiRoutingQueryKeys.all,
      })
      toast.success('Feedback submitted - thank you!')
    },
    onError: (error) => {
      toast.error(`Failed to submit feedback: ${error.message}`)
    },
  })
}

/**
 * Hook to find related items (RFIs and Submittals)
 */
export function useRelatedItems(
  projectId: string | undefined,
  subject: string,
  question: string,
  enabled = true
) {
  return useQuery({
    queryKey: rfiRoutingQueryKeys.relatedItems(projectId || '', subject),
    queryFn: () =>
      rfiRoutingAiApi.findRelatedItems(projectId!, subject, question),
    enabled: enabled && !!projectId && (!!subject || !!question),
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Hook to get a quick role suggestion without AI
 */
export function useQuickRoleSuggestion(subject: string, question: string): {
  role: BallInCourtRole
  confidence: number
  matchedKeywords: string[]
} | null {
  if (!subject && !question) return null
  return rfiRoutingAiApi.quickSuggestRole(subject, question)
}

/**
 * Combined hook for RFI routing workflow
 */
export function useRFIRoutingWorkflow(rfiId: string | undefined, projectId: string | undefined) {
  const suggestions = useRFISuggestions(rfiId)
  const generateSuggestion = useGenerateRoutingSuggestion()
  const submitFeedback = useSubmitRoutingFeedback()

  const latestSuggestion = suggestions.data?.[0]
  const hasPendingSuggestion = latestSuggestion?.feedback_status === 'pending'

  return {
    // Data
    suggestions: suggestions.data || [],
    latestSuggestion,
    hasPendingSuggestion,
    isLoading: suggestions.isLoading,
    isGenerating: generateSuggestion.isPending,

    // Actions
    generateSuggestion: async (subject: string, question: string, specSection?: string) => {
      if (!rfiId || !projectId) return null
      return generateSuggestion.mutateAsync({
        rfi_id: rfiId,
        project_id: projectId,
        subject,
        question,
        spec_section: specSection,
      })
    },

    acceptSuggestion: async () => {
      if (!latestSuggestion) return
      await submitFeedback.mutateAsync({
        suggestion_id: latestSuggestion.id,
        feedback_status: 'accepted',
        actual_role_assigned: latestSuggestion.suggested_role,
        actual_assignee_id: latestSuggestion.suggested_assignee_id,
      })
    },

    modifySuggestion: async (actualRole: BallInCourtRole, actualAssigneeId?: string) => {
      if (!latestSuggestion) return
      await submitFeedback.mutateAsync({
        suggestion_id: latestSuggestion.id,
        feedback_status: 'modified',
        actual_role_assigned: actualRole,
        actual_assignee_id: actualAssigneeId,
      })
    },

    rejectSuggestion: async (notes?: string) => {
      if (!latestSuggestion) return
      await submitFeedback.mutateAsync({
        suggestion_id: latestSuggestion.id,
        feedback_status: 'rejected',
        feedback_notes: notes,
      })
    },
  }
}
