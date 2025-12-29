/**
 * Escalation Rules Hook
 * Phase 5: Field Workflow Automation - Milestone 5.1
 *
 * Provides React Query hooks for managing escalation rules
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowAutomationApi } from '@/lib/api/services/workflow-automation'
import { useToast } from '@/components/ui/use-toast'
import type {
  EscalationRule,
  CreateEscalationRuleInput,
  UpdateEscalationRuleInput,
  EscalationEventFilters,
  EscalationSourceType,
} from '@/types/workflow-automation'

// ============================================================================
// Query Keys
// ============================================================================

export const escalationKeys = {
  all: ['escalation'] as const,
  rules: () => [...escalationKeys.all, 'rules'] as const,
  rulesList: (params: { projectId?: string; companyId?: string; sourceType?: string }) =>
    [...escalationKeys.rules(), params] as const,
  ruleDetail: (id: string) => [...escalationKeys.rules(), 'detail', id] as const,
  events: () => [...escalationKeys.all, 'events'] as const,
  eventsList: (filters: EscalationEventFilters) => [...escalationKeys.events(), filters] as const,
}

// ============================================================================
// Rules Hooks
// ============================================================================

/**
 * Get escalation rules with optional filters
 */
export function useEscalationRules(params: {
  projectId?: string;
  companyId?: string;
  sourceType?: EscalationSourceType;
  activeOnly?: boolean;
}) {
  return useQuery({
    queryKey: escalationKeys.rulesList(params),
    queryFn: () => workflowAutomationApi.rules.getRules(params),
    enabled: !!(params.projectId || params.companyId),
  })
}

/**
 * Get a single escalation rule by ID
 */
export function useEscalationRule(ruleId: string | undefined) {
  return useQuery({
    queryKey: escalationKeys.ruleDetail(ruleId || ''),
    queryFn: () => workflowAutomationApi.rules.getRule(ruleId!),
    enabled: !!ruleId,
  })
}

/**
 * Create a new escalation rule
 */
export function useCreateEscalationRule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (input: CreateEscalationRuleInput) =>
      workflowAutomationApi.rules.createRule(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.rules() })
      toast({
        title: 'Rule created',
        description: `Escalation rule "${data.name}" has been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create escalation rule.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update an escalation rule
 */
export function useUpdateEscalationRule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateEscalationRuleInput }) =>
      workflowAutomationApi.rules.updateRule(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.rules() })
      queryClient.invalidateQueries({ queryKey: escalationKeys.ruleDetail(data.id) })
      toast({
        title: 'Rule updated',
        description: `Escalation rule "${data.name}" has been updated.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update escalation rule.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Toggle rule active status
 */
export function useToggleEscalationRule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      workflowAutomationApi.rules.toggleRule(id, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.rules() })
      toast({
        title: variables.isActive ? 'Rule activated' : 'Rule deactivated',
        description: `Escalation rule has been ${variables.isActive ? 'activated' : 'deactivated'}.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle escalation rule.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete an escalation rule
 */
export function useDeleteEscalationRule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => workflowAutomationApi.rules.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: escalationKeys.rules() })
      toast({
        title: 'Rule deleted',
        description: 'Escalation rule has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete escalation rule.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// Events Hooks
// ============================================================================

/**
 * Get escalation events with filters
 */
export function useEscalationEvents(filters: EscalationEventFilters) {
  return useQuery({
    queryKey: escalationKeys.eventsList(filters),
    queryFn: () => workflowAutomationApi.events.getEvents(filters),
    enabled: !!(filters.project_id || filters.rule_id || filters.source_id),
  })
}

// ============================================================================
// Trigger Hook
// ============================================================================

/**
 * Trigger auto-escalation for a source item
 */
export function useTriggerEscalation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: {
      projectId: string;
      sourceType: EscalationSourceType;
      sourceId: string;
      sourceData: Record<string, unknown>;
      triggeredBy?: string;
    }) => workflowAutomationApi.engine.triggerAutoEscalation(params),
    onSuccess: (events) => {
      if (events.length > 0) {
        queryClient.invalidateQueries({ queryKey: escalationKeys.events() })
      }
    },
  })
}

// ============================================================================
// Test Rule Hook
// ============================================================================

/**
 * Test if a rule condition would match against sample data
 */
export function useTestRuleCondition() {
  return useMutation({
    mutationFn: ({
      condition,
      sampleData,
    }: {
      condition: EscalationRule['trigger_condition'];
      sampleData: Record<string, unknown>;
    }) => {
      const result = workflowAutomationApi.engine.evaluateCondition(condition, sampleData)
      return Promise.resolve(result)
    },
  })
}
