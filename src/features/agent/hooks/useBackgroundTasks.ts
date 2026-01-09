/**
 * useBackgroundTasks Hook
 * Monitor background task status, subscribe to updates, and trigger tasks manually
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { taskService } from '../services/task-service'
import { taskProcessor } from '../background/processor'
import type {
  AgentTask,
  TaskType,
  TaskStatus,
  TaskStatistics,
  CreateTaskDTO,
} from '../types/tasks'

// ============================================================================
// Types
// ============================================================================

interface UseBackgroundTasksOptions {
  /** Project ID to filter tasks */
  projectId?: string
  /** Task types to filter */
  taskTypes?: TaskType[]
  /** Task statuses to filter */
  statuses?: TaskStatus[]
  /** Enable realtime subscriptions */
  realtime?: boolean
  /** Polling interval in ms (0 to disable) */
  pollInterval?: number
  /** Maximum tasks to fetch */
  limit?: number
}

interface UseBackgroundTasksResult {
  /** List of tasks */
  tasks: AgentTask[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Refetch tasks */
  refetch: () => void
  /** Task statistics */
  statistics: TaskStatistics | null
  /** Is statistics loading */
  isLoadingStats: boolean
  /** Active task count */
  activeCount: number
  /** Pending task count */
  pendingCount: number
  /** Failed task count */
  failedCount: number
}

interface UseTaskActionsResult {
  /** Create a new task */
  createTask: (dto: CreateTaskDTO) => Promise<AgentTask>
  /** Cancel a task */
  cancelTask: (taskId: string) => Promise<void>
  /** Retry a failed task */
  retryTask: (taskId: string) => Promise<AgentTask>
  /** Process a task immediately */
  processSingleTask: (taskId: string) => Promise<void>
  /** Is creating */
  isCreating: boolean
  /** Is cancelling */
  isCancelling: boolean
  /** Is retrying */
  isRetrying: boolean
}

// ============================================================================
// Main Hook
// ============================================================================

export function useBackgroundTasks(
  options: UseBackgroundTasksOptions = {}
): UseBackgroundTasksResult {
  const {
    projectId,
    taskTypes,
    statuses,
    realtime = true,
    pollInterval = 0,
    limit = 50,
  } = options

  const queryClient = useQueryClient()

  // Query for tasks
  const {
    data: tasksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['agent-tasks', projectId, taskTypes, statuses, limit],
    queryFn: async () => {
      const result = await taskService.list({
        projectId,
        taskType: taskTypes,
        status: statuses,
        limit,
        orderBy: 'created_at',
        orderDirection: 'desc',
      })
      return result.tasks
    },
    refetchInterval: pollInterval > 0 ? pollInterval : undefined,
  })

  // Query for statistics
  const { data: statistics, isLoading: isLoadingStats } = useQuery({
    queryKey: ['agent-task-statistics', projectId],
    queryFn: async () => {
      return taskService.getStatistics({
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
    },
    staleTime: 60000, // 1 minute
  })

  // Set up realtime subscription
  useEffect(() => {
    if (!realtime) return

    const channel = supabase
      .channel('agent-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_tasks',
        },
        (payload) => {
          // Invalidate queries on any change
          queryClient.invalidateQueries({ queryKey: ['agent-tasks'] })
          queryClient.invalidateQueries({ queryKey: ['agent-task-statistics'] })

          // Optimistic update for specific events
          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData<AgentTask[]>(
              ['agent-tasks', projectId, taskTypes, statuses, limit],
              (old = []) => [payload.new as AgentTask, ...old].slice(0, limit)
            )
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData<AgentTask[]>(
              ['agent-tasks', projectId, taskTypes, statuses, limit],
              (old = []) =>
                old.map((task) =>
                  task.id === payload.new.id ? (payload.new as AgentTask) : task
                )
            )
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData<AgentTask[]>(
              ['agent-tasks', projectId, taskTypes, statuses, limit],
              (old = []) => old.filter((task) => task.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [realtime, projectId, taskTypes, statuses, limit, queryClient])

  // Compute counts
  const tasks = tasksData || []
  const counts = useMemo(() => {
    return {
      activeCount: tasks.filter((t) => t.status === 'running').length,
      pendingCount: tasks.filter((t) => t.status === 'pending' || t.status === 'scheduled').length,
      failedCount: tasks.filter((t) => t.status === 'failed').length,
    }
  }, [tasks])

  return {
    tasks,
    isLoading,
    error: error as Error | null,
    refetch,
    statistics: statistics || null,
    isLoadingStats,
    ...counts,
  }
}

// ============================================================================
// Task Actions Hook
// ============================================================================

export function useTaskActions(): UseTaskActionsResult {
  const queryClient = useQueryClient()

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: async (dto: CreateTaskDTO) => {
      return taskService.create(dto)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] })
    },
  })

  // Cancel task mutation
  const cancelMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await taskService.cancel(taskId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] })
    },
  })

  // Retry task mutation
  const retryMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return taskService.retryTask(taskId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] })
    },
  })

  // Process single task
  const [isProcessing, setIsProcessing] = useState(false)

  const processSingleTask = useCallback(async (taskId: string) => {
    setIsProcessing(true)
    try {
      await taskProcessor.processSingleTask(taskId)
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] })
    } finally {
      setIsProcessing(false)
    }
  }, [queryClient])

  return {
    createTask: createMutation.mutateAsync,
    cancelTask: cancelMutation.mutateAsync,
    retryTask: retryMutation.mutateAsync,
    processSingleTask,
    isCreating: createMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isRetrying: retryMutation.isPending || isProcessing,
  }
}

