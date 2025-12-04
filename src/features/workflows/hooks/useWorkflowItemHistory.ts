// File: /src/features/workflows/hooks/useWorkflowItemHistory.ts
// React Query hook for workflow item history/audit log

import { useQuery } from '@tanstack/react-query'
import { workflowsApi, type WorkflowItemHistoryWithUser } from '@/lib/api/services/workflows'

// Fetch history/audit log for a workflow item (with user info)
export function useWorkflowItemHistory(workflowItemId: string | undefined) {
  return useQuery<WorkflowItemHistoryWithUser[]>({
    queryKey: ['workflow-item-history', workflowItemId],
    queryFn: async () => {
      if (!workflowItemId) {
        throw new Error('Workflow item ID required')
      }
      return workflowsApi.getWorkflowItemHistory(workflowItemId)
    },
    enabled: !!workflowItemId,
  })
}