// ============================================================================
// Single Task Hook
// ============================================================================

interface UseTaskOptions {
  /** Enable realtime updates */
  realtime?: boolean
}

interface UseTaskResult {
  task: AgentTask | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useTask(taskId: string | null | undefined, options: UseTaskOptions = {}): UseTaskResult {
  const { realtime = true } = options
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['agent-task', taskId],
    queryFn: async () => {
      if (!taskId) return null
      return taskService.get(taskId)
    },
    enabled: !!taskId,
  })

  // Set up realtime subscription for this specific task
  useEffect(() => {
    if (!taskId || !realtime) return

    const channel = supabase
      .channel(`agent-task-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          queryClient.setQueryData(['agent-task', taskId], payload.new as AgentTask)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId, realtime, queryClient])

  return {
    task: data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  }
}

// ============================================================================
// Task History Hook
// ============================================================================

interface UseTaskHistoryOptions {
  limit?: number
}

export function useTaskHistory(
  entityType: string,
  entityId: string,
  options: UseTaskHistoryOptions = {}
): {
  tasks: AgentTask[]
  isLoading: boolean
  error: Error | null
} {
  const { limit = 20 } = options

  const { data, isLoading, error } = useQuery({
    queryKey: ['agent-task-history', entityType, entityId, limit],
    queryFn: async () => {
      return taskService.getTaskHistoryForEntity(entityType, entityId, limit)
    },
    enabled: !!entityType && !!entityId,
  })

  return {
    tasks: data || [],
    isLoading,
    error: error as Error | null,
  }
}

// ============================================================================
// Processor Status Hook
// ============================================================================

interface UseProcessorStatusResult {
  isRunning: boolean
  activeTaskIds: string[]
  completedCount: number
  failedCount: number
  lastPollAt: string | null
  lastError: string | null
  start: () => void
  stop: () => void
}

export function useProcessorStatus(): UseProcessorStatusResult {
  const [state, setState] = useState(taskProcessor.getState())

  // Poll for state updates
  useEffect(() => {
    const interval = setInterval(() => {
      setState(taskProcessor.getState())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const start = useCallback(() => {
    taskProcessor.start()
    setState(taskProcessor.getState())
  }, [])

  const stop = useCallback(() => {
    taskProcessor.stop()
    setState(taskProcessor.getState())
  }, [])

  return {
    ...state,
    start,
    stop,
  }
}

// ============================================================================
// Quick Actions Hook
// ============================================================================

interface QuickTaskActions {
  /** Trigger document processing */
  processDocument: (documentId: string, projectId?: string) => Promise<AgentTask>
  /** Trigger RFI routing */
  processRFI: (rfiId: string, projectId?: string) => Promise<AgentTask>
  /** Trigger daily report summarization */
  summarizeReport: (reportId: string, projectId?: string) => Promise<AgentTask>
  /** Trigger inspection processing */
  processInspection: (inspectionId: string, projectId?: string) => Promise<AgentTask>
}

export function useQuickTaskActions(): QuickTaskActions {
  const { createTask } = useTaskActions()

  const processDocument = useCallback(
    async (documentId: string, projectId?: string) => {
      return createTask({
        task_type: 'document_classify',
        project_id: projectId,
        input_data: {
          document_id: documentId,
          auto_classify: true,
          auto_extract_metadata: true,
          auto_link_entities: true,
        },
        target_entity_type: 'document',
        target_entity_id: documentId,
      })
    },
    [createTask]
  )

  const processRFI = useCallback(
    async (rfiId: string, projectId?: string) => {
      return createTask({
        task_type: 'rfi_suggest_routing',
        project_id: projectId,
        input_data: {
          rfi_id: rfiId,
          auto_route: true,
          find_similar: true,
          draft_response: true,
        },
        target_entity_type: 'rfi',
        target_entity_id: rfiId,
      })
    },
    [createTask]
  )

  const summarizeReport = useCallback(
    async (reportId: string, projectId?: string) => {
      return createTask({
        task_type: 'report_summarize',
        project_id: projectId,
        input_data: {
          report_id: reportId,
          auto_summarize: true,
          extract_action_items: true,
          flag_issues: true,
        },
        target_entity_type: 'daily_report',
        target_entity_id: reportId,
      })
    },
    [createTask]
  )

  const processInspection = useCallback(
    async (inspectionId: string, projectId?: string) => {
      return createTask({
        task_type: 'report_extract_actions',
        project_id: projectId,
        input_data: {
          inspection_id: inspectionId,
          auto_generate_tasks: true,
          update_compliance: true,
          notify_stakeholders: true,
        },
        target_entity_type: 'inspection',
        target_entity_id: inspectionId,
      })
    },
    [createTask]
  )

  return {
    processDocument,
    processRFI,
    summarizeReport,
    processInspection,
  }
}

// ============================================================================
// Export all hooks
// ============================================================================

export type {
  UseBackgroundTasksOptions,
  UseBackgroundTasksResult,
  UseTaskActionsResult,
  UseTaskOptions,
  UseTaskResult,
  UseTaskHistoryOptions,
  UseProcessorStatusResult,
  QuickTaskActions,
}
